export const LEGACY_SAUDI_MARKET = Object.freeze({
  market_code: "SA_MAIN",
  name_ar: "السوق السعودية الرئيسية",
  name_en: "Saudi Main Market",
  currency: "SAR",
});

/**
 * Preserve the pre-multi-market identity contract without widening access.
 * An explicit market_access field remains authoritative, including an empty
 * array. Only an authenticated legacy response that does not contain the field
 * receives the historical Saudi-market default.
 */
export function resolveAvailableMarkets(context) {
  if (!context || typeof context !== "object") return [];
  if (Object.prototype.hasOwnProperty.call(context, "market_access")) {
    if (!Array.isArray(context.market_access)) return [];
    return context.market_access.filter((market) => market && typeof market.market_code === "string" && market.market_code.trim());
  }
  return [LEGACY_SAUDI_MARKET];
}
