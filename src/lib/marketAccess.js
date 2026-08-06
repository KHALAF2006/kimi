export const LEGACY_SAUDI_MARKET = Object.freeze({
  market_code: "SA_MAIN",
  name_ar: "السوق السعودية الرئيسية",
  name_en: "Saudi Main Market",
  currency: "SAR",
});

export const OWNER_US_OPTIONS_MARKET = Object.freeze({
  market_code: "US_OPTIONS",
  name_ar: "شركات عقود الخيارات",
  name_en: "U.S. Optionable Companies",
  currency: "USD",
});

export const OWNER_US_BENCHMARKS_MARKET = Object.freeze({
  market_code: "US_BENCHMARKS",
  name_ar: "المؤشرات والصناديق الأمريكية",
  name_en: "U.S. Indices & ETFs",
  currency: "USD",
});

export const SUPPORTED_MARKETS = Object.freeze([LEGACY_SAUDI_MARKET, OWNER_US_OPTIONS_MARKET, OWNER_US_BENCHMARKS_MARKET]);

/**
 * Preserve the pre-multi-market identity contract without widening access.
 * An explicit market_access field remains authoritative, including an empty
 * array. Only an authenticated legacy response that does not contain the field
 * receives the historical Saudi-market default.
 */
export function resolveAvailableMarkets(context) {
  if (!context || typeof context !== "object") return [];
  const isOwner = context.identity?.role === "owner";
  if (Object.prototype.hasOwnProperty.call(context, "market_access")) {
    if (!Array.isArray(context.market_access)) return isOwner ? SUPPORTED_MARKETS : [];
    const markets = context.market_access.filter((market) => market && typeof market.market_code === "string" && market.market_code.trim());
    if (!isOwner) return markets;
    const byCode = new Map(markets.map((market) => [market.market_code, market]));
    SUPPORTED_MARKETS.forEach((market) => byCode.set(market.market_code, byCode.get(market.market_code) || market));
    return [...byCode.values()];
  }
  return isOwner ? SUPPORTED_MARKETS : [LEGACY_SAUDI_MARKET];
}