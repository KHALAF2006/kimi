export const CHART_INTERVALS = Object.freeze([
  { value: "15m", defaultRange: "5d", intraday: true },
  { value: "1h", defaultRange: "1mo", intraday: true },
  { value: "2h", defaultRange: "5d", intraday: true },
  { value: "3h", defaultRange: "5d", intraday: true },
  { value: "4h", defaultRange: "5d", intraday: true },
  { value: "1d", defaultRange: "1y", intraday: false },
  { value: "1wk", defaultRange: "5y", intraday: false },
  { value: "1mo", defaultRange: "5y", intraday: false },
]);

export const CHART_RANGES = Object.freeze([
  { value: "5d", intervals: ["15m", "1h", "2h", "3h", "4h", "1d"] },
  { value: "1mo", intervals: ["15m", "1h", "2h", "3h", "4h", "1d"] },
  { value: "3mo", intervals: ["1h", "2h", "3h", "4h", "1d", "1wk"] },
  { value: "1y", intervals: ["1d", "1wk", "1mo"] },
  { value: "5y", intervals: ["1d", "1wk", "1mo"] },
  { value: "max", intervals: ["1d", "1wk", "1mo"] },
]);

const intervalValues = new Set(CHART_INTERVALS.map((item) => item.value));

export function chartSelectionStorageKey(marketCode, targetType, target) {
  const safe = [marketCode, targetType, target].map((value) => encodeURIComponent(String(value || "unknown"))).join(":");
  return `kmy_chart_selection_v3:${safe}`;
}

export function defaultRangeForInterval(interval) {
  return CHART_INTERVALS.find((item) => item.value === interval)?.defaultRange || "1y";
}

export function isSupportedChartSelection(interval, range) {
  return intervalValues.has(interval) && CHART_RANGES.some((item) => item.value === range && item.intervals.includes(interval));
}

export function normalizeChartSelection(selection = {}) {
  const interval = intervalValues.has(selection.interval) ? selection.interval : "1d";
  const range = isSupportedChartSelection(interval, selection.range) ? selection.range : defaultRangeForInterval(interval);
  return { interval, range };
}

export function readSuccessfulChartSelection(marketCode, targetType, target, requestedInterval = "") {
  const key = chartSelectionStorageKey(marketCode, targetType, target);
  if (intervalValues.has(requestedInterval)) return normalizeChartSelection({ interval: requestedInterval });
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "null");
    if (stored && isSupportedChartSelection(stored.interval, stored.range)) return stored;
  } catch {}
  return normalizeChartSelection({ interval: "1d" });
}

export function persistSuccessfulChartSelection(marketCode, targetType, target, selection) {
  const normalized = normalizeChartSelection(selection);
  localStorage.setItem(chartSelectionStorageKey(marketCode, targetType, target), JSON.stringify(normalized));
  return normalized;
}
