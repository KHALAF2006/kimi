import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { replyError, requireAdminUser, requirePermission, requireUser } from "../../shared/security.ts";
import { groupHistoricalBarsByYear, mergeStoredCandleSeries, normalizeAdjustedHistoricalBars, normalizeYahooHistoricalBars } from "../../shared/market-data.ts";

const MARKET_CODE = "SA_MAIN";
const SAHMK_PROVIDER_CODE = "SAHMK_HISTORICAL_ADJUSTED_DAILY";
const YAHOO_PROVIDER_CODE = "YAHOO_PUBLIC_HISTORICAL_DAILY";
const SAHMK_BASE_URL = "https://app.sahmk.sa/api/v1";
const YAHOO_BASE_URL = "https://query1.finance.yahoo.com";
const DEFAULT_FROM = "1985-01-01";
const BATCH_SIZE = 10;
const BATCH_CONCURRENCY = 3;

async function requireBackfillOperator(base44: any, sessionId?: string) {
  if (sessionId) return await requirePermission(base44, sessionId, "data.ingestion.run");
  const user = await requireUser(base44);
  if (user.role !== "admin") {
    throw Object.assign(new Error("Forbidden"), { status: 403, code: "PERMISSION_DENIED" });
  }
  return { user };
}
const PROVIDER_CONCURRENCY = 2;
const MAX_INSTRUMENTS_PER_RUN = 90;
const REQUEST_TIMEOUT_MS = 20_000;

function rows(value: unknown): Array<Record<string, any>> {
  if (Array.isArray(value)) return value;
  if (Array.isArray((value as any)?.data)) return (value as any).data;
  if (Array.isArray((value as any)?.items)) return (value as any).items;
  return [];
}

function dateOnly(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

async function archiveStatus(base44: any, requestedSymbols: unknown) {
  const instruments = rows(await base44.asServiceRole.entities.Instrument.list("symbol", 500))
    .filter((instrument) => instrument.market_code === MARKET_CODE && instrument.status !== "delisted");
  const syncRows = rows(await base44.asServiceRole.entities.HistoricalCandleSync.filter({ market_code: MARKET_CODE, interval: "1d" }, "symbol", 500));
  const preferredSymbols = Array.isArray(requestedSymbols)
    ? [...new Set(requestedSymbols.map(String).filter((symbol) => /^\d{4}$/.test(symbol)))].slice(0, 10)
    : ["1010", "1111", "1211", "1321", "2010", "2222", "4001", "4323"];
  const samples = [];
  for (const symbol of preferredSymbols) {
    const instrument = instruments.find((item) => item.symbol === symbol);
    if (!instrument) continue;
    const chunks = rows(await base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: instrument.id, interval: "1d" }, "start_time", 500))
      .filter((chunk) => chunk.quality_status !== "quarantined" && Array.isArray(chunk.bars));
    const daily = mergeStoredCandleSeries([{ interval: "1d", bars: chunks.flatMap((chunk) => chunk.bars) }], "1d").bars;
    const weekly = mergeStoredCandleSeries([{ interval: "1d", bars: daily }], "1wk").bars;
    const monthly = mergeStoredCandleSeries([{ interval: "1d", bars: daily }], "1mo").bars;
    const sync = syncRows.find((item) => item.instrument_id === instrument.id) || null;
    samples.push({
      symbol,
      status: sync?.status || "not_started",
      coverage_verified: sync?.coverage_verified === true,
      daily_bars: daily.length,
      weekly_bars: weekly.length,
      monthly_bars: monthly.length,
      first_daily: daily[0]?.time || null,
      last_daily: daily.at(-1)?.time || null,
    });
  }
  return {
    instruments: instruments.length,
    complete: syncRows.filter((item) => item.status === "complete").length,
    partial: syncRows.filter((item) => item.status === "partial").length,
    failed: syncRows.filter((item) => item.status === "failed").length,
    stored_daily_bars: syncRows.reduce((sum, item) => sum + Number(item.bar_count || 0), 0),
    samples,
  };
}

function validateDate(value: unknown, fallback: string) {
  const text = String(value || fallback);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(`${text}T00:00:00.000Z`))) {
    throw Object.assign(new Error("Historical date must use YYYY-MM-DD"), { status: 400, code: "INVALID_HISTORY_DATE" });
  }
  return text;
}

async function digest(value: unknown) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function upsertUnique(base44: any, entityName: string, values: Array<Record<string, any>>, existing: Array<Record<string, any>>, keyFor: (row: Record<string, any>) => string) {
  const unique = new Map(values.map((value) => [keyFor(value), value]));
  const existingByKey = new Map(existing.map((value) => [keyFor(value), value]));
  const creates: Array<Record<string, any>> = [];
  const updates: Array<Record<string, any>> = [];
  for (const [key, value] of unique) {
    const current = existingByKey.get(key);
    if (current) updates.push({ id: current.id, ...value });
    else creates.push(value);
  }
  if (creates.length) await base44.asServiceRole.entities[entityName].bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities[entityName].bulkUpdate(updates);
  return { created: creates.length, updated: updates.length };
}

async function fetchSahmkHistorical(symbol: string, from: string, to: string, apiKey: string, baseUrl: string) {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/historical/${encodeURIComponent(symbol)}/`);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("interval", "1d");
  let lastError: any = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", "X-API-Key": apiKey },
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const code = String(payload?.error?.code || payload?.code || `HTTP_${response.status}`);
        throw Object.assign(new Error(String(payload?.error?.message || payload?.detail || "Historical provider request failed")), { code });
      }
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || Object.assign(new Error("Historical provider request failed"), { code: "HISTORY_PROVIDER_FAILED" });
}

async function fetchYahooHistorical(symbol: string, from: string, to: string, baseUrl: string) {
  const start = Math.floor(new Date(`${from}T00:00:00.000Z`).getTime() / 1000);
  const end = Math.floor((new Date(`${to}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000) / 1000);
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/v8/finance/chart/${encodeURIComponent(`${symbol}.SR`)}`);
  url.searchParams.set("period1", String(start));
  url.searchParams.set("period2", String(end));
  url.searchParams.set("interval", "1d");
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,splits");
  url.searchParams.set("includeAdjustedClose", "true");
  let lastError: any = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "KMY-Historical-Archive/1.0" },
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const code = String(payload?.chart?.error?.code || `HTTP_${response.status}`);
        throw Object.assign(new Error(String(payload?.chart?.error?.description || `Historical source returned ${response.status}`)), { code });
      }
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || Object.assign(new Error("Historical source request failed"), { code: "HISTORY_PROVIDER_FAILED" });
}

function historyProvider() {
  return {
    code: YAHOO_PROVIDER_CODE,
    name: "Public Saudi daily OHLCV archive",
    baseUrl: YAHOO_BASE_URL,
    sourceType: "reference",
    licenseStatus: "approved",
    adjustmentMode: "provider_ohlcv",
    canonicalVersion: "trusted-daily-ohlcv-v2",
    fetch: (symbol: string, from: string, to: string) => fetchYahooHistorical(symbol, from, to, YAHOO_BASE_URL),
    normalize: normalizeYahooHistoricalBars,
  };
}

async function ensureSource(base44: any, provider: Record<string, any>) {
  const existing = rows(await base44.asServiceRole.entities.DataSource.filter({ code: provider.code }))[0] || null;
  const values = {
    name: provider.name,
    market_code: MARKET_CODE,
    quote_mode: "end_of_day",
    delay_seconds: 0,
    public_enabled: false,
    source_type: provider.sourceType,
    license_status: provider.licenseStatus,
    base_url: provider.baseUrl,
    last_verified_at: new Date().toISOString(),
  };
  return existing
    ? await base44.asServiceRole.entities.DataSource.update(existing.id, values)
    : await base44.asServiceRole.entities.DataSource.create({ code: provider.code, ...values });
}

async function persistInstrumentHistory(base44: any, instrument: Record<string, any>, options: Record<string, any>) {
  const now = new Date().toISOString();
  const currentSync = rows(await base44.asServiceRole.entities.HistoricalCandleSync.filter({
    instrument_id: instrument.id,
    provider_code: options.provider.code,
    interval: "1d",
  }))[0] || null;
  if (currentSync?.status === "complete" && options.force !== true) {
    return { symbol: instrument.symbol, status: "skipped", reason: "history_already_complete", bar_count: currentSync.bar_count || 0 };
  }
  const syncBase = {
    instrument_id: instrument.id,
    symbol: instrument.symbol,
    market_code: MARKET_CODE,
    provider_code: options.provider.code,
    interval: "1d",
    requested_from: options.from,
    requested_to: options.to,
    bar_count: Number(currentSync?.bar_count || 0),
    adjustment_mode: options.provider.adjustmentMode,
    source_id: options.sourceId,
    run_id: options.runId,
    last_attempt_at: now,
  };
  const sync = currentSync
    ? await base44.asServiceRole.entities.HistoricalCandleSync.update(currentSync.id, { ...syncBase, status: "running", failure_code: "", failure_message: "" })
    : await base44.asServiceRole.entities.HistoricalCandleSync.create({ ...syncBase, status: "running" });
  try {
    const payload = await options.provider.fetch(instrument.symbol, options.from, options.to);
    const normalized = options.provider.normalize(payload, options.from, options.to);
    if (normalized.providerPartial) {
      throw Object.assign(new Error("Historical provider marked the requested dataset as partial"), { code: "HISTORY_PARTIAL" });
    }
    const bars = normalized.bars;
    const years = groupHistoricalBarsByYear(bars);
    const checksum = await digest(bars);
    const existingChunks = rows(await base44.asServiceRole.entities.CandleChunk.filter({
      instrument_id: instrument.id,
      interval: "1d",
      canonical_version: options.provider.canonicalVersion,
    }));
    const chunkRows = [];
    for (const [year, yearBars] of years) {
      chunkRows.push({
        instrument_id: instrument.id,
        symbol: instrument.symbol,
        interval: "1d",
        chunk_key: `${instrument.symbol}-1d-history-${year}`,
        start_time: yearBars[0].time,
        end_time: yearBars.at(-1)?.time,
        bars: yearBars,
        bar_count: yearBars.length,
        checksum: await digest(yearBars),
        source_id: options.sourceId,
        run_id: options.runId,
        snapshot_version: checksum,
        provider_as_of: yearBars.at(-1)?.time,
        received_time: now,
        quality_status: "verified",
        canonical_version: options.provider.canonicalVersion,
        is_final: true,
        bucket_count: yearBars.length,
        completeness_status: "complete",
        is_historical_archive: true,
        adjustment_mode: options.provider.adjustmentMode,
        history_from: options.from,
        history_to: options.to,
      });
    }
    const persisted = await upsertUnique(
      base44,
      "CandleChunk",
      chunkRows,
      existingChunks,
      (row) => `${row.instrument_id}:${row.interval}:${row.chunk_key}`,
    );
    await base44.asServiceRole.entities.HistoricalCandleSync.update(sync.id, {
      ...syncBase,
      status: "complete",
      earliest_bar_time: bars[0].time,
      latest_bar_time: bars.at(-1)?.time,
      bar_count: bars.length,
      year_chunk_count: years.size,
      checksum,
      provider_partial: false,
      provider_first_trade_time: normalized.firstTradeTime || bars[0].time,
      coverage_verified: true,
      failure_message: normalized.rejectedCount || normalized.duplicateCount
        ? `Validated with ${normalized.rejectedCount} rejected and ${normalized.duplicateCount} duplicate rows`
        : "",
      completed_at: new Date().toISOString(),
      failure_code: "",
    });
    return { symbol: instrument.symbol, status: "complete", bar_count: bars.length, year_chunk_count: years.size, ...persisted };
  } catch (error) {
    await base44.asServiceRole.entities.HistoricalCandleSync.update(sync.id, {
      ...syncBase,
      status: error?.code === "HISTORY_PARTIAL" ? "partial" : "failed",
      provider_partial: error?.code === "HISTORY_PARTIAL",
      coverage_verified: false,
      failure_code: String(error?.code || "HISTORY_PROVIDER_FAILED"),
      failure_message: String(error?.message || "Historical synchronization failed").slice(0, 500),
    });
    return { symbol: instrument.symbol, status: "failed", error: String(error?.code || error?.message || "HISTORY_PROVIDER_FAILED") };
  }
}

async function processBatch(base44: any, instrumentIds: string[], options: Record<string, any>) {
  const instruments = rows(await base44.asServiceRole.entities.Instrument.filter({ id: { $in: instrumentIds } }, "symbol", BATCH_SIZE))
    .filter((instrument) => instrument.market_code === MARKET_CODE && instrument.status !== "delisted");
  const results: Array<Record<string, any>> = [];
  let cursor = 0;
  async function worker() {
    while (cursor < instruments.length) {
      const instrument = instruments[cursor];
      cursor += 1;
      results.push(await persistInstrumentHistory(base44, instrument, options));
    }
  }
  await Promise.all(Array.from({ length: Math.min(PROVIDER_CONCURRENCY, instruments.length) }, () => worker()));
  return {
    results,
    completed: results.filter((item) => item.status === "complete").length,
    skipped: results.filter((item) => item.status === "skipped").length,
    failed: results.filter((item) => item.status === "failed").length,
  };
}

Deno.serve(async (req) => {
  let base44: any = null;
  let run: Record<string, any> | null = null;
  try {
    base44 = createClientFromRequest(req);
    const requestBody = await req.json();
    const body = { ...requestBody, ...(requestBody.args || {}) };
    await requireAdminUser(base44);
    const provider = historyProvider();
    const from = validateDate(body.from, DEFAULT_FROM);
    const to = validateDate(body.to, dateOnly());
    if (from > to) throw Object.assign(new Error("Historical start date must not follow the end date"), { status: 400, code: "INVALID_HISTORY_RANGE" });

    if (body.mode === "history_batch") {
      const instrumentIds = Array.isArray(body.instrument_ids)
        ? [...new Set(body.instrument_ids.map(String).filter(Boolean))].slice(0, BATCH_SIZE)
        : [];
      if (!instrumentIds.length) throw Object.assign(new Error("instrument_ids are required"), { status: 400 });
      return Response.json(await processBatch(base44, instrumentIds, {
        provider,
        from,
        to,
        sourceId: String(body.source_id),
        runId: String(body.run_id),
        force: body.force === true,
      }));
    }

    if (body.mode === "status") return Response.json(await archiveStatus(base44, body.symbols));
    const source = await ensureSource(base44, provider);
    const instruments = rows(await base44.asServiceRole.entities.Instrument.list("symbol", 500))
      .filter((instrument) => instrument.market_code === MARKET_CODE && instrument.status !== "delisted")
      .sort((left, right) => String(left.symbol).localeCompare(String(right.symbol), "en"));
    const existingSync = rows(await base44.asServiceRole.entities.HistoricalCandleSync.filter({
      market_code: MARKET_CODE,
      provider_code: provider.code,
      interval: "1d",
    }));
    const completeIds = new Set(existingSync.filter((item) => item.status === "complete").map((item) => item.instrument_id));
    const allPending = body.force === true ? instruments : instruments.filter((instrument) => !completeIds.has(instrument.id));
    if (!allPending.length) {
      return Response.json({ status: "skipped", reason: "all_history_already_complete", instruments: instruments.length, completed: completeIds.size });
    }
    const pending = allPending.slice(0, MAX_INSTRUMENTS_PER_RUN);
    const startedAt = new Date().toISOString();
    run = await base44.asServiceRole.entities.IngestionRun.create({
      run_type: "historical_backfill",
      market_code: MARKET_CODE,
      slot_key: `historical-backfill:${provider.code}:${from}:${to}`,
      slot_kind: "historical_backfill",
      scheduled_for: startedAt,
      lease_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      started_at: startedAt,
      total_records: pending.length,
      success_count: 0,
      failed_count: pending.length,
      status: "running",
      source_id: source.id,
      notes: JSON.stringify({ provider_code: provider.code, from, to, stored_once: true }),
    });
    const batches = [];
    for (let offset = 0; offset < pending.length; offset += BATCH_SIZE) {
      batches.push(pending.slice(offset, offset + BATCH_SIZE).map((instrument) => instrument.id));
    }
    const batchResults: Array<Record<string, any>> = [];
    const batchFailures: Array<Record<string, any>> = [];
    for (let offset = 0; offset < batches.length; offset += BATCH_CONCURRENCY) {
      const group = batches.slice(offset, offset + BATCH_CONCURRENCY);
      const settled = await Promise.allSettled(group.map((instrumentIds) => base44.functions.invoke("historicalCandleBackfill", {
        mode: "history_batch",
        instrument_ids: instrumentIds,
        source_id: source.id,
        run_id: run.id,
        from,
        to,
        force: body.force === true,
      })));
      settled.forEach((result, index) => {
        if (result.status === "fulfilled") batchResults.push(result.value?.data || result.value || {});
        else batchFailures.push({ instrument_ids: group[index], error: result.reason?.response?.data?.error || result.reason?.message || "history_batch_failed" });
      });
    }
    const completed = batchResults.reduce((sum, item) => sum + Number(item.completed || 0) + Number(item.skipped || 0), 0);
    const failed = Math.max(0, pending.length - completed);
    const finishedAt = new Date().toISOString();
    const status = failed === 0 ? "success" : completed > 0 ? "partial" : "failed";
    await base44.asServiceRole.entities.IngestionRun.update(run.id, {
      finished_at: finishedAt,
      success_count: completed,
      failed_count: failed,
      coverage_percent: pending.length ? completed / pending.length * 100 : 100,
      status,
      promoted_at: completed ? finishedAt : undefined,
      notes: JSON.stringify({ provider_code: provider.code, from, to, stored_once: true, batch_count: batches.length, batch_failures: batchFailures }),
    });
    return Response.json({
      status,
      run_id: run.id,
      provider_code: provider.code,
      requested: pending.length,
      completed,
      failed,
      already_complete: completeIds.size,
      total_instruments: instruments.length,
      remaining_instruments: Math.max(0, allPending.length - pending.length + failed),
      from,
      to,
    });
  } catch (error) {
    if (base44 && run?.id) {
      try {
        await base44.asServiceRole.entities.IngestionRun.update(run.id, {
          status: "failed",
          finished_at: new Date().toISOString(),
          failure_code: String(error?.code || "HISTORICAL_BACKFILL_FAILED"),
          notes: String(error?.message || "Historical backfill failed").slice(0, 500),
        });
      } catch {
        // Preserve the original error.
      }
    }
    return replyError(error);
  }
});