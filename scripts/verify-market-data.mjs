import assert from "node:assert/strict";
import {
  SAUDI_DELAY_SECONDS,
  MARKET_AUTOMATION_SPECS,
  coverageStatus,
  expectedProviderAsOf,
  freshnessStatus,
  normalizeLicensedSnapshot,
  normalizePublicDelayedCharts,
  normalizeProviderCandles,
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
assert.equal(expectedProviderAsOf(new Date("2026-07-26T07:16:42.000Z")), "2026-07-26T07:00:00.000Z", "delayed slots must be rounded to their quarter-hour boundary");

const saturday = slotDecision({ now: new Date("2026-07-25T07:15:00.000Z"), source: "scheduled_licensed_t15", slotKind: "quarter_hour" });
assert.equal(saturday.run, false);
assert.equal(saturday.reason, "non_trading_weekday");

assert.deepEqual(coverageStatus(270, 270), { coveragePercent: 100, status: "healthy" });
assert.equal(coverageStatus(267, 270).status, "degraded");
assert.equal(coverageStatus(256, 270).status, "failed");
assert.equal(freshnessStatus("2026-07-26T07:00:00.000Z", "2026-07-26T07:15:00.000Z"), "fresh");
assert.equal(freshnessStatus("2026-07-26T06:54:00.000Z", "2026-07-26T07:15:00.000Z"), "stale");

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

console.log(JSON.stringify({
  status: "verified",
  quarterHourScheduling: true,
  t15Freshness: true,
  canonicalChangeCalculation: true,
  experimentalPublicPreviousClose: true,
  explicitCandlesOnly: true,
}, null, 2));
