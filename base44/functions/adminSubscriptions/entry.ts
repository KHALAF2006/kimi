import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, authorizationContext, ensurePersonalAccount, readJsonBody, replyError } from "../../shared/security.ts";
import { ENTITLEMENT_CODES } from "../../shared/permissions.ts";

const TRANSITIONS = {
  pending: new Set(["active", "banned"]),
  active: new Set(["suspended", "expired", "banned"]),
  suspended: new Set(["active", "expired", "banned"]),
  expired: new Set(["active"]),
  banned: new Set([]),
};

function bad(message, code = "INVALID_SUBSCRIPTION_REQUEST", status = 400) {
  throw Object.assign(new Error(message), { status, code });
}

function reasonFrom(value) {
  const reason = String(value || "").trim();
  if (reason.length < 3 || reason.length > 500) bad("A reason between 3 and 500 characters is required", "REASON_REQUIRED");
  return reason;
}

function requireContextPermission(context, permission) {
  if (!context.permissions.has(permission)) bad("Forbidden", "PERMISSION_DENIED", 403);
}

function cleanPlan(value) {
  const code = String(value?.code || "").trim().toLowerCase();
  const nameAr = String(value?.name_ar || "").trim();
  const nameEn = String(value?.name_en || "").trim();
  const duration = Number(value?.duration_months);
  const price = Number(value?.price_sar);
  if (!/^[a-z][a-z0-9_]{2,49}$/.test(code)) bad("Invalid plan code");
  if (nameAr.length < 2 || nameEn.length < 2) bad("Arabic and English plan names are required");
  if (![1, 3, 6].includes(duration)) bad("Plan duration must be 1, 3, or 6 months");
  if (!Number.isFinite(price) || price < 0) bad("Plan price must be zero or greater");
  return { code, name_ar: nameAr.slice(0, 80), name_en: nameEn.slice(0, 80), duration_months: duration, price_sar: price, active: value?.active !== false };
}

function addMonths(date, count) {
  const value = new Date(date);
  value.setUTCMonth(value.getUTCMonth() + count);
  return value.toISOString();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req);
    const context = await authorizationContext(base44, body.session_id);
    requireContextPermission(context, "subscriptions.read");

    if (body.action === "plans") {
      const plans = await base44.asServiceRole.entities.SubscriptionPlan.list("price_sar", 100);
      const entitlements = await base44.asServiceRole.entities.PlanEntitlement.list("code", 500);
      return Response.json({ plans: plans.map((plan) => ({ ...plan, entitlements: entitlements.filter((item) => item.plan_id === plan.id) })) });
    }

    if (body.action === "list") {
      const subscriptions = await base44.asServiceRole.entities.Subscription.list("-created_date", Math.min(Math.max(Number(body.limit) || 100, 1), 200));
      return Response.json({ subscriptions });
    }

    if (body.action === "create_plan") {
      requireContextPermission(context, "plans.manage");
      if (context.role !== "owner") bad("Only the platform owner can create plans", "OWNER_REQUIRED", 403);
      const reason = reasonFrom(body.reason);
      const input = cleanPlan(body.plan);
      const matches = await base44.asServiceRole.entities.SubscriptionPlan.filter({ code: input.code });
      if (matches[0]) bad("Plan code already exists", "PLAN_CODE_CONFLICT", 409);
      const plan = await base44.asServiceRole.entities.SubscriptionPlan.create({ ...input, revision: 1 });
      await audit(base44, context.user.id, "subscription_plan.create", "SubscriptionPlan", plan.id, "success", reason, {}, plan);
      return Response.json({ plan });
    }

    if (body.action === "set_entitlements") {
      requireContextPermission(context, "plans.manage");
      if (context.role !== "owner") bad("Only the platform owner can manage plan entitlements", "OWNER_REQUIRED", 403);
      const reason = reasonFrom(body.reason);
      const plan = await base44.asServiceRole.entities.SubscriptionPlan.get(String(body.plan_id || ""));
      if (!plan) bad("Plan not found", "PLAN_NOT_FOUND", 404);
      if (Number(body.expected_revision) !== Number(plan.revision || 1)) bad("Plan was changed by another administrator", "REVISION_CONFLICT", 409);
      const diffMode = Array.isArray(body.changes);
      const requested = diffMode ? body.changes : (Array.isArray(body.entitlements) ? body.entitlements : []);
      if (!requested.length) bad("At least one entitlement change is required", "EMPTY_ENTITLEMENT_CHANGE");
      if (requested.some((item) => !ENTITLEMENT_CODES.has(String(item?.code || "")))) bad("Unknown entitlement code");
      const before = await base44.asServiceRole.entities.PlanEntitlement.filter({ plan_id: plan.id });
      const existingByCode = new Map(before.map((item) => [item.code, item]));
      const requestedCodes = new Set(requested.map((item) => String(item.code)));
      for (const item of requested) {
        const payload = {
          plan_id: plan.id,
          code: String(item.code),
          enabled: item.enabled !== false,
          ...(Number.isFinite(Number(item.limit_value)) ? { limit_value: Math.max(0, Number(item.limit_value)) } : {}),
          config: item.config && typeof item.config === "object" ? item.config : {},
        };
        const existing = existingByCode.get(payload.code);
        if (existing) await base44.asServiceRole.entities.PlanEntitlement.update(existing.id, payload);
        else await base44.asServiceRole.entities.PlanEntitlement.create(payload);
      }
      if (!diffMode) {
        for (const existing of before) {
          if (!requestedCodes.has(existing.code) && existing.enabled !== false) {
            await base44.asServiceRole.entities.PlanEntitlement.update(existing.id, { enabled: false });
          }
        }
      }
      const updated = await base44.asServiceRole.entities.SubscriptionPlan.update(plan.id, { revision: Number(plan.revision || 1) + 1 });
      const after = await base44.asServiceRole.entities.PlanEntitlement.filter({ plan_id: plan.id });
      await audit(base44, context.user.id, "subscription_plan.entitlements_changed", "SubscriptionPlan", plan.id, "success", reason, { plan, entitlements: before }, { plan: updated, entitlements: after });
      return Response.json({ plan: updated, entitlements: after });
    }

    if (body.action === "activate") {
      requireContextPermission(context, "subscriptions.manage");
      const reason = reasonFrom(body.reason);
      const customer = await base44.asServiceRole.entities.CustomerProfile.get(String(body.customer_id || ""));
      const plan = await base44.asServiceRole.entities.SubscriptionPlan.get(String(body.plan_id || ""));
      if (!customer) bad("Customer not found", "CUSTOMER_NOT_FOUND", 404);
      if (!plan?.active) bad("Active plan not found", "PLAN_NOT_FOUND", 404);
      const memberships = await base44.asServiceRole.entities.AccountMember.filter({ customer_id: customer.id, status: "active" });
      const initialized = memberships[0] ? null : await ensurePersonalAccount(base44, customer, context.user.id);
      const allowedAccountIds = new Set([
        ...memberships.map((item) => String(item.account_id)),
        ...(initialized?.membership?.account_id ? [String(initialized.membership.account_id)] : []),
      ]);
      const requestedAccountId = String(body.account_id || "");
      if (requestedAccountId && !allowedAccountIds.has(requestedAccountId)) bad("Customer is not an active member of the requested account", "ACCOUNT_MEMBERSHIP_REQUIRED", 403);
      const accountId = requestedAccountId || [...allowedAccountIds][0] || "";
      if (!accountId) bad("Customer account could not be initialized", "ACCOUNT_NOT_INITIALIZED", 409);
      const startsAt = body.starts_at ? new Date(body.starts_at) : new Date();
      if (Number.isNaN(startsAt.getTime())) bad("Invalid subscription start date");
      const subscription = await base44.asServiceRole.entities.Subscription.create({
        customer_id: customer.id,
        account_id: accountId,
        plan_id: plan.id,
        status: "active",
        starts_at: startsAt.toISOString(),
        ends_at: addMonths(startsAt, Number(plan.duration_months)),
        reason,
        created_by_user_id: context.user.id,
        activation_method: "manual",
        revision: 1,
      });
      await audit(base44, context.user.id, "subscription.manual_activation", "Subscription", subscription.id, "success", reason, {}, subscription);
      return Response.json({ subscription });
    }

    if (body.action === "transition") {
      requireContextPermission(context, "subscriptions.manage");
      const reason = reasonFrom(body.reason);
      const before = await base44.asServiceRole.entities.Subscription.get(String(body.id || ""));
      if (!before) bad("Subscription not found", "SUBSCRIPTION_NOT_FOUND", 404);
      const status = String(body.status || "");
      if (!TRANSITIONS[before.status]?.has(status)) bad(`Transition from ${before.status} to ${status} is not allowed`, "INVALID_SUBSCRIPTION_TRANSITION", 409);
      if (body.expected_revision !== undefined && Number(body.expected_revision) !== Number(before.revision || 1)) bad("Subscription was changed by another administrator", "REVISION_CONFLICT", 409);
      const timestamp = new Date().toISOString();
      const renewalPlan = status === "active" && before.status === "expired"
        ? await base44.asServiceRole.entities.SubscriptionPlan.get(before.plan_id)
        : null;
      if (renewalPlan && renewalPlan.active === false) bad("Inactive plans cannot be renewed", "PLAN_INACTIVE", 409);
      const patch = {
        status,
        reason,
        revision: Number(before.revision || 1) + 1,
        ...(status === "suspended" ? { suspended_at: timestamp } : {}),
        ...(status === "banned" ? { banned_at: timestamp } : {}),
        ...(status === "active" && before.status === "expired"
          ? {
              starts_at: timestamp,
              ends_at: addMonths(timestamp, Number(renewalPlan?.duration_months || 1)),
            }
          : {}),
      };
      const after = await base44.asServiceRole.entities.Subscription.update(before.id, patch);
      const otherActiveSubscriptions = (await base44.asServiceRole.entities.Subscription.filter({ customer_id: before.customer_id, status: "active" }))
        .filter((item) => item.id !== before.id && new Date(item.ends_at).getTime() > Date.now());
      // Subscription state is plan-scoped. Account-wide bans belong to adminCustomers;
      // never revoke a valid session while another market subscription is still active.
      const revokeSessions = ["suspended", "expired", "banned"].includes(status) && otherActiveSubscriptions.length === 0;
      if (revokeSessions) {
        await base44.asServiceRole.entities.ActiveDeviceSession.updateMany({ customer_id: before.customer_id, revoked_at: null }, { $set: { revoked_at: timestamp } });
      }
      await audit(base44, context.user.id, "subscription.transition", "Subscription", before.id, "success", reason, before, after);
      return Response.json({ subscription: after, sessions_revoked: revokeSessions, remaining_active_subscriptions: otherActiveSubscriptions.length });
    }

    return Response.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return replyError(error);
  }
});
