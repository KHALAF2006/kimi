import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const catalogPath = new URL("../base44/data/official-main-market-catalog-2026-07-21.json", import.meta.url);
const catalogBytes = await readFile(catalogPath);
const catalog = JSON.parse(catalogBytes.toString("utf8"));
// Git may materialize LF as CRLF on Windows. Hash the canonical text so the
// verified catalog identity remains stable without weakening field checks.
const canonicalCatalogText = catalogBytes.toString("utf8").replace(/\r\n?/g, "\n");
const hash = createHash("sha256").update(canonicalCatalogText).digest("hex").toUpperCase();

assert.equal(hash, "4BCC19FD271E1D84D1390E8B2E311046243A8CC9B79B024FF43850C4D8F31337", "official catalog checksum changed");
assert.equal(catalog.companies.length, 270, "catalog must contain exactly the verified 270 main-market companies");
assert.equal(new Set(catalog.companies.map((row) => row.symbol)).size, 270, "company symbols must be unique");
assert.equal(new Set(catalog.companies.map((row) => row.nameAr)).size, 270, "Arabic company names must be unique");

for (const row of catalog.companies) {
  assert.match(row.symbol, /^\d{4}$/, `invalid symbol: ${row.symbol}`);
  assert.ok(row.nameAr?.trim(), `missing Arabic name for ${row.symbol}`);
  assert.ok(row.nameEn?.trim(), `missing English name for ${row.symbol}`);
  assert.ok(row.sectorAr?.trim(), `missing Arabic sector for ${row.symbol}`);
  assert.ok(row.sectorEn?.trim(), `missing English sector for ${row.symbol}`);
  assert.ok(Number.isFinite(Number(row.officialQuote?.lastPrice)), `missing official price for ${row.symbol}`);
  assert.ok(Number.isFinite(Number(row.officialQuote?.volume)), `missing official volume for ${row.symbol}`);
}

const company4210 = catalog.companies.find((row) => row.symbol === "4210");
assert.equal(company4210?.nameAr, "الأبحاث والإعلام");
assert.equal(company4210?.nameEn, "Saudi Research and Media Group");

const ingestion = await readFile(new URL("../base44/functions/marketIngestion/entry.ts", import.meta.url), "utf8");
assert.match(ingestion, /official_main_market_catalog_2026_07_21_default\.companies/, "deployed ingestion must contain the bundled verified catalog");
assert.match(ingestion, /var MAIN_MARKET_SYMBOLS = new Set/, "deployed ingestion must build a strict main-market allowlist");
assert.match(ingestion, /name_ar:\s*row\.nameAr/);
assert.match(ingestion, /name_en:\s*row\.nameEn/);
assert.match(ingestion, /upsertMany\(base44,\s*["']Instrument["']/);
assert.match(ingestion, /if \(!user\).*Unauthorized/, "market ingestion must reject unauthenticated callers");
assert.match(ingestion, /user\.role !== "admin"/, "market ingestion must require a verified admin identity");
assert.doesNotMatch(ingestion, /Base44-Service-Authorization/, "market ingestion must not trust a client-supplied service header");
assert.match(ingestion, /MAIN_MARKET_SYMBOLS\.has\(row\.symbol\)/, "ingestion must exclude records outside the verified main-market catalog");
assert.match(ingestion, /KMY_MARKET_DATA_URL/, "licensed ingestion must require a provider endpoint secret");
assert.match(ingestion, /fetchPublicDelayedCharts/, "experimental ingestion must support public delayed 15-minute charts without a paid key");
assert.match(ingestion, /buildPublicCandleContexts/, "experimental ingestion must build a stored cursor before provider requests");
assert.match(ingestion, /url\.searchParams\.set\("period1"/, "normal public-source cycles must request only after the stored candle cursor");
assert.match(ingestion, /publicChartRequestWindow/, "bootstrap and incremental public-source windows must be selected explicitly");
assert.match(ingestion, /mergeIncrementalCandleChunks/, "new candles must merge into their stored daily chunk");
assert.match(ingestion, /previousBars\.at\(-1\)\?\.close/, "experimental ingestion must retain previous-session close precedence");
assert.match(ingestion, /request_modes:\s*requestModes/, "ingestion runs must record incremental, bootstrap, and backfill counts");
assert.match(ingestion, /persistIncrementalCandleChunks/, "current-session candle writes must avoid scanning the complete candle history");
assert.doesNotMatch(ingestion, /upsertMany\(base44,\s*["']CandleChunk["']/, "incremental candle writes must not list every historical chunk before each cycle");
assert.match(ingestion, /QuoteObservation\.bulkCreate/, "accepted provider readings must be stored before promotion");
assert.match(ingestion, /query1\.finance\.yahoo\.com/, "experimental public source must be explicit and auditable in the backend");
assert.doesNotMatch(ingestion, /from\s+["']\.\.\/\.\.\/shared\//, "scheduled market ingestion must be self-contained for Base44 function bundling");

const historicalBackfill = await readFile(new URL("../base44/functions/historicalCandleBackfill/entry.ts", import.meta.url), "utf8");
assert.match(historicalBackfill, /requireAdminUser\(base44\)/, "historical backfill must require a verified admin identity");
assert.match(historicalBackfill, /asServiceRole\.functions\.invoke\("historicalCandleBackfill"/, "historical child batches must receive a verified service-role identity");
assert.doesNotMatch(historicalBackfill, /Base44-Service-Authorization/, "historical backfill must not trust a client-supplied service header");

const signalRefresh = await readFile(new URL("../base44/functions/marketSignalRefresh/entry.ts", import.meta.url), "utf8");
assert.match(signalRefresh, /requireAdminUser\(base44\)/, "signal refresh must require a verified admin identity");
assert.match(signalRefresh, /asServiceRole\.functions\.invoke\("marketSignalRefresh"/, "signal child batches must receive a verified service-role identity");
assert.doesNotMatch(signalRefresh, /Base44-Service-Authorization/, "signal refresh must not trust a client-supplied service header");

const marketRead = await readFile(new URL("../base44/functions/marketRead/entry.ts", import.meta.url), "utf8");
assert.match(marketRead, /official_main_market_catalog_2026_07_21_default\.companies/, "deployed reads must contain the bundled verified catalog");
assert.match(marketRead, /MAIN_MARKET_SYMBOLS\.has\(item\.symbol\)/, "market reads must exclude non-main-market records");
assert.match(marketRead, /optionalRows/, "optional source metadata must not take down the market catalog");
assert.match(marketRead, /Main-market catalog mismatch/, "an incomplete verified catalog must fail closed");
assert.match(marketRead, /CHART_DATA_NOT_AVAILABLE/, "chart reads must fail clearly when licensed stored candles are unavailable");
assert.doesNotMatch(marketRead, /query1\.finance\.yahoo\.com|YAHOO_CHART/, "market reads must never fetch Yahoo");

const schedule = JSON.parse(await readFile(new URL("../base44/functions/marketIngestion/function.jsonc", import.meta.url), "utf8"));
assert.equal(schedule.name, "marketIngestion");
const candleChunkSchema = JSON.parse(await readFile(new URL("../base44/entities/CandleChunk.jsonc", import.meta.url), "utf8"));
assert.equal(candleChunkSchema.properties.session_date.format, "date", "15-minute chunks must be queryable by their market session");
const companyIntelligenceDaily = JSON.parse(await readFile(new URL("../base44/workflows/CompanyIntelligenceDaily.jsonc", import.meta.url), "utf8"));
const companyFinancialsTwiceWeekly = JSON.parse(await readFile(new URL("../base44/workflows/CompanyFinancialsTwiceWeekly.jsonc", import.meta.url), "utf8"));
assert.equal(schedule.automations, undefined, "the production app uses Base44 Workflows and rejects function-level legacy automations");
const marketWorkflowPaths = [
  "../base44/workflows/MarketQuarterCycles.jsonc",
  "../base44/workflows/MarketHourlyBoundaries.jsonc",
  "../base44/workflows/MarketFinalQuarter.jsonc",
  "../base44/workflows/MarketClosePrice.jsonc",
  "../base44/workflows/MarketSessionFinal.jsonc",
];
const marketWorkflows = await Promise.all(
  marketWorkflowPaths.map(async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"))),
);
assert.deepEqual(
  marketWorkflows.map((workflow) => workflow.trigger.config.cron_expression),
  ["15,30,45 10-14 * * 0-4", "0 11-15 * * 0-4", "15 15 * * 0-4", "26 15 * * 0-4", "36 15 * * 0-4"],
  "market workflows must cover the exact Riyadh T+15 and closing cycles",
);
for (const workflow of marketWorkflows) {
  assert.equal(workflow.trigger.config.trigger_type, "scheduled");
  assert.equal(workflow.trigger.config.schedule_mode, "recurring");
  assert.equal(workflow.trigger.config.timezone, "Asia/Riyadh");
  assert.equal(workflow.trigger.config.ends_type, "never");
  const action = Object.values(workflow.definition.do[0])[0];
  assert.equal(action.call, "invoke_backend_function");
  assert.equal(action.with.function_name, "marketIngestion");
}
assert.deepEqual(
  marketWorkflows.slice(0, 3).map((workflow) => Object.values(workflow.definition.do[0])[0].with.args.slot_kind),
  ["quarter_hour", "quarter_hour", "quarter_hour"],
);
assert.equal(Object.values(marketWorkflows[3].definition.do[0])[0].with.args.slot_kind, "close_price");
assert.equal(Object.values(marketWorkflows[4].definition.do[0])[0].with.args.slot_kind, "session_final");
const marketTechnicalSignalsDaily = JSON.parse(await readFile(new URL("../base44/workflows/MarketTechnicalSignalsDaily.jsonc", import.meta.url), "utf8"));
assert.equal(marketTechnicalSignalsDaily.trigger.config.cron_expression, "45 15 * * 0-4");
assert.equal(marketTechnicalSignalsDaily.trigger.config.timezone, "Asia/Riyadh");
assert.equal(Object.values(marketTechnicalSignalsDaily.definition.do[0])[0].with.function_name, "marketSignalRefresh");
const marketSignalRefreshSource = await readFile(new URL("../base44/functions/marketSignalRefresh/source.ts", import.meta.url), "utf8");
assert.match(marketSignalRefreshSource, /intradayHistory = barsByInstrument\(chunks, ["']15m["']\)/, "signal projection must include every stored intraday session, not only the latest date");
assert.match(marketSignalRefreshSource, /dailyFromStoredIntraday/, "daily, weekly, and monthly signals must be derived from the stored 15-minute source of truth");
assert.match(marketSignalRefreshSource, /indicator_key:\s*["']momentum_zones["']/, "the projection job must persist the authoritative investor-zone lifecycle snapshot");
assert.match(marketSignalRefreshSource, /MOMENTUM_FORMULA_VERSION/, "persisted investor zones must carry their versioned role-reversal formula");
assert.equal(companyIntelligenceDaily.trigger.config.cron_expression, "10 16 * * 0-4");
assert.equal(companyFinancialsTwiceWeekly.trigger.config.cron_expression, "0 16 * * 1,4");
assert.equal(companyIntelligenceDaily.trigger.config.timezone, "Asia/Riyadh");
assert.equal(companyFinancialsTwiceWeekly.trigger.config.timezone, "Asia/Riyadh");

const entityDirectory = fileURLToPath(new URL("../base44/entities/", import.meta.url));
const allEntityFiles = (await readdir(entityDirectory)).filter((name) => name.endsWith(".jsonc")).sort();
const entityFiles = allEntityFiles.filter((name) => /^[A-Z][A-Za-z0-9]*\.jsonc$/.test(name));
assert.equal(entityFiles.length, 46, "all 46 identity-preserving Base44 entity schemas must be present");
assert.deepEqual(allEntityFiles, [...entityFiles].sort(), "duplicate or identity-changing entity schema files must not remain beside the Base44 schemas");
const entityNames = new Set();
for (const name of entityFiles) {
  assert.match(name, /^[A-Z][A-Za-z0-9]*\.jsonc$/, `entity filename does not preserve the Base44 entity identity: ${name}`);
  const source = await readFile(join(entityDirectory, name), "utf8");
  const schema = JSON.parse(source);
  assert.equal(schema.type, "object", `${name} must have an object schema`);
  assert.match(schema.name, /^[A-Za-z0-9]+$/, `${name} has an invalid entity name`);
  assert.ok(!entityNames.has(schema.name), `duplicate entity name: ${schema.name}`);
  entityNames.add(schema.name);
  for (const operation of ["create", "read", "update", "delete"]) {
    assert.equal(schema.rls?.[operation], false, `${name} must deny browser ${operation}`);
  }
}
assert.ok(!entityNames.has("User"), "built-in Base44 User fields and permissions must not be redefined");
const entityNamesLower = new Set([...entityNames].map((name) => name.toLowerCase()));
for (const required of ["CustomerProfile", "Instrument", "QuoteLatest", "QuoteObservation", "CandleChunk", "ActiveDeviceSession", "Subscription", "ChartDrawing", "CompanyAnnouncement", "Account", "AccountMember", "PermissionDefinition", "RoleDefinition", "RolePermission", "MemberRoleAssignment", "PlanEntitlement", "UsageCounter", "Market", "InstrumentAlias", "ProviderInstrumentMap"]) {
  assert.ok(entityNamesLower.has(required.toLowerCase()), `required entity is missing: ${required}`);
}
const customerProfile = JSON.parse(await readFile(new URL("../base44/entities/CustomerProfile.jsonc", import.meta.url), "utf8"));
assert.ok(!customerProfile.required.includes("phone_e164"), "admin migration must not fabricate a phone number");
assert.ok(!customerProfile.required.includes("country_code"), "admin migration must not fabricate a country");

const functionDirectory = fileURLToPath(new URL("../base44/functions/", import.meta.url));
const functionNames = (await readdir(functionDirectory, { withFileTypes: true })).filter((item) => item.isDirectory()).map((item) => item.name);
assert.equal(functionNames.length, 22, "all 22 backend functions must be present");
const referencedEntities = new Set();
for (const functionName of functionNames) {
  const file = join(functionDirectory, functionName, "entry.ts");
  const source = await readFile(file, "utf8");
  const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, reportDiagnostics: true, fileName: file });
  const errors = (result.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${functionName} has TypeScript syntax errors`);
  for (const match of source.matchAll(/entities\.([A-Za-z0-9]+)/g)) referencedEntities.add(match[1]);
}
const sharedDirectory = fileURLToPath(new URL("../base44/shared/", import.meta.url));
for (const name of (await readdir(sharedDirectory)).filter((item) => item.endsWith(".ts"))) {
  const source = await readFile(join(sharedDirectory, name), "utf8");
  for (const match of source.matchAll(/entities\.([A-Za-z0-9]+)/g)) referencedEntities.add(match[1]);
}
for (const entity of referencedEntities) assert.ok(entityNamesLower.has(entity.toLowerCase()), `backend references missing entity schema: ${entity}`);

const marketService = await readFile(new URL("../src/services/marketService.js", import.meta.url), "utf8");
assert.match(marketService, /name_ar:\s*company\.nameAr/);
assert.match(marketService, /name_en:\s*company\.nameEn/);
assert.doesNotMatch(marketService, /Math\.random|faker|mockCompany/i);
assert.match(marketService, /localBrowserHosts\.has\(window\.location\.hostname\)/, "reference market API must be limited to localhost browsers");
assert.doesNotMatch(marketService, /referenceApi\s*=\s*import\.meta\.env\.DEV/, "Base44 editor preview must not be mistaken for the local reference runtime");
assert.match(marketService, /message\s*===\s*["']Active device session required["']/, "an expired or revoked KMY session must be detected");
assert.match(marketService, /localStorage\.removeItem\(["']kmy_session_id["']\)/, "an invalid KMY session must be cleared before returning to login");

const appParamsSource = await readFile(new URL("../src/lib/app-params.js", import.meta.url), "utf8");
assert.match(appParamsSource, /functionsVersion:[\s\S]*persist:\s*false,[\s\S]*useStored:\s*false/, "published pages must not reuse a stale preview function version");
assert.match(appParamsSource, /getAppParamValue\(["']clear_access_token["'],\s*\{[\s\S]*?persist:\s*false,[\s\S]*?useStored:\s*false,[\s\S]*?\}\)/, "the one-shot Base44 token reset must never survive into another browser tab");
assert.match(appParamsSource, /removeItem\(["']base44_clear_access_token["']\)/, "legacy persisted reset flags must be removed during session bootstrap");

const base44Client = await readFile(new URL("../src/api/base44Client.js", import.meta.url), "utf8");
assert.match(base44Client, /localBrowserHosts\.has\(window\.location\.hostname\)/, "the Base44 SDK stub must be limited to localhost browsers");
assert.doesNotMatch(base44Client, /isLocalReferencePreview\s*=\s*import\.meta\.env\.DEV/, "Base44 editor preview must initialize the real Base44 SDK");

const protectedRoute = await readFile(new URL("../src/components/ProtectedRoute.jsx", import.meta.url), "utf8");
assert.match(protectedRoute, /!isReferencePreview\(\)\s*&&\s*!localStorage\.getItem\(['"]kmy_session_id['"]\)/, "protected market routes must require the verified KMY device session");

const loginPage = await readFile(new URL("../src/pages/Login.jsx", import.meta.url), "utf8");
const registerPage = await readFile(new URL("../src/pages/Register.jsx", import.meta.url), "utf8");
const authLayout = await readFile(new URL("../src/components/AuthLayout.jsx", import.meta.url), "utf8");
const siteStyles = await readFile(new URL("../src/index.css", import.meta.url), "utf8");
assert.match(loginPage, /isAuthenticated\?t\.sendCode:t\.next/, "an already authenticated Base44 user must continue through KMY email OTP");
assert.match(loginPage, /base44\.functions\.invoke\(['"]authLogin['"],\{action:['"]start['"]\}\)/, "login must start the server-side OTP challenge");
for (const [name, source] of [["login", loginPage], ["registration", registerPage], ["authentication layout", authLayout]]) {
  assert.doesNotMatch(source, /amber|orange|245,158,11/, `${name} must use the site-wide sky identity rather than the retired orange identity`);
}
assert.match(siteStyles, /\.chart-history-status[^\n]+amber/, "amber must remain available only for explicit warning semantics");
assert.doesNotMatch(siteStyles.replace(/\.chart-history-status[^\n]+/g, ""), /amber|orange/, "interactive site identity styles must not retain the retired orange palette");

const companyChart = await readFile(new URL("../src/components/market/CompanyChart.jsx", import.meta.url), "utf8");
assert.match(companyChart, /showVolume/);
assert.match(companyChart, /showMomentum/);
assert.match(companyChart, /showRsi/);
assert.match(companyChart, /calculateRsiSeries/);
assert.match(companyChart, /data\.momentum_indicator/, "investor-zone roles must arrive from the protected backend chart response");
assert.match(companyChart, /calculateSmaSeries/);
assert.match(companyChart, /showSma20/);
assert.match(companyChart, /showSma50/);
assert.match(companyChart, /subscribeDblClick/, "double-clicking the chart plot must open chart settings");
assert.match(companyChart, /ChartSettingsSheet/, "chart settings must use the professional settings sheet");
assert.match(companyChart, /buildDisplayCandles/, "the chart must switch one exclusive candle representation at a time");
assert.match(companyChart, /indicator-hub-button/, "indicators must be grouped under one compact menu");
assert.match(companyChart, /save_chart_preferences/, "chart preferences must persist through the protected backend");
assert.match(companyChart, /axisLabelVisible:\s*false,\s*title:\s*""/, "investor-zone boundaries must not crowd the price axis with repeated labels");
assert.match(companyChart, /rsiSettings\.lineColor/);
assert.match(companyChart, /momentumSettings\.zones/);
assert.match(companyChart, /className=\{["']ohlc-strip ["'] \+ \(hovered \? ["']["'] : ["']invisible["']\)\}/, "the OHLC strip must reserve its height so pane hover cannot shake the chart");
assert.match(companyChart, /interactionEvents = \[[^\]]*["']wheel["'][^\]]*["']pointermove["']/, "zone geometry must follow price-scale wheel and drag interactions");
assert.match(companyChart, /sameZoneGeometry\(current, zones\)/, "zone synchronization must avoid redundant React layout updates");
assert.match(companyChart, /showMomentumCard/, "momentum price card must have its own visibility state");
assert.match(companyChart, /showMomentum\s*&&\s*momentum\?\.zones/, "hiding all indicators must also hide the investor-zone price card");
assert.match(companyChart, /ChartDrawingTools/, "the verified chart must mount the drawing layer");
assert.match(companyChart, /axisPressedMouseMove:\s*\{\s*time:\s*true,\s*price:\s*true\s*\}/, "price and time axes must support direct drag scaling");
assert.match(companyChart, /axisDoubleClickReset:\s*\{\s*time:\s*true,\s*price:\s*true\s*\}/, "price and time axes must support direct reset");
assert.match(companyChart, /toggleAllIndicators/, "the chart must expose one action for all indicators");
assert.match(companyChart, /toggleAllChartObjects/, "the chart must expose one action for drawings and indicators together");
assert.match(companyChart, /function resetChartView\(\)[\s\S]*panes\[0\]\?\.setHeight\(mainPaneTarget\)/, "resetting the chart must restore the responsive main price pane height");
assert.match(companyChart, /if \(showVolume\) panes\[1\]\?\.setHeight\(volumePaneTarget\)/, "resetting the chart must restore the responsive volume pane height");
assert.match(companyChart, /if \(showRsi\) panes\[showVolume \? 2 : 1\]\?\.setHeight\(rsiPaneTarget\)/, "resetting the chart must restore the responsive RSI pane height");
assert.match(companyChart, /chart\.resize\(hostWidth, chartHeight, true\)/, "chart height changes must use the official resize API");
assert.match(companyChart, /ref=\{canvasWrapRef\}/, "fullscreen chart sizing must measure the actual chart host");

const chartStyles = await readFile(new URL("../src/index.css", import.meta.url), "utf8");
assert.match(chartStyles, /\.indicator-hub-popover\[dir="rtl"\]\s*\{\s*right:\s*0;\s*left:\s*auto;/, "the Arabic indicator menu must open inward from the right viewport edge");
assert.match(chartStyles, /\.indicator-hub-popover\[dir="ltr"\]\s*\{\s*right:\s*auto;\s*left:\s*0;/, "the English indicator menu must open inward from the left viewport edge");
assert.match(chartStyles, /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.indicator-hub-popover\s*\{\s*width:\s*calc\(100vw\s*-\s*48px\);/, "the indicator menu must stay inside narrow mobile viewports");
assert.match(chartStyles, /\.indicator-hub-toggle > span:nth-child\(2\)\s*\{[^}]*whitespace-normal[^}]*break-words/, "indicator names must remain readable instead of being clipped to icons");
assert.doesNotMatch(chartStyles, /\.chart-shell:fullscreen \.chart-company-navigation\s*\{[^}]*hidden/, "fullscreen must never hide previous/next company navigation");
assert.match(chartStyles, /\.chart-shell:fullscreen \.chart-company-navigation > button:not\(\.secondary-button\)\s*\{[^}]*min-h-8/, "fullscreen company navigation must remain present in a compact form");
assert.match(chartStyles, /\.chart-shell:fullscreen \.chart-canvas-wrap\s*\{[^}]*flex-1/, "fullscreen chart must consume the remaining viewport instead of leaving dead space");

const chartDrawingsFunction = await readFile(new URL("../base44/functions/chartDrawings/entry.ts", import.meta.url), "utf8");
assert.match(chartDrawingsFunction, /requireActiveSession\(base44, profile, body\.session_id\)/, "drawing storage must require the verified KMY session");
assert.match(chartDrawingsFunction, /row\.customer_id !== profile\.id/, "drawing mutations must enforce object ownership");
assert.match(chartDrawingsFunction, /DRAWING_ALERT_DELETE_CONFIRMATION_REQUIRED/, "a drawing with an alert must not be deleted without explicit confirmation");
assert.match(chartDrawingsFunction, /"trend_line", "ray", "horizontal_line"/, "drawing alerts must be restricted to supported line geometry");
assert.match(chartDrawingsFunction, /body\.action === "duplicate"/, "copy/paste must create the duplicate through the protected backend");
assert.match(chartDrawingsFunction, /drawing\.duplicate/, "backend drawing duplication must be audited");
assert.match(chartDrawingsFunction, /body\.action === "set_visibility_bulk"/, "bulk drawing visibility must be enforced by the backend");
assert.match(chartDrawingsFunction, /body\.action === "delete_all"/, "bulk drawing deletion must be enforced by the backend");
assert.match(chartDrawingsFunction, /drawing\.bulk\.delete/, "bulk drawing deletion must be audited");

const drawingTools = await readFile(new URL("../src/components/market/ChartDrawingTools.jsx", import.meta.url), "utf8");
for (const tool of ["trend_line", "ray", "horizontal_line", "vertical_line", "arrow", "rectangle", "parallel_channel", "polyline", "curve", "brush", "price_range", "date_range", "date_and_price_range"]) {
  assert.match(drawingTools, new RegExp(tool), `drawing tool is missing: ${tool}`);
}
assert.match(drawingTools, /deleteChartDrawing\(symbol, current, force\)/, "drawing deletion must wait for persistence and use the protected backend service");
assert.match(drawingTools, /pendingSavesRef/, "drawing deletion must not race an in-flight save");
assert.match(drawingTools, /duplicateChartDrawing/, "paste must use the protected backend duplication action");
assert.match(drawingTools, /offsetPointsForPaste/, "pasted drawings must be visibly offset in chart coordinates");
assert.match(drawingTools, /Ctrl\+V/, "the drawing clipboard must expose a real paste command");
assert.match(drawingTools, /contextmenu/, "the chart must expose a right-click context menu");
assert.match(drawingTools, /onResetChart/, "the chart context menu must provide a complete view reset");
assert.match(drawingTools, /setPointerCapture/, "the drawing toolbar must use pointer capture while it is moved");
assert.match(drawingTools, /TOOLBAR_STORAGE_KEY/, "the drawing toolbar position must persist");
assert.match(drawingTools, /SELECTION_TOOLBAR_STORAGE_KEY/, "the selected drawing properties position must persist");
assert.match(drawingTools, /DRAWING_CLIPBOARD_STORAGE_KEY/, "the drawing clipboard must survive chart remounts");
assert.match(drawingTools, /navigator\.clipboard/, "copy/paste must integrate with the secure browser clipboard when available");
assert.match(drawingTools, /setAllChartDrawingsVisibility/, "hide/show all drawings must use the protected backend");
assert.match(drawingTools, /deleteAllChartDrawings/, "clear all drawings must use the protected backend");
assert.doesNotMatch(drawingTools, /window\.confirm/, "drawing deletion must never use the browser-native confirmation window");
assert.match(drawingTools, /role="alertdialog"/, "drawing deletion must use the accessible in-app confirmation dialog");
assert.match(drawingTools, /smoothPath/, "curve and brush strokes must use a smoothed path");
assert.match(drawingTools, /simplifyFreehand/, "freehand input must be sampled before persistence");
assert.match(drawingTools, /bezierCurveTo/, "curve and brush strokes must use a continuous cubic spline");
assert.match(drawingTools, /squareDistanceToSegment/, "freehand simplification must preserve meaningful turns");
assert.match(drawingTools, /Show and reset drawing tools/, "the hidden drawing toolbar must expose an explicit restore control");
assert.match(drawingTools, /function wheelZoom\(event\)/, "mouse-wheel zoom must remain available while the drawing layer is active");
assert.match(drawingTools, /aria-orientation/, "the drawing toolbar must expose its orientation");

const customerSelfService = await readFile(new URL("../base44/functions/customerSelfService/entry.ts", import.meta.url), "utf8");
assert.match(customerSelfService, /authorizationContext\(base44, body\.session_id\)/, "chart preferences must require the verified customer session");
assert.match(customerSelfService, /body\.action === "save_chart_preferences"/, "chart preferences must have a protected save action");
assert.match(customerSelfService, /chart\.preferences\.update/, "chart preference changes must be audited");
assert.match(drawingTools, /LayoutList/, "the drawing object tree must be available");
assert.match(drawingTools, /fillOpacity/, "filled drawings must expose opacity controls");
assert.match(drawingTools, /ALERT_TYPES/, "alert-capable drawing types must be explicit");
assert.match(drawingTools, /context\.direction = isArabic \? "rtl" : "ltr"/, "Arabic measurement labels must use an explicit canvas direction");
assert.match(drawingTools, /context\.textAlign = isArabic \? "right" : "left"/, "Arabic measurement labels must stay anchored inside their background");

const marketReadFunction = await readFile(new URL("../base44/functions/marketRead/entry.ts", import.meta.url), "utf8");
assert.match(marketReadFunction, /body\.action === "sector"/, "sector details must be served from the protected market backend");
assert.match(marketReadFunction, /body\.action === "sector_chart"/, "sector chart candles must be built by the protected market backend");
assert.match(marketReadFunction, /sectorWeights/, "sector index construction must use an explicit weighting function");
const dashboardPage = await readFile(new URL("../src/pages/Dashboard.jsx", import.meta.url), "utf8");
assert.match(dashboardPage, /SectorPanel/, "sector selection must open a sector profile, not only filter the table");
assert.doesNotMatch(dashboardPage, /MarketDataStatus/, "the removed market-status banner must not be mounted on the dashboard");
assert.match(marketReadFunction, /fallbackIntervals\(interval\)/, "weekly and monthly chart requests must fall back to stored daily or intraday candles");
assert.match(marketReadFunction, /storedCandlesForInterval\(base44, instrument\.id, interval\)/, "company and sector charts must share the same candle aggregation path");
assert.match(marketReadFunction, /mergeStoredCandleSeries\(series, interval\)/, "stored historical and fresh intraday candles must be merged instead of returning the first stale interval");
assert.match(marketReadFunction, /technical_signals/, "market reads must expose persisted technical signals to the screener");
assert.match(marketReadFunction, /bullish_zone_pin_bar/, "the protected screener must filter bullish pin bars inside investor zones");
assert.match(marketReadFunction, /bearish_zone_pin_bar/, "the protected screener must filter bearish pin bars inside investor zones");
assert.match(marketReadFunction, /signal_window\.slice\(0, 3\)/, "the screener must search the current stored candle and the two candles before it");
assert.match(marketReadFunction, /screener_match/, "each screener result must expose the exact matching candle as evidence");
assert.doesNotMatch(marketReadFunction, /if \(bars\.length\) return \{ bars, chunks/, "chart storage must not stop at the first stale interval");
assert.match(ingestion, /snapshot_version: provenance\.snapshotVersion/, "candle chunks must retain their ingestion snapshot provenance");
const customerMarketTable = await readFile(new URL("../src/components/market/MarketTable.jsx", import.meta.url), "utf8");
assert.doesNotMatch(customerMarketTable, /data_state\?\.label/, "the market table must not replay obsolete labels stored with old quotes");
const customerMarketTicker = await readFile(new URL("../src/components/market/MarketTicker.jsx", import.meta.url), "utf8");
assert.doesNotMatch(customerMarketTicker, /data_state\?\.label/, "the ticker must not replay obsolete labels stored with old quotes");
const screenerPage = await readFile(new URL("../src/pages/Screener.jsx", import.meta.url), "utf8");
for (const signal of ["bullish_pin_bar", "bearish_pin_bar", "bullish_engulfing", "bearish_engulfing", "bullish_zone_pin_bar", "bearish_zone_pin_bar", "pin_bar_signal", "engulfing_signal", "zone_pin_bar", "price_cross_sma20", "price_cross_sma50", "sma20_cross_sma50"]) {
  assert.match(screenerPage, new RegExp(signal), `screener signal is missing: ${signal}`);
}
assert.match(screenerPage, /row\.screener_match\?\.timeframe === timeframe/, "the screener UI must render the backend-proven matching candle instead of re-filtering the complete signal snapshot");
assert.doesNotMatch(screenerPage, /\.filter\(\(row\) => row\.signals\?\.\[timeframe\]/, "the frontend must not discard valid backend screener results when full snapshots are omitted from transport");
assert.match(screenerPage, /Number\.isFinite\(candleTimestamp\)/, "the screener must not render an invalid candle date");
assert.match(screenerPage, /آخر 3 شموع محفوظة/, "the screener must tell customers the exact three-candle search window");
assert.match(screenerPage, /detailsTimeframe=\{timeframe\}/, "strategy results must preserve the selected timeframe when opening a company");
assert.match(customerMarketTable, /companyDashboardPath\(row\.symbol, detailsTimeframe\)/, "company links must carry an explicit strategy timeframe");
const companyPanel = await readFile(new URL("../src/components/market/CompanyPanel.jsx", import.meta.url), "utf8");
assert.match(companyChart, /wrapperRef\.current\.requestFullscreen\(\)/, "fullscreen must target only the chart shell so the page itself does not require vertical scrolling");
assert.match(companyChart, /bullishColor/, "reversal candle rendering must use a distinct bullish color");
assert.match(companyChart, /bearishColor/, "reversal candle rendering must use a distinct bearish color");
assert.match(companyChart, /reversalPatternMap\(visibleOrderedCandles, \{ limitPerType: 3 \}\)/, "bar replay must calculate reversal patterns only from candles visible at the replay cursor");
assert.doesNotMatch(companyChart, /if \(!\["1d", "1wk", "1mo"\]\.includes\(interval\)\) return display/, "reversal coloring must not be restricted to daily, weekly and monthly intervals");
assert.match(companyPanel, /setState\(\(current\) => \(\{ \.\.\.current, loading: true, error: "" \}\)\)/, "company navigation must retain the mounted panel while the next company loads");
assert.match(companyPanel, /<CompanyChart symbol=\{symbol\}/, "company details and chart requests must start in parallel for smooth navigation");
assert.doesNotMatch(companyPanel, /if \(state\.loading\) return/, "company navigation must not unmount the chart when cached content exists");
assert.match(companyPanel, /onMomentumChange=\{handleMomentumChange\}/, "the investor-zone card must consume the chart calculation for the displayed interval");
assert.doesNotMatch(companyPanel, /indicators\?\.\[0\]/, "company details must never treat an arbitrary first indicator record as investor zones");
assert.match(marketReadFunction, /momentum_indicator: momentumIndicator/, "company reads must expose a deterministic momentum snapshot instead of relying on entity order");
assert.match(marketReadFunction, /calculateMomentumZones\(/, "chart reads must calculate zone roles on the backend from canonical stored candles");
assert.match(marketReadFunction, /lookback_days/, "backend chart calculations must honor the bounded peak lookback setting");
assert.match(companyChart, /data\.momentum_indicator/, "the chart must consume the backend lifecycle result instead of becoming a second calculation authority");
assert.match(companyChart, /replayActive\s*\?\s*calculateMomentumSnapshot\(visibleOrderedCandles/, "historical replay must recompute zones only from candles already revealed to the user");
assert.match(companyChart, /replayActive\s*\?\s*replayMomentum\s*:\s*backendMomentum/, "the live customer chart must retain the protected backend investor-zone snapshot");
assert.match(companyChart, /zone\.stopVisible !== false/, "a reversed resistance must not retain the obsolete stop line");
assert.match(companyChart, /zone\.displayNameAr/, "chart labels must follow the current support or resistance role");
const sessionLink = await readFile(new URL("../src/components/SessionLink.jsx", import.meta.url), "utf8");
const previewAuthHandoff = await readFile(new URL("../src/lib/preview-auth-handoff.js", import.meta.url), "utf8");
const appParams = await readFile(new URL("../src/lib/app-params.js", import.meta.url), "utf8");
assert.match(sessionLink, /previewSafeHref/, "internal links must support authenticated Base44 preview tabs");
assert.match(previewAuthHandoff, /preview--|preview-sandbox--/, "the session handoff must be limited to Base44 preview hosts");
assert.match(previewAuthHandoff, /functions_version/, "new preview tabs must invoke the same Base44 backend version as the source preview");
assert.match(previewAuthHandoff, /server_url/, "new preview tabs must retain the same Base44 preview backend");
assert.match(previewAuthHandoff, /base44_data_env/, "new preview tabs must retain the same Base44 data environment");
assert.match(previewAuthHandoff, /url\.hostname === String\(hostname\)\.toLowerCase\(\)/, "preview server overrides must be restricted to the current Base44 preview origin");
const previewAwareBase44Client = await readFile(new URL("../src/api/base44Client.js", import.meta.url), "utf8");
assert.match(previewAwareBase44Client, /serverUrl,/, "the Base44 SDK must receive the validated preview backend URL");
assert.match(previewAuthHandoff, /browserHistory\.replaceState/, "the preview handoff fragment must be removed before the page continues");
assert.match(appParams, /persist:\s*false[\s\S]*useStored:\s*false/, "the one-shot clear_access_token flag must never be replayed from browser storage");
const internalLinkFiles = [
  "../src/components/AuthLayout.jsx",
  "../src/components/KmyLayout.jsx",
  "../src/components/market/MarketTable.jsx",
  "../src/components/market/MarketTicker.jsx",
  "../src/pages/AdminDashboard.jsx",
  "../src/pages/Alerts.jsx",
  "../src/pages/CompanyDetails.jsx",
  "../src/pages/ForgotPassword.jsx",
  "../src/pages/Landing.jsx",
  "../src/pages/Login.jsx",
  "../src/pages/Profile.jsx",
  "../src/pages/Register.jsx",
  "../src/pages/ResetPassword.jsx",
  "../src/pages/VerifyContact.jsx",
  "../src/pages/Watchlists.jsx",
];
for (const relativePath of internalLinkFiles) {
  const content = await readFile(new URL(relativePath, import.meta.url), "utf8");
  assert.doesNotMatch(content, /import\s*\{[^}]*\b(?:Link|NavLink)\b[^}]*\}\s*from\s*["']react-router-dom["']/, `${relativePath} must use the shared authenticated internal-link component`);
}
assert.match(marketReadFunction, /body\.action === "instrument_search"/, "watchlists and alerts must use the protected canonical instrument search");
assert.match(marketReadFunction, /"2h", "3h", "4h"/, "chart reads must accept the new session-aware intraday intervals");
const watchlistFunction = await readFile(new URL("../base44/functions/screeningWatchlists/entry.ts", import.meta.url), "utf8");
assert.match(watchlistFunction, /reference_status/, "watchlist responses must expose broken instrument references instead of rendering symbol-only rows");
assert.match(customerSelfService, /instrument:\s*instrumentById\.get/, "alert responses must include their canonical instrument identity");
assert.match(ingestion, /evaluatePriceAlerts/, "price alert rules must be evaluated by the market ingestion pipeline");
const operationsAdminPage = await readFile(new URL("../src/pages/OperationsAdmin.jsx", import.meta.url), "utf8");
assert.match(operationsAdminPage, /refresh_signals/, "the owner must be able to re-run candle and signal projection with an audited reason");
assert.match(operationsAdminPage, /backfill_history/, "the owner must be able to resume the one-time historical archive import");
const adminMarketDataFunction = await readFile(new URL("../base44/functions/adminMarketData/entry.ts", import.meta.url), "utf8");
assert.match(adminMarketDataFunction, /marketSignalRefresh/, "manual signal refresh must invoke the protected projection backend");
assert.match(adminMarketDataFunction, /historicalCandleBackfill/, "historical archive imports must run through the protected backend");
const historicalBackfillFunction = await readFile(new URL("../base44/functions/historicalCandleBackfill/entry.ts", import.meta.url), "utf8");
assert.match(historicalBackfillFunction, /YAHOO_PUBLIC_HISTORICAL_DAILY/, "historical import must have a no-secret daily archive source");
assert.match(historicalBackfillFunction, /includeAdjustedClose/, "historical import must request the complete daily chart payload");
assert.match(historicalBackfillFunction, /function historyProvider\(\) \{[\s\S]*?code: YAHOO_PROVIDER_CODE/, "historical backfill must keep its declared no-secret archive provider deterministic");
assert.match(historicalBackfillFunction, /history_already_complete/, "completed instrument archives must not be requested again");
assert.match(historicalBackfillFunction, /canonical_version:\s*options\.provider\.canonicalVersion/, "historical candles must be persisted as canonical yearly chunks");
const historicalCompanyChart = await readFile(new URL("../src/components/market/CompanyChart.jsx", import.meta.url), "utf8");
assert.match(historicalCompanyChart, /value:\s*"max",\s*ar:\s*"تاريخي"/, "the chart must expose a stored full-history range");
assert.match(historicalCompanyChart, /rangeOptions\.map/, "all chart ranges must remain visible instead of disappearing with the selected interval");
assert.match(historicalCompanyChart, /if \(!option\.intervals\.includes\(interval\)\) setInterval\("1d"\)/, "long history ranges must switch incompatible intraday views to daily candles");
assert.match(historicalCompanyChart, /history_complete/, "the chart must disclose an incomplete historical archive");
assert.match(historicalCompanyChart, /className="chart-type-popover"/, "the candle-type chooser must stay anchored to its compact chart control");
assert.match(historicalCompanyChart, /requestFullscreen\(\)/, "fullscreen mode must target the chart shell instead of the entire company page");
assert.match(historicalCompanyChart, /createTextWatermark/, "the chart must render the instrument identity with the chart engine watermark primitive");
assert.match(historicalCompanyChart, /chartPreferences\.watermarkVisible/, "the company watermark must be user-hideable");
assert.match(historicalCompanyChart, /beginReplaySelection/, "bar replay must expose an explicit historical starting-point selection state");

const companyIntelligence = await readFile(new URL("../base44/functions/companyIntelligence/entry.ts", import.meta.url), "utf8");
assert.match(companyIntelligence, /SAUDI_EXCHANGE_COMPANY_FEED_URL/, "company intelligence must require a configured official feed");
assert.match(companyIntelligence, /OFFICIAL_HOST/, "company intelligence must restrict provenance to the official host");
assert.match(companyIntelligence, /companies_received/, "company intelligence must use one batch payload");
assert.match(companyIntelligence, /CompanyAnnouncement/, "company intelligence must persist announcements");
assert.match(companyIntelligence, /MajorShareholder/, "company intelligence must persist major shareholders");
assert.match(companyIntelligence, /CompanyFinancial/, "company intelligence must persist financial statements");
assert.match(companyIntelligence, /CorporateAction/, "company intelligence must persist corporate actions");
assert.match(companyIntelligence, /"bootstrap"/, "company intelligence must support an owner-controlled initial full import");

const { drawingSegments, drawingFillPolygon, drawingHitTest } = await import(new URL("../src/components/market/chartDrawingModel.js", import.meta.url));
const modelWidth = 800;
const modelHeight = 500;
const horizontalPoints = [{ x: 120, y: 220 }];
const rectanglePoints = [{ x: 100, y: 100 }, { x: 300, y: 260 }];
const channelPoints = [{ x: 80, y: 120 }, { x: 330, y: 170 }, { x: 110, y: 240 }];
assert.equal(drawingSegments("horizontal_line", horizontalPoints, modelWidth, modelHeight).length, 1, "horizontal line geometry must be deterministic");
assert.equal(drawingSegments("rectangle", rectanglePoints, modelWidth, modelHeight).length, 4, "rectangle must retain all four anchored sides");
const extendedChannel = drawingSegments("parallel_channel", channelPoints, modelWidth, modelHeight, { extendLeft: true, extendRight: true, showMedian: true });
assert.equal(extendedChannel.length, 3, "parallel channel must retain both boundaries and the median");
assert.ok(extendedChannel.slice(0, 2).every((segment) => segment.some((point) => point.x === 0 || point.x === modelWidth || point.y === 0 || point.y === modelHeight)), "extended channel boundaries must reach the visible pane edge");
assert.ok(drawingFillPolygon("parallel_channel", channelPoints, modelWidth, modelHeight, { extendLeft: true, extendRight: true }).length >= 3, "extended channel fill must be clipped to a valid visible polygon");
const descendingChannel = [{ x: 80, y: 330 }, { x: 360, y: 120 }, { x: 360, y: 230 }];
assert.equal(drawingSegments("parallel_channel", descendingChannel, modelWidth, modelHeight, { extendLeft: true, extendRight: true, showMedian: true }).length, 3, "descending channels must extend without losing either side");
const verticalChannel = [{ x: 300, y: 80 }, { x: 300.00001, y: 360 }, { x: 380, y: 360 }];
assert.ok(drawingSegments("parallel_channel", verticalChannel, modelWidth, modelHeight, { extendLeft: true, extendRight: true, showMedian: true }).length >= 2, "near-vertical channels must remain stable");
assert.equal(drawingSegments("price_range", rectanglePoints, modelWidth, modelHeight).length, 3, "price range must include caps and a vertical measurement");
assert.equal(drawingSegments("date_range", rectanglePoints, modelWidth, modelHeight).length, 3, "date range must include caps and a horizontal measurement");
assert.equal(drawingSegments("date_and_price_range", rectanglePoints, modelWidth, modelHeight).length, 6, "combined range must include the box and both measurements");
assert.equal(drawingHitTest("horizontal_line", horizontalPoints, { x: 620, y: 222 }, modelWidth, modelHeight).hit, true, "extended horizontal line must remain selectable after chart navigation");
assert.equal(drawingHitTest("rectangle", rectanglePoints, { x: 180, y: 101 }, modelWidth, modelHeight).hit, true, "rectangle border must be selectable without filling the price pane");

const sharedSecurity = await readFile(new URL("../base44/shared/security.ts", import.meta.url), "utf8");
assert.match(sharedSecurity, /profile\?\.acquisition_source === "platform_owner_bootstrap"/, "owner access must be rooted in the server-managed platform owner marker");
assert.match(sharedSecurity, /profile\.tags\.includes\("owner"\)/, "owner access must require the server-managed owner tag");
assert.doesNotMatch(sharedSecurity, /if \(profile\.role !== "admin"/, "administrative login must never downgrade the owner to admin");
assert.match(sharedSecurity, /try\s*\{\s*session = await base44\.asServiceRole\.entities\.ActiveDeviceSession\.get\(sessionId\);\s*\}\s*catch\s*\{\s*session = null;/, "unknown session identifiers must be normalized to the same authorization denial");
const authLoginFunction = await readFile(new URL("../base44/functions/authLogin/entry.ts", import.meta.url), "utf8");
assert.match(authLoginFunction, /ensureAdministrativeProfile/, "the deployed authLogin function must use the centralized trusted-owner reconciliation");
assert.match(authLoginFunction, /shared\/security\.ts/, "the deployed authLogin function must not duplicate security policy");
assert.match(loginPage, /base44\.auth\.setToken\(login\.access_token,true\)/, "Base44 authentication must persist across same-origin tabs");
assert.match(loginPage, /kmy_device_id/, "all tabs on one browser device must share a stable device identity");
for (const fileName of ["adminCustomers", "adminSubscriptions", "adminRoles", "identityContext", "operationsQuality", "adminMarketData"]) {
  const deployed = await readFile(new URL(`../base44/functions/${fileName}/entry.ts`, import.meta.url), "utf8");
  assert.match(deployed, /authorizationContext|requirePermission/, `${fileName} must enforce the centralized backend authorization context`);
}
const adminSubscriptionsFunction = await readFile(new URL("../base44/functions/adminSubscriptions/entry.ts", import.meta.url), "utf8");
assert.match(adminSubscriptionsFunction, /Array\.isArray\(body\.changes\)/, "plan entitlement updates must accept a bounded diff instead of requiring a destructive replacement");
assert.match(adminSubscriptionsFunction, /ACCOUNT_MEMBERSHIP_REQUIRED/, "manual subscription activation must enforce account membership");
assert.match(adminSubscriptionsFunction, /ensurePersonalAccount/, "legacy customers must receive their personal account before manual activation");
assert.match(adminSubscriptionsFunction, /REVISION_CONFLICT/, "subscription and plan mutations must reject stale administrative writes");
const adminRolesFunction = await readFile(new URL("../base44/functions/adminRoles/entry.ts", import.meta.url), "utf8");
assert.match(adminRolesFunction, /SELF_ASSIGNMENT_DENIED/, "an administrator must not elevate their own role assignments");
assert.match(adminRolesFunction, /RESERVED_ROLE_IMMUTABLE/, "reserved administrative roles must remain immutable");
assert.match(adminRolesFunction, /REVISION_CONFLICT/, "role updates must reject stale administrative writes");
const marketIngestionFunction = await readFile(new URL("../base44/functions/marketIngestion/entry.ts", import.meta.url), "utf8");
assert.match(marketIngestionFunction, /base44\.functions\.invoke\("identityContext"/, "manual market ingestion must delegate authorization to the centralized identity context");
assert.match(marketIngestionFunction, /context\.permissions\.includes\("data\.ingestion\.run"\)/, "manual market ingestion must require the dedicated backend permission");
assert.match(marketIngestionFunction, /groupRowsByKey\(issues,\s*keyFor\)/, "quality issue batches must coalesce duplicate logical records before persistence");
assert.match(marketIngestionFunction, /row\.instrument_id\s*\|\|\s*row\.symbol\s*\|\|\s*"market"/, "source issues without instrument IDs must remain distinct per symbol");
assert.match(marketIngestionFunction, /bulkUpdateUnique\(base44\.asServiceRole\.entities\.DataQualityIssue,\s*updates\)/, "quality issue updates must send every entity ID at most once");
assert.match(marketIngestionFunction, /bulkUpdateUnique\(base44\.asServiceRole\.entities\.QuoteLatest,\s*updates\)/, "stale quote updates must send every entity ID at most once");
const legacySchemaBridge = await readFile(new URL("../base44/functions/legacySchemaBridge/entry.ts", import.meta.url), "utf8");
assert.match(legacySchemaBridge, /profile\?\.acquisition_source === "platform_owner_bootstrap"/, "the additive legacy bridge must be restricted to the trusted platform owner");
assert.match(legacySchemaBridge, /user\.id !== PLATFORM_OWNER_USER_ID/, "the production bridge must require the immutable Base44 owner identity");
assert.doesNotMatch(legacySchemaBridge, /\.delete\(|deleteMany|updateMany/, "the legacy bridge must never delete or bulk-update production records");
assert.match(legacySchemaBridge, /Math\.min\(100,/, "legacy migration batches must be bounded");
assert.match(legacySchemaBridge, /QuoteObservation:\s*"quote-observation"/, "the schema audit must cover every canonical/legacy entity pair");
assert.match(legacySchemaBridge, /official_exists/, "the schema audit must distinguish missing official schemas from empty schemas");
assert.match(legacySchemaBridge, /count_capped/, "the schema audit must disclose bounded-count results");

const { calculateRsiSeries, calculateMomentumSnapshot, companyDashboardPath, normalizeMomentum, selectMomentumSnapshot } = await import(new URL("../src/lib/market.js", import.meta.url));
const { chartPreferencePayload, sanitizeChartPreferences } = await import(new URL("../src/lib/chart-visuals.js", import.meta.url));
const { CHART_REPLAY_SPEEDS, nextReplayCursor, replayCandles, replayStartIndex } = await import(new URL("../src/lib/chart-replay.js", import.meta.url));
assert.equal(companyDashboardPath("1010", "1wk"), "/dashboard?company=1010&timeframe=1wk", "strategy links must preserve weekly context");
assert.equal(companyDashboardPath("1010", "invalid"), "/dashboard?company=1010", "invalid chart intervals must not enter company URLs");
const selectedMomentum = selectMomentumSnapshot([
  { indicator_key: "technical_signals", source_as_of: "2026-08-02T10:00:00Z", values: { zones: [] } },
  { id: "older", indicator_key: "momentum_zones", source_as_of: "2026-07-30T10:00:00Z" },
  { id: "latest", indicator_key: "momentum_zones", source_as_of: "2026-08-01T10:00:00Z" },
]);
assert.equal(selectedMomentum?.id, "latest", "company details must select the latest momentum snapshot by type and timestamp");
const risingBars = Array.from({ length: 40 }, (_, index) => ({
  time: 1_700_000_000 + index * 86_400,
  open: 100 + index,
  high: 101 + index,
  low: 99 + index,
  close: 100 + index,
  volume: 1_000 + index,
}));
const risingRsi = calculateRsiSeries(risingBars, 14, "close");
assert.equal(risingRsi.length, 26, "RSI should start after the configured Wilder seed period");
assert.ok(risingRsi.every((point) => point.value === 100), "strictly rising verified bars should produce RSI 100");
const momentumSnapshot = calculateMomentumSnapshot(risingBars, 20, 500, "dark");
assert.ok(momentumSnapshot?.zones?.length === 7, "momentum port must return the five established zones plus the sequential three-year and five-year recurrence zones");
assert.ok(momentumSnapshot.zones.every((zone) => zone.top > zone.bottom && zone.bottom > zone.stop), "momentum zone price ordering must remain strict");
assert.deepEqual(momentumSnapshot.zones.slice(5).map((zone) => zone.displayNameAr), ["قاع ثلاث سنوات", "منطقة خمس سنوات"], "deep recurrence zones must keep their approved Arabic identities");
assert.notEqual(momentumSnapshot.zones[5].color, momentumSnapshot.zones[6].color, "deep recurrence zones must use distinct colors");
const upgradedLegacyMomentum = normalizeMomentum({
  zones: momentumSnapshot.zones.slice(0, 5),
}, "light");
assert.equal(upgradedLegacyMomentum.zones.length, 7, "legacy five-zone snapshots must be upgraded for every chart and zone card");
assert.deepEqual(upgradedLegacyMomentum.zones.slice(5).map((zone) => zone.active), [false, false], "new deep zones must remain waiting until their sequential activation conditions are proven");
const hiddenWatermark = chartPreferencePayload({ ...sanitizeChartPreferences({}), watermarkVisible: false });
assert.equal(hiddenWatermark.watermarkVisible, false, "watermark opt-out must survive the exact persisted chart-preference payload");
assert.deepEqual(CHART_REPLAY_SPEEDS.map((speed) => speed.value), [10, 3000, 5000, 10000], "bar replay must implement the approved milliseconds-per-candle presets exactly");
assert.equal(replayStartIndex(risingBars, risingBars[8].time), 8, "bar replay must resolve the selected historical candle deterministically");
assert.equal(replayCandles(risingBars, 8).length, 9, "bar replay must hide every candle after the current replay cursor");
assert.equal(nextReplayCursor(8, risingBars.length, -1), 7, "bar replay must step backwards one candle");
assert.equal(nextReplayCursor(risingBars.length - 1, risingBars.length, 1), risingBars.length - 1, "bar replay must clamp at the latest stored candle");
const lifecycleBars = Array.from({ length: 7 }, (_, index) => ({
  time: 1_767_225_600 + index * 86_400,
  open: index === 0 ? 98 : 95,
  high: index === 0 ? 100 : 99,
  low: index === 0 ? 97 : 94,
  close: index === 0 ? 98 : 95,
}));
const frontendBroken = calculateMomentumSnapshot([
  ...lifecycleBars,
  { time: 1_767_830_400, open: 89, high: 91, low: 86, close: 88 },
  { time: 1_767_916_800, open: 88, high: 89, low: 85, close: 86 },
], 6, 500, "light");
assert.equal(frontendBroken.zones[0].role, "resistance", "the compatibility calculation must mirror backend role reversal");
assert.equal(frontendBroken.zones[0].displayStop, null, "frontend normalization must not revive a removed stop");

const viteConfig = await readFile(new URL("../vite.config.js", import.meta.url), "utf8");
assert.match(viteConfig, /path\.replace\(\/\^\\\/reference-api\/,\s*['\"]['\"]\)/, "reference proxy must only strip its prefix");
assert.doesNotMatch(viteConfig, /path\.replace\(\/\^\\\/reference-api\/,\s*['\"]\/api['\"]\)/, "reference proxy must not duplicate the /api prefix");

console.log(JSON.stringify({
  status: "pass",
  companies: catalog.companies.length,
  uniqueSymbols: 270,
  exactCatalogSha256: hash,
  entities: entityFiles.length,
  functions: functionNames.length,
  referencedEntities: referencedEntities.size,
  selectedCompany: { symbol: "4210", nameAr: company4210.nameAr, nameEn: company4210.nameEn },
}, null, 2));
