import React, { useEffect, useMemo, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, Info, Loader2, Megaphone, RotateCcw, TrendingUp } from "lucide-react";
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

export default function CompanyPanel({ symbol, onResetWidth, previousCompany, nextCompany, onSelectCompany }) {
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

  const { instrument, quote = {}, financials = [], actions = [], announcements = [], shareholders = [], loss_classification: loss } = state.data;
  const direction = quoteDirection(quote.change_percent);
  return <div className="space-y-4">
    <div className="company-navigation">
      <button type="button" disabled={!previousCompany} onClick={() => previousCompany && onSelectCompany(previousCompany.symbol)} title={isArabic ? "الشركة السابقة حسب القائمة الحالية" : "Previous company in current list"}><ChevronRight size={16} /><span><small>{isArabic ? "السابق" : "Previous"}</small><b>{previousCompany ? (isArabic ? previousCompany.name_ar : previousCompany.name_en) : "—"}</b></span></button>
      <button className="secondary-button" onClick={onResetWidth}><RotateCcw size={14} />{isArabic ? "الحجم الطبيعي" : "Reset size"}</button>
      <button type="button" disabled={!nextCompany} onClick={() => nextCompany && onSelectCompany(nextCompany.symbol)} title={isArabic ? "الشركة التالية حسب القائمة الحالية" : "Next company in current list"}><span><small>{isArabic ? "التالي" : "Next"}</small><b>{nextCompany ? (isArabic ? nextCompany.name_ar : nextCompany.name_en) : "—"}</b></span><ChevronLeft size={16} /></button>
    </div>
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
    </section>

    <CompanyChart symbol={instrument.symbol} momentum={momentum} />

    <section className="content-card">
      <div className="section-heading"><TrendingUp size={18} /><div><h3>{isArabic ? "مناطق المستثمر" : "Investor zones"}</h3><p>{isArabic ? "حدود سعرية صارمة محسوبة للفاصل المعروض، بأسمائها وألوانها وأسعارها ووقفها." : "Strict price boundaries for the selected interval, with names, colors, prices and stops."}</p></div></div>
      {momentum?.zones?.length ? <div className="mt-4 space-y-2">{momentum.zones.map((zone) => <div key={zone.key} className={"zone-row " + (zone.active === false ? "opacity-45" : "")}><span className="zone-color" style={{ background: zone.color }} /><div className="min-w-0 flex-1"><b>{isArabic ? zone.nameAr : zone.nameEn}</b><p>{isArabic ? zone.colorNameAr : zone.colorNameEn}{zone.active === false ? (isArabic ? " · غير مفعلة" : " · Inactive") : ""}</p></div><div className="text-left font-mono text-xs" dir="ltr"><b>{formatNumber(zone.top, "en")}</b><span> → </span><b>{formatNumber(zone.bottom, "en")}</b><p className="text-red-600">Stop {formatNumber(zone.stop, "en")}</p></div></div>)}</div> : <EmptySection>{isArabic ? "لا توجد لقطة مؤشر موثقة بعد. تُحسب من الشموع الحقيقية فقط." : "No verified indicator snapshot yet. It is calculated from real candles only."}</EmptySection>}
    </section>

    <div className="grid gap-4 xl:grid-cols-2">
      <section className="content-card"><h3>{isArabic ? "البيانات المالية" : "Financials"}</h3>{financials.length ? <div className="financial-list">{financials.slice(0, 8).map((item) => <article key={item.id} className="financial-item"><div><b>{item.period}</b><small>{item.period_end || item.statement_type || ""}</small></div><dl><div><dt>{isArabic ? "الإيرادات" : "Revenue"}</dt><dd>{formatCompact(item.revenue, language)}</dd></div><div><dt>{isArabic ? "صافي الدخل" : "Net income"}</dt><dd>{formatCompact(item.net_income, language)}</dd></div><div><dt>{isArabic ? "ربحية السهم" : "EPS"}</dt><dd>{formatNumber(item.eps, language)}</dd></div><div><dt>{isArabic ? "حقوق الملكية" : "Equity"}</dt><dd>{formatCompact(item.shareholders_equity, language)}</dd></div></dl></article>)}</div> : <EmptySection>{isArabic ? "لم تصل بيانات مالية معتمدة لهذا القسم بعد." : "No approved financial values have reached this section yet."}</EmptySection>}</section>
      <section className="content-card"><h3 className="flex items-center gap-2"><Megaphone size={17} />{isArabic ? "إعلانات الشركة" : "Company announcements"}</h3>{announcements.length ? announcements.slice(0, 10).map((item) => <article key={item.id} className="announcement-item"><time>{new Date(item.published_at).toLocaleDateString(isArabic ? "ar-SA" : "en-GB")}</time><b>{isArabic ? item.title_ar || item.title_en : item.title_en || item.title_ar}</b>{(item.summary_ar || item.summary_en) && <p>{isArabic ? item.summary_ar || item.summary_en : item.summary_en || item.summary_ar}</p>}</article>) : <EmptySection>{isArabic ? "لا توجد إعلانات محفوظة بعد." : "No saved announcements yet."}</EmptySection>}</section>
      <section className="content-card"><h3>{isArabic ? "إجراءات الشركة" : "Corporate actions"}</h3>{actions.length ? actions.slice(0, 8).map((item) => <p key={item.id} className="info-line">{isArabic ? item.description_ar : item.description_en}</p>) : <EmptySection>{isArabic ? "لا توجد إجراءات شركة محفوظة بعد." : "No saved corporate actions yet."}</EmptySection>}</section>
      <section className="content-card"><h3>{isArabic ? "كبار المساهمين" : "Major shareholders"}</h3>{shareholders.length ? shareholders.slice(0, 8).map((item) => <p key={item.id} className="info-line"><b>{isArabic ? item.shareholder_name_ar || item.shareholder_name_en : item.shareholder_name_en || item.shareholder_name_ar}</b><span dir="ltr">{formatNumber(item.ownership_percent, language)}% {Number.isFinite(Number(item.change_percent)) && <small className={Number(item.change_percent) > 0 ? "market-up" : Number(item.change_percent) < 0 ? "market-down" : ""}>({Number(item.change_percent) > 0 ? "+" : ""}{formatNumber(item.change_percent, language)})</small>}</span></p>) : <EmptySection>{isArabic ? "لم تصل ملكيات معتمدة لهذا القسم بعد." : "No approved ownership records have reached this section yet."}</EmptySection>}</section>
    </div>
  </div>;
}
