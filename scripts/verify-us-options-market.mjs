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
const intelligenceModule = await importTypeScriptModule("./base44/shared/us-company-intelligence.ts");
const catalog = catalogModule.US_OPTIONS_CATALOG;
const symbols = catalog.companies.map((item) => item.symbol);
assert.equal(catalog.market.market_code, "US_OPTIONS");
assert.equal(catalog.market.currency, "USD");
assert.equal(catalog.market.timezone, "America/New_York");
assert.equal(catalog.companies.length, 110, "the isolated U.S. options universe must contain exactly 110 companies");
assert.equal(new Set(symbols).size, 110, "the U.S. options universe must not contain duplicate symbols");
assert.equal(symbols.includes("NFLX"), false, "NFLX must remain excluded by the owner's selection rule");
assert.ok(catalog.companies.every((item) => item.nameEn && item.sectorEn && item.industryEn && item.nasdaqUrl), "every U.S. company must have catalog metadata");
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
assert.match(security, /never infer U\.S\. access from a legacy subscription/);
assert.match(security, /MARKET_SUBSCRIPTION_REQUIRED/);

const permissions = await source("base44/shared/permissions.ts");
assert.match(permissions, /"market\.us\.options"/);
const subscriptionsAdmin = await source("base44/functions/adminSubscriptions/entry.ts");
assert.match(subscriptionsAdmin, /otherActiveSubscriptions/);
assert.match(subscriptionsAdmin, /remaining_active_subscriptions/);
assert.match(subscriptionsAdmin, /\["suspended", "expired", "banned"\]\.includes\(status\) && otherActiveSubscriptions\.length === 0/);
assert.doesNotMatch(subscriptionsAdmin, /status === "banned" \|\|/);

const marketRead = await source("base44/functions/marketRead/entry.ts");
assert.match(marketRead, /requireMarketEntitlement\(context, body\.market_code\)/);
assert.match(marketRead, /CROSS_MARKET_ACCESS_DENIED/);
assert.match(marketRead, /CATALOG_ISOLATION_FAILED/);
assert.match(marketRead, /U\.S\. options catalog mismatch/);
assert.match(marketRead, /timeZone: "America\/New_York", sessionStartMinutes: 570, weekStartsOn: 1/);
assert.match(marketRead, /mergeStoredCandleSeries\(series, interval, marketCandleOptions\(marketCode\)\)/);
assert.match(marketRead, /canonicalVersion\.includes\("daily-projection"\)/);
assert.doesNotMatch(marketRead, /const freshness = !licensed/);

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
assert.match(drawingService, /kmy_chart_drawings_\$\{marketCode\}_\$\{symbol\}/);

const ingestion = await source("base44/functions/usOptionsMarketIngestion/source.ts");
assert.match(ingestion, /interval", "15m"/);
assert.match(ingestion, /delayedCutoffMs/);
assert.match(ingestion, /isCompletedDelayedBar/);
assert.match(ingestion, /alertIntervalDue/);
assert.match(ingestion, /MarketSession\.filter/);
assert.match(ingestion, /nextTradingSessionDate/);
assert.match(ingestion, /US_OPTIONS_CATALOG_INCOMPLETE/);
assert.match(ingestion, /quality_status: freshnessStatus === "fresh" \? "verified" : "stale"/);
assert.match(ingestion, /freshness_status: "stale"/);
assert.match(ingestion, /await evaluateAlerts\(base44, acceptedQuotes, isFinal, nextTradingDate\)/);

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
const adminMarketData = await source("base44/functions/adminMarketData/entry.ts");
assert.match(adminMarketData, /source\.code === "REFERENCE_YAHOO_US_OPTIONS_T15"/);
assert.match(adminMarketData, /refresh_company_intelligence/);
assert.match(adminMarketData, /monthlyRuns: 756/);

const signals = await source("base44/functions/usOptionsSignalRefresh/source.ts");
assert.match(signals, /dedupeDailyBars/);
assert.match(signals, /instrument_id: \{ \$in: idBatch \}/);
assert.match(signals, /aggregateTechnicalBars\(daily, "1wk", MARKET_OPTIONS\)/);
assert.match(signals, /aggregateTechnicalBars\(daily, "1mo", MARKET_OPTIONS\)/);
assert.match(signals, /indicator_key: "technical_signals"/);
assert.match(signals, /indicator_key: "momentum_zones"/);

const marketContext = await source("src/lib/MarketContext.jsx");
assert.match(marketContext, /availableMarkets\.some\(\(market\) => market\.market_code === normalized\)/);
assert.match(marketContext, /localStorage\.removeItem\(STORAGE_KEY\)/);
assert.match(marketContext, /resolveAvailableMarkets\(context\)/, "active market selection must support the legacy Saudi identity contract");
const marketAccess = await importTypeScriptModule("./src/lib/marketAccess.js");
assert.deepEqual(marketAccess.resolveAvailableMarkets(null), [], "an authorization failure must never grant market access");
assert.deepEqual(marketAccess.resolveAvailableMarkets({ market_access: [] }), [], "an explicit empty entitlement list must remain empty");
assert.equal(marketAccess.resolveAvailableMarkets({ identity: { user_id: "legacy-user" } })[0]?.market_code, "SA_MAIN", "a legacy authenticated identity response must retain Saudi access only");
assert.deepEqual(marketAccess.resolveAvailableMarkets({ market_access: [{ market_code: "US_OPTIONS" }] }).map((market) => market.market_code), ["US_OPTIONS"], "an explicit U.S. entitlement must remain isolated");
const dashboard = await source("src/pages/Dashboard.jsx");
assert.match(dashboard, /if \(!marketCode\) \{[\s\S]*loading: false,[\s\S]*market_access_unavailable/, "the dashboard must terminate loading when no market is available");
assert.match(dashboard, /disabled=\{marketContextLoading \|\| availableMarkets\.length === 0\}/, "an unresolved empty market selector must not render as an interactive blank control");

const ingestionConfig = JSON.parse(await source("base44/functions/usOptionsMarketIngestion/function.jsonc"));
const signalConfig = JSON.parse(await source("base44/functions/usOptionsSignalRefresh/function.jsonc"));
const historyConfig = JSON.parse(await source("base44/functions/usOptionsHistoricalBackfill/function.jsonc"));
const companyConfig = JSON.parse(await source("base44/functions/usOptionsCompanyIntelligence/function.jsonc"));
assert.equal(ingestionConfig.automations[0].cron_expression, "0,15,30,45 14-21 * * 1-5");
assert.equal(signalConfig.automations[0].cron_expression, "0 22 * * 1-5");
assert.equal(historyConfig.automations[0].ends_type, "after");
assert.equal(historyConfig.automations[0].ends_after_count, 12);
assert.equal(companyConfig.automations[0].function_args.batch_size, 10);
assert.ok([ingestionConfig, signalConfig, historyConfig, companyConfig].every((config) => config.automations.every((automation) => automation.type === "scheduled" && automation.schedule_type === "cron")));

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
