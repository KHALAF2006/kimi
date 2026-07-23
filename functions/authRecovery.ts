// GENERATED from base44/functions/authRecovery/entry.ts — do not edit directly.

// base44/functions/authRecovery/entry.ts
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
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const profile = await profileFor(base44, user);
    if (profile) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await base44.asServiceRole.entities.ActiveDeviceSession.updateMany({ customer_id: profile.id, revoked_at: null }, { $set: { revoked_at: now } });
      await audit(base44, user.id, "sessions.revoked", "ActiveDeviceSession", profile.id, "success", "password_reset");
    }
    return Response.json({ ok: true });
  } catch (error) {
    return replyError(error);
  }
});
