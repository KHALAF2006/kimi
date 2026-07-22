import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { requireRole, replyError } from '../../shared/security.ts';

const tadawulUrl = 'https://www.saudiexchange.sa/wps/portal/saudiexchange/trading/market-services/market-information-services/market-data';
const yahooBase = 'https://query1.finance.yahoo.com/v8/finance/chart';

async function source(base44, code, data) {
  const rows = await base44.asServiceRole.entities.DataSource.filter({ code });
  if (rows[0]) return await base44.asServiceRole.entities.DataSource.update(rows[0].id, data);
  return await base44.asServiceRole.entities.DataSource.create({ code, ...data });
}

function officialRows(html) {
  const pattern = /company:\s*"(\d{4})"[\s\S]*?companyDisplay:\s*"([^"]+)"[\s\S]*?price:\s*"([\d.]+)"[\s\S]*?change:\s*"(-?[\d.]+)"[\s\S]*?changePercent:\s*"(-?[\d.]+)"/g;
  const found = [...html.matchAll(pattern)].map((match) => ({ symbol: match[1], name: match[2].trim(), price: Number(match[3]), change: Number(match[4]), changePercent: Number(match[5]) }));
  return [...new Map(found.map((row) => [row.symbol, row])).values()];
}

async function checksum(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes)).map((x) => x.toString(16).padStart(2, '0')).join('');
}

async function yahooRecord(row, yahooSourceId) {
  const response = await fetch(`${yahooBase}/${row.symbol}.SR?interval=1d&range=1y`, { headers: { 'User-Agent': 'Mozilla/5.0 KMY-Market-Reference/1.0' } });
  if (!response.ok) throw new Error(`Yahoo ${response.status}`);
  const result = (await response.json())?.chart?.result?.[0];
  if (!result?.timestamp?.length) throw new Error('Yahoo returned no bars');
  const quote = result.indicators?.quote?.[0] || {};
  const bars = result.timestamp.map((time, index) => ({ time: new Date(time * 1000).toISOString(), open: Number(quote.open?.[index]), high: Number(quote.high?.[index]), low: Number(quote.low?.[index]), close: Number(quote.close?.[index]), volume: Number(quote.volume?.[index] || 0) })).filter((bar) => [bar.open, bar.high, bar.low, bar.close].every(Number.isFinite));
  const meta = result.meta || {};
  const last = bars[bars.length - 1];
  const previous = bars[bars.length - 2];
  const previousClose = Number(meta.chartPreviousClose ?? previous?.close ?? last.close);
  const change = Number(last.close - previousClose);
  const quoteTime = new Date((meta.regularMarketTime || result.timestamp[result.timestamp.length - 1]) * 1000).toISOString();
  return {
    quote: { instrument_id: row.id, symbol: row.symbol, last_price: last.close, previous_close: previousClose, change_value: change, change_percent: previousClose ? change / previousClose * 100 : 0, open: last.open, high: last.high, low: last.low, volume: last.volume, source_id: yahooSourceId, quote_time: quoteTime, quality_status: 'verified' },
    candle: { instrument_id: row.id, symbol: row.symbol, interval: '1d', chunk_key: `${row.symbol}-1d-1y`, start_time: bars[0].time, end_time: last.time, bars, bar_count: bars.length, checksum: await checksum(bars), source_id: yahooSourceId, quality_status: 'verified' },
    indicator: { instrument_id: row.id, symbol: row.symbol, indicator_key: 'momentum_zones', timeframe: '1d', values: { low: Math.min(...bars.slice(-20).map((bar) => bar.close)), high: Math.max(...bars.slice(-20).map((bar) => bar.close)), last: last.close, direction: last.close >= bars[Math.max(0, bars.length - 20)].close ? 'up' : 'down' }, source_as_of: quoteTime, calculated_at: new Date().toISOString(), formula_version: 'momentum-zones-v1' }
  };
}

async function upsertMany(base44, entity, rows, keyFields) {
  if (!rows.length) return;
  const existing = await base44.asServiceRole.entities[entity].list('-updated_date', 500);
  const key = (row) => keyFields.map((field) => row[field]).join('|');
  const map = new Map(existing.map((row) => [key(row), row]));
  const creates = rows.filter((row) => !map.has(key(row)));
  const updates = rows.filter((row) => map.has(key(row))).map((row) => ({ id: map.get(key(row)).id, ...row }));
  if (creates.length) await base44.asServiceRole.entities[entity].bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities[entity].bulkUpdate(updates);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    await requireRole(base44, ['admin', 'owner']);
    const body = await req.json();
    const startedAt = new Date().toISOString();
    let catalog = [];
    let tadawulAvailable = false;
    try {
      const htmlResponse = await fetch(tadawulUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'ar,en;q=0.9', 'Referer': 'https://www.saudiexchange.sa/' } });
      if (htmlResponse.ok) {
        catalog = officialRows(await htmlResponse.text());
        tadawulAvailable = catalog.length >= 270;
      }
    } catch { tadawulAvailable = false; }

    const now = new Date().toISOString();
    const tadawul = await source(base44, 'SAUDI_EXCHANGE_REFERENCE', { name: 'تداول السعودية — بيانات موقع متأخرة', source_type: 'official', license_status: 'restricted', base_url: 'https://www.saudiexchange.sa/', last_verified_at: now });
    const yahoo = await source(base44, 'YAHOO_FINANCE_SA_DELAYED', { name: 'Yahoo Finance — Saudi delayed quotes', source_type: 'reference', license_status: 'restricted', base_url: 'https://finance.yahoo.com/', last_verified_at: now });

    const existingInstruments = await base44.asServiceRole.entities.Instrument.list('symbol', 500);
    if (!tadawulAvailable && !existingInstruments.length) throw new Error('Saudi Exchange unavailable and no verified catalog is cached');
    const instrumentMap = new Map(existingInstruments.map((row) => [row.symbol, row]));
    const instrumentCreates = catalog.filter((row) => !instrumentMap.has(row.symbol)).map((row) => ({ symbol: row.symbol, name_ar: row.name, name_en: row.name, sector_ar: 'غير مصنف', sector_en: 'Unclassified', market: 'Saudi Main Market', currency: 'SAR', status: 'active', official_url: `https://www.saudiexchange.sa/wps/portal/saudiexchange/hidden/company-profile-main?companySymbol=${row.symbol}` }));
    if (instrumentCreates.length) await base44.asServiceRole.entities.Instrument.bulkCreate(instrumentCreates);
    const instruments = await base44.asServiceRole.entities.Instrument.list('symbol', 500);
    const bySymbol = new Map(instruments.map((row) => [row.symbol, row]));

    if (tadawulAvailable) {
      const tadawulQuotes = catalog.map((row) => { const instrument = bySymbol.get(row.symbol); return { instrument_id: instrument.id, symbol: row.symbol, last_price: row.price, change_value: row.change, change_percent: row.changePercent, previous_close: row.price - row.change, source_id: tadawul.id, quote_time: now, quality_status: 'verified' }; });
      await upsertMany(base44, 'QuoteLatest', tadawulQuotes, ['instrument_id']);
    }

    let cursor = Number.isInteger(body.cursor) ? body.cursor : null;
    if (cursor === null) {
      const previousRuns = await base44.asServiceRole.entities.IngestionRun.list('-started_at', 1);
      try { cursor = Number(JSON.parse(previousRuns[0]?.notes || '{}').next_cursor || 0); } catch { cursor = 0; }
    }
    const batchSize = Math.min(Math.max(Number(body.batch_size || 60), 1), 100);
    const selected = instruments.slice(cursor, cursor + batchSize);
    const successes = [];
    const failures = [];
    for (let index = 0; index < selected.length; index += 8) {
      const group = selected.slice(index, index + 8);
      const settled = await Promise.allSettled(group.map((row) => yahooRecord(row, yahoo.id)));
      settled.forEach((result, offset) => result.status === 'fulfilled' ? successes.push(result.value) : failures.push({ symbol: group[offset].symbol, error: result.reason?.message || 'Yahoo failed' }));
    }
    await upsertMany(base44, 'QuoteLatest', successes.map((row) => row.quote), ['instrument_id']);
    await upsertMany(base44, 'CandleChunk', successes.map((row) => row.candle), ['instrument_id', 'interval', 'chunk_key']);
    await upsertMany(base44, 'IndicatorSnapshot', successes.map((row) => row.indicator), ['instrument_id', 'indicator_key', 'timeframe']);
    const nextCursor = cursor + selected.length >= instruments.length ? 0 : cursor + selected.length;
    const status = failures.length ? (successes.length ? 'partial' : 'failed') : 'success';
    await base44.asServiceRole.entities.IngestionRun.create({ run_type: body.source || 'manual_reference_sync', started_at: startedAt, finished_at: new Date().toISOString(), total_records: selected.length, success_count: successes.length, failed_count: failures.length, status, source_id: yahoo.id, notes: JSON.stringify({ cursor, next_cursor: nextCursor, catalog_count: instruments.length, failures: failures.slice(0, 20) }) });
    return Response.json({ status, mode: 'delayed_reference', catalog_count: instruments.length, yahoo_success_count: successes.length, yahoo_failure_count: failures.length, cursor, next_cursor: nextCursor, is_active: true, sources: [tadawul.name, yahoo.name], last_updated_at: now });
  } catch (error) {
    return replyError(error);
  }
});