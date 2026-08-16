import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, MARKET_ACCESS, readJsonBody, replyError, requirePermission } from "../../shared/security.ts";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let event = null;
  try {
    const body = await readJsonBody(req);
    const payload = body.args && typeof body.args === "object" ? body.args : body;
    const automated = payload.action === "scheduled_delivery";
    const user = automated ? await base44.auth.me() : (await requirePermission(base44, payload.session_id, "delivery.channels.manage")).user;
    if (!user || (automated && user.role !== "admin")) return Response.json({ error: "Automation authentication required", code: "AUTOMATION_AUTH_REQUIRED" }, { status: 401 });
    event = await base44.asServiceRole.entities.DeliveryEvent.get(String(payload.event_id || ""));
    if (!event || event.channel !== "telegram") return Response.json({ error: "Telegram delivery event not found" }, { status: 404 });
    if (event.status === "sent") return Response.json({ status: "already_sent", event_id: event.id });
    if (Number(event.attempt_count || 0) >= 3) return Response.json({ error: "Retry limit reached" }, { status: 409 });
    const [channel, rule] = await Promise.all([base44.asServiceRole.entities.DeliveryChannel.get(event.destination_id), base44.asServiceRole.entities.AlertRule.get(event.alert_rule_id)]);
    const instrument = rule ? await base44.asServiceRole.entities.Instrument.get(rule.instrument_id) : null;
    if (!channel || !rule || !instrument || channel.channel !== "telegram" || !channel.active || !channel.verified_at || !rule.market_code || channel.market_code !== rule.market_code || event.market_code !== rule.market_code || instrument.market_code !== rule.market_code || instrument.symbol !== rule.symbol) return Response.json({ error: "Telegram delivery market mismatch", code: "DELIVERY_MARKET_MISMATCH" }, { status: 422 });
    const token = Deno.env.get(channel.secret_ref);
    if (!token) return Response.json({ error: "Telegram secret is not configured", code: "SECRET_NOT_CONFIGURED" }, { status: 409 });
    const quotes = await base44.asServiceRole.entities.QuoteLatest.filter({ instrument_id: rule.instrument_id, market_code: rule.market_code });
    const quote = quotes.sort((a, b) => String(b.quote_time).localeCompare(String(a.quote_time)))[0];
    if (!quote || quote.market_code !== rule.market_code) return Response.json({ error: "Verified market quote required" }, { status: 422 });
    const condition = { crosses_above: "اختراق السعر صعوداً", crosses_below: "كسر السعر هبوطاً", enters_zone: "دخول منطقة", exits_zone: "خروج من منطقة" }[rule.condition] || rule.condition;
    const market = MARKET_ACCESS[rule.market_code];
    const message = [`تنبيه المستثمر الذكي — ${instrument.name_ar || instrument.name_en} (${rule.symbol})`, `السوق: ${market.name_ar}`, `الحالة: ${condition}`, `السعر: ${Number(quote.last_price).toFixed(2)} ${market.currency}`, rule.threshold ? `القيمة المحددة: ${Number(rule.threshold).toFixed(2)} ${market.currency}` : null, `وقت السعر: ${quote.quote_time}`].filter(Boolean).join("\n");
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: channel.external_id, text: message, disable_web_page_preview: true }) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw Object.assign(new Error("Telegram provider rejected the message"), { providerCode: String(result.error_code || response.status) });
    const updated = await base44.asServiceRole.entities.DeliveryEvent.update(event.id, { status: "sent", attempt_count: Number(event.attempt_count || 0) + 1, provider_code: String(result.result?.message_id || "telegram_sent"), delivered_at: new Date().toISOString() });
    await audit(base44, user.id, "delivery.telegram", "DeliveryEvent", event.id, "success", `market:${rule.market_code}`);
    return Response.json({ status: "sent", event_id: updated.id, provider_message_id: result.result?.message_id });
  } catch (error) {
    if (event?.id) await base44.asServiceRole.entities.DeliveryEvent.update(event.id, { status: Number(event.attempt_count || 0) + 1 >= 3 ? "failed" : "retry", attempt_count: Number(event.attempt_count || 0) + 1, provider_code: String(error.providerCode || "telegram_failed"), next_attempt_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() });
    return replyError(error);
  }
});
