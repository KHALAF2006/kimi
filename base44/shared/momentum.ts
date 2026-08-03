export const MOMENTUM_FORMULA_VERSION = 'momentum-zones-v3-deep-cycle';

const LOOKBACK_DAYS = 20;
const HISTORY_BARS = Number.POSITIVE_INFINITY;
const FIXED_STOP_PERCENT = 0.03;
const ARCHIVED_CYCLE_LIMIT = 20;

export const MOMENTUM_ZONE_DEFINITIONS = [
  { key: 'zone1', nameAr: 'منطقة الارتداد', nameEn: 'Rebound zone', resistanceNameAr: 'مقاومة الارتداد', resistanceNameEn: 'Rebound resistance', reclaimedNameAr: 'دعم ارتداد مستعاد', reclaimedNameEn: 'Reclaimed rebound support', colorNameAr: 'أخضر', colorNameEn: 'Green', light: '#16a34a', dark: '#22c55e', topPercent: 0.075, bottomPercent: 0.10 },
  { key: 'zone2', nameAr: 'قاع أسبوعي / شهري', nameEn: 'Weekly / monthly base', resistanceNameAr: 'مقاومة أسبوعية / شهرية', resistanceNameEn: 'Weekly / monthly resistance', reclaimedNameAr: 'دعم أسبوعي / شهري مستعاد', reclaimedNameEn: 'Reclaimed weekly / monthly support', colorNameAr: 'برتقالي', colorNameEn: 'Orange', light: '#d97706', dark: '#f59e0b', topPercent: 0.20, bottomPercent: 0.24 },
  { key: 'zone3', nameAr: 'استثمار منخفض المخاطر', nameEn: 'Low-risk investment', resistanceNameAr: 'مقاومة منخفضة المخاطر', resistanceNameEn: 'Low-risk resistance', reclaimedNameAr: 'دعم منخفض المخاطر مستعاد', reclaimedNameEn: 'Reclaimed low-risk support', colorNameAr: 'أزرق', colorNameEn: 'Blue', light: '#2563eb', dark: '#60a5fa', topPercent: 0.32, bottomPercent: 0.36 },
  { key: 'zone4', nameAr: 'استثمار ربع سنوي', nameEn: 'Quarterly investment', resistanceNameAr: 'مقاومة ربع سنوية', resistanceNameEn: 'Quarterly resistance', reclaimedNameAr: 'دعم ربع سنوي مستعاد', reclaimedNameEn: 'Reclaimed quarterly support', colorNameAr: 'بنفسجي', colorNameEn: 'Purple', light: '#7c3aed', dark: '#a78bfa', topPercent: 0.48, bottomPercent: 0.52 },
  { key: 'zone5', nameAr: 'استثمار سنوي', nameEn: 'Annual investment', resistanceNameAr: 'مقاومة سنوية', resistanceNameEn: 'Annual resistance', reclaimedNameAr: 'دعم سنوي مستعاد', reclaimedNameEn: 'Reclaimed annual support', colorNameAr: 'فيروزي', colorNameEn: 'Teal', light: '#0d9488', dark: '#2dd4bf', topPercent: 0.58, bottomPercent: 0.65 },
  { key: 'zone6', nameAr: 'قاع ثلاث سنوات', nameEn: 'Three-year base', resistanceNameAr: 'مقاومة ثلاث سنوات', resistanceNameEn: 'Three-year resistance', reclaimedNameAr: 'دعم ثلاث سنوات مستعاد', reclaimedNameEn: 'Reclaimed three-year support', colorNameAr: 'وردي', colorNameEn: 'Rose', light: '#e11d48', dark: '#fb7185', topPercent: 0.75, bottomPercent: 0.80 },
  { key: 'zone7', nameAr: 'منطقة خمس سنوات', nameEn: 'Five-year zone', resistanceNameAr: 'مقاومة خمس سنوات', resistanceNameEn: 'Five-year resistance', reclaimedNameAr: 'دعم خمس سنوات مستعاد', reclaimedNameEn: 'Reclaimed five-year support', colorNameAr: 'كهرماني', colorNameEn: 'Amber', light: '#b45309', dark: '#fbbf24', topPercent: 0.85, bottomPercent: 0.90 },
];

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

export function buildMomentumZones(referencePeak: number, zone4Active = false, zone5Active = false, lifecycle: Record<string, ZoneLifecycle> = {}, zone6Active = false, zone7Active = false) {
  return MOMENTUM_ZONE_DEFINITIONS.map((definition, index) => {
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
      active: index < 3 || (index === 3 && zone4Active) || (index === 4 && zone5Active) || (index === 5 && zone6Active) || (index === 6 && zone7Active),
    };
  });
}

function crossedUnder(current: number, threshold: number, previous: number | null) {
  return previous !== null && current < threshold && previous >= threshold;
}

function freshLifecycle(referencePeak: number) {
  return Object.fromEntries(MOMENTUM_ZONE_DEFINITIONS.map((definition) => {
    const bottom = referencePeak * (1 - definition.bottomPercent);
    return [definition.key, initialLifecycle(bottom * (1 - FIXED_STOP_PERCENT))];
  })) as Record<string, ZoneLifecycle>;
}

export function calculateMomentumZones(inputBars: Array<Record<string, unknown>>, lookbackDays = LOOKBACK_DAYS, historyBars = HISTORY_BARS) {
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
  let previousClose: number | null = null;
  let lifecycle: Record<string, ZoneLifecycle> = {};
  let zoneEvents: Array<Record<string, unknown>> = [];
  const archivedCycles: Array<Record<string, unknown>> = [];

  const addEvent = (zoneKey: string, type: string, time: string, price: number, details: Record<string, unknown> = {}) => {
    zoneEvents.push({ id: eventId(referenceTime, zoneKey, type, time), zoneKey, type, time, price, ...details });
  };

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
      archivedCycles.push({ referencePeak, referenceTime, endedAt: bar.time, reason: 'new_reference_peak', zone4Active, zone5Active, zone6Active, zone7Active, zones: buildMomentumZones(referencePeak, zone4Active, zone5Active, lifecycle, zone6Active, zone7Active), events: zoneEvents });
      lastBrokenPeak = referencePeak;
      referencePeak = null;
      referenceTime = null;
      zone4Active = false;
      zone5Active = false;
      zone6Active = false;
      zone7Active = false;
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
      lifecycle = freshLifecycle(referencePeak);
      zoneEvents = [];
    }

    if (referencePeak !== null) {
      let zones = buildMomentumZones(referencePeak, zone4Active, zone5Active, lifecycle, zone6Active, zone7Active);
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
      zones = buildMomentumZones(referencePeak, zone4Active, zone5Active, lifecycle, zone6Active, zone7Active);
      if (zones[2].role === 'resistance') zone4Active = true;
      if (zones[3].active && zones[3].role === 'resistance') zone5Active = true;
      if (zones[4].active && zones[4].role === 'resistance') zone6Active = true;
      if (zones[5].active && zones[5].role === 'resistance') zone7Active = true;
    }
    previousClose = bar.close;
  }

  if (referencePeak === null) return null;
  return {
    referencePeak,
    referenceTime,
    lookbackDays: lookback,
    historyBars: bars.length,
    formulaVersion: MOMENTUM_FORMULA_VERSION,
    zone4Active,
    zone5Active,
    zone6Active,
    zone7Active,
    zones: buildMomentumZones(referencePeak, zone4Active, zone5Active, lifecycle, zone6Active, zone7Active),
    zoneEvents,
    archivedCycles: archivedCycles.slice(-ARCHIVED_CYCLE_LIMIT),
  };
}
