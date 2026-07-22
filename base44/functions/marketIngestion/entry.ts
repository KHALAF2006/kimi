import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import catalog from '../../data/official-main-market-catalog-2026-07-21.json' with { type: 'json' };
import { requireRole, replyError } from '../../shared/security.ts';
import { calculateMomentumZones, MOMENTUM_FORMULA_VERSION } from '../../shared/momentum.ts';

const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';
const SAUDI_PROFILE = 'https://www.saudiexchange.sa/wps/portal/saudiexchange/hidden/company-profile-main?companySymbol=';

async function source(base44, code, data) {
  const rows = await base44.asServiceRole.entities.DataSource.filter({ code });
  return rows[0]
    ? await base44.asServiceRole.entities.DataSource.update(rows[0].id, data)
    : await base44.asServiceRole.entities.DataSource.create({ code, ...data });
}

async function checksum(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes)).map((item) => item.toString(16).padStart(2, '0')).join('');
}

async function upsertMany(base44, entity, rows, keyFields) {
  if (!rows.length) return;
  const existing = await base44.asServiceRole.entities[entity].list('-updated_date', 5000);
  const key = (row) => keyFields.map((field) => row[field]).join('|');
  const byKey = new Map(existing.map((row) => [key(row), row]));
  const creates = rows.filter((row) => !byKey.has(key(row)));
  const updates = rows.filter((row) => byKey.has(key(row))).map((row) => ({ id: byKey.get(key(row)).id, ...row }));
  if (creates.length) await base44.asServiceRole.entities[entity].bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities[entity].bulkUpdate(updates);
}

function riyadhClock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, weekday: parts.weekday, hour: Number(parts.hour), minute: Number(parts.minute) };
}

async function shouldRunScheduled(base44, body) {
  if (!String(body.source || '').startsWith('scheduled') || body.force === true) return { run: true };
  const clock = riyadhClock();
  if (!['Sun', 'Mon', 'Tue', 'Wed', 'Thu'].includes(clock.weekday)) return { run: false, reason: 'non_trading_weekday', clock };
  if (clock.hour < 10 || clock.hour > 16 || (clock.hour === 16 && clock.minute > 0)) return { run: false, reason: 'outside_market_window', clock };
  const holidays = await base44.asServiceRole.entities.MarketHoliday.filter({ holiday_date: clock.date });
  if (holidays.length) return { run: false, reason: 'official_market_holiday', clock };
  return { run: true, clock };
}

function exactInstrument(row) {
  return {
    symbol: row.symbol,
    name_ar: row.nameAr,
    name_en: row.nameEn,
    sector_ar: row.sectorAr,
    sector_en: row.sectorEn,
    market: 'Saudi Main Market',
    currency: 'SAR',
    status: 'active',
    official_url: SAUDI_PROFILE + row.symbol,
  };
}

function officialQuote(row, instrumentId, sourceId) {
  const last = Number(row.officialQuote?.lastPrice);
  const percent = Number(row.officialQuote?.changePercent || 0);
  const previous = percent === -100 ? null : last / (1 + percent / 100);
  return {
    instrument_id: instrumentId,
    symbol: row.symbol,
    last_price: last,
    previous_close: previous,
    change_value: previous == null ? null : last - previous,
    change_percent: percent,
    open: Number(row.officialQuote?.openPrice),
    high: Number(row.officialQuote?.highPrice),
    low: Number(row.officialQuote?.lowPrice),
    volume: Number(row.officialQuote?.volume || 0),
    trade_count: Number(row.officialQuote?.tradeCount || 0),
    traded_value: Number(row.officialQuote?.tradedValue || 0),
    market_cap: Number(row.officialQuote?.marketCap || 0),
    source_id: sourceId,
    quote_time: catalog.quoteTime,
    quality_status: 'verified',
  };
}

function lossClassification(row, instrumentId, sourceId) {
  const level = row.warningFlag || 'none';
  const labels = {
    none: ['لا يوجد تصنيف خسائر متراكمة', 'No accumulated-loss flag'],
    yellow: ['خسائر متراكمة من 20% إلى أقل من 35%', 'Accumulated losses from 20% to below 35%'],
    orange: ['خسائر متراكمة من 35% إلى أقل من 50%', 'Accumulated losses from 35% to below 50%'],
    red: ['خسائر متراكمة 50% فأكثر', 'Accumulated losses of 50% or more'],
  };
  return { instrument_id: instrumentId, level, label_ar: labels[level][0], label_en: labels[level][1], source_id: sourceId, as_of: catalog.quoteTime };
}

async function yahooHistory(instrument, yahooSourceId) {
  const response = await fetch(`${YAHOO_CHART}/${instrument.symbol}.SR?interval=1d&range=2y&events=div%2Csplits`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 KMY-Saudi-Market/2.0' },
  });
  if (!response.ok) throw new Error(`Yahoo chart ${response.status}`);
  const result = (await response.json())?.chart?.result?.[0];
  if (!result?.timestamp?.length) throw new Error('Yahoo chart returned no timestamps');
  const values = result.indicators?.quote?.[0] || {};
  const bars = result.timestamp.map((timestamp, index) => ({
    time: new Date(timestamp * 1000).toISOString(),
    open: Number(values.open?.[index]), high: Number(values.high?.[index]),
    low: Number(values.low?.[index]), close: Number(values.close?.[index]),
    volume: Number(values.volume?.[index] || 0),
  })).filter((bar) => [bar.open, bar.high, bar.low, bar.close].every(Number.isFinite) && bar.high >= bar.low && bar.volume >= 0);
  if (bars.length < 2) throw new Error('Yahoo chart returned insufficient valid bars');
  const meta = result.meta || {};
  const last = bars[bars.length - 1];
  const previous = bars[bars.length - 2];
  const previousClose = Number(meta.chartPreviousClose ?? previous.close);
  const quoteTime = new Date((meta.regularMarketTime || result.timestamp[result.timestamp.length - 1]) * 1000).toISOString();
  const momentum = calculateMomentumZones(bars);
  return {
    quote: {
      instrument_id: instrument.id, symbol: instrument.symbol, last_price: last.close,
      previous_close: previousClose, change_value: last.close - previousClose,
      change_percent: previousClose ? ((last.close - previousClose) / previousClose) * 100 : 0,
      open: last.open, high: last.high, low: last.low, volume: last.volume,
      week52_high: Number(meta.fiftyTwoWeekHigh), week52_low: Number(meta.fiftyTwoWeekLow),
      source_id: yahooSourceId, quote_time: quoteTime, quality_status: 'verified',
    },
    candle: {
      instrument_id: instrument.id, symbol: instrument.symbol, interval: '1d', chunk_key: `${instrument.symbol}-1d-2y`,
      start_time: bars[0].time, end_time: last.time, bars, bar_count: bars.length,
      checksum: await checksum(bars), source_id: yahooSourceId, quality_status: 'verified',
    },
    indicator: momentum ? {
      instrument_id: instrument.id, symbol: instrument.symbol, indicator_key: 'momentum_zones', timeframe: '1d',
      values: momentum, source_as_of: quoteTime, calculated_at: new Date().toISOString(), formula_version: MOMENTUM_FORMULA_VERSION,
    } : null,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    await requireRole(base44, ['admin', 'owner']);
    const body = await req.json();
    const startedAt = new Date().toISOString();
    const schedule = await shouldRunScheduled(base44, body);
    if (!schedule.run) return Response.json({ status: 'skipped', reason: schedule.reason, clock: schedule.clock });

    const officialSource = await source(base44, 'SAUDI_EXCHANGE_DAILY_REFERENCE', {
      name: 'تداول السعودية — التقرير اليومي التفصيلي', source_type: 'official', license_status: 'restricted',
      base_url: catalog.sourceUrl, last_verified_at: catalog.quoteTime,
    });
    const yahooSource = await source(base44, 'YAHOO_FINANCE_SA_DELAYED', {
      name: 'Yahoo Finance — Saudi delayed chart', source_type: 'reference', license_status: 'restricted',
      base_url: 'https://finance.yahoo.com/', last_verified_at: new Date().toISOString(),
    });

    await upsertMany(base44, 'Instrument', catalog.companies.map(exactInstrument), ['symbol']);
    const instruments = await base44.asServiceRole.entities.Instrument.list('symbol', 500);
    const bySymbol = new Map(instruments.map((row) => [row.symbol, row]));
    if (instruments.length < 270) throw new Error(`Verified main-market catalog is incomplete: ${instruments.length}/270`);

    const officialQuotes = [];
    const lossRows = [];
    for (const row of catalog.companies) {
      const instrument = bySymbol.get(row.symbol);
      if (!instrument) continue;
      officialQuotes.push(officialQuote(row, instrument.id, officialSource.id));
      lossRows.push(lossClassification(row, instrument.id, officialSource.id));
    }
    await upsertMany(base44, 'QuoteLatest', officialQuotes, ['instrument_id']);
    await upsertMany(base44, 'LossClassification', lossRows, ['instrument_id']);

    const batchSize = Math.min(Math.max(Number(body.batch_size || 270), 1), 500);
    const selected = instruments.slice(0, batchSize);
    const successes = [];
    const failures = [];
    for (let index = 0; index < selected.length; index += 12) {
      const group = selected.slice(index, index + 12);
      const settled = await Promise.allSettled(group.map((instrument) => yahooHistory(instrument, yahooSource.id)));
      settled.forEach((result, offset) => {
        if (result.status === 'fulfilled') successes.push(result.value);
        else failures.push({ symbol: group[offset].symbol, error: result.reason?.message || 'Yahoo history failed' });
      });
    }
    await upsertMany(base44, 'QuoteLatest', successes.map((item) => item.quote), ['instrument_id']);
    await upsertMany(base44, 'CandleChunk', successes.map((item) => item.candle), ['instrument_id', 'interval', 'chunk_key']);
    await upsertMany(base44, 'IndicatorSnapshot', successes.map((item) => item.indicator).filter(Boolean), ['instrument_id', 'indicator_key', 'timeframe']);

    const status = failures.length ? (successes.length ? 'partial' : 'failed') : 'success';
    await base44.asServiceRole.entities.IngestionRun.create({
      run_type: body.source || 'manual_verified_sync', started_at: startedAt, finished_at: new Date().toISOString(),
      total_records: selected.length, success_count: successes.length, failed_count: failures.length, status,
      source_id: yahooSource.id,
      notes: JSON.stringify({ catalog_count: instruments.length, official_catalog_date: catalog.marketDate, yahoo_failures: failures.slice(0, 30) }),
    });
    return Response.json({
      status, catalog_count: instruments.length, exact_names_source: catalog.sourceUrl, official_catalog_date: catalog.marketDate,
      yahoo_success_count: successes.length, yahoo_failure_count: failures.length, failures: failures.slice(0, 30),
      mode: 'verified_delayed_reference', last_updated_at: new Date().toISOString(),
    });
  } catch (error) {
    return replyError(error);
  }
});
