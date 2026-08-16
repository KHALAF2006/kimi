import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, readJsonBody, replyError, requirePermission, sha256 } from "../../shared/security.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req);
    const { user } = await requirePermission(base44, body.session_id, "alerts.operations.manage");
    if (!body.rule_id || !body.quote_time) return Response.json({ error: "rule_id and quote_time required", code: "REQUIRED_FIELDS_MISSING" }, { status: 400 });
    const rule = await base44.asServiceRole.entities.AlertRule.get(String(body.rule_id));
    if (!rule?.enabled || !rule.market_code) return Response.json({ error: "Active market-bound alert rule required", code: "ALERT_NOT_MARKET_BOUND" }, { status: 422 });
    const instrument = await base44.asServiceRole.entities.Instrument.get(rule.instrument_id);
    if (!instrument || instrument.market_code !== rule.market_code || instrument.symbol !== rule.symbol) return Response.json({ error: "Alert market identity mismatch", code: "ALERT_MARKET_MISMATCH" }, { status: 422 });
    const channels = await base44.asServiceRole.entities.DeliveryChannel.filter({ market_code: rule.market_code, active: true });
    const events = [];
    for (const channel of channels.filter((item) => item.verified_at && ["telegram", "whatsapp"].includes(item.channel))) {
      const dedupe_key = await sha256(`${rule.id}:${channel.id}:${body.quote_time}`);
      if ((await base44.asServiceRole.entities.DeliveryEvent.filter({ dedupe_key })).length) continue;
      events.push(await base44.asServiceRole.entities.DeliveryEvent.create({ alert_rule_id: rule.id, destination_id: channel.id, market_code: rule.market_code, dedupe_key, channel: channel.channel, status: "pending", attempt_count: 0 }));
    }
    await audit(base44, user.id, "alert.delivery_queued", "AlertRule", rule.id, "success", `market:${rule.market_code};events:${events.length}`);
    return Response.json({ created: events.length, market_code: rule.market_code, events });
  } catch (error) { return replyError(error); }
});
