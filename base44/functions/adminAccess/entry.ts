import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";
import { audit, authorizationContext, ensurePersonalAccount, readJsonBody, replyError } from "../../shared/security.ts";

const ACCESS_DAYS = 30;
const MARKETS = {
  SA_MAIN: { entitlement: "market.saudi", ar: "السوق السعودية", en: "Saudi Market" },
  US_OPTIONS: { entitlement: "market.us.options", ar: "الأسهم الأمريكية المؤهلة للخيارات", en: "U.S. Optionable Stocks" },
  US_BENCHMARKS: { entitlement: "market.us.benchmarks", ar: "المؤشرات والصناديق الأمريكية", en: "U.S. Indices & ETFs" },
};

function fail(message, code = "INVALID_ACCESS_REQUEST", status = 400) {
  throw Object.assign(new Error(message), { code, status });
}
function text(value, max = 300) {
  const result = String(value || "").trim();
  if (!result || result.length > max) fail("Required value is invalid", "INVALID_REQUIRED_VALUE");
  return result;
}
function referralUrl(value) {
  const result = text(value, 1000);
  let parsed;
  try { parsed = new URL(result); } catch { fail("Enter a valid referral URL", "INVALID_REFERRAL_URL"); }
  if (parsed.protocol !== "https:") fail("Referral URL must use HTTPS", "INVALID_REFERRAL_URL");
  return parsed.toString();
}
function platformCode(value) {
  const result = text(value, 60).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!/^[a-z0-9][a-z0-9_-]{0,59}$/.test(result)) fail("Platform code must contain English letters or numbers", "INVALID_PLATFORM_CODE");
  return result;
}
async function ownerContext(base44, sessionId) {
  const context = await authorizationContext(base44, sessionId);
  if (context.role !== "owner") fail("Owner access required", "OWNER_ONLY", 403);
  return context;
}
async function sendMessage(base44, payload) {
  const existing = await base44.asServiceRole.entities.Message.filter({ dedupe_key: payload.dedupe_key });
  const message = existing[0] || await base44.asServiceRole.entities.Message.create(payload);
  const confirmed = await base44.asServiceRole.entities.Message.get(message.id);
  if (!confirmed?.id) fail("Inbox message could not be confirmed", "MESSAGE_NOT_CONFIRMED", 500);
  return confirmed;
}
async function accessPlan(base44, marketCode) {
  const code = `smart-investor-access-30d-${marketCode.toLowerCase()}`;
  const rows = await base44.asServiceRole.entities.SubscriptionPlan.filter({ code });
  let plan = rows[0];
  const market = MARKETS[marketCode];
  if (!plan) {
    plan = await base44.asServiceRole.entities.SubscriptionPlan.create({
      code, name_ar: `وصول مجاني 30 يوماً - ${market.ar}`, name_en: `30-day free access - ${market.en}`,
      duration_months: 1, price_sar: 0, active: true, revision: 1,
    });
  }
  const entitlements = await base44.asServiceRole.entities.PlanEntitlement.filter({ plan_id: plan.id, code: market.entitlement });
  if (!entitlements[0]) await base44.asServiceRole.entities.PlanEntitlement.create({ plan_id: plan.id, code: market.entitlement, enabled: true });
  return await base44.asServiceRole.entities.SubscriptionPlan.get(plan.id);
}
async function confirmedCustomerAccess(base44, customerId) {
  const now = Date.now();
  const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ customer_id: customerId, status: "active" });
  const active = subscriptions.filter((row) => !row.ends_at || new Date(row.ends_at).getTime() > now);
  const access = [];
  for (const subscription of active) {
    const market = MARKETS[subscription.market_code];
    if (!market) continue;
    const entitlements = await base44.asServiceRole.entities.PlanEntitlement.filter({ plan_id: subscription.plan_id, code: market.entitlement, enabled: true });
    if (!entitlements[0]) continue;
    access.push({ market_code: subscription.market_code, subscription_id: subscription.id, starts_at: subscription.starts_at, ends_at: subscription.ends_at, status: subscription.status });
  }
  return access;
}
async function reconcileLegacyAccess(base44, actor) {
  const plans = await base44.asServiceRole.entities.SubscriptionPlan.list("-created_date", 200);
  const legacyPlanIds = new Set(plans.filter((plan) => String(plan.code || "").startsWith("smart-investor-trial-10d-")).map((plan) => plan.id));
  if (!legacyPlanIds.size) return { checked: 0, updated: 0 };
  const subscriptions = await base44.asServiceRole.entities.Subscription.list("-created_date", 500);
  let updated = 0;
  for (const subscription of subscriptions) {
    if (!legacyPlanIds.has(subscription.plan_id) || subscription.status !== "active" || !subscription.starts_at) continue;
    const expectedEnd = new Date(new Date(subscription.starts_at).getTime() + ACCESS_DAYS * 24 * 60 * 60 * 1000);
    if (new Date(subscription.ends_at).getTime() >= expectedEnd.getTime()) continue;
    const confirmed = await base44.asServiceRole.entities.Subscription.update(subscription.id, { ends_at: expectedEnd.toISOString(), reason: `${subscription.reason || ""} | corrected_to_${ACCESS_DAYS}_days`.trim(), revision: Number(subscription.revision || 1) + 1 });
    await audit(base44, actor.id, "market_access.legacy_duration_corrected", "Subscription", subscription.id, "success", `corrected to ${ACCESS_DAYS} days`, subscription, confirmed);
    updated += 1;
  }
  return { checked: subscriptions.length, updated };
}
async function decideOne(base44, actor, applicationId, decision, reason) {
  const application = await base44.asServiceRole.entities.MarketAccessApplication.get(String(applicationId || ""));
  if (!application) fail("Application not found", "APPLICATION_NOT_FOUND", 404);
  if (!MARKETS[application.market_code]) fail("Unsupported market", "UNSUPPORTED_MARKET", 400);
  if (application.status !== "pending") {
    if (application.status === decision) {
      return { application, access_snapshot: await confirmedCustomerAccess(base44, application.customer_id), idempotent: true, message_delivery: { inbox: "existing", email: "not_sent" } };
    }
    fail("Application was already reviewed", "APPLICATION_ALREADY_REVIEWED", 409);
  }
  const customer = await base44.asServiceRole.entities.CustomerProfile.get(application.customer_id);
  if (!customer || customer.role === "owner") fail("Customer not found", "CUSTOMER_NOT_FOUND", 404);
  const now = new Date();

  if (decision === "rejected") {
    const updated = await base44.asServiceRole.entities.MarketAccessApplication.update(application.id, {
      status: "rejected", reviewed_by_user_id: actor.id, reviewed_at: now.toISOString(), decision_reason: reason,
      revision: Number(application.revision || 1) + 1,
    });
    const confirmed = await base44.asServiceRole.entities.MarketAccessApplication.get(updated.id);
    await sendMessage(base44, {
      recipient_auth_user_id: customer.auth_user_id, recipient_customer_id: customer.id, message_type: "application", priority: "important",
      title_ar: "نتيجة طلب الوصول", title_en: "Access application result",
      body_ar: `لم يتم قبول طلبك رقم ${application.unique_reference}. السبب: ${reason}. يمكنك تصحيح بياناتك أو التواصل مع الإدارة.`,
      body_en: `Application ${application.unique_reference} was not approved. Reason: ${reason}. You may correct your details or contact support.`,
      action_path: "/application-status", feed_eligible: true, dedupe_key: `application:rejected:${application.id}`,
    });
    await audit(base44, actor.id, "market_access.rejected", "MarketAccessApplication", application.id, "success", reason, application, confirmed);
    return { application: confirmed, access_snapshot: await confirmedCustomerAccess(base44, customer.id), idempotent: false, message_delivery: { inbox: "confirmed", email: "not_sent" } };
  }

  const duplicates = await base44.asServiceRole.entities.Subscription.filter({ application_id: application.id });
  let subscription = duplicates.find((row) => row.status === "active") || duplicates[0] || null;
  let activatedProfile = customer;
  if (customer.account_status !== "active") {
    activatedProfile = await base44.asServiceRole.entities.CustomerProfile.update(customer.id, { account_status: "active", tags: [...new Set([...(customer.tags || []), "owner_approved"])] });
  }
  const { account } = await ensurePersonalAccount(base44, activatedProfile, actor.id);
  if (!subscription) {
    const plan = await accessPlan(base44, application.market_code);
    const endsAt = new Date(now.getTime() + ACCESS_DAYS * 24 * 60 * 60 * 1000);
    subscription = await base44.asServiceRole.entities.Subscription.create({
      customer_id: customer.id, account_id: account.id, plan_id: plan.id, application_id: application.id,
      trading_platform_id: application.trading_platform_id, market_code: application.market_code, unique_reference: application.unique_reference,
      status: "active", starts_at: now.toISOString(), ends_at: endsAt.toISOString(), created_by_user_id: actor.id,
      activation_method: "manual", reason, revision: 1,
    });
  }
  const confirmedSubscription = await base44.asServiceRole.entities.Subscription.get(subscription.id);
  if (!confirmedSubscription || confirmedSubscription.status !== "active") fail("Subscription activation could not be confirmed", "SUBSCRIPTION_NOT_CONFIRMED", 500);
  const updated = await base44.asServiceRole.entities.MarketAccessApplication.update(application.id, {
    status: "approved", reviewed_by_user_id: actor.id, reviewed_at: now.toISOString(), decision_reason: reason,
    approved_subscription_id: confirmedSubscription.id, revision: Number(application.revision || 1) + 1,
  });
  const confirmed = await base44.asServiceRole.entities.MarketAccessApplication.get(updated.id);
  await sendMessage(base44, {
    recipient_auth_user_id: customer.auth_user_id, recipient_customer_id: customer.id, message_type: "application", priority: "important",
    title_ar: "تم تفعيل السوق", title_en: "Market access activated",
    body_ar: `تم قبول طلبك وتفعيل ${MARKETS[application.market_code].ar} مجاناً لمدة ${ACCESS_DAYS} يوماً حتى ${new Date(confirmedSubscription.ends_at).toLocaleDateString('ar-SA')}.`,
    body_en: `Your application was approved. ${MARKETS[application.market_code].en} is active free for ${ACCESS_DAYS} days, until ${new Date(confirmedSubscription.ends_at).toLocaleDateString('en-US')}.`,
    action_path: "/dashboard", feed_eligible: true, dedupe_key: `application:approved:${application.id}`,
  });
  let emailStatus = "best_effort_failed";
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: customer.email_normalized,
      subject: customer.preferred_language === "en" ? "Your Smart Investor access is ready" : "تم تفعيل وصولك في المستثمر الذكي",
      body: customer.preferred_language === "en"
        ? `Your ${MARKETS[application.market_code].en} access is active for ${ACCESS_DAYS} days. Reference: ${application.unique_reference}`
        : `تم تفعيل ${MARKETS[application.market_code].ar} لمدة ${ACCESS_DAYS} يوماً. رقم الطلب: ${application.unique_reference}`,
    });
    emailStatus = "sent";
  } catch { /* The confirmed internal inbox remains authoritative. */ }
  const snapshot = await confirmedCustomerAccess(base44, customer.id);
  if (!snapshot.some((row) => row.subscription_id === confirmedSubscription.id && row.market_code === application.market_code)) fail("Market access could not be confirmed", "ACCESS_SNAPSHOT_NOT_CONFIRMED", 500);
  await audit(base44, actor.id, "market_access.approved", "MarketAccessApplication", application.id, "success", reason, application, confirmed);
  return { application: confirmed, subscription: confirmedSubscription, profile: activatedProfile, access_snapshot: snapshot, idempotent: Boolean(duplicates.length), message_delivery: { inbox: "confirmed", email: emailStatus } };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req, 64 * 1024);
    const context = await ownerContext(base44, body.session_id);

    if (body.action === "list_platforms") {
      return Response.json({ platforms: await base44.asServiceRole.entities.TradingPlatform.list("display_order", 200) });
    }

    if (body.action === "reconcile_legacy_access") {
      const result = await reconcileLegacyAccess(base44, context.user);
      return Response.json({ ok: true, confirmed: true, ...result });
    }

    if (body.action === "save_platform") {
      const supported = [...new Set((Array.isArray(body.supported_market_codes) ? body.supported_market_codes : []).map((item) => String(item).toUpperCase()))].filter((item) => MARKETS[item]);
      if (!supported.length) fail("Select at least one supported market", "MARKET_REQUIRED");
      const payload = { code: platformCode(body.code), name_ar: text(body.name_ar, 120), name_en: text(body.name_en, 120), referral_url: referralUrl(body.referral_url), supported_market_codes: supported, active: body.active !== false, display_order: Math.max(0, Number(body.display_order) || 0) };
      if (!body.id) {
        const existing = await base44.asServiceRole.entities.TradingPlatform.list("display_order", 101);
        if (existing.length >= 100) fail("The platform limit of 100 has been reached", "PLATFORM_LIMIT_REACHED", 409);
      }
      const codeMatches = await base44.asServiceRole.entities.TradingPlatform.filter({ code: payload.code });
      if (codeMatches.some((item) => item.id !== String(body.id || ""))) fail("This platform code is already in use", "DUPLICATE_PLATFORM_CODE", 409);
      const urlMatches = await base44.asServiceRole.entities.TradingPlatform.filter({ referral_url: payload.referral_url });
      if (urlMatches.some((item) => item.id !== String(body.id || ""))) fail("This referral link is already assigned to another platform", "DUPLICATE_REFERRAL_URL", 409);
      let platform;
      if (body.id) {
        const current = await base44.asServiceRole.entities.TradingPlatform.get(String(body.id));
        if (Number(body.revision || 0) !== Number(current.revision || 1)) fail("Platform changed in another session", "REVISION_CONFLICT", 409);
        platform = await base44.asServiceRole.entities.TradingPlatform.update(current.id, { ...payload, revision: Number(current.revision || 1) + 1 });
      } else platform = await base44.asServiceRole.entities.TradingPlatform.create({ ...payload, revision: 1 });
      const confirmed = await base44.asServiceRole.entities.TradingPlatform.get(platform.id);
      if (!confirmed || confirmed.code !== payload.code || confirmed.referral_url !== payload.referral_url) fail("Platform save could not be confirmed", "PLATFORM_SAVE_NOT_CONFIRMED", 500);
      await audit(base44, context.user.id, "trading_platform.saved", "TradingPlatform", platform.id, "success", "owner action", {}, confirmed);
      return Response.json({ ok: true, confirmed: true, platform: confirmed, created: !body.id });
    }

    if (body.action === "list_applications") {
      const applications = await base44.asServiceRole.entities.MarketAccessApplication.list("-created_date", Math.min(Math.max(Number(body.limit) || 100, 1), 300));
      const platformIds = [...new Set(applications.map((item) => item.trading_platform_id).filter(Boolean))];
      const customerIds = [...new Set(applications.map((item) => item.customer_id).filter(Boolean))];
      const platforms = {};
      for (const id of platformIds) { try { platforms[id] = await base44.asServiceRole.entities.TradingPlatform.get(id); } catch { /* snapshot remains */ } }
      const customer_access = {};
      for (const id of customerIds) customer_access[id] = await confirmedCustomerAccess(base44, id);
      return Response.json({ applications, platforms, customer_access, access_days: ACCESS_DAYS });
    }

    if (body.action === "decide_application" || body.action === "decide_applications") {
      const decision = String(body.decision || "");
      if (!new Set(["approved", "rejected"]).has(decision)) fail("Select an approval decision", "DECISION_REQUIRED");
      const reason = text(body.reason, 500);
      const ids = body.action === "decide_applications" ? [...new Set((Array.isArray(body.application_ids) ? body.application_ids : []).map(String).filter(Boolean))] : [String(body.application_id || "")];
      if (!ids.length || ids.length > 100) fail("Select between 1 and 100 applications", "APPLICATION_SELECTION_REQUIRED");
      const batch_id = crypto.randomUUID();
      const results = [];
      for (const id of ids) {
        try { results.push({ application_id: id, ok: true, ...(await decideOne(base44, context.user, id, decision, reason)) }); }
        catch (error) { results.push({ application_id: id, ok: false, code: error?.code || "APPLICATION_DECISION_FAILED", error: String(error?.message || "Application decision failed") }); }
      }
      await audit(base44, context.user.id, "market_access.batch_decision", "MarketAccessBatch", batch_id, results.every((row) => row.ok) ? "success" : "partial", reason, { application_ids: ids, decision }, { results: results.map((row) => ({ application_id: row.application_id, ok: row.ok, code: row.code || "OK" })) });
      const response = { ok: results.every((row) => row.ok), confirmed: true, batch_id, decision, requested_count: ids.length, success_count: results.filter((row) => row.ok).length, failure_count: results.filter((row) => !row.ok).length, results };
      if (body.action === "decide_application" && results[0]?.ok) return Response.json({ ...response, ...results[0] });
      return Response.json(response, { status: results.some((row) => row.ok) ? 200 : 409 });
    }

    return Response.json({ error: "Unsupported action", code: "UNSUPPORTED_ACTION" }, { status: 400 });
  } catch (error) { return replyError(error); }
});
