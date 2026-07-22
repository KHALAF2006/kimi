// GENERATED from base44/functions/whatsappDelivery/entry.ts — do not edit directly.

// base44/functions/whatsappDelivery/entry.ts
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
async function requireRole(base44, roles) {
  const user = await requireUser(base44);
  const profile = await profileFor(base44, user);
  const role = profile?.role || user.role;
  if (!roles.includes(role)) throw Object.assign(new Error("Forbidden"), { status: 403 });
  return { user, profile, role };
}
function replyError(error) {
  const status = Number(error?.status) || 500;
  if (status >= 500) console.error("KMY backend error", error);
  return Response.json({
    error: status >= 500 ? "Backend operation failed" : error?.message || "Request failed",
    code: error?.code || (status >= 500 ? "BACKEND_FAILURE" : "REQUEST_FAILED")
  }, { status });
}
async function audit(base44, userId, action, entityType, entityId, result, reason = "") {
  return await base44.asServiceRole.entities.AuditLog.create({ actor_user_id: userId, action, entity_type: entityType, entity_id: entityId || "system", reason, before: {}, after: {}, result, ip_hash: "server-managed" });
}

// base44/functions/whatsappDelivery/entry.ts
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let event = null;
  try {
    const { user } = await requireRole(base44, ["admin", "owner"]);
    const body = await req.json();
    event = await base44.asServiceRole.entities.DeliveryEvent.get(String(body.event_id || ""));
    if (!event || event.channel !== "whatsapp") return Response.json({ error: "WhatsApp delivery event not found" }, { status: 404 });
    if (event.status === "sent") return Response.json({ status: "already_sent", event_id: event.id });
    if (Number(event.attempt_count || 0) >= 3) return Response.json({ error: "Retry limit reached" }, { status: 409 });
    const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const graphVersion = Deno.env.get("WHATSAPP_GRAPH_VERSION");
    const templateName = Deno.env.get("WHATSAPP_ALERT_TEMPLATE_NAME");
    const templateLanguage = Deno.env.get("WHATSAPP_ALERT_TEMPLATE_LANGUAGE");
    if (!token || !phoneNumberId || !graphVersion || !templateName || !templateLanguage) {
      return Response.json({ error: "WhatsApp provider secrets and approved template are not fully configured" }, { status: 409 });
    }
    if (!/^v\d+\.\d+$/.test(graphVersion)) return Response.json({ error: "Invalid WhatsApp Graph API version" }, { status: 400 });
    const destination = await base44.asServiceRole.entities.AlertDestination.get(event.destination_id);
    const rule = await base44.asServiceRole.entities.AlertRule.get(event.alert_rule_id);
    if (!destination || !rule || destination.customer_id !== rule.customer_id || destination.channel !== "whatsapp" || !destination.active || !destination.verified_at) {
      return Response.json({ error: "Verified active WhatsApp destination required" }, { status: 422 });
    }
    const group = await base44.asServiceRole.entities.RecipientGroup.get(destination.external_id);
    if (!group || group.customer_id !== rule.customer_id) return Response.json({ error: "Recipient group not found" }, { status: 404 });
    const recipients = await base44.asServiceRole.entities.Recipient.filter({ group_id: group.id, consent_status: "granted", active: true });
    const consents = await base44.asServiceRole.entities.CustomerConsent.filter({ customer_id: rule.customer_id, channel: "whatsapp", status: "granted" });
    const consentedIds = new Set(consents.map((row) => row.recipient_id));
    const allowed = recipients.filter((row) => consentedIds.has(row.id));
    if (!allowed.length) return Response.json({ error: "No active recipients with documented WhatsApp consent" }, { status: 422 });
    const instruments = await base44.asServiceRole.entities.Instrument.filter({ symbol: rule.symbol });
    const quotes = await base44.asServiceRole.entities.QuoteLatest.filter({ instrument_id: rule.instrument_id });
    const instrument = instruments[0];
    const quote = quotes.sort((a, b) => String(b.quote_time).localeCompare(String(a.quote_time)))[0];
    if (!instrument || !quote) return Response.json({ error: "Verified market data required for delivery" }, { status: 422 });
    const failures = [];
    const messageIds = [];
    for (const recipient of allowed) {
      const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient.phone_e164,
          type: "template",
          template: {
            name: templateName,
            language: { code: templateLanguage },
            components: [{ type: "body", parameters: [
              { type: "text", text: instrument.name_ar },
              { type: "text", text: rule.symbol },
              { type: "text", text: Number(quote.last_price).toFixed(2) },
              { type: "text", text: String(rule.condition) },
              { type: "text", text: String(quote.quote_time) }
            ] }]
          }
        })
      });
      const result = await response.json();
      if (!response.ok || result.error) failures.push({ recipient_id: recipient.id, code: String(result.error?.code || response.status) });
      else messageIds.push(String(result.messages?.[0]?.id || "sent"));
    }
    if (failures.length) throw Object.assign(new Error(`WhatsApp delivery failed for ${failures.length} recipient(s)`), { providerCode: failures.map((row) => row.code).join(",").slice(0, 120) });
    const updated = await base44.asServiceRole.entities.DeliveryEvent.update(event.id, {
      status: "sent",
      attempt_count: Number(event.attempt_count || 0) + 1,
      provider_code: `sent:${messageIds.length}`,
      delivered_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    await audit(base44, user.id, "delivery.whatsapp", "DeliveryEvent", event.id, "success");
    return Response.json({ status: "sent", event_id: updated.id, delivered_count: messageIds.length });
  } catch (error) {
    if (event?.id) await base44.asServiceRole.entities.DeliveryEvent.update(event.id, {
      status: Number(event.attempt_count || 0) + 1 >= 3 ? "failed" : "retry",
      attempt_count: Number(event.attempt_count || 0) + 1,
      provider_code: String(error.providerCode || "whatsapp_failed"),
      next_attempt_at: new Date(Date.now() + 15 * 60 * 1e3).toISOString()
    });
    return replyError(error);
  }
});
