export const SAUDI_MAIN_MARKET = "SA_MAIN";
export const SAUDI_DELAY_SECONDS = 15 * 60;
export const EXPECTED_INSTRUMENT_COUNT = 270;
export const COVERAGE_HEALTHY_PERCENT = 99;
export const COVERAGE_FAILED_PERCENT = 95;
// The provider is delayed by 15 minutes, while ingestion is scheduled hourly.
// Treat a snapshot as stale only after the next scheduled cycle plus bounded
// processing headroom has been missed.
export const MARKET_REFRESH_CADENCE_SECONDS = 60 * 60;
export const INGESTION_PROCESSING_GRACE_SECONDS = 10 * 60;
export const PROVIDER_FRESHNESS_GRACE_SECONDS = MARKET_REFRESH_CADENCE_SECONDS
  + INGESTION_PROCESSING_GRACE_SECONDS;
export const EXPERIMENTAL_SOURCE_MAX_AGE_SECONDS = 60 * 60;
export const PUBLIC_CANDLE_OVERLAP_MILLISECONDS = 15 * 60 * 1000;
export const PUBLIC_CANDLE_MAX_INCREMENTAL_LOOKBACK_MILLISECONDS = 8 * 24 * 60 * 60 * 1000;
const SAUDI_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Riyadh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function historicalProviderDateTime(value) {
  const date = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = new Date(`${date}T07:00:00.000Z`);
  return Number.isFinite(time.getTime()) ? time.toISOString() : null;
}

export function yahooHistoricalDateTime(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const instant = new Date(seconds * 1000);
  if (!Number.isFinite(instant.getTime())) return null;
  const date = SAUDI_DATE_FORMATTER.format(instant);
  return historicalProviderDateTime(date);
}

export function normalizeYahooHistoricalBars(payload, requestedFrom, requestedTo) {
  const chartError = payload?.chart?.error;
  if (chartError) {
    throw Object.assign(new Error(String(chartError.description || chartError.code || "Historical source returned an error")), {
      code: String(chartError.code || "HISTORY_PROVIDER_FAILED"),
    });
  }
  const result = payload?.chart?.result?.[0];
  if (!result || String(result?.meta?.dataGranularity || "1d") !== "1d") {
    throw Object.assign(new Error("Historical source returned a non-daily dataset"), { code: "HISTORY_INTERVAL_MISMATCH" });
  }
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0] || {};
  const opens = Array.isArray(quote.open) ? quote.open : [];
  const highs = Array.isArray(quote.high) ? quote.high : [];
  const lows = Array.isArray(quote.low) ? quote.low : [];
  const closes = Array.isArray(quote.close) ? quote.close : [];
  const volumes = Array.isArray(quote.volume) ? quote.volume : [];
  const byTime = new Map();
  let duplicateCount = 0;
  let rejectedCount = 0;
  for (let index = 0; index < timestamps.length; index += 1) {
    const time = yahooHistoricalDateTime(timestamps[index]);
    const bar = {
      time,
      open: Number(opens[index]),
      high: Number(highs[index]),
      low: Number(lows[index]),
      close: Number(closes[index]),
      volume: Math.max(0, Number(volumes[index] || 0)),
    };
    const date = String(time || "").slice(0, 10);
    if (!time
      || ![bar.open, bar.high, bar.low, bar.close, bar.volume].every(Number.isFinite)
      || bar.open <= 0 || bar.high <= 0 || bar.low <= 0 || bar.close <= 0
      || bar.high < Math.max(bar.open, bar.close)
      || bar.low > Math.min(bar.open, bar.close)
      || date < requestedFrom || date > requestedTo) {
      rejectedCount += 1;
      continue;
    }
    if (byTime.has(time)) duplicateCount += 1;
    byTime.set(time, bar);
  }
  const bars = [...byTime.values()].sort((left, right) => String(left.time).localeCompare(String(right.time)));
  if (!bars.length) {
    throw Object.assign(new Error("Historical source returned no valid daily candles"), { code: "HISTORY_EMPTY" });
  }
  const firstTradeTime = yahooHistoricalDateTime(result?.meta?.firstTradeDate);
  const firstTradeDate = firstTradeTime ? new Date(firstTradeTime).getTime() : null;
  const firstBarDate = new Date(bars[0].time).getTime();
  const providerPartial = Number.isFinite(firstTradeDate)
    && firstBarDate > firstTradeDate + 21 * 24 * 60 * 60 * 1000;
  return {
    bars,
    providerPartial,
    duplicateCount,
    rejectedCount,
    firstTradeTime,
    exchangeTimezone: String(result?.meta?.exchangeTimezoneName || ""),
  };
}

export function normalizeAdjustedHistoricalBars(payload, requestedFrom, requestedTo) {
  if (String(payload?.interval || "1d") !== "1d") {
    throw Object.assign(new Error("Historical provider returned a non-daily interval"), { code: "HISTORY_INTERVAL_MISMATCH" });
  }
  const values = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.data?.data)
      ? payload.data.data
      : [];
  const byTime = new Map();
  let duplicateCount = 0;
  let rejectedCount = 0;
  for (const row of values) {
    const time = historicalProviderDateTime(row.date || row.time || row.timestamp);
    const rawClose = Number(row.close);
    const adjustedClose = Number(row.adjusted_close ?? row.adjustedClose ?? row.close);
    const scale = Number.isFinite(rawClose) && rawClose > 0 && Number.isFinite(adjustedClose) && adjustedClose > 0
      ? adjustedClose / rawClose
      : 1;
    const bar = {
      time,
      open: Number(row.open) * scale,
      high: Number(row.high) * scale,
      low: Number(row.low) * scale,
      close: adjustedClose,
      volume: Math.max(0, Number(row.volume || 0)),
    };
    const date = String(time || "").slice(0, 10);
    if (!time
      || ![bar.open, bar.high, bar.low, bar.close, bar.volume].every(Number.isFinite)
      || bar.open <= 0 || bar.high <= 0 || bar.low <= 0 || bar.close <= 0
      || bar.high < Math.max(bar.open, bar.close)
      || bar.low > Math.min(bar.open, bar.close)
      || date < requestedFrom || date > requestedTo) {
      rejectedCount += 1;
      continue;
    }
    if (byTime.has(time)) duplicateCount += 1;
    byTime.set(time, bar);
  }
  const bars = [...byTime.values()].sort((left, right) => String(left.time).localeCompare(String(right.time)));
  if (!bars.length) {
    throw Object.assign(new Error("Historical provider returned no valid daily candles"), { code: "HISTORY_EMPTY" });
  }
  const providerPartial = payload?.metadata?.partial === true || payload?.partial === true;
  return { bars, providerPartial, duplicateCount, rejectedCount };
}

export function groupHistoricalBarsByYear(bars) {
  const grouped = new Map();
  for (const bar of Array.isArray(bars) ? bars : []) {
    const year = String(bar.time || "").slice(0, 4);
    if (!/^\d{4}$/.test(year)) continue;
    if (!grouped.has(year)) grouped.set(year, []);
    grouped.get(year).push(bar);
  }
  return grouped;
}
export const MARKET_AUTOMATION_SPECS = Object.freeze([
  { name: "saudi_t15_1015_1045_riyadh", cron: "15,30,45 7 * * 0-4", slotKind: "quarter_hour", active: false },
  { name: "saudi_t15_1100_1445_riyadh", cron: "0,15,30,45 8-11 * * 0-4", slotKind: "quarter_hour", active: false },
  { name: "saudi_t15_1500_1515_riyadh", cron: "0,15 12 * * 0-4", slotKind: "quarter_hour", active: false },
  { name: "saudi_close_price_1526_riyadh", cron: "26 12 * * 0-4", slotKind: "close_price", active: false },
  { name: "saudi_session_final_1536_riyadh", cron: "36 12 * * 0-4", slotKind: "session_final", active: false },
]);

const RIYADH_TIMEZONE = "Asia/Riyadh";
const RIYADH_CLOCK_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: RIYADH_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
const TRADING_WEEKDAYS = new Set(["Sun", "Mon", "Tue", "Wed", "Thu"]);

export function groupRowsByKey(rows, keyFor) {
  const grouped = new Map();
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

const SAUDI_CANDLE_OPTIONS = Object.freeze({ timeZone: "Asia/Riyadh", sessionStartMinutes: 600, weekStartsOn: 0 });
const MARKET_CLOCK_FORMATTERS = new Map();

function marketClockFormatter(timeZone) {
  const key = String(timeZone || SAUDI_CANDLE_OPTIONS.timeZone);
  if (!MARKET_CLOCK_FORMATTERS.has(key)) {
    MARKET_CLOCK_FORMATTERS.set(key, new Intl.DateTimeFormat("en-CA", {
      timeZone: key,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }));
  }
  return MARKET_CLOCK_FORMATTERS.get(key);
}

function marketClockParts(value, timeZone) {
  return Object.fromEntries(marketClockFormatter(timeZone).formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

function candleBucket(value, interval, options = SAUDI_CANDLE_OPTIONS) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const resolved = { ...SAUDI_CANDLE_OPTIONS, ...options };
  if (interval === "15m") return `quarter:${Math.floor(time / (15 * 60 * 1000))}`;
  if (["1h", "2h", "3h", "4h"].includes(interval)) {
    const hours = Number(interval.slice(0, -1));
    const parts = marketClockParts(new Date(time), resolved.timeZone);
    const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
    const minuteOfDay = (Number(parts.hour) % 24) * 60 + Number(parts.minute);
    const sessionMinute = minuteOfDay - resolved.sessionStartMinutes;
    if (sessionMinute < 0) return "";
    return `${interval}:${dateKey}:${Math.floor(sessionMinute / (hours * 60))}`;
  }
  const parts = marketClockParts(new Date(time), resolved.timeZone);
  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  if (interval === "1d") return `day:${dateKey}`;
  if (interval === "1mo") return `month:${dateKey.slice(0, 7)}`;
  if (interval === "1wk") {
    const start = new Date(`${dateKey}T00:00:00.000Z`);
    const daysSinceStart = (start.getUTCDay() - resolved.weekStartsOn + 7) % 7;
    start.setUTCDate(start.getUTCDate() - daysSinceStart);
    return `week:${start.toISOString().slice(0, 10)}`;
  }
  return "";
}

function normalizedCandleBar(bar) {
  const time = new Date(bar?.time).getTime();
  const open = positiveNumber(bar?.open);
  const high = positiveNumber(bar?.high);
  const low = positiveNumber(bar?.low);
  const close = positiveNumber(bar?.close);
  const volume = nonNegativeNumber(bar?.volume);
  if (!Number.isFinite(time)
    || [open, high, low, close].some((value) => value === null)
    || high < Math.max(open, close)
    || low > Math.min(open, close)) return null;
  return {
    time: new Date(time).toISOString(),
    open,
    high,
    low,
    close,
    volume,
  };
}

export function mergeStoredCandleSeries(series, requestedInterval, options = SAUDI_CANDLE_OPTIONS) {
  const intervalPriority = new Map();
  const storedIntervals = [];
  const normalizedSeries = [];

  for (const candidateSeries of Array.isArray(series) ? series : []) {
    const sourceInterval = String(candidateSeries?.interval || "");
    if (!sourceInterval || !Array.isArray(candidateSeries?.bars)) continue;
    if (!intervalPriority.has(sourceInterval)) {
      intervalPriority.set(sourceInterval, intervalPriority.size);
      storedIntervals.push(sourceInterval);
    }
    normalizedSeries.push({
      interval: sourceInterval,
      bars: candidateSeries.bars,
      rank: intervalPriority.get(sourceInterval),
    });
  }

  function materialize(candidateSeries, bucketInterval) {
    const grouped = new Map();
    const sourceBars = candidateSeries.interval === "15m"
      ? canonicalizeQuarterHourBars(candidateSeries.bars)
      : candidateSeries.bars;
    for (const rawBar of sourceBars) {
      const bar = normalizedCandleBar(rawBar);
      if (!bar) continue;
      const bucket = candleBucket(bar.time, bucketInterval, options);
      if (!bucket) continue;
      const current = grouped.get(bucket);
      if (!current) {
        grouped.set(bucket, {
          ...bar,
          source_end: bar.time,
          source_interval: candidateSeries.interval,
          source_rank: candidateSeries.rank,
        });
        continue;
      }
      current.high = Math.max(current.high, bar.high);
      current.low = Math.min(current.low, bar.low);
      current.close = bar.close;
      current.volume += bar.volume;
      current.source_end = bar.time;
    }
    return [...grouped.values()];
  }

  function mergeByBucket(bars, bucketInterval) {
    const merged = new Map();
    for (const bar of bars) {
      const bucket = candleBucket(bar.time, bucketInterval, options);
      if (!bucket) continue;
      const current = merged.get(bucket);
      const candidateEnd = new Date(bar.source_end).getTime();
      const currentEnd = new Date(current?.source_end || 0).getTime();
      if (!current
        || bar.source_rank < current.source_rank
        || bar.source_rank === current.source_rank && candidateEnd >= currentEnd) {
        merged.set(bucket, bar);
      }
    }
    return [...merged.values()]
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }

  function aggregateMaterialized(bars, bucketInterval) {
    const grouped = new Map();
    for (const bar of bars) {
      const bucket = candleBucket(bar.time, bucketInterval, options);
      if (!bucket) continue;
      const current = grouped.get(bucket);
      if (!current) {
        grouped.set(bucket, { ...bar, source_rank: Number.MAX_SAFE_INTEGER });
        continue;
      }
      current.high = Math.max(current.high, bar.high);
      current.low = Math.min(current.low, bar.low);
      current.close = bar.close;
      current.volume += bar.volume;
      current.source_end = bar.source_end;
    }
    return [...grouped.values()];
  }

  let ordered;
  if (requestedInterval === "1wk" || requestedInterval === "1mo") {
    const direct = normalizedSeries
      .filter((candidateSeries) => candidateSeries.interval === requestedInterval)
      .flatMap((candidateSeries) => materialize(candidateSeries, requestedInterval));
    const dailyInputs = normalizedSeries
      .filter((candidateSeries) => candidateSeries.interval !== requestedInterval)
      .flatMap((candidateSeries) => materialize(candidateSeries, "1d"));
    const mergedDaily = mergeByBucket(dailyInputs, "1d");
    const derived = aggregateMaterialized(mergedDaily, requestedInterval);
    ordered = mergeByBucket([...direct, ...derived], requestedInterval);
  } else {
    const materialized = normalizedSeries
      .flatMap((candidateSeries) => materialize(candidateSeries, requestedInterval));
    ordered = mergeByBucket(materialized, requestedInterval);
  }

  const latestSourceTime = ordered
    .map((bar) => bar.source_end)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .at(-1) || null;
  return {
    bars: ordered.map(({ source_end: _sourceEnd, source_interval: _sourceInterval, source_rank: _sourceRank, ...bar }) => bar),
    storedIntervals,
    latestSourceTime,
  };
}

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
  const parts = Object.fromEntries(RIYADH_CLOCK_FORMATTER.formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
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
    ? minuteOfDay >= 15 * 60 + 24
    : slotKind === "session_final"
      ? minuteOfDay >= 15 * 60 + 34
      : minuteOfDay >= 10 * 60 + 14 && minuteOfDay <= 15 * 60 + 20;
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

const QUARTER_HOUR_MILLISECONDS = 15 * 60 * 1000;

export function canonicalizeQuarterHourBars(bars) {
  const byBucket = new Map();
  for (const rawBar of Array.isArray(bars) ? bars : []) {
    const bar = normalizedCandleBar(rawBar);
    if (!bar) continue;
    const rawTime = new Date(bar.time).getTime();
    const bucketTime = Math.floor(rawTime / QUARTER_HOUR_MILLISECONDS) * QUARTER_HOUR_MILLISECONDS;
    const exactGridTime = rawTime === bucketTime;
    const current = byBucket.get(bucketTime);
    if (current
      && (current.exactGridTime && !exactGridTime
        || current.exactGridTime === exactGridTime && current.rawTime > rawTime)) continue;
    const bucketDate = new Date(bucketTime);
    byBucket.set(bucketTime, {
      bar: {
        ...bar,
        time: bucketDate.toISOString(),
        session_date: rawBar?.session_date || riyadhClock(bucketDate).date,
      },
      exactGridTime,
      rawTime,
    });
  }
  return [...byBucket.values()]
    .sort((a, b) => new Date(a.bar.time).getTime() - new Date(b.bar.time).getTime())
    .map(({ bar }) => bar);
}

function uniqueSortedBars(bars) {
  const byTime = new Map();
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

export function publicChartRequestWindow({
  watermark,
  gapTime,
  now = new Date(),
  overlapMilliseconds = PUBLIC_CANDLE_OVERLAP_MILLISECONDS,
  maxIncrementalLookbackMilliseconds = PUBLIC_CANDLE_MAX_INCREMENTAL_LOOKBACK_MILLISECONDS,
} = {}) {
  const nowTime = new Date(now).getTime();
  if (!Number.isFinite(nowTime)) throw new Error("Public chart request time is invalid");
  const watermarkTime = new Date(watermark || "").getTime();
  const gapTimestamp = new Date(gapTime || "").getTime();
  if (Number.isFinite(gapTimestamp) && gapTimestamp <= nowTime) {
    return {
      mode: "gap_recovery",
      period1: Math.floor((gapTimestamp - overlapMilliseconds) / 1000),
      period2: Math.ceil(nowTime / 1000) + 60,
    };
  }
  if (!Number.isFinite(watermarkTime)) return { mode: "bootstrap", range: "5d" };
  if (nowTime - watermarkTime > maxIncrementalLookbackMilliseconds) {
    return { mode: "backfill", range: "5d" };
  }
  return {
    mode: "incremental",
    period1: Math.floor((watermarkTime - overlapMilliseconds) / 1000),
    period2: Math.ceil(nowTime / 1000) + 60,
  };
}

export function earliestInteriorCandleGap(bars, intervalMilliseconds = 15 * 60 * 1000) {
  const ordered = uniqueSortedBars(bars);
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = new Date(ordered[index - 1].time).getTime();
    const current = new Date(ordered[index].time).getTime();
    if (current - previous > intervalMilliseconds + 1000) {
      return new Date(previous + intervalMilliseconds).toISOString();
    }
  }
  return "";
}

export function buildPublicCandleContexts({
  instruments,
  quotes,
  chunks,
  sessionDate,
}) {
  const quoteByInstrument = new Map((Array.isArray(quotes) ? quotes : []).map((quote) => [quote.instrument_id, quote]));
  const chunkByInstrument = new Map();
  for (const chunk of Array.isArray(chunks) ? chunks : []) {
    if (chunk.interval !== "15m") continue;
    const matchesSession = chunk.session_date === sessionDate
      || String(chunk.chunk_key || "").endsWith(`-${sessionDate}`);
    if (!matchesSession) continue;
    const current = chunkByInstrument.get(chunk.instrument_id);
    if (!current || new Date(chunk.end_time || 0).getTime() > new Date(current.end_time || 0).getTime()) {
      chunkByInstrument.set(chunk.instrument_id, chunk);
    }
  }
  const contexts = new Map();
  for (const instrument of Array.isArray(instruments) ? instruments : []) {
    const quote = quoteByInstrument.get(instrument.id) || {};
    const chunk = chunkByInstrument.get(instrument.id) || {};
    const bars = canonicalizeQuarterHourBars((chunk.bars || []).filter((bar) => riyadhClock(new Date(bar.time)).date === sessionDate));
    const latestBarTime = bars.at(-1)?.time || "";
    const gapTime = earliestInteriorCandleGap(bars);
    const quoteSessionDate = String(quote.session_date || "");
    const previousClose = quoteSessionDate === sessionDate
      ? positiveNumber(quote.previous_close)
      : positiveNumber(quote.last_price) || positiveNumber(quote.previous_close);
    contexts.set(instrument.symbol, {
      session_date: sessionDate,
      bars,
      watermark: latestBarTime || quote.last_trade_time || quote.provider_as_of || "",
      gap_time: gapTime,
      previous_close: previousClose,
    });
  }
  return contexts;
}

export function normalizePublicDelayedCharts(chartResults, contextsBySymbol = new Map()) {
  const quotes = [];
  const candles = [];
  const rejected = [];
  let providerAsOf = "";

  for (const item of chartResults) {
    const symbol = String(item?.symbol || "").trim();
    const incomingBars = chartBars(item?.result);
    const context = contextForSymbol(contextsBySymbol, symbol);
    const bars = canonicalizeQuarterHourBars([...(context.bars || []), ...incomingBars]);
    const sessions = new Map();
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
    const previousClose = positiveNumber(previousBars.at(-1)?.close)
      || positiveNumber(item?.result?.meta?.chartPreviousClose)
      || positiveNumber(item?.result?.meta?.previousClose)
      || positiveNumber(context.previous_close);
    if (!positiveNumber(previousClose)) {
      rejected.push({ symbol, issue_type: "previous_close_missing", message: "Public delayed chart and stored cursor did not include a valid previous-session close" });
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
    const incomingCurrentBars = canonicalizeQuarterHourBars(incomingBars.filter((bar) => bar.session_date === sessionDate));
    candles.push({
      provider_symbol: providerSymbol,
      bars: incomingCurrentBars.map(({ time, open, high: barHigh, low: barLow, close, volume: barVolume }) => ({
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
  contextsBySymbol = new Map(),
  now = new Date(),
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
  const requestModes = { incremental: 0, bootstrap: 0, backfill: 0, gap_recovery: 0 };

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
          signal: controller.signal,
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
      rejected: [...failures, ...normalized.rejected],
    },
    requestCount,
    requestModes,
  };
}

export function normalizeProviderCandles(
  payload,
  mappings,
  instruments,
  sourceId,
  sessionDate,
  marketCode = SAUDI_MAIN_MARKET,
) {
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
    const bySession = new Map();
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
        quality_status: "verified",
      });
    }
  }
  return chunks;
}

export function mergeIncrementalCandleChunks(incomingChunks, existingChunks) {
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
      bar_count: bars.length,
    };
  }).filter((chunk) => chunk.bars.length);
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
          "User-Agent": "SMART_INVESTOR-Licensed-Market-Data/1.0",
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
