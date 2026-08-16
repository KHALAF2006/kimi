// GENERATED from usBenchmarksMarketIngestion/source.ts. Do not edit directly.

// base44/functions/usBenchmarksMarketIngestion/source.ts
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
  const rows = await base44.asServiceRole.entities.CustomerProfile.filter({ auth_user_id: user.id });
  return rows[0] || null;
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

// base44/shared/entity-batch.ts
function entityRows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}
async function upsertEntityRows(base44, entity, incoming, fields, filter) {
  const key = (row) => fields.map((field) => String(row[field] ?? "")).join("|");
  const unique = [...new Map(incoming.map((row) => [key(row), row])).values()];
  const existing = entityRows(await base44.asServiceRole.entities[entity].filter(filter, "-updated_date", 5e3));
  const byKey = new Map(existing.map((row) => [key(row), row]));
  const creates = unique.filter((row) => !byKey.has(key(row)));
  const updates = unique.filter((row) => byKey.has(key(row))).map((row) => ({ id: byKey.get(key(row)).id, ...row }));
  if (creates.length) await base44.asServiceRole.entities[entity].bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities[entity].bulkUpdate(updates);
  return { created: creates.length, updated: updates.length };
}

// base44/shared/us-benchmarks-catalog.ts
var US_BENCHMARKS_MARKET_CODE = "US_BENCHMARKS";
var US_BENCHMARKS_PROVIDER_CODE = "REFERENCE_YAHOO_US_BENCHMARKS_T15";
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

// base44/shared/us-options-timing.ts
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

// base44/functions/usBenchmarksMarketIngestion/source.ts
var DELAY_SECONDS = 900;
var FRESHNESS_GRACE_SECONDS = 60 * 60 + 10 * 60;
var BASE_URL = "https://query1.finance.yahoo.com";
var HOLIDAYS_2026 = /* @__PURE__ */ new Set([
  "2026-01-01",
  "2026-01-19",
  "2026-02-16",
  "2026-04-03",
  "2026-05-25",
  "2026-06-19",
  "2026-07-03",
  "2026-09-07",
  "2026-11-26",
  "2026-12-25"
]);
var EARLY_CLOSE_2026 = /* @__PURE__ */ new Set(["2026-11-27", "2026-12-24"]);
function nyClock(value = /* @__PURE__ */ new Date()) {
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
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24, minute: Number(parts.minute), weekday: parts.weekday };
}
function minuteFromClock(value, fallback) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ""));
  if (!match) return fallback;
  const minute = Number(match[1]) * 60 + Number(match[2]);
  return Number.isFinite(minute) ? minute : fallback;
}
async function sessionDecision(base44, clock) {
  const sessions = entityRows(await base44.asServiceRole.entities.MarketSession.filter({ market_code: US_BENCHMARKS_MARKET_CODE, session_date: clock.date }));
  if (sessions[0]) return { tradingDay: sessions[0].is_trading_day === true, closeMinute: minuteFromClock(sessions[0].closes_at, 960), reason: sessions[0].reason || "market_session_calendar" };
  const holidays = entityRows(await base44.asServiceRole.entities.MarketHoliday.filter({ market_code: US_BENCHMARKS_MARKET_CODE, holiday_date: clock.date }));
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
  throw Object.assign(new Error("Unable to resolve the next U.S. benchmark trading session"), { status: 503, code: "US_BENCHMARKS_CALENDAR_INCOMPLETE" });
}
function expectedSessionBars(sessionDate) {
  return EARLY_CLOSE_2026.has(sessionDate) ? 14 : 26;
}
async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map((item2) => item2.toString(16).padStart(2, "0")).join("");
}
async function ensureCatalog(base44, now) {
  const marketRows = entityRows(await base44.asServiceRole.entities.Market.filter({ market_code: US_BENCHMARKS_MARKET_CODE }));
  if (marketRows[0]) await base44.asServiceRole.entities.Market.update(marketRows[0].id, US_BENCHMARKS_CATALOG.market);
  else await base44.asServiceRole.entities.Market.create(US_BENCHMARKS_CATALOG.market);
  const sourceRows = entityRows(await base44.asServiceRole.entities.DataSource.filter({ code: US_BENCHMARKS_PROVIDER_CODE }));
  const sourcePayload = { name: "U.S. indices and ETFs delayed reference adapter", market_code: US_BENCHMARKS_MARKET_CODE, quote_mode: "delayed", delay_seconds: DELAY_SECONDS, public_enabled: false, source_type: "reference", license_status: "restricted", base_url: BASE_URL, last_verified_at: now.toISOString() };
  const source = sourceRows[0] ? await base44.asServiceRole.entities.DataSource.update(sourceRows[0].id, sourcePayload) : await base44.asServiceRole.entities.DataSource.create({ code: US_BENCHMARKS_PROVIDER_CODE, ...sourcePayload });
  const instrumentPayloads = US_BENCHMARKS_CATALOG.instruments.map((item2) => ({
    symbol: item2.symbol,
    market_code: US_BENCHMARKS_MARKET_CODE,
    instrument_code: item2.symbol,
    instrument_type: item2.type,
    composite_key: `${US_BENCHMARKS_MARKET_CODE}:${item2.symbol}`,
    name_ar: item2.nameAr,
    name_en: item2.nameEn,
    sector_ar: item2.categoryAr,
    sector_en: item2.categoryEn,
    related_companies_ar: item2.relatedAr,
    related_companies_en: item2.relatedEn,
    market: US_BENCHMARKS_CATALOG.market.name_en,
    currency: "USD",
    exchange_code: "US",
    country_code: "US",
    issuer_country: "United States",
    optionable: false,
    catalog_as_of: US_BENCHMARKS_CATALOG.source.asOf,
    status: "active",
    official_url: item2.officialUrl
  }));
  await upsertEntityRows(base44, "Instrument", instrumentPayloads, ["composite_key"], { market_code: US_BENCHMARKS_MARKET_CODE });
  const instruments = entityRows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_BENCHMARKS_MARKET_CODE }, "symbol", 500));
  const bySymbol = new Map(instruments.map((instrument) => [instrument.symbol, instrument]));
  if (instruments.length !== US_BENCHMARKS_CATALOG.instruments.length) throw Object.assign(new Error(`Benchmark catalog incomplete: ${instruments.length}/${US_BENCHMARKS_CATALOG.instruments.length}`), { status: 503, code: "US_BENCHMARKS_CATALOG_INCOMPLETE" });
  const mappings = US_BENCHMARKS_CATALOG.instruments.map((item2) => ({ instrument_id: bySymbol.get(item2.symbol).id, market_code: US_BENCHMARKS_MARKET_CODE, provider_code: US_BENCHMARKS_PROVIDER_CODE, provider_symbol: item2.providerSymbol, quote_mode: "delayed", delay_seconds: DELAY_SECONDS, license_status: "pending", active: true }));
  await upsertEntityRows(base44, "ProviderInstrumentMap", mappings, ["instrument_id", "provider_code"], { market_code: US_BENCHMARKS_MARKET_CODE });
  const aliases = US_BENCHMARKS_CATALOG.instruments.flatMap((item2) => [item2.symbol, item2.providerSymbol, ...item2.aliases].map((alias) => ({ instrument_id: bySymbol.get(item2.symbol).id, market_code: US_BENCHMARKS_MARKET_CODE, alias, alias_type: alias === item2.symbol ? "symbol" : alias === item2.providerSymbol ? "provider" : "search", normalized_alias: String(alias).replace(/[^A-Za-z0-9]/g, "").toUpperCase(), active: true })));
  await upsertEntityRows(base44, "InstrumentAlias", aliases, ["instrument_id", "normalized_alias"], { market_code: US_BENCHMARKS_MARKET_CODE });
  return { source, instruments, bySymbol };
}
async function fetchChart(providerSymbol, interval, rangeOrWindow) {
  const url = new URL(`${BASE_URL}/v8/finance/chart/${encodeURIComponent(providerSymbol)}`);
  url.searchParams.set("interval", interval);
  const request = typeof rangeOrWindow === "object" && rangeOrWindow !== null ? rangeOrWindow : { range: rangeOrWindow };
  if (Number.isFinite(request.period1) && Number.isFinite(request.period2)) {
    url.searchParams.set("period1", String(request.period1));
    url.searchParams.set("period2", String(request.period2));
  } else if (request.range === "full") {
    url.searchParams.set("period1", "0");
    url.searchParams.set("period2", String(Math.ceil(Date.now() / 1e3) + 86400));
  } else url.searchParams.set("range", String(request.range || "5d"));
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,splits");
  url.searchParams.set("includeAdjustedClose", "true");
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2e4);
    try {
      const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "SMART_INVESTOR-US-Benchmarks/1.0" }, signal: controller.signal });
      const payload = await response.json().catch(() => ({}));
      const result = payload?.chart?.result?.[0];
      if (!response.ok || !result) throw new Error(payload?.chart?.error?.description || `provider_http_${response.status}`);
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error("provider_failed");
}
function validPrice(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
function quoteFromBars(bars, previousClose, marketCap = 0) {
  const first = bars[0];
  const last = bars.at(-1);
  return {
    last_price: last.close,
    previous_close: previousClose,
    change_value: last.close - previousClose,
    change_percent: (last.close - previousClose) / previousClose * 100,
    open: first.open,
    high: Math.max(...bars.map((bar) => bar.high)),
    low: Math.min(...bars.map((bar) => bar.low)),
    volume: bars.reduce((sum, bar) => sum + Math.max(0, Number(bar.volume || 0)), 0),
    market_cap: Math.max(0, Number(marketCap || 0))
  };
}
function normalizeIntraday(item2, result, now) {
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0] || {};
  const cutoff = now.getTime() - DELAY_SECONDS * 1e3;
  const sessions = /* @__PURE__ */ new Map();
  let providerAsOf = 0;
  for (let index = 0; index < timestamps.length; index += 1) {
    const start = Number(timestamps[index]) * 1e3;
    if (!Number.isFinite(start) || start + 5 * 60 * 1e3 > cutoff) continue;
    const clock = nyClock(new Date(start));
    const minute = clock.hour * 60 + clock.minute;
    if (minute < 570 || minute >= 960) continue;
    const open = validPrice(quote.open?.[index]);
    const high = validPrice(quote.high?.[index]);
    const low = validPrice(quote.low?.[index]);
    const close = validPrice(quote.close?.[index]);
    if (![open, high, low, close].every(Boolean)) continue;
    const bucket = Math.floor(start / (15 * 60 * 1e3)) * 15 * 60 * 1e3;
    const session = sessions.get(clock.date) || /* @__PURE__ */ new Map();
    const current = session.get(bucket);
    const componentTime = new Date(start).toISOString();
    const volume = Math.max(0, Number(quote.volume?.[index] || 0));
    session.set(bucket, current ? { ...current, high: Math.max(current.high, high), low: Math.min(current.low, low), close, volume: current.volume + volume, component_times: [...current.component_times, componentTime] } : { time: new Date(bucket).toISOString(), open, high, low, close, volume, component_times: [componentTime] });
    sessions.set(clock.date, session);
    providerAsOf = Math.max(providerAsOf, start + 5 * 60 * 1e3);
  }
  const currentSessionDate = nyClock(now).date;
  const sessionDate = sessions.has(currentSessionDate) ? currentSessionDate : [...sessions.keys()].sort().at(-1);
  const completeBars = (values) => [...values.values()].filter((bar) => new Set(bar.component_times).size === 3).map(({ component_times: _componentTimes, ...bar }) => bar).sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  const currentBars = sessionDate ? completeBars(sessions.get(sessionDate) || /* @__PURE__ */ new Map()) : [];
  if (!sessionDate || !currentBars.length || !providerAsOf) throw new Error("no_eligible_session_bars");
  const previousClose = validPrice(result?.meta?.chartPreviousClose ?? result?.meta?.previousClose);
  if (!previousClose) throw new Error("missing_previous_close");
  const last = currentBars.at(-1);
  const canonicalProviderAsOf = new Date(Date.parse(last.time) + 15 * 60 * 1e3).toISOString();
  const marketCap = Math.max(0, Number(result?.meta?.marketCap || 0));
  return { item: item2, sessionDate, providerAsOf: canonicalProviderAsOf, sessions: [...sessions.entries()].map(([date, values]) => ({ date, bars: completeBars(values) })).filter((session) => session.bars.length), previousClose, marketCap, quote: quoteFromBars(currentBars, previousClose, marketCap) };
}
async function queueAlertDeliveries(base44, rule, bucket) {
  if (rule.market_code !== US_BENCHMARKS_MARKET_CODE) throw new Error("alert_market_mismatch");
  const channels = entityRows(await base44.asServiceRole.entities.DeliveryChannel.filter({ market_code: US_BENCHMARKS_MARKET_CODE, active: true })).filter((item2) => item2.verified_at);
  for (const channel of channels) {
    const dedupeKey = await digest(`${rule.id}:${channel.id}:${bucket}`);
    const existing = entityRows(await base44.asServiceRole.entities.DeliveryEvent.filter({ dedupe_key: dedupeKey }));
    if (!existing.length) await base44.asServiceRole.entities.DeliveryEvent.create({
      alert_rule_id: rule.id,
      destination_id: channel.id,
      market_code: US_BENCHMARKS_MARKET_CODE,
      dedupe_key: dedupeKey,
      channel: channel.channel,
      status: "pending",
      attempt_count: 0
    });
  }
}
async function evaluateAlerts(base44, acceptedQuotes, isFinal, nextTradingDate) {
  const byInstrument = new Map(acceptedQuotes.map((quote) => [quote.instrument_id, quote]));
  const rules = entityRows(await base44.asServiceRole.entities.AlertRule.list("-updated_date", 5e3)).filter((rule) => rule.enabled && rule.market_code === US_BENCHMARKS_MARKET_CODE).filter((rule) => ["crosses_above", "crosses_below"].includes(rule.condition));
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
async function incremental(base44, catalog, source, now, options = {}) {
  const range = options.range === "1mo" ? "1mo" : "5d";
  const writeQuotes = options.writeQuotes !== false;
  const storedChunks = entityRows(await base44.asServiceRole.entities.CandleChunk.filter({ market_code: US_BENCHMARKS_MARKET_CODE, interval: "15m" }, "-end_time", 2e3));
  const chunkByKey = indexCandleChunks(storedChunks);
  const latestStored = latestStoredCandleByInstrument(storedChunks);
  const recentGaps = earliestRecentGapByInstrument(storedChunks, now);
  const providerWindows = new Map(catalog.map((instrument) => {
    if (range === "1mo") return [instrument.symbol, { mode: "archive", range: "1mo" }];
    const gap = recentGaps.get(instrument.id);
    const window = incrementalProviderWindow(gap?.time || latestStored.get(instrument.id)?.time, now, { overlapBars: 2, bootstrapRange: "5d" });
    return [instrument.symbol, gap && window.mode === "incremental" ? { ...window, mode: "gap_recovery" } : window];
  }));
  const providerWindowSummary = summarizeProviderWindows(providerWindows);
  const output = [];
  const failures = [];
  let cursor = 0;
  async function worker() {
    while (cursor < catalog.length) {
      const instrument = catalog[cursor++];
      const item2 = US_BENCHMARKS_CATALOG.instruments.find((candidate) => candidate.symbol === instrument.symbol);
      if (!item2) {
        failures.push({ symbol: instrument.symbol, error: "catalog_mapping_missing" });
        continue;
      }
      try {
        output.push(normalizeIntraday(item2, await fetchChart(item2.providerSymbol, "5m", providerWindows.get(instrument.symbol)), now));
      } catch (error) {
        failures.push({ symbol: item2.symbol, error: String(error?.message || "provider_failed") });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(12, Math.max(1, catalog.length)) }, () => worker()));
  const clock = nyClock(now);
  const slotMinute = Math.floor(clock.minute / 15) * 15;
  const slotKey = range === "1mo" ? `${US_BENCHMARKS_MARKET_CODE}:${clock.date}:15m:archive` : `${US_BENCHMARKS_MARKET_CODE}:${clock.date}:15m:${String(clock.hour).padStart(2, "0")}:${String(slotMinute).padStart(2, "0")}`;
  const existingRuns = entityRows(await base44.asServiceRole.entities.IngestionRun.filter({ slot_key: slotKey }));
  if (existingRuns.some((item2) => ["success", "partial"].includes(item2.status)) && options.force !== true) return { status: "skipped", reason: "already_ingested", market_code: US_BENCHMARKS_MARKET_CODE, slot_key: slotKey };
  const run = await base44.asServiceRole.entities.IngestionRun.create({ run_type: range === "1mo" ? "intraday_backfill" : "quarter_hour", market_code: US_BENCHMARKS_MARKET_CODE, slot_key: slotKey, slot_kind: range === "1mo" ? "historical_backfill" : "quarter_hour", scheduled_for: now.toISOString(), lease_expires_at: new Date(now.getTime() + 3 * 60 * 1e3).toISOString(), started_at: now.toISOString(), total_records: catalog.length, success_count: 0, failed_count: 0, status: "running", source_id: source.id, notes: range === "1mo" ? "U.S. benchmarks 15-minute one-month backfill" : "U.S. benchmarks phased T+15 update" });
  const received = (/* @__PURE__ */ new Date()).toISOString();
  const snapshotVersion = `${US_BENCHMARKS_MARKET_CODE}:${clock.date}:${Date.now()}`;
  const closeMinute = Number(options.closeMinute || 960);
  const isFinal = clock.hour * 60 + clock.minute >= closeMinute + 15;
  const quotes = [];
  const chunks = [];
  for (const value of output) {
    const instrument = catalog.find((row) => row.symbol === value.item.symbol);
    if (!instrument) continue;
    const mergedSessions = value.sessions.map((session) => {
      const chunkKey = `${US_BENCHMARKS_MARKET_CODE}:${value.item.symbol}:15m:${session.date}`;
      const existing = chunkByKey.get(chunkKey);
      return { ...session, chunkKey, existing, bars: mergeCandleBars(existing?.bars, session.bars) };
    }).filter((session) => session.bars.length);
    const currentBars = mergedSessions.find((session) => session.date === value.sessionDate)?.bars || [];
    if (!currentBars.length) continue;
    const quote = quoteFromBars(currentBars, value.previousClose, value.marketCap);
    const delay = Math.max(0, Math.floor((Date.now() - Date.parse(value.providerAsOf)) / 1e3));
    const fresh = delay <= DELAY_SECONDS + FRESHNESS_GRACE_SECONDS;
    if (writeQuotes) quotes.push({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, session_date: value.sessionDate, symbol: value.item.symbol, ...quote, source_id: source.id, source_time: value.providerAsOf, provider_as_of: value.providerAsOf, last_trade_time: value.providerAsOf, received_time: received, delay_seconds: delay, license_status: "pending", quote_time: value.providerAsOf, quality_status: fresh ? "verified" : "stale", snapshot_version: snapshotVersion, market_phase: isFinal ? "closed" : "continuous", freshness_status: fresh ? "fresh" : "stale", is_final: isFinal, run_id: run.id });
    for (const session of mergedSessions) {
      const sessionComplete = (session.existing?.is_final === true || session.date !== value.sessionDate || isFinal) && session.bars.length === expectedSessionBars(session.date);
      chunks.push({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, symbol: value.item.symbol, interval: "15m", chunk_key: session.chunkKey, session_date: session.date, start_time: session.bars[0].time, end_time: session.bars.at(-1).time, bars: session.bars, bar_count: session.bars.length, checksum: await digest(session.bars), source_id: source.id, run_id: run.id, snapshot_version: snapshotVersion, provider_as_of: sessionComplete ? new Date(Date.parse(session.bars.at(-1).time) + 15 * 60 * 1e3).toISOString() : value.providerAsOf, received_time: received, quality_status: sessionComplete ? "verified" : fresh ? "verified" : "stale", canonical_version: "us-benchmarks-intraday-v4", is_final: sessionComplete, bucket_count: session.bars.length, completeness_status: sessionComplete ? "complete" : session.bars.length >= 4 ? "degraded" : "incomplete", is_historical_archive: session.existing?.is_historical_archive === true || session.date !== value.sessionDate, adjustment_mode: "none" });
    }
  }
  const coverage = output.length / catalog.length * 100;
  const status = coverage >= 99 ? "success" : coverage >= 95 ? "partial" : "failed";
  const observations = quotes.map((quote) => ({ run_id: quote.run_id, snapshot_version: quote.snapshot_version, market_code: quote.market_code, session_date: quote.session_date, instrument_id: quote.instrument_id, symbol: quote.symbol, last_price: quote.last_price, previous_close: quote.previous_close, change_value: quote.change_value, change_percent: quote.change_percent, open: quote.open, high: quote.high, low: quote.low, volume: quote.volume, market_cap: quote.market_cap, source_id: quote.source_id, provider_as_of: quote.provider_as_of, last_trade_time: quote.last_trade_time, received_time: quote.received_time, delay_seconds: quote.delay_seconds, market_phase: quote.market_phase, freshness_status: quote.freshness_status, quality_status: quote.quality_status, is_final: quote.is_final }));
  if (observations.length) await base44.asServiceRole.entities.QuoteObservation.bulkCreate(observations);
  const quoteResult = status === "failed" || !quotes.length ? { created: 0, updated: 0, preserved_last_good: status === "failed" } : await upsertEntityRows(base44, "QuoteLatest", quotes, ["instrument_id"], { market_code: US_BENCHMARKS_MARKET_CODE });
  const candleResult = status === "failed" ? { created: 0, updated: 0, preserved_last_good: true } : await upsertEntityRows(base44, "CandleChunk", chunks, ["instrument_id", "interval", "chunk_key"], { market_code: US_BENCHMARKS_MARKET_CODE, interval: "15m" });
  if (status !== "failed" && writeQuotes) {
    const nextTradingDate = isFinal ? await nextTradingSessionDate(base44, clock.date) : "";
    await evaluateAlerts(base44, quotes, isFinal, nextTradingDate);
  }
  await base44.asServiceRole.entities.IngestionRun.update(run.id, { status, finished_at: (/* @__PURE__ */ new Date()).toISOString(), success_count: output.length, failed_count: catalog.length - output.length, coverage_percent: coverage, provider_as_of: output.map((value) => value.providerAsOf).sort().at(-1) || null, snapshot_version: snapshotVersion, notes: `${JSON.stringify(failures).slice(0, 700)};windows:${JSON.stringify(providerWindowSummary)}`.slice(0, 1e3) });
  return { status, market_code: US_BENCHMARKS_MARKET_CODE, run_id: run.id, range, expected: catalog.length, accepted: output.length, rejected: failures.length, coverage_percent: coverage, quote_count: quotes.length, session_chunk_count: chunks.length, candle_bar_count: chunks.reduce((sum, chunk) => sum + chunk.bar_count, 0), quotes: quoteResult, candles: candleResult, failures, provider_windows: providerWindowSummary };
}
async function expireStaleRuns(base44, now) {
  const running = entityRows(await base44.asServiceRole.entities.IngestionRun.filter({ market_code: US_BENCHMARKS_MARKET_CODE, status: "running" }, "-started_at", 100));
  const cutoff = now.getTime() - 10 * 60 * 1e3;
  for (const run of running) {
    const leaseExpired = run.lease_expires_at && Date.parse(run.lease_expires_at) < now.getTime();
    const startedTooLongAgo = run.started_at && Date.parse(run.started_at) < cutoff;
    if (!leaseExpired && !startedTooLongAgo) continue;
    await base44.asServiceRole.entities.IngestionRun.update(run.id, {
      status: "failed",
      finished_at: now.toISOString(),
      failure_code: "LEASE_EXPIRED",
      notes: `${String(run.notes || "").slice(0, 700)} | Automatically closed after the execution lease expired`.slice(0, 1e3)
    });
  }
}
async function pendingIntradayArchiveInstruments(base44, catalog, batchSize = 8) {
  const chunks = entityRows(await base44.asServiceRole.entities.CandleChunk.filter({ market_code: US_BENCHMARKS_MARKET_CODE, interval: "15m" }, "-end_time", 500));
  const completeSessions = /* @__PURE__ */ new Map();
  for (const chunk of chunks) {
    if (chunk.is_final !== true || chunk.completeness_status !== "complete" || !chunk.session_date) continue;
    if (!completeSessions.has(chunk.instrument_id)) completeSessions.set(chunk.instrument_id, /* @__PURE__ */ new Set());
    completeSessions.get(chunk.instrument_id).add(chunk.session_date);
  }
  return catalog.filter((instrument) => (completeSessions.get(instrument.id)?.size || 0) < 15).slice(0, Math.min(8, Math.max(1, Number(batchSize) || 8)));
}
function normalizeDaily(result, currentDate, includeCurrentSession = false) {
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0] || {};
  const bars = [];
  for (let index = 0; index < timestamps.length; index += 1) {
    const time = new Date(Number(timestamps[index]) * 1e3).toISOString();
    if (time.slice(0, 10) > currentDate || !includeCurrentSession && time.slice(0, 10) === currentDate) continue;
    const open = validPrice(quote.open?.[index]);
    const high = validPrice(quote.high?.[index]);
    const low = validPrice(quote.low?.[index]);
    const close = validPrice(quote.close?.[index]);
    if (![open, high, low, close].every(Boolean) || high < Math.max(open, close) || low > Math.min(open, close)) continue;
    bars.push({ time, open, high, low, close, volume: Math.max(0, Number(quote.volume?.[index] || 0)) });
  }
  return [...new Map(bars.map((bar) => [bar.time.slice(0, 10), bar])).values()].sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
}
async function refreshRecentDaily(base44, catalog, source, now) {
  const clock = nyClock(now);
  const slotKey = `${US_BENCHMARKS_MARKET_CODE}:daily:${clock.date}`;
  const existingRuns = entityRows(await base44.asServiceRole.entities.IngestionRun.filter({ market_code: US_BENCHMARKS_MARKET_CODE, slot_key: slotKey }, "-started_at", 5));
  if (existingRuns.some((item2) => ["success", "partial"].includes(item2.status))) return { status: "skipped", reason: "already_refreshed", market_code: US_BENCHMARKS_MARKET_CODE, slot_key: slotKey };
  const run = await base44.asServiceRole.entities.IngestionRun.create({ run_type: "daily_refresh", market_code: US_BENCHMARKS_MARKET_CODE, slot_key: slotKey, slot_kind: "session_final", scheduled_for: now.toISOString(), lease_expires_at: new Date(now.getTime() + 3 * 60 * 1e3).toISOString(), started_at: now.toISOString(), total_records: catalog.length, success_count: 0, failed_count: 0, status: "running", source_id: source.id, notes: "Incremental daily candle refresh; historical years remain stored" });
  const syncRows = entityRows(await base44.asServiceRole.entities.HistoricalCandleSync.filter({ market_code: US_BENCHMARKS_MARKET_CODE, interval: "1d" }, "-completed_at", 500));
  const dailyWindows = new Map(catalog.map((instrument) => {
    const sync = syncRows.find((row) => row.instrument_id === instrument.id);
    return [instrument.symbol, incrementalProviderWindow(sync?.latest_bar_time, now, {
      overlapBars: 2,
      barIntervalMs: 24 * 60 * 60 * 1e3,
      maxIncrementalAgeMs: 45 * 24 * 60 * 60 * 1e3,
      bootstrapRange: "1mo"
    })];
  }));
  const dailyWindowSummary = summarizeProviderWindows(dailyWindows);
  const output = [];
  const failures = [];
  let cursor = 0;
  async function worker() {
    while (cursor < catalog.length) {
      const instrument = catalog[cursor++];
      const item2 = US_BENCHMARKS_CATALOG.instruments.find((value) => value.symbol === instrument.symbol);
      try {
        const recent = normalizeDaily(await fetchChart(item2.providerSymbol, "1d", dailyWindows.get(instrument.symbol)), clock.date, true);
        if (!recent.length) throw new Error("recent_daily_empty");
        const groups = /* @__PURE__ */ new Map();
        for (const bar of recent) {
          const year = bar.time.slice(0, 4);
          if (!groups.has(year)) groups.set(year, []);
          groups.get(year).push(bar);
        }
        let addedBars = 0;
        let latestBar = null;
        for (const [year, yearBars] of groups) {
          const key = `${US_BENCHMARKS_MARKET_CODE}:${instrument.symbol}:1d:history:${year}`;
          const existingChunks = entityRows(await base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, interval: "1d", chunk_key: key }, "-end_time", 5));
          const byDay = new Map([...existingChunks[0]?.bars || [], ...yearBars].map((bar) => [String(bar.time).slice(0, 10), bar]));
          const bars = [...byDay.values()].sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
          addedBars += Math.max(0, bars.length - Number(existingChunks[0]?.bar_count || 0));
          latestBar = !latestBar || Date.parse(bars.at(-1).time) > Date.parse(latestBar.time) ? bars.at(-1) : latestBar;
          const chunk = { instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, symbol: instrument.symbol, interval: "1d", chunk_key: key, start_time: bars[0].time, end_time: bars.at(-1).time, bars, bar_count: bars.length, checksum: await digest(bars), source_id: source.id, run_id: run.id, snapshot_version: await digest(yearBars), provider_as_of: bars.at(-1).time, received_time: (/* @__PURE__ */ new Date()).toISOString(), quality_status: "verified", canonical_version: "us-benchmarks-daily-v3", is_final: true, bucket_count: bars.length, completeness_status: "complete", is_historical_archive: true, adjustment_mode: "none", history_from: bars[0].time.slice(0, 10), history_to: bars.at(-1).time.slice(0, 10) };
          await upsertEntityRows(base44, "CandleChunk", [chunk], ["instrument_id", "interval", "chunk_key"], { instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, interval: "1d" });
        }
        const sync = syncRows.find((row) => row.instrument_id === instrument.id);
        if (sync && latestBar) await base44.asServiceRole.entities.HistoricalCandleSync.update(sync.id, { latest_bar_time: latestBar.time, requested_to: clock.date, bar_count: Number(sync.bar_count || 0) + addedBars, checksum: await digest([sync.checksum || "", recent]), last_attempt_at: (/* @__PURE__ */ new Date()).toISOString(), completed_at: (/* @__PURE__ */ new Date()).toISOString(), status: "complete", coverage_verified: true, provider_partial: false, run_id: run.id });
        output.push({ symbol: instrument.symbol, bars: recent.length });
      } catch (error) {
        failures.push({ symbol: instrument.symbol, error: String(error?.message || "daily_refresh_failed") });
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, () => worker()));
  const coverage = output.length / catalog.length * 100;
  const status = coverage >= 99 ? "success" : coverage >= 95 ? "partial" : "failed";
  await base44.asServiceRole.entities.IngestionRun.update(run.id, { status, finished_at: (/* @__PURE__ */ new Date()).toISOString(), success_count: output.length, failed_count: failures.length, coverage_percent: coverage, provider_as_of: output.length ? now.toISOString() : null, notes: `${JSON.stringify(failures).slice(0, 700)};windows:${JSON.stringify(dailyWindowSummary)}`.slice(0, 1e3) });
  return { status, market_code: US_BENCHMARKS_MARKET_CODE, run_id: run.id, accepted: output.length, rejected: failures.length, coverage_percent: coverage, failures, provider_windows: dailyWindowSummary };
}
async function historical(base44, catalog, source, body) {
  const syncRows = entityRows(await base44.asServiceRole.entities.HistoricalCandleSync.filter({ market_code: US_BENCHMARKS_MARKET_CODE, interval: "1d" }, "-completed_at", 500));
  const completed = new Set(syncRows.filter((row) => row.status === "complete" && row.coverage_verified === true && Number(row.bar_count || 0) >= 1e3).map((row) => row.instrument_id));
  const requested = Array.isArray(body.symbols) ? new Set(body.symbols.map((symbol) => String(symbol).toUpperCase())) : null;
  const pending = catalog.filter((instrument) => (body.force === true || !completed.has(instrument.id)) && (!requested || requested.has(instrument.symbol))).slice(0, Math.min(10, Math.max(1, Number(body.batch_size) || 6)));
  if (!pending.length) return { status: "complete", market_code: US_BENCHMARKS_MARKET_CODE, reason: "no_pending_instruments" };
  const run = await base44.asServiceRole.entities.IngestionRun.create({ run_type: "historical_backfill", market_code: US_BENCHMARKS_MARKET_CODE, slot_key: `${US_BENCHMARKS_MARKET_CODE}:history:${Date.now()}`, slot_kind: "historical_backfill", scheduled_for: (/* @__PURE__ */ new Date()).toISOString(), started_at: (/* @__PURE__ */ new Date()).toISOString(), total_records: pending.length, success_count: 0, failed_count: 0, status: "running", source_id: source.id, notes: "phased daily history bootstrap" });
  const results = [];
  for (const instrument of pending) {
    const item2 = US_BENCHMARKS_CATALOG.instruments.find((value) => value.symbol === instrument.symbol);
    try {
      const bars = normalizeDaily(await fetchChart(item2.providerSymbol, "1d", "full"), nyClock().date);
      if (bars.length < 250) throw new Error("daily_history_incomplete");
      const groups = /* @__PURE__ */ new Map();
      for (const bar of bars) {
        const year = bar.time.slice(0, 4);
        if (!groups.has(year)) groups.set(year, []);
        groups.get(year).push(bar);
      }
      const chunks = [];
      for (const [year, yearBars] of groups) chunks.push({ instrument_id: instrument.id, market_code: US_BENCHMARKS_MARKET_CODE, symbol: instrument.symbol, interval: "1d", chunk_key: `${US_BENCHMARKS_MARKET_CODE}:${instrument.symbol}:1d:history:${year}`, start_time: yearBars[0].time, end_time: yearBars.at(-1).time, bars: yearBars, bar_count: yearBars.length, checksum: await digest(yearBars), source_id: source.id, run_id: run.id, snapshot_version: await digest(bars), provider_as_of: yearBars.at(-1).time, received_time: (/* @__PURE__ */ new Date()).toISOString(), quality_status: "verified", canonical_version: "us-benchmarks-daily-v1", is_final: true, bucket_count: yearBars.length, completeness_status: "complete", is_historical_archive: true, adjustment_mode: "none", history_from: bars[0].time.slice(0, 10), history_to: bars.at(-1).time.slice(0, 10) });
      await upsertEntityRows(base44, "CandleChunk", chunks, ["instrument_id", "interval", "chunk_key"], { instrument_id: instrument.id, interval: "1d" });
      const existing = syncRows.find((row) => row.instrument_id === instrument.id);
      const sync = { instrument_id: instrument.id, symbol: instrument.symbol, market_code: US_BENCHMARKS_MARKET_CODE, provider_code: US_BENCHMARKS_PROVIDER_CODE, interval: "1d", status: "complete", requested_from: bars[0].time.slice(0, 10), requested_to: nyClock().date, earliest_bar_time: bars[0].time, latest_bar_time: bars.at(-1).time, bar_count: bars.length, year_chunk_count: groups.size, checksum: await digest(bars), adjustment_mode: "provider_ohlcv", provider_partial: false, provider_first_trade_time: bars[0].time, coverage_verified: true, source_id: source.id, run_id: run.id, last_attempt_at: (/* @__PURE__ */ new Date()).toISOString(), completed_at: (/* @__PURE__ */ new Date()).toISOString() };
      if (existing) await base44.asServiceRole.entities.HistoricalCandleSync.update(existing.id, sync);
      else await base44.asServiceRole.entities.HistoricalCandleSync.create(sync);
      results.push({ symbol: instrument.symbol, status: "complete", bar_count: bars.length });
    } catch (error) {
      results.push({ symbol: instrument.symbol, status: "failed", error: String(error?.message || "history_failed") });
    }
  }
  const success = results.filter((result) => result.status === "complete").length;
  const status = success === pending.length ? "success" : success ? "partial" : "failed";
  await base44.asServiceRole.entities.IngestionRun.update(run.id, { status, finished_at: (/* @__PURE__ */ new Date()).toISOString(), success_count: success, failed_count: pending.length - success, coverage_percent: success / pending.length * 100, notes: JSON.stringify(results).slice(0, 1e3) });
  return { status, market_code: US_BENCHMARKS_MARKET_CODE, run_id: run.id, results };
}
async function source_default(req) {
  try {
    const base44 = createClientFromRequest(req);
    const requestBody = await readJsonBody(req);
    const body = { ...requestBody, ...requestBody.args || {} };
    if (body.session_id) await requirePermission(base44, body.session_id, "data.ingestion.run");
    else await requireTrustedOwner(base44);
    if (String(body.market_code || US_BENCHMARKS_MARKET_CODE) !== US_BENCHMARKS_MARKET_CODE) throw Object.assign(new Error("Wrong market"), { status: 400, code: "MARKET_MISMATCH" });
    const now = /* @__PURE__ */ new Date();
    const { source, instruments } = await ensureCatalog(base44, now);
    await expireStaleRuns(base44, now);
    if (body.action === "catalog_status") return Response.json({ status: "ready", market_code: US_BENCHMARKS_MARKET_CODE, instruments: instruments.length });
    if (body.action === "history") return Response.json(await historical(base44, instruments, source, body));
    if (body.action === "daily_refresh") return Response.json(await refreshRecentDaily(base44, instruments, source, now));
    if (body.action === "intraday_history") {
      const pending = await pendingIntradayArchiveInstruments(base44, instruments, body.batch_size);
      if (!pending.length) return Response.json({ status: "complete", market_code: US_BENCHMARKS_MARKET_CODE, reason: "intraday_archive_already_complete", instruments: instruments.length });
      return Response.json(await incremental(base44, pending, source, now, { range: "1mo", writeQuotes: false, force: body.force === true }));
    }
    if (body.action === "data_status") {
      const instrumentIds = new Set(instruments.map((instrument) => instrument.id));
      const [quotes, intraday, history, signals] = await Promise.all([
        base44.asServiceRole.entities.QuoteLatest.filter({ market_code: US_BENCHMARKS_MARKET_CODE }, "-provider_as_of", 500),
        base44.asServiceRole.entities.CandleChunk.filter({ market_code: US_BENCHMARKS_MARKET_CODE, interval: "15m" }, "-end_time", 2e3),
        base44.asServiceRole.entities.HistoricalCandleSync.filter({ market_code: US_BENCHMARKS_MARKET_CODE, interval: "1d" }, "-completed_at", 500),
        base44.asServiceRole.entities.IndicatorSnapshot.filter({ market_code: US_BENCHMARKS_MARKET_CODE, indicator_key: "technical_signals" }, "-source_as_of", 500)
      ]);
      const count = (values, predicate) => new Set(entityRows(values).filter((item2) => instrumentIds.has(item2.instrument_id) && predicate(item2)).map((item2) => item2.instrument_id)).size;
      const signalCoverage = Object.fromEntries(["1d", "1wk", "1mo"].map((timeframe) => [timeframe, count(signals, (item2) => item2.timeframe === timeframe)]));
      return Response.json({ status: "ready", market_code: US_BENCHMARKS_MARKET_CODE, expected_instruments: instruments.length, quote_instrument_count: count(quotes, (item2) => Number(item2.last_price) > 0 && item2.quality_status !== "quarantined"), intraday_instrument_count: count(intraday, (item2) => Array.isArray(item2.bars) && item2.bars.length > 0 && item2.quality_status !== "quarantined"), daily_history_instrument_count: count(history, (item2) => item2.status === "complete" && item2.coverage_verified === true && item2.provider_partial !== true), signal_instrument_count: signalCoverage });
    }
    const clock = nyClock(now);
    const minute = clock.hour * 60 + clock.minute;
    const session = await sessionDecision(base44, clock);
    if (body.force !== true && (!session.tradingDay || minute < 600 || minute > session.closeMinute + 30)) return Response.json({ status: "skipped", reason: session.tradingDay ? "outside_ingestion_window" : session.reason, market_code: US_BENCHMARKS_MARKET_CODE });
    return Response.json(await incremental(base44, instruments, source, now, { closeMinute: session.closeMinute }));
  } catch (error) {
    return replyError(error);
  }
}
export {
  source_default as default
};
