import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { requireUser, profileFor, requireActiveSession, replyError } from '../../shared/security.ts';

function stateFor(value, source, now) {
  const age = value ? now - new Date(value).getTime() : Infinity;
  return { label: age > 36 * 60 * 60 * 1000 ? 'متقادمة' : source?.source_type === 'official' ? 'مرجعية' : 'متأخرة', stale: age > 36 * 60 * 60 * 1000 };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const profile = await profileFor(base44, user);
    const body = await req.json();
    await requireActiveSession(base44, profile, body.session_id);
    if (['suspended', 'banned', 'closed'].includes(profile.account_status)) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const admin = ['admin', 'owner'].includes(profile.role);
    if (!admin) {
      const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ customer_id: profile.id, status: 'active' });
      if (!subscriptions.some((item) => new Date(item.ends_at) > new Date())) return Response.json({ error: 'Active subscription required' }, { status: 403 });
    }
    const sources = await base44.asServiceRole.entities.DataSource.list('-last_verified_at', 10);
    const sourceMap = new Map(sources.map((item) => [item.id, item]));
    const now = Date.now();
    if (body.instrument_id) {
      const instrument = await base44.asServiceRole.entities.Instrument.get(body.instrument_id);
      const [quotes, candles, indicators, financials, actions, shareholders] = await Promise.all([
        base44.asServiceRole.entities.QuoteLatest.filter({ instrument_id: body.instrument_id }),
        base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: body.instrument_id }),
        base44.asServiceRole.entities.IndicatorSnapshot.filter({ instrument_id: body.instrument_id }),
        base44.asServiceRole.entities.CompanyFinancial.filter({ instrument_id: body.instrument_id }),
        base44.asServiceRole.entities.CorporateAction.filter({ instrument_id: body.instrument_id }),
        base44.asServiceRole.entities.MajorShareholder.filter({ instrument_id: body.instrument_id })
      ]);
      const quote = quotes[0] || null;
      const source = quote ? sourceMap.get(quote.source_id) : null;
      return Response.json({ instrument, quote: quote ? { ...quote, data_state: stateFor(quote.quote_time, source, now), source } : null, candles, indicators, financials, actions, shareholders, notice: 'بيانات مرجعية متأخرة — المصدر والوقت موضحان' });
    }
    const limit = Math.min(Number(body.limit || 500), 500);
    const [instruments, quotes, indicators] = await Promise.all([
      base44.asServiceRole.entities.Instrument.list('symbol', 500),
      base44.asServiceRole.entities.QuoteLatest.list('-quote_time', 500),
      body.mode === 'screener' ? base44.asServiceRole.entities.IndicatorSnapshot.list('-source_as_of', 500) : Promise.resolve([])
    ]);
    const quoteMap = new Map(quotes.map((item) => [item.instrument_id, item]));
    const indicatorMap = new Map(indicators.map((item) => [item.instrument_id, item]));
    const query = String(body.query || '').trim().toLowerCase();
    const sector = String(body.sector || '').trim();
    let rows = instruments.map((instrument) => {
      const quote = quoteMap.get(instrument.id) || null;
      const source = quote ? sourceMap.get(quote.source_id) : null;
      return { ...instrument, quote: quote ? { ...quote, data_state: stateFor(quote.quote_time, source, now), source } : null, indicator: indicatorMap.get(instrument.id) || null };
    }).filter((item) => !query || `${item.symbol} ${item.name_ar} ${item.name_en} ${item.sector_ar} ${item.sector_en}`.toLowerCase().includes(query)).filter((item) => !sector || item.sector_ar === sector || item.sector_en === sector);
    if (body.mode === 'movers') rows.sort((a, b) => Number(b.quote?.change_percent || 0) - Number(a.quote?.change_percent || 0));
    rows = rows.slice(0, limit);
    return Response.json({ instruments: rows, sources, total: instruments.length, notice: 'بيانات مرجعية متأخرة — المصدر والوقت موضحان' });
  } catch (error) {
    return replyError(error);
  }
});