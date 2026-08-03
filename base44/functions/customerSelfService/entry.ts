import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, authorizationContext, replyError } from "../../shared/security.ts";
function text(value, field, min = 1, max = 80) {
  const result = String(value || "").trim();
  if (result.length < min || result.length > max) throw Object.assign(new Error(`${field} must be ${min}-${max} characters`), { status: 400 });
  return result;
}
function maskPhone(phone) {
  return `${phone.slice(0, 4)}\u2022\u2022\u2022\u2022${phone.slice(-3)}`;
}
function chartColor(value, fallback) {
  const color = String(value || "");
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
}
function chartSma(value, fallback) {
  return {
    enabled: value?.enabled !== false,
    length: Math.max(1, Math.min(500, Math.round(Number(value?.length) || fallback.length))),
    color: chartColor(value?.color, fallback.color),
    lineWidth: Math.max(1, Math.min(5, Math.round(Number(value?.lineWidth) || fallback.lineWidth)))
  };
}
function chartReversal(value, fallback) {
  return {
    enabled: value?.enabled !== false,
    bullishColor: chartColor(value?.bullishColor, fallback.bullishColor),
    bearishColor: chartColor(value?.bearishColor, fallback.bearishColor)
  };
}
function cleanChartPreferences(value) {
  const source = value && typeof value === "object" ? value : {};
  const candleTypes = new Set(["candles", "hollow", "heikin_ashi"]);
  const fast = { enabled: true, length: 20, color: "#2563eb", lineWidth: 2 };
  const slow = { enabled: true, length: 50, color: "#f59e0b", lineWidth: 2 };
  return {
    candleType: candleTypes.has(source.candleType) ? source.candleType : "candles",
    backgroundMode: source.backgroundMode === "custom" ? "custom" : "theme",
    backgroundColor: chartColor(source.backgroundColor, "#ffffff"),
    textColor: chartColor(source.textColor, "#475569"),
    gridVisible: source.gridVisible !== false,
    gridColor: chartColor(source.gridColor, "#edf1f6"),
    upColor: chartColor(source.upColor, "#16a34a"),
    downColor: chartColor(source.downColor, "#dc2626"),
    wickVisible: source.wickVisible !== false,
    borderVisible: source.borderVisible !== false,
    watermarkVisible: source.watermarkVisible !== false,
    sma: {
      fast: chartSma(source.sma?.fast, fast),
      slow: chartSma(source.sma?.slow, slow)
    },
    reversal: {
      pinBar: chartReversal(source.reversal?.pinBar, { bullishColor: "#0ea5e9", bearishColor: "#ec4899" }),
      engulfing: chartReversal(source.reversal?.engulfing, { bullishColor: "#16a34a", bearishColor: "#dc2626" })
    }
  };
}
async function owned(base44, entity, id, profile) {
  const row = await base44.asServiceRole.entities[entity].get(String(id || ""));
  if (!row || row.customer_id !== profile.id) throw Object.assign(new Error(`${entity} not found`), { status: 404 });
  return row;
}
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { user, profile } = await authorizationContext(base44, body.session_id);
    if (body.action === "read") {
      const sessions = await base44.asServiceRole.entities.ActiveDeviceSession.filter({ customer_id: profile.id });
      const consents = await base44.asServiceRole.entities.CustomerConsent.filter({ customer_id: profile.id });
      return Response.json({ profile, sessions, consents });
    }
    if (body.action === "get_chart_preferences") {
      return Response.json({ preferences: profile.chart_preferences || null });
    }
    if (body.action === "save_chart_preferences") {
      const preferences = cleanChartPreferences(body.preferences);
      await base44.asServiceRole.entities.CustomerProfile.update(profile.id, { chart_preferences: preferences });
      const confirmed = await base44.asServiceRole.entities.CustomerProfile.get(profile.id);
      const persisted = cleanChartPreferences(confirmed?.chart_preferences);
      if (persisted.watermarkVisible !== preferences.watermarkVisible) {
        throw Object.assign(new Error("Chart preferences were not persisted"), { status: 500, code: "CHART_PREFERENCES_PERSISTENCE_FAILED" });
      }
      await audit(base44, user.id, "chart.preferences.update", "CustomerProfile", profile.id, "success", "", profile.chart_preferences || null, preferences);
      return Response.json({ preferences: persisted });
    }
    if (body.action === "alerts") {
      const rules = await base44.asServiceRole.entities.AlertRule.filter({ customer_id: profile.id });
      const destinations = await base44.asServiceRole.entities.AlertDestination.filter({ customer_id: profile.id });
      const groups = await base44.asServiceRole.entities.RecipientGroup.filter({ customer_id: profile.id });
      const groupIds = new Set(groups.map((row) => row.id));
      const recipients = (await base44.asServiceRole.entities.Recipient.list("-updated_date", 5e3)).filter((row) => groupIds.has(row.group_id)).map(({ phone_e164: _phone, ...row }) => row);
      const instrumentIds = new Set(rules.map((rule) => rule.instrument_id));
      const [instruments, quotes] = await Promise.all([
        base44.asServiceRole.entities.Instrument.list("symbol", 500),
        base44.asServiceRole.entities.QuoteLatest.list("-quote_time", 500),
      ]);
      const instrumentById = new Map(instruments.filter((item) => instrumentIds.has(item.id)).map((item) => [item.id, item]));
      const quoteByInstrument = new Map();
      for (const quote of quotes) if (instrumentIds.has(quote.instrument_id) && !quoteByInstrument.has(quote.instrument_id)) quoteByInstrument.set(quote.instrument_id, quote);
      return Response.json({ rules: rules.map((rule) => ({ ...rule, interval: rule.interval || "15m", instrument: instrumentById.get(rule.instrument_id) || null, quote: quoteByInstrument.get(rule.instrument_id) || null })), destinations: destinations.map(({ secret_ref: _secret, ...row }) => row), groups, recipients });
    }
    if (body.action === "create_alert") {
      const symbol = String(body.symbol || "").trim();
      if (!/^\d{4}$/.test(symbol)) return Response.json({ error: "Valid four-digit symbol required" }, { status: 400 });
      const instruments = await base44.asServiceRole.entities.Instrument.filter({ symbol, market_code: "SA_MAIN" });
      if (!instruments[0] || instruments[0].status === "delisted") return Response.json({ error: "Instrument not found" }, { status: 404 });
      const intervals = new Set(["15m", "1h", "2h", "3h", "4h", "1d", "1wk", "1mo"]);
      const interval = intervals.has(String(body.interval)) ? String(body.interval) : "15m";
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
        interval,
        indicator_key: body.indicator_key ? text(body.indicator_key, "indicator_key", 1, 80) : void 0,
        condition: body.condition,
        threshold,
        zone_key: body.zone_key ? text(body.zone_key, "zone_key", 1, 80) : void 0,
        frequency: body.frequency === "once" ? "once" : "repeat",
        cooldown_minutes: Math.max(15, Math.min(10080, Number(body.cooldown_minutes || 15))),
        enabled: true
      });
      await audit(base44, user.id, "alert.create", "AlertRule", rule.id, "success");
      return Response.json({ rule: { ...rule, instrument: instruments[0] } });
    }
    if (body.action === "toggle_alert") {
      const rule = await owned(base44, "AlertRule", body.rule_id, profile);
      const updated = await base44.asServiceRole.entities.AlertRule.update(rule.id, { enabled: Boolean(body.enabled) });
      await audit(base44, user.id, "alert.toggle", "AlertRule", rule.id, "success", Boolean(body.enabled) ? "enabled" : "disabled", { enabled: rule.enabled }, { enabled: updated.enabled });
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
      await audit(base44, user.id, "recipient_group.create", "RecipientGroup", group.id, "success");
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
      await audit(base44, user.id, "recipient.add", "Recipient", recipient.id, "success", `group:${group.id}`);
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
      await audit(base44, user.id, "destination.create", "AlertDestination", destination.id, "success", channel);
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
    if (body.action === "toggle_destination") {
      const destination = await owned(base44, "AlertDestination", body.destination_id, profile);
      const active = Boolean(body.active);
      if (active && !destination.verified_at) return Response.json({ error: "Verify destination before enabling it" }, { status: 422 });
      const updated = await base44.asServiceRole.entities.AlertDestination.update(destination.id, { active });
      await audit(base44, user.id, "destination.toggle", "AlertDestination", destination.id, "success", active ? "enabled" : "disabled", { active: destination.active }, { active });
      return Response.json({ destination: { ...updated, secret_ref: void 0 } });
    }
    if (body.action === "delete_destination") {
      const destination = await owned(base44, "AlertDestination", body.destination_id, profile);
      const events = await base44.asServiceRole.entities.DeliveryEvent.filter({ destination_id: destination.id });
      if (events.some((event) => ["pending", "retry"].includes(event.status))) {
        return Response.json({ error: "Destination has pending delivery events" }, { status: 409 });
      }
      await base44.asServiceRole.entities.AlertDestination.delete(destination.id);
      await audit(base44, user.id, "destination.delete", "AlertDestination", destination.id, "success");
      return Response.json({ removed: true });
    }
    if (body.action === "remove_recipient") {
      const group = await owned(base44, "RecipientGroup", body.group_id, profile);
      const recipient = await base44.asServiceRole.entities.Recipient.get(String(body.recipient_id || ""));
      if (!recipient || recipient.group_id !== group.id) return Response.json({ error: "Recipient not found" }, { status: 404 });
      const consents = await base44.asServiceRole.entities.CustomerConsent.filter({ customer_id: profile.id, recipient_id: recipient.id });
      for (const consent of consents) await base44.asServiceRole.entities.CustomerConsent.delete(consent.id);
      await base44.asServiceRole.entities.Recipient.delete(recipient.id);
      await audit(base44, user.id, "recipient.delete", "Recipient", recipient.id, "success", `group:${group.id}`);
      return Response.json({ removed: true });
    }
    if (body.action === "delete_recipient_group") {
      const group = await owned(base44, "RecipientGroup", body.group_id, profile);
      const destinations = await base44.asServiceRole.entities.AlertDestination.filter({ customer_id: profile.id, channel: "whatsapp", external_id: group.id });
      if (destinations.length) return Response.json({ error: "Remove the WhatsApp destination before deleting this group" }, { status: 409 });
      const recipients = await base44.asServiceRole.entities.Recipient.filter({ group_id: group.id });
      for (const recipient of recipients) {
        const consents = await base44.asServiceRole.entities.CustomerConsent.filter({ customer_id: profile.id, recipient_id: recipient.id });
        for (const consent of consents) await base44.asServiceRole.entities.CustomerConsent.delete(consent.id);
        await base44.asServiceRole.entities.Recipient.delete(recipient.id);
      }
      await base44.asServiceRole.entities.RecipientGroup.delete(group.id);
      await audit(base44, user.id, "recipient_group.delete", "RecipientGroup", group.id, "success");
      return Response.json({ removed: true });
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
