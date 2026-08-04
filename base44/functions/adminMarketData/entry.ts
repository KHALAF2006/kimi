import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, readJsonBody, replyError, requirePermission } from "../../shared/security.ts";
import { EXPECTED_INSTRUMENT_COUNT, SAUDI_DELAY_SECONDS } from "../../shared/market-data.ts";
import { US_OPTIONS_CATALOG, US_OPTIONS_MARKET_CODE } from "../../shared/us-options-catalog.ts";

const MARKET_CONFIG = {
  SA_MAIN: { expected: EXPECTED_INSTRUMENT_COUNT, delay: SAUDI_DELAY_SECONDS, runsPerDay: 24, monthlyRuns: 528 },
  [US_OPTIONS_MARKET_CODE]: { expected: US_OPTIONS_CATALOG.companies.length, delay: 900, runsPerDay: 34, monthlyRuns: 756 },
};

function marketConfig(value) {
  const marketCode = String(value || "SA_MAIN").trim().toUpperCase();
  const config = MARKET_CONFIG[marketCode];
  if (!config) throw Object.assign(new Error("Unsupported market"), { status: 400, code: "INVALID_MARKET" });
  return { marketCode, ...config };
}

function reasonFrom(value) {
  const reason = String(value || "").trim();
  if (reason.length < 10 || reason.length > 500) {
    throw Object.assign(new Error("A reason between 10 and 500 characters is required"), { status: 400, code: "REASON_REQUIRED" });
  }
  return reason;
}

function latestByDate(rows, field) {
  return [...rows].sort((a, b) => new Date(b[field] || 0).getTime() - new Date(a[field] || 0).getTime())[0] || null;
}

function earliestByDate(rows, field) {
  return [...rows].sort((a, b) => new Date(a[field] || 0).getTime() - new Date(b[field] || 0).getTime())[0] || null;
}

async function health(base44, requestedMarket) {
  const config = marketConfig(requestedMarket);
  const MARKET_CODE = config.marketCode;
  const [sources, mappings, quotes, issues, runs, historyRows, instruments] = await Promise.all([
    base44.asServiceRole.entities.DataSource.list("-last_verified_at", 100),
    base44.asServiceRole.entities.ProviderInstrumentMap.filter({ market_code: MARKET_CODE }),
    base44.asServiceRole.entities.QuoteLatest.filter({ market_code: MARKET_CODE }),
    base44.asServiceRole.entities.DataQualityIssue.filter({ status: "open" }),
    base44.asServiceRole.entities.IngestionRun.list("-started_at", 100),
    base44.asServiceRole.entities.HistoricalCandleSync.filter({ market_code: MARKET_CODE, interval: "1d" }),
    base44.asServiceRole.entities.Instrument.filter({ market_code: MARKET_CODE }),
  ]);
  const marketSource = sources.find((source) => source.market_code === MARKET_CODE
    && (MARKET_CODE !== US_OPTIONS_MARKET_CODE || source.code === "REFERENCE_YAHOO_US_OPTIONS_T15"))
    || sources.find((source) => source.market_code === MARKET_CODE && source.source_type !== "official")
    || null;
  const latestRun = latestByDate(runs.filter((run) => !run.market_code || run.market_code === MARKET_CODE), "started_at");
  const latestSuccessfulRun = latestByDate(runs.filter((run) => (!run.market_code || run.market_code === MARKET_CODE) && run.status === "success"), "finished_at");
  const latestVersion = latestByDate(quotes.filter((quote) => quote.snapshot_version), "received_time")?.snapshot_version || null;
  const currentQuotes = latestVersion ? quotes.filter((quote) => quote.snapshot_version === latestVersion) : [];
  const staleQuotes = quotes.filter((quote) => quote.freshness_status === "stale").length;
  const rejectedIssues = issues.filter((issue) => issue.severity === "critical").length;
  const activeMappings = mappings.filter((mapping) => mapping.active === true && mapping.delay_seconds === config.delay);
  const activeInstruments = instruments.filter((instrument) => instrument.status !== "delisted");
  const latestHistoryByInstrument = new Map();
  for (const item of historyRows) {
    const current = latestHistoryByInstrument.get(item.instrument_id);
    if (!current || new Date(item.last_attempt_at || 0) > new Date(current.last_attempt_at || 0)) latestHistoryByInstrument.set(item.instrument_id, item);
  }
  const history = [...latestHistoryByInstrument.values()];
  const companyStatuses = MARKET_CODE === US_OPTIONS_MARKET_CODE
    ? activeInstruments.map((instrument) => instrument.company_data_status || "not_started")
    : [];
  const latestCompanyAsOf = MARKET_CODE === US_OPTIONS_MARKET_CODE
    ? latestByDate(activeInstruments.filter((instrument) => instrument.company_data_as_of), "company_data_as_of")?.company_data_as_of || null
    : null;
  const saudiRedistributionReady = marketSource?.source_type === "licensed"
    && marketSource?.license_status === "approved"
    && marketSource?.public_enabled === true;
  const sourceReady = MARKET_CODE === US_OPTIONS_MARKET_CODE ? Boolean(marketSource) : saudiRedistributionReady;

  return {
    market_code: MARKET_CODE,
    provider_readiness: {
      configured: Boolean(marketSource),
      source_type: marketSource?.source_type || null,
      license_status: marketSource?.license_status || "pending",
      public_enabled: marketSource?.public_enabled === true,
      license_expires_at: marketSource?.license_expires_at || null,
      mapping_count: activeMappings.length,
      expected_mapping_count: config.expected,
      ready: sourceReady && activeMappings.length === config.expected,
    },
    snapshot: {
      version: latestVersion,
      current_count: currentQuotes.length,
      stale_count: staleQuotes,
      coverage_percent: latestVersion ? Math.round(currentQuotes.length / config.expected * 10000) / 100 : 0,
      provider_as_of: latestByDate(currentQuotes, "provider_as_of")?.provider_as_of || null,
      received_at: latestByDate(currentQuotes, "received_time")?.received_time || null,
      is_final: currentQuotes.length > 0 && currentQuotes.every((quote) => quote.is_final === true),
    },
    latest_run: latestRun,
    latest_successful_run: latestSuccessfulRun,
    open_issue_count: issues.length,
    high_priority_issue_count: rejectedIssues,
    historical_archive: {
      total_instruments: activeInstruments.length,
      complete_count: history.filter((item) => item.status === "complete").length,
      partial_count: history.filter((item) => item.status === "partial").length,
      failed_count: history.filter((item) => item.status === "failed").length,
      running_count: history.filter((item) => item.status === "running").length,
      not_started_count: Math.max(0, activeInstruments.length - latestHistoryByInstrument.size),
      bar_count: history.reduce((sum, item) => sum + Number(item.bar_count || 0), 0),
      earliest_bar_time: earliestByDate(history.filter((item) => item.earliest_bar_time), "earliest_bar_time")?.earliest_bar_time || null,
      complete: activeInstruments.length > 0 && history.filter((item) => item.status === "complete").length === activeInstruments.length,
      stored_once: true,
    },
    company_intelligence: MARKET_CODE === US_OPTIONS_MARKET_CODE ? {
      total_instruments: activeInstruments.length,
      complete_count: companyStatuses.filter((status) => status === "complete").length,
      partial_count: companyStatuses.filter((status) => status === "partial").length,
      failed_count: companyStatuses.filter((status) => status === "failed").length,
      not_started_count: companyStatuses.filter((status) => status === "not_started").length,
      latest_as_of: latestCompanyAsOf,
      complete: activeInstruments.length > 0 && companyStatuses.every((status) => status === "complete"),
    } : null,
    automation_budget: {
      runs_per_trading_day: config.runsPerDay,
      estimated_monthly_runs: config.monthlyRuns,
      note: MARKET_CODE === US_OPTIONS_MARKET_CODE
        ? "Steady estimate: 704 quarter-hour runs + 22 signal runs + 30 company-information runs. Historical bootstrap is temporary and separate. Provider API usage is separate."
        : "One Base44 integration credit per automation invocation; provider API usage is separate.",
    },
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req);
    const action = String(body.action || "health");
    const config = marketConfig(body.market_code);
    const MARKET_CODE = config.marketCode;
    await requirePermission(base44, body.session_id, "data.operations.read");

    if (action === "health") return Response.json(await health(base44, MARKET_CODE));
    if (action === "runs") {
      const runs = await base44.asServiceRole.entities.IngestionRun.list("-started_at", Math.min(Math.max(Number(body.limit) || 100, 1), 500));
      return Response.json({ runs: runs.filter((item) => (item.market_code || "SA_MAIN") === MARKET_CODE), market_code: MARKET_CODE });
    }
    if (action === "issues") {
      const issues = body.status
        ? await base44.asServiceRole.entities.DataQualityIssue.filter({ status: String(body.status) })
        : await base44.asServiceRole.entities.DataQualityIssue.list("-last_seen_at", Math.min(Math.max(Number(body.limit) || 200, 1), 500));
      return Response.json({ issues: issues.filter((item) => (item.market_code || "SA_MAIN") === MARKET_CODE), market_code: MARKET_CODE });
    }
    if (!["retry_slot", "reconcile_close", "refresh_signals", "backfill_history", "refresh_company_intelligence"].includes(action)) {
      throw Object.assign(new Error("Unsupported market-data admin action"), { status: 400, code: "INVALID_ACTION" });
    }

    const writeContext = await requirePermission(base44, body.session_id, "data.ingestion.run");
    const reason = reasonFrom(body.reason);
    if (action === "refresh_company_intelligence" && MARKET_CODE !== US_OPTIONS_MARKET_CODE) {
      throw Object.assign(new Error("Company intelligence refresh is available for the U.S. options market only"), { status: 400, code: "INVALID_MARKET" });
    }
    const slotKind = action === "reconcile_close" ? "session_final"
      : action === "refresh_signals" ? "technical_projection"
      : action === "backfill_history" ? "historical_backfill"
      : action === "refresh_company_intelligence" ? "company_intelligence"
      : String(body.slot_kind || "quarter_hour");
    const ingestionFunction = MARKET_CODE === US_OPTIONS_MARKET_CODE ? "usOptionsMarketIngestion" : "marketIngestion";
    const historyFunction = MARKET_CODE === US_OPTIONS_MARKET_CODE ? "usOptionsHistoricalBackfill" : "historicalCandleBackfill";
    const signalFunction = MARKET_CODE === US_OPTIONS_MARKET_CODE ? "usOptionsSignalRefresh" : "marketSignalRefresh";
    const response = action === "refresh_company_intelligence"
      ? await base44.functions.invoke("usOptionsCompanyIntelligence", {
        session_id: body.session_id,
        reason,
        force: true,
        batch_size: 10,
      })
      : action === "backfill_history"
      ? await base44.functions.invoke(historyFunction, {
        session_id: body.session_id,
        reason,
        force: false,
        symbols: Array.isArray(body.symbols) ? body.symbols.slice(0, 15) : undefined,
        batch_size: MARKET_CODE === US_OPTIONS_MARKET_CODE ? 15 : undefined,
      })
      : action === "refresh_signals"
      ? await base44.functions.invoke(signalFunction, {
        session_id: body.session_id,
        market_code: MARKET_CODE,
        force: true,
        reason,
        mode: MARKET_CODE === US_OPTIONS_MARKET_CODE ? "projection_batch" : undefined,
        batch_index: MARKET_CODE === US_OPTIONS_MARKET_CODE ? Number(body.batch_index) : undefined,
      })
      : await base44.functions.invoke(ingestionFunction, {
        source: action === "reconcile_close" ? "manual_close_reconciliation" : "manual_retry",
        session_id: body.session_id,
        market_code: MARKET_CODE,
        slot_kind: slotKind,
        scheduled_for: body.scheduled_for || null,
        force: true,
        reason,
      });
    const result = response?.data || response;
    const auditAction = action === "reconcile_close"
      ? "market_data.reconcile_close"
      : action === "backfill_history"
        ? "market_data.backfill_history"
      : action === "refresh_company_intelligence"
        ? "market_data.refresh_company_intelligence"
      : action === "refresh_signals"
        ? "market_data.refresh_signals"
        : "market_data.retry_slot";
    await audit(
      base44,
      writeContext.user.id,
      auditAction,
      "IngestionRun",
      result?.run_id || "pending",
      result?.status || "requested",
      reason,
      {},
      { scheduled_for: body.scheduled_for || null, slot_kind: slotKind, result }
    );
    return Response.json(result);
  } catch (error) {
    return replyError(error);
  }
});
