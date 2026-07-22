// GENERATED from base44/functions/operationsQuality/entry.ts — do not edit directly.

// base44/functions/operationsQuality/entry.ts
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

// base44/functions/operationsQuality/entry.ts
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { profile } = await requireRole(base44, ["admin", "owner"]);
    const body = await req.json();
    await requireActiveSession(base44, profile, body.session_id);
    const sources = await base44.asServiceRole.entities.DataSource.list();
    const issues = await base44.asServiceRole.entities.DataQualityIssue.filter({ status: "open" });
    const runs = await base44.asServiceRole.entities.IngestionRun.list("-started_at", 20);
    return Response.json({ sources, issues, runs });
  } catch (error) {
    return replyError(error);
  }
});
