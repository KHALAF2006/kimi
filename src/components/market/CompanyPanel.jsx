import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Info, Loader2, Megaphone, TrendingUp } from "lucide-react";
import CompanyChart from "@/components/market/CompanyChart";
import LossFlagBadge from "@/components/market/LossFlagBadge";
import { formatCompact, formatNumber, normalizeMomentum, quoteDirection, selectMomentumSnapshot } from "@/lib/market";
import { usePreferences } from "@/lib/preferences";
import { localizeUsCompanyMeta } from "@/lib/us-market-localization";
import { invokeAppFunction } from "@/services/marketService";

function Metric({ label, value, tone = "" }) {
  return <div className="metric-card"><span>{label}</span><b className={tone}>{value}</b></div>;
}

function EmptySection({ children }) {
  return <p className="mt-3 text-sm leading-6 text-slate-500">{children}</p>;
}

export default function CompanyPanel({ symbol, marketCode, requestedTimeframe = "", onResetWidth = () => {}, previousCompany = null, nextCompany = null, onSelectCompany = () => {} }) {
  const { language, isArabic, theme } = usePreferences();
  const [state, setState] = useState({ loading: Boolean(symbol), data: null, dataSymbol: "", error: "" });
  const [chartMomentum, setChartMomentum] = useState(null);

  useEffect(() => {
    setChartMomentum(null);
    if (!symbol) { setState({ loading: false, data: null, dataSymbol: "", error: "" }); return; }
    let active = true;
    setState((current) => ({ ...current, loading: true, error: "" }));
    invokeAppFunction("marketRead", {
      symbol,
      instrument_code: symbol,
      market_code: marketCode,
      timeframe: requestedTimeframe || "1d",
    })
      .then((data) => {
        if (!data?.instrument) throw new Error("company_payload_incomplete");
        if (active) setState({ loading: false, data, dataSymbol: symbol, error: "" });
      })
      .catch((error) => active && setState((current) => ({ ...current, loading: false, error: error?.response?.data?.error || error?.message || "company_fetch_failed" })));
    return () => { active = false; };
  }, [symbol, marketCode]);

  const storedMomentum = useMemo(() => state.dataSymbol === symbol ? normalizeMomentum(
    state.data?.momentum_indicator || selectMomentumSnapshot(state.data?.indicators, requestedTimeframe || "1d"),
    theme,
  ) : null, [state.data, state.dataSymbol, symbol, theme, requestedTimeframe]);
  const momentum = chartMomentum?.symbol === symbol ? chartMomentum.value : storedMomentum;
  const handleMomentumChange = useCallback((value, interval) => {
    setChartMomentum({ symbol, interval, value });
  }, [symbol]);

  if (!symbol) return <section className="company-panel-empty"><Building2 size={34} /><h2>{isArabic ? "اختر شركة" : "Select a company"}</h2><p>{isArabic ? "اضغط على أي شركة أو على شريط السوق لعرض السعر والشموع والمعلومات والمؤشر هنا." : "Open any company to view its quote, candles, company information and indicator here."}</p></section>;
  const hasCurrentInstrument = state.dataSymbol === symbol && Boolean(state.data?.instrument);
  if (!hasCurrentInstrument) {
    const waitingForCompany = state.loading || !state.error;
    return <div className="space-y-4">
    <section className={state.error ? "company-panel-empty text-red-600" : "company-panel-empty"}>{waitingForCompany ? <Loader2 className="animate-spin" /> : <Info />}<h2>{waitingForCompany ? (isArabic ? "جارٍ التحميل…" : "Loading…") : (isArabic ? "تعذر عرض معلومات الشركة" : "Company information is unavailable")}</h2><p>{waitingForCompany ? (isArabic ? "لحظات ونجهز لك تفاصيل الشركة." : "Your company details will be ready shortly.") : (isArabic ? "حاول مرة أخرى بعد قليل." : "Please try again shortly.")}</p></section>
    <CompanyChart symbol={symbol} marketCode={marketCode} requestedInterval={requestedTimeframe} onResetWidth={onResetWidth} previousCompany={previousCompany} nextCompany={nextCompany} onSelectCompany={onSelectCompany} />
  </div>;
  }

  const { instrument, quote = {}, financials = [], actions = [], announcements = [], shareholders = [], loss_classification: loss } = state.data;
  const direction = quoteDirection(quote.change_percent);
  const localizedMeta = localizeUsCompanyMeta(instrument, isArabic);
  const companyMeta = [isArabic ? instrument.sector_ar : instrument.sector_en, localizedMeta.industry, localizedMeta.country, localizedMeta.listing].filter(Boolean).join(" · ");
  return <div className="relative space-y-4" aria-busy={state.loading}>
    {state.loading && <div className="company-refresh-status" role="status"><Loader2 size={14} className="animate-spin" />{isArabic ? `جارٍ فتح ${symbol}…` : `Opening ${symbol}…`}</div>}
    <section className="company-hero-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><span className="eyebrow"><Building2 size={14} />{isArabic ? "ملف الشركة" : "Company profile"}</span><h2 className="mt-3 text-2xl font-black">{instrument.symbol}</h2><p className="mt-1 text-lg font-bold">{isArabic ? instrument.name_ar : instrument.name_en}</p><p className="mt-1 text-sm text-slate-500">{companyMeta}</p><div className="mt-3"><LossFlagBadge flag={instrument.warning_flag || loss?.level} /></div></div>
        <div className="text-left" dir="ltr"><b className="block text-3xl font-black">{formatNumber(quote.last_price, language)} <small className="text-sm text-slate-500">{instrument.currency || (marketCode === "US_OPTIONS" ? "USD" : "SAR")}</small></b><span className={"mt-2 block text-base font-black market-" + direction}>{Number(quote.change_percent || 0) > 0 ? "+" : ""}{formatNumber(quote.change_percent, language)}%</span></div>
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
      {marketCode === "US_OPTIONS" && <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 xl:grid-cols-4">
        <span><b>{isArabic ? "الاسم القانوني: " : "Legal name: "}</b>{instrument.legal_name_en || instrument.name_en}</span>
        <span><b>CIK: </b>{instrument.cik || "—"}</span>
        <span><b>{isArabic ? "التصنيف: " : "SIC: "}</b>{instrument.sic_code ? `${instrument.sic_code} · ${instrument.sic_description || ""}` : "—"}</span>
        <span><b>{isArabic ? "نهاية السنة المالية: " : "Fiscal year end: "}</b>{instrument.fiscal_year_end || "—"}</span>
        {instrument.website_url && <a href={instrument.website_url} target="_blank" rel="noreferrer" className="font-bold text-sky-700 underline">{isArabic ? "موقع الشركة" : "Company website"}</a>}
        {instrument.sec_filing_url && <a href={instrument.sec_filing_url} target="_blank" rel="noreferrer" className="font-bold text-sky-700 underline">{isArabic ? "ملفات الشركة الرسمية" : "Official filings"}</a>}
      </div>}
    </section>

    <CompanyChart symbol={symbol} companyNameAr={instrument.name_ar} companyNameEn={instrument.name_en} marketCode={marketCode} momentum={storedMomentum} requestedInterval={requestedTimeframe} onMomentumChange={handleMomentumChange} previousCompany={previousCompany} nextCompany={nextCompany} onSelectCompany={onSelectCompany} onResetWidth={onResetWidth} />

    <section className="content-card">
      <div className="section-heading"><TrendingUp size={18} /><div><h3>{isArabic ? "المناطق السعرية" : "Price zones"}</h3><p>{isArabic ? "تتحول المنطقة المكسورة بالإغلاق إلى مقاومة، ويختفي وقفها حتى تُستعاد كدعم." : "A zone broken on close becomes resistance and its stop stays hidden until support is reclaimed."}</p></div></div>
      {momentum?.zones?.length ? <div className="zone-list-grid">{momentum.zones.map((zone) => <div key={zone.key} className={"zone-row " + (zone.active === false ? "opacity-45" : "")}><span className="zone-color" style={{ background: zone.role === "resistance" ? "#dc2626" : zone.color }} /><div className="min-w-0 flex-1"><b>{isArabic ? (zone.displayNameAr || zone.nameAr) : (zone.displayNameEn || zone.nameEn)}</b><p>{zone.active === false ? (isArabic ? "بانتظار التفعيل" : "Waiting") : zone.role === "resistance" ? (isArabic ? "مقاومة بعد كسر الوقف" : "Resistance after stop break") : zone.lifecycleStatus === "support_reclaimed" ? (isArabic ? "دعم مستعاد" : "Reclaimed support") : (isArabic ? "دعم نشط" : "Active support")}</p></div><div className="text-left font-mono text-xs" dir="ltr"><b>{formatNumber(zone.top, "en")}</b><span> → </span><b>{formatNumber(zone.bottom, "en")}</b><p className="text-red-600">Stop {zone.active === false || zone.stopVisible === false ? "—" : formatNumber(zone.displayStop ?? zone.stop, "en")}</p></div></div>)}</div> : <EmptySection>{isArabic ? "لا توجد مناطق سعرية لهذا الفاصل حالياً." : "No price zones are available for this timeframe right now."}</EmptySection>}
    </section>

    <div className="grid gap-4 xl:grid-cols-2">
      <section className="content-card"><h3>{isArabic ? "البيانات المالية" : "Financials"}</h3>{financials.length ? <div className="financial-list">{financials.slice(0, 8).map((item) => <article key={item.id} className="financial-item"><div><b>{item.period}</b><small>{item.period_end || item.statement_type || ""}</small></div><dl><div><dt>{isArabic ? "الإيرادات" : "Revenue"}</dt><dd>{formatCompact(item.revenue, language)}</dd></div><div><dt>{isArabic ? "صافي الدخل" : "Net income"}</dt><dd>{formatCompact(item.net_income, language)}</dd></div><div><dt>{isArabic ? "ربحية السهم" : "EPS"}</dt><dd>{formatNumber(item.eps, language)}</dd></div><div><dt>{isArabic ? "حقوق الملكية" : "Equity"}</dt><dd>{formatCompact(item.shareholders_equity, language)}</dd></div></dl></article>)}</div> : <EmptySection>{isArabic ? "لا تتوفر بيانات مالية لهذا القسم حالياً." : "Financial information is not available for this section right now."}</EmptySection>}</section>
      <section className="content-card"><h3 className="flex items-center gap-2"><Megaphone size={17} />{isArabic ? "إعلانات الشركة" : "Company announcements"}</h3>{announcements.length ? announcements.slice(0, 10).map((item) => <article key={item.id} className="announcement-item"><time>{new Date(item.published_at).toLocaleDateString(isArabic ? "ar-SA" : "en-GB")}</time><b>{isArabic ? item.title_ar || item.title_en : item.title_en || item.title_ar}</b>{(item.summary_ar || item.summary_en) && <p>{isArabic ? item.summary_ar || item.summary_en : item.summary_en || item.summary_ar}</p>}</article>) : <EmptySection>{isArabic ? "لا توجد إعلانات للشركة حالياً." : "There are no company announcements right now."}</EmptySection>}</section>
      <section className="content-card"><h3>{isArabic ? "إجراءات الشركة" : "Corporate actions"}</h3>{actions.length ? actions.slice(0, 8).map((item) => <p key={item.id} className="info-line">{isArabic ? item.description_ar : item.description_en}</p>) : <EmptySection>{isArabic ? "لا توجد إجراءات للشركة حالياً." : "There are no corporate actions right now."}</EmptySection>}</section>
      <section className="content-card"><h3>{isArabic ? "كبار المساهمين" : "Major shareholders"}</h3>{shareholders.length ? shareholders.slice(0, 8).map((item) => <p key={item.id} className="info-line"><b>{isArabic ? item.shareholder_name_ar || item.shareholder_name_en : item.shareholder_name_en || item.shareholder_name_ar}</b><span dir="ltr">{formatNumber(item.ownership_percent, language)}% {Number.isFinite(Number(item.change_percent)) && <small className={Number(item.change_percent) > 0 ? "market-up" : Number(item.change_percent) < 0 ? "market-down" : ""}>({Number(item.change_percent) > 0 ? "+" : ""}{formatNumber(item.change_percent, language)})</small>}</span></p>) : <EmptySection>{isArabic ? "لا تتوفر بيانات كبار المساهمين حالياً." : "Major shareholder information is not available right now."}</EmptySection>}</section>
    </div>
  </div>;
}
