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
