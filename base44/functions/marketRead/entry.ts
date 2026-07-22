import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { requireUser, profileFor, requireActiveSession, replyError } from '../../shared/security.ts';

const CATALOG_URL = 'https://raw.githubusercontent.com/KHALAF2006/kimi/a398d051f9d19c6eec2c00fac0250842a23f3c13/base44/data/official-main-market-catalog-2026-07-21.json';
const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';
const ALLOWED_INTERVALS = new Set(['15m', '1h', '1d', '1wk', '1mo']);
const ALLOWED_RANGES = new Set(['5d', '1mo', '3mo', '1y', '2y', '5y', '10y', 'max']);

async function loadCatalog() {
  const response = await fetch(CATALOG_URL, { headers: { 'Accept': 'application/json' } });
  if (!response.ok) throw Object.assign(new Error(`Official catalog unavailable (${response.status})`), { status: 502 });
  const catalog = await response.json();
  if (!Array.isArray(catalog.companies) || catalog.companies.length < 270) throw Object.assign(new Error('Official main-market catalog is incomplete'), { status: 502 });
  return catalog;
}

function stateFor(value, source, now = Date.now()) {
  const age = value ? now - new Date(value).getTime() : Number.POSITIVE_INFINITY;
  return {
    label: age > 36 * 60 * 60 * 1000 ? 'متقادمة' : source?.source_type === 'official' ? 'مرجعية' : 'متأخرة',
    stale: age > 36 * 60 * 60 * 1000,
  };
}

async function requireMarketAccess(base44, body) {
  const user = await requireUser(base44);
  const profile = await profileFor(base44, user);
  await requireActiveSession(base44, profile, body.session_id);
  if (!profile || ['suspended', 'banned', 'closed'].includes(profile.account_status)) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  if (!['admin', 'owner'].includes(profile.role)) {
    const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ customer_id: profile.id, status: 'active' });
    const active = subscriptions.some((item) => new Date(item.ends_at) > new Date());
    if (!active) throw Object.assign(new Error('Active subscription required'), { status: 403 });
  }
  return { user, profile };
}

async function instrumentFor(base44, body) {
  const symbol = String(body.symbol || '').trim();
  if (symbol) {
    if (!/^\d{4}$/.test(symbol)) throw Object.assign(new Error('Invalid Saudi market symbol'), { status: 400 });
    const rows = await base44.asServiceRole.entities.Instrument.filter({ symbol });
    if (!rows[0]) throw Object.assign(new Error('Instrument not found'), { status: 404 });
    return rows[0];
  }
  if (!body.instrument_id) throw Object.assign(new Error('symbol or instrument_id is required'), { status: 400 });
  const instrument = await base44.asServiceRole.entities.Instrument.get(String(body.instrument_id));
  if (!instrument) throw Object.assign(new Error('Instrument not found'), { status: 404 });
  return instrument;
}

async function checksum(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes)).map((item) => item.toString(16).padStart(2, '0')).join('');
}

async function yahooCandles(symbol, interval, range) {
  const response = await fetch(`${YAHOO_CHART}/${symbol}.SR?interval=${interval}&range=${range}&events=div%2Csplits`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 KMY-Saudi-Market/2.0' },
  });
  if (!response.ok) throw Object.assign(new Error(`Market chart source unavailable (${response.status})`), { status: 502 });
  const result = (await response.json())?.chart?.result?.[0];
  if (!result?.timestamp?.length) throw Object.assign(new Error('Market chart source returned no candles'), { status: 502 });
  const values = result.indicators?.quote?.[0] || {};
  const candles = result.timestamp.map((timestamp, index) => ({
    time: new Date(timestamp * 1000).toISOString(),
    open: Number(values.open?.[index]), high: Number(values.high?.[index]),
    low: Number(values.low?.[index]), close: Number(values.close?.[index]),
    volume: Number(values.volume?.[index] || 0),
  })).filter((bar) => [bar.open, bar.high, bar.low, bar.close].every(Number.isFinite) && bar.high >= bar.low && bar.volume >= 0);
  if (!candles.length) throw Object.assign(new Error('Market chart source returned no valid candles'), { status: 502 });
  const lastTimestamp = result.meta?.regularMarketTime || result.timestamp[result.timestamp.length - 1];
  return { candles, asOf: new Date(lastTimestamp * 1000).toISOString() };
}

async function chartResponse(base44, body, sources) {
  const instrument = await instrumentFor(base44, body);
  const interval = String(body.interval || '1d');
  const range = String(body.range || '3mo');
  if (!ALLOWED_INTERVALS.has(interval) || !ALLOWED_RANGES.has(range)) {
    throw Object.assign(new Error('Unsupported chart interval or range'), { status: 400 });
  }
  let yahoo = sources.find((item) => item.code === 'YAHOO_FINANCE_SA_DELAYED');
  if (!yahoo) {
    yahoo = await base44.asServiceRole.entities.DataSource.create({
      code: 'YAHOO_FINANCE_SA_DELAYED', name: 'Yahoo Finance — Saudi delayed chart', source_type: 'reference',
      license_status: 'restricted', base_url: 'https://finance.yahoo.com/', last_verified_at: new Date().toISOString(),
    });
  }
  const result = await yahooCandles(instrument.symbol, interval, range);
  const chunkKey = `${instrument.symbol}-${interval}-${range}`;
  const row = {
    instrument_id: instrument.id, symbol: instrument.symbol, interval, chunk_key: chunkKey,
    start_time: result.candles[0].time, end_time: result.candles[result.candles.length - 1].time,
    bars: result.candles, bar_count: result.candles.length, checksum: await checksum(result.candles),
    source_id: yahoo.id, quality_status: 'verified',
  };
  const existing = await base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: instrument.id, interval, chunk_key: chunkKey });
  if (existing[0]) await base44.asServiceRole.entities.CandleChunk.update(existing[0].id, row);
  else await base44.asServiceRole.entities.CandleChunk.create(row);
  return {
    candles: result.candles,
    source: yahoo,
    as_of: result.asOf,
    data_state: stateFor(result.asOf, yahoo),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    await requireMarketAccess(base44, body);
    const [sources, catalog] = await Promise.all([
      base44.asServiceRole.entities.DataSource.list('-last_verified_at', 20),
      loadCatalog(),
    ]);
    const sourceById = new Map(sources.map((item) => [item.id, item]));

    if (body.action === 'chart') return Response.json(await chartResponse(base44, body, sources));

    if (body.symbol || body.instrument_id) {
      const instrument = await instrumentFor(base44, body);
      const [quotes, indicators, financials, actions, shareholders, losses] = await Promise.all([
        base44.asServiceRole.entities.QuoteLatest.filter({ instrument_id: instrument.id }),
        base44.asServiceRole.entities.IndicatorSnapshot.filter({ instrument_id: instrument.id }),
        base44.asServiceRole.entities.CompanyFinancial.filter({ instrument_id: instrument.id }),
        base44.asServiceRole.entities.CorporateAction.filter({ instrument_id: instrument.id }),
        base44.asServiceRole.entities.MajorShareholder.filter({ instrument_id: instrument.id }),
        base44.asServiceRole.entities.LossClassification.filter({ instrument_id: instrument.id }),
      ]);
      const quote = quotes.sort((a, b) => new Date(b.quote_time).getTime() - new Date(a.quote_time).getTime())[0] || null;
      const source = quote ? sourceById.get(quote.source_id) : null;
      return Response.json({
        instrument: { ...instrument, warning_flag: losses[0]?.level === 'none' ? null : losses[0]?.level },
        quote: quote ? { ...quote, data_state: stateFor(quote.quote_time, source), source } : null,
        indicators, financials, actions, shareholders, loss_classification: losses[0] || null,
        notice: 'بيانات حقيقية مرجعية متأخرة — المصدر والوقت موضحان',
      });
    }

    const limit = Math.min(Math.max(Number(body.limit || 500), 1), 500);
    const catalogSymbols = new Set(catalog.companies.map((item) => item.symbol));
    const [allInstruments, quotes, indicators, losses] = await Promise.all([
      base44.asServiceRole.entities.Instrument.list('symbol', 500),
      base44.asServiceRole.entities.QuoteLatest.list('-quote_time', 500),
      body.mode === 'screener' ? base44.asServiceRole.entities.IndicatorSnapshot.list('-source_as_of', 500) : Promise.resolve([]),
      base44.asServiceRole.entities.LossClassification.list('-as_of', 500),
    ]);
    const instruments = allInstruments.filter((instrument) => catalogSymbols.has(instrument.symbol));
    const quoteByInstrument = new Map();
    for (const quote of quotes) if (!quoteByInstrument.has(quote.instrument_id)) quoteByInstrument.set(quote.instrument_id, quote);
    const indicatorByInstrument = new Map(indicators.map((item) => [item.instrument_id, item]));
    const lossByInstrument = new Map(losses.map((item) => [item.instrument_id, item]));
    const query = String(body.query || '').trim().toLocaleLowerCase('ar');
    const sector = String(body.sector || '').trim();
    let rows = instruments.map((instrument) => {
      const quote = quoteByInstrument.get(instrument.id) || null;
      const source = quote ? sourceById.get(quote.source_id) : null;
      const loss = lossByInstrument.get(instrument.id) || null;
      return {
        ...instrument,
        warning_flag: loss?.level === 'none' ? null : loss?.level,
        quote: quote ? { ...quote, data_state: stateFor(quote.quote_time, source), source } : null,
        indicator: indicatorByInstrument.get(instrument.id) || null,
      };
    }).filter((item) => !query || `${item.symbol} ${item.name_ar} ${item.name_en} ${item.sector_ar} ${item.sector_en}`.toLocaleLowerCase('ar').includes(query))
      .filter((item) => !sector || item.sector_ar === sector || item.sector_en === sector);
    if (body.mode === 'movers') rows.sort((a, b) => Number(b.quote?.change_percent || 0) - Number(a.quote?.change_percent || 0));
    return Response.json({
      instruments: rows.slice(0, limit), total: instruments.length, sources,
      notice: 'بيانات حقيقية مرجعية متأخرة — المصدر والوقت موضحان',
    });
  } catch (error) {
    return replyError(error);
  }
});