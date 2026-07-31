import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { canonicalizeQuarterHourBars } from "../../shared/market-data.ts";
import { replyError, requirePermission } from "../../shared/security.ts";
import {
  TECHNICAL_SIGNAL_FORMULA_VERSION,
  aggregateTechnicalBars,
  calculateTechnicalSignals,
  normalizeTechnicalBars,
} from "../../shared/technical-signals.ts";

const CANONICAL_VERSION = "candle-projection-v1";
const MARKET_CODE = "SA_MAIN";
const BATCH_SIZE = 500;

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

Deno.serve(async (req) => {
  let base44: any = null;
  let run: Record<string, any> | null = null;
  try {
    base44 = createClientFromRequest(req);
    const requestBody = await req.json();
    const body = { ...requestBody, ...(requestBody.args || {}) };
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }
    const isServiceInvocation = Boolean(req.headers.get("Base44-Service-Authorization")) && body.force !== true;
    if (!isServiceInvocation) {
      if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
      await requirePermission(base44, body.session_id, "data.ingestion.run");
    }

    const sessionDate = String(body.session_date || riyadhDate());
    const slotKey = `technical-projection:${sessionDate}:${TECHNICAL_SIGNAL_FORMULA_VERSION}`;
    const existingRuns = entityRows(await base44.asServiceRole.entities.IngestionRun.filter({ slot_key: slotKey }));
    const completedRun = existingRuns.find((item) => item.status === "success");
    if (completedRun && body.force !== true) {
      return Response.json({ status: "skipped", reason: "already_projected", session_date: sessionDate, run_id: completedRun.id });
    }
    const activeRun = existingRuns.find((item) => item.status === "running" && Date.parse(item.lease_expires_at || 0) > Date.now());
    if (activeRun) {
      return Response.json({ status: "skipped", reason: "projection_in_progress", session_date: sessionDate, run_id: activeRun.id });
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
    const [instrumentsRaw, quotesRaw, chunksRaw, snapshotsRaw] = await Promise.all([
      base44.asServiceRole.entities.Instrument.list("symbol", 500),
      base44.asServiceRole.entities.QuoteLatest.list("-updated_date", 500),
      base44.asServiceRole.entities.CandleChunk.list("-end_time", 5000),
      base44.asServiceRole.entities.IndicatorSnapshot.list("-source_as_of", 5000),
    ]);
    const instruments = entityRows(instrumentsRaw).filter((item) => (item.market_code || MARKET_CODE) === MARKET_CODE && item.status !== "delisted");
    const quotes = entityRows(quotesRaw);
    const chunks = entityRows(chunksRaw);
    const snapshots = entityRows(snapshotsRaw);
    const quoteByInstrument = new Map(quotes.map((quote) => [quote.instrument_id, quote]));
    const latestSourceByInstrument = new Map();
    for (const chunk of [...chunks].sort((left, right) => Date.parse(left.end_time || 0) - Date.parse(right.end_time || 0))) {
      if (chunk.quality_status !== "quarantined") latestSourceByInstrument.set(chunk.instrument_id, chunk);
    }
    const quarterBars = barsByInstrument(
      chunks.filter((chunk) => chunk.session_date === sessionDate || String(chunk.chunk_key || "").endsWith(`-${sessionDate}`)),
      "15m",
    );
    const dailyHistory = barsByInstrument(chunks, "1d");
    const newDailyChunks: Array<Record<string, any>> = [];
    const higherTimeframeChunks: Array<Record<string, any>> = [];
    const indicatorRows: Array<Record<string, any>> = [];
    const skipped: Array<{ instrument_id: string; symbol: string; reason: string }> = [];

    for (const instrument of instruments) {
      const quote = quoteByInstrument.get(instrument.id) || null;
      const existingDaily = aggregateTechnicalBars(dailyHistory.get(instrument.id) || [], "1d");
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
        const signalBars = timeframe === "1wk"
          ? (isThursday(sessionDate) ? frameBars : frameBars.slice(0, -1))
          : timeframe === "1mo"
            ? frameBars.slice(0, -1)
            : frameBars;
        if (!signalBars.length) continue;
        indicatorRows.push({
          instrument_id: instrument.id,
          symbol: instrument.symbol,
          indicator_key: "technical_signals",
          timeframe,
          values: calculateTechnicalSignals(signalBars),
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
    const skippedInstrumentCount = new Set(skippedRows.map((item) => item.instrument_id)).size;
    const finishedAt = new Date().toISOString();
    await base44.asServiceRole.entities.IngestionRun.update(run.id, {
      finished_at: finishedAt,
      total_records: instruments.length,
      success_count: Math.max(0, instruments.length - skippedInstrumentCount),
      failed_count: skippedInstrumentCount,
      status: skippedInstrumentCount ? "partial" : "success",
      source_id: quotes.find((quote) => quote.source_id)?.source_id || "canonical-projection",
      snapshot_version: quotes.find((quote) => quote.snapshot_version)?.snapshot_version,
      coverage_percent: instruments.length ? (instruments.length - skippedInstrumentCount) / instruments.length * 100 : 0,
      promoted_at: finishedAt,
      notes: JSON.stringify({
        candles: candleResult,
        signals: signalResult,
        skipped_count: skippedInstrumentCount,
        canonical_version: CANONICAL_VERSION,
      }),
    });

    return Response.json({
      status: skippedInstrumentCount ? "degraded" : "success",
      session_date: sessionDate,
      instruments: instruments.length,
      candles: candleResult,
      signals: signalResult,
      skipped_count: skippedInstrumentCount,
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
