import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";
import { audit, profileFor, readJsonBody, replyError, requireUser } from "../../shared/security.ts";
import { cooldownUntil, uniqueApplicationReference } from "../../shared/marketAccess.ts";
import { reconcileRegistrationGraph } from "../../shared/registrationState.mjs";
import { acquireRegistrationLease, releaseRegistrationLease } from "../../shared/registrationLease.mjs";

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

Deno.serve(async (req) => {
  let diagnosticStage = "request";
  let releaseLease = null;
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const body = await readJsonBody(req, 32 * 1024);
    const existingProfile = await profileFor(base44, user);

    if (body.action === "status") {
      if (!existingProfile) return Response.json({ registered: false });
      const applications = await base44.asServiceRole.entities.MarketAccessApplication.filter({ customer_id: existingProfile.id });
      const platformIds = [...new Set(applications.map((item) => item.trading_platform_id).filter(Boolean))];
      const platforms = {};
      for (const platformId of platformIds) {
        try {
          const platform = await base44.asServiceRole.entities.TradingPlatform.get(platformId);
          platforms[platformId] = { id: platform.id, name_ar: platform.name_ar, name_en: platform.name_en, referral_url: platform.referral_url };
        } catch { /* immutable application snapshots remain available */ }
      }
      return Response.json({ registered: true, profile: existingProfile, applications, platforms });
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

    diagnosticStage = "validate_registration";
    const email = cleanEmail(user.email);
    const country = String(body.country_code || "").toUpperCase();
    if (!GCC_COUNTRIES.has(country)) fail("Select a supported GCC country", "GCC_COUNTRY_REQUIRED");
    const fullName = cleanName(body.full_name);
    const phone = cleanPhone(body.phone_e164, country);
    const marketCode = String(body.market_code || "").toUpperCase();
    if (!MARKET_CODES.has(marketCode)) fail("Select a supported market", "MARKET_REQUIRED");
    if (body.marketing_consent !== true) fail("Communication consent is required to continue", "COMMUNICATION_CONSENT_REQUIRED");
    if (body.phone_accuracy_acknowledged !== true) fail("Confirm that the mobile number is your current contact number", "PHONE_ACCURACY_ACKNOWLEDGEMENT_REQUIRED");
    if (body.referral_link_opened !== true) fail("Open the selected platform referral link before completing registration", "REFERRAL_LINK_REQUIRED");

    let platform = null;
    try { platform = await base44.asServiceRole.entities.TradingPlatform.get(String(body.trading_platform_id || "")); } catch { platform = null; }
    if (!platform?.active || !Array.isArray(platform.supported_market_codes) || !platform.supported_market_codes.includes(marketCode)) {
      fail("Select an active trading platform for this market", "TRADING_PLATFORM_REQUIRED");
    }

    diagnosticStage = "resolve_owner";
    const owner = await ownerProfile(base44);
    const now = new Date().toISOString();
    diagnosticStage = "acquire_registration_lease";
    const lease = await acquireRegistrationLease(base44, user.id, new Date(now));
    releaseLease = () => releaseRegistrationLease(base44, user.id, lease.token);
    diagnosticStage = "reconcile_registration_graph";
    const result = await reconcileRegistrationGraph(base44, {
      user,
      owner,
      platform,
      now,
      allocateReference: uniqueApplicationReference,
      values: {
        email,
        phone,
        fullName,
        country,
        language: body.preferred_language === "en" ? "en" : "ar",
        marketCode,
        termsVersion: TERMS_VERSION,
        cooldownUntil: cooldownUntil(now)?.toISOString(),
      },
    });
    if (result.created.profile || result.created.application) {
      await audit(base44, user.id, "customer.registered_pending_owner", "MarketAccessApplication", result.application.id, "success", "email verified; registration graph reconciled");
    }
    return Response.json({
      profile: result.profile,
      application: result.application,
      unique_reference: result.application.unique_reference,
      registration_state: result.profile.registration_state,
      account_ready: false,
      owner_approval_required: true,
      owner_notified: Boolean(result.ownerMessage?.id),
    });
  } catch (error) {
    console.warn("SMART_INVESTOR registration flow rejected", {
      stage: diagnosticStage,
      code: error?.code || "REQUEST_FAILED",
      status: Number(error?.status) || 500,
    });
    return replyError(error);
  } finally {
    if (releaseLease) {
      try {
        await releaseLease();
      } catch {
        console.warn("SMART_INVESTOR registration lease release failed");
      }
    }
  }
});
