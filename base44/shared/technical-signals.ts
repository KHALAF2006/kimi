import { calculateMomentumZones } from "./momentum.ts";

export const TECHNICAL_SIGNAL_FORMULA_VERSION = "technical-signals-v3";
export const TECHNICAL_SIGNAL_WINDOW_SIZE = 3;

type CandleBar = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function rounded(value: number) {
  return Number(value.toFixed(8));
}

function riyadhDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function normalizeTechnicalBars(inputBars: Array<Record<string, unknown>>): CandleBar[] {
  const byTime = new Map<string, CandleBar>();
  for (const raw of Array.isArray(inputBars) ? inputBars : []) {
    const timestamp = new Date(String(raw.time || "")).getTime();
    const open = Number(raw.open);
    const high = Number(raw.high);
    const low = Number(raw.low);
    const close = Number(raw.close);
    const volume = Math.max(0, Number(raw.volume || 0));
    if (!Number.isFinite(timestamp) || ![open, high, low, close].every((value) => Number.isFinite(value) && value > 0)) continue;
    if (high < Math.max(open, close) || low > Math.min(open, close)) continue;
    const time = new Date(timestamp).toISOString();
    byTime.set(time, { time, open, high, low, close, volume });
  }
  return [...byTime.values()].sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
}

function sundayWeekKey(dateString: string) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date.toISOString().slice(0, 10);
}

export function bucketKeyForInterval(time: string, interval: "1d" | "1wk" | "1mo") {
  const date = riyadhDate(time);
  if (interval === "1wk") return sundayWeekKey(date);
  if (interval === "1mo") return date.slice(0, 7);
  return date;
}

export function aggregateTechnicalBars(
  inputBars: Array<Record<string, unknown>>,
  interval: "1d" | "1wk" | "1mo",
): CandleBar[] {
  const groups = new Map<string, CandleBar[]>();
  for (const bar of normalizeTechnicalBars(inputBars)) {
    const key = bucketKeyForInterval(bar.time, interval);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(bar);
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, members]) => {
    const first = members[0];
    const last = members[members.length - 1];
    return {
      time: first.time,
      open: rounded(first.open),
      high: rounded(Math.max(...members.map((bar) => bar.high))),
      low: rounded(Math.min(...members.map((bar) => bar.low))),
      close: rounded(last.close),
      volume: rounded(members.reduce((sum, bar) => sum + bar.volume, 0)),
    };
  });
}

export function calculateSmaSeries(inputBars: Array<Record<string, unknown>>, length: number) {
  const period = Math.max(1, Math.round(Number(length) || 1));
  const bars = normalizeTechnicalBars(inputBars);
  if (bars.length < period) return [];
  const values: Array<{ time: string; value: number }> = [];
  let sum = 0;
  for (let index = 0; index < bars.length; index += 1) {
    sum += bars[index].close;
    if (index >= period) sum -= bars[index - period].close;
    if (index >= period - 1) values.push({ time: bars[index].time, value: rounded(sum / period) });
  }
  return values;
}

export function detectBullishPinBar(rawBar: Record<string, unknown> | null | undefined) {
  if (!rawBar) return { matches: false, reason: "missing_bar" };
  const open = Number(rawBar.open);
  const high = Number(rawBar.high);
  const low = Number(rawBar.low);
  const close = Number(rawBar.close);
  const range = high - low;
  if (![open, high, low, close, range].every(Number.isFinite) || range <= 0) {
    return { matches: false, reason: "invalid_bar" };
  }
  const body = Math.abs(close - open);
  const lowerWick = Math.min(open, close) - low;
  const upperWick = high - Math.max(open, close);
  const bodyRatio = body / range;
  const lowerWickRatio = lowerWick / range;
  const upperWickRatio = upperWick / range;
  const closeLocation = (close - low) / range;
  return {
    matches: bodyRatio <= 0.35
      && lowerWick >= Math.max(body * 2, range * 0.5)
      && upperWickRatio <= 0.2
      && closeLocation >= 0.65,
    body_ratio: rounded(bodyRatio),
    lower_wick_ratio: rounded(lowerWickRatio),
    upper_wick_ratio: rounded(upperWickRatio),
    close_location: rounded(closeLocation),
  };
}

export function detectBearishPinBar(rawBar: Record<string, unknown> | null | undefined) {
  if (!rawBar) return { matches: false, reason: "missing_bar" };
  const open = Number(rawBar.open);
  const high = Number(rawBar.high);
  const low = Number(rawBar.low);
  const close = Number(rawBar.close);
  const range = high - low;
  if (![open, high, low, close, range].every(Number.isFinite) || range <= 0) {
    return { matches: false, reason: "invalid_bar" };
  }
  const body = Math.abs(close - open);
  const lowerWick = Math.min(open, close) - low;
  const upperWick = high - Math.max(open, close);
  const bodyRatio = body / range;
  const lowerWickRatio = lowerWick / range;
  const upperWickRatio = upperWick / range;
  const closeLocation = (close - low) / range;
  return {
    matches: bodyRatio <= 0.35
      && upperWick >= Math.max(body * 2, range * 0.5)
      && lowerWickRatio <= 0.2
      && closeLocation <= 0.35,
    body_ratio: rounded(bodyRatio),
    lower_wick_ratio: rounded(lowerWickRatio),
    upper_wick_ratio: rounded(upperWickRatio),
    close_location: rounded(closeLocation),
  };
}

export function detectPinBar(rawBar: Record<string, unknown> | null | undefined) {
  const bullish = detectBullishPinBar(rawBar);
  const bearish = detectBearishPinBar(rawBar);
  return {
    matches: Boolean(bullish.matches || bearish.matches),
    direction: bullish.matches ? "bullish" : bearish.matches ? "bearish" : null,
    bullish,
    bearish,
  };
}

export function detectEngulfingPattern(
  rawPrevious: Record<string, unknown> | null | undefined,
  rawCurrent: Record<string, unknown> | null | undefined,
) {
  if (!rawPrevious || !rawCurrent) return { matches: false, direction: null, reason: "missing_bar" };
  const previous = { open: Number(rawPrevious.open), close: Number(rawPrevious.close) };
  const current = { open: Number(rawCurrent.open), close: Number(rawCurrent.close) };
  if (![previous.open, previous.close, current.open, current.close].every(Number.isFinite)) {
    return { matches: false, direction: null, reason: "invalid_bar" };
  }
  const previousBody = Math.abs(previous.close - previous.open);
  const currentBody = Math.abs(current.close - current.open);
  if (previousBody === 0 || currentBody === 0) return { matches: false, direction: null, reason: "zero_body" };
  const bullish = previous.close < previous.open
    && current.close > current.open
    && current.open <= previous.close
    && current.close >= previous.open;
  const bearish = previous.close > previous.open
    && current.close < current.open
    && current.open >= previous.close
    && current.close <= previous.open;
  return {
    matches: bullish || bearish,
    direction: bullish ? "bullish" : bearish ? "bearish" : null,
    bullish,
    bearish,
    previous_body: rounded(previousBody),
    current_body: rounded(currentBody),
  };
}

function latestValueByTime(values: Array<{ time: string; value: number }>) {
  return new Map(values.map((item) => [item.time, item.value]));
}

function calculateTechnicalSnapshot(bars: CandleBar[]) {
  const sma20 = calculateSmaSeries(bars, 20);
  const sma50 = calculateSmaSeries(bars, 50);
  const last = bars.at(-1) || null;
  const previous = bars.at(-2) || null;
  const sma20ByTime = latestValueByTime(sma20);
  const sma50ByTime = latestValueByTime(sma50);
  const currentSma20 = last ? sma20ByTime.get(last.time) ?? null : null;
  const previousSma20 = previous ? sma20ByTime.get(previous.time) ?? null : null;
  const currentSma50 = last ? sma50ByTime.get(last.time) ?? null : null;
  const previousSma50 = previous ? sma50ByTime.get(previous.time) ?? null : null;
  const pinBar = detectPinBar(last);
  const engulfing = detectEngulfingPattern(previous, last);
  const momentum = calculateMomentumZones(bars);
  const matchingZone = pinBar.bullish.matches && last && momentum?.zones
    ? momentum.zones.find((zone) => zone.active && last.low <= zone.top && last.high >= zone.bottom && last.close >= zone.bottom) || null
    : null;

  return {
    bar_count: bars.length,
    candle_time: last?.time || null,
    close: last?.close ?? null,
    sma20: currentSma20,
    sma50: currentSma50,
    pin_bar: pinBar,
    pin_bar_signal: pinBar.matches,
    engulfing,
    engulfing_signal: engulfing.matches,
    bullish_engulfing: engulfing.direction === "bullish",
    bearish_engulfing: engulfing.direction === "bearish",
    zone_pin_bar: Boolean(matchingZone),
    matching_zone: matchingZone ? {
      key: matchingZone.key,
      name_ar: matchingZone.nameAr,
      name_en: matchingZone.nameEn,
      top: rounded(matchingZone.top),
      bottom: rounded(matchingZone.bottom),
    } : null,
    price_cross_sma20: Boolean(
      previous && last && previousSma20 !== null && currentSma20 !== null
      && previous.close <= previousSma20 && last.close > currentSma20
    ),
    price_cross_sma50: Boolean(
      previous && last && previousSma50 !== null && currentSma50 !== null
      && previous.close <= previousSma50 && last.close > currentSma50
    ),
    sma20_cross_sma50: Boolean(
      previousSma20 !== null && currentSma20 !== null && previousSma50 !== null && currentSma50 !== null
      && previousSma20 <= previousSma50 && currentSma20 > currentSma50
    ),
    insufficient_history: bars.length < 50,
  };
}

export function calculateTechnicalSignals(
  inputBars: Array<Record<string, unknown>>,
  windowSize = TECHNICAL_SIGNAL_WINDOW_SIZE,
) {
  const bars = normalizeTechnicalBars(inputBars);
  if (!bars.length) return {
    ...calculateTechnicalSnapshot([]),
    signal_window_size: 0,
    signal_window: [],
  };
  const size = Math.max(1, Math.min(Math.round(Number(windowSize) || TECHNICAL_SIGNAL_WINDOW_SIZE), bars.length));
  const signalWindow = [];
  for (let offset = 0; offset < size; offset += 1) {
    const end = bars.length - offset;
    signalWindow.push({
      offset,
      ...calculateTechnicalSnapshot(bars.slice(0, end)),
    });
  }
  return {
    ...signalWindow[0],
    signal_window_size: size,
    signal_window: signalWindow,
  };
}
