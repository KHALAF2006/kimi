import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const catalogPath = new URL("../base44/data/official-main-market-catalog-2026-07-21.json", import.meta.url);
const catalogBytes = await readFile(catalogPath);
const catalog = JSON.parse(catalogBytes.toString("utf8"));
const hash = createHash("sha256").update(catalogBytes).digest("hex").toUpperCase();

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

const schedule = await readFile(new URL("../base44/workflows/MarketIngestionSchedule.jsonc", import.meta.url), "utf8");
assert.match(schedule, /\*\/15 10-16 \* \* 0-4/);
assert.match(schedule, /"batch_size"\s*:\s*270/);

const entityDirectory = fileURLToPath(new URL("../base44/entities/", import.meta.url));
const entityFiles = (await readdir(entityDirectory)).filter((name) => name.endsWith(".jsonc"));
assert.equal(entityFiles.length, 32, "all 32 Base44 entity schemas must be present");
for (const name of entityFiles) {
  assert.match(name, /^[a-z0-9]+(?:-[a-z0-9]+)*\.jsonc$/, `entity filename is not kebab-case: ${name}`);
  const source = await readFile(join(entityDirectory, name), "utf8");
  for (const operation of ["create", "read", "update", "delete"]) {
    assert.match(source, new RegExp(`"${operation}"\\s*:\\s*false`), `${name} must deny browser ${operation}`);
  }
}

const marketService = await readFile(new URL("../src/services/marketService.js", import.meta.url), "utf8");
assert.match(marketService, /name_ar:\s*company\.nameAr/);
assert.match(marketService, /name_en:\s*company\.nameEn/);
assert.doesNotMatch(marketService, /Math\.random|faker|mockCompany/i);

console.log(JSON.stringify({
  status: "pass",
  companies: catalog.companies.length,
  uniqueSymbols: 270,
  exactCatalogSha256: hash,
  entities: entityFiles.length,
  selectedCompany: { symbol: "4210", nameAr: company4210.nameAr, nameEn: company4210.nameEn },
}, null, 2));
