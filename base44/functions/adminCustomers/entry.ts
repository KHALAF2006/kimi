import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, authorizationContext, replyError, requirePermission } from "../../shared/security.ts";

const ACCOUNT_STATUSES = new Set(["pending_verification", "active", "suspended", "banned", "closed"]);

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
    phone_verified_at: customer.phone_verified_at,
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const context = await authorizationContext(base44, body.session_id);
    const canReadFull = context.permissions.has("customers.full.read");
    if (!context.permissions.has("customers.masked.read") && !canReadFull) bad("Forbidden", "PERMISSION_DENIED", 403);

    if (body.action === "list") {
      const rows = await base44.asServiceRole.entities.CustomerProfile.list("-created_date", Math.min(Math.max(Number(body.limit) || 50, 1), 100));
      return Response.json({ customers: rows.map((customer) => customerView(customer, canReadFull)), data_mode: canReadFull ? "full" : "masked" });
    }

    if (body.action === "detail") {
      const customer = await base44.asServiceRole.entities.CustomerProfile.get(String(body.id || ""));
      if (!customer) bad("Customer not found", "CUSTOMER_NOT_FOUND", 404);
      const [subscriptions, sessions, consents, notes, memberships, watchlists, alerts] = await Promise.all([
        base44.asServiceRole.entities.Subscription.filter({ customer_id: customer.id }),
        base44.asServiceRole.entities.ActiveDeviceSession.filter({ customer_id: customer.id }),
        base44.asServiceRole.entities.CustomerConsent.filter({ customer_id: customer.id }),
        base44.asServiceRole.entities.CustomerNote.filter({ customer_id: customer.id }),
        base44.asServiceRole.entities.AccountMember.filter({ customer_id: customer.id }),
        base44.asServiceRole.entities.Watchlist.filter({ customer_id: customer.id }),
        base44.asServiceRole.entities.AlertRule.filter({ customer_id: customer.id }),
      ]);
      return Response.json({
        customer: customerView(customer, canReadFull),
        subscriptions,
        sessions: sessions.map((session) => ({ id: session.id, remember_me: session.remember_me, expires_at: session.expires_at, revoked_at: session.revoked_at, last_seen_at: session.last_seen_at })),
        consents,
        notes: notes.filter((note) => !note.deleted_at),
        memberships,
        resource_counts: { watchlists: watchlists.length, alerts: alerts.length },
      });
    }

    if (body.action === "status") {
      await requirePermission(base44, body.session_id, "customers.status.manage");
      const reason = reasonFrom(body.reason);
      const status = String(body.status || "");
      if (!ACCOUNT_STATUSES.has(status)) bad("Unsupported account status");
      const before = await base44.asServiceRole.entities.CustomerProfile.get(String(body.id || ""));
      if (!before) bad("Customer not found", "CUSTOMER_NOT_FOUND", 404);
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
      const customer = await base44.asServiceRole.entities.CustomerProfile.get(String(body.id || ""));
      if (!customer) bad("Customer not found", "CUSTOMER_NOT_FOUND", 404);
      if (customer.id === context.profile.id) bad("Use sign out to revoke the current administrator session", "SELF_SESSION_REVOKE_DENIED", 403);
      await base44.asServiceRole.entities.ActiveDeviceSession.updateMany({ customer_id: customer.id, revoked_at: null }, { $set: { revoked_at: new Date().toISOString() } });
      await audit(base44, context.user.id, "customer.sessions_revoked", "CustomerProfile", customer.id, "success", reason, {}, { revoked_at: new Date().toISOString() });
      return Response.json({ revoked: true });
    }

    if (body.action === "add_note") {
      const reason = reasonFrom(body.reason);
      const customer = await base44.asServiceRole.entities.CustomerProfile.get(String(body.id || ""));
      if (!customer) bad("Customer not found", "CUSTOMER_NOT_FOUND", 404);
      const text = String(body.note || "").trim();
      if (!text || text.length > 1000) bad("A note between 1 and 1000 characters is required");
      const visibility = context.role === "owner" ? "owner" : context.role === "admin" ? "admin" : "support";
      const note = await base44.asServiceRole.entities.CustomerNote.create({ customer_id: customer.id, author_user_id: context.user.id, body: text, visibility });
      await audit(base44, context.user.id, "customer.note_added", "CustomerNote", note.id, "success", reason, {}, { customer_id: customer.id, visibility });
      return Response.json({ note });
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
