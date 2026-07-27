export const SAUDI_MAIN_MARKET = "SA_MAIN";
export const SAUDI_DELAY_SECONDS = 15 * 60;
export const EXPECTED_INSTRUMENT_COUNT = 270;
export const COVERAGE_HEALTHY_PERCENT = 99;
export const COVERAGE_FAILED_PERCENT = 95;
export const PROVIDER_FRESHNESS_GRACE_SECONDS = 5 * 60;
export const EXPERIMENTAL_SOURCE_MAX_AGE_SECONDS = 60 * 60;
export const MARKET_AUTOMATION_SPECS = Object.freeze([
  { name: "saudi_t15_1015_1045_riyadh", cron: "15,30,45 7 * * 0-4", slotKind: "quarter_hour", active: false },
  { name: "saudi_t15_1100_1445_riyadh", cron: "0,15,30,45 8-11 * * 0-4", slotKind: "quarter_hour", active: false },
  { name: "saudi_t15_1500_1515_riyadh", cron: "0,15 12 * * 0-4", slotKind: "quarter_hour", active: false },
  { name: "saudi_close_price_1526_riyadh", cron: "26 12 * * 0-4", slotKind: "close_price", active: false },
  { name: "saudi_session_final_1536_riyadh", cron: "36 12 * * 0-4", slotKind: "session_final", active: false },
]);

const RIYADH_TIMEZONE = "Asia/Riyadh";
const TRADING_WEEKDAYS = new Set(["Sun", "Mon", "Tue", "Wed", "Thu"]);

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
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

export function riyadhClock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: RIYADH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function marketPhase(clock, slotKind = "quarter_hour") {
  if (!TRADING_WEEKDAYS.has(clock.weekday)) return "closed";
  const minuteOfDay = clock.hour * 60 + clock.minute;
  if (slotKind === "close_price" || minuteOfDay >= 15 * 60 + 10 && minuteOfDay < 15 * 60 + 20) return "trade_at_last";
  if (slotKind === "session_final" || minuteOfDay >= 15 * 60 + 20) return "closed";
  if (minuteOfDay >= 15 * 60) return "closing_auction";
  if (minuteOfDay >= 10 * 60) return "continuous";
  if (minuteOfDay >= 9 * 60 + 30) return "opening_auction";
  return "closed";
}

export function slotDecision({ now = new Date(), slotKind = "quarter_hour", source = "" } = {}) {
  const clock = riyadhClock(now);
  const scheduled = String(source).startsWith("scheduled_");
  if (!scheduled) return { run: true, clock, phase: marketPhase(clock, slotKind) };
  if (!TRADING_WEEKDAYS.has(clock.weekday)) return { run: false, reason: "non_trading_weekday", clock, phase: "closed" };
  const minuteOfDay = clock.hour * 60 + clock.minute;
  const allowed = slotKind === "close_price"
    ? minuteOfDay >= 15 * 60 + 24 && minuteOfDay <= 16 * 60 + 10
    : slotKind === "session_final"
      ? minuteOfDay >= 15 * 60 + 34 && minuteOfDay <= 16 * 60 + 10
      : minuteOfDay >= 10 * 60 + 14 && minuteOfDay <= 15 * 60 + 16;
  return allowed
    ? { run: true, clock, phase: marketPhase(clock, slotKind) }
    : { run: false, reason: "outside_scheduled_slot", clock, phase: marketPhase(clock, slotKind) };
}

export function expectedProviderAsOf(now = new Date()) {
  const delayed = new Date(now.getTime() - SAUDI_DELAY_SECONDS * 1000);
  delayed.setUTCMinutes(Math.floor(delayed.getUTCMinutes() / 15) * 15, 0, 0);
  return delayed.toISOString();
}

export function coverageStatus(successCount, totalCount) {
  const coveragePercent = totalCount > 0 ? successCount / totalCount * 100 : 0;
  const status = coveragePercent >= COVERAGE_HEALTHY_PERCENT
    ? "healthy"
    : coveragePercent >= COVERAGE_FAILED_PERCENT
      ? "degraded"
      : "failed";
  return { coveragePercent, status };
}

export function freshnessStatus(providerAsOf, receivedAt, delaySeconds = SAUDI_DELAY_SECONDS) {
  const sourceMilliseconds = new Date(providerAsOf).getTime();
  const receivedMilliseconds = new Date(receivedAt).getTime();
  if (!Number.isFinite(sourceMilliseconds) || !Number.isFinite(receivedMilliseconds)) return "stale";
  const ageSeconds = Math.max(0, (receivedMilliseconds - sourceMilliseconds) / 1000);
  return ageSeconds <= delaySeconds + PROVIDER_FRESHNESS_GRACE_SECONDS ? "fresh" : "stale";
}

export async function stableSnapshotVersion(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes)).map((item) => item.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

function quoteRows(payload) {
  const root = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  if (!root || !Array.isArray(root.quotes)) throw new Error("Provider payload must include quotes[]");
  return { root, quotes: root.quotes };
}

export function normalizeLicensedSnapshot({
  payload,
  mappings,
  instruments,
  sourceId,
  runId,
  snapshotVersion,
  receivedAt = new Date().toISOString(),
  slotKind = "quarter_hour",
  validationMode = "licensed_t15",
}) {
  const { root, quotes } = quoteRows(payload);
  const providerAsOf = isoTime(root.provider_as_of || root.as_of, "provider_as_of");
  const receivedIso = isoTime(receivedAt, "received_time");
  const providerAgeSeconds = (new Date(receivedIso).getTime() - new Date(providerAsOf).getTime()) / 1000;
  if (validationMode === "licensed_t15" && providerAgeSeconds < SAUDI_DELAY_SECONDS - 2 * 60) {
    throw new Error("Provider snapshot is not delayed by the contracted 15 minutes");
  }
  if (validationMode === "licensed_t15" && providerAgeSeconds > SAUDI_DELAY_SECONDS + PROVIDER_FRESHNESS_GRACE_SECONDS) {
    throw new Error("Provider snapshot missed the expected T+15 freshness window");
  }
  if (providerAgeSeconds < -60) throw new Error("Provider snapshot time is in the future");
  const reportedDelaySeconds = validationMode === "licensed_t15"
    ? SAUDI_DELAY_SECONDS
    : Math.max(0, Math.round(providerAgeSeconds));
  const instrumentById = new Map(instruments.map((instrument) => [instrument.id, instrument]));
  const rawByProviderSymbol = new Map();
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
    if ([lastPrice, previousClose, open, high, low].some((value) => value === null)
      || high < Math.max(open, lastPrice)
      || low > Math.min(open, lastPrice)) {
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
      if (new Date(lastTradeTime).getTime() > new Date(providerAsOf).getTime() + 60 * 1000) {
        rejected.push({ instrument_id: instrument.id, symbol: instrument.symbol, issue_type: "future_trade_time", message: "Last trade time is newer than the provider snapshot" });
        continue;
      }
    }
    const freshness = validationMode === "licensed_t15"
      ? freshnessStatus(providerAsOf, receivedIso)
      : providerAgeSeconds <= EXPERIMENTAL_SOURCE_MAX_AGE_SECONDS ? "fresh" : "stale";
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
      ...(lastTradeTime ? { last_trade_time: lastTradeTime } : {}),
      received_time: receivedIso,
      delay_seconds: reportedDelaySeconds,
      license_status: validationMode === "licensed_t15" ? "approved" : "pending",
      quote_time: providerAsOf,
      market_phase: phase,
      freshness_status: freshness,
      quality_status: freshness === "fresh" ? "verified" : "stale",
      is_final: final,
      run_id: runId,
      snapshot_version: snapshotVersion,
    });
  }

  return { providerAsOf, phase, isFinal: final, accepted, rejected };
}

function chartBars(result) {
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0] || {};
  return timestamps.map((timestamp, index) => {
    const time = new Date(Number(timestamp) * 1000);
    const open = positiveNumber(quote.open?.[index]);
    const high = positiveNumber(quote.high?.[index]);
    const low = positiveNumber(quote.low?.[index]);
    const close = positiveNumber(quote.close?.[index]);
    const volume = nonNegativeNumber(quote.volume?.[index]);
    if (!Number.isFinite(time.getTime())
      || [open, high, low, close].some((value) => value === null)
      || high < Math.max(open, close)
      || low > Math.min(open, close)) return null;
    return {
      time: time.toISOString(),
      session_date: riyadhClock(time).date,
      open,
      high,
      low,
      close,
      volume,
    };
  }).filter(Boolean).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

export function normalizePublicDelayedCharts(chartResults) {
  const quotes = [];
  const candles = [];
  const rejected = [];
  let providerAsOf = "";

  for (const item of chartResults) {
    const symbol = String(item?.symbol || "").trim();
    const bars = chartBars(item?.result);
    const sessions = new Map();
    for (const bar of bars) {
      if (!sessions.has(bar.session_date)) sessions.set(bar.session_date, []);
      sessions.get(bar.session_date).push(bar);
    }
    const dates = [...sessions.keys()].sort();
    if (!symbol || dates.length < 2) {
      rejected.push({ symbol, issue_type: "public_chart_incomplete", message: "Public delayed chart did not include two valid trading sessions" });
      continue;
    }
    const sessionDate = dates[dates.length - 1];
    const currentBars = sessions.get(sessionDate);
    const previousBars = sessions.get(dates[dates.length - 2]);
    const first = currentBars[0];
    const last = currentBars[currentBars.length - 1];
    const previousClose = previousBars[previousBars.length - 1]?.close;
    if (!positiveNumber(previousClose)) {
      rejected.push({ symbol, issue_type: "previous_close_missing", message: "Public delayed chart did not include a valid previous-session close" });
      continue;
    }
    const high = Math.max(...currentBars.map((bar) => bar.high));
    const low = Math.min(...currentBars.map((bar) => bar.low));
    const volume = currentBars.reduce((sum, bar) => sum + nonNegativeNumber(bar.volume), 0);
    const changePercent = (last.close - previousClose) / previousClose * 100;
    const providerSymbol = `${symbol}.SR`;
    const metaTradeTime = new Date(Number(item?.result?.meta?.regularMarketTime) * 1000);
    const lastTradeTime = Number.isFinite(metaTradeTime.getTime())
      && riyadhClock(metaTradeTime).date === sessionDate
      && metaTradeTime.getTime() >= new Date(last.time).getTime()
      ? metaTradeTime.toISOString()
      : last.time;
    quotes.push({
      provider_symbol: providerSymbol,
      last_price: last.close,
      previous_close: previousClose,
      open: first.open,
      high,
      low,
      volume,
      change_percent: changePercent,
      last_trade_time: lastTradeTime,
    });
    candles.push({
      provider_symbol: providerSymbol,
      bars: currentBars.map(({ time, open, high: barHigh, low: barLow, close, volume: barVolume }) => ({
        time,
        open,
        high: barHigh,
        low: barLow,
        close,
        volume: barVolume,
      })),
    });
    if (!providerAsOf || new Date(lastTradeTime).getTime() > new Date(providerAsOf).getTime()) providerAsOf = lastTradeTime;
  }

  if (!providerAsOf) throw new Error("Public delayed charts did not contain any usable quotes");
  return { provider_as_of: providerAsOf, quotes, candles, rejected };
}

export async function fetchPublicDelayedCharts({
  symbols,
  fetchImpl = fetch,
  concurrency = 15,
  attempts = 2,
  timeoutMilliseconds = 15_000,
}) {
  const queue = [...new Set(symbols.map((value) => String(value).trim()).filter((value) => /^\d{4}$/.test(value)))];
  const results = [];
  const failures = [];
  let cursor = 0;
  let requestCount = 0;

  async function fetchOne(symbol) {
    let lastError = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      requestCount += 1;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);
      try {
        const providerSymbol = `${symbol}.SR`;
        const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(providerSymbol)}`);
        url.searchParams.set("interval", "15m");
        url.searchParams.set("range", "5d");
        url.searchParams.set("includePrePost", "false");
        url.searchParams.set("events", "div,splits");
        const response = await fetchImpl(url, {
          headers: { Accept: "application/json", "User-Agent": "KMY-Experimental-Market-Data/1.0" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Public delayed source returned ${response.status}`);
        const payload = await response.json();
        const result = payload?.chart?.result?.[0];
        if (!result) throw new Error("Public delayed source returned no chart");
        results.push({ symbol, result });
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
  const normalized = normalizePublicDelayedCharts(results);
  return {
    payload: {
      ...normalized,
      rejected: [...failures, ...normalized.rejected],
    },
    requestCount,
  };
}

export function normalizeProviderCandles(payload, mappings, instruments, sourceId, sessionDate) {
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
      volume: nonNegativeNumber(bar.volume),
    })).filter((bar) => [bar.open, bar.high, bar.low, bar.close].every((value) => value !== null)
      && bar.high >= Math.max(bar.open, bar.close)
      && bar.low <= Math.min(bar.open, bar.close));
    if (!bars.length) continue;
    chunks.push({
      instrument_id: instrument.id,
      symbol: instrument.symbol,
      interval: "15m",
      chunk_key: `${instrument.symbol}-15m-${sessionDate}`,
      start_time: bars[0].time,
      end_time: bars[bars.length - 1].time,
      bars,
      bar_count: bars.length,
      source_id: sourceId,
      quality_status: "verified",
    });
  }
  return chunks;
}

export async function fetchLicensedSnapshot({
  url,
  token,
  requestBody,
  fetchImpl = fetch,
  attempts = 3,
  timeoutMilliseconds = 20_000,
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
          "User-Agent": "KMY-Licensed-Market-Data/1.0",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Licensed provider returned ${response.status}`);
      return { payload: await response.json(), attemptCount: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt === 1 ? 1500 : 4000));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error("Licensed provider request failed");
}
