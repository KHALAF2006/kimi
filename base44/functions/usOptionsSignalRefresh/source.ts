import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, readJsonBody, replyError, requirePermission, requireTrustedOwner } from "../../shared/security.ts";
import { calculateMomentumZones, MOMENTUM_FORMULA_VERSION } from "../../shared/momentum.ts";
import { aggregateTechnicalBars, calculateTechnicalSignals, normalizeTechnicalBars, TECHNICAL_SIGNAL_FORMULA_VERSION } from "../../shared/technical-signals.ts";
import { US_OPTIONS_CATALOG, US_OPTIONS_MARKET_CODE, US_OPTIONS_SYMBOLS } from "../../shared/us-options-catalog.ts";

const MARKET_OPTIONS = { timeZone: "America/New_York", weekStartsOn: 1 };
const PROJECTION_BATCH_SIZE = 2;
const PROJECTION_CONCURRENCY = 2;

function rows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

function nyDate(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

function dedupeBars(input) {
  return normalizeTechnicalBars(input);
}

function dedupeDailyBars(input) {
  const bySession = new Map();
  for (const bar of dedupeBars(input)) bySession.set(nyDate(new Date(bar.time)), bar);
  return [...bySession.values()].sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
}

function batches(input, size) {
  const output = [];
  for (let index = 0; index < input.length; index += size) output.push(input.slice(index, index + size));
  return output;
}

function aggregateSession(intraday) {
  const bars = dedupeBars(intraday);
  if (!bars.length) return null;
  return {
    time: bars[0].time,
    open: bars[0].open,
    high: Math.max(...bars.map((bar) => bar.high)),
    low: Math.min(...bars.map((bar) => bar.low)),
    close: bars.at(-1).close,
    volume: bars.reduce((sum, bar) => sum + bar.volume, 0),
  };
}

async function upsert(base44, entity, values, existing, fields) {
  const key = (row) => fields.map((field) => String(row[field] ?? "")).join("|");
  const byKey = new Map(existing.map((row) => [key(row), row]));
  const unique = [...new Map(values.map((row) => [key(row), row])).values()];
  const creates = unique.filter((row) => !byKey.has(key(row)));
  const updates = unique.filter((row) => byKey.has(key(row))).map((row) => ({ id: byKey.get(key(row)).id, ...row }));
  if (creates.length) await base44.asServiceRole.entities[entity].bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities[entity].bulkUpdate(updates);
  return { created: creates.length, updated: updates.length };
}

async function ensureProjectionSource(base44) {
  const sourceRows = rows(await base44.asServiceRole.entities.DataSource.filter({ code: "US_OPTIONS_CANONICAL_PROJECTION" }));
  const sourceData = {
    name: "U.S. options canonical daily and signal projection", market_code: US_OPTIONS_MARKET_CODE,
    quote_mode: "end_of_day", delay_seconds: 0, public_enabled: false, source_type: "reference",
    license_status: "restricted", last_verified_at: new Date().toISOString(),
  };
  return sourceRows[0]
    ? base44.asServiceRole.entities.DataSource.update(sourceRows[0].id, sourceData)
    : base44.asServiceRole.entities.DataSource.create({ code: "US_OPTIONS_CANONICAL_PROJECTION", ...sourceData });
}

async function projectInstrumentBatch(base44, instrumentIds, sessionDate, sourceId, runId) {
  const idQuery = { $in: instrumentIds };
  const [instrumentRows, dailyRows, higherTimeframeRows, intradayRows, snapshotRows] = await Promise.all([
    base44.asServiceRole.entities.Instrument.filter({ id: idQuery, market_code: US_OPTIONS_MARKET_CODE }, "symbol", PROJECTION_BATCH_SIZE),
    base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: idQuery, market_code: US_OPTIONS_MARKET_CODE, interval: "1d" }, "start_time", 1000),
    base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: idQuery, market_code: US_OPTIONS_MARKET_CODE, interval: { $in: ["1wk", "1mo"] } }, "-end_time", PROJECTION_BATCH_SIZE * 8),
    base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: idQuery, market_code: US_OPTIONS_MARKET_CODE, interval: "15m", session_date: sessionDate }, "-end_time", 500),
    base44.asServiceRole.entities.IndicatorSnapshot.filter({ instrument_id: idQuery }, "-source_as_of", PROJECTION_BATCH_SIZE * 12),
  ]);
  const instruments = rows(instrumentRows).filter((item) => US_OPTIONS_SYMBOLS.has(item.symbol) && item.status !== "delisted");
  const usableChunks = [...rows(dailyRows), ...rows(higherTimeframeRows), ...rows(intradayRows)].filter((chunk) => chunk.quality_status !== "quarantined");
  const existingSnapshots = rows(snapshotRows).filter((item) => instrumentIds.includes(item.instrument_id));
  const projectedDaily = [];
  const higherChunks = [];
  const snapshots = [];
  const skipped = [];
  const slotKey = `${US_OPTIONS_MARKET_CODE}:technical-projection:${sessionDate}:${TECHNICAL_SIGNAL_FORMULA_VERSION}`;

  for (const instrument of instruments) {
    const instrumentChunks = usableChunks.filter((chunk) => chunk.instrument_id === instrument.id);
    const intraday = instrumentChunks
      .filter((chunk) => chunk.interval === "15m" && (chunk.session_date === sessionDate || String(chunk.chunk_key).endsWith(sessionDate)))
      .flatMap((chunk) => chunk.bars || []);
    const dailyBar = aggregateSession(intraday);
    const projectedKey = `${US_OPTIONS_MARKET_CODE}:${instrument.symbol}:1d:projection:${sessionDate.slice(0, 4)}`;
    const oldProjected = instrumentChunks.find((chunk) => chunk.interval === "1d" && chunk.chunk_key === projectedKey);
    if (dailyBar) {
      const projectedBars = dedupeDailyBars([...(oldProjected?.bars || []), dailyBar]);
      projectedDaily.push({
        instrument_id: instrument.id, market_code: US_OPTIONS_MARKET_CODE, symbol: instrument.symbol, interval: "1d",
        chunk_key: projectedKey, session_date: sessionDate, start_time: projectedBars[0].time, end_time: projectedBars.at(-1).time,
        bars: projectedBars, bar_count: projectedBars.length, checksum: await digest(projectedBars), source_id: sourceId, run_id: runId,
        snapshot_version: `${slotKey}:${instrument.symbol}`, provider_as_of: projectedBars.at(-1).time,
        received_time: new Date().toISOString(), quality_status: "verified", canonical_version: "us-options-daily-projection-v1",
        is_final: true, bucket_count: projectedBars.length, completeness_status: "complete", is_historical_archive: false, adjustment_mode: "none",
      });
    }
    const daily = dedupeDailyBars([
      ...instrumentChunks.filter((chunk) => chunk.interval === "1d").flatMap((chunk) => chunk.bars || []),
      ...(dailyBar ? [dailyBar] : []),
    ]);
    if (daily.length < 2) {
      skipped.push({ instrument_id: instrument.id, symbol: instrument.symbol, reason: "daily_history_missing" });
      continue;
    }
    const timeframeBars = {
      "1d": daily,
      "1wk": aggregateTechnicalBars(daily, "1wk", MARKET_OPTIONS),
      "1mo": aggregateTechnicalBars(daily, "1mo", MARKET_OPTIONS),
    };
    for (const [timeframe, signalBars] of Object.entries(timeframeBars)) {
      if (!signalBars.length) continue;
      const values = calculateTechnicalSignals(signalBars);
      snapshots.push({
        instrument_id: instrument.id, market_code: US_OPTIONS_MARKET_CODE, symbol: instrument.symbol,
        indicator_key: "technical_signals", timeframe, values: { ...values, is_final: true },
        source_as_of: signalBars.at(-1).time, calculated_at: new Date().toISOString(), formula_version: TECHNICAL_SIGNAL_FORMULA_VERSION,
      });
      const momentum = calculateMomentumZones(signalBars, 20, Number.POSITIVE_INFINITY);
      if (momentum) snapshots.push({
        instrument_id: instrument.id, market_code: US_OPTIONS_MARKET_CODE, symbol: instrument.symbol,
        indicator_key: "momentum_zones", timeframe, values: { ...momentum, is_final: true },
        source_as_of: signalBars.at(-1).time, calculated_at: new Date().toISOString(), formula_version: MOMENTUM_FORMULA_VERSION,
      });
      if (timeframe !== "1d") higherChunks.push({
        instrument_id: instrument.id, market_code: US_OPTIONS_MARKET_CODE, symbol: instrument.symbol, interval: timeframe,
        chunk_key: `${US_OPTIONS_MARKET_CODE}:${instrument.symbol}:${timeframe}:canonical`,
        start_time: signalBars[0].time, end_time: signalBars.at(-1).time, bars: signalBars,
        bar_count: signalBars.length, checksum: await digest(signalBars), source_id: sourceId, run_id: runId,
        snapshot_version: `${slotKey}:${instrument.symbol}`, provider_as_of: signalBars.at(-1).time,
        received_time: new Date().toISOString(), quality_status: "verified", canonical_version: "us-options-candle-projection-v1",
        is_final: true, bucket_count: signalBars.length, completeness_status: "complete", is_historical_archive: false, adjustment_mode: "none",
      });
    }
  }

  return {
    instruments: instruments.length,
    candles: await upsert(base44, "CandleChunk", [...projectedDaily, ...higherChunks], usableChunks, ["instrument_id", "interval", "chunk_key"]),
    signals: await upsert(base44, "IndicatorSnapshot", snapshots, existingSnapshots, ["instrument_id", "indicator_key", "timeframe"]),
    skipped,
  };
}

Deno.serve(async (req) => {
  let base44;
  let run = null;
  try {
    base44 = createClientFromRequest(req);
    const requestBody = await readJsonBody(req);
    const body = { ...requestBody, ...(requestBody.args || {}) };
    const authContext = body.session_id
      ? await requirePermission(base44, body.session_id, "data.ingestion.run")
      : await requireTrustedOwner(base44);
    const sessionDate = String(body.session_date || nyDate());

    if (body.mode === "projection_batch") {
      const allInstruments = rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_OPTIONS_MARKET_CODE }, "symbol", 500))
        .filter((item) => US_OPTIONS_SYMBOLS.has(item.symbol) && item.status !== "delisted")
        .sort((left, right) => String(left.symbol).localeCompare(String(right.symbol), "en"));
      if (allInstruments.length !== US_OPTIONS_CATALOG.companies.length) throw Object.assign(new Error(`U.S. options catalog is incomplete: ${allInstruments.length}/${US_OPTIONS_CATALOG.companies.length}`), { status: 503, code: "US_OPTIONS_CATALOG_INCOMPLETE" });
      const batchCount = Math.ceil(allInstruments.length / PROJECTION_BATCH_SIZE);
      const batchIndex = Number(body.batch_index);
      if (!Number.isInteger(batchIndex) || batchIndex < 0 || batchIndex >= batchCount) throw Object.assign(new Error("Valid batch_index is required"), { status: 400, code: "INVALID_BATCH_INDEX" });
      const selected = allInstruments.slice(batchIndex * PROJECTION_BATCH_SIZE, (batchIndex + 1) * PROJECTION_BATCH_SIZE);
      const source = await ensureProjectionSource(base44);
      run = await base44.asServiceRole.entities.IngestionRun.create({
        run_type: "technical_projection_batch", market_code: US_OPTIONS_MARKET_CODE,
        slot_key: `${US_OPTIONS_MARKET_CODE}:technical-projection:${sessionDate}:${TECHNICAL_SIGNAL_FORMULA_VERSION}:batch-${batchIndex + 1}-of-${batchCount}:${Date.now()}`,
        slot_kind: "technical_projection", scheduled_for: new Date().toISOString(),
        lease_expires_at: new Date(Date.now() + 3 * 60e3).toISOString(), started_at: new Date().toISOString(),
        total_records: selected.length, success_count: 0, failed_count: 0, status: "running", source_id: source.id,
        notes: `Bounded U.S. signal projection batch ${batchIndex + 1}/${batchCount}`,
      });
      const result = await projectInstrumentBatch(base44, selected.map((item) => item.id), sessionDate, source.id, run.id);
      const failed = new Set(result.skipped.map((item) => item.instrument_id)).size;
      const status = failed === 0 ? "success" : failed < selected.length ? "partial" : "failed";
      await base44.asServiceRole.entities.IngestionRun.update(run.id, {
        status, finished_at: new Date().toISOString(), success_count: selected.length - failed, failed_count: failed,
        coverage_percent: selected.length ? (selected.length - failed) / selected.length * 100 : 0,
        notes: JSON.stringify({ batch_index: batchIndex, batch_count: batchCount, candles: result.candles, signals: result.signals, skipped: result.skipped }),
      });
      if (authContext?.user?.id) await audit(
        base44,
        authContext.user.id,
        "market_data.refresh_signals_batch",
        "IngestionRun",
        run.id,
        status,
        String(body.reason || "manual U.S. signal projection").slice(0, 500),
        {},
        { market_code: US_OPTIONS_MARKET_CODE, batch_index: batchIndex, batch_count: batchCount }
      );
      return Response.json({ ...result, status, market_code: US_OPTIONS_MARKET_CODE, session_date: sessionDate, run_id: run.id, batch_index: batchIndex, batch_count: batchCount });
    }

    const slotKey = `${US_OPTIONS_MARKET_CODE}:technical-projection:${sessionDate}:${TECHNICAL_SIGNAL_FORMULA_VERSION}`;
    const oldRuns = rows(await base44.asServiceRole.entities.IngestionRun.filter({ slot_key: slotKey }));
    const completedRun = oldRuns.find((item) => ["success", "partial"].includes(item.status));
    if (completedRun && body.force !== true) return Response.json({ status: "skipped", reason: "already_projected", session_date: sessionDate, run_id: completedRun.id });
    const activeRun = oldRuns.find((item) => item.status === "running" && Date.parse(item.lease_expires_at || 0) > Date.now());
    if (activeRun && body.force !== true) return Response.json({ status: "skipped", reason: "projection_in_progress", session_date: sessionDate, run_id: activeRun.id });
    for (const staleRun of oldRuns.filter((item) => item.status === "running")) {
      await base44.asServiceRole.entities.IngestionRun.update(staleRun.id, {
        status: "failed", finished_at: new Date().toISOString(), failure_code: "SUPERSEDED_BY_BATCHED_RUN",
        notes: "Interrupted monolithic projection was replaced by a bounded batched projection",
      });
    }

    const source = await ensureProjectionSource(base44);
    const instruments = rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_OPTIONS_MARKET_CODE }, "symbol", 500))
      .filter((item) => US_OPTIONS_SYMBOLS.has(item.symbol) && item.status !== "delisted")
      .sort((left, right) => String(left.symbol).localeCompare(String(right.symbol), "en"));
    if (instruments.length !== US_OPTIONS_CATALOG.companies.length) throw Object.assign(new Error(`U.S. options catalog is incomplete: ${instruments.length}/${US_OPTIONS_CATALOG.companies.length}`), { status: 503, code: "US_OPTIONS_CATALOG_INCOMPLETE" });
    run = await base44.asServiceRole.entities.IngestionRun.create({
      run_type: "technical_projection", market_code: US_OPTIONS_MARKET_CODE, slot_key: slotKey, slot_kind: "technical_projection",
      scheduled_for: new Date().toISOString(), lease_expires_at: new Date(Date.now() + 5 * 60e3).toISOString(),
      started_at: new Date().toISOString(), total_records: instruments.length, success_count: 0, failed_count: 0,
      status: "running", source_id: source.id, notes: "Batched U.S. optionable daily, weekly, monthly and technical signal projection",
    });

    const instrumentBatches = batches(instruments.map((item) => item.id), PROJECTION_BATCH_SIZE);
    const batchResults = [];
    const failedBatches = [];
    for (let offset = 0; offset < instrumentBatches.length; offset += PROJECTION_CONCURRENCY) {
      const group = instrumentBatches.slice(offset, offset + PROJECTION_CONCURRENCY);
      const settled = await Promise.allSettled(group.map((instrumentIds) =>
        projectInstrumentBatch(base44, instrumentIds, sessionDate, source.id, run.id)
      ));
      settled.forEach((result, groupIndex) => {
        const batchIndex = offset + groupIndex;
        if (result.status === "fulfilled") batchResults.push(result.value || {});
        else failedBatches.push({
          batch_index: batchIndex,
          instrument_ids: instrumentBatches[batchIndex],
          error: result.reason?.response?.data?.error || result.reason?.message || "projection_batch_failed",
        });
      });
    }

    const skipped = batchResults.flatMap((item) => Array.isArray(item.skipped) ? item.skipped : []);
    const skippedIds = new Set(skipped.map((item) => item.instrument_id));
    const failedInstrumentCount = failedBatches.reduce((total, item) => total + item.instrument_ids.length, 0);
    const failureCount = Math.min(instruments.length, skippedIds.size + failedInstrumentCount);
    const status = failureCount === 0 ? "success" : failureCount < instruments.length ? "partial" : "failed";
    const candleResult = batchResults.reduce((total, item) => ({
      created: total.created + Number(item.candles?.created || 0), updated: total.updated + Number(item.candles?.updated || 0),
    }), { created: 0, updated: 0 });
    const signalResult = batchResults.reduce((total, item) => ({
      created: total.created + Number(item.signals?.created || 0), updated: total.updated + Number(item.signals?.updated || 0),
    }), { created: 0, updated: 0 });
    await base44.asServiceRole.entities.IngestionRun.update(run.id, {
      status, finished_at: new Date().toISOString(), success_count: instruments.length - failureCount,
      failed_count: failureCount, coverage_percent: (instruments.length - failureCount) / instruments.length * 100,
      snapshot_version: slotKey, notes: JSON.stringify({ candles: candleResult, signals: signalResult, batch_count: instrumentBatches.length, failed_batches: failedBatches, skipped_count: skippedIds.size }),
    });
    return Response.json({ status, market_code: US_OPTIONS_MARKET_CODE, session_date: sessionDate, run_id: run.id, candles: candleResult, signals: signalResult, skipped, failed_batches: failedBatches });
  } catch (error) {
    if (base44 && run?.id) {
      try { await base44.asServiceRole.entities.IngestionRun.update(run.id, { status: "failed", finished_at: new Date().toISOString(), failure_code: error?.code || "US_OPTIONS_SIGNAL_FAILED", notes: error?.message || "failed" }); } catch {}
    }
    return replyError(error);
  }
});
