import assert from "node:assert/strict";
import {
  createKimiTradingViewDatafeed,
  mapResolutionToKimiInterval,
  normalizeTradingViewBars,
  selectKimiRange,
  toTradingViewSymbolKey,
} from "../src/lib/tradingview-datafeed.js";

assert.equal(mapResolutionToKimiInterval("15"), "15m");
assert.equal(mapResolutionToKimiInterval("120"), "2h");
assert.equal(mapResolutionToKimiInterval("1D"), "1d");
assert.equal(mapResolutionToKimiInterval("1W"), "1wk");
assert.equal(mapResolutionToKimiInterval("1M"), "1mo");
assert.equal(mapResolutionToKimiInterval("5"), null);
assert.equal(selectKimiRange("15m", { from: 1, to: 86_401, countBack: 20 }), "5d");
assert.equal(selectKimiRange("15m", { from: 1, to: 86_401, countBack: 500 }), "1mo");
assert.equal(selectKimiRange("1d", { from: 1, to: 86_401, countBack: 1_100 }), "5y");
assert.equal(selectKimiRange("1d", { from: 1, to: 86_401, countBack: 1_500 }), "max");
assert.equal(toTradingViewSymbolKey("sa_main", "1111"), "SA_MAIN:1111");

const bars = normalizeTradingViewBars([
  { time: "2026-08-10T15:20:00+03:00", open: 10, high: 12, low: 9, close: 11, volume: 50 },
  { time: "2026-08-10T10:00:00+03:00", open: 9, high: 11, low: 8, close: 10, volume: 40 },
  { time: "2026-08-10T10:00:00+03:00", open: 9.5, high: 11, low: 9, close: 10.5, volume: 41 },
  { time: "invalid", open: 1, high: 2, low: 0, close: 1, volume: 1 },
], "15m");
assert.equal(bars.length, 2, "bars must be valid, sorted, and unique by timestamp");
assert.equal(bars[0].close, 10.5, "the newest corrected bar must replace a duplicate timestamp");

const daily = normalizeTradingViewBars([{ time: "2026-08-10T15:20:00+03:00", open: 10, high: 12, low: 9, close: 11, volume: 50 }], "1d");
assert.equal(daily[0].time, Date.UTC(2026, 7, 10), "daily bars must start at 00:00 UTC");
const midnightDaily = normalizeTradingViewBars([{ time: "2026-08-10T00:00:00+03:00", open: 10, high: 12, low: 9, close: 11, volume: 50 }], "1d");
assert.equal(midnightDaily[0].time, Date.UTC(2026, 7, 10), "calendar dates must not shift to the previous UTC day");

const searchCalls = [];
const chartCalls = [];
const candles = [
  { time: "2026-08-06", open: 10, high: 11, low: 9, close: 10.5, volume: 100 },
  { time: "2026-08-07", open: 10.5, high: 12, low: 10, close: 11.5, volume: 120 },
  { time: "2026-08-10", open: 11.5, high: 13, low: 11, close: 12.5, volume: 140 },
];
const datafeed = createKimiTradingViewDatafeed({
  marketCode: "SA_MAIN",
  searchInstruments: async (query) => {
    searchCalls.push(query);
    return [
      { market_code: "SA_MAIN", instrument_code: "1111", symbol: "1111", instrument_type: "equity", name_ar: "مجموعة تداول السعودية" },
      { market_code: "US_OPTIONS", instrument_code: "AAPL", symbol: "AAPL", instrument_type: "equity", name_en: "Apple" },
    ];
  },
  readChart: async (payload) => {
    chartCalls.push(payload);
    return { candles };
  },
});

const configuration = await new Promise((resolve) => datafeed.onReady(resolve));
assert.deepEqual(configuration.supported_resolutions, ["15", "60", "120", "180", "240", "1D", "1W", "1M"]);

const searchResults = await new Promise((resolve) => datafeed.searchSymbols("11", "", "", resolve));
assert.equal(searchResults.length, 1, "symbol search must stay inside the active market");
assert.equal(searchResults[0].ticker, "SA_MAIN:1111");

const symbolInfo = await new Promise((resolve, reject) => datafeed.resolveSymbol("SA_MAIN:1111", resolve, reject));
assert.equal(symbolInfo.kmyMarketCode, "SA_MAIN");
assert.equal(symbolInfo.kmyInstrumentCode, "1111");
assert.equal(symbolInfo.session, "1000-1520");
assert.equal(symbolInfo.data_status, "delayed_streaming");
assert.equal(symbolInfo.delay, 900);
assert.deepEqual(symbolInfo.intraday_multipliers, ["15", "60", "120", "180", "240"]);

const history = await new Promise((resolve, reject) => datafeed.getBars(
  symbolInfo,
  "1D",
  { from: Date.UTC(2026, 7, 7) / 1_000, to: Date.UTC(2026, 7, 11) / 1_000, countBack: 3 },
  (values, meta) => resolve({ values, meta }),
  reject,
));
assert.equal(history.values.length, 3, "getBars must include earlier stored bars until countBack is satisfied");
assert.equal(history.meta.noData, false);
assert.equal(chartCalls[0].market_code, "SA_MAIN");
assert.equal(chartCalls[0].instrument_code, "1111");
assert.equal(chartCalls[0].interval, "1d");
assert.ok(searchCalls.length >= 1);

const crossMarketError = await new Promise((resolve) => datafeed.resolveSymbol("US_OPTIONS:AAPL", () => resolve("unexpected"), resolve));
assert.equal(crossMarketError, "unknown_symbol", "a market-scoped datafeed must reject another market's symbol");
datafeed.destroy();

console.log("TradingView datafeed contract verification passed.");
