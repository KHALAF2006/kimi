import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, readJsonBody, replyError, requirePermission } from "../../shared/security.ts";

async function marketRecipients(base44, marketCode) {
  const now = Date.now();
  const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ market_code: marketCode, status: "active" }, "-updated_date", 5000);
  const customers = new Set(subscriptions.filter((row) => !row.ends_at || new Date(row.ends_at).getTime() > now).map((row) => row.customer_id));
  const recipients = [];
  for (const customerId of customers) {
    let profile;
    try { profile = await base44.asServiceRole.entities.CustomerProfile.get(customerId); } catch { profile = null; }
    if (profile?.role === "user" && profile.account_status === "active" && profile.marketing_consent_at && /^\+[1-9]\d{7,14}$/.test(String(profile.phone_e164 || ""))) recipients.push(profile);
  }
  return recipients.sort((left, right) => String(left.id).localeCompare(String(right.id), "en"));
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let event = null;
  let recipientCursor = 0;
  try {
    const body = await readJsonBody(req);
    const payload = body.args && typeof body.args === "object" ? body.args : body;
    const automated = payload.action === "scheduled_delivery";
    const user = automated ? await base44.auth.me() : (await requirePermission(base44, payload.session_id, "delivery.channels.manage")).user;
    if (!user || (automated && user.role !== "admin")) return Response.json({ error: "Automation authentication required", code: "AUTOMATION_AUTH_REQUIRED" }, { status: 401 });
    event = await base44.asServiceRole.entities.DeliveryEvent.get(String(payload.event_id || ""));
    if (!event || event.channel !== "whatsapp") return Response.json({ error: "WhatsApp delivery event not found" }, { status: 404 });
    if (event.status === "sent") return Response.json({ status: "already_sent", event_id: event.id });
    if (Number(event.attempt_count || 0) >= 3) return Response.json({ error: "Retry limit reached" }, { status: 409 });
    const [channel, rule] = await Promise.all([base44.asServiceRole.entities.DeliveryChannel.get(event.destination_id), base44.asServiceRole.entities.AlertRule.get(event.alert_rule_id)]);
    const instrument = rule ? await base44.asServiceRole.entities.Instrument.get(rule.instrument_id) : null;
    if (!channel || !rule || !instrument || channel.channel !== "whatsapp" || !channel.active || !channel.verified_at || channel.market_code !== rule.market_code || event.market_code !== rule.market_code || instrument.market_code !== rule.market_code || instrument.symbol !== rule.symbol) return Response.json({ error: "WhatsApp delivery market mismatch", code: "DELIVERY_MARKET_MISMATCH" }, { status: 422 });
    const token = Deno.env.get(channel.secret_ref);
    const graphVersion = channel.configuration?.graph_version;
    const templateName = channel.configuration?.template_name;
    const templateLanguage = channel.configuration?.template_language;
    if (!token || !graphVersion || !templateName || !templateLanguage) return Response.json({ error: "WhatsApp channel configuration is incomplete", code: "CHANNEL_CONFIGURATION_INCOMPLETE" }, { status: 409 });
    const triggerPrice = Number(event.trigger_price);
    const triggerObservedAt = String(event.trigger_observed_at || "");
    if (!Number.isFinite(triggerPrice) || !triggerObservedAt) return Response.json({ error: "Verified alert trigger snapshot required", code: "TRIGGER_SNAPSHOT_REQUIRED" }, { status: 422 });
    const recipients = await marketRecipients(base44, rule.market_code);
    if (!recipients.length) return Response.json({ error: "No eligible WhatsApp recipients in this market", code: "NO_ELIGIBLE_RECIPIENTS" }, { status: 422 });
    recipientCursor = Math.max(0, Number(event.recipient_cursor || 0));
    const batch = recipients.slice(recipientCursor, recipientCursor + 20);
    const messageIds = [];
    for (const recipient of batch) {
      const response = await fetch(`https://graph.facebook.com/${graphVersion}/${channel.external_id}/messages`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: recipient.phone_e164, type: "template", template: { name: templateName, language: { code: templateLanguage }, components: [{ type: "body", parameters: [{ type: "text", text: instrument.name_ar || instrument.name_en }, { type: "text", text: rule.symbol }, { type: "text", text: triggerPrice.toFixed(2) }, { type: "text", text: String(event.trigger_condition || rule.condition) }, { type: "text", text: triggerObservedAt }] }] } }) });
      const result = await response.json();
      if (!response.ok || result.error) throw Object.assign(new Error("WhatsApp provider rejected the message"), { providerCode: String(result.error?.code || response.status) });
      messageIds.push(String(result.messages?.[0]?.id || "sent"));
      recipientCursor += 1;
      await base44.asServiceRole.entities.DeliveryEvent.update(event.id, { recipient_cursor: recipientCursor, recipient_count: recipients.length, provider_code: `sent:${recipientCursor}/${recipients.length}` });
    }
    const complete = recipientCursor >= recipients.length;
    const updated = await base44.asServiceRole.entities.DeliveryEvent.update(event.id, complete
      ? { status: "sent", recipient_cursor: recipientCursor, recipient_count: recipients.length, provider_code: `sent:${recipientCursor}`, delivered_at: new Date().toISOString() }
      : { status: "retry", recipient_cursor: recipientCursor, recipient_count: recipients.length, provider_code: `sent:${recipientCursor}/${recipients.length}`, next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() });
    await audit(base44, user.id, "delivery.whatsapp", "DeliveryEvent", event.id, "success", `market:${rule.market_code};batch:${messageIds.length};cursor:${recipientCursor}`);
    return Response.json({ status: complete ? "sent" : "batch_sent", event_id: updated.id, delivered_count: messageIds.length, recipient_cursor: recipientCursor, recipient_count: recipients.length });
  } catch (error) {
    if (event?.id) await base44.asServiceRole.entities.DeliveryEvent.update(event.id, { status: Number(event.attempt_count || 0) + 1 >= 3 ? "failed" : "retry", attempt_count: Number(event.attempt_count || 0) + 1, recipient_cursor: recipientCursor, provider_code: String(error.providerCode || "whatsapp_failed"), next_attempt_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() });
    return replyError(error);
  }
});
