import React, { useEffect, useMemo, useRef, useState } from "react";
import { CandlestickSeries, ColorType, createChart, HistogramSeries, LineSeries, LineStyle } from "lightweight-charts";
import { BarChart3, ChevronDown, Eye, EyeOff, Layers3, Maximize2, Minus, Plus, RotateCcw, Settings2, SlidersHorizontal, Waves } from "lucide-react";
import { invokeAppFunction } from "@/services/marketService";
import { calculateMomentumSnapshot, calculateRsiSeries, formatNumber, MOMENTUM_ZONE_DEFINITIONS, normalizeMomentum } from "@/lib/market";
import { usePreferences } from "@/lib/preferences";

const intervalOptions = [
  { value: "15m", ar: "15 د", en: "15m", defaultRange: "5d" },
  { value: "1h", ar: "ساعة", en: "1H", defaultRange: "1mo" },
  { value: "1d", ar: "يوم", en: "1D", defaultRange: "1y" },
  { value: "1wk", ar: "أسبوع", en: "1W", defaultRange: "5y" },
  { value: "1mo", ar: "شهر", en: "1M", defaultRange: "5y" },
];

const rangeOptions = [
  { value: "5d", ar: "5 أيام", en: "5D", intervals: ["15m", "1h", "1d"] },
  { value: "1mo", ar: "شهر", en: "1M", intervals: ["15m", "1h", "1d"] },
  { value: "3mo", ar: "3 أشهر", en: "3M", intervals: ["1h", "1d", "1wk"] },
  { value: "1y", ar: "سنة", en: "1Y", intervals: ["1h", "1d", "1wk", "1mo"] },
  { value: "5y", ar: "5 سنوات", en: "5Y", intervals: ["1d", "1wk", "1mo"] },
];

const rsiDefaults = {
  length: 14,
  source: "close",
  lineColor: "#7c3aed",
  lineWidth: 2,
  upper: 70,
  lower: 30,
  upperColor: "#dc2626",
  lowerColor: "#16a34a",
  fillColor: "#7c3aed",
  fillOpacity: 8,
};

const momentumDefaults = {
  peakLookbackDays: 20,
  extendBars: 200,
  zoneOpacity: 82,
  showZones: true,
  showStopLines: true,
  showInfoPanel: true,
  showPeakLine: true,
  peakLineColor: "#94a3b8",
  zones: Object.fromEntries(MOMENTUM_ZONE_DEFINITIONS.map((zone) => [zone.key, {
    visible: true,
    stopVisible: true,
    color: zone.dark,
    stopColor: "#dc2626",
  }])),
};

function storedObject(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed && typeof parsed === "object" ? { ...fallback, ...parsed } : fallback;
  } catch {
    return fallback;
  }
}

function asChartTime(value) {
  if (typeof value === "number") return value > 10_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
  return Math.floor(new Date(value).getTime() / 1000);
}

function normalizeCandles(values) {
  const seen = new Set();
  return values.map((candle) => ({
    time: asChartTime(candle.time),
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
    volume: Number(candle.volume || 0),
  })).filter((candle) => Number.isFinite(candle.time) && [candle.open, candle.high, candle.low, candle.close].every(Number.isFinite) && candle.high >= candle.low)
    .sort((a, b) => a.time - b.time)
    .filter((candle) => !seen.has(candle.time) && seen.add(candle.time));
}

function colorWithOpacity(color, opacity) {
  const hex = String(color || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return color;
  const alpha = Math.min(1, Math.max(0, Number(opacity) || 0));
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function ToggleButton({ active, label, icon: Icon, onClick, settings = false, onSettings = null, isArabic }) {
  return <div className={"indicator-control " + (active ? "indicator-control-active" : "")}>
    <button type="button" onClick={onClick} className="indicator-toggle" title={(active ? (isArabic ? "إخفاء " : "Hide ") : (isArabic ? "إظهار " : "Show ")) + label}>
      <Icon size={15} /><span>{label}</span>{active ? <Eye size={14} /> : <EyeOff size={14} />}
    </button>
    {onSettings && <button type="button" onClick={onSettings} className={"indicator-settings-button " + (settings ? "indicator-settings-active" : "")} title={isArabic ? "إعدادات المؤشر" : "Indicator settings"}><Settings2 size={14} /></button>}
  </div>;
}

export default function CompanyChart({ symbol, momentum: rawMomentum }) {
  const { language, isArabic, theme } = usePreferences();
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const rsiSeriesRef = useRef(null);
  const momentumLinesRef = useRef([]);
  const overlayUpdateRef = useRef(() => {});
  const [interval, setInterval] = useState(() => localStorage.getItem("kmy_chart_interval") || "1d");
  const [range, setRange] = useState(() => localStorage.getItem("kmy_chart_range") || "1y");
  const [candles, setCandles] = useState([]);
  const [indicatorCandles, setIndicatorCandles] = useState([]);
  const [source, setSource] = useState("");
  const [asOf, setAsOf] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState(null);
  const [showMomentum, setShowMomentum] = useState(() => localStorage.getItem("kmy_show_momentum") !== "false");
  const [showVolume, setShowVolume] = useState(() => localStorage.getItem("kmy_show_volume") !== "false");
  const [showRsi, setShowRsi] = useState(() => localStorage.getItem("kmy_show_rsi") !== "false");
  const [settingsPanel, setSettingsPanel] = useState("");
  const [rsiSettings, setRsiSettings] = useState(() => storedObject("kmy_rsi_settings", rsiDefaults));
  const [momentumSettings, setMomentumSettings] = useState(() => {
    const stored = storedObject("kmy_momentum_settings", momentumDefaults);
    return {
      ...momentumDefaults,
      ...stored,
      zones: Object.fromEntries(MOMENTUM_ZONE_DEFINITIONS.map((zone) => [zone.key, {
        ...momentumDefaults.zones[zone.key],
        ...(stored.zones?.[zone.key] || {}),
      }])),
    };
  });
  const [zoneGeometry, setZoneGeometry] = useState([]);

  const orderedCandles = useMemo(() => normalizeCandles(candles), [candles]);
  const rsiData = useMemo(() => calculateRsiSeries(orderedCandles, rsiSettings.length, rsiSettings.source), [orderedCandles, rsiSettings.length, rsiSettings.source]);
  const fallbackMomentum = useMemo(() => normalizeMomentum(rawMomentum, theme), [rawMomentum, theme]);
  const calculatedMomentum = useMemo(() => calculateMomentumSnapshot(indicatorCandles, momentumSettings.peakLookbackDays, 500, theme), [indicatorCandles, momentumSettings.peakLookbackDays, theme]);
  const momentum = calculatedMomentum || fallbackMomentum;
  const availableRanges = rangeOptions.filter((item) => item.intervals.includes(interval));
  const chartHeight = 470 + (showVolume ? 115 : 0) + (showRsi ? 165 : 0);

  useEffect(() => {
    if (!symbol) return;
    let active = true;
    setLoading(true);
    setError("");
    invokeAppFunction("marketRead", { action: "chart", symbol, interval, range })
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
    localStorage.setItem("kmy_chart_interval", interval);
    localStorage.setItem("kmy_chart_range", range);
    return () => { active = false; };
  }, [symbol, interval, range]);

  useEffect(() => {
    if (!symbol) return;
    let active = true;
    invokeAppFunction("marketRead", { action: "chart", symbol, interval: "1d", range: "5y" })
      .then((data) => active && setIndicatorCandles(Array.isArray(data.candles) ? data.candles : []))
      .catch(() => active && setIndicatorCandles([]));
    return () => { active = false; };
  }, [symbol]);

  useEffect(() => {
    localStorage.setItem("kmy_show_momentum", String(showMomentum));
    localStorage.setItem("kmy_show_volume", String(showVolume));
    localStorage.setItem("kmy_show_rsi", String(showRsi));
  }, [showMomentum, showVolume, showRsi]);

  useEffect(() => { localStorage.setItem("kmy_rsi_settings", JSON.stringify(rsiSettings)); }, [rsiSettings]);
  useEffect(() => { localStorage.setItem("kmy_momentum_settings", JSON.stringify(momentumSettings)); }, [momentumSettings]);

  useEffect(() => {
    if (!containerRef.current) return;
    const dark = theme === "dark";
    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: dark ? "#091321" : "#ffffff" },
        textColor: dark ? "#cbd5e1" : "#475569",
        fontFamily: "Tajawal",
        panes: { separatorColor: dark ? "#243247" : "#dbe3ee", separatorHoverColor: "#f59e0b", enableResize: true },
      },
      grid: { vertLines: { color: dark ? "#172337" : "#edf1f6" }, horzLines: { color: dark ? "#172337" : "#edf1f6" } },
      rightPriceScale: { borderColor: dark ? "#334155" : "#cbd5e1", minimumWidth: 68, scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: { borderColor: dark ? "#334155" : "#cbd5e1", timeVisible: interval === "15m" || interval === "1h", secondsVisible: false, rightOffset: 8, barSpacing: interval === "15m" ? 7 : 9, minBarSpacing: 2 },
      crosshair: {
        mode: 0,
        vertLine: { color: dark ? "#64748b" : "#64748b", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#0f172a" },
        horzLine: { color: dark ? "#64748b" : "#64748b", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#0f172a" },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
      localization: { locale: language === "ar" ? "ar-SA" : "en-US" },
    });

    const candlesSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#16a34a", downColor: "#dc2626", borderUpColor: "#16a34a", borderDownColor: "#dc2626", wickUpColor: "#16a34a", wickDownColor: "#dc2626",
      priceLineVisible: true,
      lastValueVisible: true,
    }, 0);
    let nextPane = 1;
    const volumeSeries = showVolume ? chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "right",
      lastValueVisible: true,
      priceLineVisible: false,
    }, nextPane++) : null;
    const rsiSeries = showRsi ? chart.addSeries(LineSeries, {
      color: rsiSettings.lineColor,
      lineWidth: /** @type {1 | 2 | 3 | 4} */ (Number(rsiSettings.lineWidth) || 2),
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }),
    }, nextPane++) : null;

    if (rsiSeries) {
      rsiSeries.createPriceLine({ price: Number(rsiSettings.upper), color: rsiSettings.upperColor, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: isArabic ? "تشبع شرائي" : "Overbought" });
      rsiSeries.createPriceLine({ price: 50, color: dark ? "#475569" : "#94a3b8", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: "50" });
      rsiSeries.createPriceLine({ price: Number(rsiSettings.lower), color: rsiSettings.lowerColor, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: isArabic ? "تشبع بيعي" : "Oversold" });
    }

    chart.subscribeCrosshairMove((param) => {
      const candle = /** @type {any} */ (param.seriesData.get(candlesSeries));
      const volume = volumeSeries ? /** @type {any} */ (param.seriesData.get(volumeSeries)) : null;
      const rsi = rsiSeries ? /** @type {any} */ (param.seriesData.get(rsiSeries)) : null;
      setHovered(candle && typeof candle.open === "number" ? { ...candle, volume: volume?.value, rsi: rsi?.value } : null);
    });
    const visibleHandler = () => overlayUpdateRef.current();
    chart.timeScale().subscribeVisibleLogicalRangeChange(visibleHandler);
    const resizeObserver = new ResizeObserver(() => overlayUpdateRef.current());
    resizeObserver.observe(containerRef.current);

    chartRef.current = chart;
    candleSeriesRef.current = candlesSeries;
    volumeSeriesRef.current = volumeSeries;
    rsiSeriesRef.current = rsiSeries;
    window.requestAnimationFrame(() => {
      const panes = chart.panes();
      panes[0]?.setHeight(470);
      if (showVolume) panes[1]?.setHeight(115);
      if (showRsi) panes[showVolume ? 2 : 1]?.setHeight(165);
      overlayUpdateRef.current();
    });
    return () => {
      resizeObserver.disconnect();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(visibleHandler);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      rsiSeriesRef.current = null;
      momentumLinesRef.current = [];
    };
  }, [theme, language, interval, showVolume, showRsi, rsiSettings.lineColor, rsiSettings.lineWidth, rsiSettings.upper, rsiSettings.lower, rsiSettings.upperColor, rsiSettings.lowerColor, chartHeight, isArabic]);

  useEffect(() => {
    candleSeriesRef.current?.setData(orderedCandles.map(({ volume: _volume, ...candle }) => candle));
    volumeSeriesRef.current?.setData(orderedCandles.map((candle) => ({ time: candle.time, value: candle.volume, color: candle.close >= candle.open ? "#16a34acc" : "#dc2626cc" })));
    rsiSeriesRef.current?.setData(rsiData);
    if (orderedCandles.length) chartRef.current?.timeScale().fitContent();
    window.requestAnimationFrame(() => overlayUpdateRef.current());
  }, [orderedCandles, rsiData, theme, language]);

  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    momentumLinesRef.current.forEach((line) => series.removePriceLine(line));
    momentumLinesRef.current = [];
    if (!showMomentum || !momentum?.zones) return;

    if (momentumSettings.showPeakLine && Number.isFinite(Number(momentum.referencePeak))) {
      momentumLinesRef.current.push(series.createPriceLine({
        price: Number(momentum.referencePeak), color: momentumSettings.peakLineColor, lineWidth: 2, lineStyle: LineStyle.Solid, axisLabelVisible: true,
        title: isArabic ? "القمة المرجعية" : "Reference peak",
      }));
    }
    momentum.zones.filter((zone) => zone.active !== false).forEach((zone) => {
      const zoneSetting = momentumSettings.zones[zone.key] || momentumDefaults.zones[zone.key];
      const name = isArabic ? zone.nameAr : zone.nameEn;
      if (momentumSettings.showZones && zoneSetting.visible) {
        momentumLinesRef.current.push(series.createPriceLine({ price: Number(zone.top), color: zoneSetting.color, lineWidth: 2, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: name + (isArabic ? " · من" : " · From") }));
        momentumLinesRef.current.push(series.createPriceLine({ price: Number(zone.bottom), color: zoneSetting.color, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: name + (isArabic ? " · إلى" : " · To") }));
      }
      if (momentumSettings.showStopLines && zoneSetting.stopVisible) {
        momentumLinesRef.current.push(series.createPriceLine({ price: Number(zone.stop), color: zoneSetting.stopColor, lineWidth: zone.key === "zone4" || zone.key === "zone5" ? 3 : 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: (isArabic ? "وقف · " : "Stop · ") + name }));
      }
    });
    window.requestAnimationFrame(() => overlayUpdateRef.current());
  }, [momentum, showMomentum, momentumSettings, isArabic, showVolume, showRsi]);

  useEffect(() => {
    overlayUpdateRef.current = () => {
      const chart = chartRef.current;
      const series = candleSeriesRef.current;
      const container = containerRef.current;
      if (!chart || !series || !container || !showMomentum || !momentumSettings.showZones || !momentum?.zones?.length) {
        setZoneGeometry([]);
        return;
      }
      const fallbackTime = orderedCandles[0]?.time;
      const referenceTime = asChartTime(momentum.referenceTime || momentum.reference_time || fallbackTime);
      const referenceX = Number.isFinite(referenceTime) ? chart.timeScale().timeToCoordinate(referenceTime) : null;
      const left = Math.max(0, referenceX == null ? 0 : referenceX);
      const right = Math.max(left, container.clientWidth - 70);
      const zones = momentum.zones.filter((zone) => zone.active !== false).map((zone) => {
        const setting = momentumSettings.zones[zone.key] || momentumDefaults.zones[zone.key];
        const top = series.priceToCoordinate(Number(zone.top));
        const bottom = series.priceToCoordinate(Number(zone.bottom));
        if (!setting.visible || top == null || bottom == null) return null;
        return {
          key: zone.key,
          left,
          width: Math.max(0, right - left),
          top: Math.min(top, bottom),
          height: Math.max(2, Math.abs(bottom - top)),
          color: setting.color,
          name: isArabic ? zone.nameAr : zone.nameEn,
          topPrice: zone.top,
          bottomPrice: zone.bottom,
        };
      }).filter(Boolean);
      setZoneGeometry(zones);
    };
    overlayUpdateRef.current();
  }, [momentum, momentumSettings, orderedCandles, showMomentum, isArabic]);

  function changeInterval(nextInterval) {
    setInterval(nextInterval);
    const supported = rangeOptions.filter((item) => item.intervals.includes(nextInterval));
    if (!supported.some((item) => item.value === range)) {
      setRange(intervalOptions.find((item) => item.value === nextInterval)?.defaultRange || supported[0]?.value || "1y");
    }
  }

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

  function updateZoneSetting(key, patch) {
    setMomentumSettings((current) => ({
      ...current,
      zones: { ...current.zones, [key]: { ...current.zones[key], ...patch } },
    }));
  }

  const sourceOptions = [
    ["close", isArabic ? "الإغلاق" : "Close"],
    ["open", isArabic ? "الافتتاح" : "Open"],
    ["high", isArabic ? "الأعلى" : "High"],
    ["low", isArabic ? "الأدنى" : "Low"],
    ["hl2", isArabic ? "متوسط الأعلى والأدنى" : "HL2"],
    ["hlc3", isArabic ? "متوسط الأعلى والأدنى والإغلاق" : "HLC3"],
    ["ohlc4", isArabic ? "متوسط الشمعة" : "OHLC4"],
  ];

  return <div ref={wrapperRef} className="chart-shell">
    <div className="chart-header-row">
      <div>
        <h3 className="font-black">{isArabic ? "الرسم البياني الاحترافي" : "Professional verified chart"}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{source || (isArabic ? "المصدر يظهر بعد التحميل" : "Source appears after loading")}{asOf ? " · " + new Date(asOf).toLocaleString(isArabic ? "ar-SA" : "en-US") : ""}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="icon-button" onClick={() => zoom(0.75)} title={isArabic ? "تكبير" : "Zoom in"}><Plus size={17} /></button>
        <button className="icon-button" onClick={() => zoom(1.35)} title={isArabic ? "تصغير" : "Zoom out"}><Minus size={17} /></button>
        <button className="icon-button" onClick={() => chartRef.current?.timeScale().fitContent()} title={isArabic ? "إعادة ضبط النطاق" : "Reset range"}><RotateCcw size={17} /></button>
        <button className="icon-button" onClick={toggleFullscreen} title={isArabic ? "ملء الشاشة" : "Fullscreen"}><Maximize2 size={17} /></button>
      </div>
    </div>

    <div className="chart-toolbar-grid">
      <div className="chart-control-group"><span>{isArabic ? "الفاصل" : "Interval"}</span><div>{intervalOptions.map((item) => <button type="button" key={item.value} onClick={() => changeInterval(item.value)} className={"chart-chip " + (interval === item.value ? "chart-chip-active" : "")}>{isArabic ? item.ar : item.en}</button>)}</div></div>
      <div className="chart-control-group"><span>{isArabic ? "النطاق" : "Range"}</span><div>{availableRanges.map((item) => <button type="button" key={item.value} onClick={() => setRange(item.value)} className={"chart-chip " + (range === item.value ? "chart-chip-active" : "")}>{isArabic ? item.ar : item.en}</button>)}</div></div>
    </div>

    <div className="indicator-toolbar">
      <ToggleButton active={showVolume} label={isArabic ? "أحجام التداول" : "Volume"} icon={BarChart3} onClick={() => setShowVolume((value) => !value)} isArabic={isArabic} />
      <ToggleButton active={showMomentum} label={isArabic ? "مناطق الزخم" : "Momentum zones"} icon={Layers3} onClick={() => setShowMomentum((value) => !value)} onSettings={() => setSettingsPanel((value) => value === "momentum" ? "" : "momentum")} settings={settingsPanel === "momentum"} isArabic={isArabic} />
      <ToggleButton active={showRsi} label={isArabic ? "القوة النسبية" : "RSI"} icon={Waves} onClick={() => setShowRsi((value) => !value)} onSettings={() => setSettingsPanel((value) => value === "rsi" ? "" : "rsi")} settings={settingsPanel === "rsi"} isArabic={isArabic} />
      <button type="button" className="chart-settings-close" onClick={() => setSettingsPanel((value) => value ? "" : "rsi")}><SlidersHorizontal size={15} />{isArabic ? "الإعدادات" : "Settings"}<ChevronDown size={14} className={settingsPanel ? "rotate-180" : ""} /></button>
    </div>

    {settingsPanel === "rsi" && <section className="indicator-settings-panel">
      <div className="indicator-settings-title"><Waves size={17} /><div><b>{isArabic ? "إعدادات مؤشر القوة النسبية" : "RSI settings"}</b><p>{isArabic ? "الحساب بطريقة وايلدر مثل المؤشر القياسي." : "Wilder calculation matching the standard study."}</p></div><button type="button" onClick={() => setRsiSettings(rsiDefaults)}>{isArabic ? "الافتراضي" : "Defaults"}</button></div>
      <div className="settings-grid">
        <label><span>{isArabic ? "الفترة" : "Length"}</span><input type="number" min="2" max="100" value={rsiSettings.length} onChange={(event) => setRsiSettings((value) => ({ ...value, length: Math.min(100, Math.max(2, Number(event.target.value) || 14)) }))} /></label>
        <label><span>{isArabic ? "المصدر" : "Source"}</span><select value={rsiSettings.source} onChange={(event) => setRsiSettings((value) => ({ ...value, source: event.target.value }))}>{sourceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>{isArabic ? "التشبع الشرائي" : "Overbought"}</span><input type="number" min="51" max="99" value={rsiSettings.upper} onChange={(event) => setRsiSettings((value) => ({ ...value, upper: Math.min(99, Math.max(51, Number(event.target.value) || 70)) }))} /></label>
        <label><span>{isArabic ? "التشبع البيعي" : "Oversold"}</span><input type="number" min="1" max="49" value={rsiSettings.lower} onChange={(event) => setRsiSettings((value) => ({ ...value, lower: Math.min(49, Math.max(1, Number(event.target.value) || 30)) }))} /></label>
        <label><span>{isArabic ? "لون المؤشر" : "Line color"}</span><input type="color" value={rsiSettings.lineColor} onChange={(event) => setRsiSettings((value) => ({ ...value, lineColor: event.target.value }))} /></label>
        <label><span>{isArabic ? "سماكة الخط" : "Line width"}</span><select value={rsiSettings.lineWidth} onChange={(event) => setRsiSettings((value) => ({ ...value, lineWidth: Number(event.target.value) }))}><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>
        <label><span>{isArabic ? "لون التشبع الشرائي" : "Upper color"}</span><input type="color" value={rsiSettings.upperColor} onChange={(event) => setRsiSettings((value) => ({ ...value, upperColor: event.target.value }))} /></label>
        <label><span>{isArabic ? "لون التشبع البيعي" : "Lower color"}</span><input type="color" value={rsiSettings.lowerColor} onChange={(event) => setRsiSettings((value) => ({ ...value, lowerColor: event.target.value }))} /></label>
      </div>
    </section>}

    {settingsPanel === "momentum" && <section className="indicator-settings-panel">
      <div className="indicator-settings-title"><Layers3 size={17} /><div><b>{isArabic ? "إعدادات مؤشر مناطق الزخم السعرية" : "Price momentum settings"}</b><p>{isArabic ? "منطق المؤشر الأصلي على الشموع اليومية الموثقة." : "Original logic calculated from verified daily bars."}</p></div><button type="button" onClick={() => setMomentumSettings(momentumDefaults)}>{isArabic ? "الافتراضي" : "Defaults"}</button></div>
      <div className="settings-grid">
        <label><span>{isArabic ? "أيام البحث عن القمة" : "Peak lookback days"}</span><input type="number" min="6" max="30" value={momentumSettings.peakLookbackDays} onChange={(event) => setMomentumSettings((value) => ({ ...value, peakLookbackDays: Math.min(30, Math.max(6, Number(event.target.value) || 20)) }))} /></label>
        <label><span>{isArabic ? "شفافية المناطق" : "Zone opacity"}</span><input type="range" min="0" max="95" value={momentumSettings.zoneOpacity} onChange={(event) => setMomentumSettings((value) => ({ ...value, zoneOpacity: Number(event.target.value) }))} /></label>
        <label><span>{isArabic ? "لون القمة المرجعية" : "Peak color"}</span><input type="color" value={momentumSettings.peakLineColor} onChange={(event) => setMomentumSettings((value) => ({ ...value, peakLineColor: event.target.value }))} /></label>
        <label className="settings-check"><input type="checkbox" checked={momentumSettings.showPeakLine} onChange={(event) => setMomentumSettings((value) => ({ ...value, showPeakLine: event.target.checked }))} /><span>{isArabic ? "إظهار خط القمة" : "Show peak line"}</span></label>
        <label className="settings-check"><input type="checkbox" checked={momentumSettings.showZones} onChange={(event) => setMomentumSettings((value) => ({ ...value, showZones: event.target.checked }))} /><span>{isArabic ? "إظهار المناطق" : "Show zones"}</span></label>
        <label className="settings-check"><input type="checkbox" checked={momentumSettings.showStopLines} onChange={(event) => setMomentumSettings((value) => ({ ...value, showStopLines: event.target.checked }))} /><span>{isArabic ? "إظهار خطوط الوقف" : "Show stop lines"}</span></label>
        <label className="settings-check"><input type="checkbox" checked={momentumSettings.showInfoPanel} onChange={(event) => setMomentumSettings((value) => ({ ...value, showInfoPanel: event.target.checked }))} /><span>{isArabic ? "إظهار لوحة الأسعار" : "Show price panel"}</span></label>
      </div>
      <div className="momentum-zone-settings">{MOMENTUM_ZONE_DEFINITIONS.map((zone) => {
        const setting = momentumSettings.zones[zone.key];
        return <div key={zone.key} className="momentum-zone-setting">
          <b>{isArabic ? zone.nameAr : zone.nameEn}</b>
          <label className="settings-check"><input type="checkbox" checked={setting.visible} onChange={(event) => updateZoneSetting(zone.key, { visible: event.target.checked })} /><span>{isArabic ? "المنطقة" : "Zone"}</span></label>
          <input type="color" value={setting.color} onChange={(event) => updateZoneSetting(zone.key, { color: event.target.value })} title={isArabic ? "لون المنطقة" : "Zone color"} />
          <label className="settings-check"><input type="checkbox" checked={setting.stopVisible} onChange={(event) => updateZoneSetting(zone.key, { stopVisible: event.target.checked })} /><span>{isArabic ? "الوقف" : "Stop"}</span></label>
          <input type="color" value={setting.stopColor} onChange={(event) => updateZoneSetting(zone.key, { stopColor: event.target.value })} title={isArabic ? "لون الوقف" : "Stop color"} />
        </div>;
      })}</div>
    </section>}

    {hovered && <div className="ohlc-strip" dir="ltr"><span>O {formatNumber(hovered.open, "en")}</span><span>H {formatNumber(hovered.high, "en")}</span><span>L {formatNumber(hovered.low, "en")}</span><span>C {formatNumber(hovered.close, "en")}</span>{Number.isFinite(Number(hovered.volume)) && <span>VOL {formatNumber(hovered.volume, "en", 0)}</span>}{Number.isFinite(Number(hovered.rsi)) && <span>RSI {formatNumber(hovered.rsi, "en")}</span>}</div>}
    {loading && <div className="chart-message">{isArabic ? "جارٍ تحميل الشموع الحقيقية…" : "Loading verified candles…"}</div>}
    {error && <div className="chart-message text-red-600">{isArabic ? "تعذر جلب الشموع. لم تُستبدل ببيانات وهمية." : "Candles are unavailable. No mock data was substituted."}</div>}
    {!loading && !error && !candles.length && <div className="chart-message">{isArabic ? "لا توجد شموع موثقة لهذا النطاق." : "No verified candles for this range."}</div>}

    <div className={candles.length ? "chart-canvas-wrap" : "h-0"} style={candles.length ? { height: chartHeight } : undefined}>
      <div ref={containerRef} className="absolute inset-0" />
      <div className="momentum-zone-overlay" aria-hidden="true">{zoneGeometry.map((zone) => <div key={zone.key} className="momentum-zone-box" style={{ left: zone.left, width: zone.width, top: zone.top, height: zone.height, borderColor: zone.color, backgroundColor: colorWithOpacity(zone.color, Math.max(0.05, (100 - momentumSettings.zoneOpacity) / 100)) }}><span style={{ backgroundColor: zone.color }}>{zone.name} · {formatNumber(zone.topPrice, "en")}–{formatNumber(zone.bottomPrice, "en")}</span></div>)}</div>
      {showMomentum && momentumSettings.showInfoPanel && momentum?.zones?.length > 0 && <div className="momentum-price-panel">
        <div className="momentum-price-head"><span>{isArabic ? "المنطقة" : "Zone"}</span><span>{isArabic ? "من" : "From"}</span><span>{isArabic ? "إلى" : "To"}</span><span>{isArabic ? "الوقف" : "Stop"}</span></div>
        {momentum.zones.map((zone) => <div key={zone.key} className={zone.active === false ? "opacity-45" : ""}><b style={{ color: momentumSettings.zones[zone.key]?.color }}>{isArabic ? zone.nameAr : zone.nameEn}</b><span>{zone.active === false ? (isArabic ? "بانتظار" : "Waiting") : formatNumber(zone.top, "en")}</span><span>{zone.active === false ? "—" : formatNumber(zone.bottom, "en")}</span><span className="text-red-500">{zone.active === false ? "—" : formatNumber(zone.stop, "en")}</span></div>)}
      </div>}
    </div>
  </div>;
}
