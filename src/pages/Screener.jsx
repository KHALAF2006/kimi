import React, { useMemo, useState } from "react";
import { Activity, ChartCandlestick, Search, TrendingUp } from "lucide-react";
import ServicePage from "@/components/ServicePage";
import MarketTable from "@/components/market/MarketTable";
import { usePreferences } from "@/lib/preferences";
import { useActiveMarket } from "@/lib/MarketContext";

const signalOptions = [
  { value: "", ar: "كل الإشارات", en: "All signals", icon: Activity },
  { value: "bullish_pin_bar", ar: "بن بار شرائية", en: "Bullish pin bar", icon: ChartCandlestick, direction: "bullish" },
  { value: "bearish_pin_bar", ar: "بن بار بيعية", en: "Bearish pin bar", icon: ChartCandlestick, direction: "bearish" },
  { value: "bullish_engulfing", ar: "شمعة بالعة شرائية", en: "Bullish engulfing", icon: ChartCandlestick, direction: "bullish" },
  { value: "bearish_engulfing", ar: "شمعة بالعة بيعية", en: "Bearish engulfing", icon: ChartCandlestick, direction: "bearish" },
  { value: "bullish_zone_pin_bar", ar: "بن بار شرائية داخل منطقة", en: "Bullish zone pin bar", icon: ChartCandlestick, direction: "bullish" },
  { value: "bearish_zone_pin_bar", ar: "بن بار بيعية داخل منطقة", en: "Bearish zone pin bar", icon: ChartCandlestick, direction: "bearish" },
  { value: "pin_bar_signal", ar: "كل شموع بن بار", en: "All pin bars", icon: ChartCandlestick },
  { value: "engulfing_signal", ar: "كل الشموع البالعة", en: "All engulfing candles", icon: ChartCandlestick },
  { value: "zone_pin_bar", ar: "كل بن بار داخل منطقة", en: "All zone pin bars", icon: ChartCandlestick },
  { value: "price_cross_sma20", ar: "اختراق السعر لمتوسط 20", en: "Price crossed SMA 20", icon: TrendingUp },
  { value: "price_cross_sma50", ar: "اختراق السعر لمتوسط 50", en: "Price crossed SMA 50", icon: TrendingUp },
  { value: "sma20_cross_sma50", ar: "تقاطع متوسط 20 فوق 50", en: "SMA 20 crossed above SMA 50", icon: TrendingUp },
];

const timeframeOptions = [
  { value: "1d", ar: "يومي", en: "Daily" },
  { value: "1wk", ar: "أسبوعي", en: "Weekly" },
  { value: "1mo", ar: "شهري", en: "Monthly" },
];

export default function Screener() {
  const { isArabic } = usePreferences();
  const { marketCode } = useActiveMarket();
  const [signal, setSignal] = useState("");
  const [timeframe, setTimeframe] = useState("1d");
  const [query, setQuery] = useState("");
  const payload = useMemo(() => ({ limit: 500, mode: "screener", signal, timeframe, market_code: marketCode }), [signal, timeframe, marketCode]);

  return <ServicePage
    title={isArabic ? "ماسح الاستراتيجيات" : "Strategy screener"}
    description={isArabic ? "اكتشف الشركات التي تتوافق مع استراتيجيتك على الفاصل الذي تختاره." : "Discover companies that match your strategy on the timeframe you choose."}
    functionName="marketRead"
    payload={payload}
  >
    {(data) => {
      const normalizedQuery = query.trim().toLocaleLowerCase(isArabic ? "ar" : "en");
      const matched = (data.instruments || []).filter((row) => row.screener_match);
      const rows = matched.filter((row) => !normalizedQuery
        || [row.symbol, row.name_ar, row.name_en, row.sector_ar, row.sector_en]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase(isArabic ? "ar" : "en")
          .includes(normalizedQuery));
      const coverage = data.signal_coverage || null;
      // Distinguish the three ways this screen can legitimately be empty, so an
      // empty table is never mistaken for a broken search.
      const emptyReason = rows.length ? "" : !coverage || coverage.snapshot_count === 0
        ? (isArabic
          ? "لم تُحتسب إشارات هذا السوق على الفاصل المختار بعد، لذلك لا توجد نتائج. جرّب الفاصل اليومي أو انتظر اكتمال دورة التحديث."
          : "Signals for this market have not been calculated on the selected timeframe yet, so there are no results. Try the daily timeframe or wait for the refresh cycle.")
        : matched.length === 0
          ? (isArabic
            ? "لا توجد أدوات مطابقة لهذه الإشارة على هذا الفاصل حالياً. جرّب إشارة أخرى أو «كل الإشارات»."
            : "No instruments match this signal on this timeframe right now. Try another signal or “All signals”.")
          : (isArabic
            ? "لا توجد نتائج مطابقة لنص البحث. امسح البحث لعرض كل المطابقات."
            : "No results match your search text. Clear the search to see every match.");
      return <div className="space-y-4">
        <section className="surface-panel p-4">
          <div className="relative">
            <Search className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pe-12 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950"
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
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="group" aria-label={isArabic ? "نوع الإشارة" : "Signal type"}>
            {signalOptions.map((option) => {
              const Icon = option.icon;
              return <button
                key={option.value || "all"}
                type="button"
                className={`screener-signal-button ${option.direction ? `signal-${option.direction}` : ""} ${signal === option.value ? "screener-signal-button-active" : ""}`}
                aria-pressed={signal === option.value}
                onClick={() => setSignal(option.value)}
              ><Icon size={16} /><span>{isArabic ? option.ar : option.en}</span></button>;
            })}
          </div>
        </section>

        {data.signal_coverage && data.signal_coverage.snapshot_count < data.signal_coverage.instrument_count && <div className="warning-banner" role="status">
          {isArabic
            ? "قد تظهر نتائج إضافية بعد اكتمال تحديث هذا الفاصل."
            : "More results may appear when this timeframe finishes updating."}
        </div>}

        <p className="text-sm font-bold text-slate-500">
          {isArabic ? `النتائج: ${rows.length}` : `Results: ${rows.length}`}
          {coverage ? <span className="ms-2 font-normal text-slate-400">{isArabic
            ? `(إشارات محسوبة لـ ${coverage.snapshot_count} من ${coverage.instrument_count} أداة)`
            : `(signals calculated for ${coverage.snapshot_count} of ${coverage.instrument_count} instruments)`}</span> : null}
        </p>
        {emptyReason
          ? <p className="surface-panel p-6 text-center text-sm font-bold text-slate-500">{emptyReason}</p>
          : <MarketTable rows={rows} marketCode={marketCode} detailsTimeframe={timeframe} />}
      </div>;
    }}
  </ServicePage>;
}