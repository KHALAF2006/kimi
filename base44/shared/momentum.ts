export const MOMENTUM_FORMULA_VERSION = 'momentum-zones-v1';

const LOOKBACK_DAYS = 20;
const HISTORY_BARS = 500;
const FIXED_STOP_PERCENT = 0.03;

const ZONE_DEFINITIONS = [
  { key: 'zone1', nameAr: 'الارتداد', nameEn: 'Rebound', colorNameAr: 'أخضر', colorNameEn: 'Green', light: '#16a34a', dark: '#22c55e', topPercent: 0.075, bottomPercent: 0.10 },
  { key: 'zone2', nameAr: 'قاع أسبوعي/شهري', nameEn: 'Weekly / Monthly Base', colorNameAr: 'برتقالي', colorNameEn: 'Orange', light: '#d97706', dark: '#f59e0b', topPercent: 0.20, bottomPercent: 0.24 },
  { key: 'zone3', nameAr: 'استثمار منخفض', nameEn: 'Low-Risk Investment', colorNameAr: 'أزرق', colorNameEn: 'Blue', light: '#2563eb', dark: '#60a5fa', topPercent: 0.32, bottomPercent: 0.36 },
  { key: 'zone4', nameAr: 'استثمار ربع سنوي', nameEn: 'Quarterly Investment', colorNameAr: 'بنفسجي', colorNameEn: 'Purple', light: '#7c3aed', dark: '#a78bfa', topPercent: 0.48, bottomPercent: 0.52 },
  { key: 'zone5', nameAr: 'استثمار سنوي', nameEn: 'Annual Investment', colorNameAr: 'فيروزي', colorNameEn: 'Teal', light: '#0d9488', dark: '#2dd4bf', topPercent: 0.58, bottomPercent: 0.65 },
];

export function buildMomentumZones(referencePeak: number, zone4Active = false, zone5Active = false) {
  return ZONE_DEFINITIONS.map((definition, index) => {
    const top = referencePeak * (1 - definition.topPercent);
    const bottom = referencePeak * (1 - definition.bottomPercent);
    return {
      ...definition,
      top,
      bottom,
      stop: bottom * (1 - FIXED_STOP_PERCENT),
      active: index < 3 || (index === 3 && zone4Active) || (index === 4 && zone5Active),
    };
  });
}

function crossedUnder(current: number, threshold: number, previous: number | null, previousThreshold: number | null) {
  return previous !== null && previousThreshold !== null && current < threshold && previous >= previousThreshold;
}

export function calculateMomentumZones(inputBars: Array<Record<string, unknown>>, lookbackDays = LOOKBACK_DAYS, historyBars = HISTORY_BARS) {
  const bars = inputBars
    .map((bar) => ({
      time: String(bar.time || ''),
      high: Number(bar.high),
      close: Number(bar.close),
    }))
    .filter((bar) => bar.time && Number.isFinite(bar.high) && Number.isFinite(bar.close) && bar.high > 0 && bar.close > 0)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    .slice(-historyBars);

  if (bars.length < 2) return null;

  let referencePeak: number | null = null;
  let referenceTime: string | null = null;
  let lastBrokenPeak: number | null = null;
  let zone4Active = false;
  let zone5Active = false;
  let previousClose: number | null = null;
  let previousZone3Stop: number | null = null;
  let previousZone4Stop: number | null = null;

  for (let index = 0; index < bars.length; index += 1) {
    let candidatePeak: number | null = null;
    let candidateTime: string | null = null;
    for (let offset = 1; offset <= lookbackDays; offset += 1) {
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
      const zones = buildMomentumZones(referencePeak, zone4Active, zone5Active);
      if (crossedUnder(bar.close, zones[2].stop, previousClose, previousZone3Stop)) zone4Active = true;
      if (zone4Active && crossedUnder(bar.close, zones[3].stop, previousClose, previousZone4Stop)) zone5Active = true;
      previousZone3Stop = zones[2].stop;
      previousZone4Stop = zones[3].stop;
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
    lookbackDays,
    historyBars,
    formulaVersion: MOMENTUM_FORMULA_VERSION,
    zone4Active,
    zone5Active,
    zones: buildMomentumZones(referencePeak, zone4Active, zone5Active),
  };
}
