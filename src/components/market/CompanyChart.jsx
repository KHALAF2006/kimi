import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CandlestickSeries, ColorType, createChart, HistogramSeries, LineSeries, LineStyle } from "lightweight-charts";
import { BarChart3, ChartCandlestick, ChevronLeft, ChevronRight, Eye, EyeOff, Flame, Layers3, Maximize2, Minus, Plus, RotateCcw, Settings2, SlidersHorizontal, TrendingUp, Waves } from "lucide-react";
import { invokeAppFunction } from "@/services/marketService";
import { calculateMomentumSnapshot, calculateRsiSeries, formatNumber, MOMENTUM_ZONE_DEFINITIONS, normalizeMomentum } from "@/lib/market";
import { calculateSmaSeries, reversalPatternMap } from "@/lib/technical-signals";
import { buildDisplayCandles, chartPreferencePayload, chartVisualDefaults, resolvedChartColors, sanitizeChartPreferences } from "@/lib/chart-visuals";
import { usePreferences } from "@/lib/preferences";
import ChartDrawingTools from "@/components/market/ChartDrawingTools";
import ChartSettingsSheet from "@/components/market/ChartSettingsSheet";

const intervalOptions = [
  { value: "15m", ar: "15 د", en: "15m", defaultRange: "5d" },
  { value: "1h", ar: "ساعة", en: "1H", defaultRange: "1mo" },
  { value: "2h", ar: "ساعتان", en: "2H", defaultRange: "3mo" },
  { value: "3h", ar: "3 ساعات", en: "3H", defaultRange: "3mo" },
  { value: "4h", ar: "4 ساعات", en: "4H", defaultRange: "3mo" },
  { value: "1d", ar: "يوم", en: "1D", defaultRange: "1y" },
  { value: "1wk", ar: "أسبوع", en: "1W", defaultRange: "5y" },
  { value: "1mo", ar: "شهر", en: "1M", defaultRange: "5y" },
];

const rangeOptions = [
  { value: "5d", ar: "5 أيام", en: "5D", intervals: ["15m", "1h", "2h", "3h", "4h", "1d"] },
  { value: "1mo", ar: "شهر", en: "1M", intervals: ["15m", "1h", "2h", "3h", "4h", "1d"] },
  { value: "3mo", ar: "3 أشهر", en: "3M", intervals: ["1h", "2h", "3h", "4h", "1d", "1wk"] },
  { value: "1y", ar: "سنة", en: "1Y", intervals: ["1h", "2h", "3h", "4h", "1d", "1wk", "1mo"] },
  { value: "5y", ar: "5 سنوات", en: "5Y", intervals: ["1d", "1wk", "1mo"] },
  { value: "max", ar: "تاريخي", en: "History", intervals: ["1d", "1wk", "1mo"] },
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

function formatChartDate(time, locale, includeTime = false) {
  const timestamp = typeof time === "number"
    ? time * 1000
    : Date.UTC(Number(time?.year || 1970), Number(time?.month || 1) - 1, Number(time?.day || 1));
  const options = /** @type {Intl.DateTimeFormatOptions} */ (includeTime
    ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }
    : { day: "2-digit", month: "short" });
  return new Intl.DateTimeFormat(locale, options).format(new Date(timestamp));
}

function normalizeCandles(values) {
  const seen = new Set();
  return values.map((candle) => {
    const price = (value) => value === null || value === undefined || value === "" ? null : Number(value);
    return {
      time: asChartTime(candle.time),
      open: price(candle.open),
      high: price(candle.high),
      low: price(candle.low),
      close: price(candle.close),
      volume: candle.volume === null || candle.volume === undefined || candle.volume === "" ? 0 : Number(candle.volume),
    };
  }).filter((candle) => Number.isFinite(candle.time)
      && [candle.open, candle.high, candle.low, candle.close].every((value) => Number.isFinite(value) && value > 0)
      && Number.isFinite(candle.volume) && candle.volume >= 0
      && candle.high >= Math.max(candle.open, candle.close)
      && candle.low <= Math.min(candle.open, candle.close))
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

function sameZoneGeometry(current, next) {
  if (current.length !== next.length) return false;
  return current.every((zone, index) => {
    const candidate = next[index];
    return candidate && zone.key === candidate.key && zone.color === candidate.color && zone.name === candidate.name
      && Math.abs(zone.left - candidate.left) < 0.25
      && Math.abs(zone.width - candidate.width) < 0.25
      && Math.abs(zone.top - candidate.top) < 0.25
      && Math.abs(zone.height - candidate.height) < 0.25
      && Number(zone.topPrice) === Number(candidate.topPrice)
      && Number(zone.bottomPrice) === Number(candidate.bottomPrice);
  });
}

export default function CompanyChart({ symbol = "", sector = "", marketCode = "SA_MAIN", momentum: rawMomentum = null, previousCompany = null, nextCompany = null, onSelectCompany = (_symbol) => {}, onResetWidth = () => {} }) {
  const { language, isArabic, theme } = usePreferences();
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const rsiSeriesRef = useRef(null);
  const sma20SeriesRef = useRef(null);
  const sma50SeriesRef = useRef(null);
  const actualPriceSeriesRef = useRef(null);
  const mainPaneHeightRef = useRef(470);
  const preferenceSaveQueueRef = useRef(/** @type {Promise<any>} */ (Promise.resolve(null)));
  const momentumLinesRef = useRef([]);
  const overlayUpdateRef = useRef(() => {});
  const overlayFrameRef = useRef(0);
  const [interval, setInterval] = useState(() => localStorage.getItem("kmy_chart_interval") || "1d");
  const [range, setRange] = useState(() => localStorage.getItem("kmy_chart_range") || "1y");
  const [candles, setCandles] = useState([]);
  const [indicatorCandles, setIndicatorCandles] = useState([]);
  const [historyMeta, setHistoryMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState(null);
  const [showMomentum, setShowMomentum] = useState(() => localStorage.getItem("kmy_show_momentum") !== "false");
  const [showMomentumCard, setShowMomentumCard] = useState(() => localStorage.getItem("kmy_show_momentum_card") !== "false");
  const [showVolume, setShowVolume] = useState(() => localStorage.getItem("kmy_show_volume") !== "false");
  const [showRsi, setShowRsi] = useState(() => localStorage.getItem("kmy_show_rsi") !== "false");
  const [settingsPanel, setSettingsPanel] = useState("");
  const [indicatorMenuOpen, setIndicatorMenuOpen] = useState(false);
  const [reversalMenuOpen, setReversalMenuOpen] = useState(false);
  const [candleTypeMenuOpen, setCandleTypeMenuOpen] = useState(false);
  const [chartSettingsOpen, setChartSettingsOpen] = useState(false);
  const [savingChartSettings, setSavingChartSettings] = useState(false);
  const [chartPreferences, setChartPreferences] = useState(() => sanitizeChartPreferences({
    ...storedObject("kmy_chart_preferences_v2", chartVisualDefaults(theme)),
    sma: storedObject("kmy_chart_preferences_v2", chartVisualDefaults(theme)).sma || {
      fast: { ...chartVisualDefaults(theme).sma.fast, enabled: localStorage.getItem("kmy_show_sma20") !== "false" },
      slow: { ...chartVisualDefaults(theme).sma.slow, enabled: localStorage.getItem("kmy_show_sma50") !== "false" },
    },
  }, theme));
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
  const [mainPaneHeight, setMainPaneHeight] = useState(470);
  mainPaneHeightRef.current = mainPaneHeight;
  const [, setChartRevision] = useState(0);
  const [drawingsVisible, setDrawingsVisible] = useState(true);
  const [drawingVisibilityCommand, setDrawingVisibilityCommand] = useState(null);
  const chartTarget = sector || symbol;
  const chartTitle = sector ? (isArabic ? `مؤشر قطاع ${sector}` : `${sector} sector index`) : (isArabic ? "الرسم البياني" : "Chart");

  const orderedCandles = useMemo(() => normalizeCandles(candles), [candles]);
  const resolvedVisuals = useMemo(() => resolvedChartColors(chartPreferences, theme), [chartPreferences, theme]);
  const reversalPatterns = useMemo(() => reversalPatternMap(orderedCandles), [orderedCandles]);
  const displayCandles = useMemo(() => {
    const display = buildDisplayCandles(orderedCandles, chartPreferences, theme);
    if (!["1d", "1wk"].includes(interval)) return display;
    return display.map((candle) => {
      const pattern = reversalPatterns.get(candle.time);
      const color = pattern?.engulfingDirection && chartPreferences.reversal.engulfing.enabled
        ? chartPreferences.reversal.engulfing.color
        : pattern?.pinDirection && chartPreferences.reversal.pinBar.enabled
          ? chartPreferences.reversal.pinBar.color
          : null;
      return color ? { ...candle, color, borderColor: color, wickColor: color } : candle;
    });
  }, [orderedCandles, chartPreferences, theme, interval, reversalPatterns]);
  const showSma20 = chartPreferences.sma.fast.enabled;
  const showSma50 = chartPreferences.sma.slow.enabled;
  const setShowSma20 = useCallback((next) => setChartPreferences((current) => sanitizeChartPreferences({
    ...current,
    sma: { ...current.sma, fast: { ...current.sma.fast, enabled: typeof next === "function" ? next(current.sma.fast.enabled) : Boolean(next) } },
  }, theme)), [theme]);
  const setShowSma50 = useCallback((next) => setChartPreferences((current) => sanitizeChartPreferences({
    ...current,
    sma: { ...current.sma, slow: { ...current.sma.slow, enabled: typeof next === "function" ? next(current.sma.slow.enabled) : Boolean(next) } },
  }, theme)), [theme]);
  const rsiData = useMemo(() => calculateRsiSeries(orderedCandles, rsiSettings.length, rsiSettings.source), [orderedCandles, rsiSettings.length, rsiSettings.source]);
  const sma20Data = useMemo(() => calculateSmaSeries(orderedCandles, chartPreferences.sma.fast.length), [orderedCandles, chartPreferences.sma.fast.length]);
  const sma50Data = useMemo(() => calculateSmaSeries(orderedCandles, chartPreferences.sma.slow.length), [orderedCandles, chartPreferences.sma.slow.length]);
  const orderedCandlesRef = useRef(orderedCandles);
  const displayCandlesRef = useRef(displayCandles);
  const rsiDataRef = useRef(rsiData);
  const sma20DataRef = useRef(sma20Data);
  const sma50DataRef = useRef(sma50Data);
  orderedCandlesRef.current = orderedCandles;
  displayCandlesRef.current = displayCandles;
  rsiDataRef.current = rsiData;
  sma20DataRef.current = sma20Data;
  sma50DataRef.current = sma50Data;
  const fallbackMomentum = useMemo(() => normalizeMomentum(rawMomentum, theme), [rawMomentum, theme]);
  const calculatedMomentum = useMemo(() => calculateMomentumSnapshot(indicatorCandles, momentumSettings.peakLookbackDays, Number.POSITIVE_INFINITY, theme), [indicatorCandles, momentumSettings.peakLookbackDays, theme]);
  const momentum = calculatedMomentum || fallbackMomentum;
  const availableRanges = rangeOptions.filter((item) => item.intervals.includes(interval));
  const chartHeight = 470 + (showVolume ? 115 : 0) + (showRsi ? 165 : 0);
  const investorZoneLabel = isArabic
    ? { "15m": "مناطق المستثمر لفاصل 15 دقيقة", "1h": "مناطق المستثمر الساعية", "2h": "مناطق المستثمر لساعتين", "3h": "مناطق المستثمر لثلاث ساعات", "4h": "مناطق المستثمر لأربع ساعات", "1d": "مناطق المستثمر اليومية", "1wk": "مناطق المستثمر الأسبوعية", "1mo": "مناطق المستثمر الشهرية" }[interval]
    : { "15m": "15-minute investor zones", "1h": "Hourly investor zones", "2h": "2-hour investor zones", "3h": "3-hour investor zones", "4h": "4-hour investor zones", "1d": "Daily investor zones", "1wk": "Weekly investor zones", "1mo": "Monthly investor zones" }[interval];
  const anyIndicatorVisible = showVolume || showMomentum || showRsi || showSma20 || showSma50;
  const anyReversalVisible = chartPreferences.reversal.pinBar.enabled || chartPreferences.reversal.engulfing.enabled;
  const onDrawingVisibilityChange = useCallback((visible) => setDrawingsVisible(visible), []);

  useEffect(() => {
    if (!chartTarget) return;
    let active = true;
    setLoading(true);
    setError("");
    invokeAppFunction("marketRead", sector
      ? { action: "sector_chart", sector, market_code: marketCode, interval, range }
      : { action: "chart", symbol, interval, range })
      .then((data) => {
        if (!active) return;
        setCandles(Array.isArray(data.candles) ? data.candles : []);
        setHistoryMeta(data.data_meta || null);
      })
      .catch((reason) => {
        if (!active) return;
        setCandles([]);
        setHistoryMeta(null);
        setError(reason?.response?.data?.error || reason?.message || "chart_fetch_failed");
      })
      .finally(() => active && setLoading(false));
    localStorage.setItem("kmy_chart_interval", interval);
    localStorage.setItem("kmy_chart_range", range);
    return () => { active = false; };
  }, [chartTarget, sector, symbol, marketCode, interval, range]);

  useEffect(() => {
    if (!chartTarget) return;
    let active = true;
    const indicatorRange = interval === "15m" ? "1mo" : ["1h", "2h", "3h", "4h"].includes(interval) ? "1y" : "max";
    invokeAppFunction("marketRead", sector
      ? { action: "sector_chart", sector, market_code: marketCode, interval, range: indicatorRange }
      : { action: "chart", symbol, interval, range: indicatorRange })
      .then((data) => active && setIndicatorCandles(Array.isArray(data.candles) ? data.candles : []))
      .catch(() => active && setIndicatorCandles([]));
    return () => { active = false; };
  }, [chartTarget, sector, symbol, marketCode, interval]);

  useEffect(() => {
    localStorage.setItem("kmy_show_momentum", String(showMomentum));
    localStorage.setItem("kmy_show_momentum_card", String(showMomentumCard));
    localStorage.setItem("kmy_show_volume", String(showVolume));
    localStorage.setItem("kmy_show_rsi", String(showRsi));
    localStorage.setItem("kmy_show_sma20", String(showSma20));
    localStorage.setItem("kmy_show_sma50", String(showSma50));
  }, [showMomentum, showMomentumCard, showVolume, showRsi, showSma20, showSma50]);

  useEffect(() => { localStorage.setItem("kmy_rsi_settings", JSON.stringify(rsiSettings)); }, [rsiSettings]);
  useEffect(() => { localStorage.setItem("kmy_momentum_settings", JSON.stringify(momentumSettings)); }, [momentumSettings]);
  useEffect(() => { localStorage.setItem("kmy_chart_preferences_v2", JSON.stringify(chartPreferencePayload(chartPreferences, theme))); }, [chartPreferences, theme]);

  useEffect(() => {
    const closeMenus = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && event.target.closest?.(".chart-menu-anchor, .chart-type-inline-panel")) return;
      setIndicatorMenuOpen(false);
      setReversalMenuOpen(false);
      setCandleTypeMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", closeMenus);
    return () => {
      document.removeEventListener("pointerdown", closeMenus);
      document.removeEventListener("keydown", closeMenus);
    };
  }, []);

  useEffect(() => {
    let active = true;
    invokeAppFunction("customerSelfService", { action: "get_chart_preferences" })
      .then((data) => {
        if (active && data?.preferences) setChartPreferences(sanitizeChartPreferences(data.preferences, theme));
      })
      .catch(() => {
        // Local preferences remain the fallback when the authenticated profile is unavailable.
      });
    return () => { active = false; };
  }, [theme]);

  async function saveChartPreferences(preferences) {
    const clean = sanitizeChartPreferences(preferences, theme);
    setChartPreferences(clean);
    setSavingChartSettings(true);
    try {
      const data = await persistChartPreferences(clean);
      if (data?.preferences) setChartPreferences(sanitizeChartPreferences(data.preferences, theme));
      setChartSettingsOpen(false);
    } catch {
      // The local copy is intentionally retained; the next explicit save retries the protected backend.
      setChartSettingsOpen(false);
    } finally {
      setSavingChartSettings(false);
    }
  }

  function persistChartPreferences(preferences) {
    const request = () => invokeAppFunction("customerSelfService", {
      action: "save_chart_preferences",
      preferences,
    });
    preferenceSaveQueueRef.current = preferenceSaveQueueRef.current.catch(() => null).then(request);
    return preferenceSaveQueueRef.current;
  }

  useEffect(() => {
    if (!containerRef.current) return;
    const dark = theme === "dark";
    const visual = resolvedChartColors(chartPreferences, theme);
    const chart = createChart(containerRef.current, {
      autoSize: false,
      width: Math.max(320, containerRef.current.clientWidth),
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: visual.backgroundColor },
        textColor: visual.textColor,
        fontFamily: "Tajawal",
        attributionLogo: false,
        panes: { separatorColor: dark ? "#243247" : "#dbe3ee", separatorHoverColor: "#f59e0b", enableResize: true },
      },
      grid: {
        vertLines: { color: visual.gridColor, visible: visual.gridVisible },
        horzLines: { color: visual.gridColor, visible: visual.gridVisible },
      },
      rightPriceScale: { borderVisible: true, borderColor: dark ? "#475569" : "#94a3b8", ticksVisible: true, minimumWidth: 74, scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: {
        borderVisible: true,
        borderColor: dark ? "#f59e0b" : "#d97706",
        ticksVisible: true,
        timeVisible: ["15m", "1h", "2h", "3h", "4h"].includes(interval),
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: interval === "15m" ? 7 : 9,
        minBarSpacing: 2,
        tickMarkFormatter: (time) => formatChartDate(time, language === "ar" ? "ar-SA" : "en-GB"),
      },
      crosshair: {
        mode: 0,
        vertLine: { color: dark ? "#64748b" : "#64748b", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#0f172a" },
        horzLine: { color: dark ? "#64748b" : "#64748b", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#0f172a" },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: {
        axisPressedMouseMove: { time: true, price: true },
        axisDoubleClickReset: { time: true, price: true },
        mouseWheel: true,
        pinch: true,
      },
      localization: { locale: language === "ar" ? "ar-SA" : "en-US" },
    });

    const candlesSeries = chart.addSeries(CandlestickSeries, {
      upColor: visual.upColor, downColor: visual.downColor, borderUpColor: visual.upColor, borderDownColor: visual.downColor, wickUpColor: visual.upColor, wickDownColor: visual.downColor,
      borderVisible: visual.borderVisible,
      wickVisible: visual.wickVisible,
      priceLineVisible: true,
      lastValueVisible: true,
    }, 0);
    candlesSeries.setData(displayCandlesRef.current.map(({ volume: _volume, sourceOpen: _sourceOpen, sourceHigh: _sourceHigh, sourceLow: _sourceLow, sourceClose: _sourceClose, ...candle }) => candle));
    const scheduleOverlayUpdate = () => {
      if (overlayFrameRef.current) window.cancelAnimationFrame(overlayFrameRef.current);
      overlayFrameRef.current = window.requestAnimationFrame(() => {
        overlayFrameRef.current = window.requestAnimationFrame(() => {
          overlayFrameRef.current = 0;
          overlayUpdateRef.current();
        });
      });
    };
    chart.subscribeCrosshairMove((param) => {
      const candle = /** @type {any} */ (param.seriesData.get(candlesSeries));
      const volume = volumeSeriesRef.current ? /** @type {any} */ (param.seriesData.get(volumeSeriesRef.current)) : null;
      const rsi = rsiSeriesRef.current ? /** @type {any} */ (param.seriesData.get(rsiSeriesRef.current)) : null;
      setHovered(candle && typeof candle.open === "number" ? { ...candle, time: param.time, volume: volume?.value, rsi: rsi?.value } : null);
      scheduleOverlayUpdate();
    });
    const doubleClickHandler = (param) => {
      if (!param.point || param.point.y > mainPaneHeightRef.current) return;
      setChartSettingsOpen(true);
    };
    chart.subscribeDblClick(doubleClickHandler);
    const visibleHandler = scheduleOverlayUpdate;
    chart.timeScale().subscribeVisibleLogicalRangeChange(visibleHandler);
    const resizeObserver = new ResizeObserver((entries) => {
      const width = Math.max(320, Math.floor(entries[0]?.contentRect?.width || containerRef.current?.clientWidth || 320));
      chart.resize(width, chartHeight);
      scheduleOverlayUpdate();
    });
    resizeObserver.observe(containerRef.current);
    const interactionEvents = ["wheel", "pointermove", "pointerdown", "pointerup", "touchmove", "dblclick"];
    interactionEvents.forEach((eventName) => containerRef.current?.addEventListener(eventName, scheduleOverlayUpdate, { passive: true }));

    chartRef.current = chart;
    candleSeriesRef.current = candlesSeries;
    sma20SeriesRef.current = chart.addSeries(LineSeries, {
      color: chartPreferences.sma.fast.color,
      lineWidth: /** @type {any} */ (chartPreferences.sma.fast.lineWidth),
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      visible: showSma20,
      title: `SMA ${chartPreferences.sma.fast.length}`,
    }, 0);
    sma50SeriesRef.current = chart.addSeries(LineSeries, {
      color: chartPreferences.sma.slow.color,
      lineWidth: /** @type {any} */ (chartPreferences.sma.slow.lineWidth),
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      visible: showSma50,
      title: `SMA ${chartPreferences.sma.slow.length}`,
    }, 0);
    actualPriceSeriesRef.current = chart.addSeries(LineSeries, {
      color: visual.textColor,
      lineVisible: false,
      pointMarkersVisible: false,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: chartPreferences.candleType === "heikin_ashi",
      title: isArabic ? "السعر الفعلي" : "Actual price",
    }, 0);
    actualPriceSeriesRef.current.setData(orderedCandlesRef.current.map((candle) => ({ time: candle.time, value: candle.close })));
    sma20SeriesRef.current.setData(sma20DataRef.current);
    sma50SeriesRef.current.setData(sma50DataRef.current);
    setChartRevision((value) => value + 1);
    volumeSeriesRef.current = null;
    rsiSeriesRef.current = null;
    window.requestAnimationFrame(() => {
      const panes = chart.panes();
      panes[0]?.setHeight(470);
      overlayUpdateRef.current();
    });
    return () => {
      resizeObserver.disconnect();
      interactionEvents.forEach((eventName) => containerRef.current?.removeEventListener(eventName, scheduleOverlayUpdate));
      if (overlayFrameRef.current) window.cancelAnimationFrame(overlayFrameRef.current);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(visibleHandler);
      chart.unsubscribeDblClick(doubleClickHandler);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      rsiSeriesRef.current = null;
      sma20SeriesRef.current = null;
      sma50SeriesRef.current = null;
      actualPriceSeriesRef.current = null;
      momentumLinesRef.current = [];
    };
  }, [theme, language, interval]);

  useEffect(() => {
    sma20SeriesRef.current?.applyOptions({
      visible: showSma20,
      color: chartPreferences.sma.fast.color,
      lineWidth: /** @type {any} */ (chartPreferences.sma.fast.lineWidth),
      title: `SMA ${chartPreferences.sma.fast.length}`,
    });
    sma50SeriesRef.current?.applyOptions({
      visible: showSma50,
      color: chartPreferences.sma.slow.color,
      lineWidth: /** @type {any} */ (chartPreferences.sma.slow.lineWidth),
      title: `SMA ${chartPreferences.sma.slow.length}`,
    });
  }, [showSma20, showSma50, chartPreferences.sma.fast, chartPreferences.sma.slow]);

  useEffect(() => {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series) return;
    chart.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: resolvedVisuals.backgroundColor },
        textColor: resolvedVisuals.textColor,
      },
      grid: {
        vertLines: { color: resolvedVisuals.gridColor, visible: resolvedVisuals.gridVisible },
        horzLines: { color: resolvedVisuals.gridColor, visible: resolvedVisuals.gridVisible },
      },
    });
    series.applyOptions({
      upColor: resolvedVisuals.upColor,
      downColor: resolvedVisuals.downColor,
      borderUpColor: resolvedVisuals.upColor,
      borderDownColor: resolvedVisuals.downColor,
      wickUpColor: resolvedVisuals.upColor,
      wickDownColor: resolvedVisuals.downColor,
      borderVisible: resolvedVisuals.borderVisible,
      wickVisible: resolvedVisuals.wickVisible,
    });
    actualPriceSeriesRef.current?.applyOptions({
      color: resolvedVisuals.textColor,
      lastValueVisible: chartPreferences.candleType === "heikin_ashi",
      title: isArabic ? "السعر الفعلي" : "Actual price",
    });
  }, [resolvedVisuals, chartPreferences.candleType, isArabic]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const visibleRange = chart.timeScale().getVisibleLogicalRange();

    if (rsiSeriesRef.current) chart.removeSeries(rsiSeriesRef.current);
    if (volumeSeriesRef.current) chart.removeSeries(volumeSeriesRef.current);
    rsiSeriesRef.current = null;
    volumeSeriesRef.current = null;

    let nextPane = 1;
    if (showVolume) {
      volumeSeriesRef.current = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "right",
        lastValueVisible: true,
        priceLineVisible: false,
      }, nextPane++);
      volumeSeriesRef.current.setData(orderedCandlesRef.current.map((candle) => ({ time: candle.time, value: candle.volume, color: candle.close >= candle.open ? "#16a34acc" : "#dc2626cc" })));
    }

    if (showRsi) {
      const dark = theme === "dark";
      rsiSeriesRef.current = chart.addSeries(LineSeries, {
        color: rsiSettings.lineColor,
        lineWidth: /** @type {1 | 2 | 3 | 4} */ (Number(rsiSettings.lineWidth) || 2),
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }),
      }, nextPane++);
      rsiSeriesRef.current.setData(rsiDataRef.current);
      rsiSeriesRef.current.createPriceLine({ price: Number(rsiSettings.upper), color: rsiSettings.upperColor, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: isArabic ? "تشبع شرائي" : "Overbought" });
      rsiSeriesRef.current.createPriceLine({ price: 50, color: dark ? "#475569" : "#94a3b8", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: "50" });
      rsiSeriesRef.current.createPriceLine({ price: Number(rsiSettings.lower), color: rsiSettings.lowerColor, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: isArabic ? "تشبع بيعي" : "Oversold" });
    }

    chart.applyOptions({ height: chartHeight });
    window.requestAnimationFrame(() => {
      const panes = chart.panes();
      panes[0]?.setHeight(470);
      if (showVolume) panes[1]?.setHeight(115);
      if (showRsi) panes[showVolume ? 2 : 1]?.setHeight(165);
      if (visibleRange) chart.timeScale().setVisibleLogicalRange(visibleRange);
      overlayUpdateRef.current();
    });
  }, [showVolume, showRsi, rsiSettings.lineColor, rsiSettings.lineWidth, rsiSettings.upper, rsiSettings.lower, rsiSettings.upperColor, rsiSettings.lowerColor, chartHeight, theme, language, interval, isArabic]);

  useEffect(() => {
    candleSeriesRef.current?.setData(displayCandles.map(({ volume: _volume, sourceOpen: _sourceOpen, sourceHigh: _sourceHigh, sourceLow: _sourceLow, sourceClose: _sourceClose, ...candle }) => candle));
    volumeSeriesRef.current?.setData(orderedCandles.map((candle) => ({ time: candle.time, value: candle.volume, color: candle.close >= candle.open ? "#16a34acc" : "#dc2626cc" })));
    rsiSeriesRef.current?.setData(rsiData);
    sma20SeriesRef.current?.setData(sma20Data);
    sma50SeriesRef.current?.setData(sma50Data);
    actualPriceSeriesRef.current?.setData(orderedCandles.map((candle) => ({ time: candle.time, value: candle.close })));
    if (orderedCandles.length) chartRef.current?.timeScale().fitContent();
    window.requestAnimationFrame(() => overlayUpdateRef.current());
  }, [orderedCandles, displayCandles, rsiData, sma20Data, sma50Data]);

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
      if (momentumSettings.showZones && zoneSetting.visible) {
        momentumLinesRef.current.push(series.createPriceLine({ price: Number(zone.top), color: zoneSetting.color, lineWidth: 2, lineStyle: LineStyle.Solid, axisLabelVisible: false, title: "" }));
        momentumLinesRef.current.push(series.createPriceLine({ price: Number(zone.bottom), color: zoneSetting.color, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: "" }));
      }
      if (momentumSettings.showStopLines && zoneSetting.stopVisible) {
        momentumLinesRef.current.push(series.createPriceLine({ price: Number(zone.stop), color: zoneSetting.stopColor, lineWidth: zone.key === "zone4" || zone.key === "zone5" ? 3 : 2, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: "" }));
      }
    });
    window.requestAnimationFrame(() => overlayUpdateRef.current());
  }, [momentum, showMomentum, momentumSettings, isArabic, showVolume, showRsi]);

  useEffect(() => {
    overlayUpdateRef.current = () => {
      const chart = chartRef.current;
      const series = candleSeriesRef.current;
      const container = containerRef.current;
      const measuredMainPaneHeight = chart?.panes?.()[0]?.getHeight?.() || 470;
      setMainPaneHeight((current) => Math.abs(current - measuredMainPaneHeight) < 0.5 ? current : measuredMainPaneHeight);
      if (!chart || !series || !container || !showMomentum || !momentumSettings.showZones || !momentum?.zones?.length) {
        setZoneGeometry((current) => current.length ? [] : current);
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
        const unclippedTop = Math.min(top, bottom);
        const unclippedBottom = Math.max(top, bottom);
        const clippedTop = Math.max(0, Math.min(mainPaneHeight, unclippedTop));
        const clippedBottom = Math.max(0, Math.min(mainPaneHeight, unclippedBottom));
        if (clippedBottom <= clippedTop) return null;
        return {
          key: zone.key,
          left,
          width: Math.max(0, right - left),
          top: clippedTop,
          height: Math.max(2, clippedBottom - clippedTop),
          color: setting.color,
          name: isArabic ? zone.nameAr : zone.nameEn,
          topPrice: zone.top,
          bottomPrice: zone.bottom,
        };
      }).filter(Boolean);
      setZoneGeometry((current) => sameZoneGeometry(current, zones) ? current : zones);
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

  function resetChartView() {
    const chart = chartRef.current;
    if (!chart) return;
    chart.timeScale().resetTimeScale();
    chart.timeScale().fitContent();
    chart.priceScale("right").applyOptions({ autoScale: true, scaleMargins: { top: 0.08, bottom: 0.08 } });
    window.requestAnimationFrame(() => {
      const panes = chart.panes();
      panes[0]?.setHeight(470);
      if (showVolume) panes[1]?.setHeight(115);
      if (showRsi) panes[showVolume ? 2 : 1]?.setHeight(165);
      overlayUpdateRef.current();
    });
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

  function setAllIndicators(visible) {
    setShowVolume(visible);
    setShowMomentum(visible);
    setShowRsi(visible);
    setShowSma20(visible);
    setShowSma50(visible);
    setShowMomentumCard(visible);
    if (!visible) setSettingsPanel("");
  }

  function toggleAllIndicators() {
    setAllIndicators(!anyIndicatorVisible);
  }

  function toggleAllChartObjects() {
    const nextVisible = !(anyIndicatorVisible || anyReversalVisible || drawingsVisible);
    setAllIndicators(nextVisible);
    const next = sanitizeChartPreferences({
      ...chartPreferences,
      reversal: {
        pinBar: { ...chartPreferences.reversal.pinBar, enabled: nextVisible },
        engulfing: { ...chartPreferences.reversal.engulfing, enabled: nextVisible },
      },
    }, theme);
    setChartPreferences(next);
    persistChartPreferences(next).catch(() => {});
    setDrawingVisibilityCommand({ id: Date.now(), visible: nextVisible });
  }

  function selectCandleType(candleType) {
    const next = sanitizeChartPreferences({ ...chartPreferences, candleType }, theme);
    setChartPreferences(next);
    setCandleTypeMenuOpen(false);
    persistChartPreferences(next).catch(() => {});
  }

  function toggleSmaSlot(slot) {
    const next = sanitizeChartPreferences({
      ...chartPreferences,
      sma: {
        ...chartPreferences.sma,
        [slot]: { ...chartPreferences.sma[slot], enabled: !chartPreferences.sma[slot].enabled },
      },
    }, theme);
    setChartPreferences(next);
    persistChartPreferences(next).catch(() => {});
  }

  function updateReversalPattern(key, patch) {
    const next = sanitizeChartPreferences({
      ...chartPreferences,
      reversal: { ...chartPreferences.reversal, [key]: { ...chartPreferences.reversal[key], ...patch } },
    }, theme);
    setChartPreferences(next);
    persistChartPreferences(next).catch(() => {});
  }

  const candleTypeLabel = {
    candles: isArabic ? "شموع عادية" : "Candles",
    hollow: isArabic ? "شموع مفرغة" : "Hollow candles",
    heikin_ashi: isArabic ? "هايكن آشي" : "Heikin Ashi",
  }[chartPreferences.candleType];

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
        <h3 className="font-black">{chartTitle}</h3>
      </div>
      {!sector && <div className="company-navigation chart-company-navigation">
        <button type="button" disabled={!previousCompany} onClick={() => previousCompany && onSelectCompany?.(previousCompany.symbol)} title={isArabic ? "الشركة السابقة حسب القائمة الحالية" : "Previous company in current list"}><ChevronRight size={16} /><span><small>{isArabic ? "السابق" : "Previous"}</small><b>{previousCompany ? (isArabic ? previousCompany.name_ar : previousCompany.name_en) : "—"}</b></span></button>
        <button className="secondary-button" onClick={onResetWidth}><RotateCcw size={14} />{isArabic ? "الحجم الطبيعي" : "Reset size"}</button>
        <button type="button" disabled={!nextCompany} onClick={() => nextCompany && onSelectCompany?.(nextCompany.symbol)} title={isArabic ? "الشركة التالية حسب القائمة الحالية" : "Next company in current list"}><span><small>{isArabic ? "التالي" : "Next"}</small><b>{nextCompany ? (isArabic ? nextCompany.name_ar : nextCompany.name_en) : "—"}</b></span><ChevronLeft size={16} /></button>
      </div>}
      <div className="flex flex-wrap items-center gap-2">
        <div className="chart-menu-anchor">
          <button type="button" className="chart-type-button" onClick={() => { setIndicatorMenuOpen(false); setReversalMenuOpen(false); setCandleTypeMenuOpen((value) => !value); }} title={isArabic ? "تغيير نوع الشموع" : "Change candle type"} aria-expanded={candleTypeMenuOpen} aria-label={isArabic ? `نوع الشموع: ${candleTypeLabel}` : `Candle type: ${candleTypeLabel}`}><ChartCandlestick size={17} /><span>{candleTypeLabel}</span><ChevronLeft size={14} /></button>
        </div>
        <button type="button" className="icon-button" onClick={() => setChartSettingsOpen(true)} title={isArabic ? "إعدادات الشارت" : "Chart settings"} aria-label={isArabic ? "فتح إعدادات الشارت" : "Open chart settings"}><Settings2 size={17} /></button>
        <button className="icon-button" onClick={() => zoom(0.75)} title={isArabic ? "تكبير" : "Zoom in"}><Plus size={17} /></button>
        <button className="icon-button" onClick={() => zoom(1.35)} title={isArabic ? "تصغير" : "Zoom out"}><Minus size={17} /></button>
        <button className="icon-button" onClick={resetChartView} title={isArabic ? "إعادة الرسم للوضع الطبيعي" : "Reset chart view"}><RotateCcw size={17} /></button>
        <button className="icon-button" onClick={toggleFullscreen} title={isArabic ? "ملء الشاشة" : "Fullscreen"}><Maximize2 size={17} /></button>
      </div>
    </div>

    {candleTypeMenuOpen && <div role="menu" className="chart-type-popover chart-type-inline-panel" dir={isArabic ? "rtl" : "ltr"}>
      <b>{isArabic ? "نوع عرض الشموع" : "Candle display"}</b>
      <p>{isArabic ? "اختر نوعاً واحداً؛ وتبقى المؤشرات في صف مستقل دون تداخل." : "Choose one type; indicators remain in a separate row without overlap."}</p>
      {[
        ["candles", isArabic ? "شموع عادية" : "Candles"],
        ["hollow", isArabic ? "شموع مفرغة" : "Hollow candles"],
        ["heikin_ashi", isArabic ? "هايكن آشي" : "Heikin Ashi"],
      ].map(([value, label]) => <button type="button" key={value} className={chartPreferences.candleType === value ? "active" : ""} onClick={() => selectCandleType(value)} aria-pressed={chartPreferences.candleType === value}><ChartCandlestick size={17} /><span>{label}</span>{chartPreferences.candleType === value && <span aria-hidden="true">✓</span>}</button>)}
    </div>}

    <div className="chart-toolbar-grid">
      <div className="chart-control-group"><span>{isArabic ? "الفاصل" : "Interval"}</span><div>{intervalOptions.map((item) => <button type="button" key={item.value} onClick={() => changeInterval(item.value)} className={"chart-chip " + (interval === item.value ? "chart-chip-active" : "")}>{isArabic ? item.ar : item.en}</button>)}</div></div>
      <div className="chart-control-group"><span>{isArabic ? "النطاق" : "Range"}</span><div>{availableRanges.map((item) => <button type="button" key={item.value} onClick={() => setRange(item.value)} className={"chart-chip " + (range === item.value ? "chart-chip-active" : "")}>{isArabic ? item.ar : item.en}</button>)}</div></div>
    </div>

    <div className="indicator-toolbar indicator-toolbar-compact">
      <div className="chart-menu-anchor">
        <button type="button" className={"indicator-hub-button " + (anyIndicatorVisible ? "active" : "")} onClick={() => { setCandleTypeMenuOpen(false); setReversalMenuOpen(false); setIndicatorMenuOpen((value) => !value); }} aria-expanded={indicatorMenuOpen}><SlidersHorizontal size={17} /><span>{isArabic ? "المؤشرات" : "Indicators"}</span><small>{[showVolume, showMomentum, showRsi, showSma20, showSma50].filter(Boolean).length}</small></button>
        {indicatorMenuOpen && <div role="menu" className="indicator-hub-popover" dir={isArabic ? "rtl" : "ltr"}>
          <header><div><b>{isArabic ? "المؤشرات" : "Indicators"}</b><p>{isArabic ? "إغلاق هذه القائمة لا يخفي المؤشرات المفعلة." : "Closing this menu keeps active indicators visible."}</p></div><button type="button" data-action="toggle-all-indicators" onClick={toggleAllIndicators}>{anyIndicatorVisible ? <EyeOff size={15} /> : <Eye size={15} />}{anyIndicatorVisible ? (isArabic ? "إخفاء الكل" : "Hide all") : (isArabic ? "إظهار الكل" : "Show all")}</button></header>
          {[
            { key: "volume", label: isArabic ? "أحجام التداول" : "Volume", icon: BarChart3, active: showVolume, toggle: () => setShowVolume((value) => !value) },
            { key: "momentum", label: investorZoneLabel, icon: Layers3, active: showMomentum, toggle: () => setShowMomentum((value) => !value), settings: () => { setSettingsPanel((value) => value === "momentum" ? "" : "momentum"); setIndicatorMenuOpen(false); } },
            { key: "rsi", label: isArabic ? "مؤشر القوة النسبية" : "RSI", icon: Waves, active: showRsi, toggle: () => setShowRsi((value) => !value), settings: () => { setSettingsPanel((value) => value === "rsi" ? "" : "rsi"); setIndicatorMenuOpen(false); } },
            { key: "sma-fast", label: isArabic ? `المتوسط البسيط ${chartPreferences.sma.fast.length}` : `SMA ${chartPreferences.sma.fast.length}`, icon: TrendingUp, active: showSma20, color: chartPreferences.sma.fast.color, toggle: () => toggleSmaSlot("fast"), settings: () => { setIndicatorMenuOpen(false); setChartSettingsOpen(true); } },
            { key: "sma-slow", label: isArabic ? `المتوسط البسيط ${chartPreferences.sma.slow.length}` : `SMA ${chartPreferences.sma.slow.length}`, icon: TrendingUp, active: showSma50, color: chartPreferences.sma.slow.color, toggle: () => toggleSmaSlot("slow"), settings: () => { setIndicatorMenuOpen(false); setChartSettingsOpen(true); } },
          ].map((item) => {
            const Icon = item.icon;
            return <div key={item.key} className={"indicator-hub-row " + (item.active ? "active" : "")}>
              <button type="button" className="indicator-hub-toggle" onClick={item.toggle} aria-pressed={item.active}><span className="indicator-hub-icon" style={item.color ? { color: item.color } : undefined}><Icon size={16} /></span><span>{item.label}</span>{item.active ? <Eye size={15} /> : <EyeOff size={15} />}</button>
              {item.settings && <button type="button" className="indicator-hub-settings" onClick={item.settings} aria-label={(isArabic ? "إعدادات " : "Settings for ") + item.label}><Settings2 size={15} /></button>}
            </div>;
          })}
          {symbol && <button type="button" className="indicator-everything-button" data-action="toggle-all-chart-objects" onClick={toggleAllChartObjects}>{anyIndicatorVisible || anyReversalVisible || drawingsVisible ? <EyeOff size={15} /> : <Eye size={15} />}{anyIndicatorVisible || anyReversalVisible || drawingsVisible ? (isArabic ? "إخفاء الرسومات والمؤشرات" : "Hide drawings and indicators") : (isArabic ? "إظهار الرسومات والمؤشرات" : "Show drawings and indicators")}</button>}
        </div>}
      </div>
      <div className="chart-menu-anchor">
        <button type="button" className={"indicator-hub-button reversal-hub-button " + ((chartPreferences.reversal.pinBar.enabled || chartPreferences.reversal.engulfing.enabled) ? "active" : "")} onClick={() => { setCandleTypeMenuOpen(false); setIndicatorMenuOpen(false); setReversalMenuOpen((value) => !value); }} aria-expanded={reversalMenuOpen}><Flame size={17} /><span>{isArabic ? "الشموع الانعكاسية" : "Reversal candles"}</span><small>{[chartPreferences.reversal.pinBar.enabled, chartPreferences.reversal.engulfing.enabled].filter(Boolean).length}</small></button>
        {reversalMenuOpen && <div role="menu" className="indicator-hub-popover reversal-hub-popover" dir={isArabic ? "rtl" : "ltr"}>
          <header><div><b>{isArabic ? "الشموع الانعكاسية" : "Reversal candles"}</b><p>{["1d", "1wk"].includes(interval) ? (isArabic ? "تحسب من شموع OHLC المغلقة الحقيقية." : "Calculated from real closed OHLC candles.") : (isArabic ? "تظهر العلامات على الفاصل اليومي والأسبوعي." : "Pattern coloring is available on daily and weekly intervals.")}</p></div></header>
          {[["pinBar", isArabic ? "بن بار" : "Pin bar"], ["engulfing", isArabic ? "شمعة بالعة" : "Engulfing candle"]].map(([key, label]) => {
            const value = chartPreferences.reversal[key];
            return <div key={key} className={"reversal-pattern-row " + (value.enabled ? "active" : "")}>
              <button type="button" onClick={() => updateReversalPattern(key, { enabled: !value.enabled })} aria-pressed={value.enabled}><span className="reversal-color-dot" style={{ backgroundColor: value.color }} /><span>{label}</span>{value.enabled ? <Eye size={15} /> : <EyeOff size={15} />}</button>
              <label title={isArabic ? `لون ${label}` : `${label} color`}><input type="color" value={value.color} onChange={(event) => updateReversalPattern(key, { color: event.target.value })} /><span className="sr-only">{isArabic ? `لون ${label}` : `${label} color`}</span></label>
            </div>;
          })}
        </div>}
      </div>
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
      <div className="indicator-settings-title"><Layers3 size={17} /><div><b>{isArabic ? `إعدادات ${investorZoneLabel}` : `${investorZoneLabel} settings`}</b><p>{isArabic ? "حساب المناطق من شموع الفاصل المعروض وفق صيغة ثابتة الإصدار." : "Zones calculated from the selected interval using a versioned formula."}</p></div><button type="button" onClick={() => setMomentumSettings(momentumDefaults)}>{isArabic ? "الافتراضي" : "Defaults"}</button></div>
      <div className="settings-grid">
        <label><span>{isArabic ? "أيام البحث عن القمة" : "Peak lookback days"}</span><input type="number" min="6" max="30" value={momentumSettings.peakLookbackDays} onChange={(event) => setMomentumSettings((value) => ({ ...value, peakLookbackDays: Math.min(30, Math.max(6, Number(event.target.value) || 20)) }))} /></label>
        <label><span>{isArabic ? "شفافية المناطق" : "Zone opacity"}</span><input type="range" min="0" max="95" value={momentumSettings.zoneOpacity} onChange={(event) => setMomentumSettings((value) => ({ ...value, zoneOpacity: Number(event.target.value) }))} /></label>
        <label><span>{isArabic ? "لون القمة المرجعية" : "Peak color"}</span><input type="color" value={momentumSettings.peakLineColor} onChange={(event) => setMomentumSettings((value) => ({ ...value, peakLineColor: event.target.value }))} /></label>
        <label className="settings-check"><input type="checkbox" checked={momentumSettings.showPeakLine} onChange={(event) => setMomentumSettings((value) => ({ ...value, showPeakLine: event.target.checked }))} /><span>{isArabic ? "إظهار خط القمة" : "Show peak line"}</span></label>
        <label className="settings-check"><input type="checkbox" checked={momentumSettings.showZones} onChange={(event) => setMomentumSettings((value) => ({ ...value, showZones: event.target.checked }))} /><span>{isArabic ? "إظهار المناطق" : "Show zones"}</span></label>
        <label className="settings-check"><input type="checkbox" checked={momentumSettings.showStopLines} onChange={(event) => setMomentumSettings((value) => ({ ...value, showStopLines: event.target.checked }))} /><span>{isArabic ? "إظهار خطوط الوقف" : "Show stop lines"}</span></label>
        <label className="settings-check"><input type="checkbox" checked={showMomentumCard} onChange={(event) => setShowMomentumCard(event.target.checked)} /><span>{isArabic ? "إظهار بطاقة أسعار المناطق" : "Show zone price card"}</span></label>
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

    <div className={"ohlc-strip " + (hovered ? "" : "invisible")} dir="ltr" aria-hidden={!hovered}>{hovered ? <><time>{formatChartDate(hovered.time, isArabic ? "ar-SA" : "en-GB", interval === "15m" || interval === "1h")}</time>{chartPreferences.candleType === "heikin_ashi" && <b>HA</b>}<span>O {formatNumber(hovered.open, "en")}</span><span>H {formatNumber(hovered.high, "en")}</span><span>L {formatNumber(hovered.low, "en")}</span><span>C {formatNumber(hovered.close, "en")}</span>{Number.isFinite(Number(hovered.volume)) && <span>VOL {formatNumber(hovered.volume, "en", 0)}</span>}{Number.isFinite(Number(hovered.rsi)) && <span>RSI {formatNumber(hovered.rsi, "en")}</span>}</> : <span>&nbsp;</span>}</div>
    {loading && <div className="chart-message">{isArabic ? "جارٍ تحميل الشموع الحقيقية…" : "Loading verified candles…"}</div>}
    {error && <div className="chart-message text-red-600">{isArabic ? "تعذر جلب الشموع." : "Candles are unavailable."}</div>}
    {!loading && !error && !candles.length && <div className="chart-message">{isArabic ? "لا توجد شموع موثقة لهذا النطاق." : "No verified candles for this range."}</div>}
    {!loading && !error && range === "max" && historyMeta?.history_complete !== true && <div className="chart-history-status" role="status">{isArabic ? "السجل التاريخي لهذا السهم غير مكتمل بعد؛ المعروض هو الجزء المحفوظ فقط." : "This instrument's historical archive is not complete yet; only stored candles are shown."}</div>}

    <div className={candles.length ? "chart-canvas-wrap" : "h-0"} style={candles.length ? { height: chartHeight } : undefined}>
      <div ref={containerRef} className="absolute inset-0" />
      <div className="momentum-zone-overlay" aria-hidden="true">{zoneGeometry.map((zone) => <div key={zone.key} className="momentum-zone-box" style={{ left: zone.left, width: zone.width, top: zone.top, height: zone.height, borderColor: zone.color, backgroundColor: colorWithOpacity(zone.color, Math.max(0.05, (100 - momentumSettings.zoneOpacity) / 100)) }}><span style={{ backgroundColor: zone.color }}>{zone.name}</span></div>)}</div>
      {symbol && chartRef.current && candleSeriesRef.current && <ChartDrawingTools chart={chartRef.current} series={candleSeriesRef.current} symbol={symbol} interval={interval} mainPaneHeight={mainPaneHeight} isArabic={isArabic} onResetChart={resetChartView} visibilityCommand={drawingVisibilityCommand} onDrawingVisibilityChange={onDrawingVisibilityChange} />}
      {showMomentum && momentum?.zones?.length > 0 && <div className={"momentum-price-panel " + (!showMomentumCard ? "momentum-price-panel-collapsed" : "")}>
        <button type="button" className="momentum-card-eye" onClick={() => setShowMomentumCard((value) => !value)} title={showMomentumCard ? (isArabic ? "إخفاء بطاقة أسعار المناطق" : "Hide zone price card") : (isArabic ? "إظهار بطاقة أسعار المناطق" : "Show zone price card")} aria-expanded={showMomentumCard}>{showMomentumCard ? <EyeOff size={14} /> : <Eye size={14} />}<span>{investorZoneLabel}</span></button>
        {showMomentumCard && <><div className="momentum-price-head"><span>{isArabic ? "المنطقة" : "Zone"}</span><span>{isArabic ? "من" : "From"}</span><span>{isArabic ? "إلى" : "To"}</span><span>{isArabic ? "الوقف" : "Stop"}</span></div>
        {momentum.zones.map((zone) => <div key={zone.key} className={zone.active === false ? "opacity-45" : ""}><b style={{ color: momentumSettings.zones[zone.key]?.color }}>{isArabic ? zone.nameAr : zone.nameEn}</b><span>{zone.active === false ? (isArabic ? "بانتظار" : "Waiting") : formatNumber(zone.top, "en")}</span><span>{zone.active === false ? "—" : formatNumber(zone.bottom, "en")}</span><span className="text-red-500">{zone.active === false ? "—" : formatNumber(zone.stop, "en")}</span></div>)}</>}
      </div>}
    </div>
    <ChartSettingsSheet open={chartSettingsOpen} onOpenChange={setChartSettingsOpen} preferences={chartPreferences} onApply={saveChartPreferences} theme={theme} isArabic={isArabic} saving={savingChartSettings} />
  </div>;
}
