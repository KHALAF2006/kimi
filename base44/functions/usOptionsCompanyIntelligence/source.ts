import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { readJsonBody, replyError, requirePermission, requireTrustedOwner } from "../../shared/security.ts";
import { US_OPTIONS_CATALOG, US_OPTIONS_MARKET_CODE, US_OPTIONS_SYMBOLS } from "../../shared/us-options-catalog.ts";
import {
  normalizeNasdaqHolders,
  normalizeSecFilings,
  normalizeSecFinancials,
  normalizeSecProfile,
  normalizeSecTickerMap,
  normalizeYahooActions,
} from "../../shared/us-company-intelligence.ts";

const SEC_SOURCE = "OFFICIAL_SEC_EDGAR_US_OPTIONS";
const NASDAQ_SOURCE = "REFERENCE_NASDAQ_US_COMPANY";
const YAHOO_ACTIONS_SOURCE = "REFERENCE_YAHOO_US_ACTIONS";
const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 20;
const SEC_USER_AGENT = "Mozilla/5.0 KMYMarketPlatform/1.0";
const SEC_CONTACT = "khalaf2006@users.noreply.github.com";

function rows(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (Array.isArray(value?.data)) return value.data.filter(Boolean);
  if (Array.isArray(value?.items)) return value.items.filter(Boolean);
  return [];
}

function keyFor(row, fields) {
  return fields.map((field) => String(row[field] ?? "")).join("|");
}

async function upsertMany(base44, entity, incoming, fields) {
  const unique = [...new Map(incoming.map((row) => [keyFor(row, fields), row])).values()];
  if (!unique.length) return { created: 0, updated: 0 };
  const instrumentIds = [...new Set(unique.map((row) => row.instrument_id).filter(Boolean))];
  const existing = instrumentIds.length
    ? rows(await base44.asServiceRole.entities[entity].filter({ instrument_id: { $in: instrumentIds } }, "-updated_date", 5e3))
    : rows(await base44.asServiceRole.entities[entity].list("-updated_date", 5e3));
  const byKey = new Map(existing.map((row) => [keyFor(row, fields), row]));
  const creates = unique.filter((row) => !byKey.has(keyFor(row, fields)));
  const updates = unique.filter((row) => byKey.has(keyFor(row, fields))).map((row) => ({ id: byKey.get(keyFor(row, fields)).id, ...row }));
  if (creates.length) await base44.asServiceRole.entities[entity].bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities[entity].bulkUpdate(updates);
  return { created: creates.length, updated: updates.length };
}

async function fetchJson(url, { sec = false, attempts = 2 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12e3);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: sec
          ? { Accept: "application/json", "User-Agent": SEC_USER_AGENT, From: SEC_CONTACT, "Accept-Encoding": "gzip, deflate" }
          : { Accept: "application/json, text/plain, */*", "User-Agent": "Mozilla/5.0 KMY-US-Company-Intelligence/1.0", Origin: "https://www.nasdaq.com", Referer: "https://www.nasdaq.com/" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error(`provider_http_${response.status}`), { code: `HTTP_${response.status}` });
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error("provider_request_failed");
}

async function ensureSource(base44, code, data) {
  const existing = rows(await base44.asServiceRole.entities.DataSource.filter({ code }))[0];
  const payload = { ...data, market_code: US_OPTIONS_MARKET_CODE, last_verified_at: new Date().toISOString() };
  return existing
    ? await base44.asServiceRole.entities.DataSource.update(existing.id, payload)
    : await base44.asServiceRole.entities.DataSource.create({ code, ...payload });
}

function catalogInstrument(company) {
  return {
    symbol: company.symbol, market_code: US_OPTIONS_MARKET_CODE, instrument_code: company.symbol,
    instrument_type: "equity", composite_key: `${US_OPTIONS_MARKET_CODE}:${company.symbol}`,
    name_ar: company.nameAr, name_en: company.nameEn, sector_ar: company.sectorAr, sector_en: company.sectorEn,
    industry_en: company.industryEn, market: US_OPTIONS_CATALOG.market.name_en, currency: "USD",
    exchange_code: "US", country_code: "US", issuer_country: company.country, ipo_year: company.ipoYear,
    optionable: true, catalog_as_of: US_OPTIONS_CATALOG.source.asOf, status: "active", official_url: company.nasdaqUrl,
  };
}

async function ensureCatalog(base44) {
  const existing = rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_OPTIONS_MARKET_CODE }));
  const byKey = new Map(existing.map((row) => [row.composite_key, row]));
  const creates = [];
  const updates = [];
  for (const company of US_OPTIONS_CATALOG.companies) {
    const payload = catalogInstrument(company);
    const current = byKey.get(payload.composite_key);
    if (current) updates.push({ id: current.id, ...payload });
    else creates.push(payload);
  }
  if (creates.length) await base44.asServiceRole.entities.Instrument.bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities.Instrument.bulkUpdate(updates);
  return rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_OPTIONS_MARKET_CODE }))
    .filter((row) => US_OPTIONS_SYMBOLS.has(row.symbol) && row.status !== "delisted");
}

async function fetchCompanyPayloads(symbol, cik) {
  const cikValue = String(cik || "").padStart(10, "0");
  const tasks = {
    holders: fetchJson(`https://api.nasdaq.com/api/company/${encodeURIComponent(symbol)}/institutional-holdings?limit=10&type=TOTAL&sortColumn=marketValue&sortOrder=DESC`),
    actions: fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=10y&interval=1d&events=div%2Csplits&includePrePost=false`),
    submissions: cik ? fetchJson(`https://data.sec.gov/submissions/CIK${cikValue}.json`, { sec: true }) : Promise.resolve(null),
    companyFacts: cik ? fetchJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cikValue}.json`, { sec: true }) : Promise.resolve(null),
  };
  const settled = await Promise.all(Object.entries(tasks).map(async ([key, promise]) => {
    try { return [key, await promise, null]; } catch (error) { return [key, null, String(error?.code || error?.message || "fetch_failed")]; }
  }));
  return Object.fromEntries(settled.map(([key, value, error]) => [key, { value, error }]));
}

async function syncCompany(base44, instrument, cikRecord, sources, nowIso) {
  const payloads = await fetchCompanyPayloads(instrument.symbol, cikRecord?.cik);
  const failures = Object.entries(payloads).filter(([, result]) => result.error).map(([key, result]) => `${key}:${result.error}`);
  let profile = {};
  let financials = [];
  let announcements = [];
  if (payloads.submissions.value) {
    profile = normalizeSecProfile(payloads.submissions.value, instrument, nowIso);
    announcements = normalizeSecFilings(payloads.submissions.value, instrument, sources.sec.id, nowIso);
  }
  if (payloads.companyFacts.value && payloads.submissions.value) {
    financials = normalizeSecFinancials(payloads.companyFacts.value, payloads.submissions.value, instrument, sources.sec.id, nowIso);
  }
  const actions = payloads.actions.value ? normalizeYahooActions(payloads.actions.value, instrument, sources.yahoo.id, nowIso) : [];
  const shareholders = payloads.holders.value ? normalizeNasdaqHolders(payloads.holders.value, instrument, sources.nasdaq.id, nowIso) : [];
  const results = {
    financials: await upsertMany(base44, "CompanyFinancial", financials, ["instrument_id", "period", "statement_type"]),
    announcements: await upsertMany(base44, "CompanyAnnouncement", announcements, ["instrument_id", "announcement_id"]),
    actions: await upsertMany(base44, "CorporateAction", actions, ["instrument_id", "event_type", "ex_date"]),
    shareholders: await upsertMany(base44, "MajorShareholder", shareholders, ["instrument_id", "shareholder_key"]),
  };
  const complete = failures.length === 0
    && Boolean(payloads.submissions.value && payloads.companyFacts.value && financials.length && announcements.length);
  await base44.asServiceRole.entities.Instrument.update(instrument.id, {
    ...profile,
    ...(cikRecord?.cik ? { cik: cikRecord.cik, legal_name_en: profile.legal_name_en || cikRecord.title } : {}),
    company_data_as_of: nowIso,
    company_data_status: complete ? "complete" : failures.length === 4 ? "failed" : "partial",
  });
  return {
    symbol: instrument.symbol,
    status: complete ? "complete" : "partial",
    sections: { financials: financials.length, announcements: announcements.length, actions: actions.length, shareholders: shareholders.length },
    failures,
    results,
  };
}

Deno.serve(async (req) => {
  let base44;
  let run = null;
  try {
    base44 = createClientFromRequest(req);
    const requestBody = await readJsonBody(req);
    const body = { ...requestBody, ...(requestBody.args || {}) };
    if (body.session_id) await requirePermission(base44, body.session_id, "data.ingestion.run");
    else await requireTrustedOwner(base44);
    if (String(body.market_code || US_OPTIONS_MARKET_CODE) !== US_OPTIONS_MARKET_CODE) throw Object.assign(new Error("Wrong market for U.S. company intelligence"), { status: 400, code: "MARKET_MISMATCH" });

    const nowIso = new Date().toISOString();
    const instruments = await ensureCatalog(base44);
    if (instruments.length !== US_OPTIONS_CATALOG.companies.length) throw Object.assign(new Error(`U.S. options catalog incomplete: ${instruments.length}/${US_OPTIONS_CATALOG.companies.length}`), { status: 503, code: "US_OPTIONS_CATALOG_INCOMPLETE" });
    const sources = {
      sec: await ensureSource(base44, SEC_SOURCE, { name: "U.S. SEC EDGAR submissions and XBRL company facts", source_type: "official", license_status: "approved", quote_mode: "end_of_day", delay_seconds: 0, public_enabled: true, base_url: "https://data.sec.gov" }),
      nasdaq: await ensureSource(base44, NASDAQ_SOURCE, { name: "Nasdaq company and institutional holdings reference", source_type: "reference", license_status: "restricted", quote_mode: "end_of_day", delay_seconds: 0, public_enabled: false, base_url: "https://api.nasdaq.com" }),
      yahoo: await ensureSource(base44, YAHOO_ACTIONS_SOURCE, { name: "Yahoo corporate action history reference adapter", source_type: "reference", license_status: "restricted", quote_mode: "end_of_day", delay_seconds: 0, public_enabled: false, base_url: "https://query1.finance.yahoo.com" }),
    };
    const tickerMap = normalizeSecTickerMap(await fetchJson("https://www.sec.gov/files/company_tickers.json", { sec: true }));
    const requested = Array.isArray(body.symbols) ? new Set(body.symbols.map((value) => String(value).toUpperCase())) : null;
    const batchSize = Math.min(MAX_BATCH_SIZE, Math.max(1, Number(body.batch_size) || DEFAULT_BATCH_SIZE));
    const selected = instruments
      .filter((instrument) => !requested || requested.has(instrument.symbol))
      .sort((a, b) => String(a.company_data_as_of || "").localeCompare(String(b.company_data_as_of || "")) || a.symbol.localeCompare(b.symbol))
      .slice(0, batchSize);
    run = await base44.asServiceRole.entities.IngestionRun.create({
      run_type: "company_intelligence", market_code: US_OPTIONS_MARKET_CODE,
      slot_key: `${US_OPTIONS_MARKET_CODE}:company:${Date.now()}`, slot_kind: "company_intelligence",
      scheduled_for: nowIso, lease_expires_at: new Date(Date.now() + 4 * 60e3).toISOString(), started_at: nowIso,
      total_records: selected.length, success_count: 0, failed_count: 0, status: "running", source_id: sources.sec.id,
      notes: "Official SEC filings and financials plus source-backed corporate actions and institutional ownership",
    });
    const results = [];
    let cursor = 0;
    async function worker() {
      while (cursor < selected.length) {
        const instrument = selected[cursor++];
        try { results.push(await syncCompany(base44, instrument, tickerMap.get(instrument.symbol), sources, nowIso)); }
        catch (error) { results.push({ symbol: instrument.symbol, status: "failed", failures: [String(error?.code || error?.message || "company_sync_failed")] }); }
      }
    }
    // Three bounded workers keep the 10-company cycle well inside Base44's
    // function window without opening an unbounded burst against any provider.
    await Promise.all(Array.from({ length: Math.min(3, selected.length) }, () => worker()));
    const succeeded = results.filter((result) => result.status !== "failed").length;
    const status = succeeded === selected.length ? "success" : succeeded ? "partial" : "failed";
    await base44.asServiceRole.entities.IngestionRun.update(run.id, {
      status, finished_at: new Date().toISOString(), success_count: succeeded, failed_count: selected.length - succeeded,
      coverage_percent: selected.length ? succeeded / selected.length * 100 : 100,
      notes: JSON.stringify(results.map(({ symbol, status: resultStatus, sections, failures }) => ({ symbol, status: resultStatus, sections, failures }))).slice(0, 1000),
    });
    return Response.json({ status, market_code: US_OPTIONS_MARKET_CODE, run_id: run.id, processed: selected.length, results });
  } catch (error) {
    if (base44 && run?.id) {
      try { await base44.asServiceRole.entities.IngestionRun.update(run.id, { status: "failed", finished_at: new Date().toISOString(), failure_code: error?.code || "US_COMPANY_INTELLIGENCE_FAILED", notes: String(error?.message || "failed").slice(0, 500) }); } catch {}
    }
    return replyError(error);
  }
});
