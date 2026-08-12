const SUPPORTED_RESOLUTIONS = Object.freeze(["15", "60", "120", "180", "240", "1D", "1W", "1M"]);

const RESOLUTION_TO_INTERVAL = Object.freeze({
  "15": "15m",
  "60": "1h",
  "120": "2h",
  "180": "3h",
  "240": "4h",
  "1D": "1d",
  D: "1d",
  "1W": "1wk",
  W: "1wk",
  "1M": "1mo",
  M: "1mo",
});

const INTERVAL_RANGES = Object.freeze({
  "15m": ["5d", "1mo"],
  "1h": ["5d", "1mo", "3mo"],
  "2h": ["5d", "1mo", "3mo"],
  "3h": ["5d", "1mo", "3mo"],
  "4h": ["5d", "1mo", "3mo"],
  "1d": ["5d", "1mo", "3mo", "1y", "5y", "max"],
  "1wk": ["3mo", "1y", "5y", "max"],
  "1mo": ["1y", "5y", "max"],
});

const RANGE_DAYS = Object.freeze({
  "5d": 10,
  "1mo": 45,
  "3mo": 120,
  "1y": 550,
  "5y": 2_200,
  max: Number.POSITIVE_INFINITY,
});

const ESTIMATED_BARS_PER_DAY = Object.freeze({
  "15m": 24,
  "1h": 6,
  "2h": 3,
  "3h": 2,
  "4h": 1.5,
  "1d": 0.72,
  "1wk": 0.14,
  "1mo": 0.033,
});

export const TRADINGVIEW_HOSTED_ORIGIN = "https://charting-library.tradingview-widget.com";
export const TRADINGVIEW_HOSTED_SCRIPT = `${TRADINGVIEW_HOSTED_ORIGIN}/charting_library/charting_library.standalone.js`;
export const TRADINGVIEW_HOSTED_LIBRARY_PATH = `${TRADINGVIEW_HOSTED_ORIGIN}/charting_library/`;

const MARKET_PROFILES = Object.freeze({
  SA_MAIN: {
    exchange: "Saudi Main Market",
    timezone: "Asia/Riyadh",
    session: "1000-1520",
    currency: "SAR",
  },
  US_OPTIONS: {
    exchange: "U.S. Optionable Companies",
    timezone: "America/New_York",
    session: "0930-1600",
    currency: "USD",
  },
  US_BENCHMARKS: {
    exchange: "U.S. Indices & ETFs",
    timezone: "America/New_York",
    session: "0930-1600",
    currency: "USD",
  },
});

function defer(callback) {
  setTimeout(callback, 0);
}

function timestampMs(value) {
  if (typeof value === "number") return value > 10_000_000_000 ? Math.floor(value) : Math.floor(value * 1_000);
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

function utcPeriodStart(value) {
  const calendarDate = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (calendarDate) {
    return Date.UTC(Number(calendarDate[1]), Number(calendarDate[2]) - 1, Number(calendarDate[3]));
  }
  const date = new Date(timestampMs(value));
  if (!Number.isFinite(date.getTime())) return Number.NaN;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function normalizedPrice(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function instrumentType(value) {
  const type = String(value || "").toLowerCase();
  if (type.includes("index")) return "index";
  if (type.includes("etf") || type.includes("fund")) return "fund";
  return "stock";
}

function parseSymbolKey(symbolName, fallbackMarketCode) {
  const value = String(symbolName || "").trim();
  const separator = value.indexOf(":");
  if (separator > 0) {
    const candidateMarket = value.slice(0, separator).toUpperCase();
    if (MARKET_PROFILES[candidateMarket]) {
      return { marketCode: candidateMarket, instrumentCode: value.slice(separator + 1) };
    }
  }
  return { marketCode: fallbackMarketCode, instrumentCode: value };
}

export function mapResolutionToKimiInterval(resolution) {
  return RESOLUTION_TO_INTERVAL[String(resolution || "").toUpperCase()] || null;
}

export function toTradingViewSymbolKey(marketCode, instrumentCode) {
  return `${String(marketCode || "").trim().toUpperCase()}:${String(instrumentCode || "").trim()}`;
}

export function selectKimiRange(interval, periodParams = {}) {
  const candidates = INTERVAL_RANGES[interval] || [];
  if (!candidates.length) return null;
  const from = Number(periodParams.from || 0);
  const to = Number(periodParams.to || 0);
  const requestedDays = from > 0 && to > from ? (to - from) / 86_400 : 0;
  const countBack = Math.max(0, Number(periodParams.countBack || 0));
  const estimatedDays = countBack / (ESTIMATED_BARS_PER_DAY[interval] || 1) * 1.35;
  const requiredDays = Math.max(requestedDays, estimatedDays);
  return candidates.find((range) => RANGE_DAYS[range] >= requiredDays) || candidates.at(-1);
}

export function normalizeTradingViewBars(candles, interval) {
  const byTime = new Map();
  const periodInterval = ["1d", "1wk", "1mo"].includes(interval);
  for (const candle of Array.isArray(candles) ? candles : []) {
    const open = normalizedPrice(candle?.open);
    const high = normalizedPrice(candle?.high);
    const low = normalizedPrice(candle?.low);
    const close = normalizedPrice(candle?.close);
    const time = periodInterval ? utcPeriodStart(candle?.time) : timestampMs(candle?.time);
    const volume = Number(candle?.volume ?? 0);
    if (![time, open, high, low, close].every(Number.isFinite)) continue;
    if (high < Math.max(open, close) || low > Math.min(open, close) || !Number.isFinite(volume) || volume < 0) continue;
    byTime.set(time, { time, open, high, low, close, volume });
  }
  return [...byTime.values()].sort((left, right) => left.time - right.time);
}

function barsForPeriod(bars, periodParams) {
  const fromMs = Number(periodParams.from || 0) * 1_000;
  const toMs = Number(periodParams.to || 0) * 1_000;
  const countBack = Math.max(0, Number(periodParams.countBack || 0));
  const inRange = bars.filter((bar) => bar.time >= fromMs && (!toMs || bar.time < toMs));
  if (inRange.length >= countBack || !countBack) return inRange;
  const earlier = bars.filter((bar) => bar.time < fromMs).slice(-(countBack - inRange.length));
  return [...earlier, ...inRange];
}

function resultItem(instrument, marketCode, profile) {
  const instrumentCode = String(instrument.instrument_code || instrument.symbol || "").trim();
  const ticker = toTradingViewSymbolKey(marketCode, instrumentCode);
  return {
    symbol: instrument.symbol || instrumentCode,
    full_name: ticker,
    description: instrument.name_ar || instrument.name_en || instrumentCode,
    exchange: profile.exchange,
    ticker,
    type: instrumentType(instrument.instrument_type),
    kmyInstrument: instrument,
  };
}

export function createKimiTradingViewDatafeed({ marketCode, searchInstruments, readChart, pollMs = 0 }) {
  const normalizedMarketCode = String(marketCode || "").trim().toUpperCase();
  const profile = MARKET_PROFILES[normalizedMarketCode];
  if (!profile) throw new Error("unsupported_market");
  if (typeof searchInstruments !== "function" || typeof readChart !== "function") throw new Error("datafeed_dependencies_required");

  const symbolCache = new Map();
  const subscriptions = new Map();

  async function search(query) {
    const rows = await searchInstruments(String(query || ""));
    return (Array.isArray(rows) ? rows : [])
      .filter((instrument) => String(instrument.market_code || normalizedMarketCode).toUpperCase() === normalizedMarketCode)
      .map((instrument) => resultItem(instrument, normalizedMarketCode, profile))
      .filter((item) => item.symbol && item.ticker)
      .map((item) => {
        symbolCache.set(item.ticker, item);
        symbolCache.set(String(item.symbol).toUpperCase(), item);
        return item;
      });
  }

  async function resolvedItem(symbolName) {
    const parsed = parseSymbolKey(symbolName, normalizedMarketCode);
    if (parsed.marketCode !== normalizedMarketCode) return null;
    const key = toTradingViewSymbolKey(normalizedMarketCode, parsed.instrumentCode);
    const cached = symbolCache.get(key) || symbolCache.get(parsed.instrumentCode.toUpperCase());
    if (cached) return cached;
    const results = await search(parsed.instrumentCode);
    return results.find((item) => item.ticker === key || String(item.symbol).toUpperCase() === parsed.instrumentCode.toUpperCase()) || null;
  }

  async function latestBar(symbolInfo, resolution) {
    const interval = mapResolutionToKimiInterval(resolution);
    if (!interval) return null;
    const range = INTERVAL_RANGES[interval]?.[0];
    const result = await readChart({
      action: "chart",
      market_code: normalizedMarketCode,
      symbol: symbolInfo.kmyInstrumentCode,
      instrument_code: symbolInfo.kmyInstrumentCode,
      interval,
      range,
      lookback_days: 20,
    });
    return normalizeTradingViewBars(result?.candles, interval).at(-1) || null;
  }

  return {
    onReady(callback) {
      defer(() => callback({
        supports_search: true,
        supports_group_request: false,
        supports_marks: false,
        supports_timescale_marks: false,
        supports_time: false,
        exchanges: [{ value: profile.exchange, name: profile.exchange, desc: profile.exchange }],
        symbols_types: [{ name: "All", value: "" }, { name: "Stock", value: "stock" }, { name: "Index", value: "index" }, { name: "Fund", value: "fund" }],
        supported_resolutions: [...SUPPORTED_RESOLUTIONS],
      }));
    },

    async searchSymbols(userInput, _exchange, _symbolType, onResultReadyCallback) {
      try {
        const results = await search(userInput);
        defer(() => onResultReadyCallback(results.map(({ kmyInstrument: _instrument, ...item }) => item)));
      } catch {
        defer(() => onResultReadyCallback([]));
      }
    },

    async resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
      try {
        const item = await resolvedItem(symbolName);
        if (!item) return defer(() => onResolveErrorCallback("unknown_symbol"));
        const instrument = item.kmyInstrument || {};
        const instrumentCode = String(instrument.instrument_code || instrument.symbol || item.symbol);
        return defer(() => onSymbolResolvedCallback({
          ticker: item.ticker,
          name: item.symbol,
          description: instrument.name_ar || instrument.name_en || item.description,
          type: item.type,
          session: profile.session,
          timezone: profile.timezone,
          exchange: profile.exchange,
          listed_exchange: profile.exchange,
          minmov: 1,
          pricescale: 100,
          has_intraday: true,
          intraday_multipliers: ["15", "60", "120", "180", "240"],
          has_daily: true,
          daily_multipliers: ["1"],
          has_weekly_and_monthly: true,
          weekly_multipliers: ["1"],
          monthly_multipliers: ["1"],
          supported_resolutions: [...SUPPORTED_RESOLUTIONS],
          volume_precision: 0,
          currency_code: profile.currency,
          format: "price",
          visible_plots_set: "ohlcv",
          data_status: "delayed_streaming",
          delay: 900,
          kmyMarketCode: normalizedMarketCode,
          kmyInstrumentCode: instrumentCode,
        }));
      } catch {
        return defer(() => onResolveErrorCallback("unknown_symbol"));
      }
    },

    async getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
      try {
        const interval = mapResolutionToKimiInterval(resolution);
        if (!interval) throw new Error("unsupported_resolution");
        if (symbolInfo.kmyMarketCode !== normalizedMarketCode) throw new Error("market_scope_mismatch");
        const range = selectKimiRange(interval, periodParams);
        const result = await readChart({
          action: "chart",
          market_code: normalizedMarketCode,
          symbol: symbolInfo.kmyInstrumentCode,
          instrument_code: symbolInfo.kmyInstrumentCode,
          interval,
          range,
          lookback_days: 20,
        });
        const allBars = normalizeTradingViewBars(result?.candles, interval);
        const bars = barsForPeriod(allBars, periodParams).map((bar) => ({ ...bar }));
        const requestEndsBeforeArchive = Boolean(allBars.length && Number(periodParams.to || 0) * 1_000 <= allBars[0].time);
        defer(() => onHistoryCallback(bars, { noData: !allBars.length || requestEndsBeforeArchive }));
      } catch (error) {
        defer(() => onErrorCallback(error?.message || "chart_data_unavailable"));
      }
    },

    subscribeBars(symbolInfo, resolution, onRealtimeCallback, listenerGuid) {
      if (!(pollMs > 0) || subscriptions.has(listenerGuid)) return;
      let lastTime = 0;
      const refresh = async () => {
        try {
          const bar = await latestBar(symbolInfo, resolution);
          if (!bar || bar.time < lastTime) return;
          lastTime = bar.time;
          onRealtimeCallback({ ...bar });
        } catch {}
      };
      const timer = setInterval(refresh, Math.max(60_000, pollMs));
      subscriptions.set(listenerGuid, timer);
    },

    unsubscribeBars(listenerGuid) {
      const timer = subscriptions.get(listenerGuid);
      if (timer) clearInterval(timer);
      subscriptions.delete(listenerGuid);
    },

    destroy() {
      subscriptions.forEach((timer) => clearInterval(timer));
      subscriptions.clear();
      symbolCache.clear();
    },
  };
}
