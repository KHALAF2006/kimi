import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, ensurePersonalAccount, profileFor, replyError, requireUser } from "../../shared/security.ts";

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
    const profile = await base44.asServiceRole.entities.CustomerProfile.create({
      customer_number: customerNumber,
      auth_user_id: user.id,
      email_normalized: user.email.toLowerCase(),
      phone_e164: phone,
      full_name: String(body.full_name || user.full_name || ""),
      country_code: country,
      preferred_language: body.preferred_language === "en" ? "en" : "ar",
      account_status: "active",
      role: "user",
      tags: ["email_verified"],
      email_verified_at: now,
      last_seen_at: now,
    });
    await ensurePersonalAccount(base44, profile, user.id);
    await audit(base44, user.id, "customer.registered", "CustomerProfile", profile.id, "success", "email verified");
    return Response.json({
      profile,
      account_ready: true,
      email_verification: "verified",
      phone_verification: "not_required_for_sign_in",
    });
  } catch (error) {
    return replyError(error);
  }
});
