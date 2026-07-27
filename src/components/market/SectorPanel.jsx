import React, { useEffect, useMemo, useState } from "react";
import { Activity, Building2, Info, Loader2, PieChart } from "lucide-react";
import CompanyChart from "@/components/market/CompanyChart";
import MarketTable from "@/components/market/MarketTable";
import { formatNumber, marketSummary, quoteDirection } from "@/lib/market";
import { usePreferences } from "@/lib/preferences";
import { invokeAppFunction } from "@/services/marketService";

function SectorMetric({ label, value, tone = "" }) {
  return <div className="metric-card"><span>{label}</span><b className={tone}>{value}</b></div>;
}

export default function SectorPanel({ sector, marketCode = "SA_MAIN", onSelectCompany = () => {}, onResetWidth = () => {} }) {
  const { language, isArabic } = usePreferences();
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    if (!sector) return;
    let active = true;
    setState({ loading: true, data: null, error: "" });
    invokeAppFunction("marketRead", { action: "sector", sector, market_code: marketCode })
      .then((data) => active && setState({ loading: false, data, error: "" }))
      .catch((error) => active && setState({ loading: false, data: null, error: error?.response?.data?.error || error?.message || "sector_fetch_failed" }));
    return () => { active = false; };
  }, [sector, marketCode]);

  const constituents = state.data?.constituents || [];
  const summary = useMemo(() => marketSummary(constituents), [constituents]);

  if (state.loading) return <section className="company-panel-empty"><Loader2 className="animate-spin" /><p>{isArabic ? "جارٍ بناء مؤشر القطاع…" : "Building sector index…"}</p></section>;
  if (state.error || !state.data?.sector) return <section className="company-panel-empty text-red-600"><Info /><h2>{isArabic ? "تعذر تحميل القطاع" : "Sector unavailable"}</h2><p>{isArabic ? "أعد المحاولة بعد اكتمال دورة الأسعار." : "Retry after the market data cycle completes."}</p></section>;

  const { quote = {} } = state.data;
  const direction = quoteDirection(quote.change_percent);
  const sectorName = isArabic ? state.data.sector.name_ar : state.data.sector.name_en;
  return <div className="space-y-4">
    <section className="company-hero-card sector-hero-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><span className="eyebrow"><PieChart size={14} />{isArabic ? "مؤشر القطاع" : "Sector index"}</span><h2 className="mt-3 text-2xl font-black">{sectorName}</h2><p className="mt-1 text-sm text-slate-500">{isArabic ? "مؤشر مرجّح لشركات القطاع" : "Weighted index of sector constituents"}</p></div>
        <div className="text-left" dir="ltr"><b className="block text-3xl font-black">{formatNumber(quote.last_price, language)}</b><span className={"mt-2 block text-base font-black market-" + direction}>{Number(quote.change_percent || 0) > 0 ? "+" : ""}{formatNumber(quote.change_percent, language)}%</span></div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-4">
        <SectorMetric label={isArabic ? "عدد الشركات" : "Companies"} value={constituents.length} />
        <SectorMetric label={isArabic ? "مرتفعة" : "Gainers"} value={summary.up} tone="market-up" />
        <SectorMetric label={isArabic ? "منخفضة" : "Losers"} value={summary.down} tone="market-down" />
        <SectorMetric label={isArabic ? "ثابتة" : "Unchanged"} value={summary.flat} />
      </div>
    </section>

    <CompanyChart sector={sector} marketCode={marketCode} onResetWidth={onResetWidth} />

    <section className="content-card">
      <div className="section-heading"><Building2 size={18} /><div><h3>{isArabic ? "شركات القطاع" : "Sector companies"}</h3><p>{isArabic ? "مرتبة حسب نسبة التغير، ويمكن فتح أي شركة مباشرة." : "Sorted by change; open any company directly."}</p></div></div>
      <div className="mt-4"><MarketTable rows={[...constituents].sort((a, b) => Number(b.quote?.change_percent || 0) - Number(a.quote?.change_percent || 0))} selectedSymbol="" onSelect={onSelectCompany} /></div>
      {!constituents.length && <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Activity size={15} />{isArabic ? "لا توجد شركات في هذا القطاع." : "No companies in this sector."}</p>}
    </section>
  </div>;
}
