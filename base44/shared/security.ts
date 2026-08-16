import { LEGACY_ROLE_PERMISSIONS, PERMISSION_CATALOG } from "./permissions.ts";

const MAX_JSON_BODY_BYTES = 256 * 1024;
const SESSION_TOKEN_PREFIX = "smart_investor1";
export const MARKET_ACCESS = {
  SA_MAIN: { entitlement: "market.saudi", name_ar: "السوق السعودية الرئيسية", name_en: "Saudi Main Market", currency: "SAR" },
  US_OPTIONS: { entitlement: "market.us.options", name_ar: "شركات عقود الخيارات", name_en: "U.S. Optionable Companies", currency: "USD" },
  US_BENCHMARKS: { entitlement: "market.us.benchmarks", name_ar: "المؤشرات والصناديق الأمريكية", name_en: "U.S. Indices & ETFs", currency: "USD" },
};

export async function sha256(value) {
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

export function createSessionToken(sessionId, secret) {
  return `${SESSION_TOKEN_PREFIX}.${sessionId}.${secret}`;
}

function parseSessionToken(value) {
  const parts = String(value || "").split(".");
  if (parts.length !== 3 || parts[0] !== SESSION_TOKEN_PREFIX || !parts[1] || !parts[2]) return null;
  if (!/^[A-Za-z0-9_-]{16,160}$/.test(parts[1]) || !/^[A-Fa-f0-9-]{32,160}$/.test(parts[2])) return null;
  return { sessionId: parts[1], secret: parts[2] };
}

export async function readJsonBody(req, maxBytes = MAX_JSON_BODY_BYTES) {
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

export async function requireUser(base44) {
  const user = await base44.auth.me();
  if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return user;
}

export async function requireAdminUser(base44) {
  const user = await requireUser(base44);
  if (user.role !== "admin") {
    throw Object.assign(new Error("Forbidden"), { status: 403, code: "PERMISSION_DENIED" });
  }
  return user;
}

export async function requireTrustedOwner(base44) {
  const user = await requireAdminUser(base44);
  const profile = await profileFor(base44, user);
  if (!hasTrustedOwnerMarker(user, profile)) {
    throw Object.assign(new Error("Forbidden"), { status: 403, code: "OWNER_REQUIRED" });
  }
  return { user, profile, role: "owner" };
}

export async function profileFor(base44, user) {
  const rows = await base44.asServiceRole.entities.CustomerProfile.filter({ auth_user_id: user.id });
  return rows[0] || null;
}

export function hasTrustedOwnerMarker(user, profile) {
  return user?.role === "admin"
    && profile?.acquisition_source === "platform_owner_bootstrap"
    && Array.isArray(profile?.tags)
    && profile.tags.includes("owner");
}

export function resolvedRole(user, profile) {
  return hasTrustedOwnerMarker(user, profile) ? "owner" : (profile?.role || user?.role);
}

/**
 * Base44's built-in admin role is a hosting identity, not an application role.
 * Application administration must already be granted in CustomerProfile. The
 * only reconciliation retained here is the explicitly bootstrapped owner
 * marker used by this app; no missing profile is created and no pending
 * profile is activated implicitly.
 */
export async function ensureAdministrativeProfile(base44, user) {
  let profile = await profileFor(base44, user);
  if (!profile || user?.role !== "admin") return profile;

  const owner = hasTrustedOwnerMarker(user, profile);
  if (owner && (profile.role !== "owner" || profile.account_status !== "active")) {
    const now = new Date().toISOString();
    profile = await base44.asServiceRole.entities.CustomerProfile.update(profile.id, {
      role: "owner",
      account_status: "active",
      email_verified_at: profile.email_verified_at || now,
      last_seen_at: now,
    });
    await audit(base44, user.id, "customer.owner_reconciled", "CustomerProfile", profile.id, "success");
  }
  return profile;
}

export async function requireRole(base44, roles) {
  const user = await requireUser(base44);
  const profile = await profileFor(base44, user);
  const role = resolvedRole(user, profile);
  if (!roles.includes(role)) throw Object.assign(new Error("Forbidden"), { status: 403 });
  return { user, profile, role };
}

export async function requireActiveSession(base44, profile, sessionId) {
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
  if (!session
    || session.customer_id !== profile.id
    || session.revoked_at
    || new Date(session.expires_at) <= new Date()
    || !fixedTimeEqual(presentedHash, session.session_hash)) {
    throw Object.assign(new Error("Active device session required"), { status: 403 });
  }
  const now = Date.now();
  const lastSeen = new Date(session.last_seen_at || 0).getTime();
  if (!Number.isFinite(lastSeen) || now - lastSeen >= 5 * 60 * 1000) {
    await base44.asServiceRole.entities.ActiveDeviceSession.update(session.id, { last_seen_at: new Date(now).toISOString() });
  }
  return session;
}

export function replyError(error) {
  const status = Number(error?.status) || 500;
  if (status >= 500) console.error("SMART_INVESTOR backend error", error);
  return Response.json({
    error: status >= 500 ? "Backend operation failed" : (error?.message || "Request failed"),
    code: error?.code || (status >= 500 ? "BACKEND_FAILURE" : "REQUEST_FAILED"),
  }, { status });
}

export async function audit(base44, userId, action, entityType, entityId, result, reason = "", before = {}, after = {}) {
  return await base44.asServiceRole.entities.AuditLog.create({
    actor_user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId || "system",
    reason,
    before: before && typeof before === "object" ? before : {},
    after: after && typeof after === "object" ? after : {},
    result,
    ip_hash: "not_collected",
  });
}

export async function ensurePersonalAccount(base44, profile, userId) {
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
      revision: 1,
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
      revision: 1,
    });
  }
  return { account, membership };
}

async function assignedPermissions(base44, membership) {
  const assignments = await base44.asServiceRole.entities.MemberRoleAssignment.filter({ member_id: membership.id, status: "active" });
  const codes = new Set();
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
  const subscriptions = [...new Map([...accountSubscriptions, ...customerSubscriptions]
    .filter((item) => !item.ends_at || new Date(item.ends_at).getTime() > now)
    .map((item) => [item.id, item])).values()];
  if (!subscriptions.length) return { subscription: null, subscriptions: [], plan: null, plans: [], entitlements: [], marketAccess: [] };
  const planIds = [...new Set(subscriptions.map((item) => item.plan_id).filter(Boolean))];
  const plans = (await Promise.all(planIds.map(async (planId) => {
    try { return await base44.asServiceRole.entities.SubscriptionPlan.get(planId); } catch { return null; }
  }))).filter(Boolean);
  const entitlementGroups = await Promise.all(planIds.map((planId) =>
    base44.asServiceRole.entities.PlanEntitlement.filter({ plan_id: planId, enabled: true })
  ));
  const entitlementsByCode = new Map();
  entitlementGroups.flat().forEach((item) => {
    const current = entitlementsByCode.get(item.code);
    if (!current || Number(item.limit_value || 0) > Number(current.limit_value || 0)) entitlementsByCode.set(item.code, item);
  });
  const entitlements = [...entitlementsByCode.values()];
  const marketCodes = new Set();
  // Resolve access per subscribed plan, then union the results. This preserves
  // a legacy Saudi subscription when the same account also buys U.S. access.
  entitlementGroups.forEach((group, index) => {
    const codes = new Set(group.map((item) => item.code));
    const explicitMarkets = [...codes].filter((code) => code.startsWith("market."));
    if (codes.has("market.us.options")) marketCodes.add("US_OPTIONS");
    if (codes.has("market.us.benchmarks")) marketCodes.add("US_BENCHMARKS");
    if ([...codes].some((code) => ["market.saudi", "market.saudi.delayed", "market.saudi.realtime"].includes(code))) marketCodes.add("SA_MAIN");
    // Fail closed for plans without market entitlements. Only explicitly named
    // legacy trial plans retain their original single-market mapping.
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
    plan: plans.find((item) => item.id === subscriptions[0]?.plan_id) || null,
    plans,
    entitlements,
    marketAccess,
  };
}

export function marketAccessForContext(context) {
  if (context?.role === "owner" || context?.permissions?.has?.("data.operations.read")) {
    return Object.entries(MARKET_ACCESS).map(([market_code, value]) => ({ market_code, ...value }));
  }
  return Array.isArray(context?.marketAccess) ? context.marketAccess : [];
}

export function requireMarketEntitlement(context, requestedMarketCode) {
  const marketCode = String(requestedMarketCode || "").trim().toUpperCase();
  if (!MARKET_ACCESS[marketCode]) {
    throw Object.assign(new Error("Unsupported market"), { status: 400, code: "UNSUPPORTED_MARKET" });
  }
  const allowed = marketAccessForContext(context).some((item) => item.market_code === marketCode);
  if (!allowed) {
    throw Object.assign(new Error("Market subscription required"), { status: 403, code: "MARKET_SUBSCRIPTION_REQUIRED" });
  }
  return marketCode;
}

export async function authorizationContext(base44, sessionId) {
  const user = await requireUser(base44);
  // Existing Base44 administrators can hold a stale customer role from before
  // the administration model was deployed. Reconcile that trusted platform
  // identity on every authorization boundary so an already-open session does
  // not lose owner operations or market visibility until the next login.
  const profile = await ensureAdministrativeProfile(base44, user);
  if (!profile) throw Object.assign(new Error("Profile not found"), { status: 404, code: "PROFILE_NOT_FOUND" });
  await requireActiveSession(base44, profile, sessionId);
  const role = resolvedRole(user, profile);
  const { account, membership } = await ensurePersonalAccount(base44, profile, user.id);
  const assigned = await assignedPermissions(base44, membership);
  const ownerOnlyCodes = new Set(PERMISSION_CATALOG.filter((permission) => permission.owner_only).map((permission) => permission.code));
  const permissions = role === "owner"
    ? new Set(PERMISSION_CATALOG.map((permission) => permission.code))
    : new Set([...(LEGACY_ROLE_PERMISSIONS[role] || []), ...assigned.codes].filter((code) => !ownerOnlyCodes.has(code)));
  const subscription = await subscriptionContext(base44, profile, account);
  return {
    user,
    profile,
    role,
    account,
    membership,
    roles: assigned.roles,
    permissions,
    ...subscription,
  };
}

export async function requirePermission(base44, sessionId, permissionCode) {
  const context = await authorizationContext(base44, sessionId);
  if (!context.permissions.has(permissionCode)) {
    throw Object.assign(new Error("Forbidden"), { status: 403, code: "PERMISSION_DENIED" });
  }
  return context;
}
