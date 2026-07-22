import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import CompanyPanel from "@/components/market/CompanyPanel";
import { usePreferences } from "@/lib/preferences";

export default function CompanyDetails() {
  const [params] = useSearchParams();
  const { isArabic } = usePreferences();
  const symbol = params.get("company") || params.get("symbol") || "";
  const Arrow = isArabic ? ArrowRight : ArrowLeft;
  return <div className="mx-auto max-w-[1500px] space-y-4 px-3 py-5 sm:px-5">
    <Link to={"/dashboard" + (symbol ? "?company=" + symbol : "")} className="secondary-button"><Arrow size={15} />{isArabic ? "العودة إلى السوق" : "Back to market"}</Link>
    <CompanyPanel symbol={symbol} onResetWidth={() => {}} />
  </div>;
}
