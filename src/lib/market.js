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
