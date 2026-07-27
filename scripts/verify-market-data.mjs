import assert from "node:assert/strict";
import {
  SAUDI_DELAY_SECONDS,
  coverageStatus,
  freshnessStatus,
  normalizeLicensedSnapshot,
  normalizeProviderCandles,
  slotDecision,
} from "../base44/shared/market-data.ts";

const sundayQuarterHour = new Date("2026-07-26T07:15:00.000Z");
const quarterSlot = slotDecision({ now: sundayQuarterHour, source: "scheduled_licensed_t15", slotKind: "quarter_hour" });
assert.equal(quarterSlot.run, true);
assert.equal(quarterSlot.phase, "continuous");

const sundayClose = slotDecision({ now: new Date("2026-07-26T12:26:00.000Z"), source: "scheduled_licensed_close", slotKind: "close_price" });
assert.equal(sundayClose.run, true);
assert.equal(sundayClose.phase, "trade_at_last");

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

console.log(JSON.stringify({
  status: "verified",
  quarterHourScheduling: true,
  t15Freshness: true,
  canonicalChangeCalculation: true,
  explicitCandlesOnly: true,
}, null, 2));
