import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, readJsonBody, replyError, requirePermission, requireTrustedOwner } from "../../shared/security.ts";

const SUPPORTED_MARKETS = new Set(["SA_MAIN", "US_OPTIONS", "US_BENCHMARKS"]);

function normalizedMarket(value: unknown) {
  const market = String(value || "").trim().toUpperCase();
  return SUPPORTED_MARKETS.has(market) ? market : "";
}

function issueMarket(issue: any, sourcesById: Map<string, any>) {
  return normalizedMarket(issue.market_code) || normalizedMarket(sourcesById.get(issue.source_id)?.market_code) || "SA_MAIN";
}

function latestSuccessfulRuns(runs: any[]) {
  const result = new Map<string, any>();
  for (const run of runs) {
    const market = normalizedMarket(run.market_code);
    if (!market || run.status !== "success" || Number(run.coverage_percent || 0) < 95 || !run.finished_at) continue;
    const current = result.get(market);
    if (!current || Date.parse(run.finished_at) > Date.parse(current.finished_at)) result.set(market, run);
  }
  return result;
}

async function deleteInBatches(entityApi: any, records: any[], size = 25) {
  let deleted = 0;
  for (let offset = 0; offset < records.length; offset += size) {
    const batch = records.slice(offset, offset + size);
    const results = await Promise.allSettled(batch.map((record) => entityApi.delete(record.id)));
    deleted += results.filter((result) => result.status === "fulfilled").length;
  }
  return deleted;
}

async function purgeExpiredQuoteObservations(base44: any) {
  const retentionDays = Math.min(90, Math.max(1, Number(Deno.env.get("SMART_INVESTOR_RAW_OBSERVATION_RETENTION_DAYS")) || 14));
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const expired = await base44.asServiceRole.entities.QuoteObservation.filter(
    { received_time: { "$lt": cutoff } },
    "received_time",
    2000,
  );
  const deleted = await deleteInBatches(base44.asServiceRole.entities.QuoteObservation, expired);
  return { retention_days: retentionDays, cutoff, candidates: expired.length, deleted };
}

async function backfillMissingMarketCodes(base44: any) {
  const entityNames = ["CandleChunk", "IndicatorSnapshot", "QuoteLatest"];
  const result: Record<string, any> = {};
  for (const entityName of entityNames) {
    const candidates = (await base44.asServiceRole.entities[entityName].list("updated_date", 500))
      .filter((row: any) => !String(row.market_code || "").trim() && row.instrument_id);
    const instrumentIds = [...new Set(candidates.map((row: any) => row.instrument_id))];
    const instruments = instrumentIds.length
      ? await base44.asServiceRole.entities.Instrument.filter({ id: { "$in": instrumentIds } }, "symbol", instrumentIds.length)
      : [];
    const marketByInstrument = new Map(instruments.map((instrument: any) => [instrument.id, normalizedMarket(instrument.market_code)]));
    const updates = candidates
      .map((row: any) => ({ id: row.id, market_code: marketByInstrument.get(row.instrument_id) }))
      .filter((row: any) => row.market_code);
    if (updates.length) await base44.asServiceRole.entities[entityName].bulkUpdate(updates);
    result[entityName] = { inspected: Math.min(500, candidates.length), repaired: updates.length };
  }
  return result;
}

function classifyIssues(issues: any[], sourcesById: Map<string, any>, latestRuns: Map<string, any>) {
  const active: any[] = [];
  const recovered: any[] = [];
  for (const issue of issues) {
    const market_code = issueMarket(issue, sourcesById);
    const latestRun = latestRuns.get(market_code);
    const lastSeen = Date.parse(issue.last_seen_at || issue.updated_date || issue.created_date || "");
    const recoveredAfter = Date.parse(latestRun?.finished_at || "");
    const normalized = { ...issue, market_code };
    if (Number.isFinite(lastSeen) && Number.isFinite(recoveredAfter) && recoveredAfter > lastSeen) recovered.push(normalized);
    else active.push(normalized);
  }
  return { active, recovered };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req);
    const action = String(body.action || "summary");
    if (action === "scheduled_maintenance") {
      const owner = await requireTrustedOwner(base44);
      const [observationRetention, marketCodeBackfill] = await Promise.all([
        purgeExpiredQuoteObservations(base44),
        backfillMissingMarketCodes(base44),
      ]);
      await audit(base44, owner.user.id, "market_data.maintenance_completed", "MarketData", "scheduled", "success", "scheduled_data_retention_and_market_identity_repair", {}, {
        observation_retention: observationRetention,
        market_code_backfill: marketCodeBackfill,
      });
      return Response.json({
        status: "success",
        observation_retention: observationRetention,
        market_code_backfill: marketCodeBackfill,
      });
    }
    const context = await requirePermission(base44, body.session_id, body.device_id, "data.operations.read");
    const [sources, openIssues, runs, deliveryEvents] = await Promise.all([
      base44.asServiceRole.entities.DataSource.list("name", 100),
      base44.asServiceRole.entities.DataQualityIssue.filter({ status: "open" }, "-last_seen_at", 1000),
      base44.asServiceRole.entities.IngestionRun.list("-started_at", 1000),
      base44.asServiceRole.entities.DeliveryEvent.list("-created_date", 100),
    ]);
    const sourcesById = new Map(sources.map((source: any) => [source.id, source]));
    const classified = classifyIssues(openIssues, sourcesById, latestSuccessfulRuns(runs));
    const requestedMarket = normalizedMarket(body.market_code);

    if (action === "reconcile_recovered_issues") {
      if (!requestedMarket) throw Object.assign(new Error("A supported market_code is required"), { status: 400, code: "MARKET_REQUIRED" });
      const writeContext = await requirePermission(base44, body.session_id, body.device_id, "data.quality.manage");
      const reason = String(body.reason || "").trim();
      if (reason.length < 10 || reason.length > 500) throw Object.assign(new Error("A reason between 10 and 500 characters is required"), { status: 400, code: "REASON_REQUIRED" });
      const recoveredForMarket = classified.recovered.filter((issue) => issue.market_code === requestedMarket);
      const batch = recoveredForMarket.slice(0, Math.min(Math.max(Number(body.limit) || 100, 1), 100));
      const resolvedAt = new Date().toISOString();
      if (batch.length) await base44.asServiceRole.entities.DataQualityIssue.bulkUpdate(batch.map((issue: any) => ({
        id: issue.id,
        status: "resolved",
        resolved_at: resolvedAt,
        market_code: issue.market_code,
      })));
      await audit(base44, writeContext.user.id, "market_data.quality_reconciled", "DataQualityIssue", "recovered", "success", reason, {
        market_code: requestedMarket,
        recovered_candidates: recoveredForMarket.length,
      }, {
        resolved_count: batch.length,
        remaining_count: Math.max(0, recoveredForMarket.length - batch.length),
      });
      return Response.json({
        status: "success",
        resolved_count: batch.length,
        remaining_recovered_count: Math.max(0, recoveredForMarket.length - batch.length),
      });
    }

    const issues = requestedMarket ? classified.active.filter((issue) => issue.market_code === requestedMarket) : classified.active;
    const recovered = requestedMarket ? classified.recovered.filter((issue) => issue.market_code === requestedMarket) : classified.recovered;
    return Response.json({
      sources,
      issues,
      runs: requestedMarket ? runs.filter((run: any) => run.market_code === requestedMarket) : runs,
      issue_summary: {
        active_count: issues.length,
        recovered_pending_reconciliation: recovered.length,
        stored_open_count: requestedMarket
          ? openIssues.filter((issue: any) => issueMarket(issue, sourcesById) === requestedMarket).length
          : openIssues.length,
        by_market: Object.fromEntries([...SUPPORTED_MARKETS].map((market) => [market, classified.active.filter((issue) => issue.market_code === market).length])),
      },
      delivery_health: {
        total: deliveryEvents.length,
        delivered: deliveryEvents.filter((event: any) => event.status === "delivered").length,
        failed: deliveryEvents.filter((event: any) => event.status === "failed").length,
        pending: deliveryEvents.filter((event: any) => !["delivered", "failed"].includes(event.status)).length,
      },
    });
  } catch (error) {
    return replyError(error);
  }
});
