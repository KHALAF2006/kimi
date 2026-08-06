import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { readJsonBody, replyError, requirePermission, requireTrustedOwner } from "../../shared/security.ts";
import { entityRows as rows, upsertEntityRows as upsertMany } from "../../shared/entity-batch.ts";
import { US_BENCHMARKS_CATALOG, US_BENCHMARKS_MARKET_CODE, US_BENCHMARKS_PROVIDER_CODE } from "../../shared/us-benchmarks-catalog.ts";
import { alertIntervalDue } from "../../shared/us-options-timing.ts";

const DELAY_SECONDS = 900;
const FRESHNESS_GRACE_SECONDS = 8 * 60;
const BASE_URL = "https://query1.finance.yahoo.com";
const HOLIDAYS_2026 = new Set([
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25",
  "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25",
]);
const EARLY_CLOSE_2026 = new Set(["2026-11-27", "2026-12-24"]);

function nyClock(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false,
  }).formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24, minute: Number(parts.minute), weekday: parts.weekday };
}

function minuteFromClock(value, fallback) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ""));
  if (!match) return fallback;
  const minute = Number(match[1]) * 60 + Number(match[2]);
  return Number.isFinite(minute) ? minute : fallback;
}

async function sessionDecision(base44, clock) {
  const sessions = rows(await base44.asServiceRole.entities.MarketSession.filter({ market_code: US_BENCHMARKS_MARKET_CODE, session_date: clock.date }));
  if (sessions[0]) return { tradingDay: sessions[0].is_trading_day === true, closeMinute: minuteFromClock(sessions[0].closes_at, 960), reason: sessions[0].reason || "market_session_calendar" };
  const holidays = rows(await base44.asServiceRole.entities.MarketHoliday.filter({ market_code: US_BENCHMARKS_MARKET_CODE, holiday_date: clock.date }));
  if (holidays.length) return { tradingDay: false, closeMinute: 960, reason: "market_holiday_calendar" };
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(clock.weekday);
  if (!weekday || HOLIDAYS_2026.has(clock.date)) return { tradingDay: false, closeMinute: 960, reason: weekday ? "official_market_holiday" : "weekend" };
  return { tradingDay: true, closeMinute: EARLY_CLOSE_2026.has(clock.date) ? 780 : 960, reason: "official_2026_fallback" };
}

async function nextTradingSessionDate(base44, sessionDate) {
  const cursor = new Date(`${sessionDate}T12:00:00.000Z`);
  for (let offset = 1; offset <= 10; offset += 1) {
    const candidate = new Date(cursor);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    const clock = nyClock(candidate);
    if ((await sessionDecision(base44, clock)).tradingDay) return clock.date;
  }
  throw Object.assign(new Error("Unable to resolve the next U.S. benchmark trading session"), { status: 503, code: "US_BENCHMARKS_CALENDAR_INCOMPLETE" });
}

function expectedSessionBars(sessionDate) {
  return EARLY_CLOSE_2026.has(sessionDate) ? 14 : 26;
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
    const componentTime = new Date(start).toISOString();
    const volume = Math.max(0, Number(quote.volume?.[index] || 0));
    session.set(bucket, current
      ? { ...current, high: Math.max(current.high, high), low: Math.min(current.low, low), close, volume: current.volume + volume, component_times: [...current.component_times, componentTime] }
      : { time: new Date(bucket).toISOString(), open, high, low, close, volume, component_times: [componentTime] });
    sessions.set(clock.date, session);
    providerAsOf = Math.max(providerAsOf, start + 5 * 60 * 1000);
  }
  const currentSessionDate = nyClock(now).date;
  const sessionDate = sessions.has(currentSessionDate) ? currentSessionDate : [...sessions.keys()].sort().at(-1);
  const completeBars = (values) => [...values.values()]
    .filter((bar) => new Set(bar.component_times).size === 3)
    .map(({ component_times: _componentTimes, ...bar }) => bar)
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  const currentBars = sessionDate ? completeBars(sessions.get(sessionDate) || new Map()) : [];
  if (!sessionDate || !currentBars.length || !providerAsOf) throw new Error("no_eligible_session_bars");
  const previousClose = validPrice(result?.meta?.chartPreviousClose ?? result?.meta?.previousClose);
  if (!previousClose) throw new Error("missing_previous_close");
  const first = currentBars[0];
  const last = currentBars.at(-1);
  const canonicalProviderAsOf = new Date(Date.parse(last.time) + 15 * 60 * 1000).toISOString();
  return { item, sessionDate, providerAsOf: canonicalProviderAsOf, sessions: [...sessions.entries()].map(([date, values]) => ({ date, bars: completeBars(values) })).filter((session) => session.bars.length), quote: { last_price: last.close, previous_close: previousClose, change_value: last.close - previousClose, change_percent: (last.close - previousClose) / previousClose * 100, open: first.open, high: Math.max(...currentBars.map((bar) => bar.high)), low: Math.min(...currentBars.map((bar) => bar.low)), volume: currentBars.reduce((sum, bar) => sum + bar.volume, 0), market_cap: Math.max(0, Number(result?.meta?.marketCap || 0)) } };
}

async function queueAlertDeliveries(base44, rule, bucket) {
  const destinations = rows(await base44.asServiceRole.entities.AlertDestination.filter({ customer_id: rule.customer_id, active: true }));
  for (const destination of destinations) {
    const dedupeKey = await digest(`${rule.id}:${destination.id}:${bucket}`);
    const existing = rows(await base44.asServiceRole.entities.DeliveryEvent.filter({ dedupe_key: dedupeKey }));
    if (!existing.length) await base44.asServiceRole.entities.DeliveryEvent.create({
      alert_rule_id: rule.id, destination_id: destination.id, dedupe_key: dedupeKey,
      channel: destination.channel, status: "pending", attempt_count: 0,
    });
  }
}

async function evaluateAlerts(base44, acceptedQuotes, isFinal, nextTradingDate) {
  const byInstrument = new Map(acceptedQuotes.map((quote) => [quote.instrument_id, quote]));
  const rules = rows(await base44.asServiceRole.entities.AlertRule.list("-updated_date", 5e3))
    .filter((rule) => rule.enabled && rule.market_code === US_BENCHMARKS_MARKET_CODE)
    .filter((rule) => ["crosses_above", "crosses_below"].includes(rule.condition));
  for (const rule of rules) {
    const quote = byInstrument.get(rule.instrument_id);
    const current = Number(quote?.last_price);
    const previous = Number(rule.last_observed_price);
    const threshold = Number(rule.threshold);
    if (!quote || !Number.isFinite(current) || !Number.isFinite(threshold) || !alertIntervalDue(rule.interval || "15m", quote.provider_as_of, isFinal, { nextTradingDate })) continue;
    const bucket = `${rule.interval || "15m"}:${quote.provider_as_of}`;
    if (rule.last_evaluation_bucket === bucket) continue;
    const crossed = rule.condition === "crosses_above"
      ? Number.isFinite(previous) && previous <= threshold && current > threshold
      : Number.isFinite(previous) && previous >= threshold && current < threshold;
    const update = { last_observed_price: current, last_observed_at: quote.provider_as_of, last_evaluation_bucket: bucket };
    if (crossed) {
      const cooldown = Math.max(15, Number(rule.cooldown_minutes) || 15) * 60e3;
      if (!rule.last_triggered_at || Date.parse(quote.provider_as_of) - Date.parse(rule.last_triggered_at) >= cooldown) {
        await queueAlertDeliveries(base44, rule, bucket);
        update.last_triggered_at = quote.provider_as_of;
        if (rule.frequency === "once") update.enabled = false;
      }
    }
    await base44.asServiceRole.entities.AlertRule.update(rule.id, update);
  }
}

async function incremental(base44, catalog, source, now, options = {}) {
  const range = options.range === "1mo" ? "1mo" : "5d";
  const writeQuotes = options.writeQuotes !== false;
  const output = [];
  const failures = [];
  let cursor = 0;
  async function worker() {
    while (cursor < catalog.length) {
      const instrument = catalog[cursor++];
      const item = US_BENCHMARKS_CATALOG.instruments.find((candidate) => candidate.symbol === instrument.symbol);
      if (!item) {
        failures.push({ symbol: instrument.symbol, error: "catalog_mapping_missing" });
        continue;
      }
      try { output.push(normalizeIntraday(item, await fetchChart(item.providerSymbol, "5m", range), now)); }
      catch (error) { failures.push({ symbol: item.symbol, error: String(error?.message || "provider_failed") }); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(12, Math.max(1, catalog.length)) }, () => worker()));
  const clock = nyClock(now);
  const slotMinute = Math.floor(clock.minute / 15) * 15;
  const slotKey = range === "1mo"
    ? `${US_BENCHMARKS_MARKET_CODE}:${clock.date}:15m:archive`
    : `${US_BENCHMARKS_MARKET_CODE}:${clock.date}:15m:${String(clock.hour).padStart(2, "0")}:${String(slotMinute).padStart(2, "0")}`;
  const existingRuns = rows(await base44.asServiceRole.entities.IngestionRun.filter({ slot_key: slotKey }));
  if (existingRuns.some((item) => ["success", "partial"].includes(item.status)) && options.force !== true) return { status: "skipped", reason: "already_ingested", market_code: US_BENCHMARKS_MARKET_CODE, slot_key: slotKey };
  const run = await base44.asServiceRole.entities.IngestionRun.create({ run_type: range === "1mo" ? "intraday_backfill" : "quarter_hour", market_code: US_BENCHMARKS_MARKET_CODE, slot_key: slotKey, slot_kind: range === "1mo" ? "historical_backfill" : "quarter_hour", scheduled_for: now.toISOString(), lease_expires_at: new Date(now.getTime() + 3 * 60 * 1000).toISOString(), started_at: now.toISOString(), total_records: catalog.length, success_count: 0, failed_count: 0, status: "running", source_id: source.id, notes: range === "1mo" ? "U.S. benchmarks 15-minute one-month backfill" : "U.S. benchmarks phased T+15 update" });
  const received = new Date().toISOString();
  const snapshotVersion = `${US_BENCHMARKS_MARKET_CODE}:${clock.date}:${Date.now()}`;
  const closeMinute = Number(options.closeMinute || 960);
  const isFinal = clock.hour * 60 + clock.minute >= closeMinute + 15;
  const quotes = [];
  const chunks = [];
  for (const value of output) {
    const instrument = catalog.find((row) => row.symbol === value.item.symbol);
    const delay = Math.max(0, Math.floor((Date.now() - Date.parse(value.providerAsOf)) / 1000));
    const fresh = delay <= DELAY_SECONDS + FRESHNESS_GRACE_SECONDS;
    if (writeQuotes) quotes.push({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, session_date: value.sessionDate, symbol: value.item.symbol, ...value.quote, source_id: source.id, source_time: value.providerAsOf, provider_as_of: value.providerAsOf, last_trade_time: value.providerAsOf, received_time: received, delay_seconds: delay, license_status: "pending", quote_time: value.providerAsOf, quality_status: fresh ? "verified" : "stale", snapshot_version: snapshotVersion, market_phase: isFinal ? "closed" : "continuous", freshness_status: fresh ? "fresh" : "stale", is_final: isFinal, run_id: run.id });
    for (const session of value.sessions) {
      const sessionComplete = (session.date !== value.sessionDate || isFinal) && session.bars.length === expectedSessionBars(session.date);
      chunks.push({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, symbol: value.item.symbol, interval: "15m", chunk_key: `${US_BENCHMARKS_MARKET_CODE}:${value.item.symbol}:15m:${session.date}`, session_date: session.date, start_time: session.bars[0].time, end_time: session.bars.at(-1).time, bars: session.bars, bar_count: session.bars.length, checksum: await digest(session.bars), source_id: source.id, run_id: run.id, snapshot_version: snapshotVersion, provider_as_of: value.providerAsOf, received_time: received, quality_status: fresh ? "verified" : "stale", canonical_version: "us-benchmarks-intraday-v3", is_final: sessionComplete, bucket_count: session.bars.length, completeness_status: sessionComplete ? "complete" : session.bars.length >= 4 ? "degraded" : "incomplete", is_historical_archive: session.date !== value.sessionDate, adjustment_mode: "none" });
    }
  }
  const coverage = output.length / catalog.length * 100;
  const status = coverage >= 99 ? "success" : coverage >= 95 ? "partial" : "failed";
  const observations = quotes.map((quote) => ({ run_id: quote.run_id, snapshot_version: quote.snapshot_version, market_code: quote.market_code, session_date: quote.session_date, instrument_id: quote.instrument_id, symbol: quote.symbol, last_price: quote.last_price, previous_close: quote.previous_close, change_value: quote.change_value, change_percent: quote.change_percent, open: quote.open, high: quote.high, low: quote.low, volume: quote.volume, market_cap: quote.market_cap, source_id: quote.source_id, provider_as_of: quote.provider_as_of, last_trade_time: quote.last_trade_time, received_time: quote.received_time, delay_seconds: quote.delay_seconds, market_phase: quote.market_phase, freshness_status: quote.freshness_status, quality_status: quote.quality_status, is_final: quote.is_final }));
  if (observations.length) await base44.asServiceRole.entities.QuoteObservation.bulkCreate(observations);
  const quoteResult = status === "failed" || !quotes.length ? { created: 0, updated: 0, preserved_last_good: status === "failed" } : await upsertMany(base44, "QuoteLatest", quotes, ["instrument_id"], { market_code: US_BENCHMARKS_MARKET_CODE });
  const candleResult = status === "failed" ? { created: 0, updated: 0, preserved_last_good: true } : await upsertMany(base44, "CandleChunk", chunks, ["instrument_id", "interval", "chunk_key"], { market_code: US_BENCHMARKS_MARKET_CODE, interval: "15m" });
  if (status !== "failed" && writeQuotes) {
    const nextTradingDate = isFinal ? await nextTradingSessionDate(base44, clock.date) : "";
    await evaluateAlerts(base44, quotes, isFinal, nextTradingDate);
  }
  await base44.asServiceRole.entities.IngestionRun.update(run.id, { status, finished_at: new Date().toISOString(), success_count: output.length, failed_count: catalog.length - output.length, coverage_percent: coverage, provider_as_of: output.map((value) => value.providerAsOf).sort().at(-1) || null, snapshot_version: snapshotVersion, notes: JSON.stringify(failures).slice(0, 1000) });
  return { status, market_code: US_BENCHMARKS_MARKET_CODE, run_id: run.id, range, expected: catalog.length, accepted: output.length, rejected: failures.length, coverage_percent: coverage, quote_count: quotes.length, session_chunk_count: chunks.length, candle_bar_count: chunks.reduce((sum, chunk) => sum + chunk.bar_count, 0), quotes: quoteResult, candles: candleResult, failures };
}

async function expireStaleRuns(base44, now) {
  const running = rows(await base44.asServiceRole.entities.IngestionRun.filter({ market_code: US_BENCHMARKS_MARKET_CODE, status: "running" }, "-started_at", 100));
  const cutoff = now.getTime() - 10 * 60 * 1000;
  for (const run of running) {
    const leaseExpired = run.lease_expires_at && Date.parse(run.lease_expires_at) < now.getTime();
    const startedTooLongAgo = run.started_at && Date.parse(run.started_at) < cutoff;
    if (!leaseExpired && !startedTooLongAgo) continue;
    await base44.asServiceRole.entities.IngestionRun.update(run.id, {
      status: "failed",
      finished_at: now.toISOString(),
      failure_code: "LEASE_EXPIRED",
      notes: `${String(run.notes || "").slice(0, 700)} | Automatically closed after the execution lease expired`.slice(0, 1000),
    });
  }
}

async function pendingIntradayArchiveInstruments(base44, catalog, batchSize = 8) {
  const chunks = rows(await base44.asServiceRole.entities.CandleChunk.filter({ market_code: US_BENCHMARKS_MARKET_CODE, interval: "15m" }, "-end_time", 500));
  const completeSessions = new Map();
  for (const chunk of chunks) {
    if (chunk.is_final !== true || chunk.completeness_status !== "complete" || !chunk.session_date) continue;
    if (!completeSessions.has(chunk.instrument_id)) completeSessions.set(chunk.instrument_id, new Set());
    completeSessions.get(chunk.instrument_id).add(chunk.session_date);
  }
  return catalog
    .filter((instrument) => (completeSessions.get(instrument.id)?.size || 0) < 15)
    .slice(0, Math.min(8, Math.max(1, Number(batchSize) || 8)));
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
    if (![open, high, low, close].every(Boolean) || high < Math.max(open, close) || low > Math.min(open, close)) continue;
    bars.push({ time, open, high, low, close, volume: Math.max(0, Number(quote.volume?.[index] || 0)) });
  }
  return [...new Map(bars.map((bar) => [bar.time.slice(0, 10), bar])).values()].sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
}

async function refreshRecentDaily(base44, catalog, source, now) {
  const clock = nyClock(now);
  const slotKey = `${US_BENCHMARKS_MARKET_CODE}:daily:${clock.date}`;
  const existingRuns = rows(await base44.asServiceRole.entities.IngestionRun.filter({ market_code: US_BENCHMARKS_MARKET_CODE, slot_key: slotKey }, "-started_at", 5));
  if (existingRuns.some((item) => ["success", "partial"].includes(item.status))) return { status: "skipped", reason: "already_refreshed", market_code: US_BENCHMARKS_MARKET_CODE, slot_key: slotKey };
  const run = await base44.asServiceRole.entities.IngestionRun.create({ run_type: "daily_refresh", market_code: US_BENCHMARKS_MARKET_CODE, slot_key: slotKey, slot_kind: "session_final", scheduled_for: now.toISOString(), lease_expires_at: new Date(now.getTime() + 3 * 60 * 1000).toISOString(), started_at: now.toISOString(), total_records: catalog.length, success_count: 0, failed_count: 0, status: "running", source_id: source.id, notes: "Incremental daily candle refresh; historical years remain stored" });
  const syncRows = rows(await base44.asServiceRole.entities.HistoricalCandleSync.filter({ market_code: US_BENCHMARKS_MARKET_CODE, interval: "1d" }, "-completed_at", 500));
  const output = [];
  const failures = [];
  let cursor = 0;
  async function worker() {
    while (cursor < catalog.length) {
      const instrument = catalog[cursor++];
      const item = US_BENCHMARKS_CATALOG.instruments.find((value) => value.symbol === instrument.symbol);
      try {
        const recent = normalizeDaily(await fetchChart(item.providerSymbol, "1d", "1mo"), clock.date);
        if (!recent.length) throw new Error("recent_daily_empty");
        const year = recent.at(-1).time.slice(0, 4);
        const key = `${US_BENCHMARKS_MARKET_CODE}:${instrument.symbol}:1d:history:${year}`;
        const existingChunks = rows(await base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, interval: "1d", chunk_key: key }, "-end_time", 5));
        const byDay = new Map([...(existingChunks[0]?.bars || []), ...recent].map((bar) => [String(bar.time).slice(0, 10), bar]));
        const bars = [...byDay.values()].sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
        const chunk = { instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, symbol: instrument.symbol, interval: "1d", chunk_key: key, start_time: bars[0].time, end_time: bars.at(-1).time, bars, bar_count: bars.length, checksum: await digest(bars), source_id: source.id, run_id: run.id, snapshot_version: await digest(recent), provider_as_of: bars.at(-1).time, received_time: new Date().toISOString(), quality_status: "verified", canonical_version: "us-benchmarks-daily-v2", is_final: true, bucket_count: bars.length, completeness_status: "complete", is_historical_archive: true, adjustment_mode: "none", history_from: bars[0].time.slice(0, 10), history_to: bars.at(-1).time.slice(0, 10) };
        await upsertMany(base44, "CandleChunk", [chunk], ["instrument_id", "interval", "chunk_key"], { instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, interval: "1d" });
        const sync = syncRows.find((row) => row.instrument_id === instrument.id);
        if (sync) await base44.asServiceRole.entities.HistoricalCandleSync.update(sync.id, { latest_bar_time: bars.at(-1).time, requested_to: clock.date, bar_count: Math.max(Number(sync.bar_count || 0), Number(sync.bar_count || 0) + Math.max(0, bars.length - Number(existingChunks[0]?.bar_count || 0))), checksum: await digest([sync.checksum || "", bars]), last_attempt_at: new Date().toISOString(), completed_at: new Date().toISOString(), status: "complete", coverage_verified: true, provider_partial: false, run_id: run.id });
        output.push({ symbol: instrument.symbol, bars: recent.length });
      } catch (error) { failures.push({ symbol: instrument.symbol, error: String(error?.message || "daily_refresh_failed") }); }
    }
  }
  await Promise.all(Array.from({ length: 8 }, () => worker()));
  const coverage = output.length / catalog.length * 100;
  const status = coverage >= 99 ? "success" : coverage >= 95 ? "partial" : "failed";
  await base44.asServiceRole.entities.IngestionRun.update(run.id, { status, finished_at: new Date().toISOString(), success_count: output.length, failed_count: failures.length, coverage_percent: coverage, provider_as_of: output.length ? now.toISOString() : null, notes: JSON.stringify(failures).slice(0, 1000) });
  return { status, market_code: US_BENCHMARKS_MARKET_CODE, run_id: run.id, accepted: output.length, rejected: failures.length, coverage_percent: coverage, failures };
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
      if (bars.length < 250) throw new Error("daily_history_incomplete");
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
    await expireStaleRuns(base44, now);
    if (body.action === "catalog_status") return Response.json({ status: "ready", market_code: US_BENCHMARKS_MARKET_CODE, instruments: instruments.length });
    if (body.action === "history") return Response.json(await historical(base44, instruments, source, body));
    if (body.action === "daily_refresh") return Response.json(await refreshRecentDaily(base44, instruments, source, now));
    if (body.action === "intraday_history") {
      const pending = await pendingIntradayArchiveInstruments(base44, instruments, body.batch_size);
      if (!pending.length) return Response.json({ status: "complete", market_code: US_BENCHMARKS_MARKET_CODE, reason: "intraday_archive_already_complete", instruments: instruments.length });
      return Response.json(await incremental(base44, pending, source, now, { range: "1mo", writeQuotes: false, force: body.force === true }));
    }
    if (body.action === "data_status") {
      const instrumentIds = new Set(instruments.map((instrument) => instrument.id));
      const [quotes, intraday, history, signals] = await Promise.all([
        base44.asServiceRole.entities.QuoteLatest.filter({ market_code: US_BENCHMARKS_MARKET_CODE }, "-provider_as_of", 500),
        base44.asServiceRole.entities.CandleChunk.filter({ market_code: US_BENCHMARKS_MARKET_CODE, interval: "15m" }, "-end_time", 2000),
        base44.asServiceRole.entities.HistoricalCandleSync.filter({ market_code: US_BENCHMARKS_MARKET_CODE, interval: "1d" }, "-completed_at", 500),
        base44.asServiceRole.entities.IndicatorSnapshot.filter({ market_code: US_BENCHMARKS_MARKET_CODE, indicator_key: "technical_signals" }, "-source_as_of", 500),
      ]);
      const count = (values, predicate) => new Set(rows(values).filter((item) => instrumentIds.has(item.instrument_id) && predicate(item)).map((item) => item.instrument_id)).size;
      const signalCoverage = Object.fromEntries(["1d", "1wk", "1mo"].map((timeframe) => [timeframe, count(signals, (item) => item.timeframe === timeframe)]));
      return Response.json({ status: "ready", market_code: US_BENCHMARKS_MARKET_CODE, expected_instruments: instruments.length, quote_instrument_count: count(quotes, (item) => Number(item.last_price) > 0 && item.quality_status !== "quarantined"), intraday_instrument_count: count(intraday, (item) => Array.isArray(item.bars) && item.bars.length > 0 && item.quality_status !== "quarantined"), daily_history_instrument_count: count(history, (item) => item.status === "complete" && item.coverage_verified === true && item.provider_partial !== true), signal_instrument_count: signalCoverage });
    }
    const clock = nyClock(now);
    const minute = clock.hour * 60 + clock.minute;
    const session = await sessionDecision(base44, clock);
    if (body.force !== true && (!session.tradingDay || minute < 600 || minute > session.closeMinute + 30)) return Response.json({ status: "skipped", reason: session.tradingDay ? "outside_ingestion_window" : session.reason, market_code: US_BENCHMARKS_MARKET_CODE });
    return Response.json(await incremental(base44, instruments, source, now, { closeMinute: session.closeMinute }));
  } catch (error) {
    return replyError(error);
  }
}
