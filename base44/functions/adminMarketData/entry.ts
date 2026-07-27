import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, replyError, requirePermission } from "../../shared/security.ts";
import { EXPECTED_INSTRUMENT_COUNT, SAUDI_DELAY_SECONDS } from "../../shared/market-data.ts";

const MARKET_CODE = "SA_MAIN";
const ESTIMATED_RUNS_PER_TRADING_DAY = 23;
const ESTIMATED_MONTHLY_RUNS = 506;

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

async function health(base44) {
  const [sources, mappings, quotes, issues, runs] = await Promise.all([
    base44.asServiceRole.entities.DataSource.list("-last_verified_at", 100),
    base44.asServiceRole.entities.ProviderInstrumentMap.filter({ market_code: MARKET_CODE }),
    base44.asServiceRole.entities.QuoteLatest.filter({ market_code: MARKET_CODE }),
    base44.asServiceRole.entities.DataQualityIssue.filter({ status: "open" }),
    base44.asServiceRole.entities.IngestionRun.list("-started_at", 100),
  ]);
  const licensedSource = sources.find((source) => source.market_code === MARKET_CODE && source.source_type === "licensed") || null;
  const latestRun = latestByDate(runs.filter((run) => !run.market_code || run.market_code === MARKET_CODE), "started_at");
  const latestSuccessfulRun = latestByDate(runs.filter((run) => (!run.market_code || run.market_code === MARKET_CODE) && run.status === "success"), "finished_at");
  const latestVersion = latestByDate(quotes.filter((quote) => quote.snapshot_version), "received_time")?.snapshot_version || null;
  const currentQuotes = latestVersion ? quotes.filter((quote) => quote.snapshot_version === latestVersion) : [];
  const staleQuotes = quotes.filter((quote) => quote.freshness_status === "stale").length;
  const rejectedIssues = issues.filter((issue) => issue.severity === "critical").length;
  const activeMappings = mappings.filter((mapping) => mapping.active === true && mapping.license_status === "approved" && mapping.delay_seconds === SAUDI_DELAY_SECONDS);

  return {
    market_code: MARKET_CODE,
    provider_readiness: {
      configured: Boolean(licensedSource),
      license_status: licensedSource?.license_status || "pending",
      public_enabled: licensedSource?.public_enabled === true,
      license_expires_at: licensedSource?.license_expires_at || null,
      mapping_count: activeMappings.length,
      expected_mapping_count: EXPECTED_INSTRUMENT_COUNT,
      ready: licensedSource?.license_status === "approved"
        && licensedSource?.public_enabled === true
        && activeMappings.length === EXPECTED_INSTRUMENT_COUNT,
    },
    snapshot: {
      version: latestVersion,
      current_count: currentQuotes.length,
      stale_count: staleQuotes,
      coverage_percent: latestVersion ? Math.round(currentQuotes.length / EXPECTED_INSTRUMENT_COUNT * 10000) / 100 : 0,
      provider_as_of: latestByDate(currentQuotes, "provider_as_of")?.provider_as_of || null,
      received_at: latestByDate(currentQuotes, "received_time")?.received_time || null,
      is_final: currentQuotes.length > 0 && currentQuotes.every((quote) => quote.is_final === true),
    },
    latest_run: latestRun,
    latest_successful_run: latestSuccessfulRun,
    open_issue_count: issues.length,
    high_priority_issue_count: rejectedIssues,
    automation_budget: {
      runs_per_trading_day: ESTIMATED_RUNS_PER_TRADING_DAY,
      estimated_monthly_runs: ESTIMATED_MONTHLY_RUNS,
      note: "One Base44 integration credit per automation invocation; provider API usage is separate.",
    },
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const action = String(body.action || "health");
    await requirePermission(base44, body.session_id, "data.operations.read");

    if (action === "health") return Response.json(await health(base44));
    if (action === "runs") {
      const runs = await base44.asServiceRole.entities.IngestionRun.list("-started_at", Math.min(Math.max(Number(body.limit) || 100, 1), 500));
      return Response.json({ runs });
    }
    if (action === "issues") {
      const issues = body.status
        ? await base44.asServiceRole.entities.DataQualityIssue.filter({ status: String(body.status) })
        : await base44.asServiceRole.entities.DataQualityIssue.list("-last_seen_at", Math.min(Math.max(Number(body.limit) || 200, 1), 500));
      return Response.json({ issues });
    }
    if (!["retry_slot", "reconcile_close"].includes(action)) {
      throw Object.assign(new Error("Unsupported market-data admin action"), { status: 400, code: "INVALID_ACTION" });
    }

    const writeContext = await requirePermission(base44, body.session_id, "data.ingestion.run");
    const reason = reasonFrom(body.reason);
    const slotKind = action === "reconcile_close" ? "session_final" : String(body.slot_kind || "quarter_hour");
    const response = await base44.functions.invoke("marketIngestion", {
      source: action === "reconcile_close" ? "manual_close_reconciliation" : "manual_retry",
      session_id: body.session_id,
      market_code: MARKET_CODE,
      slot_kind: slotKind,
      scheduled_for: body.scheduled_for || null,
      force: true,
      reason,
    });
    const result = response?.data || response;
    await audit(
      base44,
      writeContext.user.id,
      action === "reconcile_close" ? "market_data.reconcile_close" : "market_data.retry_slot",
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
