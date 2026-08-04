import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { SessionLink } from "@/components/SessionLink";
import { ArrowLeft, ArrowRight } from "lucide-react";
import CompanyPanel from "@/components/market/CompanyPanel";
import { usePreferences } from "@/lib/preferences";
import { useActiveMarket } from "@/lib/MarketContext";

export default function CompanyDetails() {
  const [params] = useSearchParams();
  const { isArabic } = usePreferences();
  const { marketCode, availableMarkets, setMarketCode } = useActiveMarket();
  const symbol = params.get("company") || params.get("symbol") || "";
  const requestedMarket = params.get("market") || "";
  const requestedMarketAllowed = availableMarkets.some((item) => item.market_code === requestedMarket);
  useEffect(() => {
    if (requestedMarketAllowed) setMarketCode(requestedMarket);
  }, [requestedMarket, requestedMarketAllowed, setMarketCode]);
  const effectiveMarketCode = requestedMarketAllowed ? requestedMarket : marketCode;
  const marketReady = !requestedMarketAllowed || marketCode === requestedMarket;
  const Arrow = isArabic ? ArrowRight : ArrowLeft;
  const back = symbol ? `/dashboard?company=${encodeURIComponent(symbol)}&market=${encodeURIComponent(effectiveMarketCode)}` : "/dashboard";
  return <div className="mx-auto max-w-[1500px] space-y-4 px-3 py-5 sm:px-5">
    <SessionLink to={back} className="secondary-button"><Arrow size={15} />{isArabic ? "العودة إلى السوق" : "Back to market"}</SessionLink>
    {effectiveMarketCode && marketReady && <CompanyPanel symbol={symbol} marketCode={effectiveMarketCode} onResetWidth={() => {}} />}
  </div>;
}
