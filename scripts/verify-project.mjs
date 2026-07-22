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
assert.match(ingestion, /upsertMany\(base44,\s*'Instrument'/);
assert.match(ingestion, /instrument\.symbol\}\.SR/);
assert.match(ingestion, /Base44-Service-Authorization/, "scheduled ingestion must require Base44 service authorization");

const schedule = JSON.parse(await readFile(new URL("../base44/functions/marketIngestion/function.jsonc", import.meta.url), "utf8"));
assert.equal(schedule.name, "marketIngestion");
assert.equal(schedule.automations.length, 2);
assert.deepEqual(schedule.automations.map((item) => item.cron_expression), ["*/15 7-12 * * 0-4", "0 13 * * 0-4"]);
assert.ok(schedule.automations.every((item) => item.function_args?.batch_size === 270));

const entityDirectory = fileURLToPath(new URL("../base44/entities/", import.meta.url));
const entityFiles = (await readdir(entityDirectory)).filter((name) => name.endsWith(".jsonc"));
assert.equal(entityFiles.length, 31, "all 31 custom Base44 entity schemas must be present");
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
for (const required of ["CustomerProfile", "Instrument", "QuoteLatest", "CandleChunk", "ActiveDeviceSession", "Subscription"]) {
  assert.ok(entityNames.has(required), `required entity is missing: ${required}`);
}
const customerProfile = JSON.parse(await readFile(new URL("../base44/entities/customer-profile.jsonc", import.meta.url), "utf8"));
assert.ok(!customerProfile.required.includes("phone_e164"), "admin migration must not fabricate a phone number");
assert.ok(!customerProfile.required.includes("country_code"), "admin migration must not fabricate a country");

const functionDirectory = fileURLToPath(new URL("../base44/functions/", import.meta.url));
const functionNames = (await readdir(functionDirectory, { withFileTypes: true })).filter((item) => item.isDirectory()).map((item) => item.name);
assert.equal(functionNames.length, 14, "all 14 backend functions must be present");
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
for (const entity of referencedEntities) assert.ok(entityNames.has(entity), `backend references missing entity schema: ${entity}`);

const marketService = await readFile(new URL("../src/services/marketService.js", import.meta.url), "utf8");
assert.match(marketService, /name_ar:\s*company\.nameAr/);
assert.match(marketService, /name_en:\s*company\.nameEn/);
assert.doesNotMatch(marketService, /Math\.random|faker|mockCompany/i);

const companyChart = await readFile(new URL("../src/components/market/CompanyChart.jsx", import.meta.url), "utf8");
assert.match(companyChart, /showVolume/);
assert.match(companyChart, /showMomentum/);
assert.match(companyChart, /showRsi/);
assert.match(companyChart, /calculateRsiSeries/);
assert.match(companyChart, /calculateMomentumSnapshot/);
assert.match(companyChart, /rsiSettings\.lineColor/);
assert.match(companyChart, /momentumSettings\.zones/);

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
