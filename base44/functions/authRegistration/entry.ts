import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";
import { audit, profileFor, readJsonBody, replyError, requireUser } from "../../shared/security.ts";

const TERMS_VERSION = "2026-08-15";
const RELAY_DOMAINS = new Set(["privaterelay.appleid.com", "private.icloud.com"]);
const MARKET_CODES = new Set(["SA_MAIN", "US_OPTIONS", "US_BENCHMARKS"]);
const GCC_COUNTRIES = new Set(["SA", "AE", "KW", "QA", "BH", "OM"]);

function fail(message, code, status = 400) {
  throw Object.assign(new Error(message), { status, code });
}

function cleanEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  const domain = email.split("@").at(-1) || "";
  if (RELAY_DOMAINS.has(domain)) fail("Please use your direct email address instead of an Apple private relay address", "APPLE_RELAY_EMAIL_NOT_ALLOWED");
  return email;
}

function cleanName(value) {
  const name = String(value || "").replace(/\s+/g, " ").trim();
  if (name.length < 5 || name.length > 120 || name.split(" ").filter(Boolean).length < 2) {
    fail("Enter your full name as shown on your identity document", "FULL_NAME_REQUIRED");
  }
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.'-]+$/u.test(name)) fail("Enter a valid full name", "INVALID_FULL_NAME");
  return name;
}

function cleanPhone(value, country) {
  const phone = String(value || "").replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) fail("Enter a valid mobile number in international format", "INVALID_PHONE");
  const prefixes = { SA: "+966", AE: "+971", KW: "+965", QA: "+974", BH: "+973", OM: "+968" };
  if (!phone.startsWith(prefixes[country])) fail("Mobile number does not match the selected country", "PHONE_COUNTRY_MISMATCH");
  return phone;
}

async function ownerProfile(base44) {
  const candidates = await base44.asServiceRole.entities.CustomerProfile.filter({ acquisition_source: "platform_owner_bootstrap" });
  return candidates.find((row) => row.role === "owner" && Array.isArray(row.tags) && row.tags.includes("owner")) || null;
}

async function createMessage(base44, payload) {
  const duplicate = await base44.asServiceRole.entities.Message.filter({ dedupe_key: payload.dedupe_key });
  return duplicate[0] || await base44.asServiceRole.entities.Message.create(payload);
}

function applicationReference(marketCode) {
  return `SI-${marketCode}-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const body = await readJsonBody(req, 32 * 1024);
    const existingProfile = await profileFor(base44, user);

    if (body.action === "status") {
      if (!existingProfile) return Response.json({ registered: false });
      const applications = await base44.asServiceRole.entities.MarketAccessApplication.filter({ customer_id: existingProfile.id });
      return Response.json({ registered: true, profile: existingProfile, applications });
    }

    if (body.action === "update_pending_name") {
      if (!existingProfile || existingProfile.account_status !== "pending_owner_approval") fail("Pending application not found", "PENDING_APPLICATION_NOT_FOUND", 404);
      const fullName = cleanName(body.full_name);
      const now = new Date().toISOString();
      const updated = await base44.asServiceRole.entities.CustomerProfile.update(existingProfile.id, { full_name: fullName, name_last_updated_at: now });
      const applications = await base44.asServiceRole.entities.MarketAccessApplication.filter({ customer_id: existingProfile.id, status: "pending" });
      for (const application of applications) {
        await base44.asServiceRole.entities.MarketAccessApplication.update(application.id, { full_name_snapshot: fullName, revision: Number(application.revision || 1) + 1 });
      }
      await audit(base44, user.id, "registration.pending_name_updated", "CustomerProfile", existingProfile.id, "success", "customer correction", { full_name: existingProfile.full_name }, { full_name: fullName });
      return Response.json({ profile: updated });
    }

    if (body.action !== "complete_registration") fail("Unsupported action", "UNSUPPORTED_ACTION");
    if (existingProfile) fail("Profile already exists", "PROFILE_ALREADY_EXISTS", 409);

    const email = cleanEmail(user.email);
    const country = String(body.country_code || "").toUpperCase();
    if (!GCC_COUNTRIES.has(country)) fail("Select a supported GCC country", "GCC_COUNTRY_REQUIRED");
    const fullName = cleanName(body.full_name);
    const phone = cleanPhone(body.phone_e164, country);
    const marketCode = String(body.market_code || "").toUpperCase();
    if (!MARKET_CODES.has(marketCode)) fail("Select a supported market", "MARKET_REQUIRED");
    if (body.marketing_consent !== true) fail("Communication consent is required to continue", "COMMUNICATION_CONSENT_REQUIRED");
    if (body.phone_accuracy_acknowledged !== true) fail("Confirm that the mobile number is your current contact number", "PHONE_ACCURACY_ACKNOWLEDGEMENT_REQUIRED");

    let platform = null;
    try { platform = await base44.asServiceRole.entities.TradingPlatform.get(String(body.trading_platform_id || "")); } catch { platform = null; }
    if (!platform?.active || !Array.isArray(platform.supported_market_codes) || !platform.supported_market_codes.includes(marketCode)) {
      fail("Select an active trading platform for this market", "TRADING_PLATFORM_REQUIRED");
    }

    const now = new Date().toISOString();
    const profile = await base44.asServiceRole.entities.CustomerProfile.create({
      customer_number: `SI-${new Date().getUTCFullYear()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`,
      auth_user_id: user.id,
      email_normalized: email,
      phone_e164: phone,
      full_name: fullName,
      country_code: country,
      preferred_language: body.preferred_language === "en" ? "en" : "ar",
      account_status: "pending_owner_approval",
      role: "user",
      tags: ["email_verified", "phone_provided_unverified", "owner_approval_required"],
      email_verified_at: now,
      phone_accuracy_acknowledged_at: now,
      marketing_consent_at: now,
      terms_version: TERMS_VERSION,
      name_last_updated_at: now,
      feed_enabled: true,
      last_seen_at: now,
    });
    await base44.asServiceRole.entities.CustomerConsent.create({ customer_id: profile.id, channel: "email", purpose: "service_and_marketing", status: "granted", source: "registration_required_checkbox", captured_at: now });
    await base44.asServiceRole.entities.CustomerConsent.create({ customer_id: profile.id, channel: "whatsapp", purpose: "training_and_account_contact", status: "granted", source: "customer_provided_mobile", captured_at: now });
    const application = await base44.asServiceRole.entities.MarketAccessApplication.create({
      unique_reference: applicationReference(marketCode),
      customer_id: profile.id,
      auth_user_id: user.id,
      trading_platform_id: platform.id,
      market_code: marketCode,
      status: "pending",
      full_name_snapshot: fullName,
      email_snapshot: email,
      phone_snapshot: phone,
      revision: 1,
    });
    await base44.asServiceRole.entities.NotificationPreference.create({ customer_id: profile.id, auth_user_id: user.id, feed_enabled: true, messages_enabled: true, revision: 1 });
    const owner = await ownerProfile(base44);
    if (owner) {
      await createMessage(base44, {
        recipient_auth_user_id: owner.auth_user_id,
        recipient_customer_id: owner.id,
        message_type: "registration",
        priority: "important",
        title_ar: "تسجيل عميل جديد",
        title_en: "New customer registration",
        body_ar: `سجّل ${profile.full_name} وطلب الوصول إلى ${marketCode}.`,
        body_en: `${profile.full_name} registered and requested access to ${marketCode}.`,
        action_path: `/admin/customers?application=${application.id}`,
        feed_eligible: true,
        dedupe_key: `registration:${application.id}`,
      });
    }
    await audit(base44, user.id, "customer.registered_pending_owner", "MarketAccessApplication", application.id, "success", "email verified; phone supplied and acknowledged without verification");
    return Response.json({ profile, application, account_ready: false, owner_approval_required: true });
  } catch (error) {
    return replyError(error);
  }
});
