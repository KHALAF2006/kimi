import React, { useEffect, useState } from "react";
import { Activity, BarChart3, Info, Loader2 } from "lucide-react";
import CompanyChart from "@/components/market/CompanyChart";
import { formatNumber, quoteDirection } from "@/lib/market";
import { usePreferences } from "@/lib/preferences";
import { invokeAppFunction } from "@/services/marketService";

export default function MarketIndexPanel({ indexCode = "TASI", marketCode = "SA_MAIN", onResetWidth = () => {} }) {
  const { language, isArabic } = usePreferences();
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: "" }));
    invokeAppFunction("marketRead", { symbol: indexCode, market_code: marketCode, instrument_code: indexCode })
      .then((data) => active && setState({ loading: false, data, error: "" }))
      .catch((error) => active && setState((current) => ({ ...current, loading: false, error: error?.response?.data?.code || error?.response?.data?.error || error?.message || "index_fetch_failed" })));
    return () => { active = false; };
  }, [indexCode, marketCode, retryKey]);

  const instrument = state.data?.instrument || { symbol: indexCode, name_ar: "المؤشر العام للسوق السعودية", name_en: "Saudi Main Market Index" };
  const quote = state.data?.quote || {};
  const direction = quoteDirection(quote.change_percent);
  const name = isArabic ? instrument.name_ar : instrument.name_en;
  return <div className="space-y-4">
    {state.loading && <section className="company-refresh-status" role="status"><Loader2 size={14} className="animate-spin" />{isArabic ? "جارٍ تحديث ملخص المؤشر…" : "Refreshing index summary…"}</section>}
    {state.error && <section className="chart-message chart-recovery-message text-red-600" role="alert"><Info size={18} /><span>{isArabic ? "تعذر تحديث ملخص المؤشر؛ بقي الشارت وأدوات الفواصل متاحة." : "Index summary refresh failed; the chart and timeframe controls remain available."}</span><button type="button" className="secondary-button" onClick={() => setRetryKey((value) => value + 1)}>{isArabic ? "إعادة المحاولة" : "Retry"}</button></section>}
    {state.data?.instrument && <section className="company-hero-card sector-hero-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><span className="eyebrow"><BarChart3 size={14} />{isArabic ? "مؤشر السوق" : "Market index"}</span><h2 className="mt-3 text-2xl font-black" dir="ltr">{instrument.symbol}</h2><p className="mt-1 text-lg font-bold">{name}</p><p className="mt-1 flex items-center gap-2 text-sm text-slate-500"><Activity size={14} />{isArabic ? "المؤشر العام للسوق السعودية الرئيسية" : "Saudi Main Market general index"}</p></div>
        <div className="text-left" dir="ltr"><b className="block text-3xl font-black">{quote.last_price ? formatNumber(quote.last_price, language) : "—"}</b>{Number.isFinite(Number(quote.change_percent)) && <span className={`mt-2 block text-base font-black market-${direction}`}>{Number(quote.change_percent) > 0 ? "+" : ""}{formatNumber(quote.change_percent, language)}%</span>}</div>
      </div>
    </section>}
    <CompanyChart symbol={instrument.symbol} companyNameAr={instrument.name_ar} companyNameEn={instrument.name_en} marketCode={marketCode} onResetWidth={onResetWidth} />
  </div>;
}
