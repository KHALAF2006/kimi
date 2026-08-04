import React, { useState } from "react";
import { BadgeDollarSign, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useActiveMarket } from "@/lib/MarketContext";
import { SUPPORTED_MARKETS } from "@/lib/marketAccess";
import { usePreferences } from "@/lib/preferences";

export default function MarketAccessSelect({ compact = false, onMarketChange }) {
  const navigate = useNavigate();
  const { isArabic } = usePreferences();
  const { marketCode, availableMarkets, setMarketCode, loading } = useActiveMarket();
  const [lockedMarket, setLockedMarket] = useState(null);
  const allowed = new Set(availableMarkets.map((market) => market.market_code));

  function selectMarket(event) {
    const nextCode = event.target.value;
    if (!allowed.has(nextCode)) {
      setLockedMarket(SUPPORTED_MARKETS.find((market) => market.market_code === nextCode));
      return;
    }
    if (setMarketCode(nextCode)) onMarketChange?.(nextCode);
  }

  return <>
    <label className={compact ? "market-account-switcher" : "relative"} title={isArabic ? "اختيار السوق" : "Select market"}>
      {compact && <BadgeDollarSign size={17} aria-hidden="true" />}
      <span className="sr-only">{isArabic ? "اختيار السوق" : "Select market"}</span>
      <select className={compact ? "" : "form-input pe-9"} value={marketCode} onChange={selectMarket} disabled={loading} aria-label={isArabic ? "اختيار السوق" : "Select market"}>
        {!marketCode && <option value="">{isArabic ? "اختر السوق" : "Select market"}</option>}
        {SUPPORTED_MARKETS.map((market) => <option key={market.market_code} value={market.market_code}>{isArabic ? market.name_ar : market.name_en}{allowed.has(market.market_code) ? " ✓" : ` — ${isArabic ? "يتطلب اشتراكاً" : "Subscription required"}`}</option>)}
      </select>
      {!compact && <LockKeyhole size={14} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />}
    </label>
    <Dialog open={Boolean(lockedMarket)} onOpenChange={(open) => !open && setLockedMarket(null)}>
      <DialogContent><DialogHeader><DialogTitle>{isArabic ? "فعّل هذا السوق" : "Activate this market"}</DialogTitle><DialogDescription>{isArabic ? `سوق «${lockedMarket?.name_ar || ""}» غير مفعّل ضمن اشتراكك الحالي. اشترك في الخطة المناسبة للوصول إلى بياناته وأدواته.` : `“${lockedMarket?.name_en || ""}” is not included in your current subscription. Choose an eligible plan to access its data and tools.`}</DialogDescription></DialogHeader><DialogFooter><button className="secondary-button" onClick={() => setLockedMarket(null)}>{isArabic ? "ليس الآن" : "Not now"}</button><button className="primary-button" onClick={() => navigate("/profile")}>{isArabic ? "عرض الاشتراك" : "View subscription"}</button></DialogFooter></DialogContent>
    </Dialog>
  </>;
}