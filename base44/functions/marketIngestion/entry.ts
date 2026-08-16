// base44/functions/marketIngestion/entry.ts
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

function rawQuoteObservationPersistenceEnabled() {
  return String(Deno.env.get("SMART_INVESTOR_PERSIST_RAW_QUOTE_OBSERVATIONS") || "").trim().toLowerCase() === "true";
}

// Base44 scheduled functions cannot import files outside their own function
// directory. Keep this narrow security boundary self-contained and verify it
// against the canonical helpers in base44/shared/security.ts in acceptance tests.
async function readJsonBody(req, maxBytes = 256 * 1024) {
  if (String(req?.method || "").toUpperCase() !== "POST") {
    throw Object.assign(new Error("Method not allowed"), { status: 405, code: "METHOD_NOT_ALLOWED" });
  }
  const declaredLength = Number(req.headers?.get?.("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw Object.assign(new Error("Request body is too large"), { status: 413, code: "REQUEST_TOO_LARGE" });
  }
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw Object.assign(new Error("Request body is too large"), { status: 413, code: "REQUEST_TOO_LARGE" });
  }
  if (!raw.trim()) return {};
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("Invalid JSON request"), { status: 400, code: "INVALID_JSON" });
  }
  if (!body || Array.isArray(body) || typeof body !== "object") {
    throw Object.assign(new Error("JSON object required"), { status: 400, code: "INVALID_JSON_OBJECT" });
  }
  return body;
}

async function requireTrustedOwner(base44) {
  const user = await base44.auth.me();
  if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  if (user.role !== "admin") throw Object.assign(new Error("Forbidden"), { status: 403, code: "OWNER_REQUIRED" });
  const profiles = await base44.asServiceRole.entities.CustomerProfile.filter({ auth_user_id: user.id });
  const profile = profiles[0] || null;
  const trusted = profile?.acquisition_source === "platform_owner_bootstrap"
    && Array.isArray(profile?.tags)
    && profile.tags.includes("owner");
  if (!trusted) throw Object.assign(new Error("Forbidden"), { status: 403, code: "OWNER_REQUIRED" });
  return { user, profile, role: "owner" };
}

// base44/shared/market-data.ts
var SAUDI_MAIN_MARKET = "SA_MAIN";
var SAUDI_DELAY_SECONDS = 15 * 60;
var EXPECTED_INSTRUMENT_COUNT = 270;
var COVERAGE_HEALTHY_PERCENT = 99;
var COVERAGE_FAILED_PERCENT = 95;
var PROVIDER_FRESHNESS_GRACE_SECONDS = 60 * 60 + 10 * 60;
var EXPERIMENTAL_SOURCE_MAX_AGE_SECONDS = 60 * 60;
var PUBLIC_CANDLE_OVERLAP_MILLISECONDS = 15 * 60 * 1e3;
var PUBLIC_CANDLE_MAX_INCREMENTAL_LOOKBACK_MILLISECONDS = 8 * 24 * 60 * 60 * 1e3;
var RIYADH_TIMEZONE = "Asia/Riyadh";
var RIYADH_CLOCK_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: RIYADH_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});
var TRADING_WEEKDAYS = /* @__PURE__ */ new Set(["Sun", "Mon", "Tue", "Wed", "Thu"]);
function groupRowsByKey(rows, keyFor) {
  const grouped = /* @__PURE__ */ new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = String(keyFor(row));
    const current = grouped.get(key);
    if (current) {
      current.row = { ...current.row, ...row };
      current.count += 1;
    } else {
      grouped.set(key, { key, row: { ...row }, count: 1 });
    }
  }
  return [...grouped.values()];
}
function finiteNumber(value) {
  if (value === null || value === void 0 || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function positiveNumber(value) {
  const parsed = finiteNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}
function nonNegativeNumber(value, fallback = 0) {
  const parsed = finiteNumber(value);
  return parsed !== null && parsed >= 0 ? parsed : fallback;
}
function isoTime(value, fieldName) {
  const milliseconds = new Date(value).getTime();
  if (!Number.isFinite(milliseconds)) throw new Error(`Invalid ${fieldName}`);
  return new Date(milliseconds).toISOString();
}
function riyadhClock(now = /* @__PURE__ */ new Date()) {
  const parts = Object.fromEntries(RIYADH_CLOCK_FORMATTER.formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}
function marketPhase(clock, slotKind = "quarter_hour") {
  if (!TRADING_WEEKDAYS.has(clock.weekday)) return "closed";
  const minuteOfDay = clock.hour * 60 + clock.minute;
  if (slotKind === "close_price" || minuteOfDay >= 15 * 60 + 10 && minuteOfDay < 15 * 60 + 20) return "trade_at_last";
  if (slotKind === "session_final" || minuteOfDay >= 15 * 60 + 20) return "closed";
  if (minuteOfDay >= 15 * 60) return "closing_auction";
  if (minuteOfDay >= 10 * 60) return "continuous";
  if (minuteOfDay >= 9 * 60 + 30) return "opening_auction";
  return "closed";
}
function slotDecision({ now = /* @__PURE__ */ new Date(), slotKind = "quarter_hour", source: source2 = "" } = {}) {
  const clock = riyadhClock(now);
  const scheduled = String(source2).startsWith("scheduled_");
  if (!scheduled) return { run: true, clock, phase: marketPhase(clock, slotKind) };
  if (!TRADING_WEEKDAYS.has(clock.weekday)) return { run: false, reason: "non_trading_weekday", clock, phase: "closed" };
  const minuteOfDay = clock.hour * 60 + clock.minute;
  const allowed = slotKind === "close_price" ? minuteOfDay >= 15 * 60 + 24 : slotKind === "session_final" ? minuteOfDay >= 15 * 60 + 34 : minuteOfDay >= 10 * 60 + 14 && minuteOfDay <= 15 * 60 + 20;
  return allowed ? { run: true, clock, phase: marketPhase(clock, slotKind) } : { run: false, reason: "outside_scheduled_slot", clock, phase: marketPhase(clock, slotKind) };
}
function expectedProviderAsOf(now = /* @__PURE__ */ new Date()) {
  const delayed = new Date(now.getTime() - SAUDI_DELAY_SECONDS * 1e3);
  delayed.setUTCMinutes(Math.floor(delayed.getUTCMinutes() / 15) * 15, 0, 0);
  return delayed.toISOString();
}
function coverageStatus(successCount, totalCount) {
  const coveragePercent = totalCount > 0 ? successCount / totalCount * 100 : 0;
  const status = coveragePercent >= COVERAGE_HEALTHY_PERCENT ? "healthy" : coveragePercent >= COVERAGE_FAILED_PERCENT ? "degraded" : "failed";
  return { coveragePercent, status };
}
function freshnessStatus(providerAsOf, receivedAt, delaySeconds = SAUDI_DELAY_SECONDS) {
  const sourceMilliseconds = new Date(providerAsOf).getTime();
  const receivedMilliseconds = new Date(receivedAt).getTime();
  if (!Number.isFinite(sourceMilliseconds) || !Number.isFinite(receivedMilliseconds)) return "stale";
  const ageSeconds = Math.max(0, (receivedMilliseconds - sourceMilliseconds) / 1e3);
  return ageSeconds <= delaySeconds + PROVIDER_FRESHNESS_GRACE_SECONDS ? "fresh" : "stale";
}
async function stableSnapshotVersion(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes)).map((item) => item.toString(16).padStart(2, "0")).join("").slice(0, 24);
}
function quoteRows(payload) {
  const root = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  if (!root || !Array.isArray(root.quotes)) throw new Error("Provider payload must include quotes[]");
  return { root, quotes: root.quotes };
}
function normalizeLicensedSnapshot({
  payload,
  mappings,
  instruments,
  sourceId,
  runId,
  snapshotVersion,
  receivedAt = (/* @__PURE__ */ new Date()).toISOString(),
  slotKind = "quarter_hour",
  validationMode = "licensed_t15"
}) {
  const { root, quotes } = quoteRows(payload);
  const providerAsOf = isoTime(root.provider_as_of || root.as_of, "provider_as_of");
  const receivedIso = isoTime(receivedAt, "received_time");
  const providerAgeSeconds = (new Date(receivedIso).getTime() - new Date(providerAsOf).getTime()) / 1e3;
  if (validationMode === "licensed_t15" && providerAgeSeconds < SAUDI_DELAY_SECONDS - 2 * 60) {
    throw new Error("Provider snapshot is not delayed by the contracted 15 minutes");
  }
  if (validationMode === "licensed_t15" && providerAgeSeconds > SAUDI_DELAY_SECONDS + PROVIDER_FRESHNESS_GRACE_SECONDS) {
    throw new Error("Provider snapshot missed the expected T+15 freshness window");
  }
  if (providerAgeSeconds < -60) throw new Error("Provider snapshot time is in the future");
  const reportedDelaySeconds = validationMode === "licensed_t15" ? SAUDI_DELAY_SECONDS : Math.max(0, Math.round(providerAgeSeconds));
  const instrumentById = new Map(instruments.map((instrument) => [instrument.id, instrument]));
  const rawByProviderSymbol = /* @__PURE__ */ new Map();
  for (const row of quotes) {
    const providerSymbol = String(row.provider_symbol || row.symbol || "").trim();
    if (providerSymbol && !rawByProviderSymbol.has(providerSymbol)) rawByProviderSymbol.set(providerSymbol, row);
  }
  const clock = riyadhClock(new Date(providerAsOf));
  const phase = marketPhase(clock, slotKind);
  const final = slotKind === "close_price" || slotKind === "session_final";
  const accepted = [];
  const rejected = [];
  for (const mapping of mappings) {
    const instrument = instrumentById.get(mapping.instrument_id);
    const raw = rawByProviderSymbol.get(String(mapping.provider_symbol));
    if (!instrument || !raw) {
      rejected.push({ instrument_id: mapping.instrument_id, symbol: instrument?.symbol || "", issue_type: "missing_provider_quote", message: "Provider snapshot did not include the mapped instrument" });
      continue;
    }
    const lastPrice = positiveNumber(raw.last_price ?? raw.last);
    const previousClose = positiveNumber(raw.previous_close);
    const open = positiveNumber(raw.open);
    const high = positiveNumber(raw.high);
    const low = positiveNumber(raw.low);
    if ([lastPrice, previousClose, open, high, low].some((value) => value === null) || high < Math.max(open, lastPrice) || low > Math.min(open, lastPrice)) {
      rejected.push({ instrument_id: instrument.id, symbol: instrument.symbol, issue_type: "invalid_ohlc", message: "Provider quote failed price and OHLC validation" });
      continue;
    }
    const changeValue = lastPrice - previousClose;
    const changePercent = previousClose ? changeValue / previousClose * 100 : 0;
    const providerChangePercent = finiteNumber(raw.change_percent);
    if (providerChangePercent !== null && Math.abs(providerChangePercent - changePercent) > 0.05) {
      rejected.push({ instrument_id: instrument.id, symbol: instrument.symbol, issue_type: "change_mismatch", message: "Provider change percent differs from the canonical calculation" });
      continue;
    }
    let lastTradeTime = null;
    if (raw.last_trade_time) {
      try {
        lastTradeTime = isoTime(raw.last_trade_time, "last_trade_time");
      } catch {
        rejected.push({ instrument_id: instrument.id, symbol: instrument.symbol, issue_type: "invalid_trade_time", message: "Provider returned an invalid last trade time" });
        continue;
      }
      if (new Date(lastTradeTime).getTime() > new Date(providerAsOf).getTime() + 60 * 1e3) {
        rejected.push({ instrument_id: instrument.id, symbol: instrument.symbol, issue_type: "future_trade_time", message: "Last trade time is newer than the provider snapshot" });
        continue;
      }
    }
    const freshness = validationMode === "licensed_t15" ? freshnessStatus(providerAsOf, receivedIso) : providerAgeSeconds <= EXPERIMENTAL_SOURCE_MAX_AGE_SECONDS ? "fresh" : "stale";
    accepted.push({
      market_code: SAUDI_MAIN_MARKET,
      session_date: clock.date,
      instrument_id: instrument.id,
      symbol: instrument.symbol,
      last_price: lastPrice,
      previous_close: previousClose,
      change_value: changeValue,
      change_percent: changePercent,
      open,
      high,
      low,
      volume: nonNegativeNumber(raw.volume),
      trade_count: nonNegativeNumber(raw.trade_count),
      traded_value: nonNegativeNumber(raw.traded_value),
      market_cap: nonNegativeNumber(raw.market_cap),
      source_id: sourceId,
      source_time: providerAsOf,
      provider_as_of: providerAsOf,
      ...lastTradeTime ? { last_trade_time: lastTradeTime } : {},
      received_time: receivedIso,
      delay_seconds: reportedDelaySeconds,
      license_status: validationMode === "licensed_t15" ? "approved" : "pending",
      quote_time: providerAsOf,
      market_phase: phase,
      freshness_status: freshness,
      quality_status: freshness === "fresh" ? "verified" : "stale",
      is_final: final,
      run_id: runId,
      snapshot_version: snapshotVersion
    });
  }
  return { providerAsOf, phase, isFinal: final, accepted, rejected };
}
function chartBars(result) {
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0] || {};
  return timestamps.map((timestamp, index) => {
    const time = new Date(Number(timestamp) * 1e3);
    const open = positiveNumber(quote.open?.[index]);
    const high = positiveNumber(quote.high?.[index]);
    const low = positiveNumber(quote.low?.[index]);
    const close = positiveNumber(quote.close?.[index]);
    const volume = nonNegativeNumber(quote.volume?.[index]);
    if (!Number.isFinite(time.getTime()) || [open, high, low, close].some((value) => value === null) || high < Math.max(open, close) || low > Math.min(open, close)) return null;
    return {
      time: time.toISOString(),
      session_date: riyadhClock(time).date,
      open,
      high,
      low,
      close,
      volume
    };
  }).filter(Boolean).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}
var QUARTER_HOUR_MILLISECONDS = 15 * 60 * 1e3;
function canonicalizeQuarterHourBars(bars) {
  const byBucket = /* @__PURE__ */ new Map();
  for (const rawBar of Array.isArray(bars) ? bars : []) {
    const rawTime = new Date(rawBar?.time).getTime();
    const open = positiveNumber(rawBar?.open);
    const high = positiveNumber(rawBar?.high);
    const low = positiveNumber(rawBar?.low);
    const close = positiveNumber(rawBar?.close);
    const volume = nonNegativeNumber(rawBar?.volume);
    if (!Number.isFinite(rawTime)
      || [open, high, low, close].some((value) => value === null)
      || high < Math.max(open, close)
      || low > Math.min(open, close)) continue;
    const bucketTime = Math.floor(rawTime / QUARTER_HOUR_MILLISECONDS) * QUARTER_HOUR_MILLISECONDS;
    const exactGridTime = rawTime === bucketTime;
    const current = byBucket.get(bucketTime);
    if (current
      && (current.exactGridTime && !exactGridTime
        || current.exactGridTime === exactGridTime && current.rawTime > rawTime)) continue;
    const bucketDate = new Date(bucketTime);
    byBucket.set(bucketTime, {
      bar: {
        time: bucketDate.toISOString(),
        session_date: rawBar?.session_date || riyadhClock(bucketDate).date,
        open,
        high,
        low,
        close,
        volume
      },
      exactGridTime,
      rawTime
    });
  }
  return [...byBucket.values()]
    .sort((a, b) => new Date(a.bar.time).getTime() - new Date(b.bar.time).getTime())
    .map(({ bar }) => bar);
}
function uniqueSortedBars(bars) {
  const byTime = /* @__PURE__ */ new Map();
  for (const bar of Array.isArray(bars) ? bars : []) {
    const time = new Date(bar?.time).getTime();
    if (!Number.isFinite(time)) continue;
    const iso = new Date(time).toISOString();
    byTime.set(iso, { ...bar, time: iso, session_date: bar.session_date || riyadhClock(new Date(time)).date });
  }
  return [...byTime.values()].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}
function contextForSymbol(contextsBySymbol, symbol) {
  if (contextsBySymbol instanceof Map) return contextsBySymbol.get(symbol) || {};
  return contextsBySymbol?.[symbol] || {};
}
function publicChartRequestWindow({
  watermark,
  gapTime,
  now = /* @__PURE__ */ new Date(),
  overlapMilliseconds = PUBLIC_CANDLE_OVERLAP_MILLISECONDS,
  maxIncrementalLookbackMilliseconds = PUBLIC_CANDLE_MAX_INCREMENTAL_LOOKBACK_MILLISECONDS
} = {}) {
  const nowTime = new Date(now).getTime();
  if (!Number.isFinite(nowTime)) throw new Error("Public chart request time is invalid");
  const watermarkTime = new Date(watermark || "").getTime();
  const gapTimestamp = new Date(gapTime || "").getTime();
  if (Number.isFinite(gapTimestamp) && gapTimestamp <= nowTime) {
    return {
      mode: "gap_recovery",
      period1: Math.floor((gapTimestamp - overlapMilliseconds) / 1e3),
      period2: Math.ceil(nowTime / 1e3) + 60
    };
  }
  if (!Number.isFinite(watermarkTime)) return { mode: "bootstrap", range: "5d" };
  if (nowTime - watermarkTime > maxIncrementalLookbackMilliseconds) {
    return { mode: "backfill", range: "5d" };
  }
  return {
    mode: "incremental",
    period1: Math.floor((watermarkTime - overlapMilliseconds) / 1e3),
    period2: Math.ceil(nowTime / 1e3) + 60
  };
}
function buildPublicCandleContexts({
  instruments,
  quotes,
  chunks,
  sessionDate
}) {
  const quoteByInstrument = new Map((Array.isArray(quotes) ? quotes : []).map((quote) => [quote.instrument_id, quote]));
  const chunkByInstrument = /* @__PURE__ */ new Map();
  for (const chunk of Array.isArray(chunks) ? chunks : []) {
    if (chunk.interval !== "15m") continue;
    const matchesSession = chunk.session_date === sessionDate || String(chunk.chunk_key || "").endsWith(`-${sessionDate}`);
    if (!matchesSession) continue;
    const current = chunkByInstrument.get(chunk.instrument_id);
    if (!current || new Date(chunk.end_time || 0).getTime() > new Date(current.end_time || 0).getTime()) {
      chunkByInstrument.set(chunk.instrument_id, chunk);
    }
  }
  const contexts = /* @__PURE__ */ new Map();
  for (const instrument of Array.isArray(instruments) ? instruments : []) {
    const quote = quoteByInstrument.get(instrument.id) || {};
    const chunk = chunkByInstrument.get(instrument.id) || {};
    const bars = canonicalizeQuarterHourBars((chunk.bars || []).filter((bar) => riyadhClock(new Date(bar.time)).date === sessionDate));
    const latestBarTime = bars.at(-1)?.time || "";
    const gapTime = earliestInteriorCandleGap(bars);
    const quoteSessionDate = String(quote.session_date || "");
    const previousClose = quoteSessionDate === sessionDate ? positiveNumber(quote.previous_close) : positiveNumber(quote.last_price) || positiveNumber(quote.previous_close);
    contexts.set(instrument.symbol, {
      session_date: sessionDate,
      bars,
      watermark: latestBarTime || quote.last_trade_time || quote.provider_as_of || "",
      gap_time: gapTime,
      previous_close: previousClose
    });
  }
  return contexts;
}
function normalizePublicDelayedCharts(chartResults, contextsBySymbol = /* @__PURE__ */ new Map()) {
  const quotes = [];
  const candles = [];
  const rejected = [];
  let providerAsOf = "";
  for (const item of chartResults) {
    const symbol = String(item?.symbol || "").trim();
    const incomingBars = chartBars(item?.result);
    const context = contextForSymbol(contextsBySymbol, symbol);
    const bars = canonicalizeQuarterHourBars([...(context.bars || []), ...incomingBars]);
    const sessions = /* @__PURE__ */ new Map();
    for (const bar of bars) {
      if (!sessions.has(bar.session_date)) sessions.set(bar.session_date, []);
      sessions.get(bar.session_date).push(bar);
    }
    const dates = [...sessions.keys()].sort();
    if (!symbol || !incomingBars.length || !dates.length) {
      rejected.push({ symbol, issue_type: "public_chart_incomplete", message: "Public delayed chart did not include a valid incremental candle" });
      continue;
    }
    const sessionDate = dates[dates.length - 1];
    const currentBars = sessions.get(sessionDate);
    const previousBars = dates.length > 1 ? sessions.get(dates[dates.length - 2]) : [];
    const first = currentBars[0];
    const last = currentBars[currentBars.length - 1];
    const previousClose = positiveNumber(previousBars.at(-1)?.close) || positiveNumber(item?.result?.meta?.chartPreviousClose) || positiveNumber(item?.result?.meta?.previousClose) || positiveNumber(context.previous_close);
    if (!positiveNumber(previousClose)) {
      rejected.push({ symbol, issue_type: "previous_close_missing", message: "Public delayed chart and stored cursor did not include a valid previous-session close" });
      continue;
    }
    const high = Math.max(...currentBars.map((bar) => bar.high));
    const low = Math.min(...currentBars.map((bar) => bar.low));
    const volume = currentBars.reduce((sum, bar) => sum + nonNegativeNumber(bar.volume), 0);
    const changePercent = (last.close - previousClose) / previousClose * 100;
    const providerSymbol = publicProviderSymbol(symbol);
    const metaTradeTime = new Date(Number(item?.result?.meta?.regularMarketTime) * 1e3);
    const lastTradeTime = Number.isFinite(metaTradeTime.getTime()) && riyadhClock(metaTradeTime).date === sessionDate && metaTradeTime.getTime() >= new Date(last.time).getTime() ? metaTradeTime.toISOString() : last.time;
    quotes.push({
      provider_symbol: providerSymbol,
      last_price: last.close,
      previous_close: previousClose,
      open: first.open,
      high,
      low,
      volume,
      change_percent: changePercent,
      last_trade_time: lastTradeTime
    });
    const incomingCurrentBars = canonicalizeQuarterHourBars(incomingBars.filter((bar) => bar.session_date === sessionDate));
    candles.push({
      provider_symbol: providerSymbol,
      bars: incomingCurrentBars.map(({ time, open, high: barHigh, low: barLow, close, volume: barVolume }) => ({
        time,
        open,
        high: barHigh,
        low: barLow,
        close,
        volume: barVolume
      }))
    });
    if (!providerAsOf || new Date(lastTradeTime).getTime() > new Date(providerAsOf).getTime()) providerAsOf = lastTradeTime;
  }
  if (!providerAsOf) throw new Error("Public delayed charts did not contain any usable quotes");
  return { provider_as_of: providerAsOf, quotes, candles, rejected };
}
async function fetchPublicDelayedCharts({
  symbols,
  contextsBySymbol = /* @__PURE__ */ new Map(),
  now = /* @__PURE__ */ new Date(),
  fetchImpl = fetch,
  concurrency = 15,
  attempts = 2,
  timeoutMilliseconds = 15e3
}) {
  const queue = [...new Set(symbols
    .map((value) => String(value || "").trim().toUpperCase())
    .filter(isSupportedPublicSaudiSymbol))];
  const results = [];
  const failures = [];
  let cursor = 0;
  let requestCount = 0;
  const requestModes = { incremental: 0, bootstrap: 0, backfill: 0, gap_recovery: 0 };
  async function fetchOne(symbol) {
    let lastError = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      requestCount += 1;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);
      try {
        const providerSymbol = publicProviderSymbol(symbol);
        const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(providerSymbol)}`);
        url.searchParams.set("interval", "15m");
        const context = contextForSymbol(contextsBySymbol, symbol);
        const window = publicChartRequestWindow({ watermark: context.watermark, gapTime: context.gap_time, now });
        if (window.range) url.searchParams.set("range", window.range);
        else {
          url.searchParams.set("period1", String(window.period1));
          url.searchParams.set("period2", String(window.period2));
        }
        url.searchParams.set("includePrePost", "false");
        url.searchParams.set("events", "div,splits");
        const response = await fetchImpl(url, {
          headers: { Accept: "application/json", "User-Agent": "SMART_INVESTOR-Experimental-Market-Data/1.0" },
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`Public delayed source returned ${response.status}`);
        const payload = await response.json();
        const result = payload?.chart?.result?.[0];
        if (!result) throw new Error("Public delayed source returned no chart");
        results.push({ symbol, result });
        requestModes[window.mode] += 1;
        return;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      } finally {
        clearTimeout(timeout);
      }
    }
    failures.push({ symbol, issue_type: "public_chart_request_failed", message: lastError?.message || "Public delayed chart request failed" });
  }
  async function worker() {
    while (cursor < queue.length) {
      const symbol = queue[cursor];
      cursor += 1;
      await fetchOne(symbol);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, () => worker()));
  const normalized = normalizePublicDelayedCharts(results, contextsBySymbol);
  return {
    payload: {
      ...normalized,
      rejected: [...failures, ...normalized.rejected]
    },
    requestCount,
    requestModes
  };
}
function normalizeProviderCandles(payload, mappings, instruments, sourceId, sessionDate, marketCode = SAUDI_MAIN_MARKET) {
  const root = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const rows = Array.isArray(root?.candles) ? root.candles : [];
  const mappingBySymbol = new Map(mappings.map((mapping) => [String(mapping.provider_symbol), mapping]));
  const instrumentById = new Map(instruments.map((instrument) => [instrument.id, instrument]));
  const chunks = [];
  for (const row of rows) {
    const mapping = mappingBySymbol.get(String(row.provider_symbol || row.symbol || ""));
    const instrument = mapping ? instrumentById.get(mapping.instrument_id) : null;
    if (!instrument || !Array.isArray(row.bars)) continue;
    const bars = row.bars.map((bar) => ({
      time: isoTime(bar.time, "candle time"),
      open: positiveNumber(bar.open),
      high: positiveNumber(bar.high),
      low: positiveNumber(bar.low),
      close: positiveNumber(bar.close),
      volume: nonNegativeNumber(bar.volume)
    })).filter((bar) => [bar.open, bar.high, bar.low, bar.close].every((value) => value !== null) && bar.high >= Math.max(bar.open, bar.close) && bar.low <= Math.min(bar.open, bar.close));
    if (!bars.length) continue;
    const bySession = /* @__PURE__ */ new Map();
    for (const bar of bars) {
      const barSessionDate = riyadhClock(new Date(bar.time)).date || sessionDate;
      if (!bySession.has(barSessionDate)) bySession.set(barSessionDate, []);
      bySession.get(barSessionDate).push(bar);
    }
    for (const [barSessionDate, sessionBars] of bySession) {
      const ordered = canonicalizeQuarterHourBars(sessionBars);
      const storedBars = ordered.map(({ session_date: _sessionDate, ...bar }) => bar);
      chunks.push({
        instrument_id: instrument.id,
        market_code: marketCode,
        symbol: instrument.symbol,
        interval: "15m",
        session_date: barSessionDate,
        chunk_key: `${instrument.symbol}-15m-${barSessionDate}`,
        start_time: ordered[0].time,
        end_time: ordered[ordered.length - 1].time,
        bars: storedBars,
        bar_count: storedBars.length,
        source_id: sourceId,
        quality_status: "verified"
      });
    }
  }
  return chunks;
}
function mergeIncrementalCandleChunks(incomingChunks, existingChunks) {
  const existingByKey = new Map((Array.isArray(existingChunks) ? existingChunks : []).map((chunk) => [chunk.chunk_key, chunk]));
  return (Array.isArray(incomingChunks) ? incomingChunks : []).map((incoming) => {
    const existing = existingByKey.get(incoming.chunk_key);
    const existingBars = (existing?.bars || []).filter((bar) => riyadhClock(new Date(bar.time)).date === incoming.session_date);
    const mergedBars = canonicalizeQuarterHourBars([...existingBars, ...(incoming.bars || [])]);
    const bars = mergedBars.map(({ session_date: _sessionDate, ...bar }) => bar);
    return {
      ...incoming,
      start_time: bars[0].time,
      end_time: bars[bars.length - 1].time,
      bars,
      bar_count: bars.length
    };
  }).filter((chunk) => chunk.bars.length);
}
async function fetchLicensedSnapshot({
  url,
  token,
  requestBody,
  fetchImpl = fetch,
  attempts = 3,
  timeoutMilliseconds = 2e4
}) {
  const parsedUrl = new URL(String(url || ""));
  if (parsedUrl.protocol !== "https:") throw new Error("Licensed provider URL must use HTTPS");
  if (!String(token || "").trim()) throw new Error("Licensed provider token is not configured");
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);
    try {
      const response = await fetchImpl(parsedUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "SMART_INVESTOR-Licensed-Market-Data/1.0"
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Licensed provider returned ${response.status}`);
      return { payload: await response.json(), attemptCount: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt === 1 ? 1500 : 4e3));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error("Licensed provider request failed");
}

// base44/functions/marketIngestion/entry.ts
var official_main_market_catalog_2026_07_21_default = {
  source: "Saudi Exchange",
  sourceUrl: "https://www.saudiexchange.sa/Resources/Reports-v2/DetailedDaily_en.html",
  classificationUrl: "https://www.saudiexchange.sa/wps/portal/saudiexchange/ourmarkets/main-market-watch/issuers-trading-information?locale=en",
  marketDate: "2026-07-21",
  quoteTime: "2026-07-21T12:20:00.000Z",
  listedCompanyCount: 270,
  accumulatedLossRules: {
    yellow: "20% to less than 35% of capital",
    orange: "35% to less than 50% of capital",
    red: "50% or more of capital"
  },
  companies: [
    {
      symbol: "2030",
      nameAr: "\u0627\u0644\u0645\u0635\u0627\u0641\u064A",
      nameEn: "Saudi Arabia Refineries Co.",
      sectorAr: "\u0627\u0644\u0637\u0627\u0642\u0629",
      sectorEn: "Energy",
      warningFlag: null,
      officialQuote: {
        openPrice: 49.22,
        highPrice: 51.15,
        lowPrice: 49.2,
        lastPrice: 49.42,
        changePercent: -0.52,
        volume: 316195,
        tradedValue: 1588134642e-2,
        tradeCount: 1741,
        marketCap: 7413e5
      }
    },
    {
      symbol: "2222",
      nameAr: "\u0623\u0631\u0627\u0645\u0643\u0648 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Saudi Arabian Oil Co.",
      sectorAr: "\u0627\u0644\u0637\u0627\u0642\u0629",
      sectorEn: "Energy",
      warningFlag: null,
      officialQuote: {
        openPrice: 26.7,
        highPrice: 26.76,
        lowPrice: 26.5,
        lastPrice: 26.7,
        changePercent: -0.37,
        volume: 4798049,
        tradedValue: 12795368826e-2,
        tradeCount: 9963,
        marketCap: 64614e8
      }
    },
    {
      symbol: "2380",
      nameAr: "\u0628\u062A\u0631\u0648 \u0631\u0627\u0628\u063A",
      nameEn: "Rabigh Refining and Petrochemical Co.",
      sectorAr: "\u0627\u0644\u0637\u0627\u0642\u0629",
      sectorEn: "Energy",
      warningFlag: null,
      officialQuote: {
        openPrice: 14.78,
        highPrice: 14.8,
        lowPrice: 13.92,
        lastPrice: 14.41,
        changePercent: -1.97,
        volume: 10754342,
        tradedValue: 15411769386e-2,
        tradeCount: 12535,
        marketCap: 2407911e4
      }
    },
    {
      symbol: "2381",
      nameAr: "\u0627\u0644\u062D\u0641\u0631 \u0627\u0644\u0639\u0631\u0628\u064A\u0629",
      nameEn: "Arabian Drilling Co.",
      sectorAr: "\u0627\u0644\u0637\u0627\u0642\u0629",
      sectorEn: "Energy",
      warningFlag: null,
      officialQuote: {
        openPrice: 88.35,
        highPrice: 89.25,
        lowPrice: 88.3,
        lastPrice: 88.8,
        changePercent: 0.51,
        volume: 41205,
        tradedValue: 3657005,
        tradeCount: 558,
        marketCap: 79032e5
      }
    },
    {
      symbol: "2382",
      nameAr: "\u0623\u062F\u064A\u0633",
      nameEn: "Ades Holding Co.",
      sectorAr: "\u0627\u0644\u0637\u0627\u0642\u0629",
      sectorEn: "Energy",
      warningFlag: null,
      officialQuote: {
        openPrice: 17.87,
        highPrice: 17.89,
        lowPrice: 17.71,
        lastPrice: 17.86,
        changePercent: -0.06,
        volume: 724616,
        tradedValue: 1289223735e-2,
        tradeCount: 2566,
        marketCap: 2016505648218e-2
      }
    },
    {
      symbol: "4030",
      nameAr: "\u0627\u0644\u0628\u062D\u0631\u064A",
      nameEn: "National Shipping Company of Saudi Arabia",
      sectorAr: "\u0627\u0644\u0637\u0627\u0642\u0629",
      sectorEn: "Energy",
      warningFlag: null,
      officialQuote: {
        openPrice: 32.88,
        highPrice: 33,
        lowPrice: 32.08,
        lastPrice: 32.5,
        changePercent: -1.75,
        volume: 1168023,
        tradedValue: 3801593776e-2,
        tradeCount: 5250,
        marketCap: 29992675765
      }
    },
    {
      symbol: "1201",
      nameAr: "\u062A\u0643\u0648\u064A\u0646",
      nameEn: "Takween Advanced Industries Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: "red",
      officialQuote: {
        openPrice: 4.51,
        highPrice: 4.53,
        lowPrice: 4.28,
        lastPrice: 4.29,
        changePercent: -4.88,
        volume: 591360,
        tradedValue: 25992109e-1,
        tradeCount: 1220,
        marketCap: 32803315974e-2
      }
    },
    {
      symbol: "1202",
      nameAr: "\u0645\u0628\u0643\u0648",
      nameEn: "Middle East Paper Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 16.2,
        highPrice: 16.27,
        lowPrice: 16,
        lastPrice: 16.06,
        changePercent: -1.23,
        volume: 343396,
        tradedValue: 553104182e-2,
        tradeCount: 947,
        marketCap: 13918666399e-1
      }
    },
    {
      symbol: "1210",
      nameAr: "\u0628\u064A \u0633\u064A \u0622\u064A",
      nameEn: "Basic Chemical Industries Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 23.06,
        highPrice: 23.29,
        lowPrice: 23,
        lastPrice: 23.07,
        changePercent: 0.04,
        volume: 8201,
        tradedValue: 188990.31,
        tradeCount: 234,
        marketCap: 634425e3
      }
    },
    {
      symbol: "1211",
      nameAr: "\u0645\u0639\u0627\u062F\u0646",
      nameEn: "Saudi Arabian Mining Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 56.9,
        highPrice: 57.3,
        lowPrice: 56.3,
        lastPrice: 56.8,
        changePercent: -0.35,
        volume: 829741,
        tradedValue: 469874251e-1,
        tradeCount: 3902,
        marketCap: 2208817621424e-1
      }
    },
    {
      symbol: "1301",
      nameAr: "\u0623\u0633\u0644\u0627\u0643",
      nameEn: "United Wire Factories Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 15.82,
        highPrice: 15.92,
        lowPrice: 15.5,
        lastPrice: 15.85,
        changePercent: -0.19,
        volume: 58212,
        tradedValue: 914437.19,
        tradeCount: 338,
        marketCap: 445068e3
      }
    },
    {
      symbol: "1304",
      nameAr: "\u0627\u0644\u064A\u0645\u0627\u0645\u0629 \u0644\u0644\u062D\u062F\u064A\u062F",
      nameEn: "Al Yamamah Steel Industries Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 39.72,
        highPrice: 39.98,
        lowPrice: 38.04,
        lastPrice: 38.2,
        changePercent: -4.5,
        volume: 430674,
        tradedValue: 166215704e-1,
        tradeCount: 2199,
        marketCap: 194056e4
      }
    },
    {
      symbol: "1320",
      nameAr: "\u0623\u0646\u0627\u0628\u064A\u0628 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Saudi Steel Pipe Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 47.62,
        highPrice: 48.7,
        lowPrice: 47.5,
        lastPrice: 47.74,
        changePercent: 0.51,
        volume: 152818,
        tradedValue: 734425488e-2,
        tradeCount: 1100,
        marketCap: 243474e4
      }
    },
    {
      symbol: "1321",
      nameAr: "\u0623\u0646\u0627\u0628\u064A\u0628 \u0627\u0644\u0634\u0631\u0642",
      nameEn: "East Pipes Integrated Company for Industry",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 220.6,
        highPrice: 224.9,
        lowPrice: 219.3,
        lastPrice: 220.9,
        changePercent: 0.5,
        volume: 265736,
        tradedValue: 590298854e-1,
        tradeCount: 3258,
        marketCap: 695835e4
      }
    },
    {
      symbol: "1322",
      nameAr: "\u0623\u0645\u0627\u0643",
      nameEn: "Almasane Alkobra Mining Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 70.3,
        highPrice: 73,
        lowPrice: 70,
        lastPrice: 70.7,
        changePercent: 0.71,
        volume: 403454,
        tradedValue: 2869419975e-2,
        tradeCount: 3303,
        marketCap: 6363e6
      }
    },
    {
      symbol: "1323",
      nameAr: "\u064A\u0648 \u0633\u064A \u0622\u064A \u0633\u064A",
      nameEn: "United Carton Industries Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 24.5,
        highPrice: 24.68,
        lowPrice: 24.38,
        lastPrice: 24.4,
        changePercent: -1.65,
        volume: 47622,
        tradedValue: 116681587e-2,
        tradeCount: 527,
        marketCap: 976e6
      }
    },
    {
      symbol: "1324",
      nameAr: "\u0635\u0627\u0644\u062D \u0627\u0644\u0631\u0627\u0634\u062F",
      nameEn: "Saleh Abdulaziz Al Rashed and Sons Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 41.72,
        highPrice: 41.82,
        lowPrice: 40.74,
        lastPrice: 40.8,
        changePercent: -2.21,
        volume: 171597,
        tradedValue: 705326102e-2,
        tradeCount: 1149,
        marketCap: 75888e4
      }
    },
    {
      symbol: "2001",
      nameAr: "\u0643\u064A\u0645\u0627\u0646\u0648\u0644",
      nameEn: "Methanol Chemicals Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: "red",
      officialQuote: {
        openPrice: 0,
        highPrice: 0,
        lowPrice: 0,
        lastPrice: 39.88,
        changePercent: 0,
        volume: 0,
        tradedValue: 0,
        tradeCount: 0,
        marketCap: 5982e5
      }
    },
    {
      symbol: "2010",
      nameAr: "\u0633\u0627\u0628\u0643",
      nameEn: "Saudi Basic Industries Corp.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 52,
        highPrice: 52.45,
        lowPrice: 51.75,
        lastPrice: 52.2,
        changePercent: 0.29,
        volume: 945603,
        tradedValue: 492653054e-1,
        tradeCount: 3390,
        marketCap: 1566e8
      }
    },
    {
      symbol: "2020",
      nameAr: "\u0633\u0627\u0628\u0643 \u0644\u0644\u0645\u063A\u0630\u064A\u0627\u062A \u0627\u0644\u0632\u0631\u0627\u0639\u064A\u0629",
      nameEn: "SABIC Agri-Nutrients Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 122.3,
        highPrice: 122.6,
        lowPrice: 121.7,
        lastPrice: 121.7,
        changePercent: -0.49,
        volume: 169086,
        tradedValue: 206353951e-1,
        tradeCount: 1707,
        marketCap: 579335086668e-1
      }
    },
    {
      symbol: "2060",
      nameAr: "\u0627\u0644\u062A\u0635\u0646\u064A\u0639",
      nameEn: "National Industrialization Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 9,
        highPrice: 9.12,
        lowPrice: 8.96,
        lastPrice: 9.1,
        changePercent: 1.11,
        volume: 304771,
        tradedValue: 276072199e-2,
        tradeCount: 705,
        marketCap: 60871189106e-1
      }
    },
    {
      symbol: "2090",
      nameAr: "\u062C\u0628\u0633\u0643\u0648",
      nameEn: "National Gypsum Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.99,
        highPrice: 14.06,
        lowPrice: 13.9,
        lastPrice: 13.92,
        changePercent: -0.5,
        volume: 77368,
        tradedValue: 108102526e-2,
        tradeCount: 209,
        marketCap: 44080000464e-2
      }
    },
    {
      symbol: "2150",
      nameAr: "\u0632\u062C\u0627\u062C",
      nameEn: "The National Company for Glass Industries",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 35.9,
        highPrice: 35.9,
        lowPrice: 35.52,
        lastPrice: 35.52,
        changePercent: -1.06,
        volume: 69858,
        tradedValue: 24937845e-1,
        tradeCount: 363,
        marketCap: 1168608e3
      }
    },
    {
      symbol: "2170",
      nameAr: "\u0627\u0644\u0644\u062C\u064A\u0646",
      nameEn: "Alujain Corp.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 27.2,
        highPrice: 27.42,
        lowPrice: 26.82,
        lastPrice: 26.9,
        changePercent: -1.1,
        volume: 220605,
        tradedValue: 597524758e-2,
        tradeCount: 1224,
        marketCap: 186148e4
      }
    },
    {
      symbol: "2180",
      nameAr: "\u0641\u064A\u0628\u0643\u0648",
      nameEn: "Filing and Packing Materials Manufacturing Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 31.6,
        highPrice: 31.98,
        lowPrice: 31.6,
        lastPrice: 31.84,
        changePercent: 0.51,
        volume: 23192,
        tradedValue: 737822.84,
        tradeCount: 168,
        marketCap: 36616e4
      }
    },
    {
      symbol: "2200",
      nameAr: "\u0623\u0646\u0627\u0628\u064A\u0628",
      nameEn: "Arabian Pipes Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.72,
        highPrice: 6.84,
        lowPrice: 6.62,
        lastPrice: 6.62,
        changePercent: -1.19,
        volume: 3193838,
        tradedValue: 214449666e-1,
        tradeCount: 2471,
        marketCap: 1324e6
      }
    },
    {
      symbol: "2210",
      nameAr: "\u0646\u0645\u0627\u0621 \u0644\u0644\u0643\u064A\u0645\u0627\u0648\u064A\u0627\u062A",
      nameEn: "Nama Chemicals Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 0,
        highPrice: 0,
        lowPrice: 0,
        lastPrice: 18.74,
        changePercent: 0,
        volume: 0,
        tradedValue: 0,
        tradeCount: 0,
        marketCap: 440764800
      }
    },
    {
      symbol: "2220",
      nameAr: "\u0645\u0639\u062F\u0646\u064A\u0629",
      nameEn: "National Metal Manufacturing and Casting Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: "orange",
      officialQuote: {
        openPrice: 11.75,
        highPrice: 11.9,
        lowPrice: 11.71,
        lastPrice: 11.76,
        changePercent: 0.09,
        volume: 44318,
        tradedValue: 522941.96,
        tradeCount: 242,
        marketCap: 416304e3
      }
    },
    {
      symbol: "2223",
      nameAr: "\u0644\u0648\u0628\u0631\u064A\u0641",
      nameEn: "Saudi Aramco Base Oil Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 132,
        highPrice: 132.2,
        lowPrice: 130.3,
        lastPrice: 131,
        changePercent: -0.83,
        volume: 235829,
        tradedValue: 30870658,
        tradeCount: 3087,
        marketCap: 2210625e4
      }
    },
    {
      symbol: "2240",
      nameAr: "\u0635\u0646\u0627\u0639\u0627\u062A",
      nameEn: "Advanced Building Industries Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 30.54,
        highPrice: 30.54,
        lowPrice: 28.84,
        lastPrice: 29.48,
        changePercent: -3.28,
        volume: 366833,
        tradedValue: 1082912738e-2,
        tradeCount: 1866,
        marketCap: 17688e5
      }
    },
    {
      symbol: "2250",
      nameAr: "\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Saudi Industrial Investment Group",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 12.7,
        highPrice: 12.88,
        lowPrice: 12.68,
        lastPrice: 12.83,
        changePercent: 1.02,
        volume: 697481,
        tradedValue: 891283656e-2,
        tradeCount: 1214,
        marketCap: 8715675600
      }
    },
    {
      symbol: "2290",
      nameAr: "\u064A\u0646\u0633\u0627\u0628",
      nameEn: "Yanbu National Petrochemical Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 30.64,
        highPrice: 31.42,
        lowPrice: 30.6,
        lastPrice: 31.3,
        changePercent: 2.09,
        volume: 733594,
        tradedValue: 2277485784e-2,
        tradeCount: 2552,
        marketCap: 1760625e4
      }
    },
    {
      symbol: "2300",
      nameAr: "\u0635\u0646\u0627\u0639\u0629 \u0627\u0644\u0648\u0631\u0642",
      nameEn: "Saudi Paper Manufacturing Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 62.5,
        highPrice: 63.75,
        lowPrice: 61.25,
        lastPrice: 63,
        changePercent: 1.61,
        volume: 86158,
        tradedValue: 54102955e-1,
        tradeCount: 635,
        marketCap: 233541e4
      }
    },
    {
      symbol: "2310",
      nameAr: "\u0633\u0628\u0643\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u0645\u064A\u0629",
      nameEn: "Sahara International Petrochemical Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.48,
        highPrice: 13.7,
        lowPrice: 13.41,
        lastPrice: 13.63,
        changePercent: 0.96,
        volume: 807380,
        tradedValue: 1093518334e-2,
        tradeCount: 1970,
        marketCap: 999533331516e-2
      }
    },
    {
      symbol: "2330",
      nameAr: "\u0627\u0644\u0645\u062A\u0642\u062F\u0645\u0629",
      nameEn: "Advanced Petrochemical Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 22.31,
        highPrice: 22.45,
        lowPrice: 22.3,
        lastPrice: 22.4,
        changePercent: -0.04,
        volume: 293281,
        tradedValue: 656318272e-2,
        tradeCount: 1159,
        marketCap: 5824e6
      }
    },
    {
      symbol: "2350",
      nameAr: "\u0643\u064A\u0627\u0646 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Saudi Kayan Petrochemical Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: "orange",
      officialQuote: {
        openPrice: 5.01,
        highPrice: 5.03,
        lowPrice: 4.97,
        lastPrice: 5.01,
        changePercent: -0.2,
        volume: 3150516,
        tradedValue: 1574805804e-2,
        tradeCount: 2189,
        marketCap: 7515e6
      }
    },
    {
      symbol: "2360",
      nameAr: "\u0627\u0644\u0641\u062E\u0627\u0631\u064A\u0629",
      nameEn: "Saudi Vitrified Clay Pipes Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: "red",
      officialQuote: {
        openPrice: 17.1,
        highPrice: 17.1,
        lowPrice: 16.56,
        lastPrice: 16.73,
        changePercent: -2.39,
        volume: 183004,
        tradedValue: 307235425e-2,
        tradeCount: 938,
        marketCap: 25095e4
      }
    },
    {
      symbol: "3002",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0646\u062C\u0631\u0627\u0646",
      nameEn: "Najran Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 5.66,
        highPrice: 5.72,
        lowPrice: 5.66,
        lastPrice: 5.7,
        changePercent: 0.71,
        volume: 184649,
        tradedValue: 105224119e-2,
        tradeCount: 252,
        marketCap: 969e6
      }
    },
    {
      symbol: "3003",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u0645\u062F\u064A\u0646\u0629",
      nameEn: "City Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.27,
        highPrice: 10.43,
        lowPrice: 10.23,
        lastPrice: 10.33,
        changePercent: 0.78,
        volume: 632346,
        tradedValue: 653009269e-2,
        tradeCount: 3186,
        marketCap: 14462e5
      }
    },
    {
      symbol: "3004",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u0634\u0645\u0627\u0644\u064A\u0629",
      nameEn: "Northern Region Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.53,
        highPrice: 6.56,
        lowPrice: 6.51,
        lastPrice: 6.55,
        changePercent: 0,
        volume: 90496,
        tradedValue: 591151.67,
        tradeCount: 386,
        marketCap: 1179e6
      }
    },
    {
      symbol: "3005",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0645 \u0627\u0644\u0642\u0631\u0649",
      nameEn: "Umm Al-Qura Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.52,
        highPrice: 13.69,
        lowPrice: 13.46,
        lastPrice: 13.65,
        changePercent: 0.07,
        volume: 27654,
        tradedValue: 375599.37,
        tradeCount: 246,
        marketCap: 75075e4
      }
    },
    {
      symbol: "3007",
      nameAr: "\u0627\u0644\u0648\u0627\u062D\u0629",
      nameEn: "Zahrat Al Waha for Trading Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 2.81,
        highPrice: 2.83,
        lowPrice: 2.76,
        lastPrice: 2.76,
        changePercent: -1.78,
        volume: 1151032,
        tradedValue: 320199937e-2,
        tradeCount: 680,
        marketCap: 621e6
      }
    },
    {
      symbol: "3008",
      nameAr: "\u0627\u0644\u0643\u062B\u064A\u0631\u064A",
      nameEn: "Al Kathiri Holding Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: "red",
      officialQuote: {
        openPrice: 1.37,
        highPrice: 1.37,
        lowPrice: 1.36,
        lastPrice: 1.37,
        changePercent: 0,
        volume: 1088924,
        tradedValue: 148575738e-2,
        tradeCount: 860,
        marketCap: 309680280
      }
    },
    {
      symbol: "3010",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u0639\u0631\u0628\u064A\u0629",
      nameEn: "Arabian Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 23.26,
        highPrice: 23.28,
        lowPrice: 23.05,
        lastPrice: 23.08,
        changePercent: -0.39,
        volume: 74939,
        tradedValue: 173399826e-2,
        tradeCount: 444,
        marketCap: 2308e6
      }
    },
    {
      symbol: "3020",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u064A\u0645\u0627\u0645\u0629",
      nameEn: "Yamama Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 24.1,
        highPrice: 24.24,
        lowPrice: 24,
        lastPrice: 24.11,
        changePercent: 0.04,
        volume: 179889,
        tradedValue: 433990224e-2,
        tradeCount: 830,
        marketCap: 4882275e3
      }
    },
    {
      symbol: "3030",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Saudi Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 29.58,
        highPrice: 29.64,
        lowPrice: 29.42,
        lastPrice: 29.5,
        changePercent: -0.27,
        volume: 97304,
        tradedValue: 287065432e-2,
        tradeCount: 874,
        marketCap: 45135e5
      }
    },
    {
      symbol: "3040",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u0642\u0635\u064A\u0645",
      nameEn: "Qassim Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 45.14,
        highPrice: 45.24,
        lowPrice: 45.04,
        lastPrice: 45.1,
        changePercent: 0.13,
        volume: 43614,
        tradedValue: 196773894e-2,
        tradeCount: 517,
        marketCap: 4986210900
      }
    },
    {
      symbol: "3050",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u062C\u0646\u0648\u0628",
      nameEn: "Southern Province Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 19.1,
        highPrice: 19.2,
        lowPrice: 19.07,
        lastPrice: 19.08,
        changePercent: -0.26,
        volume: 29351,
        tradedValue: 561757.65,
        tradeCount: 296,
        marketCap: 26712e5
      }
    },
    {
      symbol: "3060",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u064A\u0646\u0628\u0639",
      nameEn: "Yanbu Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 15.03,
        highPrice: 15.09,
        lowPrice: 14.98,
        lastPrice: 14.98,
        changePercent: -0.33,
        volume: 299918,
        tradedValue: 450632171e-2,
        tradeCount: 1083,
        marketCap: 235935e4
      }
    },
    {
      symbol: "3080",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u0634\u0631\u0642\u064A\u0629",
      nameEn: "Eastern Province Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 26.2,
        highPrice: 26.6,
        lowPrice: 26.18,
        lastPrice: 26.3,
        changePercent: 0.08,
        volume: 44438,
        tradedValue: 116821718e-2,
        tradeCount: 282,
        marketCap: 22618e5
      }
    },
    {
      symbol: "3090",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u062A\u0628\u0648\u0643",
      nameEn: "Tabuk Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 7.5,
        highPrice: 7.56,
        lowPrice: 7.46,
        lastPrice: 7.5,
        changePercent: -0.4,
        volume: 61906,
        tradedValue: 465377.68,
        tradeCount: 317,
        marketCap: 675e6
      }
    },
    {
      symbol: "3091",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u062C\u0648\u0641",
      nameEn: "Al Jouf Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 4.92,
        highPrice: 4.92,
        lowPrice: 4.84,
        lastPrice: 4.84,
        changePercent: -1.63,
        volume: 253964,
        tradedValue: 123757361e-2,
        tradeCount: 646,
        marketCap: 526108e3
      }
    },
    {
      symbol: "3092",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u0631\u064A\u0627\u0636",
      nameEn: "Riyadh Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 22.14,
        highPrice: 22.38,
        lowPrice: 22.14,
        lastPrice: 22.28,
        changePercent: 0.68,
        volume: 65617,
        tradedValue: 146422123e-2,
        tradeCount: 490,
        marketCap: 26736e5
      }
    },
    {
      symbol: "4143",
      nameAr: "\u062A\u0627\u0644\u0643\u0648",
      nameEn: "Al Taiseer Group Talco Industrial Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 30.9,
        highPrice: 31.12,
        lowPrice: 30.7,
        lastPrice: 30.76,
        changePercent: -0.77,
        volume: 28405,
        tradedValue: 879907.8,
        tradeCount: 279,
        marketCap: 12304e5
      }
    },
    {
      symbol: "1212",
      nameAr: "\u0623\u0633\u062A\u0631\u0627 \u0627\u0644\u0635\u0646\u0627\u0639\u064A\u0629",
      nameEn: "Astra Industrial Group",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 128,
        highPrice: 130,
        lowPrice: 128,
        lastPrice: 129.7,
        changePercent: 1.33,
        volume: 35948,
        tradedValue: 46464491e-1,
        tradeCount: 592,
        marketCap: 10376e6
      }
    },
    {
      symbol: "1214",
      nameAr: "\u0634\u0627\u0643\u0631",
      nameEn: "Al Hassan Ghazi Ibrahim Shaker Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.08,
        highPrice: 13.1,
        lowPrice: 13,
        lastPrice: 13,
        changePercent: -0.31,
        volume: 217003,
        tradedValue: 283143758e-2,
        tradeCount: 794,
        marketCap: 88023e4
      }
    },
    {
      symbol: "1302",
      nameAr: "\u0628\u0648\u0627\u0646",
      nameEn: "Bawan Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 36,
        highPrice: 36.26,
        lowPrice: 35.3,
        lastPrice: 35.46,
        changePercent: -1.77,
        volume: 185399,
        tradedValue: 66223992e-1,
        tradeCount: 1291,
        marketCap: 21276e5
      }
    },
    {
      symbol: "1303",
      nameAr: "\u0627\u0644\u0635\u0646\u0627\u0639\u0627\u062A \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629",
      nameEn: "Electrical Industries Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.04,
        highPrice: 13.44,
        lowPrice: 13.03,
        lastPrice: 13.21,
        changePercent: 0.3,
        volume: 2648087,
        tradedValue: 3502492227e-2,
        tradeCount: 4560,
        marketCap: 1486125e4
      }
    },
    {
      symbol: "2040",
      nameAr: "\u0627\u0644\u062E\u0632\u0641 \u0627\u0644\u0633\u0639\u0648\u062F\u064A",
      nameEn: "Saudi Ceramic Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 24.41,
        highPrice: 24.5,
        lowPrice: 24.1,
        lastPrice: 24.12,
        changePercent: -1.19,
        volume: 139520,
        tradedValue: 3381611,
        tradeCount: 856,
        marketCap: 2412e6
      }
    },
    {
      symbol: "2110",
      nameAr: "\u0627\u0644\u0643\u0627\u0628\u0644\u0627\u062A \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Saudi Cable Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: "red",
      officialQuote: {
        openPrice: 160.9,
        highPrice: 164,
        lowPrice: 158.3,
        lastPrice: 158.9,
        changePercent: 0,
        volume: 30540,
        tradedValue: 49114311e-1,
        tradeCount: 765,
        marketCap: 10603247634e-1
      }
    },
    {
      symbol: "2160",
      nameAr: "\u0623\u0645\u064A\u0627\u0646\u062A\u064A\u062A",
      nameEn: "Saudi Arabian Amiantit Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 12.67,
        highPrice: 12.72,
        lowPrice: 12.45,
        lastPrice: 12.45,
        changePercent: -1.5,
        volume: 185149,
        tradedValue: 232999995e-2,
        tradeCount: 720,
        marketCap: 554647500
      }
    },
    {
      symbol: "2320",
      nameAr: "\u0627\u0644\u0628\u0627\u0628\u0637\u064A\u0646",
      nameEn: "Al-Babtain Power and Telecommunication Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 58.6,
        highPrice: 59.15,
        lowPrice: 58.2,
        lastPrice: 58.25,
        changePercent: -0.94,
        volume: 278750,
        tradedValue: 1634170885e-2,
        tradeCount: 2259,
        marketCap: 3724910886
      }
    },
    {
      symbol: "2370",
      nameAr: "\u0645\u0633\u0643",
      nameEn: "Middle East Specialized Cables Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 32,
        highPrice: 32.22,
        lowPrice: 31,
        lastPrice: 31.22,
        changePercent: -2.74,
        volume: 210172,
        tradedValue: 660764074e-2,
        tradeCount: 1386,
        marketCap: 12488e5
      }
    },
    {
      symbol: "4110",
      nameAr: "\u0628\u0627\u062A\u0643",
      nameEn: "Batic Investments and Logistics Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 2.05,
        highPrice: 2.06,
        lowPrice: 2.02,
        lastPrice: 2.02,
        changePercent: -1.46,
        volume: 3553224,
        tradedValue: 723901587e-2,
        tradeCount: 1298,
        marketCap: 1212e6
      }
    },
    {
      symbol: "4140",
      nameAr: "\u0635\u0627\u062F\u0631\u0627\u062A",
      nameEn: "Saudi Industrial Export Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: "orange",
      officialQuote: {
        openPrice: 2.34,
        highPrice: 2.36,
        lowPrice: 2.3,
        lastPrice: 2.32,
        changePercent: -0.85,
        volume: 2231038,
        tradedValue: 5195869,
        tradeCount: 844,
        marketCap: 451008e3
      }
    },
    {
      symbol: "4141",
      nameAr: "\u0627\u0644\u0639\u0645\u0631\u0627\u0646",
      nameEn: "Al-Omran Industrial Trading Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 20.5,
        highPrice: 20.72,
        lowPrice: 20.3,
        lastPrice: 20.3,
        changePercent: -1.31,
        volume: 19934,
        tradedValue: 408563.97,
        tradeCount: 226,
        marketCap: 2436e5
      }
    },
    {
      symbol: "4142",
      nameAr: "\u0643\u0627\u0628\u0644\u0627\u062A \u0627\u0644\u0631\u064A\u0627\u0636",
      nameEn: "Riyadh Cables Group Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 107.6,
        highPrice: 109.9,
        lowPrice: 107.5,
        lastPrice: 108.8,
        changePercent: 1.12,
        volume: 187112,
        tradedValue: 203662808e-1,
        tradeCount: 1778,
        marketCap: 1632e7
      }
    },
    {
      symbol: "4144",
      nameAr: "\u0631\u0624\u0648\u0645",
      nameEn: "Raoom Trading Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 73.55,
        highPrice: 74.6,
        lowPrice: 71.1,
        lastPrice: 72,
        changePercent: -2.11,
        volume: 94597,
        tradedValue: 68785369e-1,
        tradeCount: 650,
        marketCap: 9e8
      }
    },
    {
      symbol: "4145",
      nameAr: "\u0623\u0648 \u062C\u064A \u0633\u064A",
      nameEn: "Obeikan Glass Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 24.72,
        highPrice: 24.9,
        lowPrice: 24.28,
        lastPrice: 24.28,
        changePercent: -1.7,
        volume: 90128,
        tradedValue: 220704338e-2,
        tradeCount: 533,
        marketCap: 77696e4
      }
    },
    {
      symbol: "4146",
      nameAr: "\u062C\u0627\u0632",
      nameEn: "Gas Arabian Services Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 16.28,
        highPrice: 16.28,
        lowPrice: 15.82,
        lastPrice: 15.93,
        changePercent: -0.93,
        volume: 116945,
        tradedValue: 186282499e-2,
        tradeCount: 469,
        marketCap: 251694e4
      }
    },
    {
      symbol: "4147",
      nameAr: "\u0633\u064A \u062C\u064A \u0625\u0633",
      nameEn: "Consolidated Grunenfelder Saady Holding Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.64,
        highPrice: 6.69,
        lowPrice: 6.35,
        lastPrice: 6.39,
        changePercent: -3.77,
        volume: 974473,
        tradedValue: 634392367e-2,
        tradeCount: 1062,
        marketCap: 639e6
      }
    },
    {
      symbol: "4148",
      nameAr: "\u0627\u0644\u0648\u0633\u0627\u0626\u0644 \u0627\u0644\u0635\u0646\u0627\u0639\u064A\u0629",
      nameEn: "Alwasail Industrial Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 2.9,
        highPrice: 2.98,
        lowPrice: 2.9,
        lastPrice: 2.93,
        changePercent: 0.34,
        volume: 822334,
        tradedValue: 241858178e-2,
        tradeCount: 664,
        marketCap: 7325e5
      }
    },
    {
      symbol: "1831",
      nameAr: "\u0645\u0647\u0627\u0631\u0629",
      nameEn: "Maharah Human Resources Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0647\u0646\u064A\u0629",
      sectorEn: "Commercial & Professional Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 5.3,
        highPrice: 5.35,
        lowPrice: 5.27,
        lastPrice: 5.31,
        changePercent: 0.19,
        volume: 2414269,
        tradedValue: 1284074643e-2,
        tradeCount: 3100,
        marketCap: 3186e6
      }
    },
    {
      symbol: "1832",
      nameAr: "\u0635\u062F\u0631",
      nameEn: "Sadr Logistics Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0647\u0646\u064A\u0629",
      sectorEn: "Commercial & Professional Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 2.55,
        highPrice: 2.57,
        lowPrice: 2.48,
        lastPrice: 2.49,
        changePercent: -3.11,
        volume: 1705770,
        tradedValue: 430359421e-2,
        tradeCount: 1656,
        marketCap: 43575e4
      }
    },
    {
      symbol: "1833",
      nameAr: "\u0627\u0644\u0645\u0648\u0627\u0631\u062F",
      nameEn: "Al Mawarid Manpower Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0647\u0646\u064A\u0629",
      sectorEn: "Commercial & Professional Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 108.6,
        highPrice: 112.1,
        lowPrice: 108.3,
        lastPrice: 111,
        changePercent: 2.21,
        volume: 171278,
        tradedValue: 189249018e-1,
        tradeCount: 1611,
        marketCap: 222e7
      }
    },
    {
      symbol: "1834",
      nameAr: "\u0633\u0645\u0627\u0633\u0643\u0648",
      nameEn: "Saudi Manpower Solutions Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0647\u0646\u064A\u0629",
      sectorEn: "Commercial & Professional Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.2,
        highPrice: 6.3,
        lowPrice: 6.19,
        lastPrice: 6.23,
        changePercent: 0.32,
        volume: 1086174,
        tradedValue: 677235394e-2,
        tradeCount: 1671,
        marketCap: 2492e6
      }
    },
    {
      symbol: "1835",
      nameAr: "\u062A\u0645\u0643\u064A\u0646",
      nameEn: "Tamkeen Human Resource Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0647\u0646\u064A\u0629",
      sectorEn: "Commercial & Professional Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 47.84,
        highPrice: 48.16,
        lowPrice: 47.34,
        lastPrice: 47.74,
        changePercent: 0.93,
        volume: 74869,
        tradedValue: 357782772e-2,
        tradeCount: 484,
        marketCap: 126511e4
      }
    },
    {
      symbol: "4270",
      nameAr: "\u0637\u0628\u0627\u0639\u0629 \u0648\u062A\u063A\u0644\u064A\u0641",
      nameEn: "Saudi Printing and Packaging Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0647\u0646\u064A\u0629",
      sectorEn: "Commercial & Professional Svc",
      warningFlag: "red",
      officialQuote: {
        openPrice: 7.17,
        highPrice: 7.27,
        lowPrice: 6.94,
        lastPrice: 6.94,
        changePercent: -3.07,
        volume: 353965,
        tradedValue: 250925643e-2,
        tradeCount: 1107,
        marketCap: 45253702416e-2
      }
    },
    {
      symbol: "6004",
      nameAr: "\u0643\u0627\u062A\u0631\u064A\u0648\u0646",
      nameEn: "CATRION Catering Holding Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0647\u0646\u064A\u0629",
      sectorEn: "Commercial & Professional Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 73.15,
        highPrice: 73.8,
        lowPrice: 72.8,
        lastPrice: 72.8,
        changePercent: -0.68,
        volume: 88870,
        tradedValue: 650229535e-2,
        tradeCount: 888,
        marketCap: 59696e5
      }
    },
    {
      symbol: "2190",
      nameAr: "\u0633\u064A\u0633\u0643\u0648 \u0627\u0644\u0642\u0627\u0628\u0636\u0629",
      nameEn: "Sustained Infrastructure Holding Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: null,
      officialQuote: {
        openPrice: 35.86,
        highPrice: 35.98,
        lowPrice: 35.08,
        lastPrice: 35.42,
        changePercent: -1.77,
        volume: 237896,
        tradedValue: 84576361e-1,
        tradeCount: 1419,
        marketCap: 2890272e3
      }
    },
    {
      symbol: "4031",
      nameAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0631\u0636\u064A\u0629",
      nameEn: "Saudi Ground Services Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: null,
      officialQuote: {
        openPrice: 27.6,
        highPrice: 27.62,
        lowPrice: 27.18,
        lastPrice: 27.2,
        changePercent: -1.52,
        volume: 441083,
        tradedValue: 120645857e-1,
        tradeCount: 2263,
        marketCap: 51136e5
      }
    },
    {
      symbol: "4040",
      nameAr: "\u0633\u0627\u0628\u062A\u0643\u0648",
      nameEn: "Saudi Public Transport Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 11.12,
        highPrice: 11.17,
        lowPrice: 10.8,
        lastPrice: 10.84,
        changePercent: -2.52,
        volume: 550647,
        tradedValue: 603012159e-2,
        tradeCount: 1339,
        marketCap: 1355e6
      }
    },
    {
      symbol: "4260",
      nameAr: "\u0628\u062F\u062C\u062A \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "United International Transportation Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: null,
      officialQuote: {
        openPrice: 28.7,
        highPrice: 29,
        lowPrice: 28.68,
        lastPrice: 28.82,
        changePercent: 0.56,
        volume: 508273,
        tradedValue: 146656507e-1,
        tradeCount: 3140,
        marketCap: 301290689568e-2
      }
    },
    {
      symbol: "4261",
      nameAr: "\u0630\u064A\u0628",
      nameEn: "Theeb Rent a Car Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: null,
      officialQuote: {
        openPrice: 22.49,
        highPrice: 22.68,
        lowPrice: 22.45,
        lastPrice: 22.46,
        changePercent: -0.22,
        volume: 303995,
        tradedValue: 684405609e-2,
        tradeCount: 1350,
        marketCap: 148171997984e-2
      }
    },
    {
      symbol: "4262",
      nameAr: "\u0644\u0648\u0645\u064A",
      nameEn: "Lumi Rental Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: null,
      officialQuote: {
        openPrice: 29.92,
        highPrice: 30.26,
        lowPrice: 29.92,
        lastPrice: 29.94,
        changePercent: -0.07,
        volume: 99800,
        tradedValue: 300046316e-2,
        tradeCount: 574,
        marketCap: 16467e5
      }
    },
    {
      symbol: "4263",
      nameAr: "\u0633\u0627\u0644",
      nameEn: "SAL Saudi Logistics Services Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: null,
      officialQuote: {
        openPrice: 163.5,
        highPrice: 164.8,
        lowPrice: 163,
        lastPrice: 164.2,
        changePercent: -0.12,
        volume: 138135,
        tradedValue: 226678827e-1,
        tradeCount: 2432,
        marketCap: 13136e6
      }
    },
    {
      symbol: "4264",
      nameAr: "\u0637\u064A\u0631\u0627\u0646 \u0646\u0627\u0633",
      nameEn: "Flynas Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: null,
      officialQuote: {
        openPrice: 50.3,
        highPrice: 50.4,
        lowPrice: 49.36,
        lastPrice: 49.62,
        changePercent: -1.65,
        volume: 427395,
        tradedValue: 2124691866e-2,
        tradeCount: 2753,
        marketCap: 847767093066e-2
      }
    },
    {
      symbol: "4265",
      nameAr: "\u0634\u0631\u064A",
      nameEn: "Cherry Trading Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: null,
      officialQuote: {
        openPrice: 22.59,
        highPrice: 22.99,
        lowPrice: 22.59,
        lastPrice: 22.75,
        changePercent: 0.89,
        volume: 78124,
        tradedValue: 177777455e-2,
        tradeCount: 414,
        marketCap: 6825e5
      }
    },
    {
      symbol: "1213",
      nameAr: "\u0646\u0633\u064A\u062C",
      nameEn: "Naseej International Trading Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0637\u0648\u064A\u0644\u0629 \u0627\u0644\u0623\u062C\u0644",
      sectorEn: "Consumer Durables & Apparel",
      warningFlag: "red",
      officialQuote: {
        openPrice: 22.86,
        highPrice: 23.44,
        lowPrice: 22.5,
        lastPrice: 22.5,
        changePercent: -2.13,
        volume: 452371,
        tradedValue: 1035961799e-2,
        tradeCount: 2083,
        marketCap: 2451892725e-1
      }
    },
    {
      symbol: "2130",
      nameAr: "\u0635\u062F\u0642",
      nameEn: "Saudi Industrial Development Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0637\u0648\u064A\u0644\u0629 \u0627\u0644\u0623\u062C\u0644",
      sectorEn: "Consumer Durables & Apparel",
      warningFlag: null,
      officialQuote: {
        openPrice: 16.74,
        highPrice: 16.94,
        lowPrice: 16.17,
        lastPrice: 16.22,
        changePercent: -2.29,
        volume: 406726,
        tradedValue: 674183205e-2,
        tradeCount: 1357,
        marketCap: 4866e5
      }
    },
    {
      symbol: "2340",
      nameAr: "\u0627\u0631\u062A\u064A\u0643\u0633",
      nameEn: "ARTEX Industrial Investment Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0637\u0648\u064A\u0644\u0629 \u0627\u0644\u0623\u062C\u0644",
      sectorEn: "Consumer Durables & Apparel",
      warningFlag: null,
      officialQuote: {
        openPrice: 12.28,
        highPrice: 12.28,
        lowPrice: 11.85,
        lastPrice: 12.07,
        changePercent: -0.49,
        volume: 63382,
        tradedValue: 763995.87,
        tradeCount: 391,
        marketCap: 980687500
      }
    },
    {
      symbol: "4011",
      nameAr: "\u0644\u0627\u0632\u0648\u0631\u062F\u064A",
      nameEn: "Lazurde Company for Jewelry",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0637\u0648\u064A\u0644\u0629 \u0627\u0644\u0623\u062C\u0644",
      sectorEn: "Consumer Durables & Apparel",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.05,
        highPrice: 11.09,
        lowPrice: 10.96,
        lastPrice: 10.97,
        changePercent: -1.17,
        volume: 76966,
        tradedValue: 846546.24,
        tradeCount: 246,
        marketCap: 630775e3
      }
    },
    {
      symbol: "4012",
      nameAr: "\u0627\u0644\u0623\u0635\u064A\u0644",
      nameEn: "Thob Al Aseel Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0637\u0648\u064A\u0644\u0629 \u0627\u0644\u0623\u062C\u0644",
      sectorEn: "Consumer Durables & Apparel",
      warningFlag: null,
      officialQuote: {
        openPrice: 3.62,
        highPrice: 3.62,
        lowPrice: 3.59,
        lastPrice: 3.6,
        changePercent: -0.28,
        volume: 142634,
        tradedValue: 513322.39,
        tradeCount: 427,
        marketCap: 144e7
      }
    },
    {
      symbol: "4180",
      nameAr: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0641\u062A\u064A\u062D\u064A",
      nameEn: "Fitaihi Holding Group",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0637\u0648\u064A\u0644\u0629 \u0627\u0644\u0623\u062C\u0644",
      sectorEn: "Consumer Durables & Apparel",
      warningFlag: null,
      officialQuote: {
        openPrice: 2.46,
        highPrice: 2.46,
        lowPrice: 2.39,
        lastPrice: 2.4,
        changePercent: -1.64,
        volume: 1296608,
        tradedValue: 312582228e-2,
        tradeCount: 941,
        marketCap: 66e7
      }
    },
    {
      symbol: "1810",
      nameAr: "\u0633\u064A\u0631\u0627",
      nameEn: "Seera Group Holding",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 21.55,
        highPrice: 21.55,
        lowPrice: 20.9,
        lastPrice: 20.91,
        changePercent: -2.97,
        volume: 963245,
        tradedValue: 2051620723e-2,
        tradeCount: 1804,
        marketCap: 573035731332e-2
      }
    },
    {
      symbol: "1820",
      nameAr: "\u0628\u0627\u0646",
      nameEn: "BAAN Holding Group Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: "red",
      officialQuote: {
        openPrice: 2.07,
        highPrice: 2.07,
        lowPrice: 2.02,
        lastPrice: 2.03,
        changePercent: -1.93,
        volume: 2313206,
        tradedValue: 472171208e-2,
        tradeCount: 938,
        marketCap: 125853288008e-2
      }
    },
    {
      symbol: "1830",
      nameAr: "\u0644\u062C\u0627\u0645 \u0644\u0644\u0631\u064A\u0627\u0636\u0629",
      nameEn: "Leejam Sports Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 69.75,
        highPrice: 71.75,
        lowPrice: 69.65,
        lastPrice: 70.2,
        changePercent: 0.57,
        volume: 91978,
        tradedValue: 65035859e-1,
        tradeCount: 1229,
        marketCap: 36773119422e-1
      }
    },
    {
      symbol: "4170",
      nameAr: "\u0634\u0645\u0633",
      nameEn: "Tourism Enterprise Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 15.32,
        highPrice: 15.62,
        lowPrice: 15.15,
        lastPrice: 15.15,
        changePercent: -1.17,
        volume: 178953,
        tradedValue: 275883953e-2,
        tradeCount: 695,
        marketCap: 87602788845e-2
      }
    },
    {
      symbol: "4290",
      nameAr: "\u0627\u0644\u062E\u0644\u064A\u062C \u0644\u0644\u062A\u062F\u0631\u064A\u0628",
      nameEn: "Alkhaleej Training and Education Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.65,
        highPrice: 13.69,
        lowPrice: 13.51,
        lastPrice: 13.52,
        changePercent: -1.24,
        volume: 144292,
        tradedValue: 195751708e-2,
        tradeCount: 706,
        marketCap: 8788e5
      }
    },
    {
      symbol: "4291",
      nameAr: "\u0627\u0644\u0648\u0637\u0646\u064A\u0629 \u0644\u0644\u062A\u0639\u0644\u064A\u0645",
      nameEn: "National Company for Learning and Education",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 126.2,
        highPrice: 127,
        lowPrice: 122,
        lastPrice: 125.9,
        changePercent: 1.45,
        volume: 13085,
        tradedValue: 16290894e-1,
        tradeCount: 405,
        marketCap: 54137e5
      }
    },
    {
      symbol: "4292",
      nameAr: "\u0639\u0637\u0627\u0621",
      nameEn: "Ataa Educational Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 42.62,
        highPrice: 44.4,
        lowPrice: 42.62,
        lastPrice: 44.38,
        changePercent: 3.79,
        volume: 91822,
        tradedValue: 401572556e-2,
        tradeCount: 819,
        marketCap: 18678306017e-1
      }
    },
    {
      symbol: "6002",
      nameAr: "\u0647\u0631\u0641\u064A \u0644\u0644\u0623\u063A\u0630\u064A\u0629",
      nameEn: "Herfy Food Services Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.39,
        highPrice: 13.49,
        lowPrice: 13.16,
        lastPrice: 13.23,
        changePercent: -0.53,
        volume: 82399,
        tradedValue: 109584933e-2,
        tradeCount: 549,
        marketCap: 855716400
      }
    },
    {
      symbol: "6012",
      nameAr: "\u0631\u064A\u062F\u0627\u0646",
      nameEn: "Raydan Food Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: "red",
      officialQuote: {
        openPrice: 13.43,
        highPrice: 13.49,
        lowPrice: 13.06,
        lastPrice: 13.1,
        changePercent: -2.46,
        volume: 32131,
        tradedValue: 425240.35,
        tradeCount: 505,
        marketCap: 958081993e-1
      }
    },
    {
      symbol: "6013",
      nameAr: "\u0627\u0644\u062A\u0637\u0648\u064A\u0631\u064A\u0629 \u0627\u0644\u063A\u0630\u0627\u0626\u064A\u0629",
      nameEn: "Development Works Food Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: "orange",
      officialQuote: {
        openPrice: 93.35,
        highPrice: 94.9,
        lowPrice: 92.95,
        lastPrice: 93,
        changePercent: -0.53,
        volume: 15902,
        tradedValue: 149572035e-2,
        tradeCount: 312,
        marketCap: 279e6
      }
    },
    {
      symbol: "6014",
      nameAr: "\u0627\u0644\u0622\u0645\u0627\u0631",
      nameEn: "Alamar Foods Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 37.8,
        highPrice: 37.86,
        lowPrice: 37.18,
        lastPrice: 37.28,
        changePercent: -1.38,
        volume: 63833,
        tradedValue: 238974272e-2,
        tradeCount: 860,
        marketCap: 95064e4
      }
    },
    {
      symbol: "6015",
      nameAr: "\u0623\u0645\u0631\u064A\u0643\u0627\u0646\u0627",
      nameEn: "Americana Restaurants International PLC - Foreign Company",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 2.09,
        highPrice: 2.11,
        lowPrice: 2.07,
        lastPrice: 2.09,
        changePercent: 0,
        volume: 10804483,
        tradedValue: 2260150027e-2,
        tradeCount: 1934,
        marketCap: 17605393179
      }
    },
    {
      symbol: "6016",
      nameAr: "\u0628\u0631\u063A\u0631\u0627\u064A\u0632\u0632\u0631",
      nameEn: "Shatirah House Restaurant Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 7.19,
        highPrice: 7.22,
        lowPrice: 7.08,
        lastPrice: 7.09,
        changePercent: -1.8,
        volume: 138899,
        tradedValue: 992260.56,
        tradeCount: 351,
        marketCap: 39704e4
      }
    },
    {
      symbol: "6017",
      nameAr: "\u062C\u0627\u0647\u0632",
      nameEn: "Jahez International Company for Information System Technology",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.95,
        highPrice: 12.15,
        lowPrice: 11.82,
        lastPrice: 11.99,
        changePercent: 0.33,
        volume: 1139833,
        tradedValue: 1368259775e-2,
        tradeCount: 2370,
        marketCap: 25159343594e-1
      }
    },
    {
      symbol: "6018",
      nameAr: "\u0627\u0644\u0623\u0646\u062F\u064A\u0629 \u0644\u0644\u0631\u064A\u0627\u0636\u0629",
      nameEn: "Sport Clubs Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.69,
        highPrice: 6.73,
        lowPrice: 6.61,
        lastPrice: 6.61,
        changePercent: -1.64,
        volume: 1038630,
        tradedValue: 691747294e-2,
        tradeCount: 1660,
        marketCap: 756184e3
      }
    },
    {
      symbol: "6019",
      nameAr: "\u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0634\u0627\u0645\u0644",
      nameEn: "Al Masar Al Shamil Education Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 22.91,
        highPrice: 23.32,
        lowPrice: 22.91,
        lastPrice: 23.1,
        changePercent: 0.43,
        volume: 58798,
        tradedValue: 135867639e-2,
        tradeCount: 427,
        marketCap: 23654707692e-1
      }
    },
    {
      symbol: "4070",
      nameAr: "\u062A\u0647\u0627\u0645\u0629",
      nameEn: "Tihama Advertising, Public Relations and Marketing Co.",
      sectorAr: "\u0627\u0644\u0625\u0639\u0644\u0627\u0645 \u0648\u0627\u0644\u062A\u0631\u0641\u064A\u0647",
      sectorEn: "Media and Entertainment",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 16.94,
        highPrice: 17.25,
        lowPrice: 16.94,
        lastPrice: 17.17,
        changePercent: 0.53,
        volume: 78950,
        tradedValue: 135224488e-2,
        tradeCount: 337,
        marketCap: 39356495371e-2
      }
    },
    {
      symbol: "4071",
      nameAr: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
      nameEn: "Arabian Contracting Services Co.",
      sectorAr: "\u0627\u0644\u0625\u0639\u0644\u0627\u0645 \u0648\u0627\u0644\u062A\u0631\u0641\u064A\u0647",
      sectorEn: "Media and Entertainment",
      warningFlag: null,
      officialQuote: {
        openPrice: 84.55,
        highPrice: 89.4,
        lowPrice: 84.55,
        lastPrice: 85.65,
        changePercent: 0.18,
        volume: 127653,
        tradedValue: 111253218e-1,
        tradeCount: 1482,
        marketCap: 471075e4
      }
    },
    {
      symbol: "4072",
      nameAr: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0625\u0645 \u0628\u064A \u0633\u064A",
      nameEn: "MBC Group Co.",
      sectorAr: "\u0627\u0644\u0625\u0639\u0644\u0627\u0645 \u0648\u0627\u0644\u062A\u0631\u0641\u064A\u0647",
      sectorEn: "Media and Entertainment",
      warningFlag: null,
      officialQuote: {
        openPrice: 21.06,
        highPrice: 21.74,
        lowPrice: 21.06,
        lastPrice: 21.29,
        changePercent: 1.09,
        volume: 208211,
        tradedValue: 446502779e-2,
        tradeCount: 1151,
        marketCap: 7078925e3
      }
    },
    {
      symbol: "4210",
      nameAr: "\u0627\u0644\u0623\u0628\u062D\u0627\u062B \u0648\u0627\u0644\u0625\u0639\u0644\u0627\u0645",
      nameEn: "Saudi Research and Media Group",
      sectorAr: "\u0627\u0644\u0625\u0639\u0644\u0627\u0645 \u0648\u0627\u0644\u062A\u0631\u0641\u064A\u0647",
      sectorEn: "Media and Entertainment",
      warningFlag: null,
      officialQuote: {
        openPrice: 63,
        highPrice: 67.5,
        lowPrice: 62.2,
        lastPrice: 64.75,
        changePercent: 5.46,
        volume: 841287,
        tradedValue: 5522024865e-2,
        tradeCount: 5811,
        marketCap: 518e7
      }
    },
    {
      symbol: "4003",
      nameAr: "\u0625\u0643\u0633\u062A\u0631\u0627",
      nameEn: "United Electronics Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 68.5,
        highPrice: 68.5,
        lowPrice: 67.7,
        lastPrice: 67.7,
        changePercent: -1.31,
        volume: 69214,
        tradedValue: 47073076e-1,
        tradeCount: 1050,
        marketCap: 5416e6
      }
    },
    {
      symbol: "4008",
      nameAr: "\u0633\u0627\u0643\u0648",
      nameEn: "Saudi Company for Hardware",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 22.25,
        highPrice: 22.57,
        lowPrice: 22.23,
        lastPrice: 22.27,
        changePercent: -1.46,
        volume: 49031,
        tradedValue: 10938253e-1,
        tradeCount: 401,
        marketCap: 80172e4
      }
    },
    {
      symbol: "4050",
      nameAr: "\u0633\u0627\u0633\u0643\u0648",
      nameEn: "Saudi Automotive Services Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 41,
        highPrice: 42.1,
        lowPrice: 40.3,
        lastPrice: 40.36,
        changePercent: -0.05,
        volume: 455234,
        tradedValue: 1867527054e-2,
        tradeCount: 2268,
        marketCap: 28252e5
      }
    },
    {
      symbol: "4051",
      nameAr: "\u0628\u0627\u0639\u0638\u064A\u0645",
      nameEn: "Baazeem Trading Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 5.58,
        highPrice: 5.58,
        lowPrice: 5.51,
        lastPrice: 5.52,
        changePercent: -1.08,
        volume: 90019,
        tradedValue: 499070.25,
        tradeCount: 345,
        marketCap: 5589e5
      }
    },
    {
      symbol: "4190",
      nameAr: "\u062C\u0631\u064A\u0631",
      nameEn: "Jarir Marketing Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 17,
        highPrice: 17.13,
        lowPrice: 16.7,
        lastPrice: 16.91,
        changePercent: -1.28,
        volume: 2473291,
        tradedValue: 4165593326e-2,
        tradeCount: 4987,
        marketCap: 20292e6
      }
    },
    {
      symbol: "4191",
      nameAr: "\u0623\u0628\u0648 \u0645\u0639\u0637\u064A",
      nameEn: "Abdullah Saad Mohammed Abo Moati for Bookstores Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 44,
        highPrice: 44.9,
        lowPrice: 39.64,
        lastPrice: 41.02,
        changePercent: -6.69,
        volume: 1398066,
        tradedValue: 585075986e-1,
        tradeCount: 4494,
        marketCap: 8204e5
      }
    },
    {
      symbol: "4192",
      nameAr: "\u0627\u0644\u0633\u064A\u0641 \u063A\u0627\u0644\u064A\u0631\u064A",
      nameEn: "AlSaif Stores for Development and Investment Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.57,
        highPrice: 6.59,
        lowPrice: 6.5,
        lastPrice: 6.5,
        changePercent: -1.07,
        volume: 50423,
        tradedValue: 329246.56,
        tradeCount: 242,
        marketCap: 2275e6
      }
    },
    {
      symbol: "4193",
      nameAr: "\u0646\u0627\u064A\u0633 \u0648\u0646",
      nameEn: "Nice One Beauty Digital Marketing Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 12.64,
        highPrice: 12.75,
        lowPrice: 12.41,
        lastPrice: 12.42,
        changePercent: -1.74,
        volume: 571507,
        tradedValue: 717119198e-2,
        tradeCount: 1698,
        marketCap: 143451e4
      }
    },
    {
      symbol: "4194",
      nameAr: "\u0645\u062D\u0637\u0629 \u0627\u0644\u0628\u0646\u0627\u0621",
      nameEn: "Marketing Home Group for Trading Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 42.9,
        highPrice: 42.98,
        lowPrice: 42.4,
        lastPrice: 42.4,
        changePercent: -1.17,
        volume: 37435,
        tradedValue: 15989742e-1,
        tradeCount: 553,
        marketCap: 6784e5
      }
    },
    {
      symbol: "4200",
      nameAr: "\u0627\u0644\u062F\u0631\u064A\u0633",
      nameEn: "Aldrees Petroleum and Transport Services Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 113.1,
        highPrice: 118,
        lowPrice: 112.9,
        lastPrice: 114.1,
        changePercent: 6.34,
        volume: 1128209,
        tradedValue: 1297363613e-1,
        tradeCount: 6950,
        marketCap: 1141e7
      }
    },
    {
      symbol: "4240",
      nameAr: "\u0633\u064A\u0646\u0648\u0645\u064A \u0631\u064A\u062A\u064A\u0644",
      nameEn: "AFG International Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: "red",
      officialQuote: {
        openPrice: 12.3,
        highPrice: 12.41,
        lowPrice: 12.22,
        lastPrice: 12.36,
        changePercent: 0.49,
        volume: 388549,
        tradedValue: 479356814e-2,
        tradeCount: 1181,
        marketCap: 141851329728e-2
      }
    },
    {
      symbol: "4001",
      nameAr: "\u0623\u0633\u0648\u0627\u0642 \u0639 \u0627\u0644\u0639\u062B\u064A\u0645",
      nameEn: "Abdullah Al Othaim Markets Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Staples Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 5.25,
        highPrice: 5.25,
        lowPrice: 5.19,
        lastPrice: 5.21,
        changePercent: -0.76,
        volume: 671256,
        tradedValue: 350326238e-2,
        tradeCount: 1598,
        marketCap: 4689e6
      }
    },
    {
      symbol: "4006",
      nameAr: "\u0623\u0633\u0648\u0627\u0642 \u0627\u0644\u0645\u0632\u0631\u0639\u0629",
      nameEn: "Saudi Marketing Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Staples Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 12.8,
        highPrice: 12.85,
        lowPrice: 12.71,
        lastPrice: 12.85,
        changePercent: 0.47,
        volume: 19301,
        tradedValue: 246660.73,
        tradeCount: 176,
        marketCap: 57825e4
      }
    },
    {
      symbol: "4061",
      nameAr: "\u0623\u0646\u0639\u0627\u0645 \u0627\u0644\u0642\u0627\u0628\u0636\u0629",
      nameEn: "Anaam International Holding Group",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Staples Distribution & Retail",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 11.63,
        highPrice: 11.98,
        lowPrice: 11.45,
        lastPrice: 11.5,
        changePercent: -1.12,
        volume: 382647,
        tradedValue: 448592617e-2,
        tradeCount: 1357,
        marketCap: 36225e4
      }
    },
    {
      symbol: "4160",
      nameAr: "\u062B\u0645\u0627\u0631",
      nameEn: "Thimar Development Holding Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Staples Distribution & Retail",
      warningFlag: "red",
      officialQuote: {
        openPrice: 33.98,
        highPrice: 35.46,
        lowPrice: 33.8,
        lastPrice: 33.96,
        changePercent: 0.47,
        volume: 267269,
        tradedValue: 924911194e-2,
        tradeCount: 2084,
        marketCap: 22074e4
      }
    },
    {
      symbol: "4161",
      nameAr: "\u0628\u0646 \u062F\u0627\u0648\u062F",
      nameEn: "BinDawood Holding Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Staples Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 4.66,
        highPrice: 4.67,
        lowPrice: 4.61,
        lastPrice: 4.63,
        changePercent: -0.64,
        volume: 231428,
        tradedValue: 107357512e-2,
        tradeCount: 545,
        marketCap: 529209e4
      }
    },
    {
      symbol: "4162",
      nameAr: "\u0627\u0644\u0645\u0646\u062C\u0645",
      nameEn: "Almunajem Foods Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Staples Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 61.1,
        highPrice: 61.75,
        lowPrice: 60.95,
        lastPrice: 61.75,
        changePercent: 0.82,
        volume: 54617,
        tradedValue: 334183925e-2,
        tradeCount: 594,
        marketCap: 3705e6
      }
    },
    {
      symbol: "4163",
      nameAr: "\u0627\u0644\u062F\u0648\u0627\u0621",
      nameEn: "Aldawaa Medical Services Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Staples Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 41,
        highPrice: 41,
        lowPrice: 40.36,
        lastPrice: 40.36,
        changePercent: -1.32,
        volume: 81097,
        tradedValue: 329633512e-2,
        tradeCount: 856,
        marketCap: 34306e5
      }
    },
    {
      symbol: "4164",
      nameAr: "\u0627\u0644\u0646\u0647\u062F\u064A",
      nameEn: "Nahdi Medical Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Staples Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 90.15,
        highPrice: 91.85,
        lowPrice: 90,
        lastPrice: 91.2,
        changePercent: 1.33,
        volume: 138056,
        tradedValue: 1257920555e-2,
        tradeCount: 1135,
        marketCap: 11856e6
      }
    },
    {
      symbol: "2050",
      nameAr: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0635\u0627\u0641\u0648\u0644\u0627",
      nameEn: "Savola Group",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 26.1,
        highPrice: 26.24,
        lowPrice: 25.94,
        lastPrice: 26.1,
        changePercent: -0.38,
        volume: 543985,
        tradedValue: 1416409252e-2,
        tradeCount: 2773,
        marketCap: 783e7
      }
    },
    {
      symbol: "2100",
      nameAr: "\u0648\u0641\u0631\u0629",
      nameEn: "Wafrah for Industry and Development Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 21.45,
        highPrice: 22.31,
        lowPrice: 21.33,
        lastPrice: 21.33,
        changePercent: -0.33,
        volume: 368554,
        tradedValue: 80568743e-1,
        tradeCount: 1627,
        marketCap: 49381306965e-2
      }
    },
    {
      symbol: "2270",
      nameAr: "\u0633\u062F\u0627\u0641\u0643\u0648",
      nameEn: "Saudia Dairy and Foodstuff Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 212,
        highPrice: 213.2,
        lowPrice: 206.9,
        lastPrice: 207.5,
        changePercent: -1.89,
        volume: 19906,
        tradedValue: 41664232e-1,
        tradeCount: 847,
        marketCap: 674375e4
      }
    },
    {
      symbol: "2280",
      nameAr: "\u0627\u0644\u0645\u0631\u0627\u0639\u064A",
      nameEn: "Almarai Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 46.2,
        highPrice: 46.34,
        lowPrice: 45.76,
        lastPrice: 45.94,
        changePercent: -1.16,
        volume: 249802,
        tradedValue: 1149082766e-2,
        tradeCount: 1559,
        marketCap: 4594e7
      }
    },
    {
      symbol: "2281",
      nameAr: "\u062A\u0646\u0645\u064A\u0629",
      nameEn: "Tanmiah Food Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 60.15,
        highPrice: 60.45,
        lowPrice: 59.05,
        lastPrice: 59.35,
        changePercent: -1.33,
        volume: 77566,
        tradedValue: 46325675e-1,
        tradeCount: 795,
        marketCap: 1187e6
      }
    },
    {
      symbol: "2282",
      nameAr: "\u0646\u0642\u064A",
      nameEn: "Naqi Water Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 55.3,
        highPrice: 56.4,
        lowPrice: 55,
        lastPrice: 56.4,
        changePercent: 1.44,
        volume: 24307,
        tradedValue: 135203785e-2,
        tradeCount: 321,
        marketCap: 1128e6
      }
    },
    {
      symbol: "2283",
      nameAr: "\u0627\u0644\u0645\u0637\u0627\u062D\u0646 \u0627\u0644\u0623\u0648\u0644\u0649",
      nameEn: "First Milling Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 51.65,
        highPrice: 52,
        lowPrice: 51.5,
        lastPrice: 51.55,
        changePercent: -0.39,
        volume: 16331,
        tradedValue: 844847.9,
        tradeCount: 306,
        marketCap: 2861025e3
      }
    },
    {
      symbol: "2284",
      nameAr: "\u0627\u0644\u0645\u0637\u0627\u062D\u0646 \u0627\u0644\u062D\u062F\u064A\u062B\u0629",
      nameEn: "Modern Mills for Food Products Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 28.38,
        highPrice: 28.6,
        lowPrice: 28.34,
        lastPrice: 28.42,
        changePercent: 0.14,
        volume: 38908,
        tradedValue: 110773802e-2,
        tradeCount: 582,
        marketCap: 2325665440
      }
    },
    {
      symbol: "2285",
      nameAr: "\u0627\u0644\u0645\u0637\u0627\u062D\u0646 \u0627\u0644\u0639\u0631\u0628\u064A\u0629",
      nameEn: "Arabian Mills for Food Products Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 45.86,
        highPrice: 46.26,
        lowPrice: 45.84,
        lastPrice: 46.08,
        changePercent: -0.39,
        volume: 30547,
        tradedValue: 140657282e-2,
        tradeCount: 556,
        marketCap: 236459547648e-2
      }
    },
    {
      symbol: "2286",
      nameAr: "\u0627\u0644\u0645\u0637\u0627\u062D\u0646 \u0627\u0644\u0631\u0627\u0628\u0639\u0629",
      nameEn: "Fourth Milling Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 4.08,
        highPrice: 4.08,
        lowPrice: 4.05,
        lastPrice: 4.08,
        changePercent: 0,
        volume: 304846,
        tradedValue: 123900177e-2,
        tradeCount: 641,
        marketCap: 22032e5
      }
    },
    {
      symbol: "2287",
      nameAr: "\u0625\u0646\u062A\u0627\u062C",
      nameEn: "Arabian Company for Agricultural and Industrial Investment",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 27.5,
        highPrice: 27.68,
        lowPrice: 26.98,
        lastPrice: 27,
        changePercent: -1.24,
        volume: 224039,
        tradedValue: 609358222e-2,
        tradeCount: 1263,
        marketCap: 81e7
      }
    },
    {
      symbol: "2288",
      nameAr: "\u0646\u0641\u0648\u0630",
      nameEn: "Nofoth Food Products Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.59,
        highPrice: 6.61,
        lowPrice: 6.39,
        lastPrice: 6.43,
        changePercent: -1.53,
        volume: 115326,
        tradedValue: 742091.56,
        tradeCount: 345,
        marketCap: 61728e4
      }
    },
    {
      symbol: "4080",
      nameAr: "\u0633\u0646\u0627\u062F \u0627\u0644\u0642\u0627\u0628\u0636\u0629",
      nameEn: "Sinad Holding Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 8.37,
        highPrice: 8.37,
        lowPrice: 8.21,
        lastPrice: 8.22,
        changePercent: -0.96,
        volume: 72811,
        tradedValue: 600493.83,
        tradeCount: 421,
        marketCap: 103891666758e-2
      }
    },
    {
      symbol: "6001",
      nameAr: "\u062D\u0644\u0648\u0627\u0646\u064A \u0625\u062E\u0648\u0627\u0646",
      nameEn: "Halwani Bros. Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 31,
        highPrice: 31.5,
        lowPrice: 31,
        lastPrice: 31.4,
        changePercent: 1.49,
        volume: 25461,
        tradedValue: 795331.46,
        tradeCount: 231,
        marketCap: 1110214353
      }
    },
    {
      symbol: "6010",
      nameAr: "\u0646\u0627\u062F\u0643",
      nameEn: "National Agricultural Development Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 14.8,
        highPrice: 14.96,
        lowPrice: 14.5,
        lastPrice: 14.52,
        changePercent: -2.35,
        volume: 868971,
        tradedValue: 127983095e-1,
        tradeCount: 2760,
        marketCap: 4379812800
      }
    },
    {
      symbol: "6020",
      nameAr: "\u062C\u0627\u0643\u0648",
      nameEn: "Al Gassim Investment Holding Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 12.3,
        highPrice: 12.41,
        lowPrice: 12,
        lastPrice: 12.06,
        changePercent: -1.95,
        volume: 85569,
        tradedValue: 104584806e-2,
        tradeCount: 285,
        marketCap: 3618e5
      }
    },
    {
      symbol: "6040",
      nameAr: "\u062A\u0628\u0648\u0643 \u0627\u0644\u0632\u0631\u0627\u0639\u064A\u0629",
      nameEn: "Tabuk Agricultural Development Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: "red",
      officialQuote: {
        openPrice: 7,
        highPrice: 7.2,
        lowPrice: 6.7,
        lastPrice: 6.77,
        changePercent: -3.29,
        volume: 580037,
        tradedValue: 405698534e-2,
        tradeCount: 1506,
        marketCap: 265226259
      }
    },
    {
      symbol: "6050",
      nameAr: "\u0627\u0644\u0623\u0633\u0645\u0627\u0643",
      nameEn: "Saudi Fisheries Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 65.8,
        highPrice: 71.1,
        lowPrice: 64.9,
        lastPrice: 67.5,
        changePercent: 3.85,
        volume: 1324411,
        tradedValue: 9086524425e-2,
        tradeCount: 8091,
        marketCap: 452155770
      }
    },
    {
      symbol: "6060",
      nameAr: "\u0627\u0644\u0634\u0631\u0642\u064A\u0629 \u0644\u0644\u062A\u0646\u0645\u064A\u0629",
      nameEn: "Ash-Sharqiyah Development Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 14.8,
        highPrice: 15.48,
        lowPrice: 14.75,
        lastPrice: 14.82,
        changePercent: 0.47,
        volume: 1258461,
        tradedValue: 1903016119e-2,
        tradeCount: 2406,
        marketCap: 4446e5
      }
    },
    {
      symbol: "6070",
      nameAr: "\u0627\u0644\u062C\u0648\u0641",
      nameEn: "Al-Jouf Agricultural Development Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 41.3,
        highPrice: 41.86,
        lowPrice: 41.3,
        lastPrice: 41.76,
        changePercent: 1.21,
        volume: 48391,
        tradedValue: 201658902e-2,
        tradeCount: 221,
        marketCap: 12528e5
      }
    },
    {
      symbol: "6090",
      nameAr: "\u062C\u0627\u0632\u0627\u062F\u0643\u0648",
      nameEn: "Jazan Development and Investment Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 8.02,
        highPrice: 8.17,
        lowPrice: 8,
        lastPrice: 8,
        changePercent: -1.6,
        volume: 71853,
        tradedValue: 579598.43,
        tradeCount: 229,
        marketCap: 4e8
      }
    },
    {
      symbol: "4165",
      nameAr: "\u0627\u0644\u0645\u0627\u062C\u062F \u0644\u0644\u0639\u0648\u062F",
      nameEn: "Al Majed Oud Co.",
      sectorAr: "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0645\u0646\u0632\u0644\u064A\u0629 \u0648\u0627\u0644\u0634\u062E\u0635\u064A\u0629",
      sectorEn: "Household & Personal Products",
      warningFlag: null,
      officialQuote: {
        openPrice: 118,
        highPrice: 120.9,
        lowPrice: 118,
        lastPrice: 120.9,
        changePercent: 2.28,
        volume: 55361,
        tradedValue: 66466324e-1,
        tradeCount: 814,
        marketCap: 30225e5
      }
    },
    {
      symbol: "2140",
      nameAr: "\u0623\u064A\u0627\u0646",
      nameEn: "AYYAN Investment Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.5,
        highPrice: 10.5,
        lowPrice: 10.27,
        lastPrice: 10.3,
        changePercent: -1.9,
        volume: 172322,
        tradedValue: 178217896e-2,
        tradeCount: 412,
        marketCap: 10365541784e-1
      }
    },
    {
      symbol: "2230",
      nameAr: "\u0627\u0644\u0643\u064A\u0645\u064A\u0627\u0626\u064A\u0629",
      nameEn: "Saudi Chemical Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 8.44,
        highPrice: 8.49,
        lowPrice: 8.25,
        lastPrice: 8.26,
        changePercent: -2.13,
        volume: 2844808,
        tradedValue: 2381329313e-2,
        tradeCount: 2215,
        marketCap: 6964832e3
      }
    },
    {
      symbol: "4002",
      nameAr: "\u0627\u0644\u0645\u0648\u0627\u0633\u0627\u0629",
      nameEn: "Mouwasat Medical Services Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 60.5,
        highPrice: 60.5,
        lowPrice: 59.45,
        lastPrice: 59.65,
        changePercent: -1.4,
        volume: 314037,
        tradedValue: 1875550505e-2,
        tradeCount: 2438,
        marketCap: 1193e7
      }
    },
    {
      symbol: "4004",
      nameAr: "\u062F\u0644\u0647 \u0627\u0644\u0635\u062D\u064A\u0629",
      nameEn: "Dallah Healthcare Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 104.5,
        highPrice: 106,
        lowPrice: 104.1,
        lastPrice: 105,
        changePercent: 0.48,
        volume: 59296,
        tradedValue: 62318097e-1,
        tradeCount: 959,
        marketCap: 10665350745
      }
    },
    {
      symbol: "4005",
      nameAr: "\u0631\u0639\u0627\u064A\u0629",
      nameEn: "National Medical Care Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 102.3,
        highPrice: 107.1,
        lowPrice: 102.3,
        lastPrice: 103.4,
        changePercent: 0.68,
        volume: 152075,
        tradedValue: 159404417e-1,
        tradeCount: 2246,
        marketCap: 463749e4
      }
    },
    {
      symbol: "4007",
      nameAr: "\u0627\u0644\u062D\u0645\u0627\u062F\u064A",
      nameEn: "Al Hammadi Holding",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 26.68,
        highPrice: 26.86,
        lowPrice: 26.44,
        lastPrice: 26.6,
        changePercent: 0,
        volume: 103353,
        tradedValue: 275934064e-2,
        tradeCount: 449,
        marketCap: 4256e6
      }
    },
    {
      symbol: "4009",
      nameAr: "\u0627\u0644\u0633\u0639\u0648\u062F\u064A \u0627\u0644\u0623\u0644\u0645\u0627\u0646\u064A \u0627\u0644\u0635\u062D\u064A\u0629",
      nameEn: "Middle East Healthcare Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 30.5,
        highPrice: 30.64,
        lowPrice: 30.18,
        lastPrice: 30.46,
        changePercent: -0.13,
        volume: 245500,
        tradedValue: 74797196e-1,
        tradeCount: 980,
        marketCap: 2803538400
      }
    },
    {
      symbol: "4013",
      nameAr: "\u0633\u0644\u064A\u0645\u0627\u0646 \u0627\u0644\u062D\u0628\u064A\u0628",
      nameEn: "Dr. Sulaiman Al Habib Medical Services Group",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 215.3,
        highPrice: 215.9,
        lowPrice: 214,
        lastPrice: 214.7,
        changePercent: -0.28,
        volume: 62475,
        tradedValue: 134011015e-1,
        tradeCount: 1119,
        marketCap: 75145e6
      }
    },
    {
      symbol: "4014",
      nameAr: "\u062F\u0627\u0631 \u0627\u0644\u0645\u0639\u062F\u0627\u062A",
      nameEn: "Scientific and Medical Equipment House Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 27.84,
        highPrice: 27.88,
        lowPrice: 27.3,
        lastPrice: 27.38,
        changePercent: -1.65,
        volume: 21640,
        tradedValue: 598249.76,
        tradeCount: 273,
        marketCap: 8214e5
      }
    },
    {
      symbol: "4017",
      nameAr: "\u0641\u0642\u064A\u0647 \u0627\u0644\u0637\u0628\u064A\u0629",
      nameEn: "Dr. Soliman Abdel Kader Fakeeh Hospital Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 34.36,
        highPrice: 36,
        lowPrice: 34.08,
        lastPrice: 34.68,
        changePercent: 0.99,
        volume: 86971,
        tradedValue: 301143038e-2,
        tradeCount: 1196,
        marketCap: 804576e4
      }
    },
    {
      symbol: "4018",
      nameAr: "\u0627\u0644\u0645\u0648\u0633\u0649",
      nameEn: "Almoosa Health Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 115.8,
        highPrice: 117.8,
        lowPrice: 115.7,
        lastPrice: 116.9,
        changePercent: 1.21,
        volume: 8471,
        tradedValue: 989414.5,
        tradeCount: 331,
        marketCap: 5179088502
      }
    },
    {
      symbol: "4019",
      nameAr: "\u0627\u0633 \u0627\u0645 \u0633\u064A \u0644\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      nameEn: "Specialized Medical Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 15.56,
        highPrice: 15.88,
        lowPrice: 15.56,
        lastPrice: 15.61,
        changePercent: 0.32,
        volume: 348862,
        tradedValue: 545775392e-2,
        tradeCount: 810,
        marketCap: 39025e5
      }
    },
    {
      symbol: "4021",
      nameAr: "\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u0643\u0646\u062F\u064A \u0627\u0644\u0637\u0628\u064A",
      nameEn: "Canadian Medical Center Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 5.36,
        highPrice: 5.38,
        lowPrice: 5.25,
        lastPrice: 5.26,
        changePercent: -1.68,
        volume: 547096,
        tradedValue: 290031072e-2,
        tradeCount: 805,
        marketCap: 40502e4
      }
    },
    {
      symbol: "2070",
      nameAr: "\u0627\u0644\u062F\u0648\u0627\u0626\u064A\u0629",
      nameEn: "Saudi Pharmaceutical Industries and Medical Appliances Corp.",
      sectorAr: "\u0627\u0644\u0623\u062F\u0648\u064A\u0629 \u0648\u0627\u0644\u062A\u0642\u0646\u064A\u0627\u062A \u0627\u0644\u062D\u064A\u0648\u064A\u0629 \u0648\u0639\u0644\u0648\u0645 \u0627\u0644\u062D\u064A\u0627\u0629",
      sectorEn: "Pharma, Biotech & Life Science",
      warningFlag: null,
      officialQuote: {
        openPrice: 29.2,
        highPrice: 29.56,
        lowPrice: 29.12,
        lastPrice: 29.42,
        changePercent: 0.2,
        volume: 12169383,
        tradedValue: 33137719666e-2,
        tradeCount: 1313,
        marketCap: 35304e5
      }
    },
    {
      symbol: "4015",
      nameAr: "\u062C\u0645\u062C\u0648\u0645 \u0641\u0627\u0631\u0645\u0627",
      nameEn: "Jamjoom Pharmaceuticals Factory Co.",
      sectorAr: "\u0627\u0644\u0623\u062F\u0648\u064A\u0629 \u0648\u0627\u0644\u062A\u0642\u0646\u064A\u0627\u062A \u0627\u0644\u062D\u064A\u0648\u064A\u0629 \u0648\u0639\u0644\u0648\u0645 \u0627\u0644\u062D\u064A\u0627\u0629",
      sectorEn: "Pharma, Biotech & Life Science",
      warningFlag: null,
      officialQuote: {
        openPrice: 147,
        highPrice: 147.2,
        lowPrice: 145.8,
        lastPrice: 147.1,
        changePercent: 0.07,
        volume: 27180,
        tradedValue: 39870088e-1,
        tradeCount: 681,
        marketCap: 10297e6
      }
    },
    {
      symbol: "4016",
      nameAr: "\u0623\u0641\u0627\u0644\u0648\u0646 \u0641\u0627\u0631\u0645\u0627",
      nameEn: "Middle East Pharmaceutical Industries Co.",
      sectorAr: "\u0627\u0644\u0623\u062F\u0648\u064A\u0629 \u0648\u0627\u0644\u062A\u0642\u0646\u064A\u0627\u062A \u0627\u0644\u062D\u064A\u0648\u064A\u0629 \u0648\u0639\u0644\u0648\u0645 \u0627\u0644\u062D\u064A\u0627\u0629",
      sectorEn: "Pharma, Biotech & Life Science",
      warningFlag: null,
      officialQuote: {
        openPrice: 60.55,
        highPrice: 60.8,
        lowPrice: 59.75,
        lastPrice: 59.75,
        changePercent: -1.32,
        volume: 37356,
        tradedValue: 22455451e-1,
        tradeCount: 589,
        marketCap: 209125e4
      }
    },
    {
      symbol: "1010",
      nameAr: "\u0627\u0644\u0631\u064A\u0627\u0636",
      nameEn: "Riyad Bank",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 21.17,
        highPrice: 21.29,
        lowPrice: 20.82,
        lastPrice: 20.9,
        changePercent: -0.81,
        volume: 5543647,
        tradedValue: 11677878613e-2,
        tradeCount: 5861,
        marketCap: 836e8
      }
    },
    {
      symbol: "1020",
      nameAr: "\u0627\u0644\u062C\u0632\u064A\u0631\u0629",
      nameEn: "Bank Aljazira",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.82,
        highPrice: 11.89,
        lowPrice: 11.73,
        lastPrice: 11.74,
        changePercent: -0.68,
        volume: 1589944,
        tradedValue: 18778146,
        tradeCount: 2676,
        marketCap: 15041875e3
      }
    },
    {
      symbol: "1030",
      nameAr: "\u0627\u0644\u0625\u0633\u062A\u062B\u0645\u0627\u0631",
      nameEn: "Saudi Investment Bank",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.65,
        highPrice: 13.75,
        lowPrice: 13.58,
        lastPrice: 13.7,
        changePercent: 0.37,
        volume: 485345,
        tradedValue: 663725225e-2,
        tradeCount: 1192,
        marketCap: 17125e6
      }
    },
    {
      symbol: "1050",
      nameAr: "\u0628\u064A \u0627\u0633 \u0627\u0641",
      nameEn: "Banque Saudi Fransi",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 20.15,
        highPrice: 20.59,
        lowPrice: 19.99,
        lastPrice: 20.48,
        changePercent: 2.14,
        volume: 1953429,
        tradedValue: 3986495314e-2,
        tradeCount: 3989,
        marketCap: 512e8
      }
    },
    {
      symbol: "1060",
      nameAr: "\u0627\u0644\u0623\u0648\u0644",
      nameEn: "Saudi Awwal Bank",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 32.66,
        highPrice: 32.84,
        lowPrice: 32.26,
        lastPrice: 32.3,
        changePercent: -0.8,
        volume: 1796821,
        tradedValue: 583920415e-1,
        tradeCount: 3026,
        marketCap: 663698630606e-1
      }
    },
    {
      symbol: "1080",
      nameAr: "\u0627\u0644\u0639\u0631\u0628\u064A",
      nameEn: "Arab National Bank",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 21.73,
        highPrice: 21.88,
        lowPrice: 21.5,
        lastPrice: 21.73,
        changePercent: 0.09,
        volume: 1735317,
        tradedValue: 3764856451e-2,
        tradeCount: 2929,
        marketCap: 4346e7
      }
    },
    {
      symbol: "1120",
      nameAr: "\u0627\u0644\u0631\u0627\u062C\u062D\u064A",
      nameEn: "Al Rajhi Bank",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 65.4,
        highPrice: 65.5,
        lowPrice: 63.8,
        lastPrice: 64,
        changePercent: -1.84,
        volume: 7166583,
        tradedValue: 46045328605e-2,
        tradeCount: 14872,
        marketCap: 384e9
      }
    },
    {
      symbol: "1140",
      nameAr: "\u0627\u0644\u0628\u0644\u0627\u062F",
      nameEn: "Bank Albilad",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 24.6,
        highPrice: 24.7,
        lowPrice: 24.28,
        lastPrice: 24.4,
        changePercent: -0.37,
        volume: 1667366,
        tradedValue: 4079812614e-2,
        tradeCount: 3148,
        marketCap: 366e8
      }
    },
    {
      symbol: "1150",
      nameAr: "\u0627\u0644\u0625\u0646\u0645\u0627\u0621",
      nameEn: "Alinma Bank",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 24.28,
        highPrice: 24.3,
        lowPrice: 23.51,
        lastPrice: 23.51,
        changePercent: -4.43,
        volume: 14102845,
        tradedValue: 33460454411e-2,
        tradeCount: 19548,
        marketCap: 7053e7
      }
    },
    {
      symbol: "1180",
      nameAr: "\u0627\u0644\u0623\u0647\u0644\u064A",
      nameEn: "The Saudi National Bank",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 38.96,
        highPrice: 39.36,
        lowPrice: 38.52,
        lastPrice: 38.8,
        changePercent: 0.62,
        volume: 8038675,
        tradedValue: 31279773748e-2,
        tradeCount: 8523,
        marketCap: 2328e8
      }
    },
    {
      symbol: "1111",
      nameAr: "\u0645\u062C\u0645\u0648\u0639\u0629 \u062A\u062F\u0627\u0648\u0644",
      nameEn: "Saudi Tadawul Group Holding Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 123.9,
        highPrice: 124.5,
        lowPrice: 121.9,
        lastPrice: 123.5,
        changePercent: -0.16,
        volume: 185289,
        tradedValue: 227852905e-1,
        tradeCount: 1730,
        marketCap: 1482e7
      }
    },
    {
      symbol: "1182",
      nameAr: "\u0623\u0645\u0644\u0627\u0643",
      nameEn: "Amlak International Finance Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 8.39,
        highPrice: 8.45,
        lowPrice: 8.35,
        lastPrice: 8.4,
        changePercent: 0.12,
        volume: 128294,
        tradedValue: 107829731e-2,
        tradeCount: 560,
        marketCap: 85617e4
      }
    },
    {
      symbol: "1183",
      nameAr: "\u0633\u0647\u0644",
      nameEn: "SHL Finance Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 14.8,
        highPrice: 14.97,
        lowPrice: 14.58,
        lastPrice: 14.58,
        changePercent: -1.15,
        volume: 28264,
        tradedValue: 416308.75,
        tradeCount: 301,
        marketCap: 1458e6
      }
    },
    {
      symbol: "2120",
      nameAr: "\u0645\u062A\u0637\u0648\u0631\u0629",
      nameEn: "Saudi Advanced Industries Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 16.22,
        highPrice: 16.22,
        lowPrice: 15.6,
        lastPrice: 15.65,
        changePercent: -3.51,
        volume: 270687,
        tradedValue: 431402014e-2,
        tradeCount: 787,
        marketCap: 939e6
      }
    },
    {
      symbol: "4081",
      nameAr: "\u0627\u0644\u0646\u0627\u064A\u0641\u0627\u062A",
      nameEn: "Nayifat Finance Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 9.56,
        highPrice: 9.58,
        lowPrice: 9.39,
        lastPrice: 9.4,
        changePercent: -1.78,
        volume: 127355,
        tradedValue: 120854268e-2,
        tradeCount: 507,
        marketCap: 1128e6
      }
    },
    {
      symbol: "4082",
      nameAr: "\u0645\u0631\u0646\u0629",
      nameEn: "Morabaha Marina Financing Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 7.63,
        highPrice: 7.72,
        lowPrice: 7.5,
        lastPrice: 7.5,
        changePercent: -3.23,
        volume: 24098,
        tradedValue: 182824.92,
        tradeCount: 211,
        marketCap: 535714290
      }
    },
    {
      symbol: "4083",
      nameAr: "\u062A\u0633\u0647\u064A\u0644",
      nameEn: "United International Holding Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 29.62,
        highPrice: 29.72,
        lowPrice: 29.18,
        lastPrice: 29.18,
        changePercent: -1.55,
        volume: 204067,
        tradedValue: 599621738e-2,
        tradeCount: 1022,
        marketCap: 21885e5
      }
    },
    {
      symbol: "4084",
      nameAr: "\u062F\u0631\u0627\u064A\u0629",
      nameEn: "Derayah Financial Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 21.93,
        highPrice: 22.16,
        lowPrice: 21.93,
        lastPrice: 22.1,
        changePercent: 0.27,
        volume: 438101,
        tradedValue: 967709392e-2,
        tradeCount: 931,
        marketCap: 55191478095e-1
      }
    },
    {
      symbol: "4130",
      nameAr: "\u062F\u0631\u0628 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Saudi Darb Investment Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 2.19,
        highPrice: 2.23,
        lowPrice: 2.14,
        lastPrice: 2.15,
        changePercent: -1.38,
        volume: 11440568,
        tradedValue: 2496448587e-2,
        tradeCount: 2912,
        marketCap: 469334250
      }
    },
    {
      symbol: "4280",
      nameAr: "\u0627\u0644\u0645\u0645\u0644\u0643\u0629",
      nameEn: "Kingdom Holding Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.29,
        highPrice: 11.3,
        lowPrice: 11.12,
        lastPrice: 11.26,
        changePercent: 0.36,
        volume: 506429,
        tradedValue: 568029735e-2,
        tradeCount: 1015,
        marketCap: 41728234698
      }
    },
    {
      symbol: "8010",
      nameAr: "\u0627\u0644\u062A\u0639\u0627\u0648\u0646\u064A\u0629",
      nameEn: "The Company for Cooperative Insurance",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 138,
        highPrice: 139.2,
        lowPrice: 137.1,
        lastPrice: 138.7,
        changePercent: 0.95,
        volume: 116773,
        tradedValue: 16159604,
        tradeCount: 1327,
        marketCap: 20805e6
      }
    },
    {
      symbol: "8012",
      nameAr: "\u062C\u0632\u064A\u0631\u0629 \u062A\u0643\u0627\u0641\u0644",
      nameEn: "Aljazira Takaful Taawuni Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.95,
        highPrice: 12.08,
        lowPrice: 11.87,
        lastPrice: 12.08,
        changePercent: -0.08,
        volume: 49282,
        tradedValue: 590768,
        tradeCount: 312,
        marketCap: 79728e4
      }
    },
    {
      symbol: "8020",
      nameAr: "\u0645\u0644\u0627\u0630 \u0644\u0644\u062A\u0623\u0645\u064A\u0646",
      nameEn: "Malath Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.35,
        highPrice: 10.41,
        lowPrice: 10.2,
        lastPrice: 10.31,
        changePercent: -0.1,
        volume: 127951,
        tradedValue: 131616162e-2,
        tradeCount: 263,
        marketCap: 5155e5
      }
    },
    {
      symbol: "8030",
      nameAr: "\u0645\u064A\u062F\u063A\u0644\u0641 \u0644\u0644\u062A\u0623\u0645\u064A\u0646",
      nameEn: "The Mediterranean and Gulf Insurance and Reinsurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 15.14,
        highPrice: 15.44,
        lowPrice: 15.12,
        lastPrice: 15.17,
        changePercent: -0.46,
        volume: 380409,
        tradedValue: 578932045e-2,
        tradeCount: 866,
        marketCap: 209585525198e-2
      }
    },
    {
      symbol: "8040",
      nameAr: "\u0645\u062A\u0643\u0627\u0645\u0644\u0629",
      nameEn: "Mutakamela Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.4,
        highPrice: 13.89,
        lowPrice: 12.68,
        lastPrice: 13.5,
        changePercent: 0.75,
        volume: 965807,
        tradedValue: 1270408236e-2,
        tradeCount: 2387,
        marketCap: 81e7
      }
    },
    {
      symbol: "8050",
      nameAr: "\u0633\u0644\u0627\u0645\u0629",
      nameEn: "Salama Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 8.73,
        highPrice: 8.78,
        lowPrice: 8.6,
        lastPrice: 8.62,
        changePercent: -1.37,
        volume: 123995,
        tradedValue: 107721253e-2,
        tradeCount: 327,
        marketCap: 2586e5
      }
    },
    {
      symbol: "8060",
      nameAr: "\u0648\u0644\u0627\u0621",
      nameEn: "Walaa Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 9.94,
        highPrice: 10.02,
        lowPrice: 9.9,
        lastPrice: 9.93,
        changePercent: -0.1,
        volume: 271647,
        tradedValue: 270510116e-2,
        tradeCount: 554,
        marketCap: 126665416725e-2
      }
    },
    {
      symbol: "8070",
      nameAr: "\u0627\u0644\u062F\u0631\u0639 \u0627\u0644\u0639\u0631\u0628\u064A",
      nameEn: "Arabian Shield Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.95,
        highPrice: 11.95,
        lowPrice: 11.76,
        lastPrice: 11.82,
        changePercent: -0.84,
        volume: 74755,
        tradedValue: 885744.81,
        tradeCount: 264,
        marketCap: 9434167869e-1
      }
    },
    {
      symbol: "8100",
      nameAr: "\u0633\u0627\u064A\u0643\u0648",
      nameEn: "Saudi Arabian Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.4,
        highPrice: 10.72,
        lowPrice: 10.33,
        lastPrice: 10.52,
        changePercent: 0.77,
        volume: 231505,
        tradedValue: 242894763e-2,
        tradeCount: 892,
        marketCap: 3156e5
      }
    },
    {
      symbol: "8120",
      nameAr: "\u0625\u062A\u062D\u0627\u062F \u0627\u0644\u062E\u0644\u064A\u062C \u0627\u0644\u0623\u0647\u0644\u064A\u0629",
      nameEn: "Gulf Union Alahlia Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 14.12,
        highPrice: 14.26,
        lowPrice: 14.07,
        lastPrice: 14.22,
        changePercent: 0.71,
        volume: 61460,
        tradedValue: 870116.95,
        tradeCount: 303,
        marketCap: 65262587616e-2
      }
    },
    {
      symbol: "8150",
      nameAr: "\u0623\u0633\u064A\u062C",
      nameEn: "Allied Cooperative Insurance Group",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: "red",
      officialQuote: {
        openPrice: 7,
        highPrice: 7.09,
        lowPrice: 6.89,
        lastPrice: 6.91,
        changePercent: -1.99,
        volume: 273231,
        tradedValue: 190957031e-2,
        tradeCount: 534,
        marketCap: 201081e3
      }
    },
    {
      symbol: "8160",
      nameAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646 \u0627\u0644\u0639\u0631\u0628\u064A\u0629",
      nameEn: "Arabia Insurance Cooperative Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 8.42,
        highPrice: 8.42,
        lowPrice: 8.3,
        lastPrice: 8.41,
        changePercent: -0.12,
        volume: 53782,
        tradedValue: 447894.5,
        tradeCount: 140,
        marketCap: 44573e4
      }
    },
    {
      symbol: "8170",
      nameAr: "\u0627\u0644\u0627\u062A\u062D\u0627\u062F",
      nameEn: "Al-Etihad Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: "orange",
      officialQuote: {
        openPrice: 7.27,
        highPrice: 7.45,
        lowPrice: 6.87,
        lastPrice: 7.1,
        changePercent: -4.05,
        volume: 1734363,
        tradedValue: 1228009616e-2,
        tradeCount: 2399,
        marketCap: 355e6
      }
    },
    {
      symbol: "8180",
      nameAr: "\u0627\u0644\u0635\u0642\u0631 \u0644\u0644\u062A\u0623\u0645\u064A\u0646",
      nameEn: "Al Sagr Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.2,
        highPrice: 11.26,
        lowPrice: 10.97,
        lastPrice: 11.07,
        changePercent: -0.45,
        volume: 119864,
        tradedValue: 133488866e-2,
        tradeCount: 281,
        marketCap: 3321e5
      }
    },
    {
      symbol: "8190",
      nameAr: "\u0627\u0644\u0645\u062A\u062D\u062F\u0629 \u0644\u0644\u062A\u0623\u0645\u064A\u0646",
      nameEn: "United Cooperative Assurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: "red",
      officialQuote: {
        openPrice: 3.21,
        highPrice: 3.23,
        lowPrice: 3.13,
        lastPrice: 3.13,
        changePercent: -2.49,
        volume: 184446,
        tradedValue: 587430.76,
        tradeCount: 364,
        marketCap: 1252e5
      }
    },
    {
      symbol: "8200",
      nameAr: "\u0627\u0644\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Saudi Reinsurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 25.82,
        highPrice: 26.34,
        lowPrice: 25.82,
        lastPrice: 25.9,
        changePercent: -0.77,
        volume: 149673,
        tradedValue: 390266806e-2,
        tradeCount: 911,
        marketCap: 4398079e3
      }
    },
    {
      symbol: "8210",
      nameAr: "\u0628\u0648\u0628\u0627 \u0627\u0644\u0639\u0631\u0628\u064A\u0629",
      nameEn: "Bupa Arabia for Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 163,
        highPrice: 165.6,
        lowPrice: 161.3,
        lastPrice: 164.8,
        changePercent: 1.1,
        volume: 143596,
        tradedValue: 234692925e-1,
        tradeCount: 2283,
        marketCap: 2472e7
      }
    },
    {
      symbol: "8230",
      nameAr: "\u062A\u0643\u0627\u0641\u0644 \u0627\u0644\u0631\u0627\u062C\u062D\u064A",
      nameEn: "Al-Rajhi Company for Cooperative Insurance",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 49.2,
        highPrice: 49.86,
        lowPrice: 48.72,
        lastPrice: 49.34,
        changePercent: 0.73,
        volume: 294220,
        tradedValue: 145399444e-1,
        tradeCount: 1591,
        marketCap: 9868e6
      }
    },
    {
      symbol: "8240",
      nameAr: "\u062A\u0652\u0634\u0628",
      nameEn: "CHUBB Arabia Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 17.69,
        highPrice: 17.75,
        lowPrice: 17.5,
        lastPrice: 17.51,
        changePercent: -0.45,
        volume: 141454,
        tradedValue: 249258576e-2,
        tradeCount: 558,
        marketCap: 7004e5
      }
    },
    {
      symbol: "8250",
      nameAr: "\u062C\u064A \u0622\u064A \u062C\u064A",
      nameEn: "Gulf Insurance Group",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 32.2,
        highPrice: 34.44,
        lowPrice: 32.18,
        lastPrice: 34,
        changePercent: 5.92,
        volume: 586838,
        tradedValue: 1984062308e-2,
        tradeCount: 2070,
        marketCap: 1785e6
      }
    },
    {
      symbol: "8260",
      nameAr: "\u0627\u0644\u062E\u0644\u064A\u062C\u064A\u0629 \u0627\u0644\u0639\u0627\u0645\u0629",
      nameEn: "Gulf General Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: "red",
      officialQuote: {
        openPrice: 3.84,
        highPrice: 3.86,
        lowPrice: 3.76,
        lastPrice: 3.78,
        changePercent: -0.79,
        volume: 363237,
        tradedValue: 138339935e-2,
        tradeCount: 295,
        marketCap: 1134e5
      }
    },
    {
      symbol: "8280",
      nameAr: "\u0644\u064A\u0641\u0627",
      nameEn: "LIVA Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 14.4,
        highPrice: 15.94,
        lowPrice: 13.51,
        lastPrice: 15.17,
        changePercent: 3.62,
        volume: 2234452,
        tradedValue: 3259668021e-2,
        tradeCount: 5467,
        marketCap: 6068e5
      }
    },
    {
      symbol: "8300",
      nameAr: "\u0627\u0644\u0648\u0637\u0646\u064A\u0629",
      nameEn: "Wataniya Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 12.52,
        highPrice: 12.7,
        lowPrice: 12.5,
        lastPrice: 12.54,
        changePercent: -0.48,
        volume: 262215,
        tradedValue: 33000304e-1,
        tradeCount: 400,
        marketCap: 5016e5
      }
    },
    {
      symbol: "8310",
      nameAr: "\u0623\u0645\u0627\u0646\u0629 \u0644\u0644\u062A\u0623\u0645\u064A\u0646",
      nameEn: "Amana Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: "orange",
      officialQuote: {
        openPrice: 7.21,
        highPrice: 7.3,
        lowPrice: 6.96,
        lastPrice: 6.96,
        changePercent: -2.66,
        volume: 536988,
        tradedValue: 380869181e-2,
        tradeCount: 769,
        marketCap: 29928e4
      }
    },
    {
      symbol: "8311",
      nameAr: "\u0639\u0646\u0627\u064A\u0629",
      nameEn: "Saudi Enaya Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 9.6,
        highPrice: 9.72,
        lowPrice: 8.81,
        lastPrice: 8.96,
        changePercent: -5.58,
        volume: 1041744,
        tradedValue: 950943473e-2,
        tradeCount: 2236,
        marketCap: 20608e4
      }
    },
    {
      symbol: "8313",
      nameAr: "\u0631\u0633\u0646",
      nameEn: "Rasan Information Technology Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 137,
        highPrice: 140,
        lowPrice: 137,
        lastPrice: 138,
        changePercent: 0.73,
        volume: 412469,
        tradedValue: 569305644e-1,
        tradeCount: 2835,
        marketCap: 10695966e3
      }
    },
    {
      symbol: "7200",
      nameAr: "\u0627\u0645 \u0622\u064A \u0627\u0633",
      nameEn: "Al Moammar Information Systems Co.",
      sectorAr: "\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u0642\u0646\u064A\u0629",
      sectorEn: "Software & Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 233,
        highPrice: 235.9,
        lowPrice: 232.3,
        lastPrice: 235,
        changePercent: 0.82,
        volume: 24446,
        tradedValue: 57242691e-1,
        tradeCount: 480,
        marketCap: 705e7
      }
    },
    {
      symbol: "7201",
      nameAr: "\u0628\u062D\u0631 \u0627\u0644\u0639\u0631\u0628",
      nameEn: "Arab Sea Information System Co.",
      sectorAr: "\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u0642\u0646\u064A\u0629",
      sectorEn: "Software & Services",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 3.32,
        highPrice: 3.35,
        lowPrice: 3.28,
        lastPrice: 3.3,
        changePercent: -0.6,
        volume: 564066,
        tradedValue: 186334273e-2,
        tradeCount: 473,
        marketCap: 33e7
      }
    },
    {
      symbol: "7202",
      nameAr: "\u0633\u0644\u0648\u0634\u0646\u0632",
      nameEn: "Arabian Internet and Communications Services Co.",
      sectorAr: "\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u0642\u0646\u064A\u0629",
      sectorEn: "Software & Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 204,
        highPrice: 204.8,
        lowPrice: 201.8,
        lastPrice: 204.3,
        changePercent: 0.15,
        volume: 61653,
        tradedValue: 125281462e-1,
        tradeCount: 1523,
        marketCap: 24516e6
      }
    },
    {
      symbol: "7203",
      nameAr: "\u0639\u0644\u0645",
      nameEn: "Elm Co.",
      sectorAr: "\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u0642\u0646\u064A\u0629",
      sectorEn: "Software & Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 646,
        highPrice: 664,
        lowPrice: 644,
        lastPrice: 662,
        changePercent: 2.64,
        volume: 54234,
        tradedValue: 354962305e-1,
        tradeCount: 2303,
        marketCap: 5296e7
      }
    },
    {
      symbol: "7204",
      nameAr: "\u062A\u0648\u0628\u064A",
      nameEn: "Perfect Presentation for Commercial Services Co.",
      sectorAr: "\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u0642\u0646\u064A\u0629",
      sectorEn: "Software & Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.13,
        highPrice: 6.13,
        lowPrice: 6.01,
        lastPrice: 6.04,
        changePercent: -1.15,
        volume: 600995,
        tradedValue: 363502457e-2,
        tradeCount: 1167,
        marketCap: 19932e5
      }
    },
    {
      symbol: "7205",
      nameAr: "\u062F\u064A \u0628\u064A \u0627\u0633",
      nameEn: "Dar Albalad for Business Solutions Co.",
      sectorAr: "\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u0642\u0646\u064A\u0629",
      sectorEn: "Software & Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.67,
        highPrice: 10.85,
        lowPrice: 10.48,
        lastPrice: 10.55,
        changePercent: -0.19,
        volume: 1272584,
        tradedValue: 1354509646e-2,
        tradeCount: 2337,
        marketCap: 7385e5
      }
    },
    {
      symbol: "7211",
      nameAr: "\u0639\u0632\u0645",
      nameEn: "Saudi Azm for Communication and Information Technology Co.",
      sectorAr: "\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u0642\u0646\u064A\u0629",
      sectorEn: "Software & Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 21.8,
        highPrice: 22.4,
        lowPrice: 21.8,
        lastPrice: 22.09,
        changePercent: 1.33,
        volume: 161939,
        tradedValue: 359008781e-2,
        tradeCount: 615,
        marketCap: 13254e5
      }
    },
    {
      symbol: "7010",
      nameAr: "\u0627\u0633 \u062A\u064A \u0633\u064A",
      nameEn: "Saudi Telecom Co.",
      sectorAr: "\u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A",
      sectorEn: "Telecommunication Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 43.32,
        highPrice: 43.36,
        lowPrice: 43,
        lastPrice: 43.08,
        changePercent: -0.55,
        volume: 1816440,
        tradedValue: 7827798572e-2,
        tradeCount: 5590,
        marketCap: 2154e8
      }
    },
    {
      symbol: "7020",
      nameAr: "\u0625\u062A\u062D\u0627\u062F \u0625\u062A\u0635\u0627\u0644\u0627\u062A",
      nameEn: "Etihad Etisalat Co.",
      sectorAr: "\u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A",
      sectorEn: "Telecommunication Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 62.55,
        highPrice: 63.95,
        lowPrice: 62.4,
        lastPrice: 62.4,
        changePercent: 0.81,
        volume: 1110004,
        tradedValue: 698504232e-1,
        tradeCount: 4220,
        marketCap: 48048e6
      }
    },
    {
      symbol: "7030",
      nameAr: "\u0632\u064A\u0646 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Mobile Telecommunication Company Saudi Arabia",
      sectorAr: "\u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A",
      sectorEn: "Telecommunication Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.14,
        highPrice: 10.19,
        lowPrice: 10.11,
        lastPrice: 10.17,
        changePercent: 0.3,
        volume: 1540977,
        tradedValue: 1564665441e-2,
        tradeCount: 2484,
        marketCap: 914007570975e-2
      }
    },
    {
      symbol: "7040",
      nameAr: "\u0642\u0648 \u0644\u0644\u0625\u062A\u0635\u0627\u0644\u0627\u062A",
      nameEn: "Etihad GO Telecom Co.",
      sectorAr: "\u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A",
      sectorEn: "Telecommunication Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 86.3,
        highPrice: 86.85,
        lowPrice: 85.35,
        lastPrice: 85.6,
        changePercent: -0.81,
        volume: 56993,
        tradedValue: 489424395e-2,
        tradeCount: 594,
        marketCap: 2910391440
      }
    },
    {
      symbol: "2080",
      nameAr: "\u0627\u0644\u063A\u0627\u0632 \u0627\u0644\u0642\u0627\u0628\u0636\u0629",
      nameEn: "Alghaz Waltsnae Company Eligibility Alqabida",
      sectorAr: "\u0627\u0644\u0645\u0631\u0627\u0641\u0642 \u0627\u0644\u0639\u0627\u0645\u0629",
      sectorEn: "Utilities",
      warningFlag: null,
      officialQuote: {
        openPrice: 65.95,
        highPrice: 68.6,
        lowPrice: 65.9,
        lastPrice: 67,
        changePercent: 1.59,
        volume: 109225,
        tradedValue: 736665265e-2,
        tradeCount: 1254,
        marketCap: 5025e6
      }
    },
    {
      symbol: "2081",
      nameAr: "\u0627\u0644\u062E\u0631\u064A\u0641",
      nameEn: "Alkhorayef Water and Power Technologies Co.",
      sectorAr: "\u0627\u0644\u0645\u0631\u0627\u0641\u0642 \u0627\u0644\u0639\u0627\u0645\u0629",
      sectorEn: "Utilities",
      warningFlag: null,
      officialQuote: {
        openPrice: 106.5,
        highPrice: 109.8,
        lowPrice: 105.8,
        lastPrice: 109,
        changePercent: 2.64,
        volume: 110357,
        tradedValue: 119991315e-1,
        tradeCount: 1639,
        marketCap: 3815e6
      }
    },
    {
      symbol: "2082",
      nameAr: "\u0623\u0643\u0648\u0627",
      nameEn: "ACWA POWER Co.",
      sectorAr: "\u0627\u0644\u0645\u0631\u0627\u0641\u0642 \u0627\u0644\u0639\u0627\u0645\u0629",
      sectorEn: "Utilities",
      warningFlag: null,
      officialQuote: {
        openPrice: 183.9,
        highPrice: 187.7,
        lowPrice: 182.5,
        lastPrice: 187.7,
        changePercent: 1.84,
        volume: 242544,
        tradedValue: 45049397,
        tradeCount: 2685,
        marketCap: 1438702664746e-1
      }
    },
    {
      symbol: "2083",
      nameAr: "\u0645\u0631\u0627\u0641\u0642",
      nameEn: "The Power and Water Utility Company for Jubail and Yanbu",
      sectorAr: "\u0627\u0644\u0645\u0631\u0627\u0641\u0642 \u0627\u0644\u0639\u0627\u0645\u0629",
      sectorEn: "Utilities",
      warningFlag: null,
      officialQuote: {
        openPrice: 36,
        highPrice: 36.2,
        lowPrice: 35.62,
        lastPrice: 35.62,
        changePercent: -1.27,
        volume: 304110,
        tradedValue: 109318103e-1,
        tradeCount: 1990,
        marketCap: 8905e6
      }
    },
    {
      symbol: "2084",
      nameAr: "\u0645\u064A\u0627\u0647\u0646\u0627",
      nameEn: "Miahona Co.",
      sectorAr: "\u0627\u0644\u0645\u0631\u0627\u0641\u0642 \u0627\u0644\u0639\u0627\u0645\u0629",
      sectorEn: "Utilities",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.03,
        highPrice: 13.33,
        lowPrice: 13.01,
        lastPrice: 13.08,
        changePercent: 0.46,
        volume: 563494,
        tradedValue: 742202881e-2,
        tradeCount: 1500,
        marketCap: 210490610244e-2
      }
    },
    {
      symbol: "5110",
      nameAr: "\u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629 \u0644\u0644\u0637\u0627\u0642\u0629",
      nameEn: "Saudi Energy Co.",
      sectorAr: "\u0627\u0644\u0645\u0631\u0627\u0641\u0642 \u0627\u0644\u0639\u0627\u0645\u0629",
      sectorEn: "Utilities",
      warningFlag: null,
      officialQuote: {
        openPrice: 17.51,
        highPrice: 17.6,
        lowPrice: 17.23,
        lastPrice: 17.25,
        changePercent: -2.32,
        volume: 712295,
        tradedValue: 1234740646e-2,
        tradeCount: 2135,
        marketCap: 7187374330875e-2
      }
    },
    {
      symbol: "4330",
      nameAr: "\u0627\u0644\u0631\u064A\u0627\u0636 \u0631\u064A\u062A",
      nameEn: "Riyad REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 4.93,
        highPrice: 4.93,
        lowPrice: 4.86,
        lastPrice: 4.88,
        changePercent: -1.01,
        volume: 100277,
        tradedValue: 488820.87,
        tradeCount: 366,
        marketCap: 83788185288e-2
      }
    },
    {
      symbol: "4331",
      nameAr: "\u0627\u0644\u062C\u0632\u064A\u0631\u0629 \u0631\u064A\u062A",
      nameEn: "AlJazira REIT",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.07,
        highPrice: 11.13,
        lowPrice: 11.02,
        lastPrice: 11.07,
        changePercent: -0.09,
        volume: 21744,
        tradedValue: 240879.27,
        tradeCount: 259,
        marketCap: 130626e3
      }
    },
    {
      symbol: "4332",
      nameAr: "\u062C\u062F\u0648\u0649 \u0631\u064A\u062A \u0627\u0644\u062D\u0631\u0645\u064A\u0646",
      nameEn: "Jadwa REIT Al Haramain Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 4.87,
        highPrice: 4.9,
        lowPrice: 4.87,
        lastPrice: 4.88,
        changePercent: 0.21,
        volume: 7240,
        tradedValue: 35319.29,
        tradeCount: 56,
        marketCap: 32208e4
      }
    },
    {
      symbol: "4333",
      nameAr: "\u062A\u0639\u0644\u064A\u0645 \u0631\u064A\u062A",
      nameEn: "Taleem REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.47,
        highPrice: 10.51,
        lowPrice: 10.44,
        lastPrice: 10.46,
        changePercent: 0,
        volume: 8819,
        tradedValue: 92395.17,
        tradeCount: 120,
        marketCap: 53346e4
      }
    },
    {
      symbol: "4334",
      nameAr: "\u0627\u0644\u0645\u0639\u0630\u0631 \u0631\u064A\u062A",
      nameEn: "AL Maather REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 9.06,
        highPrice: 9.06,
        lowPrice: 8.98,
        lastPrice: 9,
        changePercent: -0.55,
        volume: 40227,
        tradedValue: 362440.82,
        tradeCount: 114,
        marketCap: 55233e4
      }
    },
    {
      symbol: "4335",
      nameAr: "\u0645\u0634\u0627\u0631\u0643\u0629 \u0631\u064A\u062A",
      nameEn: "Musharaka REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 3.72,
        highPrice: 3.73,
        lowPrice: 3.66,
        lastPrice: 3.69,
        changePercent: -1.07,
        volume: 112601,
        tradedValue: 414915.24,
        tradeCount: 457,
        marketCap: 32472e4
      }
    },
    {
      symbol: "4336",
      nameAr: "\u0645\u0644\u0643\u064A\u0629 \u0631\u064A\u062A",
      nameEn: "Mulkia Gulf Real Estate REIT",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 4.62,
        highPrice: 4.62,
        lowPrice: 4.59,
        lastPrice: 4.61,
        changePercent: -0.22,
        volume: 45460,
        tradedValue: 209423.98,
        tradeCount: 150,
        marketCap: 47836123695e-2
      }
    },
    {
      symbol: "4337",
      nameAr: "\u0627\u0644\u0639\u0632\u064A\u0632\u064A\u0629 \u0631\u064A\u062A",
      nameEn: "AL AZIZIAH REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 5.01,
        highPrice: 5.05,
        lowPrice: 5,
        lastPrice: 5.01,
        changePercent: 0,
        volume: 66541,
        tradedValue: 335258.42,
        tradeCount: 80,
        marketCap: 286772400
      }
    },
    {
      symbol: "4338",
      nameAr: "\u0627\u0644\u0623\u0647\u0644\u064A \u0631\u064A\u062A 1",
      nameEn: "AlAhli REIT Fund 1",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.55,
        highPrice: 6.62,
        lowPrice: 6.55,
        lastPrice: 6.6,
        changePercent: -0.3,
        volume: 28236,
        tradedValue: 186238.56,
        tradeCount: 111,
        marketCap: 9075e5
      }
    },
    {
      symbol: "4339",
      nameAr: "\u062F\u0631\u0627\u064A\u0629 \u0631\u064A\u062A",
      nameEn: "Derayah REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 5.45,
        highPrice: 5.47,
        lowPrice: 5.4,
        lastPrice: 5.43,
        changePercent: -0.37,
        volume: 136888,
        tradedValue: 742728.5,
        tradeCount: 236,
        marketCap: 58376320005e-2
      }
    },
    {
      symbol: "4340",
      nameAr: "\u0627\u0644\u0631\u0627\u062C\u062D\u064A \u0631\u064A\u062A",
      nameEn: "Al Rajhi REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 8.21,
        highPrice: 8.22,
        lowPrice: 8.18,
        lastPrice: 8.2,
        changePercent: -0.36,
        volume: 138868,
        tradedValue: 113832058e-2,
        tradeCount: 662,
        marketCap: 22599814836e-1
      }
    },
    {
      symbol: "4342",
      nameAr: "\u062C\u062F\u0648\u0649 \u0631\u064A\u062A \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Jadwa REIT Saudi Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.5,
        highPrice: 10.6,
        lowPrice: 10.47,
        lastPrice: 10.47,
        changePercent: -0.29,
        volume: 156494,
        tradedValue: 164266849e-2,
        tradeCount: 475,
        marketCap: 195275744895e-2
      }
    },
    {
      symbol: "4344",
      nameAr: "\u0633\u062F\u0643\u0648 \u0643\u0627\u0628\u064A\u062A\u0627\u0644 \u0631\u064A\u062A",
      nameEn: "SEDCO Capital REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 7.86,
        highPrice: 7.97,
        lowPrice: 7.85,
        lastPrice: 7.91,
        changePercent: -0.5,
        volume: 103022,
        tradedValue: 814866.65,
        tradeCount: 336,
        marketCap: 147873055204e-2
      }
    },
    {
      symbol: "4345",
      nameAr: "\u0627\u0644\u0625\u0646\u0645\u0627\u0621 \u0631\u064A\u062A \u0644\u0644\u062A\u062C\u0632\u0626\u0629",
      nameEn: "Alinma Retail REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 4.83,
        highPrice: 4.83,
        lowPrice: 4.79,
        lastPrice: 4.81,
        changePercent: -0.41,
        volume: 114437,
        tradedValue: 549823.99,
        tradeCount: 224,
        marketCap: 56758e4
      }
    },
    {
      symbol: "4346",
      nameAr: "\u0645\u064A\u0641\u0643 \u0631\u064A\u062A",
      nameEn: "MEFIC REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 3.35,
        highPrice: 3.35,
        lowPrice: 3.32,
        lastPrice: 3.35,
        changePercent: 0,
        volume: 9310,
        tradedValue: 31079.64,
        tradeCount: 89,
        marketCap: 245477280
      }
    },
    {
      symbol: "4347",
      nameAr: "\u0628\u0646\u064A\u0627\u0646 \u0631\u064A\u062A",
      nameEn: "Bonyan REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.13,
        highPrice: 10.14,
        lowPrice: 10.09,
        lastPrice: 10.12,
        changePercent: -0.2,
        volume: 58390,
        tradedValue: 591261.28,
        tradeCount: 155,
        marketCap: 1648356732
      }
    },
    {
      symbol: "4348",
      nameAr: "\u0627\u0644\u062E\u0628\u064A\u0631 \u0631\u064A\u062A",
      nameEn: "Alkhabeer REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 5.72,
        highPrice: 5.73,
        lowPrice: 5.7,
        lastPrice: 5.72,
        changePercent: 0,
        volume: 97700,
        tradedValue: 558451.44,
        tradeCount: 532,
        marketCap: 80657061056e-2
      }
    },
    {
      symbol: "4349",
      nameAr: "\u0627\u0644\u0625\u0646\u0645\u0627\u0621 \u0631\u064A\u062A \u0627\u0644\u0641\u0646\u062F\u0642\u064A",
      nameEn: "Alinma Hospitality REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 8.12,
        highPrice: 8.15,
        lowPrice: 8.1,
        lastPrice: 8.14,
        changePercent: 0.25,
        volume: 53567,
        tradedValue: 435466.14,
        tradeCount: 230,
        marketCap: 830297094
      }
    },
    {
      symbol: "4350",
      nameAr: "\u0627\u0644\u0625\u0633\u062A\u062B\u0645\u0627\u0631 \u0631\u064A\u062A",
      nameEn: "Alistithmar AREIC Diversified REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 7.06,
        highPrice: 7.58,
        lowPrice: 7.04,
        lastPrice: 7.5,
        changePercent: 6.23,
        volume: 612335,
        tradedValue: 45060156e-1,
        tradeCount: 1275,
        marketCap: 45375e4
      }
    },
    {
      symbol: "4020",
      nameAr: "\u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629",
      nameEn: "Saudi Real Estate Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 17.65,
        highPrice: 17.65,
        lowPrice: 17.22,
        lastPrice: 17.45,
        changePercent: -1.13,
        volume: 298192,
        tradedValue: 51748831e-1,
        tradeCount: 807,
        marketCap: 654375e4
      }
    },
    {
      symbol: "4090",
      nameAr: "\u0637\u064A\u0628\u0629",
      nameEn: "Taiba Investments Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 18.33,
        highPrice: 18.72,
        lowPrice: 18.24,
        lastPrice: 18.46,
        changePercent: 0.71,
        volume: 523789,
        tradedValue: 97056351e-1,
        tradeCount: 840,
        marketCap: 923e7
      }
    },
    {
      symbol: "4100",
      nameAr: "\u0645\u0643\u0629",
      nameEn: "Makkah Construction and Development Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 83.45,
        highPrice: 84.4,
        lowPrice: 83.25,
        lastPrice: 84.1,
        changePercent: 0.18,
        volume: 95698,
        tradedValue: 80333539e-1,
        tradeCount: 909,
        marketCap: 1682e7
      }
    },
    {
      symbol: "4150",
      nameAr: "\u0627\u0644\u062A\u0639\u0645\u064A\u0631",
      nameEn: "Arriyadh Development Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 17.95,
        highPrice: 17.95,
        lowPrice: 17.7,
        lastPrice: 17.77,
        changePercent: -1,
        volume: 122332,
        tradedValue: 218175776e-2,
        tradeCount: 815,
        marketCap: 415695063586e-2
      }
    },
    {
      symbol: "4220",
      nameAr: "\u0625\u0639\u0645\u0627\u0631",
      nameEn: "Emaar The Economic City",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 9.72,
        highPrice: 9.77,
        lowPrice: 9.6,
        lastPrice: 9.68,
        changePercent: -0.92,
        volume: 356861,
        tradedValue: 345051863e-2,
        tradeCount: 990,
        marketCap: 85467614804e-1
      }
    },
    {
      symbol: "4230",
      nameAr: "\u0627\u0644\u0628\u062D\u0631 \u0627\u0644\u0623\u062D\u0645\u0631",
      nameEn: "Red Sea International Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 26.5,
        highPrice: 26.5,
        lowPrice: 25.44,
        lastPrice: 25.54,
        changePercent: -3.62,
        volume: 1553499,
        tradedValue: 4030003054e-2,
        tradeCount: 4739,
        marketCap: 123274896182e-2
      }
    },
    {
      symbol: "4250",
      nameAr: "\u062C\u0628\u0644 \u0639\u0645\u0631",
      nameEn: "Jabal Omar Development Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 15.75,
        highPrice: 15.79,
        lowPrice: 15.64,
        lastPrice: 15.7,
        changePercent: -0.32,
        volume: 2216256,
        tradedValue: 3481121243e-2,
        tradeCount: 2005,
        marketCap: 185263596085e-1
      }
    },
    {
      symbol: "4300",
      nameAr: "\u062F\u0627\u0631 \u0627\u0644\u0623\u0631\u0643\u0627\u0646",
      nameEn: "Dar Alarkan Real Estate Development Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 18.6,
        highPrice: 19.19,
        lowPrice: 18.6,
        lastPrice: 19.19,
        changePercent: 2.62,
        volume: 1083492,
        tradedValue: 2058083219e-2,
        tradeCount: 2676,
        marketCap: 207252e5
      }
    },
    {
      symbol: "4310",
      nameAr: "\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u0645\u0639\u0631\u0641\u0629",
      nameEn: "Knowledge Economic City",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.84,
        highPrice: 14.72,
        lowPrice: 13.78,
        lastPrice: 14.6,
        changePercent: 5.49,
        volume: 1794437,
        tradedValue: 2553617297e-2,
        tradeCount: 4227,
        marketCap: 495378e4
      }
    },
    {
      symbol: "4320",
      nameAr: "\u0627\u0644\u0623\u0646\u062F\u0644\u0633",
      nameEn: "Alandalus Property Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 14.27,
        highPrice: 14.49,
        lowPrice: 14.18,
        lastPrice: 14.39,
        changePercent: 0.84,
        volume: 75192,
        tradedValue: 108141647e-2,
        tradeCount: 389,
        marketCap: 134306666187e-2
      }
    },
    {
      symbol: "4321",
      nameAr: "\u0633\u064A\u0646\u0648\u0645\u064A \u0633\u0646\u062A\u0631\u0632",
      nameEn: "Arabian Centres Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 16.17,
        highPrice: 16.25,
        lowPrice: 16,
        lastPrice: 16.23,
        changePercent: 0.25,
        volume: 357044,
        tradedValue: 576163137e-2,
        tradeCount: 1020,
        marketCap: 770925e4
      }
    },
    {
      symbol: "4322",
      nameAr: "\u0631\u062A\u0627\u0644",
      nameEn: "Retal Urban Development Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.11,
        highPrice: 11.3,
        lowPrice: 11.11,
        lastPrice: 11.24,
        changePercent: -0.27,
        volume: 325603,
        tradedValue: 365873396e-2,
        tradeCount: 926,
        marketCap: 562e7
      }
    },
    {
      symbol: "4323",
      nameAr: "\u0633\u0645\u0648",
      nameEn: "Sumou Real Estate Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 26.7,
        highPrice: 26.84,
        lowPrice: 26.5,
        lastPrice: 26.62,
        changePercent: -0.89,
        volume: 29349,
        tradedValue: 781178.74,
        tradeCount: 296,
        marketCap: 1331e6
      }
    },
    {
      symbol: "4324",
      nameAr: "\u0628\u0646\u0627\u0646",
      nameEn: "Banan Real Estate Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 3.06,
        highPrice: 3.09,
        lowPrice: 3.06,
        lastPrice: 3.08,
        changePercent: 0.65,
        volume: 63267,
        tradedValue: 194182.45,
        tradeCount: 166,
        marketCap: 616e6
      }
    },
    {
      symbol: "4325",
      nameAr: "\u0645\u0633\u0627\u0631",
      nameEn: "Umm Al Qura for Development and Construction Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 17.94,
        highPrice: 17.99,
        lowPrice: 17.1,
        lastPrice: 17.63,
        changePercent: -1.73,
        volume: 830075,
        tradedValue: 1474517737e-2,
        tradeCount: 1675,
        marketCap: 2536335650043e-2
      }
    },
    {
      symbol: "4326",
      nameAr: "\u0627\u0644\u0645\u0627\u062C\u062F\u064A\u0629",
      nameEn: "Dar Al Majed Real Estate Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.8,
        highPrice: 6.82,
        lowPrice: 6.75,
        lastPrice: 6.76,
        changePercent: -0.73,
        volume: 435492,
        tradedValue: 2950971,
        tradeCount: 1028,
        marketCap: 2028e6
      }
    },
    {
      symbol: "4327",
      nameAr: "\u0627\u0644\u0631\u0645\u0632",
      nameEn: "Alramz Real Estate Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 53.3,
        highPrice: 53.3,
        lowPrice: 52.5,
        lastPrice: 53,
        changePercent: -0.66,
        volume: 29338,
        tradedValue: 15500301e-1,
        tradeCount: 297,
        marketCap: 2271428579
      }
    }
  ]
};
async function requireDataIngestionPermission(base44, sessionId, deviceId) {
  const response = await base44.functions.invoke("identityContext", {
    action: "get",
    session_id: sessionId,
    device_id: deviceId
  });
  const context = response?.data || response;
  if (!Array.isArray(context?.permissions) || !context.permissions.includes("data.ingestion.run")) {
    throw Object.assign(new Error("Forbidden"), { status: 403, code: "PERMISSION_DENIED" });
  }
  return context;
}
function replyError(error) {
  const status = Number(error?.status) || 500;
  if (status >= 500) console.error("SMART_INVESTOR backend error", error);
  return Response.json({
    error: status >= 500 ? "Backend operation failed" : error?.message || "Request failed",
    code: error?.code || (status >= 500 ? "BACKEND_FAILURE" : "REQUEST_FAILED")
  }, { status });
}
var SAUDI_PROFILE = "https://www.saudiexchange.sa/wps/portal/saudiexchange/hidden/company-profile-main?companySymbol=";
var MAIN_MARKET_SYMBOLS = new Set(official_main_market_catalog_2026_07_21_default.companies.map((company) => company.symbol));
// Saudi Exchange announced that 2210 trading was suspended from 2026-04-30
// after the issuer missed its statutory financial-results deadline. Keep this
// separate from the immutable official catalog snapshot so an absent live bar
// is represented as a suspension, never as provider failure or a fake candle.
var SUSPENDED_INSTRUMENTS = new Map([
  ["2210", { since: "2026-04-30", official_url: "https://www.saudiexchange.sa/wps/portal/saudiexchange/newsandreports/issuer-news/issuer-announcements/issuer-announcements-details/?anCat=1&anId=95249&cs=2210&locale=en" }]
]);
var TASI_INSTRUMENT = {
  symbol: "TASI",
  market_code: "SA_MAIN",
  instrument_code: "TASI",
  instrument_type: "market_index",
  composite_key: "SA_MAIN:TASI",
  name_ar: "\u0645\u0624\u0634\u0631 \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629 (\u062a\u0627\u0633\u064a)",
  name_en: "Tadawul All Share Index (TASI)",
  sector_ar: "\u0645\u0624\u0634\u0631\u0627\u062a \u0627\u0644\u0633\u0648\u0642",
  sector_en: "Market Indices",
  market: "Saudi Main Market",
  currency: "SAR",
  status: "active",
  official_url: "https://www.saudiexchange.sa/wps/portal/saudiexchange/rules-guidance/indices?locale=ar"
};
var GCC_MARKETS = [
  { market_code: "SA_MAIN", country_code: "SA", name_ar: "\u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629", name_en: "Saudi Main Market", currency: "SAR", timezone: "Asia/Riyadh", quote_mode: "delayed", delay_seconds: 900, license_status: "pending", active: true },
  { market_code: "AE_ADX", country_code: "AE", name_ar: "\u0633\u0648\u0642 \u0623\u0628\u0648\u0638\u0628\u064A", name_en: "Abu Dhabi Securities Exchange", currency: "AED", timezone: "Asia/Dubai", quote_mode: "disabled", delay_seconds: 0, license_status: "pending", active: false },
  { market_code: "AE_DFM", country_code: "AE", name_ar: "\u0633\u0648\u0642 \u062F\u0628\u064A", name_en: "Dubai Financial Market", currency: "AED", timezone: "Asia/Dubai", quote_mode: "disabled", delay_seconds: 0, license_status: "pending", active: false },
  { market_code: "KW_BK", country_code: "KW", name_ar: "\u0628\u0648\u0631\u0635\u0629 \u0627\u0644\u0643\u0648\u064A\u062A", name_en: "Boursa Kuwait", currency: "KWD", timezone: "Asia/Kuwait", quote_mode: "disabled", delay_seconds: 0, license_status: "pending", active: false },
  { market_code: "QA_QE", country_code: "QA", name_ar: "\u0628\u0648\u0631\u0635\u0629 \u0642\u0637\u0631", name_en: "Qatar Stock Exchange", currency: "QAR", timezone: "Asia/Qatar", quote_mode: "disabled", delay_seconds: 0, license_status: "pending", active: false },
  { market_code: "BH_BHB", country_code: "BH", name_ar: "\u0628\u0648\u0631\u0635\u0629 \u0627\u0644\u0628\u062D\u0631\u064A\u0646", name_en: "Bahrain Bourse", currency: "BHD", timezone: "Asia/Bahrain", quote_mode: "disabled", delay_seconds: 0, license_status: "pending", active: false },
  { market_code: "OM_MSX", country_code: "OM", name_ar: "\u0628\u0648\u0631\u0635\u0629 \u0645\u0633\u0642\u0637", name_en: "Muscat Stock Exchange", currency: "OMR", timezone: "Asia/Muscat", quote_mode: "disabled", delay_seconds: 0, license_status: "pending", active: false }
];
async function source(base44, code, data) {
  const rows = await base44.asServiceRole.entities.DataSource.filter({ code });
  return rows[0] ? await base44.asServiceRole.entities.DataSource.update(rows[0].id, data) : await base44.asServiceRole.entities.DataSource.create({ code, ...data });
}
async function checksum(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes)).map((item) => item.toString(16).padStart(2, "0")).join("");
}
function upsertValueChanged(current, incoming) {
  return Object.entries(incoming).some(([field, value]) => {
    const existingValue = current?.[field];
    if (value && typeof value === "object") return JSON.stringify(existingValue ?? null) !== JSON.stringify(value);
    return existingValue !== value;
  });
}
async function upsertMany(base44, entity, rows, keyFields) {
  if (!rows.length) return;
  const key = (row) => keyFields.map((field) => row[field]).join("|");
  const uniqueRows = groupRowsByKey(rows, key).map((group) => group.row);
  for (const field of keyFields) {
    if (uniqueRows.some((row) => row[field] === undefined || row[field] === null || row[field] === "")) {
      throw ingestionFailure(`Upsert row is missing key field: ${field}`, "INVALID_UPSERT_KEY");
    }
  }
  const filter = Object.fromEntries(keyFields.map((field) => {
    const values = [...new Set(uniqueRows.map((row) => row[field]))];
    return [field, values.length === 1 ? values[0] : { $in: values }];
  }));
  const readLimit = Math.min(5e3, Math.max(25, uniqueRows.length * 4));
  const existing = await base44.asServiceRole.entities[entity].filter(filter, "-updated_date", readLimit);
  const byKey = new Map(existing.map((row) => [key(row), row]));
  const creates = uniqueRows.filter((row) => !byKey.has(key(row)));
  const updates = uniqueRows
    .filter((row) => byKey.has(key(row)) && upsertValueChanged(byKey.get(key(row)), row))
    .map((row) => ({ id: byKey.get(key(row)).id, ...row }));
  if (creates.length) await base44.asServiceRole.entities[entity].bulkCreate(creates);
  await bulkUpdateUnique(base44.asServiceRole.entities[entity], updates);
}
async function bulkUpdateUnique(entityApi, rows) {
  if (!rows.length) return;
  const grouped = groupRowsByKey(rows, (row) => row.id);
  if (grouped.some((group) => !group.key || group.key === "undefined" || group.key === "null")) {
    throw ingestionFailure("Bulk update row is missing its entity ID", "INVALID_BULK_UPDATE");
  }
  await entityApi.bulkUpdate(grouped.map((group) => group.row));
}
function exactInstrument(row) {
  return {
    symbol: row.symbol,
    market_code: "SA_MAIN",
    instrument_code: row.symbol,
    instrument_type: "equity",
    composite_key: `SA_MAIN:${row.symbol}`,
    name_ar: row.nameAr,
    name_en: row.nameEn,
    sector_ar: row.sectorAr,
    sector_en: row.sectorEn,
    market: "Saudi Main Market",
    currency: "SAR",
    status: SUSPENDED_INSTRUMENTS.has(row.symbol) ? "suspended" : "active",
    official_url: SAUDI_PROFILE + row.symbol
  };
}
function publicProviderSymbol(symbol) {
  const normalized = String(symbol || "").trim().toUpperCase();
  return normalized === "TASI" ? "^TASI.SR" : `${normalized}.SR`;
}
function isSupportedPublicSaudiSymbol(symbol) {
  const normalized = String(symbol || "").trim().toUpperCase();
  return /^\d{4}$/.test(normalized) || normalized === "TASI";
}
async function reconcileInstrumentTradingStatuses(base44, instruments) {
  const updates = [];
  for (const instrument of instruments) {
    const expected = SUSPENDED_INSTRUMENTS.has(instrument.symbol) ? "suspended" : "active";
    if (instrument.status !== expected) updates.push({ id: instrument.id, status: expected });
    instrument.status = expected;
  }
  await bulkUpdateUnique(base44.asServiceRole.entities.Instrument, updates);
  return instruments;
}
async function ensureSuspendedReferenceQuotes(base44, instruments, sourceId) {
  const suspended = instruments.filter((instrument) => instrument.status === "suspended");
  if (!suspended.length) return;
  const existing = await base44.asServiceRole.entities.QuoteLatest.filter({
    instrument_id: { $in: suspended.map((instrument) => instrument.id) },
    market_code: "SA_MAIN"
  }, "-provider_as_of", suspended.length);
  const existingIds = new Set(existing.map((quote) => quote.instrument_id));
  const catalogBySymbol = new Map(official_main_market_catalog_2026_07_21_default.companies.map((row) => [row.symbol, row]));
  const rows = suspended.filter((instrument) => !existingIds.has(instrument.id)).map((instrument) => {
    const reference = catalogBySymbol.get(instrument.symbol)?.officialQuote || {};
    const lastPrice = positiveNumber(reference.lastPrice);
    if (!lastPrice) return null;
    return {
      instrument_id: instrument.id,
      market_code: "SA_MAIN",
      session_date: official_main_market_catalog_2026_07_21_default.quoteTime.slice(0, 10),
      symbol: instrument.symbol,
      last_price: lastPrice,
      previous_close: lastPrice,
      change_value: 0,
      change_percent: 0,
      volume: nonNegativeNumber(reference.volume),
      traded_value: nonNegativeNumber(reference.tradedValue),
      market_cap: nonNegativeNumber(reference.marketCap),
      source_id: sourceId,
      source_time: official_main_market_catalog_2026_07_21_default.quoteTime,
      provider_as_of: official_main_market_catalog_2026_07_21_default.quoteTime,
      received_time: new Date().toISOString(),
      delay_seconds: 0,
      license_status: "suspended",
      quote_time: official_main_market_catalog_2026_07_21_default.quoteTime,
      quality_status: "stale",
      freshness_status: "stale",
      market_phase: "closed",
      is_final: true,
      snapshot_version: `official-suspended-${instrument.symbol}-${official_main_market_catalog_2026_07_21_default.quoteTime.slice(0, 10)}`
    };
  }).filter(Boolean);
  if (rows.length) await base44.asServiceRole.entities.QuoteLatest.bulkCreate(rows);
}
function lossClassification(row, instrumentId, sourceId) {
  const level = row.warningFlag || "none";
  const labels = {
    none: ["\u0644\u0627 \u064A\u0648\u062C\u062F \u062A\u0635\u0646\u064A\u0641 \u062E\u0633\u0627\u0626\u0631 \u0645\u062A\u0631\u0627\u0643\u0645\u0629", "No accumulated-loss flag"],
    yellow: ["\u062E\u0633\u0627\u0626\u0631 \u0645\u062A\u0631\u0627\u0643\u0645\u0629 \u0645\u0646 20% \u0625\u0644\u0649 \u0623\u0642\u0644 \u0645\u0646 35%", "Accumulated losses from 20% to below 35%"],
    orange: ["\u062E\u0633\u0627\u0626\u0631 \u0645\u062A\u0631\u0627\u0643\u0645\u0629 \u0645\u0646 35% \u0625\u0644\u0649 \u0623\u0642\u0644 \u0645\u0646 50%", "Accumulated losses from 35% to below 50%"],
    red: ["\u062E\u0633\u0627\u0626\u0631 \u0645\u062A\u0631\u0627\u0643\u0645\u0629 50% \u0641\u0623\u0643\u062B\u0631", "Accumulated losses of 50% or more"]
  };
  return { instrument_id: instrumentId, level, label_ar: labels[level][0], label_en: labels[level][1], source_id: sourceId, as_of: official_main_market_catalog_2026_07_21_default.quoteTime };
}
function drawingLevel(points, observedAt) {
  if (!Array.isArray(points) || !points.length) return null;
  const first = points[0];
  if (points.length === 1 || !Number.isFinite(Number(points[1]?.time)) || Number(points[1].time) === Number(first.time)) return Number(first.price);
  const second = points[1];
  const ratio = (new Date(observedAt).getTime() / 1e3 - Number(first.time)) / (Number(second.time) - Number(first.time));
  return Number(first.price) + (Number(second.price) - Number(first.price)) * ratio;
}
async function queuePersonalAlertMessage(base44, rule, quote, bucket, thresholdOverride) {
  const observedAt = quote.provider_as_of || quote.source_time || quote.quote_time;
  const triggerPrice = Number(quote.last_price);
  if (!rule?.id || !rule.customer_id || rule.market_code !== "SA_MAIN" || quote.market_code && quote.market_code !== "SA_MAIN" || !Number.isFinite(triggerPrice) || !Number.isFinite(Date.parse(String(observedAt || "")))) return 0;
  const [profile, subscriptions, instrument] = await Promise.all([
    base44.asServiceRole.entities.CustomerProfile.get(rule.customer_id).catch(() => null),
    base44.asServiceRole.entities.Subscription.filter({ customer_id: rule.customer_id, market_code: "SA_MAIN", status: "active" }, "-updated_date", 100),
    base44.asServiceRole.entities.Instrument.get(rule.instrument_id).catch(() => null)
  ]);
  const now = Date.now();
  const hasAccess = subscriptions.some((subscription) => !subscription.ends_at || Date.parse(subscription.ends_at) > now);
  if (!profile || profile.role !== "user" || profile.account_status !== "active" || !profile.auth_user_id || !hasAccess || !instrument || instrument.market_code !== "SA_MAIN" || instrument.symbol !== rule.symbol) return 0;
  const dedupeKey = `personal-alert:${rule.id}:${bucket}`;
  if ((await base44.asServiceRole.entities.Message.filter({ dedupe_key: dedupeKey }, "-created_date", 1)).length) return 0;
  const condition = {
    crosses_above: ["اخترق السعر القيمة المحددة صعوداً", "Price crossed above your threshold"],
    crosses_below: ["كسر السعر القيمة المحددة هبوطاً", "Price crossed below your threshold"],
    crosses_drawing: ["تقاطع السعر مع الرسم المحدد", "Price crossed your drawing"],
    crosses_drawing_above: ["اخترق السعر الرسم المحدد صعوداً", "Price crossed above your drawing"],
    crosses_drawing_below: ["كسر السعر الرسم المحدد هبوطاً", "Price crossed below your drawing"]
  }[rule.condition] || ["تحقق شرط التنبيه الذي حددته", "Your alert condition was met"];
  const threshold = Number(thresholdOverride ?? rule.threshold);
  const thresholdAr = Number.isFinite(threshold) ? `، والقيمة المحددة ${threshold.toFixed(2)} ريال` : "";
  const thresholdEn = Number.isFinite(threshold) ? `, with a threshold of ${threshold.toFixed(2)} SAR` : "";
  await base44.asServiceRole.entities.Message.create({
    recipient_auth_user_id: profile.auth_user_id,
    recipient_customer_id: profile.id,
    message_type: "system",
    priority: "important",
    title_ar: `تحقق تنبيهك على ${rule.symbol}`,
    title_en: `Your ${rule.symbol} alert was triggered`,
    body_ar: `${condition[0]} في ${instrument.name_ar || instrument.name_en || rule.symbol}. سعر التحقق ${triggerPrice.toFixed(2)} ريال${thresholdAr}.`,
    body_en: `${condition[1]} for ${instrument.name_en || instrument.name_ar || rule.symbol}. Trigger price: ${triggerPrice.toFixed(2)} SAR${thresholdEn}.`,
    action_path: `/company?symbol=${encodeURIComponent(rule.symbol)}&market=SA_MAIN`,
    feed_eligible: true,
    dedupe_key: dedupeKey,
    expires_at: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
  });
  return 1;
}
async function evaluateDrawingAlerts(base44, quotes) {
  const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
  const rules = (await base44.asServiceRole.entities.AlertRule.filter({ market_code: "SA_MAIN", enabled: true }, "-updated_date", 5e3))
    .filter((rule) => String(rule.condition || "").startsWith("crosses_drawing"));
  let triggered = 0;
  for (const rule of rules) {
    const quote = bySymbol.get(rule.symbol);
    if (!quote || !Number.isFinite(Number(quote.last_price))) continue;
    const currentLevel = drawingLevel(rule.drawing_points, quote.quote_time);
    const previousLevel = drawingLevel(rule.drawing_points, rule.last_observed_at || quote.quote_time);
    const previousPrice = Number(rule.last_observed_price);
    const currentPrice = Number(quote.last_price);
    let crossedAbove = false;
    let crossedBelow = false;
    if (Number.isFinite(previousPrice) && Number.isFinite(currentLevel) && Number.isFinite(previousLevel)) {
      crossedAbove = previousPrice <= previousLevel && currentPrice > currentLevel;
      crossedBelow = previousPrice >= previousLevel && currentPrice < currentLevel;
    }
    const matches = rule.condition === "crosses_drawing_above" ? crossedAbove : rule.condition === "crosses_drawing_below" ? crossedBelow : crossedAbove || crossedBelow;
    const cooldownMs = Math.max(15, Number(rule.cooldown_minutes) || 15) * 60 * 1e3;
    const cooldownPassed = !rule.last_triggered_at || new Date(quote.quote_time).getTime() - new Date(rule.last_triggered_at).getTime() >= cooldownMs;
    const update = { last_observed_price: currentPrice, last_observed_at: quote.quote_time };
    if (matches && cooldownPassed) {
      if ((rule.market_code || "SA_MAIN") !== "SA_MAIN") continue;
      await queuePersonalAlertMessage(base44, rule, { ...quote, market_code: "SA_MAIN", last_price: currentPrice }, `drawing:${quote.quote_time}`, currentLevel);
      update.last_triggered_at = quote.quote_time;
      if (rule.frequency === "once") update.enabled = false;
      triggered += 1;
    }
    await base44.asServiceRole.entities.AlertRule.update(rule.id, update);
  }
  return { evaluated: rules.length, triggered };
}
function alertEvaluationBucket(quote, interval) {
  const observedAt = quote.provider_as_of || quote.source_time || quote.quote_time;
  const timestamp = new Date(observedAt).getTime();
  if (!Number.isFinite(timestamp)) return null;
  const local = new Date(timestamp + 3 * 60 * 60 * 1e3);
  const date = local.toISOString().slice(0, 10);
  const weekday = local.getUTCDay();
  const minuteOfDay = local.getUTCHours() * 60 + local.getUTCMinutes();
  const sessionMinute = minuteOfDay - 10 * 60;
  if (interval === "15m") return sessionMinute >= 0 && sessionMinute % 15 === 0 ? `${date}:15m:${sessionMinute / 15}` : null;
  if (["1h", "2h", "3h", "4h"].includes(interval)) {
    const duration = Number(interval.slice(0, -1)) * 60;
    return (sessionMinute > 0 && sessionMinute % duration === 0) || quote.is_final === true ? `${date}:${interval}:${Math.ceil(Math.max(0, sessionMinute) / duration)}` : null;
  }
  if (interval === "1d") return quote.is_final === true ? `${date}:1d` : null;
  if (interval === "1wk") return quote.is_final === true && weekday === 4 ? `${date}:1wk` : null;
  if (interval === "1mo" && quote.is_final === true) {
    const month = date.slice(0, 7);
    let hasLaterTradingDay = false;
    for (let offset = 1; offset <= 7; offset += 1) {
      const next = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + offset));
      if (next.toISOString().slice(0, 7) !== month) break;
      if ([0, 1, 2, 3, 4].includes(next.getUTCDay())) { hasLaterTradingDay = true; break; }
    }
    return hasLaterTradingDay ? null : `${month}:1mo`;
  }
  return null;
}
async function queueRuleDeliveries(base44, rule, quote, bucket) {
  if ((rule.market_code || "SA_MAIN") !== "SA_MAIN" || (quote.market_code && quote.market_code !== "SA_MAIN")) throw new Error("alert_market_mismatch");
  return await queuePersonalAlertMessage(base44, rule, { ...quote, market_code: "SA_MAIN" }, bucket);
}
async function evaluatePriceAlerts(base44, quotes) {
  const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
  const rules = (await base44.asServiceRole.entities.AlertRule.filter({ market_code: "SA_MAIN", enabled: true }, "-updated_date", 5e3))
    .filter((rule) => ["crosses_above", "crosses_below"].includes(rule.condition));
  let evaluated = 0;
  let triggered = 0;
  let deliveryEvents = 0;
  for (const rule of rules) {
    const quote = bySymbol.get(rule.symbol);
    const currentPrice = Number(quote?.last_price);
    const threshold = Number(rule.threshold);
    if (!quote || !Number.isFinite(currentPrice) || !Number.isFinite(threshold) || threshold <= 0) continue;
    const interval = ["15m", "1h", "2h", "3h", "4h", "1d", "1wk", "1mo"].includes(rule.interval) ? rule.interval : "15m";
    const bucket = alertEvaluationBucket(quote, interval);
    if (!bucket || rule.last_evaluation_bucket === bucket) continue;
    const previousPrice = Number(rule.last_observed_price);
    const crossed = rule.condition === "crosses_above"
      ? Number.isFinite(previousPrice) && previousPrice <= threshold && currentPrice > threshold
      : Number.isFinite(previousPrice) && previousPrice >= threshold && currentPrice < threshold;
    const observedAt = quote.provider_as_of || quote.source_time || quote.quote_time;
    const cooldownMs = Math.max(15, Number(rule.cooldown_minutes) || 15) * 60 * 1e3;
    const cooldownPassed = !rule.last_triggered_at || new Date(observedAt).getTime() - new Date(rule.last_triggered_at).getTime() >= cooldownMs;
    const update = { last_observed_price: currentPrice, last_observed_at: observedAt, last_evaluation_bucket: bucket };
    evaluated += 1;
    if (crossed && cooldownPassed) {
      deliveryEvents += await queueRuleDeliveries(base44, rule, quote, bucket);
      update.last_triggered_at = observedAt;
      if (rule.frequency === "once") update.enabled = false;
      triggered += 1;
    }
    await base44.asServiceRole.entities.AlertRule.update(rule.id, update);
  }
  return { rules: rules.length, evaluated, triggered, delivery_events: deliveryEvents };
}
async function licensedSource(base44, providerCode, providerUrl) {
  const existing = (await base44.asServiceRole.entities.DataSource.filter({ code: providerCode }))[0] || null;
  const common = {
    name: existing?.name || "Licensed Saudi market T+15 feed",
    source_type: "licensed",
    market_code: SAUDI_MAIN_MARKET,
    quote_mode: "delayed",
    delay_seconds: SAUDI_DELAY_SECONDS,
    license_status: existing?.license_status || "pending",
    public_enabled: existing?.public_enabled === true,
    ...providerUrl ? { base_url: providerUrl } : {}
  };
  return existing ? await base44.asServiceRole.entities.DataSource.update(existing.id, common) : await base44.asServiceRole.entities.DataSource.create({ code: providerCode, ...common });
}
async function experimentalPublicSource(base44) {
  return await source(base44, "EXPERIMENTAL_PUBLIC_DELAYED_15M", {
    name: "Experimental public delayed 15-minute charts",
    source_type: "reference",
    market_code: SAUDI_MAIN_MARKET,
    quote_mode: "delayed",
    delay_seconds: SAUDI_DELAY_SECONDS,
    license_status: "restricted",
    public_enabled: false,
    base_url: "https://query1.finance.yahoo.com",
  });
}
async function recordQualityIssues(base44, sourceId, runId, snapshotVersion, issues, options = {}) {
  if (!issues.length && options.resolveRecovered !== true) return;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existing = await base44.asServiceRole.entities.DataQualityIssue.filter({ status: "open", source_id: sourceId });
  const keyFor = (row) => `${row.instrument_id || row.symbol || "market"}:${row.issue_type}`;
  const byKey = new Map(existing.map((row) => [keyFor(row), row]));
  const creates = [];
  const updates = [];
  const groups = groupRowsByKey(issues, keyFor);
  const currentKeys = new Set(groups.map((group) => group.key));
  for (const group of groups) {
    const issue = group.row;
    const current = byKey.get(group.key);
    const values = {
      instrument_id: issue.instrument_id || void 0,
      symbol: issue.symbol || void 0,
      market_code: options.marketCode || issue.market_code || "SA_MAIN",
      issue_type: issue.issue_type,
      severity: issue.severity || "warning",
      message: issue.message,
      status: "open",
      source_id: sourceId,
      run_id: runId,
      snapshot_version: snapshotVersion || void 0,
      first_seen_at: current?.first_seen_at || now,
      last_seen_at: now,
      occurrence_count: Number(current?.occurrence_count || 0) + group.count
    };
    if (current) updates.push({ id: current.id, ...values });
    else creates.push(values);
  }
  if (options.resolveRecovered === true) {
    for (const previous of existing) {
      if (currentKeys.has(keyFor(previous))) continue;
      updates.push({
        id: previous.id,
        market_code: options.marketCode || previous.market_code || "SA_MAIN",
        status: "resolved",
        resolved_at: now,
      });
    }
  }
  if (creates.length) await base44.asServiceRole.entities.DataQualityIssue.bulkCreate(creates);
  await bulkUpdateUnique(base44.asServiceRole.entities.DataQualityIssue, updates);
}
async function markMissingQuotesStale(base44, instrumentIds, acceptedQuotes, marketCode) {
  const acceptedIds = new Set(acceptedQuotes.map((quote) => quote.instrument_id));
  const expectedIds = new Set(instrumentIds);
  const existing = await base44.asServiceRole.entities.QuoteLatest.filter({
    instrument_id: { $in: instrumentIds },
    market_code: marketCode
  }, "-quote_time", instrumentIds.length);
  const updates = existing.filter((quote) => expectedIds.has(quote.instrument_id) && !acceptedIds.has(quote.instrument_id)).map((quote) => ({
    id: quote.id,
    freshness_status: "stale",
    quality_status: "stale"
  }));
  await bulkUpdateUnique(base44.asServiceRole.entities.QuoteLatest, updates);
}
async function loadCurrentCandleState(base44, sessionDate, instrumentIds, marketCode) {
  const expectedInstrumentIds = new Set(instrumentIds);
  const belongsToRequestedMarket = (chunk) => expectedInstrumentIds.has(chunk.instrument_id)
    && (!chunk.market_code || chunk.market_code === marketCode);
  const [quotes, exactChunks] = await Promise.all([
    base44.asServiceRole.entities.QuoteLatest.filter({
      instrument_id: { $in: instrumentIds },
      market_code: marketCode
    }, "-updated_date", instrumentIds.length),
    base44.asServiceRole.entities.CandleChunk.filter({ interval: "15m", session_date: sessionDate })
  ]);
  const chunksByKey = new Map((Array.isArray(exactChunks) ? exactChunks : [])
    .filter(belongsToRequestedMarket)
    .map((chunk) => [chunk.chunk_key, chunk]));
  if (chunksByKey.size < Math.floor(instrumentIds.length * 0.95)) {
    const recent = await base44.asServiceRole.entities.CandleChunk.list("-end_time", 1e3);
    for (const chunk of Array.isArray(recent) ? recent : []) {
      if (chunk.interval !== "15m") continue;
      if (!belongsToRequestedMarket(chunk)) continue;
      if (chunk.session_date !== sessionDate && !String(chunk.chunk_key || "").endsWith(`-${sessionDate}`)) continue;
      if (!chunksByKey.has(chunk.chunk_key)) chunksByKey.set(chunk.chunk_key, chunk);
    }
  }
  return {
    quotes: Array.isArray(quotes) ? quotes : [],
    chunks: [...chunksByKey.values()]
  };
}
async function persistIncrementalCandleChunks(base44, rows, existingChunks) {
  const uniqueRows = groupRowsByKey(rows, (row) => `${row.instrument_id}:${row.interval}:${row.chunk_key}`).map((group) => group.row);
  const existingByKey = new Map((Array.isArray(existingChunks) ? existingChunks : []).map((row) => [
    `${row.instrument_id}:${row.interval}:${row.chunk_key}`,
    row
  ]));
  const creates = [];
  const updates = [];
  for (const row of uniqueRows) {
    const key = `${row.instrument_id}:${row.interval}:${row.chunk_key}`;
    const existing = existingByKey.get(key);
    if (existing) updates.push({ id: existing.id, ...row });
    else creates.push(row);
  }
  if (creates.length) await base44.asServiceRole.entities.CandleChunk.bulkCreate(creates);
  await bulkUpdateUnique(base44.asServiceRole.entities.CandleChunk, updates);
  return { created: creates.length, updated: updates.length };
}
async function providerCandleChunks(payload, mappings, instruments, sourceId, sessionDate, provenance, existingChunks = []) {
  const chunks = mergeIncrementalCandleChunks(
    normalizeProviderCandles(payload, mappings, instruments, sourceId, sessionDate, provenance.marketCode),
    existingChunks
  );
  return await Promise.all(chunks.map(async (chunk) => ({
    ...chunk,
    checksum: await checksum(chunk.bars),
    run_id: provenance.runId,
    snapshot_version: provenance.snapshotVersion,
    provider_as_of: provenance.providerAsOf,
    received_time: provenance.receivedTime,
    canonical_version: "sa-main-intraday-v2",
    is_final: provenance.isFinal === true,
    bucket_count: chunk.bar_count,
    completeness_status: provenance.isFinal === true && chunk.bar_count >= 21
      ? "complete"
      : chunk.bar_count >= 4 ? "degraded" : "incomplete"
  })));
}
function ingestionFailure(message, code = "MARKET_INGESTION_FAILED", status = 503) {
  return Object.assign(new Error(message), { code, status });
}
function earliestInteriorCandleGap(bars, intervalMilliseconds = 15 * 60 * 1e3) {
  const ordered = uniqueSortedBars(bars);
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = new Date(ordered[index - 1].time).getTime();
    const current = new Date(ordered[index].time).getTime();
    if (current - previous > intervalMilliseconds + 1e3) {
      return new Date(previous + intervalMilliseconds).toISOString();
    }
  }
  return "";
}
const INGESTION_LEASE_MS = 4 * 60 * 1e3;
function ingestionRunOrder(left, right) {
  const started = Date.parse(left?.started_at || left?.created_date || 0) - Date.parse(right?.started_at || right?.created_date || 0);
  return started || String(left?.id || "").localeCompare(String(right?.id || ""), "en");
}
async function renewOwnedIngestionLease(base44, run) {
  const now = Date.now();
  const contenders = (await base44.asServiceRole.entities.IngestionRun.filter({
    slot_key: run.slot_key,
    status: "running"
  }, "started_at", 20)).filter((candidate) => Date.parse(candidate.lease_expires_at || 0) > now).sort(ingestionRunOrder);
  const owner = contenders[0] || null;
  if (!owner || owner.id !== run.id) {
    await base44.asServiceRole.entities.IngestionRun.update(run.id, {
      status: "failed",
      finished_at: new Date(now).toISOString(),
      failure_code: "SLOT_LEASE_SUPERSEDED",
      notes: JSON.stringify({ reason: "slot_lease_superseded", owner_run_id: owner?.id || null })
    });
    return false;
  }
  const leaseExpiresAt = new Date(now + INGESTION_LEASE_MS).toISOString();
  await base44.asServiceRole.entities.IngestionRun.update(run.id, { lease_expires_at: leaseExpiresAt });
  run.lease_expires_at = leaseExpiresAt;
  return true;
}
Deno.serve(async (req) => {
  let base44 = null;
  let run = null;
  let stage = "request";
  try {
    base44 = createClientFromRequest(req);
    const requestBody = await readJsonBody(req);
    const body = { ...requestBody, ...requestBody.args || {} };
    const scheduledSources = new Set(["experimental_t15", "close_price", "session_final"]);
    const isServiceInvocation = !body.session_id && scheduledSources.has(String(body.source || "")) && body.force !== true;
    const identity = isServiceInvocation
      ? await requireTrustedOwner(base44)
      : await requireDataIngestionPermission(base44, body.session_id, body.device_id);
    const user = identity.user || identity.identity;
    const effectiveSource = isServiceInvocation
      ? `scheduled_${String(body.source || "experimental_t15").replace(/^scheduled_/, "")}`
      : String(body.source || "manual");
    const marketCode = String(body.market_code || SAUDI_MAIN_MARKET);
    if (marketCode !== SAUDI_MAIN_MARKET) throw ingestionFailure("The requested market feed is not configured", "MARKET_FEED_NOT_CONFIGURED");
    const now = /* @__PURE__ */ new Date();
    const requestClock = riyadhClock(now);
    const requestMinuteOfDay = requestClock.hour * 60 + requestClock.minute;
    const inferredSlotKind = effectiveSource.includes("final")
      ? "session_final"
      : effectiveSource.includes("close") || !user && requestMinuteOfDay >= 16 * 60
        ? "close_price"
        : "quarter_hour";
    const slotKind = ["quarter_hour", "close_price", "session_final"].includes(String(body.slot_kind)) ? String(body.slot_kind) : isServiceInvocation ? inferredSlotKind : "manual";
    const schedule = slotDecision({ now, slotKind, source: effectiveSource });
    if (!schedule.run) return Response.json({ status: "skipped", reason: schedule.reason, clock: schedule.clock, phase: schedule.phase });
    stage = "market_calendar";
    const [holidays, sessions] = await Promise.all([
      base44.asServiceRole.entities.MarketHoliday.filter({ holiday_date: schedule.clock.date }),
      base44.asServiceRole.entities.MarketSession.filter({ session_date: schedule.clock.date })
    ]);
    if (holidays.length || sessions[0]?.is_trading_day === false) {
      return Response.json({ status: "skipped", reason: holidays.length ? "official_market_holiday" : "market_session_closed", clock: schedule.clock });
    }
    const expectedAsOfDate = new Date(expectedProviderAsOf(now));
    expectedAsOfDate.setUTCSeconds(0, 0);
    const expectedAsOf = expectedAsOfDate.toISOString();
    const slotKey = `${marketCode}:${schedule.clock.date}:${slotKind}:${expectedAsOf}`;
    const previousRuns = await base44.asServiceRole.entities.IngestionRun.filter({ slot_key: slotKey });
    const completed = previousRuns.find((item) => ["success", "partial"].includes(item.status));
    const active = previousRuns.find((item) => item.status === "running" && new Date(item.lease_expires_at || 0) > now);
    if (!body.force && (completed || active)) {
      return Response.json({ status: "skipped", reason: completed ? "slot_already_promoted" : "slot_already_running", slot_key: slotKey });
    }
    const providerUrl = String(Deno.env.get("SMART_INVESTOR_MARKET_DATA_URL") || "").trim();
    const providerToken = String(Deno.env.get("SMART_INVESTOR_MARKET_DATA_TOKEN") || "").trim();
    const configuredMode = String(Deno.env.get("SMART_INVESTOR_MARKET_DATA_MODE") || "experimental_public").trim();
    const useLicensedProvider = configuredMode === "licensed";
    const providerCode = useLicensedProvider
      ? String(Deno.env.get("SMART_INVESTOR_MARKET_DATA_PROVIDER_CODE") || "LICENSED_SAUDI_MARKET_T15").trim()
      : "EXPERIMENTAL_PUBLIC_DELAYED_15M";
    stage = "provider_source";
    const provider = useLicensedProvider
      ? await licensedSource(base44, providerCode, providerUrl)
      : await experimentalPublicSource(base44);
    stage = "catalog_readiness";
    const [existingMarkets, initialInstrumentRows] = await Promise.all([
      base44.asServiceRole.entities.Market.list("market_code", 100),
      base44.asServiceRole.entities.Instrument.filter({ market_code: "SA_MAIN" }, "symbol", 500)
    ]);
    const existingMarketCodes = new Set(existingMarkets.map((row) => row.market_code));
    if (GCC_MARKETS.some((row) => !existingMarketCodes.has(row.market_code))) {
      stage = "market_upsert";
      await upsertMany(base44, "Market", GCC_MARKETS, ["market_code"]);
    }
    let instruments = initialInstrumentRows.filter((row) => MAIN_MARKET_SYMBOLS.has(row.symbol));
    let tasi = initialInstrumentRows.find((row) => row.market_code === "SA_MAIN" && row.instrument_code === "TASI") || null;
    const catalogSymbols = new Set(instruments.map((row) => row.symbol));
    const catalogComplete = instruments.length === EXPECTED_INSTRUMENT_COUNT
      && [...MAIN_MARKET_SYMBOLS].every((symbol) => catalogSymbols.has(symbol));
    if (!catalogComplete || !tasi) {
      stage = "instrument_upsert";
      await upsertMany(base44, "Instrument", [...official_main_market_catalog_2026_07_21_default.companies.map(exactInstrument), TASI_INSTRUMENT], ["symbol"]);
      const refreshedInstrumentRows = await base44.asServiceRole.entities.Instrument.filter({ market_code: "SA_MAIN" }, "symbol", 500);
      instruments = refreshedInstrumentRows.filter((row) => MAIN_MARKET_SYMBOLS.has(row.symbol));
      tasi = refreshedInstrumentRows.find((row) => row.market_code === "SA_MAIN" && row.instrument_code === "TASI") || null;
    }
    if (instruments.length !== EXPECTED_INSTRUMENT_COUNT) {
      throw ingestionFailure(`Verified main-market catalog is incomplete: ${instruments.length}/${EXPECTED_INSTRUMENT_COUNT}`, "MARKET_CATALOG_INCOMPLETE");
    }
    await reconcileInstrumentTradingStatuses(base44, instruments);
    if (tasi) {
      await upsertMany(base44, "InstrumentAlias", [
        { instrument_id: tasi.id, market_code: "SA_MAIN", alias: "TASI", alias_type: "symbol", normalized_alias: "tasi", active: true },
        { instrument_id: tasi.id, market_code: "SA_MAIN", alias: "\u062a\u0627\u0633\u064a", alias_type: "search", normalized_alias: "\u062a\u0627\u0633\u064a", active: true },
        { instrument_id: tasi.id, market_code: "SA_MAIN", alias: "\u0627\u0644\u0645\u0624\u0634\u0631 \u0627\u0644\u0639\u0627\u0645", alias_type: "search", normalized_alias: "\u0627\u0644\u0645\u0648\u0634\u0631 \u0627\u0644\u0639\u0627\u0645", active: true },
        { instrument_id: tasi.id, market_code: "SA_MAIN", alias: "Tadawul All Share Index", alias_type: "search", normalized_alias: "tadawul all share index", active: true }
      ], ["instrument_id", "normalized_alias"]);
    }
    const officialSource = await source(base44, "SAUDI_EXCHANGE_DAILY_REFERENCE", {
      name: "\u062A\u062F\u0627\u0648\u0644 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629 \u2014 \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u064A\u0648\u0645\u064A \u0627\u0644\u062A\u0641\u0635\u064A\u0644\u064A",
      source_type: "official",
      market_code: SAUDI_MAIN_MARKET,
      quote_mode: "end_of_day",
      delay_seconds: 0,
      public_enabled: false,
      license_status: "restricted",
      base_url: official_main_market_catalog_2026_07_21_default.sourceUrl,
      last_verified_at: official_main_market_catalog_2026_07_21_default.quoteTime
    });
    await ensureSuspendedReferenceQuotes(base44, instruments, officialSource.id);
    const bySymbol = new Map(instruments.map((row) => [row.symbol, row]));
    const lossRows = official_main_market_catalog_2026_07_21_default.companies.map((row) => lossClassification(row, bySymbol.get(row.symbol)?.id, officialSource.id)).filter((row) => row.instrument_id);
    const existingLossRows = await base44.asServiceRole.entities.LossClassification.list("instrument_id", 500);
    const classifiedInstrumentIds = new Set(existingLossRows.map((row) => row.instrument_id));
    if (lossRows.some((row) => !classifiedInstrumentIds.has(row.instrument_id))) {
      stage = "loss_classification_upsert";
      await upsertMany(base44, "LossClassification", lossRows, ["instrument_id"]);
    }
    const tradableInstruments = instruments.filter((instrument) => instrument.status !== "suspended");
    const providerInstruments = [...tradableInstruments, ...(tasi ? [tasi] : [])];
    const expectedFeedCount = providerInstruments.length;
    const mappings = useLicensedProvider
      ? (await base44.asServiceRole.entities.ProviderInstrumentMap.filter({
        market_code: marketCode,
        provider_code: providerCode,
        quote_mode: "delayed",
        license_status: "approved",
        active: true
      })).filter((mapping) => providerInstruments.some((instrument) => instrument.id === mapping.instrument_id))
      : providerInstruments.map((instrument) => ({
        instrument_id: instrument.id,
        provider_symbol: publicProviderSymbol(instrument.symbol)
      }));
    stage = "ingestion_run_create";
    run = await base44.asServiceRole.entities.IngestionRun.create({
      run_type: effectiveSource,
      market_code: marketCode,
      slot_key: slotKey,
      slot_kind: slotKind,
      scheduled_for: now.toISOString(),
      started_at: now.toISOString(),
      lease_expires_at: new Date(now.getTime() + INGESTION_LEASE_MS).toISOString(),
      total_records: expectedFeedCount,
      success_count: 0,
      failed_count: expectedFeedCount,
      coverage_percent: 0,
      attempt_count: 0,
      status: "running",
      source_id: provider.id,
      notes: JSON.stringify({
        mode: useLicensedProvider ? "licensed_t15" : "experimental_public",
        provider_configured: useLicensedProvider ? Boolean(providerUrl && providerToken) : true,
        mapping_count: mappings.length
      })
    });
    if (!await renewOwnedIngestionLease(base44, run)) {
      return Response.json({ status: "skipped", reason: "slot_lease_superseded", slot_key: slotKey });
    }
    if (useLicensedProvider && (!providerUrl || !providerToken)) {
      await recordQualityIssues(base44, provider.id, run.id, "", [{
        issue_type: "provider_not_configured",
        severity: "critical",
        message: "Licensed market-data URL or token is not configured"
      }]);
      throw ingestionFailure("Licensed market-data credentials are not configured", "MARKET_FEED_NOT_CONFIGURED");
    }
    if (useLicensedProvider && (provider.license_status !== "approved" || provider.public_enabled !== true)) {
      await recordQualityIssues(base44, provider.id, run.id, "", [{
        issue_type: "provider_license_not_approved",
        severity: "critical",
        message: "Licensed feed is blocked until redistribution approval is recorded"
      }]);
      throw ingestionFailure("Licensed market-data redistribution is not approved", "MARKET_LICENSE_NOT_APPROVED");
    }
    if (useLicensedProvider && mappings.length !== expectedFeedCount) {
      await recordQualityIssues(base44, provider.id, run.id, "", [{
        issue_type: "provider_mapping_incomplete",
        severity: "critical",
        message: `Approved provider mappings are incomplete: ${mappings.length}/${expectedFeedCount}`
      }]);
      throw ingestionFailure("Provider instrument mapping is incomplete", "PROVIDER_MAPPING_INCOMPLETE");
    }
    stage = "candle_cursor_load";
    const candleState = await loadCurrentCandleState(
      base44,
      schedule.clock.date,
      providerInstruments.map((instrument) => instrument.id),
      marketCode
    );
    const candleContexts = buildPublicCandleContexts({
      instruments: providerInstruments,
      quotes: candleState.quotes,
      chunks: candleState.chunks,
      sessionDate: schedule.clock.date
    });
    const symbolByInstrumentId = new Map(providerInstruments.map((instrument) => [instrument.id, instrument.symbol]));
    let payload;
    let attemptCount = 0;
    let requestModes = { incremental: 0, bootstrap: 0, backfill: 0, gap_recovery: 0 };
    try {
      stage = "provider_fetch";
      if (useLicensedProvider) {
        const providerResult = await fetchLicensedSnapshot({
          url: providerUrl,
          token: providerToken,
          requestBody: {
            market_code: marketCode,
            provider_symbols: mappings.map((mapping) => mapping.provider_symbol),
            candle_cursors: mappings.map((mapping) => ({
              provider_symbol: mapping.provider_symbol,
              after: candleContexts.get(symbolByInstrumentId.get(mapping.instrument_id))?.watermark || null
            })),
            expected_as_of: expectedAsOf,
            delay_seconds: SAUDI_DELAY_SECONDS,
            slot_kind: slotKind
          }
        });
        payload = providerResult.payload;
        attemptCount = providerResult.attemptCount;
      } else {
        const providerResult = await fetchPublicDelayedCharts({
          symbols: providerInstruments.map((instrument) => instrument.symbol),
          contextsBySymbol: candleContexts,
          now
        });
        payload = providerResult.payload;
        attemptCount = Math.max(1, Math.ceil(providerResult.requestCount / providerInstruments.length));
        requestModes = providerResult.requestModes;
      }
    } catch (error) {
      await recordQualityIssues(base44, provider.id, run.id, "", [{
        issue_type: "provider_request_failed",
        severity: "critical",
        message: "Market-data source request failed after bounded retries"
      }]);
      throw ingestionFailure(error?.message || "Market-data source request failed", "PROVIDER_REQUEST_FAILED");
    }
    if (!await renewOwnedIngestionLease(base44, run)) {
      return Response.json({ status: "skipped", reason: "slot_lease_superseded", slot_key: slotKey });
    }
    const providerAsOf = String(payload?.data?.provider_as_of || payload?.provider_as_of || payload?.data?.as_of || payload?.as_of || "");
    const snapshotVersion = await stableSnapshotVersion({ marketCode, providerCode, providerAsOf, slotKey });
    stage = "snapshot_normalization";
    const receivedAt = (/* @__PURE__ */ new Date()).toISOString();
    const normalized = normalizeLicensedSnapshot({
      payload,
      mappings,
      instruments: providerInstruments,
      sourceId: provider.id,
      runId: run.id,
      snapshotVersion,
      receivedAt,
      slotKind,
      validationMode: useLicensedProvider ? "licensed_t15" : "experimental_public"
    });
    const coverage = coverageStatus(normalized.accepted.length, expectedFeedCount);
    if (!await renewOwnedIngestionLease(base44, run)) {
      return Response.json({ status: "skipped", reason: "slot_lease_superseded", slot_key: slotKey });
    }
    if (rawQuoteObservationPersistenceEnabled() && normalized.accepted.length) {
      stage = "quote_observation_create";
      await base44.asServiceRole.entities.QuoteObservation.bulkCreate(normalized.accepted);
    }
    const publicSourceIssues = Array.isArray(payload?.rejected) ? payload.rejected : [];
    stage = "quality_issue_upsert";
    await recordQualityIssues(base44, provider.id, run.id, snapshotVersion, [...publicSourceIssues, ...normalized.rejected], {
      marketCode,
      resolveRecovered: coverage.status !== "failed",
    });
    if (coverage.status === "failed") {
      throw ingestionFailure(`Market snapshot coverage failed: ${coverage.coveragePercent.toFixed(2)}%`, "MARKET_COVERAGE_FAILED");
    }
    stage = "quote_latest_upsert";
    await upsertMany(base44, "QuoteLatest", normalized.accepted, ["instrument_id"]);
    stage = "missing_quote_mark_stale";
    await markMissingQuotesStale(base44, providerInstruments.map((instrument) => instrument.id), normalized.accepted, marketCode);
    stage = "candle_chunk_upsert";
    const candleChunks = await providerCandleChunks(payload, mappings, providerInstruments, provider.id, schedule.clock.date, {
      runId: run.id,
      snapshotVersion,
      providerAsOf: normalized.providerAsOf,
      receivedTime: receivedAt,
      marketCode,
      isFinal: normalized.isFinal
    }, candleState.chunks);
    const candlePersistence = await persistIncrementalCandleChunks(base44, candleChunks, candleState.chunks);
    if (!await renewOwnedIngestionLease(base44, run)) {
      return Response.json({ status: "skipped", reason: "slot_lease_superseded", slot_key: slotKey });
    }
    stage = "drawing_alert_evaluation";
    const drawingAlerts = await evaluateDrawingAlerts(base44, normalized.accepted);
    stage = "price_alert_evaluation";
    const priceAlerts = await evaluatePriceAlerts(base44, normalized.accepted);
    const finishedAt = (/* @__PURE__ */ new Date()).toISOString();
    const finalStatus = coverage.status === "healthy" ? "success" : "partial";
    stage = "ingestion_run_finalize";
    await base44.asServiceRole.entities.IngestionRun.update(run.id, {
      finished_at: finishedAt,
      provider_as_of: normalized.providerAsOf,
      snapshot_version: snapshotVersion,
      total_records: expectedFeedCount,
      success_count: normalized.accepted.length,
      failed_count: normalized.rejected.length,
      coverage_percent: coverage.coveragePercent,
      latency_ms: new Date(finishedAt).getTime() - now.getTime(),
      attempt_count: attemptCount,
      status: finalStatus,
      promoted_at: finishedAt,
      notes: JSON.stringify({
        mode: useLicensedProvider ? "licensed_t15" : "experimental_public",
        candle_chunks: candleChunks.length,
        candle_chunks_created: candlePersistence.created,
        candle_chunks_updated: candlePersistence.updated,
        request_modes: requestModes,
        rejected_count: normalized.rejected.length,
        source_issue_count: publicSourceIssues.length
      })
    });
    await base44.asServiceRole.entities.DataSource.update(provider.id, { last_verified_at: normalized.providerAsOf });
    return Response.json({
      status: finalStatus,
      market_code: marketCode,
      slot_key: slotKey,
      slot_kind: slotKind,
      snapshot_version: snapshotVersion,
      provider_as_of: normalized.providerAsOf,
      received_at: finishedAt,
      delay_seconds: SAUDI_DELAY_SECONDS,
      coverage_percent: coverage.coveragePercent,
      success_count: normalized.accepted.length,
      failed_count: normalized.rejected.length,
      candle_chunk_count: candleChunks.length,
      candle_chunks_created: candlePersistence.created,
      candle_chunks_updated: candlePersistence.updated,
      request_modes: requestModes,
      drawing_alerts: drawingAlerts,
      price_alerts: priceAlerts,
      is_final: normalized.isFinal
    });
  } catch (error) {
    console.error("SMART_INVESTOR market ingestion failed", {
      stage,
      run_id: run?.id || null,
      slot_key: run?.slot_key || null,
      code: error?.code || "MARKET_INGESTION_FAILED",
      message: error?.message || "Market ingestion failed"
    });
    if (base44 && run?.id) {
      try {
        const finishedAt = (/* @__PURE__ */ new Date()).toISOString();
        await base44.asServiceRole.entities.IngestionRun.update(run.id, {
          finished_at: finishedAt,
          latency_ms: new Date(finishedAt).getTime() - new Date(run.started_at).getTime(),
          status: "failed",
          failure_code: error?.code || "MARKET_INGESTION_FAILED",
          notes: JSON.stringify({ failure_code: error?.code || "MARKET_INGESTION_FAILED" })
        });
      } catch (runError) {
        console.error("SMART_INVESTOR failed to finalize ingestion run", runError);
      }
    }
    return replyError(error);
  }
});
