import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useActiveMarket } from "@/lib/MarketContext";
import { usePreferences } from "@/lib/preferences";
import { invokeAppFunction, readMarketChart } from "@/services/marketService";
import {
  createKimiTradingViewDatafeed,
  TRADINGVIEW_HOSTED_LIBRARY_PATH,
  TRADINGVIEW_HOSTED_SCRIPT,
} from "@/lib/tradingview-datafeed";

const DEFAULT_SYMBOLS = Object.freeze({ SA_MAIN: "1111", US_OPTIONS: "AAPL", US_BENCHMARKS: "SPY" });
let hostedLibraryPromise = null;

function tradingViewGlobal() {
  return /** @type {any} */ (window).TradingView;
}

function loadHostedLibrary() {
  if (tradingViewGlobal()?.widget) return Promise.resolve(tradingViewGlobal());
  if (hostedLibraryPromise) return hostedLibraryPromise;
  hostedLibraryPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${TRADINGVIEW_HOSTED_SCRIPT}"]`);
    const script = /** @type {HTMLScriptElement} */ (existing || document.createElement("script"));
    const timeout = window.setTimeout(() => reject(new Error("advanced_chart_library_timeout")), 20_000);
    const complete = () => {
      window.clearTimeout(timeout);
      return tradingViewGlobal()?.widget ? resolve(tradingViewGlobal()) : reject(new Error("advanced_chart_library_unavailable"));
    };
    script.addEventListener("load", complete, { once: true });
    script.addEventListener("error", () => {
      window.clearTimeout(timeout);
      reject(new Error("advanced_chart_library_blocked"));
    }, { once: true });
    if (!existing) {
      script.src = TRADINGVIEW_HOSTED_SCRIPT;
      script.async = true;
      script.dataset.kmyAdvancedChart = "hosted";
      document.head.appendChild(script);
    }
  }).catch((error) => {
    document.querySelector('script[data-kmy-advanced-chart="hosted"]')?.remove();
    hostedLibraryPromise = null;
    throw error;
  });
  return hostedLibraryPromise;
}

export default function AdvancedChartPilot() {
  const { marketCode, market } = useActiveMarket();
  const { isArabic, theme } = usePreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const previousMarketRef = useRef(marketCode);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const symbol = String(searchParams.get("symbol") || DEFAULT_SYMBOLS[marketCode] || "").trim().toUpperCase();

  const datafeed = useMemo(() => {
    if (!marketCode) return null;
    return createKimiTradingViewDatafeed({
      marketCode,
      pollMs: 0,
      searchInstruments: async (query) => {
        const result = await invokeAppFunction("marketRead", { action: "instrument_search", market_code: marketCode, query, limit: 50 });
        return result?.instruments || [];
      },
      readChart: (payload) => readMarketChart(payload, { maxAgeMs: 60_000 }),
    });
  }, [marketCode]);

  useEffect(() => {
    if (previousMarketRef.current && previousMarketRef.current !== marketCode) {
      setSearchParams({ symbol: DEFAULT_SYMBOLS[marketCode] || "" }, { replace: true });
    }
    previousMarketRef.current = marketCode;
  }, [marketCode, setSearchParams]);

  useEffect(() => {
    if (!marketCode || !symbol || !datafeed || !containerRef.current) return undefined;
    let active = true;
    setStatus("loading");
    setError("");
    loadHostedLibrary()
      .then((TradingView) => {
        if (!active || !containerRef.current) return;
        const widget = new TradingView.widget({
          autosize: true,
          symbol: `${marketCode}:${symbol}`,
          interval: "1D",
          container: containerRef.current,
          datafeed,
          library_path: TRADINGVIEW_HOSTED_LIBRARY_PATH,
          locale: isArabic ? "ar" : "en",
          theme: theme === "dark" ? "dark" : "light",
          timezone: market?.timezone || (marketCode === "SA_MAIN" ? "Asia/Riyadh" : "America/New_York"),
          symbol_search_request_delay: 350,
          disabled_features: ["header_compare", "use_localstorage_for_settings"],
          enabled_features: ["accessible_keyboard_shortcuts"],
          load_last_chart: false,
          debug: false,
        });
        widgetRef.current = widget;
        widget.onChartReady(() => active && setStatus("ready"));
      })
      .catch((reason) => {
        if (!active) return;
        setStatus("error");
        setError(reason?.message || "advanced_chart_unavailable");
      });
    return () => {
      active = false;
      try { widgetRef.current?.remove?.(); } catch {}
      widgetRef.current = null;
      datafeed.destroy();
    };
  }, [datafeed, isArabic, market?.timezone, marketCode, symbol, theme]);

  function updateSymbol(event) {
    const next = String(event.target.value || "").trim().toUpperCase();
    if (!next) return;
    setSearchParams({ symbol: next });
  }

  function submitSymbol(event) {
    event.preventDefault();
    const input = event.currentTarget.querySelector('input[name="symbol"]');
    if (input) updateSymbol({ target: input });
  }

  return <main className="mx-auto w-full max-w-[1800px] space-y-4 p-3 md:p-5" dir={isArabic ? "rtl" : "ltr"}>
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d192a]">
      <div><h1 className="text-xl font-black">{isArabic ? "معاينة الشارت المتقدم" : "Advanced chart preview"}</h1><p className="text-sm text-slate-500">{isArabic ? `السوق الحالي: ${market?.name_ar || marketCode}` : `Active market: ${market?.name_en || marketCode}`}</p></div>
      <form className="flex gap-2" onSubmit={submitSymbol}>
        <input key={`${marketCode}:${symbol}`} name="symbol" defaultValue={symbol} className="form-input w-40" dir="ltr" aria-label={isArabic ? "رمز الأداة" : "Instrument symbol"} />
        <button type="submit" className="primary-button">{isArabic ? "فتح" : "Open"}</button>
      </form>
    </header>
    {status === "error" && <div className="error-banner" role="alert">{isArabic ? "تعذر تحميل المعاينة من الاستضافة الرسمية. بقي الشارت الحالي دون تغيير." : "The hosted preview could not be loaded. The current chart remains unchanged."}<small className="block" dir="ltr">{error}</small></div>}
    <section className="relative min-h-[680px] overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0d192a]">
      {status === "loading" && <div className="absolute inset-0 z-10 grid place-items-center bg-white/80 font-bold dark:bg-slate-950/80">{isArabic ? "جارٍ تحميل المعاينة…" : "Loading preview…"}</div>}
      <div ref={containerRef} className="h-[78vh] min-h-[680px] w-full" />
    </section>
  </main>;
}
