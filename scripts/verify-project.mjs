import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { chartControlTransition, closedChartControls } from "../src/lib/chart-controls.js";

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
assert.match(ingestion, /requireTrustedOwner\(base44\)/, "scheduled market ingestion must require the centralized trusted-owner policy");
assert.match(ingestion, /requireDataIngestionPermission\(base44, body\.session_id\)/, "manual market ingestion must require an opaque session and the dedicated server permission");
assert.match(ingestion, /identityContext/, "manual market ingestion must resolve identity and entitlements on the server");
assert.doesNotMatch(ingestion, /Base44-Service-Authorization/, "market ingestion must not trust a client-supplied service header");
assert.match(ingestion, /MAIN_MARKET_SYMBOLS\.has\(row\.symbol\)/, "ingestion must exclude records outside the verified main-market catalog");
assert.match(ingestion, /SMART_INVESTOR_MARKET_DATA_URL/, "licensed ingestion must require a provider endpoint secret");
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
assert.doesNotMatch(ingestion, /from\s+["']\.\.\/\.\.\/shared\//, "scheduled market ingestion must be self-contained because Base44 rejects imports outside the function directory");
assert.match(ingestion, /async function readJsonBody\(/, "scheduled market ingestion must enforce its self-contained request boundary");
assert.match(ingestion, /acquisition_source === "platform_owner_bootstrap"/, "scheduled market ingestion must enforce the trusted owner marker locally");

const historicalBackfill = await readFile(new URL("../base44/functions/historicalCandleBackfill/entry.ts", import.meta.url), "utf8");
assert.match(historicalBackfill, /requireAdminUser\(base44\)/, "historical backfill must require a verified admin identity");
assert.match(historicalBackfill, /asServiceRole\.functions\.invoke\("historicalCandleBackfill"/, "historical child batches must receive a verified service-role identity");
assert.doesNotMatch(historicalBackfill, /Base44-Service-Authorization/, "historical backfill must not trust a client-supplied service header");

const signalRefresh = await readFile(new URL("../base44/functions/marketSignalRefresh/entry.ts", import.meta.url), "utf8");
assert.match(signalRefresh, /requireAdminUser\(base44\)/, "signal refresh must require a verified admin identity");
assert.match(signalRefresh, /projectInstrumentBatch/, "signal batches must execute through the bounded in-process projector");
assert.doesNotMatch(signalRefresh, /asServiceRole\.functions\.invoke\("marketSignalRefresh"/, "signal refresh must not recurse through its public function boundary");
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
  ["18 11-14 * * 0-4", "18 10 * * 0-4", "18 15 * * 0-4", "26 15 * * 0-4", "36 15 * * 0-4"],
  "market workflows must cover the exact hourly Riyadh ingestion and closing cycles",
);
assert.deepEqual(
  [marketWorkflows[1], marketWorkflows[0], marketWorkflows[2]].map((workflow) => workflow.trigger.config.cron_expression),
  ["18 10 * * 0-4", "18 11-14 * * 0-4", "18 15 * * 0-4"],
  "Saudi ingestion must run once per hour from 10:18 through 15:18 without duplicate cycles",
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
const saudiSignalSteps = marketTechnicalSignalsDaily.definition.do.map((entry) => {
  const [key, step] = Object.entries(entry)[0];
  return { key, step };
});
const saudiSignalCalls = saudiSignalSteps.filter(({ step }) => step.call === "invoke_backend_function");
const saudiSignalWaits = saudiSignalSteps.filter(({ step }) => step.wait === "PT5M");
assert.equal(saudiSignalCalls.length, 35, "the Saudi workflow must resume 34 bounded batches and then finalize");
assert.equal(saudiSignalWaits.length, 34, "the Saudi workflow must separate every projection call by five minutes");
assert.equal(saudiSignalSteps.length, 69, "the Saudi workflow must remain a strictly sequential action/wait chain");
for (const { step } of saudiSignalCalls) {
  assert.equal(step.with.function_name, "marketSignalRefresh");
  assert.deepEqual(step.with.args, { market_code: "SA_MAIN", source: "daily_session_projection" });
}
for (let index = 0; index < saudiSignalSteps.length; index += 1) {
  assert.equal(saudiSignalSteps[index].step.then, saudiSignalSteps[index + 1]?.key || "end", "Saudi projection steps must never branch or run concurrently");
}
const marketSignalRefreshSource = await readFile(new URL("../base44/functions/marketSignalRefresh/source.ts", import.meta.url), "utf8");
assert.match(marketSignalRefreshSource, /session_date:\s*sessionDate/, "signal projection must read only the current 15-minute session for daily finalization");
assert.match(marketSignalRefreshSource, /chunk\.is_final === true/, "daily finalization must use only a finalized 15-minute session chunk");
assert.match(marketSignalRefreshSource, /chunk\.completeness_status === ["']complete["']/, "daily finalization must reject incomplete intraday sessions");
assert.match(marketSignalRefreshSource, /interval === ["']1d["']\s*\? isFinal && normalized\.length === 1 \? ["']complete["'] : ["']degraded["']/, "a finalized one-bar daily chunk must be stored as complete");
assert.match(marketSignalRefreshSource, /interval:\s*["']1d["']/, "signal projection must reuse the stored canonical daily archive");
assert.doesNotMatch(marketSignalRefreshSource, /intradayHistory = barsByInstrument/, "scheduled projection must not rebuild all historical daily candles from intraday data");
assert.doesNotMatch(marketSignalRefreshSource, /dailyFromStoredIntraday/, "scheduled projection must remain incremental and bounded");
assert.match(marketSignalRefreshSource, /run_type:\s*["']technical_projection_batch["']/, "each bounded Saudi projection batch must be observable");
assert.match(marketSignalRefreshSource, /body\.mode === ["']projection_finalize["']/, "the workflow must finalize batch coverage explicitly");
assert.match(marketSignalRefreshSource, /functions\.invoke\(["']marketSignalProjectionWorker["']/, "the visual workflow must fan out through a bounded worker function");
assert.match(marketSignalRefreshSource, /\["verified", "stale"\]\.includes\(quote\.quality_status\)/, "a final close may age to stale without becoming invalid for daily projection");
assert.match(marketSignalRefreshSource, /remaining_batches:/, "each scheduled workflow step must report resumable batch progress");
assert.doesNotMatch(marketSignalRefreshSource, /const batchResults = await Promise\.all/, "Saudi projection batches must never run concurrently");
assert.match(marketSignalRefreshSource, /const PROJECTION_BATCH_SIZE = 8/, "Saudi projection batches must stay below the observed Base44 entity write-traffic ceiling");
assert.match(marketSignalRefreshSource, /const PROJECTION_BATCH_COUNT = 34/, "Saudi projection capacity must cover the entire catalog in bounded batches");
assert.match(marketSignalRefreshSource, /indicator_key:\s*["']momentum_zones["']/, "the projection job must persist the authoritative investor-zone lifecycle snapshot");
assert.match(marketSignalRefreshSource, /MOMENTUM_FORMULA_VERSION/, "persisted investor zones must carry their versioned role-reversal formula");
assert.match(marketSignalRefreshSource, /timeframe === ["']1wk["']\s*\? isThursday\(sessionDate\)/, "weekly projections must finalize only at the Saudi trading-week close");
assert.match(marketSignalRefreshSource, /isLastSaudiTradingWeekdayOfMonth\(sessionDate\)/, "monthly projections must finalize only at the final Saudi trading weekday of the month");
assert.equal(companyIntelligenceDaily.trigger.config.cron_expression, "10 16 * * 0-4");
assert.equal(companyFinancialsTwiceWeekly.trigger.config.cron_expression, "0 16 * * 1,4");
assert.equal(companyIntelligenceDaily.trigger.config.timezone, "Asia/Riyadh");
assert.equal(companyFinancialsTwiceWeekly.trigger.config.timezone, "Asia/Riyadh");

const entityDirectory = fileURLToPath(new URL("../base44/entities/", import.meta.url));
const allEntityFiles = (await readdir(entityDirectory)).filter((name) => name.endsWith(".jsonc")).sort();
const entityFiles = allEntityFiles.filter((name) => /^[A-Z][A-Za-z0-9]*\.jsonc$/.test(name));
assert.equal(entityFiles.length, 57, "all 57 identity-preserving Base44 entity schemas must be present");
assert.deepEqual(allEntityFiles, [...entityFiles].sort(), "duplicate or identity-changing entity schema files must not remain beside the Base44 schemas");
const entityNames = new Set();
for (const name of entityFiles) {
  assert.match(name, /^[A-Z][A-Za-z0-9]*\.jsonc$/, `entity filename does not preserve the Base44 entity identity: ${name}`);
  const source = await readFile(join(entityDirectory, name), "utf8");
  const schema = JSON.parse(source);
  assert.equal(schema.type, "object", `${name} must have an object schema`);
  if (name === "User.jsonc") {
    assert.equal(schema.name, "User", "the built-in User extension must retain its exact Base44 identity");
    assert.equal(schema.properties.email, undefined, "the built-in User email field must not be redefined");
    assert.equal(schema.properties.role, undefined, "the built-in User role field must not be redefined");
    assert.deepEqual(Object.keys(schema.properties).sort(), ["registration_lock_expires_at", "registration_lock_token"], "the User extension must remain limited to the registration concurrency lease");
    entityNames.add(schema.name);
    continue;
  } else {
    assert.match(schema.name, /^[A-Za-z0-9]+$/, `${name} has an invalid entity name`);
  }
  assert.ok(!entityNames.has(schema.name), `duplicate entity name: ${schema.name}`);
  entityNames.add(schema.name);
  for (const operation of ["create", "read", "update", "delete"]) {
    assert.equal(schema.rls?.[operation], false, `${name} must deny browser ${operation}`);
  }
}
assert.ok(entityNames.has("User"), "the Base44 User extension must be present without redefining built-in fields or permissions");
const entityNamesLower = new Set([...entityNames].map((name) => name.toLowerCase()));
for (const required of ["CustomerProfile", "Instrument", "QuoteLatest", "QuoteObservation", "CandleChunk", "ActiveDeviceSession", "Subscription", "ChartDrawing", "CompanyAnnouncement", "Account", "AccountMember", "PermissionDefinition", "RoleDefinition", "RolePermission", "MemberRoleAssignment", "PlanEntitlement", "UsageCounter", "Market", "InstrumentAlias", "ProviderInstrumentMap", "TradingPlatform", "MarketAccessApplication", "Message", "NotificationPreference", "Course", "CourseLesson", "PlaybackLease", "ContentSecurityEvent", "CustomerReportSnapshot"]) {
  assert.ok(entityNamesLower.has(required.toLowerCase()), `required entity is missing: ${required}`);
}
const customerProfile = JSON.parse(await readFile(new URL("../base44/entities/CustomerProfile.jsonc", import.meta.url), "utf8"));
assert.ok(!customerProfile.required.includes("phone_e164"), "admin migration must not fabricate a phone number");
assert.ok(!customerProfile.required.includes("country_code"), "admin migration must not fabricate a country");

const functionDirectory = fileURLToPath(new URL("../base44/functions/", import.meta.url));
const functionNames = (await readdir(functionDirectory, { withFileTypes: true })).filter((item) => item.isDirectory()).map((item) => item.name);
assert.equal(functionNames.length, 36, "all 36 backend functions must be present");
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
assert.match(marketService, /message\s*===\s*["']Active device session required["']/, "an expired or revoked SMART_INVESTOR session must be detected");
assert.match(marketService, /localStorage\.removeItem\(["']smart_investor_session_id["']\)/, "an invalid SMART_INVESTOR session must be cleared before returning to login");
assert.match(marketService, /marketReadQueue\.then\(factory, factory\)/, "market reads must be serialized so chart, company and sector requests do not exhaust the backend together");
assert.match(marketService, /invokeWithTimeout\(invoke, 30_000\)/, "a healthy bounded market read must have enough time to finish without premature duplicate retries");

const appParamsSource = await readFile(new URL("../src/lib/app-params.js", import.meta.url), "utf8");
assert.match(appParamsSource, /functionsVersion:[\s\S]*persist:\s*false,[\s\S]*useStored:\s*false/, "published pages must not reuse a stale preview function version");
assert.match(appParamsSource, /getAppParamValue\(["']clear_access_token["'],\s*\{[\s\S]*?persist:\s*false,[\s\S]*?useStored:\s*false,[\s\S]*?\}\)/, "the one-shot Base44 token reset must never survive into another browser tab");
assert.match(appParamsSource, /removeItem\(["']base44_clear_access_token["']\)/, "legacy persisted reset flags must be removed during session bootstrap");

const base44Client = await readFile(new URL("../src/api/base44Client.js", import.meta.url), "utf8");
assert.match(base44Client, /localBrowserHosts\.has\(window\.location\.hostname\)/, "the Base44 SDK stub must be limited to localhost browsers");
assert.doesNotMatch(base44Client, /isLocalReferencePreview\s*=\s*import\.meta\.env\.DEV/, "Base44 editor preview must initialize the real Base44 SDK");

const protectedRoute = await readFile(new URL("../src/components/ProtectedRoute.jsx", import.meta.url), "utf8");
assert.match(protectedRoute, /!isReferencePreview\(\)\s*&&\s*!localStorage\.getItem\(['"]smart_investor_session_id['"]\)/, "protected market routes must require the verified SMART_INVESTOR device session");

const loginPage = await readFile(new URL("../src/pages/Login.jsx", import.meta.url), "utf8");
const registerPage = await readFile(new URL("../src/pages/Register.jsx", import.meta.url), "utf8");
const authRegistrationFunction = await readFile(new URL("../base44/functions/authRegistration/entry.ts", import.meta.url), "utf8");
const adminAccessFunction = await readFile(new URL("../base44/functions/adminAccess/entry.ts", import.meta.url), "utf8");
const trainingContentFunction = await readFile(new URL("../base44/functions/trainingContent/entry.ts", import.meta.url), "utf8");
const customerSelfServiceFunction = await readFile(new URL("../base44/functions/customerSelfService/entry.ts", import.meta.url), "utf8");
const adminSubscriptionsPersistenceFunction = await readFile(new URL("../base44/functions/adminSubscriptions/entry.ts", import.meta.url), "utf8");
const adminRolesPersistenceFunction = await readFile(new URL("../base44/functions/adminRoles/entry.ts", import.meta.url), "utf8");
const destinationsPage = await readFile(new URL("../src/pages/Destinations.jsx", import.meta.url), "utf8");
const coursesAdminPage = await readFile(new URL("../src/pages/CoursesAdmin.jsx", import.meta.url), "utf8");
const landingCoursesPage = await readFile(new URL("../src/pages/Landing.jsx", import.meta.url), "utf8");
const rolesAdminPage = await readFile(new URL("../src/pages/RolesAdmin.jsx", import.meta.url), "utf8");
const subscriptionsAdminPage = await readFile(new URL("../src/pages/SubscriptionsAdmin.jsx", import.meta.url), "utf8");
const customerReportFunction = await readFile(new URL("../base44/functions/customerReport/entry.ts", import.meta.url), "utf8");
const customerReportWorkflow = JSON.parse(await readFile(new URL("../base44/workflows/CustomerReportDaily.jsonc", import.meta.url), "utf8"));
const authLayout = await readFile(new URL("../src/components/AuthLayout.jsx", import.meta.url), "utf8");
const siteStyles = await readFile(new URL("../src/index.css", import.meta.url), "utf8");
const registrationState = await readFile(new URL("../base44/shared/registrationState.mjs", import.meta.url), "utf8");
const registrationLease = await readFile(new URL("../base44/shared/registrationLease.mjs", import.meta.url), "utf8");
assert.match(loginPage, /isAuthenticated\?t\.sendCode:t\.next/, "an already authenticated Base44 user must continue through SMART_INVESTOR email OTP");
assert.match(registerPage, /marketing_consent:\s*form\.consent/, "registration must send the mandatory communication consent to the backend");
assert.match(registerPage, /phone_accuracy_acknowledged/, "registration must require a clear mobile-number accuracy acknowledgement");
assert.doesNotMatch(registerPage, /phone_code|start_phone_verification/, "registration must not request or send a mobile verification code");
assert.doesNotMatch(authRegistrationFunction, /TWILIO|twilio|VerificationCheck|phone_verified/, "registration must not depend on phone verification services or claim the phone was verified");
assert.match(authRegistrationFunction, /privaterelay\.appleid\.com/, "Apple private relay email addresses must be rejected");
assert.match(authRegistrationFunction, /private\.icloud\.com/, "Apple shared private relay addresses must be rejected");
assert.match(registrationState, /account_status:\s*"pending_owner_approval"/, "new customers must remain pending until the owner decides");
assert.match(authRegistrationFunction, /acquireRegistrationLease/, "registration completion must serialize concurrent requests for one authenticated user");
assert.match(registrationLease, /entities\.User\.update\(userId/, "the registration lease must use the Base44-supported single-user update path");
assert.match(registrationLease, /registration_lock_token !== token/, "the registration lease must verify ownership after each single-user update");
assert.match(adminAccessFunction, /context\.role !== "owner"/, "market application decisions must be owner-only");
assert.match(adminAccessFunction, /10 \* 24 \* 60 \* 60 \* 1000/, "owner approval must create exactly ten free days");
assert.match(adminAccessFunction, /market_code:\s*application\.market_code/, "each approved application must stay bound to one market");
assert.match(trainingContentFunction, /CreateFileSignedUrl/, "course playback must use temporary links for private Base44 files");
assert.match(trainingContentFunction, /storage_provider:\s*"base44_private"/, "course videos must be stored in private Base44 storage");
assert.doesNotMatch(trainingContentFunction, /BUNNY|bunny|mediadelivery|DRM/, "course delivery must not depend on an external video provider or claim DRM");
assert.match(trainingContentFunction, /attempt >= 3/, "three verified parallel playback attempts must trigger the temporary block gate");
assert.match(trainingContentFunction, /ActiveDeviceSession\.updateMany/, "a protected-content block must revoke active sessions");
assert.match(customerSelfServiceFunction, /body\.action === "destinations"/, "destination management must have a market-independent backend read path");
assert.match(destinationsPage, /action:\s*"destinations"/, "the destinations page must not call a market-scoped alerts read without a market");
assert.match(adminSubscriptionsPersistenceFunction, /SUBSCRIPTION_PERSISTENCE_FAILED/, "subscription changes must be read back and confirmed before success");
assert.match(adminRolesPersistenceFunction, /ROLE_ASSIGNMENT_PERSISTENCE_FAILED/, "role assignments must be read back and confirmed before success");
assert.match(subscriptionsAdminPage, /transitionOptions\(item\.status\)/, "subscription status choices must only expose valid backend transitions");
assert.match(subscriptionsAdminPage, /aria-live="polite"/, "subscription saves must provide accessible confirmation");
assert.match(rolesAdminPage, /membership_id/, "the owner must not be offered as a self-assignment target");
assert.match(rolesAdminPage, /aria-live="polite"/, "role saves must provide accessible confirmation");
assert.match(coursesAdminPage, /UploadPrivateFile/, "the owner course page must upload lecture videos to private storage");
assert.match(coursesAdminPage, /إضافة محاضرة ورفع الفيديو/, "the owner course page must expose lecture creation clearly");
assert.match(landingCoursesPage, /action:\s*"public_list"/, "the landing page must load published public courses");
assert.match(landingCoursesPage, /id="courses"/, "the landing page must contain a real public-courses section");
assert.match(customerReportFunction, /UploadPrivateFile/, "customer reports must be stored as private files");
assert.match(customerReportFunction, /All Customers/, "the Excel-compatible workbook must retain the newest-first master sheet");
assert.equal(customerReportWorkflow.trigger.config.cron_expression, "55 23 * * *", "daily customer reporting must run at 23:55 in the configured Riyadh timezone");
assert.equal(customerReportWorkflow.trigger.config.timezone, "Asia/Riyadh", "daily customer reporting must use the Riyadh timezone explicitly");
assert.equal(customerReportWorkflow.definition.do[0].update_customer_report.with.function_name, "customerReport", "the daily customer report workflow must invoke the protected report function");
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
assert.equal((companyChart.match(/readMarketChart\(request\)/g) || []).length, 1, "each chart state must use one combined candle and investor-zone request");
assert.doesNotMatch(companyChart, /indicatorRange/, "the chart must not issue a second full-history request for investor zones");
assert.match(marketService, /chartRequestInflight\.has\(key\)/, "identical in-flight chart reads must be deduplicated");
assert.match(marketService, /CHART_CACHE_MAX_ENTRIES/, "the short chart cache must remain bounded");
assert.match(marketService, /MARKET_SUPPLEMENT_MAX_AGE_MS = 15 \* 60_000/, "non-critical market supplements must be cached for the quarter-hour display cycle");
assert.match(marketService, /marketSupplementInflight\.has\(key\)/, "identical sector-summary reads must be deduplicated");
assert.match(companyChart, /save_chart_preferences/, "chart preferences must persist through the protected backend");
assert.match(companyChart, /axisLabelVisible:\s*false,\s*title:\s*""/, "investor-zone boundaries must not crowd the price axis with repeated labels");
assert.match(companyChart, /rsiSettings\.lineColor/);
assert.match(companyChart, /momentumSettings\.zones/);
assert.match(companyChart, /className=\{["']ohlc-strip ["'] \+ \(hovered \? ["']["'] : ["']invisible["']\)\}/, "the OHLC strip must reserve its height so pane hover cannot shake the chart");
assert.match(companyChart, /new InvestorZonePrimitive\(\)/, "investor zones must render through the chart primitive lifecycle instead of a React DOM overlay");
assert.match(companyChart, /candlesSeries\.attachPrimitive\(investorZonePrimitive\)/, "investor zones must be attached to the price series so zoom and scale use price coordinates");
assert.doesNotMatch(companyChart, /setZoneGeometry/, "chart navigation must not trigger React state updates for zone geometry");
assert.match(companyChart, /sameHoveredCandle\(hoveredRef\.current, next\)/, "crosshair state must skip React renders while the hovered candle is unchanged");
assert.match(companyChart, /kineticScroll:\s*\{\s*mouse:\s*true,\s*touch:\s*true\s*\}/, "mouse and touch panning must retain kinetic scrolling");
assert.match(companyChart, /fittedDataScopeRef\.current !== dataScope/, "routine quote refreshes must preserve the user's pan and zoom instead of fitting the chart again");
assert.match(companyChart, /nextMeta\?\.range_complete === false/, "partial stored history must never be persisted as a successful full-range selection");
assert.match(companyChart, /historyMeta\.available_ranges\.includes\(item\.value\)/, "range controls must be governed by actual backend coverage");
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
assert.match(companyChart, /Popover\.Portal/, "chart control popovers must render above chart controls in a portal");
assert.match(companyChart, /Popover\.Portal container=\{portalContainer \|\| undefined\}/, "chart control popovers must stay inside the fullscreen chart top-layer subtree");
assert.match(companyChart, /ref=\{bindChartRoot\}/, "the chart shell must provide the fullscreen-safe portal container");
assert.match(companyChart, /collisionPadding=\{12\}/, "chart control popovers must avoid viewport collisions");
assert.match(chartStyles, /\.chart-control-popover\s*\{[^}]*z-index:\s*140/, "chart control popovers must have one deterministic layer above every chart toolbar");
assert.doesNotMatch(chartStyles, /\.chart-type-popover\s*\{[^}]*absolute/, "the candle chooser must rely on collision-aware positioning instead of a competing local absolute layer");
assert.match(chartStyles, /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*?\.indicator-hub-popover\s*\{\s*width:\s*calc\(100vw\s*-\s*48px\);/, "the indicator menu must stay inside narrow mobile viewports");
assert.match(chartStyles, /\.indicator-hub-toggle > span:nth-child\(2\)\s*\{[^}]*whitespace-normal[^}]*break-words/, "indicator names must remain readable instead of being clipped to icons");
assert.doesNotMatch(chartStyles, /\.chart-shell:fullscreen \.chart-company-navigation\s*\{[^}]*hidden/, "fullscreen must never hide previous/next company navigation");
assert.match(chartStyles, /\.chart-shell:fullscreen \.chart-company-navigation > button:not\(\.secondary-button\)[^{]*\{[^}]*min-h-8/, "fullscreen company navigation must remain present in a compact form");
assert.match(chartStyles, /\.chart-shell:fullscreen \.chart-canvas-wrap[^{]*\{[^}]*flex-1/, "fullscreen chart must consume the remaining viewport instead of leaving dead space");
assert.match(chartStyles, /@media \(min-width:768px\) and \(max-width:1279px\)[\s\S]*?min-width:44px;\s*min-height:44px;/, "tablet chart controls must provide touch-safe 44px targets");
assert.match(chartStyles, /@media \(max-width:767px\)[\s\S]*?min-width:44px;\s*min-height:44px;/, "mobile chart controls must provide touch-safe 44px targets");
assert.match(chartStyles, /@media \(min-width:768px\) and \(max-width:1279px\)[\s\S]*?\.chart-chip \{ min-height:44px; min-width:44px;/, "tablet timeframe chips must provide 44px touch targets");
assert.match(chartStyles, /@media \(max-width:767px\)[\s\S]*?\.chart-chip \{ min-height:44px; min-width:44px;/, "mobile timeframe chips must provide 44px touch targets");
assert.match(chartStyles, /\.chart-shell \.secondary-button, \.chart-shell \.momentum-card-eye \{ min-height:44px; \}/, "chart secondary and investor-zone controls must remain touch-safe");
assert.match(chartStyles, /drawing-object-tree button, \.drawing-status button \{ min-width:44px; min-height:44px; \}/, "drawing object actions must remain touch-safe");
assert.match(chartStyles, /@media \(min-width:768px\) and \(max-width:1279px\) and \(orientation:landscape\) and \(max-height:600px\)[\s\S]*?min-height:340px/, "landscape tablets must receive a compact chart height");
assert.match(chartStyles, /\.chart-canvas-wrap\s*\{[^}]*height:clamp\(440px,62dvh,720px\)/, "chart height must adapt to the device viewport instead of using one fixed desktop size");

const { InvestorZonePrimitive } = await import(new URL("../src/lib/investor-zone-primitive.js", import.meta.url));
let zonePriceScale = 10;
let zoneRenderRequests = 0;
const zonePrimitive = new InvestorZonePrimitive();
zonePrimitive.attached({
  chart: { timeScale: () => ({ timeToCoordinate: () => 64 }) },
  series: { priceToCoordinate: (price) => Number(price) * zonePriceScale },
  requestUpdate: () => { zoneRenderRequests += 1; },
});
zonePrimitive.setData({ visible: true, referenceTime: 1_700_000_000, zones: [{ name: "zone", topPrice: 12, bottomPrice: 10, color: "#16a34a", fill: "rgba(22,163,74,.15)" }] });
assert.deepEqual(zonePrimitive.paneViews()[0].zones.map(({ left, top, bottom }) => ({ left, top, bottom })), [{ left: 64, top: 120, bottom: 100 }], "investor zones must be projected from their stored prices and start time");
zonePriceScale = 20;
zonePrimitive.updateAllViews();
assert.deepEqual(zonePrimitive.paneViews()[0].zones.map(({ left, top, bottom }) => ({ left, top, bottom })), [{ left: 64, top: 240, bottom: 200 }], "price-axis zoom must reproject the same zone prices instead of moving a DOM rectangle independently");
assert.equal(zoneRenderRequests, 1, "zone data changes should request one chart render without React navigation state churn");

assert.deepEqual(chartControlTransition(closedChartControls, { type: "toggle-menu", menu: "candle-type" }), { menu: "candle-type", panel: "" }, "candle menu must open from the shared control state");
assert.deepEqual(chartControlTransition({ menu: "candle-type", panel: "" }, { type: "toggle-menu", menu: "indicators" }), { menu: "indicators", panel: "" }, "opening indicators must close the candle chooser");
assert.deepEqual(chartControlTransition({ menu: "", panel: "momentum" }, { type: "toggle-menu", menu: "indicators" }), closedChartControls, "pressing indicators again must close its inline settings");
assert.deepEqual(chartControlTransition({ menu: "indicators", panel: "" }, { type: "toggle-panel", panel: "momentum" }), { menu: "", panel: "momentum" }, "opening zone settings must close the indicator popover");

const chartDrawingsFunction = await readFile(new URL("../base44/functions/chartDrawings/entry.ts", import.meta.url), "utf8");
assert.match(chartDrawingsFunction, /authorizationContext\(base44, body\.session_id\)/, "drawing storage must require the verified SMART_INVESTOR session and authorization context");
assert.match(chartDrawingsFunction, /requireMarketEntitlement\(context, body\.market_code\)/, "drawing storage must enforce the selected market subscription");
assert.match(chartDrawingsFunction, /row\.customer_id !== profile\.id/, "drawing mutations must enforce object ownership");
assert.match(chartDrawingsFunction, /DRAWING_ALERT_DELETE_CONFIRMATION_REQUIRED/, "a drawing with an alert must not be deleted without explicit confirmation");
assert.match(chartDrawingsFunction, /"trend_line", "ray", "horizontal_line"/, "drawing alerts must be restricted to supported line geometry");
assert.match(chartDrawingsFunction, /body\.action === "duplicate"/, "copy/paste must create the duplicate through the protected backend");
assert.match(chartDrawingsFunction, /drawing\.duplicate/, "backend drawing duplication must be audited");
assert.match(chartDrawingsFunction, /body\.action === "set_visibility_bulk"/, "bulk drawing visibility must be enforced by the backend");
assert.match(chartDrawingsFunction, /body\.action === "delete_all"/, "bulk drawing deletion must be enforced by the backend");
assert.match(chartDrawingsFunction, /drawing\.bulk\.delete/, "bulk drawing deletion must be audited");

const drawingTools = await readFile(new URL("../src/components/market/ChartDrawingTools.jsx", import.meta.url), "utf8");
assert.match(drawingTools, /finishDrawing\(value\)[\s\S]*?setActiveTool\(null\)/, "finishing a drawing must return pointer ownership to chart pan and pinch interactions");
assert.match(drawingTools, /beginExistingDrawingInteraction/, "a saved drawing must be directly selectable and editable without a separate move tool");
assert.match(drawingTools, /host\.addEventListener\("pointerdown", onPointerDown, true\)/, "drawing hit testing must run in capture phase while leaving empty-chart gestures to the chart");
assert.match(drawingTools, /if \(isDrawingUiEvent\(event\)/, "capture-phase drawing hit testing must ignore contextual drawing controls before clearing selection");
assert.match(drawingTools, /className="drawing-selection-toolbar" data-drawing-ui="true"/, "selected drawing controls must remain mounted while color, width, lock, median, and delete actions run");
assert.match(drawingTools, /data-action="delete-selected-drawing"/, "selected drawing deletion must stay visible in the contextual toolbar header");
assert.match(drawingTools, /placeFloatingToolbarPosition/, "the selected drawing toolbar must stay inside the chart without covering other chart controls");
assert.match(chartStyles, /\.drawing-selection-toolbar[^}]*pointer-events-auto[^}]*z-\[50\]/, "selected drawing controls must stay above every chart overlay and accept input");
assert.match(drawingTools, /data-action="clear-all-drawings"/, "delete-all must remain a distinct explicit action from selected drawing deletion");
assert.match(drawingTools, /pointerType === "touch" \? 16/, "touch selection must use a larger hit target than mouse selection");
assert.doesNotMatch(drawingTools, /activeTool === "select"/, "drawing editing must not require a separate select or move mode");
assert.match(drawingTools, /function ParallelChannelIcon/, "the parallel channel must use a dedicated channel glyph instead of a volume-chart icon");
assert.match(drawingTools, /removeSelected\(\)/, "the selected drawing must expose individual deletion");
assert.match(drawingTools, /pasteCopied\(\)/, "the drawing toolbar must expose a real paste action");
const chartSettingsSheet = await readFile(new URL("../src/components/market/ChartSettingsSheet.jsx", import.meta.url), "utf8");
assert.match(chartSettingsSheet, /شموع ممتلئة/, "the standard candle type must use the professional filled-candle label");
assert.doesNotMatch(chartSettingsSheet, /شموع عادية/, "the non-standard ordinary-candles label must be removed");
for (const tool of ["trend_line", "ray", "horizontal_line", "vertical_line", "arrow", "rectangle", "parallel_channel", "polyline", "curve", "brush", "price_range", "date_range", "date_and_price_range"]) {
  assert.match(drawingTools, new RegExp(tool), `drawing tool is missing: ${tool}`);
}
assert.match(drawingTools, /deleteChartDrawing\(marketCode, symbol, current, force\)/, "drawing deletion must wait for persistence and use the protected market-scoped backend service");
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
assert.match(marketReadFunction, /if \(interval === "1d"\) return \[interval\]/, "daily charts must not scan the much larger intraday archive as a fallback");
assert.match(marketReadFunction.match(/async function sectorSummaries[\s\S]*?async function sectorResponse/)?.[0] || "", /is_historical_archive:\s*true[\s\S]*?500/, "sector heat must read only the bounded daily archive needed for its two-session rule");
assert.match(marketReadFunction, /market_code: body\?\.market_code \|\| null/, "market-read failures must record the requested market for root-cause diagnosis");
assert.match(marketReadFunction, /storedCandlesForInstruments/, "sector charts must bulk-read stored candles instead of issuing one database query per constituent");
assert.match(marketReadFunction, /INTERVAL_RANGE_MATRIX/, "the backend must reject interval and range combinations outside the supported chart contract");
assert.match(marketReadFunction, /candleRangeMetadata/, "chart responses must calculate actual stored coverage before describing a requested range as complete");
assert.match(marketReadFunction, /available_ranges/, "chart responses must disclose the ranges actually covered by stored candles");
assert.match(marketReadFunction, /range_complete/, "chart responses must distinguish partial range data from complete coverage");
assert.match(marketReadFunction, /instrument_type:\s*"sector_index"/, "sector search results must carry a first-class instrument identity");
assert.match(marketReadFunction, /TASI_SYMBOL/, "the protected market directory must include the Saudi general market index");
assert.match(marketReadFunction, /searchCandidateScore/, "instrument autocomplete must use deterministic exact, prefix, and substring ranking");
assert.match(marketReadFunction, /Number\(currentChange\) <= -1\.5 && Number\(priorChange\) <= -1\.5/, "sector heat state must reserve red for a two-session decline beyond 1.5 percent");
assert.match(marketReadFunction, /body\.action === "sector_summaries"/, "sector heat must use a separate protected read instead of blocking the core market snapshot");
assert.match(marketReadFunction, /const sectorSummaryRows = \[\]/, "the core market snapshot must not scan historical candle chunks for sector heat");
assert.match(marketReadFunction, /attempt <= 3/, "rate-limited entity reads must use a bounded server-side retry");
const dashboardPage = await readFile(new URL("../src/pages/Dashboard.jsx", import.meta.url), "utf8");
const companyPanel = await readFile(new URL("../src/components/market/CompanyPanel.jsx", import.meta.url), "utf8");
const appShell = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const appErrorBoundary = await readFile(new URL("../src/components/AppErrorBoundary.jsx", import.meta.url), "utf8");
assert.match(companyPanel, /hasCurrentInstrument = state\.dataSymbol === symbol && Boolean\(state\.data\?\.instrument\)/, "opening a company must guard the first render before company data arrives");
assert.match(companyPanel, /if \(!data\?\.instrument\) throw new Error\("company_payload_incomplete"\)/, "an incomplete company response must use the recoverable error path");
assert.match(appShell, /<AppErrorBoundary><AppRoutes \/><\/AppErrorBoundary>/, "a route render failure must not leave the application on a blank page");
assert.match(appErrorBoundary, /<SessionLink[^>]+to="\/dashboard"/, "the render fallback must provide a real-link return to the dashboard");
assert.match(dashboardPage, /SectorPanel/, "sector selection must open a sector profile, not only filter the table");
assert.match(dashboardPage, /InstrumentSearchInput/, "the visible dashboard search must use the protected autocomplete instead of a cosmetic table filter");
assert.match(dashboardPage, /MarketIndexPanel/, "TASI selection must open a dedicated market-index analysis panel");
assert.match(dashboardPage, /sector-heat-/, "sector tiles must consume the backend movement state");
assert.match(dashboardPage, /readMarketSupplement\(\{ action: "sector_summaries"/, "sector heat must load through the bounded supplement cache after the core dashboard snapshot");
assert.match(dashboardPage, /refreshWarning: retained \? "last_snapshot_retained"/, "a transient same-market refresh failure must retain the last successful snapshot");
assert.doesNotMatch(dashboardPage, /MarketDataStatus/, "the removed market-status banner must not be mounted on the dashboard");
assert.match(marketReadFunction, /fallbackIntervals\(interval\)/, "weekly and monthly chart requests must fall back to stored daily or intraday candles");
assert.match(marketReadFunction, /storedCandlesForInterval\(base44, instrument, interval, body\.market_code\)/, "company charts must read stored candles through the complete market instrument identity");
assert.match(marketReadFunction, /mergeStoredCandleSeries\(series, interval, marketCandleOptions\(marketCode\)\)/, "stored historical and fresh intraday candles must be merged using the active market timezone");
assert.match(marketReadFunction, /requestedMarket === "SA_MAIN" \? filter : \{ \.\.\.filter, market_code: requestedMarket \}/, "Saudi reads must recover legacy candle chunks without weakening explicit market filters elsewhere");
assert.match(marketReadFunction, /if \(requestedMarket === "SA_MAIN"\) return !storedMarket \|\| storedMarket === requestedMarket/, "Saudi compatibility reads must accept only legacy untagged or explicitly Saudi stored records");
assert.match(marketReadFunction, /return storedMarket === requestedMarket/, "non-Saudi candle reads must keep exact market isolation");
assert.equal((marketReadFunction.match(/readStoredCandleChunks\(base44,/g) || []).length, 4, "all company, multi-instrument, and sector-summary candle reads must share the compatibility guard");
assert.match(marketReadFunction, /return \{ symbol: symbols\.length === 1 \? symbols\[0\] : \{ \$in: symbols \}, interval \}/, "Saudi candle reads must resolve legacy archives by stable exchange symbol rather than a regenerated entity id");
assert.match(marketReadFunction, /readHistoricalSyncs\(base44, instrument, body\.market_code\)/, "historical completeness metadata must use the same legacy-compatible Saudi identity");
assert.match(marketReadFunction, /async function readIndicatorSnapshots/, "Saudi indicator reads must share a legacy-compatible market guard");
assert.match(marketReadFunction, /requestedMarket === "SA_MAIN"[\s\S]*?identityFilter[\s\S]*?market_code: requestedMarket/, "legacy Saudi indicator snapshots must be read without weakening explicit market isolation elsewhere");
assert.match(marketReadFunction, /readIndicatorSnapshots\(base44, \{ instrument_id: instrument\.id, market_code: body\.market_code \}, body\.market_code\)/, "company investor zones must recover legacy Saudi snapshots");
assert.match(marketReadFunction, /readIndicatorSnapshots\(base44, \{[\s\S]*?indicator_key: "technical_signals"[\s\S]*?\}, requestedMarket, "-source_as_of", 1000\)/, "the Saudi screener must recover legacy technical signals through the same market guard");
assert.match(marketReadFunction, /storedCandlesForInstruments\(base44, instruments, interval, requestedMarket, range\)/, "sector charts must resolve legacy chunks back to current instruments by symbol and requested range");
assert.match(marketReadFunction, /const pendingIds = new Set/, "sector charts must track constituents that still need a fallback interval");
assert.match(marketReadFunction, /const cutoff = range === "max"[\s\S]*?fullBars\.filter\(\(bar\) => new Date\(bar\.time\)\.getTime\(\) >= cutoff\)/, "sector aggregation must process only candles inside the requested display range");
assert.match(marketReadFunction, /coverageTimeline/, "sector range metadata must retain full stored-history coverage after range-limited aggregation");
assert.match(marketReadFunction, /if \(!pendingInstruments\.length\) break/, "sector charts must stop reading fallback intervals once every constituent has sufficient coverage");
assert.match(marketReadFunction, /technical_signals/, "market reads must expose persisted technical signals to the screener");
assert.match(marketReadFunction, /bullish_zone_pin_bar/, "the protected screener must filter bullish pin bars inside investor zones");
assert.match(marketReadFunction, /bearish_zone_pin_bar/, "the protected screener must filter bearish pin bars inside investor zones");
assert.match(marketReadFunction, /signal_window\.slice\(0, 3\)/, "the screener must search the current stored candle and the two candles before it");
assert.match(marketReadFunction, /latestIndicatorByIdentity/, "the screener must select the latest snapshot per instrument, signal type, and timeframe");
assert.match(marketReadFunction, /storedWindow\.find\(\(values\) => primarySignals\.some/, "all-strategies mode must return only an actual strategy match, not every calculated instrument");
assert.match(marketReadFunction, /matched_signals: matchedSignals/, "each result must disclose the strategies that actually matched its candle");
assert.match(marketReadFunction, /screener_match/, "each screener result must expose the exact matching candle as evidence");
assert.doesNotMatch(marketReadFunction, /if \(bars\.length\) return \{ bars, chunks/, "chart storage must not stop at the first stale interval");
assert.match(ingestion, /snapshot_version: provenance\.snapshotVersion/, "candle chunks must retain their ingestion snapshot provenance");
const customerMarketTable = await readFile(new URL("../src/components/market/MarketTable.jsx", import.meta.url), "utf8");
assert.doesNotMatch(customerMarketTable, /data_state\?\.label/, "the market table must not replay obsolete labels stored with old quotes");
const customerMarketTicker = await readFile(new URL("../src/components/market/MarketTicker.jsx", import.meta.url), "utf8");
assert.doesNotMatch(customerMarketTicker, /data_state\?\.label/, "the ticker must not replay obsolete labels stored with old quotes");
const screenerPage = await readFile(new URL("../src/pages/Screener.jsx", import.meta.url), "utf8");
assert.match(screenerPage, /snapshot_count === 0/, "the screener must distinguish unavailable calculations from a genuine zero-match result");
assert.match(screenerPage, /لا تعني النتيجة الصفرية عدم وجود إشارات/, "Arabic screener feedback must not report a false zero result when snapshots are missing");
const appRouter = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const authContext = await readFile(new URL("../src/lib/AuthContext.jsx", import.meta.url), "utf8");
assert.match(appRouter, /BrowserRouter as Router/, "the current React Router advisory is not applicable only while the app remains in declarative BrowserRouter mode");
assert.doesNotMatch(appRouter, /unstable_|RSC|ServerAction|createRequestHandler/, "the client application must not activate the advisory's unstable RSC server-action path");
assert.match(appRouter, /path="\/application-status" element=\{<ApplicationStatus \/>\}/, "pending customers must be able to reach application status outside the market workspace guard");
assert.doesNotMatch(appRouter, /navigateToLogin\(\)/, "public registration and application-status routes must not be globally redirected by authentication state");
assert.match(appRouter, /const ProtectedProviders = \(\) => \([\s\S]*<AuthProvider>[\s\S]*<ProtectedRoute/, "authentication and market providers must be mounted only for protected workspace routes");
assert.doesNotMatch(appRouter, /<PreferencesProvider>[\s\S]{0,120}<AuthProvider>/, "public routes must not be nested under the protected authentication provider");
assert.match(authContext, /token:\s*null/, "public settings must not receive a stale customer token that can redirect public routes");
for (const signal of ["bullish_pin_bar", "bearish_pin_bar", "bullish_engulfing", "bearish_engulfing", "bullish_zone_pin_bar", "bearish_zone_pin_bar", "pin_bar_signal", "engulfing_signal", "zone_pin_bar", "price_cross_sma20", "price_cross_sma50", "sma20_cross_sma50"]) {
  assert.match(screenerPage, new RegExp(signal), `screener signal is missing: ${signal}`);
}
assert.match(screenerPage, /row\.screener_match\?\.timeframe === timeframe/, "the screener UI must render the backend-proven matching candle instead of re-filtering the complete signal snapshot");
assert.match(screenerPage, /screener_match:[\s\S]*label:/, "strategy results must show the exact matched strategy label");
assert.match(customerMarketTable, /row\.screener_match\?\.label/, "the actionable company list must display the proven matching strategy");
assert.doesNotMatch(screenerPage, /\.filter\(\(row\) => row\.signals\?\.\[timeframe\]/, "the frontend must not discard valid backend screener results when full snapshots are omitted from transport");
assert.doesNotMatch(screenerPage, /function SignalEvidence|screener-evidence/, "strategy results must not be duplicated as non-actionable evidence cards");
assert.equal((screenerPage.match(/<MarketTable/g) || []).length, 1, "strategy results must have exactly one actionable company list");
assert.match(screenerPage, /detailsTimeframe=\{timeframe\}/, "strategy results must preserve the selected timeframe when opening a company");
assert.match(customerMarketTable, /companyDashboardPath\(row\.symbol, detailsTimeframe, marketCode\)/, "company links must carry explicit strategy timeframe and market identity");
assert.match(companyChart, /chart-shell-fullscreen/, "fullscreen must be scoped to the chart shell so the page itself does not require vertical scrolling");
assert.match(chartStyles, /\.chart-shell-fullscreen:not\(:fullscreen\)[^{]*\{[^}]*fixed/, "the iframe-safe fullscreen fallback must pin only the chart shell to the viewport");
assert.match(companyChart, /bullishColor/, "reversal candle rendering must use a distinct bullish color");
assert.match(companyChart, /bearishColor/, "reversal candle rendering must use a distinct bearish color");
assert.match(companyChart, /reversalPatternMap\(visibleOrderedCandles, \{ limitPerType: 3 \}\)/, "bar replay must calculate reversal patterns only from candles visible at the replay cursor");
assert.doesNotMatch(companyChart, /if \(!\["1d", "1wk", "1mo"\]\.includes\(interval\)\) return display/, "reversal coloring must not be restricted to daily, weekly and monthly intervals");
assert.match(companyPanel, /setState\(\(current\) => \(\{ \.\.\.current, loading: true, error: "" \}\)\)/, "company navigation must retain the mounted panel while the next company loads");
assert.match(companyPanel, /<CompanyChart[^>]*symbol=\{symbol\}/, "company details and chart requests must start in parallel for smooth navigation");
assert.doesNotMatch(companyPanel, /if \(state\.loading\) return/, "company navigation must not unmount the chart when cached content exists");
assert.match(companyPanel, /onMomentumChange=\{handleMomentumChange\}/, "the investor-zone card must consume the chart calculation for the displayed interval");
assert.doesNotMatch(companyPanel, /indicators\?\.\[0\]/, "company details must never treat an arbitrary first indicator record as investor zones");
assert.match(marketReadFunction, /momentum_indicator: momentumIndicator/, "company reads must expose a deterministic momentum snapshot instead of relying on entity order");
assert.match(marketReadFunction, /calculateMomentumZones\(/, "chart reads must calculate zone roles on the backend from canonical stored candles");
assert.match(marketReadFunction, /lookback_days/, "backend chart calculations must honor the bounded peak lookback setting");
assert.match(companyChart, /data\.momentum_indicator/, "the chart must consume the backend lifecycle result instead of becoming a second calculation authority");
assert.match(companyChart, /replayActive\s*\?\s*calculateMomentumSnapshot\(visibleOrderedCandles/, "historical replay must recompute zones only from candles already revealed to the user");
assert.match(companyChart, /backendMomentum \|\| fallbackMomentum \|\| calculatedMomentum/, "the chart must preserve investor zones by calculating from loaded verified candles when a persisted snapshot is delayed");
assert.match(companyChart, /replayActive\s*\?\s*replayMomentum\s*:\s*backendMomentum/, "the live customer chart must retain the protected backend investor-zone snapshot");
assert.match(companyChart, /zone\.stopVisible !== false/, "a reversed resistance must not retain the obsolete stop line");
assert.match(companyChart, /zone\.displayNameAr/, "chart labels must follow the current support or resistance role");
const sessionLink = await readFile(new URL("../src/components/SessionLink.jsx", import.meta.url), "utf8");
const previewAuthHandoff = await readFile(new URL("../src/lib/preview-auth-handoff.js", import.meta.url), "utf8");
const appParams = await readFile(new URL("../src/lib/app-params.js", import.meta.url), "utf8");
assert.match(sessionLink, /previewSafeHref/, "internal links must preserve the Base44 preview runtime context");
assert.match(sessionLink, /smartInvestorFrom/, "internal navigation must retain a deterministic in-app back target");
assert.match(previewAuthHandoff, /preview--|preview-sandbox--/, "preview context forwarding must be limited to Base44 preview hosts");
assert.match(previewAuthHandoff, /functions_version/, "new preview tabs must invoke the same Base44 backend version as the source preview");
assert.match(previewAuthHandoff, /server_url/, "new preview tabs must retain the same Base44 preview backend");
assert.match(previewAuthHandoff, /base44_data_env/, "new preview tabs must retain the same Base44 data environment");
assert.match(previewAuthHandoff, /rememberPreviewContext/, "new preview tabs must recover non-secret runtime context after client-side navigation");
assert.match(previewAuthHandoff, /url\.hostname === String\(hostname\)\.toLowerCase\(\)/, "preview server overrides must be restricted to the current Base44 preview origin");
const previewAwareBase44Client = await readFile(new URL("../src/api/base44Client.js", import.meta.url), "utf8");
assert.match(previewAwareBase44Client, /serverUrl,/, "the Base44 SDK must receive the validated preview backend URL");
assert.match(previewAuthHandoff, /browserHistory\.replaceState/, "preview credential fragments must be removed before the page continues");
assert.match(previewAuthHandoff, /storage\.setItem\("base44_access_token"/, "a Base44 preview tab must restore the authenticated SDK session before client creation");
assert.match(previewAuthHandoff, /storage\.setItem\("smart_investor_session_id"/, "a Base44 preview tab must restore the protected application session before route guards run");
assert.match(previewAuthHandoff, /expiry <= Date\.now\(\)/, "expired preview handoffs must fail closed");
assert.match(appParams, /persist:\s*false[\s\S]*useStored:\s*false/, "the one-shot clear_access_token flag must never be replayed from browser storage");
assert.match(appParams, /allowUrlValue:\s*isBase44PreviewHost\(window\.location\.hostname\)/, "published pages must ignore access_token values supplied through the URL");
const internalLinkFiles = [
  "../src/components/AuthLayout.jsx",
  "../src/components/SmartInvestorLayout.jsx",
  "../src/components/market/MarketTable.jsx",
  "../src/components/market/MarketTicker.jsx",
  "../src/components/AppErrorBoundary.jsx",
  "../src/lib/PageNotFound.jsx",
  "../src/pages/AdminDashboard.jsx",
  "../src/pages/Alerts.jsx",
  "../src/pages/CompanyDetails.jsx",
  "../src/pages/ForgotPassword.jsx",
  "../src/pages/Landing.jsx",
  "../src/pages/Login.jsx",
  "../src/pages/Profile.jsx",
  "../src/pages/Register.jsx",
  "../src/pages/ResetPassword.jsx",
  "../src/pages/ApplicationStatus.jsx",
  "../src/pages/Courses.jsx",
  "../src/pages/MarketApplications.jsx",
  "../src/pages/Watchlists.jsx",
];
for (const relativePath of internalLinkFiles) {
  const content = await readFile(new URL(relativePath, import.meta.url), "utf8");
  assert.doesNotMatch(content, /import\s*\{[^}]*\b(?:Link|NavLink)\b[^}]*\}\s*from\s*["']react-router-dom["']/, `${relativePath} must use the shared authenticated internal-link component`);
}
const landingPage = await readFile(new URL("../src/pages/Landing.jsx", import.meta.url), "utf8");
const sectorPanel = await readFile(new URL("../src/components/market/SectorPanel.jsx", import.meta.url), "utf8");
const customerPreferences = await readFile(new URL("../src/lib/preferences.jsx", import.meta.url), "utf8");
for (const requiredCopy of ["قراراتك الاستثمارية الأوضح", "Clearer investment decisions", "التنبيهات الذكية", "Smart alerts", "إنشاء حساب جديد", "Create a new account"]) assert.match(landingPage, new RegExp(requiredCopy), `landing copy must include ${requiredCopy} in its bilingual customer journey`);
for (const prohibitedClaim of ["بيانات لا تقبل الشك", "حية ومباشرة", "أجزاء من الثانية", "بدون أي أخطاء بشرية", "أعلى معايير الأمان"]) assert.doesNotMatch(landingPage, new RegExp(prohibitedClaim), `landing copy must not publish the unsupported claim ${prohibitedClaim}`);
assert.doesNotMatch(landingPage, /third-party-notices|إشعارات البرمجيات|Software notices/, "software notices must not appear in the customer interface");
assert.doesNotMatch(sectorPanel, /MarketTable/, "the sector panel must not duplicate the dashboard company list");
assert.match(customerPreferences, /market:\s*"الأسواق"/);
assert.match(customerPreferences, /market:\s*"Markets"/);
assert.match(customerPreferences, /alerts:\s*"التنبيهات الذكية"/);
assert.match(customerPreferences, /alerts:\s*"Smart alerts"/);
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
const operationsQualityFunction = await readFile(new URL("../base44/functions/operationsQuality/source.ts", import.meta.url), "utf8");
const dataQualityPage = await readFile(new URL("../src/pages/DataQualityAdmin.jsx", import.meta.url), "utf8");
const pageNavigation = await readFile(new URL("../src/components/PageNavigation.jsx", import.meta.url), "utf8");
const marketAccessSelect = await readFile(new URL("../src/components/MarketAccessSelect.jsx", import.meta.url), "utf8");
assert.match(pageNavigation, /smartInvestorFrom/, "protected pages must prefer the real in-app origin when returning");
assert.match(pageNavigation, /aria-current="page"/, "the page trail must expose the current location accessibly");
assert.match(pageNavigation, /<SessionLink to=\{backTarget\}/, "the return control must remain a real link that can open in a new tab");
assert.match(marketAccessSelect, /aria-current=\{active \? "page"/, "market links must expose their selected state accessibly");
assert.match(marketAccessSelect, /<SessionLink/, "permitted market choices must be real links instead of scripted buttons");
assert.doesNotMatch(marketAccessSelect, /<select/, "the primary market switcher must use direct market choices instead of a dropdown");
assert.match(operationsQualityFunction, /reconcile_recovered_issues/, "recovered quality issues must have a protected reconciliation path");
assert.match(operationsQualityFunction, /data\.quality\.manage/, "quality reconciliation must require its backend permission");
assert.match(operationsQualityFunction, /recoveredForMarket/, "quality reconciliation must stay inside the explicitly selected market");
assert.match(operationsQualityFunction, /market_data\.quality_reconciled/, "quality reconciliation must create an audit record");
assert.match(dataQualityPage, /recovered_pending_reconciliation/, "the owner must see active and recovered quality records separately");
assert.match(adminMarketDataFunction, /marketSignalRefresh/, "manual signal refresh must invoke the protected projection backend");
assert.match(adminMarketDataFunction, /refreshSaudiSignalProjection/, "manual Saudi signal refresh must use the bounded batch orchestrator");
assert.doesNotMatch(adminMarketDataFunction, /batch_count:\s*6/, "manual Saudi signal refresh must not bypass the deployed bounded orchestrator");
assert.match(adminMarketDataFunction, /historicalCandleBackfill/, "historical archive imports must run through the protected backend");
const historicalBackfillFunction = await readFile(new URL("../base44/functions/historicalCandleBackfill/entry.ts", import.meta.url), "utf8");
assert.match(historicalBackfillFunction, /YAHOO_PUBLIC_HISTORICAL_DAILY/, "historical import must have a no-secret daily archive source");
assert.match(historicalBackfillFunction, /includeAdjustedClose/, "historical import must request the complete daily chart payload");
assert.match(historicalBackfillFunction, /function historyProvider\(\) \{[\s\S]*?code: YAHOO_PROVIDER_CODE/, "historical backfill must keep its declared no-secret archive provider deterministic");
assert.match(historicalBackfillFunction, /history_already_complete/, "completed instrument archives must not be requested again");
assert.match(historicalBackfillFunction, /canonical_version:\s*options\.provider\.canonicalVersion/, "historical candles must be persisted as canonical yearly chunks");
assert.match(historicalBackfillFunction, /symbol === "TASI" \? "\^TASI\.SR"/, "TASI history must use the provider's index symbol instead of an equity suffix");
assert.match(historicalBackfillFunction, /ensureTasiInstrument/, "the one-time archive workflow must seed the canonical TASI instrument before importing candles");
const instrumentSearchInput = await readFile(new URL("../src/components/market/InstrumentSearchInput.jsx", import.meta.url), "utf8");
assert.match(instrumentSearchInput, /role="combobox"/, "instrument search must expose the WAI-ARIA combobox role");
assert.match(instrumentSearchInput, /aria-activedescendant/, "instrument search must preserve input focus while navigating suggestions");
for (const key of ["ArrowDown", "ArrowUp", "Enter", "Escape"]) {
  assert.match(instrumentSearchInput, new RegExp(`event\\.key === "${key}"`), `instrument autocomplete must support ${key}`);
}
const historicalCompanyChart = await readFile(new URL("../src/components/market/CompanyChart.jsx", import.meta.url), "utf8");
const chartTimeframes = await readFile(new URL("../src/lib/chart-timeframes.js", import.meta.url), "utf8");
assert.match(chartTimeframes, /max:\s*\{\s*ar:\s*"تاريخي"/, "the shared chart contract must expose a stored full-history range");
assert.match(historicalCompanyChart, /rangeOptions\.filter\(\(item\) => item\.intervals\.includes\(interval\)\)/, "the chart must show only ranges compatible with the selected interval");
assert.doesNotMatch(historicalCompanyChart, /if \(!option\.intervals\.includes\(interval\)\) setInterval\("1d"\)/, "range selection must not silently replace the user's chosen interval");
assert.match(historicalCompanyChart, /history_complete/, "the chart must disclose an incomplete historical archive");
assert.doesNotMatch(historicalCompanyChart, /التغطية الفعلية|Actual coverage/, "operational candle coverage metadata must not be exposed in the customer chart UI");
assert.match(historicalCompanyChart, /className="chart-type-popover chart-control-popover"/, "the candle-type chooser must use the shared collision-aware chart control layer");
assert.match(historicalCompanyChart, /chart-shell-fullscreen/, "fullscreen mode must target the chart shell instead of the entire company page");
assert.match(historicalCompanyChart, /createTextWatermark/, "the chart must render the instrument identity with the chart engine watermark primitive");
assert.match(historicalCompanyChart, /chartPreferences\.watermarkVisible/, "the company watermark must be user-hideable");
assert.match(historicalCompanyChart, /beginReplaySelection/, "bar replay must expose an explicit historical starting-point selection state");

const companyIntelligence = await readFile(new URL("../base44/functions/companyIntelligence/entry.ts", import.meta.url), "utf8");
assert.match(companyIntelligence, /SAUDI_EXCHANGE_COMPANY_FEED_URL/, "company intelligence must require a configured official feed");
assert.match(companyIntelligence, /status:\s*"skipped"/, "an unconfigured company feed must produce an explicit skipped run instead of failing the workflow");
assert.match(companyIntelligence, /preserved_existing_data:\s*true/, "an unconfigured company feed must preserve the last stored company data");
assert.match(companyIntelligence, /failure_code:\s*"OFFICIAL_COMPANY_FEED_NOT_CONFIGURED"/, "the skipped company refresh must retain a protected operational reason");
assert.doesNotMatch(companyIntelligence, /last_verified_at:\s*new Date\(\)\.toISOString\(\)/, "an unavailable company feed must not be marked as verified");
assert.match(companyIntelligence, /OFFICIAL_HOST/, "company intelligence must restrict provenance to the official host");
assert.match(companyIntelligence, /companies_received/, "company intelligence must use one batch payload");
assert.match(companyIntelligence, /CompanyAnnouncement/, "company intelligence must persist announcements");
assert.match(companyIntelligence, /MajorShareholder/, "company intelligence must persist major shareholders");
assert.match(companyIntelligence, /CompanyFinancial/, "company intelligence must persist financial statements");
assert.match(companyIntelligence, /CorporateAction/, "company intelligence must persist corporate actions");
assert.match(companyIntelligence, /"bootstrap"/, "company intelligence must support an owner-controlled initial full import");

const { drawingSegments, drawingFillPolygon, drawingHitTest, smoothCurveSegments } = await import(new URL("../src/components/market/chartDrawingModel.js", import.meta.url));
const { clampFloatingToolbarPosition, isDrawingUiEvent, placeFloatingToolbarPosition } = await import(new URL("../src/components/market/chartDrawingEvents.js", import.meta.url));
assert.equal(isDrawingUiEvent({ composedPath: () => [{ dataset: { drawingUi: "true" } }] }), true, "contextual toolbar pointer events must be recognized before chart capture handlers run");
assert.equal(isDrawingUiEvent({ composedPath: () => [{ dataset: {} }], target: { closest: () => null } }), false, "empty chart pointer events must remain available for drawing hit testing and chart gestures");
assert.deepEqual(clampFloatingToolbarPosition({ x: 900, y: 600, width: 260, height: 90, boundaryWidth: 800, boundaryHeight: 500 }), { x: 536, y: 406 }, "a persisted contextual toolbar position must be recovered inside the chart pane");
assert.deepEqual(clampFloatingToolbarPosition({ x: -40, y: -20, width: 260, height: 90, boundaryWidth: 800, boundaryHeight: 500 }), { x: 4, y: 4 }, "a contextual toolbar must not cross the leading or top chart edge");
assert.deepEqual(placeFloatingToolbarPosition({ x: 4, y: 96, width: 350, height: 90, boundaryWidth: 1500, boundaryHeight: 470, obstacles: [{ x: 4, y: 96, width: 430, height: 230 }] }), { x: 1146, y: 4 }, "a contextual toolbar must move away from an overlapping zone card");
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
const curvePoints = [{ x: 100, y: 220 }, { x: 220, y: 110 }, { x: 360, y: 210 }];
const curveSegments = smoothCurveSegments(curvePoints);
assert.ok(curveSegments.length > curvePoints.length, "curve hit testing must sample the rendered spline instead of its control polygon");
const curveMidpoint = curveSegments[Math.floor(curveSegments.length / 2)][1];
assert.equal(drawingHitTest("curve", curvePoints, curveMidpoint, modelWidth, modelHeight).hit, true, "the visible curve must be selectable between its control points");

const sharedSecurity = await readFile(new URL("../base44/shared/security.ts", import.meta.url), "utf8");
assert.match(sharedSecurity, /profile\?\.acquisition_source === "platform_owner_bootstrap"/, "owner access must be rooted in the server-managed platform owner marker");
assert.match(sharedSecurity, /profile\.tags\.includes\("owner"\)/, "owner access must require the server-managed owner tag");
assert.doesNotMatch(sharedSecurity, /if \(profile\.role !== "admin"/, "administrative login must never downgrade the owner to admin");
assert.match(sharedSecurity, /ActiveDeviceSession\.get\(token\.sessionId\)/, "device sessions must resolve only a versioned opaque bearer token");
assert.match(sharedSecurity, /fixedTimeEqual\(presentedHash, session\.session_hash\)/, "the session secret must be verified against its stored hash");
assert.doesNotMatch(sharedSecurity, /ActiveDeviceSession\.get\(sessionId\)/, "a raw entity identifier must never be accepted as a device session credential");
assert.match(sharedSecurity, /readJsonBody/, "backend functions must share bounded JSON request parsing");
const { createSessionToken, readJsonBody, requireActiveSession, sha256 } = await import(new URL("../base44/shared/security.ts", import.meta.url));
const sessionRecordId = "session_record_1234567890";
const sessionSecret = "12345678-1234-1234-1234-123456789012abcdef0123456789abcdef0123456789";
const activeSession = {
  id: sessionRecordId,
  customer_id: "customer-1",
  session_hash: await sha256(sessionSecret),
  revoked_at: null,
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  last_seen_at: new Date().toISOString(),
};
const sessionBase44 = {
  asServiceRole: {
    entities: {
      ActiveDeviceSession: {
        get: async (id) => id === sessionRecordId ? activeSession : null,
        update: async () => activeSession,
      },
    },
  },
};
const opaqueSessionToken = createSessionToken(sessionRecordId, sessionSecret);
assert.equal((await requireActiveSession(sessionBase44, { id: "customer-1" }, opaqueSessionToken)).id, sessionRecordId, "a valid opaque session bearer must be accepted");
await assert.rejects(() => requireActiveSession(sessionBase44, { id: "customer-1" }, sessionRecordId), /Active device session required/, "a raw entity ID must be rejected");
await assert.rejects(() => requireActiveSession(sessionBase44, { id: "customer-1" }, createSessionToken(sessionRecordId, `${sessionSecret}0`)), /Active device session required/, "a session token with the wrong secret must be rejected");
assert.deepEqual(await readJsonBody(new Request("https://example.test/function", { method: "POST", body: JSON.stringify({ action: "status" }) })), { action: "status" });
await assert.rejects(() => readJsonBody(new Request("https://example.test/function", { method: "GET" })), /Method not allowed/);
await assert.rejects(() => readJsonBody(new Request("https://example.test/function", { method: "POST", body: "[1,2,3]" })), /JSON object required/);
await assert.rejects(() => readJsonBody(new Request("https://example.test/function", { method: "POST", headers: { "content-length": "300000" }, body: "{}" })), /too large/);
const authLoginFunction = await readFile(new URL("../base44/functions/authLogin/entry.ts", import.meta.url), "utf8");
assert.match(authLoginFunction, /ensureAdministrativeProfile/, "the deployed authLogin function must use the centralized trusted-owner reconciliation");
assert.match(authLoginFunction, /shared\/security\.ts/, "the deployed authLogin function must not duplicate security policy");
assert.match(authLoginFunction, /createSessionToken\(session\.id, sessionSecret\)/, "login must return an opaque session bearer rather than an entity ID");
assert.match(authLoginFunction, /body\.action === "logout"[\s\S]*requireActiveSession[\s\S]*revoked_at/, "logout must revoke the verified server-side device session");
assert.match(loginPage, /base44\.auth\.setToken\(login\.access_token,true\)/, "Base44 authentication must persist across same-origin tabs");
assert.match(loginPage, /smart_investor_device_id/, "all tabs on one browser device must share a stable device identity");
for (const fileName of ["adminCustomers", "adminSubscriptions", "adminRoles", "identityContext", "operationsQuality", "adminMarketData"]) {
  const deployed = await readFile(new URL(`../base44/functions/${fileName}/entry.ts`, import.meta.url), "utf8");
  assert.match(deployed, /authorizationContext|requirePermission/, `${fileName} must enforce the centralized backend authorization context`);
}
const adminCustomersFunction = await readFile(new URL("../base44/functions/adminCustomers/entry.ts", import.meta.url), "utf8");
const customersAdminPage = await readFile(new URL("../src/pages/CustomersAdmin.jsx", import.meta.url), "utf8");
assert.match(adminCustomersFunction, /context\.role !== "owner"/, "customer operations must remain owner-only at the backend boundary");
assert.match(adminCustomersFunction, /customer\.role !== "user"/, "service, staff, and owner profiles must never be managed as customers");
assert.match(adminCustomersFunction, /filter\(\(customer\) => customer\.role === "user"\)/, "the customer directory must contain actual customer accounts only");
assert.match(adminCustomersFunction, /MarketAccessApplication\.filter\(\{ customer_id: customer\.id \}\)/, "the customer profile must load the customer's market applications");
assert.match(adminCustomersFunction, /customer\.message_sent/, "owner messages to customers must be audited");
assert.match(adminCustomersFunction, /recipient_auth_user_id: customer\.auth_user_id/, "owner messages must be delivered to the selected customer's inbox identity");
assert.match(customersAdminPage, /wa\.me/, "the owner customer profile must provide direct WhatsApp contact");
assert.match(customersAdminPage, /revoke_sessions/, "the customer action grid must expose the working device sign-out action");
assert.match(customersAdminPage, /\/admin\/access\?customer=/, "the customer profile must link to market access administration");
assert.match(customersAdminPage, /\/admin\/subscriptions\?customer=/, "the customer profile must link to subscription administration");
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
assert.match(legacySchemaBridge, /requireTrustedOwner/, "the additive legacy bridge must be restricted to the centralized trusted owner policy");
assert.doesNotMatch(legacySchemaBridge, /PLATFORM_OWNER_USER_ID/, "owner authorization must not depend on a hard-coded user identifier");
assert.doesNotMatch(legacySchemaBridge, /\.delete\(|deleteMany|updateMany/, "the legacy bridge must never delete or bulk-update production records");
assert.match(legacySchemaBridge, /Math\.min\(100,/, "legacy migration batches must be bounded");
assert.match(legacySchemaBridge, /QuoteObservation:\s*"quote-observation"/, "the schema audit must cover every canonical/legacy entity pair");
assert.match(legacySchemaBridge, /official_exists/, "the schema audit must distinguish missing official schemas from empty schemas");
assert.match(legacySchemaBridge, /count_capped/, "the schema audit must disclose bounded-count results");

const boundedBodyFunctions = [
  "adminCustomers", "adminMarketData", "adminRoles", "adminSubscriptions", "alertEvaluation",
  "authLogin", "authRegistration", "chartDrawings", "companyIntelligence", "customerSelfService",
  "historicalCandleBackfill", "identityContext", "indicatorEngine", "legacySchemaBridge", "marketIngestion",
  "marketRead", "marketSignalRefresh", "marketSignalProjectionWorker", "operationsQuality", "screeningWatchlists", "telegramDelivery", "usBenchmarksMarketIngestion", "usBenchmarksSignalRefresh", "usOptionsCompanyIntelligence", "whatsappDelivery",
];
for (const functionName of boundedBodyFunctions) {
  const functionSource = await readFile(new URL(`../base44/functions/${functionName}/entry.ts`, import.meta.url), "utf8");
  assert.match(functionSource, /readJsonBody/, `${functionName} must reject non-POST, malformed, and oversized JSON bodies`);
}
const indexHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
assert.match(indexHtml, /Content-Security-Policy/, "the frontend must ship a restrictive CSP even when the hosting layer omits the header");
assert.match(indexHtml, /object-src 'none'/, "the CSP must disable plugin object execution");
assert.doesNotMatch(indexHtml, /script-src[^;]*'unsafe-inline'/, "the frontend CSP must not allow arbitrary inline script execution");
const viteSecurityConfig = await readFile(new URL("../vite.config.js", import.meta.url), "utf8");
assert.match(viteSecurityConfig, /cspInlineScriptHashes/, "the build must hash Base44's injected inline script instead of weakening script-src");
assert.match(viteSecurityConfig, /createHash\('sha256'\)/, "inline-script CSP allowances must be content-bound SHA-256 hashes");
assert.match(viteSecurityConfig, /analyticsTracker:\s*false/, "the deploy must not inject Base44's post-processed inline tracker under a strict CSP");
const packageManifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.equal(packageManifest.dependencies["react-router-dom"], "7.18.2");
assert.equal(packageManifest.overrides.nanoid, "3.3.18", "the patched nanoid release must remain pinned");
assert.equal(packageManifest.devDependencies.postcss, "8.5.23");
assert.match(packageManifest.devDependencies["brace-expansion"], /\/v1\.1\.18\.tar\.gz$/, "the patched brace-expansion release must use a deployable HTTPS artifact");
assert.equal(packageManifest.overrides["brace-expansion"], "$brace-expansion");
assert.equal(packageManifest.overrides["socket.io-parser"], "4.2.7");

const { calculateRsiSeries, calculateMomentumSnapshot, companyDashboardPath, normalizeMomentum, selectMomentumSnapshot } = await import(new URL("../src/lib/market.js", import.meta.url));
const { chartPreferencePayload, sanitizeChartPreferences } = await import(new URL("../src/lib/chart-visuals.js", import.meta.url));
const { CHART_REPLAY_SPEEDS, nextReplayCursor, replayCandles, replayStartIndex } = await import(new URL("../src/lib/chart-replay.js", import.meta.url));
assert.equal(companyDashboardPath("1010", "1wk"), "/dashboard?company=1010&timeframe=1wk", "strategy links must preserve weekly context");
assert.equal(companyDashboardPath("1010", "invalid"), "/dashboard?company=1010", "invalid chart intervals must not enter company URLs");
assert.equal(companyDashboardPath("NVDA", "1d", "US_OPTIONS"), "/dashboard?company=NVDA&timeframe=1d&market=US_OPTIONS", "cross-tab company links must preserve the active market");
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
assert.ok(momentumSnapshot?.zones?.length === 8, "momentum port must return the complete daily-to-ten-year digital ladder");
assert.ok(momentumSnapshot.zones.every((zone) => zone.top > zone.bottom && zone.bottom > zone.stop), "momentum zone price ordering must remain strict");
assert.deepEqual(momentumSnapshot.zones.map((zone) => zone.displayNameAr), ["قاع رقمي يومي", "قاع رقمي أسبوعي", "قاع رقمي شهري", "قاع رقمي ربع سنوي", "قاع رقمي سنوي", "قاع رقمي لثلاث سنوات", "قاع رقمي لخمس سنوات", "قاع رقمي لعشر سنوات"], "frontend labels must mirror the backend digital ladder");
assert.ok(momentumSnapshot.zones.every((zone) => zone.color === "#22c55e"), "unbroken digital bottoms must default to green in the dark theme");
const upgradedLegacyMomentum = normalizeMomentum({
  zones: momentumSnapshot.zones.slice(0, 5),
}, "light");
assert.equal(upgradedLegacyMomentum.zones.length, 8, "legacy five-zone snapshots must be upgraded for every chart and zone card");
assert.deepEqual(upgradedLegacyMomentum.zones.slice(5).map((zone) => zone.active), [false, false, false], "new deep zones must remain waiting until their sequential activation conditions are proven");
assert.deepEqual(upgradedLegacyMomentum.zones.slice(0, 2).map((zone) => zone.displayNameAr), ["قاع رقمي يومي", "قاع رقمي أسبوعي"], "legacy snapshot labels must migrate to the digital naming model at read time");
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
