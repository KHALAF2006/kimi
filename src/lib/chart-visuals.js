const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const CANDLE_TYPES = new Set(["candles", "hollow", "heikin_ashi"]);
const REVERSAL_DEFAULTS = {
  pinBar: { enabled: true, color: "#facc15" },
  engulfing: { enabled: true, color: "#a855f7" },
};

export const SMA_SLOT_DEFAULTS = {
  fast: { enabled: true, length: 20, color: "#2563eb", lineWidth: 2 },
  slow: { enabled: true, length: 50, color: "#f59e0b", lineWidth: 2 },
};

export function chartVisualDefaults(theme = "light") {
  const dark = theme === "dark";
  return {
    candleType: "candles",
    backgroundMode: "theme",
    backgroundColor: dark ? "#091321" : "#ffffff",
    textColor: dark ? "#cbd5e1" : "#475569",
    gridVisible: true,
    gridColor: dark ? "#172337" : "#edf1f6",
    upColor: "#16a34a",
    downColor: "#dc2626",
    wickVisible: true,
    borderVisible: true,
    sma: {
      fast: { ...SMA_SLOT_DEFAULTS.fast },
      slow: { ...SMA_SLOT_DEFAULTS.slow },
    },
    reversal: {
      pinBar: { ...REVERSAL_DEFAULTS.pinBar },
      engulfing: { ...REVERSAL_DEFAULTS.engulfing },
    },
  };
}

function cleanColor(value, fallback) {
  return HEX_COLOR.test(String(value || "")) ? String(value).toLowerCase() : fallback;
}

function cleanSma(value, fallback) {
  return {
    enabled: value?.enabled !== false,
    length: Math.max(1, Math.min(500, Math.round(Number(value?.length) || fallback.length))),
    color: cleanColor(value?.color, fallback.color),
    lineWidth: Math.max(1, Math.min(5, Math.round(Number(value?.lineWidth) || fallback.lineWidth))),
  };
}

export function sanitizeChartPreferences(value, theme = "light") {
  const defaults = chartVisualDefaults(theme);
  const source = value && typeof value === "object" ? value : {};
  const backgroundMode = source.backgroundMode === "custom" ? "custom" : "theme";
  return {
    candleType: CANDLE_TYPES.has(source.candleType) ? source.candleType : defaults.candleType,
    backgroundMode,
    backgroundColor: cleanColor(source.backgroundColor, defaults.backgroundColor),
    textColor: cleanColor(source.textColor, defaults.textColor),
    gridVisible: source.gridVisible !== false,
    gridColor: cleanColor(source.gridColor, defaults.gridColor),
    upColor: cleanColor(source.upColor, defaults.upColor),
    downColor: cleanColor(source.downColor, defaults.downColor),
    wickVisible: source.wickVisible !== false,
    borderVisible: source.borderVisible !== false,
    sma: {
      fast: cleanSma(source.sma?.fast, defaults.sma.fast),
      slow: cleanSma(source.sma?.slow, defaults.sma.slow),
    },
    reversal: {
      pinBar: {
        enabled: source.reversal?.pinBar?.enabled !== false,
        color: cleanColor(source.reversal?.pinBar?.color, defaults.reversal.pinBar.color),
      },
      engulfing: {
        enabled: source.reversal?.engulfing?.enabled !== false,
        color: cleanColor(source.reversal?.engulfing?.color, defaults.reversal.engulfing.color),
      },
    },
  };
}

export function resolvedChartColors(preferences, theme = "light") {
  const safe = sanitizeChartPreferences(preferences, theme);
  const defaults = chartVisualDefaults(theme);
  return {
    ...safe,
    backgroundColor: safe.backgroundMode === "custom" ? safe.backgroundColor : defaults.backgroundColor,
    textColor: safe.backgroundMode === "custom" ? safe.textColor : defaults.textColor,
    gridColor: safe.backgroundMode === "custom" ? safe.gridColor : defaults.gridColor,
  };
}

export function calculateHeikinAshiCandles(candles) {
  let previous = null;
  return candles.map((candle) => {
    const close = (Number(candle.open) + Number(candle.high) + Number(candle.low) + Number(candle.close)) / 4;
    const open = previous
      ? (Number(previous.open) + Number(previous.close)) / 2
      : (Number(candle.open) + Number(candle.close)) / 2;
    const next = {
      ...candle,
      open,
      high: Math.max(Number(candle.high), open, close),
      low: Math.min(Number(candle.low), open, close),
      close,
      sourceOpen: Number(candle.open),
      sourceHigh: Number(candle.high),
      sourceLow: Number(candle.low),
      sourceClose: Number(candle.close),
    };
    previous = next;
    return next;
  });
}

export function buildDisplayCandles(candles, preferences, theme = "light") {
  const settings = resolvedChartColors(preferences, theme);
  const source = settings.candleType === "heikin_ashi"
    ? calculateHeikinAshiCandles(candles)
    : candles.map((candle) => ({ ...candle }));

  if (settings.candleType !== "hollow") return source;

  return source.map((candle, index) => {
    const previousClose = Number(source[index - 1]?.close ?? candle.open);
    const trendColor = Number(candle.close) >= previousClose ? settings.upColor : settings.downColor;
    const hollow = Number(candle.close) >= Number(candle.open);
    return {
      ...candle,
      color: hollow ? settings.backgroundColor : trendColor,
      borderColor: trendColor,
      wickColor: trendColor,
    };
  });
}

export function chartPreferencePayload(preferences, theme = "light") {
  return sanitizeChartPreferences(preferences, theme);
}
