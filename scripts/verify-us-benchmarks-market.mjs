import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SUPPORTED_MARKETS, resolveAvailableMarkets } from "../src/lib/marketAccess.js";

async function importTypeScriptModule(relativePath) {
  const result = await build({
    entryPoints: [path.resolve(relativePath)],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    write: false,
    logLevel: "silent",
  });
  const moduleUrl = "data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64");
  return import(moduleUrl);
}

const { US_BENCHMARKS_CATALOG, US_BENCHMARKS_MARKET_CODE, US_BENCHMARKS_SYMBOLS } = await importTypeScriptModule("./base44/shared/us-benchmarks-catalog.ts");

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

assert.equal(US_BENCHMARKS_MARKET_CODE, "US_BENCHMARKS");
assert.equal(US_BENCHMARKS_CATALOG.instruments.length, 33);
const ingestionConfig = JSON.parse(await readFile(new URL("../base44/functions/usBenchmarksMarketIngestion/function.jsonc", import.meta.url), "utf8"));
assert.equal(ingestionConfig.automations, undefined, "this Workflows-enabled app must keep function-level legacy automations disabled");
assert.equal(US_BENCHMARKS_SYMBOLS.size, 33, "benchmark symbols must be unique");
assert.equal(new Set(US_BENCHMARKS_CATALOG.instruments.map((item) => item.providerSymbol)).size, 33, "provider mappings must be unique");
assert.ok(US_BENCHMARKS_CATALOG.instruments.every((item) => ["market_index", "etf"].includes(item.type)));
assert.ok(SUPPORTED_MARKETS.some((market) => market.market_code === US_BENCHMARKS_MARKET_CODE));
assert.deepEqual(resolveAvailableMarkets({ market_access: [{ market_code: US_BENCHMARKS_MARKET_CODE }] }).map((market) => market.market_code), [US_BENCHMARKS_MARKET_CODE], "a benchmark-only subscriber must not receive another market");
assert.deepEqual(resolveAvailableMarkets({ identity: { role: "owner" }, market_access: [] }).map((market) => market.market_code), ["SA_MAIN", "US_OPTIONS", "US_BENCHMARKS"], "the owner must see every supported market without cross-market data merging");

const ingestion = await source("base44/functions/usBenchmarksMarketIngestion/source.ts");
const bundledIngestion = await source("base44/functions/usBenchmarksMarketIngestion/entry.ts");
assert.match(bundledIngestion, /GENERATED from usBenchmarksMarketIngestion\/source\.ts/, "the deployed benchmark function must be generated from its audited source");
assert.doesNotMatch(bundledIngestion, /from "\.\.\/\.\.\/shared\//, "the deployed benchmark function must not depend on files outside its deployable folder");
assert.match(ingestion, /new Set\(bar\.component_times\)\.size === 3/, "15-minute candles must require all three five-minute components");
assert.match(ingestion, /incrementalProviderWindow/, "normal benchmark cycles must resume from the latest stored candle");
assert.match(ingestion, /earliestRecentGapByInstrument/, "a recent interior gap must widen only the affected instrument request");
assert.match(ingestion, /AlertRule\.filter\(\{ market_code: US_BENCHMARKS_MARKET_CODE, enabled: true \}/, "benchmark alert evaluation must be market-scoped at the database boundary");
assert.match(ingestion, /DeliveryEvent\.bulkCreate\(missing\)/, "benchmark alert events must be deduplicated and inserted in a bounded batch");
assert.match(ingestion, /url\.searchParams\.set\("period1"/, "an incremental provider window must request only the missing tail");
assert.match(ingestion, /mergeCandleBars\(existing\?\.bars, session\.bars\)/, "overlap candles must merge into the durable session instead of replacing it");
assert.match(ingestion, /canonical_version: "us-benchmarks-intraday-v4"/);
assert.match(ingestion, /QuoteObservation\.bulkCreate/, "every accepted quote batch must be retained as immutable observations");
assert.match(ingestion, /preserved_last_good/, "failed coverage must preserve last-known-good public data");
assert.match(ingestion, /coverage >= 99[\s\S]*coverage >= 95/, "coverage thresholds must be healthy at 99% and degraded at 95%+");
assert.match(ingestion, /action === "daily_refresh"/, "daily history must update incrementally after the initial full archive");
assert.match(ingestion, /barIntervalMs: 24 \* 60 \* 60 \* 1000/, "daily close reconciliation must resume from the stored daily cursor");
assert.match(ingestion, /canonical_version: "us-benchmarks-daily-v3"/, "daily overlap corrections must remain split into durable yearly chunks");
assert.match(ingestion, /clock\.date, true\)/, "the after-close workflow must persist the completed current session instead of remaining one day behind");
assert.match(ingestion, /action === "data_status"/, "operations must expose benchmark quote, candle, history and signal coverage");
assert.match(ingestion, /MarketSession\.filter\(\{ market_code: US_BENCHMARKS_MARKET_CODE/, "scheduled ingestion must honor the stored U.S. session calendar");
assert.match(ingestion, /MarketHoliday\.filter\(\{ market_code: US_BENCHMARKS_MARKET_CODE/, "scheduled ingestion must skip stored market holidays");
assert.match(ingestion, /evaluateAlerts\(base44, quotes, isFinal, nextTradingDate\)/, "benchmark price alerts must be evaluated only after a publishable market snapshot");
assert.match(ingestion, /last_evaluation_bucket/, "benchmark alert evaluation must be idempotent per interval bucket");
assert.match(ingestion, /reason: "already_refreshed"/, "daily history refresh must not charge or rewrite the same session twice");
assert.match(ingestion, /bars\.length < 250/, "a full benchmark archive must pass a meaningful minimum coverage gate");
assert.match(ingestion, /pendingIntradayArchiveInstruments/, "intraday archive reconciliation must read stored coverage before calling the provider");
assert.match(ingestion, /intraday_archive_already_complete/, "a complete stored archive must not be downloaded again");
assert.match(ingestion, /LEASE_EXPIRED/, "stale benchmark runs must be closed deterministically on the next scheduled cycle");
assert.match(ingestion, /Math\.min\(8,/, "archive repair must use bounded batches that fit the backend execution limit");

const signals = await source("base44/functions/usBenchmarksSignalRefresh/source.ts");
assert.match(signals, /"-start_time", 500\)/, "benchmark projection must cap each candle read below the entity traffic ceiling");
for (const token of ["technical_signals", "momentum_zones", '"1wk"', '"1mo"', "market_code: US_BENCHMARKS_MARKET_CODE"]) assert.match(signals, new RegExp(token));
assert.doesNotMatch(signals, /deleteMany|functions\.invoke\("usBenchmarksSignalRefresh"/, "signal projection must neither erase another market nor recurse through the service API");
const signalConfig = JSON.parse(await source("base44/functions/usBenchmarksSignalRefresh/function.jsonc"));
assert.equal(signalConfig.automations, undefined, "the Workflows-enabled app must not contain rejected legacy function automations");
assert.match(signals, /already_projected/, "repeated projection for the same market session must be idempotently skipped");
assert.match(signals, /const PROJECTION_BATCH_SIZE = 6/, "benchmark projection must stay below the observed Base44 execution ceiling");
assert.match(signals, /interval: \{ \$in: \["1d", "15m"\] \}/, "benchmark projection must read only its canonical daily and intraday inputs");
assert.match(signals, /interval: \{ \$in: \["1wk", "1mo"\] \}/, "benchmark projection must read projected intervals separately for idempotent upserts");
assert.match(signals, /const PROJECTION_BATCH_COUNT = Math\.ceil/, "benchmark projection capacity must follow the catalog size");
assert.match(signals, /run_type: "technical_projection_batch"/, "each benchmark batch must be independently observable and resumable");
assert.match(signals, /remaining_batches:/, "benchmark projection must expose bounded progress");
assert.doesNotMatch(signals, /Promise\.allSettled/, "benchmark projection must not fan out all batches inside one backend call");
assert.match(signals, /chunk\.is_final === true/, "benchmark daily projection must use only a finalized intraday session");
assert.match(signals, /chunk\.completeness_status === "complete"/, "benchmark daily projection must reject an incomplete intraday session");

const saudiSignals = await source("base44/functions/marketSignalRefresh/source.ts");
assert.doesNotMatch(saudiSignals, /deleteMany|functions\.invoke\("marketSignalRefresh"/, "Saudi projection must stay in-process and must never delete another market");
assert.match(saudiSignals, /filter\(\{ market_code: MARKET_CODE \}/, "Saudi projection catalog reads must be market-scoped");

const marketRead = await source("base44/functions/marketRead/entry.ts");
assert.match(marketRead, /US_BENCHMARKS_CATALOG_INCOMPLETE/);
assert.match(marketRead, /US_BENCHMARKS_SYMBOLS/, "benchmark reads must enforce the exact 33-instrument allowlist, not only its count");
assert.match(marketRead, /requireMarketEntitlement\(context, body\.market_code\)/, "every benchmark read must enforce the subscription on the backend");
assert.match(marketRead, /market_code: body\.market_code/, "instrument detail reads must remain market-scoped");
assert.match(marketRead, /market_code: requestedMarket, instrument_id: \{ \$in: instrumentIds \}/, "bulk quotes and signals must be isolated by both market and instrument identity");

const dashboard = await source("src/pages/Dashboard.jsx");
assert.ok(dashboard.indexOf('instrument.instrument_type === "sector_index"') < dashboard.indexOf('marketCode === "US_BENCHMARKS"'), "synthetic benchmark categories must open their category chart before the generic instrument route");

const admin = await source("base44/functions/adminMarketData/entry.ts");
for (const token of ["usBenchmarksMarketIngestion", "usBenchmarksSignalRefresh", "US_BENCHMARKS_PROVIDER_CODE"]) assert.match(admin, new RegExp(token));
assert.match(admin, /runsPerDay: 10, monthlyRuns: 224/, "the owner dashboard must show the actual benchmark automation-credit budget");

for (const file of ["UsBenchmarksQuarterCycles", "UsBenchmarksDailyRefresh", "UsBenchmarksSignalsDaily", "UsBenchmarksIntradayHistory", "UsBenchmarksHistoricalBootstrap"]) {
  const workflow = JSON.parse(await source(`base44/workflows/${file}.jsonc`));
  assert.equal(workflow.trigger.config.timezone, "America/New_York");
  assert.match(JSON.stringify(workflow), /US_BENCHMARKS/);
}
const hourlyWorkflow = JSON.parse(await source("base44/workflows/UsBenchmarksQuarterCycles.jsonc"));
assert.equal(hourlyWorkflow.trigger.config.cron_expression, "20 10-16 * * 1-5", "benchmark ingestion must fetch incrementally once per hour");
const signalWorkflow = JSON.parse(await source("base44/workflows/UsBenchmarksSignalsDaily.jsonc"));
assert.equal(signalWorkflow.trigger.config.cron_expression, "15 18 * * 1-5", "benchmark signals must run after the New York session through Base44 Workflows");
const benchmarkSignalSteps = signalWorkflow.definition.do.map((entry) => {
  const [key, step] = Object.entries(entry)[0];
  return { key, step };
});
const benchmarkSignalCalls = benchmarkSignalSteps.filter(({ step }) => step.call === "invoke_backend_function");
const benchmarkSignalWaits = benchmarkSignalSteps.filter(({ step }) => step.wait === "PT2M");
assert.equal(benchmarkSignalCalls.length, 7, "benchmark signals must run 6 bounded batches and then finalize");
assert.equal(benchmarkSignalWaits.length, 6, "benchmark batches must be separated by two minutes");
assert.equal(benchmarkSignalSteps.length, 13, "benchmark signal projection must stay strictly sequential");
for (const { step } of benchmarkSignalCalls) {
  assert.equal(step.with.function_name, "usBenchmarksSignalRefresh");
  assert.deepEqual(step.with.args, { market_code: "US_BENCHMARKS", source: "daily_session_projection" });
}
for (let index = 0; index < benchmarkSignalSteps.length; index += 1) {
  assert.equal(benchmarkSignalSteps[index].step.then, benchmarkSignalSteps[index + 1]?.key || "end", "benchmark projection steps must never branch or run concurrently");
}

console.log(JSON.stringify({ status: "verified", market: US_BENCHMARKS_MARKET_CODE, instruments: 33, isolation: true, complete_15m_only: true, stored_history: true, signals: ["1d", "1wk", "1mo"] }, null, 2));
