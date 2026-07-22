// GENERATED from base44/functions/authLogin/entry.ts — do not edit directly.

// base44/functions/authLogin/entry.ts
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
function normalizedEmail(user) {
  return String(user?.email || "").trim().toLowerCase();
}
function administrativeName(user) {
  const fullName = String(user?.full_name || "").trim();
  if (fullName) return fullName;
  return normalizedEmail(user).split("@")[0];
}
async function ensureAdministrativeProfile(base44, user) {
  let profile = await profileFor(base44, user);
  if (user?.role !== "admin") return profile;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (!profile) {
    profile = await base44.asServiceRole.entities.CustomerProfile.create({
      customer_number: `KMY-ADMIN-${String(user.id).slice(-8).toUpperCase()}`,
      auth_user_id: user.id,
      email_normalized: normalizedEmail(user),
      full_name: administrativeName(user),
      preferred_language: "ar",
      account_status: "active",
      role: "admin",
      tags: ["base44_admin_bootstrap"],
      email_verified_at: now,
      last_seen_at: now
    });
    await audit(base44, user.id, "customer.admin_bootstrapped", "CustomerProfile", profile.id, "success");
    return profile;
  }
  if (!["admin", "owner"].includes(profile.role) || profile.account_status === "pending_verification") {
    profile = await base44.asServiceRole.entities.CustomerProfile.update(profile.id, {
      role: profile.role === "owner" ? "owner" : "admin",
      account_status: "active",
      email_verified_at: profile.email_verified_at || now,
      last_seen_at: now
    });
    await audit(base44, user.id, "customer.admin_reconciled", "CustomerProfile", profile.id, "success");
  }
  return profile;
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

// base44/functions/authLogin/entry.ts
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const body = await req.json();
    const profile = await ensureAdministrativeProfile(base44, user);
    if (!profile) return Response.json({ error: "Complete registration before signing in", code: "PROFILE_SETUP_REQUIRED" }, { status: 428 });
    if (profile.account_status !== "active") return Response.json({ error: "Account is not active", code: "ACCOUNT_NOT_ACTIVE" }, { status: 403 });
    const hash = async (v) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)))).map((x) => x.toString(16).padStart(2, "0")).join("");
    if (body.action === "start") {
      const otp = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e6).padStart(6, "0");
      const challenge2 = await base44.asServiceRole.entities.LoginChallenge.create({ customer_id: profile.id, purpose: "login", email_otp_hash: await hash(otp), attempts: 0, max_attempts: 5, expires_at: new Date(Date.now() + 6e5).toISOString() });
      await base44.asServiceRole.integrations.Core.SendEmail({ to: user.email, subject: "\u0631\u0645\u0632 \u062F\u062E\u0648\u0644 \u0643\u064A\u0645\u064A", body: `\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u062E\u0627\u0635 \u0628\u0643 \u0647\u0648: ${otp}
\u064A\u0646\u062A\u0647\u064A \u062E\u0644\u0627\u0644 10 \u062F\u0642\u0627\u0626\u0642.` });
      return Response.json({ challenge_id: challenge2.id, expires_at: challenge2.expires_at });
    }
    if (body.action !== "verify") return Response.json({ error: "Unsupported action" }, { status: 400 });
    const challenge = await base44.asServiceRole.entities.LoginChallenge.get(body.challenge_id);
    if (!challenge || challenge.customer_id !== profile.id || challenge.completed_at || new Date(challenge.expires_at) <= /* @__PURE__ */ new Date() || challenge.attempts >= 5) return Response.json({ error: "Challenge expired" }, { status: 400 });
    if (await hash(String(body.otp || "")) !== challenge.email_otp_hash) {
      await base44.asServiceRole.entities.LoginChallenge.update(challenge.id, { attempts: challenge.attempts + 1 });
      return Response.json({ error: "Invalid code" }, { status: 400 });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await base44.asServiceRole.entities.LoginChallenge.update(challenge.id, { completed_at: now });
    await base44.asServiceRole.entities.ActiveDeviceSession.updateMany({ customer_id: profile.id, revoked_at: null }, { $set: { revoked_at: now } });
    const remember = Boolean(body.remember_me), expires = new Date(Date.now() + (remember ? 30 : 1) * 864e5).toISOString();
    const session = await base44.asServiceRole.entities.ActiveDeviceSession.create({ customer_id: profile.id, session_hash: await hash(`${user.id}:${crypto.randomUUID()}`), device_hash: await hash(String(body.device_id || "browser")), remember_me: remember, expires_at: expires, last_seen_at: now });
    await base44.asServiceRole.entities.CustomerProfile.update(profile.id, { last_login_at: now, last_seen_at: now });
    await audit(base44, user.id, "session.created", "ActiveDeviceSession", session.id, "success");
    return Response.json({ session_id: session.id, expires_at: expires });
  } catch (error) {
    return replyError(error);
  }
});
