import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuthorization } from "@/lib/AuthorizationContext";
import { resolveAvailableMarkets } from "@/lib/marketAccess";

const MarketContext = createContext(null);
const STORAGE_KEY = "smart_investor_market_code";

export function ActiveMarketProvider({ children }) {
  const { loading, context, error, refresh } = useAuthorization();
  const availableMarkets = useMemo(() => resolveAvailableMarkets(context), [context]);
  const [marketCode, setMarketCodeState] = useState(() => localStorage.getItem(STORAGE_KEY) || "");

  useEffect(() => {
    if (loading) return;
    const allowed = new Set(availableMarkets.map((market) => market.market_code));
    const next = allowed.has(marketCode) ? marketCode : (availableMarkets[0]?.market_code || "");
    if (next !== marketCode) setMarketCodeState(next);
    if (next) localStorage.setItem(STORAGE_KEY, next);
    else localStorage.removeItem(STORAGE_KEY);
  }, [loading, availableMarkets, marketCode]);

  const setMarketCode = useCallback((nextCode) => {
    const normalized = String(nextCode || "").trim().toUpperCase();
    if (!availableMarkets.some((market) => market.market_code === normalized)) return false;
    localStorage.setItem(STORAGE_KEY, normalized);
    setMarketCodeState(normalized);
    return true;
  }, [availableMarkets]);

  const market = availableMarkets.find((item) => item.market_code === marketCode) || null;
  const value = useMemo(() => ({
    loading,
    error,
    marketCode,
    market,
    availableMarkets,
    setMarketCode,
    refresh,
    hasMarket: (code) => availableMarkets.some((item) => item.market_code === code),
  }), [loading, error, marketCode, market, availableMarkets, setMarketCode, refresh]);

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useActiveMarket() {
  const value = useContext(MarketContext);
  if (!value) throw new Error("useActiveMarket must be used within ActiveMarketProvider");
  return value;
}
