import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, readJsonBody, replyError, requirePermission, requireTrustedOwner } from "../../shared/security.ts";
import { calculateMomentumZones, MOMENTUM_FORMULA_VERSION } from "../../shared/momentum.ts";
import { aggregateTechnicalBars, calculateTechnicalSignals, normalizeTechnicalBars, TECHNICAL_SIGNAL_FORMULA_VERSION, TECHNICAL_SIGNAL_WINDOW_SIZE } from "../../shared/technical-signals.ts";
import { US_OPTIONS_CATALOG, US_OPTIONS_MARKET_CODE, US_OPTIONS_SYMBOLS } from "../../shared/us-options-catalog.ts";
import { closeExpiredIngestionRuns } from "../../shared/ingestion-run-lifecycle.ts";

const MARKET_OPTIONS = { timeZone: "America/New_York", weekStartsOn: 1 };
// Base44 production history shows batches of 8 complete reliably, while 16-item
// batches overrun the execution lease before the first scheduled step returns.
// The workflow invokes each explicit batch directly and spaces calls by five
// minutes so no nested worker request or workflow burst is required.
const PROJECTION_BATCH_SIZE = 8;
const PROJECTION_BATCH_COUNT = Math.ceil(US_OPTIONS_CATALOG.companies.length / PROJECTION_BATCH_SIZE);

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

function projectionSlotKey(sessionDate) {
  return `${US_OPTIONS_MARKET_CODE}:technical-projection:${sessionDate}:${TECHNICAL_SIGNAL_FORMULA_VERSION}`;
}

function projectionBatchSlotKey(sessionDate, batchIndex) {
  return `${projectionSlotKey(sessionDate)}:batch-${batchIndex + 1}-of-${PROJECTION_BATCH_COUNT}`;
}

function parseRunNotes(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
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
    base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: idQuery, market_code: US_OPTIONS_MARKET_CODE, interval: "1d" }, "-start_time", 1000),
    base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: idQuery, market_code: US_OPTIONS_MARKET_CODE, interval: { $in: ["1wk", "1mo"] } }, "-end_time", PROJECTION_BATCH_SIZE * 8),
    base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: idQuery, market_code: US_OPTIONS_MARKET_CODE, interval: "15m", session_date: sessionDate }, "-end_time", 500),
    base44.asServiceRole.entities.IndicatorSnapshot.filter({ instrument_id: idQuery, market_code: US_OPTIONS_MARKET_CODE }, "-source_as_of", PROJECTION_BATCH_SIZE * 12),
  ]);
  const instruments = rows(instrumentRows).filter((item) => US_OPTIONS_SYMBOLS.has(item.symbol) && item.status !== "delisted");
  const usableChunks = [...rows(dailyRows), ...rows(higherTimeframeRows), ...rows(intradayRows)].filter((chunk) => chunk.quality_status !== "quarantined");
  const existingSnapshots = rows(snapshotRows).filter((item) => instrumentIds.includes(item.instrument_id));
  const projectedDaily = [];
  const higherChunks = [];
  const snapshots = [];
  const skipped = [];
  const slotKey = projectionSlotKey(sessionDate);

  for (const instrument of instruments) {
    const instrumentChunks = usableChunks.filter((chunk) => chunk.instrument_id === instrument.id);
    const intraday = instrumentChunks
      .filter((chunk) => chunk.interval === "15m"
        && (chunk.session_date === sessionDate || String(chunk.chunk_key).endsWith(sessionDate))
        && chunk.is_final === true
        && chunk.completeness_status === "complete")
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
      const values = calculateTechnicalSignals(signalBars, TECHNICAL_SIGNAL_WINDOW_SIZE, timeframe);
      const currentPeriodIsFinal = timeframe === "1d" && Boolean(dailyBar);
      snapshots.push({
        instrument_id: instrument.id, market_code: US_OPTIONS_MARKET_CODE, symbol: instrument.symbol,
        indicator_key: "technical_signals", timeframe, values: { ...values, is_final: currentPeriodIsFinal },
        source_as_of: signalBars.at(-1).time, calculated_at: new Date().toISOString(), formula_version: TECHNICAL_SIGNAL_FORMULA_VERSION,
      });
      const momentum = calculateMomentumZones(signalBars, 20, Number.POSITIVE_INFINITY, timeframe);
      if (momentum) snapshots.push({
        instrument_id: instrument.id, market_code: US_OPTIONS_MARKET_CODE, symbol: instrument.symbol,
        indicator_key: "momentum_zones", timeframe, values: { ...momentum, is_final: currentPeriodIsFinal },
        source_as_of: signalBars.at(-1).time, calculated_at: new Date().toISOString(), formula_version: MOMENTUM_FORMULA_VERSION,
      });
      if (timeframe !== "1d") higherChunks.push({
        instrument_id: instrument.id, market_code: US_OPTIONS_MARKET_CODE, symbol: instrument.symbol, interval: timeframe,
        chunk_key: `${US_OPTIONS_MARKET_CODE}:${instrument.symbol}:${timeframe}:canonical`,
        start_time: signalBars[0].time, end_time: signalBars.at(-1).time, bars: signalBars,
        bar_count: signalBars.length, checksum: await digest(signalBars), source_id: sourceId, run_id: runId,
        snapshot_version: `${slotKey}:${instrument.symbol}`, provider_as_of: signalBars.at(-1).time,
        received_time: new Date().toISOString(), quality_status: "verified", canonical_version: "us-options-candle-projection-v1",
        is_final: currentPeriodIsFinal, bucket_count: signalBars.length, completeness_status: "complete", is_historical_archive: false, adjustment_mode: "none",
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
      ? await requirePermission(base44, body.session_id, body.device_id, "data.ingestion.run")
      : await requireTrustedOwner(base44);
    await closeExpiredIngestionRuns(base44, US_OPTIONS_MARKET_CODE);
    const sessionDate = String(body.session_date || nyDate());

    if (body.mode === "projection_batch") {
      const allInstruments = rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_OPTIONS_MARKET_CODE }, "symbol", 500))
        .filter((item) => US_OPTIONS_SYMBOLS.has(item.symbol) && item.status !== "delisted")
        .sort((left, right) => String(left.symbol).localeCompare(String(right.symbol), "en"));
      if (allInstruments.length !== US_OPTIONS_CATALOG.companies.length) throw Object.assign(new Error(`U.S. options catalog is incomplete: ${allInstruments.length}/${US_OPTIONS_CATALOG.companies.length}`), { status: 503, code: "US_OPTIONS_CATALOG_INCOMPLETE" });
      const batchCount = Math.ceil(allInstruments.length / PROJECTION_BATCH_SIZE);
      if (batchCount !== PROJECTION_BATCH_COUNT) throw Object.assign(new Error(`U.S. options projection capacity changed: ${allInstruments.length}`), { status: 503, code: "PROJECTION_CAPACITY_CHANGED" });
      const batchIndex = Number(body.batch_index);
      if (!Number.isInteger(batchIndex) || batchIndex < 0 || batchIndex >= batchCount) throw Object.assign(new Error("Valid batch_index is required"), { status: 400, code: "INVALID_BATCH_INDEX" });
      const selected = allInstruments.slice(batchIndex * PROJECTION_BATCH_SIZE, (batchIndex + 1) * PROJECTION_BATCH_SIZE);
      const batchSlotKey = projectionBatchSlotKey(sessionDate, batchIndex);
      const existingBatchRuns = rows(await base44.asServiceRole.entities.IngestionRun.filter({ slot_key: batchSlotKey }));
      const completedBatch = existingBatchRuns
        .filter((item) => ["success", "partial"].includes(item.status))
        .sort((left, right) => Date.parse(right.finished_at || right.updated_date || 0) - Date.parse(left.finished_at || left.updated_date || 0))[0];
      if (completedBatch && body.force !== true) return Response.json({ status: "skipped", reason: "batch_already_projected", session_date: sessionDate, batch_index: batchIndex, batch_count: batchCount, run_id: completedBatch.id });
      const activeBatch = existingBatchRuns.find((item) => item.status === "running" && Date.parse(item.lease_expires_at || 0) > Date.now());
      if (activeBatch && body.force !== true) return Response.json({ status: "running", reason: "batch_projection_in_progress", session_date: sessionDate, batch_index: batchIndex, batch_count: batchCount, run_id: activeBatch.id });
      for (const staleBatch of existingBatchRuns.filter((item) => item.status === "running")) {
        await base44.asServiceRole.entities.IngestionRun.update(staleBatch.id, {
          status: "failed", finished_at: new Date().toISOString(), failure_code: "SUPERSEDED_STALE_BATCH",
          notes: "A stale U.S. options projection batch was superseded by a bounded retry",
        });
      }
      const source = await ensureProjectionSource(base44);
      run = await base44.asServiceRole.entities.IngestionRun.create({
        run_type: "technical_projection_batch", market_code: US_OPTIONS_MARKET_CODE,
        slot_key: batchSlotKey,
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

    const slotKey = projectionSlotKey(sessionDate);

    if (body.mode === "projection_finalize") {
      const existingRuns = rows(await base44.asServiceRole.entities.IngestionRun.filter({ market_code: US_OPTIONS_MARKET_CODE }, "-created_date", 500));
      const completedRun = existingRuns
        .filter((item) => item.slot_key === slotKey && ["success", "partial"].includes(item.status))
        .sort((left, right) => Date.parse(right.finished_at || right.updated_date || 0) - Date.parse(left.finished_at || left.updated_date || 0))[0];
      if (completedRun && body.force !== true) return Response.json({ status: "skipped", reason: "already_projected", session_date: sessionDate, run_id: completedRun.id });
      const batchRuns = [];
      for (let batchIndex = 0; batchIndex < PROJECTION_BATCH_COUNT; batchIndex += 1) {
        const batchSlotKey = projectionBatchSlotKey(sessionDate, batchIndex);
        const latest = existingRuns
          .filter((item) => item.slot_key === batchSlotKey && ["success", "partial", "failed"].includes(item.status))
          .sort((left, right) => Date.parse(right.finished_at || right.updated_date || 0) - Date.parse(left.finished_at || left.updated_date || 0))[0];
        if (!latest || latest.status === "failed") throw Object.assign(new Error(`U.S. options projection batch ${batchIndex + 1}/${PROJECTION_BATCH_COUNT} is incomplete`), { status: 503, code: "PROJECTION_BATCHES_INCOMPLETE" });
        batchRuns.push(latest);
      }
      for (const staleRun of existingRuns.filter((item) => item.slot_key === slotKey && item.status === "running")) {
        await base44.asServiceRole.entities.IngestionRun.update(staleRun.id, {
          status: "failed", finished_at: new Date().toISOString(), failure_code: "SUPERSEDED_BY_BATCHED_RUN",
          notes: "Interrupted monolithic projection was replaced by bounded workflow batches",
        });
      }
      const totalRecords = batchRuns.reduce((total, item) => total + Number(item.total_records || 0), 0);
      const successCount = batchRuns.reduce((total, item) => total + Number(item.success_count || 0), 0);
      const failedCount = Math.max(0, totalRecords - successCount);
      const candleResult = batchRuns.reduce((total, item) => {
        const notes = parseRunNotes(item.notes);
        total.created += Number(notes.candles?.created || 0);
        total.updated += Number(notes.candles?.updated || 0);
        return total;
      }, { created: 0, updated: 0 });
      const signalResult = batchRuns.reduce((total, item) => {
        const notes = parseRunNotes(item.notes);
        total.created += Number(notes.signals?.created || 0);
        total.updated += Number(notes.signals?.updated || 0);
        return total;
      }, { created: 0, updated: 0 });
      const status = failedCount === 0 ? "success" : failedCount < totalRecords ? "partial" : "failed";
      const source = await ensureProjectionSource(base44);
      run = await base44.asServiceRole.entities.IngestionRun.create({
        run_type: "technical_projection", market_code: US_OPTIONS_MARKET_CODE, slot_key: slotKey, slot_kind: "technical_projection",
        scheduled_for: new Date().toISOString(), lease_expires_at: new Date(Date.now() + 60e3).toISOString(),
        started_at: new Date().toISOString(), finished_at: new Date().toISOString(), total_records: totalRecords,
        success_count: successCount, failed_count: failedCount, status, source_id: source.id,
        coverage_percent: totalRecords ? successCount / totalRecords * 100 : 0, snapshot_version: slotKey,
        notes: JSON.stringify({ candles: candleResult, signals: signalResult, batch_count: PROJECTION_BATCH_COUNT, batch_run_ids: batchRuns.map((item) => item.id) }),
      });
      return Response.json({ status, market_code: US_OPTIONS_MARKET_CODE, session_date: sessionDate, instruments: totalRecords, success_count: successCount, failed_count: failedCount, candles: candleResult, signals: signalResult, run_id: run.id });
    }

    if (!body.mode) {
      const existingRuns = rows(await base44.asServiceRole.entities.IngestionRun.filter({ market_code: US_OPTIONS_MARKET_CODE }, "-created_date", 500));
      let nextBatchIndex = -1;
      for (let batchIndex = 0; batchIndex < PROJECTION_BATCH_COUNT; batchIndex += 1) {
        const latest = existingRuns
          .filter((item) => item.slot_key === projectionBatchSlotKey(sessionDate, batchIndex))
          .sort((left, right) => Date.parse(right.finished_at || right.updated_date || right.started_at || 0) - Date.parse(left.finished_at || left.updated_date || left.started_at || 0))[0];
        if (latest?.status === "running" && Date.parse(latest.lease_expires_at || 0) > Date.now()) return Response.json({ status: "running", stage: "projection_batch", session_date: sessionDate, batch_index: batchIndex, batch_count: PROJECTION_BATCH_COUNT, run_id: latest.id });
        if (!["success", "partial"].includes(latest?.status)) { nextBatchIndex = batchIndex; break; }
      }
      if (nextBatchIndex >= 0) {
        const response = await base44.functions.invoke("usOptionsSignalProjectionWorker", {
          session_id: body.session_id, device_id: body.device_id, source: body.source || "daily_session_projection", reason: body.reason,
          force: false, mode: "projection_batch", batch_index: nextBatchIndex, batch_count: PROJECTION_BATCH_COUNT, session_date: sessionDate,
        });
        const batch = response?.data || response;
        return Response.json({ status: batch?.status || "success", stage: "projection_batch", market_code: US_OPTIONS_MARKET_CODE, session_date: sessionDate, batch_index: nextBatchIndex, batch_count: PROJECTION_BATCH_COUNT, completed_batches: nextBatchIndex + 1, remaining_batches: Math.max(0, PROJECTION_BATCH_COUNT - nextBatchIndex - 1), batch });
      }
      const response = await base44.functions.invoke("usOptionsSignalProjectionWorker", {
        session_id: body.session_id, device_id: body.device_id, source: body.source || "daily_session_projection", reason: body.reason,
        force: false, mode: "projection_finalize", batch_count: PROJECTION_BATCH_COUNT, session_date: sessionDate,
      });
      return Response.json({ status: response?.data?.status || response?.status || "success", stage: "projection_finalize", market_code: US_OPTIONS_MARKET_CODE, session_date: sessionDate, final: response?.data || response });
    }

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

    throw Object.assign(new Error("A bounded projection mode is required"), { status: 400, code: "BOUNDED_PROJECTION_REQUIRED" });
  } catch (error) {
    if (base44 && run?.id) {
      try { await base44.asServiceRole.entities.IngestionRun.update(run.id, { status: "failed", finished_at: new Date().toISOString(), failure_code: error?.code || "US_OPTIONS_SIGNAL_FAILED", notes: error?.message || "failed" }); } catch {}
    }
    return replyError(error);
  }
});
