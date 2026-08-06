import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { readJsonBody, replyError, requirePermission, requireTrustedOwner } from "../../shared/security.ts";
import { entityRows as rows, upsertEntityRows as upsertMany } from "../../shared/entity-batch.ts";
import { US_BENCHMARKS_CATALOG, US_BENCHMARKS_MARKET_CODE, US_BENCHMARKS_PROVIDER_CODE } from "../../shared/us-benchmarks-catalog.ts";

const DELAY_SECONDS = 900;
const BASE_URL = "https://query1.finance.yahoo.com";

function nyClock(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false,
  }).formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24, minute: Number(parts.minute), weekday: parts.weekday };
}

async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function ensureCatalog(base44, now) {
  const marketRows = rows(await base44.asServiceRole.entities.Market.filter({ market_code: US_BENCHMARKS_MARKET_CODE }));
  if (marketRows[0]) await base44.asServiceRole.entities.Market.update(marketRows[0].id, US_BENCHMARKS_CATALOG.market);
  else await base44.asServiceRole.entities.Market.create(US_BENCHMARKS_CATALOG.market);

  const sourceRows = rows(await base44.asServiceRole.entities.DataSource.filter({ code: US_BENCHMARKS_PROVIDER_CODE }));
  const sourcePayload = { name: "U.S. indices and ETFs delayed reference adapter", market_code: US_BENCHMARKS_MARKET_CODE, quote_mode: "delayed", delay_seconds: DELAY_SECONDS, public_enabled: false, source_type: "reference", license_status: "restricted", base_url: BASE_URL, last_verified_at: now.toISOString() };
  const source = sourceRows[0]
    ? await base44.asServiceRole.entities.DataSource.update(sourceRows[0].id, sourcePayload)
    : await base44.asServiceRole.entities.DataSource.create({ code: US_BENCHMARKS_PROVIDER_CODE, ...sourcePayload });

  const instrumentPayloads = US_BENCHMARKS_CATALOG.instruments.map((item) => ({
    symbol: item.symbol, market_code: US_BENCHMARKS_MARKET_CODE, instrument_code: item.symbol,
    instrument_type: item.type, composite_key: `${US_BENCHMARKS_MARKET_CODE}:${item.symbol}`,
    name_ar: item.nameAr, name_en: item.nameEn, sector_ar: item.categoryAr, sector_en: item.categoryEn,
    related_companies_ar: item.relatedAr, related_companies_en: item.relatedEn,
    market: US_BENCHMARKS_CATALOG.market.name_en, currency: "USD", exchange_code: "US",
    country_code: "US", issuer_country: "United States", optionable: false,
    catalog_as_of: US_BENCHMARKS_CATALOG.source.asOf, status: "active", official_url: item.officialUrl,
  }));
  await upsertMany(base44, "Instrument", instrumentPayloads, ["composite_key"], { market_code: US_BENCHMARKS_MARKET_CODE });
  const instruments = rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_BENCHMARKS_MARKET_CODE }, "symbol", 500));
  const bySymbol = new Map(instruments.map((instrument) => [instrument.symbol, instrument]));
  if (instruments.length !== US_BENCHMARKS_CATALOG.instruments.length) throw Object.assign(new Error(`Benchmark catalog incomplete: ${instruments.length}/${US_BENCHMARKS_CATALOG.instruments.length}`), { status: 503, code: "US_BENCHMARKS_CATALOG_INCOMPLETE" });

  const mappings = US_BENCHMARKS_CATALOG.instruments.map((item) => ({ instrument_id: bySymbol.get(item.symbol).id, market_code: US_BENCHMARKS_MARKET_CODE, provider_code: US_BENCHMARKS_PROVIDER_CODE, provider_symbol: item.providerSymbol, quote_mode: "delayed", delay_seconds: DELAY_SECONDS, license_status: "pending", active: true }));
  await upsertMany(base44, "ProviderInstrumentMap", mappings, ["instrument_id", "provider_code"], { market_code: US_BENCHMARKS_MARKET_CODE });

  const aliases = US_BENCHMARKS_CATALOG.instruments.flatMap((item) => [item.symbol, item.providerSymbol, ...item.aliases].map((alias) => ({ instrument_id: bySymbol.get(item.symbol).id, market_code: US_BENCHMARKS_MARKET_CODE, alias, alias_type: alias === item.symbol ? "symbol" : alias === item.providerSymbol ? "provider" : "search", normalized_alias: String(alias).replace(/[^A-Za-z0-9]/g, "").toUpperCase(), active: true })));
  await upsertMany(base44, "InstrumentAlias", aliases, ["instrument_id", "normalized_alias"], { market_code: US_BENCHMARKS_MARKET_CODE });
  return { source, instruments, bySymbol };
}

async function fetchChart(providerSymbol, interval, range) {
  const url = new URL(`${BASE_URL}/v8/finance/chart/${encodeURIComponent(providerSymbol)}`);
  url.searchParams.set("interval", interval);
  if (range === "full") {
    url.searchParams.set("period1", "0");
    url.searchParams.set("period2", String(Math.ceil(Date.now() / 1000) + 86400));
  } else url.searchParams.set("range", range);
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,splits");
  url.searchParams.set("includeAdjustedClose", "true");
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "KMY-US-Benchmarks/1.0" }, signal: controller.signal });
      const payload = await response.json().catch(() => ({}));
      const result = payload?.chart?.result?.[0];
      if (!response.ok || !result) throw new Error(payload?.chart?.error?.description || `provider_http_${response.status}`);
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    } finally { clearTimeout(timeout); }
  }
  throw lastError || new Error("provider_failed");
}

function validPrice(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function normalizeIntraday(item, result, now) {
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0] || {};
  const cutoff = now.getTime() - DELAY_SECONDS * 1000;
  const sessions = new Map();
  let providerAsOf = 0;
  for (let index = 0; index < timestamps.length; index += 1) {
    const start = Number(timestamps[index]) * 1000;
    if (!Number.isFinite(start) || start + 5 * 60 * 1000 > cutoff) continue;
    const clock = nyClock(new Date(start));
    const minute = clock.hour * 60 + clock.minute;
    if (minute < 570 || minute >= 960) continue;
    const open = validPrice(quote.open?.[index]);
    const high = validPrice(quote.high?.[index]);
    const low = validPrice(quote.low?.[index]);
    const close = validPrice(quote.close?.[index]);
    if (![open, high, low, close].every(Boolean)) continue;
    const bucket = Math.floor(start / (15 * 60 * 1000)) * 15 * 60 * 1000;
    const session = sessions.get(clock.date) || new Map();
    const current = session.get(bucket);
    const volume = Math.max(0, Number(quote.volume?.[index] || 0));
    session.set(bucket, current ? { ...current, high: Math.max(current.high, high), low: Math.min(current.low, low), close, volume: current.volume + volume } : { time: new Date(bucket).toISOString(), open, high, low, close, volume });
    sessions.set(clock.date, session);
    providerAsOf = Math.max(providerAsOf, start + 5 * 60 * 1000);
  }
  const sessionDate = nyClock(now).date;
  const currentBars = [...(sessions.get(sessionDate)?.values() || [])].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  if (!currentBars.length || !providerAsOf) throw new Error("no_current_session_bars");
  const previousClose = validPrice(result?.meta?.chartPreviousClose ?? result?.meta?.previousClose);
  if (!previousClose) throw new Error("missing_previous_close");
  const first = currentBars[0];
  const last = currentBars.at(-1);
  return { item, sessionDate, providerAsOf: new Date(providerAsOf).toISOString(), sessions: [...sessions.entries()].map(([date, values]) => ({ date, bars: [...values.values()].sort((a, b) => Date.parse(a.time) - Date.parse(b.time)) })), quote: { last_price: last.close, previous_close: previousClose, change_value: last.close - previousClose, change_percent: (last.close - previousClose) / previousClose * 100, open: first.open, high: Math.max(...currentBars.map((bar) => bar.high)), low: Math.min(...currentBars.map((bar) => bar.low)), volume: currentBars.reduce((sum, bar) => sum + bar.volume, 0), market_cap: Math.max(0, Number(result?.meta?.marketCap || 0)) } };
}

async function incremental(base44, catalog, source, now) {
  const output = [];
  const failures = [];
  let cursor = 0;
  async function worker() {
    while (cursor < US_BENCHMARKS_CATALOG.instruments.length) {
      const item = US_BENCHMARKS_CATALOG.instruments[cursor++];
      try { output.push(normalizeIntraday(item, await fetchChart(item.providerSymbol, "5m", "5d"), now)); }
      catch (error) { failures.push({ symbol: item.symbol, error: String(error?.message || "provider_failed") }); }
    }
  }
  await Promise.all(Array.from({ length: 12 }, () => worker()));
  const clock = nyClock(now);
  const run = await base44.asServiceRole.entities.IngestionRun.create({ run_type: "quarter_hour", market_code: US_BENCHMARKS_MARKET_CODE, slot_key: `${US_BENCHMARKS_MARKET_CODE}:${clock.date}:15m:${Date.now()}`, slot_kind: "quarter_hour", scheduled_for: now.toISOString(), started_at: now.toISOString(), total_records: catalog.length, success_count: 0, failed_count: 0, status: "running", source_id: source.id, notes: "U.S. benchmarks phased T+15 update" });
  const received = new Date().toISOString();
  const snapshotVersion = `${US_BENCHMARKS_MARKET_CODE}:${clock.date}:${Date.now()}`;
  const isFinal = clock.hour * 60 + clock.minute >= 975;
  const quotes = [];
  const chunks = [];
  for (const value of output) {
    const instrument = catalog.find((row) => row.symbol === value.item.symbol);
    const delay = Math.max(0, Math.floor((Date.now() - Date.parse(value.providerAsOf)) / 1000));
    quotes.push({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, session_date: value.sessionDate, symbol: value.item.symbol, ...value.quote, source_id: source.id, source_time: value.providerAsOf, provider_as_of: value.providerAsOf, last_trade_time: value.providerAsOf, received_time: received, delay_seconds: delay, license_status: "pending", quote_time: value.providerAsOf, quality_status: delay <= 1320 ? "verified" : "stale", snapshot_version: snapshotVersion, market_phase: isFinal ? "closed" : "continuous", freshness_status: delay <= 1320 ? "fresh" : "stale", is_final: isFinal, run_id: run.id });
    for (const session of value.sessions) chunks.push({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, symbol: value.item.symbol, interval: "15m", chunk_key: `${US_BENCHMARKS_MARKET_CODE}:${value.item.symbol}:15m:${session.date}`, session_date: session.date, start_time: session.bars[0].time, end_time: session.bars.at(-1).time, bars: session.bars, bar_count: session.bars.length, checksum: await digest(session.bars), source_id: source.id, run_id: run.id, snapshot_version: snapshotVersion, provider_as_of: value.providerAsOf, received_time: received, quality_status: delay <= 1320 ? "verified" : "stale", canonical_version: "us-benchmarks-intraday-v1", is_final: session.date !== value.sessionDate || isFinal, bucket_count: session.bars.length, completeness_status: session.date !== value.sessionDate || isFinal ? "complete" : "partial", is_historical_archive: session.date !== value.sessionDate, adjustment_mode: "none" });
  }
  const quoteResult = await upsertMany(base44, "QuoteLatest", quotes, ["instrument_id"], { market_code: US_BENCHMARKS_MARKET_CODE });
  const candleResult = await upsertMany(base44, "CandleChunk", chunks, ["instrument_id", "interval", "chunk_key"], { market_code: US_BENCHMARKS_MARKET_CODE, interval: "15m" });
  const coverage = quotes.length / catalog.length * 100;
  const status = coverage >= 99 ? "success" : coverage >= 80 ? "partial" : "failed";
  await base44.asServiceRole.entities.IngestionRun.update(run.id, { status, finished_at: new Date().toISOString(), success_count: quotes.length, failed_count: catalog.length - quotes.length, coverage_percent: coverage, provider_as_of: quotes.map((quote) => quote.provider_as_of).sort().at(-1) || null, snapshot_version: snapshotVersion, notes: JSON.stringify(failures).slice(0, 1000) });
  return { status, market_code: US_BENCHMARKS_MARKET_CODE, run_id: run.id, expected: catalog.length, accepted: quotes.length, rejected: failures.length, coverage_percent: coverage, quotes: quoteResult, candles: candleResult, failures };
}

function normalizeDaily(result, currentDate) {
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0] || {};
  const bars = [];
  for (let index = 0; index < timestamps.length; index += 1) {
    const time = new Date(Number(timestamps[index]) * 1000).toISOString();
    if (time.slice(0, 10) >= currentDate) continue;
    const open = validPrice(quote.open?.[index]);
    const high = validPrice(quote.high?.[index]);
    const low = validPrice(quote.low?.[index]);
    const close = validPrice(quote.close?.[index]);
    if (![open, high, low, close].every(Boolean)) continue;
    bars.push({ time, open, high, low, close, volume: Math.max(0, Number(quote.volume?.[index] || 0)) });
  }
  return bars;
}

async function historical(base44, catalog, source, body) {
  const syncRows = rows(await base44.asServiceRole.entities.HistoricalCandleSync.filter({ market_code: US_BENCHMARKS_MARKET_CODE, interval: "1d" }, "-completed_at", 500));
  const completed = new Set(syncRows.filter((row) => row.status === "complete" && row.coverage_verified === true && Number(row.bar_count || 0) >= 1000).map((row) => row.instrument_id));
  const requested = Array.isArray(body.symbols) ? new Set(body.symbols.map((symbol) => String(symbol).toUpperCase())) : null;
  const pending = catalog.filter((instrument) => (body.force === true || !completed.has(instrument.id)) && (!requested || requested.has(instrument.symbol))).slice(0, Math.min(10, Math.max(1, Number(body.batch_size) || 6)));
  if (!pending.length) return { status: "complete", market_code: US_BENCHMARKS_MARKET_CODE, reason: "no_pending_instruments" };
  const run = await base44.asServiceRole.entities.IngestionRun.create({ run_type: "historical_backfill", market_code: US_BENCHMARKS_MARKET_CODE, slot_key: `${US_BENCHMARKS_MARKET_CODE}:history:${Date.now()}`, slot_kind: "historical_backfill", scheduled_for: new Date().toISOString(), started_at: new Date().toISOString(), total_records: pending.length, success_count: 0, failed_count: 0, status: "running", source_id: source.id, notes: "phased daily history bootstrap" });
  const results = [];
  for (const instrument of pending) {
    const item = US_BENCHMARKS_CATALOG.instruments.find((value) => value.symbol === instrument.symbol);
    try {
      const bars = normalizeDaily(await fetchChart(item.providerSymbol, "1d", "full"), nyClock().date);
      if (bars.length < 20) throw new Error("daily_history_incomplete");
      const groups = new Map();
      for (const bar of bars) { const year = bar.time.slice(0, 4); if (!groups.has(year)) groups.set(year, []); groups.get(year).push(bar); }
      const chunks = [];
      for (const [year, yearBars] of groups) chunks.push({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, symbol: instrument.symbol, interval: "1d", chunk_key: `${US_BENCHMARKS_MARKET_CODE}:${instrument.symbol}:1d:history:${year}`, start_time: yearBars[0].time, end_time: yearBars.at(-1).time, bars: yearBars, bar_count: yearBars.length, checksum: await digest(yearBars), source_id: source.id, run_id: run.id, snapshot_version: await digest(bars), provider_as_of: yearBars.at(-1).time, received_time: new Date().toISOString(), quality_status: "verified", canonical_version: "us-benchmarks-daily-v1", is_final: true, bucket_count: yearBars.length, completeness_status: "complete", is_historical_archive: true, adjustment_mode: "none", history_from: bars[0].time.slice(0, 10), history_to: bars.at(-1).time.slice(0, 10) });
      await upsertMany(base44, "CandleChunk", chunks, ["instrument_id", "interval", "chunk_key"], { instrument_id: instrument.id, interval: "1d" });
      const existing = syncRows.find((row) => row.instrument_id === instrument.id);
      const sync = { instrument_id: instrument.id, symbol: instrument.symbol, market_code: US_BENCHMARKS_MARKET_CODE, provider_code: US_BENCHMARKS_PROVIDER_CODE, interval: "1d", status: "complete", requested_from: bars[0].time.slice(0, 10), requested_to: nyClock().date, earliest_bar_time: bars[0].time, latest_bar_time: bars.at(-1).time, bar_count: bars.length, year_chunk_count: groups.size, checksum: await digest(bars), adjustment_mode: "provider_ohlcv", provider_partial: false, provider_first_trade_time: bars[0].time, coverage_verified: true, source_id: source.id, run_id: run.id, last_attempt_at: new Date().toISOString(), completed_at: new Date().toISOString() };
      if (existing) await base44.asServiceRole.entities.HistoricalCandleSync.update(existing.id, sync); else await base44.asServiceRole.entities.HistoricalCandleSync.create(sync);
      results.push({ symbol: instrument.symbol, status: "complete", bar_count: bars.length });
    } catch (error) { results.push({ symbol: instrument.symbol, status: "failed", error: String(error?.message || "history_failed") }); }
  }
  const success = results.filter((result) => result.status === "complete").length;
  const status = success === pending.length ? "success" : success ? "partial" : "failed";
  await base44.asServiceRole.entities.IngestionRun.update(run.id, { status, finished_at: new Date().toISOString(), success_count: success, failed_count: pending.length - success, coverage_percent: success / pending.length * 100, notes: JSON.stringify(results).slice(0, 1000) });
  return { status, market_code: US_BENCHMARKS_MARKET_CODE, run_id: run.id, results };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const requestBody = await readJsonBody(req);
    const body = { ...requestBody, ...(requestBody.args || {}) };
    if (body.session_id) await requirePermission(base44, body.session_id, "data.ingestion.run"); else await requireTrustedOwner(base44);
    if (String(body.market_code || US_BENCHMARKS_MARKET_CODE) !== US_BENCHMARKS_MARKET_CODE) throw Object.assign(new Error("Wrong market"), { status: 400, code: "MARKET_MISMATCH" });
    const now = new Date();
    const { source, instruments } = await ensureCatalog(base44, now);
    if (body.action === "catalog_status") return Response.json({ status: "ready", market_code: US_BENCHMARKS_MARKET_CODE, instruments: instruments.length });
    if (body.action === "history") return Response.json(await historical(base44, instruments, source, body));
    const clock = nyClock(now);
    const minute = clock.hour * 60 + clock.minute;
    if (body.force !== true && (!['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(clock.weekday) || minute < 600 || minute > 990)) return Response.json({ status: "skipped", reason: "outside_ingestion_window", market_code: US_BENCHMARKS_MARKET_CODE });
    return Response.json(await incremental(base44, instruments, source, now));
  } catch (error) {
    return replyError(error);
  }
}