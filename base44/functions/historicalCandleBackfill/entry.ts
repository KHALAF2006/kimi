// GENERATED from historicalCandleBackfill/source.ts. Do not edit directly.

// base44/functions/historicalCandleBackfill/source.ts
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// base44/shared/permissions.ts
var PERMISSION_CATALOG = [
  { code: "dashboard.owner.read", group_code: "dashboard", name_ar: "\u0639\u0631\u0636 \u0644\u0648\u062D\u0629 \u0627\u0644\u0645\u0627\u0644\u0643", name_en: "View owner dashboard", sensitive: true, owner_only: false },
  { code: "customers.masked.read", group_code: "customers", name_ar: "\u0639\u0631\u0636 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u0642\u0646\u0651\u0639\u0629", name_en: "View masked customer data", sensitive: false, owner_only: false },
  { code: "customers.full.read", group_code: "customers", name_ar: "\u0639\u0631\u0636 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0643\u0627\u0645\u0644\u0629", name_en: "View full customer data", sensitive: true, owner_only: false },
  { code: "customers.status.manage", group_code: "customers", name_ar: "\u0625\u062F\u0627\u0631\u0629 \u062D\u0627\u0644\u0629 \u0627\u0644\u0639\u0645\u064A\u0644", name_en: "Manage customer status", sensitive: true, owner_only: false },
  { code: "customers.sessions.revoke", group_code: "customers", name_ar: "\u0625\u0644\u063A\u0627\u0621 \u062C\u0644\u0633\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621", name_en: "Revoke customer sessions", sensitive: true, owner_only: false },
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
  US_OPTIONS: { entitlement: "market.us.options", name_ar: "\u0634\u0631\u0643\u0627\u062A \u0639\u0642\u0648\u062F \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A", name_en: "U.S. Optionable Companies", currency: "USD" }
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
var PROVIDER_FRESHNESS_GRACE_SECONDS = 5 * 60;
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
var RIYADH_TIMEZONE = "Asia/Riyadh";
var SAUDI_CANDLE_OPTIONS = Object.freeze({ timeZone: "Asia/Riyadh", sessionStartMinutes: 600, weekStartsOn: 0 });
function marketClockParts(value, timeZone) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}
function candleBucket(value, interval, options = SAUDI_CANDLE_OPTIONS) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const resolved = { ...SAUDI_CANDLE_OPTIONS, ...options };
  if (interval === "15m") return `quarter:${Math.floor(time / (15 * 60 * 1e3))}`;
  if (["1h", "2h", "3h", "4h"].includes(interval)) {
    const hours = Number(interval.slice(0, -1));
    const parts2 = marketClockParts(new Date(time), resolved.timeZone);
    const dateKey2 = `${parts2.year}-${parts2.month}-${parts2.day}`;
    const minuteOfDay = Number(parts2.hour) % 24 * 60 + Number(parts2.minute);
    const sessionMinute = minuteOfDay - resolved.sessionStartMinutes;
    if (sessionMinute < 0) return "";
    return `${interval}:${dateKey2}:${Math.floor(sessionMinute / (hours * 60))}`;
  }
  const parts = marketClockParts(new Date(time), resolved.timeZone);
  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  if (interval === "1d") return `day:${dateKey}`;
  if (interval === "1mo") return `month:${dateKey.slice(0, 7)}`;
  if (interval === "1wk") {
    const start = /* @__PURE__ */ new Date(`${dateKey}T00:00:00.000Z`);
    const daysSinceStart = (start.getUTCDay() - resolved.weekStartsOn + 7) % 7;
    start.setUTCDate(start.getUTCDate() - daysSinceStart);
    return `week:${start.toISOString().slice(0, 10)}`;
  }
  return "";
}
function normalizedCandleBar(bar) {
  const time = new Date(bar?.time).getTime();
  const open = positiveNumber(bar?.open);
  const high = positiveNumber(bar?.high);
  const low = positiveNumber(bar?.low);
  const close = positiveNumber(bar?.close);
  const volume = nonNegativeNumber(bar?.volume);
  if (!Number.isFinite(time) || [open, high, low, close].some((value) => value === null) || high < Math.max(open, close) || low > Math.min(open, close)) return null;
  return {
    time: new Date(time).toISOString(),
    open,
    high,
    low,
    close,
    volume
  };
}
function mergeStoredCandleSeries(series, requestedInterval, options = SAUDI_CANDLE_OPTIONS) {
  const intervalPriority = /* @__PURE__ */ new Map();
  const storedIntervals = [];
  const normalizedSeries = [];
  for (const candidateSeries of Array.isArray(series) ? series : []) {
    const sourceInterval = String(candidateSeries?.interval || "");
    if (!sourceInterval || !Array.isArray(candidateSeries?.bars)) continue;
    if (!intervalPriority.has(sourceInterval)) {
      intervalPriority.set(sourceInterval, intervalPriority.size);
      storedIntervals.push(sourceInterval);
    }
    normalizedSeries.push({
      interval: sourceInterval,
      bars: candidateSeries.bars,
      rank: intervalPriority.get(sourceInterval)
    });
  }
  function materialize(candidateSeries, bucketInterval) {
    const grouped = /* @__PURE__ */ new Map();
    const sourceBars = candidateSeries.interval === "15m" ? canonicalizeQuarterHourBars(candidateSeries.bars) : candidateSeries.bars;
    for (const rawBar of sourceBars) {
      const bar = normalizedCandleBar(rawBar);
      if (!bar) continue;
      const bucket = candleBucket(bar.time, bucketInterval, options);
      if (!bucket) continue;
      const current = grouped.get(bucket);
      if (!current) {
        grouped.set(bucket, {
          ...bar,
          source_end: bar.time,
          source_interval: candidateSeries.interval,
          source_rank: candidateSeries.rank
        });
        continue;
      }
      current.high = Math.max(current.high, bar.high);
      current.low = Math.min(current.low, bar.low);
      current.close = bar.close;
      current.volume += bar.volume;
      current.source_end = bar.time;
    }
    return [...grouped.values()];
  }
  function mergeByBucket(bars, bucketInterval) {
    const merged = /* @__PURE__ */ new Map();
    for (const bar of bars) {
      const bucket = candleBucket(bar.time, bucketInterval, options);
      if (!bucket) continue;
      const current = merged.get(bucket);
      const candidateEnd = new Date(bar.source_end).getTime();
      const currentEnd = new Date(current?.source_end || 0).getTime();
      if (!current || bar.source_rank < current.source_rank || bar.source_rank === current.source_rank && candidateEnd >= currentEnd) {
        merged.set(bucket, bar);
      }
    }
    return [...merged.values()].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }
  function aggregateMaterialized(bars, bucketInterval) {
    const grouped = /* @__PURE__ */ new Map();
    for (const bar of bars) {
      const bucket = candleBucket(bar.time, bucketInterval, options);
      if (!bucket) continue;
      const current = grouped.get(bucket);
      if (!current) {
        grouped.set(bucket, { ...bar, source_rank: Number.MAX_SAFE_INTEGER });
        continue;
      }
      current.high = Math.max(current.high, bar.high);
      current.low = Math.min(current.low, bar.low);
      current.close = bar.close;
      current.volume += bar.volume;
      current.source_end = bar.source_end;
    }
    return [...grouped.values()];
  }
  let ordered;
  if (requestedInterval === "1wk" || requestedInterval === "1mo") {
    const direct = normalizedSeries.filter((candidateSeries) => candidateSeries.interval === requestedInterval).flatMap((candidateSeries) => materialize(candidateSeries, requestedInterval));
    const dailyInputs = normalizedSeries.filter((candidateSeries) => candidateSeries.interval !== requestedInterval).flatMap((candidateSeries) => materialize(candidateSeries, "1d"));
    const mergedDaily = mergeByBucket(dailyInputs, "1d");
    const derived = aggregateMaterialized(mergedDaily, requestedInterval);
    ordered = mergeByBucket([...direct, ...derived], requestedInterval);
  } else {
    const materialized = normalizedSeries.flatMap((candidateSeries) => materialize(candidateSeries, requestedInterval));
    ordered = mergeByBucket(materialized, requestedInterval);
  }
  const latestSourceTime = ordered.map((bar) => bar.source_end).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()).at(-1) || null;
  return {
    bars: ordered.map(({ source_end: _sourceEnd, source_interval: _sourceInterval, source_rank: _sourceRank, ...bar }) => bar),
    storedIntervals,
    latestSourceTime
  };
}
function finiteNumber(value) {
  if (value === null || value === void 0 || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function positiveNumber(value) {
  const parsed = finiteNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}
function nonNegativeNumber(value, fallback = 0) {
  const parsed = finiteNumber(value);
  return parsed !== null && parsed >= 0 ? parsed : fallback;
}
function riyadhClock(now = /* @__PURE__ */ new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: RIYADH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}
var QUARTER_HOUR_MILLISECONDS = 15 * 60 * 1e3;
function canonicalizeQuarterHourBars(bars) {
  const byBucket = /* @__PURE__ */ new Map();
  for (const rawBar of Array.isArray(bars) ? bars : []) {
    const bar = normalizedCandleBar(rawBar);
    if (!bar) continue;
    const rawTime = new Date(bar.time).getTime();
    const bucketTime = Math.floor(rawTime / QUARTER_HOUR_MILLISECONDS) * QUARTER_HOUR_MILLISECONDS;
    const exactGridTime = rawTime === bucketTime;
    const current = byBucket.get(bucketTime);
    if (current && (current.exactGridTime && !exactGridTime || current.exactGridTime === exactGridTime && current.rawTime > rawTime)) continue;
    const bucketDate = new Date(bucketTime);
    byBucket.set(bucketTime, {
      bar: {
        ...bar,
        time: bucketDate.toISOString(),
        session_date: rawBar?.session_date || riyadhClock(bucketDate).date
      },
      exactGridTime,
      rawTime
    });
  }
  return [...byBucket.values()].sort((a, b) => new Date(a.bar.time).getTime() - new Date(b.bar.time).getTime()).map(({ bar }) => bar);
}

// base44/functions/historicalCandleBackfill/source.ts
var MARKET_CODE = "SA_MAIN";
var YAHOO_PROVIDER_CODE = "YAHOO_PUBLIC_HISTORICAL_DAILY";
var YAHOO_BASE_URL = "https://query1.finance.yahoo.com";
var DEFAULT_FROM = "1985-01-01";
var BATCH_SIZE = 10;
var BATCH_CONCURRENCY = 3;
var PROVIDER_CONCURRENCY = 2;
var MAX_INSTRUMENTS_PER_RUN = 90;
var REQUEST_TIMEOUT_MS = 2e4;
var TASI_INSTRUMENT = {
  symbol: "TASI",
  market_code: MARKET_CODE,
  instrument_code: "TASI",
  instrument_type: "market_index",
  composite_key: `${MARKET_CODE}:TASI`,
  name_ar: "\u0645\u0624\u0634\u0631 \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 (\u062A\u0627\u0633\u064A)",
  name_en: "Tadawul All Share Index (TASI)",
  sector_ar: "\u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0633\u0648\u0642",
  sector_en: "Market Indices",
  market: "Saudi Main Market",
  currency: "SAR",
  status: "active",
  official_url: "https://www.saudiexchange.sa/wps/portal/saudiexchange/rules-guidance/indices?locale=ar"
};
function rows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}
function dateOnly(value = /* @__PURE__ */ new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}
function latestExpectedTradingDate(value) {
  const date = /* @__PURE__ */ new Date(`${value}T12:00:00.000Z`);
  while ([5, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
async function ensureTasiInstrument(base44) {
  const existing = rows(await base44.asServiceRole.entities.Instrument.filter({
    market_code: MARKET_CODE,
    instrument_code: TASI_INSTRUMENT.instrument_code
  }))[0] || null;
  return existing ? await base44.asServiceRole.entities.Instrument.update(existing.id, TASI_INSTRUMENT) : await base44.asServiceRole.entities.Instrument.create(TASI_INSTRUMENT);
}
async function archiveStatus(base44, requestedSymbols) {
  const instruments = rows(await base44.asServiceRole.entities.Instrument.list("symbol", 500)).filter((instrument) => instrument.market_code === MARKET_CODE && instrument.status !== "delisted");
  const syncRows = rows(await base44.asServiceRole.entities.HistoricalCandleSync.filter({ market_code: MARKET_CODE, interval: "1d" }, "symbol", 500));
  const preferredSymbols = Array.isArray(requestedSymbols) ? [...new Set(requestedSymbols.map(String).filter((symbol) => /^\d{4}$/.test(symbol)))].slice(0, 10) : ["1010", "1111", "1211", "1321", "2010", "2222", "4001", "4323"];
  const samples = [];
  for (const symbol of preferredSymbols) {
    const instrument = instruments.find((item) => item.symbol === symbol);
    if (!instrument) continue;
    const chunks = rows(await base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: instrument.id, interval: "1d" }, "start_time", 500)).filter((chunk) => chunk.quality_status !== "quarantined" && Array.isArray(chunk.bars));
    const daily = mergeStoredCandleSeries([{ interval: "1d", bars: chunks.flatMap((chunk) => chunk.bars) }], "1d").bars;
    const weekly = mergeStoredCandleSeries([{ interval: "1d", bars: daily }], "1wk").bars;
    const monthly = mergeStoredCandleSeries([{ interval: "1d", bars: daily }], "1mo").bars;
    const sync = syncRows.find((item) => item.instrument_id === instrument.id) || null;
    samples.push({
      symbol,
      status: sync?.status || "not_started",
      coverage_verified: sync?.coverage_verified === true,
      daily_bars: daily.length,
      weekly_bars: weekly.length,
      monthly_bars: monthly.length,
      first_daily: daily[0]?.time || null,
      last_daily: daily.at(-1)?.time || null
    });
  }
  return {
    instruments: instruments.length,
    complete: syncRows.filter((item) => item.status === "complete").length,
    partial: syncRows.filter((item) => item.status === "partial").length,
    failed: syncRows.filter((item) => item.status === "failed").length,
    stored_daily_bars: syncRows.reduce((sum, item) => sum + Number(item.bar_count || 0), 0),
    samples
  };
}
function validateDate(value, fallback) {
  const text = String(value || fallback);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(`${text}T00:00:00.000Z`))) {
    throw Object.assign(new Error("Historical date must use YYYY-MM-DD"), { status: 400, code: "INVALID_HISTORY_DATE" });
  }
  return text;
}
async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, "0")).join("");
}
async function upsertUnique(base44, entityName, values, existing, keyFor) {
  const unique = new Map(values.map((value) => [keyFor(value), value]));
  const existingByKey = new Map(existing.map((value) => [keyFor(value), value]));
  const creates = [];
  const updates = [];
  for (const [key, value] of unique) {
    const current = existingByKey.get(key);
    if (current) updates.push({ id: current.id, ...value });
    else creates.push(value);
  }
  if (creates.length) await base44.asServiceRole.entities[entityName].bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities[entityName].bulkUpdate(updates);
  return { created: creates.length, updated: updates.length };
}
async function fetchYahooHistorical(symbol, from, to, baseUrl) {
  const start = Math.floor((/* @__PURE__ */ new Date(`${from}T00:00:00.000Z`)).getTime() / 1e3);
  const end = Math.floor(((/* @__PURE__ */ new Date(`${to}T00:00:00.000Z`)).getTime() + 24 * 60 * 60 * 1e3) / 1e3);
  const providerSymbol = symbol === "TASI" ? "^TASI.SR" : `${symbol}.SR`;
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/v8/finance/chart/${encodeURIComponent(providerSymbol)}`);
  url.searchParams.set("period1", String(start));
  url.searchParams.set("period2", String(end));
  url.searchParams.set("interval", "1d");
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,splits");
  url.searchParams.set("includeAdjustedClose", "true");
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "KMY-Historical-Archive/1.0" },
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const code = String(payload?.chart?.error?.code || `HTTP_${response.status}`);
        throw Object.assign(new Error(String(payload?.chart?.error?.description || `Historical source returned ${response.status}`)), { code });
      }
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || Object.assign(new Error("Historical source request failed"), { code: "HISTORY_PROVIDER_FAILED" });
}
function historyProvider() {
  return {
    code: YAHOO_PROVIDER_CODE,
    name: "Public Saudi daily OHLCV archive",
    baseUrl: YAHOO_BASE_URL,
    sourceType: "reference",
    licenseStatus: "approved",
    adjustmentMode: "provider_ohlcv",
    canonicalVersion: "trusted-daily-ohlcv-v2",
    fetch: (symbol, from, to) => fetchYahooHistorical(symbol, from, to, YAHOO_BASE_URL),
    normalize: normalizeYahooHistoricalBars
  };
}
async function ensureSource(base44, provider) {
  const existing = rows(await base44.asServiceRole.entities.DataSource.filter({ code: provider.code }))[0] || null;
  const values = {
    name: provider.name,
    market_code: MARKET_CODE,
    quote_mode: "end_of_day",
    delay_seconds: 0,
    public_enabled: false,
    source_type: provider.sourceType,
    license_status: provider.licenseStatus,
    base_url: provider.baseUrl,
    last_verified_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  return existing ? await base44.asServiceRole.entities.DataSource.update(existing.id, values) : await base44.asServiceRole.entities.DataSource.create({ code: provider.code, ...values });
}
async function persistInstrumentHistory(base44, instrument, options) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const currentSync = rows(await base44.asServiceRole.entities.HistoricalCandleSync.filter({
    instrument_id: instrument.id,
    provider_code: options.provider.code,
    interval: "1d"
  }))[0] || null;
  const currentCoverageComplete = currentSync?.status === "complete" && currentSync.coverage_verified === true && currentSync.provider_partial !== true && String(currentSync.latest_bar_time || "").slice(0, 10) >= latestExpectedTradingDate(options.to);
  if (currentCoverageComplete && options.force !== true) {
    return { symbol: instrument.symbol, status: "skipped", reason: "history_already_complete", bar_count: currentSync.bar_count || 0 };
  }
  const syncBase = {
    instrument_id: instrument.id,
    symbol: instrument.symbol,
    market_code: MARKET_CODE,
    provider_code: options.provider.code,
    interval: "1d",
    requested_from: options.from,
    requested_to: options.to,
    bar_count: Number(currentSync?.bar_count || 0),
    adjustment_mode: options.provider.adjustmentMode,
    source_id: options.sourceId,
    run_id: options.runId,
    last_attempt_at: now
  };
  const sync = currentSync ? await base44.asServiceRole.entities.HistoricalCandleSync.update(currentSync.id, { ...syncBase, status: "running", failure_code: "", failure_message: "" }) : await base44.asServiceRole.entities.HistoricalCandleSync.create({ ...syncBase, status: "running" });
  try {
    const payload = await options.provider.fetch(instrument.symbol, options.from, options.to);
    const normalized = options.provider.normalize(payload, options.from, options.to);
    if (normalized.providerPartial) {
      throw Object.assign(new Error("Historical provider marked the requested dataset as partial"), { code: "HISTORY_PARTIAL" });
    }
    const bars = normalized.bars;
    const years = groupHistoricalBarsByYear(bars);
    const checksum = await digest(bars);
    const existingChunks = rows(await base44.asServiceRole.entities.CandleChunk.filter({
      instrument_id: instrument.id,
      interval: "1d",
      canonical_version: options.provider.canonicalVersion
    }));
    const chunkRows = [];
    for (const [year, yearBars] of years) {
      chunkRows.push({
        instrument_id: instrument.id,
        symbol: instrument.symbol,
        interval: "1d",
        chunk_key: `${instrument.symbol}-1d-history-${year}`,
        start_time: yearBars[0].time,
        end_time: yearBars.at(-1)?.time,
        bars: yearBars,
        bar_count: yearBars.length,
        checksum: await digest(yearBars),
        source_id: options.sourceId,
        run_id: options.runId,
        snapshot_version: checksum,
        provider_as_of: yearBars.at(-1)?.time,
        received_time: now,
        quality_status: "verified",
        canonical_version: options.provider.canonicalVersion,
        is_final: true,
        bucket_count: yearBars.length,
        completeness_status: "complete",
        is_historical_archive: true,
        adjustment_mode: options.provider.adjustmentMode,
        history_from: options.from,
        history_to: options.to
      });
    }
    const persisted = await upsertUnique(
      base44,
      "CandleChunk",
      chunkRows,
      existingChunks,
      (row) => `${row.instrument_id}:${row.interval}:${row.chunk_key}`
    );
    await base44.asServiceRole.entities.HistoricalCandleSync.update(sync.id, {
      ...syncBase,
      status: "complete",
      earliest_bar_time: bars[0].time,
      latest_bar_time: bars.at(-1)?.time,
      bar_count: bars.length,
      year_chunk_count: years.size,
      checksum,
      provider_partial: false,
      provider_first_trade_time: normalized.firstTradeTime || bars[0].time,
      coverage_verified: true,
      failure_message: normalized.rejectedCount || normalized.duplicateCount ? `Validated with ${normalized.rejectedCount} rejected and ${normalized.duplicateCount} duplicate rows` : "",
      completed_at: (/* @__PURE__ */ new Date()).toISOString(),
      failure_code: ""
    });
    return { symbol: instrument.symbol, status: "complete", bar_count: bars.length, year_chunk_count: years.size, ...persisted };
  } catch (error) {
    const preserveVerifiedArchive = currentSync?.status === "complete" && currentSync.coverage_verified === true && currentSync.provider_partial !== true;
    await base44.asServiceRole.entities.HistoricalCandleSync.update(sync.id, {
      ...syncBase,
      status: preserveVerifiedArchive ? "complete" : error?.code === "HISTORY_PARTIAL" ? "partial" : "failed",
      provider_partial: preserveVerifiedArchive ? false : error?.code === "HISTORY_PARTIAL",
      coverage_verified: preserveVerifiedArchive,
      failure_code: String(error?.code || "HISTORY_PROVIDER_FAILED"),
      failure_message: String(error?.message || "Historical synchronization failed").slice(0, 500)
    });
    return { symbol: instrument.symbol, status: "failed", error: String(error?.code || error?.message || "HISTORY_PROVIDER_FAILED") };
  }
}
async function processBatch(base44, instrumentIds, options) {
  const instruments = rows(await base44.asServiceRole.entities.Instrument.filter({ id: { $in: instrumentIds } }, "symbol", BATCH_SIZE)).filter((instrument) => instrument.market_code === MARKET_CODE && instrument.status !== "delisted");
  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < instruments.length) {
      const instrument = instruments[cursor];
      cursor += 1;
      results.push(await persistInstrumentHistory(base44, instrument, options));
    }
  }
  await Promise.all(Array.from({ length: Math.min(PROVIDER_CONCURRENCY, instruments.length) }, () => worker()));
  return {
    results,
    completed: results.filter((item) => item.status === "complete").length,
    skipped: results.filter((item) => item.status === "skipped").length,
    failed: results.filter((item) => item.status === "failed").length
  };
}
Deno.serve(async (req) => {
  let base44 = null;
  let run = null;
  try {
    base44 = createClientFromRequest(req);
    const requestBody = await readJsonBody(req);
    const body = { ...requestBody, ...requestBody.args || {} };
    if (body.session_id) await requirePermission(base44, body.session_id, "data.ingestion.run");
    else await requireTrustedOwner(base44);
    await ensureTasiInstrument(base44);
    const provider = historyProvider();
    const from = validateDate(body.from, DEFAULT_FROM);
    const to = validateDate(body.to, dateOnly());
    if (from > to) throw Object.assign(new Error("Historical start date must not follow the end date"), { status: 400, code: "INVALID_HISTORY_RANGE" });
    if (body.mode === "history_batch") {
      const instrumentIds = Array.isArray(body.instrument_ids) ? [...new Set(body.instrument_ids.map(String).filter(Boolean))].slice(0, BATCH_SIZE) : [];
      if (!instrumentIds.length) throw Object.assign(new Error("instrument_ids are required"), { status: 400 });
      return Response.json(await processBatch(base44, instrumentIds, {
        provider,
        from,
        to,
        sourceId: String(body.source_id),
        runId: String(body.run_id),
        force: body.force === true,
        session_id: body.session_id || void 0
      }));
    }
    if (body.mode === "status") return Response.json(await archiveStatus(base44, body.symbols));
    const source = await ensureSource(base44, provider);
    const instruments = rows(await base44.asServiceRole.entities.Instrument.list("symbol", 500)).filter((instrument) => instrument.market_code === MARKET_CODE && instrument.status !== "delisted").sort((left, right) => String(left.symbol).localeCompare(String(right.symbol), "en"));
    const existingSync = rows(await base44.asServiceRole.entities.HistoricalCandleSync.filter({
      market_code: MARKET_CODE,
      provider_code: provider.code,
      interval: "1d"
    }));
    const completeIds = new Set(existingSync.filter((item) => item.status === "complete" && item.coverage_verified === true && item.provider_partial !== true && String(item.latest_bar_time || "").slice(0, 10) >= latestExpectedTradingDate(to)).map((item) => item.instrument_id));
    const requestedSymbols = Array.isArray(body.symbols) ? new Set(body.symbols.map((value) => String(value || "").trim().toUpperCase()).filter(Boolean)) : null;
    const eligible = requestedSymbols?.size ? instruments.filter((instrument) => requestedSymbols.has(String(instrument.symbol).toUpperCase())) : instruments;
    const allPending = body.force === true ? eligible : eligible.filter((instrument) => !completeIds.has(instrument.id));
    if (!allPending.length) {
      return Response.json({ status: "skipped", reason: "all_history_already_complete", instruments: instruments.length, completed: completeIds.size });
    }
    const pending = allPending.slice(0, MAX_INSTRUMENTS_PER_RUN);
    const startedAt = (/* @__PURE__ */ new Date()).toISOString();
    run = await base44.asServiceRole.entities.IngestionRun.create({
      run_type: "historical_backfill",
      market_code: MARKET_CODE,
      slot_key: `historical-backfill:${provider.code}:${from}:${to}`,
      slot_kind: "historical_backfill",
      scheduled_for: startedAt,
      lease_expires_at: new Date(Date.now() + 5 * 60 * 1e3).toISOString(),
      started_at: startedAt,
      total_records: pending.length,
      success_count: 0,
      failed_count: pending.length,
      status: "running",
      source_id: source.id,
      notes: JSON.stringify({ provider_code: provider.code, from, to, stored_once: true })
    });
    const batches = [];
    for (let offset = 0; offset < pending.length; offset += BATCH_SIZE) {
      batches.push(pending.slice(offset, offset + BATCH_SIZE).map((instrument) => instrument.id));
    }
    const batchResults = [];
    const batchFailures = [];
    for (let offset = 0; offset < batches.length; offset += BATCH_CONCURRENCY) {
      const group = batches.slice(offset, offset + BATCH_CONCURRENCY);
      const settled = await Promise.allSettled(group.map((instrumentIds) => base44.asServiceRole.functions.invoke("historicalCandleBackfill", {
        mode: "history_batch",
        instrument_ids: instrumentIds,
        source_id: source.id,
        run_id: run.id,
        from,
        to,
        force: body.force === true
      })));
      settled.forEach((result, index) => {
        if (result.status === "fulfilled") batchResults.push(result.value?.data || result.value || {});
        else batchFailures.push({ instrument_ids: group[index], error: result.reason?.response?.data?.error || result.reason?.message || "history_batch_failed" });
      });
    }
    const completed = batchResults.reduce((sum, item) => sum + Number(item.completed || 0) + Number(item.skipped || 0), 0);
    const failed = Math.max(0, pending.length - completed);
    const finishedAt = (/* @__PURE__ */ new Date()).toISOString();
    const status = failed === 0 ? "success" : completed > 0 ? "partial" : "failed";
    await base44.asServiceRole.entities.IngestionRun.update(run.id, {
      finished_at: finishedAt,
      success_count: completed,
      failed_count: failed,
      coverage_percent: pending.length ? completed / pending.length * 100 : 100,
      status,
      promoted_at: completed ? finishedAt : void 0,
      notes: JSON.stringify({ provider_code: provider.code, from, to, stored_once: true, batch_count: batches.length, batch_failures: batchFailures })
    });
    return Response.json({
      status,
      run_id: run.id,
      provider_code: provider.code,
      requested: pending.length,
      completed,
      failed,
      already_complete: completeIds.size,
      total_instruments: instruments.length,
      remaining_instruments: Math.max(0, allPending.length - pending.length + failed),
      from,
      to
    });
  } catch (error) {
    if (base44 && run?.id) {
      try {
        await base44.asServiceRole.entities.IngestionRun.update(run.id, {
          status: "failed",
          finished_at: (/* @__PURE__ */ new Date()).toISOString(),
          failure_code: String(error?.code || "HISTORICAL_BACKFILL_FAILED"),
          notes: String(error?.message || "Historical backfill failed").slice(0, 500)
        });
      } catch {
      }
    }
    return replyError(error);
  }
});
