function chartTime(value) {
  if (typeof value === "number") return value > 10_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
}

export function calculateSmaSeries(inputBars = [], length = 20) {
  const period = Math.max(1, Math.round(Number(length) || 1));
  const seen = new Set();
  const bars = inputBars.map((bar) => ({
    time: chartTime(bar.time),
    close: Number(bar.close),
  })).filter((bar) => Number.isFinite(bar.time) && Number.isFinite(bar.close) && bar.close > 0)
    .sort((left, right) => left.time - right.time)
    .filter((bar) => !seen.has(bar.time) && seen.add(bar.time));
  if (bars.length < period) return [];
  const values = [];
  let sum = 0;
  for (let index = 0; index < bars.length; index += 1) {
    sum += bars[index].close;
    if (index >= period) sum -= bars[index - period].close;
    if (index >= period - 1) values.push({ time: bars[index].time, value: Number((sum / period).toFixed(8)) });
  }
  return values;
}

export function detectBullishPinBar(bar) {
  if (!bar) return false;
  const open = Number(bar.open), high = Number(bar.high), low = Number(bar.low), close = Number(bar.close);
  const range = high - low;
  if (![open, high, low, close, range].every(Number.isFinite) || range <= 0) return false;
  const body = Math.abs(close - open);
  const lowerWick = Math.min(open, close) - low;
  const upperWick = high - Math.max(open, close);
  return body > 0 && body / range <= 0.3 && lowerWick >= body * 3 && lowerWick / range >= 0.6 && upperWick / range <= 0.25 && (close - low) / range >= 0.7;
}

export function detectBearishPinBar(bar) {
  if (!bar) return false;
  const open = Number(bar.open), high = Number(bar.high), low = Number(bar.low), close = Number(bar.close);
  const range = high - low;
  if (![open, high, low, close, range].every(Number.isFinite) || range <= 0) return false;
  const body = Math.abs(close - open);
  const lowerWick = Math.min(open, close) - low;
  const upperWick = high - Math.max(open, close);
  return body > 0 && body / range <= 0.3 && upperWick >= body * 3 && upperWick / range >= 0.6 && lowerWick / range <= 0.25 && (close - low) / range <= 0.3;
}

export function detectEngulfingPattern(previous, current) {
  if (!previous || !current) return null;
  const previousBody = Math.abs(Number(previous.close) - Number(previous.open));
  const currentBody = Math.abs(Number(current.close) - Number(current.open));
  if (![previousBody, currentBody].every(Number.isFinite) || previousBody === 0 || currentBody === 0) return null;
  if (previous.close < previous.open && current.close > current.open && current.open <= previous.close && current.close >= previous.open) return "bullish";
  if (previous.close > previous.open && current.close < current.open && current.open >= previous.close && current.close <= previous.open) return "bearish";
  return null;
}

export function reversalPatternMap(candles = [], { limitPerType = Number.POSITIVE_INFINITY } = {}) {
  const detected = [];
  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];
    const pinDirection = detectBullishPinBar(candle) ? "bullish" : detectBearishPinBar(candle) ? "bearish" : null;
    const engulfingDirection = detectEngulfingPattern(candles[index - 1], candle);
    if (pinDirection || engulfingDirection) detected.push({ time: candle.time, pinDirection, engulfingDirection });
  }

  const normalizedLimit = Number.isFinite(Number(limitPerType))
    ? Math.max(0, Math.floor(Number(limitPerType)))
    : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(normalizedLimit)) {
    return new Map(detected.map(({ time, pinDirection, engulfingDirection }) => [time, { pinDirection, engulfingDirection }]));
  }

  const visibleByType = new Map([
    ["pin:bullish", new Set()],
    ["pin:bearish", new Set()],
    ["engulfing:bullish", new Set()],
    ["engulfing:bearish", new Set()],
  ]);
  for (const key of visibleByType.keys()) {
    const [pattern, direction] = key.split(":");
    const matches = detected.filter((item) => item[`${pattern}Direction`] === direction);
    visibleByType.set(key, new Set((normalizedLimit === 0 ? [] : matches.slice(-normalizedLimit)).map((item) => item.time)));
  }

  const result = new Map();
  for (const item of detected) {
    const pinDirection = item.pinDirection && visibleByType.get(`pin:${item.pinDirection}`).has(item.time) ? item.pinDirection : null;
    const engulfingDirection = item.engulfingDirection && visibleByType.get(`engulfing:${item.engulfingDirection}`).has(item.time) ? item.engulfingDirection : null;
    if (pinDirection || engulfingDirection) result.set(item.time, { pinDirection, engulfingDirection });
  }
  return result;
}
