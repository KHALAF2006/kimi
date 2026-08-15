import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";
import { audit, authorizationContext, readJsonBody, replyError } from "../../shared/security.ts";
import { cooldownUntil, latestApplication, MARKET_APPLICATION_LIMIT, uniqueApplicationReference } from "../../shared/marketAccess.ts";

const MARKETS = new Set(["SA_MAIN", "US_OPTIONS", "US_BENCHMARKS"]);
function fail(message, code = "INVALID_APPLICATION_REQUEST", status = 400) { throw Object.assign(new Error(message), { code, status }); }

async function ownerProfile(base44) {
  const candidates = await base44.asServiceRole.entities.CustomerProfile.filter({ acquisition_source: "platform_owner_bootstrap" });
  return candidates.find((item) => item.role === "owner" && item.tags?.includes("owner")) || null;
}

async function notifyOwner(base44, context, application, platform, phase) {
  const owner = await ownerProfile(base44);
  if (!owner) return;
  const confirmed = phase === "confirmed";
  const titleAr = confirmed ? "أكد العميل التسجيل في منصة التداول" : "فتح العميل رابط الإحالة";
  const titleEn = confirmed ? "Customer confirmed platform registration" : "Customer opened a referral link";
  const bodyAr = confirmed
    ? `أكد ${context.profile.full_name} التسجيل في ${platform.name_ar}. رقم الطلب: ${application.unique_reference}.`
    : `فتح ${context.profile.full_name} رابط ${platform.name_ar}. رقم الطلب: ${application.unique_reference}.`;
  const bodyEn = confirmed
    ? `${context.profile.full_name} confirmed registration with ${platform.name_en}. Reference: ${application.unique_reference}.`
    : `${context.profile.full_name} opened the ${platform.name_en} referral link. Reference: ${application.unique_reference}.`;
  const dedupe = `market-application:${phase}:${application.id}`;
  const existing = await base44.asServiceRole.entities.Message.filter({ dedupe_key: dedupe });
  if (!existing[0]) await base44.asServiceRole.entities.Message.create({
    recipient_auth_user_id: owner.auth_user_id,
    recipient_customer_id: owner.id,
    message_type: "application",
    priority: "important",
    title_ar: titleAr,
    title_en: titleEn,
    body_ar: bodyAr,
    body_en: bodyEn,
    action_path: `/admin/access?application=${application.id}`,
    feed_eligible: true,
    dedupe_key: dedupe,
  });
}

function applicationView(item, platformsById) {
  const platform = platformsById[item.trading_platform_id] || null;
  return {
    ...item,
    platform: platform ? {
      id: platform.id,
      name_ar: platform.name_ar,
      name_en: platform.name_en,
      referral_url: platform.referral_url,
    } : {
      id: item.trading_platform_id,
      name_ar: item.platform_name_ar_snapshot || "",
      name_en: item.platform_name_en_snapshot || "",
      referral_url: item.referral_url_snapshot || "",
    },
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req, 16 * 1024);
    const context = await authorizationContext(base44, body.session_id);
    const applications = await base44.asServiceRole.entities.MarketAccessApplication.filter({ customer_id: context.profile.id }, "-created_date", MARKET_APPLICATION_LIMIT);
    const allPlatforms = await base44.asServiceRole.entities.TradingPlatform.list("display_order", MARKET_APPLICATION_LIMIT);
    const platformsById = Object.fromEntries(allPlatforms.map((platform) => [platform.id, platform]));
    const usedPlatformIds = new Set(applications.filter((item) => item.status !== "cancelled").map((item) => item.trading_platform_id));
    const latest = latestApplication(applications.filter((item) => item.status !== "cancelled"));
    const cooldownEnd = latest ? cooldownUntil(latest.referral_clicked_at || latest.created_date) : null;
    const cooldownActive = Boolean(cooldownEnd && cooldownEnd.getTime() > Date.now());

    if (body.action === "list") {
      const platforms = allPlatforms.filter((platform) => platform.active && !usedPlatformIds.has(platform.id));
      return Response.json({
        applications: applications.map((item) => applicationView(item, platformsById)),
        platforms,
        application_limit: MARKET_APPLICATION_LIMIT,
        remaining_platform_slots: Math.max(0, MARKET_APPLICATION_LIMIT - applications.length),
        cooldown: {
          active: cooldownActive,
          until: cooldownEnd?.toISOString() || null,
          latest_reference: latest?.unique_reference || null,
        },
      });
    }

    if (body.action === "open_referral") {
      if (applications.length >= MARKET_APPLICATION_LIMIT) fail("Maximum platform applications reached", "APPLICATION_LIMIT_REACHED", 409);
      if (cooldownActive) fail("A new platform can be requested after the 30-day waiting period", "PLATFORM_COOLDOWN_ACTIVE", 409);
      const market = String(body.market_code || "").toUpperCase();
      if (!MARKETS.has(market)) fail("Select a supported market", "MARKET_REQUIRED");
      const platform = await base44.asServiceRole.entities.TradingPlatform.get(String(body.trading_platform_id || ""));
      if (!platform?.active || !platform.supported_market_codes?.includes(market)) fail("Select an active trading platform", "TRADING_PLATFORM_REQUIRED");
      if (usedPlatformIds.has(platform.id)) fail("This trading platform was already used for your account", "PLATFORM_ALREADY_USED", 409);
      const now = new Date();
      const application = await base44.asServiceRole.entities.MarketAccessApplication.create({
        unique_reference: await uniqueApplicationReference(base44, market),
        customer_id: context.profile.id,
        auth_user_id: context.user.id,
        trading_platform_id: platform.id,
        market_code: market,
        status: "referral_opened",
        full_name_snapshot: context.profile.full_name,
        email_snapshot: context.profile.email_normalized,
        phone_snapshot: context.profile.phone_e164,
        platform_name_ar_snapshot: platform.name_ar,
        platform_name_en_snapshot: platform.name_en,
        referral_url_snapshot: platform.referral_url,
        referral_clicked_at: now.toISOString(),
        referral_click_count: 1,
        cooldown_until: cooldownUntil(now.toISOString())?.toISOString(),
        revision: 1,
      });
      await notifyOwner(base44, context, application, platform, "opened");
      await audit(base44, context.user.id, "market_access.referral_opened", "MarketAccessApplication", application.id, "success", "customer referral", {}, { market_code: market, trading_platform_id: platform.id });
      return Response.json({ application: applicationView(application, platformsById), referral_url: platform.referral_url });
    }

    if (body.action === "confirm_registration") {
      const application = await base44.asServiceRole.entities.MarketAccessApplication.get(String(body.application_id || ""));
      if (!application || application.customer_id !== context.profile.id) fail("Application not found", "APPLICATION_NOT_FOUND", 404);
      if (application.status !== "referral_opened") fail("This registration was already confirmed or reviewed", "APPLICATION_ALREADY_CONFIRMED", 409);
      const now = new Date().toISOString();
      const updated = await base44.asServiceRole.entities.MarketAccessApplication.update(application.id, {
        status: "pending",
        customer_confirmed_at: now,
        revision: Number(application.revision || 1) + 1,
      });
      const platform = platformsById[application.trading_platform_id] || {
        name_ar: application.platform_name_ar_snapshot,
        name_en: application.platform_name_en_snapshot,
      };
      await notifyOwner(base44, context, updated, platform, "confirmed");
      await audit(base44, context.user.id, "market_access.registration_confirmed", "MarketAccessApplication", application.id, "success", "customer confirmation", application, updated);
      return Response.json({ application: applicationView(updated, platformsById) });
    }

    return Response.json({ error: "Unsupported action", code: "UNSUPPORTED_ACTION" }, { status: 400 });
  } catch (error) { return replyError(error); }
});
