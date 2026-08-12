// GENERATED from usOptionsHistoricalBackfill/source.ts. Do not edit directly.

// base44/functions/usOptionsHistoricalBackfill/source.ts
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
  const digest2 = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest2), (item) => item.toString(16).padStart(2, "0")).join("");
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

// base44/shared/market-data.ts
var SAUDI_DELAY_SECONDS = 15 * 60;
var MARKET_REFRESH_CADENCE_SECONDS = 60 * 60;
var INGESTION_PROCESSING_GRACE_SECONDS = 10 * 60;
var PROVIDER_FRESHNESS_GRACE_SECONDS = MARKET_REFRESH_CADENCE_SECONDS + INGESTION_PROCESSING_GRACE_SECONDS;
var EXPERIMENTAL_SOURCE_MAX_AGE_SECONDS = 60 * 60;
var PUBLIC_CANDLE_OVERLAP_MILLISECONDS = 15 * 60 * 1e3;
var PUBLIC_CANDLE_MAX_INCREMENTAL_LOOKBACK_MILLISECONDS = 8 * 24 * 60 * 60 * 1e3;
function historicalProviderDateTime(value) {
  const date = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = /* @__PURE__ */ new Date(`${date}T07:00:00.000Z`);
  return Number.isFinite(time.getTime()) ? time.toISOString() : null;
}
function yahooHistoricalDateTime(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const instant = new Date(seconds * 1e3);
  if (!Number.isFinite(instant.getTime())) return null;
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(instant);
  return historicalProviderDateTime(date);
}
function normalizeYahooHistoricalBars(payload, requestedFrom, requestedTo) {
  const chartError = payload?.chart?.error;
  if (chartError) {
    throw Object.assign(new Error(String(chartError.description || chartError.code || "Historical source returned an error")), {
      code: String(chartError.code || "HISTORY_PROVIDER_FAILED")
    });
  }
  const result = payload?.chart?.result?.[0];
  if (!result || String(result?.meta?.dataGranularity || "1d") !== "1d") {
    throw Object.assign(new Error("Historical source returned a non-daily dataset"), { code: "HISTORY_INTERVAL_MISMATCH" });
  }
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0] || {};
  const opens = Array.isArray(quote.open) ? quote.open : [];
  const highs = Array.isArray(quote.high) ? quote.high : [];
  const lows = Array.isArray(quote.low) ? quote.low : [];
  const closes = Array.isArray(quote.close) ? quote.close : [];
  const volumes = Array.isArray(quote.volume) ? quote.volume : [];
  const byTime = /* @__PURE__ */ new Map();
  let duplicateCount = 0;
  let rejectedCount = 0;
  for (let index = 0; index < timestamps.length; index += 1) {
    const time = yahooHistoricalDateTime(timestamps[index]);
    const bar = {
      time,
      open: Number(opens[index]),
      high: Number(highs[index]),
      low: Number(lows[index]),
      close: Number(closes[index]),
      volume: Math.max(0, Number(volumes[index] || 0))
    };
    const date = String(time || "").slice(0, 10);
    if (!time || ![bar.open, bar.high, bar.low, bar.close, bar.volume].every(Number.isFinite) || bar.open <= 0 || bar.high <= 0 || bar.low <= 0 || bar.close <= 0 || bar.high < Math.max(bar.open, bar.close) || bar.low > Math.min(bar.open, bar.close) || date < requestedFrom || date > requestedTo) {
      rejectedCount += 1;
      continue;
    }
    if (byTime.has(time)) duplicateCount += 1;
    byTime.set(time, bar);
  }
  const bars = [...byTime.values()].sort((left, right) => String(left.time).localeCompare(String(right.time)));
  if (!bars.length) {
    throw Object.assign(new Error("Historical source returned no valid daily candles"), { code: "HISTORY_EMPTY" });
  }
  const firstTradeTime = yahooHistoricalDateTime(result?.meta?.firstTradeDate);
  const firstTradeDate = firstTradeTime ? new Date(firstTradeTime).getTime() : null;
  const firstBarDate = new Date(bars[0].time).getTime();
  const providerPartial = Number.isFinite(firstTradeDate) && firstBarDate > firstTradeDate + 21 * 24 * 60 * 60 * 1e3;
  return {
    bars,
    providerPartial,
    duplicateCount,
    rejectedCount,
    firstTradeTime,
    exchangeTimezone: String(result?.meta?.exchangeTimezoneName || "")
  };
}
function groupHistoricalBarsByYear(bars) {
  const grouped = /* @__PURE__ */ new Map();
  for (const bar of Array.isArray(bars) ? bars : []) {
    const year = String(bar.time || "").slice(0, 4);
    if (!/^\d{4}$/.test(year)) continue;
    if (!grouped.has(year)) grouped.set(year, []);
    grouped.get(year).push(bar);
  }
  return grouped;
}
var MARKET_AUTOMATION_SPECS = Object.freeze([
  { name: "saudi_t15_1015_1045_riyadh", cron: "15,30,45 7 * * 0-4", slotKind: "quarter_hour", active: false },
  { name: "saudi_t15_1100_1445_riyadh", cron: "0,15,30,45 8-11 * * 0-4", slotKind: "quarter_hour", active: false },
  { name: "saudi_t15_1500_1515_riyadh", cron: "0,15 12 * * 0-4", slotKind: "quarter_hour", active: false },
  { name: "saudi_close_price_1526_riyadh", cron: "26 12 * * 0-4", slotKind: "close_price", active: false },
  { name: "saudi_session_final_1536_riyadh", cron: "36 12 * * 0-4", slotKind: "session_final", active: false }
]);
var SAUDI_CANDLE_OPTIONS = Object.freeze({ timeZone: "Asia/Riyadh", sessionStartMinutes: 600, weekStartsOn: 0 });
var QUARTER_HOUR_MILLISECONDS = 15 * 60 * 1e3;

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

// base44/functions/usOptionsHistoricalBackfill/source.ts
var PROVIDER_CODE = "YAHOO_US_OPTIONS_HISTORICAL_DAILY";
var BASE_URL = "https://query1.finance.yahoo.com";
var DEFAULT_FROM = "1970-01-01";
var DEFAULT_BATCH_SIZE = 10;
var MAX_BATCH_SIZE = 15;
function rows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}
async function ensureCatalog(base44) {
  const marketRows = rows(await base44.asServiceRole.entities.Market.filter({ market_code: US_OPTIONS_MARKET_CODE }));
  if (marketRows[0]) await base44.asServiceRole.entities.Market.update(marketRows[0].id, US_OPTIONS_CATALOG.market);
  else await base44.asServiceRole.entities.Market.create(US_OPTIONS_CATALOG.market);
  const existing = rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_OPTIONS_MARKET_CODE }));
  const byCompositeKey = new Map(existing.map((item) => [item.composite_key, item]));
  const creates = [];
  const updates = [];
  for (const company of US_OPTIONS_CATALOG.companies) {
    const payload = {
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
    const current = byCompositeKey.get(payload.composite_key);
    if (current) updates.push({ id: current.id, ...payload });
    else creates.push(payload);
  }
  if (creates.length) await base44.asServiceRole.entities.Instrument.bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities.Instrument.bulkUpdate(updates);
  const persisted = rows(await base44.asServiceRole.entities.Instrument.filter({ market_code: US_OPTIONS_MARKET_CODE }));
  const allowed = new Set(US_OPTIONS_CATALOG.companies.map((item) => item.symbol));
  const active = persisted.filter((item) => item.status !== "delisted" && allowed.has(item.symbol));
  if (active.length !== US_OPTIONS_CATALOG.companies.length) {
    throw Object.assign(new Error(`U.S. options catalog incomplete: ${active.length}/${US_OPTIONS_CATALOG.companies.length}`), { status: 503, code: "US_OPTIONS_CATALOG_INCOMPLETE" });
  }
  return active;
}
function marketClock(value = /* @__PURE__ */ new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) % 24 * 60 + Number(parts.minute) };
}
async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, "0")).join("");
}
async function fetchHistorical(symbol, from, to) {
  const period1 = Math.floor(Date.parse(`${from}T00:00:00.000Z`) / 1e3);
  const period2 = Math.floor((Date.parse(`${to}T00:00:00.000Z`) + 864e5) / 1e3);
  const url = new URL(`${BASE_URL}/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set("period1", String(period1));
  url.searchParams.set("period2", String(period2));
  url.searchParams.set("interval", "1d");
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,splits");
  url.searchParams.set("includeAdjustedClose", "true");
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2e4);
    try {
      const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "KMY-US-Historical-Archive/1.0" }, signal: controller.signal });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.chart?.result?.[0]) throw Object.assign(new Error(payload?.chart?.error?.description || `provider_http_${response.status}`), { code: payload?.chart?.error?.code || "HISTORY_PROVIDER_FAILED" });
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}
async function ensureSource(base44) {
  const existing = rows(await base44.asServiceRole.entities.DataSource.filter({ code: PROVIDER_CODE }))[0] || null;
  const data = {
    name: "U.S. optionable companies daily OHLCV archive",
    market_code: US_OPTIONS_MARKET_CODE,
    quote_mode: "end_of_day",
    delay_seconds: 0,
    public_enabled: false,
    source_type: "reference",
    license_status: "restricted",
    base_url: BASE_URL,
    last_verified_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  return existing ? await base44.asServiceRole.entities.DataSource.update(existing.id, data) : await base44.asServiceRole.entities.DataSource.create({ code: PROVIDER_CODE, ...data });
}
async function upsertChunks(base44, values, existing) {
  const key = (row) => `${row.instrument_id}:${row.interval}:${row.chunk_key}`;
  const byKey = new Map(existing.map((row) => [key(row), row]));
  const unique = [...new Map(values.map((row) => [key(row), row])).values()];
  const creates = unique.filter((row) => !byKey.has(key(row)));
  const updates = unique.filter((row) => byKey.has(key(row))).map((row) => ({ id: byKey.get(key(row)).id, ...row }));
  if (creates.length) await base44.asServiceRole.entities.CandleChunk.bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities.CandleChunk.bulkUpdate(updates);
  return { created: creates.length, updated: updates.length };
}
async function syncInstrument(base44, instrument, source, runId, from, to, force) {
  const existingSync = rows(await base44.asServiceRole.entities.HistoricalCandleSync.filter({ instrument_id: instrument.id, provider_code: PROVIDER_CODE, interval: "1d" }))[0] || null;
  if (existingSync?.status === "complete" && existingSync.coverage_verified === true && force !== true) return { symbol: instrument.symbol, status: "skipped", bar_count: existingSync.bar_count || 0 };
  const base = {
    instrument_id: instrument.id,
    symbol: instrument.symbol,
    market_code: US_OPTIONS_MARKET_CODE,
    provider_code: PROVIDER_CODE,
    interval: "1d",
    requested_from: from,
    requested_to: to,
    bar_count: Number(existingSync?.bar_count || 0),
    adjustment_mode: "provider_ohlcv",
    source_id: source.id,
    run_id: runId,
    last_attempt_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const sync = existingSync ? await base44.asServiceRole.entities.HistoricalCandleSync.update(existingSync.id, { ...base, status: "running", failure_code: "", failure_message: "" }) : await base44.asServiceRole.entities.HistoricalCandleSync.create({ ...base, status: "running" });
  try {
    const normalized = normalizeYahooHistoricalBars(await fetchHistorical(instrument.symbol, from, to), from, to);
    const clock = marketClock();
    const bars = normalized.bars.filter((bar) => String(bar.time).slice(0, 10) < clock.date || clock.minute >= 975);
    if (!bars.length || normalized.providerPartial) throw Object.assign(new Error("Historical source returned incomplete coverage"), { code: "HISTORY_PARTIAL" });
    const grouped = groupHistoricalBarsByYear(bars);
    const fullChecksum = await digest(bars);
    const existingChunks = rows(await base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: instrument.id, interval: "1d", canonical_version: "us-options-daily-ohlcv-v1" }));
    const chunks = [];
    for (const [year, yearBars] of grouped) chunks.push({
      instrument_id: instrument.id,
      market_code: US_OPTIONS_MARKET_CODE,
      symbol: instrument.symbol,
      interval: "1d",
      chunk_key: `${US_OPTIONS_MARKET_CODE}:${instrument.symbol}:1d:history:${year}`,
      start_time: yearBars[0].time,
      end_time: yearBars.at(-1).time,
      bars: yearBars,
      bar_count: yearBars.length,
      checksum: await digest(yearBars),
      source_id: source.id,
      run_id: runId,
      snapshot_version: fullChecksum,
      provider_as_of: yearBars.at(-1).time,
      received_time: (/* @__PURE__ */ new Date()).toISOString(),
      quality_status: "verified",
      canonical_version: "us-options-daily-ohlcv-v1",
      is_final: true,
      bucket_count: yearBars.length,
      completeness_status: "complete",
      is_historical_archive: true,
      adjustment_mode: "none",
      history_from: from,
      history_to: to
    });
    const persisted = await upsertChunks(base44, chunks, existingChunks);
    await base44.asServiceRole.entities.HistoricalCandleSync.update(sync.id, {
      ...base,
      status: "complete",
      earliest_bar_time: bars[0].time,
      latest_bar_time: bars.at(-1).time,
      bar_count: bars.length,
      year_chunk_count: grouped.size,
      checksum: fullChecksum,
      provider_partial: false,
      provider_first_trade_time: normalized.firstTradeTime || bars[0].time,
      coverage_verified: true,
      completed_at: (/* @__PURE__ */ new Date()).toISOString(),
      failure_code: "",
      failure_message: ""
    });
    return { symbol: instrument.symbol, status: "complete", bar_count: bars.length, year_chunk_count: grouped.size, ...persisted };
  } catch (error) {
    const preserve = existingSync?.status === "complete" && existingSync.coverage_verified === true;
    await base44.asServiceRole.entities.HistoricalCandleSync.update(sync.id, {
      ...base,
      status: preserve ? "complete" : error?.code === "HISTORY_PARTIAL" ? "partial" : "failed",
      provider_partial: preserve ? false : error?.code === "HISTORY_PARTIAL",
      coverage_verified: preserve,
      failure_code: String(error?.code || "HISTORY_PROVIDER_FAILED"),
      failure_message: String(error?.message || "Historical synchronization failed").slice(0, 500)
    });
    return { symbol: instrument.symbol, status: "failed", error: String(error?.code || error?.message || "HISTORY_PROVIDER_FAILED") };
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
    const catalogInstruments = await ensureCatalog(base44);
    const syncRows = rows(await base44.asServiceRole.entities.HistoricalCandleSync.filter({ market_code: US_OPTIONS_MARKET_CODE, interval: "1d" }));
    if (body.action === "status") return Response.json({
      market_code: US_OPTIONS_MARKET_CODE,
      instruments: US_OPTIONS_CATALOG.companies.length,
      complete: syncRows.filter((item) => item.status === "complete" && item.coverage_verified === true).length,
      partial: syncRows.filter((item) => item.status === "partial").length,
      failed: syncRows.filter((item) => item.status === "failed").length,
      stored_daily_bars: syncRows.reduce((sum, item) => sum + Number(item.bar_count || 0), 0)
    });
    const from = /^\d{4}-\d{2}-\d{2}$/.test(String(body.from || "")) ? String(body.from) : DEFAULT_FROM;
    const to = /^\d{4}-\d{2}-\d{2}$/.test(String(body.to || "")) ? String(body.to) : marketClock().date;
    const batchSize = Math.min(MAX_BATCH_SIZE, Math.max(1, Number(body.batch_size) || DEFAULT_BATCH_SIZE));
    const requested = Array.isArray(body.symbols) ? new Set(body.symbols.map((item) => String(item).toUpperCase())) : null;
    const completedIds = new Set(syncRows.filter((item) => item.status === "complete" && item.coverage_verified === true && body.force !== true).map((item) => item.instrument_id));
    const instruments = catalogInstruments.filter((item) => item.status !== "delisted" && (!requested || requested.has(item.symbol))).filter((item) => !completedIds.has(item.id)).slice(0, batchSize);
    if (!instruments.length) return Response.json({ status: "complete", reason: "no_pending_instruments", market_code: US_OPTIONS_MARKET_CODE });
    const source = await ensureSource(base44);
    run = await base44.asServiceRole.entities.IngestionRun.create({
      run_type: "historical_backfill",
      market_code: US_OPTIONS_MARKET_CODE,
      slot_key: `${US_OPTIONS_MARKET_CODE}:history:${Date.now()}`,
      slot_kind: "historical_backfill",
      scheduled_for: (/* @__PURE__ */ new Date()).toISOString(),
      lease_expires_at: new Date(Date.now() + 4 * 6e4).toISOString(),
      started_at: (/* @__PURE__ */ new Date()).toISOString(),
      total_records: instruments.length,
      success_count: 0,
      failed_count: 0,
      status: "running",
      source_id: source.id,
      notes: `range:${from}..${to}`
    });
    const results = [];
    let cursor = 0;
    async function worker() {
      while (cursor < instruments.length) {
        const instrument = instruments[cursor++];
        results.push(await syncInstrument(base44, instrument, source, run.id, from, to, body.force === true));
      }
    }
    await Promise.all(Array.from({ length: Math.min(3, instruments.length) }, () => worker()));
    const completed = results.filter((item) => ["complete", "skipped"].includes(item.status)).length;
    const status = completed === instruments.length ? "success" : completed ? "partial" : "failed";
    await base44.asServiceRole.entities.IngestionRun.update(run.id, {
      status,
      finished_at: (/* @__PURE__ */ new Date()).toISOString(),
      success_count: completed,
      failed_count: instruments.length - completed,
      coverage_percent: completed / instruments.length * 100,
      notes: JSON.stringify(results.map(({ symbol, status: status2, error }) => ({ symbol, status: status2, error }))).slice(0, 1e3)
    });
    return Response.json({ status, market_code: US_OPTIONS_MARKET_CODE, run_id: run.id, results });
  } catch (error) {
    if (base44 && run?.id) {
      try {
        await base44.asServiceRole.entities.IngestionRun.update(run.id, { status: "failed", finished_at: (/* @__PURE__ */ new Date()).toISOString(), failure_code: error?.code || "US_HISTORY_FAILED", notes: error?.message || "failed" });
      } catch {
      }
    }
    return replyError(error);
  }
});
