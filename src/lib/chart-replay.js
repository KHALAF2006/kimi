export const CHART_REPLAY_SPEEDS = Object.freeze([
  { value: 250, ar: "0.25 ث/شمعة", en: "0.25s / bar" },
  { value: 3000, ar: "3 ث/شمعة", en: "3s / bar" },
  { value: 5000, ar: "5 ث/شمعة", en: "5s / bar" },
  { value: 10000, ar: "10 ث/شمعة", en: "10s / bar" },
]);

export function normalizeReplaySpeed(value) {
  const numeric = Number(value);
  return CHART_REPLAY_SPEEDS.some((item) => item.value === numeric) ? numeric : 3000;
}

export function replayStartIndex(candles = [], selectedTime) {
  const time = Number(selectedTime);
  if (!candles.length || !Number.isFinite(time)) return -1;
  let result = -1;
  for (let index = 0; index < candles.length; index += 1) {
    if (Number(candles[index]?.time) > time) break;
    result = index;
  }
  return Math.min(Math.max(result, 0), Math.max(0, candles.length - 2));
}

export function replayCandles(candles = [], cursor = null) {
  if (!Number.isInteger(cursor)) return candles;
  return candles.slice(0, Math.min(candles.length, Math.max(1, cursor + 1)));
}

export function nextReplayCursor(cursor, candleCount, direction = 1) {
  if (!Number.isInteger(cursor) || candleCount <= 0) return null;
  return Math.min(candleCount - 1, Math.max(0, cursor + Math.sign(direction || 1)));
}
