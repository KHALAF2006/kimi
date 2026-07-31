import React, { useMemo, useState } from "react";
import { Activity, CandlestickChart, Search, TrendingUp } from "lucide-react";
import ServicePage from "@/components/ServicePage";
import MarketTable from "@/components/market/MarketTable";
import { formatNumber } from "@/lib/market";
import { usePreferences } from "@/lib/preferences";

const signalOptions = [
  { value: "", ar: "كل الإشارات", en: "All signals", icon: Activity },
  { value: "pin_bar_signal", ar: "شمعة بن بار", en: "Pin bar", icon: CandlestickChart },
  { value: "engulfing_signal", ar: "شمعة بالعة", en: "Engulfing candle", icon: CandlestickChart },
  { value: "zone_pin_bar", ar: "بن بار داخل منطقة استثمار", en: "Pin bar in an investor zone", icon: CandlestickChart },
  { value: "price_cross_sma20", ar: "اختراق السعر لمتوسط 20", en: "Price crossed SMA 20", icon: TrendingUp },
  { value: "price_cross_sma50", ar: "اختراق السعر لمتوسط 50", en: "Price crossed SMA 50", icon: TrendingUp },
  { value: "sma20_cross_sma50", ar: "تقاطع متوسط 20 فوق 50", en: "SMA 20 crossed above SMA 50", icon: TrendingUp },
];

const timeframeOptions = [
  { value: "1d", ar: "يومي", en: "Daily" },
  { value: "1wk", ar: "أسبوعي", en: "Weekly" },
  { value: "1mo", ar: "شهري", en: "Monthly" },
];

function SignalEvidence({ row, timeframe, language, isArabic }) {
  const values = row.signals?.[timeframe]?.values || {};
  const candleTimestamp = Date.parse(values.candle_time || "");
  return <div className="screener-evidence">
    <b>{row.symbol} · {isArabic ? row.name_ar : row.name_en}</b>
    <span>{isArabic ? "الإغلاق" : "Close"}: {formatNumber(values.close, language)}</span>
    <span>SMA 20: {formatNumber(values.sma20, language)}</span>
    <span>SMA 50: {formatNumber(values.sma50, language)}</span>
    {values.matching_zone && <span>{isArabic ? values.matching_zone.name_ar : values.matching_zone.name_en}</span>}
    {values.pin_bar?.matches && <span>{isArabic ? `بن بار ${values.pin_bar.direction === "bullish" ? "صاعد" : "هابط"}` : `${values.pin_bar.direction} pin bar`}</span>}
    {values.engulfing?.matches && <span>{isArabic ? `ابتلاع ${values.engulfing.direction === "bullish" ? "صاعد" : "هابط"}` : `${values.engulfing.direction} engulfing`}</span>}
    <span>{Number.isFinite(candleTimestamp) ? new Date(candleTimestamp).toLocaleDateString(isArabic ? "ar-SA" : "en-US") : "—"}</span>
  </div>;
}

export default function Screener() {
  const { language, isArabic } = usePreferences();
  const [signal, setSignal] = useState("");
  const [timeframe, setTimeframe] = useState("1d");
  const [query, setQuery] = useState("");
  const payload = useMemo(() => ({ limit: 500, mode: "screener", signal, timeframe }), [signal, timeframe]);

  return <ServicePage
    title={isArabic ? "ماسح الاستراتيجيات" : "Strategy screener"}
    description={isArabic ? "إشارات محسوبة من الشموع المغلقة والمحفوظة دون طلب بيانات جديد عند البحث." : "Signals calculated from stored closed candles without fetching market data per search."}
    functionName="marketRead"
    payload={payload}
  >
    {(data) => {
      const normalizedQuery = query.trim().toLocaleLowerCase(isArabic ? "ar" : "en");
      const rows = (data.instruments || [])
        .filter((row) => row.signals?.[timeframe]?.values)
        .filter((row) => !normalizedQuery
          || `${row.symbol} ${row.name_ar} ${row.name_en} ${row.sector_ar} ${row.sector_en}`.toLocaleLowerCase(isArabic ? "ar" : "en").includes(normalizedQuery));
      return <div className="space-y-4">
        <section className="surface-panel p-4">
          <div className="relative">
            <Search className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pe-12 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-950"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={isArabic ? "ابحث بالرمز أو الشركة أو القطاع" : "Search symbol, company, or sector"}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={isArabic ? "الفاصل" : "Timeframe"}>
            {timeframeOptions.map((option) => <button
              key={option.value}
              type="button"
              className={"chart-option " + (timeframe === option.value ? "chart-option-active" : "")}
              aria-pressed={timeframe === option.value}
              onClick={() => setTimeframe(option.value)}
            >{isArabic ? option.ar : option.en}</button>)}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5" role="group" aria-label={isArabic ? "نوع الإشارة" : "Signal type"}>
            {signalOptions.map((option) => {
              const Icon = option.icon;
              return <button
                key={option.value || "all"}
                type="button"
                className={"screener-signal-button " + (signal === option.value ? "screener-signal-button-active" : "")}
                aria-pressed={signal === option.value}
                onClick={() => setSignal(option.value)}
              ><Icon size={16} /><span>{isArabic ? option.ar : option.en}</span></button>;
            })}
          </div>
        </section>

        {data.signal_coverage && data.signal_coverage.snapshot_count < data.signal_coverage.instrument_count && <div className="warning-banner" role="status">
          {isArabic
            ? `تغطية الماسح ${data.signal_coverage.snapshot_count} من ${data.signal_coverage.instrument_count} شركة. الإشارات الناقصة لا تُعرض كأنها نتائج سالبة.`
            : `Scanner coverage is ${data.signal_coverage.snapshot_count} of ${data.signal_coverage.instrument_count} instruments. Missing signals are not reported as negative matches.`}
        </div>}

        <p className="text-sm font-bold text-slate-500">
          {isArabic ? `${rows.length} شركة مطابقة` : `${rows.length} matching companies`}
        </p>
        {!!rows.length && <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {rows.slice(0, 9).map((row) => <SignalEvidence key={row.id || row.symbol} row={row} timeframe={timeframe} language={language} isArabic={isArabic} />)}
        </div>}
        <MarketTable rows={rows} />
      </div>;
    }}
  </ServicePage>;
}
