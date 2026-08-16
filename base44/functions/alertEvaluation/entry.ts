import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, readJsonBody, replyError, requirePermission } from "../../shared/security.ts";
import { queuePersonalAlertMessage } from "../../shared/personal-alert-message.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req);
    const { user } = await requirePermission(base44, body.session_id, body.device_id, "alerts.operations.manage");
    if (!body.rule_id || !body.quote_time) return Response.json({ error: "rule_id and quote_time required", code: "REQUIRED_FIELDS_MISSING" }, { status: 400 });
    const rule = await base44.asServiceRole.entities.AlertRule.get(String(body.rule_id));
    if (!rule?.enabled || !rule.market_code) return Response.json({ error: "Active market-bound alert rule required", code: "ALERT_NOT_MARKET_BOUND" }, { status: 422 });
    const instrument = await base44.asServiceRole.entities.Instrument.get(rule.instrument_id);
    if (!instrument || instrument.market_code !== rule.market_code || instrument.symbol !== rule.symbol) return Response.json({ error: "Alert market identity mismatch", code: "ALERT_MARKET_MISMATCH" }, { status: 422 });
    const quotes = await base44.asServiceRole.entities.QuoteLatest.filter({ instrument_id: rule.instrument_id, market_code: rule.market_code }, "-quote_time", 1);
    const quote = quotes[0];
    const triggerPrice = Number(body.trigger_price ?? quote?.last_price);
    const triggerObservedAt = String(body.quote_time || quote?.provider_as_of || quote?.source_time || quote?.quote_time || "");
    if (!Number.isFinite(triggerPrice) || !triggerObservedAt || !Number.isFinite(Date.parse(triggerObservedAt))) {
      return Response.json({ error: "Verified alert trigger snapshot required", code: "TRIGGER_SNAPSHOT_REQUIRED" }, { status: 422 });
    }
    const result = await queuePersonalAlertMessage(base44, rule, {
      ...quote,
      market_code: rule.market_code,
      last_price: triggerPrice,
      provider_as_of: triggerObservedAt,
    }, `manual:${triggerObservedAt}`);
    await audit(base44, user.id, "alert.personal_message_queued", "AlertRule", rule.id, "success", `market:${rule.market_code};created:${result.created ? 1 : 0};reason:${result.reason}`);
    return Response.json({ created: result.created ? 1 : 0, market_code: rule.market_code, reason: result.reason, message: result.message || null });
  } catch (error) { return replyError(error); }
});
