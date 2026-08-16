export const MOMENTUM_FORMULA_VERSION = "momentum-zones-v4-digital-timeframe-ladder";

const DIGITAL_HORIZONS = [
  { key: "daily", supportAr: "يومي", resistanceAr: "يومية", en: "daily" },
  { key: "weekly", supportAr: "أسبوعي", resistanceAr: "أسبوعية", en: "weekly" },
  { key: "monthly", supportAr: "شهري", resistanceAr: "شهرية", en: "monthly" },
  { key: "quarterly", supportAr: "ربع سنوي", resistanceAr: "ربع سنوية", en: "quarterly" },
  { key: "annual", supportAr: "سنوي", resistanceAr: "سنوية", en: "annual" },
  { key: "three_year", supportAr: "لثلاث سنوات", resistanceAr: "لثلاث سنوات", en: "three-year" },
  { key: "five_year", supportAr: "لخمس سنوات", resistanceAr: "لخمس سنوات", en: "five-year" },
  { key: "ten_year", supportAr: "لعشر سنوات", resistanceAr: "لعشر سنوات", en: "ten-year" },
];

const ZONE_BANDS = [
  { key: "zone1", topPercent: 0.075, bottomPercent: 0.10 },
  { key: "zone2", topPercent: 0.20, bottomPercent: 0.24 },
  { key: "zone3", topPercent: 0.32, bottomPercent: 0.36 },
  { key: "zone4", topPercent: 0.48, bottomPercent: 0.52 },
  { key: "zone5", topPercent: 0.58, bottomPercent: 0.65 },
  { key: "zone6", topPercent: 0.75, bottomPercent: 0.80 },
  { key: "zone7", topPercent: 0.85, bottomPercent: 0.90 },
  { key: "zone8", topPercent: 0.92, bottomPercent: 0.95 },
];

function normalizedAnchorTimeframe(timeframe = "1d") {
  if (timeframe === "1wk") return "1wk";
  if (timeframe === "1mo") return "1mo";
  return "1d";
}

export function momentumZoneDefinitions(timeframe = "1d") {
  const anchorTimeframe = normalizedAnchorTimeframe(timeframe);
  const start = anchorTimeframe === "1wk" ? 1 : anchorTimeframe === "1mo" ? 2 : 0;
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
      colorNameAr: "أخضر",
      colorNameEn: "Green",
      light: "#16a34a",
      dark: "#22c55e",
    };
  });
}

export const MOMENTUM_ZONE_DEFINITIONS = momentumZoneDefinitions("1d");

const CHART_INTERVALS = new Set(["15m", "1h", "2h", "3h", "4h", "1d", "1wk", "1mo"]);

export function companyDashboardPath(symbol, timeframe = "", marketCode = "") {
  const params = new URLSearchParams({ company: String(symbol || "") });
  if (CHART_INTERVALS.has(String(timeframe))) params.set("timeframe", String(timeframe));
  if (marketCode) params.set("market", String(marketCode));
  return `/dashboard?${params.toString()}`;
}

export function selectMomentumSnapshot(indicators = [], timeframe = "") {
  return [...(Array.isArray(indicators) ? indicators : [])]
    .filter((item) => item?.indicator_key === "momentum_zones")
    .filter((item) => !timeframe || item.timeframe === timeframe)
    .sort((left, right) => {
      const leftTime = Date.parse(left?.source_as_of || left?.calculated_at || left?.updated_date || "") || 0;
      const rightTime = Date.parse(right?.source_as_of || right?.calculated_at || right?.updated_date || "") || 0;
      return rightTime - leftTime;
    })[0] || null;
}

function initialMomentumLifecycle(originalStop) {
  return { role: "support", lifecycleStatus: "support_active", originalStop, currentStop: originalStop, brokenAt: null, retestedAt: null, reclaimCandidateAt: null, reclaimedAt: null, reclaimLow: null };
}

function momentumLifecycleName(definition, state) {
  if (state.role === "resistance") return { displayNameAr: definition.resistanceNameAr, displayNameEn: definition.resistanceNameEn };
  if (state.lifecycleStatus === "support_reclaimed") return { displayNameAr: definition.reclaimedNameAr, displayNameEn: definition.reclaimedNameEn };
  return { displayNameAr: definition.nameAr, displayNameEn: definition.nameEn };
}

export function buildMomentumZones(referencePeak, zone4Active = false, zone5Active = false, theme = "light", lifecycle = {}, zone6Active = false, zone7Active = false, zone8Active = false, timeframe = "1d") {
  const definitions = momentumZoneDefinitions(timeframe);
  const activation = [true, true, true, zone4Active, zone5Active, zone6Active, zone7Active, zone8Active];
  return definitions.map((definition, index) => {
    const top = referencePeak * (1 - definition.topPercent);
    const bottom = referencePeak * (1 - definition.bottomPercent);
    const originalStop = bottom * 0.97;
    const state = lifecycle[definition.key] || initialMomentumLifecycle(originalStop);
    return {
      ...definition,
      ...momentumLifecycleName(definition, state),
      color: theme === "dark" ? definition.dark : definition.light,
      top,
      bottom,
      stop: state.currentStop,
      originalStop: state.originalStop,
      displayStop: state.role === "support" ? state.currentStop : null,
      stopVisible: state.role === "support",
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

export function normalizeMomentum(snapshot, theme = "light") {
  if (!snapshot) return null;
  const values = snapshot.values || snapshot;
  const anchorTimeframe = normalizedAnchorTimeframe(values.anchorTimeframe || values.anchor_timeframe || snapshot.timeframe || "1d");
  const definitions = momentumZoneDefinitions(anchorTimeframe);
  if (Array.isArray(values.zones)) {
    const firstStoredZone = values.zones.find((zone) => Number(zone?.top) > 0);
    const firstDefinition = definitions.find((definition) => definition.key === (firstStoredZone?.key || "zone1")) || definitions[0];
    const inferredPeak = firstStoredZone ? Number(firstStoredZone.top) / (1 - firstDefinition.topPercent) : null;
    const peak = Number(values.referencePeak || values.reference_peak || snapshot.referencePeak || snapshot.reference_peak || inferredPeak);
    const calculated = Number.isFinite(peak) && peak > 0
      ? buildMomentumZones(
        peak,
        Boolean(values.zone4Active || values.zone4_active),
        Boolean(values.zone5Active || values.zone5_active),
        theme,
        {},
        Boolean(values.zone6Active || values.zone6_active),
        Boolean(values.zone7Active || values.zone7_active),
        Boolean(values.zone8Active || values.zone8_active),
        anchorTimeframe,
      )
      : [];
    const storedByKey = new Map(values.zones.map((zone, index) => [zone?.key || definitions[index]?.key, zone]));
    const zones = definitions.map((definition, index) => {
      const stored = storedByKey.get(definition.key);
      const fallback = calculated[index];
      if (!stored && !fallback) return null;
      const zone = { ...fallback, ...stored, ...definition };
      const role = zone.role || "support";
      const lifecycleStatus = zone.lifecycleStatus || "support_active";
      const displayNames = momentumLifecycleName(definition, { role, lifecycleStatus });
      return {
        ...zone,
        ...displayNames,
        role,
        lifecycleStatus,
        displayStop: zone.displayStop === null ? null : Number(zone.displayStop ?? zone.stop),
        stopVisible: zone.stopVisible !== false && role === "support",
        color: theme === "dark" ? definition.dark : definition.light,
      };
    }).filter(Boolean);
    return { ...snapshot, ...values, anchorTimeframe, horizonStart: definitions[0]?.horizonKey || "daily", zones };
  }
  const peak = Number(values.referencePeak || values.reference_peak);
  if (!Number.isFinite(peak) || peak <= 0) return null;
  return { ...snapshot, ...values, anchorTimeframe, horizonStart: definitions[0]?.horizonKey || "daily", zones: buildMomentumZones(peak, Boolean(values.zone4Active || values.zone4_active), Boolean(values.zone5Active || values.zone5_active), theme, {}, Boolean(values.zone6Active || values.zone6_active), Boolean(values.zone7Active || values.zone7_active), Boolean(values.zone8Active || values.zone8_active), anchorTimeframe) };
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
export function calculateMomentumSnapshot(inputBars = [], lookbackDays = 20, historyBars = Number.POSITIVE_INFINITY, theme = "light", timeframe = "1d") {
  const anchorTimeframe = normalizedAnchorTimeframe(timeframe);
  const definitions = momentumZoneDefinitions(anchorTimeframe);
  const lookback = Math.min(30, Math.max(6, Math.round(Number(lookbackDays) || 20)));
  const normalizedCandidates = inputBars.map((bar) => ({
    time: marketTime(bar.time),
    open: Number(bar.open),
    high: Number(bar.high),
    low: Number(bar.low),
    close: Number(bar.close),
    isFinal: bar.is_final !== false && bar.isFinal !== false,
  })).filter((bar) => bar.isFinal && Number.isFinite(bar.time) && [bar.high, bar.low, bar.close].every((value) => Number.isFinite(value) && value > 0) && bar.high >= bar.low);
  const normalized = [...new Map(normalizedCandidates.map((bar) => [bar.time, bar])).values()].sort((a, b) => a.time - b.time);
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
  let zone6Active = false;
  let zone7Active = false;
  let zone8Active = false;
  let previousClose = null;
  let lifecycle = {};
  let zoneEvents = [];
  const archivedCycles = [];

  const freshLifecycle = (peak) => Object.fromEntries(definitions.map((definition) => {
    const bottom = peak * (1 - definition.bottomPercent);
    return [definition.key, initialMomentumLifecycle(bottom * 0.97)];
  }));
  const addEvent = (zoneKey, type, time, price, details = {}) => zoneEvents.push({ id: `${referenceTime || "unknown"}:${zoneKey}:${type}:${time}`, zoneKey, type, time, price, ...details });
  const build = () => buildMomentumZones(referencePeak, zone4Active, zone5Active, theme, lifecycle, zone6Active, zone7Active, zone8Active, anchorTimeframe);

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
      archivedCycles.push({ referencePeak, referenceTime, endedAt: bar.time, reason: "new_reference_peak", anchorTimeframe, zone4Active, zone5Active, zone6Active, zone7Active, zone8Active, zones: build(), events: zoneEvents });
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
      lifecycle = freshLifecycle(referencePeak);
      zoneEvents = [];
    }

    if (referencePeak !== null) {
      let zones = build();
      for (const zone of zones) {
        if (!zone.active) continue;
        const state = lifecycle[zone.key];
        if (state.role === "support" && previousClose !== null && bar.close < state.currentStop && previousClose >= state.currentStop) {
          state.role = "resistance";
          state.lifecycleStatus = "resistance_candidate";
          state.brokenAt = bar.time;
          state.retestedAt = null;
          state.reclaimCandidateAt = null;
          state.reclaimedAt = null;
          state.reclaimLow = null;
          addEvent(zone.key, "stop_broken", bar.time, bar.close, { previousRole: "support", nextRole: "resistance", stop: state.currentStop });
          if (zone.key === "zone3") zone4Active = true;
          if (zone.key === "zone4") zone5Active = true;
          if (zone.key === "zone5") zone6Active = true;
          if (zone.key === "zone6") zone7Active = true;
          if (zone.key === "zone7") zone8Active = true;
          continue;
        }
        if (state.role !== "resistance" || state.brokenAt === bar.time) continue;
        if (bar.close > zone.top) {
          if (state.lifecycleStatus === "reclaim_candidate" && state.reclaimCandidateAt !== bar.time) {
            state.role = "support";
            state.lifecycleStatus = "support_reclaimed";
            state.reclaimedAt = bar.time;
            state.currentStop = Math.min(zone.bottom, state.reclaimLow || zone.bottom, bar.low) * 0.97;
            addEvent(zone.key, "support_reclaimed", bar.time, bar.close, { previousRole: "resistance", nextRole: "support", newStop: state.currentStop });
          } else if (state.lifecycleStatus !== "reclaim_candidate") {
            state.lifecycleStatus = "reclaim_candidate";
            state.reclaimCandidateAt = bar.time;
            state.reclaimLow = bar.low;
            addEvent(zone.key, "reclaim_candidate", bar.time, bar.close, { zoneTop: zone.top });
          }
          continue;
        }
        if (state.lifecycleStatus === "reclaim_candidate" && bar.close <= zone.bottom) {
          state.lifecycleStatus = "resistance_confirmed";
          state.retestedAt = bar.time;
          state.reclaimCandidateAt = null;
          state.reclaimLow = null;
          addEvent(zone.key, "resistance_confirmed", bar.time, bar.close, { reason: "failed_reclaim" });
          continue;
        }
        const touchedZone = bar.high >= zone.bottom && bar.low <= zone.top;
        if (state.lifecycleStatus === "resistance_candidate" && touchedZone && bar.close < zone.bottom) {
          state.lifecycleStatus = "resistance_confirmed";
          state.retestedAt = bar.time;
          addEvent(zone.key, "resistance_confirmed", bar.time, bar.close, { reason: "retest_rejection" });
        }
      }
      zones = build();
      if (zones[2]?.role === "resistance") zone4Active = true;
      if (zones[3]?.active && zones[3].role === "resistance") zone5Active = true;
      if (zones[4]?.active && zones[4].role === "resistance") zone6Active = true;
      if (zones[5]?.active && zones[5].role === "resistance") zone7Active = true;
      if (zones[6]?.active && zones[6].role === "resistance") zone8Active = true;
    }
    previousClose = bar.close;
  }

  if (referencePeak === null) return null;
  return {
    referencePeak,
    referenceTime,
    anchorTimeframe,
    horizonStart: definitions[0]?.horizonKey || "daily",
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
    archivedCycles: archivedCycles.slice(-20),
  };
}

const numberFormatters = new Map();

function numberFormatter(language, digits, compact = false) {
  const locale = language === "ar" ? "ar-SA" : "en-US";
  const key = `${locale}:${compact ? "compact" : "standard"}:${digits}`;
  if (!numberFormatters.has(key)) {
    numberFormatters.set(key, new Intl.NumberFormat(locale, compact
      ? { notation: "compact", maximumFractionDigits: digits }
      : { maximumFractionDigits: digits }));
  }
  return numberFormatters.get(key);
}

export function formatNumber(value, language = "ar", digits = 2) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return numberFormatter(language, digits).format(Number(value));
}

export function formatCompact(value, language = "ar") {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return numberFormatter(language, 1, true).format(Number(value));
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
