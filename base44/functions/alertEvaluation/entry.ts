import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, replyError, requirePermission } from "../../shared/security.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { user } = await requirePermission(base44, body.session_id, "alerts.operations.manage");
    if (!body.rule_id || !body.destination_id || !body.quote_time) return Response.json({ error: "rule_id, destination_id and quote_time required" }, { status: 400 });
    const rule = await base44.asServiceRole.entities.AlertRule.get(String(body.rule_id));
    const destination = await base44.asServiceRole.entities.AlertDestination.get(String(body.destination_id));
    if (!rule || !destination || rule.customer_id !== destination.customer_id || !rule.enabled || !destination.active) {
      return Response.json({ error: "Active matching alert rule and destination required" }, { status: 422 });
    }
    if (body.channel && body.channel !== destination.channel) return Response.json({ error: "Destination channel mismatch" }, { status: 400 });
    const raw = `${body.rule_id}:${body.destination_id}:${body.quote_time}`;
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const dedupe_key = Array.from(new Uint8Array(bytes)).map((x) => x.toString(16).padStart(2, "0")).join("");
    const existing = await base44.asServiceRole.entities.DeliveryEvent.filter({ dedupe_key });
    if (existing.length) return Response.json({ created: false, dedupe_key });
    const event = await base44.asServiceRole.entities.DeliveryEvent.create({ alert_rule_id: body.rule_id, destination_id: body.destination_id, dedupe_key, channel: destination.channel, status: "pending", attempt_count: 0 });
    await audit(base44, user.id, "alert.delivery_queued", "DeliveryEvent", event.id, "success");
    return Response.json({ created: true, event });
  } catch (error) {
    return replyError(error);
  }
});
