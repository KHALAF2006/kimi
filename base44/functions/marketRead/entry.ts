// GENERATED from base44/functions/marketRead/entry.ts — do not edit directly.

// base44/functions/marketRead/entry.ts
import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// base44/shared/security.ts
async function requireUser(base44) {
  const user = await base44.auth.me();
  if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return user;
}
async function profileFor(base44, user) {
  const rows = await base44.asServiceRole.entities.CustomerProfile.filter({ auth_user_id: user.id });
  return rows[0] || null;
}
async function requireActiveSession(base44, profile, sessionId) {
  if (!profile || !sessionId) throw Object.assign(new Error("Active device session required"), { status: 403 });
  const session = await base44.asServiceRole.entities.ActiveDeviceSession.get(sessionId);
  if (!session || session.customer_id !== profile.id || session.revoked_at || new Date(session.expires_at) <= /* @__PURE__ */ new Date()) throw Object.assign(new Error("Active device session required"), { status: 403 });
  return session;
}
function replyError(error) {
  const status = Number(error?.status) || 500;
  if (status >= 500) console.error("KMY backend error", error);
  return Response.json({
    error: status >= 500 ? "Backend operation failed" : error?.message || "Request failed",
    code: error?.code || (status >= 500 ? "BACKEND_FAILURE" : "REQUEST_FAILED")
  }, { status });
}

// base44/functions/marketRead/entry.ts
var YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
var ALLOWED_INTERVALS = /* @__PURE__ */ new Set(["15m", "1h", "1d", "1wk", "1mo"]);
var ALLOWED_RANGES = /* @__PURE__ */ new Set(["5d", "1mo", "3mo", "1y", "2y", "5y", "10y", "max"]);
function stateFor(value, source, now = Date.now()) {
  const age = value ? now - new Date(value).getTime() : Number.POSITIVE_INFINITY;
  return {
    label: age > 36 * 60 * 60 * 1e3 ? "\u0645\u062A\u0642\u0627\u062F\u0645\u0629" : source?.source_type === "official" ? "\u0645\u0631\u062C\u0639\u064A\u0629" : "\u0645\u062A\u0623\u062E\u0631\u0629",
    stale: age > 36 * 60 * 60 * 1e3
  };
}
async function requireMarketAccess(base44, body) {
  const user = await requireUser(base44);
  const profile = await profileFor(base44, user);
  await requireActiveSession(base44, profile, body.session_id);
  if (!profile || ["suspended", "banned", "closed"].includes(profile.account_status)) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  if (!["admin", "owner"].includes(profile.role)) {
    const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ customer_id: profile.id, status: "active" });
    const active = subscriptions.some((item) => new Date(item.ends_at) > /* @__PURE__ */ new Date());
    if (!active) throw Object.assign(new Error("Active subscription required"), { status: 403 });
  }
  return { user, profile };
}
async function instrumentFor(base44, body) {
  const symbol = String(body.symbol || "").trim();
  if (symbol) {
    if (!/^\d{4}$/.test(symbol)) throw Object.assign(new Error("Invalid Saudi market symbol"), { status: 400 });
    const rows = await base44.asServiceRole.entities.Instrument.filter({ symbol });
    if (!rows[0]) throw Object.assign(new Error("Instrument not found"), { status: 404 });
    return rows[0];
  }
  if (!body.instrument_id) throw Object.assign(new Error("symbol or instrument_id is required"), { status: 400 });
  const instrument = await base44.asServiceRole.entities.Instrument.get(String(body.instrument_id));
  if (!instrument) throw Object.assign(new Error("Instrument not found"), { status: 404 });
  return instrument;
}
async function checksum(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes)).map((item) => item.toString(16).padStart(2, "0")).join("");
}
async function yahooCandles(symbol, interval, range) {
  const response = await fetch(`${YAHOO_CHART}/${symbol}.SR?interval=${interval}&range=${range}&events=div%2Csplits`, {
    headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 KMY-Saudi-Market/2.0" }
  });
  if (!response.ok) throw Object.assign(new Error(`Market chart source unavailable (${response.status})`), { status: 502 });
  const result = (await response.json())?.chart?.result?.[0];
  if (!result?.timestamp?.length) throw Object.assign(new Error("Market chart source returned no candles"), { status: 502 });
  const values = result.indicators?.quote?.[0] || {};
  const candles = result.timestamp.map((timestamp, index) => ({
    time: new Date(timestamp * 1e3).toISOString(),
    open: Number(values.open?.[index]),
    high: Number(values.high?.[index]),
    low: Number(values.low?.[index]),
    close: Number(values.close?.[index]),
    volume: Number(values.volume?.[index] || 0)
  })).filter((bar) => [bar.open, bar.high, bar.low, bar.close].every(Number.isFinite) && bar.high >= bar.low && bar.volume >= 0);
  if (!candles.length) throw Object.assign(new Error("Market chart source returned no valid candles"), { status: 502 });
  const lastTimestamp = result.meta?.regularMarketTime || result.timestamp[result.timestamp.length - 1];
  return { candles, asOf: new Date(lastTimestamp * 1e3).toISOString() };
}
async function chartResponse(base44, body, sources) {
  const instrument = await instrumentFor(base44, body);
  const interval = String(body.interval || "1d");
  const range = String(body.range || "3mo");
  if (!ALLOWED_INTERVALS.has(interval) || !ALLOWED_RANGES.has(range)) {
    throw Object.assign(new Error("Unsupported chart interval or range"), { status: 400 });
  }
  let yahoo = sources.find((item) => item.code === "YAHOO_FINANCE_SA_DELAYED");
  if (!yahoo) {
    yahoo = await base44.asServiceRole.entities.DataSource.create({
      code: "YAHOO_FINANCE_SA_DELAYED",
      name: "Yahoo Finance \u2014 Saudi delayed chart",
      source_type: "reference",
      license_status: "restricted",
      base_url: "https://finance.yahoo.com/",
      last_verified_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  const result = await yahooCandles(instrument.symbol, interval, range);
  const chunkKey = `${instrument.symbol}-${interval}-${range}`;
  const row = {
    instrument_id: instrument.id,
    symbol: instrument.symbol,
    interval,
    chunk_key: chunkKey,
    start_time: result.candles[0].time,
    end_time: result.candles[result.candles.length - 1].time,
    bars: result.candles,
    bar_count: result.candles.length,
    checksum: await checksum(result.candles),
    source_id: yahoo.id,
    quality_status: "verified"
  };
  const existing = await base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: instrument.id, interval, chunk_key: chunkKey });
  if (existing[0]) await base44.asServiceRole.entities.CandleChunk.update(existing[0].id, row);
  else await base44.asServiceRole.entities.CandleChunk.create(row);
  return {
    candles: result.candles,
    source: yahoo,
    as_of: result.asOf,
    data_state: stateFor(result.asOf, yahoo)
  };
}
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    await requireMarketAccess(base44, body);
    const sources = await base44.asServiceRole.entities.DataSource.list("-last_verified_at", 20);
    const sourceById = new Map(sources.map((item) => [item.id, item]));
    if (body.action === "chart") return Response.json(await chartResponse(base44, body, sources));
    if (body.symbol || body.instrument_id) {
      const instrument = await instrumentFor(base44, body);
      const [quotes2, indicators2, financials, actions, shareholders, losses2] = await Promise.all([
        base44.asServiceRole.entities.QuoteLatest.filter({ instrument_id: instrument.id }),
        base44.asServiceRole.entities.IndicatorSnapshot.filter({ instrument_id: instrument.id }),
        base44.asServiceRole.entities.CompanyFinancial.filter({ instrument_id: instrument.id }),
        base44.asServiceRole.entities.CorporateAction.filter({ instrument_id: instrument.id }),
        base44.asServiceRole.entities.MajorShareholder.filter({ instrument_id: instrument.id }),
        base44.asServiceRole.entities.LossClassification.filter({ instrument_id: instrument.id })
      ]);
      const quote = quotes2.sort((a, b) => new Date(b.quote_time).getTime() - new Date(a.quote_time).getTime())[0] || null;
      const source = quote ? sourceById.get(quote.source_id) : null;
      return Response.json({
        instrument: { ...instrument, warning_flag: losses2[0]?.level === "none" ? null : losses2[0]?.level },
        quote: quote ? { ...quote, data_state: stateFor(quote.quote_time, source), source } : null,
        indicators: indicators2,
        financials,
        actions,
        shareholders,
        loss_classification: losses2[0] || null,
        notice: "\u0628\u064A\u0627\u0646\u0627\u062A \u062D\u0642\u064A\u0642\u064A\u0629 \u0645\u0631\u062C\u0639\u064A\u0629 \u0645\u062A\u0623\u062E\u0631\u0629 \u2014 \u0627\u0644\u0645\u0635\u062F\u0631 \u0648\u0627\u0644\u0648\u0642\u062A \u0645\u0648\u0636\u062D\u0627\u0646"
      });
    }
    const limit = Math.min(Math.max(Number(body.limit || 500), 1), 500);
    const [instruments, quotes, indicators, losses] = await Promise.all([
      base44.asServiceRole.entities.Instrument.list("symbol", 500),
      base44.asServiceRole.entities.QuoteLatest.list("-quote_time", 500),
      body.mode === "screener" ? base44.asServiceRole.entities.IndicatorSnapshot.list("-source_as_of", 500) : Promise.resolve([]),
      base44.asServiceRole.entities.LossClassification.list("-as_of", 500)
    ]);
    const quoteByInstrument = /* @__PURE__ */ new Map();
    for (const quote of quotes) if (!quoteByInstrument.has(quote.instrument_id)) quoteByInstrument.set(quote.instrument_id, quote);
    const indicatorByInstrument = new Map(indicators.map((item) => [item.instrument_id, item]));
    const lossByInstrument = new Map(losses.map((item) => [item.instrument_id, item]));
    const query = String(body.query || "").trim().toLocaleLowerCase("ar");
    const sector = String(body.sector || "").trim();
    let rows = instruments.map((instrument) => {
      const quote = quoteByInstrument.get(instrument.id) || null;
      const source = quote ? sourceById.get(quote.source_id) : null;
      const loss = lossByInstrument.get(instrument.id) || null;
      return {
        ...instrument,
        warning_flag: loss?.level === "none" ? null : loss?.level,
        quote: quote ? { ...quote, data_state: stateFor(quote.quote_time, source), source } : null,
        indicator: indicatorByInstrument.get(instrument.id) || null
      };
    }).filter((item) => !query || `${item.symbol} ${item.name_ar} ${item.name_en} ${item.sector_ar} ${item.sector_en}`.toLocaleLowerCase("ar").includes(query)).filter((item) => !sector || item.sector_ar === sector || item.sector_en === sector);
    if (body.mode === "movers") rows.sort((a, b) => Number(b.quote?.change_percent || 0) - Number(a.quote?.change_percent || 0));
    return Response.json({
      instruments: rows.slice(0, limit),
      total: instruments.length,
      sources,
      notice: "\u0628\u064A\u0627\u0646\u0627\u062A \u062D\u0642\u064A\u0642\u064A\u0629 \u0645\u0631\u062C\u0639\u064A\u0629 \u0645\u062A\u0623\u062E\u0631\u0629 \u2014 \u0627\u0644\u0645\u0635\u062F\u0631 \u0648\u0627\u0644\u0648\u0642\u062A \u0645\u0648\u0636\u062D\u0627\u0646"
    });
  } catch (error) {
    return replyError(error);
  }
});
