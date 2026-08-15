import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, authorizationContext, readJsonBody, replyError, requirePermission } from "../../shared/security.ts";

const ACCOUNT_STATUSES = new Set(["pending_verification", "pending_owner_approval", "active", "temporarily_blocked", "suspended", "banned", "closed"]);

function bad(message, code = "INVALID_CUSTOMER_REQUEST", status = 400) {
  throw Object.assign(new Error(message), { status, code });
}

function reasonFrom(value) {
  const reason = String(value || "").trim();
  if (reason.length < 3 || reason.length > 500) bad("A reason between 3 and 500 characters is required", "REASON_REQUIRED");
  return reason;
}

function maskedEmail(value) {
  return String(value || "").replace(/(^.).*(@.*$)/, "$1***$2");
}

function maskedPhone(value) {
  return String(value || "").replace(/.(?=.{4})/g, "*");
}

function customerView(customer, full) {
  const base = {
    id: customer.id,
    customer_number: customer.customer_number,
    full_name: customer.full_name,
    preferred_language: customer.preferred_language,
    country_code: customer.country_code,
    account_status: customer.account_status,
    role: customer.role,
    tags: customer.tags || [],
    email_verified_at: customer.email_verified_at,
    phone_accuracy_acknowledged_at: customer.phone_accuracy_acknowledged_at,
    last_login_at: customer.last_login_at,
    last_seen_at: customer.last_seen_at,
    created_date: customer.created_date,
  };
  return {
    ...base,
    email_normalized: full ? customer.email_normalized : maskedEmail(customer.email_normalized),
    phone_e164: full ? customer.phone_e164 : maskedPhone(customer.phone_e164),
  };
}

async function managedCustomer(base44, id) {
  const customer = await base44.asServiceRole.entities.CustomerProfile.get(String(id || ""));
  if (!customer || customer.role !== "user") bad("Customer not found", "CUSTOMER_NOT_FOUND", 404);
  return customer;
}

async function customerDetail(base44, customer, canReadFull) {
  const applications = await base44.asServiceRole.entities.MarketAccessApplication.filter({ customer_id: customer.id });
  const initialApplication = applications.find((item) => item.id === customer.initial_application_id) || applications[0] || null;
  const [subscriptions, sessions, consents, notes, memberships, watchlists, alerts, preferences, registrationMessages, registrationAudits] = await Promise.all([
    base44.asServiceRole.entities.Subscription.filter({ customer_id: customer.id }),
    base44.asServiceRole.entities.ActiveDeviceSession.filter({ customer_id: customer.id }),
    base44.asServiceRole.entities.CustomerConsent.filter({ customer_id: customer.id }),
    base44.asServiceRole.entities.CustomerNote.filter({ customer_id: customer.id }),
    base44.asServiceRole.entities.AccountMember.filter({ customer_id: customer.id }),
    base44.asServiceRole.entities.Watchlist.filter({ customer_id: customer.id }),
    base44.asServiceRole.entities.AlertRule.filter({ customer_id: customer.id }),
    base44.asServiceRole.entities.NotificationPreference.filter({ customer_id: customer.id }),
    initialApplication ? base44.asServiceRole.entities.Message.filter({ dedupe_key: `registration:${initialApplication.id}` }) : [],
    initialApplication ? base44.asServiceRole.entities.AuditLog.filter({ entity_id: initialApplication.id, action: "customer.registered_pending_owner" }) : [],
  ]);
  const tradingPlatformIds = [...new Set(applications.map((item) => item.trading_platform_id).filter(Boolean))];
  const platforms = {};
  for (const platformId of tradingPlatformIds) {
    try {
      const platform = await base44.asServiceRole.entities.TradingPlatform.get(platformId);
      platforms[platformId] = { id: platform.id, code: platform.code, name_ar: platform.name_ar, name_en: platform.name_en, active: platform.active };
    } catch { /* snapshots on the application remain the fallback */ }
  }
  return {
    customer: customerView(customer, canReadFull),
    subscriptions,
    applications,
    platforms,
    sessions: sessions.map((session) => ({ id: session.id, remember_me: session.remember_me, expires_at: session.expires_at, revoked_at: session.revoked_at, last_seen_at: session.last_seen_at })),
    consents,
    notes: notes.filter((note) => !note.deleted_at),
    memberships,
    resource_counts: { watchlists: watchlists.length, alerts: alerts.length },
    registration_integrity: {
      complete: Boolean(
        customer.registration_state === "completed"
        && initialApplication
        && initialApplication.auth_user_id === customer.auth_user_id
        && preferences.length === 1
        && consents.filter((item) => item.status === "granted").length >= 2
        && registrationMessages.length === 1
        && registrationAudits.length >= 1
      ),
      profile_state: customer.registration_state || "legacy",
      initial_application_id: initialApplication?.id || null,
      unique_reference: initialApplication?.unique_reference || null,
      auth_user_linked: Boolean(initialApplication && initialApplication.auth_user_id === customer.auth_user_id),
      applications: applications.length,
      granted_consents: consents.filter((item) => item.status === "granted").length,
      notification_preferences: preferences.length,
      owner_registration_messages: registrationMessages.length,
      registration_audits: registrationAudits.length,
    },
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req);
    const context = await authorizationContext(base44, body.session_id);
    if (context.role !== "owner") bad("Owner access required", "OWNER_ONLY", 403);
    const canReadFull = context.permissions.has("customers.full.read");
    if (!context.permissions.has("customers.masked.read") && !canReadFull) bad("Forbidden", "PERMISSION_DENIED", 403);

    if (body.action === "list") {
      const rows = (await base44.asServiceRole.entities.CustomerProfile.list("-created_date", Math.min(Math.max(Number(body.limit) || 50, 1), 100)))
        .filter((customer) => customer.role === "user");
      return Response.json({ customers: rows.map((customer) => customerView(customer, canReadFull)), data_mode: canReadFull ? "full" : "masked" });
    }

    if (body.action === "detail") {
      const customer = await managedCustomer(base44, body.id);
      return Response.json(await customerDetail(base44, customer, canReadFull));
    }

    if (body.action === "detail_application") {
      const application = await base44.asServiceRole.entities.MarketAccessApplication.get(String(body.application_id || ""));
      if (!application) bad("Application not found", "APPLICATION_NOT_FOUND", 404);
      const customer = await managedCustomer(base44, application.customer_id);
      return Response.json(await customerDetail(base44, customer, canReadFull));
    }

    if (body.action === "status") {
      await requirePermission(base44, body.session_id, "customers.status.manage");
      const reason = reasonFrom(body.reason);
      const status = String(body.status || "");
      if (!ACCOUNT_STATUSES.has(status)) bad("Unsupported account status");
      const before = await managedCustomer(base44, body.id);
      if (before.id === context.profile.id) bad("The active administrator cannot change their own account status", "SELF_STATUS_CHANGE_DENIED", 403);
      if (before.role === "owner") bad("The platform owner status cannot be changed here", "OWNER_PROTECTED", 403);
      const after = await base44.asServiceRole.entities.CustomerProfile.update(before.id, { account_status: status });
      if (["suspended", "banned", "closed"].includes(status)) {
        await base44.asServiceRole.entities.ActiveDeviceSession.updateMany({ customer_id: before.id, revoked_at: null }, { $set: { revoked_at: new Date().toISOString() } });
      }
      await audit(base44, context.user.id, "customer.status_changed", "CustomerProfile", before.id, "success", reason, before, after);
      return Response.json({ customer: customerView(after, canReadFull), sessions_revoked: ["suspended", "banned", "closed"].includes(status) });
    }

    if (body.action === "revoke_sessions") {
      await requirePermission(base44, body.session_id, "customers.sessions.revoke");
      const reason = reasonFrom(body.reason);
      const customer = await managedCustomer(base44, body.id);
      if (customer.id === context.profile.id) bad("Use sign out to revoke the current administrator session", "SELF_SESSION_REVOKE_DENIED", 403);
      await base44.asServiceRole.entities.ActiveDeviceSession.updateMany({ customer_id: customer.id, revoked_at: null }, { $set: { revoked_at: new Date().toISOString() } });
      await audit(base44, context.user.id, "customer.sessions_revoked", "CustomerProfile", customer.id, "success", reason, {}, { revoked_at: new Date().toISOString() });
      return Response.json({ revoked: true });
    }

    if (body.action === "add_note") {
      await requirePermission(base44, body.session_id, "customers.notes.manage");
      const reason = reasonFrom(body.reason);
      const customer = await managedCustomer(base44, body.id);
      const text = String(body.note || "").trim();
      if (!text || text.length > 1000) bad("A note between 1 and 1000 characters is required");
      const visibility = context.role === "owner" ? "owner" : context.role === "admin" ? "admin" : "support";
      const note = await base44.asServiceRole.entities.CustomerNote.create({ customer_id: customer.id, author_user_id: context.user.id, body: text, visibility });
      await audit(base44, context.user.id, "customer.note_added", "CustomerNote", note.id, "success", reason, {}, { customer_id: customer.id, visibility });
      return Response.json({ note });
    }

    if (body.action === "message") {
      await requirePermission(base44, body.session_id, "customers.notes.manage");
      const reason = reasonFrom(body.reason);
      const customer = await managedCustomer(base44, body.id);
      const text = String(body.message || "").trim();
      if (text.length < 3 || text.length > 1200) bad("A message between 3 and 1200 characters is required", "MESSAGE_REQUIRED");
      const title = String(body.title || "").trim() || "رسالة من إدارة المستثمر الذكي";
      if (title.length > 160) bad("Message title is too long", "MESSAGE_TITLE_TOO_LONG");
      const notification = await base44.asServiceRole.entities.Message.create({
        recipient_auth_user_id: customer.auth_user_id,
        recipient_customer_id: customer.id,
        message_type: "account",
        priority: body.priority === "important" ? "important" : "normal",
        title_ar: title,
        title_en: "A message from Smart Investor",
        body_ar: text,
        body_en: text,
        action_path: "/profile",
        feed_eligible: true,
        dedupe_key: `owner-message:${customer.id}:${crypto.randomUUID()}`,
      });
      await audit(base44, context.user.id, "customer.message_sent", "Message", notification.id, "success", reason, {}, { customer_id: customer.id, priority: notification.priority });
      return Response.json({ message_id: notification.id, delivered_to_inbox: true });
    }

    if (body.action === "audit") {
      await requirePermission(base44, body.session_id, "audit.read");
      const logs = await base44.asServiceRole.entities.AuditLog.list("-created_date", Math.min(Math.max(Number(body.limit) || 50, 1), 200));
      return Response.json({ logs });
    }

    return Response.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return replyError(error);
  }
});
