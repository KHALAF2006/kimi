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
assert.match(ingestion, /official-main-market-catalog-2026-07-21\.json/);
assert.match(ingestion, /name_ar:\s*row\.nameAr/);
assert.match(ingestion, /name_en:\s*row\.nameEn/);
assert.match(ingestion, /upsertMany\(base44,\s*["']Instrument["']/);
assert.match(ingestion, /instrument\.symbol\}\.SR/);
assert.match(ingestion, /Base44-Service-Authorization/, "scheduled ingestion must require Base44 service authorization");
assert.match(ingestion, /MAIN_MARKET_SYMBOLS\.has\(row\.symbol\)/, "ingestion must exclude records outside the verified main-market catalog");

const marketRead = await readFile(new URL("../base44/functions/marketRead/entry.ts", import.meta.url), "utf8");
assert.match(marketRead, /official-main-market-catalog-2026-07-21\.json/, "market reads must use the verified main-market allowlist");
assert.match(marketRead, /MAIN_MARKET_SYMBOLS\.has\(item\.symbol\)/, "market reads must exclude non-main-market records");
assert.match(marketRead, /optionalRows/, "optional source metadata must not take down the market catalog");
assert.match(marketRead, /Main-market catalog mismatch/, "an incomplete verified catalog must fail closed");

const schedule = JSON.parse(await readFile(new URL("../base44/functions/marketIngestion/function.jsonc", import.meta.url), "utf8"));
assert.equal(schedule.name, "marketIngestion");
const marketQuarterHour = JSON.parse(await readFile(new URL("../base44/workflows/MarketQuarterHour.jsonc", import.meta.url), "utf8"));
const marketClose = JSON.parse(await readFile(new URL("../base44/workflows/MarketCloseReconciliation.jsonc", import.meta.url), "utf8"));
assert.deepEqual([marketQuarterHour.trigger.config.cron_expression, marketClose.trigger.config.cron_expression], ["*/15 10-15 * * 0-4", "0 16 * * 0-4"]);
assert.equal(marketQuarterHour.trigger.config.timezone, "Asia/Riyadh");
assert.equal(marketClose.trigger.config.timezone, "Asia/Riyadh");
assert.equal(marketQuarterHour.definition.do[0].refresh_market.with.args.batch_size, 270);
assert.equal(marketClose.definition.do[0].reconcile_close.with.args.batch_size, 270);

const entityDirectory = fileURLToPath(new URL("../base44/entities/", import.meta.url));
const entityFiles = (await readdir(entityDirectory)).filter((name) => /^[a-z0-9]+(?:-[a-z0-9]+)*\.jsonc$/.test(name));
assert.equal(entityFiles.length, 32, "all 32 canonical Base44 entity schemas must be present");
const entityNames = new Set();
for (const name of entityFiles) {
  assert.match(name, /^[a-z0-9]+(?:-[a-z0-9]+)*\.jsonc$/, `entity filename is not kebab-case: ${name}`);
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
for (const required of ["CustomerProfile", "Instrument", "QuoteLatest", "CandleChunk", "ActiveDeviceSession", "Subscription", "ChartDrawing"]) {
  assert.ok(entityNamesLower.has(required.toLowerCase()), `required entity is missing: ${required}`);
}
const customerProfile = JSON.parse(await readFile(new URL("../base44/entities/customer-profile.jsonc", import.meta.url), "utf8"));
assert.ok(!customerProfile.required.includes("phone_e164"), "admin migration must not fabricate a phone number");
assert.ok(!customerProfile.required.includes("country_code"), "admin migration must not fabricate a country");

const functionDirectory = fileURLToPath(new URL("../base44/functions/", import.meta.url));
const functionNames = (await readdir(functionDirectory, { withFileTypes: true })).filter((item) => item.isDirectory()).map((item) => item.name);
assert.equal(functionNames.length, 15, "all 15 backend functions must be present");
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

const base44Client = await readFile(new URL("../src/api/base44Client.js", import.meta.url), "utf8");
assert.match(base44Client, /localBrowserHosts\.has\(window\.location\.hostname\)/, "the Base44 SDK stub must be limited to localhost browsers");
assert.doesNotMatch(base44Client, /isLocalReferencePreview\s*=\s*import\.meta\.env\.DEV/, "Base44 editor preview must initialize the real Base44 SDK");

const protectedRoute = await readFile(new URL("../src/components/ProtectedRoute.jsx", import.meta.url), "utf8");
assert.match(protectedRoute, /!isReferencePreview\(\)\s*&&\s*!localStorage\.getItem\(['"]kmy_session_id['"]\)/, "protected market routes must require the verified KMY device session");

const loginPage = await readFile(new URL("../src/pages/Login.jsx", import.meta.url), "utf8");
assert.match(loginPage, /isAuthenticated\?t\.sendCode:t\.next/, "an already authenticated Base44 user must continue through KMY email OTP");
assert.match(loginPage, /base44\.functions\.invoke\(['"]authLogin['"],\{action:['"]start['"]\}\)/, "login must start the server-side OTP challenge");

const companyChart = await readFile(new URL("../src/components/market/CompanyChart.jsx", import.meta.url), "utf8");
assert.match(companyChart, /showVolume/);
assert.match(companyChart, /showMomentum/);
assert.match(companyChart, /showRsi/);
assert.match(companyChart, /calculateRsiSeries/);
assert.match(companyChart, /calculateMomentumSnapshot/);
assert.match(companyChart, /rsiSettings\.lineColor/);
assert.match(companyChart, /momentumSettings\.zones/);
assert.match(companyChart, /className=\{["']ohlc-strip ["'] \+ \(hovered \? ["']["'] : ["']invisible["']\)\}/, "the OHLC strip must reserve its height so pane hover cannot shake the chart");
assert.match(companyChart, /interactionEvents = \[[^\]]*["']wheel["'][^\]]*["']pointermove["']/, "zone geometry must follow price-scale wheel and drag interactions");
assert.match(companyChart, /sameZoneGeometry\(current, zones\)/, "zone synchronization must avoid redundant React layout updates");
assert.match(companyChart, /showMomentumCard/, "momentum price card must have its own visibility state");
assert.doesNotMatch(companyChart, /showMomentum\s*&&\s*showMomentumCard/, "momentum price card must not depend on the zone overlay visibility");
assert.match(companyChart, /ChartDrawingTools/, "the verified chart must mount the drawing layer");

const chartDrawingsFunction = await readFile(new URL("../base44/functions/chartDrawings/entry.ts", import.meta.url), "utf8");
assert.match(chartDrawingsFunction, /requireActiveSession\(base44, profile, body\.session_id\)/, "drawing storage must require the verified KMY session");
assert.match(chartDrawingsFunction, /row\.customer_id !== profile\.id/, "drawing mutations must enforce object ownership");
assert.match(chartDrawingsFunction, /DRAWING_ALERT_DELETE_CONFIRMATION_REQUIRED/, "a drawing with an alert must not be deleted without explicit confirmation");
assert.match(chartDrawingsFunction, /"trend_line", "ray", "horizontal_line"/, "drawing alerts must be restricted to supported line geometry");

const drawingTools = await readFile(new URL("../src/components/market/ChartDrawingTools.jsx", import.meta.url), "utf8");
for (const tool of ["trend_line", "ray", "horizontal_line", "vertical_line", "arrow", "rectangle", "parallel_channel", "polyline", "curve", "brush", "measure"]) {
  assert.match(drawingTools, new RegExp(tool), `drawing tool is missing: ${tool}`);
}
assert.match(drawingTools, /deleteChartDrawing\(symbol, selected, force\)/, "drawing deletion must use the protected backend service");

const { drawingSegments, drawingHitTest } = await import(new URL("../src/components/market/chartDrawingModel.js", import.meta.url));
const modelWidth = 800;
const modelHeight = 500;
const horizontalPoints = [{ x: 120, y: 220 }];
const rectanglePoints = [{ x: 100, y: 100 }, { x: 300, y: 260 }];
const channelPoints = [{ x: 80, y: 120 }, { x: 330, y: 170 }, { x: 110, y: 240 }];
assert.equal(drawingSegments("horizontal_line", horizontalPoints, modelWidth, modelHeight).length, 1, "horizontal line geometry must be deterministic");
assert.equal(drawingSegments("rectangle", rectanglePoints, modelWidth, modelHeight).length, 4, "rectangle must retain all four anchored sides");
assert.equal(drawingSegments("parallel_channel", channelPoints, modelWidth, modelHeight).length, 2, "parallel channel must retain both parallel boundaries");
assert.equal(drawingHitTest("horizontal_line", horizontalPoints, { x: 620, y: 222 }, modelWidth, modelHeight).hit, true, "extended horizontal line must remain selectable after chart navigation");
assert.equal(drawingHitTest("rectangle", rectanglePoints, { x: 180, y: 101 }, modelWidth, modelHeight).hit, true, "rectangle border must be selectable without filling the price pane");

const sharedSecurity = await readFile(new URL("../base44/shared/security.ts", import.meta.url), "utf8");
assert.match(sharedSecurity, /profile\?\.acquisition_source === "platform_owner_bootstrap"/, "owner access must be rooted in the server-managed platform owner marker");
assert.match(sharedSecurity, /profile\.tags\.includes\("owner"\)/, "owner access must require the server-managed owner tag");
assert.doesNotMatch(sharedSecurity, /if \(profile\.role !== "admin"/, "administrative login must never downgrade the owner to admin");
const authLoginFunction = await readFile(new URL("../base44/functions/authLogin/entry.ts", import.meta.url), "utf8");
assert.match(authLoginFunction, /acquisition_source === "platform_owner_bootstrap"/, "the deployed authLogin function must reconcile the trusted owner");
assert.match(authLoginFunction, /role:\s*owner \? "owner" : "admin"/, "the deployed authLogin function must not downgrade the owner");
assert.match(loginPage, /base44\.auth\.setToken\(login\.access_token,true\)/, "Base44 authentication must persist across same-origin tabs");
assert.match(loginPage, /kmy_device_id/, "all tabs on one browser device must share a stable device identity");
for (const fileName of ["adminCustomers", "adminSubscriptions"]) {
  const deployed = await readFile(new URL(`../base44/functions/${fileName}/entry.ts`, import.meta.url), "utf8");
  assert.match(deployed, /const role = resolvedRole\(user, profile\)/, `${fileName} must enforce the trusted owner marker on the backend`);
}

const { calculateRsiSeries, calculateMomentumSnapshot } = await import(new URL("../src/lib/market.js", import.meta.url));
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
assert.ok(momentumSnapshot?.zones?.length === 5, "momentum port must return all five Pine zones");
assert.ok(momentumSnapshot.zones.every((zone) => zone.top > zone.bottom && zone.bottom > zone.stop), "momentum zone price ordering must remain strict");

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
