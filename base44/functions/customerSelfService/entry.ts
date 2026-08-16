import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, authorizationContext, readJsonBody, replyError, requireMarketEntitlement } from "../../shared/security.ts";
function text(value, field, min = 1, max = 80) {
  const result = String(value || "").trim();
  if (result.length < min || result.length > max) throw Object.assign(new Error(`${field} must be ${min}-${max} characters`), { status: 400 });
  return result;
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
    const body = await readJsonBody(req);
    const context = await authorizationContext(base44, body.session_id);
    const { user, profile } = context;
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
      const marketCode = requireMarketEntitlement(context, body.market_code);
      const allRules = await base44.asServiceRole.entities.AlertRule.filter({ customer_id: profile.id });
      const rules = allRules.filter((rule) => (rule.market_code || "SA_MAIN") === marketCode);
      const instrumentIds = new Set(rules.map((rule) => rule.instrument_id));
      const [instruments, quotes] = await Promise.all([
        base44.asServiceRole.entities.Instrument.filter({ market_code: marketCode }),
        base44.asServiceRole.entities.QuoteLatest.list("-quote_time", 500),
      ]);
      const instrumentById = new Map(instruments.filter((item) => instrumentIds.has(item.id)).map((item) => [item.id, item]));
      const quoteByInstrument = new Map();
      for (const quote of quotes) if (quote.market_code === marketCode && instrumentIds.has(quote.instrument_id) && !quoteByInstrument.has(quote.instrument_id)) quoteByInstrument.set(quote.instrument_id, quote);
      return Response.json({ market_code: marketCode, rules: rules.map((rule) => ({ ...rule, market_code: marketCode, interval: rule.interval || "15m", instrument: instrumentById.get(rule.instrument_id) || null, quote: quoteByInstrument.get(rule.instrument_id) || null })) });
    }
    if (body.action === "create_alert") {
      const marketCode = requireMarketEntitlement(context, body.market_code);
      const symbol = String(body.symbol || "").trim().toUpperCase();
      if (!/^[A-Z0-9.-]{1,16}$/.test(symbol)) return Response.json({ error: "Valid market symbol required" }, { status: 400 });
      const instruments = await base44.asServiceRole.entities.Instrument.filter({ symbol, market_code: marketCode });
      if (!instruments[0] || instruments[0].status === "delisted") return Response.json({ error: "Instrument not found in the active market" }, { status: 404 });
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
        market_code: marketCode,
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
      await audit(base44, user.id, "alert.create", "AlertRule", rule.id, "success", `market:${marketCode}`);
      return Response.json({ rule: { ...rule, instrument: instruments[0] } });
    }
    if (body.action === "toggle_alert") {
      const marketCode = requireMarketEntitlement(context, body.market_code);
      const rule = await owned(base44, "AlertRule", body.rule_id, profile);
      if ((rule.market_code || "SA_MAIN") !== marketCode) throw Object.assign(new Error("Alert not found"), { status: 404 });
      const updated = await base44.asServiceRole.entities.AlertRule.update(rule.id, { enabled: Boolean(body.enabled) });
      await audit(base44, user.id, "alert.toggle", "AlertRule", rule.id, "success", Boolean(body.enabled) ? "enabled" : "disabled", { enabled: rule.enabled }, { enabled: updated.enabled });
      return Response.json({ rule: updated });
    }
    if (body.action === "delete_alert") {
      const marketCode = requireMarketEntitlement(context, body.market_code);
      const rule = await owned(base44, "AlertRule", body.rule_id, profile);
      if ((rule.market_code || "SA_MAIN") !== marketCode) throw Object.assign(new Error("Alert not found"), { status: 404 });
      await base44.asServiceRole.entities.AlertRule.delete(rule.id);
      await audit(base44, user.id, "alert.delete", "AlertRule", rule.id, "success");
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
