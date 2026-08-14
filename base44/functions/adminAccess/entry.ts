import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";
import { audit, authorizationContext, ensurePersonalAccount, readJsonBody, replyError } from "../../shared/security.ts";

const MARKETS = {
  SA_MAIN: { entitlement: "market.saudi", ar: "السوق السعودية", en: "Saudi Market" },
  US_OPTIONS: { entitlement: "market.us.options", ar: "عقود الخيارات الأمريكية", en: "U.S. Options" },
  US_BENCHMARKS: { entitlement: "market.us.benchmarks", ar: "المؤشرات والصناديق الأمريكية", en: "U.S. Indices & ETFs" },
};

function fail(message, code = "INVALID_ACCESS_REQUEST", status = 400) {
  throw Object.assign(new Error(message), { code, status });
}

function text(value, max = 300) {
  const result = String(value || "").trim();
  if (!result || result.length > max) fail("Required value is invalid");
  return result;
}

async function ownerContext(base44, sessionId) {
  const context = await authorizationContext(base44, sessionId);
  if (context.role !== "owner") fail("Owner access required", "OWNER_ONLY", 403);
  return context;
}

async function sendMessage(base44, payload) {
  const existing = await base44.asServiceRole.entities.Message.filter({ dedupe_key: payload.dedupe_key });
  return existing[0] || await base44.asServiceRole.entities.Message.create(payload);
}

async function trialPlan(base44, marketCode) {
  const code = `smart-investor-trial-10d-${marketCode.toLowerCase()}`;
  const rows = await base44.asServiceRole.entities.SubscriptionPlan.filter({ code });
  let plan = rows[0];
  const market = MARKETS[marketCode];
  if (!plan) {
    plan = await base44.asServiceRole.entities.SubscriptionPlan.create({
      code,
      name_ar: `تجربة مجانية 10 أيام - ${market.ar}`,
      name_en: `10-day free access - ${market.en}`,
      duration_months: 1,
      price_sar: 0,
      active: true,
      revision: 1,
    });
  }
  const entitlements = await base44.asServiceRole.entities.PlanEntitlement.filter({ plan_id: plan.id, code: market.entitlement });
  if (!entitlements[0]) await base44.asServiceRole.entities.PlanEntitlement.create({ plan_id: plan.id, code: market.entitlement, enabled: true });
  return plan;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req, 64 * 1024);
    const context = await ownerContext(base44, body.session_id);

    if (body.action === "list_platforms") {
      const platforms = await base44.asServiceRole.entities.TradingPlatform.list("display_order", 200);
      return Response.json({ platforms });
    }

    if (body.action === "save_platform") {
      const supported = [...new Set((Array.isArray(body.supported_market_codes) ? body.supported_market_codes : []).map((item) => String(item).toUpperCase()))]
        .filter((item) => MARKETS[item]);
      if (!supported.length) fail("Select at least one supported market", "MARKET_REQUIRED");
      const payload = {
        code: text(body.code, 60).toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
        name_ar: text(body.name_ar, 120),
        name_en: text(body.name_en, 120),
        referral_url: text(body.referral_url, 1000),
        supported_market_codes: supported,
        active: body.active !== false,
        display_order: Math.max(0, Number(body.display_order) || 0),
        revision: Math.max(1, Number(body.revision) || 1),
      };
      let platform;
      if (body.id) platform = await base44.asServiceRole.entities.TradingPlatform.update(String(body.id), { ...payload, revision: payload.revision + 1 });
      else platform = await base44.asServiceRole.entities.TradingPlatform.create(payload);
      await audit(base44, context.user.id, "trading_platform.saved", "TradingPlatform", platform.id, "success", "owner action", {}, payload);
      return Response.json({ platform });
    }

    if (body.action === "list_applications") {
      const applications = await base44.asServiceRole.entities.MarketAccessApplication.list("-created_date", Math.min(Math.max(Number(body.limit) || 100, 1), 300));
      const platformIds = [...new Set(applications.map((item) => item.trading_platform_id).filter(Boolean))];
      const platforms = {};
      for (const id of platformIds) {
        try { platforms[id] = await base44.asServiceRole.entities.TradingPlatform.get(id); } catch { /* keep a stable orphaned application */ }
      }
      return Response.json({ applications, platforms });
    }

    if (body.action === "decide_application") {
      const application = await base44.asServiceRole.entities.MarketAccessApplication.get(String(body.application_id || ""));
      if (!application) fail("Application not found", "APPLICATION_NOT_FOUND", 404);
      if (application.status !== "pending") fail("Application was already reviewed", "APPLICATION_ALREADY_REVIEWED", 409);
      const decision = String(body.decision || "");
      if (!new Set(["approved", "rejected"]).has(decision)) fail("Select an approval decision", "DECISION_REQUIRED");
      const reason = text(body.reason, 500);
      const customer = await base44.asServiceRole.entities.CustomerProfile.get(application.customer_id);
      if (!customer || customer.role === "owner") fail("Customer not found", "CUSTOMER_NOT_FOUND", 404);
      const now = new Date();

      if (decision === "rejected") {
        const updated = await base44.asServiceRole.entities.MarketAccessApplication.update(application.id, {
          status: "rejected", reviewed_by_user_id: context.user.id, reviewed_at: now.toISOString(), decision_reason: reason,
          revision: Number(application.revision || 1) + 1,
        });
        await sendMessage(base44, {
          recipient_auth_user_id: customer.auth_user_id, recipient_customer_id: customer.id, message_type: "application", priority: "important",
          title_ar: "تحديث طلب الوصول", title_en: "Access application update",
          body_ar: `تعذر قبول طلبك رقم ${application.unique_reference}. يمكنك مراجعة بياناتك والتواصل مع الإدارة.`,
          body_en: `We could not approve application ${application.unique_reference}. Please review your details and contact support.`,
          action_path: "/application-status", feed_eligible: true, dedupe_key: `application:rejected:${application.id}`,
        });
        await audit(base44, context.user.id, "market_access.rejected", "MarketAccessApplication", application.id, "success", reason, application, updated);
        return Response.json({ application: updated });
      }

      const duplicate = await base44.asServiceRole.entities.Subscription.filter({ application_id: application.id });
      if (duplicate[0]) fail("An access subscription already exists", "DUPLICATE_APPLICATION_SUBSCRIPTION", 409);
      const activatedProfile = customer.account_status === "active" ? customer : await base44.asServiceRole.entities.CustomerProfile.update(customer.id, {
        account_status: "active", tags: [...new Set([...(customer.tags || []), "owner_approved"])],
      });
      const { account } = await ensurePersonalAccount(base44, activatedProfile, context.user.id);
      const plan = await trialPlan(base44, application.market_code);
      const endsAt = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      const subscription = await base44.asServiceRole.entities.Subscription.create({
        customer_id: customer.id, account_id: account.id, plan_id: plan.id, application_id: application.id,
        trading_platform_id: application.trading_platform_id, market_code: application.market_code, unique_reference: application.unique_reference,
        status: "active", starts_at: now.toISOString(), ends_at: endsAt.toISOString(), created_by_user_id: context.user.id,
        activation_method: "manual", reason, revision: 1,
      });
      const updated = await base44.asServiceRole.entities.MarketAccessApplication.update(application.id, {
        status: "approved", reviewed_by_user_id: context.user.id, reviewed_at: now.toISOString(), decision_reason: reason,
        approved_subscription_id: subscription.id, revision: Number(application.revision || 1) + 1,
      });
      await sendMessage(base44, {
        recipient_auth_user_id: customer.auth_user_id, recipient_customer_id: customer.id, message_type: "application", priority: "important",
        title_ar: "تم تفعيل السوق", title_en: "Market access activated",
        body_ar: `تم قبول طلبك وتفعيل ${MARKETS[application.market_code].ar} مجاناً لمدة 10 أيام.`,
        body_en: `Your application was approved and ${MARKETS[application.market_code].en} is active for 10 free days.`,
        action_path: "/dashboard", feed_eligible: true, dedupe_key: `application:approved:${application.id}`,
      });
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: customer.email_normalized,
          subject: customer.preferred_language === "en" ? "Your Smart Investor access is ready" : "تم تفعيل وصولك في المستثمر الذكي",
          body: customer.preferred_language === "en"
            ? `Your ${MARKETS[application.market_code].en} access is active for 10 days. Reference: ${application.unique_reference}`
            : `تم تفعيل ${MARKETS[application.market_code].ar} لمدة 10 أيام. رقم الطلب: ${application.unique_reference}`,
        });
      } catch { /* inbox is authoritative when email delivery is unavailable */ }
      await audit(base44, context.user.id, "market_access.approved", "MarketAccessApplication", application.id, "success", reason, application, updated);
      return Response.json({ application: updated, subscription, profile: activatedProfile });
    }

    return Response.json({ error: "Unsupported action", code: "UNSUPPORTED_ACTION" }, { status: 400 });
  } catch (error) {
    return replyError(error);
  }
});
