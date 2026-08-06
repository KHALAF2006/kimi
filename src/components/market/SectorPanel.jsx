import React, { useEffect, useMemo, useState } from "react";
import { Info, Loader2, PieChart } from "lucide-react";
import CompanyChart from "@/components/market/CompanyChart";
import { formatNumber, marketSummary, quoteDirection } from "@/lib/market";
import { usePreferences } from "@/lib/preferences";
import { invokeAppFunction } from "@/services/marketService";

function SectorMetric({ label, value, tone = "" }) {
  return <div className="metric-card"><span>{label}</span><b className={tone}>{value}</b></div>;
}

export default function SectorPanel({ sector, marketCode = "SA_MAIN", onResetWidth = () => {} }) {
  const { language, isArabic } = usePreferences();
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!sector) return;
    let active = true;
    setState((current) => ({ ...current, loading: true, error: "" }));
    invokeAppFunction("marketRead", { action: "sector", sector, market_code: marketCode })
      .then((data) => active && setState({ loading: false, data, error: "" }))
      .catch((error) => active && setState((current) => ({ ...current, loading: false, error: error?.response?.data?.error || error?.message || "sector_fetch_failed" })));
    return () => { active = false; };
  }, [sector, marketCode, retryKey]);

  const constituents = state.data?.constituents || [];
  const summary = useMemo(() => marketSummary(constituents), [constituents]);

  const { quote = {} } = state.data || {};
  const direction = quoteDirection(quote.change_percent);
  const sectorName = state.data?.sector ? (isArabic ? state.data.sector.name_ar : state.data.sector.name_en) : sector;
  return <div className="space-y-4">
    {state.loading && <section className="company-refresh-status" role="status"><Loader2 size={14} className="animate-spin" />{isArabic ? "جارٍ تحديث بيانات القطاع…" : "Refreshing sector data…"}</section>}
    {state.error && <section className="chart-message chart-recovery-message text-red-600" role="alert"><Info size={18} /><span>{isArabic ? "تعذر عرض ملخص القطاع الآن. حاول مرة أخرى بعد قليل." : "The sector summary is unavailable right now. Please try again shortly."}</span><button type="button" className="secondary-button" onClick={() => setRetryKey((value) => value + 1)}>{isArabic ? "إعادة المحاولة" : "Retry"}</button></section>}
    {state.data?.sector && <section className="company-hero-card sector-hero-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><span className="eyebrow"><PieChart size={14} />{isArabic ? "مؤشر القطاع" : "Sector index"}</span><h2 className="mt-3 text-2xl font-black">{sectorName}</h2><p className="mt-1 font-mono text-xs font-black text-sky-700 dark:text-sky-300" dir="ltr">{state.data.sector.symbol}</p><p className="mt-1 text-sm text-slate-500">{isArabic ? "مؤشر مرجّح لشركات القطاع" : "Weighted index of sector constituents"}</p></div>
        <div className="text-left" dir="ltr"><b className="block text-3xl font-black">{formatNumber(quote.last_price, language)}</b><span className={"mt-2 block text-base font-black market-" + direction}>{Number(quote.change_percent || 0) > 0 ? "+" : ""}{formatNumber(quote.change_percent, language)}%</span></div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-4">
        <SectorMetric label={isArabic ? "عدد الشركات" : "Companies"} value={constituents.length} />
        <SectorMetric label={isArabic ? "مرتفعة" : "Gainers"} value={summary.up} tone="market-up" />
        <SectorMetric label={isArabic ? "منخفضة" : "Losers"} value={summary.down} tone="market-down" />
        <SectorMetric label={isArabic ? "ثابتة" : "Unchanged"} value={summary.flat} />
      </div>
    </section>}

    <CompanyChart sector={sector} marketCode={marketCode} onResetWidth={onResetWidth} />

  </div>;
}
