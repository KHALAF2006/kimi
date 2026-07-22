// GENERATED from base44/functions/authRegistration/entry.ts — do not edit directly.

// base44/functions/authRegistration/entry.ts
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

// base44/functions/authRegistration/entry.ts
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const body = await req.json();
    const phone = String(body.phone_e164 || "");
    const country = String(body.country_code || "");
    if (!["SA", "AE", "KW", "QA", "BH", "OM"].includes(country)) return Response.json({ error: "GCC country required" }, { status: 400 });
    if (!/^\+(966|971|965|974|973|968)\d{7,10}$/.test(phone)) return Response.json({ error: "Valid GCC E.164 phone required" }, { status: 400 });
    if (await profileFor(base44, user)) return Response.json({ error: "Profile already exists" }, { status: 409 });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const customerNumber = `KMY-${(/* @__PURE__ */ new Date()).getUTCFullYear()}-${user.id.slice(-6).toUpperCase()}`;
    const profile = await base44.asServiceRole.entities.CustomerProfile.create({ customer_number: customerNumber, auth_user_id: user.id, email_normalized: user.email.toLowerCase(), phone_e164: phone, full_name: String(body.full_name || user.full_name || ""), country_code: country, preferred_language: body.preferred_language === "en" ? "en" : "ar", account_status: "pending_verification", role: "user", tags: [], email_verified_at: now, last_seen_at: now });
    await audit(base44, user.id, "customer.registered", "CustomerProfile", profile.id, "success");
    return Response.json({ profile, phone_verification: "blocked_until_sms_provider_connected" });
  } catch (error) {
    return replyError(error);
  }
});
