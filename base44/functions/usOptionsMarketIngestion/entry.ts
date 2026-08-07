// GENERATED from usOptionsMarketIngestion/source.ts. Do not edit directly.

// base44/functions/usOptionsMarketIngestion/source.ts
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// base44/shared/permissions.ts
var PERMISSION_CATALOG = [
  { code: "dashboard.owner.read", group_code: "dashboard", name_ar: "\u0639\u0631\u0636 \u0644\u0648\u062D\u0629 \u0627\u0644\u0645\u0627\u0644\u0643", name_en: "View owner dashboard", sensitive: true, owner_only: false },
  { code: "customers.masked.read", group_code: "customers", name_ar: "\u0639\u0631\u0636 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u0642\u0646\u0651\u0639\u0629", name_en: "View masked customer data", sensitive: false, owner_only: false },
  { code: "customers.full.read", group_code: "customers", name_ar: "\u0639\u0631\u0636 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0643\u0627\u0645\u0644\u0629", name_en: "View full customer data", sensitive: true, owner_only: false },
  { code: "customers.status.manage", group_code: "customers", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u062D\u0627\u0644\u0629 \u0627\u0644\u0639\u0645\u064A\u0644", name_en: "Manage customer status", sensitive: true, owner_only: false },
  { code: "customers.sessions.revoke", group_code: "customers", name_ar: "\u0625\u0644\u063A\u0627\u0621 \u062C\u0644\u0633\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621", name_en: "Revoke customer sessions", sensitive: true, owner_only: false },
  { code: "customers.notes.manage", group_code: "customers", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621", name_en: "Manage customer notes", sensitive: true, owner_only: false },
  { code: "subscriptions.read", group_code: "subscriptions", name_ar: "\u0639\u0631\u0636 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A", name_en: "View subscriptions", sensitive: false, owner_only: false },
  { code: "subscriptions.manage", group_code: "subscriptions", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A", name_en: "Manage subscriptions", sensitive: true, owner_only: false },
  { code: "plans.manage", group_code: "subscriptions", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u062E\u0637\u0637 \u0648\u0627\u0644\u062D\u062F\u0648\u062F", name_en: "Manage plans and entitlements", sensitive: true, owner_only: true },
  { code: "data.operations.read", group_code: "data", name_ar: "\u0639\u0631\u0636 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A", name_en: "View data operations", sensitive: false, owner_only: false },
  { code: "data.ingestion.run", group_code: "data", name_ar: "\u062A\u0634\u063A\u064A\u0644 \u062C\u0644\u0628 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A", name_en: "Run data ingestion", sensitive: true, owner_only: false },
  { code: "data.quality.manage", group_code: "data", name_ar: "\u0645\u0639\u0627\u0644\u062C\u0629 \u062C\u0648\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A", name_en: "Manage data quality", sensitive: true, owner_only: false },
  { code: "alerts.operations.read", group_code: "alerts", name_ar: "\u0639\u0631\u0636 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u062A\u0646\u0628\u064A\u0647\u0627\u062A", name_en: "View alert operations", sensitive: false, owner_only: false },
  { code: "alerts.operations.manage", group_code: "alerts", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u062A\u0646\u0628\u064A\u0647\u0627\u062A", name_en: "Manage alert operations", sensitive: true, owner_only: false },
  { code: "audit.read", group_code: "audit", name_ar: "\u0639\u0631\u0636 \u0633\u062C\u0644 \u0627\u0644\u062A\u062F\u0642\u064A\u0642", name_en: "View audit log", sensitive: true, owner_only: false },
  { code: "audit.export", group_code: "audit", name_ar: "\u062A\u0635\u062F\u064A\u0631 \u0633\u062C\u0644 \u0627\u0644\u062A\u062F\u0642\u064A\u0642", name_en: "Export audit log", sensitive: true, owner_only: true },
  { code: "roles.manage", group_code: "administration", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0623\u062F\u0648\u0627\u0631 \u0648\u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A", name_en: "Manage roles and permissions", sensitive: true, owner_only: true },
  { code: "settings.manage", group_code: "administration", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645", name_en: "Manage system settings", sensitive: true, owner_only: true }
].map((permission) => ({ ...permission, active: true }));
var PERMISSION_CODES = new Set(PERMISSION_CATALOG.map((permission) => permission.code));
var LEGACY_ROLE_PERMISSIONS = {
  support: ["dashboard.owner.read", "customers.masked.read"],
  admin: [
    "dashboard.owner.read",
    "customers.masked.read",
    "customers.full.read",
    "customers.status.manage",
    "customers.sessions.revoke",
    "customers.notes.manage",
    "subscriptions.read",
    "subscriptions.manage",
    "data.operations.read",
    "data.ingestion.run",
    "data.quality.manage",
    "alerts.operations.read",
    "alerts.operations.manage",
    "audit.read"
  ]
};

// base44/shared/security.ts
var MAX_JSON_BODY_BYTES = 256 * 1024;
var SESSION_TOKEN_PREFIX = "kmy1";
var MARKET_ACCESS = {
  SA_MAIN: { entitlement: "market.saudi", name_ar: "\u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629", name_en: "Saudi Main Market", currency: "SAR" },
  US_OPTIONS: { entitlement: "market.us.options", name_ar: "\u0634\u0631\u0643\u0627\u062A \u0639\u0642\u0648\u062F \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A", name_en: "U.S. Optionable Companies", currency: "USD" },
  US_BENCHMARKS: { entitlement: "market.us.benchmarks", name_ar: "\u0627\u0644\u0645\u0624\u0634\u0631\u0627\u062A \u0648\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0623\u0645\u0631\u064A\u0643\u064A\u0629", name_en: "U.S. Indices & ETFs", currency: "USD" }
};
async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join("");
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
      customer_number: `KMY-ADMIN-${String(user.id).slice(-8).toUpperCase()}`,
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
  if (status >= 500) console.error("KMY backend error", error);
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
      account_number: `KMY-A-${String(profile.customer_number || profile.id).replace(/[^A-Za-z0-9-]/g, "").slice(-24)}`,
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
  let membership = memberships.find((item) => item.status === "active") || null;
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
  const subscriptions = [...new Map([...accountSubscriptions, ...customerSubscriptions].filter((item) => !item.ends_at || new Date(item.ends_at).getTime() > now).map((item) => [item.id, item])).values()];
  if (!subscriptions.length) return { subscription: null, subscriptions: [], plan: null, plans: [], entitlements: [], marketAccess: [] };
  const planIds = [...new Set(subscriptions.map((item) => item.plan_id).filter(Boolean))];
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
  entitlementGroups.flat().forEach((item) => {
    const current = entitlementsByCode.get(item.code);
    if (!current || Number(item.limit_value || 0) > Number(current.limit_value || 0)) entitlementsByCode.set(item.code, item);
  });
  const entitlements = [...entitlementsByCode.values()];
  const marketCodes = /* @__PURE__ */ new Set();
  entitlementGroups.forEach((group) => {
    const codes = new Set(group.map((item) => item.code));
    const explicitMarkets = [...codes].filter((code) => code.startsWith("market."));
    if (codes.has("market.us.options")) marketCodes.add("US_OPTIONS");
    if (codes.has("market.us.benchmarks")) marketCodes.add("US_BENCHMARKS");
    if ([...codes].some((code) => ["market.saudi", "market.saudi.delayed", "market.saudi.realtime"].includes(code))) marketCodes.add("SA_MAIN");
    if (!explicitMarkets.length) marketCodes.add("SA_MAIN");
  });
  const marketAccess = [...marketCodes].map((marketCode) => ({ market_code: marketCode, ...MARKET_ACCESS[marketCode] }));
  return {
    subscription: subscriptions[0] || null,
    subscriptions,
    plan: plans.find((item) => item.id === subscriptions[0]?.plan_id) || null,
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
  const permissions = role === "owner" ? new Set(PERMISSION_CATALOG.map((permission) => permission.code)) : /* @__PURE__ */ new Set([...LEGACY_ROLE_PERMISSIONS[role] || [], ...assigned.codes]);
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

// base44/shared/us-options-catalog.ts
var US_OPTIONS_MARKET_CODE = "US_OPTIONS";
var COMPANY_NAMES_AR = {
  NVDA: "\u0625\u0646\u0641\u064A\u062F\u064A\u0627",
  GOOGL: "\u0623\u0644\u0641\u0627\u0628\u062A",
  AAPL: "\u0623\u0628\u0644",
  MSFT: "\u0645\u0627\u064A\u0643\u0631\u0648\u0633\u0648\u0641\u062A",
  AMZN: "\u0623\u0645\u0627\u0632\u0648\u0646",
  TSM: "\u062A\u0627\u064A\u0648\u0627\u0646 \u0644\u0623\u0634\u0628\u0627\u0647 \u0627\u0644\u0645\u0648\u0635\u0644\u0627\u062A",
  AVGO: "\u0628\u0631\u0648\u062F\u0643\u0648\u0645",
  SPCX: "\u0633\u0628\u064A\u0633 \u0625\u0643\u0633",
  TSLA: "\u062A\u0633\u0644\u0627",
  JPM: "\u062C\u064A \u0628\u064A \u0645\u0648\u0631\u063A\u0627\u0646 \u062A\u0634\u064A\u0633",
  WMT: "\u0648\u0648\u0644 \u0645\u0627\u0631\u062A",
  AMD: "\u0625\u064A\u0647 \u0625\u0645 \u062F\u064A",
  V: "\u0641\u064A\u0632\u0627",
  XOM: "\u0625\u0643\u0633\u0648\u0646 \u0645\u0648\u0628\u064A\u0644",
  JNJ: "\u062C\u0648\u0646\u0633\u0648\u0646 \u0622\u0646\u062F \u062C\u0648\u0646\u0633\u0648\u0646",
  CSCO: "\u0633\u064A\u0633\u0643\u0648 \u0633\u064A\u0633\u062A\u0645\u0632",
  ABBV: "\u0622\u0628\u0641\u064A",
  ORCL: "\u0623\u0648\u0631\u0627\u0643\u0644",
  CVX: "\u0634\u064A\u0641\u0631\u0648\u0646",
  GE: "\u062C\u064A \u0625\u064A \u0625\u064A\u0631\u0648\u0633\u0628\u064A\u0633",
  UNH: "\u064A\u0648\u0646\u0627\u064A\u062A\u062F \u0647\u064A\u0644\u062B \u063A\u0631\u0648\u0628",
  HSBC: "\u0625\u062A\u0634 \u0625\u0633 \u0628\u064A \u0633\u064A",
  LRCX: "\u0644\u0627\u0645 \u0631\u064A\u0633\u064A\u0631\u0634",
  HD: "\u0647\u0648\u0645 \u062F\u064A\u0628\u0648\u062A",
  PG: "\u0628\u0631\u0648\u0643\u062A\u0631 \u0622\u0646\u062F \u063A\u0627\u0645\u0628\u0644",
  MS: "\u0645\u0648\u0631\u063A\u0627\u0646 \u0633\u062A\u0627\u0646\u0644\u064A",
  MRK: "\u0645\u064A\u0631\u0643",
  PLTR: "\u0628\u0627\u0644\u0627\u0646\u062A\u064A\u0631 \u062A\u0643\u0646\u0648\u0644\u0648\u062C\u064A\u0632",
  TM: "\u062A\u0648\u064A\u0648\u062A\u0627 \u0645\u0648\u062A\u0648\u0631",
  NVS: "\u0646\u0648\u0641\u0627\u0631\u062A\u0633",
  RY: "\u0631\u0648\u064A\u0627\u0644 \u0628\u0646\u0643 \u0623\u0648\u0641 \u0643\u0646\u062F\u0627",
  PM: "\u0641\u064A\u0644\u064A\u0628 \u0645\u0648\u0631\u064A\u0633 \u0625\u0646\u062A\u0631\u0646\u0627\u0634\u064A\u0648\u0646\u0627\u0644",
  RTX: "\u0622\u0631 \u062A\u064A \u0625\u0643\u0633",
  PANW: "\u0628\u0627\u0644\u0648 \u0623\u0644\u062A\u0648 \u0646\u062A\u0648\u0631\u0643\u0633",
  DELL: "\u062F\u0650\u0644 \u062A\u0643\u0646\u0648\u0644\u0648\u062C\u064A\u0632",
  TXN: "\u062A\u0643\u0633\u0627\u0633 \u0625\u0646\u0633\u062A\u0631\u0648\u0645\u0646\u062A\u0633",
  AZN: "\u0623\u0633\u062A\u0631\u0627\u0632\u064A\u0646\u064A\u0643\u0627",
  KLAC: "\u0643\u064A\u0647 \u0625\u0644 \u0625\u064A\u0647",
  SAP: "\u0625\u0633 \u0625\u064A\u0647 \u0628\u064A",
  ANET: "\u0623\u0631\u064A\u0633\u062A\u0627 \u0646\u062A\u0648\u0631\u0643\u0633",
  AXP: "\u0623\u0645\u0631\u064A\u0643\u0627\u0646 \u0625\u0643\u0633\u0628\u0631\u064A\u0633",
  C: "\u0633\u064A\u062A\u064A \u063A\u0631\u0648\u0628",
  LIN: "\u0644\u064A\u0646\u062F\u064A",
  IBM: "\u0622\u064A \u0628\u064A \u0625\u0645",
  CRWD: "\u0643\u0631\u0627\u0648\u062F \u0633\u062A\u0631\u0627\u064A\u0643",
  AMGN: "\u0623\u0645\u062C\u064A\u0646",
  APH: "\u0623\u0645\u0641\u064A\u0646\u0648\u0644",
  TD: "\u062A\u0648\u0631\u0648\u0646\u062A\u0648 \u062F\u0648\u0645\u064A\u0646\u064A\u0648\u0646 \u0628\u0646\u0643",
  PEP: "\u0628\u064A\u0628\u0633\u064A\u0643\u0648",
  TMUS: "\u062A\u064A \u0645\u0648\u0628\u0627\u064A\u0644 \u0627\u0644\u0648\u0644\u0627\u064A\u0627\u062A \u0627\u0644\u0645\u062A\u062D\u062F\u0629",
  MCD: "\u0645\u0627\u0643\u062F\u0648\u0646\u0627\u0644\u062F\u0632",
  ABT: "\u0623\u0628\u0648\u062A \u0644\u0627\u0628\u0648\u0631\u0627\u062A\u0648\u0631\u064A\u0632",
  BA: "\u0628\u0648\u064A\u0646\u063A",
  SCHW: "\u062A\u0634\u0627\u0631\u0644\u0632 \u0634\u0648\u0627\u0628",
  ADI: "\u0623\u0646\u0627\u0644\u0648\u063A \u062F\u064A\u0641\u0627\u064A\u0633\u0632",
  TJX: "\u062A\u064A \u062C\u064A\u0647 \u0625\u0643\u0633",
  UNP: "\u064A\u0648\u0646\u064A\u0648\u0646 \u0628\u0627\u0633\u064A\u0641\u064A\u0643",
  ETN: "\u0625\u064A\u062A\u0648\u0646",
  MRVL: "\u0645\u0627\u0631\u0641\u0644 \u062A\u0643\u0646\u0648\u0644\u0648\u062C\u064A",
  WELL: "\u0648\u064A\u0644\u062A\u0627\u0648\u0631",
  GILD: "\u063A\u064A\u0644\u064A\u0627\u062F \u0633\u0627\u064A\u0646\u0633\u0632",
  QCOM: "\u0643\u0648\u0627\u0644\u0643\u0648\u0645",
  SCCO: "\u0633\u0627\u0630\u0631\u0646 \u0643\u0648\u0628\u0631",
  CRM: "\u0633\u064A\u0644\u0632\u0641\u0648\u0631\u0633",
  SHOP: "\u0634\u0648\u0628\u064A\u0641\u0627\u064A",
  BKNG: "\u0628\u0648\u0643\u064A\u0646\u063A \u0647\u0648\u0644\u062F\u064A\u0646\u063A\u0632",
  COP: "\u0643\u0648\u0646\u0648\u0643\u0648 \u0641\u064A\u0644\u064A\u0628\u0633",
  DHR: "\u062F\u0627\u0646\u0627\u0647\u0631",
  APP: "\u0622\u0628 \u0644\u0648\u0641\u064A\u0646",
  PLD: "\u0628\u0631\u0648\u0644\u0648\u062C\u064A\u0633",
  CVS: "\u0633\u064A \u0641\u064A \u0625\u0633 \u0647\u064A\u0644\u062B",
  CB: "\u062A\u0634\u0628",
  COF: "\u0643\u0627\u0628\u064A\u062A\u0627\u0644 \u0648\u0646 \u0641\u0627\u064A\u0646\u0646\u0634\u0627\u0644",
  ISRG: "\u0625\u0646\u062A\u0648\u064A\u062A\u064A\u0641 \u0633\u064A\u0631\u062C\u064A\u0643\u0627\u0644",
  SYK: "\u0633\u062A\u0631\u0627\u064A\u0643\u0631",
  BMO: "\u0628\u0646\u0643 \u0623\u0648\u0641 \u0645\u0648\u0646\u062A\u0631\u064A\u0627\u0644",
  GLW: "\u0643\u0648\u0631\u0646\u064A\u0646\u063A",
  PGR: "\u0628\u0631\u0648\u063A\u0631\u064A\u0633\u064A\u0641",
  SPGI: "\u0625\u0633 \u0622\u0646\u062F \u0628\u064A \u063A\u0644\u0648\u0628\u0627\u0644",
  FTNT: "\u0641\u0648\u0631\u062A\u064A\u0646\u062A",
  VRTX: "\u0641\u064A\u0631\u062A\u0643\u0633 \u0641\u0627\u0631\u0645\u0627\u0633\u064A\u0648\u062A\u064A\u0643\u0644\u0632",
  LOW: "\u0644\u0648\u0632",
  NOW: "\u0633\u064A\u0631\u0641\u0633 \u0646\u0627\u0648",
  SBUX: "\u0633\u062A\u0627\u0631\u0628\u0643\u0633",
  HWM: "\u0647\u0627\u0648\u0645\u062A \u0625\u064A\u0631\u0648\u0633\u0628\u064A\u0633",
  ACN: "\u0623\u0643\u0633\u0646\u062A\u0634\u0631",
  CM: "\u0627\u0644\u0628\u0646\u0643 \u0627\u0644\u0625\u0645\u0628\u0631\u0627\u0637\u0648\u0631\u064A \u0627\u0644\u0643\u0646\u062F\u064A \u0644\u0644\u062A\u062C\u0627\u0631\u0629",
  ADP: "\u0623\u0648\u062A\u0648\u0645\u0627\u062A\u064A\u0643 \u062F\u0627\u062A\u0627 \u0628\u0631\u0648\u0633\u064A\u0633\u0646\u063A",
  BNY: "\u0628\u0646\u0643 \u0623\u0648\u0641 \u0646\u064A\u0648\u064A\u0648\u0631\u0643 \u0645\u064A\u0644\u0648\u0646",
  SNOW: "\u0633\u0646\u0648\u0641\u0644\u064A\u0643",
  GD: "\u062C\u0646\u0631\u0627\u0644 \u062F\u0627\u064A\u0646\u0627\u0645\u064A\u0643\u0633",
  TT: "\u062A\u0631\u064A\u0646 \u062A\u0643\u0646\u0648\u0644\u0648\u062C\u064A\u0632",
  VRT: "\u0641\u064A\u0631\u062A\u064A\u0641",
  PNC: "\u0628\u064A \u0625\u0646 \u0633\u064A \u0644\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
  SPOT: "\u0633\u0628\u0648\u062A\u064A\u0641\u0627\u064A",
  BX: "\u0628\u0644\u0627\u0643\u0633\u062A\u0648\u0646",
  NET: "\u0643\u0644\u0627\u0648\u062F\u0641\u0644\u064A\u0631",
  ADBE: "\u0623\u062F\u0648\u0628\u064A",
  CEG: "\u0643\u0648\u0646\u0633\u062A\u0644\u064A\u0634\u0646 \u0625\u0646\u0631\u062C\u064A",
  DDOG: "\u062F\u0627\u062A\u0627 \u062F\u0648\u063A",
  DUK: "\u062F\u064A\u0648\u0643 \u0625\u0646\u0631\u062C\u064A",
  CME: "\u0633\u064A \u0625\u0645 \u0625\u064A \u063A\u0631\u0648\u0628",
  KKR: "\u0643\u064A\u0647 \u0643\u064A\u0647 \u0622\u0631",
  RACE: "\u0641\u064A\u0631\u0627\u0631\u064A",
  CDNS: "\u0643\u0627\u062F\u0646\u0633 \u062F\u064A\u0632\u0627\u064A\u0646 \u0633\u064A\u0633\u062A\u0645\u0632",
  MRSH: "\u0645\u0627\u0631\u0634",
  MAR: "\u0645\u0627\u0631\u064A\u0648\u062A \u0625\u0646\u062A\u0631\u0646\u0627\u0634\u064A\u0648\u0646\u0627\u0644",
  MMM: "\u062B\u0631\u064A \u0625\u0645",
  UPS: "\u064A\u0648 \u0628\u064A \u0625\u0633",
  ABNB: "\u0625\u064A\u0631 \u0628\u064A \u0625\u0646 \u0628\u064A"
};
var SECTOR_LABELS = {
  "Basic Materials": { en: "Materials", ar: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629" },
  "Consumer Discretionary": { en: "Consumer Discretionary", ar: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629" },
  "Consumer Staples": { en: "Consumer Staples", ar: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629" },
  Energy: { en: "Energy", ar: "\u0627\u0644\u0637\u0627\u0642\u0629" },
  Finance: { en: "Financials", ar: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629" },
  "Health Care": { en: "Health Care", ar: "\u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629" },
  Industrials: { en: "Industrials", ar: "\u0627\u0644\u0635\u0646\u0627\u0639\u0627\u062A" },
  "Real Estate": { en: "Real Estate", ar: "\u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A" },
  Technology: { en: "Information Technology", ar: "\u062A\u0642\u0646\u064A\u0629 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A" },
  Telecommunications: { en: "Communication Services", ar: "\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A" },
  Utilities: { en: "Utilities", ar: "\u0627\u0644\u0645\u0631\u0627\u0641\u0642 \u0627\u0644\u0639\u0627\u0645\u0629" }
};
var RAW_US_OPTIONS_CATALOG = {
  "source": {
    "optionability": "Cboe Listed Options Symbol Directory",
    "companyMetadata": "Nasdaq Stock Screener",
    "asOf": "2026-08-04",
    "cboeUrl": "https://www.cboe.com/us/options/symboldir/equity-index-options/download/?dt=2026-08-04",
    "nasdaqUrl": "https://api.nasdaq.com/api/screener/stocks?download=true",
    "selectionRule": "US-listed optionable equities selected at 100-500 USD on 2026-08-04; price is not persisted as a live quote",
    "excluded": [
      "NFLX"
    ]
  },
  "market": {
    "market_code": "US_OPTIONS",
    "country_code": "US",
    "name_ar": "\u0634\u0631\u0643\u0627\u062A \u0639\u0642\u0648\u062F \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A",
    "name_en": "U.S. Optionable Companies",
    "currency": "USD",
    "timezone": "America/New_York",
    "quote_mode": "delayed",
    "delay_seconds": 900,
    "license_status": "pending",
    "active": true
  },
  "companies": [
    {
      "symbol": "NVDA",
      "nameEn": "NVIDIA Corporation Common Stock",
      "nameAr": "NVIDIA Corporation Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Semiconductors",
      "country": "United States",
      "ipoYear": "1999",
      "marketCapSnapshot": 5000688e6,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/nvda"
    },
    {
      "symbol": "GOOGL",
      "nameEn": "Alphabet Inc. Class A Common Stock",
      "nameAr": "Alphabet Inc. Class A Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Software: Programming Data Processing",
      "country": "United States",
      "ipoYear": "2004",
      "marketCapSnapshot": 45680273e5,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/googl"
    },
    {
      "symbol": "AAPL",
      "nameEn": "Apple Inc. Common Stock",
      "nameAr": "Apple Inc. Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Manufacturing",
      "country": "United States",
      "ipoYear": "1980",
      "marketCapSnapshot": 4456437557520,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/aapl"
    },
    {
      "symbol": "MSFT",
      "nameEn": "Microsoft Corporation Common Stock",
      "nameAr": "Microsoft Corporation Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Software: Prepackaged Software",
      "country": "United States",
      "ipoYear": "1986",
      "marketCapSnapshot": 3621067258686,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/msft"
    },
    {
      "symbol": "AMZN",
      "nameEn": "Amazon.com Inc. Common Stock",
      "nameAr": "Amazon.com Inc. Common Stock",
      "sectorEn": "Consumer Discretionary",
      "sectorAr": "Consumer Discretionary",
      "industryEn": "Catalog/Specialty Distribution",
      "country": "United States",
      "ipoYear": "1997",
      "marketCapSnapshot": 3055234222013,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/amzn"
    },
    {
      "symbol": "TSM",
      "nameEn": "Taiwan Semiconductor Manufacturing Company Ltd.",
      "nameAr": "Taiwan Semiconductor Manufacturing Company Ltd.",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Semiconductors",
      "country": "Taiwan",
      "ipoYear": "1997",
      "marketCapSnapshot": 2106291506563,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/tsm"
    },
    {
      "symbol": "AVGO",
      "nameEn": "Broadcom Inc. Common Stock",
      "nameAr": "Broadcom Inc. Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Semiconductors",
      "country": "United States",
      "ipoYear": "2009",
      "marketCapSnapshot": 1866065681062,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/avgo"
    },
    {
      "symbol": "SPCX",
      "nameEn": "Space Exploration Technologies Corp. Class A Common Stock",
      "nameAr": "Space Exploration Technologies Corp. Class A Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Software: Programming Data Processing",
      "country": "United States",
      "ipoYear": "2026",
      "marketCapSnapshot": 1499295504611,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/spcx"
    },
    {
      "symbol": "TSLA",
      "nameEn": "Tesla Inc. Common Stock",
      "nameAr": "Tesla Inc. Common Stock",
      "sectorEn": "Industrials",
      "sectorAr": "Industrials",
      "industryEn": "Auto Manufacturing",
      "country": "United States",
      "ipoYear": "2010",
      "marketCapSnapshot": 1272070224660,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/tsla"
    },
    {
      "symbol": "JPM",
      "nameEn": "JP Morgan Chase & Co. Common Stock",
      "nameAr": "JP Morgan Chase & Co. Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Major Banks",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 944902906444,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/jpm"
    },
    {
      "symbol": "WMT",
      "nameEn": "Walmart Inc. Common Stock",
      "nameAr": "Walmart Inc. Common Stock",
      "sectorEn": "Consumer Discretionary",
      "sectorAr": "Consumer Discretionary",
      "industryEn": "Department/Specialty Retail Stores",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 881038943250,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/wmt"
    },
    {
      "symbol": "AMD",
      "nameEn": "Advanced Micro Devices Inc. Common Stock",
      "nameAr": "Advanced Micro Devices Inc. Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Semiconductors",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 790254293685,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/amd"
    },
    {
      "symbol": "V",
      "nameEn": "Visa Inc.",
      "nameAr": "Visa Inc.",
      "sectorEn": "Consumer Discretionary",
      "sectorAr": "Consumer Discretionary",
      "industryEn": "Business Services",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 653362783126,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/v"
    },
    {
      "symbol": "XOM",
      "nameEn": "ExxonMobil Holdings Corporation Common Stock",
      "nameAr": "ExxonMobil Holdings Corporation Common Stock",
      "sectorEn": "Energy",
      "sectorAr": "Energy",
      "industryEn": "Integrated oil Companies",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 642715506940,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/xom"
    },
    {
      "symbol": "JNJ",
      "nameEn": "Johnson & Johnson Common Stock",
      "nameAr": "Johnson & Johnson Common Stock",
      "sectorEn": "Health Care",
      "sectorAr": "Health Care",
      "industryEn": "Biotechnology: Pharmaceutical Preparations",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 613102302063,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/jnj"
    },
    {
      "symbol": "CSCO",
      "nameEn": "Cisco Systems Inc. Common Stock (DE)",
      "nameAr": "Cisco Systems Inc. Common Stock (DE)",
      "sectorEn": "Telecommunications",
      "sectorAr": "Telecommunications",
      "industryEn": "Computer Communications Equipment",
      "country": "United States",
      "ipoYear": "1990",
      "marketCapSnapshot": 456654620287,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/csco"
    },
    {
      "symbol": "ABBV",
      "nameEn": "AbbVie Inc. Common Stock",
      "nameAr": "AbbVie Inc. Common Stock",
      "sectorEn": "Health Care",
      "sectorAr": "Health Care",
      "industryEn": "Biotechnology: Pharmaceutical Preparations",
      "country": "United States",
      "ipoYear": "2012",
      "marketCapSnapshot": 433040920427,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/abbv"
    },
    {
      "symbol": "ORCL",
      "nameEn": "Oracle Corporation Common Stock",
      "nameAr": "Oracle Corporation Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Software: Prepackaged Software",
      "country": "United States",
      "ipoYear": "1986",
      "marketCapSnapshot": 408594811350,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/orcl"
    },
    {
      "symbol": "CVX",
      "nameEn": "Chevron Corporation Common Stock",
      "nameAr": "Chevron Corporation Common Stock",
      "sectorEn": "Energy",
      "sectorAr": "Energy",
      "industryEn": "Integrated oil Companies",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 384736849868,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/cvx"
    },
    {
      "symbol": "GE",
      "nameEn": "GE Aerospace Common Stock",
      "nameAr": "GE Aerospace Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Consumer Electronics/Appliances",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 382787937921,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/ge"
    },
    {
      "symbol": "UNH",
      "nameEn": "UnitedHealth Group Incorporated Common Stock (DE)",
      "nameAr": "UnitedHealth Group Incorporated Common Stock (DE)",
      "sectorEn": "Health Care",
      "sectorAr": "Health Care",
      "industryEn": "Medical Specialities",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 377206859645,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/unh"
    },
    {
      "symbol": "HSBC",
      "nameEn": "HSBC Holdings plc. Common Stock",
      "nameAr": "HSBC Holdings plc. Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Savings Institutions",
      "country": "United Kingdom",
      "ipoYear": null,
      "marketCapSnapshot": 370683839156,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/hsbc"
    },
    {
      "symbol": "LRCX",
      "nameEn": "Lam Research Corporation Common Stock",
      "nameAr": "Lam Research Corporation Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Industrial Machinery/Components",
      "country": "United States",
      "ipoYear": "1984",
      "marketCapSnapshot": 368430722310,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/lrcx"
    },
    {
      "symbol": "HD",
      "nameEn": "Home Depot Inc. (The) Common Stock",
      "nameAr": "Home Depot Inc. (The) Common Stock",
      "sectorEn": "Consumer Discretionary",
      "sectorAr": "Consumer Discretionary",
      "industryEn": "RETAIL: Building Materials",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 339039614214,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/hd"
    },
    {
      "symbol": "PG",
      "nameEn": "Procter & Gamble Company (The) Common Stock",
      "nameAr": "Procter & Gamble Company (The) Common Stock",
      "sectorEn": "Consumer Discretionary",
      "sectorAr": "Consumer Discretionary",
      "industryEn": "Package Goods/Cosmetics",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 337576993841,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/pg"
    },
    {
      "symbol": "MS",
      "nameEn": "Morgan Stanley Common Stock",
      "nameAr": "Morgan Stanley Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Investment Bankers/Brokers/Service",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 333169871895,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/ms"
    },
    {
      "symbol": "MRK",
      "nameEn": "Merck & Company Inc. Common Stock (new)",
      "nameAr": "Merck & Company Inc. Common Stock (new)",
      "sectorEn": "Health Care",
      "sectorAr": "Health Care",
      "industryEn": "Biotechnology: Pharmaceutical Preparations",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 315569465505,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/mrk"
    },
    {
      "symbol": "PLTR",
      "nameEn": "Palantir Technologies Inc. Class A Common Stock",
      "nameAr": "Palantir Technologies Inc. Class A Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Software: Prepackaged Software",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 301222249910,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/pltr"
    },
    {
      "symbol": "TM",
      "nameEn": "Toyota Motor Corporation Common Stock",
      "nameAr": "Toyota Motor Corporation Common Stock",
      "sectorEn": "Industrials",
      "sectorAr": "Industrials",
      "industryEn": "Auto Manufacturing",
      "country": "Japan",
      "ipoYear": null,
      "marketCapSnapshot": 294055281543,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/tm"
    },
    {
      "symbol": "NVS",
      "nameEn": "Novartis AG Common Stock",
      "nameAr": "Novartis AG Common Stock",
      "sectorEn": "Health Care",
      "sectorAr": "Health Care",
      "industryEn": "Biotechnology: Pharmaceutical Preparations",
      "country": "Switzerland",
      "ipoYear": null,
      "marketCapSnapshot": 293225668512,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/nvs"
    },
    {
      "symbol": "RY",
      "nameEn": "Royal Bank Of Canada Common Stock",
      "nameAr": "Royal Bank Of Canada Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Commercial Banks",
      "country": "Canada",
      "ipoYear": null,
      "marketCapSnapshot": 292506425595,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/ry"
    },
    {
      "symbol": "PM",
      "nameEn": "Philip Morris International Inc Common Stock",
      "nameAr": "Philip Morris International Inc Common Stock",
      "sectorEn": "Health Care",
      "sectorAr": "Health Care",
      "industryEn": " Medicinal Chemicals and Botanical Products ",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 292099744603,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/pm"
    },
    {
      "symbol": "RTX",
      "nameEn": "RTX Corporation Common Stock",
      "nameAr": "RTX Corporation Common Stock",
      "sectorEn": "Industrials",
      "sectorAr": "Industrials",
      "industryEn": "Aerospace",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 291991801898,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/rtx"
    },
    {
      "symbol": "PANW",
      "nameEn": "Palo Alto Networks Inc. Common Stock",
      "nameAr": "Palo Alto Networks Inc. Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer peripheral equipment",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 28291095e4,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/panw"
    },
    {
      "symbol": "DELL",
      "nameEn": "Dell Technologies Inc. Class C Common Stock ",
      "nameAr": "Dell Technologies Inc. Class C Common Stock ",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Manufacturing",
      "country": "United States",
      "ipoYear": "2018",
      "marketCapSnapshot": 278051290299,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/dell"
    },
    {
      "symbol": "TXN",
      "nameEn": "Texas Instruments Incorporated Common Stock",
      "nameAr": "Texas Instruments Incorporated Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Semiconductors",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 245700157441,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/txn"
    },
    {
      "symbol": "AZN",
      "nameEn": "AstraZeneca PLC Ordinary Shares",
      "nameAr": "AstraZeneca PLC Ordinary Shares",
      "sectorEn": "Health Care",
      "sectorAr": "Health Care",
      "industryEn": "Biotechnology: Pharmaceutical Preparations",
      "country": "United Kingdom",
      "ipoYear": "2026",
      "marketCapSnapshot": 244968165526,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/azn"
    },
    {
      "symbol": "KLAC",
      "nameEn": "KLA Corporation Common Stock",
      "nameAr": "KLA Corporation Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Electronic Components",
      "country": "United States",
      "ipoYear": "1980",
      "marketCapSnapshot": 238721794628,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/klac"
    },
    {
      "symbol": "SAP",
      "nameEn": "SAP  SE ADS",
      "nameAr": "SAP  SE ADS",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Software: Prepackaged Software",
      "country": "Germany",
      "ipoYear": null,
      "marketCapSnapshot": 232985827599,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/sap"
    },
    {
      "symbol": "ANET",
      "nameEn": "Arista Networks Inc. Common Stock",
      "nameAr": "Arista Networks Inc. Common Stock",
      "sectorEn": "Telecommunications",
      "sectorAr": "Telecommunications",
      "industryEn": "Computer Communications Equipment",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 232813967420,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/anet"
    },
    {
      "symbol": "AXP",
      "nameEn": "American Express Company Common Stock",
      "nameAr": "American Express Company Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Finance: Consumer Services",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 232792805632,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/axp"
    },
    {
      "symbol": "C",
      "nameEn": "Citigroup Inc. Common Stock",
      "nameAr": "Citigroup Inc. Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Major Banks",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 227813913879,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/c"
    },
    {
      "symbol": "LIN",
      "nameEn": "Linde plc Ordinary Shares",
      "nameAr": "Linde plc Ordinary Shares",
      "sectorEn": "Basic Materials",
      "sectorAr": "Basic Materials",
      "industryEn": "Major Chemicals",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 222260574508,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/lin"
    },
    {
      "symbol": "IBM",
      "nameEn": "International Business Machines Corporation Common Stock",
      "nameAr": "International Business Machines Corporation Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Manufacturing",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 213214433801,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/ibm"
    },
    {
      "symbol": "CRWD",
      "nameEn": "CrowdStrike Holdings Inc. Class A Common Stock",
      "nameAr": "CrowdStrike Holdings Inc. Class A Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Software: Prepackaged Software",
      "country": "United States",
      "ipoYear": "2019",
      "marketCapSnapshot": 206238234571,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/crwd"
    },
    {
      "symbol": "AMGN",
      "nameEn": "Amgen Inc. Common Stock",
      "nameAr": "Amgen Inc. Common Stock",
      "sectorEn": "Health Care",
      "sectorAr": "Health Care",
      "industryEn": "Biotechnology: Biological Products (No Diagnostic Substances)",
      "country": "United States",
      "ipoYear": "1983",
      "marketCapSnapshot": 204479273770,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/amgn"
    },
    {
      "symbol": "APH",
      "nameEn": "Amphenol Corporation Common Stock",
      "nameAr": "Amphenol Corporation Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Electrical Products",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 200946494246,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/aph"
    },
    {
      "symbol": "TD",
      "nameEn": "Toronto Dominion Bank (The) Common Stock",
      "nameAr": "Toronto Dominion Bank (The) Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Commercial Banks",
      "country": "Canada",
      "ipoYear": null,
      "marketCapSnapshot": 200190683e3,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/td"
    },
    {
      "symbol": "PEP",
      "nameEn": "PepsiCo Inc. Common Stock",
      "nameAr": "PepsiCo Inc. Common Stock",
      "sectorEn": "Consumer Staples",
      "sectorAr": "Consumer Staples",
      "industryEn": "Beverages (Production/Distribution)",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 190579808244,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/pep"
    },
    {
      "symbol": "TMUS",
      "nameEn": "T-Mobile US Inc. Common Stock",
      "nameAr": "T-Mobile US Inc. Common Stock",
      "sectorEn": "Telecommunications",
      "sectorAr": "Telecommunications",
      "industryEn": "Telecommunications Equipment",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 189959415946,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/tmus"
    },
    {
      "symbol": "MCD",
      "nameEn": "McDonald's Corporation Common Stock",
      "nameAr": "McDonald's Corporation Common Stock",
      "sectorEn": "Consumer Discretionary",
      "sectorAr": "Consumer Discretionary",
      "industryEn": "Restaurants",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 188447468983,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/mcd"
    },
    {
      "symbol": "ABT",
      "nameEn": "Abbott Laboratories Common Stock",
      "nameAr": "Abbott Laboratories Common Stock",
      "sectorEn": "Health Care",
      "sectorAr": "Health Care",
      "industryEn": "Biotechnology: Pharmaceutical Preparations",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 185358658668,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/abt"
    },
    {
      "symbol": "BA",
      "nameEn": "Boeing Company (The) Common Stock",
      "nameAr": "Boeing Company (The) Common Stock",
      "sectorEn": "Industrials",
      "sectorAr": "Industrials",
      "industryEn": "Aerospace",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 184543495970,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/ba"
    },
    {
      "symbol": "SCHW",
      "nameEn": "Charles Schwab Corporation (The) Common Stock",
      "nameAr": "Charles Schwab Corporation (The) Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Investment Bankers/Brokers/Service",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 184122276126,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/schw"
    },
    {
      "symbol": "ADI",
      "nameEn": "Analog Devices Inc. Common Stock",
      "nameAr": "Analog Devices Inc. Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Semiconductors",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 176267058035,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/adi"
    },
    {
      "symbol": "TJX",
      "nameEn": "TJX Companies Inc. (The) Common Stock",
      "nameAr": "TJX Companies Inc. (The) Common Stock",
      "sectorEn": "Consumer Discretionary",
      "sectorAr": "Consumer Discretionary",
      "industryEn": "Clothing/Shoe/Accessory Stores",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 173990950245,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/tjx"
    },
    {
      "symbol": "UNP",
      "nameEn": "Union Pacific Corporation Common Stock",
      "nameAr": "Union Pacific Corporation Common Stock",
      "sectorEn": "Industrials",
      "sectorAr": "Industrials",
      "industryEn": "Railroads",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 173012607283,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/unp"
    },
    {
      "symbol": "ETN",
      "nameEn": "Eaton Corporation PLC Ordinary Shares",
      "nameAr": "Eaton Corporation PLC Ordinary Shares",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Industrial Machinery/Components",
      "country": "Ireland",
      "ipoYear": null,
      "marketCapSnapshot": 170164709e3,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/etn"
    },
    {
      "symbol": "MRVL",
      "nameEn": "Marvell Technology Inc. Common Stock",
      "nameAr": "Marvell Technology Inc. Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Semiconductors",
      "country": "United States",
      "ipoYear": "2000",
      "marketCapSnapshot": 169701638617,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/mrvl"
    },
    {
      "symbol": "WELL",
      "nameEn": "Welltower Inc. Common Stock",
      "nameAr": "Welltower Inc. Common Stock",
      "sectorEn": "Real Estate",
      "sectorAr": "Real Estate",
      "industryEn": "Real Estate Investment Trusts",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 168005648078,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/well"
    },
    {
      "symbol": "GILD",
      "nameEn": "Gilead Sciences Inc. Common Stock",
      "nameAr": "Gilead Sciences Inc. Common Stock",
      "sectorEn": "Health Care",
      "sectorAr": "Health Care",
      "industryEn": "Biotechnology: Biological Products (No Diagnostic Substances)",
      "country": "United States",
      "ipoYear": "1992",
      "marketCapSnapshot": 162831888975,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/gild"
    },
    {
      "symbol": "QCOM",
      "nameEn": "QUALCOMM Incorporated Common Stock",
      "nameAr": "QUALCOMM Incorporated Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Radio And Television Broadcasting And Communications Equipment",
      "country": "United States",
      "ipoYear": "1991",
      "marketCapSnapshot": 1591485e5,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/qcom"
    },
    {
      "symbol": "SCCO",
      "nameEn": "Southern Copper Corporation Common Stock",
      "nameAr": "Southern Copper Corporation Common Stock",
      "sectorEn": "Basic Materials",
      "sectorAr": "Basic Materials",
      "industryEn": "Metal Mining",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 155110012550,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/scco"
    },
    {
      "symbol": "CRM",
      "nameEn": "Salesforce Inc. Common Stock",
      "nameAr": "Salesforce Inc. Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Software: Prepackaged Software",
      "country": "United States",
      "ipoYear": "2004",
      "marketCapSnapshot": 15229305e4,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/crm"
    },
    {
      "symbol": "SHOP",
      "nameEn": "Shopify Inc. Class A Subordinate Voting Shares",
      "nameAr": "Shopify Inc. Class A Subordinate Voting Shares",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Software: Prepackaged Software",
      "country": "Canada",
      "ipoYear": null,
      "marketCapSnapshot": 151622848035,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/shop"
    },
    {
      "symbol": "BKNG",
      "nameEn": "Booking Holdings Inc. Common Stock",
      "nameAr": "Booking Holdings Inc. Common Stock",
      "sectorEn": "Consumer Discretionary",
      "sectorAr": "Consumer Discretionary",
      "industryEn": "Transportation Services",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 149326823402,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/bkng"
    },
    {
      "symbol": "COP",
      "nameEn": "ConocoPhillips Common Stock",
      "nameAr": "ConocoPhillips Common Stock",
      "sectorEn": "Energy",
      "sectorAr": "Energy",
      "industryEn": "Integrated oil Companies",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 145171913874,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/cop"
    },
    {
      "symbol": "DHR",
      "nameEn": "Danaher Corporation Common Stock",
      "nameAr": "Danaher Corporation Common Stock",
      "sectorEn": "Industrials",
      "sectorAr": "Industrials",
      "industryEn": "Industrial Machinery/Components",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 138839745665,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/dhr"
    },
    {
      "symbol": "APP",
      "nameEn": "Applovin Corporation Class A Common Stock",
      "nameAr": "Applovin Corporation Class A Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Software: Programming Data Processing",
      "country": "United States",
      "ipoYear": "2021",
      "marketCapSnapshot": 136445390400,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/app"
    },
    {
      "symbol": "PLD",
      "nameEn": "Prologis Inc. Common Stock",
      "nameAr": "Prologis Inc. Common Stock",
      "sectorEn": "Real Estate",
      "sectorAr": "Real Estate",
      "industryEn": "Real Estate Investment Trusts",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 134502905400,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/pld"
    },
    {
      "symbol": "CVS",
      "nameEn": "CVS Health Corporation Common Stock",
      "nameAr": "CVS Health Corporation Common Stock",
      "sectorEn": "Consumer Staples",
      "sectorAr": "Consumer Staples",
      "industryEn": "Retail-Drug Stores and Proprietary Stores",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 134444460339,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/cvs"
    },
    {
      "symbol": "CB",
      "nameEn": "Chubb Limited  Common Stock",
      "nameAr": "Chubb Limited  Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Property-Casualty Insurers",
      "country": "Switzerland",
      "ipoYear": null,
      "marketCapSnapshot": 134347084900,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/cb"
    },
    {
      "symbol": "COF",
      "nameEn": "Capital One Financial Corporation Common Stock",
      "nameAr": "Capital One Financial Corporation Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Major Banks",
      "country": "United States",
      "ipoYear": "1994",
      "marketCapSnapshot": 133543379100,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/cof"
    },
    {
      "symbol": "ISRG",
      "nameEn": "Intuitive Surgical Inc. Common Stock",
      "nameAr": "Intuitive Surgical Inc. Common Stock",
      "sectorEn": "Health Care",
      "sectorAr": "Health Care",
      "industryEn": "Industrial Specialties",
      "country": "United States",
      "ipoYear": "2000",
      "marketCapSnapshot": 132624108246,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/isrg"
    },
    {
      "symbol": "SYK",
      "nameEn": "Stryker Corporation Common Stock",
      "nameAr": "Stryker Corporation Common Stock",
      "sectorEn": "Health Care",
      "sectorAr": "Health Care",
      "industryEn": "Medical/Dental Instruments",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 130802691994,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/syk"
    },
    {
      "symbol": "BMO",
      "nameEn": "Bank Of Montreal Common Stock",
      "nameAr": "Bank Of Montreal Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Commercial Banks",
      "country": "Canada",
      "ipoYear": null,
      "marketCapSnapshot": 126688206764,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/bmo"
    },
    {
      "symbol": "GLW",
      "nameEn": "Corning Incorporated Common Stock",
      "nameAr": "Corning Incorporated Common Stock",
      "sectorEn": "Industrials",
      "sectorAr": "Industrials",
      "industryEn": "Telecommunications Equipment",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 126313984858,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/glw"
    },
    {
      "symbol": "PGR",
      "nameEn": "Progressive Corporation (The) Common Stock",
      "nameAr": "Progressive Corporation (The) Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Property-Casualty Insurers",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 122979452213,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/pgr"
    },
    {
      "symbol": "SPGI",
      "nameEn": "S&P Global Inc. Common Stock",
      "nameAr": "S&P Global Inc. Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Finance: Consumer Services",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 1227105e5,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/spgi"
    },
    {
      "symbol": "FTNT",
      "nameEn": "Fortinet Inc. Common Stock",
      "nameAr": "Fortinet Inc. Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer peripheral equipment",
      "country": "United States",
      "ipoYear": "2009",
      "marketCapSnapshot": 119749405306,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/ftnt"
    },
    {
      "symbol": "VRTX",
      "nameEn": "Vertex Pharmaceuticals Incorporated Common Stock",
      "nameAr": "Vertex Pharmaceuticals Incorporated Common Stock",
      "sectorEn": "Health Care",
      "sectorAr": "Health Care",
      "industryEn": "Biotechnology: Pharmaceutical Preparations",
      "country": "United States",
      "ipoYear": "1991",
      "marketCapSnapshot": 119471285890,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/vrtx"
    },
    {
      "symbol": "LOW",
      "nameEn": "Lowe's Companies Inc. Common Stock",
      "nameAr": "Lowe's Companies Inc. Common Stock",
      "sectorEn": "Consumer Discretionary",
      "sectorAr": "Consumer Discretionary",
      "industryEn": "RETAIL: Building Materials",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 118903535114,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/low"
    },
    {
      "symbol": "NOW",
      "nameEn": "ServiceNow Inc. Common Stock",
      "nameAr": "ServiceNow Inc. Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Software: Prepackaged Software",
      "country": "United States",
      "ipoYear": "2012",
      "marketCapSnapshot": 11807246e4,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/now"
    },
    {
      "symbol": "SBUX",
      "nameEn": "Starbucks Corporation Common Stock",
      "nameAr": "Starbucks Corporation Common Stock",
      "sectorEn": "Consumer Discretionary",
      "sectorAr": "Consumer Discretionary",
      "industryEn": "Restaurants",
      "country": "United States",
      "ipoYear": "1992",
      "marketCapSnapshot": 1178418e5,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/sbux"
    },
    {
      "symbol": "HWM",
      "nameEn": "Howmet Aerospace Inc. Common Stock",
      "nameAr": "Howmet Aerospace Inc. Common Stock",
      "sectorEn": "Industrials",
      "sectorAr": "Industrials",
      "industryEn": "Metal Fabrications",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 114566776682,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/hwm"
    },
    {
      "symbol": "ACN",
      "nameEn": "Accenture plc Class A Ordinary Shares (Ireland)",
      "nameAr": "Accenture plc Class A Ordinary Shares (Ireland)",
      "sectorEn": "Consumer Discretionary",
      "sectorAr": "Consumer Discretionary",
      "industryEn": "Business Services",
      "country": "Ireland",
      "ipoYear": "2001",
      "marketCapSnapshot": 110646492410,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/acn"
    },
    {
      "symbol": "CM",
      "nameEn": "Canadian Imperial Bank of Commerce Common Stock",
      "nameAr": "Canadian Imperial Bank of Commerce Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Commercial Banks",
      "country": "Canada",
      "ipoYear": null,
      "marketCapSnapshot": 109109088259,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/cm"
    },
    {
      "symbol": "ADP",
      "nameEn": "Automatic Data Processing Inc. Common Stock",
      "nameAr": "Automatic Data Processing Inc. Common Stock",
      "sectorEn": "Industrials",
      "sectorAr": "Industrials",
      "industryEn": "Diversified Commercial Services",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 108625396520,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/adp"
    },
    {
      "symbol": "BNY",
      "nameEn": "The Bank of New York Mellon Corporation Common Stock",
      "nameAr": "The Bank of New York Mellon Corporation Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Major Banks",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 107212406829,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/bny"
    },
    {
      "symbol": "SNOW",
      "nameEn": "Snowflake Inc. Common Stock",
      "nameAr": "Snowflake Inc. Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Software: Prepackaged Software",
      "country": "United States",
      "ipoYear": "2020",
      "marketCapSnapshot": 106589898e3,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/snow"
    },
    {
      "symbol": "GD",
      "nameEn": "General Dynamics Corporation Common Stock",
      "nameAr": "General Dynamics Corporation Common Stock",
      "sectorEn": "Industrials",
      "sectorAr": "Industrials",
      "industryEn": "Marine Transportation",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 103469188084,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/gd"
    },
    {
      "symbol": "TT",
      "nameEn": "Trane Technologies plc",
      "nameAr": "Trane Technologies plc",
      "sectorEn": "Industrials",
      "sectorAr": "Industrials",
      "industryEn": "Auto Parts:O.E.M.",
      "country": "Ireland",
      "ipoYear": null,
      "marketCapSnapshot": 101476889464,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/tt"
    },
    {
      "symbol": "VRT",
      "nameEn": "Vertiv Holdings LLC Class A Common Stock",
      "nameAr": "Vertiv Holdings LLC Class A Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Industrial Machinery/Components",
      "country": "United States",
      "ipoYear": "2018",
      "marketCapSnapshot": 101271138908,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/vrt"
    },
    {
      "symbol": "PNC",
      "nameEn": "PNC Financial Services Group Inc. (The) Common Stock",
      "nameAr": "PNC Financial Services Group Inc. (The) Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Major Banks",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 101081849167,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/pnc"
    },
    {
      "symbol": "SPOT",
      "nameEn": "Spotify Technology S.A. Ordinary Shares",
      "nameAr": "Spotify Technology S.A. Ordinary Shares",
      "sectorEn": "Consumer Discretionary",
      "sectorAr": "Consumer Discretionary",
      "industryEn": "Broadcasting",
      "country": "Luxembourg",
      "ipoYear": "2018",
      "marketCapSnapshot": 100102532856,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/spot"
    },
    {
      "symbol": "BX",
      "nameEn": "Blackstone Inc. Common Stock",
      "nameAr": "Blackstone Inc. Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Investment Managers",
      "country": "United States",
      "ipoYear": "2007",
      "marketCapSnapshot": 100051052407,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/bx"
    },
    {
      "symbol": "NET",
      "nameEn": "Cloudflare Inc. Class A Common Stock",
      "nameAr": "Cloudflare Inc. Class A Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Software: Prepackaged Software",
      "country": "United States",
      "ipoYear": "2019",
      "marketCapSnapshot": 99939054876,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/net"
    },
    {
      "symbol": "ADBE",
      "nameEn": "Adobe Inc. Common Stock",
      "nameAr": "Adobe Inc. Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Software: Prepackaged Software",
      "country": "United States",
      "ipoYear": "1986",
      "marketCapSnapshot": 9990765e4,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/adbe"
    },
    {
      "symbol": "CEG",
      "nameEn": "Constellation Energy Corporation Common Stock ",
      "nameAr": "Constellation Energy Corporation Common Stock ",
      "sectorEn": "Utilities",
      "sectorAr": "Utilities",
      "industryEn": "Electric Utilities: Central",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 98861332144,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/ceg"
    },
    {
      "symbol": "DDOG",
      "nameEn": "Datadog Inc. Class A Common Stock",
      "nameAr": "Datadog Inc. Class A Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Software: Prepackaged Software",
      "country": "United States",
      "ipoYear": "2019",
      "marketCapSnapshot": 97390707710,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/ddog"
    },
    {
      "symbol": "DUK",
      "nameEn": "Duke Energy Corporation (Holding Company) Common Stock",
      "nameAr": "Duke Energy Corporation (Holding Company) Common Stock",
      "sectorEn": "Utilities",
      "sectorAr": "Utilities",
      "industryEn": "Power Generation",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 96888217849,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/duk"
    },
    {
      "symbol": "CME",
      "nameEn": "CME Group Inc. Class A Common Stock",
      "nameAr": "CME Group Inc. Class A Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Investment Bankers/Brokers/Service",
      "country": "United States",
      "ipoYear": "2002",
      "marketCapSnapshot": 95709212433,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/cme"
    },
    {
      "symbol": "KKR",
      "nameEn": "KKR & Co. Inc. Common Stock",
      "nameAr": "KKR & Co. Inc. Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Investment Managers",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 95677340593,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/kkr"
    },
    {
      "symbol": "RACE",
      "nameEn": "Ferrari N.V. Common Shares",
      "nameAr": "Ferrari N.V. Common Shares",
      "sectorEn": "Industrials",
      "sectorAr": "Industrials",
      "industryEn": "Auto Manufacturing",
      "country": "Italy",
      "ipoYear": "2015",
      "marketCapSnapshot": 93877262604,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/race"
    },
    {
      "symbol": "CDNS",
      "nameEn": "Cadence Design Systems Inc. Common Stock",
      "nameAr": "Cadence Design Systems Inc. Common Stock",
      "sectorEn": "Technology",
      "sectorAr": "Technology",
      "industryEn": "Computer Software: Prepackaged Software",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 92573356950,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/cdns"
    },
    {
      "symbol": "MRSH",
      "nameEn": "Marsh Common Stock",
      "nameAr": "Marsh Common Stock",
      "sectorEn": "Finance",
      "sectorAr": "Finance",
      "industryEn": "Specialty Insurers",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 92025420921,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/mrsh"
    },
    {
      "symbol": "MAR",
      "nameEn": "Marriott International Class A Common Stock",
      "nameAr": "Marriott International Class A Common Stock",
      "sectorEn": "Consumer Discretionary",
      "sectorAr": "Consumer Discretionary",
      "industryEn": "Hotels/Resorts",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 91455125115,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/mar"
    },
    {
      "symbol": "MMM",
      "nameEn": "3M Company Common Stock",
      "nameAr": "3M Company Common Stock",
      "sectorEn": "Health Care",
      "sectorAr": "Health Care",
      "industryEn": "Medical/Dental Instruments",
      "country": "United States",
      "ipoYear": null,
      "marketCapSnapshot": 91401483965,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/mmm"
    },
    {
      "symbol": "UPS",
      "nameEn": "United Parcel Service Inc. Common Stock",
      "nameAr": "United Parcel Service Inc. Common Stock",
      "sectorEn": "Industrials",
      "sectorAr": "Industrials",
      "industryEn": "Trucking Freight/Courier Services",
      "country": "United States",
      "ipoYear": "1999",
      "marketCapSnapshot": 90840171037,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/ups"
    },
    {
      "symbol": "ABNB",
      "nameEn": "Airbnb Inc. Class A Common Stock",
      "nameAr": "Airbnb Inc. Class A Common Stock",
      "sectorEn": "Consumer Discretionary",
      "sectorAr": "Consumer Discretionary",
      "industryEn": "Diversified Commercial Services",
      "country": "United States",
      "ipoYear": "2020",
      "marketCapSnapshot": 90791469601,
      "nasdaqUrl": "https://www.nasdaq.com/market-activity/stocks/abnb"
    }
  ]
};
var US_OPTIONS_CATALOG = {
  ...RAW_US_OPTIONS_CATALOG,
  companies: RAW_US_OPTIONS_CATALOG.companies.map((company) => ({
    ...company,
    nameAr: COMPANY_NAMES_AR[company.symbol],
    sectorEn: SECTOR_LABELS[company.sectorEn]?.en || company.sectorEn,
    sectorAr: SECTOR_LABELS[company.sectorEn]?.ar || company.sectorEn
  }))
};
var US_OPTIONS_SYMBOLS = new Set(US_OPTIONS_CATALOG.companies.map((company) => company.symbol));

// base44/shared/us-options-timing.ts
var US_OPTIONS_DELAY_SECONDS = 900;
var US_OPTIONS_BAR_INTERVAL_MS = 15 * 60 * 1e3;
function newYorkClock(value) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false
  }).formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: parts.weekday
  };
}
function delayedCutoffMs(now) {
  return now.getTime() - US_OPTIONS_DELAY_SECONDS * 1e3;
}
function isCompletedDelayedBar(barStart, now, barIntervalMs = US_OPTIONS_BAR_INTERVAL_MS) {
  return barStart.getTime() + barIntervalMs <= delayedCutoffMs(now);
}
function tradingWeekKey(date) {
  const value = /* @__PURE__ */ new Date(`${date}T00:00:00.000Z`);
  const weekday = value.getUTCDay();
  const daysFromMonday = (weekday + 6) % 7;
  value.setUTCDate(value.getUTCDate() - daysFromMonday);
  return value.toISOString().slice(0, 10);
}
function alertIntervalDue(interval, providerAsOf, isFinal, { nextTradingDate = "" } = {}) {
  const clock = newYorkClock(new Date(providerAsOf));
  const sessionMinute = clock.hour * 60 + clock.minute;
  const elapsed = sessionMinute - 570;
  if (interval === "15m") return elapsed >= 15 && elapsed % 15 === 0;
  const duration = { "1h": 60, "2h": 120, "3h": 180, "4h": 240 }[interval];
  if (duration) return elapsed >= duration && (elapsed % duration === 0 || isFinal);
  if (interval === "1d") return isFinal;
  if (interval === "1wk") return isFinal && Boolean(nextTradingDate) && tradingWeekKey(nextTradingDate) !== tradingWeekKey(clock.date);
  if (interval === "1mo") return isFinal && Boolean(nextTradingDate) && nextTradingDate.slice(0, 7) !== clock.date.slice(0, 7);
  return false;
}

// base44/shared/incremental-candle-sync.ts
var FIFTEEN_MINUTES_MS = 15 * 60 * 1e3;
var DEFAULT_MAX_INCREMENTAL_AGE_MS = 8 * 24 * 60 * 60 * 1e3;
function candleTime(value) {
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp) ? timestamp : null;
}
function validStoredBars(chunk) {
  if (!chunk || chunk.quality_status === "quarantined" || !Array.isArray(chunk.bars)) return [];
  return chunk.bars.filter((bar) => candleTime(bar?.time) !== null);
}
function latestStoredCandleByInstrument(chunks) {
  const result = /* @__PURE__ */ new Map();
  for (const chunk of Array.isArray(chunks) ? chunks : []) {
    for (const bar of validStoredBars(chunk)) {
      const timestamp = candleTime(bar.time);
      const current = result.get(chunk.instrument_id);
      if (!current || timestamp > current.timestamp) result.set(chunk.instrument_id, { timestamp, time: bar.time });
    }
  }
  return result;
}
function earliestRecentGapByInstrument(chunks, now = /* @__PURE__ */ new Date(), options = {}) {
  const intervalMs = Math.max(1, Number(options.barIntervalMs) || FIFTEEN_MINUTES_MS);
  const lookbackMs = Math.max(intervalMs, Number(options.lookbackMs) || 2 * 24 * 60 * 60 * 1e3);
  const nowMs = now instanceof Date ? now.getTime() : candleTime(now);
  if (!Number.isFinite(nowMs)) return /* @__PURE__ */ new Map();
  const cutoff = nowMs - lookbackMs;
  const result = /* @__PURE__ */ new Map();
  for (const chunk of Array.isArray(chunks) ? chunks : []) {
    const bars = validStoredBars(chunk).sort((left, right) => candleTime(left.time) - candleTime(right.time));
    for (let index = 1; index < bars.length; index += 1) {
      const previous = candleTime(bars[index - 1].time);
      const current = candleTime(bars[index].time);
      const missingTime = previous + intervalMs;
      if (current - previous <= intervalMs + 1e3 || missingTime < cutoff) continue;
      const found = result.get(chunk.instrument_id);
      if (!found || missingTime < found.timestamp) result.set(chunk.instrument_id, { timestamp: missingTime, time: new Date(missingTime).toISOString() });
    }
  }
  return result;
}
function incrementalProviderWindow(lastStoredTime, now = /* @__PURE__ */ new Date(), options = {}) {
  const overlapBars = Math.max(1, Number(options.overlapBars) || 2);
  const barIntervalMs = Math.max(1, Number(options.barIntervalMs) || FIFTEEN_MINUTES_MS);
  const bootstrapRange = String(options.bootstrapRange || "5d");
  const maxIncrementalAgeMs = Math.max(barIntervalMs, Number(options.maxIncrementalAgeMs) || DEFAULT_MAX_INCREMENTAL_AGE_MS);
  const cursor = candleTime(lastStoredTime);
  const candidateNowMs = now instanceof Date ? now.getTime() : candleTime(now);
  const nowMs = Number.isFinite(candidateNowMs) ? candidateNowMs : null;
  if (cursor === null || nowMs === null || cursor > nowMs + barIntervalMs) {
    return { mode: "bootstrap", range: bootstrapRange, cursor_time: null };
  }
  const ageMs = Math.max(0, nowMs - cursor);
  if (ageMs > maxIncrementalAgeMs) {
    return { mode: "gap_recovery", range: bootstrapRange, cursor_time: new Date(cursor).toISOString(), age_ms: ageMs };
  }
  const period1Ms = Math.max(0, cursor - (overlapBars - 1) * barIntervalMs);
  return {
    mode: "incremental",
    period1: Math.floor(period1Ms / 1e3),
    period2: Math.ceil((nowMs + barIntervalMs) / 1e3),
    cursor_time: new Date(cursor).toISOString(),
    overlap_bars: overlapBars
  };
}
function mergeCandleBars(existingBars, incomingBars) {
  const byTime = /* @__PURE__ */ new Map();
  for (const bar of [...Array.isArray(existingBars) ? existingBars : [], ...Array.isArray(incomingBars) ? incomingBars : []]) {
    const timestamp = candleTime(bar?.time);
    if (timestamp === null) continue;
    byTime.set(timestamp, { ...bar, time: new Date(timestamp).toISOString() });
  }
  return [...byTime.entries()].sort(([left], [right]) => left - right).map(([, bar]) => bar);
}
function indexCandleChunks(chunks) {
  return new Map((Array.isArray(chunks) ? chunks : []).map((chunk) => [String(chunk.chunk_key || ""), chunk]));
}
function summarizeProviderWindows(windows) {
  const summary = { incremental: 0, bootstrap: 0, gap_recovery: 0, archive: 0 };
  for (const window of windows instanceof Map ? windows.values() : []) {
    const mode = String(window?.mode || "bootstrap");
    if (Object.hasOwn(summary, mode)) summary[mode] += 1;
  }
  return summary;
}

// base44/functions/usOptionsMarketIngestion/source.ts
var PROVIDER_CODE = "REFERENCE_YAHOO_US_OPTIONS_T15";
var DELAY_SECONDS = US_OPTIONS_DELAY_SECONDS;
var FRESHNESS_GRACE_SECONDS = 7 * 60;
var PROVIDER_BAR_INTERVAL_MS = 5 * 60 * 1e3;
var CONCURRENCY = 22;
var HOLIDAYS_2026 = /* @__PURE__ */ new Map([
  ["2026-01-01", "New Year's Day"],
  ["2026-01-19", "Martin Luther King Jr. Day"],
  ["2026-02-16", "Washington's Birthday"],
  ["2026-04-03", "Good Friday"],
  ["2026-05-25", "Memorial Day"],
  ["2026-06-19", "Juneteenth"],
  ["2026-07-03", "Independence Day observed"],
  ["2026-09-07", "Labor Day"],
  ["2026-11-26", "Thanksgiving Day"],
  ["2026-12-25", "Christmas Day"]
]);
var EARLY_CLOSE_2026 = /* @__PURE__ */ new Set(["2026-11-27", "2026-12-24"]);
function rows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}
async function readRowsWithRetry(read) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return rows(await read());
    } catch (error) {
      lastError = error;
      const status = Number(error?.status || error?.response?.status || 0);
      const message = String(error?.message || "").toLowerCase();
      if (attempt >= 3 || status !== 429 && !message.includes("rate limit")) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}
function nyClock(value = /* @__PURE__ */ new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short"
  }).formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: parts.weekday
  };
}
function validNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
function validVolume(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}
function expectedSessionBars(sessionDate) {
  return EARLY_CLOSE_2026.has(sessionDate) ? 14 : 26;
}
function quoteFromBars(bars, previousClose, marketCap = 0) {
  const first = bars[0];
  const last = bars.at(-1);
  const changeValue = last.close - previousClose;
  return {
    last_price: last.close,
    previous_close: previousClose,
    change_value: changeValue,
    change_percent: changeValue / previousClose * 100,
    open: first.open,
    high: Math.max(...bars.map((bar) => bar.high)),
    low: Math.min(...bars.map((bar) => bar.low)),
    volume: bars.reduce((sum, bar) => sum + validVolume(bar.volume), 0),
    market_cap: validVolume(marketCap)
  };
}
function checksum(value) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value))).then((digest) => Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join(""));
}
function keyFor(row, fields) {
  return fields.map((field) => String(row[field] ?? "")).join("|");
}
function minuteFromClock(value, fallback) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ""));
  if (!match) return fallback;
  const minute = Number(match[1]) * 60 + Number(match[2]);
  return Number.isFinite(minute) ? minute : fallback;
}
async function sessionDecision(base44, clock) {
  const sessions = rows(await base44.asServiceRole.entities.MarketSession.filter({ market_code: US_OPTIONS_MARKET_CODE, session_date: clock.date }));
  if (sessions[0]) return {
    tradingDay: sessions[0].is_trading_day === true,
    closeMinute: minuteFromClock(sessions[0].closes_at, 960),
    reason: sessions[0].reason || "market_session_calendar"
  };
  const holidays = rows(await base44.asServiceRole.entities.MarketHoliday.filter({ market_code: US_OPTIONS_MARKET_CODE, holiday_date: clock.date }));
  if (holidays.length) return { tradingDay: false, closeMinute: 960, reason: "market_holiday_calendar" };
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(clock.weekday);
  if (!weekday || HOLIDAYS_2026.has(clock.date)) return { tradingDay: false, closeMinute: 960, reason: weekday ? "official_market_holiday" : "weekend" };
  return { tradingDay: true, closeMinute: EARLY_CLOSE_2026.has(clock.date) ? 780 : 960, reason: "official_2026_fallback" };
}
async function nextTradingSessionDate(base44, sessionDate) {
  const cursor = /* @__PURE__ */ new Date(`${sessionDate}T12:00:00.000Z`);
  for (let offset = 1; offset <= 10; offset += 1) {
    const candidate = new Date(cursor);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    const clock = nyClock(candidate);
    if ((await sessionDecision(base44, clock)).tradingDay) return clock.date;
  }
  throw Object.assign(new Error("Unable to resolve the next U.S. trading session"), { status: 503, code: "US_OPTIONS_CALENDAR_INCOMPLETE" });
}
async function upsertMany(base44, entity, incoming, fields, existingFilter = null) {
  const unique = [...new Map(incoming.map((row) => [keyFor(row, fields), row])).values()];
  const existing = rows(existingFilter ? await base44.asServiceRole.entities[entity].filter(existingFilter, "-updated_date", 5e3) : await base44.asServiceRole.entities[entity].list("-updated_date", 5e3));
  const byKey = new Map(existing.map((row) => [keyFor(row, fields), row]));
  const creates = unique.filter((row) => !byKey.has(keyFor(row, fields)));
  const updates = unique.filter((row) => byKey.has(keyFor(row, fields))).map((row) => ({ id: byKey.get(keyFor(row, fields)).id, ...row }));
  if (creates.length) await base44.asServiceRole.entities[entity].bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities[entity].bulkUpdate([...new Map(updates.map((row) => [row.id, row])).values()]);
  return { created: creates.length, updated: updates.length };
}
function instrumentRow(company) {
  return {
    symbol: company.symbol,
    market_code: US_OPTIONS_MARKET_CODE,
    instrument_code: company.symbol,
    instrument_type: "equity",
    composite_key: `${US_OPTIONS_MARKET_CODE}:${company.symbol}`,
    name_ar: company.nameAr,
    name_en: company.nameEn,
    sector_ar: company.sectorAr,
    sector_en: company.sectorEn,
    industry_en: company.industryEn,
    market: US_OPTIONS_CATALOG.market.name_en,
    currency: "USD",
    exchange_code: "US",
    country_code: "US",
    issuer_country: company.country,
    ipo_year: company.ipoYear,
    optionable: true,
    catalog_as_of: US_OPTIONS_CATALOG.source.asOf,
    status: "active",
    official_url: company.nasdaqUrl
  };
}
async function ensureCatalog(base44, now) {
  const marketRows = await base44.asServiceRole.entities.Market.filter({ market_code: US_OPTIONS_MARKET_CODE });
  if (marketRows[0]) await base44.asServiceRole.entities.Market.update(marketRows[0].id, US_OPTIONS_CATALOG.market);
  else await base44.asServiceRole.entities.Market.create(US_OPTIONS_CATALOG.market);
  const sourceRows = await base44.asServiceRole.entities.DataSource.filter({ code: PROVIDER_CODE });
  const sourceData = {
    name: "U.S. optionable equities delayed chart adapter",
    market_code: US_OPTIONS_MARKET_CODE,
    source_type: "reference",
    quote_mode: "delayed",
    delay_seconds: DELAY_SECONDS,
    license_status: "restricted",
    public_enabled: false,
    base_url: "https://query1.finance.yahoo.com",
    last_verified_at: now.toISOString()
  };
  const source = sourceRows[0] ? await base44.asServiceRole.entities.DataSource.update(sourceRows[0].id, sourceData) : await base44.asServiceRole.entities.DataSource.create({ code: PROVIDER_CODE, ...sourceData });
  const existingInstruments = rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_OPTIONS_MARKET_CODE }));
  const byCompositeKey = new Map(existingInstruments.map((instrument) => [instrument.composite_key, instrument]));
  const instrumentCreates = [];
  const instrumentUpdates = [];
  for (const company of US_OPTIONS_CATALOG.companies) {
    const payload = instrumentRow(company);
    const current = byCompositeKey.get(payload.composite_key);
    if (!current) instrumentCreates.push(payload);
    else if (["symbol", "name_ar", "name_en", "sector_ar", "sector_en", "industry_en", "currency", "status", "catalog_as_of"].some((field) => current[field] !== payload[field])) instrumentUpdates.push({ id: current.id, ...payload });
  }
  if (instrumentCreates.length) await base44.asServiceRole.entities.Instrument.bulkCreate(instrumentCreates);
  if (instrumentUpdates.length) await base44.asServiceRole.entities.Instrument.bulkUpdate(instrumentUpdates);
  const instruments = rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_OPTIONS_MARKET_CODE })).filter((instrument) => US_OPTIONS_SYMBOLS.has(instrument.symbol) && instrument.status !== "delisted");
  if (instruments.length !== US_OPTIONS_CATALOG.companies.length) throw Object.assign(new Error(`U.S. options catalog incomplete: ${instruments.length}/${US_OPTIONS_CATALOG.companies.length}`), { status: 503, code: "US_OPTIONS_CATALOG_INCOMPLETE" });
  const existingMappings = rows(await base44.asServiceRole.entities.ProviderInstrumentMap.filter({ market_code: US_OPTIONS_MARKET_CODE }));
  const mappingsByKey = new Map(existingMappings.map((mapping) => [`${mapping.instrument_id}|${mapping.provider_code}`, mapping]));
  const mappingCreates = [];
  const mappingUpdates = [];
  for (const instrument of instruments) {
    const payload = {
      instrument_id: instrument.id,
      market_code: US_OPTIONS_MARKET_CODE,
      provider_code: PROVIDER_CODE,
      provider_symbol: instrument.symbol,
      quote_mode: "delayed",
      delay_seconds: DELAY_SECONDS,
      license_status: "pending",
      active: true
    };
    const current = mappingsByKey.get(`${instrument.id}|${PROVIDER_CODE}`);
    if (!current) mappingCreates.push(payload);
    else if (["provider_symbol", "quote_mode", "delay_seconds", "license_status", "active"].some((field) => current[field] !== payload[field])) mappingUpdates.push({ id: current.id, ...payload });
  }
  if (mappingCreates.length) await base44.asServiceRole.entities.ProviderInstrumentMap.bulkCreate(mappingCreates);
  if (mappingUpdates.length) await base44.asServiceRole.entities.ProviderInstrumentMap.bulkUpdate(mappingUpdates);
  return { source, instruments, bySymbol: new Map(instruments.map((instrument) => [instrument.symbol, instrument])) };
}
async function fetchChart(symbol, now = /* @__PURE__ */ new Date(), window = { mode: "bootstrap", range: "5d" }) {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set("interval", "5m");
  if (Number.isFinite(window?.period1) && Number.isFinite(window?.period2)) {
    url.searchParams.set("period1", String(window.period1));
    url.searchParams.set("period2", String(window.period2));
  } else url.searchParams.set("range", String(window?.range || "5d"));
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,splits");
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1e4);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "KMY-US-Options-Market/1.0" },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`provider_http_${response.status}`);
      const result = (await response.json())?.chart?.result?.[0];
      if (!result) throw new Error("provider_empty_chart");
      return { ...normalizeChart(symbol, result, now), requestMode: window.mode || "bootstrap" };
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error("provider_request_failed");
}
function normalizeChart(symbol, result, now) {
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0] || {};
  const sessionDate = nyClock(now).date;
  const barsBySession = /* @__PURE__ */ new Map();
  let latestObservedAt = 0;
  for (let index = 0; index < timestamps.length; index += 1) {
    const time = new Date(Number(timestamps[index]) * 1e3);
    const clock = nyClock(time);
    const minute = clock.hour * 60 + clock.minute;
    if (minute < 570 || minute >= 960 || !isCompletedDelayedBar(time, now, PROVIDER_BAR_INTERVAL_MS)) continue;
    const open = validNumber(quote.open?.[index]);
    const high = validNumber(quote.high?.[index]);
    const low = validNumber(quote.low?.[index]);
    const close = validNumber(quote.close?.[index]);
    if (![open, high, low, close].every(Boolean) || high < Math.max(open, close) || low > Math.min(open, close)) continue;
    const bucketTime = Math.floor(time.getTime() / (15 * 60 * 1e3)) * 15 * 60 * 1e3;
    const bucketIso = new Date(bucketTime).toISOString();
    const sessionBars = barsBySession.get(clock.date) || /* @__PURE__ */ new Map();
    const current = sessionBars.get(bucketIso);
    const componentKey = time.toISOString();
    sessionBars.set(bucketIso, current ? {
      ...current,
      high: Math.max(current.high, high),
      low: Math.min(current.low, low),
      close,
      volume: current.volume + validVolume(quote.volume?.[index]),
      component_times: [...current.component_times, componentKey]
    } : { time: bucketIso, open, high, low, close, volume: validVolume(quote.volume?.[index]), component_times: [componentKey] });
    barsBySession.set(clock.date, sessionBars);
    latestObservedAt = Math.max(latestObservedAt, time.getTime() + PROVIDER_BAR_INTERVAL_MS);
  }
  const sessions = [...barsBySession.entries()].map(([date, sessionBars]) => ({
    sessionDate: date,
    bars: [...sessionBars.values()].filter((bar) => new Set(bar.component_times).size === 3).map(({ component_times: _componentTimes, ...bar }) => bar).sort((left, right) => Date.parse(left.time) - Date.parse(right.time))
  })).filter((session) => session.bars.length).sort((left, right) => left.sessionDate.localeCompare(right.sessionDate));
  const bars = sessions.find((session) => session.sessionDate === sessionDate)?.bars || [];
  if (!bars.length || !latestObservedAt) throw new Error("no_current_session_bars");
  const providerAsOf = new Date(Date.parse(bars.at(-1).time) + 15 * 60 * 1e3).toISOString();
  const previousClose = validNumber(result?.meta?.chartPreviousClose ?? result?.meta?.previousClose);
  if (!previousClose) throw new Error("missing_previous_close");
  const marketCap = validVolume(result?.meta?.marketCap);
  return {
    symbol,
    sessionDate,
    providerAsOf,
    lastTradeTime: providerAsOf,
    bars,
    sessions,
    previousClose,
    marketCap,
    quote: quoteFromBars(bars, previousClose, marketCap)
  };
}
async function fetchUniverse(now, symbols, windowsBySymbol) {
  const output = [];
  const failures = [];
  let cursor = 0;
  async function worker() {
    while (cursor < symbols.length) {
      const symbol = symbols[cursor++];
      try {
        output.push(await fetchChart(symbol, now, windowsBySymbol.get(symbol)));
      } catch (error) {
        failures.push({ symbol, message: error?.message || "provider_failed" });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, symbols.length) }, () => worker()));
  return { output, failures };
}
async function queueAlertDeliveries(base44, rule, bucket) {
  const destinations = await base44.asServiceRole.entities.AlertDestination.filter({ customer_id: rule.customer_id, active: true });
  for (const destination of destinations) {
    const dedupe_key = await checksum(`${rule.id}:${destination.id}:${bucket}`);
    const existing = await base44.asServiceRole.entities.DeliveryEvent.filter({ dedupe_key });
    if (!existing.length) await base44.asServiceRole.entities.DeliveryEvent.create({
      alert_rule_id: rule.id,
      destination_id: destination.id,
      dedupe_key,
      channel: destination.channel,
      status: "pending",
      attempt_count: 0
    });
  }
}
async function evaluateAlerts(base44, acceptedQuotes, isFinal, nextTradingDate) {
  const byInstrument = new Map(acceptedQuotes.map((quote) => [quote.instrument_id, quote]));
  const rules = rows(await base44.asServiceRole.entities.AlertRule.list("-updated_date", 5e3)).filter((rule) => rule.enabled && (rule.market_code || "SA_MAIN") === US_OPTIONS_MARKET_CODE).filter((rule) => ["crosses_above", "crosses_below"].includes(rule.condition));
  for (const rule of rules) {
    const quote = byInstrument.get(rule.instrument_id);
    const current = Number(quote?.last_price);
    const previous = Number(rule.last_observed_price);
    const threshold = Number(rule.threshold);
    if (!quote || !Number.isFinite(current) || !Number.isFinite(threshold) || !alertIntervalDue(rule.interval || "15m", quote.provider_as_of, isFinal, { nextTradingDate })) continue;
    const bucket = `${rule.interval || "15m"}:${quote.provider_as_of}`;
    if (rule.last_evaluation_bucket === bucket) continue;
    const crossed = rule.condition === "crosses_above" ? Number.isFinite(previous) && previous <= threshold && current > threshold : Number.isFinite(previous) && previous >= threshold && current < threshold;
    const update = { last_observed_price: current, last_observed_at: quote.provider_as_of, last_evaluation_bucket: bucket };
    if (crossed) {
      const cooldown = Math.max(15, Number(rule.cooldown_minutes) || 15) * 6e4;
      if (!rule.last_triggered_at || Date.parse(quote.provider_as_of) - Date.parse(rule.last_triggered_at) >= cooldown) {
        await queueAlertDeliveries(base44, rule, bucket);
        update.last_triggered_at = quote.provider_as_of;
        if (rule.frequency === "once") update.enabled = false;
      }
    }
    await base44.asServiceRole.entities.AlertRule.update(rule.id, update);
  }
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
    if (String(body.market_code || US_OPTIONS_MARKET_CODE) !== US_OPTIONS_MARKET_CODE) throw Object.assign(new Error("Wrong market for U.S. options ingestion"), { status: 400, code: "MARKET_MISMATCH" });
    const now = /* @__PURE__ */ new Date();
    const clock = nyClock(now);
    const { source, instruments, bySymbol } = await ensureCatalog(base44, now);
    const batchCount = Math.min(Math.max(Number(body.batch_count) || 2, 1), US_OPTIONS_CATALOG.companies.length);
    const batchIndex = Math.min(Math.max(Number(body.batch_index) || 0, 0), batchCount - 1);
    const batchSymbols = US_OPTIONS_CATALOG.companies.map((company) => company.symbol).filter((_, index) => index % batchCount === batchIndex);
    const batchSymbolSet = new Set(batchSymbols);
    const batchInstruments = instruments.filter((instrument) => batchSymbolSet.has(instrument.symbol));
    if (body.action === "catalog_status") return Response.json({
      status: "ready",
      market_code: US_OPTIONS_MARKET_CODE,
      instruments: instruments.length,
      batch_size: batchInstruments.length,
      batch_index: batchIndex,
      batch_count: batchCount
    });
    if (body.action === "data_status") {
      const instrumentIds = new Set(instruments.map((instrument) => instrument.id));
      const quotes = await readRowsWithRetry(() => base44.asServiceRole.entities.QuoteLatest.filter({ market_code: US_OPTIONS_MARKET_CODE }, "-provider_as_of", 1e3));
      const intradayChunks = await readRowsWithRetry(() => base44.asServiceRole.entities.CandleChunk.filter({ market_code: US_OPTIONS_MARKET_CODE, interval: "15m" }, "-end_time", 2e3));
      const dailyHistory = await readRowsWithRetry(() => base44.asServiceRole.entities.HistoricalCandleSync.filter({ market_code: US_OPTIONS_MARKET_CODE, interval: "1d" }, "-completed_at", 500));
      const signals = await readRowsWithRetry(() => base44.asServiceRole.entities.IndicatorSnapshot.filter({ market_code: US_OPTIONS_MARKET_CODE, indicator_key: "technical_signals" }, "-source_as_of", 1e3));
      const coveredQuotes = new Set(quotes.filter((item) => instrumentIds.has(item.instrument_id) && Number(item.last_price) > 0 && item.quality_status !== "quarantined").map((item) => item.instrument_id));
      const coveredIntraday = new Set(intradayChunks.filter((item) => instrumentIds.has(item.instrument_id) && Array.isArray(item.bars) && item.bars.length > 0 && item.quality_status !== "quarantined").map((item) => item.instrument_id));
      const coveredDaily = new Set(dailyHistory.filter((item) => instrumentIds.has(item.instrument_id) && item.status === "complete" && item.coverage_verified === true && item.provider_partial !== true).map((item) => item.instrument_id));
      const signalCoverage = Object.fromEntries(["1d", "1wk", "1mo"].map((timeframe) => [timeframe, new Set(signals.filter((item) => instrumentIds.has(item.instrument_id) && item.timeframe === timeframe).map((item) => item.instrument_id)).size]));
      return Response.json({
        status: coveredQuotes.size === instruments.length && coveredIntraday.size === instruments.length && coveredDaily.size === instruments.length ? "healthy" : "degraded",
        market_code: US_OPTIONS_MARKET_CODE,
        expected_instruments: instruments.length,
        quote_instrument_count: coveredQuotes.size,
        intraday_instrument_count: coveredIntraday.size,
        daily_history_instrument_count: coveredDaily.size,
        signal_instrument_count: signalCoverage,
        latest_quote_as_of: quotes.map((item) => item.provider_as_of || item.quote_time).filter(Boolean).sort().at(-1) || null,
        latest_intraday_as_of: intradayChunks.map((item) => item.provider_as_of || item.end_time).filter(Boolean).sort().at(-1) || null
      });
    }
    const session = await sessionDecision(base44, clock);
    const forcedRecovery = body.force === true;
    if (!session.tradingDay && !forcedRecovery) return Response.json({ status: "skipped", reason: session.reason, market_code: US_OPTIONS_MARKET_CODE, session_date: clock.date });
    const minute = clock.hour * 60 + clock.minute;
    const closeMinute = session.closeMinute;
    if (!forcedRecovery && (minute < 600 || minute > closeMinute + 30)) return Response.json({ status: "skipped", reason: "outside_ingestion_window", market_code: US_OPTIONS_MARKET_CODE, session_date: clock.date });
    const slotKey = `${US_OPTIONS_MARKET_CODE}:${clock.date}:15m:${clock.hour.toString().padStart(2, "0")}:${Math.floor(clock.minute / 15) * 15}:batch-${batchIndex + 1}-of-${batchCount}`;
    const existingRuns = await base44.asServiceRole.entities.IngestionRun.filter({ slot_key: slotKey });
    if (existingRuns.some((item) => ["success", "partial"].includes(item.status)) && body.force !== true) return Response.json({ status: "skipped", reason: "already_ingested", slot_key: slotKey });
    run = await base44.asServiceRole.entities.IngestionRun.create({
      run_type: "quarter_hour",
      market_code: US_OPTIONS_MARKET_CODE,
      slot_key: slotKey,
      slot_kind: "quarter_hour",
      scheduled_for: now.toISOString(),
      lease_expires_at: new Date(now.getTime() + 4 * 6e4).toISOString(),
      started_at: now.toISOString(),
      total_records: batchInstruments.length,
      success_count: 0,
      failed_count: 0,
      status: "running",
      source_id: source.id,
      notes: "U.S. optionable company T+15 incremental candle update"
    });
    const existingIntraday = await readRowsWithRetry(() => base44.asServiceRole.entities.CandleChunk.filter({ market_code: US_OPTIONS_MARKET_CODE, interval: "15m" }, "-end_time", 2e3));
    const chunkByKey = indexCandleChunks(existingIntraday);
    const latestStored = latestStoredCandleByInstrument(existingIntraday);
    const recentGaps = earliestRecentGapByInstrument(existingIntraday, now);
    const windowsBySymbol = new Map(batchInstruments.map((instrument) => {
      const gap = recentGaps.get(instrument.id);
      const window = incrementalProviderWindow(gap?.time || latestStored.get(instrument.id)?.time, now, { overlapBars: 2, bootstrapRange: "5d" });
      return [instrument.symbol, gap && window.mode === "incremental" ? { ...window, mode: "gap_recovery" } : window];
    }));
    const providerWindowSummary = summarizeProviderWindows(windowsBySymbol);
    const { output, failures } = await fetchUniverse(now, batchSymbols, windowsBySymbol);
    const received = (/* @__PURE__ */ new Date()).toISOString();
    const snapshotVersion = `${US_OPTIONS_MARKET_CODE}:${clock.date}:${Date.now()}`;
    const isFinal = minute >= closeMinute + 15;
    const nextTradingDate = isFinal ? await nextTradingSessionDate(base44, clock.date) : "";
    const acceptedQuotes = [];
    const chunks = [];
    for (const item of output) {
      const instrument = bySymbol.get(item.symbol);
      if (!instrument) continue;
      const mergedSessions = item.sessions.map((session2) => {
        const chunkKey = `${US_OPTIONS_MARKET_CODE}:${item.symbol}:15m:${session2.sessionDate}`;
        const existing = chunkByKey.get(chunkKey);
        return { ...session2, chunkKey, existing, bars: mergeCandleBars(existing?.bars, session2.bars) };
      }).filter((session2) => session2.bars.length);
      const currentBars = mergedSessions.find((session2) => session2.sessionDate === item.sessionDate)?.bars || [];
      if (!currentBars.length) continue;
      const quote = quoteFromBars(currentBars, item.previousClose, item.marketCap);
      const delay = Math.max(0, Math.floor((Date.now() - Date.parse(item.providerAsOf)) / 1e3));
      const freshnessStatus = delay <= DELAY_SECONDS + FRESHNESS_GRACE_SECONDS ? "fresh" : "stale";
      acceptedQuotes.push({
        instrument_id: instrument.id,
        market_code: US_OPTIONS_MARKET_CODE,
        session_date: item.sessionDate,
        symbol: item.symbol,
        ...quote,
        source_id: source.id,
        source_time: item.providerAsOf,
        provider_as_of: item.providerAsOf,
        last_trade_time: item.lastTradeTime,
        received_time: received,
        delay_seconds: delay,
        license_status: "pending",
        quote_time: item.providerAsOf,
        quality_status: freshnessStatus === "fresh" ? "verified" : "stale",
        snapshot_version: snapshotVersion,
        market_phase: isFinal ? "closed" : "continuous",
        freshness_status: freshnessStatus,
        is_final: isFinal,
        run_id: run.id
      });
      for (const session2 of mergedSessions) {
        const sessionFinal = (session2.existing?.is_final === true || session2.sessionDate !== item.sessionDate || isFinal) && session2.bars.length === expectedSessionBars(session2.sessionDate);
        const completenessStatus = sessionFinal ? "complete" : session2.bars.length >= 4 ? "partial" : "incomplete";
        chunks.push({
          instrument_id: instrument.id,
          market_code: US_OPTIONS_MARKET_CODE,
          symbol: item.symbol,
          interval: "15m",
          chunk_key: session2.chunkKey,
          session_date: session2.sessionDate,
          start_time: session2.bars[0].time,
          end_time: session2.bars.at(-1).time,
          bars: session2.bars,
          bar_count: session2.bars.length,
          checksum: await checksum(session2.bars),
          source_id: source.id,
          run_id: run.id,
          snapshot_version: snapshotVersion,
          provider_as_of: sessionFinal ? new Date(Date.parse(session2.bars.at(-1).time) + 15 * 60 * 1e3).toISOString() : item.providerAsOf,
          received_time: received,
          quality_status: sessionFinal ? "verified" : freshnessStatus === "fresh" ? "verified" : "stale",
          canonical_version: "us-options-intraday-v3",
          is_final: sessionFinal,
          bucket_count: session2.bars.length,
          completeness_status: completenessStatus,
          is_historical_archive: session2.existing?.is_historical_archive === true || session2.sessionDate !== item.sessionDate,
          adjustment_mode: "none"
        });
      }
    }
    const observations = acceptedQuotes.map((quote) => ({
      run_id: quote.run_id,
      snapshot_version: quote.snapshot_version,
      market_code: quote.market_code,
      session_date: quote.session_date,
      instrument_id: quote.instrument_id,
      symbol: quote.symbol,
      last_price: quote.last_price,
      previous_close: quote.previous_close,
      change_value: quote.change_value,
      change_percent: quote.change_percent,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      volume: quote.volume,
      market_cap: quote.market_cap,
      source_id: quote.source_id,
      provider_as_of: quote.provider_as_of,
      last_trade_time: quote.last_trade_time,
      received_time: quote.received_time,
      delay_seconds: quote.delay_seconds,
      market_phase: quote.market_phase,
      freshness_status: quote.freshness_status,
      quality_status: quote.quality_status,
      is_final: quote.is_final
    }));
    if (observations.length) await base44.asServiceRole.entities.QuoteObservation.bulkCreate(observations);
    const coverage = acceptedQuotes.length / batchInstruments.length * 100;
    const status = coverage >= 99 ? "success" : coverage >= 95 ? "partial" : "failed";
    const quoteResult = status === "failed" ? { created: 0, updated: 0, preserved_last_good: true } : await upsertMany(base44, "QuoteLatest", acceptedQuotes, ["instrument_id"], { market_code: US_OPTIONS_MARKET_CODE });
    const candleResult = status === "failed" ? { created: 0, updated: 0, preserved_last_good: true } : await upsertMany(base44, "CandleChunk", chunks, ["instrument_id", "interval", "chunk_key"], { market_code: US_OPTIONS_MARKET_CODE, interval: "15m" });
    const acceptedIds = new Set(acceptedQuotes.map((quote) => quote.instrument_id));
    const stale = rows(await base44.asServiceRole.entities.QuoteLatest.filter({ market_code: US_OPTIONS_MARKET_CODE })).filter((quote) => batchInstruments.some((instrument) => instrument.id === quote.instrument_id) && !acceptedIds.has(quote.instrument_id)).map((quote) => ({ id: quote.id, freshness_status: "stale", quality_status: "stale" }));
    if (stale.length) await base44.asServiceRole.entities.QuoteLatest.bulkUpdate([...new Map(stale.map((row) => [row.id, row])).values()]);
    await evaluateAlerts(base44, acceptedQuotes, isFinal, nextTradingDate);
    await base44.asServiceRole.entities.IngestionRun.update(run.id, {
      status,
      finished_at: (/* @__PURE__ */ new Date()).toISOString(),
      success_count: acceptedQuotes.length,
      failed_count: batchInstruments.length - acceptedQuotes.length,
      coverage_percent: coverage,
      provider_as_of: acceptedQuotes.map((quote) => quote.provider_as_of).sort().at(-1) || null,
      snapshot_version: snapshotVersion,
      notes: `quotes:${acceptedQuotes.length};failures:${failures.length};windows:${JSON.stringify(providerWindowSummary)}`
    });
    if (status === "failed") throw Object.assign(new Error(`U.S. options coverage failed: ${coverage.toFixed(2)}%`), { status: 503, code: "US_OPTIONS_COVERAGE_FAILED" });
    return Response.json({
      status,
      market_code: US_OPTIONS_MARKET_CODE,
      session_date: clock.date,
      run_id: run.id,
      coverage_percent: coverage,
      quotes: quoteResult,
      candles: candleResult,
      accepted: acceptedQuotes.length,
      rejected: failures.length,
      snapshot_version: snapshotVersion,
      is_final: isFinal,
      batch_index: batchIndex,
      batch_count: batchCount,
      provider_windows: providerWindowSummary
    });
  } catch (error) {
    if (base44 && run?.id) {
      try {
        await base44.asServiceRole.entities.IngestionRun.update(run.id, { status: "failed", finished_at: (/* @__PURE__ */ new Date()).toISOString(), failure_code: error?.code || "US_OPTIONS_INGESTION_FAILED", notes: error?.message || "failed" });
      } catch {
      }
    }
    return replyError(error);
  }
});
