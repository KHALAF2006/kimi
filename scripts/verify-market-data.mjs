import assert from "node:assert/strict";
import { build } from "esbuild";
import path from "node:path";

async function importTypeScriptModule(relativePath) {
  const entryPoint = path.resolve(relativePath);
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    write: false,
    logLevel: "silent",
  });
  const source = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

const marketDataModule = await importTypeScriptModule("./base44/shared/market-data.ts");
const technicalSignalsModule = await importTypeScriptModule("./base44/shared/technical-signals.ts");
const momentumModule = await importTypeScriptModule("./base44/shared/momentum.ts");

const {
  SAUDI_DELAY_SECONDS,
  MARKET_AUTOMATION_SPECS,
  buildPublicCandleContexts,
  canonicalizeQuarterHourBars,
  coverageStatus,
  expectedProviderAsOf,
  fetchPublicDelayedCharts,
  freshnessStatus,
  groupRowsByKey,
  mergeIncrementalCandleChunks,
  mergeStoredCandleSeries,
  groupHistoricalBarsByYear,
  normalizeAdjustedHistoricalBars,
  normalizeYahooHistoricalBars,
  normalizeLicensedSnapshot,
  normalizePublicDelayedCharts,
  normalizeProviderCandles,
  publicChartRequestWindow,
  slotDecision,
} = marketDataModule;
const { calculateMomentumZones } = momentumModule;
const {
  aggregateTechnicalBars,
  calculateSmaSeries,
  calculateTechnicalSignals,
  detectBearishPinBar,
  detectBullishPinBar,
  detectEngulfingPattern,
} = technicalSignalsModule;
import {
  buildDisplayCandles,
  calculateHeikinAshiCandles,
  sanitizeChartPreferences,
} from "../src/lib/chart-visuals.js";
import {
  detectBearishPinBar as detectFrontendBearishPinBar,
  detectBullishPinBar as detectFrontendBullishPinBar,
  detectEngulfingPattern as detectFrontendEngulfingPattern,
  reversalPatternMap,
} from "../src/lib/technical-signals.js";
import {
  consumePreviewAuthHandoff,
  isBase44PreviewHost,
  previewSafeHref,
  safePreviewServerUrl,
} from "../src/lib/preview-auth-handoff.js";

function memoryStorage(entries = []) {
  const values = new Map(entries);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

const previewHost = "preview--neat-smart-ops-flow.base44.app";
assert.equal(isBase44PreviewHost(previewHost), true);
assert.equal(isBase44PreviewHost("neat-smart-ops-flow.base44.app"), false);
assert.equal(safePreviewServerUrl(`https://${previewHost}/functions`, previewHost), `https://${previewHost}`);
assert.equal(safePreviewServerUrl("https://malicious.example/functions", previewHost), "", "preview tokens must never be sent to an untrusted server_url");
const previewContextSearch = `?functions_version=preview-functions-v3&server_url=${encodeURIComponent(`https://${previewHost}`)}&base44_data_env=preview-data&_b44_commit=commit-123`;
const handedOffHref = previewSafeHref("/screener?timeframe=1wk", { hostname: previewHost, search: previewContextSearch });
const handedOffUrl = new URL(`https://${previewHost}${handedOffHref}`);
assert.equal(handedOffUrl.searchParams.get("functions_version"), "preview-functions-v3");
assert.equal(handedOffUrl.searchParams.get("server_url"), `https://${previewHost}`);
assert.equal(handedOffUrl.searchParams.get("base44_data_env"), "preview-data");
assert.equal(handedOffUrl.searchParams.get("_b44_commit"), "commit-123");
assert.equal(handedOffUrl.hash, "", "preview links must never carry credentials in the URL fragment");
assert.equal(handedOffHref.includes("test-access-token"), false);
assert.equal(previewSafeHref("/screener", { hostname: "neat-smart-ops-flow.base44.app" }), "/screener", "production links must never carry preview context or credentials");
const targetPreviewStorage = memoryStorage();
let cleanedPreviewUrl = "";
const restored = consumePreviewAuthHandoff({
  location: {
    hostname: previewHost,
    pathname: "/screener",
    search: handedOffUrl.search,
    hash: "#kmy_preview_auth=legacy-credential-payload",
  },
  history: { replaceState: (_state, _title, url) => { cleanedPreviewUrl = url; } },
  storage: targetPreviewStorage,
});
assert.equal(restored, false);
assert.equal(targetPreviewStorage.getItem("base44_access_token"), null);
assert.equal(targetPreviewStorage.getItem("kmy_session_id"), null);
assert.equal(cleanedPreviewUrl, `/screener${handedOffUrl.search}`, "legacy credential fragments must be removed without restoring them");
let malformedCleanUrl = "";
assert.doesNotThrow(() => {
  const malformedRestored = consumePreviewAuthHandoff({
    location: { hostname: previewHost, pathname: "/screener", search: "", hash: "#kmy_preview_auth=invalid" },
    history: { replaceState: (_state, _title, url) => { malformedCleanUrl = url; } },
    storage: memoryStorage(),
  });
  assert.equal(malformedRestored, false);
});
assert.equal(malformedCleanUrl, "/screener", "malformed handoffs must fail closed and still be removed");

assert.equal(MARKET_AUTOMATION_SPECS.length, 5);
assert.deepEqual(MARKET_AUTOMATION_SPECS.map((automation) => automation.cron), [
  "15,30,45 7 * * 0-4",
  "0,15,30,45 8-11 * * 0-4",
  "0,15 12 * * 0-4",
  "26 12 * * 0-4",
  "36 12 * * 0-4",
]);
assert.ok(MARKET_AUTOMATION_SPECS.every((automation) => automation.active === false));

const sundayQuarterHour = new Date("2026-07-26T07:15:00.000Z");
const quarterSlot = slotDecision({ now: sundayQuarterHour, source: "scheduled_licensed_t15", slotKind: "quarter_hour" });
assert.equal(quarterSlot.run, true);
assert.equal(quarterSlot.phase, "continuous");

const sundayClose = slotDecision({ now: new Date("2026-07-26T12:26:00.000Z"), source: "scheduled_licensed_close", slotKind: "close_price" });
assert.equal(sundayClose.run, true);
assert.equal(sundayClose.phase, "trade_at_last");
const workflowClose = slotDecision({ now: new Date("2026-07-26T13:03:00.000Z"), source: "scheduled_experimental_close", slotKind: "close_price" });
assert.equal(workflowClose.run, true, "the existing 4:00 PM Riyadh close workflow must be accepted");
const lateCloseRetry = slotDecision({ now: new Date("2026-07-26T20:30:00.000Z"), source: "scheduled_experimental_close", slotKind: "close_price" });
assert.equal(lateCloseRetry.run, true, "an owner-triggered close retry must remain available after the scheduled close");
assert.equal(expectedProviderAsOf(new Date("2026-07-26T07:16:42.000Z")), "2026-07-26T07:00:00.000Z", "delayed slots must be rounded to their quarter-hour boundary");

const saturday = slotDecision({ now: new Date("2026-07-25T07:15:00.000Z"), source: "scheduled_licensed_t15", slotKind: "quarter_hour" });
assert.equal(saturday.run, false);
assert.equal(saturday.reason, "non_trading_weekday");

assert.deepEqual(coverageStatus(270, 270), { coveragePercent: 100, status: "healthy" });
assert.equal(coverageStatus(267, 270).status, "degraded");
assert.equal(coverageStatus(256, 270).status, "failed");
assert.equal(freshnessStatus("2026-07-26T07:00:00.000Z", "2026-07-26T07:15:00.000Z"), "fresh");
assert.equal(freshnessStatus("2026-07-26T06:54:00.000Z", "2026-07-26T07:15:00.000Z"), "stale");

const groupedQualityIssues = groupRowsByKey([
  { symbol: "1010", issue_type: "public_chart_request_failed", message: "attempt 1" },
  { symbol: "1010", issue_type: "public_chart_request_failed", message: "attempt 2" },
  { symbol: "1020", issue_type: "public_chart_request_failed", message: "attempt 1" },
], (row) => `${row.instrument_id || row.symbol || "market"}:${row.issue_type}`);
assert.equal(groupedQualityIssues.length, 2, "quality issues must remain distinct per symbol");
assert.equal(groupedQualityIssues.find((group) => group.key.startsWith("1010:")).count, 2, "repeated issues in one cycle must increment one record");

const groupedEntityUpdates = groupRowsByKey([
  { id: "entity-1", status: "stale" },
  { id: "entity-1", quality_status: "stale" },
], (row) => row.id);
assert.deepEqual(groupedEntityUpdates, [{
  key: "entity-1",
  row: { id: "entity-1", status: "stale", quality_status: "stale" },
  count: 2,
}], "bulk updates must send each entity ID exactly once");

const mappings = [{ instrument_id: "instrument-1", provider_symbol: "1321", active: true, license_status: "approved", delay_seconds: SAUDI_DELAY_SECONDS }];
const instruments = [{ id: "instrument-1", symbol: "1321" }];
const baseQuote = {
  provider_symbol: "1321",
  last_price: 199.3,
  previous_close: 187.5,
  open: 188,
  high: 201,
  low: 187,
  volume: 1000,
  trade_count: 50,
  change_percent: 6.2933333333,
  last_trade_time: "2026-07-26T06:59:50.000Z",
};
const normalized = normalizeLicensedSnapshot({
  payload: { provider_as_of: "2026-07-26T07:00:00.000Z", quotes: [baseQuote] },
  mappings,
  instruments,
  sourceId: "source-1",
  runId: "run-1",
  snapshotVersion: "snapshot-1",
  receivedAt: "2026-07-26T07:15:00.000Z",
});
assert.equal(normalized.accepted.length, 1);
assert.equal(normalized.rejected.length, 0);
assert.equal(Number(normalized.accepted[0].change_value.toFixed(1)), 11.8);
assert.equal(Number(normalized.accepted[0].change_percent.toFixed(2)), 6.29);
assert.equal(normalized.accepted[0].snapshot_version, "snapshot-1");
assert.equal(normalized.accepted[0].freshness_status, "fresh");

const mismatch = normalizeLicensedSnapshot({
  payload: { provider_as_of: "2026-07-26T07:00:00.000Z", quotes: [{ ...baseQuote, change_percent: -5 }] },
  mappings,
  instruments,
  sourceId: "source-1",
  runId: "run-2",
  snapshotVersion: "snapshot-2",
  receivedAt: "2026-07-26T07:15:00.000Z",
});
assert.equal(mismatch.accepted.length, 0);
assert.equal(mismatch.rejected[0].issue_type, "change_mismatch");

assert.throws(() => normalizeLicensedSnapshot({
  payload: { provider_as_of: "2026-07-26T07:10:00.000Z", quotes: [baseQuote] },
  mappings,
  instruments,
  sourceId: "source-1",
  runId: "run-3",
  snapshotVersion: "snapshot-3",
  receivedAt: "2026-07-26T07:15:00.000Z",
}), /not delayed/);

const chunks = normalizeProviderCandles({
  candles: [{
    provider_symbol: "1321",
    bars: [
      { time: "2026-07-26T07:00:00.000Z", open: 188, high: 199.3, low: 187.5, close: 199.3, volume: 1000 },
      { time: "2026-07-26T07:15:00.000Z", open: 199.3, high: 198, low: 197, close: 198, volume: 100 },
    ],
  }],
}, mappings, instruments, "source-1", "2026-07-26");
assert.equal(chunks.length, 1);
assert.equal(chunks[0].bars.length, 1, "invalid OHLC bars must be discarded");
assert.equal(chunks[0].interval, "15m");

const mergedDailyCandles = mergeStoredCandleSeries([
  {
    interval: "1d",
    bars: [
      { time: "2026-07-26T07:00:00.000Z", open: 180, high: 190, low: 179, close: 188, volume: 1000 },
      { time: "2026-07-27T07:00:00.000Z", open: 188, high: 194, low: 187, close: 192, volume: 1200 },
    ],
  },
  {
    interval: "15m",
    bars: [
      { time: "2026-07-28T07:00:00.000Z", open: 192, high: 194, low: 191, close: 193, volume: 100 },
      { time: "2026-07-28T07:15:00.000Z", open: 193, high: 196, low: 192, close: 195, volume: 150 },
      { time: "2026-07-29T07:00:00.000Z", open: 195, high: 196, low: 188, close: 189, volume: 200 },
      { time: "2026-07-29T07:15:00.000Z", open: 189, high: 191, low: 187, close: 190, volume: 250 },
    ],
  },
], "1d");
assert.equal(mergedDailyCandles.bars.length, 4, "fresh 15-minute sessions must extend stored daily history");
assert.equal(mergedDailyCandles.bars.at(-1).close, 190);
assert.equal(mergedDailyCandles.bars.at(-1).high, 196);
assert.equal(mergedDailyCandles.bars.at(-1).low, 187);
assert.equal(mergedDailyCandles.bars.at(-1).volume, 450);
assert.equal(mergedDailyCandles.latestSourceTime, "2026-07-29T07:15:00.000Z");
assert.deepEqual(mergedDailyCandles.storedIntervals, ["1d", "15m"]);

const mergedWeeklyCandles = mergeStoredCandleSeries([
  { interval: "1d", bars: mergedDailyCandles.bars },
  {
    interval: "15m",
    bars: [
      { time: "2026-07-30T07:00:00.000Z", open: 190, high: 193, low: 189, close: 192, volume: 300 },
    ],
  },
], "1wk");
assert.equal(mergedWeeklyCandles.bars.length, 1, "daily and intraday candles from one Riyadh trading week must form one weekly candle");
assert.equal(mergedWeeklyCandles.bars[0].close, 192);
assert.equal(mergedWeeklyCandles.bars[0].high, 196);
assert.equal(mergedWeeklyCandles.bars[0].low, 179);

const publicCharts = normalizePublicDelayedCharts([{
  symbol: "1321",
  result: {
    timestamp: [
      Date.parse("2026-07-26T11:45:00.000Z") / 1000,
      Date.parse("2026-07-27T07:00:00.000Z") / 1000,
      Date.parse("2026-07-27T07:15:00.000Z") / 1000,
    ],
    indicators: {
      quote: [{
        open: [190, 187.5, 194],
        high: [191, 195, 199.2],
        low: [188, 187.5, 193],
        close: [188.8, 194, 196.6],
        volume: [100, 120, 150],
      }],
    },
  },
}]);
assert.equal(publicCharts.quotes.length, 1);
assert.equal(publicCharts.quotes[0].previous_close, 188.8, "public delayed quotes must use the previous trading session close");
assert.equal(publicCharts.quotes[0].last_price, 196.6);
assert.equal(Number(publicCharts.quotes[0].change_percent.toFixed(2)), 4.13);
assert.equal(publicCharts.candles[0].bars.length, 2, "only the latest trading session belongs in the current 15-minute chunk");

assert.deepEqual(publicChartRequestWindow({
  now: new Date("2026-07-29T08:30:00.000Z"),
}), { mode: "bootstrap", range: "5d" }, "symbols without a cursor must bootstrap only once");
const incrementalWindow = publicChartRequestWindow({
  watermark: "2026-07-29T08:15:00.000Z",
  now: new Date("2026-07-29T08:30:00.000Z"),
});
assert.equal(incrementalWindow.mode, "incremental");
assert.equal(incrementalWindow.period1, Date.parse("2026-07-29T08:00:00.000Z") / 1000, "incremental requests must overlap only one candle");
assert.equal(incrementalWindow.period2, Date.parse("2026-07-29T08:30:00.000Z") / 1000 + 60);
assert.deepEqual(publicChartRequestWindow({
  watermark: "2026-07-01T08:15:00.000Z",
  now: new Date("2026-07-29T08:30:00.000Z"),
}), { mode: "backfill", range: "5d" }, "stale cursors must use a bounded backfill instead of an unbounded request");

const publicContexts = buildPublicCandleContexts({
  instruments,
  quotes: [{
    instrument_id: "instrument-1",
    session_date: "2026-07-29",
    previous_close: 190,
    last_price: 196,
    last_trade_time: "2026-07-29T08:15:30.000Z",
  }],
  chunks: [{
    instrument_id: "instrument-1",
    symbol: "1321",
    interval: "15m",
    session_date: "2026-07-29",
    chunk_key: "1321-15m-2026-07-29",
    end_time: "2026-07-29T08:15:00.000Z",
    bars: [
      { time: "2026-07-29T08:00:00.000Z", open: 192, high: 194, low: 191, close: 193, volume: 100 },
      { time: "2026-07-29T08:15:00.000Z", open: 193, high: 196, low: 192, close: 195, volume: 150 },
    ],
  }],
  sessionDate: "2026-07-29",
});
assert.equal(publicContexts.get("1321").watermark, "2026-07-29T08:15:00.000Z", "the stored candle boundary must be the incremental cursor");
assert.equal(publicContexts.get("1321").previous_close, 190);

const incrementalPublicCharts = normalizePublicDelayedCharts([{
  symbol: "1321",
  result: {
    timestamp: [Date.parse("2026-07-29T08:30:00.000Z") / 1000],
    indicators: {
      quote: [{
        open: [195],
        high: [198],
        low: [194],
        close: [197],
        volume: [175],
      }],
    },
  },
}], publicContexts);
assert.equal(incrementalPublicCharts.quotes.length, 1);
assert.equal(incrementalPublicCharts.quotes[0].previous_close, 190, "incremental normalization must retain the stored previous close");
assert.equal(incrementalPublicCharts.quotes[0].open, 192, "incremental normalization must retain the session open");
assert.equal(incrementalPublicCharts.quotes[0].high, 198);
assert.equal(incrementalPublicCharts.quotes[0].low, 191);
assert.equal(incrementalPublicCharts.quotes[0].volume, 425);
assert.equal(incrementalPublicCharts.candles[0].bars.length, 1, "only the new provider candle should enter the persistence merge");

const nextSessionContexts = buildPublicCandleContexts({
  instruments,
  quotes: [{
    instrument_id: "instrument-1",
    session_date: "2026-07-29",
    previous_close: 188,
    last_price: 197,
    last_trade_time: "2026-07-29T12:00:00.000Z",
  }],
  chunks: [],
  sessionDate: "2026-07-30",
});
assert.equal(nextSessionContexts.get("1321").previous_close, 197, "the prior session last price must seed the next session previous close");
const firstNextSessionCandle = normalizePublicDelayedCharts([{
  symbol: "1321",
  result: {
    timestamp: [Date.parse("2026-07-30T07:00:00.000Z") / 1000],
    indicators: {
      quote: [{
        open: [198],
        high: [201],
        low: [197],
        close: [200],
        volume: [250],
      }],
    },
  },
}], nextSessionContexts);
assert.equal(firstNextSessionCandle.quotes[0].previous_close, 197);
assert.equal(Number(firstNextSessionCandle.quotes[0].change_percent.toFixed(2)), 1.52);

const mergedIncrementalChunks = mergeIncrementalCandleChunks(
  normalizeProviderCandles({
    candles: [{
      provider_symbol: "1321",
      bars: [
        { time: "2026-07-29T08:15:00.000Z", open: 193, high: 197, low: 192, close: 196, volume: 160 },
        { time: "2026-07-29T08:30:00.000Z", open: 196, high: 198, low: 195, close: 197, volume: 175 },
      ],
    }],
  }, mappings, instruments, "source-1", "2026-07-29"),
  [{
    instrument_id: "instrument-1",
    symbol: "1321",
    interval: "15m",
    session_date: "2026-07-29",
    chunk_key: "1321-15m-2026-07-29",
    bars: publicContexts.get("1321").bars,
  }],
);
assert.equal(mergedIncrementalChunks.length, 1);
assert.equal(mergedIncrementalChunks[0].bars.length, 3, "incremental persistence must append without duplicating the overlap candle");
assert.equal(mergedIncrementalChunks[0].bars[1].close, 196, "the refreshed overlap candle must replace its stored version");
assert.equal(mergedIncrementalChunks[0].bars[2].close, 197);
assert.equal(mergedIncrementalChunks[0].session_date, "2026-07-29");
assert.equal("session_date" in mergedIncrementalChunks[0].bars[0], false, "internal session keys must not leak into the stored candle schema");

const canonicalQuarterBars = canonicalizeQuarterHourBars([
  { time: "2026-07-29T08:15:40.000Z", open: 193, high: 196, low: 192, close: 195, volume: 140 },
  { time: "2026-07-29T08:15:00.000Z", open: 193, high: 197, low: 192, close: 196, volume: 160 },
  { time: "2026-07-29T08:16:10.000Z", open: 193, high: 198, low: 192, close: 197, volume: 170 },
  { time: "2026-07-29T08:30:12.000Z", open: 196, high: 199, low: 195, close: 198, volume: 180 },
  { time: "2026-07-29T08:31:00.000Z", open: 196, high: 200, low: 195, close: 199, volume: 190 },
]);
assert.equal(canonicalQuarterBars.length, 2, "one canonical candle must survive per quarter-hour bucket");
assert.equal(canonicalQuarterBars[0].time, "2026-07-29T08:15:00.000Z");
assert.equal(canonicalQuarterBars[0].close, 196, "an exact boundary candle must outrank provisional off-grid updates");
assert.equal(canonicalQuarterBars[1].time, "2026-07-29T08:30:00.000Z");
assert.equal(canonicalQuarterBars[1].close, 199, "the latest provisional update must win when an exact boundary candle is unavailable");

const fiftyOneBars = Array.from({ length: 51 }, (_, index) => {
  const close = index < 49 ? 10 : index === 49 ? 9 : 12;
  return {
    time: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    open: close,
    high: close + 0.5,
    low: close - 0.5,
    close,
    volume: 100,
  };
});
assert.equal(calculateSmaSeries(fiftyOneBars, 20).length, 32, "SMA 20 must start only after a full 20-bar lookback");
assert.equal(calculateSmaSeries(fiftyOneBars, 50).length, 2, "SMA 50 must start only after a full 50-bar lookback");
const technicalCross = calculateTechnicalSignals(fiftyOneBars);
assert.equal(technicalCross.price_cross_sma20, true);
assert.equal(technicalCross.price_cross_sma50, true);
assert.equal(technicalCross.sma20_cross_sma50, true, "the golden cross must compare the two previous and current SMA values");
assert.equal(technicalCross.signal_window.length, 3, "every timeframe must project the current stored candle and the two candles before it");
assert.deepEqual(technicalCross.signal_window.map((item) => item.offset), [0, 1, 2]);

const tadawul1111Recent = [
  { time: "2026-07-28T07:00:00.000Z", open: 119.09999847, high: 120.19999695, low: 118, close: 118.5, volume: 184922 },
  { time: "2026-07-29T07:00:00.000Z", open: 118.5, high: 118.90000153, low: 116.5, close: 118.90000153, volume: 184544 },
  { time: "2026-07-30T07:00:00.000Z", open: 118.19999695, high: 119, low: 117.69999695, close: 118.59999847, volume: 246756 },
];
const tadawul1111Signals = calculateTechnicalSignals(tadawul1111Recent);
assert.equal(tadawul1111Signals.pin_bar_signal, false, "1111 latest candle itself is not a pin bar");
assert.equal(tadawul1111Signals.signal_window[1].pin_bar_signal, true, "1111 must match because its previous daily candle is a bullish pin bar");
assert.equal(tadawul1111Signals.signal_window[1].bullish_pin_bar, true, "the stored signal must expose the bullish pin-bar direction to the screener");
assert.equal(tadawul1111Signals.signal_window[1].bearish_pin_bar, false);
assert.equal(tadawul1111Signals.signal_window[1].pin_bar.direction, "bullish");
assert.equal(tadawul1111Signals.signal_window[1].candle_time, "2026-07-29T07:00:00.000Z");

const pinBar = detectBullishPinBar({ open: 10, high: 10.4, low: 8, close: 10.2 });
assert.equal(pinBar.matches, true, "a lower-wick bullish pin bar must pass the documented geometry");
assert.equal(detectBullishPinBar({ open: 10, high: 11, low: 9, close: 10.8 }).matches, false);
assert.equal(detectBearishPinBar({ open: 10.2, high: 12, low: 9.8, close: 10 }).matches, true, "an upper-wick bearish pin bar must pass the mirrored geometry");
assert.equal(detectEngulfingPattern({ open: 11, close: 10 }, { open: 9.9, close: 11.2 }).direction, "bullish");
assert.equal(detectEngulfingPattern({ open: 10, close: 11 }, { open: 11.1, close: 9.9 }).direction, "bearish");
assert.equal(detectEngulfingPattern({ open: 10, close: 11 }, { open: 10.5, close: 11.2 }).matches, false, "partial body overlap is not engulfing");
assert.equal(detectBullishPinBar({ open: 10, high: 10.2, low: 8, close: 10.1 }).matches, true, "a bullish pin bar needs a lower wick at least three times its body");
assert.equal(detectBullishPinBar({ open: 10, high: 10.2, low: 9.75, close: 10.1 }).matches, false, "a short lower wick must not be classified as a pin bar");
assert.equal(detectBullishPinBar({ open: 10, high: 10, low: 8, close: 10 }).matches, false, "a zero-body doji must not be silently relabeled as a pin bar");
assert.equal(detectFrontendBullishPinBar({ open: 10, high: 10.2, low: 8, close: 10.1 }), true, "the chart and backend must use the same bullish geometry");
assert.equal(detectFrontendBearishPinBar({ open: 10.1, high: 12, low: 10, close: 10 }), true, "the chart and backend must use the same bearish geometry");
assert.equal(detectFrontendEngulfingPattern({ open: 11, close: 10 }, { open: 9.9, close: 11.2 }), "bullish");
assert.deepEqual(reversalPatternMap([
  { time: 1, open: 11, high: 11.2, low: 9.8, close: 10 },
  { time: 2, open: 9.9, high: 11.3, low: 9.7, close: 11.2 },
]).get(2), { pinDirection: null, engulfingDirection: "bullish" }, "the chart map must retain the pattern direction");

const repeatedReversals = [
  { time: 1, open: 11, high: 11.2, low: 9.8, close: 10 }, { time: 2, open: 9.9, high: 11.3, low: 9.7, close: 11.2 },
  { time: 3, open: 12, high: 12.2, low: 10.8, close: 11 }, { time: 4, open: 10.9, high: 12.3, low: 10.7, close: 12.1 },
  { time: 5, open: 13, high: 13.2, low: 11.8, close: 12 }, { time: 6, open: 11.9, high: 13.3, low: 11.7, close: 13.1 },
  { time: 7, open: 14, high: 14.2, low: 12.8, close: 13 }, { time: 8, open: 12.9, high: 14.3, low: 12.7, close: 14.1 },
  { time: 9, open: 10, high: 10.2, low: 9.8, close: 10 },
  { time: 10, open: 10, high: 10.2, low: 8, close: 10.1 }, { time: 11, open: 10, high: 10.2, low: 8, close: 10.1 },
  { time: 12, open: 10, high: 10.2, low: 8, close: 10.1 }, { time: 13, open: 10, high: 10.2, low: 8, close: 10.1 },
  { time: 14, open: 10, high: 10.2, low: 9.8, close: 10 },
  { time: 15, open: 10.1, high: 12, low: 9.9, close: 10 }, { time: 16, open: 10.1, high: 12, low: 9.9, close: 10 },
  { time: 17, open: 10.1, high: 12, low: 9.9, close: 10 }, { time: 18, open: 10.1, high: 12, low: 9.9, close: 10 },
  { time: 19, open: 10, high: 10.2, low: 9.8, close: 10 },
  { time: 20, open: 10, high: 11.2, low: 9.8, close: 11 }, { time: 21, open: 11.1, high: 11.3, low: 9.7, close: 9.9 },
  { time: 22, open: 11, high: 12.2, low: 10.8, close: 12 }, { time: 23, open: 12.1, high: 12.3, low: 10.7, close: 10.9 },
  { time: 24, open: 12, high: 13.2, low: 11.8, close: 13 }, { time: 25, open: 13.1, high: 13.3, low: 11.7, close: 11.9 },
  { time: 26, open: 13, high: 14.2, low: 12.8, close: 14 }, { time: 27, open: 14.1, high: 14.3, low: 12.7, close: 12.9 },
];
const limitedReversals = reversalPatternMap(repeatedReversals, { limitPerType: 3 });
const limitedValues = [...limitedReversals.values()];
for (const [field, direction] of [["pinDirection", "bullish"], ["pinDirection", "bearish"], ["engulfingDirection", "bullish"], ["engulfingDirection", "bearish"]]) {
  assert.equal(limitedValues.filter((item) => item[field] === direction).length, 3, `the chart must retain exactly the latest three ${direction} ${field} matches`);
}
for (const hiddenTime of [2, 10, 15, 21]) assert.equal(limitedReversals.has(hiddenTime), false, "the fourth-oldest match in each reversal category must be hidden");

const sessionIntradayBars = [
  { time: "2026-07-29T07:00:00.000Z", open: 10, high: 11, low: 9, close: 10.5, volume: 100 },
  { time: "2026-07-29T08:45:00.000Z", open: 10.5, high: 12, low: 10, close: 11.5, volume: 120 },
  { time: "2026-07-29T09:00:00.000Z", open: 11.5, high: 13, low: 11, close: 12.5, volume: 130 },
  { time: "2026-07-29T10:45:00.000Z", open: 12.5, high: 14, low: 12, close: 13.5, volume: 140 },
  { time: "2026-07-29T11:00:00.000Z", open: 13.5, high: 15, low: 13, close: 14.5, volume: 150 },
];
const twoHourBars = mergeStoredCandleSeries([{ interval: "15m", bars: sessionIntradayBars }], "2h").bars;
assert.equal(twoHourBars.length, 3, "2-hour bars must align from the 10:00 Riyadh session open");
assert.deepEqual([twoHourBars[0].open, twoHourBars[0].close, twoHourBars[0].volume], [10, 11.5, 220]);
assert.equal(mergeStoredCandleSeries([{ interval: "15m", bars: sessionIntradayBars }], "3h").bars.length, 2);
assert.equal(mergeStoredCandleSeries([{ interval: "15m", bars: sessionIntradayBars }], "4h").bars.length, 2);

const usOptionsCandleOptions = { timeZone: "America/New_York", sessionStartMinutes: 570, weekStartsOn: 1 };
const usSummerBars = [
  { time: "2026-07-29T13:30:00.000Z", open: 10, high: 11, low: 9, close: 10.5, volume: 100 },
  { time: "2026-07-29T14:15:00.000Z", open: 10.5, high: 12, low: 10, close: 11.5, volume: 120 },
  { time: "2026-07-29T14:30:00.000Z", open: 11.5, high: 13, low: 11, close: 12.5, volume: 130 },
];
const usWinterBars = [
  { time: "2026-01-05T14:30:00.000Z", open: 20, high: 21, low: 19, close: 20.5, volume: 100 },
  { time: "2026-01-05T15:15:00.000Z", open: 20.5, high: 22, low: 20, close: 21.5, volume: 120 },
  { time: "2026-01-05T15:30:00.000Z", open: 21.5, high: 23, low: 21, close: 22.5, volume: 130 },
];
assert.equal(mergeStoredCandleSeries([{ interval: "15m", bars: usSummerBars }], "1h", usOptionsCandleOptions).bars.length, 2, "U.S. summer buckets must start at 09:30 EDT");
assert.equal(mergeStoredCandleSeries([{ interval: "15m", bars: usWinterBars }], "1h", usOptionsCandleOptions).bars.length, 2, "U.S. winter buckets must start at 09:30 EST");
for (const interval of ["2h", "3h", "4h"]) {
  assert.ok(mergeStoredCandleSeries([{ interval: "15m", bars: usSummerBars }], interval, usOptionsCandleOptions).bars.length > 0, `U.S. summer ${interval} aggregation must remain available`);
  assert.ok(mergeStoredCandleSeries([{ interval: "15m", bars: usWinterBars }], interval, usOptionsCandleOptions).bars.length > 0, `U.S. winter ${interval} aggregation must remain available`);
}
const usWeekBoundary = [
  { time: "2026-07-31T16:00:00.000Z", open: 10, high: 11, low: 9, close: 10.5, volume: 100 },
  { time: "2026-08-03T16:00:00.000Z", open: 11, high: 12, low: 10, close: 11.5, volume: 120 },
];
assert.equal(mergeStoredCandleSeries([{ interval: "1d", bars: usWeekBoundary }], "1wk", usOptionsCandleOptions).bars.length, 2, "U.S. weeks must roll over on Monday");

const weeklyBoundaryBars = [
  { time: "2026-07-30T07:00:00.000Z", open: 10, high: 11, low: 9, close: 10.5, volume: 100 },
  { time: "2026-08-02T07:00:00.000Z", open: 11, high: 12, low: 10, close: 11.5, volume: 120 },
];
assert.equal(aggregateTechnicalBars(weeklyBoundaryBars, "1wk").length, 2, "Saudi trading weeks must roll over on Sunday");
assert.equal(aggregateTechnicalBars(weeklyBoundaryBars, "1mo").length, 2, "monthly projection must follow the Riyadh session month");

const higherTimeframeDailyBars = [
  { time: "2026-05-28T07:00:00.000Z", open: 9, high: 10, low: 8, close: 9.5, volume: 100 },
  { time: "2026-06-25T07:00:00.000Z", open: 10, high: 11, low: 9, close: 10.5, volume: 110 },
  { time: "2026-07-12T07:00:00.000Z", open: 11, high: 12, low: 10, close: 11.5, volume: 120 },
  { time: "2026-07-19T07:00:00.000Z", open: 12, high: 13, low: 11, close: 12.5, volume: 130 },
  { time: "2026-07-30T07:00:00.000Z", open: 13, high: 14, low: 12, close: 13.5, volume: 140 },
];
const weeklyWindow = calculateTechnicalSignals(aggregateTechnicalBars(higherTimeframeDailyBars, "1wk")).signal_window;
assert.deepEqual(weeklyWindow.map((item) => item.candle_time), [
  "2026-07-30T07:00:00.000Z",
  "2026-07-19T07:00:00.000Z",
  "2026-07-12T07:00:00.000Z",
], "weekly scanning must use the current Saudi week and the two weeks before it");
const monthlyWindow = calculateTechnicalSignals(aggregateTechnicalBars(higherTimeframeDailyBars, "1mo")).signal_window;
assert.deepEqual(monthlyWindow.map((item) => item.candle_time), [
  "2026-07-12T07:00:00.000Z",
  "2026-06-25T07:00:00.000Z",
  "2026-05-28T07:00:00.000Z",
], "monthly scanning must use the current Riyadh month and the two months before it");

const standardVisualBars = [
  { time: 1, open: 10, high: 14, low: 8, close: 12, volume: 100 },
  { time: 2, open: 12, high: 16, low: 11, close: 15, volume: 120 },
  { time: 3, open: 15, high: 16, low: 10, close: 11, volume: 140 },
];
const heikinAshiBars = calculateHeikinAshiCandles(standardVisualBars);
assert.equal(heikinAshiBars.length, standardVisualBars.length, "Heikin Ashi must replace every standard candle one-for-one");
assert.equal(heikinAshiBars[0].open, 11);
assert.equal(heikinAshiBars[0].close, 11);
assert.equal(heikinAshiBars[1].open, 11);
assert.equal(heikinAshiBars[1].close, 13.5);
assert.equal(heikinAshiBars[2].open, 12.25);
assert.equal(heikinAshiBars[2].high, 16);
assert.equal(heikinAshiBars[2].low, 10);
assert.deepEqual(standardVisualBars.map((bar) => bar.close), [12, 15, 11], "display conversion must not mutate the canonical OHLC source");

const hollowPreferences = sanitizeChartPreferences({ candleType: "hollow", backgroundMode: "custom", backgroundColor: "#ffffff" });
const hollowBars = buildDisplayCandles(standardVisualBars, hollowPreferences);
assert.equal(hollowBars[0].color, "#ffffff", "a rising hollow candle body must use the chart background");
assert.equal(hollowBars[2].color, hollowPreferences.downColor, "a falling filled candle must use the prior-close trend color");
assert.equal(buildDisplayCandles(standardVisualBars, { candleType: "candles" }).length, standardVisualBars.length);
const directionalReversalPreferences = sanitizeChartPreferences({ reversal: {
  pinBar: { enabled: true, bullishColor: "#112233", bearishColor: "#445566" },
  engulfing: { enabled: true, color: "#a855f7" },
} });
assert.deepEqual(directionalReversalPreferences.reversal.pinBar, { enabled: true, bullishColor: "#112233", bearishColor: "#445566" });
assert.notEqual(directionalReversalPreferences.reversal.engulfing.bullishColor, directionalReversalPreferences.reversal.engulfing.bearishColor, "legacy single-color preferences must migrate to unambiguous directional defaults");

let requestedPublicUrl = "";
const incrementalFetch = await fetchPublicDelayedCharts({
  symbols: ["1321"],
  contextsBySymbol: publicContexts,
  now: new Date("2026-07-29T08:30:00.000Z"),
  attempts: 1,
  fetchImpl: async (url) => {
    requestedPublicUrl = String(url);
    return {
      ok: true,
      async json() {
        return {
          chart: {
            result: [{
              timestamp: [Date.parse("2026-07-29T08:30:00.000Z") / 1000],
              indicators: {
                quote: [{
                  open: [195],
                  high: [198],
                  low: [194],
                  close: [197],
                  volume: [175],
                }],
              },
            }],
          },
        };
      },
    };
  },
});
const requestedPublicParams = new URL(requestedPublicUrl).searchParams;
assert.equal(requestedPublicParams.has("range"), false, "normal cycles must not request the rolling five-day range");
assert.equal(requestedPublicParams.get("period1"), String(incrementalWindow.period1));
assert.equal(requestedPublicParams.get("period2"), String(incrementalWindow.period2));
assert.deepEqual(incrementalFetch.requestModes, { incremental: 1, bootstrap: 0, backfill: 0 });

const normalizedHistory = normalizeAdjustedHistoricalBars({
  interval: "1d",
  metadata: { partial: false },
  data: [
    { date: "2024-12-31", open: 98, high: 104, low: 96, close: 100, adjusted_close: 50, volume: 1000 },
    { date: "2025-01-02", open: 50, high: 54, low: 49, close: 52, adjusted_close: 52, volume: 1200 },
    { date: "2025-01-02", open: 50, high: 55, low: 49, close: 53, adjusted_close: 53, volume: 1300 },
    { date: "2025-01-03", open: 50, high: 49, low: 51, close: 52, adjusted_close: 52, volume: 1200 },
  ],
}, "2024-01-01", "2025-12-31");
assert.equal(normalizedHistory.bars.length, 2, "historical normalization must reject invalid OHLC and coalesce duplicate dates");
assert.equal(normalizedHistory.bars[0].open, 49, "adjusted history must scale OHLC consistently with adjusted close");
assert.equal(normalizedHistory.bars[0].high, 52);
assert.equal(normalizedHistory.duplicateCount, 1);
assert.equal(normalizedHistory.rejectedCount, 1);
assert.deepEqual([...groupHistoricalBarsByYear(normalizedHistory.bars).keys()], ["2024", "2025"], "stored historical chunks must be partitioned by year");
assert.equal(normalizeAdjustedHistoricalBars({ interval: "1d", metadata: { partial: true }, data: [{ date: "2025-01-02", open: 1, high: 2, low: 1, close: 2, volume: 1 }] }, "2025-01-01", "2025-12-31").providerPartial, true);

const yahooHistory = normalizeYahooHistoricalBars({
  chart: {
    error: null,
    result: [{
      meta: { dataGranularity: "1d", firstTradeDate: 1704092400, exchangeTimezoneName: "Asia/Riyadh" },
      timestamp: [1704092400, 1704178800, 1704178800, 1704265200],
      indicators: { quote: [{
        open: [100, 101, 101, 105],
        high: [103, 104, 104, 104],
        low: [99, 100, 100, 106],
        close: [102, 103, 103, 105],
        volume: [1000, 1200, 1200, 900],
      }] },
    }],
  },
}, "2024-01-01", "2024-12-31");
assert.equal(yahooHistory.bars.length, 2, "public daily history must reject invalid OHLC and coalesce duplicate sessions");
assert.equal(yahooHistory.bars[0].time, "2024-01-01T07:00:00.000Z", "daily history must use the Riyadh session date");
assert.equal(yahooHistory.bars[1].close, 103);
assert.equal(yahooHistory.duplicateCount, 1);
assert.equal(yahooHistory.rejectedCount, 1);
assert.equal(yahooHistory.providerPartial, false, "a full period request beginning at first trade must be accepted as complete");
assert.throws(() => normalizeYahooHistoricalBars({ chart: { error: { code: "Not Found", description: "No data" }, result: null } }, "2024-01-01", "2024-12-31"), /No data/);

const longHistory = Array.from({ length: 650 }, (_, index) => ({
  time: new Date(Date.UTC(2020, 0, index + 1)).toISOString(),
  high: 100,
  low: 89,
  close: 90,
}));
const longHistoryMomentum = calculateMomentumZones(longHistory, 20);
assert.equal(longHistoryMomentum?.historyBars, 650, "reference-peak calculations must consume the complete stored history instead of truncating at 500 candles");
assert.equal(longHistoryMomentum?.zones?.length, 8, "the daily digital ladder must publish daily through ten-year zones from one authoritative formula");
assert.deepEqual(longHistoryMomentum.zones.map((zone) => zone.nameAr), ["قاع رقمي يومي", "قاع رقمي أسبوعي", "قاع رقمي شهري", "قاع رقمي ربع سنوي", "قاع رقمي سنوي", "قاع رقمي لثلاث سنوات", "قاع رقمي لخمس سنوات", "قاع رقمي لعشر سنوات"], "the daily digital ladder must keep its ordered Arabic identities");
assert.ok(longHistoryMomentum.zones.every((zone) => zone.light === "#16a34a" && zone.dark === "#22c55e"), "every unbroken digital bottom must default to green");
const weeklyMomentum = calculateMomentumZones(longHistory, 20, Number.POSITIVE_INFINITY, "1wk");
assert.equal(weeklyMomentum.zones.length, 7, "the weekly ladder must start weekly and end at ten years");
assert.deepEqual([weeklyMomentum.zones[0].nameAr, weeklyMomentum.zones.at(-1).nameAr], ["قاع رقمي أسبوعي", "قاع رقمي لعشر سنوات"]);
const monthlyMomentum = calculateMomentumZones(longHistory, 20, Number.POSITIVE_INFINITY, "1mo");
assert.equal(monthlyMomentum.zones.length, 6, "the monthly ladder must start monthly and end at ten years");
assert.deepEqual([monthlyMomentum.zones[0].nameAr, monthlyMomentum.zones.at(-1).nameAr], ["قاع رقمي شهري", "قاع رقمي لعشر سنوات"]);

const deepCycleSeed = Array.from({ length: 7 }, (_, index) => ({
  time: new Date(Date.UTC(2026, 2, index + 1)).toISOString(),
  open: index === 0 ? 98 : 95,
  high: index === 0 ? 100 : 99,
  low: index === 0 ? 97 : 93,
  close: index === 0 ? 98 : 95,
}));
const deepCycleMomentum = calculateMomentumZones([
  ...deepCycleSeed,
  { time: "2026-03-08T00:00:00.000Z", open: 95, high: 96, low: 60, close: 61 },
  { time: "2026-03-09T00:00:00.000Z", open: 61, high: 62, low: 44, close: 45 },
  { time: "2026-03-10T00:00:00.000Z", open: 45, high: 46, low: 32, close: 33 },
  { time: "2026-03-11T00:00:00.000Z", open: 33, high: 34, low: 18, close: 19 },
  { time: "2026-03-12T00:00:00.000Z", open: 19, high: 20, low: 7, close: 8 },
], 6);
assert.equal(deepCycleMomentum.zone6Active, true, "breaking the annual-zone stop must activate the three-year recurrence zone");
assert.equal(deepCycleMomentum.zone7Active, true, "breaking the three-year-zone stop must activate the five-year recurrence zone");
assert.equal(deepCycleMomentum.zones[5].role, "resistance", "a confirmed break of the three-year zone must reverse it into three-year resistance");
assert.equal(deepCycleMomentum.zones[6].active, true, "the five-year zone must be visible only after the sequential deep-cycle break");
assert.equal(deepCycleMomentum.zone8Active, true, "breaking the five-year digital bottom must activate the ten-year digital bottom");
assert.equal(deepCycleMomentum.zones[7].active, true, "the ten-year digital bottom must be visible only after the sequential five-year break");

const lifecycleBars = Array.from({ length: 7 }, (_, index) => ({
  time: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
  open: index === 0 ? 98 : 95,
  high: index === 0 ? 100 : 99,
  low: index === 0 ? 97 : 94,
  close: index === 0 ? 98 : 95,
}));
const wickOnlyBars = [...lifecycleBars, { time: "2026-01-08T00:00:00.000Z", open: 89, high: 91, low: 86, close: 88 }];
const wickOnlyMomentum = calculateMomentumZones(wickOnlyBars, 6);
assert.equal(wickOnlyMomentum.zones[0].role, "support", "a wick below the stop must not reverse a zone without a closing-price break");
const brokenBars = [...wickOnlyBars, { time: "2026-01-09T00:00:00.000Z", open: 88, high: 89, low: 85, close: 86 }];
const brokenMomentum = calculateMomentumZones(brokenBars, 6);
assert.equal(brokenMomentum.zones[0].role, "resistance", "a confirmed close below the stop must reverse support into resistance");
assert.equal(brokenMomentum.zones[0].lifecycleStatus, "resistance_candidate");
assert.equal(brokenMomentum.zones[0].displayStop, null, "the obsolete support stop must disappear from the active display after reversal");
assert.equal(brokenMomentum.zones[0].displayNameAr, "قمة رقمية يومية", "the displayed Arabic name must reflect the new digital-top role");
const duplicateBreakMomentum = calculateMomentumZones([...brokenBars, brokenBars.at(-1)], 6);
assert.equal(duplicateBreakMomentum.historyBars, brokenBars.length, "duplicate candle timestamps must be coalesced before lifecycle evaluation");
assert.equal(duplicateBreakMomentum.zoneEvents.filter((event) => event.type === "stop_broken" && event.zoneKey === "zone1").length, 1, "a duplicate candle must not create a duplicate lifecycle event");
const provisionalBreakMomentum = calculateMomentumZones([
  ...wickOnlyBars,
  { time: "2026-01-09T00:00:00.000Z", open: 88, high: 89, low: 85, close: 86, is_final: false },
], 6);
assert.equal(provisionalBreakMomentum.zones[0].role, "support", "a still-forming candle must never reverse a zone");
const retestedBars = [...brokenBars, { time: "2026-01-10T00:00:00.000Z", open: 88, high: 91, low: 88, close: 89 }];
const retestedMomentum = calculateMomentumZones(retestedBars, 6);
assert.equal(retestedMomentum.zones[0].lifecycleStatus, "resistance_confirmed", "a rejected retest inside the former support must confirm resistance");
const reclaimedBars = [
  ...retestedBars,
  { time: "2026-01-11T00:00:00.000Z", open: 91, high: 94, low: 89, close: 93 },
  { time: "2026-01-12T00:00:00.000Z", open: 93, high: 95, low: 92, close: 94 },
];
const reclaimedMomentum = calculateMomentumZones(reclaimedBars, 6);
assert.equal(reclaimedMomentum.zones[0].role, "support", "two closes above the zone must restore the support role");
assert.equal(reclaimedMomentum.zones[0].lifecycleStatus, "support_reclaimed");
assert.equal(reclaimedMomentum.zones[0].displayNameAr, "قاع رقمي يومي مستعاد", "a reclaimed digital top must recover its original time identity as a digital bottom");
assert.ok(Number.isFinite(reclaimedMomentum.zones[0].displayStop), "reclaimed support must receive a new visible stop");
assert.equal(new Set(reclaimedMomentum.zoneEvents.map((event) => event.id)).size, reclaimedMomentum.zoneEvents.length, "lifecycle event IDs must be deterministic and unique");

console.log(JSON.stringify({
  status: "verified",
  quarterHourScheduling: true,
  t15Freshness: true,
  canonicalChangeCalculation: true,
  experimentalPublicPreviousClose: true,
  explicitCandlesOnly: true,
  mergedHigherIntervals: true,
  incrementalCandleCursor: true,
  boundedBootstrapAndBackfill: true,
  appendWithoutDuplicateBars: true,
  canonicalQuarterHourBuckets: true,
  technicalSignals: true,
  saudiHigherTimeframeBoundaries: true,
  chartCandleTypes: true,
  permanentHistoricalArchive: true,
  fullHistoryMomentum: true,
  momentumRoleReversal: true,
  previewTabSessionHandoff: true,
  threeCandleSignalWindows: true,
}, null, 2));
