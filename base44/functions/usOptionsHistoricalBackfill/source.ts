import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { readJsonBody, replyError, requirePermission, requireTrustedOwner } from "../../shared/security.ts";
import { groupHistoricalBarsByYear, normalizeYahooHistoricalBars } from "../../shared/market-data.ts";
import { US_OPTIONS_CATALOG, US_OPTIONS_MARKET_CODE } from "../../shared/us-options-catalog.ts";

const PROVIDER_CODE = "YAHOO_US_OPTIONS_HISTORICAL_DAILY";
const BASE_URL = "https://query1.finance.yahoo.com";
const DEFAULT_FROM = "1970-01-01";
const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 15;

function rows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

async function ensureCatalog(base44) {
  const marketRows = rows(await base44.asServiceRole.entities.Market.filter({ market_code: US_OPTIONS_MARKET_CODE }));
  if (marketRows[0]) await base44.asServiceRole.entities.Market.update(marketRows[0].id, US_OPTIONS_CATALOG.market);
  else await base44.asServiceRole.entities.Market.create(US_OPTIONS_CATALOG.market);

  const existing = rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_OPTIONS_MARKET_CODE }));
  const byCompositeKey = new Map(existing.map((item) => [item.composite_key, item]));
  const creates = [];
  const updates = [];
  for (const company of US_OPTIONS_CATALOG.companies) {
    const payload = {
      symbol: company.symbol,
      market_code: US_OPTIONS_MARKET_CODE,
      instrument_code: company.symbol,
      instrument_type: "equity",
      composite_key: `${US_OPTIONS_MARKET_CODE}:${company.symbol}`,
      name_ar: company.nameAr,
      name_en: company.nameEn,
      sector_ar: company.sectorAr,
      sector_en: company.sectorEn,
      industry_en: company.industryEn,
      market: US_OPTIONS_CATALOG.market.name_en,
      currency: "USD",
      exchange_code: "US",
      country_code: "US",
      issuer_country: company.country,
      ipo_year: company.ipoYear,
      optionable: true,
      catalog_as_of: US_OPTIONS_CATALOG.source.asOf,
      status: "active",
      official_url: company.nasdaqUrl,
    };
    const current = byCompositeKey.get(payload.composite_key);
    if (current) updates.push({ id: current.id, ...payload });
    else creates.push(payload);
  }
  if (creates.length) await base44.asServiceRole.entities.Instrument.bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities.Instrument.bulkUpdate(updates);
  const persisted = rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_OPTIONS_MARKET_CODE }));
  const allowed = new Set(US_OPTIONS_CATALOG.companies.map((item) => item.symbol));
  const active = persisted.filter((item) => item.status !== "delisted" && allowed.has(item.symbol));
  if (active.length !== US_OPTIONS_CATALOG.companies.length) {
    throw Object.assign(new Error(`U.S. options catalog incomplete: ${active.length}/${US_OPTIONS_CATALOG.companies.length}`), { status: 503, code: "US_OPTIONS_CATALOG_INCOMPLETE" });
  }
  return active;
}

function marketClock(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) % 24 * 60 + Number(parts.minute) };
}

async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function fetchHistorical(symbol, from, to) {
  const period1 = Math.floor(Date.parse(`${from}T00:00:00.000Z`) / 1000);
  const period2 = Math.floor((Date.parse(`${to}T00:00:00.000Z`) + 86400e3) / 1000);
  const url = new URL(`${BASE_URL}/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set("period1", String(period1));
  url.searchParams.set("period2", String(period2));
  url.searchParams.set("interval", "1d");
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,splits");
  url.searchParams.set("includeAdjustedClose", "true");
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20e3);
    try {
      const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "SMART_INVESTOR-US-Historical-Archive/1.0" }, signal: controller.signal });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.chart?.result?.[0]) throw Object.assign(new Error(payload?.chart?.error?.description || `provider_http_${response.status}`), { code: payload?.chart?.error?.code || "HISTORY_PROVIDER_FAILED" });
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

async function ensureSource(base44) {
  const existing = rows(await base44.asServiceRole.entities.DataSource.filter({ code: PROVIDER_CODE }))[0] || null;
  const data = {
    name: "U.S. optionable companies daily OHLCV archive", market_code: US_OPTIONS_MARKET_CODE,
    quote_mode: "end_of_day", delay_seconds: 0, public_enabled: false, source_type: "reference",
    license_status: "restricted", base_url: BASE_URL, last_verified_at: new Date().toISOString(),
  };
  return existing ? await base44.asServiceRole.entities.DataSource.update(existing.id, data) : await base44.asServiceRole.entities.DataSource.create({ code: PROVIDER_CODE, ...data });
}

async function upsertChunks(base44, values, existing) {
  const key = (row) => `${row.instrument_id}:${row.interval}:${row.chunk_key}`;
  const byKey = new Map(existing.map((row) => [key(row), row]));
  const unique = [...new Map(values.map((row) => [key(row), row])).values()];
  const creates = unique.filter((row) => !byKey.has(key(row)));
  const updates = unique.filter((row) => byKey.has(key(row))).map((row) => ({ id: byKey.get(key(row)).id, ...row }));
  if (creates.length) await base44.asServiceRole.entities.CandleChunk.bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities.CandleChunk.bulkUpdate(updates);
  return { created: creates.length, updated: updates.length };
}

async function syncInstrument(base44, instrument, source, runId, from, to, force) {
  const existingSync = rows(await base44.asServiceRole.entities.HistoricalCandleSync.filter({ instrument_id: instrument.id, provider_code: PROVIDER_CODE, interval: "1d" }))[0] || null;
  if (existingSync?.status === "complete" && existingSync.coverage_verified === true && force !== true) return { symbol: instrument.symbol, status: "skipped", bar_count: existingSync.bar_count || 0 };
  const base = {
    instrument_id: instrument.id, symbol: instrument.symbol, market_code: US_OPTIONS_MARKET_CODE,
    provider_code: PROVIDER_CODE, interval: "1d", requested_from: from, requested_to: to,
    bar_count: Number(existingSync?.bar_count || 0), adjustment_mode: "provider_ohlcv",
    source_id: source.id, run_id: runId, last_attempt_at: new Date().toISOString(),
  };
  const sync = existingSync
    ? await base44.asServiceRole.entities.HistoricalCandleSync.update(existingSync.id, { ...base, status: "running", failure_code: "", failure_message: "" })
    : await base44.asServiceRole.entities.HistoricalCandleSync.create({ ...base, status: "running" });
  try {
    const normalized = normalizeYahooHistoricalBars(await fetchHistorical(instrument.symbol, from, to), from, to);
    const clock = marketClock();
    const bars = normalized.bars.filter((bar) => String(bar.time).slice(0, 10) < clock.date || clock.minute >= 975);
    if (!bars.length || normalized.providerPartial) throw Object.assign(new Error("Historical source returned incomplete coverage"), { code: "HISTORY_PARTIAL" });
    const grouped = groupHistoricalBarsByYear(bars);
    const fullChecksum = await digest(bars);
    const existingChunks = rows(await base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: instrument.id, interval: "1d", canonical_version: "us-options-daily-ohlcv-v1" }));
    const chunks = [];
    for (const [year, yearBars] of grouped) chunks.push({
      instrument_id: instrument.id, market_code: US_OPTIONS_MARKET_CODE, symbol: instrument.symbol, interval: "1d",
      chunk_key: `${US_OPTIONS_MARKET_CODE}:${instrument.symbol}:1d:history:${year}`,
      start_time: yearBars[0].time, end_time: yearBars.at(-1).time, bars: yearBars, bar_count: yearBars.length,
      checksum: await digest(yearBars), source_id: source.id, run_id: runId, snapshot_version: fullChecksum,
      provider_as_of: yearBars.at(-1).time, received_time: new Date().toISOString(), quality_status: "verified",
      canonical_version: "us-options-daily-ohlcv-v1", is_final: true, bucket_count: yearBars.length,
      completeness_status: "complete", is_historical_archive: true, adjustment_mode: "none",
      history_from: from, history_to: to,
    });
    const persisted = await upsertChunks(base44, chunks, existingChunks);
    await base44.asServiceRole.entities.HistoricalCandleSync.update(sync.id, {
      ...base, status: "complete", earliest_bar_time: bars[0].time, latest_bar_time: bars.at(-1).time,
      bar_count: bars.length, year_chunk_count: grouped.size, checksum: fullChecksum,
      provider_partial: false, provider_first_trade_time: normalized.firstTradeTime || bars[0].time,
      coverage_verified: true, completed_at: new Date().toISOString(), failure_code: "", failure_message: "",
    });
    return { symbol: instrument.symbol, status: "complete", bar_count: bars.length, year_chunk_count: grouped.size, ...persisted };
  } catch (error) {
    const preserve = existingSync?.status === "complete" && existingSync.coverage_verified === true;
    await base44.asServiceRole.entities.HistoricalCandleSync.update(sync.id, {
      ...base, status: preserve ? "complete" : error?.code === "HISTORY_PARTIAL" ? "partial" : "failed",
      provider_partial: preserve ? false : error?.code === "HISTORY_PARTIAL", coverage_verified: preserve,
      failure_code: String(error?.code || "HISTORY_PROVIDER_FAILED"), failure_message: String(error?.message || "Historical synchronization failed").slice(0, 500),
    });
    return { symbol: instrument.symbol, status: "failed", error: String(error?.code || error?.message || "HISTORY_PROVIDER_FAILED") };
  }
}

Deno.serve(async (req) => {
  let base44;
  let run = null;
  try {
    base44 = createClientFromRequest(req);
    const requestBody = await readJsonBody(req);
    const body = { ...requestBody, ...(requestBody.args || {}) };
    if (body.session_id) await requirePermission(base44, body.session_id, body.device_id, "data.ingestion.run");
    else await requireTrustedOwner(base44);
    const catalogInstruments = await ensureCatalog(base44);
    const syncRows = rows(await base44.asServiceRole.entities.HistoricalCandleSync.filter({ market_code: US_OPTIONS_MARKET_CODE, interval: "1d" }));
    if (body.action === "status") return Response.json({
      market_code: US_OPTIONS_MARKET_CODE, instruments: US_OPTIONS_CATALOG.companies.length,
      complete: syncRows.filter((item) => item.status === "complete" && item.coverage_verified === true).length,
      partial: syncRows.filter((item) => item.status === "partial").length,
      failed: syncRows.filter((item) => item.status === "failed").length,
      stored_daily_bars: syncRows.reduce((sum, item) => sum + Number(item.bar_count || 0), 0),
    });
    const from = /^\d{4}-\d{2}-\d{2}$/.test(String(body.from || "")) ? String(body.from) : DEFAULT_FROM;
    const to = /^\d{4}-\d{2}-\d{2}$/.test(String(body.to || "")) ? String(body.to) : marketClock().date;
    const batchSize = Math.min(MAX_BATCH_SIZE, Math.max(1, Number(body.batch_size) || DEFAULT_BATCH_SIZE));
    const requested = Array.isArray(body.symbols) ? new Set(body.symbols.map((item) => String(item).toUpperCase())) : null;
    const completedIds = new Set(syncRows.filter((item) => item.status === "complete" && item.coverage_verified === true && body.force !== true).map((item) => item.instrument_id));
    const instruments = catalogInstruments
      .filter((item) => item.status !== "delisted" && (!requested || requested.has(item.symbol)))
      .filter((item) => !completedIds.has(item.id))
      .slice(0, batchSize);
    if (!instruments.length) return Response.json({ status: "complete", reason: "no_pending_instruments", market_code: US_OPTIONS_MARKET_CODE });
    const source = await ensureSource(base44);
    run = await base44.asServiceRole.entities.IngestionRun.create({
      run_type: "historical_backfill", market_code: US_OPTIONS_MARKET_CODE,
      slot_key: `${US_OPTIONS_MARKET_CODE}:history:${Date.now()}`, slot_kind: "historical_backfill",
      scheduled_for: new Date().toISOString(), lease_expires_at: new Date(Date.now() + 4 * 60e3).toISOString(),
      started_at: new Date().toISOString(), total_records: instruments.length, success_count: 0, failed_count: 0,
      status: "running", source_id: source.id, notes: `range:${from}..${to}`,
    });
    const results = [];
    let cursor = 0;
    async function worker() {
      while (cursor < instruments.length) {
        const instrument = instruments[cursor++];
        results.push(await syncInstrument(base44, instrument, source, run.id, from, to, body.force === true));
      }
    }
    await Promise.all(Array.from({ length: Math.min(3, instruments.length) }, () => worker()));
    const completed = results.filter((item) => ["complete", "skipped"].includes(item.status)).length;
    const status = completed === instruments.length ? "success" : completed ? "partial" : "failed";
    await base44.asServiceRole.entities.IngestionRun.update(run.id, {
      status, finished_at: new Date().toISOString(), success_count: completed,
      failed_count: instruments.length - completed, coverage_percent: completed / instruments.length * 100,
      notes: JSON.stringify(results.map(({ symbol, status, error }) => ({ symbol, status, error }))).slice(0, 1000),
    });
    return Response.json({ status, market_code: US_OPTIONS_MARKET_CODE, run_id: run.id, results });
  } catch (error) {
    if (base44 && run?.id) {
      try { await base44.asServiceRole.entities.IngestionRun.update(run.id, { status: "failed", finished_at: new Date().toISOString(), failure_code: error?.code || "US_HISTORY_FAILED", notes: error?.message || "failed" }); } catch {}
    }
    return replyError(error);
  }
});
