export const MOMENTUM_FORMULA_VERSION = 'momentum-zones-v4-digital-timeframe-ladder';

const LOOKBACK_DAYS = 20;
const HISTORY_BARS = Number.POSITIVE_INFINITY;
const FIXED_STOP_PERCENT = 0.03;
const ARCHIVED_CYCLE_LIMIT = 20;

const DIGITAL_HORIZONS = [
  { key: 'daily', supportAr: 'يومي', resistanceAr: 'يومية', en: 'daily' },
  { key: 'weekly', supportAr: 'أسبوعي', resistanceAr: 'أسبوعية', en: 'weekly' },
  { key: 'monthly', supportAr: 'شهري', resistanceAr: 'شهرية', en: 'monthly' },
  { key: 'quarterly', supportAr: 'ربع سنوي', resistanceAr: 'ربع سنوية', en: 'quarterly' },
  { key: 'annual', supportAr: 'سنوي', resistanceAr: 'سنوية', en: 'annual' },
  { key: 'three_year', supportAr: 'لثلاث سنوات', resistanceAr: 'لثلاث سنوات', en: 'three-year' },
  { key: 'five_year', supportAr: 'لخمس سنوات', resistanceAr: 'لخمس سنوات', en: 'five-year' },
  { key: 'ten_year', supportAr: 'لعشر سنوات', resistanceAr: 'لعشر سنوات', en: 'ten-year' },
];

const ZONE_BANDS = [
  { key: 'zone1', topPercent: 0.075, bottomPercent: 0.10 },
  { key: 'zone2', topPercent: 0.20, bottomPercent: 0.24 },
  { key: 'zone3', topPercent: 0.32, bottomPercent: 0.36 },
  { key: 'zone4', topPercent: 0.48, bottomPercent: 0.52 },
  { key: 'zone5', topPercent: 0.58, bottomPercent: 0.65 },
  { key: 'zone6', topPercent: 0.75, bottomPercent: 0.80 },
  { key: 'zone7', topPercent: 0.85, bottomPercent: 0.90 },
  { key: 'zone8', topPercent: 0.92, bottomPercent: 0.95 },
];

function normalizedAnchorTimeframe(timeframe = '1d') {
  if (timeframe === '1wk') return '1wk';
  if (timeframe === '1mo') return '1mo';
  return '1d';
}

function horizonStartIndex(timeframe = '1d') {
  const anchor = normalizedAnchorTimeframe(timeframe);
  if (anchor === '1wk') return 1;
  if (anchor === '1mo') return 2;
  return 0;
}

export function momentumZoneDefinitions(timeframe = '1d') {
  const anchorTimeframe = normalizedAnchorTimeframe(timeframe);
  const start = horizonStartIndex(anchorTimeframe);
  return ZONE_BANDS.slice(0, DIGITAL_HORIZONS.length - start).map((band, index) => {
    const horizon = DIGITAL_HORIZONS[start + index];
    return {
      ...band,
      horizonKey: horizon.key,
      horizonRank: start + index,
      anchorTimeframe,
      nameAr: `قاع رقمي ${horizon.supportAr}`,
      nameEn: `${horizon.en} digital bottom`,
      resistanceNameAr: `قمة رقمية ${horizon.resistanceAr}`,
      resistanceNameEn: `${horizon.en} digital top`,
      reclaimedNameAr: `قاع رقمي ${horizon.supportAr} مستعاد`,
      reclaimedNameEn: `reclaimed ${horizon.en} digital bottom`,
      colorNameAr: 'أخضر',
      colorNameEn: 'Green',
      light: '#16a34a',
      dark: '#22c55e',
    };
  });
}

export const MOMENTUM_ZONE_DEFINITIONS = momentumZoneDefinitions('1d');

type ZoneLifecycle = {
  role: 'support' | 'resistance';
  lifecycleStatus: 'support_active' | 'resistance_candidate' | 'resistance_confirmed' | 'reclaim_candidate' | 'support_reclaimed';
  originalStop: number;
  currentStop: number;
  brokenAt: string | null;
  retestedAt: string | null;
  reclaimCandidateAt: string | null;
  reclaimedAt: string | null;
  reclaimLow: number | null;
};

function initialLifecycle(originalStop: number): ZoneLifecycle {
  return {
    role: 'support', lifecycleStatus: 'support_active', originalStop, currentStop: originalStop,
    brokenAt: null, retestedAt: null, reclaimCandidateAt: null, reclaimedAt: null, reclaimLow: null,
  };
}

function lifecycleName(definition: Record<string, any>, state: ZoneLifecycle) {
  if (state.role === 'resistance') return { displayNameAr: definition.resistanceNameAr, displayNameEn: definition.resistanceNameEn };
  if (state.lifecycleStatus === 'support_reclaimed') return { displayNameAr: definition.reclaimedNameAr, displayNameEn: definition.reclaimedNameEn };
  return { displayNameAr: definition.nameAr, displayNameEn: definition.nameEn };
}

function eventId(referenceTime: string | null, zoneKey: string, type: string, time: string) {
  return `${referenceTime || 'unknown'}:${zoneKey}:${type}:${time}`;
}

function activeFlags(zone4Active: boolean, zone5Active: boolean, zone6Active: boolean, zone7Active: boolean, zone8Active: boolean) {
  return [true, true, true, zone4Active, zone5Active, zone6Active, zone7Active, zone8Active];
}

export function buildMomentumZones(referencePeak: number, zone4Active = false, zone5Active = false, lifecycle: Record<string, ZoneLifecycle> = {}, zone6Active = false, zone7Active = false, zone8Active = false, timeframe = '1d') {
  const definitions = momentumZoneDefinitions(timeframe);
  const activation = activeFlags(zone4Active, zone5Active, zone6Active, zone7Active, zone8Active);
  return definitions.map((definition, index) => {
    const top = referencePeak * (1 - definition.topPercent);
    const bottom = referencePeak * (1 - definition.bottomPercent);
    const originalStop = bottom * (1 - FIXED_STOP_PERCENT);
    const state = lifecycle[definition.key] || initialLifecycle(originalStop);
    return {
      ...definition,
      ...lifecycleName(definition, state),
      top,
      bottom,
      stop: state.currentStop,
      originalStop: state.originalStop,
      displayStop: state.role === 'support' ? state.currentStop : null,
      stopVisible: state.role === 'support',
      role: state.role,
      lifecycleStatus: state.lifecycleStatus,
      brokenAt: state.brokenAt,
      retestedAt: state.retestedAt,
      reclaimCandidateAt: state.reclaimCandidateAt,
      reclaimedAt: state.reclaimedAt,
      active: activation[index] === true,
    };
  });
}

function crossedUnder(current: number, threshold: number, previous: number | null) {
  return previous !== null && current < threshold && previous >= threshold;
}

function freshLifecycle(referencePeak: number, definitions: Array<Record<string, any>>) {
  return Object.fromEntries(definitions.map((definition) => {
    const bottom = referencePeak * (1 - definition.bottomPercent);
    return [definition.key, initialLifecycle(bottom * (1 - FIXED_STOP_PERCENT))];
  })) as Record<string, ZoneLifecycle>;
}

export function calculateMomentumZones(inputBars: Array<Record<string, unknown>>, lookbackDays = LOOKBACK_DAYS, historyBars = HISTORY_BARS, timeframe = '1d') {
  const anchorTimeframe = normalizedAnchorTimeframe(timeframe);
  const definitions = momentumZoneDefinitions(anchorTimeframe);
  const lookback = Math.min(30, Math.max(6, Math.round(Number(lookbackDays) || LOOKBACK_DAYS)));
  const normalizedCandidates = inputBars
    .map((bar) => ({
      time: String(bar.time || ''), open: Number(bar.open), high: Number(bar.high), low: Number(bar.low), close: Number(bar.close),
      isFinal: bar.is_final !== false && bar.isFinal !== false,
    }))
    .filter((bar) => bar.time && Number.isFinite(new Date(bar.time).getTime()) && bar.isFinal && [bar.high, bar.low, bar.close].every((value) => Number.isFinite(value) && value > 0) && bar.high >= bar.low);
  const normalized = [...new Map(normalizedCandidates.map((bar) => [new Date(bar.time).toISOString(), { ...bar, time: new Date(bar.time).toISOString() }])).values()]
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  const finiteHistoryLimit = Number.isFinite(Number(historyBars))
    ? Math.max(lookback + 2, Math.round(Number(historyBars)))
    : normalized.length;
  const bars = normalized.slice(-finiteHistoryLimit);
  if (bars.length < lookback + 1) return null;

  let referencePeak: number | null = null;
  let referenceTime: string | null = null;
  let lastBrokenPeak: number | null = null;
  let zone4Active = false;
  let zone5Active = false;
  let zone6Active = false;
  let zone7Active = false;
  let zone8Active = false;
  let previousClose: number | null = null;
  let lifecycle: Record<string, ZoneLifecycle> = {};
  let zoneEvents: Array<Record<string, unknown>> = [];
  const archivedCycles: Array<Record<string, unknown>> = [];

  const addEvent = (zoneKey: string, type: string, time: string, price: number, details: Record<string, unknown> = {}) => {
    zoneEvents.push({ id: eventId(referenceTime, zoneKey, type, time), zoneKey, type, time, price, ...details });
  };
  const build = () => buildMomentumZones(referencePeak as number, zone4Active, zone5Active, lifecycle, zone6Active, zone7Active, zone8Active, anchorTimeframe);

  for (let index = 0; index < bars.length; index += 1) {
    let candidatePeak: number | null = null;
    let candidateTime: string | null = null;
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
      archivedCycles.push({ referencePeak, referenceTime, endedAt: bar.time, reason: 'new_reference_peak', anchorTimeframe, zone4Active, zone5Active, zone6Active, zone7Active, zone8Active, zones: build(), events: zoneEvents });
      lastBrokenPeak = referencePeak;
      referencePeak = null;
      referenceTime = null;
      zone4Active = false;
      zone5Active = false;
      zone6Active = false;
      zone7Active = false;
      zone8Active = false;
      lifecycle = {};
      zoneEvents = [];
    }

    if (referencePeak === null && candidatePeak !== null && (lastBrokenPeak === null || candidatePeak !== lastBrokenPeak)) {
      referencePeak = candidatePeak;
      referenceTime = candidateTime;
      zone4Active = false;
      zone5Active = false;
      zone6Active = false;
      zone7Active = false;
      zone8Active = false;
      lifecycle = freshLifecycle(referencePeak, definitions);
      zoneEvents = [];
    }

    if (referencePeak !== null) {
      let zones = build();
      for (const zone of zones) {
        if (!zone.active) continue;
        const state = lifecycle[zone.key];
        if (state.role === 'support' && crossedUnder(bar.close, state.currentStop, previousClose)) {
          state.role = 'resistance';
          state.lifecycleStatus = 'resistance_candidate';
          state.brokenAt = bar.time;
          state.retestedAt = null;
          state.reclaimCandidateAt = null;
          state.reclaimedAt = null;
          state.reclaimLow = null;
          addEvent(zone.key, 'stop_broken', bar.time, bar.close, { previousRole: 'support', nextRole: 'resistance', stop: state.currentStop });
          if (zone.key === 'zone3') zone4Active = true;
          if (zone.key === 'zone4') zone5Active = true;
          if (zone.key === 'zone5') zone6Active = true;
          if (zone.key === 'zone6') zone7Active = true;
          if (zone.key === 'zone7') zone8Active = true;
          continue;
        }

        if (state.role !== 'resistance' || state.brokenAt === bar.time) continue;
        if (bar.close > zone.top) {
          if (state.lifecycleStatus === 'reclaim_candidate' && state.reclaimCandidateAt !== bar.time) {
            state.role = 'support';
            state.lifecycleStatus = 'support_reclaimed';
            state.reclaimedAt = bar.time;
            state.currentStop = Math.min(zone.bottom, state.reclaimLow || zone.bottom, bar.low) * (1 - FIXED_STOP_PERCENT);
            addEvent(zone.key, 'support_reclaimed', bar.time, bar.close, { previousRole: 'resistance', nextRole: 'support', newStop: state.currentStop });
          } else if (state.lifecycleStatus !== 'reclaim_candidate') {
            state.lifecycleStatus = 'reclaim_candidate';
            state.reclaimCandidateAt = bar.time;
            state.reclaimLow = bar.low;
            addEvent(zone.key, 'reclaim_candidate', bar.time, bar.close, { zoneTop: zone.top });
          }
          continue;
        }

        if (state.lifecycleStatus === 'reclaim_candidate' && bar.close <= zone.bottom) {
          state.lifecycleStatus = 'resistance_confirmed';
          state.retestedAt = bar.time;
          state.reclaimCandidateAt = null;
          state.reclaimLow = null;
          addEvent(zone.key, 'resistance_confirmed', bar.time, bar.close, { reason: 'failed_reclaim' });
          continue;
        }
        const touchedZone = bar.high >= zone.bottom && bar.low <= zone.top;
        if (state.lifecycleStatus === 'resistance_candidate' && touchedZone && bar.close < zone.bottom) {
          state.lifecycleStatus = 'resistance_confirmed';
          state.retestedAt = bar.time;
          addEvent(zone.key, 'resistance_confirmed', bar.time, bar.close, { reason: 'retest_rejection' });
        }
      }
      zones = build();
      if (zones[2]?.role === 'resistance') zone4Active = true;
      if (zones[3]?.active && zones[3].role === 'resistance') zone5Active = true;
      if (zones[4]?.active && zones[4].role === 'resistance') zone6Active = true;
      if (zones[5]?.active && zones[5].role === 'resistance') zone7Active = true;
      if (zones[6]?.active && zones[6].role === 'resistance') zone8Active = true;
    }
    previousClose = bar.close;
  }

  if (referencePeak === null) return null;
  return {
    referencePeak,
    referenceTime,
    anchorTimeframe,
    horizonStart: definitions[0]?.horizonKey || 'daily',
    lookbackDays: lookback,
    historyBars: bars.length,
    formulaVersion: MOMENTUM_FORMULA_VERSION,
    zone4Active,
    zone5Active,
    zone6Active,
    zone7Active,
    zone8Active,
    zones: build(),
    zoneEvents,
    archivedCycles: archivedCycles.slice(-ARCHIVED_CYCLE_LIMIT),
  };
}
