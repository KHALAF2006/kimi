// GENERATED from base44/functions/adminCustomers/entry.ts — do not edit directly.

// base44/functions/adminCustomers/entry.ts
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
function resolvedRole(user, profile) {
  const trustedOwner = user?.role === "admin" && profile?.acquisition_source === "platform_owner_bootstrap" && Array.isArray(profile?.tags) && profile.tags.includes("owner");
  return trustedOwner ? "owner" : profile?.role || user.role;
}
async function requireRole(base44, roles) {
  const user = await requireUser(base44);
  const profile = await profileFor(base44, user);
  const role = resolvedRole(user, profile);
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

// base44/functions/adminCustomers/entry.ts
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user, profile, role } = await requireRole(base44, ["support", "admin", "owner"]);
    const body = await req.json();
    await requireActiveSession(base44, profile, body.session_id);
    if (body.action === "list") {
      const rows = await base44.asServiceRole.entities.CustomerProfile.list("-created_date", Math.min(body.limit || 50, 100));
      const masked = role === "support" ? rows.map((x) => ({ ...x, email_normalized: x.email_normalized.replace(/(^.).*(@.*$)/, "$1***$2"), phone_e164: x.phone_e164.replace(/.(?=.{4})/g, "*") })) : rows;
      return Response.json({ customers: masked });
    }
    if (body.action === "audit") {
      if (role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });
      return Response.json({ logs: await base44.asServiceRole.entities.AuditLog.list("-created_date", Math.min(body.limit || 50, 100)) });
    }
    if (body.action === "status") {
      if (!["admin", "owner"].includes(role)) return Response.json({ error: "Forbidden" }, { status: 403 });
      if (!body.reason) return Response.json({ error: "Reason required" }, { status: 400 });
      const before = await base44.asServiceRole.entities.CustomerProfile.get(body.id);
      const after = await base44.asServiceRole.entities.CustomerProfile.update(body.id, { account_status: body.status });
      await audit(base44, user.id, "customer.status_changed", "CustomerProfile", body.id, "success", body.reason);
      return Response.json({ before, after });
    }
    return Response.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return replyError(error);
  }
});
