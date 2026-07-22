// GENERATED from base44/functions/adminSubscriptions/entry.ts — do not edit directly.

// base44/functions/adminSubscriptions/entry.ts
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

// base44/functions/adminSubscriptions/entry.ts
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user, profile, role } = await requireRole(base44, ["admin", "owner"]);
    const body = await req.json();
    await requireActiveSession(base44, profile, body.session_id);
    if (body.action === "plans") return Response.json({ plans: await base44.asServiceRole.entities.SubscriptionPlan.list() });
    if (body.action === "create_plan") {
      if (role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });
      return Response.json({ plan: await base44.asServiceRole.entities.SubscriptionPlan.create(body.plan) });
    }
    if (body.action === "transition") {
      if (!body.reason) return Response.json({ error: "Reason required" }, { status: 400 });
      const subscription = await base44.asServiceRole.entities.Subscription.update(body.id, { status: body.status, reason: body.reason });
      if (["suspended", "banned"].includes(body.status)) await base44.asServiceRole.entities.ActiveDeviceSession.updateMany({ customer_id: subscription.customer_id, revoked_at: null }, { $set: { revoked_at: (/* @__PURE__ */ new Date()).toISOString() } });
      await audit(base44, user.id, "subscription.transition", "Subscription", body.id, "success", body.reason);
      return Response.json({ subscription });
    }
    return Response.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return replyError(error);
  }
});
