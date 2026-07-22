import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { requireRole, replyError, audit } from '../../shared/security.ts';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let event = null;
  try {
    const { user } = await requireRole(base44, ['admin', 'owner']);
    const body = await req.json();
    event = await base44.asServiceRole.entities.DeliveryEvent.get(String(body.event_id || ''));
    if (!event || event.channel !== 'telegram') return Response.json({ error: 'Telegram delivery event not found' }, { status: 404 });
    if (event.status === 'sent') return Response.json({ status: 'already_sent', event_id: event.id });
    if (Number(event.attempt_count || 0) >= 3) return Response.json({ error: 'Retry limit reached' }, { status: 409 });

    const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!token) return Response.json({ error: 'Telegram secret is not configured' }, { status: 409 });
    const destination = await base44.asServiceRole.entities.AlertDestination.get(event.destination_id);
    const rule = await base44.asServiceRole.entities.AlertRule.get(event.alert_rule_id);
    if (!destination || !rule || destination.customer_id !== rule.customer_id || destination.channel !== 'telegram' || !destination.active || !destination.verified_at) {
      return Response.json({ error: 'Verified active Telegram destination required' }, { status: 422 });
    }
    if (!/^(@[A-Za-z0-9_]{5,32}|-100\d{6,20})$/.test(destination.external_id)) return Response.json({ error: 'Invalid Telegram channel identifier' }, { status: 400 });

    const instruments = await base44.asServiceRole.entities.Instrument.filter({ symbol: rule.symbol });
    const quotes = await base44.asServiceRole.entities.QuoteLatest.filter({ instrument_id: rule.instrument_id });
    const instrument = instruments[0];
    const quote = quotes.sort((a, b) => String(b.quote_time).localeCompare(String(a.quote_time)))[0];
    if (!instrument || !quote) return Response.json({ error: 'Verified market data required for delivery' }, { status: 422 });
    const conditionLabel = {
      crosses_above: 'اختراق صاعد', crosses_below: 'كسر هابط', enters_zone: 'دخول منطقة', exits_zone: 'خروج من منطقة',
    }[rule.condition] || rule.condition;
    const message = [
      `تنبيه كيمي — ${instrument.name_ar} (${rule.symbol})`,
      `الحالة: ${conditionLabel}`,
      `السعر: ${Number(quote.last_price).toFixed(2)} SAR`,
      rule.threshold ? `القيمة المحددة: ${Number(rule.threshold).toFixed(2)} SAR` : null,
      `وقت السعر: ${quote.quote_time}`,
      'المصدر محفوظ في منصة كيمي. هذا تنبيه معلوماتي وليس توصية استثمارية.',
    ].filter(Boolean).join('\n');

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: destination.external_id, text: message, disable_web_page_preview: true }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw Object.assign(new Error('Telegram provider rejected the message'), { providerCode: String(result.error_code || response.status) });
    const updated = await base44.asServiceRole.entities.DeliveryEvent.update(event.id, {
      status: 'sent', attempt_count: Number(event.attempt_count || 0) + 1, provider_code: String(result.result?.message_id || 'telegram_sent'), delivered_at: new Date().toISOString(),
    });
    await audit(base44, user.id, 'delivery.telegram', 'DeliveryEvent', event.id, 'success');
    return Response.json({ status: 'sent', event_id: updated.id, provider_message_id: result.result?.message_id });
  } catch (error) {
    if (event?.id) await base44.asServiceRole.entities.DeliveryEvent.update(event.id, {
      status: Number(event.attempt_count || 0) + 1 >= 3 ? 'failed' : 'retry',
      attempt_count: Number(event.attempt_count || 0) + 1,
      provider_code: String(error.providerCode || 'telegram_failed'),
      next_attempt_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
    return replyError(error);
  }
});
