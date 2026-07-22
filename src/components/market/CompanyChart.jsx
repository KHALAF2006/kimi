import React, { useEffect, useMemo, useRef, useState } from "react";
import { CandlestickSeries, ColorType, createChart, HistogramSeries, LineStyle } from "lightweight-charts";
import { Eye, EyeOff, Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { invokeAppFunction } from "@/services/marketService";
import { formatNumber, normalizeMomentum } from "@/lib/market";
import { usePreferences } from "@/lib/preferences";

const presets = [
  { interval: "15m", range: "5d", ar: "15 دقيقة / 5 أيام", en: "15m / 5D" },
  { interval: "1h", range: "1mo", ar: "ساعة / شهر", en: "1H / 1M" },
  { interval: "1d", range: "3mo", ar: "يومي / 3 أشهر", en: "1D / 3M" },
  { interval: "1d", range: "1y", ar: "يومي / سنة", en: "1D / 1Y" },
  { interval: "1wk", range: "5y", ar: "أسبوعي / 5 سنوات", en: "1W / 5Y" },
  { interval: "1mo", range: "5y", ar: "شهري / 5 سنوات", en: "1M / 5Y" },
];

function asChartTime(value) {
  if (typeof value === "number") return value > 10_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
  return Math.floor(new Date(value).getTime() / 1000);
}

export default function CompanyChart({ symbol, momentum: rawMomentum }) {
  const { language, isArabic, theme } = usePreferences();
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const momentumLinesRef = useRef([]);
  const [preset, setPreset] = useState(presets[2]);
  const [candles, setCandles] = useState([]);
  const [source, setSource] = useState("");
  const [asOf, setAsOf] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState(null);
  const [showMomentum, setShowMomentum] = useState(() => localStorage.getItem("kmy_show_momentum") !== "false");
  const [showVolume, setShowVolume] = useState(() => localStorage.getItem("kmy_show_volume") !== "false");
  const momentum = useMemo(() => normalizeMomentum(rawMomentum, theme), [rawMomentum, theme]);

  useEffect(() => {
    if (!symbol) return;
    let active = true;
    setLoading(true);
    setError("");
    invokeAppFunction("marketRead", { action: "chart", symbol, interval: preset.interval, range: preset.range })
      .then((data) => {
        if (!active) return;
        setCandles(Array.isArray(data.candles) ? data.candles : []);
        setSource(data.source?.name || data.source || "");
        setAsOf(data.as_of || data.asOf || "");
      })
      .catch((reason) => {
        if (!active) return;
        setCandles([]);
        setError(reason?.response?.data?.error || reason?.message || "chart_fetch_failed");
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [symbol, preset]);

  useEffect(() => {
    if (!containerRef.current) return;
    const dark = theme === "dark";
    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 500,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: dark ? "#cbd5e1" : "#475569", fontFamily: "Tajawal" },
      grid: { vertLines: { color: dark ? "#1e293b" : "#e2e8f0" }, horzLines: { color: dark ? "#1e293b" : "#e2e8f0" } },
      rightPriceScale: { borderColor: dark ? "#334155" : "#cbd5e1" },
      timeScale: { borderColor: dark ? "#334155" : "#cbd5e1", timeVisible: true, secondsVisible: false },
      crosshair: { vertLine: { labelBackgroundColor: "#0f172a" }, horzLine: { labelBackgroundColor: "#0f172a" } },
      localization: { locale: language === "ar" ? "ar-SA" : "en-US" },
    });
    const candlesSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#16a34a", downColor: "#dc2626", borderUpColor: "#16a34a", borderDownColor: "#dc2626", wickUpColor: "#16a34a", wickDownColor: "#dc2626",
    });
    const volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "", lastValueVisible: false, priceLineVisible: false });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    chart.subscribeCrosshairMove((param) => {
      const value = /** @type {any} */ (param.seriesData.get(candlesSeries));
      setHovered(value && typeof value.open === "number" ? value : null);
    });
    chartRef.current = chart;
    candleSeriesRef.current = candlesSeries;
    volumeSeriesRef.current = volumeSeries;
    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      momentumLinesRef.current = [];
    };
  }, [theme, language]);

  useEffect(() => {
    const seen = new Set();
    const ordered = candles.map((candle) => ({
      time: asChartTime(candle.time),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.volume || 0),
    })).filter((candle) => Number.isFinite(candle.time) && [candle.open, candle.high, candle.low, candle.close].every(Number.isFinite))
      .sort((a, b) => a.time - b.time)
      .filter((candle) => !seen.has(candle.time) && seen.add(candle.time));
    candleSeriesRef.current?.setData(ordered.map(({ volume: _volume, ...candle }) => candle));
    volumeSeriesRef.current?.setData(ordered.map((candle) => ({ time: candle.time, value: candle.volume, color: candle.close >= candle.open ? "#16a34aaa" : "#dc2626aa" })));
    chartRef.current?.timeScale().fitContent();
  }, [candles, theme, language]);

  useEffect(() => {
    volumeSeriesRef.current?.applyOptions({ visible: showVolume });
    localStorage.setItem("kmy_show_volume", String(showVolume));
  }, [showVolume]);

  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    momentumLinesRef.current.forEach((line) => series.removePriceLine(line));
    momentumLinesRef.current = [];
    localStorage.setItem("kmy_show_momentum", String(showMomentum));
    if (!showMomentum || !momentum?.zones) return;
    momentum.zones.filter((zone) => zone.active !== false).forEach((zone) => {
      const name = isArabic ? zone.nameAr : zone.nameEn;
      momentumLinesRef.current.push(series.createPriceLine({ price: Number(zone.top), color: zone.color, lineWidth: 2, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: name + (isArabic ? " · من" : " · From") }));
      momentumLinesRef.current.push(series.createPriceLine({ price: Number(zone.bottom), color: zone.color, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: name + (isArabic ? " · إلى" : " · To") }));
      momentumLinesRef.current.push(series.createPriceLine({ price: Number(zone.stop), color: "#dc2626", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: (isArabic ? "وقف · " : "Stop · ") + name }));
    });
  }, [momentum, showMomentum, isArabic, theme]);

  function zoom(factor) {
    const scale = chartRef.current?.timeScale();
    const visible = scale?.getVisibleLogicalRange();
    if (!scale || !visible) return;
    const center = (visible.from + visible.to) / 2;
    const half = ((visible.to - visible.from) / 2) * factor;
    scale.setVisibleLogicalRange({ from: center - half, to: center + half });
  }

  async function toggleFullscreen() {
    if (!wrapperRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await wrapperRef.current.requestFullscreen();
  }

  return <div ref={wrapperRef} className="chart-shell">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-black">{isArabic ? "الرسم البياني الحقيقي" : "Verified price chart"}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{source || (isArabic ? "المصدر يظهر بعد التحميل" : "Source appears after loading")}{asOf ? " · " + new Date(asOf).toLocaleString(isArabic ? "ar-SA" : "en-US") : ""}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((item) => <button key={item.interval + item.range} onClick={() => setPreset(item)} className={"chart-chip " + (preset === item ? "chart-chip-active" : "")}>{isArabic ? item.ar : item.en}</button>)}
        <button className="icon-button" onClick={() => setShowMomentum((value) => !value)} title={isArabic ? "إظهار أو إخفاء مؤشر الزخم" : "Toggle momentum"}>{showMomentum ? <Eye size={17} /> : <EyeOff size={17} />}</button>
        <button className="icon-button px-2 text-[10px] font-black" onClick={() => setShowVolume((value) => !value)} title={isArabic ? "إظهار أو إخفاء الحجم" : "Toggle volume"}>VOL</button>
        <button className="icon-button" onClick={() => zoom(0.75)} title={isArabic ? "تكبير" : "Zoom in"}><Plus size={17} /></button>
        <button className="icon-button" onClick={() => zoom(1.35)} title={isArabic ? "تصغير" : "Zoom out"}><Minus size={17} /></button>
        <button className="icon-button" onClick={() => chartRef.current?.timeScale().fitContent()} title={isArabic ? "إعادة الضبط" : "Reset"}><RotateCcw size={17} /></button>
        <button className="icon-button" onClick={toggleFullscreen} title={isArabic ? "ملء الشاشة" : "Fullscreen"}><Maximize2 size={17} /></button>
      </div>
    </div>
    {hovered && <div className="ohlc-strip" dir="ltr"><span>O {formatNumber(hovered.open, "en")}</span><span>H {formatNumber(hovered.high, "en")}</span><span>L {formatNumber(hovered.low, "en")}</span><span>C {formatNumber(hovered.close, "en")}</span></div>}
    {loading && <div className="chart-message">{isArabic ? "جارٍ تحميل الشموع الحقيقية…" : "Loading verified candles…"}</div>}
    {error && <div className="chart-message text-red-600">{isArabic ? "تعذر جلب الشموع. لم تُستبدل ببيانات وهمية." : "Candles are unavailable. No mock data was substituted."}</div>}
    {!loading && !error && !candles.length && <div className="chart-message">{isArabic ? "لا توجد شموع موثقة لهذا النطاق." : "No verified candles for this range."}</div>}
    <div ref={containerRef} className={candles.length ? "mt-3 h-[500px]" : "h-0"} />
  </div>;
}
