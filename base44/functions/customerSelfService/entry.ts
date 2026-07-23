// GENERATED from base44/functions/customerSelfService/entry.ts — do not edit directly.

// base44/functions/customerSelfService/entry.ts
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
async function audit(base44, userId, action, entityType, entityId, result, reason = "") {
  return await base44.asServiceRole.entities.AuditLog.create({ actor_user_id: userId, action, entity_type: entityType, entity_id: entityId || "system", reason, before: {}, after: {}, result, ip_hash: "server-managed" });
}
function text(value, field, min = 1, max = 80) {
  const result = String(value || "").trim();
  if (result.length < min || result.length > max) throw Object.assign(new Error(`${field} must be ${min}-${max} characters`), { status: 400 });
  return result;
}
function maskPhone(phone) {
  return `${phone.slice(0, 4)}\u2022\u2022\u2022\u2022${phone.slice(-3)}`;
}
async function owned(base44, entity, id, profile) {
  const row = await base44.asServiceRole.entities[entity].get(String(id || ""));
  if (!row || row.customer_id !== profile.id) throw Object.assign(new Error(`${entity} not found`), { status: 404 });
  return row;
}
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const profile = await profileFor(base44, user);
    if (!profile) return Response.json({ error: "Profile not found" }, { status: 404 });
    const body = await req.json();
    await requireActiveSession(base44, profile, body.session_id);
    if (body.action === "read") {
      const sessions = await base44.asServiceRole.entities.ActiveDeviceSession.filter({ customer_id: profile.id });
      const consents = await base44.asServiceRole.entities.CustomerConsent.filter({ customer_id: profile.id });
      return Response.json({ profile, sessions, consents });
    }
    if (body.action === "alerts") {
      const rules = await base44.asServiceRole.entities.AlertRule.filter({ customer_id: profile.id });
      const destinations = await base44.asServiceRole.entities.AlertDestination.filter({ customer_id: profile.id });
      const groups = await base44.asServiceRole.entities.RecipientGroup.filter({ customer_id: profile.id });
      const groupIds = new Set(groups.map((row) => row.id));
      const recipients = (await base44.asServiceRole.entities.Recipient.list("-updated_date", 5e3)).filter((row) => groupIds.has(row.group_id)).map(({ phone_e164: _phone, ...row }) => row);
      return Response.json({ rules, destinations: destinations.map(({ secret_ref: _secret, ...row }) => row), groups, recipients });
    }
    if (body.action === "create_alert") {
      const symbol = String(body.symbol || "").trim();
      if (!/^\d{4}$/.test(symbol)) return Response.json({ error: "Valid four-digit symbol required" }, { status: 400 });
      const instruments = await base44.asServiceRole.entities.Instrument.filter({ symbol });
      if (!instruments[0]) return Response.json({ error: "Instrument not found" }, { status: 404 });
      const conditions = /* @__PURE__ */ new Set(["crosses_above", "crosses_below", "enters_zone", "exits_zone"]);
      if (!conditions.has(body.condition)) return Response.json({ error: "Invalid alert condition" }, { status: 400 });
      const threshold = body.threshold == null ? void 0 : Number(body.threshold);
      if (["crosses_above", "crosses_below"].includes(body.condition) && (!Number.isFinite(threshold) || threshold <= 0)) {
        return Response.json({ error: "Positive price threshold required" }, { status: 400 });
      }
      const rule = await base44.asServiceRole.entities.AlertRule.create({
        customer_id: profile.id,
        instrument_id: instruments[0].id,
        symbol,
        indicator_key: body.indicator_key ? text(body.indicator_key, "indicator_key", 1, 80) : void 0,
        condition: body.condition,
        threshold,
        zone_key: body.zone_key ? text(body.zone_key, "zone_key", 1, 80) : void 0,
        frequency: body.frequency === "once" ? "once" : "repeat",
        cooldown_minutes: Math.max(15, Math.min(10080, Number(body.cooldown_minutes || 15))),
        enabled: true
      });
      await audit(base44, user.id, "alert.create", "AlertRule", rule.id, "success");
      return Response.json({ rule });
    }
    if (body.action === "toggle_alert") {
      const rule = await owned(base44, "AlertRule", body.rule_id, profile);
      const updated = await base44.asServiceRole.entities.AlertRule.update(rule.id, { enabled: Boolean(body.enabled) });
      return Response.json({ rule: updated });
    }
    if (body.action === "delete_alert") {
      const rule = await owned(base44, "AlertRule", body.rule_id, profile);
      await base44.asServiceRole.entities.AlertRule.delete(rule.id);
      await audit(base44, user.id, "alert.delete", "AlertRule", rule.id, "success");
      return Response.json({ removed: true });
    }
    if (body.action === "create_recipient_group") {
      const group = await base44.asServiceRole.entities.RecipientGroup.create({ customer_id: profile.id, name: text(body.name, "name", 2, 80), channel: "whatsapp" });
      return Response.json({ group });
    }
    if (body.action === "add_recipient") {
      const group = await owned(base44, "RecipientGroup", body.group_id, profile);
      const phone = String(body.phone_e164 || "").replace(/[\s()-]/g, "");
      if (!/^\+[1-9]\d{7,14}$/.test(phone)) return Response.json({ error: "Valid E.164 phone number required" }, { status: 400 });
      if (body.consent_confirmed !== true) return Response.json({ error: "Documented recipient consent is required" }, { status: 400 });
      const duplicate = await base44.asServiceRole.entities.Recipient.filter({ group_id: group.id, phone_e164: phone });
      const recipient = duplicate[0] || await base44.asServiceRole.entities.Recipient.create({ group_id: group.id, phone_e164: phone, phone_masked: maskPhone(phone), consent_status: "granted", active: true });
      if (!duplicate[0]) await base44.asServiceRole.entities.CustomerConsent.create({ customer_id: profile.id, recipient_id: recipient.id, channel: "whatsapp", purpose: "market_alerts", status: "granted", source: "owner_confirmed", captured_at: (/* @__PURE__ */ new Date()).toISOString() });
      return Response.json({ recipient: { ...recipient, phone_e164: void 0 }, created: !duplicate[0] });
    }
    if (body.action === "create_destination") {
      const channel = body.channel === "telegram" ? "telegram" : body.channel === "whatsapp" ? "whatsapp" : "";
      if (!channel) return Response.json({ error: "Invalid channel" }, { status: 400 });
      const externalId = text(body.external_id, "external_id", 2, 120);
      if (channel === "telegram" && !/^(@[A-Za-z0-9_]{5,32}|-100\d{6,20})$/.test(externalId)) return Response.json({ error: "Invalid Telegram channel identifier" }, { status: 400 });
      if (channel === "whatsapp") await owned(base44, "RecipientGroup", externalId, profile);
      const destination = await base44.asServiceRole.entities.AlertDestination.create({
        customer_id: profile.id,
        channel,
        label: text(body.label, "label", 2, 80),
        address_masked: channel === "telegram" ? `${externalId.slice(0, 3)}\u2022\u2022\u2022${externalId.slice(-3)}` : "\u0645\u062C\u0645\u0648\u0639\u0629 \u0648\u0627\u062A\u0633\u0627\u0628",
        external_id: externalId,
        secret_ref: channel === "telegram" ? "TELEGRAM_BOT_TOKEN" : "WHATSAPP_ACCESS_TOKEN",
        active: false
      });
      return Response.json({ destination: { ...destination, secret_ref: void 0 } });
    }
    if (body.action === "verify_destination") {
      const destination = await owned(base44, "AlertDestination", body.destination_id, profile);
      if (destination.channel === "telegram") {
        const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (!token) return Response.json({ error: "Telegram secret is not configured" }, { status: 409 });
        const response = await fetch(`https://api.telegram.org/bot${token}/getChat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: destination.external_id })
        });
        const result = await response.json();
        if (!response.ok || !result.ok) return Response.json({ error: "Telegram channel verification failed" }, { status: 422 });
      } else {
        if (!Deno.env.get("WHATSAPP_ACCESS_TOKEN") || !Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || !Deno.env.get("WHATSAPP_GRAPH_VERSION")) {
          return Response.json({ error: "WhatsApp secrets are not fully configured" }, { status: 409 });
        }
        const group = await owned(base44, "RecipientGroup", destination.external_id, profile);
        const recipients = await base44.asServiceRole.entities.Recipient.filter({ group_id: group.id, consent_status: "granted", active: true });
        if (!recipients.length) return Response.json({ error: "No active consented WhatsApp recipients" }, { status: 422 });
      }
      const destinationUpdated = await base44.asServiceRole.entities.AlertDestination.update(destination.id, { active: true, verified_at: (/* @__PURE__ */ new Date()).toISOString() });
      await audit(base44, user.id, "destination.verify", "AlertDestination", destination.id, "success");
      return Response.json({ destination: { ...destinationUpdated, secret_ref: void 0 } });
    }
    if (body.action === "update") {
      const allowed = {};
      if (["ar", "en"].includes(body.preferred_language)) allowed.preferred_language = body.preferred_language;
      const updated = await base44.asServiceRole.entities.CustomerProfile.update(profile.id, allowed);
      return Response.json({ profile: updated });
    }
    return Response.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return replyError(error);
  }
});
