// GENERATED from usBenchmarksSignalRefresh/source.ts. Do not edit directly.

// base44/functions/usBenchmarksSignalRefresh/source.ts
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// base44/shared/permissions.ts
var PERMISSION_CATALOG = [
  { code: "dashboard.owner.read", group_code: "dashboard", name_ar: "\u0639\u0631\u0636 \u0644\u0648\u062D\u0629 \u0627\u0644\u0645\u0627\u0644\u0643", name_en: "View owner dashboard", sensitive: true, owner_only: false },
  { code: "customers.masked.read", group_code: "customers", name_ar: "\u0639\u0631\u0636 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u0642\u0646\u0651\u0639\u0629", name_en: "View masked customer data", sensitive: true, owner_only: true },
  { code: "customers.full.read", group_code: "customers", name_ar: "\u0639\u0631\u0636 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0643\u0627\u0645\u0644\u0629", name_en: "View full customer data", sensitive: true, owner_only: true },
  { code: "customers.status.manage", group_code: "customers", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u062D\u0627\u0644\u0629 \u0627\u0644\u0639\u0645\u064A\u0644", name_en: "Manage customer status", sensitive: true, owner_only: true },
  { code: "customers.sessions.revoke", group_code: "customers", name_ar: "\u0625\u0644\u063A\u0627\u0621 \u062C\u0644\u0633\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621", name_en: "Revoke customer sessions", sensitive: true, owner_only: true },
  { code: "customers.notes.manage", group_code: "customers", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621", name_en: "Manage customer notes", sensitive: true, owner_only: true },
  { code: "messages.manage", group_code: "customers", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621", name_en: "Manage customer conversations", sensitive: true, owner_only: false },
  { code: "subscriptions.read", group_code: "subscriptions", name_ar: "\u0639\u0631\u0636 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A", name_en: "View subscriptions", sensitive: false, owner_only: false },
  { code: "subscriptions.manage", group_code: "subscriptions", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A", name_en: "Manage subscriptions", sensitive: true, owner_only: false },
  { code: "plans.manage", group_code: "subscriptions", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u062E\u0637\u0637 \u0648\u0627\u0644\u062D\u062F\u0648\u062F", name_en: "Manage plans and entitlements", sensitive: true, owner_only: true },
  { code: "data.operations.read", group_code: "data", name_ar: "\u0639\u0631\u0636 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A", name_en: "View data operations", sensitive: false, owner_only: false },
  { code: "data.ingestion.run", group_code: "data", name_ar: "\u062A\u0634\u063A\u064A\u0644 \u062C\u0644\u0628 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A", name_en: "Run data ingestion", sensitive: true, owner_only: false },
  { code: "data.quality.manage", group_code: "data", name_ar: "\u0645\u0639\u0627\u0644\u062C\u0629 \u062C\u0648\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A", name_en: "Manage data quality", sensitive: true, owner_only: false },
  { code: "alerts.operations.read", group_code: "alerts", name_ar: "\u0639\u0631\u0636 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u062A\u0646\u0628\u064A\u0647\u0627\u062A", name_en: "View alert operations", sensitive: false, owner_only: false },
  { code: "alerts.operations.manage", group_code: "alerts", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u062A\u0646\u0628\u064A\u0647\u0627\u062A", name_en: "Manage alert operations", sensitive: true, owner_only: false },
  { code: "delivery.channels.manage", group_code: "alerts", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u0642\u0646\u0648\u0627\u062A \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0645\u0631\u0643\u0632\u064A\u0629", name_en: "Manage centralized delivery channels", sensitive: true, owner_only: true },
  { code: "email.campaigns.manage", group_code: "alerts", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u062D\u0645\u0644\u0627\u062A \u0627\u0644\u0628\u0631\u064A\u062F", name_en: "Manage email campaigns", sensitive: true, owner_only: true },
  { code: "audit.read", group_code: "audit", name_ar: "\u0639\u0631\u0636 \u0633\u062C\u0644 \u0627\u0644\u062A\u062F\u0642\u064A\u0642", name_en: "View audit log", sensitive: true, owner_only: false },
  { code: "audit.export", group_code: "audit", name_ar: "\u062A\u0635\u062F\u064A\u0631 \u0633\u062C\u0644 \u0627\u0644\u062A\u062F\u0642\u064A\u0642", name_en: "Export audit log", sensitive: true, owner_only: true },
  { code: "roles.manage", group_code: "administration", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0623\u062F\u0648\u0627\u0631 \u0648\u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A", name_en: "Manage roles and permissions", sensitive: true, owner_only: true },
  { code: "settings.manage", group_code: "administration", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645", name_en: "Manage system settings", sensitive: true, owner_only: true }
].map((permission) => ({ ...permission, active: true }));
var PERMISSION_CODES = new Set(PERMISSION_CATALOG.map((permission) => permission.code));
var LEGACY_ROLE_PERMISSIONS = {
  support: ["dashboard.owner.read", "messages.manage"],
  admin: [
    "dashboard.owner.read",
    "subscriptions.read",
    "subscriptions.manage",
    "data.operations.read",
    "data.ingestion.run",
    "data.quality.manage",
    "alerts.operations.read",
    "alerts.operations.manage",
    "audit.read",
    "messages.manage"
  ]
};

// base44/shared/security.ts
var MAX_JSON_BODY_BYTES = 256 * 1024;
var SESSION_TOKEN_PREFIX = "smart_investor1";
var MARKET_ACCESS = {
  SA_MAIN: { entitlement: "market.saudi", name_ar: "\u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629", name_en: "Saudi Main Market", currency: "SAR" },
  US_OPTIONS: { entitlement: "market.us.options", name_ar: "\u0634\u0631\u0643\u0627\u062A \u0639\u0642\u0648\u062F \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A", name_en: "U.S. Optionable Companies", currency: "USD" },
  US_BENCHMARKS: { entitlement: "market.us.benchmarks", name_ar: "\u0627\u0644\u0645\u0624\u0634\u0631\u0627\u062A \u0648\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0623\u0645\u0631\u064A\u0643\u064A\u0629", name_en: "U.S. Indices & ETFs", currency: "USD" }
};
async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest2 = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest2), (item2) => item2.toString(16).padStart(2, "0")).join("");
}
function fixedTimeEqual(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}
function parseSessionToken(value) {
  const parts = String(value || "").split(".");
  if (parts.length !== 3 || parts[0] !== SESSION_TOKEN_PREFIX || !parts[1] || !parts[2]) return null;
  if (!/^[A-Za-z0-9_-]{16,160}$/.test(parts[1]) || !/^[A-Fa-f0-9-]{32,160}$/.test(parts[2])) return null;
  return { sessionId: parts[1], secret: parts[2] };
}
async function readJsonBody(req, maxBytes = MAX_JSON_BODY_BYTES) {
  if (String(req?.method || "").toUpperCase() !== "POST") {
    throw Object.assign(new Error("Method not allowed"), { status: 405, code: "METHOD_NOT_ALLOWED" });
  }
  const declaredLength = Number(req.headers?.get?.("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw Object.assign(new Error("Request body is too large"), { status: 413, code: "REQUEST_TOO_LARGE" });
  }
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw Object.assign(new Error("Request body is too large"), { status: 413, code: "REQUEST_TOO_LARGE" });
  }
  if (!raw.trim()) return {};
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("Invalid JSON request"), { status: 400, code: "INVALID_JSON" });
  }
  if (!body || Array.isArray(body) || typeof body !== "object") {
    throw Object.assign(new Error("JSON object required"), { status: 400, code: "INVALID_JSON_OBJECT" });
  }
  return body;
}
async function requireUser(base44) {
  const user = await base44.auth.me();
  if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return user;
}
async function requireAdminUser(base44) {
  const user = await requireUser(base44);
  if (user.role !== "admin") {
    throw Object.assign(new Error("Forbidden"), { status: 403, code: "PERMISSION_DENIED" });
  }
  return user;
}
async function requireTrustedOwner(base44) {
  const user = await requireAdminUser(base44);
  const profile = await profileFor(base44, user);
  if (!hasTrustedOwnerMarker(user, profile)) {
    throw Object.assign(new Error("Forbidden"), { status: 403, code: "OWNER_REQUIRED" });
  }
  return { user, profile, role: "owner" };
}
async function profileFor(base44, user) {
  const rows2 = await base44.asServiceRole.entities.CustomerProfile.filter({ auth_user_id: user.id });
  return rows2[0] || null;
}
function hasTrustedOwnerMarker(user, profile) {
  return user?.role === "admin" && profile?.acquisition_source === "platform_owner_bootstrap" && Array.isArray(profile?.tags) && profile.tags.includes("owner");
}
function resolvedRole(user, profile) {
  return hasTrustedOwnerMarker(user, profile) ? "owner" : profile?.role || user?.role;
}
function normalizedEmail(user) {
  return String(user?.email || "").trim().toLowerCase();
}
function administrativeName(user) {
  const fullName = String(user?.full_name || "").trim();
  if (fullName) return fullName;
  return normalizedEmail(user).split("@")[0];
}
async function ensureAdministrativeProfile(base44, user) {
  let profile = await profileFor(base44, user);
  if (user?.role !== "admin") return profile;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (!profile) {
    profile = await base44.asServiceRole.entities.CustomerProfile.create({
      customer_number: `SMART_INVESTOR-ADMIN-${String(user.id).slice(-8).toUpperCase()}`,
      auth_user_id: user.id,
      email_normalized: normalizedEmail(user),
      full_name: administrativeName(user),
      preferred_language: "ar",
      account_status: "active",
      role: "admin",
      tags: ["base44_admin_bootstrap"],
      email_verified_at: now,
      last_seen_at: now
    });
    await audit(base44, user.id, "customer.admin_bootstrapped", "CustomerProfile", profile.id, "success");
    return profile;
  }
  const owner = hasTrustedOwnerMarker(user, profile) || profile.role === "owner";
  if (!["admin", "owner"].includes(profile.role) || profile.account_status === "pending_verification" || owner && profile.role !== "owner") {
    profile = await base44.asServiceRole.entities.CustomerProfile.update(profile.id, {
      role: owner ? "owner" : "admin",
      account_status: "active",
      email_verified_at: profile.email_verified_at || now,
      last_seen_at: now
    });
    await audit(base44, user.id, "customer.admin_reconciled", "CustomerProfile", profile.id, "success");
  }
  return profile;
}
async function requireActiveSession(base44, profile, sessionId) {
  if (!profile || !sessionId) throw Object.assign(new Error("Active device session required"), { status: 403 });
  const token = parseSessionToken(sessionId);
  if (!token) throw Object.assign(new Error("Active device session required"), { status: 403 });
  let session = null;
  try {
    session = await base44.asServiceRole.entities.ActiveDeviceSession.get(token.sessionId);
  } catch {
    session = null;
  }
  const presentedHash = session ? await sha256(token.secret) : "";
  if (!session || session.customer_id !== profile.id || session.revoked_at || new Date(session.expires_at) <= /* @__PURE__ */ new Date() || !fixedTimeEqual(presentedHash, session.session_hash)) {
    throw Object.assign(new Error("Active device session required"), { status: 403 });
  }
  const now = Date.now();
  const lastSeen = new Date(session.last_seen_at || 0).getTime();
  if (!Number.isFinite(lastSeen) || now - lastSeen >= 5 * 60 * 1e3) {
    await base44.asServiceRole.entities.ActiveDeviceSession.update(session.id, { last_seen_at: new Date(now).toISOString() });
  }
  return session;
}
function replyError(error) {
  const status = Number(error?.status) || 500;
  if (status >= 500) console.error("SMART_INVESTOR backend error", error);
  return Response.json({
    error: status >= 500 ? "Backend operation failed" : error?.message || "Request failed",
    code: error?.code || (status >= 500 ? "BACKEND_FAILURE" : "REQUEST_FAILED")
  }, { status });
}
async function audit(base44, userId, action, entityType, entityId, result, reason = "", before = {}, after = {}) {
  return await base44.asServiceRole.entities.AuditLog.create({
    actor_user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId || "system",
    reason,
    before: before && typeof before === "object" ? before : {},
    after: after && typeof after === "object" ? after : {},
    result,
    ip_hash: "not_collected"
  });
}
async function ensurePersonalAccount(base44, profile, userId) {
  if (!profile || profile.account_status !== "active") throw Object.assign(new Error("Active account required"), { status: 403, code: "ACCOUNT_INACTIVE" });
  let account = null;
  if (profile.personal_account_id) account = await base44.asServiceRole.entities.Account.get(profile.personal_account_id);
  if (!account) {
    const matches = await base44.asServiceRole.entities.Account.filter({ owner_customer_id: profile.id, account_type: "personal" });
    account = matches[0] || null;
  }
  if (!account) {
    account = await base44.asServiceRole.entities.Account.create({
      account_number: `SMART_INVESTOR-A-${String(profile.customer_number || profile.id).replace(/[^A-Za-z0-9-]/g, "").slice(-24)}`,
      account_type: "personal",
      name: profile.full_name,
      owner_customer_id: profile.id,
      status: "active",
      revision: 1
    });
    await base44.asServiceRole.entities.CustomerProfile.update(profile.id, { personal_account_id: account.id });
    await audit(base44, userId, "account.personal_created", "Account", account.id, "success", "automatic personal account");
  }
  if (account.status !== "active") throw Object.assign(new Error("Active account required"), { status: 403, code: "ACCOUNT_INACTIVE" });
  const memberships = await base44.asServiceRole.entities.AccountMember.filter({ account_id: account.id, customer_id: profile.id });
  let membership = memberships.find((item2) => item2.status === "active") || null;
  if (!membership) {
    membership = await base44.asServiceRole.entities.AccountMember.create({
      account_id: account.id,
      customer_id: profile.id,
      member_type: account.owner_customer_id === profile.id ? "owner" : "member",
      status: "active",
      revision: 1
    });
  }
  return { account, membership };
}
async function assignedPermissions(base44, membership) {
  const assignments = await base44.asServiceRole.entities.MemberRoleAssignment.filter({ member_id: membership.id, status: "active" });
  const codes = /* @__PURE__ */ new Set();
  const roles = [];
  for (const assignment of assignments) {
    const role = await base44.asServiceRole.entities.RoleDefinition.get(assignment.role_id);
    if (!role?.active) continue;
    roles.push({ id: role.id, code: role.code, name_ar: role.name_ar, name_en: role.name_en });
    const grants = await base44.asServiceRole.entities.RolePermission.filter({ role_id: role.id });
    grants.forEach((grant) => codes.add(grant.permission_code));
  }
  return { codes, roles };
}
async function subscriptionContext(base44, profile, account) {
  const accountSubscriptions = await base44.asServiceRole.entities.Subscription.filter({ account_id: account.id, status: "active" });
  const customerSubscriptions = await base44.asServiceRole.entities.Subscription.filter({ customer_id: profile.id, status: "active" });
  const now = Date.now();
  const subscriptions = [...new Map([...accountSubscriptions, ...customerSubscriptions].filter((item2) => !item2.ends_at || new Date(item2.ends_at).getTime() > now).map((item2) => [item2.id, item2])).values()];
  if (!subscriptions.length) return { subscription: null, subscriptions: [], plan: null, plans: [], entitlements: [], marketAccess: [] };
  const planIds = [...new Set(subscriptions.map((item2) => item2.plan_id).filter(Boolean))];
  const plans = (await Promise.all(planIds.map(async (planId) => {
    try {
      return await base44.asServiceRole.entities.SubscriptionPlan.get(planId);
    } catch {
      return null;
    }
  }))).filter(Boolean);
  const entitlementGroups = await Promise.all(planIds.map(
    (planId) => base44.asServiceRole.entities.PlanEntitlement.filter({ plan_id: planId, enabled: true })
  ));
  const entitlementsByCode = /* @__PURE__ */ new Map();
  entitlementGroups.flat().forEach((item2) => {
    const current = entitlementsByCode.get(item2.code);
    if (!current || Number(item2.limit_value || 0) > Number(current.limit_value || 0)) entitlementsByCode.set(item2.code, item2);
  });
  const entitlements = [...entitlementsByCode.values()];
  const marketCodes = /* @__PURE__ */ new Set();
  entitlementGroups.forEach((group, index) => {
    const codes = new Set(group.map((item2) => item2.code));
    const explicitMarkets = [...codes].filter((code) => code.startsWith("market."));
    if (codes.has("market.us.options")) marketCodes.add("US_OPTIONS");
    if (codes.has("market.us.benchmarks")) marketCodes.add("US_BENCHMARKS");
    if ([...codes].some((code) => ["market.saudi", "market.saudi.delayed", "market.saudi.realtime"].includes(code))) marketCodes.add("SA_MAIN");
    if (!explicitMarkets.length) {
      const planCode = String(plans.find((plan) => plan.id === planIds[index])?.code || "").toLowerCase();
      if (planCode === "smart-investor-trial-10d-sa_main") marketCodes.add("SA_MAIN");
      if (planCode === "smart-investor-trial-10d-us_options") marketCodes.add("US_OPTIONS");
      if (planCode === "smart-investor-trial-10d-us_benchmarks") marketCodes.add("US_BENCHMARKS");
    }
  });
  const marketAccess = [...marketCodes].map((marketCode) => ({ market_code: marketCode, ...MARKET_ACCESS[marketCode] }));
  return {
    subscription: subscriptions[0] || null,
    subscriptions,
    plan: plans.find((item2) => item2.id === subscriptions[0]?.plan_id) || null,
    plans,
    entitlements,
    marketAccess
  };
}
async function authorizationContext(base44, sessionId) {
  const user = await requireUser(base44);
  const profile = await ensureAdministrativeProfile(base44, user);
  if (!profile) throw Object.assign(new Error("Profile not found"), { status: 404, code: "PROFILE_NOT_FOUND" });
  await requireActiveSession(base44, profile, sessionId);
  const role = resolvedRole(user, profile);
  const { account, membership } = await ensurePersonalAccount(base44, profile, user.id);
  const assigned = await assignedPermissions(base44, membership);
  const ownerOnlyCodes = new Set(PERMISSION_CATALOG.filter((permission) => permission.owner_only).map((permission) => permission.code));
  const permissions = role === "owner" ? new Set(PERMISSION_CATALOG.map((permission) => permission.code)) : new Set([...LEGACY_ROLE_PERMISSIONS[role] || [], ...assigned.codes].filter((code) => !ownerOnlyCodes.has(code)));
  const subscription = await subscriptionContext(base44, profile, account);
  return {
    user,
    profile,
    role,
    account,
    membership,
    roles: assigned.roles,
    permissions,
    ...subscription
  };
}
async function requirePermission(base44, sessionId, permissionCode) {
  const context = await authorizationContext(base44, sessionId);
  if (!context.permissions.has(permissionCode)) {
    throw Object.assign(new Error("Forbidden"), { status: 403, code: "PERMISSION_DENIED" });
  }
  return context;
}

// base44/shared/momentum.ts
var MOMENTUM_FORMULA_VERSION = "momentum-zones-v4-digital-timeframe-ladder";
var LOOKBACK_DAYS = 20;
var HISTORY_BARS = Number.POSITIVE_INFINITY;
var FIXED_STOP_PERCENT = 0.03;
var ARCHIVED_CYCLE_LIMIT = 20;
var DIGITAL_HORIZONS = [
  { key: "daily", supportAr: "\u064A\u0648\u0645\u064A", resistanceAr: "\u064A\u0648\u0645\u064A\u0629", en: "daily" },
  { key: "weekly", supportAr: "\u0623\u0633\u0628\u0648\u0639\u064A", resistanceAr: "\u0623\u0633\u0628\u0648\u0639\u064A\u0629", en: "weekly" },
  { key: "monthly", supportAr: "\u0634\u0647\u0631\u064A", resistanceAr: "\u0634\u0647\u0631\u064A\u0629", en: "monthly" },
  { key: "quarterly", supportAr: "\u0631\u0628\u0639 \u0633\u0646\u0648\u064A", resistanceAr: "\u0631\u0628\u0639 \u0633\u0646\u0648\u064A\u0629", en: "quarterly" },
  { key: "annual", supportAr: "\u0633\u0646\u0648\u064A", resistanceAr: "\u0633\u0646\u0648\u064A\u0629", en: "annual" },
  { key: "three_year", supportAr: "\u0644\u062B\u0644\u0627\u062B \u0633\u0646\u0648\u0627\u062A", resistanceAr: "\u0644\u062B\u0644\u0627\u062B \u0633\u0646\u0648\u0627\u062A", en: "three-year" },
  { key: "five_year", supportAr: "\u0644\u062E\u0645\u0633 \u0633\u0646\u0648\u0627\u062A", resistanceAr: "\u0644\u062E\u0645\u0633 \u0633\u0646\u0648\u0627\u062A", en: "five-year" },
  { key: "ten_year", supportAr: "\u0644\u0639\u0634\u0631 \u0633\u0646\u0648\u0627\u062A", resistanceAr: "\u0644\u0639\u0634\u0631 \u0633\u0646\u0648\u0627\u062A", en: "ten-year" }
];
var ZONE_BANDS = [
  { key: "zone1", topPercent: 0.075, bottomPercent: 0.1 },
  { key: "zone2", topPercent: 0.2, bottomPercent: 0.24 },
  { key: "zone3", topPercent: 0.32, bottomPercent: 0.36 },
  { key: "zone4", topPercent: 0.48, bottomPercent: 0.52 },
  { key: "zone5", topPercent: 0.58, bottomPercent: 0.65 },
  { key: "zone6", topPercent: 0.75, bottomPercent: 0.8 },
  { key: "zone7", topPercent: 0.85, bottomPercent: 0.9 },
  { key: "zone8", topPercent: 0.92, bottomPercent: 0.95 }
];
function normalizedAnchorTimeframe(timeframe = "1d") {
  if (timeframe === "1wk") return "1wk";
  if (timeframe === "1mo") return "1mo";
  return "1d";
}
function horizonStartIndex(timeframe = "1d") {
  const anchor = normalizedAnchorTimeframe(timeframe);
  if (anchor === "1wk") return 1;
  if (anchor === "1mo") return 2;
  return 0;
}
function momentumZoneDefinitions(timeframe = "1d") {
  const anchorTimeframe = normalizedAnchorTimeframe(timeframe);
  const start = horizonStartIndex(anchorTimeframe);
  return ZONE_BANDS.slice(0, DIGITAL_HORIZONS.length - start).map((band, index) => {
    const horizon = DIGITAL_HORIZONS[start + index];
    return {
      ...band,
      horizonKey: horizon.key,
      horizonRank: start + index,
      anchorTimeframe,
      nameAr: `\u0642\u0627\u0639 \u0631\u0642\u0645\u064A ${horizon.supportAr}`,
      nameEn: `${horizon.en} digital bottom`,
      resistanceNameAr: `\u0642\u0645\u0629 \u0631\u0642\u0645\u064A\u0629 ${horizon.resistanceAr}`,
      resistanceNameEn: `${horizon.en} digital top`,
      reclaimedNameAr: `\u0642\u0627\u0639 \u0631\u0642\u0645\u064A ${horizon.supportAr} \u0645\u0633\u062A\u0639\u0627\u062F`,
      reclaimedNameEn: `reclaimed ${horizon.en} digital bottom`,
      colorNameAr: "\u0623\u062E\u0636\u0631",
      colorNameEn: "Green",
      light: "#16a34a",
      dark: "#22c55e"
    };
  });
}
var MOMENTUM_ZONE_DEFINITIONS = momentumZoneDefinitions("1d");
function initialLifecycle(originalStop) {
  return {
    role: "support",
    lifecycleStatus: "support_active",
    originalStop,
    currentStop: originalStop,
    brokenAt: null,
    retestedAt: null,
    reclaimCandidateAt: null,
    reclaimedAt: null,
    reclaimLow: null
  };
}
function lifecycleName(definition, state) {
  if (state.role === "resistance") return { displayNameAr: definition.resistanceNameAr, displayNameEn: definition.resistanceNameEn };
  if (state.lifecycleStatus === "support_reclaimed") return { displayNameAr: definition.reclaimedNameAr, displayNameEn: definition.reclaimedNameEn };
  return { displayNameAr: definition.nameAr, displayNameEn: definition.nameEn };
}
function eventId(referenceTime, zoneKey, type, time) {
  return `${referenceTime || "unknown"}:${zoneKey}:${type}:${time}`;
}
function activeFlags(zone4Active, zone5Active, zone6Active, zone7Active, zone8Active) {
  return [true, true, true, zone4Active, zone5Active, zone6Active, zone7Active, zone8Active];
}
function buildMomentumZones(referencePeak, zone4Active = false, zone5Active = false, lifecycle = {}, zone6Active = false, zone7Active = false, zone8Active = false, timeframe = "1d") {
  const definitions = momentumZoneDefinitions(timeframe);
  const activation = activeFlags(zone4Active, zone5Active, zone6Active, zone7Active, zone8Active);
  return definitions.map((definition, index) => {
    const top = referencePeak * (1 - definition.topPercent);
    const bottom = referencePeak * (1 - definition.bottomPercent);
    const originalStop = bottom * (1 - FIXED_STOP_PERCENT);
    const state = lifecycle[definition.key] || initialLifecycle(originalStop);
    return {
      ...definition,
      ...lifecycleName(definition, state),
      top,
      bottom,
      stop: state.currentStop,
      originalStop: state.originalStop,
      displayStop: state.role === "support" ? state.currentStop : null,
      stopVisible: state.role === "support",
      role: state.role,
      lifecycleStatus: state.lifecycleStatus,
      brokenAt: state.brokenAt,
      retestedAt: state.retestedAt,
      reclaimCandidateAt: state.reclaimCandidateAt,
      reclaimedAt: state.reclaimedAt,
      active: activation[index] === true
    };
  });
}
function crossedUnder(current, threshold, previous) {
  return previous !== null && current < threshold && previous >= threshold;
}
function freshLifecycle(referencePeak, definitions) {
  return Object.fromEntries(definitions.map((definition) => {
    const bottom = referencePeak * (1 - definition.bottomPercent);
    return [definition.key, initialLifecycle(bottom * (1 - FIXED_STOP_PERCENT))];
  }));
}
function calculateMomentumZones(inputBars, lookbackDays = LOOKBACK_DAYS, historyBars = HISTORY_BARS, timeframe = "1d") {
  const anchorTimeframe = normalizedAnchorTimeframe(timeframe);
  const definitions = momentumZoneDefinitions(anchorTimeframe);
  const lookback = Math.min(30, Math.max(6, Math.round(Number(lookbackDays) || LOOKBACK_DAYS)));
  const normalizedCandidates = inputBars.map((bar) => ({
    time: String(bar.time || ""),
    open: Number(bar.open),
    high: Number(bar.high),
    low: Number(bar.low),
    close: Number(bar.close),
    isFinal: bar.is_final !== false && bar.isFinal !== false
  })).filter((bar) => bar.time && Number.isFinite(new Date(bar.time).getTime()) && bar.isFinal && [bar.high, bar.low, bar.close].every((value) => Number.isFinite(value) && value > 0) && bar.high >= bar.low);
  const normalized = [...new Map(normalizedCandidates.map((bar) => [new Date(bar.time).toISOString(), { ...bar, time: new Date(bar.time).toISOString() }])).values()].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  const finiteHistoryLimit = Number.isFinite(Number(historyBars)) ? Math.max(lookback + 2, Math.round(Number(historyBars))) : normalized.length;
  const bars = normalized.slice(-finiteHistoryLimit);
  if (bars.length < lookback + 1) return null;
  let referencePeak = null;
  let referenceTime = null;
  let lastBrokenPeak = null;
  let zone4Active = false;
  let zone5Active = false;
  let zone6Active = false;
  let zone7Active = false;
  let zone8Active = false;
  let previousClose = null;
  let lifecycle = {};
  let zoneEvents = [];
  const archivedCycles = [];
  const addEvent = (zoneKey, type, time, price, details = {}) => {
    zoneEvents.push({ id: eventId(referenceTime, zoneKey, type, time), zoneKey, type, time, price, ...details });
  };
  const build = () => buildMomentumZones(referencePeak, zone4Active, zone5Active, lifecycle, zone6Active, zone7Active, zone8Active, anchorTimeframe);
  for (let index = 0; index < bars.length; index += 1) {
    let candidatePeak = null;
    let candidateTime = null;
    for (let offset = 1; offset <= lookback; offset += 1) {
      const candidate = bars[index - offset];
      if (!candidate) continue;
      if (candidatePeak === null || candidate.high > candidatePeak) {
        candidatePeak = candidate.high;
        candidateTime = candidate.time;
      }
    }
    const bar = bars[index];
    if (referencePeak !== null && bar.high > referencePeak) {
      archivedCycles.push({ referencePeak, referenceTime, endedAt: bar.time, reason: "new_reference_peak", anchorTimeframe, zone4Active, zone5Active, zone6Active, zone7Active, zone8Active, zones: build(), events: zoneEvents });
      lastBrokenPeak = referencePeak;
      referencePeak = null;
      referenceTime = null;
      zone4Active = false;
      zone5Active = false;
      zone6Active = false;
      zone7Active = false;
      zone8Active = false;
      lifecycle = {};
      zoneEvents = [];
    }
    if (referencePeak === null && candidatePeak !== null && (lastBrokenPeak === null || candidatePeak !== lastBrokenPeak)) {
      referencePeak = candidatePeak;
      referenceTime = candidateTime;
      zone4Active = false;
      zone5Active = false;
      zone6Active = false;
      zone7Active = false;
      zone8Active = false;
      lifecycle = freshLifecycle(referencePeak, definitions);
      zoneEvents = [];
    }
    if (referencePeak !== null) {
      let zones = build();
      for (const zone of zones) {
        if (!zone.active) continue;
        const state = lifecycle[zone.key];
        if (state.role === "support" && crossedUnder(bar.close, state.currentStop, previousClose)) {
          state.role = "resistance";
          state.lifecycleStatus = "resistance_candidate";
          state.brokenAt = bar.time;
          state.retestedAt = null;
          state.reclaimCandidateAt = null;
          state.reclaimedAt = null;
          state.reclaimLow = null;
          addEvent(zone.key, "stop_broken", bar.time, bar.close, { previousRole: "support", nextRole: "resistance", stop: state.currentStop });
          if (zone.key === "zone3") zone4Active = true;
          if (zone.key === "zone4") zone5Active = true;
          if (zone.key === "zone5") zone6Active = true;
          if (zone.key === "zone6") zone7Active = true;
          if (zone.key === "zone7") zone8Active = true;
          continue;
        }
        if (state.role !== "resistance" || state.brokenAt === bar.time) continue;
        if (bar.close > zone.top) {
          if (state.lifecycleStatus === "reclaim_candidate" && state.reclaimCandidateAt !== bar.time) {
            state.role = "support";
            state.lifecycleStatus = "support_reclaimed";
            state.reclaimedAt = bar.time;
            state.currentStop = Math.min(zone.bottom, state.reclaimLow || zone.bottom, bar.low) * (1 - FIXED_STOP_PERCENT);
            addEvent(zone.key, "support_reclaimed", bar.time, bar.close, { previousRole: "resistance", nextRole: "support", newStop: state.currentStop });
          } else if (state.lifecycleStatus !== "reclaim_candidate") {
            state.lifecycleStatus = "reclaim_candidate";
            state.reclaimCandidateAt = bar.time;
            state.reclaimLow = bar.low;
            addEvent(zone.key, "reclaim_candidate", bar.time, bar.close, { zoneTop: zone.top });
          }
          continue;
        }
        if (state.lifecycleStatus === "reclaim_candidate" && bar.close <= zone.bottom) {
          state.lifecycleStatus = "resistance_confirmed";
          state.retestedAt = bar.time;
          state.reclaimCandidateAt = null;
          state.reclaimLow = null;
          addEvent(zone.key, "resistance_confirmed", bar.time, bar.close, { reason: "failed_reclaim" });
          continue;
        }
        const touchedZone = bar.high >= zone.bottom && bar.low <= zone.top;
        if (state.lifecycleStatus === "resistance_candidate" && touchedZone && bar.close < zone.bottom) {
          state.lifecycleStatus = "resistance_confirmed";
          state.retestedAt = bar.time;
          addEvent(zone.key, "resistance_confirmed", bar.time, bar.close, { reason: "retest_rejection" });
        }
      }
      zones = build();
      if (zones[2]?.role === "resistance") zone4Active = true;
      if (zones[3]?.active && zones[3].role === "resistance") zone5Active = true;
      if (zones[4]?.active && zones[4].role === "resistance") zone6Active = true;
      if (zones[5]?.active && zones[5].role === "resistance") zone7Active = true;
      if (zones[6]?.active && zones[6].role === "resistance") zone8Active = true;
    }
    previousClose = bar.close;
  }
  if (referencePeak === null) return null;
  return {
    referencePeak,
    referenceTime,
    anchorTimeframe,
    horizonStart: definitions[0]?.horizonKey || "daily",
    lookbackDays: lookback,
    historyBars: bars.length,
    formulaVersion: MOMENTUM_FORMULA_VERSION,
    zone4Active,
    zone5Active,
    zone6Active,
    zone7Active,
    zone8Active,
    zones: build(),
    zoneEvents,
    archivedCycles: archivedCycles.slice(-ARCHIVED_CYCLE_LIMIT)
  };
}

// base44/shared/technical-signals.ts
var TECHNICAL_SIGNAL_FORMULA_VERSION = "technical-signals-v4";
var TECHNICAL_SIGNAL_WINDOW_SIZE = 3;
function rounded(value) {
  return Number(value.toFixed(8));
}
function marketDate(value, timeZone = "Asia/Riyadh") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}
function normalizeTechnicalBars(inputBars) {
  const byTime = /* @__PURE__ */ new Map();
  for (const raw of Array.isArray(inputBars) ? inputBars : []) {
    const timestamp = new Date(String(raw.time || "")).getTime();
    const open = Number(raw.open);
    const high = Number(raw.high);
    const low = Number(raw.low);
    const close = Number(raw.close);
    const volume = Math.max(0, Number(raw.volume || 0));
    if (!Number.isFinite(timestamp) || ![open, high, low, close].every((value) => Number.isFinite(value) && value > 0)) continue;
    if (high < Math.max(open, close) || low > Math.min(open, close)) continue;
    const time = new Date(timestamp).toISOString();
    byTime.set(time, { time, open, high, low, close, volume });
  }
  return [...byTime.values()].sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
}
function weekKey(dateString, weekStartsOn = 0) {
  const date = /* @__PURE__ */ new Date(`${dateString}T00:00:00.000Z`);
  const delta = (date.getUTCDay() - weekStartsOn + 7) % 7;
  date.setUTCDate(date.getUTCDate() - delta);
  return date.toISOString().slice(0, 10);
}
function bucketKeyForInterval(time, interval, options = {}) {
  const date = marketDate(time, options.timeZone || "Asia/Riyadh");
  if (interval === "1wk") return weekKey(date, Number.isInteger(options.weekStartsOn) ? Number(options.weekStartsOn) : 0);
  if (interval === "1mo") return date.slice(0, 7);
  return date;
}
function aggregateTechnicalBars(inputBars, interval, options = {}) {
  const groups = /* @__PURE__ */ new Map();
  for (const bar of normalizeTechnicalBars(inputBars)) {
    const key = bucketKeyForInterval(bar.time, interval, options);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(bar);
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, members]) => {
    const first = members[0];
    const last = members[members.length - 1];
    return {
      time: first.time,
      open: rounded(first.open),
      high: rounded(Math.max(...members.map((bar) => bar.high))),
      low: rounded(Math.min(...members.map((bar) => bar.low))),
      close: rounded(last.close),
      volume: rounded(members.reduce((sum, bar) => sum + bar.volume, 0))
    };
  });
}
function calculateSmaSeries(inputBars, length) {
  const period = Math.max(1, Math.round(Number(length) || 1));
  const bars = normalizeTechnicalBars(inputBars);
  if (bars.length < period) return [];
  const values = [];
  let sum = 0;
  for (let index = 0; index < bars.length; index += 1) {
    sum += bars[index].close;
    if (index >= period) sum -= bars[index - period].close;
    if (index >= period - 1) values.push({ time: bars[index].time, value: rounded(sum / period) });
  }
  return values;
}
function detectBullishPinBar(rawBar) {
  if (!rawBar) return { matches: false, reason: "missing_bar" };
  const open = Number(rawBar.open);
  const high = Number(rawBar.high);
  const low = Number(rawBar.low);
  const close = Number(rawBar.close);
  const range = high - low;
  if (![open, high, low, close, range].every(Number.isFinite) || range <= 0) {
    return { matches: false, reason: "invalid_bar" };
  }
  const body = Math.abs(close - open);
  const lowerWick = Math.min(open, close) - low;
  const upperWick = high - Math.max(open, close);
  const bodyRatio = body / range;
  const lowerWickRatio = lowerWick / range;
  const upperWickRatio = upperWick / range;
  const closeLocation = (close - low) / range;
  return {
    // Direction follows price rejection: a long lower wick is bullish. The
    // geometry follows the widely used 3x-wick, small-body pin-bar definition.
    matches: body > 0 && bodyRatio <= 0.3 && lowerWick >= body * 3 && lowerWickRatio >= 0.6 && upperWickRatio <= 0.25 && closeLocation >= 0.7,
    body_ratio: rounded(bodyRatio),
    lower_wick_ratio: rounded(lowerWickRatio),
    upper_wick_ratio: rounded(upperWickRatio),
    close_location: rounded(closeLocation)
  };
}
function detectBearishPinBar(rawBar) {
  if (!rawBar) return { matches: false, reason: "missing_bar" };
  const open = Number(rawBar.open);
  const high = Number(rawBar.high);
  const low = Number(rawBar.low);
  const close = Number(rawBar.close);
  const range = high - low;
  if (![open, high, low, close, range].every(Number.isFinite) || range <= 0) {
    return { matches: false, reason: "invalid_bar" };
  }
  const body = Math.abs(close - open);
  const lowerWick = Math.min(open, close) - low;
  const upperWick = high - Math.max(open, close);
  const bodyRatio = body / range;
  const lowerWickRatio = lowerWick / range;
  const upperWickRatio = upperWick / range;
  const closeLocation = (close - low) / range;
  return {
    // A long upper wick is the mirrored bearish rejection setup.
    matches: body > 0 && bodyRatio <= 0.3 && upperWick >= body * 3 && upperWickRatio >= 0.6 && lowerWickRatio <= 0.25 && closeLocation <= 0.3,
    body_ratio: rounded(bodyRatio),
    lower_wick_ratio: rounded(lowerWickRatio),
    upper_wick_ratio: rounded(upperWickRatio),
    close_location: rounded(closeLocation)
  };
}
function detectPinBar(rawBar) {
  const bullish = detectBullishPinBar(rawBar);
  const bearish = detectBearishPinBar(rawBar);
  return {
    matches: Boolean(bullish.matches || bearish.matches),
    direction: bullish.matches ? "bullish" : bearish.matches ? "bearish" : null,
    bullish,
    bearish
  };
}
function detectEngulfingPattern(rawPrevious, rawCurrent) {
  if (!rawPrevious || !rawCurrent) return { matches: false, direction: null, reason: "missing_bar" };
  const previous = { open: Number(rawPrevious.open), close: Number(rawPrevious.close) };
  const current = { open: Number(rawCurrent.open), close: Number(rawCurrent.close) };
  if (![previous.open, previous.close, current.open, current.close].every(Number.isFinite)) {
    return { matches: false, direction: null, reason: "invalid_bar" };
  }
  const previousBody = Math.abs(previous.close - previous.open);
  const currentBody = Math.abs(current.close - current.open);
  if (previousBody === 0 || currentBody === 0) return { matches: false, direction: null, reason: "zero_body" };
  const bullish = previous.close < previous.open && current.close > current.open && current.open <= previous.close && current.close >= previous.open;
  const bearish = previous.close > previous.open && current.close < current.open && current.open >= previous.close && current.close <= previous.open;
  return {
    matches: bullish || bearish,
    direction: bullish ? "bullish" : bearish ? "bearish" : null,
    bullish,
    bearish,
    previous_body: rounded(previousBody),
    current_body: rounded(currentBody)
  };
}
function latestValueByTime(values) {
  return new Map(values.map((item2) => [item2.time, item2.value]));
}
function calculateTechnicalSnapshot(bars, timeframe = "1d") {
  const sma20 = calculateSmaSeries(bars, 20);
  const sma50 = calculateSmaSeries(bars, 50);
  const last = bars.at(-1) || null;
  const previous = bars.at(-2) || null;
  const sma20ByTime = latestValueByTime(sma20);
  const sma50ByTime = latestValueByTime(sma50);
  const currentSma20 = last ? sma20ByTime.get(last.time) ?? null : null;
  const previousSma20 = previous ? sma20ByTime.get(previous.time) ?? null : null;
  const currentSma50 = last ? sma50ByTime.get(last.time) ?? null : null;
  const previousSma50 = previous ? sma50ByTime.get(previous.time) ?? null : null;
  const pinBar = detectPinBar(last);
  const engulfing = detectEngulfingPattern(previous, last);
  const momentum = calculateMomentumZones(bars, 20, Number.POSITIVE_INFINITY, timeframe);
  const matchingZone = pinBar.matches && last && momentum?.zones ? momentum.zones.find((zone) => zone.active && zone.role === "support" && last.low <= zone.top && last.high >= zone.bottom && last.close >= zone.bottom) || null : null;
  return {
    bar_count: bars.length,
    candle_time: last?.time || null,
    close: last?.close ?? null,
    sma20: currentSma20,
    sma50: currentSma50,
    pin_bar: pinBar,
    pin_bar_signal: pinBar.matches,
    bullish_pin_bar: pinBar.direction === "bullish",
    bearish_pin_bar: pinBar.direction === "bearish",
    engulfing,
    engulfing_signal: engulfing.matches,
    bullish_engulfing: engulfing.direction === "bullish",
    bearish_engulfing: engulfing.direction === "bearish",
    zone_pin_bar: Boolean(matchingZone),
    bullish_zone_pin_bar: Boolean(matchingZone) && pinBar.direction === "bullish",
    bearish_zone_pin_bar: Boolean(matchingZone) && pinBar.direction === "bearish",
    zone_pin_bar_direction: matchingZone ? pinBar.direction : null,
    matching_zone: matchingZone ? {
      key: matchingZone.key,
      name_ar: matchingZone.displayNameAr || matchingZone.nameAr,
      name_en: matchingZone.displayNameEn || matchingZone.nameEn,
      role: matchingZone.role,
      top: rounded(matchingZone.top),
      bottom: rounded(matchingZone.bottom)
    } : null,
    price_cross_sma20: Boolean(
      previous && last && previousSma20 !== null && currentSma20 !== null && previous.close <= previousSma20 && last.close > currentSma20
    ),
    price_cross_sma50: Boolean(
      previous && last && previousSma50 !== null && currentSma50 !== null && previous.close <= previousSma50 && last.close > currentSma50
    ),
    sma20_cross_sma50: Boolean(
      previousSma20 !== null && currentSma20 !== null && previousSma50 !== null && currentSma50 !== null && previousSma20 <= previousSma50 && currentSma20 > currentSma50
    ),
    insufficient_history: bars.length < 50
  };
}
function calculateTechnicalSignals(inputBars, windowSize = TECHNICAL_SIGNAL_WINDOW_SIZE, timeframe = "1d") {
  const bars = normalizeTechnicalBars(inputBars);
  if (!bars.length) return {
    ...calculateTechnicalSnapshot([], timeframe),
    signal_window_size: 0,
    signal_window: []
  };
  const size = Math.max(1, Math.min(Math.round(Number(windowSize) || TECHNICAL_SIGNAL_WINDOW_SIZE), bars.length));
  const signalWindow = [];
  for (let offset = 0; offset < size; offset += 1) {
    const end = bars.length - offset;
    signalWindow.push({
      offset,
      ...calculateTechnicalSnapshot(bars.slice(0, end), timeframe)
    });
  }
  return {
    ...signalWindow[0],
    signal_window_size: size,
    signal_window: signalWindow
  };
}

// base44/shared/us-benchmarks-catalog.ts
var US_BENCHMARKS_MARKET_CODE = "US_BENCHMARKS";
var item = (symbol, providerSymbol, type, nameAr, nameEn, categoryAr, categoryEn, aliases, relatedAr, relatedEn) => ({
  symbol,
  providerSymbol,
  type,
  nameAr,
  nameEn,
  categoryAr,
  categoryEn,
  aliases,
  relatedAr,
  relatedEn,
  officialUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(providerSymbol)}`
});
var US_BENCHMARKS_CATALOG = {
  source: { asOf: "2026-08-06", name: "Yahoo Finance reference adapter", baseUrl: "https://query1.finance.yahoo.com" },
  market: { market_code: US_BENCHMARKS_MARKET_CODE, country_code: "US", name_ar: "\u0627\u0644\u0645\u0624\u0634\u0631\u0627\u062A \u0648\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0623\u0645\u0631\u064A\u0643\u064A\u0629", name_en: "U.S. Indices & ETFs", currency: "USD", timezone: "America/New_York", quote_mode: "delayed", delay_seconds: 900, license_status: "pending", active: true },
  instruments: [
    item("SPX", "^GSPC", "market_index", "\u0645\u0624\u0634\u0631 \u0625\u0633 \u0622\u0646\u062F \u0628\u064A 500", "S&P 500 Index", "\u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0648\u0627\u0633\u0639\u0629", "Broad Market Indices", ["SPX500", "SPX500USD", "US500", "S&P500"], ["\u0623\u0628\u0644", "\u0645\u0627\u064A\u0643\u0631\u0648\u0633\u0648\u0641\u062A", "\u0625\u0646\u0641\u064A\u062F\u064A\u0627", "\u0623\u0645\u0627\u0632\u0648\u0646", "\u0623\u0644\u0641\u0627\u0628\u062A", "\u0645\u064A\u062A\u0627", "\u0628\u0631\u0648\u062F\u0643\u0648\u0645", "\u0628\u064A\u0631\u0643\u0634\u0627\u064A\u0631 \u0647\u0627\u062B\u0627\u0648\u0627\u064A"], ["Apple", "Microsoft", "NVIDIA", "Amazon", "Alphabet", "Meta", "Broadcom", "Berkshire Hathaway"]),
    item("DJI", "^DJI", "market_index", "\u0645\u0624\u0634\u0631 \u062F\u0627\u0648 \u062C\u0648\u0646\u0632 \u0627\u0644\u0635\u0646\u0627\u0639\u064A", "Dow Jones Industrial Average", "\u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0648\u0627\u0633\u0639\u0629", "Broad Market Indices", ["DJIA", "DOW30", "US30"], ["\u063A\u0648\u0644\u062F\u0645\u0627\u0646 \u0633\u0627\u0643\u0633", "\u0645\u0627\u064A\u0643\u0631\u0648\u0633\u0648\u0641\u062A", "\u0643\u0627\u062A\u0631\u0628\u064A\u0644\u0631", "\u0641\u064A\u0632\u0627", "\u0623\u0645\u062C\u0646", "\u0628\u0648\u064A\u0646\u063A"], ["Goldman Sachs", "Microsoft", "Caterpillar", "Visa", "Amgen", "Boeing"]),
    item("IXIC", "^IXIC", "market_index", "\u0645\u0624\u0634\u0631 \u0646\u0627\u0633\u062F\u0627\u0643 \u0627\u0644\u0645\u0631\u0643\u0628", "Nasdaq Composite Index", "\u0645\u0624\u0634\u0631\u0627\u062A \u0646\u0627\u0633\u062F\u0627\u0643", "Nasdaq Indices", ["NASDAQ", "NASDAQCOMPOSITE"], ["\u0625\u0646\u0641\u064A\u062F\u064A\u0627", "\u0645\u0627\u064A\u0643\u0631\u0648\u0633\u0648\u0641\u062A", "\u0623\u0628\u0644", "\u0623\u0645\u0627\u0632\u0648\u0646", "\u0623\u0644\u0641\u0627\u0628\u062A", "\u0645\u064A\u062A\u0627", "\u062A\u0633\u0644\u0627"], ["NVIDIA", "Microsoft", "Apple", "Amazon", "Alphabet", "Meta", "Tesla"]),
    item("NDX", "^NDX", "market_index", "\u0645\u0624\u0634\u0631 \u0646\u0627\u0633\u062F\u0627\u0643 100", "Nasdaq-100 Index", "\u0645\u0624\u0634\u0631\u0627\u062A \u0646\u0627\u0633\u062F\u0627\u0643", "Nasdaq Indices", ["NASDAQ100", "US100", "NAS100"], ["\u0625\u0646\u0641\u064A\u062F\u064A\u0627", "\u0645\u0627\u064A\u0643\u0631\u0648\u0633\u0648\u0641\u062A", "\u0623\u0628\u0644", "\u0623\u0645\u0627\u0632\u0648\u0646", "\u0628\u0631\u0648\u062F\u0643\u0648\u0645", "\u0645\u064A\u062A\u0627", "\u0646\u062A\u0641\u0644\u0643\u0633"], ["NVIDIA", "Microsoft", "Apple", "Amazon", "Broadcom", "Meta", "Netflix"]),
    item("RUT", "^RUT", "market_index", "\u0645\u0624\u0634\u0631 \u0631\u0627\u0633\u0644 2000", "Russell 2000 Index", "\u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0634\u0631\u0643\u0627\u062A \u0627\u0644\u0635\u063A\u064A\u0631\u0629", "Small-Cap Indices", ["RUSSELL2000", "US2000"], ["\u0634\u0631\u0643\u0627\u062A \u0623\u0645\u0631\u064A\u0643\u064A\u0629 \u0635\u063A\u064A\u0631\u0629 \u0645\u062F\u0631\u062C\u0629", "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0627\u0644\u0625\u0642\u0644\u064A\u0645\u064A\u0629", "\u0627\u0644\u0635\u0646\u0627\u0639\u0629", "\u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629"], ["U.S. small-cap companies", "Regional financials", "Industrials", "Health care"]),
    item("VIX", "^VIX", "market_index", "\u0645\u0624\u0634\u0631 \u062A\u0642\u0644\u0628\u0627\u062A \u0627\u0644\u0633\u0648\u0642 \u0641\u064A\u0643\u0633", "CBOE Volatility Index", "\u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u062A\u0642\u0644\u0628", "Volatility Indices", ["FEARINDEX", "VOLATILITYINDEX"], ["\u062E\u064A\u0627\u0631\u0627\u062A \u0625\u0633 \u0622\u0646\u062F \u0628\u064A 500", "\u062A\u0642\u0644\u0628\u0627\u062A \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0645\u062A\u0648\u0642\u0639\u0629 \u062E\u0644\u0627\u0644 30 \u064A\u0648\u0645\u064B\u0627"], ["S&P 500 options", "Expected 30-day market volatility"]),
    item("NYA", "^NYA", "market_index", "\u0645\u0624\u0634\u0631 \u0628\u0648\u0631\u0635\u0629 \u0646\u064A\u0648\u064A\u0648\u0631\u0643 \u0627\u0644\u0645\u0631\u0643\u0628", "NYSE Composite Index", "\u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0648\u0627\u0633\u0639\u0629", "Broad Market Indices", ["NYSECOMPOSITE"], ["\u0627\u0644\u0634\u0631\u0643\u0627\u062A \u0627\u0644\u0645\u062F\u0631\u062C\u0629 \u0641\u064A \u0628\u0648\u0631\u0635\u0629 \u0646\u064A\u0648\u064A\u0648\u0631\u0643", "\u0627\u0644\u0635\u0646\u0627\u0639\u0629", "\u0627\u0644\u0645\u0627\u0644", "\u0627\u0644\u0637\u0627\u0642\u0629"], ["NYSE-listed companies", "Industrials", "Financials", "Energy"]),
    item("MID", "^MID", "market_index", "\u0645\u0624\u0634\u0631 \u0625\u0633 \u0622\u0646\u062F \u0628\u064A 400 \u0644\u0644\u0634\u0631\u0643\u0627\u062A \u0627\u0644\u0645\u062A\u0648\u0633\u0637\u0629", "S&P MidCap 400 Index", "\u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0634\u0631\u0643\u0627\u062A \u0627\u0644\u0645\u062A\u0648\u0633\u0637\u0629", "Mid-Cap Indices", ["SP400", "MIDCAP400"], ["\u0634\u0631\u0643\u0627\u062A \u0623\u0645\u0631\u064A\u0643\u064A\u0629 \u0645\u062A\u0648\u0633\u0637\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0633\u0648\u0642\u064A\u0629", "\u0627\u0644\u0635\u0646\u0627\u0639\u0629", "\u0627\u0644\u0645\u0627\u0644", "\u0627\u0644\u062A\u0642\u0646\u064A\u0629"], ["U.S. mid-cap companies", "Industrials", "Financials", "Technology"]),
    item("SPY", "SPY", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0625\u0633 \u0628\u064A \u062F\u064A \u0622\u0631 \u0625\u0633 \u0622\u0646\u062F \u0628\u064A 500", "SPDR S&P 500 ETF Trust", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0648\u0627\u0633\u0639\u0629", "Broad Market ETFs", ["SP500ETF"], ["\u0623\u0628\u0644", "\u0645\u0627\u064A\u0643\u0631\u0648\u0633\u0648\u0641\u062A", "\u0625\u0646\u0641\u064A\u062F\u064A\u0627", "\u0623\u0645\u0627\u0632\u0648\u0646", "\u0623\u0644\u0641\u0627\u0628\u062A", "\u0645\u064A\u062A\u0627"], ["Apple", "Microsoft", "NVIDIA", "Amazon", "Alphabet", "Meta"]),
    item("VOO", "VOO", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0641\u0627\u0646\u063A\u0627\u0631\u062F \u0625\u0633 \u0622\u0646\u062F \u0628\u064A 500", "Vanguard S&P 500 ETF", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0648\u0627\u0633\u0639\u0629", "Broad Market ETFs", [], ["\u0623\u0628\u0644", "\u0645\u0627\u064A\u0643\u0631\u0648\u0633\u0648\u0641\u062A", "\u0625\u0646\u0641\u064A\u062F\u064A\u0627", "\u0623\u0645\u0627\u0632\u0648\u0646", "\u0623\u0644\u0641\u0627\u0628\u062A"], ["Apple", "Microsoft", "NVIDIA", "Amazon", "Alphabet"]),
    item("IVV", "IVV", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0622\u064A \u0634\u064A\u0631\u0632 \u0643\u0648\u0631 \u0625\u0633 \u0622\u0646\u062F \u0628\u064A 500", "iShares Core S&P 500 ETF", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0648\u0627\u0633\u0639\u0629", "Broad Market ETFs", [], ["\u0623\u0628\u0644", "\u0645\u0627\u064A\u0643\u0631\u0648\u0633\u0648\u0641\u062A", "\u0625\u0646\u0641\u064A\u062F\u064A\u0627", "\u0623\u0645\u0627\u0632\u0648\u0646", "\u0623\u0644\u0641\u0627\u0628\u062A"], ["Apple", "Microsoft", "NVIDIA", "Amazon", "Alphabet"]),
    item("QQQ", "QQQ", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0625\u0646\u0641\u064A\u0633\u0643\u0648 \u0643\u064A\u0648 \u0643\u064A\u0648 \u0643\u064A\u0648", "Invesco QQQ Trust", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0646\u0627\u0633\u062F\u0627\u0643", "Nasdaq ETFs", ["NASDAQ100ETF"], ["\u0625\u0646\u0641\u064A\u062F\u064A\u0627", "\u0645\u0627\u064A\u0643\u0631\u0648\u0633\u0648\u0641\u062A", "\u0623\u0628\u0644", "\u0623\u0645\u0627\u0632\u0648\u0646", "\u0628\u0631\u0648\u062F\u0643\u0648\u0645", "\u0645\u064A\u062A\u0627"], ["NVIDIA", "Microsoft", "Apple", "Amazon", "Broadcom", "Meta"]),
    item("DIA", "DIA", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0625\u0633 \u0628\u064A \u062F\u064A \u0622\u0631 \u062F\u0627\u0648 \u062C\u0648\u0646\u0632", "SPDR Dow Jones Industrial Average ETF", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0648\u0627\u0633\u0639\u0629", "Broad Market ETFs", ["DOWETF"], ["\u063A\u0648\u0644\u062F\u0645\u0627\u0646 \u0633\u0627\u0643\u0633", "\u0645\u0627\u064A\u0643\u0631\u0648\u0633\u0648\u0641\u062A", "\u0643\u0627\u062A\u0631\u0628\u064A\u0644\u0631", "\u0641\u064A\u0632\u0627", "\u0628\u0648\u064A\u0646\u063A"], ["Goldman Sachs", "Microsoft", "Caterpillar", "Visa", "Boeing"]),
    item("IWM", "IWM", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0622\u064A \u0634\u064A\u0631\u0632 \u0631\u0627\u0633\u0644 2000", "iShares Russell 2000 ETF", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0634\u0631\u0643\u0627\u062A \u0627\u0644\u0635\u063A\u064A\u0631\u0629", "Small-Cap ETFs", ["RUSSELL2000ETF"], ["\u0634\u0631\u0643\u0627\u062A \u0623\u0645\u0631\u064A\u0643\u064A\u0629 \u0635\u063A\u064A\u0631\u0629", "\u0627\u0644\u0645\u0627\u0644", "\u0627\u0644\u0635\u0646\u0627\u0639\u0629", "\u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629"], ["U.S. small caps", "Financials", "Industrials", "Health care"]),
    item("VTI", "VTI", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0641\u0627\u0646\u063A\u0627\u0631\u062F \u0644\u0644\u0633\u0648\u0642 \u0627\u0644\u0623\u0645\u0631\u064A\u0643\u064A \u0627\u0644\u0643\u0627\u0645\u0644", "Vanguard Total Stock Market ETF", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0648\u0627\u0633\u0639\u0629", "Broad Market ETFs", [], ["\u0623\u0628\u0644", "\u0645\u0627\u064A\u0643\u0631\u0648\u0633\u0648\u0641\u062A", "\u0625\u0646\u0641\u064A\u062F\u064A\u0627", "\u0623\u0645\u0627\u0632\u0648\u0646", "\u0623\u0644\u0641\u0627\u0628\u062A", "\u0622\u0644\u0627\u0641 \u0627\u0644\u0634\u0631\u0643\u0627\u062A \u0627\u0644\u0623\u0645\u0631\u064A\u0643\u064A\u0629"], ["Apple", "Microsoft", "NVIDIA", "Amazon", "Alphabet", "Thousands of U.S. companies"]),
    item("RSP", "RSP", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0625\u0633 \u0622\u0646\u062F \u0628\u064A 500 \u0645\u062A\u0633\u0627\u0648\u064A \u0627\u0644\u0623\u0648\u0632\u0627\u0646", "Invesco S&P 500 Equal Weight ETF", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0648\u0627\u0633\u0639\u0629", "Broad Market ETFs", [], ["\u0634\u0631\u0643\u0627\u062A \u0625\u0633 \u0622\u0646\u062F \u0628\u064A 500 \u0628\u0623\u0648\u0632\u0627\u0646 \u0645\u062A\u0633\u0627\u0648\u064A\u0629"], ["S&P 500 companies at equal weights"]),
    item("MDY", "MDY", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0625\u0633 \u0628\u064A \u062F\u064A \u0622\u0631 \u0625\u0633 \u0622\u0646\u062F \u0628\u064A 400", "SPDR S&P MidCap 400 ETF", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0634\u0631\u0643\u0627\u062A \u0627\u0644\u0645\u062A\u0648\u0633\u0637\u0629", "Mid-Cap ETFs", [], ["\u0634\u0631\u0643\u0627\u062A \u0623\u0645\u0631\u064A\u0643\u064A\u0629 \u0645\u062A\u0648\u0633\u0637\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0633\u0648\u0642\u064A\u0629"], ["U.S. mid-cap companies"]),
    item("XLK", "XLK", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0642\u0637\u0627\u0639 \u0627\u0644\u062A\u0642\u0646\u064A\u0629", "Technology Select Sector SPDR Fund", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0642\u0637\u0627\u0639\u0627\u062A", "Sector ETFs", [], ["\u0625\u0646\u0641\u064A\u062F\u064A\u0627", "\u0645\u0627\u064A\u0643\u0631\u0648\u0633\u0648\u0641\u062A", "\u0623\u0628\u0644", "\u0628\u0631\u0648\u062F\u0643\u0648\u0645", "\u0623\u0648\u0631\u0627\u0643\u0644"], ["NVIDIA", "Microsoft", "Apple", "Broadcom", "Oracle"]),
    item("XLF", "XLF", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0642\u0637\u0627\u0639 \u0627\u0644\u0645\u0627\u0644\u064A", "Financial Select Sector SPDR Fund", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0642\u0637\u0627\u0639\u0627\u062A", "Sector ETFs", [], ["\u0628\u064A\u0631\u0643\u0634\u0627\u064A\u0631 \u0647\u0627\u062B\u0627\u0648\u0627\u064A", "\u062C\u064A \u0628\u064A \u0645\u0648\u0631\u063A\u0627\u0646", "\u0641\u064A\u0632\u0627", "\u0645\u0627\u0633\u062A\u0631\u0643\u0627\u0631\u062F", "\u0628\u0646\u0643 \u0623\u0648\u0641 \u0623\u0645\u0631\u064A\u0643\u0627"], ["Berkshire Hathaway", "JPMorgan", "Visa", "Mastercard", "Bank of America"]),
    item("XLE", "XLE", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0642\u0637\u0627\u0639 \u0627\u0644\u0637\u0627\u0642\u0629", "Energy Select Sector SPDR Fund", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0642\u0637\u0627\u0639\u0627\u062A", "Sector ETFs", [], ["\u0625\u0643\u0633\u0648\u0646 \u0645\u0648\u0628\u064A\u0644", "\u0634\u064A\u0641\u0631\u0648\u0646", "\u0643\u0648\u0646\u0648\u0643\u0648 \u0641\u064A\u0644\u064A\u0628\u0633", "\u0648\u064A\u0644\u064A\u0627\u0645\u0632"], ["Exxon Mobil", "Chevron", "ConocoPhillips", "Williams"]),
    item("XLV", "XLV", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0642\u0637\u0627\u0639 \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629", "Health Care Select Sector SPDR Fund", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0642\u0637\u0627\u0639\u0627\u062A", "Sector ETFs", [], ["\u0625\u064A\u0644\u064A \u0644\u064A\u0644\u064A", "\u062C\u0648\u0646\u0633\u0648\u0646 \u0622\u0646\u062F \u062C\u0648\u0646\u0633\u0648\u0646", "\u0622\u0628\u0641\u064A", "\u0645\u064A\u0631\u0643", "\u064A\u0648\u0646\u0627\u064A\u062A\u062F \u0647\u064A\u0644\u062B"], ["Eli Lilly", "Johnson & Johnson", "AbbVie", "Merck", "UnitedHealth"]),
    item("XLI", "XLI", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0642\u0637\u0627\u0639 \u0627\u0644\u0635\u0646\u0627\u0639\u064A", "Industrial Select Sector SPDR Fund", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0642\u0637\u0627\u0639\u0627\u062A", "Sector ETFs", [], ["\u062C\u064A \u0625\u064A \u0625\u064A\u0631\u0648\u0633\u0628\u064A\u0633", "\u0643\u0627\u062A\u0631\u0628\u064A\u0644\u0631", "\u0622\u0631 \u062A\u064A \u0625\u0643\u0633", "\u0628\u0648\u064A\u0646\u063A", "\u064A\u0648\u0646\u064A\u0648\u0646 \u0628\u0627\u0633\u064A\u0641\u064A\u0643"], ["GE Aerospace", "Caterpillar", "RTX", "Boeing", "Union Pacific"]),
    item("XLP", "XLP", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629", "Consumer Staples Select Sector SPDR Fund", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0642\u0637\u0627\u0639\u0627\u062A", "Sector ETFs", [], ["\u0648\u0648\u0644 \u0645\u0627\u0631\u062A", "\u0643\u0648\u0633\u062A\u0643\u0648", "\u0628\u0631\u0648\u0643\u062A\u0631 \u0622\u0646\u062F \u063A\u0627\u0645\u0628\u0644", "\u0643\u0648\u0643\u0627\u0643\u0648\u0644\u0627", "\u0628\u064A\u0628\u0633\u064A\u0643\u0648"], ["Walmart", "Costco", "Procter & Gamble", "Coca-Cola", "PepsiCo"]),
    item("XLY", "XLY", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629", "Consumer Discretionary Select Sector SPDR Fund", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0642\u0637\u0627\u0639\u0627\u062A", "Sector ETFs", [], ["\u0623\u0645\u0627\u0632\u0648\u0646", "\u062A\u0633\u0644\u0627", "\u0647\u0648\u0645 \u062F\u064A\u0628\u0648\u062A", "\u0645\u0627\u0643\u062F\u0648\u0646\u0627\u0644\u062F\u0632", "\u0628\u0648\u0643\u064A\u0646\u063A"], ["Amazon", "Tesla", "Home Depot", "McDonald's", "Booking"]),
    item("XLC", "XLC", "etf", "\u0635\u0646\u062F\u0648\u0642 \u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A", "Communication Services Select Sector SPDR Fund", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0642\u0637\u0627\u0639\u0627\u062A", "Sector ETFs", [], ["\u0645\u064A\u062A\u0627", "\u0623\u0644\u0641\u0627\u0628\u062A", "\u0646\u062A\u0641\u0644\u0643\u0633", "\u062F\u064A\u0632\u0646\u064A", "\u0641\u064A\u0631\u0627\u064A\u0632\u0648\u0646"], ["Meta", "Alphabet", "Netflix", "Disney", "Verizon"]),
    item("XLU", "XLU", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0642\u0637\u0627\u0639 \u0627\u0644\u0645\u0631\u0627\u0641\u0642", "Utilities Select Sector SPDR Fund", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0642\u0637\u0627\u0639\u0627\u062A", "Sector ETFs", [], ["\u0646\u064A\u0643\u0633\u062A \u0625\u064A\u0631\u0627 \u0625\u0646\u0631\u062C\u064A", "\u0633\u0627\u0630\u0631\u0646", "\u062F\u064A\u0648\u0643 \u0625\u0646\u0631\u062C\u064A", "\u0643\u0648\u0646\u0633\u062A\u0644\u064A\u0634\u0646 \u0625\u0646\u0631\u062C\u064A"], ["NextEra Energy", "Southern", "Duke Energy", "Constellation Energy"]),
    item("XLRE", "XLRE", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0642\u0637\u0627\u0639 \u0627\u0644\u0639\u0642\u0627\u0631\u064A", "Real Estate Select Sector SPDR Fund", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0642\u0637\u0627\u0639\u0627\u062A", "Sector ETFs", [], ["\u0628\u0631\u0648\u0644\u0648\u062C\u064A\u0633", "\u0623\u0645\u0631\u064A\u0643\u0627\u0646 \u062A\u0627\u0648\u0631", "\u0625\u0643\u0648\u064A\u0646\u0643\u0633", "\u0648\u064A\u0644\u062A\u0627\u0648\u0631"], ["Prologis", "American Tower", "Equinix", "Welltower"]),
    item("XLB", "XLB", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0642\u0637\u0627\u0639 \u0627\u0644\u0645\u0648\u0627\u062F", "Materials Select Sector SPDR Fund", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0642\u0637\u0627\u0639\u0627\u062A", "Sector ETFs", [], ["\u0644\u064A\u0646\u062F\u064A", "\u0646\u064A\u0648\u0643\u0648\u0631", "\u0625\u064A\u0631 \u0628\u0631\u0648\u062F\u0643\u062A\u0633", "\u0641\u0631\u064A\u0628\u0648\u0631\u062A-\u0645\u0627\u0643\u0645\u0648\u0631\u0627\u0646"], ["Linde", "Nucor", "Air Products", "Freeport-McMoRan"]),
    item("SOXX", "SOXX", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0622\u064A \u0634\u064A\u0631\u0632 \u0644\u0623\u0634\u0628\u0627\u0647 \u0627\u0644\u0645\u0648\u0635\u0644\u0627\u062A", "iShares Semiconductor ETF", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0623\u0634\u0628\u0627\u0647 \u0627\u0644\u0645\u0648\u0635\u0644\u0627\u062A", "Semiconductor ETFs", [], ["\u0625\u0646\u0641\u064A\u062F\u064A\u0627", "\u0628\u0631\u0648\u062F\u0643\u0648\u0645", "\u0625\u064A\u0647 \u0625\u0645 \u062F\u064A", "\u0643\u0648\u0627\u0644\u0643\u0648\u0645", "\u0645\u064A\u0643\u0631\u0648\u0646"], ["NVIDIA", "Broadcom", "AMD", "Qualcomm", "Micron"]),
    item("SMH", "SMH", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0641\u0627\u0646 \u0625\u064A\u0643 \u0644\u0623\u0634\u0628\u0627\u0647 \u0627\u0644\u0645\u0648\u0635\u0644\u0627\u062A", "VanEck Semiconductor ETF", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0623\u0634\u0628\u0627\u0647 \u0627\u0644\u0645\u0648\u0635\u0644\u0627\u062A", "Semiconductor ETFs", [], ["\u0625\u0646\u0641\u064A\u062F\u064A\u0627", "\u062A\u064A \u0625\u0633 \u0625\u0645 \u0633\u064A", "\u0628\u0631\u0648\u062F\u0643\u0648\u0645", "\u0625\u064A\u0647 \u0625\u0633 \u0625\u0645 \u0625\u0644", "\u0644\u0627\u0645 \u0631\u064A\u0633\u064A\u0631\u0634"], ["NVIDIA", "TSMC", "Broadcom", "ASML", "Lam Research"]),
    item("TLT", "TLT", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0633\u0646\u062F\u0627\u062A \u0627\u0644\u062E\u0632\u0627\u0646\u0629 \u0627\u0644\u0623\u0645\u0631\u064A\u0643\u064A\u0629 \u0637\u0648\u064A\u0644\u0629 \u0627\u0644\u0623\u062C\u0644", "iShares 20+ Year Treasury Bond ETF", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0633\u0646\u062F\u0627\u062A", "Bond ETFs", [], ["\u0633\u0646\u062F\u0627\u062A \u062E\u0632\u0627\u0646\u0629 \u0623\u0645\u0631\u064A\u0643\u064A\u0629 \u0628\u0623\u062C\u0644 20 \u0633\u0646\u0629 \u0641\u0623\u0643\u062B\u0631"], ["U.S. Treasury bonds with 20+ year maturities"]),
    item("HYG", "HYG", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0633\u0646\u062F\u0627\u062A \u0627\u0644\u0634\u0631\u0643\u0627\u062A \u0645\u0631\u062A\u0641\u0639\u0629 \u0627\u0644\u0639\u0627\u0626\u062F", "iShares iBoxx High Yield Corporate Bond ETF", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0633\u0646\u062F\u0627\u062A", "Bond ETFs", [], ["\u0633\u0646\u062F\u0627\u062A \u0634\u0631\u0643\u0627\u062A \u0623\u0645\u0631\u064A\u0643\u064A\u0629 \u062F\u0648\u0646 \u0627\u0644\u062F\u0631\u062C\u0629 \u0627\u0644\u0627\u0633\u062A\u062B\u0645\u0627\u0631\u064A\u0629"], ["U.S. below-investment-grade corporate bonds"]),
    item("GLD", "GLD", "etf", "\u0635\u0646\u062F\u0648\u0642 \u0625\u0633 \u0628\u064A \u062F\u064A \u0622\u0631 \u0644\u0644\u0630\u0647\u0628", "SPDR Gold Shares", "\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0633\u0644\u0639", "Commodity ETFs", [], ["\u0633\u0628\u0627\u0626\u0643 \u0627\u0644\u0630\u0647\u0628 \u0627\u0644\u0641\u0639\u0644\u064A\u0629"], ["Physical gold bullion"])
  ]
};
var US_BENCHMARKS_SYMBOLS = new Set(US_BENCHMARKS_CATALOG.instruments.map((instrument) => instrument.symbol));

// base44/functions/usBenchmarksSignalRefresh/source.ts
var MARKET_OPTIONS = { timeZone: "America/New_York", weekStartsOn: 1 };
var PROJECTION_BATCH_SIZE = 12;
var PROJECTION_BATCH_COUNT = Math.ceil(US_BENCHMARKS_CATALOG.instruments.length / PROJECTION_BATCH_SIZE);
function rows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}
function nyDate(value = /* @__PURE__ */ new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MARKET_OPTIONS.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}
async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map((item2) => item2.toString(16).padStart(2, "0")).join("");
}
function dailyBars(values) {
  const byDate = /* @__PURE__ */ new Map();
  for (const bar of normalizeTechnicalBars(values)) byDate.set(nyDate(new Date(bar.time)), bar);
  return [...byDate.values()].sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
}
function projectionSlotKey(sessionDate) {
  return `${US_BENCHMARKS_MARKET_CODE}:technical-projection:${sessionDate}:${TECHNICAL_SIGNAL_FORMULA_VERSION}`;
}
function projectionBatchSlotKey(sessionDate, batchIndex) {
  return `${projectionSlotKey(sessionDate)}:batch-${batchIndex + 1}-of-${PROJECTION_BATCH_COUNT}`;
}
function parseRunNotes(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
function aggregateSession(values) {
  const bars = normalizeTechnicalBars(values);
  if (!bars.length) return null;
  return { time: bars[0].time, open: bars[0].open, high: Math.max(...bars.map((bar) => bar.high)), low: Math.min(...bars.map((bar) => bar.low)), close: bars.at(-1).close, volume: bars.reduce((sum, bar) => sum + Number(bar.volume || 0), 0) };
}
async function upsert(base44, entity, values, existing, fields) {
  const key = (row) => fields.map((field) => String(row[field] ?? "")).join("|");
  const existingByKey = new Map(existing.map((row) => [key(row), row]));
  const unique = [...new Map(values.map((row) => [key(row), row])).values()];
  const creates = unique.filter((row) => !existingByKey.has(key(row)));
  const updates = unique.filter((row) => existingByKey.has(key(row))).map((row) => ({ id: existingByKey.get(key(row)).id, ...row }));
  if (creates.length) await base44.asServiceRole.entities[entity].bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities[entity].bulkUpdate(updates);
  return { created: creates.length, updated: updates.length };
}
async function projectionSource(base44) {
  const code = "US_BENCHMARKS_CANONICAL_PROJECTION";
  const existing = rows(await base44.asServiceRole.entities.DataSource.filter({ code }));
  const payload = { name: "U.S. benchmarks canonical candles and signals", market_code: US_BENCHMARKS_MARKET_CODE, quote_mode: "end_of_day", delay_seconds: 0, public_enabled: false, source_type: "reference", license_status: "restricted", last_verified_at: (/* @__PURE__ */ new Date()).toISOString() };
  return existing[0] ? base44.asServiceRole.entities.DataSource.update(existing[0].id, payload) : base44.asServiceRole.entities.DataSource.create({ code, ...payload });
}
async function projectBatch(base44, instruments, sessionDate, sourceId, runId) {
  const ids = instruments.map((item2) => item2.id);
  const idQuery = { $in: ids };
  const [candleRows, snapshotRows] = await Promise.all([
    base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: idQuery, market_code: US_BENCHMARKS_MARKET_CODE }, "-start_time", 2e3),
    base44.asServiceRole.entities.IndicatorSnapshot.filter({ instrument_id: idQuery, market_code: US_BENCHMARKS_MARKET_CODE }, "-source_as_of", 500)
  ]);
  const chunks = rows(candleRows).filter((chunk) => chunk.quality_status !== "quarantined" && Array.isArray(chunk.bars));
  const existingSnapshots = rows(snapshotRows);
  const projectedCandles = [];
  const snapshots = [];
  const skipped = [];
  for (const instrument of instruments) {
    const instrumentChunks = chunks.filter((chunk) => chunk.instrument_id === instrument.id);
    const storedDaily = instrumentChunks.filter((chunk) => chunk.interval === "1d").flatMap((chunk) => chunk.bars || []);
    const intraday = instrumentChunks.filter((chunk) => chunk.interval === "15m" && chunk.session_date === sessionDate && chunk.is_final === true && chunk.completeness_status === "complete").flatMap((chunk) => chunk.bars || []);
    const currentDaily = aggregateSession(intraday);
    const canonicalDaily = dailyBars([...storedDaily, ...currentDaily ? [currentDaily] : []]);
    if (canonicalDaily.length < 2) {
      skipped.push({ instrument_id: instrument.id, symbol: instrument.symbol, reason: "daily_history_missing" });
      continue;
    }
    const timeframes = { "1d": canonicalDaily, "1wk": aggregateTechnicalBars(canonicalDaily, "1wk", MARKET_OPTIONS), "1mo": aggregateTechnicalBars(canonicalDaily, "1mo", MARKET_OPTIONS) };
    for (const [timeframe, bars] of Object.entries(timeframes)) {
      if (!bars.length) continue;
      const technical = calculateTechnicalSignals(bars, TECHNICAL_SIGNAL_WINDOW_SIZE, timeframe);
      const currentPeriodIsFinal = timeframe === "1d" && Boolean(currentDaily);
      snapshots.push({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, symbol: instrument.symbol, indicator_key: "technical_signals", timeframe, values: { ...technical, is_final: currentPeriodIsFinal }, source_as_of: bars.at(-1).time, calculated_at: (/* @__PURE__ */ new Date()).toISOString(), formula_version: TECHNICAL_SIGNAL_FORMULA_VERSION });
      const momentum = calculateMomentumZones(bars, 20, Number.POSITIVE_INFINITY, timeframe);
      if (momentum) snapshots.push({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, symbol: instrument.symbol, indicator_key: "momentum_zones", timeframe, values: { ...momentum, is_final: currentPeriodIsFinal }, source_as_of: bars.at(-1).time, calculated_at: (/* @__PURE__ */ new Date()).toISOString(), formula_version: MOMENTUM_FORMULA_VERSION });
      if (timeframe !== "1d") projectedCandles.push({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, symbol: instrument.symbol, interval: timeframe, chunk_key: `${US_BENCHMARKS_MARKET_CODE}:${instrument.symbol}:${timeframe}:canonical`, start_time: bars[0].time, end_time: bars.at(-1).time, bars, bar_count: bars.length, checksum: await digest(bars), source_id: sourceId, run_id: runId, snapshot_version: `${US_BENCHMARKS_MARKET_CODE}:${sessionDate}:${TECHNICAL_SIGNAL_FORMULA_VERSION}`, provider_as_of: bars.at(-1).time, received_time: (/* @__PURE__ */ new Date()).toISOString(), quality_status: "verified", canonical_version: "us-benchmarks-candle-projection-v1", is_final: currentPeriodIsFinal, bucket_count: bars.length, completeness_status: "complete", is_historical_archive: false, adjustment_mode: "none" });
    }
  }
  return {
    instruments: instruments.length,
    candles: await upsert(base44, "CandleChunk", projectedCandles, chunks, ["instrument_id", "interval", "chunk_key"]),
    signals: await upsert(base44, "IndicatorSnapshot", snapshots, existingSnapshots, ["instrument_id", "indicator_key", "timeframe"]),
    skipped
  };
}
Deno.serve(async (req) => {
  let base44;
  let run = null;
  try {
    base44 = createClientFromRequest(req);
    const requestBody = await readJsonBody(req);
    const body = { ...requestBody, ...requestBody.args || {} };
    if (body.session_id) await requirePermission(base44, body.session_id, "data.ingestion.run");
    else await requireTrustedOwner(base44);
    if (String(body.market_code || US_BENCHMARKS_MARKET_CODE) !== US_BENCHMARKS_MARKET_CODE) throw Object.assign(new Error("Wrong market"), { status: 400, code: "MARKET_MISMATCH" });
    const sessionDate = String(body.session_date || nyDate());
    const slotKey = projectionSlotKey(sessionDate);
    const instruments = rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_BENCHMARKS_MARKET_CODE }, "symbol", 500)).filter((item2) => US_BENCHMARKS_SYMBOLS.has(item2.symbol) && item2.status !== "delisted").sort((left, right) => String(left.symbol).localeCompare(String(right.symbol), "en"));
    if (instruments.length !== US_BENCHMARKS_CATALOG.instruments.length) throw Object.assign(new Error(`Benchmark catalog incomplete: ${instruments.length}/${US_BENCHMARKS_CATALOG.instruments.length}`), { status: 503, code: "US_BENCHMARKS_CATALOG_INCOMPLETE" });
    if (Math.ceil(instruments.length / PROJECTION_BATCH_SIZE) !== PROJECTION_BATCH_COUNT) throw Object.assign(new Error(`Benchmark projection capacity changed: ${instruments.length}`), { status: 503, code: "PROJECTION_CAPACITY_CHANGED" });
    const recentRuns = rows(await base44.asServiceRole.entities.IngestionRun.filter({ market_code: US_BENCHMARKS_MARKET_CODE }, "-created_date", 250));
    const completedRun = recentRuns.find((item2) => item2.slot_key === slotKey && ["success", "partial"].includes(item2.status));
    if (completedRun && body.force !== true) return Response.json({ status: "skipped", reason: "already_projected", market_code: US_BENCHMARKS_MARKET_CODE, session_date: sessionDate, run_id: completedRun.id });
    const completedBatches = [];
    let nextBatchIndex = -1;
    for (let batchIndex = 0; batchIndex < PROJECTION_BATCH_COUNT; batchIndex += 1) {
      const batchSlotKey = projectionBatchSlotKey(sessionDate, batchIndex);
      const batchRuns = recentRuns.filter((item2) => item2.slot_key === batchSlotKey).sort((left, right) => Date.parse(right.finished_at || right.updated_date || right.created_date || 0) - Date.parse(left.finished_at || left.updated_date || left.created_date || 0));
      const completedBatch = batchRuns.find((item2) => ["success", "partial"].includes(item2.status));
      if (completedBatch && body.force !== true) {
        completedBatches.push(completedBatch);
        continue;
      }
      const activeBatch = batchRuns.find((item2) => item2.status === "running" && Date.parse(item2.lease_expires_at || 0) > Date.now());
      if (activeBatch && body.force !== true) return Response.json({ status: "running", stage: "projection_batch", session_date: sessionDate, batch_index: batchIndex, batch_count: PROJECTION_BATCH_COUNT, run_id: activeBatch.id });
      for (const staleBatch of batchRuns.filter((item2) => item2.status === "running")) {
        await base44.asServiceRole.entities.IngestionRun.update(staleBatch.id, { status: "failed", finished_at: (/* @__PURE__ */ new Date()).toISOString(), failure_code: "SUPERSEDED_STALE_BATCH", notes: "A stale benchmark projection batch was superseded by a bounded retry" });
      }
      nextBatchIndex = batchIndex;
      break;
    }
    if (nextBatchIndex >= 0) {
      const selected = instruments.slice(nextBatchIndex * PROJECTION_BATCH_SIZE, (nextBatchIndex + 1) * PROJECTION_BATCH_SIZE);
      const source2 = await projectionSource(base44);
      run = await base44.asServiceRole.entities.IngestionRun.create({
        run_type: "technical_projection_batch",
        market_code: US_BENCHMARKS_MARKET_CODE,
        slot_key: projectionBatchSlotKey(sessionDate, nextBatchIndex),
        slot_kind: "technical_projection",
        scheduled_for: (/* @__PURE__ */ new Date()).toISOString(),
        lease_expires_at: new Date(Date.now() + 3 * 6e4).toISOString(),
        started_at: (/* @__PURE__ */ new Date()).toISOString(),
        total_records: selected.length,
        success_count: 0,
        failed_count: 0,
        status: "running",
        source_id: source2.id,
        notes: `Bounded benchmark projection batch ${nextBatchIndex + 1}/${PROJECTION_BATCH_COUNT}`
      });
      const result = await projectBatch(base44, selected, sessionDate, source2.id, run.id);
      const failed = new Set(result.skipped.map((item2) => item2.instrument_id)).size;
      const status2 = failed === 0 ? "success" : failed < selected.length ? "partial" : "failed";
      await base44.asServiceRole.entities.IngestionRun.update(run.id, {
        status: status2,
        finished_at: (/* @__PURE__ */ new Date()).toISOString(),
        success_count: selected.length - failed,
        failed_count: failed,
        coverage_percent: selected.length ? (selected.length - failed) / selected.length * 100 : 0,
        notes: JSON.stringify({ batch_index: nextBatchIndex, batch_count: PROJECTION_BATCH_COUNT, candles: result.candles, signals: result.signals, skipped: result.skipped })
      });
      return Response.json({ ...result, status: status2, stage: "projection_batch", market_code: US_BENCHMARKS_MARKET_CODE, session_date: sessionDate, run_id: run.id, batch_index: nextBatchIndex, batch_count: PROJECTION_BATCH_COUNT, completed_batches: nextBatchIndex + 1, remaining_batches: PROJECTION_BATCH_COUNT - nextBatchIndex - 1 });
    }
    const totalRecords = completedBatches.reduce((total, item2) => total + Number(item2.total_records || 0), 0);
    const successCount = completedBatches.reduce((total, item2) => total + Number(item2.success_count || 0), 0);
    const failedCount = Math.max(0, totalRecords - successCount);
    const candles = completedBatches.reduce((total, item2) => {
      const notes = parseRunNotes(item2.notes);
      total.created += Number(notes.candles?.created || 0);
      total.updated += Number(notes.candles?.updated || 0);
      return total;
    }, { created: 0, updated: 0 });
    const signals = completedBatches.reduce((total, item2) => {
      const notes = parseRunNotes(item2.notes);
      total.created += Number(notes.signals?.created || 0);
      total.updated += Number(notes.signals?.updated || 0);
      return total;
    }, { created: 0, updated: 0 });
    const status = failedCount === 0 ? "success" : failedCount < totalRecords ? "partial" : "failed";
    const source = await projectionSource(base44);
    run = await base44.asServiceRole.entities.IngestionRun.create({
      run_type: "technical_projection",
      market_code: US_BENCHMARKS_MARKET_CODE,
      slot_key: slotKey,
      slot_kind: "technical_projection",
      scheduled_for: (/* @__PURE__ */ new Date()).toISOString(),
      started_at: (/* @__PURE__ */ new Date()).toISOString(),
      finished_at: (/* @__PURE__ */ new Date()).toISOString(),
      lease_expires_at: new Date(Date.now() + 6e4).toISOString(),
      total_records: totalRecords,
      success_count: successCount,
      failed_count: failedCount,
      status,
      source_id: source.id,
      coverage_percent: totalRecords ? successCount / totalRecords * 100 : 0,
      snapshot_version: slotKey,
      notes: JSON.stringify({ candles, signals, batch_count: PROJECTION_BATCH_COUNT, batch_run_ids: completedBatches.map((item2) => item2.id) })
    });
    return Response.json({ status, stage: "projection_finalize", market_code: US_BENCHMARKS_MARKET_CODE, session_date: sessionDate, run_id: run.id, instruments: totalRecords, success_count: successCount, failed_count: failedCount, candles, signals });
  } catch (error) {
    if (base44 && run?.id) try {
      await base44.asServiceRole.entities.IngestionRun.update(run.id, { status: "failed", finished_at: (/* @__PURE__ */ new Date()).toISOString(), failure_code: error?.code || "US_BENCHMARKS_SIGNAL_FAILED", notes: error?.message || "failed" });
    } catch {
    }
    return replyError(error);
  }
});
