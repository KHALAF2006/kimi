import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { replyError, requireAdminUser } from "../../shared/security.ts";

const MODES = new Set(["daily", "financials", "bootstrap"]);
const OFFICIAL_HOST = /(^|\.)saudiexchange\.sa$/i;

function fail(message, status = 400, code = "COMPANY_INTELLIGENCE_INVALID") {
  throw Object.assign(new Error(message), { status, code });
}

function rows(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (Array.isArray(value?.data)) return value.data.filter(Boolean);
  if (Array.isArray(value?.items)) return value.items.filter(Boolean);
  return [];
}

function cleanText(value, max = 4000) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function finite(value) {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function officialUrl(value) {
  let url;
  try { url = new URL(String(value || "")); } catch { fail("Invalid Saudi Exchange source URL", 502, "SOURCE_URL_INVALID"); }
  if (url.protocol !== "https:" || !OFFICIAL_HOST.test(url.hostname)) fail("Untrusted company intelligence source", 502, "SOURCE_NOT_OFFICIAL");
  return url.toString();
}

async function sha256(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes)).map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function authorize(base44, mode) {
  const user = await requireAdminUser(base44);
  return { actor: user.id, mode };
}

async function sourceRecord(base44) {
  const existing = await base44.asServiceRole.entities.DataSource.filter({ code: "SAUDI_EXCHANGE_COMPANY_INTELLIGENCE" });
  const value = {
    name: "Saudi Exchange company intelligence",
    source_type: "official",
    license_status: "restricted",
    base_url: "https://www.saudiexchange.sa/",
    last_verified_at: new Date().toISOString(),
  };
  return existing[0]
    ? await base44.asServiceRole.entities.DataSource.update(existing[0].id, value)
    : await base44.asServiceRole.entities.DataSource.create({ code: "SAUDI_EXCHANGE_COMPANY_INTELLIGENCE", ...value });
}

async function fetchBatch(symbols, mode) {
  const feedUrl = Deno.env.get("SAUDI_EXCHANGE_COMPANY_FEED_URL");
  const token = Deno.env.get("SAUDI_EXCHANGE_COMPANY_FEED_TOKEN");
  if (!feedUrl || !token) fail("Saudi Exchange company feed is not configured", 503, "OFFICIAL_COMPANY_FEED_NOT_CONFIGURED");
  const response = await fetch(feedUrl, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      symbols,
      include: mode === "financials"
        ? ["financials"]
        : mode === "bootstrap"
          ? ["announcements", "major_shareholders", "corporate_actions", "financials"]
          : ["announcements", "major_shareholders", "corporate_actions"],
    }),
  });
  if (!response.ok) fail(`Official company feed returned ${response.status}`, 502, "OFFICIAL_COMPANY_FEED_UNAVAILABLE");
  const payload = await response.json();
  if (!Array.isArray(payload?.companies)) fail("Official company feed returned an invalid payload", 502, "OFFICIAL_COMPANY_FEED_INVALID");
  return payload.companies;
}

async function upsertMany(base44, entity, input, keys) {
  if (!input.length) return { created: 0, updated: 0 };
  const existing = rows(await base44.asServiceRole.entities[entity].list("-updated_date", 5000));
  const keyOf = (item) => keys.map((key) => String(item[key] ?? "")).join("|");
  const byKey = new Map(existing.map((item) => [keyOf(item), item]));
  const creates = input.filter((item) => !byKey.has(keyOf(item)));
  const updates = input.filter((item) => byKey.has(keyOf(item))).map((item) => ({ id: byKey.get(keyOf(item)).id, ...item }));
  if (creates.length) await base44.asServiceRole.entities[entity].bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities[entity].bulkUpdate(updates);
  return { created: creates.length, updated: updates.length };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const requestBody = await req.json();
    const body = { ...requestBody, ...(requestBody.args || {}) };
    const mode = String(body.mode || "daily");
    if (!MODES.has(mode)) fail("Unsupported company intelligence mode");
    const authorization = await authorize(base44, mode);
    const startedAt = new Date().toISOString();
    const instruments = rows(await base44.asServiceRole.entities.Instrument.list("symbol", 500));
    if (instruments.length < 270) fail(`Main-market catalog is incomplete: ${instruments.length}/270`, 503, "CATALOG_INCOMPLETE");
    const bySymbol = new Map(instruments.map((item) => [item.symbol, item]));
    const source = await sourceRecord(base44);
    const companies = await fetchBatch(instruments.map((item) => item.symbol), mode);
    const now = new Date().toISOString();
    const announcements = [];
    const shareholders = [];
    const financials = [];
    const corporateActions = [];

    for (const company of companies) {
      const symbol = String(company.symbol || "");
      const instrument = bySymbol.get(symbol);
      if (!instrument) continue;
      if (mode === "daily" || mode === "bootstrap") {
        for (const item of rows(company.announcements)) {
          const sourceUrl = officialUrl(item.source_url);
          const normalized = {
            instrument_id: instrument.id,
            symbol,
            announcement_id: cleanText(item.id || item.announcement_id, 160),
            title_ar: cleanText(item.title_ar, 1000),
            title_en: cleanText(item.title_en, 1000),
            summary_ar: cleanText(item.summary_ar, 4000),
            summary_en: cleanText(item.summary_en, 4000),
            category: cleanText(item.category, 120),
            published_at: new Date(item.published_at).toISOString(),
            source_id: source.id,
            source_url: sourceUrl,
            as_of: now,
          };
          if (!normalized.announcement_id || !normalized.title_ar || !Number.isFinite(new Date(normalized.published_at).getTime())) continue;
          normalized.checksum = await sha256(normalized);
          announcements.push(normalized);
        }
        for (const item of rows(company.major_shareholders)) {
          const sourceUrl = officialUrl(item.source_url);
          const ownership = finite(item.ownership_percent);
          if (ownership === undefined || ownership < 0 || ownership > 100) continue;
          const nameAr = cleanText(item.shareholder_name_ar, 500);
          const nameEn = cleanText(item.shareholder_name_en, 500);
          const key = cleanText(item.shareholder_key || nameAr || nameEn, 500);
          if (!key || (!nameAr && !nameEn)) continue;
          shareholders.push({
            instrument_id: instrument.id,
            shareholder_key: key,
            shareholder_name_ar: nameAr,
            shareholder_name_en: nameEn || nameAr,
            ownership_percent: ownership,
            previous_ownership_percent: finite(item.previous_ownership_percent),
            change_percent: finite(item.change_percent),
            source_id: source.id,
            source_url: sourceUrl,
            as_of: now,
          });
        }
        for (const item of rows(company.corporate_actions)) {
          const sourceUrl = officialUrl(item.source_url);
          const announceDate = item.announce_date ? new Date(item.announce_date) : null;
          const exDate = item.ex_date ? new Date(item.ex_date) : null;
          const recordDate = item.record_date ? new Date(item.record_date) : null;
          if (![announceDate, exDate, recordDate].every((date) => date && Number.isFinite(date.getTime()))) continue;
          const eventType = ["dividend", "split", "rights_issue", "bonus", "other"].includes(item.event_type) ? item.event_type : "other";
          const status = ["announced", "confirmed", "completed", "cancelled"].includes(item.status) ? item.status : "announced";
          const descriptionAr = cleanText(item.description_ar, 2000);
          const descriptionEn = cleanText(item.description_en, 2000);
          if (!descriptionAr && !descriptionEn) continue;
          corporateActions.push({
            instrument_id: instrument.id,
            event_type: eventType,
            announce_date: announceDate.toISOString().slice(0, 10),
            ex_date: exDate.toISOString().slice(0, 10),
            record_date: recordDate.toISOString().slice(0, 10),
            pay_date: item.pay_date && Number.isFinite(new Date(item.pay_date).getTime()) ? new Date(item.pay_date).toISOString().slice(0, 10) : undefined,
            amount: finite(item.amount),
            currency: cleanText(item.currency || "SAR", 12),
            ratio: finite(item.ratio),
            status,
            description_ar: descriptionAr || descriptionEn,
            description_en: descriptionEn || descriptionAr,
            source_id: source.id,
            source_url: sourceUrl,
            as_of: now,
          });
        }
      }
      if (mode === "financials" || mode === "bootstrap") {
        for (const item of rows(company.financials)) {
          const sourceUrl = officialUrl(item.source_url);
          const period = cleanText(item.period, 120);
          if (!period) continue;
          const normalized = {
            instrument_id: instrument.id,
            period,
            period_end: item.period_end ? new Date(item.period_end).toISOString().slice(0, 10) : undefined,
            statement_type: cleanText(item.statement_type, 120),
            currency: cleanText(item.currency || "SAR", 12),
            revenue: finite(item.revenue),
            net_income: finite(item.net_income),
            operating_income: finite(item.operating_income),
            total_assets: finite(item.total_assets),
            total_liabilities: finite(item.total_liabilities),
            shareholders_equity: finite(item.shareholders_equity),
            eps: finite(item.eps),
            accumulated_losses_pct: finite(item.accumulated_losses_pct),
            source_id: source.id,
            source_url: sourceUrl,
            as_of: now,
          };
          normalized.checksum = await sha256(normalized);
          financials.push(normalized);
        }
      }
    }

    const results = mode === "daily"
      ? {
          announcements: await upsertMany(base44, "CompanyAnnouncement", announcements, ["instrument_id", "announcement_id"]),
          shareholders: await upsertMany(base44, "MajorShareholder", shareholders, ["instrument_id", "shareholder_key"]),
          corporate_actions: await upsertMany(base44, "CorporateAction", corporateActions, ["instrument_id", "event_type", "announce_date", "ex_date"]),
        }
      : mode === "financials"
        ? { financials: await upsertMany(base44, "CompanyFinancial", financials, ["instrument_id", "period", "statement_type"]) }
        : {
            announcements: await upsertMany(base44, "CompanyAnnouncement", announcements, ["instrument_id", "announcement_id"]),
            shareholders: await upsertMany(base44, "MajorShareholder", shareholders, ["instrument_id", "shareholder_key"]),
            corporate_actions: await upsertMany(base44, "CorporateAction", corporateActions, ["instrument_id", "event_type", "announce_date", "ex_date"]),
            financials: await upsertMany(base44, "CompanyFinancial", financials, ["instrument_id", "period", "statement_type"]),
          };
    const total = announcements.length + shareholders.length + financials.length + corporateActions.length;
    await base44.asServiceRole.entities.IngestionRun.create({
      run_type: `scheduled_company_intelligence_${mode}`,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      total_records: total,
      success_count: total,
      failed_count: 0,
      status: "success",
      source_id: source.id,
      notes: JSON.stringify({ mode, companies_received: companies.length, actor: authorization.actor }),
    });
    return Response.json({ status: "success", mode, companies_received: companies.length, records: total, results, refreshed_at: now });
  } catch (error) {
    return replyError(error);
  }
});