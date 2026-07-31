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
  return body / range <= 0.35 && lowerWick >= Math.max(body * 2, range * 0.5) && upperWick / range <= 0.2 && (close - low) / range >= 0.65;
}

export function detectBearishPinBar(bar) {
  if (!bar) return false;
  const open = Number(bar.open), high = Number(bar.high), low = Number(bar.low), close = Number(bar.close);
  const range = high - low;
  if (![open, high, low, close, range].every(Number.isFinite) || range <= 0) return false;
  const body = Math.abs(close - open);
  const lowerWick = Math.min(open, close) - low;
  const upperWick = high - Math.max(open, close);
  return body / range <= 0.35 && upperWick >= Math.max(body * 2, range * 0.5) && lowerWick / range <= 0.2 && (close - low) / range <= 0.35;
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

export function reversalPatternMap(candles = []) {
  const result = new Map();
  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];
    const pinDirection = detectBullishPinBar(candle) ? "bullish" : detectBearishPinBar(candle) ? "bearish" : null;
    const engulfingDirection = detectEngulfingPattern(candles[index - 1], candle);
    if (pinDirection || engulfingDirection) result.set(candle.time, { pinDirection, engulfingDirection });
  }
  return result;
}
