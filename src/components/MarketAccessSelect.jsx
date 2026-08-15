import React, { useState } from "react";
import { ChartNoAxesCombined, LockKeyhole } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SessionLink } from "@/components/SessionLink";
import { useActiveMarket } from "@/lib/MarketContext";
import { SUPPORTED_MARKETS } from "@/lib/marketAccess";
import { usePreferences } from "@/lib/preferences";

export default function MarketAccessSelect({ compact = false, onMarketChange }) {
  const { isArabic } = usePreferences();
  const { marketCode, availableMarkets, setMarketCode, loading } = useActiveMarket();
  const [lockedMarket, setLockedMarket] = useState(null);
  const allowed = new Set(availableMarkets.map((market) => market.market_code));

  function selectMarket(event, nextCode) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!allowed.has(nextCode)) {
      event.preventDefault();
      setLockedMarket(SUPPORTED_MARKETS.find((market) => market.market_code === nextCode));
      return;
    }
    if (setMarketCode(nextCode)) onMarketChange?.(nextCode);
  }

  const visuals = {
    SA_MAIN: { icon: <span className="market-flag" aria-hidden="true">🇸🇦</span>, tone: "saudi" },
    US_OPTIONS: { icon: <span className="market-flag" aria-hidden="true">🇺🇸</span>, tone: "options" },
    US_BENCHMARKS: { icon: <ChartNoAxesCombined size={17} aria-hidden="true" />, tone: "benchmarks" },
  };

  return <>
    <nav className={`market-tabs ${compact ? "market-tabs-compact" : ""}`} aria-label={isArabic ? "الأسواق المتاحة" : "Available markets"}>
      {SUPPORTED_MARKETS.map((market) => {
        const permitted = allowed.has(market.market_code);
        const active = marketCode === market.market_code;
        const visual = visuals[market.market_code];
        const content = <>
          {visual.icon}
          <span>{isArabic ? market.name_ar : market.name_en}</span>
          {!permitted && <LockKeyhole size={12} aria-hidden="true" />}
        </>;
        const common = {
          key: market.market_code,
          className: `market-tab market-tab-${visual.tone}${active ? " active" : ""}${permitted ? "" : " locked"}`,
          "aria-label": `${isArabic ? market.name_ar : market.name_en}${permitted ? "" : isArabic ? "، يتطلب اشتراكاً" : ", subscription required"}`,
        };
        return permitted
          ? <SessionLink {...common} to={`/dashboard?market=${encodeURIComponent(market.market_code)}`} onClick={(event) => selectMarket(event, market.market_code)} aria-current={active ? "page" : undefined}>{content}</SessionLink>
          : <button {...common} type="button" onClick={(event) => selectMarket(event, market.market_code)} disabled={loading} aria-pressed={false}>{content}</button>;
      })}
    </nav>
    <Dialog open={Boolean(lockedMarket)} onOpenChange={(open) => !open && setLockedMarket(null)}>
      <DialogContent><DialogHeader><DialogTitle>{isArabic ? "فعّل هذا السوق" : "Activate this market"}</DialogTitle><DialogDescription>{isArabic ? `سوق «${lockedMarket?.name_ar || ""}» غير مفعّل ضمن اشتراكك الحالي. اشترك في الخطة المناسبة للوصول إلى بياناته وأدواته.` : `“${lockedMarket?.name_en || ""}” is not included in your current subscription. Choose an eligible plan to access its data and tools.`}</DialogDescription></DialogHeader><DialogFooter><button className="secondary-button" onClick={() => setLockedMarket(null)}>{isArabic ? "ليس الآن" : "Not now"}</button><SessionLink className="primary-button" to="/profile">{isArabic ? "عرض الاشتراك" : "View subscription"}</SessionLink></DialogFooter></DialogContent>
    </Dialog>
  </>;
}
