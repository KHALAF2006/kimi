export const MOMENTUM_ZONE_DEFINITIONS = [
  { key: "zone1", nameAr: "منطقة الارتداد", nameEn: "Rebound zone", colorNameAr: "أخضر", colorNameEn: "Green", light: "#16a34a", dark: "#16a34a", topPercent: 0.075, bottomPercent: 0.10 },
  { key: "zone2", nameAr: "قاع أسبوعي / شهري", nameEn: "Weekly / monthly base", colorNameAr: "برتقالي", colorNameEn: "Orange", light: "#d97706", dark: "#f59e0b", topPercent: 0.20, bottomPercent: 0.24 },
  { key: "zone3", nameAr: "استثمار منخفض المخاطر", nameEn: "Low-risk investment", colorNameAr: "أزرق", colorNameEn: "Blue", light: "#2563eb", dark: "#60a5fa", topPercent: 0.32, bottomPercent: 0.36 },
  { key: "zone4", nameAr: "استثمار ربع سنوي", nameEn: "Quarterly investment", colorNameAr: "بنفسجي", colorNameEn: "Purple", light: "#7c3aed", dark: "#a78bfa", topPercent: 0.48, bottomPercent: 0.52 },
  { key: "zone5", nameAr: "استثمار سنوي", nameEn: "Annual investment", colorNameAr: "فيروزي", colorNameEn: "Teal", light: "#0d9488", dark: "#2dd4bf", topPercent: 0.58, bottomPercent: 0.65 },
];

export function buildMomentumZones(referencePeak, zone4Active = false, zone5Active = false, theme = "light") {
  return MOMENTUM_ZONE_DEFINITIONS.map((definition, index) => {
    const top = referencePeak * (1 - definition.topPercent);
    const bottom = referencePeak * (1 - definition.bottomPercent);
    return {
      ...definition,
      color: theme === "dark" ? definition.dark : definition.light,
      top,
      bottom,
      stop: bottom * 0.97,
      active: index < 3 || (index === 3 && zone4Active) || (index === 4 && zone5Active),
    };
  });
}

export function normalizeMomentum(snapshot, theme = "light") {
  if (!snapshot) return null;
  const values = snapshot.values || snapshot;
  if (Array.isArray(values.zones)) {
    return { ...snapshot, ...values, zones: values.zones.map((zone, index) => ({
      ...MOMENTUM_ZONE_DEFINITIONS[index], ...zone,
      color: theme === "dark" ? MOMENTUM_ZONE_DEFINITIONS[index]?.dark : MOMENTUM_ZONE_DEFINITIONS[index]?.light,
    })) };
  }
  const peak = Number(values.referencePeak || values.reference_peak);
  if (!Number.isFinite(peak) || peak <= 0) return null;
  return { ...snapshot, ...values, zones: buildMomentumZones(peak, Boolean(values.zone4Active || values.zone4_active), Boolean(values.zone5Active || values.zone5_active), theme) };
}

function marketTime(value) {
  if (typeof value === "number") return value > 10_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
}

function sourceValue(bar, source) {
  const open = Number(bar.open);
  const high = Number(bar.high);
  const low = Number(bar.low);
  const close = Number(bar.close);
  if (source === "open") return open;
  if (source === "high") return high;
  if (source === "low") return low;
  if (source === "hl2") return (high + low) / 2;
  if (source === "hlc3") return (high + low + close) / 3;
  if (source === "ohlc4") return (open + high + low + close) / 4;
  return close;
}

/** TradingView-compatible Wilder RSI over verified chart bars. */
export function calculateRsiSeries(inputBars = [], length = 14, source = "close") {
  const period = Math.min(100, Math.max(2, Math.round(Number(length) || 14)));
  const seen = new Set();
  const bars = inputBars.map((bar) => ({
    ...bar,
    time: marketTime(bar.time),
    value: sourceValue(bar, source),
  })).filter((bar) => Number.isFinite(bar.time) && Number.isFinite(bar.value))
    .sort((a, b) => a.time - b.time)
    .filter((bar) => !seen.has(bar.time) && seen.add(bar.time));

  if (bars.length <= period) return [];
  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = bars[index].value - bars[index - 1].value;
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }
  let averageGain = gains / period;
  let averageLoss = losses / period;
  const result = [];
  for (let index = period; index < bars.length; index += 1) {
    if (index > period) {
      const change = bars[index].value - bars[index - 1].value;
      averageGain = ((averageGain * (period - 1)) + Math.max(change, 0)) / period;
      averageLoss = ((averageLoss * (period - 1)) + Math.max(-change, 0)) / period;
    }
    const value = averageLoss === 0
      ? (averageGain === 0 ? 50 : 100)
      : 100 - (100 / (1 + (averageGain / averageLoss)));
    result.push({ time: bars[index].time, value: Number(value.toFixed(8)) });
  }
  return result;
}

/** Strict investor-zone calculation port using verified market bars. */
export function calculateMomentumSnapshot(inputBars = [], lookbackDays = 20, historyBars = Number.POSITIVE_INFINITY, theme = "light") {
  const lookback = Math.min(30, Math.max(6, Math.round(Number(lookbackDays) || 20)));
  const normalized = inputBars.map((bar) => ({
    time: marketTime(bar.time),
    high: Number(bar.high),
    close: Number(bar.close),
  })).filter((bar) => Number.isFinite(bar.time) && Number.isFinite(bar.high) && Number.isFinite(bar.close) && bar.high > 0 && bar.close > 0)
    .sort((a, b) => a.time - b.time);
  const finiteHistoryLimit = Number.isFinite(Number(historyBars))
    ? Math.max(lookback + 2, Math.round(Number(historyBars)))
    : normalized.length;
  const bars = normalized.slice(-finiteHistoryLimit);

  if (bars.length < lookback + 1) return null;
  let referencePeak = null;
  let referenceTime = null;
  let lastBrokenPeak = null;
  let zone4Active = false;
  let zone5Active = false;
  let previousClose = null;
  let previousZone3Stop = null;
  let previousZone4Stop = null;

  for (let index = 0; index < bars.length; index += 1) {
    let candidatePeak = null;
    let candidateTime = null;
    for (let offset = 1; offset <= lookback; offset += 1) {
      const candidate = bars[index - offset];
      if (!candidate) continue;
      if (candidatePeak === null || candidate.high > candidatePeak) {
        candidatePeak = candidate.high;
        candidateTime = candidate.time;
      }
    }

    const bar = bars[index];
    if (referencePeak !== null && bar.high > referencePeak) {
      lastBrokenPeak = referencePeak;
      referencePeak = null;
      referenceTime = null;
      zone4Active = false;
      zone5Active = false;
    }
    if (referencePeak === null && candidatePeak !== null && (lastBrokenPeak === null || candidatePeak !== lastBrokenPeak)) {
      referencePeak = candidatePeak;
      referenceTime = candidateTime;
      zone4Active = false;
      zone5Active = false;
    }

    if (referencePeak !== null) {
      const zones = buildMomentumZones(referencePeak, zone4Active, zone5Active, theme);
      const crossedZone3Stop = previousClose !== null && previousZone3Stop !== null && bar.close < zones[2].stop && previousClose >= previousZone3Stop;
      if (crossedZone3Stop) zone4Active = true;
      const refreshed = buildMomentumZones(referencePeak, zone4Active, zone5Active, theme);
      const crossedZone4Stop = previousClose !== null && previousZone4Stop !== null && zone4Active && bar.close < refreshed[3].stop && previousClose >= previousZone4Stop;
      if (crossedZone4Stop) zone5Active = true;
      previousZone3Stop = refreshed[2].stop;
      previousZone4Stop = refreshed[3].stop;
    } else {
      previousZone3Stop = null;
      previousZone4Stop = null;
    }
    previousClose = bar.close;
  }

  if (referencePeak === null) return null;
  return {
    referencePeak,
    referenceTime,
    lookbackDays: lookback,
    historyBars: bars.length,
    formulaVersion: "momentum-zones-v1-pine-parity",
    zone4Active,
    zone5Active,
    zones: buildMomentumZones(referencePeak, zone4Active, zone5Active, theme),
  };
}

export function formatNumber(value, language = "ar", digits = 2) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat(language === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: digits }).format(Number(value));
}

export function formatCompact(value, language = "ar") {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat(language === "ar" ? "ar-SA" : "en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value));
}

export function quoteDirection(value) {
  const number = Number(value || 0);
  return number > 0 ? "up" : number < 0 ? "down" : "flat";
}

export function marketSummary(rows = []) {
  return rows.reduce((result, row) => {
    result.total += 1;
    result[quoteDirection(row.quote?.change_percent)] += 1;
    result.volume += Number(row.quote?.volume || 0);
    result.value += Number(row.quote?.traded_value || 0);
    return result;
  }, { total: 0, up: 0, down: 0, flat: 0, volume: 0, value: 0 });
}
