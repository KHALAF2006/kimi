import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, createSessionToken, ensureAdministrativeProfile, readJsonBody, replyError, requireActiveSession, requireUser, sha256 } from "../../shared/security.ts";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_WINDOW_MS = 15 * 60 * 1000;
const OTP_WINDOW_LIMIT = 5;

function rowCreatedAt(row) {
  return new Date(row.created_date || row.created_at || row.updated_date || 0).getTime();
}

async function enforceOtpStartLimit(base44, user, profile) {
  const now = Date.now();
  const challenges = await base44.asServiceRole.entities.LoginChallenge.filter({
    customer_id: profile.id,
    purpose: "login",
  });
  const recent = challenges
    .filter((row) => rowCreatedAt(row) >= now - OTP_WINDOW_MS)
    .sort((a, b) => rowCreatedAt(b) - rowCreatedAt(a));
  const newestAge = recent[0] ? now - rowCreatedAt(recent[0]) : Number.POSITIVE_INFINITY;
  if (newestAge < OTP_COOLDOWN_MS || recent.length >= OTP_WINDOW_LIMIT) {
    await audit(base44, user.id, "login.otp_rate_limited", "CustomerProfile", profile.id, "denied");
    const retryAfter = newestAge < OTP_COOLDOWN_MS
      ? Math.max(1, Math.ceil((OTP_COOLDOWN_MS - newestAge) / 1000))
      : Math.max(1, Math.ceil((rowCreatedAt(recent.at(-1)) + OTP_WINDOW_MS - now) / 1000));
    throw Object.assign(new Error("Please wait before requesting another code"), {
      status: 429,
      code: "OTP_RATE_LIMITED",
      retryAfter,
    });
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const body = await readJsonBody(req, 16 * 1024);
    const profile = await ensureAdministrativeProfile(base44, user);
    if (!profile) return Response.json({ error: "Complete registration before signing in", code: "PROFILE_SETUP_REQUIRED" }, { status: 428 });
    if (body.action === "logout") {
      const session = await requireActiveSession(base44, profile, body.session_id);
      const revokedAt = new Date().toISOString();
      await base44.asServiceRole.entities.ActiveDeviceSession.update(session.id, { revoked_at: revokedAt });
      await audit(base44, user.id, "session.revoked", "ActiveDeviceSession", session.id, "success", "user_logout");
      return Response.json({ status: "signed_out", revoked_at: revokedAt });
    }
    if (profile.account_status !== "active") return Response.json({ error: "Account is not active", code: "ACCOUNT_NOT_ACTIVE" }, { status: 403 });
    if (body.action === "start") {
      await enforceOtpStartLimit(base44, user, profile);
      const otp = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e6).padStart(6, "0");
      const challenge2 = await base44.asServiceRole.entities.LoginChallenge.create({ customer_id: profile.id, purpose: "login", email_otp_hash: await sha256(otp), attempts: 0, max_attempts: 5, expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString() });
      await base44.asServiceRole.integrations.Core.SendEmail({ to: user.email, subject: "رمز دخول المستثمر الذكي", body: `رمز التحقق الخاص بك هو: ${otp}
\u064A\u0646\u062A\u0647\u064A \u062E\u0644\u0627\u0644 10 \u062F\u0642\u0627\u0626\u0642.` });
      await audit(base44, user.id, "login.otp_sent", "LoginChallenge", challenge2.id, "success");
      return Response.json({ challenge_id: challenge2.id, expires_at: challenge2.expires_at });
    }
    if (body.action !== "verify") return Response.json({ error: "Unsupported action" }, { status: 400 });
    const challenge = await base44.asServiceRole.entities.LoginChallenge.get(body.challenge_id);
    if (!challenge || challenge.customer_id !== profile.id || challenge.purpose !== "login" || challenge.completed_at || new Date(challenge.expires_at) <= /* @__PURE__ */ new Date() || challenge.attempts >= Number(challenge.max_attempts || 5)) return Response.json({ error: "Challenge expired" }, { status: 400 });
    if (await sha256(String(body.otp || "")) !== challenge.email_otp_hash) {
      await base44.asServiceRole.entities.LoginChallenge.update(challenge.id, { attempts: challenge.attempts + 1 });
      await audit(base44, user.id, "login.otp_rejected", "LoginChallenge", challenge.id, "denied");
      return Response.json({ error: "Invalid code" }, { status: 400 });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await base44.asServiceRole.entities.LoginChallenge.update(challenge.id, { completed_at: now });
    await base44.asServiceRole.entities.ActiveDeviceSession.updateMany({ customer_id: profile.id, revoked_at: null }, { $set: { revoked_at: now } });
    const remember = Boolean(body.remember_me), expires = new Date(Date.now() + (remember ? 30 : 1) * 864e5).toISOString();
    const sessionSecret = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll("-", "")}`;
    const session = await base44.asServiceRole.entities.ActiveDeviceSession.create({ customer_id: profile.id, session_hash: await sha256(sessionSecret), device_hash: await sha256(String(body.device_id || "browser")), remember_me: remember, expires_at: expires, last_seen_at: now });
    await base44.asServiceRole.entities.CustomerProfile.update(profile.id, { last_login_at: now, last_seen_at: now });
    await audit(base44, user.id, "session.created", "ActiveDeviceSession", session.id, "success");
    return Response.json({ session_id: createSessionToken(session.id, sessionSecret), expires_at: expires });
  } catch (error) {
    return replyError(error);
  }
});
