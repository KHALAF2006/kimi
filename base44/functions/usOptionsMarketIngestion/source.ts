import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { readJsonBody, replyError, requirePermission, requireTrustedOwner } from "../../shared/security.ts";
import { US_OPTIONS_CATALOG, US_OPTIONS_MARKET_CODE, US_OPTIONS_SYMBOLS } from "../../shared/us-options-catalog.ts";
import { alertIntervalDue, delayedCutoffMs, isCompletedDelayedBar, US_OPTIONS_DELAY_SECONDS } from "../../shared/us-options-timing.ts";
import { earliestRecentGapByInstrument, incrementalProviderWindow, indexCandleChunks, latestStoredCandleByInstrument, mergeCandleBars, summarizeProviderWindows } from "../../shared/incremental-candle-sync.ts";
import { closeExpiredIngestionRuns } from "../../shared/ingestion-run-lifecycle.ts";

const PROVIDER_CODE = "REFERENCE_YAHOO_US_OPTIONS_T15";
const DELAY_SECONDS = US_OPTIONS_DELAY_SECONDS;
const REFRESH_CADENCE_SECONDS = 60 * 60;
const INGESTION_PROCESSING_GRACE_SECONDS = 10 * 60;
const FRESHNESS_GRACE_SECONDS = REFRESH_CADENCE_SECONDS + INGESTION_PROCESSING_GRACE_SECONDS;
const PROVIDER_BAR_INTERVAL_MS = 5 * 60 * 1000;
const CONCURRENCY = 8;
const PROVIDER_MAX_ATTEMPTS = 4;
function rawQuoteObservationPersistenceEnabled() {
  return String(Deno.env.get("SMART_INVESTOR_PERSIST_RAW_QUOTE_OBSERVATIONS") || "").trim().toLowerCase() === "true";
}
const HOLIDAYS_2026 = new Map([
  ["2026-01-01", "New Year's Day"], ["2026-01-19", "Martin Luther King Jr. Day"],
  ["2026-02-16", "Washington's Birthday"], ["2026-04-03", "Good Friday"],
  ["2026-05-25", "Memorial Day"], ["2026-06-19", "Juneteenth"],
  ["2026-07-03", "Independence Day observed"], ["2026-09-07", "Labor Day"],
  ["2026-11-26", "Thanksgiving Day"], ["2026-12-25", "Christmas Day"],
]);
const EARLY_CLOSE_2026 = new Set(["2026-11-27", "2026-12-24"]);

function rows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

async function readRowsWithRetry(read) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return rows(await read());
    } catch (error) {
      lastError = error;
      const status = Number(error?.status || error?.response?.status || 0);
      const message = String(error?.message || "").toLowerCase();
      if (attempt >= 3 || status !== 429 && !message.includes("rate limit")) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

function nyClock(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, weekday: "short",
  }).formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: parts.weekday,
  };
}

function validNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function validVolume(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function expectedSessionBars(sessionDate) {
  return EARLY_CLOSE_2026.has(sessionDate) ? 14 : 26;
}

function quoteFromBars(bars, previousClose, marketCap = 0) {
  const first = bars[0];
  const last = bars.at(-1);
  const changeValue = last.close - previousClose;
  return {
    last_price: last.close,
    previous_close: previousClose,
    change_value: changeValue,
    change_percent: changeValue / previousClose * 100,
    open: first.open,
    high: Math.max(...bars.map((bar) => bar.high)),
    low: Math.min(...bars.map((bar) => bar.low)),
    volume: bars.reduce((sum, bar) => sum + validVolume(bar.volume), 0),
    market_cap: validVolume(marketCap),
  };
}

function checksum(value) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)))
    .then((digest) => Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join(""));
}

function keyFor(row, fields) {
  return fields.map((field) => String(row[field] ?? "")).join("|");
}

function minuteFromClock(value, fallback) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ""));
  if (!match) return fallback;
  const minute = Number(match[1]) * 60 + Number(match[2]);
  return Number.isFinite(minute) ? minute : fallback;
}

async function sessionDecision(base44, clock) {
  const sessions = rows(await base44.asServiceRole.entities.MarketSession.filter({ market_code: US_OPTIONS_MARKET_CODE, session_date: clock.date }));
  if (sessions[0]) return {
    tradingDay: sessions[0].is_trading_day === true,
    closeMinute: minuteFromClock(sessions[0].closes_at, 960),
    reason: sessions[0].reason || "market_session_calendar",
  };
  const holidays = rows(await base44.asServiceRole.entities.MarketHoliday.filter({ market_code: US_OPTIONS_MARKET_CODE, holiday_date: clock.date }));
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
  throw Object.assign(new Error("Unable to resolve the next U.S. trading session"), { status: 503, code: "US_OPTIONS_CALENDAR_INCOMPLETE" });
}

async function upsertMany(base44, entity, incoming, fields, existingFilter = null) {
  const unique = [...new Map(incoming.map((row) => [keyFor(row, fields), row])).values()];
  const existing = rows(existingFilter
    ? await base44.asServiceRole.entities[entity].filter(existingFilter, "-updated_date", 5e3)
    : await base44.asServiceRole.entities[entity].list("-updated_date", 5e3));
  const byKey = new Map(existing.map((row) => [keyFor(row, fields), row]));
  const creates = unique.filter((row) => !byKey.has(keyFor(row, fields)));
  const updates = unique.filter((row) => byKey.has(keyFor(row, fields))).map((row) => ({ id: byKey.get(keyFor(row, fields)).id, ...row }));
  if (creates.length) await base44.asServiceRole.entities[entity].bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities[entity].bulkUpdate([...new Map(updates.map((row) => [row.id, row])).values()]);
  return { created: creates.length, updated: updates.length };
}

function instrumentRow(company) {
  return {
    symbol: company.symbol,
    market_code: US_OPTIONS_MARKET_CODE,
    instrument_code: company.symbol,
    instrument_type: "equity",
    composite_key: `${US_OPTIONS_MARKET_CODE}:${company.symbol}`,
    name_ar: company.nameAr,
    name_en: company.nameEn,
    sector_ar: company.sectorAr,
    sector_en: company.sectorEn,
    industry_en: company.industryEn,
    market: US_OPTIONS_CATALOG.market.name_en,
    currency: "USD",
    exchange_code: "US",
    country_code: "US",
    issuer_country: company.country,
    ipo_year: company.ipoYear,
    optionable: true,
    catalog_as_of: US_OPTIONS_CATALOG.source.asOf,
    status: "active",
    official_url: company.nasdaqUrl,
  };
}

async function ensureCatalog(base44, now) {
  const marketRows = await base44.asServiceRole.entities.Market.filter({ market_code: US_OPTIONS_MARKET_CODE });
  if (marketRows[0]) await base44.asServiceRole.entities.Market.update(marketRows[0].id, US_OPTIONS_CATALOG.market);
  else await base44.asServiceRole.entities.Market.create(US_OPTIONS_CATALOG.market);

  const sourceRows = await base44.asServiceRole.entities.DataSource.filter({ code: PROVIDER_CODE });
  const sourceData = {
    name: "U.S. optionable equities delayed chart adapter", market_code: US_OPTIONS_MARKET_CODE,
    source_type: "reference", quote_mode: "delayed", delay_seconds: DELAY_SECONDS,
    license_status: "restricted", public_enabled: false, base_url: "https://query1.finance.yahoo.com",
    last_verified_at: now.toISOString(),
  };
  const source = sourceRows[0]
    ? await base44.asServiceRole.entities.DataSource.update(sourceRows[0].id, sourceData)
    : await base44.asServiceRole.entities.DataSource.create({ code: PROVIDER_CODE, ...sourceData });

  const existingInstruments = rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_OPTIONS_MARKET_CODE }));
  const byCompositeKey = new Map(existingInstruments.map((instrument) => [instrument.composite_key, instrument]));
  const instrumentCreates = [];
  const instrumentUpdates = [];
  for (const company of US_OPTIONS_CATALOG.companies) {
    const payload = instrumentRow(company);
    const current = byCompositeKey.get(payload.composite_key);
    if (!current) instrumentCreates.push(payload);
    else if (["symbol", "name_ar", "name_en", "sector_ar", "sector_en", "industry_en", "currency", "status", "catalog_as_of"]
      .some((field) => current[field] !== payload[field])) instrumentUpdates.push({ id: current.id, ...payload });
  }
  if (instrumentCreates.length) await base44.asServiceRole.entities.Instrument.bulkCreate(instrumentCreates);
  if (instrumentUpdates.length) await base44.asServiceRole.entities.Instrument.bulkUpdate(instrumentUpdates);
  const instruments = rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_OPTIONS_MARKET_CODE }))
    .filter((instrument) => US_OPTIONS_SYMBOLS.has(instrument.symbol) && instrument.status !== "delisted");
  if (instruments.length !== US_OPTIONS_CATALOG.companies.length) throw Object.assign(new Error(`U.S. options catalog incomplete: ${instruments.length}/${US_OPTIONS_CATALOG.companies.length}`), { status: 503, code: "US_OPTIONS_CATALOG_INCOMPLETE" });

  const existingMappings = rows(await base44.asServiceRole.entities.ProviderInstrumentMap.filter({ market_code: US_OPTIONS_MARKET_CODE }));
  const mappingsByKey = new Map(existingMappings.map((mapping) => [`${mapping.instrument_id}|${mapping.provider_code}`, mapping]));
  const mappingCreates = [];
  const mappingUpdates = [];
  for (const instrument of instruments) {
    const payload = {
      instrument_id: instrument.id, market_code: US_OPTIONS_MARKET_CODE, provider_code: PROVIDER_CODE,
      provider_symbol: instrument.symbol, quote_mode: "delayed", delay_seconds: DELAY_SECONDS,
      license_status: "pending", active: true,
    };
    const current = mappingsByKey.get(`${instrument.id}|${PROVIDER_CODE}`);
    if (!current) mappingCreates.push(payload);
    else if (["provider_symbol", "quote_mode", "delay_seconds", "license_status", "active"]
      .some((field) => current[field] !== payload[field])) mappingUpdates.push({ id: current.id, ...payload });
  }
  if (mappingCreates.length) await base44.asServiceRole.entities.ProviderInstrumentMap.bulkCreate(mappingCreates);
  if (mappingUpdates.length) await base44.asServiceRole.entities.ProviderInstrumentMap.bulkUpdate(mappingUpdates);

  return { source, instruments, bySymbol: new Map(instruments.map((instrument) => [instrument.symbol, instrument])) };
}

async function fetchChart(symbol, now = new Date(), window = { mode: "bootstrap", range: "5d" }) {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set("interval", "5m");
  if (Number.isFinite(window?.period1) && Number.isFinite(window?.period2)) {
    url.searchParams.set("period1", String(window.period1));
    url.searchParams.set("period2", String(window.period2));
  } else url.searchParams.set("range", String(window?.range || "5d"));
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,splits");
  let lastError = null;
  for (let attempt = 1; attempt <= PROVIDER_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10e3);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "SMART_INVESTOR-US-Options-Market/1.0" },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw Object.assign(new Error(`provider_http_${response.status}`), {
          provider_status: response.status,
          retry_after_seconds: Number(response.headers.get("retry-after") || 0),
        });
      }
      const result = (await response.json())?.chart?.result?.[0];
      if (!result) throw new Error("provider_empty_chart");
      return { ...normalizeChart(symbol, result, now), requestMode: window.mode || "bootstrap" };
    } catch (error) {
      lastError = error;
      const status = Number(error?.provider_status || 0);
      const retryable = !status || status === 408 || status === 429 || status >= 500;
      if (attempt < PROVIDER_MAX_ATTEMPTS && retryable) {
        const retryAfterMs = Math.max(0, Number(error?.retry_after_seconds || 0) * 1000);
        const backoffMs = Math.max(retryAfterMs, 400 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 200);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      } else break;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error("provider_request_failed");
}

function normalizeChart(symbol, result, now) {
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0] || {};
  const sessionDate = nyClock(now).date;
  const barsBySession = new Map();
  let latestObservedAt = 0;
  for (let index = 0; index < timestamps.length; index += 1) {
    const time = new Date(Number(timestamps[index]) * 1000);
    const clock = nyClock(time);
    const minute = clock.hour * 60 + clock.minute;
    if (minute < 570 || minute >= 960 || !isCompletedDelayedBar(time, now, PROVIDER_BAR_INTERVAL_MS)) continue;
    const open = validNumber(quote.open?.[index]);
    const high = validNumber(quote.high?.[index]);
    const low = validNumber(quote.low?.[index]);
    const close = validNumber(quote.close?.[index]);
    if (![open, high, low, close].every(Boolean) || high < Math.max(open, close) || low > Math.min(open, close)) continue;
    const bucketTime = Math.floor(time.getTime() / (15 * 60 * 1000)) * 15 * 60 * 1000;
    const bucketIso = new Date(bucketTime).toISOString();
    const sessionBars = barsBySession.get(clock.date) || new Map();
    const current = sessionBars.get(bucketIso);
    const componentKey = time.toISOString();
    sessionBars.set(bucketIso, current ? {
      ...current,
      high: Math.max(current.high, high),
      low: Math.min(current.low, low),
      close,
      volume: current.volume + validVolume(quote.volume?.[index]),
      component_times: [...current.component_times, componentKey],
    } : { time: bucketIso, open, high, low, close, volume: validVolume(quote.volume?.[index]), component_times: [componentKey] });
    barsBySession.set(clock.date, sessionBars);
    latestObservedAt = Math.max(latestObservedAt, time.getTime() + PROVIDER_BAR_INTERVAL_MS);
  }
  const sessions = [...barsBySession.entries()].map(([date, sessionBars]) => ({
    sessionDate: date,
    bars: [...sessionBars.values()]
      .filter((bar) => new Set(bar.component_times).size === 3)
      .map(({ component_times: _componentTimes, ...bar }) => bar)
      .sort((left, right) => Date.parse(left.time) - Date.parse(right.time)),
  })).filter((session) => session.bars.length).sort((left, right) => left.sessionDate.localeCompare(right.sessionDate));
  const bars = sessions.find((session) => session.sessionDate === sessionDate)?.bars || [];
  if (!bars.length || !latestObservedAt) throw new Error("no_current_session_bars");
  const providerAsOf = new Date(Date.parse(bars.at(-1).time) + 15 * 60 * 1000).toISOString();
  const previousClose = validNumber(result?.meta?.chartPreviousClose ?? result?.meta?.previousClose);
  if (!previousClose) throw new Error("missing_previous_close");
  const marketCap = validVolume(result?.meta?.marketCap);
  return {
    symbol,
    sessionDate,
    providerAsOf,
    lastTradeTime: providerAsOf,
    bars,
    sessions,
    previousClose,
    marketCap,
    quote: quoteFromBars(bars, previousClose, marketCap),
  };
}

async function fetchUniverse(now, symbols, windowsBySymbol) {
  const output = [];
  const failures = [];
  let cursor = 0;
  async function worker() {
    while (cursor < symbols.length) {
      const symbol = symbols[cursor++];
      try { output.push(await fetchChart(symbol, now, windowsBySymbol.get(symbol))); }
      catch (error) {
        failures.push({
          symbol,
          message: error?.message || "provider_failed",
          provider_status: Number(error?.provider_status || 0) || null,
          stage: "provider_fetch_or_normalization",
        });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, symbols.length) }, () => worker()));
  return { output, failures };
}

async function queueAlertDeliveries(base44, rule, quote, bucket, channels) {
  if (rule.market_code !== US_OPTIONS_MARKET_CODE) throw new Error("alert_market_mismatch");
  const candidates = [];
  for (const channel of channels) {
    const dedupe_key = await checksum(`${rule.id}:${channel.id}:${bucket}`);
    candidates.push({
      alert_rule_id: rule.id, destination_id: channel.id, market_code: US_OPTIONS_MARKET_CODE, dedupe_key,
      channel: channel.channel, status: "pending", attempt_count: 0,
      trigger_price: Number(quote.last_price),
      trigger_observed_at: quote.provider_as_of || quote.source_time || quote.quote_time,
      trigger_condition: rule.condition,
      trigger_threshold: Number(rule.threshold),
    });
  }
  if (!candidates.length) return;
  const existing = await base44.asServiceRole.entities.DeliveryEvent.filter({ dedupe_key: { $in: candidates.map((item) => item.dedupe_key) } }, "dedupe_key", candidates.length);
  const existingKeys = new Set(rows(existing).map((item) => item.dedupe_key));
  const missing = candidates.filter((item) => !existingKeys.has(item.dedupe_key));
  if (missing.length) await base44.asServiceRole.entities.DeliveryEvent.bulkCreate(missing);
}

async function evaluateAlerts(base44, acceptedQuotes, isFinal, nextTradingDate) {
  const byInstrument = new Map(acceptedQuotes.map((quote) => [quote.instrument_id, quote]));
  const rules = rows(await base44.asServiceRole.entities.AlertRule.filter({ market_code: US_OPTIONS_MARKET_CODE, enabled: true }, "-updated_date", 5e3))
    .filter((rule) => ["crosses_above", "crosses_below"].includes(rule.condition));
  const channels = rows(await base44.asServiceRole.entities.DeliveryChannel.filter({ market_code: US_OPTIONS_MARKET_CODE, active: true }))
    .filter((item) => item.verified_at && ["telegram", "whatsapp"].includes(item.channel));
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
        await queueAlertDeliveries(base44, rule, quote, bucket, channels);
        update.last_triggered_at = quote.provider_as_of;
        if (rule.frequency === "once") update.enabled = false;
      }
    }
    await base44.asServiceRole.entities.AlertRule.update(rule.id, update);
  }
}

Deno.serve(async (req) => {
  let base44;
  let run = null;
  let runDiagnostics = null;
  try {
    base44 = createClientFromRequest(req);
    const requestBody = await readJsonBody(req);
    const body = { ...requestBody, ...(requestBody.args || {}) };
    if (body.session_id) await requirePermission(base44, body.session_id, "data.ingestion.run");
    else await requireTrustedOwner(base44);
    if (String(body.market_code || US_OPTIONS_MARKET_CODE) !== US_OPTIONS_MARKET_CODE) throw Object.assign(new Error("Wrong market for U.S. options ingestion"), { status: 400, code: "MARKET_MISMATCH" });
    await closeExpiredIngestionRuns(base44, US_OPTIONS_MARKET_CODE);
    const now = new Date();
    const clock = nyClock(now);
    // Catalog readiness is independent from the exchange session. This keeps a newly
    // enabled market discoverable even when its first trusted invocation happens
    // outside trading hours; quote ingestion remains gated below.
    const { source, instruments, bySymbol } = await ensureCatalog(base44, now);
    const batchCount = Math.min(Math.max(Number(body.batch_count) || 2, 1), US_OPTIONS_CATALOG.companies.length);
    const batchIndex = Math.min(Math.max(Number(body.batch_index) || 0, 0), batchCount - 1);
    const batchSymbols = US_OPTIONS_CATALOG.companies
      .map((company) => company.symbol)
      .filter((_, index) => index % batchCount === batchIndex);
    const batchSymbolSet = new Set(batchSymbols);
    const batchInstruments = instruments.filter((instrument) => batchSymbolSet.has(instrument.symbol));
    if (body.action === "catalog_status") return Response.json({
      status: "ready", market_code: US_OPTIONS_MARKET_CODE,
      instruments: instruments.length, batch_size: batchInstruments.length,
      batch_index: batchIndex, batch_count: batchCount,
    });
    if (body.action === "data_status") {
      const instrumentIds = new Set(instruments.map((instrument) => instrument.id));
      const quotes = await readRowsWithRetry(() => base44.asServiceRole.entities.QuoteLatest.filter({ market_code: US_OPTIONS_MARKET_CODE }, "-provider_as_of", 1000));
      const intradayChunks = await readRowsWithRetry(() => base44.asServiceRole.entities.CandleChunk.filter({ market_code: US_OPTIONS_MARKET_CODE, interval: "15m" }, "-end_time", 2000));
      const dailyHistory = await readRowsWithRetry(() => base44.asServiceRole.entities.HistoricalCandleSync.filter({ market_code: US_OPTIONS_MARKET_CODE, interval: "1d" }, "-completed_at", 500));
      const signals = await readRowsWithRetry(() => base44.asServiceRole.entities.IndicatorSnapshot.filter({ market_code: US_OPTIONS_MARKET_CODE, indicator_key: "technical_signals" }, "-source_as_of", 1000));
      const runs = await readRowsWithRetry(() => base44.asServiceRole.entities.IngestionRun.filter({ market_code: US_OPTIONS_MARKET_CODE }, "-started_at", 100));
      const coveredQuotes = new Set(quotes.filter((item) => instrumentIds.has(item.instrument_id) && Number(item.last_price) > 0 && item.quality_status !== "quarantined").map((item) => item.instrument_id));
      const coveredIntraday = new Set(intradayChunks.filter((item) => instrumentIds.has(item.instrument_id) && Array.isArray(item.bars) && item.bars.length > 0 && item.quality_status !== "quarantined").map((item) => item.instrument_id));
      const coveredDaily = new Set(dailyHistory.filter((item) => instrumentIds.has(item.instrument_id) && item.status === "complete" && item.coverage_verified === true && item.provider_partial !== true).map((item) => item.instrument_id));
      const signalCoverage = Object.fromEntries(["1d", "1wk", "1mo"].map((timeframe) => [timeframe, new Set(signals.filter((item) => instrumentIds.has(item.instrument_id) && item.timeframe === timeframe).map((item) => item.instrument_id)).size]));
      const symbolsMissingFrom = (covered) => instruments.filter((instrument) => !covered.has(instrument.id)).map((instrument) => instrument.symbol);
      const signalMissingSymbols = Object.fromEntries(["1d", "1wk", "1mo"].map((timeframe) => {
        const covered = new Set(signals.filter((item) => instrumentIds.has(item.instrument_id) && item.timeframe === timeframe).map((item) => item.instrument_id));
        return [timeframe, symbolsMissingFrom(covered)];
      }));
      const latestPriceRuns = runs.filter((item) => item.slot_kind === "quarter_hour").slice(0, 10).map((item) => ({
        id: item.id,
        started_at: item.started_at,
        finished_at: item.finished_at,
        status: item.status,
        slot_key: item.slot_key,
        success_count: item.success_count,
        failed_count: item.failed_count,
        coverage_percent: item.coverage_percent,
        failure_code: item.failure_code || null,
        notes: item.notes || null,
      }));
      return Response.json({
        status: coveredQuotes.size === instruments.length && coveredIntraday.size === instruments.length && coveredDaily.size === instruments.length ? "healthy" : "degraded",
        market_code: US_OPTIONS_MARKET_CODE,
        expected_instruments: instruments.length,
        quote_instrument_count: coveredQuotes.size,
        intraday_instrument_count: coveredIntraday.size,
        daily_history_instrument_count: coveredDaily.size,
        signal_instrument_count: signalCoverage,
        missing_symbols: {
          quotes: symbolsMissingFrom(coveredQuotes),
          intraday: symbolsMissingFrom(coveredIntraday),
          daily_history: symbolsMissingFrom(coveredDaily),
          signals: signalMissingSymbols,
        },
        latest_price_runs: latestPriceRuns,
        latest_quote_as_of: quotes.map((item) => item.provider_as_of || item.quote_time).filter(Boolean).sort().at(-1) || null,
        latest_intraday_as_of: intradayChunks.map((item) => item.provider_as_of || item.end_time).filter(Boolean).sort().at(-1) || null,
      });
    }
    const session = await sessionDecision(base44, clock);
    const forcedRecovery = body.force === true;
    if (!session.tradingDay && !forcedRecovery) return Response.json({ status: "skipped", reason: session.reason, market_code: US_OPTIONS_MARKET_CODE, session_date: clock.date });
    const minute = clock.hour * 60 + clock.minute;
    const closeMinute = session.closeMinute;
    if (!forcedRecovery && (minute < 600 || minute > closeMinute + 30)) return Response.json({ status: "skipped", reason: "outside_ingestion_window", market_code: US_OPTIONS_MARKET_CODE, session_date: clock.date });

    const slotKey = `${US_OPTIONS_MARKET_CODE}:${clock.date}:15m:${clock.hour.toString().padStart(2, "0")}:${Math.floor(clock.minute / 15) * 15}:batch-${batchIndex + 1}-of-${batchCount}`;
    const existingRuns = await base44.asServiceRole.entities.IngestionRun.filter({ slot_key: slotKey });
    if (existingRuns.some((item) => ["success", "partial"].includes(item.status)) && body.force !== true) return Response.json({ status: "skipped", reason: "already_ingested", slot_key: slotKey });
    run = await base44.asServiceRole.entities.IngestionRun.create({
      run_type: "quarter_hour", market_code: US_OPTIONS_MARKET_CODE, slot_key: slotKey, slot_kind: "quarter_hour",
      scheduled_for: now.toISOString(), lease_expires_at: new Date(now.getTime() + 4 * 60e3).toISOString(),
      started_at: now.toISOString(), total_records: batchInstruments.length, success_count: 0, failed_count: 0,
      status: "running", source_id: source.id, notes: "U.S. optionable company T+15 incremental candle update",
    });
    const existingIntraday = await readRowsWithRetry(() => base44.asServiceRole.entities.CandleChunk.filter({ market_code: US_OPTIONS_MARKET_CODE, interval: "15m" }, "-end_time", 2000));
    const chunkByKey = indexCandleChunks(existingIntraday);
    const latestStored = latestStoredCandleByInstrument(existingIntraday);
    const recentGaps = earliestRecentGapByInstrument(existingIntraday, now);
    const windowsBySymbol = new Map(batchInstruments.map((instrument) => {
      const gap = recentGaps.get(instrument.id);
      const window = incrementalProviderWindow(gap?.time || latestStored.get(instrument.id)?.time, now, { overlapBars: 2, bootstrapRange: "5d" });
      return [instrument.symbol, gap && window.mode === "incremental" ? { ...window, mode: "gap_recovery" } : window];
    }));
    const providerWindowSummary = summarizeProviderWindows(windowsBySymbol);
    const { output, failures } = await fetchUniverse(now, batchSymbols, windowsBySymbol);
    const received = new Date().toISOString();
    const snapshotVersion = `${US_OPTIONS_MARKET_CODE}:${clock.date}:${Date.now()}`;
    const isFinal = minute >= closeMinute + 15;
    const nextTradingDate = isFinal ? await nextTradingSessionDate(base44, clock.date) : "";
    const acceptedQuotes = [];
    const chunks = [];
    for (const item of output) {
      const instrument = bySymbol.get(item.symbol);
      if (!instrument) continue;
      const mergedSessions = item.sessions.map((session) => {
        const chunkKey = `${US_OPTIONS_MARKET_CODE}:${item.symbol}:15m:${session.sessionDate}`;
        const existing = chunkByKey.get(chunkKey);
        return { ...session, chunkKey, existing, bars: mergeCandleBars(existing?.bars, session.bars) };
      }).filter((session) => session.bars.length);
      const currentBars = mergedSessions.find((session) => session.sessionDate === item.sessionDate)?.bars || [];
      if (!currentBars.length) continue;
      const quote = quoteFromBars(currentBars, item.previousClose, item.marketCap);
      const delay = Math.max(0, Math.floor((Date.now() - Date.parse(item.providerAsOf)) / 1000));
      const freshnessStatus = delay <= DELAY_SECONDS + FRESHNESS_GRACE_SECONDS ? "fresh" : "stale";
      acceptedQuotes.push({
        instrument_id: instrument.id, market_code: US_OPTIONS_MARKET_CODE, session_date: item.sessionDate,
        symbol: item.symbol, ...quote, source_id: source.id, source_time: item.providerAsOf,
        provider_as_of: item.providerAsOf, last_trade_time: item.lastTradeTime, received_time: received,
        delay_seconds: delay, license_status: "pending", quote_time: item.providerAsOf,
        quality_status: freshnessStatus === "fresh" ? "verified" : "stale", snapshot_version: snapshotVersion,
        market_phase: isFinal ? "closed" : "continuous", freshness_status: freshnessStatus, is_final: isFinal, run_id: run.id,
      });
      for (const session of mergedSessions) {
        const sessionFinal = (session.existing?.is_final === true || session.sessionDate !== item.sessionDate || isFinal)
          && session.bars.length === expectedSessionBars(session.sessionDate);
        const completenessStatus = sessionFinal ? "complete" : session.bars.length >= 4 ? "partial" : "incomplete";
        chunks.push({
          instrument_id: instrument.id, market_code: US_OPTIONS_MARKET_CODE, symbol: item.symbol, interval: "15m",
          chunk_key: session.chunkKey, session_date: session.sessionDate,
          start_time: session.bars[0].time, end_time: session.bars.at(-1).time, bars: session.bars,
          bar_count: session.bars.length, checksum: await checksum(session.bars), source_id: source.id, run_id: run.id,
          snapshot_version: snapshotVersion, provider_as_of: sessionFinal ? new Date(Date.parse(session.bars.at(-1).time) + 15 * 60 * 1000).toISOString() : item.providerAsOf, received_time: received,
          quality_status: sessionFinal ? "verified" : freshnessStatus === "fresh" ? "verified" : "stale", canonical_version: "us-options-intraday-v3", is_final: sessionFinal,
          bucket_count: session.bars.length, completeness_status: completenessStatus, is_historical_archive: session.existing?.is_historical_archive === true || session.sessionDate !== item.sessionDate, adjustment_mode: "none",
        });
      }
    }
    if (rawQuoteObservationPersistenceEnabled()) {
      const observations = acceptedQuotes.map((quote) => ({
        run_id: quote.run_id, snapshot_version: quote.snapshot_version, market_code: quote.market_code,
        session_date: quote.session_date, instrument_id: quote.instrument_id, symbol: quote.symbol,
        last_price: quote.last_price, previous_close: quote.previous_close, change_value: quote.change_value,
        change_percent: quote.change_percent, open: quote.open, high: quote.high, low: quote.low,
        volume: quote.volume, market_cap: quote.market_cap, source_id: quote.source_id,
        provider_as_of: quote.provider_as_of, last_trade_time: quote.last_trade_time,
        received_time: quote.received_time, delay_seconds: quote.delay_seconds, market_phase: quote.market_phase,
        freshness_status: quote.freshness_status, quality_status: quote.quality_status, is_final: quote.is_final,
      }));
      if (observations.length) await base44.asServiceRole.entities.QuoteObservation.bulkCreate(observations);
    }
    const coverage = acceptedQuotes.length / batchInstruments.length * 100;
    const status = coverage >= 99 ? "success" : coverage >= 95 ? "partial" : "failed";
    runDiagnostics = {
      accepted_symbols: acceptedQuotes.map((quote) => quote.symbol),
      failed_symbols: failures.map((failure) => failure.symbol),
      failures,
      provider_windows: providerWindowSummary,
      batch_index: batchIndex,
      batch_count: batchCount,
    };
    const quoteResult = status === "failed" ? { created: 0, updated: 0, preserved_last_good: true }
      : await upsertMany(base44, "QuoteLatest", acceptedQuotes, ["instrument_id"], { market_code: US_OPTIONS_MARKET_CODE });
    const candleResult = status === "failed" ? { created: 0, updated: 0, preserved_last_good: true }
      : await upsertMany(base44, "CandleChunk", chunks, ["instrument_id", "interval", "chunk_key"], { market_code: US_OPTIONS_MARKET_CODE, interval: "15m" });
    const acceptedIds = new Set(acceptedQuotes.map((quote) => quote.instrument_id));
    const stale = rows(await base44.asServiceRole.entities.QuoteLatest.filter({ market_code: US_OPTIONS_MARKET_CODE }))
      .filter((quote) => batchInstruments.some((instrument) => instrument.id === quote.instrument_id) && (status === "failed" || !acceptedIds.has(quote.instrument_id)))
      .map((quote) => ({ id: quote.id, freshness_status: "stale", quality_status: "stale" }));
    if (stale.length) await base44.asServiceRole.entities.QuoteLatest.bulkUpdate([...new Map(stale.map((row) => [row.id, row])).values()]);
    if (status !== "failed") await evaluateAlerts(base44, acceptedQuotes, isFinal, nextTradingDate);
    await base44.asServiceRole.entities.IngestionRun.update(run.id, {
      status, finished_at: new Date().toISOString(), success_count: acceptedQuotes.length,
      failed_count: batchInstruments.length - acceptedQuotes.length, coverage_percent: coverage,
      provider_as_of: acceptedQuotes.map((quote) => quote.provider_as_of).sort().at(-1) || null,
      snapshot_version: snapshotVersion, notes: JSON.stringify(runDiagnostics),
    });
    if (status === "failed") throw Object.assign(new Error(`U.S. options coverage failed: ${coverage.toFixed(2)}%`), { status: 503, code: "US_OPTIONS_COVERAGE_FAILED" });
    return Response.json({
      status, market_code: US_OPTIONS_MARKET_CODE, session_date: clock.date, run_id: run.id,
      coverage_percent: coverage, quotes: quoteResult, candles: candleResult,
      accepted: acceptedQuotes.length, rejected: failures.length, snapshot_version: snapshotVersion, is_final: isFinal,
      batch_index: batchIndex, batch_count: batchCount, provider_windows: providerWindowSummary,
      failed_symbols: failures.map((failure) => failure.symbol), failures,
    });
  } catch (error) {
    if (base44 && run?.id) {
      try {
        await base44.asServiceRole.entities.IngestionRun.update(run.id, {
          status: "failed",
          finished_at: new Date().toISOString(),
          failure_code: error?.code || "US_OPTIONS_INGESTION_FAILED",
          notes: JSON.stringify({
            ...(runDiagnostics || {}),
            terminal_error: error?.message || "failed",
          }),
        });
      } catch {}
    }
    return replyError(error);
  }
});
