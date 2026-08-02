import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { canonicalizeQuarterHourBars } from "../../shared/market-data.ts";
import { replyError, requirePermission } from "../../shared/security.ts";
import {
  TECHNICAL_SIGNAL_FORMULA_VERSION,
  TECHNICAL_SIGNAL_WINDOW_SIZE,
  aggregateTechnicalBars,
  calculateTechnicalSignals,
  normalizeTechnicalBars,
} from "../../shared/technical-signals.ts";

const CANONICAL_VERSION = "candle-projection-v1";
const MARKET_CODE = "SA_MAIN";
const BATCH_SIZE = 500;
const PROJECTION_BATCH_SIZE = 24;
const PROJECTION_CONCURRENCY = 3;

function entityRows(value: unknown): Array<Record<string, any>> {
  if (Array.isArray(value)) return value;
  if (Array.isArray((value as any)?.data)) return (value as any).data;
  return [];
}

function riyadhDate(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

async function digest(value: unknown) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function inBatches<T>(rows: T[], operation: (batch: T[]) => Promise<unknown>) {
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    await operation(rows.slice(offset, offset + BATCH_SIZE));
  }
}

function rowKey(row: Record<string, any>, fields: string[]) {
  return fields.map((field) => String(row[field] ?? "")).join("|");
}

async function upsertRows(
  base44: any,
  entity: string,
  rows: Array<Record<string, any>>,
  existing: Array<Record<string, any>>,
  keyFields: string[],
) {
  const unique = new Map(rows.map((row) => [rowKey(row, keyFields), row]));
  const existingByKey = new Map(existing.map((row) => [rowKey(row, keyFields), row]));
  const creates: Array<Record<string, any>> = [];
  const updates: Array<Record<string, any>> = [];
  for (const [key, row] of unique) {
    const current = existingByKey.get(key);
    if (current) updates.push({ id: current.id, ...row });
    else creates.push(row);
  }
  await inBatches(creates, (batch) => base44.asServiceRole.entities[entity].bulkCreate(batch));
  await inBatches(updates, (batch) => base44.asServiceRole.entities[entity].bulkUpdate(batch));
  return { created: creates.length, updated: updates.length };
}

function quoteIsFinalForSession(quote: Record<string, any> | null, sessionDate: string) {
  return Boolean(
    quote
    && quote.session_date === sessionDate
    && quote.quality_status === "verified"
    && quote.is_final === true
  );
}

function isThursday(sessionDate: string) {
  return new Date(`${sessionDate}T00:00:00.000Z`).getUTCDay() === 4;
}

function finalDailyBar(
  bars: Array<Record<string, any>>,
  quote: Record<string, any>,
) {
  const canonical = canonicalizeQuarterHourBars(bars);
  if (!canonical.length) return null;
  const first = canonical[0];
  const last = canonical.at(-1);
  const open = Number(quote.open) > 0 ? Number(quote.open) : Number(first.open);
  const close = Number(quote.last_price) > 0 ? Number(quote.last_price) : Number(last.close);
  const high = Math.max(Number(quote.high) || 0, ...canonical.map((bar) => Number(bar.high)), open, close);
  const lowCandidates = [Number(quote.low), ...canonical.map((bar) => Number(bar.low)), open, close].filter((value) => value > 0);
  const low = Math.min(...lowCandidates);
  return {
    time: first.time,
    open,
    high,
    low,
    close,
    volume: Math.max(0, Number(quote.volume || 0)),
  };
}

function barsByInstrument(chunks: Array<Record<string, any>>, interval: string) {
  const grouped = new Map<string, Array<Record<string, any>>>();
  for (const chunk of chunks) {
    if (chunk.interval !== interval || chunk.quality_status === "quarantined") continue;
    if (!grouped.has(chunk.instrument_id)) grouped.set(chunk.instrument_id, []);
    grouped.get(chunk.instrument_id)?.push(...(Array.isArray(chunk.bars) ? chunk.bars : []));
  }
  return grouped;
}

function isLastSaudiTradingWeekdayOfMonth(sessionDate: string) {
  const current = new Date(`${sessionDate}T00:00:00.000Z`);
  const month = current.getUTCMonth();
  const next = new Date(current);
  do {
    next.setUTCDate(next.getUTCDate() + 1);
  } while ([5, 6].includes(next.getUTCDay()));
  return next.getUTCMonth() !== month;
}

function firstByInstrument(rows: Array<Record<string, any>>) {
  const result = new Map<string, Record<string, any>>();
  for (const row of rows) {
    if (row.instrument_id && !result.has(row.instrument_id)) result.set(row.instrument_id, row);
  }
  return result;
}

async function projectionChunk({
  instrument,
  interval,
  chunkKey,
  bars,
  source,
  sessionDate,
  isFinal,
}: {
  instrument: Record<string, any>;
  interval: "1d" | "1wk" | "1mo";
  chunkKey: string;
  bars: Array<Record<string, any>>;
  source: Record<string, any> | null;
  sessionDate?: string;
  isFinal: boolean;
}) {
  const normalized = normalizeTechnicalBars(bars);
  return {
    instrument_id: instrument.id,
    symbol: instrument.symbol,
    interval,
    chunk_key: chunkKey,
    ...(sessionDate ? { session_date: sessionDate } : {}),
    start_time: normalized[0].time,
    end_time: normalized.at(-1)?.time,
    bars: normalized,
    bar_count: normalized.length,
    checksum: await digest(normalized),
    source_id: source?.source_id || "canonical-projection",
    run_id: source?.run_id || `projection-${Date.now()}`,
    snapshot_version: source?.snapshot_version || `projection-${Date.now()}`,
    provider_as_of: source?.provider_as_of || normalized.at(-1)?.time,
    received_time: new Date().toISOString(),
    quality_status: "verified",
    canonical_version: CANONICAL_VERSION,
    is_final: isFinal,
    bucket_count: normalized.length,
    completeness_status: normalized.length >= 50 ? "complete" : "degraded",
  };
}

async function projectInstrumentBatch(
  base44: any,
  instrumentIds: string[],
  sessionDate: string,
) {
  const idQuery = { $in: instrumentIds };
  const [instrumentsRaw, quotesRaw, chunksRaw, snapshotsRaw] = await Promise.all([
    base44.asServiceRole.entities.Instrument.filter({ id: idQuery }, "symbol", PROJECTION_BATCH_SIZE),
    base44.asServiceRole.entities.QuoteLatest.filter({ instrument_id: idQuery }, "-updated_date", PROJECTION_BATCH_SIZE * 3),
    base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: idQuery }, "-end_time", 1200),
    base44.asServiceRole.entities.IndicatorSnapshot.filter({ instrument_id: idQuery }, "-source_as_of", PROJECTION_BATCH_SIZE * 12),
  ]);
  const instruments = entityRows(instrumentsRaw)
    .filter((item) => item.market_code === MARKET_CODE && item.status !== "delisted")
    .sort((left, right) => String(left.symbol).localeCompare(String(right.symbol), "en"));
  const quotes = entityRows(quotesRaw);
  const chunks = entityRows(chunksRaw);
  const snapshots = entityRows(snapshotsRaw);
  const quoteByInstrument = firstByInstrument(quotes);
  const latestSourceByInstrument = new Map();
  for (const chunk of [...chunks].sort((left, right) => Date.parse(left.end_time || 0) - Date.parse(right.end_time || 0))) {
    if (chunk.quality_status !== "quarantined") latestSourceByInstrument.set(chunk.instrument_id, chunk);
  }
  const quarterBars = barsByInstrument(
    chunks.filter((chunk) => chunk.session_date === sessionDate || String(chunk.chunk_key || "").endsWith(`-${sessionDate}`)),
    "15m",
  );
  const intradayHistory = barsByInstrument(chunks, "15m");
  const dailyHistory = barsByInstrument(chunks, "1d");
  const newDailyChunks: Array<Record<string, any>> = [];
  const higherTimeframeChunks: Array<Record<string, any>> = [];
  const indicatorRows: Array<Record<string, any>> = [];
  const skipped: Array<{ instrument_id: string; symbol: string; reason: string }> = [];

  for (const instrument of instruments) {
    const quote = quoteByInstrument.get(instrument.id) || null;
    const dailyFromStoredIntraday = aggregateTechnicalBars(intradayHistory.get(instrument.id) || [], "1d");
    const existingDaily = aggregateTechnicalBars([
      ...(dailyHistory.get(instrument.id) || []),
      ...dailyFromStoredIntraday,
    ], "1d");
    let canonicalDaily = existingDaily;
    if (quoteIsFinalForSession(quote, sessionDate)) {
      const today = finalDailyBar(quarterBars.get(instrument.id) || [], quote);
      if (today) {
        canonicalDaily = aggregateTechnicalBars([...existingDaily, today], "1d");
        newDailyChunks.push(await projectionChunk({
          instrument,
          interval: "1d",
          chunkKey: `${instrument.symbol}-1d-${sessionDate}`,
          bars: [canonicalDaily.at(-1)],
          source: quote,
          sessionDate,
          isFinal: true,
        }));
      } else {
        skipped.push({ instrument_id: instrument.id, symbol: instrument.symbol, reason: "missing_quarter_bars" });
      }
    } else {
      skipped.push({ instrument_id: instrument.id, symbol: instrument.symbol, reason: "final_quote_unavailable" });
    }
    if (!canonicalDaily.length) {
      skipped.push({ instrument_id: instrument.id, symbol: instrument.symbol, reason: "missing_daily_history" });
      continue;
    }

    const frames = {
      "1d": canonicalDaily,
      "1wk": aggregateTechnicalBars(canonicalDaily, "1wk"),
      "1mo": aggregateTechnicalBars(canonicalDaily, "1mo"),
    };
    for (const [timeframe, frameBars] of Object.entries(frames)) {
      if (!frameBars.length) continue;
      if (timeframe !== "1d") {
        higherTimeframeChunks.push(await projectionChunk({
          instrument,
          interval: timeframe as "1wk" | "1mo",
          chunkKey: `${instrument.symbol}-${timeframe}-canonical`,
          bars: frameBars,
          source: quote || latestSourceByInstrument.get(instrument.id) || null,
          isFinal: false,
        }));
      }
      // The scanner searches the current stored period and the two periods
      // before it. Weekly/monthly current bars may still be forming; that
      // state is carried with the evidence instead of silently omitting them.
      const signalBars = frameBars;
      if (!signalBars.length) continue;
      const currentPeriodIsFinal = timeframe === "1d"
        ? quoteIsFinalForSession(quote, sessionDate)
        : timeframe === "1wk"
          ? isThursday(sessionDate)
          : isLastSaudiTradingWeekdayOfMonth(sessionDate);
      const values = calculateTechnicalSignals(signalBars, TECHNICAL_SIGNAL_WINDOW_SIZE);
      values.signal_window = (values.signal_window || []).map((item, index) => ({
        ...item,
        is_final: index === 0 ? currentPeriodIsFinal : true,
      }));
      values.is_final = currentPeriodIsFinal;
      indicatorRows.push({
        instrument_id: instrument.id,
        symbol: instrument.symbol,
        indicator_key: "technical_signals",
        timeframe,
        values,
        source_as_of: signalBars.at(-1)?.time,
        calculated_at: new Date().toISOString(),
        formula_version: TECHNICAL_SIGNAL_FORMULA_VERSION,
      });
    }
  }

  const candleResult = await upsertRows(
    base44,
    "CandleChunk",
    [...newDailyChunks, ...higherTimeframeChunks],
    chunks,
    ["instrument_id", "interval", "chunk_key"],
  );
  const signalResult = await upsertRows(
    base44,
    "IndicatorSnapshot",
    indicatorRows,
    snapshots,
    ["instrument_id", "indicator_key", "timeframe"],
  );
  const skippedRows = [...new Map(skipped.map((item) => [`${item.instrument_id}:${item.reason}`, item])).values()];
  return {
    instruments: instruments.length,
    candles: candleResult,
    signals: signalResult,
    skipped: skippedRows,
    source_id: quotes.find((quote) => quote.source_id)?.source_id || "canonical-projection",
    snapshot_version: quotes.find((quote) => quote.snapshot_version)?.snapshot_version || null,
  };
}

Deno.serve(async (req) => {
  let base44: any = null;
  let run: Record<string, any> | null = null;
  try {
    base44 = createClientFromRequest(req);
    const requestBody = await req.json();
    const body = { ...requestBody, ...(requestBody.args || {}) };
    const isServiceInvocation = Boolean(req.headers.get("Base44-Service-Authorization"));
    if (body.mode === "projection_batch") {
      if (!isServiceInvocation) {
        throw Object.assign(new Error("Service invocation required"), { status: 403, code: "SERVICE_INVOCATION_REQUIRED" });
      }
      const instrumentIds = Array.isArray(body.instrument_ids)
        ? body.instrument_ids.map(String).filter(Boolean).slice(0, PROJECTION_BATCH_SIZE)
        : [];
      if (!instrumentIds.length) throw Object.assign(new Error("instrument_ids are required"), { status: 400 });
      return Response.json(await projectInstrumentBatch(base44, instrumentIds, String(body.session_date || riyadhDate())));
    }
    let user: Record<string, any> | null = null;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }
    if (!isServiceInvocation) {
      if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401, code: "AUTH_REQUIRED" });
      await requirePermission(base44, body.session_id, "data.ingestion.run");
    }
    const sessionDate = String(body.session_date || riyadhDate());
    const slotKey = `technical-projection:${sessionDate}:${TECHNICAL_SIGNAL_FORMULA_VERSION}`;
    const existingRuns = entityRows(await base44.asServiceRole.entities.IngestionRun.filter({ slot_key: slotKey }));
    const completedRun = existingRuns
      .filter((item) => ["success", "partial"].includes(item.status))
      .sort((left, right) => Date.parse(right.finished_at || right.updated_date || 0) - Date.parse(left.finished_at || left.updated_date || 0))[0];
    if (completedRun && body.force !== true) {
      return Response.json({ status: "skipped", reason: "already_projected", session_date: sessionDate, run_id: completedRun.id });
    }
    const activeRun = existingRuns.find((item) => item.status === "running" && Date.parse(item.lease_expires_at || 0) > Date.now());
    if (activeRun && body.force !== true) {
      return Response.json({ status: "skipped", reason: "projection_in_progress", session_date: sessionDate, run_id: activeRun.id });
    }
    if (activeRun && body.force === true) {
      await base44.asServiceRole.entities.IngestionRun.update(activeRun.id, {
        status: "failed",
        finished_at: new Date().toISOString(),
        failure_code: "SUPERSEDED_BY_FORCED_RUN",
        notes: "A forced technical projection replaced a stale or interrupted run",
      });
    }
    run = await base44.asServiceRole.entities.IngestionRun.create({
      run_type: "technical_projection",
      market_code: MARKET_CODE,
      slot_key: slotKey,
      slot_kind: "technical_projection",
      scheduled_for: new Date().toISOString(),
      lease_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      started_at: new Date().toISOString(),
      total_records: 0,
      success_count: 0,
      failed_count: 0,
      status: "running",
      source_id: "canonical-projection",
      notes: "Canonical daily, weekly, monthly candle and technical signal projection",
    });
    const instrumentsRaw = await base44.asServiceRole.entities.Instrument.list("symbol", 500);
    const allInstruments = entityRows(instrumentsRaw);
    const instruments = allInstruments.filter((item) => item.market_code === MARKET_CODE && item.status !== "delisted");
    const outOfScopeIds = allInstruments.filter((item) => item.market_code !== MARKET_CODE).map((item) => item.id).filter(Boolean);
    const cleanup = outOfScopeIds.length
      ? await Promise.all([
        base44.asServiceRole.entities.IndicatorSnapshot.deleteMany({
          indicator_key: "technical_signals",
          instrument_id: { $in: outOfScopeIds },
        }),
        base44.asServiceRole.entities.CandleChunk.deleteMany({
          canonical_version: CANONICAL_VERSION,
          instrument_id: { $in: outOfScopeIds },
          interval: { $in: ["1wk", "1mo"] },
        }),
      ])
      : [{ deleted: 0 }, { deleted: 0 }];
    const batches = [];
    for (let offset = 0; offset < instruments.length; offset += PROJECTION_BATCH_SIZE) {
      batches.push(instruments.slice(offset, offset + PROJECTION_BATCH_SIZE).map((instrument) => instrument.id));
    }
    const batchResults: Array<Record<string, any>> = [];
    const failedBatches: Array<{ batch_index: number; instrument_ids: string[]; error: string }> = [];
    for (let offset = 0; offset < batches.length; offset += PROJECTION_CONCURRENCY) {
      const group = batches.slice(offset, offset + PROJECTION_CONCURRENCY);
      const settled = await Promise.allSettled(group.map((instrumentIds, groupIndex) =>
        base44.functions.invoke("marketSignalRefresh", {
          mode: "projection_batch",
          session_date: sessionDate,
          run_id: run.id,
          batch_index: offset + groupIndex,
          instrument_ids: instrumentIds,
        })
      ));
      settled.forEach((result, groupIndex) => {
        const batchIndex = offset + groupIndex;
        if (result.status === "fulfilled") batchResults.push(result.value?.data || result.value || {});
        else failedBatches.push({
          batch_index: batchIndex,
          instrument_ids: batches[batchIndex],
          error: result.reason?.response?.data?.error || result.reason?.message || "projection_batch_failed",
        });
      });
    }
    const candleResult = batchResults.reduce((total, item) => ({
      created: total.created + Number(item.candles?.created || 0),
      updated: total.updated + Number(item.candles?.updated || 0),
    }), { created: 0, updated: 0 });
    const signalResult = batchResults.reduce((total, item) => ({
      created: total.created + Number(item.signals?.created || 0),
      updated: total.updated + Number(item.signals?.updated || 0),
    }), { created: 0, updated: 0 });
    const skippedRows = batchResults.flatMap((item) => Array.isArray(item.skipped) ? item.skipped : []);
    const skippedInstrumentCount = new Set(skippedRows.map((item) => item.instrument_id)).size;
    const failedInstrumentCount = failedBatches.reduce((total, item) => total + item.instrument_ids.length, 0);
    const failureCount = Math.min(instruments.length, skippedInstrumentCount + failedInstrumentCount);
    const finishedAt = new Date().toISOString();
    await base44.asServiceRole.entities.IngestionRun.update(run.id, {
      finished_at: finishedAt,
      total_records: instruments.length,
      success_count: Math.max(0, instruments.length - failureCount),
      failed_count: failureCount,
      status: failureCount ? (failureCount < instruments.length ? "partial" : "failed") : "success",
      source_id: batchResults.find((item) => item.source_id)?.source_id || "canonical-projection",
      snapshot_version: batchResults.find((item) => item.snapshot_version)?.snapshot_version,
      coverage_percent: instruments.length ? (instruments.length - failureCount) / instruments.length * 100 : 0,
      promoted_at: finishedAt,
      notes: JSON.stringify({
        candles: candleResult,
        signals: signalResult,
        skipped_count: skippedInstrumentCount,
        batch_count: batches.length,
        failed_batches: failedBatches,
        removed_out_of_scope_signals: Number(cleanup[0]?.deleted || 0),
        removed_out_of_scope_candles: Number(cleanup[1]?.deleted || 0),
        canonical_version: CANONICAL_VERSION,
      }),
    });

    return Response.json({
      status: failureCount ? "degraded" : "success",
      session_date: sessionDate,
      instruments: instruments.length,
      candles: candleResult,
      signals: signalResult,
      skipped_count: skippedInstrumentCount,
      failed_batch_count: failedBatches.length,
      cleanup: {
        signals: Number(cleanup[0]?.deleted || 0),
        candles: Number(cleanup[1]?.deleted || 0),
      },
      skipped: skippedRows.slice(0, 100),
      run_id: run.id,
      formula_version: TECHNICAL_SIGNAL_FORMULA_VERSION,
      canonical_version: CANONICAL_VERSION,
    });
  } catch (error) {
    if (base44 && run?.id) {
      try {
        await base44.asServiceRole.entities.IngestionRun.update(run.id, {
          finished_at: new Date().toISOString(),
          failed_count: 1,
          status: "failed",
          failure_code: error?.code || "TECHNICAL_PROJECTION_FAILED",
          notes: error?.message || "Technical projection failed",
        });
      } catch {
        // Preserve the original projection failure.
      }
    }
    return replyError(error);
  }
});
