import React, { useEffect, useMemo, useState } from "react";
import { Building2, Database, ExternalLink, Info, Loader2, RotateCcw, TrendingUp } from "lucide-react";
import CompanyChart from "@/components/market/CompanyChart";
import LossFlagBadge from "@/components/market/LossFlagBadge";
import { formatCompact, formatNumber, normalizeMomentum, quoteDirection } from "@/lib/market";
import { usePreferences } from "@/lib/preferences";
import { invokeAppFunction } from "@/services/marketService";

function Metric({ label, value, tone = "" }) {
  return <div className="metric-card"><span>{label}</span><b className={tone}>{value}</b></div>;
}

function EmptySection({ children }) {
  return <p className="mt-3 text-sm leading-6 text-slate-500">{children}</p>;
}

export default function CompanyPanel({ symbol, onResetWidth }) {
  const { language, isArabic, theme } = usePreferences();
  const [state, setState] = useState({ loading: false, data: null, error: "" });

  useEffect(() => {
    if (!symbol) { setState({ loading: false, data: null, error: "" }); return; }
    let active = true;
    setState({ loading: true, data: null, error: "" });
    invokeAppFunction("marketRead", { symbol })
      .then((data) => active && setState({ loading: false, data, error: "" }))
      .catch((error) => active && setState({ loading: false, data: null, error: error?.response?.data?.error || error?.message || "company_fetch_failed" }));
    return () => { active = false; };
  }, [symbol]);

  const momentum = useMemo(() => normalizeMomentum(state.data?.indicators?.[0], theme), [state.data, theme]);

  if (!symbol) return <section className="company-panel-empty"><Building2 size={34} /><h2>{isArabic ? "اختر شركة" : "Select a company"}</h2><p>{isArabic ? "اضغط على أي شركة أو على شريط السوق لعرض السعر والشموع والمعلومات والمؤشر هنا." : "Open any company to view its quote, candles, company information and indicator here."}</p></section>;
  if (state.loading) return <section className="company-panel-empty"><Loader2 className="animate-spin" /><p>{isArabic ? "جارٍ تحميل معلومات الشركة…" : "Loading company information…"}</p></section>;
  if (state.error || !state.data?.instrument) return <section className="company-panel-empty text-red-600"><Info /><h2>{isArabic ? "تعذر تحميل الشركة" : "Company unavailable"}</h2><p>{isArabic ? "لم نضع بيانات بديلة. أعد المحاولة بعد عودة المصدر." : "No substitute data was shown. Retry when the source returns."}</p></section>;

  const { instrument, quote = {}, financials = [], actions = [], shareholders = [], loss_classification: loss } = state.data;
  const direction = quoteDirection(quote.change_percent);
  return <div className="space-y-4">
    <div className="flex justify-end"><button className="secondary-button" onClick={onResetWidth}><RotateCcw size={14} />{isArabic ? "الحجم الطبيعي" : "Reset size"}</button></div>
    <section className="company-hero-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><span className="eyebrow"><Building2 size={14} />{isArabic ? "ملف الشركة" : "Company profile"}</span><h2 className="mt-3 text-2xl font-black">{instrument.symbol}</h2><p className="mt-1 text-lg font-bold">{isArabic ? instrument.name_ar : instrument.name_en}</p><p className="mt-1 text-sm text-slate-500">{isArabic ? instrument.sector_ar : instrument.sector_en}</p><div className="mt-3"><LossFlagBadge flag={instrument.warning_flag || loss?.level} /></div></div>
        <div className="text-left" dir="ltr"><b className="block text-3xl font-black">{formatNumber(quote.last_price, language)} <small className="text-sm text-slate-500">SAR</small></b><span className={"mt-2 block text-base font-black market-" + direction}>{Number(quote.change_percent || 0) > 0 ? "+" : ""}{formatNumber(quote.change_percent, language)}%</span></div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-4">
        <Metric label={isArabic ? "الافتتاح" : "Open"} value={formatNumber(quote.open, language)} />
        <Metric label={isArabic ? "أعلى" : "High"} value={formatNumber(quote.high, language)} tone="market-up" />
        <Metric label={isArabic ? "أدنى" : "Low"} value={formatNumber(quote.low, language)} tone="market-down" />
        <Metric label={isArabic ? "الإغلاق السابق" : "Prev close"} value={formatNumber(quote.previous_close, language)} />
        <Metric label={isArabic ? "الحجم" : "Volume"} value={formatCompact(quote.volume, language)} />
        <Metric label={isArabic ? "عدد الصفقات" : "Trades"} value={formatCompact(quote.trade_count, language)} />
        <Metric label={isArabic ? "القيمة المتداولة" : "Traded value"} value={formatCompact(quote.traded_value, language)} />
        <Metric label={isArabic ? "القيمة السوقية" : "Market cap"} value={formatCompact(quote.market_cap, language)} />
      </div>
      <div className="source-strip"><Database size={14} /><span>{quote.source?.name || quote.source?.code || (isArabic ? "المصدر غير مسجل" : "Source not recorded")}</span>{quote.quote_time && <span>· {new Date(quote.quote_time).toLocaleString(isArabic ? "ar-SA" : "en-US")}</span>}{quote.data_state?.stale && <b>{isArabic ? "متقادمة" : "Stale"}</b>}{instrument.official_url && <a href={instrument.official_url} target="_blank" rel="noreferrer">{isArabic ? "ملف تداول" : "Saudi Exchange profile"} <ExternalLink size={12} /></a>}</div>
    </section>

    <CompanyChart symbol={instrument.symbol} momentum={momentum} />

    <section className="content-card">
      <div className="section-heading"><TrendingUp size={18} /><div><h3>{isArabic ? "مناطق الزخم السعرية" : "Price momentum zones"}</h3><p>{isArabic ? "حدود صارمة محسوبة من أعلى قمة مرجعية حسب إصدار المؤشر." : "Strict boundaries calculated from the reference peak using the indicator formula."}</p></div></div>
      {momentum?.zones?.length ? <div className="mt-4 space-y-2">{momentum.zones.map((zone) => <div key={zone.key} className={"zone-row " + (zone.active === false ? "opacity-45" : "")}><span className="zone-color" style={{ background: zone.color }} /><div className="min-w-0 flex-1"><b>{isArabic ? zone.nameAr : zone.nameEn}</b><p>{isArabic ? zone.colorNameAr : zone.colorNameEn}{zone.active === false ? (isArabic ? " · غير مفعلة" : " · Inactive") : ""}</p></div><div className="text-left font-mono text-xs" dir="ltr"><b>{formatNumber(zone.top, "en")}</b><span> → </span><b>{formatNumber(zone.bottom, "en")}</b><p className="text-red-600">Stop {formatNumber(zone.stop, "en")}</p></div></div>)}</div> : <EmptySection>{isArabic ? "لا توجد لقطة مؤشر موثقة بعد. تُحسب من الشموع الحقيقية فقط." : "No verified indicator snapshot yet. It is calculated from real candles only."}</EmptySection>}
    </section>

    <div className="grid gap-4 xl:grid-cols-3">
      <section className="content-card"><h3>{isArabic ? "البيانات المالية" : "Financials"}</h3>{financials.length ? financials.slice(0, 8).map((item) => <p key={item.id} className="info-line">{item.period} · {formatCompact(item.revenue, language)} · {formatCompact(item.net_income, language)}</p>) : <EmptySection>{isArabic ? "لا توجد قيمة منشورة من المصدر لهذا القسم." : "No published source value for this section."}</EmptySection>}</section>
      <section className="content-card"><h3>{isArabic ? "إجراءات الشركة" : "Corporate actions"}</h3>{actions.length ? actions.slice(0, 8).map((item) => <p key={item.id} className="info-line">{isArabic ? item.description_ar : item.description_en}</p>) : <EmptySection>{isArabic ? "لا توجد إجراءات منشورة من المصدر." : "No published corporate actions."}</EmptySection>}</section>
      <section className="content-card"><h3>{isArabic ? "كبار المساهمين" : "Major shareholders"}</h3>{shareholders.length ? shareholders.slice(0, 8).map((item) => <p key={item.id} className="info-line">{isArabic ? item.shareholder_name_ar || item.shareholder_name_en : item.shareholder_name_en} · {formatNumber(item.ownership_percent, language)}%</p>) : <EmptySection>{isArabic ? "لا توجد ملكيات موثقة منشورة في المصدر المتصل." : "No verified ownership records in the connected source."}</EmptySection>}</section>
    </div>
  </div>;
}
