import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import path from "node:path";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

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
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
}

const catalogModule = await importTypeScriptModule("./base44/shared/us-options-catalog.ts");
const timingModule = await importTypeScriptModule("./base44/shared/us-options-timing.ts");
const timeframeModule = await importTypeScriptModule("./src/lib/chart-timeframes.js");
const intelligenceModule = await importTypeScriptModule("./base44/shared/us-company-intelligence.ts");
const incrementalCandleModule = await importTypeScriptModule("./base44/shared/incremental-candle-sync.ts");
const catalog = catalogModule.US_OPTIONS_CATALOG;
const symbols = catalog.companies.map((item) => item.symbol);
assert.equal(catalog.market.market_code, "US_OPTIONS");
assert.equal(catalog.market.currency, "USD");
assert.equal(catalog.market.timezone, "America/New_York");
assert.equal(catalog.companies.length, 110, "the isolated U.S. options universe must contain exactly 110 companies");
assert.equal(new Set(symbols).size, 110, "the U.S. options universe must not contain duplicate symbols");
assert.equal(symbols.includes("NFLX"), false, "NFLX must remain excluded by the owner's selection rule");
assert.ok(catalog.companies.every((item) => item.nameEn && item.sectorEn && item.industryEn && item.nasdaqUrl), "every U.S. company must have catalog metadata");
assert.ok(catalog.companies.every((item) => /[\u0600-\u06ff]/.test(item.nameAr)), "every U.S. company must have an Arabic display name");
assert.ok(catalog.companies.every((item) => /[\u0600-\u06ff]/.test(item.sectorAr)), "every U.S. company must have an Arabic sector label");
assert.deepEqual(new Set(catalog.companies.map((item) => item.sectorAr)), new Set(["المواد الأساسية", "السلع الاستهلاكية الكمالية", "السلع الاستهلاكية الأساسية", "الطاقة", "الخدمات المالية", "الرعاية الصحية", "الصناعات", "العقارات", "تقنية المعلومات", "خدمات الاتصالات", "المرافق العامة"]));
assert.equal(catalog.companies.find((item) => item.symbol === "MRVL")?.nameAr, "مارفل تكنولوجي");
assert.equal(catalog.companies.find((item) => item.symbol === "PLTR")?.nameAr, "بالانتير تكنولوجيز");
assert.equal(catalog.companies.find((item) => item.symbol === "AAPL")?.nameEn, "Apple Inc. Common Stock", "English legal display names must remain unchanged");
assert.ok(catalog.companies.every((item) => !Object.hasOwn(item, "last_price") && !Object.hasOwn(item, "price")), "selection prices must never be persisted as live quotes");
const cycleNow = new Date("2026-08-04T14:15:00.000Z");
assert.equal(new Date(timingModule.delayedCutoffMs(cycleNow)).toISOString(), "2026-08-04T14:00:00.000Z");
assert.equal(timingModule.isCompletedDelayedBar(new Date("2026-08-04T13:45:00.000Z"), cycleNow), true, "the 09:45 EDT bar is complete at the 10:15 EDT T+15 cycle");
assert.equal(timingModule.isCompletedDelayedBar(new Date("2026-08-04T14:00:00.000Z"), cycleNow), false, "the live 10:00 EDT bar must not leak into the 10:15 EDT T+15 cycle");
assert.equal(timingModule.alertIntervalDue("1h", "2026-08-04T14:30:00.000Z", false), true);
assert.equal(timingModule.alertIntervalDue("2h", "2026-08-04T14:30:00.000Z", false), false);
assert.equal(timingModule.alertIntervalDue("1wk", "2026-04-02T20:00:00.000Z", true, { nextTradingDate: "2026-04-06" }), true, "the Thursday close before Good Friday must finalize the trading week");
assert.equal(timingModule.alertIntervalDue("1mo", "2026-05-29T20:00:00.000Z", true, { nextTradingDate: "2026-06-01" }), true, "the final trading session must finalize the month");
assert.equal(timingModule.alertIntervalDue("1mo", "2026-05-28T20:00:00.000Z", true, { nextTradingDate: "2026-05-29" }), false);

const storedCursorFixture = incrementalCandleModule.latestStoredCandleByInstrument([
  { instrument_id: "aapl", quality_status: "verified", bars: [{ time: "2026-08-04T14:00:00.000Z", close: 100 }] },
  { instrument_id: "aapl", quality_status: "quarantined", bars: [{ time: "2026-08-04T14:15:00.000Z", close: 999 }] },
]);
assert.equal(storedCursorFixture.get("aapl").time, "2026-08-04T14:00:00.000Z", "a quarantined candle must never advance the durable cursor");
const incrementalWindowFixture = incrementalCandleModule.incrementalProviderWindow(storedCursorFixture.get("aapl").time, new Date("2026-08-04T14:45:00.000Z"), { overlapBars: 2 });
assert.equal(incrementalWindowFixture.mode, "incremental");
assert.equal(new Date(incrementalWindowFixture.period1 * 1000).toISOString(), "2026-08-04T13:45:00.000Z", "two overlap candles must include the cursor candle and the one before it");
assert.equal(incrementalCandleModule.incrementalProviderWindow(null, new Date("2026-08-04T14:45:00.000Z")).mode, "bootstrap");
assert.equal(incrementalCandleModule.incrementalProviderWindow("2026-07-01T14:00:00.000Z", new Date("2026-08-04T14:45:00.000Z")).mode, "gap_recovery");
assert.equal(incrementalCandleModule.earliestRecentGapByInstrument([
  { instrument_id: "aapl", bars: [{ time: "2026-08-04T13:45:00.000Z" }, { time: "2026-08-04T14:15:00.000Z" }] },
], new Date("2026-08-04T14:45:00.000Z")).get("aapl").time, "2026-08-04T14:00:00.000Z", "an interior missing candle must move the next request back to the gap");
assert.deepEqual(
  incrementalCandleModule.mergeCandleBars(
    [{ time: "2026-08-04T13:45:00.000Z", close: 99 }, { time: "2026-08-04T14:00:00.000Z", close: 100 }],
    [{ time: "2026-08-04T14:00:00.000Z", close: 101 }, { time: "2026-08-04T14:15:00.000Z", close: 102 }],
  ).map((bar) => bar.close),
  [99, 101, 102],
  "an overlapping provider candle must correct the stored candle without duplicating or deleting the session",
);

const memoryStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => memoryStorage.get(key) ?? null,
  setItem: (key, value) => memoryStorage.set(key, String(value)),
};
timeframeModule.persistSuccessfulChartSelection("SA_MAIN", "instrument", "1111", { interval: "1d", range: "1y" });
timeframeModule.persistSuccessfulChartSelection("US_OPTIONS", "instrument", "PLTR", { interval: "2h", range: "5d" });
assert.deepEqual(timeframeModule.readSuccessfulChartSelection("SA_MAIN", "instrument", "1111"), { interval: "1d", range: "1y" }, "Saudi chart selection must remain market and instrument scoped");
assert.deepEqual(timeframeModule.readSuccessfulChartSelection("US_OPTIONS", "instrument", "PLTR"), { interval: "2h", range: "5d" }, "U.S. chart selection must not leak into Saudi state");
assert.deepEqual(timeframeModule.normalizeChartSelection({ interval: "2h", range: "5y" }), { interval: "2h", range: "5d" }, "an invalid intraday range must recover to the bounded default");
assert.deepEqual(timeframeModule.rangesForInterval("15m").map((item) => item.value), ["5d", "1mo"], "15-minute controls must not advertise unsupported long ranges");
assert.deepEqual(timeframeModule.rangesForInterval("3h").map((item) => item.value), ["5d", "1mo", "3mo"], "three-hour controls must expose only its supported ranges");
assert.equal(timeframeModule.bestAvailableRange("3h", ["5d"]), "5d", "partial intraday history must fall back to a range actually covered by stored candles");
assert.equal(timeframeModule.bestAvailableRange("15m", []), null, "the UI must not claim a completed range when no range has proven coverage");

const instrumentFixture = { id: "instrument-aapl", symbol: "AAPL", name_en: "Apple Inc." };
const nowFixture = "2026-08-04T12:00:00.000Z";
const submissionsFixture = {
  cik: "0000320193", name: "Apple Inc.", sic: "3571", sicDescription: "Electronic Computers", fiscalYearEnd: "0926", stateOfIncorporation: "CA",
  filings: { recent: {
    accessionNumber: ["0000320193-26-000001", "0000320193-26-000002"],
    filingDate: ["2026-07-31", "2026-07-15"], acceptanceDateTime: ["2026-07-31T16:00:00Z", "2026-07-15T16:00:00Z"],
    form: ["10-Q", "8-K"], primaryDocument: ["aapl-20260627.htm", "aapl-8k.htm"], fp: ["Q3", ""],
  } },
};
const factsFixture = { facts: { "us-gaap": {
  RevenueFromContractWithCustomerExcludingAssessedTax: { units: { USD: [{ end: "2026-06-27", filed: "2026-07-31", form: "10-Q", fp: "Q3", fy: 2026, accn: "0000320193-26-000001", val: 94000000000 }] } },
  NetIncomeLoss: { units: { USD: [{ end: "2026-06-27", filed: "2026-07-31", form: "10-Q", fp: "Q3", fy: 2026, accn: "0000320193-26-000001", val: 23000000000 }] } },
  EarningsPerShareDiluted: { units: { "USD/shares": [{ end: "2026-06-27", filed: "2026-07-31", form: "10-Q", fp: "Q3", fy: 2026, accn: "0000320193-26-000001", val: 1.57 }] } },
} } };
const secMap = intelligenceModule.normalizeSecTickerMap({ 0: { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." } });
assert.equal(secMap.get("AAPL").cik, "0000320193");
assert.equal(intelligenceModule.normalizeSecProfile(submissionsFixture, instrumentFixture, nowFixture).sic_code, "3571");
assert.equal(intelligenceModule.normalizeSecFilings(submissionsFixture, instrumentFixture, "sec-source", nowFixture).length, 2);
const financialFixture = intelligenceModule.normalizeSecFinancials(factsFixture, submissionsFixture, instrumentFixture, "sec-source", nowFixture);
assert.equal(financialFixture.length, 1);
assert.equal(financialFixture[0].revenue, 94000000000);
assert.equal(financialFixture[0].eps, 1.57);
const framedFactsFixture = structuredClone(factsFixture);
framedFactsFixture.facts["us-gaap"].RevenueFromContractWithCustomerExcludingAssessedTax.units.USD = [
  { start: "2025-09-28", end: "2026-06-27", filed: "2026-07-31", form: "10-Q", fp: "Q3", fy: 2026, accn: "0000320193-26-000001", val: 280000000000 },
  { start: "2026-03-29", end: "2026-06-27", filed: "2026-07-31", form: "10-Q", fp: "Q3", fy: 2026, frame: "CY2026Q2", accn: "0000320193-26-000001", val: 94000000000 },
];
assert.equal(intelligenceModule.normalizeSecFinancials(framedFactsFixture, submissionsFixture, instrumentFixture, "sec-source", nowFixture)[0].revenue, 94000000000, "a framed quarter must win over a same-end-date year-to-date fact");
const actionFixture = intelligenceModule.normalizeYahooActions({ chart: { result: [{ events: { dividends: { one: { date: 1785196800, amount: 0.26 } }, splits: {} } }] } }, instrumentFixture, "yahoo-source", nowFixture);
assert.equal(actionFixture[0].event_type, "dividend");
const holderFixture = intelligenceModule.normalizeNasdaqHolders({ data: { ownershipSummary: { ShareoutstandingTotal: { value: "1,000" } }, holdingsTransactions: { table: { rows: [{ ownerName: "Example Capital", sharesHeld: "100,000,000", sharesChange: "10,000,000", url: "/holder" }] } } } }, instrumentFixture, "nasdaq-source", nowFixture);
assert.equal(holderFixture[0].ownership_percent, 10);
assert.equal(Math.round(holderFixture[0].change_percent), 1);

const security = await source("base44/shared/security.ts");
assert.match(security, /"market\.us\.options"/);
assert.match(security, /entitlementGroups\.forEach/);
assert.match(security, /if \(codes\.has\("market\.us\.options"\)\) marketCodes\.add\("US_OPTIONS"\)/);
assert.match(security, /Fail closed for plans without market entitlements/);
assert.match(security, /smart-investor-trial-10d-us_options/);
assert.match(security, /MARKET_SUBSCRIPTION_REQUIRED/);
assert.match(security, /authorizationContext[\s\S]*ensureAdministrativeProfile\(base44, user\)/, "the explicitly bootstrapped owner must be reconciled at the authorization boundary without requiring a fresh login");
assert.match(security, /if \(!profile \|\| user\?\.role !== "admin"\) return profile/, "a Base44 admin identity without an application profile must fail closed");
assert.doesNotMatch(security, /customer\.admin_bootstrapped/, "application administrators must never be created from Base44's hosting role alone");
assert.match(security, /const owner = hasTrustedOwnerMarker\(user, profile\)/, "only the explicit platform owner marker may reconcile elevated access");

const permissions = await source("base44/shared/permissions.ts");
assert.match(permissions, /"market\.us\.options"/);
const subscriptionsAdmin = await source("base44/functions/adminSubscriptions/entry.ts");
assert.match(subscriptionsAdmin, /otherActiveSubscriptions/);
assert.match(subscriptionsAdmin, /remaining_active_subscriptions/);
assert.match(subscriptionsAdmin, /\["suspended", "expired", "banned"\]\.includes\(status\) && otherActiveSubscriptions\.length === 0/);
assert.doesNotMatch(subscriptionsAdmin, /status === "banned" \|\|/);

const adminAccess = await source("base44/functions/adminAccess/entry.ts");
assert.match(adminAccess, /expectedRevisions\[id\]/, "access decisions must carry the revision viewed by the administrator");
assert.match(adminAccess, /claimed\?\.decision_token !== decisionToken/, "access decisions must confirm their unique logical claim before side effects");
assert.match(adminAccess, /approval decision superseded/, "a superseded approval must revoke the subscription it created");
assert.match(adminAccess, /duplicate application activation reconciled/, "concurrent duplicate subscriptions must be reconciled to one active record");

const marketRead = await source("base44/functions/marketRead/entry.ts");
assert.match(marketRead, /function localizedInstrument/, "U.S. Arabic catalog labels must be projected at read time without waiting for the next ingestion cycle");
assert.match(marketRead, /\.map\(localizedInstrument\)/, "all U.S. company collections must use the localized catalog projection");
assert.match(marketRead, /requireMarketEntitlement\(context, body\.market_code\)/);
assert.match(marketRead, /CROSS_MARKET_ACCESS_DENIED/);
assert.match(marketRead, /CATALOG_ISOLATION_FAILED/);
assert.match(marketRead, /U\.S\. options catalog mismatch/);
assert.match(marketRead, /timeZone: "America\/New_York", sessionStartMinutes: 570, weekStartsOn: 1/);
assert.match(marketRead, /mergeStoredCandleSeries\(series, interval, marketCandleOptions\(marketCode\)\)/);
assert.match(marketRead, /canonicalVersion\.includes\("daily-projection"\)/);
assert.doesNotMatch(marketRead, /const freshness = !licensed/);
for (const optionalCompanySection of ["company indicators", "company financials", "company actions", "company announcements", "company shareholders", "company loss classification"]) {
  assert.match(marketRead, new RegExp(`optionalRows\\(\\(\\) => [^\\n]+, "${optionalCompanySection}"\\)`), `${optionalCompanySection} must not make the entire company profile unavailable`);
}

for (const backend of ["screeningWatchlists", "customerSelfService"]) {
  const text = await source(`base44/functions/${backend}/entry.ts`);
  assert.match(text, /requireMarketEntitlement/);
  assert.match(text, /market_code/);
}
const drawingsBackend = await source("base44/functions/chartDrawings/entry.ts");
assert.match(drawingsBackend, /requireMarketEntitlement/);
assert.match(drawingsBackend, /Instrument\.filter\(\{ symbol, market_code: marketCode \}\)/);
assert.match(drawingsBackend, /\(row\.market_code \|\| "SA_MAIN"\) !== marketCode/);
const drawingService = await source("src/services/drawingService.js");
assert.match(drawingService, /market_code: marketCode/);
assert.match(drawingService, /smart_investor_chart_drawings_\$\{marketCode\}_\$\{symbol\}/);

const ingestion = await source("base44/functions/usOptionsMarketIngestion/source.ts");
assert.match(ingestion, /url\.searchParams\.set\("interval", "5m"\)/);
assert.match(ingestion, /incrementalProviderWindow/);
assert.match(ingestion, /earliestRecentGapByInstrument/);
assert.match(ingestion, /AlertRule\.filter\(\{ market_code: US_OPTIONS_MARKET_CODE, enabled: true \}/, "U.S. options alert evaluation must be market-scoped at the database boundary");
assert.match(ingestion, /DeliveryEvent\.bulkCreate\(missing\)/, "U.S. options alert events must be deduplicated and inserted in a bounded batch");
assert.match(ingestion, /url\.searchParams\.set\("period1"/);
assert.match(ingestion, /mergeCandleBars\(existing\?\.bars, session\.bars\)/);
assert.match(ingestion, /new Set\(bar\.component_times\)\.size === 3/, "a published 15-minute candle must contain all three five-minute components");
assert.match(ingestion, /QuoteObservation\.bulkCreate/, "accepted provider observations must remain auditable before promotion");
assert.match(ingestion, /preserved_last_good/, "failed batch coverage must preserve the previous public snapshot");
assert.match(ingestion, /delayedCutoffMs/);
assert.match(ingestion, /isCompletedDelayedBar/);
assert.match(ingestion, /alertIntervalDue/);
assert.match(ingestion, /MarketSession\.filter/);
assert.match(ingestion, /nextTradingSessionDate/);
assert.match(ingestion, /US_OPTIONS_CATALOG_INCOMPLETE/);
assert.match(ingestion, /quality_status: freshnessStatus === "fresh" \? "verified" : "stale"/);
assert.match(ingestion, /freshness_status: "stale"/);
assert.match(ingestion, /const CONCURRENCY = 8/, "provider requests must remain bounded to reduce transient throttling failures");
assert.match(ingestion, /const PROVIDER_MAX_ATTEMPTS = 4/, "transient provider failures must receive bounded retries");
assert.match(ingestion, /if \(status !== "failed"\) await evaluateAlerts\(base44, acceptedQuotes, isFinal, nextTradingDate\)/, "a failed batch must not evaluate alerts from data that was not promoted");
assert.match(ingestion, /status === "failed" \|\| !acceptedIds\.has\(quote\.instrument_id\)/, "all quotes in a rejected batch must be marked stale while preserving their last values");
assert.match(ingestion, /async function ensureCatalog/);
assert.match(ingestion, /batch_count/);
assert.match(ingestion, /batch_index/);
assert.match(ingestion, /barsBySession/, "the five-day provider response must be partitioned into durable exchange sessions");
assert.match(ingestion, /for \(const session of mergedSessions\)/, "every returned 15-minute session must be merged and persisted, not only the current day");
assert.match(ingestion, /canonical_version: "us-options-intraday-v3"/);
assert.match(ingestion, /forcedRecovery = body\.force === true/);
assert.match(ingestion, /!forcedRecovery && \(minute < 600 \|\| minute > closeMinute \+ 30\)/);
assert.match(ingestion, /body\.action === "data_status"/);
assert.match(ingestion, /intraday_instrument_count: coveredIntraday\.size/);
assert.match(ingestion, /daily_history_instrument_count: coveredDaily\.size/);
assert.match(ingestion, /missing_symbols:/, "the data-status endpoint must report exact missing instruments");
assert.match(ingestion, /latest_price_runs:/, "the data-status endpoint must expose recent ingestion diagnostics");
assert.match(ingestion, /failed_symbols: failures\.map/, "failed runs must retain exact failed symbols");
assert.match(ingestion, /terminal_error:/, "the terminal error must augment rather than overwrite run diagnostics");
assert.ok(
  ingestion.indexOf("await ensureCatalog(base44, now)") < ingestion.indexOf("if (!session.tradingDay && !forcedRecovery)"),
  "the U.S. catalog must initialize before the market-session early return",
);

const history = await source("base44/functions/usOptionsHistoricalBackfill/source.ts");
assert.match(history, /async function ensureCatalog/);
assert.match(history, /is_historical_archive: true/);
assert.match(history, /coverage_verified: true/);
assert.match(history, /preserve = existingSync\?\.status === "complete"/);
assert.match(history, /adjustment_mode: "none"/);

const companyIntelligence = await source("base44/functions/usOptionsCompanyIntelligence/source.ts");
for (const marker of ["normalizeSecFinancials", "normalizeSecFilings", "normalizeYahooActions", "normalizeNasdaqHolders", "company_data_status"]) assert.match(companyIntelligence, new RegExp(marker));
assert.match(companyIntelligence, /data\.sec\.gov/);
assert.match(companyIntelligence, /institutional-holdings/);
assert.match(companyIntelligence, /const complete = failures\.length === 0/);
assert.match(companyIntelligence, /const DEFAULT_BATCH_SIZE = 5/);
assert.match(companyIntelligence, /const MAX_BATCH_SIZE = 5/);
assert.match(companyIntelligence, /Object\.entries\(payload\)\.some/, "unchanged catalog rows must not be rewritten on every company cycle");
assert.match(companyIntelligence, /const \[financialResult, announcementResult, actionResult, shareholderResult\] = await Promise\.all/, "independent company entity upserts must run concurrently within the bounded provider wave");
assert.ok(companyIntelligence.indexOf("IngestionRun.create") < companyIntelligence.indexOf("company_tickers.json"), "provider-map failures must be recorded in the ingestion run instead of disappearing before observability begins");
assert.match(companyIntelligence, /length: selected\.length/, "each bounded company must use one worker so the invocation cannot create multiple timeout waves");
const adminMarketData = await source("base44/functions/adminMarketData/entry.ts");
assert.match(adminMarketData, /REFERENCE_YAHOO_US_OPTIONS_T15/);
assert.match(adminMarketData, /refresh_company_intelligence/);
assert.match(adminMarketData, /runsPerDay: 17, monthlyRuns: 390/);

const signals = await source("base44/functions/usOptionsSignalRefresh/source.ts");
assert.match(signals, /interval: "1d" \}, "-start_time", 1000\)/, "U.S. options projection must include the newest bounded daily history before chronological normalization");
assert.match(signals, /dedupeDailyBars/);
assert.match(signals, /const PROJECTION_BATCH_SIZE = 16/);
assert.match(signals, /PROJECTION_BATCH_COUNT = Math\.ceil/);
assert.match(signals, /body\.mode === "projection_batch"/);
assert.match(signals, /body\.mode === "projection_finalize"/);
assert.match(signals, /run_type: "technical_projection_batch"/);
assert.match(signals, /market_data\.refresh_signals_batch/);
assert.match(signals, /instrument_id: idQuery, market_code: US_OPTIONS_MARKET_CODE, interval: "1d"/);
assert.match(signals, /higherTimeframeRows/, "signal projection must load existing weekly and monthly rows before upserting them");
assert.match(signals, /interval: \{ \$in: \["1wk", "1mo"\] \}/, "weekly and monthly projections must be idempotent instead of creating duplicate canonical chunks");
assert.match(signals, /functions\.invoke\("usOptionsSignalProjectionWorker"/);
assert.match(signals, /remaining_batches:/);
assert.doesNotMatch(signals, /Promise\.allSettled\(group\.map/);
assert.match(signals, /projectInstrumentBatch\(base44, selected\.map/);
assert.doesNotMatch(signals, /fetch\(/, "signal projection must read the stored candle archive instead of downloading history again");
assert.match(signals, /aggregateTechnicalBars\(daily, "1wk", MARKET_OPTIONS\)/);
assert.match(signals, /aggregateTechnicalBars\(daily, "1mo", MARKET_OPTIONS\)/);
assert.match(signals, /chunk\.is_final === true/, "U.S. daily projection must use only a finalized intraday session");
assert.match(signals, /chunk\.completeness_status === "complete"/, "U.S. daily projection must reject incomplete intraday sessions");
assert.match(signals, /const currentPeriodIsFinal = timeframe === "1d" && Boolean\(dailyBar\)/, "weekly and monthly projections must stay provisional unless their close is explicitly proven");
assert.match(signals, /indicator_key: "technical_signals"/);
assert.match(signals, /indicator_key: "momentum_zones"/);

const operationsAdmin = await source("src/pages/OperationsAdmin.jsx");
assert.match(operationsAdmin, /invokeAppFunction\("usOptionsSignalRefresh"/);

const marketContext = await source("src/lib/MarketContext.jsx");
assert.match(marketContext, /availableMarkets\.some\(\(market\) => market\.market_code === normalized\)/);
assert.match(marketContext, /localStorage\.removeItem\(STORAGE_KEY\)/);
assert.match(marketContext, /resolveAvailableMarkets\(context\)/, "active market selection must support the legacy Saudi identity contract");
const marketAccess = await importTypeScriptModule("./src/lib/marketAccess.js");
assert.deepEqual(marketAccess.resolveAvailableMarkets(null), [], "an authorization failure must never grant market access");
assert.deepEqual(marketAccess.resolveAvailableMarkets({ market_access: [] }), [], "an explicit empty entitlement list must remain empty");
assert.equal(marketAccess.resolveAvailableMarkets({ identity: { user_id: "legacy-user" } })[0]?.market_code, "SA_MAIN", "a legacy authenticated identity response must retain Saudi access only");
assert.deepEqual(marketAccess.resolveAvailableMarkets({ market_access: [{ market_code: "US_OPTIONS" }] }).map((market) => market.market_code), ["US_OPTIONS"], "an explicit U.S. entitlement must remain isolated");
assert.deepEqual(marketAccess.resolveAvailableMarkets({ identity: { role: "owner" }, market_access: [] }).map((market) => market.market_code), ["SA_MAIN", "US_OPTIONS", "US_BENCHMARKS"], "the owner must retain every supported market even when the entitlement array is empty");
assert.equal(marketAccess.marketCodeFromSearch("?market=US_OPTIONS"), "US_OPTIONS", "a new tab must restore its requested authorized market from the URL");
assert.equal(marketAccess.marketCodeFromSearch("?market=UNSUPPORTED"), "", "an unsupported market URL must never widen access");
const marketAccessSelect = await source("src/components/MarketAccessSelect.jsx");
assert.match(marketAccessSelect, /SUPPORTED_MARKETS\.map/);
assert.doesNotMatch(marketAccessSelect, /<select/);
assert.match(marketAccessSelect, /<SessionLink/);
assert.match(marketAccessSelect, /dashboard\?market=/, "each permitted market must have a real URL that supports a new tab");
assert.match(marketAccessSelect, /event\.ctrlKey/, "modified clicks must remain native browser navigation");
assert.ok(marketAccessSelect.indexOf("if (!allowed.has(nextCode))") < marketAccessSelect.indexOf("setMarketCode(nextCode)"), "a locked market must open subscription guidance before any active-market mutation");
assert.match(marketAccessSelect, /setLockedMarket/);
const dashboard = await source("src/pages/Dashboard.jsx");
assert.match(dashboard, /if \(!marketCode\) \{[\s\S]*loading: false,[\s\S]*market_access_unavailable/, "the dashboard must terminate loading when no market is available");
assert.doesNotMatch(dashboard, /<MarketAccessSelect/, "dashboard must not duplicate the global market navigation");
assert.match(dashboard, /value\.marketCodeLoaded === marketCode/, "same-market refresh must keep the last good rows while a new read is in flight");
const companyChart = await source("src/components/market/CompanyChart.jsx");
assert.match(companyChart, /persistSuccessfulChartSelection/);
assert.match(companyChart, /successfulSelectionRef/);
assert.match(companyChart, /العودة إلى اليومي/);
assert.doesNotMatch(companyChart, /className=\{candles\.length \? "chart-canvas-wrap" : "h-0"\}/, "a failed request must never collapse the chart controls and canvas to zero height");
const layout = await source("src/components/SmartInvestorLayout.jsx");
assert.match(layout, /<MarketAccessSelect compact/);
assert.doesNotMatch(layout, /onMarketChange=\{\(\) => navigate/, "the global market links must not be downgraded to button navigation");

const ingestionConfig = JSON.parse(await source("base44/functions/usOptionsMarketIngestion/function.jsonc"));
const signalConfig = JSON.parse(await source("base44/functions/usOptionsSignalRefresh/function.jsonc"));
const historyConfig = JSON.parse(await source("base44/functions/usOptionsHistoricalBackfill/function.jsonc"));
const companyConfig = JSON.parse(await source("base44/functions/usOptionsCompanyIntelligence/function.jsonc"));
const signalWorkerConfig = JSON.parse(await source("base44/functions/usOptionsSignalProjectionWorker/function.jsonc"));
assert.equal(signalWorkerConfig.name, "usOptionsSignalProjectionWorker");
assert.ok([ingestionConfig, signalConfig, historyConfig, companyConfig, signalWorkerConfig].every((config) => config.automations === undefined), "this Workflows-enabled app must keep function-level legacy automations disabled");
const ingestionWorkflow = JSON.parse(await source("base44/workflows/UsOptionsQuarterCycles.jsonc"));
const ingestionBatch2Workflow = JSON.parse(await source("base44/workflows/UsOptionsQuarterCyclesBatch2.jsonc"));
const signalWorkflow = JSON.parse(await source("base44/workflows/UsOptionsSignalsDaily.jsonc"));
const historyWorkflow = JSON.parse(await source("base44/workflows/UsOptionsHistoricalBootstrap.jsonc"));
const companyWorkflow = JSON.parse(await source("base44/workflows/UsOptionsCompanyIntelligenceDaily.jsonc"));
assert.equal(ingestionWorkflow.trigger.config.cron_expression, "20 10-16 * * 1-5", "the first options batch must fetch incrementally once per hour");
assert.equal(ingestionBatch2Workflow.trigger.config.cron_expression, "22 10-16 * * 1-5", "the second options batch must remain staggered by two minutes");
assert.equal(Object.values(ingestionWorkflow.definition.do[0])[0].with.args.batch_index, 0);
assert.equal(Object.values(ingestionBatch2Workflow.definition.do[0])[0].with.args.batch_index, 1);
assert.equal(signalWorkflow.trigger.config.cron_expression, "0 18 * * 1-5");
const usSignalSteps = signalWorkflow.definition.do.map((entry) => {
  const [key, step] = Object.entries(entry)[0];
  return { key, step };
});
const usSignalCalls = usSignalSteps.filter(({ step }) => step.call === "invoke_backend_function");
const usSignalWaits = usSignalSteps.filter(({ step }) => step.wait === "PT5M");
assert.equal(usSignalCalls.length, 8, "the U.S. options workflow must resume 7 bounded batches and then finalize");
assert.equal(usSignalWaits.length, 7, "the U.S. options workflow must separate every projection call by five minutes");
assert.equal(usSignalSteps.length, 15, "the U.S. options workflow must remain a strictly sequential action/wait chain");
for (const { step } of usSignalCalls) {
  assert.equal(step.with.function_name, "usOptionsSignalRefresh");
  assert.deepEqual(step.with.args, { market_code: "US_OPTIONS", source: "daily_session_projection" });
}
for (let index = 0; index < usSignalSteps.length; index += 1) {
  assert.equal(usSignalSteps[index].step.then, usSignalSteps[index + 1]?.key || "end", "U.S. projection steps must never branch or run concurrently");
}
assert.equal(historyWorkflow.trigger.config.ends_type, "never");
assert.equal(historyWorkflow.trigger.config.ends_after_count, null);
const companySteps = companyWorkflow.definition.do.map((entry) => Object.values(entry)[0]);
const companyCalls = companySteps.filter((step) => step.call === "invoke_backend_function");
const companyWaits = companySteps.filter((step) => step.wait === "PT2M");
assert.equal(companyCalls.length, 3, "company intelligence must cover 15 rotating companies per day through three bounded calls");
assert.equal(companyWaits.length, 2, "company intelligence calls must be separated to avoid provider and function bursts");
assert.ok(companyCalls.every((step) => step.with.args.batch_size === 5));
for (let index = 0; index < companySteps.length; index += 1) assert.equal(companySteps[index].then, companySteps[index + 1] ? Object.keys(companyWorkflow.definition.do[index + 1])[0] : "end");
for (const workflow of [ingestionWorkflow, ingestionBatch2Workflow, signalWorkflow, historyWorkflow, companyWorkflow]) {
  assert.equal(workflow.trigger.config.trigger_type, "scheduled");
  assert.equal(workflow.trigger.config.schedule_mode, "recurring");
  assert.equal(workflow.trigger.config.timezone, "America/New_York");
  assert.equal(Object.values(workflow.definition.do[0])[0].with.args.market_code, "US_OPTIONS");
}
const functionBuilder = await source("scripts/build-app-editor-functions.mjs");
for (const functionName of ["usOptionsCompanyIntelligence", "usOptionsHistoricalBackfill", "usOptionsMarketIngestion", "usOptionsSignalRefresh"]) assert.match(functionBuilder, new RegExp(`"${functionName}"`));

const companyPanel = await source("src/components/market/CompanyPanel.jsx");
assert.match(companyPanel, /instrument\.currency/);
assert.doesNotMatch(companyPanel, />SAR<\/small>/);
assert.match(companyPanel, /instrument\.sec_filing_url/);
const marketTicker = await source("src/components/market/MarketTicker.jsx");
assert.match(marketTicker, /\["fresh", "healthy", "degraded"\]/);

for (const schemaName of ["Instrument", "CandleChunk", "IndicatorSnapshot", "Watchlist", "WatchlistItem", "AlertRule", "ChartDrawing"]) {
  const schema = JSON.parse(await source(`base44/entities/${schemaName}.jsonc`));
  assert.ok(schema.properties.market_code, `${schemaName} must carry market identity`);
}
for (const schemaName of ["CompanyFinancial", "CorporateAction", "CompanyAnnouncement", "MajorShareholder"]) {
  const schema = JSON.parse(await source(`base44/entities/${schemaName}.jsonc`));
  assert.ok(schema.properties.market_code, `${schemaName} must carry market identity`);
}

console.log(JSON.stringify({
  status: "verified",
  market: "US_OPTIONS",
  companies: symbols.length,
  subscriptionIsolation: true,
  activeMarketIsolation: true,
  incrementalIntradayCandles: true,
  permanentDailyHistory: true,
  companyIntelligence: true,
  derivedWeeklyMonthlySignals: true,
  marketScopedWatchlistsAlerts: true,
  scheduledNewYorkCycles: true,
}, null, 2));
