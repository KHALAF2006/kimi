// GENERATED from base44/functions/telegramDelivery/entry.ts — do not edit directly.

// base44/functions/telegramDelivery/entry.ts
import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
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
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let event = null;
  try {
    const { user } = await requireRole(base44, ["admin", "owner"]);
    const body = await req.json();
    event = await base44.asServiceRole.entities.DeliveryEvent.get(String(body.event_id || ""));
    if (!event || event.channel !== "telegram") return Response.json({ error: "Telegram delivery event not found" }, { status: 404 });
    if (event.status === "sent") return Response.json({ status: "already_sent", event_id: event.id });
    if (Number(event.attempt_count || 0) >= 3) return Response.json({ error: "Retry limit reached" }, { status: 409 });
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!token) return Response.json({ error: "Telegram secret is not configured" }, { status: 409 });
    const destination = await base44.asServiceRole.entities.AlertDestination.get(event.destination_id);
    const rule = await base44.asServiceRole.entities.AlertRule.get(event.alert_rule_id);
    if (!destination || !rule || destination.customer_id !== rule.customer_id || destination.channel !== "telegram" || !destination.active || !destination.verified_at) {
      return Response.json({ error: "Verified active Telegram destination required" }, { status: 422 });
    }
    if (!/^(@[A-Za-z0-9_]{5,32}|-100\d{6,20})$/.test(destination.external_id)) return Response.json({ error: "Invalid Telegram channel identifier" }, { status: 400 });
    const instruments = await base44.asServiceRole.entities.Instrument.filter({ symbol: rule.symbol });
    const quotes = await base44.asServiceRole.entities.QuoteLatest.filter({ instrument_id: rule.instrument_id });
    const instrument = instruments[0];
    const quote = quotes.sort((a, b) => String(b.quote_time).localeCompare(String(a.quote_time)))[0];
    if (!instrument || !quote) return Response.json({ error: "Verified market data required for delivery" }, { status: 422 });
    const conditionLabel = {
      crosses_above: "\u0627\u062E\u062A\u0631\u0627\u0642 \u0635\u0627\u0639\u062F",
      crosses_below: "\u0643\u0633\u0631 \u0647\u0627\u0628\u0637",
      enters_zone: "\u062F\u062E\u0648\u0644 \u0645\u0646\u0637\u0642\u0629",
      exits_zone: "\u062E\u0631\u0648\u062C \u0645\u0646 \u0645\u0646\u0637\u0642\u0629"
    }[rule.condition] || rule.condition;
    const message = [
      `\u062A\u0646\u0628\u064A\u0647 \u0643\u064A\u0645\u064A \u2014 ${instrument.name_ar} (${rule.symbol})`,
      `\u0627\u0644\u062D\u0627\u0644\u0629: ${conditionLabel}`,
      `\u0627\u0644\u0633\u0639\u0631: ${Number(quote.last_price).toFixed(2)} SAR`,
      rule.threshold ? `\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629: ${Number(rule.threshold).toFixed(2)} SAR` : null,
      `\u0648\u0642\u062A \u0627\u0644\u0633\u0639\u0631: ${quote.quote_time}`,
      "\u0627\u0644\u0645\u0635\u062F\u0631 \u0645\u062D\u0641\u0648\u0638 \u0641\u064A \u0645\u0646\u0635\u0629 \u0643\u064A\u0645\u064A. \u0647\u0630\u0627 \u062A\u0646\u0628\u064A\u0647 \u0645\u0639\u0644\u0648\u0645\u0627\u062A\u064A \u0648\u0644\u064A\u0633 \u062A\u0648\u0635\u064A\u0629 \u0627\u0633\u062A\u062B\u0645\u0627\u0631\u064A\u0629."
    ].filter(Boolean).join("\n");
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: destination.external_id, text: message, disable_web_page_preview: true })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw Object.assign(new Error("Telegram provider rejected the message"), { providerCode: String(result.error_code || response.status) });
    const updated = await base44.asServiceRole.entities.DeliveryEvent.update(event.id, {
      status: "sent",
      attempt_count: Number(event.attempt_count || 0) + 1,
      provider_code: String(result.result?.message_id || "telegram_sent"),
      delivered_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    await audit(base44, user.id, "delivery.telegram", "DeliveryEvent", event.id, "success");
    return Response.json({ status: "sent", event_id: updated.id, provider_message_id: result.result?.message_id });
  } catch (error) {
    if (event?.id) await base44.asServiceRole.entities.DeliveryEvent.update(event.id, {
      status: Number(event.attempt_count || 0) + 1 >= 3 ? "failed" : "retry",
      attempt_count: Number(event.attempt_count || 0) + 1,
      provider_code: String(error.providerCode || "telegram_failed"),
      next_attempt_at: new Date(Date.now() + 15 * 60 * 1e3).toISOString()
    });
    return replyError(error);
  }
});
