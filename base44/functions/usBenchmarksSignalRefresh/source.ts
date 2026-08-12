import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { readJsonBody, replyError, requirePermission, requireTrustedOwner } from "../../shared/security.ts";
import { calculateMomentumZones, MOMENTUM_FORMULA_VERSION } from "../../shared/momentum.ts";
import { aggregateTechnicalBars, calculateTechnicalSignals, normalizeTechnicalBars, TECHNICAL_SIGNAL_FORMULA_VERSION, TECHNICAL_SIGNAL_WINDOW_SIZE } from "../../shared/technical-signals.ts";
import { US_BENCHMARKS_CATALOG, US_BENCHMARKS_MARKET_CODE, US_BENCHMARKS_SYMBOLS } from "../../shared/us-benchmarks-catalog.ts";

const MARKET_OPTIONS = { timeZone: "America/New_York", weekStartsOn: 1 };
// One bounded batch per workflow invocation. The previous monolithic job
// finished only its first 12 instruments before Base44 stopped the function.
const PROJECTION_BATCH_SIZE = 12;
const PROJECTION_BATCH_COUNT = Math.ceil(US_BENCHMARKS_CATALOG.instruments.length / PROJECTION_BATCH_SIZE);

function rows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

function nyDate(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MARKET_OPTIONS.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

function dailyBars(values) {
  const byDate = new Map();
  for (const bar of normalizeTechnicalBars(values)) byDate.set(nyDate(new Date(bar.time)), bar);
  return [...byDate.values()].sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
}

function projectionSlotKey(sessionDate) {
  return `${US_BENCHMARKS_MARKET_CODE}:technical-projection:${sessionDate}:${TECHNICAL_SIGNAL_FORMULA_VERSION}`;
}

function projectionBatchSlotKey(sessionDate, batchIndex) {
  return `${projectionSlotKey(sessionDate)}:batch-${batchIndex + 1}-of-${PROJECTION_BATCH_COUNT}`;
}

function parseRunNotes(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function aggregateSession(values) {
  const bars = normalizeTechnicalBars(values);
  if (!bars.length) return null;
  return { time: bars[0].time, open: bars[0].open, high: Math.max(...bars.map((bar) => bar.high)), low: Math.min(...bars.map((bar) => bar.low)), close: bars.at(-1).close, volume: bars.reduce((sum, bar) => sum + Number(bar.volume || 0), 0) };
}

async function upsert(base44, entity, values, existing, fields) {
  const key = (row) => fields.map((field) => String(row[field] ?? "")).join("|");
  const existingByKey = new Map(existing.map((row) => [key(row), row]));
  const unique = [...new Map(values.map((row) => [key(row), row])).values()];
  const creates = unique.filter((row) => !existingByKey.has(key(row)));
  const updates = unique.filter((row) => existingByKey.has(key(row))).map((row) => ({ id: existingByKey.get(key(row)).id, ...row }));
  if (creates.length) await base44.asServiceRole.entities[entity].bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities[entity].bulkUpdate(updates);
  return { created: creates.length, updated: updates.length };
}

async function projectionSource(base44) {
  const code = "US_BENCHMARKS_CANONICAL_PROJECTION";
  const existing = rows(await base44.asServiceRole.entities.DataSource.filter({ code }));
  const payload = { name: "U.S. benchmarks canonical candles and signals", market_code: US_BENCHMARKS_MARKET_CODE, quote_mode: "end_of_day", delay_seconds: 0, public_enabled: false, source_type: "reference", license_status: "restricted", last_verified_at: new Date().toISOString() };
  return existing[0] ? base44.asServiceRole.entities.DataSource.update(existing[0].id, payload) : base44.asServiceRole.entities.DataSource.create({ code, ...payload });
}

async function projectBatch(base44, instruments, sessionDate, sourceId, runId) {
  const ids = instruments.map((item) => item.id);
  const idQuery = { $in: ids };
  const [candleRows, snapshotRows] = await Promise.all([
    base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: idQuery, market_code: US_BENCHMARKS_MARKET_CODE }, "start_time", 2000),
    base44.asServiceRole.entities.IndicatorSnapshot.filter({ instrument_id: idQuery, market_code: US_BENCHMARKS_MARKET_CODE }, "-source_as_of", 500),
  ]);
  const chunks = rows(candleRows).filter((chunk) => chunk.quality_status !== "quarantined" && Array.isArray(chunk.bars));
  const existingSnapshots = rows(snapshotRows);
  const projectedCandles = [];
  const snapshots = [];
  const skipped = [];
  for (const instrument of instruments) {
    const instrumentChunks = chunks.filter((chunk) => chunk.instrument_id === instrument.id);
    const storedDaily = instrumentChunks.filter((chunk) => chunk.interval === "1d").flatMap((chunk) => chunk.bars || []);
    const intraday = instrumentChunks
      .filter((chunk) => chunk.interval === "15m"
        && chunk.session_date === sessionDate
        && chunk.is_final === true
        && chunk.completeness_status === "complete")
      .flatMap((chunk) => chunk.bars || []);
    const currentDaily = aggregateSession(intraday);
    const canonicalDaily = dailyBars([...storedDaily, ...(currentDaily ? [currentDaily] : [])]);
    if (canonicalDaily.length < 2) {
      skipped.push({ instrument_id: instrument.id, symbol: instrument.symbol, reason: "daily_history_missing" });
      continue;
    }
    const timeframes = { "1d": canonicalDaily, "1wk": aggregateTechnicalBars(canonicalDaily, "1wk", MARKET_OPTIONS), "1mo": aggregateTechnicalBars(canonicalDaily, "1mo", MARKET_OPTIONS) };
    for (const [timeframe, bars] of Object.entries(timeframes)) {
      if (!bars.length) continue;
      const technical = calculateTechnicalSignals(bars, TECHNICAL_SIGNAL_WINDOW_SIZE, timeframe);
      const currentPeriodIsFinal = timeframe === "1d" && Boolean(currentDaily);
      snapshots.push({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, symbol: instrument.symbol, indicator_key: "technical_signals", timeframe, values: { ...technical, is_final: currentPeriodIsFinal }, source_as_of: bars.at(-1).time, calculated_at: new Date().toISOString(), formula_version: TECHNICAL_SIGNAL_FORMULA_VERSION });
      const momentum = calculateMomentumZones(bars, 20, Number.POSITIVE_INFINITY, timeframe);
      if (momentum) snapshots.push({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, symbol: instrument.symbol, indicator_key: "momentum_zones", timeframe, values: { ...momentum, is_final: currentPeriodIsFinal }, source_as_of: bars.at(-1).time, calculated_at: new Date().toISOString(), formula_version: MOMENTUM_FORMULA_VERSION });
      if (timeframe !== "1d") projectedCandles.push({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, symbol: instrument.symbol, interval: timeframe, chunk_key: `${US_BENCHMARKS_MARKET_CODE}:${instrument.symbol}:${timeframe}:canonical`, start_time: bars[0].time, end_time: bars.at(-1).time, bars, bar_count: bars.length, checksum: await digest(bars), source_id: sourceId, run_id: runId, snapshot_version: `${US_BENCHMARKS_MARKET_CODE}:${sessionDate}:${TECHNICAL_SIGNAL_FORMULA_VERSION}`, provider_as_of: bars.at(-1).time, received_time: new Date().toISOString(), quality_status: "verified", canonical_version: "us-benchmarks-candle-projection-v1", is_final: currentPeriodIsFinal, bucket_count: bars.length, completeness_status: "complete", is_historical_archive: false, adjustment_mode: "none" });
    }
  }
  return {
    instruments: instruments.length,
    candles: await upsert(base44, "CandleChunk", projectedCandles, chunks, ["instrument_id", "interval", "chunk_key"]),
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
    if (body.session_id) await requirePermission(base44, body.session_id, "data.ingestion.run"); else await requireTrustedOwner(base44);
    if (String(body.market_code || US_BENCHMARKS_MARKET_CODE) !== US_BENCHMARKS_MARKET_CODE) throw Object.assign(new Error("Wrong market"), { status: 400, code: "MARKET_MISMATCH" });
    const sessionDate = String(body.session_date || nyDate());
    const slotKey = projectionSlotKey(sessionDate);
    const instruments = rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_BENCHMARKS_MARKET_CODE }, "symbol", 500))
      .filter((item) => US_BENCHMARKS_SYMBOLS.has(item.symbol) && item.status !== "delisted")
      .sort((left, right) => String(left.symbol).localeCompare(String(right.symbol), "en"));
    if (instruments.length !== US_BENCHMARKS_CATALOG.instruments.length) throw Object.assign(new Error(`Benchmark catalog incomplete: ${instruments.length}/${US_BENCHMARKS_CATALOG.instruments.length}`), { status: 503, code: "US_BENCHMARKS_CATALOG_INCOMPLETE" });
    if (Math.ceil(instruments.length / PROJECTION_BATCH_SIZE) !== PROJECTION_BATCH_COUNT) throw Object.assign(new Error(`Benchmark projection capacity changed: ${instruments.length}`), { status: 503, code: "PROJECTION_CAPACITY_CHANGED" });

    const recentRuns = rows(await base44.asServiceRole.entities.IngestionRun.filter({ market_code: US_BENCHMARKS_MARKET_CODE }, "-created_date", 250));
    const completedRun = recentRuns.find((item) => item.slot_key === slotKey && ["success", "partial"].includes(item.status));
    if (completedRun && body.force !== true) return Response.json({ status: "skipped", reason: "already_projected", market_code: US_BENCHMARKS_MARKET_CODE, session_date: sessionDate, run_id: completedRun.id });

    const completedBatches = [];
    let nextBatchIndex = -1;
    for (let batchIndex = 0; batchIndex < PROJECTION_BATCH_COUNT; batchIndex += 1) {
      const batchSlotKey = projectionBatchSlotKey(sessionDate, batchIndex);
      const batchRuns = recentRuns
        .filter((item) => item.slot_key === batchSlotKey)
        .sort((left, right) => Date.parse(right.finished_at || right.updated_date || right.created_date || 0) - Date.parse(left.finished_at || left.updated_date || left.created_date || 0));
      const completedBatch = batchRuns.find((item) => ["success", "partial"].includes(item.status));
      if (completedBatch && body.force !== true) {
        completedBatches.push(completedBatch);
        continue;
      }
      const activeBatch = batchRuns.find((item) => item.status === "running" && Date.parse(item.lease_expires_at || 0) > Date.now());
      if (activeBatch && body.force !== true) return Response.json({ status: "running", stage: "projection_batch", session_date: sessionDate, batch_index: batchIndex, batch_count: PROJECTION_BATCH_COUNT, run_id: activeBatch.id });
      for (const staleBatch of batchRuns.filter((item) => item.status === "running")) {
        await base44.asServiceRole.entities.IngestionRun.update(staleBatch.id, { status: "failed", finished_at: new Date().toISOString(), failure_code: "SUPERSEDED_STALE_BATCH", notes: "A stale benchmark projection batch was superseded by a bounded retry" });
      }
      nextBatchIndex = batchIndex;
      break;
    }

    if (nextBatchIndex >= 0) {
      const selected = instruments.slice(nextBatchIndex * PROJECTION_BATCH_SIZE, (nextBatchIndex + 1) * PROJECTION_BATCH_SIZE);
      const source = await projectionSource(base44);
      run = await base44.asServiceRole.entities.IngestionRun.create({
        run_type: "technical_projection_batch", market_code: US_BENCHMARKS_MARKET_CODE,
        slot_key: projectionBatchSlotKey(sessionDate, nextBatchIndex), slot_kind: "technical_projection",
        scheduled_for: new Date().toISOString(), lease_expires_at: new Date(Date.now() + 3 * 60e3).toISOString(),
        started_at: new Date().toISOString(), total_records: selected.length, success_count: 0, failed_count: 0,
        status: "running", source_id: source.id, notes: `Bounded benchmark projection batch ${nextBatchIndex + 1}/${PROJECTION_BATCH_COUNT}`,
      });
      const result = await projectBatch(base44, selected, sessionDate, source.id, run.id);
      const failed = new Set(result.skipped.map((item) => item.instrument_id)).size;
      const status = failed === 0 ? "success" : failed < selected.length ? "partial" : "failed";
      await base44.asServiceRole.entities.IngestionRun.update(run.id, {
        status, finished_at: new Date().toISOString(), success_count: selected.length - failed, failed_count: failed,
        coverage_percent: selected.length ? (selected.length - failed) / selected.length * 100 : 0,
        notes: JSON.stringify({ batch_index: nextBatchIndex, batch_count: PROJECTION_BATCH_COUNT, candles: result.candles, signals: result.signals, skipped: result.skipped }),
      });
      return Response.json({ ...result, status, stage: "projection_batch", market_code: US_BENCHMARKS_MARKET_CODE, session_date: sessionDate, run_id: run.id, batch_index: nextBatchIndex, batch_count: PROJECTION_BATCH_COUNT, completed_batches: nextBatchIndex + 1, remaining_batches: PROJECTION_BATCH_COUNT - nextBatchIndex - 1 });
    }

    const totalRecords = completedBatches.reduce((total, item) => total + Number(item.total_records || 0), 0);
    const successCount = completedBatches.reduce((total, item) => total + Number(item.success_count || 0), 0);
    const failedCount = Math.max(0, totalRecords - successCount);
    const candles = completedBatches.reduce((total, item) => {
      const notes = parseRunNotes(item.notes);
      total.created += Number(notes.candles?.created || 0);
      total.updated += Number(notes.candles?.updated || 0);
      return total;
    }, { created: 0, updated: 0 });
    const signals = completedBatches.reduce((total, item) => {
      const notes = parseRunNotes(item.notes);
      total.created += Number(notes.signals?.created || 0);
      total.updated += Number(notes.signals?.updated || 0);
      return total;
    }, { created: 0, updated: 0 });
    const status = failedCount === 0 ? "success" : failedCount < totalRecords ? "partial" : "failed";
    const source = await projectionSource(base44);
    run = await base44.asServiceRole.entities.IngestionRun.create({
      run_type: "technical_projection", market_code: US_BENCHMARKS_MARKET_CODE, slot_key: slotKey,
      slot_kind: "technical_projection", scheduled_for: new Date().toISOString(), started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(), lease_expires_at: new Date(Date.now() + 60e3).toISOString(),
      total_records: totalRecords, success_count: successCount, failed_count: failedCount, status, source_id: source.id,
      coverage_percent: totalRecords ? successCount / totalRecords * 100 : 0, snapshot_version: slotKey,
      notes: JSON.stringify({ candles, signals, batch_count: PROJECTION_BATCH_COUNT, batch_run_ids: completedBatches.map((item) => item.id) }),
    });
    return Response.json({ status, stage: "projection_finalize", market_code: US_BENCHMARKS_MARKET_CODE, session_date: sessionDate, run_id: run.id, instruments: totalRecords, success_count: successCount, failed_count: failedCount, candles, signals });
  } catch (error) {
    if (base44 && run?.id) try { await base44.asServiceRole.entities.IngestionRun.update(run.id, { status: "failed", finished_at: new Date().toISOString(), failure_code: error?.code || "US_BENCHMARKS_SIGNAL_FAILED", notes: error?.message || "failed" }); } catch {}
    return replyError(error);
  }
});
