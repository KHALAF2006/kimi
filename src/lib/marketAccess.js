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
    if (!Array.isArray(context.market_access)) return isOwner ? [LEGACY_SAUDI_MARKET, OWNER_US_OPTIONS_MARKET] : [];
    const markets = context.market_access.filter((market) => market && typeof market.market_code === "string" && market.market_code.trim());
    if (!isOwner) return markets;
    const byCode = new Map(markets.map((market) => [market.market_code, market]));
    byCode.set(LEGACY_SAUDI_MARKET.market_code, byCode.get(LEGACY_SAUDI_MARKET.market_code) || LEGACY_SAUDI_MARKET);
    byCode.set(OWNER_US_OPTIONS_MARKET.market_code, byCode.get(OWNER_US_OPTIONS_MARKET.market_code) || OWNER_US_OPTIONS_MARKET);
    return [...byCode.values()];
  }
  return isOwner ? [LEGACY_SAUDI_MARKET, OWNER_US_OPTIONS_MARKET] : [LEGACY_SAUDI_MARKET];
}