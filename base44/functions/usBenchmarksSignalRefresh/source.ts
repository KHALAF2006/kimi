import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { readJsonBody, replyError, requirePermission, requireTrustedOwner } from "../../shared/security.ts";
import { calculateMomentumZones, MOMENTUM_FORMULA_VERSION } from "../../shared/momentum.ts";
import { aggregateTechnicalBars, calculateTechnicalSignals, normalizeTechnicalBars, TECHNICAL_SIGNAL_FORMULA_VERSION, TECHNICAL_SIGNAL_WINDOW_SIZE } from "../../shared/technical-signals.ts";
import { US_BENCHMARKS_CATALOG, US_BENCHMARKS_MARKET_CODE, US_BENCHMARKS_SYMBOLS } from "../../shared/us-benchmarks-catalog.ts";

const MARKET_OPTIONS = { timeZone: "America/New_York", weekStartsOn: 1 };
const BATCH_SIZE = 6;
const CONCURRENCY = 2;

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

function batches(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function dailyBars(values) {
  const byDate = new Map();
  for (const bar of normalizeTechnicalBars(values)) byDate.set(nyDate(new Date(bar.time)), bar);
  return [...byDate.values()].sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
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
    const intraday = instrumentChunks.filter((chunk) => chunk.interval === "15m" && chunk.session_date === sessionDate).flatMap((chunk) => chunk.bars || []);
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
      snapshots.push({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, symbol: instrument.symbol, indicator_key: "technical_signals", timeframe, values: { ...technical, is_final: timeframe === "1d" }, source_as_of: bars.at(-1).time, calculated_at: new Date().toISOString(), formula_version: TECHNICAL_SIGNAL_FORMULA_VERSION });
      const momentum = calculateMomentumZones(bars, 20, Number.POSITIVE_INFINITY, timeframe);
      if (momentum) snapshots.push({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, symbol: instrument.symbol, indicator_key: "momentum_zones", timeframe, values: { ...momentum, is_final: timeframe === "1d" }, source_as_of: bars.at(-1).time, calculated_at: new Date().toISOString(), formula_version: MOMENTUM_FORMULA_VERSION });
      if (timeframe !== "1d") projectedCandles.push({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, symbol: instrument.symbol, interval: timeframe, chunk_key: `${US_BENCHMARKS_MARKET_CODE}:${instrument.symbol}:${timeframe}:canonical`, start_time: bars[0].time, end_time: bars.at(-1).time, bars, bar_count: bars.length, checksum: await digest(bars), source_id: sourceId, run_id: runId, snapshot_version: `${US_BENCHMARKS_MARKET_CODE}:${sessionDate}:${TECHNICAL_SIGNAL_FORMULA_VERSION}`, provider_as_of: bars.at(-1).time, received_time: new Date().toISOString(), quality_status: "verified", canonical_version: "us-benchmarks-candle-projection-v1", is_final: false, bucket_count: bars.length, completeness_status: "complete", is_historical_archive: false, adjustment_mode: "none" });
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
    const slotKey = `${US_BENCHMARKS_MARKET_CODE}:technical-projection:${sessionDate}:${TECHNICAL_SIGNAL_FORMULA_VERSION}`;
    const existingRuns = rows(await base44.asServiceRole.entities.IngestionRun.filter({ slot_key: slotKey }));
    if (existingRuns.some((item) => ["success", "partial"].includes(item.status)) && body.force !== true) return Response.json({ status: "skipped", reason: "already_projected", market_code: US_BENCHMARKS_MARKET_CODE, session_date: sessionDate });
    for (const stale of existingRuns.filter((item) => item.status === "running" && Date.parse(item.lease_expires_at || 0) <= Date.now())) await base44.asServiceRole.entities.IngestionRun.update(stale.id, { status: "failed", finished_at: new Date().toISOString(), failure_code: "STALE_PROJECTION_LEASE", notes: "Expired projection lease was closed before retry" });
    const instruments = rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_BENCHMARKS_MARKET_CODE }, "symbol", 500)).filter((item) => US_BENCHMARKS_SYMBOLS.has(item.symbol) && item.status !== "delisted");
    if (instruments.length !== US_BENCHMARKS_CATALOG.instruments.length) throw Object.assign(new Error(`Benchmark catalog incomplete: ${instruments.length}/${US_BENCHMARKS_CATALOG.instruments.length}`), { status: 503, code: "US_BENCHMARKS_CATALOG_INCOMPLETE" });
    const source = await projectionSource(base44);
    run = await base44.asServiceRole.entities.IngestionRun.create({ run_type: "technical_projection", market_code: US_BENCHMARKS_MARKET_CODE, slot_key: slotKey, slot_kind: "technical_projection", scheduled_for: new Date().toISOString(), lease_expires_at: new Date(Date.now() + 3 * 60e3).toISOString(), started_at: new Date().toISOString(), total_records: instruments.length, success_count: 0, failed_count: 0, status: "running", source_id: source.id, notes: "U.S. indices and ETFs daily, weekly, monthly signal projection" });
    const groups = batches(instruments, BATCH_SIZE);
    const completed = [];
    const failedBatches = [];
    for (let offset = 0; offset < groups.length; offset += CONCURRENCY) {
      const settled = await Promise.allSettled(groups.slice(offset, offset + CONCURRENCY).map((group) => projectBatch(base44, group, sessionDate, source.id, run.id)));
      settled.forEach((result, index) => result.status === "fulfilled" ? completed.push(result.value) : failedBatches.push({ batch_index: offset + index, count: groups[offset + index].length, error: result.reason?.message || "projection_batch_failed" }));
    }
    const skipped = completed.flatMap((item) => item.skipped || []);
    const failed = skipped.length + failedBatches.reduce((sum, item) => sum + item.count, 0);
    const status = failed === 0 ? "success" : failed < instruments.length ? "partial" : "failed";
    const candles = completed.reduce((sum, item) => ({ created: sum.created + Number(item.candles?.created || 0), updated: sum.updated + Number(item.candles?.updated || 0) }), { created: 0, updated: 0 });
    const signals = completed.reduce((sum, item) => ({ created: sum.created + Number(item.signals?.created || 0), updated: sum.updated + Number(item.signals?.updated || 0) }), { created: 0, updated: 0 });
    await base44.asServiceRole.entities.IngestionRun.update(run.id, { status, finished_at: new Date().toISOString(), success_count: instruments.length - failed, failed_count: failed, coverage_percent: (instruments.length - failed) / instruments.length * 100, snapshot_version: slotKey, notes: JSON.stringify({ candles, signals, failed_batches: failedBatches, skipped_count: skipped.length }) });
    return Response.json({ status, market_code: US_BENCHMARKS_MARKET_CODE, session_date: sessionDate, run_id: run.id, candles, signals, skipped, failed_batches: failedBatches });
  } catch (error) {
    if (base44 && run?.id) try { await base44.asServiceRole.entities.IngestionRun.update(run.id, { status: "failed", finished_at: new Date().toISOString(), failure_code: error?.code || "US_BENCHMARKS_SIGNAL_FAILED", notes: error?.message || "failed" }); } catch {}
    return replyError(error);
  }
});
