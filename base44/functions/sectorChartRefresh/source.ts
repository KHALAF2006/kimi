import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { mergeStoredCandleSeries } from "../../shared/market-data.ts";
import { readJsonBody, replyError, requirePermission, requireTrustedOwner } from "../../shared/security.ts";

const MARKET_CODE = "SA_MAIN";
const SECTORS_PER_BATCH = 2;
const INTERVALS = ["15m", "1h", "2h", "3h", "4h", "1d", "1wk", "1mo"];
const RANGE_MS: Record<string, number> = {
  "15m": 31 * 24 * 60 * 60 * 1000,
  "1h": 93 * 24 * 60 * 60 * 1000,
  "2h": 93 * 24 * 60 * 60 * 1000,
  "3h": 93 * 24 * 60 * 60 * 1000,
  "4h": 93 * 24 * 60 * 60 * 1000,
};

function rows(value: any): Array<Record<string, any>> {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function fallbackIntervals(interval: string) {
  if (interval === "1wk" || interval === "1mo") return [interval, "1d"];
  if (interval === "1d") return [interval];
  if (["1h", "2h", "3h", "4h"].includes(interval)) return [interval, "15m"];
  return [interval];
}

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Riyadh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function normalizedBars(chunks: Array<Record<string, any>>) {
  const byTime = new Map<string, Record<string, any>>();
  for (const chunk of chunks) {
    for (const bar of Array.isArray(chunk.bars) ? chunk.bars : []) {
      const time = new Date(bar.time).getTime();
      const open = Number(bar.open);
      const high = Number(bar.high);
      const low = Number(bar.low);
      const close = Number(bar.close);
      const volume = Math.max(0, Number(bar.volume || 0));
      if (!Number.isFinite(time) || ![open, high, low, close].every((value) => Number.isFinite(value) && value > 0)) continue;
      if (high < Math.max(open, close) || low > Math.min(open, close)) continue;
      const isoTime = new Date(time).toISOString();
      const key = chunk.interval === "1d" ? `day:${dateFormatter.format(new Date(isoTime))}` : isoTime;
      const canonical = String(chunk.canonical_version || "");
      const priority = canonical === "candle-projection-v1" || canonical.includes("daily-projection")
        ? 3
        : chunk.is_historical_archive === true ? 2 : 1;
      const received = new Date(chunk.received_time || chunk.updated_date || chunk.created_date || 0).getTime();
      const current = byTime.get(key);
      if (current && (current.priority > priority || current.priority === priority && current.received > received)) continue;
      byTime.set(key, { time: isoTime, open, high, low, close, volume, priority, received });
    }
  }
  return [...byTime.values()]
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    .map(({ priority: _priority, received: _received, ...bar }) => bar);
}

function weightsFor(instruments: Array<Record<string, any>>, quoteByInstrument: Map<string, Record<string, any>>) {
  const caps = instruments.map((instrument) => Math.max(0, Number(quoteByInstrument.get(instrument.id)?.market_cap || 0)));
  const total = caps.reduce((sum, value) => sum + value, 0);
  return new Map(instruments.map((instrument, index) => [
    instrument.id,
    total > 0 ? caps[index] / total : 1 / instruments.length,
  ]));
}

function aggregateSector(
  instruments: Array<Record<string, any>>,
  chunksByInstrument: Map<string, Array<Record<string, any>>>,
  quoteByInstrument: Map<string, Record<string, any>>,
  interval: string,
) {
  const weights = weightsFor(instruments, quoteByInstrument);
  const memberSeries = instruments.map((instrument) => {
    const chunks = chunksByInstrument.get(instrument.id) || [];
    const series = fallbackIntervals(interval).map((storedInterval) => {
      const matching = chunks.filter((chunk) => chunk.interval === storedInterval);
      return matching.length ? { interval: storedInterval, bars: normalizedBars(matching) } : null;
    }).filter(Boolean);
    const merged = mergeStoredCandleSeries(series, interval, {
      timeZone: "Asia/Riyadh",
      sessionStartMinutes: 600,
      weekStartsOn: 0,
    });
    const fullBars = merged.bars.filter((bar: Record<string, any>) => Number(bar.close) > 0);
    const base = Number(fullBars[0]?.close);
    return {
      instrument,
      weight: weights.get(instrument.id) || 0,
      base,
      bars: fullBars,
    };
  }).filter((item) => Number.isFinite(item.base) && item.base > 0 && item.bars.length);

  const latestTime = Math.max(...memberSeries.flatMap((item) => item.bars.map((bar: Record<string, any>) => new Date(bar.time).getTime())).filter(Number.isFinite));
  if (!Number.isFinite(latestTime)) return [];
  const cutoff = RANGE_MS[interval] ? latestTime - RANGE_MS[interval] : Number.NEGATIVE_INFINITY;
  const maps = new Map(memberSeries.map((item) => [
    item.instrument.id,
    new Map(item.bars.filter((bar: Record<string, any>) => new Date(bar.time).getTime() >= cutoff).map((bar: Record<string, any>) => [new Date(bar.time).toISOString(), bar])),
  ]));
  const timestamps = [...new Set([...maps.values()].flatMap((map: Map<string, any>) => [...map.keys()]))].sort();
  return timestamps.map((time) => {
    const members = memberSeries
      .map((item) => ({ item, bar: maps.get(item.instrument.id)?.get(time) }))
      .filter((value) => value.bar);
    const presentWeight = members.reduce((sum, value) => sum + value.item.weight, 0);
    if (!presentWeight) return null;
    const aggregate = (field: string) => members.reduce(
      (sum, value) => sum + (Number(value.bar[field]) / value.item.base * 1000) * (value.item.weight / presentWeight),
      0,
    );
    const open = aggregate("open");
    const close = aggregate("close");
    const rawHigh = aggregate("high");
    const rawLow = aggregate("low");
    return {
      time,
      open: Number(open.toFixed(6)),
      high: Number(Math.max(rawHigh, open, close).toFixed(6)),
      low: Number(Math.min(rawLow, open, close).toFixed(6)),
      close: Number(close.toFixed(6)),
      volume: members.reduce((sum, value) => sum + Math.max(0, Number(value.bar.volume || 0)), 0),
    };
  }).filter(Boolean);
}

async function upsertSnapshot(base44: any, row: Record<string, any>) {
  const existing = rows(await base44.asServiceRole.entities.SectorChartSnapshot.filter(
    { snapshot_key: row.snapshot_key },
    "-calculated_at",
    5,
  ));
  if (existing[0]?.id) await base44.asServiceRole.entities.SectorChartSnapshot.update(existing[0].id, row);
  else await base44.asServiceRole.entities.SectorChartSnapshot.create(row);
  if (existing.length > 1) {
    await Promise.allSettled(existing.slice(1).map((item) => base44.asServiceRole.entities.SectorChartSnapshot.delete(item.id)));
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req);
    if (body.session_id) {
      await requirePermission(base44, body.session_id, body.device_id, "data.ingestion.run");
    } else {
      await requireTrustedOwner(base44);
    }
    const batchIndex = Number(body.batch_index);
    if (!Number.isInteger(batchIndex) || batchIndex < 0) {
      throw Object.assign(new Error("Valid sector snapshot batch_index is required"), { status: 400, code: "INVALID_SECTOR_BATCH" });
    }

    const instruments = rows(await base44.asServiceRole.entities.Instrument.filter(
      { market_code: MARKET_CODE, status: { "$ne": "delisted" } },
      "symbol",
      500,
    ));
    const sectors = [...new Map(instruments
      .filter((item) => item.sector_ar || item.sector_en)
      .map((item) => [String(item.sector_ar || item.sector_en), {
        sector: String(item.sector_ar || item.sector_en),
        sector_ar: item.sector_ar || item.sector_en,
        sector_en: item.sector_en || item.sector_ar,
      }])).values()]
      .sort((a, b) => a.sector.localeCompare(b.sector, "ar"));
    const selected = sectors.slice(batchIndex * SECTORS_PER_BATCH, (batchIndex + 1) * SECTORS_PER_BATCH);
    if (!selected.length) {
      return Response.json({ status: "skipped", reason: "sector_batch_empty", batch_index: batchIndex, sector_count: sectors.length });
    }

    const results = [];
    for (const sectorInfo of selected) {
      const members = instruments.filter((item) => item.sector_ar === sectorInfo.sector_ar || item.sector_en === sectorInfo.sector_en);
      const ids = members.map((item) => item.id);
      const symbols = members.map((item) => String(item.symbol || "").trim().toUpperCase()).filter(Boolean);
      const [quotesValue, chunksValue] = await Promise.all([
        base44.asServiceRole.entities.QuoteLatest.filter({ market_code: MARKET_CODE, instrument_id: { "$in": ids } }, "-quote_time", 1000),
        base44.asServiceRole.entities.CandleChunk.filter({ symbol: { "$in": symbols } }, "-end_time", 5000),
      ]);
      const quoteByInstrument = new Map<string, Record<string, any>>();
      for (const quote of rows(quotesValue)) {
        if (!quoteByInstrument.has(quote.instrument_id) && quote.quality_status !== "quarantined") quoteByInstrument.set(quote.instrument_id, quote);
      }
      const instrumentBySymbol = new Map(members.map((item) => [String(item.symbol || "").trim().toUpperCase(), item]));
      const chunksByInstrument = new Map(members.map((item) => [item.id, [] as Array<Record<string, any>>]));
      for (const chunk of rows(chunksValue)) {
        if (chunk.quality_status === "quarantined" || !Array.isArray(chunk.bars)) continue;
        const storedMarket = String(chunk.market_code || "").trim().toUpperCase();
        if (storedMarket && storedMarket !== MARKET_CODE) continue;
        const instrument = instrumentBySymbol.get(String(chunk.symbol || "").trim().toUpperCase());
        if (instrument) chunksByInstrument.get(instrument.id)?.push(chunk);
      }

      const calculatedAt = new Date().toISOString();
      const methodology = members.some((item) => Number(quoteByInstrument.get(item.id)?.market_cap || 0) > 0)
        ? "market_cap_weighted"
        : "equal_weighted";
      let written = 0;
      for (const interval of INTERVALS) {
        const candles = aggregateSector(members, chunksByInstrument, quoteByInstrument, interval);
        if (candles.length < 2) continue;
        const payload = {
          sector: sectorInfo.sector,
          sector_ar: sectorInfo.sector_ar,
          sector_en: sectorInfo.sector_en,
          candles,
          momentum_indicator: null,
          as_of: candles.at(-1)?.time || null,
          calculated_at: calculatedAt,
          methodology,
          data_meta: {
            requested_interval: interval,
            requested_range: interval === "15m" ? "1mo" : ["1h", "2h", "3h", "4h"].includes(interval) ? "3mo" : "max",
            available_from: candles[0]?.time || null,
            available_to: candles.at(-1)?.time || null,
            returned_bar_count: candles.length,
            stored_bar_count: candles.length,
            storage_mode: "central_sector_snapshot",
          },
        };
        await upsertSnapshot(base44, {
          snapshot_key: [MARKET_CODE, sectorInfo.sector, interval].join("|"),
          market_code: MARKET_CODE,
          sector: sectorInfo.sector,
          interval,
          payload,
          source_as_of: payload.as_of,
          calculated_at: calculatedAt,
        });
        written += 1;
      }
      results.push({ sector: sectorInfo.sector, member_count: members.length, snapshots_written: written });
    }

    return Response.json({
      status: "completed",
      market_code: MARKET_CODE,
      batch_index: batchIndex,
      sectors_per_batch: SECTORS_PER_BATCH,
      sector_count: sectors.length,
      results,
    });
  } catch (error) {
    return replyError(error, error?.code || "SECTOR_CHART_REFRESH_FAILED");
  }
});
