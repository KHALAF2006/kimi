// GENERATED from base44/functions/alertEvaluation/entry.ts — do not edit directly.

// base44/functions/alertEvaluation/entry.ts
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
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    await requireRole(base44, ["admin", "owner"]);
    const body = await req.json();
    if (!body.rule_id || !body.destination_id || !body.quote_time) return Response.json({ error: "rule_id, destination_id and quote_time required" }, { status: 400 });
    const raw = `${body.rule_id}:${body.destination_id}:${body.quote_time}`;
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const dedupe_key = Array.from(new Uint8Array(bytes)).map((x) => x.toString(16).padStart(2, "0")).join("");
    const existing = await base44.asServiceRole.entities.DeliveryEvent.filter({ dedupe_key });
    if (existing.length) return Response.json({ created: false, dedupe_key });
    const event = await base44.asServiceRole.entities.DeliveryEvent.create({ alert_rule_id: body.rule_id, destination_id: body.destination_id, dedupe_key, channel: body.channel, status: "pending", attempt_count: 0 });
    return Response.json({ created: true, event });
  } catch (error) {
    return replyError(error);
  }
});
