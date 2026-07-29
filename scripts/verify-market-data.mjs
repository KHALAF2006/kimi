import assert from "node:assert/strict";
import {
  SAUDI_DELAY_SECONDS,
  MARKET_AUTOMATION_SPECS,
  buildPublicCandleContexts,
  coverageStatus,
  expectedProviderAsOf,
  fetchPublicDelayedCharts,
  freshnessStatus,
  groupRowsByKey,
  mergeIncrementalCandleChunks,
  mergeStoredCandleSeries,
  normalizeLicensedSnapshot,
  normalizePublicDelayedCharts,
  normalizeProviderCandles,
  publicChartRequestWindow,
  slotDecision,
} from "../base44/shared/market-data.ts";

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
}, null, 2));
