import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { readJsonBody, replyError, requirePermission, requireTrustedOwner } from "../../shared/security.ts";
import { calculateMomentumZones, MOMENTUM_FORMULA_VERSION } from "../../shared/momentum.ts";
import { aggregateTechnicalBars, calculateTechnicalSignals, normalizeTechnicalBars, TECHNICAL_SIGNAL_FORMULA_VERSION } from "../../shared/technical-signals.ts";
import { US_OPTIONS_CATALOG, US_OPTIONS_MARKET_CODE, US_OPTIONS_SYMBOLS } from "../../shared/us-options-catalog.ts";

const MARKET_OPTIONS = { timeZone: "America/New_York", weekStartsOn: 1 };

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

Deno.serve(async (req) => {
  let base44;
  let run = null;
  try {
    base44 = createClientFromRequest(req);
    const requestBody = await readJsonBody(req);
    const body = { ...requestBody, ...(requestBody.args || {}) };
    if (body.session_id) await requirePermission(base44, body.session_id, "data.ingestion.run");
    else await requireTrustedOwner(base44);
    const sessionDate = String(body.session_date || nyDate());
    const slotKey = `${US_OPTIONS_MARKET_CODE}:technical-projection:${sessionDate}:${TECHNICAL_SIGNAL_FORMULA_VERSION}`;
    const oldRuns = await base44.asServiceRole.entities.IngestionRun.filter({ slot_key: slotKey });
    if (oldRuns.some((item) => ["success", "partial"].includes(item.status)) && body.force !== true) return Response.json({ status: "skipped", reason: "already_projected", session_date: sessionDate });
    const sourceRows = await base44.asServiceRole.entities.DataSource.filter({ code: "US_OPTIONS_CANONICAL_PROJECTION" });
    const sourceData = {
      name: "U.S. options canonical daily and signal projection", market_code: US_OPTIONS_MARKET_CODE,
      quote_mode: "end_of_day", delay_seconds: 0, public_enabled: false, source_type: "reference",
      license_status: "restricted", last_verified_at: new Date().toISOString(),
    };
    const source = sourceRows[0]
      ? await base44.asServiceRole.entities.DataSource.update(sourceRows[0].id, sourceData)
      : await base44.asServiceRole.entities.DataSource.create({ code: "US_OPTIONS_CANONICAL_PROJECTION", ...sourceData });
    const instruments = rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_OPTIONS_MARKET_CODE }))
      .filter((item) => US_OPTIONS_SYMBOLS.has(item.symbol) && item.status !== "delisted");
    if (instruments.length !== US_OPTIONS_CATALOG.companies.length) throw Object.assign(new Error("U.S. options catalog is incomplete"), { status: 503, code: "US_OPTIONS_CATALOG_INCOMPLETE" });
    run = await base44.asServiceRole.entities.IngestionRun.create({
      run_type: "technical_projection", market_code: US_OPTIONS_MARKET_CODE, slot_key: slotKey, slot_kind: "technical_projection",
      scheduled_for: new Date().toISOString(), lease_expires_at: new Date(Date.now() + 4 * 60e3).toISOString(),
      started_at: new Date().toISOString(), total_records: instruments.length, success_count: 0, failed_count: 0,
      status: "running", source_id: source.id, notes: "U.S. optionable daily, weekly, monthly and technical signal projection",
    });
    const instrumentIds = new Set(instruments.map((item) => item.id));
    const allChunks = [];
    for (const idBatch of batches([...instrumentIds], 10)) {
      const dailyChunks = rows(await base44.asServiceRole.entities.CandleChunk.filter(
        { instrument_id: { $in: idBatch }, market_code: US_OPTIONS_MARKET_CODE, interval: "1d" },
        "start_time",
        1000,
      ));
      allChunks.push(...dailyChunks);
    }
    allChunks.push(...rows(await base44.asServiceRole.entities.CandleChunk.filter(
      { instrument_id: { $in: [...instrumentIds] }, market_code: US_OPTIONS_MARKET_CODE, interval: "15m", session_date: sessionDate },
      "-end_time",
      500,
    )));
    const usableChunks = allChunks.filter((chunk) => chunk.quality_status !== "quarantined");
    const existingSnapshots = rows(await base44.asServiceRole.entities.IndicatorSnapshot.list("-source_as_of", 5e3))
      .filter((item) => instrumentIds.has(item.instrument_id));
    const projectedDaily = [];
    const higherChunks = [];
    const snapshots = [];
    const skipped = [];
    for (const instrument of instruments) {
      const instrumentChunks = usableChunks.filter((chunk) => chunk.instrument_id === instrument.id);
      const intraday = instrumentChunks.filter((chunk) => chunk.interval === "15m" && (chunk.session_date === sessionDate || String(chunk.chunk_key).endsWith(sessionDate))).flatMap((chunk) => chunk.bars || []);
      const dailyBar = aggregateSession(intraday);
      const projectedKey = `${US_OPTIONS_MARKET_CODE}:${instrument.symbol}:1d:projection:${sessionDate.slice(0, 4)}`;
      const oldProjected = instrumentChunks.find((chunk) => chunk.interval === "1d" && chunk.chunk_key === projectedKey);
      if (dailyBar) {
        const bars = dedupeDailyBars([...(oldProjected?.bars || []), dailyBar]);
        projectedDaily.push({
          instrument_id: instrument.id, market_code: US_OPTIONS_MARKET_CODE, symbol: instrument.symbol, interval: "1d",
          chunk_key: projectedKey, session_date: sessionDate, start_time: bars[0].time, end_time: bars.at(-1).time,
          bars, bar_count: bars.length, checksum: await digest(bars), source_id: source.id, run_id: run.id,
          snapshot_version: `${slotKey}:${instrument.symbol}`, provider_as_of: bars.at(-1).time,
          received_time: new Date().toISOString(), quality_status: "verified", canonical_version: "us-options-daily-projection-v1",
          is_final: true, bucket_count: bars.length, completeness_status: "complete", is_historical_archive: false, adjustment_mode: "none",
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
          bar_count: signalBars.length, checksum: await digest(signalBars), source_id: source.id, run_id: run.id,
          snapshot_version: `${slotKey}:${instrument.symbol}`, provider_as_of: signalBars.at(-1).time,
          received_time: new Date().toISOString(), quality_status: "verified", canonical_version: "us-options-candle-projection-v1",
          is_final: true, bucket_count: signalBars.length, completeness_status: "complete", is_historical_archive: false, adjustment_mode: "none",
        });
      }
    }
    const candleResult = await upsert(base44, "CandleChunk", [...projectedDaily, ...higherChunks], usableChunks, ["instrument_id", "interval", "chunk_key"]);
    const signalResult = await upsert(base44, "IndicatorSnapshot", snapshots, existingSnapshots, ["instrument_id", "indicator_key", "timeframe"]);
    const failed = new Set(skipped.map((item) => item.instrument_id)).size;
    const status = failed === 0 ? "success" : failed < instruments.length * 0.05 ? "partial" : "failed";
    await base44.asServiceRole.entities.IngestionRun.update(run.id, {
      status, finished_at: new Date().toISOString(), success_count: instruments.length - failed,
      failed_count: failed, coverage_percent: (instruments.length - failed) / instruments.length * 100,
      snapshot_version: slotKey, notes: `daily:${projectedDaily.length};higher:${higherChunks.length};signals:${snapshots.length};skipped:${failed}`,
    });
    if (status === "failed") throw Object.assign(new Error("U.S. options signal projection coverage failed"), { status: 503, code: "US_OPTIONS_SIGNAL_COVERAGE_FAILED" });
    return Response.json({ status, market_code: US_OPTIONS_MARKET_CODE, session_date: sessionDate, run_id: run.id, candles: candleResult, signals: signalResult, skipped });
  } catch (error) {
    if (base44 && run?.id) {
      try { await base44.asServiceRole.entities.IngestionRun.update(run.id, { status: "failed", finished_at: new Date().toISOString(), failure_code: error?.code || "US_OPTIONS_SIGNAL_FAILED", notes: error?.message || "failed" }); } catch {}
    }
    return replyError(error);
  }
});
