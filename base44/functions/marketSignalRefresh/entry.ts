// GENERATED from marketSignalRefresh/source.ts. Do not edit directly.

// base44/functions/marketSignalRefresh/source.ts
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// base44/shared/market-data.ts
var SAUDI_DELAY_SECONDS = 15 * 60;
var PROVIDER_FRESHNESS_GRACE_SECONDS = 5 * 60;
var EXPERIMENTAL_SOURCE_MAX_AGE_SECONDS = 60 * 60;
var PUBLIC_CANDLE_OVERLAP_MILLISECONDS = 15 * 60 * 1e3;
var PUBLIC_CANDLE_MAX_INCREMENTAL_LOOKBACK_MILLISECONDS = 8 * 24 * 60 * 60 * 1e3;
var MARKET_AUTOMATION_SPECS = Object.freeze([
  { name: "saudi_t15_1015_1045_riyadh", cron: "15,30,45 7 * * 0-4", slotKind: "quarter_hour", active: false },
  { name: "saudi_t15_1100_1445_riyadh", cron: "0,15,30,45 8-11 * * 0-4", slotKind: "quarter_hour", active: false },
  { name: "saudi_t15_1500_1515_riyadh", cron: "0,15 12 * * 0-4", slotKind: "quarter_hour", active: false },
  { name: "saudi_close_price_1526_riyadh", cron: "26 12 * * 0-4", slotKind: "close_price", active: false },
  { name: "saudi_session_final_1536_riyadh", cron: "36 12 * * 0-4", slotKind: "session_final", active: false }
]);
var RIYADH_TIMEZONE = "Asia/Riyadh";
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
async function requireUser(base44) {
  const user = await base44.auth.me();
  if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return user;
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
async function requireActiveSession(base44, profile, sessionId) {
  if (!profile || !sessionId) throw Object.assign(new Error("Active device session required"), { status: 403 });
  let session = null;
  try {
    session = await base44.asServiceRole.entities.ActiveDeviceSession.get(sessionId);
  } catch {
    session = null;
  }
  if (!session || session.customer_id !== profile.id || session.revoked_at || new Date(session.expires_at) <= /* @__PURE__ */ new Date()) throw Object.assign(new Error("Active device session required"), { status: 403 });
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
    ip_hash: "server-managed"
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
  const customerSubscriptions = accountSubscriptions.length ? [] : await base44.asServiceRole.entities.Subscription.filter({ customer_id: profile.id, status: "active" });
  const now = Date.now();
  const subscription = [...accountSubscriptions, ...customerSubscriptions].find((item) => !item.ends_at || new Date(item.ends_at).getTime() > now) || null;
  if (!subscription) return { subscription: null, plan: null, entitlements: [] };
  const plan = await base44.asServiceRole.entities.SubscriptionPlan.get(subscription.plan_id);
  const entitlements = await base44.asServiceRole.entities.PlanEntitlement.filter({ plan_id: subscription.plan_id, enabled: true });
  return { subscription, plan, entitlements };
}
async function authorizationContext(base44, sessionId) {
  const user = await requireUser(base44);
  const profile = await profileFor(base44, user);
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

// base44/shared/momentum.ts
var MOMENTUM_FORMULA_VERSION = "momentum-zones-v1";
var LOOKBACK_DAYS = 20;
var HISTORY_BARS = Number.POSITIVE_INFINITY;
var FIXED_STOP_PERCENT = 0.03;
var ZONE_DEFINITIONS = [
  { key: "zone1", nameAr: "\u0627\u0644\u0627\u0631\u062A\u062F\u0627\u062F", nameEn: "Rebound", colorNameAr: "\u0623\u062E\u0636\u0631", colorNameEn: "Green", light: "#16a34a", dark: "#22c55e", topPercent: 0.075, bottomPercent: 0.1 },
  { key: "zone2", nameAr: "\u0642\u0627\u0639 \u0623\u0633\u0628\u0648\u0639\u064A/\u0634\u0647\u0631\u064A", nameEn: "Weekly / Monthly Base", colorNameAr: "\u0628\u0631\u062A\u0642\u0627\u0644\u064A", colorNameEn: "Orange", light: "#d97706", dark: "#f59e0b", topPercent: 0.2, bottomPercent: 0.24 },
  { key: "zone3", nameAr: "\u0627\u0633\u062A\u062B\u0645\u0627\u0631 \u0645\u0646\u062E\u0641\u0636", nameEn: "Low-Risk Investment", colorNameAr: "\u0623\u0632\u0631\u0642", colorNameEn: "Blue", light: "#2563eb", dark: "#60a5fa", topPercent: 0.32, bottomPercent: 0.36 },
  { key: "zone4", nameAr: "\u0627\u0633\u062A\u062B\u0645\u0627\u0631 \u0631\u0628\u0639 \u0633\u0646\u0648\u064A", nameEn: "Quarterly Investment", colorNameAr: "\u0628\u0646\u0641\u0633\u062C\u064A", colorNameEn: "Purple", light: "#7c3aed", dark: "#a78bfa", topPercent: 0.48, bottomPercent: 0.52 },
  { key: "zone5", nameAr: "\u0627\u0633\u062A\u062B\u0645\u0627\u0631 \u0633\u0646\u0648\u064A", nameEn: "Annual Investment", colorNameAr: "\u0641\u064A\u0631\u0648\u0632\u064A", colorNameEn: "Teal", light: "#0d9488", dark: "#2dd4bf", topPercent: 0.58, bottomPercent: 0.65 }
];
function buildMomentumZones(referencePeak, zone4Active = false, zone5Active = false) {
  return ZONE_DEFINITIONS.map((definition, index) => {
    const top = referencePeak * (1 - definition.topPercent);
    const bottom = referencePeak * (1 - definition.bottomPercent);
    return {
      ...definition,
      top,
      bottom,
      stop: bottom * (1 - FIXED_STOP_PERCENT),
      active: index < 3 || index === 3 && zone4Active || index === 4 && zone5Active
    };
  });
}
function crossedUnder(current, threshold, previous, previousThreshold) {
  return previous !== null && previousThreshold !== null && current < threshold && previous >= previousThreshold;
}
function calculateMomentumZones(inputBars, lookbackDays = LOOKBACK_DAYS, historyBars = HISTORY_BARS) {
  const normalized = inputBars.map((bar) => ({
    time: String(bar.time || ""),
    high: Number(bar.high),
    close: Number(bar.close)
  })).filter((bar) => bar.time && Number.isFinite(bar.high) && Number.isFinite(bar.close) && bar.high > 0 && bar.close > 0).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  const finiteHistoryLimit = Number.isFinite(Number(historyBars)) ? Math.max(lookbackDays + 2, Math.round(Number(historyBars))) : normalized.length;
  const bars = normalized.slice(-finiteHistoryLimit);
  if (bars.length < 2) return null;
  let referencePeak = null;
  let referenceTime = null;
  let lastBrokenPeak = null;
  let zone4Active = false;
  let zone5Active = false;
  let previousClose = null;
  let previousZone3Stop = null;
  let previousZone4Stop = null;
  for (let index = 0; index < bars.length; index += 1) {
    let candidatePeak = null;
    let candidateTime = null;
    for (let offset = 1; offset <= lookbackDays; offset += 1) {
      const candidate = bars[index - offset];
      if (!candidate) continue;
      if (candidatePeak === null || candidate.high > candidatePeak) {
        candidatePeak = candidate.high;
        candidateTime = candidate.time;
      }
    }
    const bar = bars[index];
    if (referencePeak !== null && bar.high > referencePeak) {
      lastBrokenPeak = referencePeak;
      referencePeak = null;
      referenceTime = null;
      zone4Active = false;
      zone5Active = false;
    }
    if (referencePeak === null && candidatePeak !== null && (lastBrokenPeak === null || candidatePeak !== lastBrokenPeak)) {
      referencePeak = candidatePeak;
      referenceTime = candidateTime;
      zone4Active = false;
      zone5Active = false;
    }
    if (referencePeak !== null) {
      const zones = buildMomentumZones(referencePeak, zone4Active, zone5Active);
      if (crossedUnder(bar.close, zones[2].stop, previousClose, previousZone3Stop)) zone4Active = true;
      if (zone4Active && crossedUnder(bar.close, zones[3].stop, previousClose, previousZone4Stop)) zone5Active = true;
      previousZone3Stop = zones[2].stop;
      previousZone4Stop = zones[3].stop;
    } else {
      previousZone3Stop = null;
      previousZone4Stop = null;
    }
    previousClose = bar.close;
  }
  if (referencePeak === null) return null;
  return {
    referencePeak,
    referenceTime,
    lookbackDays,
    historyBars: bars.length,
    formulaVersion: MOMENTUM_FORMULA_VERSION,
    zone4Active,
    zone5Active,
    zones: buildMomentumZones(referencePeak, zone4Active, zone5Active)
  };
}

// base44/shared/technical-signals.ts
var TECHNICAL_SIGNAL_FORMULA_VERSION = "technical-signals-v3";
var TECHNICAL_SIGNAL_WINDOW_SIZE = 3;
function rounded(value) {
  return Number(value.toFixed(8));
}
function riyadhDate(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
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
function sundayWeekKey(dateString) {
  const date = /* @__PURE__ */ new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date.toISOString().slice(0, 10);
}
function bucketKeyForInterval(time, interval) {
  const date = riyadhDate(time);
  if (interval === "1wk") return sundayWeekKey(date);
  if (interval === "1mo") return date.slice(0, 7);
  return date;
}
function aggregateTechnicalBars(inputBars, interval) {
  const groups = /* @__PURE__ */ new Map();
  for (const bar of normalizeTechnicalBars(inputBars)) {
    const key = bucketKeyForInterval(bar.time, interval);
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
    matches: bodyRatio <= 0.35 && lowerWick >= Math.max(body * 2, range * 0.5) && upperWickRatio <= 0.2 && closeLocation >= 0.65,
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
    matches: bodyRatio <= 0.35 && upperWick >= Math.max(body * 2, range * 0.5) && lowerWickRatio <= 0.2 && closeLocation <= 0.35,
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
  return new Map(values.map((item) => [item.time, item.value]));
}
function calculateTechnicalSnapshot(bars) {
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
  const momentum = calculateMomentumZones(bars);
  const matchingZone = pinBar.bullish.matches && last && momentum?.zones ? momentum.zones.find((zone) => zone.active && last.low <= zone.top && last.high >= zone.bottom && last.close >= zone.bottom) || null : null;
  return {
    bar_count: bars.length,
    candle_time: last?.time || null,
    close: last?.close ?? null,
    sma20: currentSma20,
    sma50: currentSma50,
    pin_bar: pinBar,
    pin_bar_signal: pinBar.matches,
    engulfing,
    engulfing_signal: engulfing.matches,
    bullish_engulfing: engulfing.direction === "bullish",
    bearish_engulfing: engulfing.direction === "bearish",
    zone_pin_bar: Boolean(matchingZone),
    matching_zone: matchingZone ? {
      key: matchingZone.key,
      name_ar: matchingZone.nameAr,
      name_en: matchingZone.nameEn,
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
function calculateTechnicalSignals(inputBars, windowSize = TECHNICAL_SIGNAL_WINDOW_SIZE) {
  const bars = normalizeTechnicalBars(inputBars);
  if (!bars.length) return {
    ...calculateTechnicalSnapshot([]),
    signal_window_size: 0,
    signal_window: []
  };
  const size = Math.max(1, Math.min(Math.round(Number(windowSize) || TECHNICAL_SIGNAL_WINDOW_SIZE), bars.length));
  const signalWindow = [];
  for (let offset = 0; offset < size; offset += 1) {
    const end = bars.length - offset;
    signalWindow.push({
      offset,
      ...calculateTechnicalSnapshot(bars.slice(0, end))
    });
  }
  return {
    ...signalWindow[0],
    signal_window_size: size,
    signal_window: signalWindow
  };
}

// base44/functions/marketSignalRefresh/source.ts
var CANONICAL_VERSION = "candle-projection-v1";
var MARKET_CODE = "SA_MAIN";
var BATCH_SIZE = 500;
var PROJECTION_BATCH_SIZE = 24;
var PROJECTION_CONCURRENCY = 3;
function entityRows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}
function riyadhDate2(value = /* @__PURE__ */ new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}
async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, "0")).join("");
}
async function inBatches(rows, operation) {
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    await operation(rows.slice(offset, offset + BATCH_SIZE));
  }
}
function rowKey(row, fields) {
  return fields.map((field) => String(row[field] ?? "")).join("|");
}
async function upsertRows(base44, entity, rows, existing, keyFields) {
  const unique = new Map(rows.map((row) => [rowKey(row, keyFields), row]));
  const existingByKey = new Map(existing.map((row) => [rowKey(row, keyFields), row]));
  const creates = [];
  const updates = [];
  for (const [key, row] of unique) {
    const current = existingByKey.get(key);
    if (current) updates.push({ id: current.id, ...row });
    else creates.push(row);
  }
  await inBatches(creates, (batch) => base44.asServiceRole.entities[entity].bulkCreate(batch));
  await inBatches(updates, (batch) => base44.asServiceRole.entities[entity].bulkUpdate(batch));
  return { created: creates.length, updated: updates.length };
}
function quoteIsFinalForSession(quote, sessionDate) {
  return Boolean(
    quote && quote.session_date === sessionDate && quote.quality_status === "verified" && quote.is_final === true
  );
}
function isThursday(sessionDate) {
  return (/* @__PURE__ */ new Date(`${sessionDate}T00:00:00.000Z`)).getUTCDay() === 4;
}
function finalDailyBar(bars, quote) {
  const canonical = canonicalizeQuarterHourBars(bars);
  if (!canonical.length) return null;
  const first = canonical[0];
  const last = canonical.at(-1);
  const open = Number(quote.open) > 0 ? Number(quote.open) : Number(first.open);
  const close = Number(quote.last_price) > 0 ? Number(quote.last_price) : Number(last.close);
  const high = Math.max(Number(quote.high) || 0, ...canonical.map((bar) => Number(bar.high)), open, close);
  const lowCandidates = [Number(quote.low), ...canonical.map((bar) => Number(bar.low)), open, close].filter((value) => value > 0);
  const low = Math.min(...lowCandidates);
  return {
    time: first.time,
    open,
    high,
    low,
    close,
    volume: Math.max(0, Number(quote.volume || 0))
  };
}
function barsByInstrument(chunks, interval) {
  const grouped = /* @__PURE__ */ new Map();
  for (const chunk of chunks) {
    if (chunk.interval !== interval || chunk.quality_status === "quarantined") continue;
    if (!grouped.has(chunk.instrument_id)) grouped.set(chunk.instrument_id, []);
    grouped.get(chunk.instrument_id)?.push(...Array.isArray(chunk.bars) ? chunk.bars : []);
  }
  return grouped;
}
function isLastSaudiTradingWeekdayOfMonth(sessionDate) {
  const current = /* @__PURE__ */ new Date(`${sessionDate}T00:00:00.000Z`);
  const month = current.getUTCMonth();
  const next = new Date(current);
  do {
    next.setUTCDate(next.getUTCDate() + 1);
  } while ([5, 6].includes(next.getUTCDay()));
  return next.getUTCMonth() !== month;
}
function firstByInstrument(rows) {
  const result = /* @__PURE__ */ new Map();
  for (const row of rows) {
    if (row.instrument_id && !result.has(row.instrument_id)) result.set(row.instrument_id, row);
  }
  return result;
}
async function projectionChunk({
  instrument,
  interval,
  chunkKey,
  bars,
  source,
  sessionDate,
  isFinal
}) {
  const normalized = normalizeTechnicalBars(bars);
  return {
    instrument_id: instrument.id,
    symbol: instrument.symbol,
    interval,
    chunk_key: chunkKey,
    ...sessionDate ? { session_date: sessionDate } : {},
    start_time: normalized[0].time,
    end_time: normalized.at(-1)?.time,
    bars: normalized,
    bar_count: normalized.length,
    checksum: await digest(normalized),
    source_id: source?.source_id || "canonical-projection",
    run_id: source?.run_id || `projection-${Date.now()}`,
    snapshot_version: source?.snapshot_version || `projection-${Date.now()}`,
    provider_as_of: source?.provider_as_of || normalized.at(-1)?.time,
    received_time: (/* @__PURE__ */ new Date()).toISOString(),
    quality_status: "verified",
    canonical_version: CANONICAL_VERSION,
    is_final: isFinal,
    bucket_count: normalized.length,
    completeness_status: normalized.length >= 50 ? "complete" : "degraded"
  };
}
async function projectInstrumentBatch(base44, instrumentIds, sessionDate) {
  const idQuery = { $in: instrumentIds };
  const [instrumentsRaw, quotesRaw, chunksRaw, snapshotsRaw] = await Promise.all([
    base44.asServiceRole.entities.Instrument.filter({ id: idQuery }, "symbol", PROJECTION_BATCH_SIZE),
    base44.asServiceRole.entities.QuoteLatest.filter({ instrument_id: idQuery }, "-updated_date", PROJECTION_BATCH_SIZE * 3),
    base44.asServiceRole.entities.CandleChunk.filter({ instrument_id: idQuery }, "-end_time", 1200),
    base44.asServiceRole.entities.IndicatorSnapshot.filter({ instrument_id: idQuery }, "-source_as_of", PROJECTION_BATCH_SIZE * 12)
  ]);
  const instruments = entityRows(instrumentsRaw).filter((item) => item.market_code === MARKET_CODE && item.status !== "delisted").sort((left, right) => String(left.symbol).localeCompare(String(right.symbol), "en"));
  const quotes = entityRows(quotesRaw);
  const chunks = entityRows(chunksRaw);
  const snapshots = entityRows(snapshotsRaw);
  const quoteByInstrument = firstByInstrument(quotes);
  const latestSourceByInstrument = /* @__PURE__ */ new Map();
  for (const chunk of [...chunks].sort((left, right) => Date.parse(left.end_time || 0) - Date.parse(right.end_time || 0))) {
    if (chunk.quality_status !== "quarantined") latestSourceByInstrument.set(chunk.instrument_id, chunk);
  }
  const quarterBars = barsByInstrument(
    chunks.filter((chunk) => chunk.session_date === sessionDate || String(chunk.chunk_key || "").endsWith(`-${sessionDate}`)),
    "15m"
  );
  const intradayHistory = barsByInstrument(chunks, "15m");
  const dailyHistory = barsByInstrument(chunks, "1d");
  const newDailyChunks = [];
  const higherTimeframeChunks = [];
  const indicatorRows = [];
  const skipped = [];
  for (const instrument of instruments) {
    const quote = quoteByInstrument.get(instrument.id) || null;
    const dailyFromStoredIntraday = aggregateTechnicalBars(intradayHistory.get(instrument.id) || [], "1d");
    const existingDaily = aggregateTechnicalBars([
      ...dailyHistory.get(instrument.id) || [],
      ...dailyFromStoredIntraday
    ], "1d");
    let canonicalDaily = existingDaily;
    if (quoteIsFinalForSession(quote, sessionDate)) {
      const today = finalDailyBar(quarterBars.get(instrument.id) || [], quote);
      if (today) {
        canonicalDaily = aggregateTechnicalBars([...existingDaily, today], "1d");
        newDailyChunks.push(await projectionChunk({
          instrument,
          interval: "1d",
          chunkKey: `${instrument.symbol}-1d-${sessionDate}`,
          bars: [canonicalDaily.at(-1)],
          source: quote,
          sessionDate,
          isFinal: true
        }));
      } else {
        skipped.push({ instrument_id: instrument.id, symbol: instrument.symbol, reason: "missing_quarter_bars" });
      }
    } else {
      skipped.push({ instrument_id: instrument.id, symbol: instrument.symbol, reason: "final_quote_unavailable" });
    }
    if (!canonicalDaily.length) {
      skipped.push({ instrument_id: instrument.id, symbol: instrument.symbol, reason: "missing_daily_history" });
      continue;
    }
    const frames = {
      "1d": canonicalDaily,
      "1wk": aggregateTechnicalBars(canonicalDaily, "1wk"),
      "1mo": aggregateTechnicalBars(canonicalDaily, "1mo")
    };
    for (const [timeframe, frameBars] of Object.entries(frames)) {
      if (!frameBars.length) continue;
      if (timeframe !== "1d") {
        higherTimeframeChunks.push(await projectionChunk({
          instrument,
          interval: timeframe,
          chunkKey: `${instrument.symbol}-${timeframe}-canonical`,
          bars: frameBars,
          source: quote || latestSourceByInstrument.get(instrument.id) || null,
          isFinal: false
        }));
      }
      const signalBars = frameBars;
      if (!signalBars.length) continue;
      const currentPeriodIsFinal = timeframe === "1d" ? quoteIsFinalForSession(quote, sessionDate) : timeframe === "1wk" ? isThursday(sessionDate) : isLastSaudiTradingWeekdayOfMonth(sessionDate);
      const values = calculateTechnicalSignals(signalBars, TECHNICAL_SIGNAL_WINDOW_SIZE);
      values.signal_window = (values.signal_window || []).map((item, index) => ({
        ...item,
        is_final: index === 0 ? currentPeriodIsFinal : true
      }));
      values.is_final = currentPeriodIsFinal;
      indicatorRows.push({
        instrument_id: instrument.id,
        symbol: instrument.symbol,
        indicator_key: "technical_signals",
        timeframe,
        values,
        source_as_of: signalBars.at(-1)?.time,
        calculated_at: (/* @__PURE__ */ new Date()).toISOString(),
        formula_version: TECHNICAL_SIGNAL_FORMULA_VERSION
      });
    }
  }
  const candleResult = await upsertRows(
    base44,
    "CandleChunk",
    [...newDailyChunks, ...higherTimeframeChunks],
    chunks,
    ["instrument_id", "interval", "chunk_key"]
  );
  const signalResult = await upsertRows(
    base44,
    "IndicatorSnapshot",
    indicatorRows,
    snapshots,
    ["instrument_id", "indicator_key", "timeframe"]
  );
  const skippedRows = [...new Map(skipped.map((item) => [`${item.instrument_id}:${item.reason}`, item])).values()];
  return {
    instruments: instruments.length,
    candles: candleResult,
    signals: signalResult,
    skipped: skippedRows,
    source_id: quotes.find((quote) => quote.source_id)?.source_id || "canonical-projection",
    snapshot_version: quotes.find((quote) => quote.snapshot_version)?.snapshot_version || null
  };
}
Deno.serve(async (req) => {
  let base44 = null;
  let run = null;
  try {
    base44 = createClientFromRequest(req);
    const requestBody = await req.json();
    const body = { ...requestBody, ...requestBody.args || {} };
    const isServiceInvocation = Boolean(req.headers.get("Base44-Service-Authorization"));
    if (body.mode === "projection_batch") {
      if (!isServiceInvocation) throw Object.assign(new Error("Service invocation required"), { status: 403 });
      const instrumentIds = Array.isArray(body.instrument_ids) ? body.instrument_ids.map(String).filter(Boolean).slice(0, PROJECTION_BATCH_SIZE) : [];
      if (!instrumentIds.length) throw Object.assign(new Error("instrument_ids are required"), { status: 400 });
      return Response.json(await projectInstrumentBatch(base44, instrumentIds, String(body.session_date || riyadhDate2())));
    }
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }
    if (!isServiceInvocation) {
      if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
      await requirePermission(base44, body.session_id, "data.ingestion.run");
    }
    const sessionDate = String(body.session_date || riyadhDate2());
    const slotKey = `technical-projection:${sessionDate}:${TECHNICAL_SIGNAL_FORMULA_VERSION}`;
    const existingRuns = entityRows(await base44.asServiceRole.entities.IngestionRun.filter({ slot_key: slotKey }));
    const completedRun = existingRuns.filter((item) => ["success", "partial"].includes(item.status)).sort((left, right) => Date.parse(right.finished_at || right.updated_date || 0) - Date.parse(left.finished_at || left.updated_date || 0))[0];
    if (completedRun && body.force !== true) {
      return Response.json({ status: "skipped", reason: "already_projected", session_date: sessionDate, run_id: completedRun.id });
    }
    const activeRun = existingRuns.find((item) => item.status === "running" && Date.parse(item.lease_expires_at || 0) > Date.now());
    if (activeRun && body.force !== true) {
      return Response.json({ status: "skipped", reason: "projection_in_progress", session_date: sessionDate, run_id: activeRun.id });
    }
    if (activeRun && body.force === true) {
      await base44.asServiceRole.entities.IngestionRun.update(activeRun.id, {
        status: "failed",
        finished_at: (/* @__PURE__ */ new Date()).toISOString(),
        failure_code: "SUPERSEDED_BY_FORCED_RUN",
        notes: "A forced technical projection replaced a stale or interrupted run"
      });
    }
    run = await base44.asServiceRole.entities.IngestionRun.create({
      run_type: "technical_projection",
      market_code: MARKET_CODE,
      slot_key: slotKey,
      slot_kind: "technical_projection",
      scheduled_for: (/* @__PURE__ */ new Date()).toISOString(),
      lease_expires_at: new Date(Date.now() + 5 * 60 * 1e3).toISOString(),
      started_at: (/* @__PURE__ */ new Date()).toISOString(),
      total_records: 0,
      success_count: 0,
      failed_count: 0,
      status: "running",
      source_id: "canonical-projection",
      notes: "Canonical daily, weekly, monthly candle and technical signal projection"
    });
    const instrumentsRaw = await base44.asServiceRole.entities.Instrument.list("symbol", 500);
    const allInstruments = entityRows(instrumentsRaw);
    const instruments = allInstruments.filter((item) => item.market_code === MARKET_CODE && item.status !== "delisted");
    const outOfScopeIds = allInstruments.filter((item) => item.market_code !== MARKET_CODE).map((item) => item.id).filter(Boolean);
    const cleanup = outOfScopeIds.length ? await Promise.all([
      base44.asServiceRole.entities.IndicatorSnapshot.deleteMany({
        indicator_key: "technical_signals",
        instrument_id: { $in: outOfScopeIds }
      }),
      base44.asServiceRole.entities.CandleChunk.deleteMany({
        canonical_version: CANONICAL_VERSION,
        instrument_id: { $in: outOfScopeIds },
        interval: { $in: ["1wk", "1mo"] }
      })
    ]) : [{ deleted: 0 }, { deleted: 0 }];
    const batches = [];
    for (let offset = 0; offset < instruments.length; offset += PROJECTION_BATCH_SIZE) {
      batches.push(instruments.slice(offset, offset + PROJECTION_BATCH_SIZE).map((instrument) => instrument.id));
    }
    const batchResults = [];
    const failedBatches = [];
    for (let offset = 0; offset < batches.length; offset += PROJECTION_CONCURRENCY) {
      const group = batches.slice(offset, offset + PROJECTION_CONCURRENCY);
      const settled = await Promise.allSettled(group.map(
        (instrumentIds, groupIndex) => base44.functions.invoke("marketSignalRefresh", {
          mode: "projection_batch",
          session_date: sessionDate,
          run_id: run.id,
          batch_index: offset + groupIndex,
          instrument_ids: instrumentIds
        })
      ));
      settled.forEach((result, groupIndex) => {
        const batchIndex = offset + groupIndex;
        if (result.status === "fulfilled") batchResults.push(result.value?.data || result.value || {});
        else failedBatches.push({
          batch_index: batchIndex,
          instrument_ids: batches[batchIndex],
          error: result.reason?.response?.data?.error || result.reason?.message || "projection_batch_failed"
        });
      });
    }
    const candleResult = batchResults.reduce((total, item) => ({
      created: total.created + Number(item.candles?.created || 0),
      updated: total.updated + Number(item.candles?.updated || 0)
    }), { created: 0, updated: 0 });
    const signalResult = batchResults.reduce((total, item) => ({
      created: total.created + Number(item.signals?.created || 0),
      updated: total.updated + Number(item.signals?.updated || 0)
    }), { created: 0, updated: 0 });
    const skippedRows = batchResults.flatMap((item) => Array.isArray(item.skipped) ? item.skipped : []);
    const skippedInstrumentCount = new Set(skippedRows.map((item) => item.instrument_id)).size;
    const failedInstrumentCount = failedBatches.reduce((total, item) => total + item.instrument_ids.length, 0);
    const failureCount = Math.min(instruments.length, skippedInstrumentCount + failedInstrumentCount);
    const finishedAt = (/* @__PURE__ */ new Date()).toISOString();
    await base44.asServiceRole.entities.IngestionRun.update(run.id, {
      finished_at: finishedAt,
      total_records: instruments.length,
      success_count: Math.max(0, instruments.length - failureCount),
      failed_count: failureCount,
      status: failureCount ? failureCount < instruments.length ? "partial" : "failed" : "success",
      source_id: batchResults.find((item) => item.source_id)?.source_id || "canonical-projection",
      snapshot_version: batchResults.find((item) => item.snapshot_version)?.snapshot_version,
      coverage_percent: instruments.length ? (instruments.length - failureCount) / instruments.length * 100 : 0,
      promoted_at: finishedAt,
      notes: JSON.stringify({
        candles: candleResult,
        signals: signalResult,
        skipped_count: skippedInstrumentCount,
        batch_count: batches.length,
        failed_batches: failedBatches,
        removed_out_of_scope_signals: Number(cleanup[0]?.deleted || 0),
        removed_out_of_scope_candles: Number(cleanup[1]?.deleted || 0),
        canonical_version: CANONICAL_VERSION
      })
    });
    return Response.json({
      status: failureCount ? "degraded" : "success",
      session_date: sessionDate,
      instruments: instruments.length,
      candles: candleResult,
      signals: signalResult,
      skipped_count: skippedInstrumentCount,
      failed_batch_count: failedBatches.length,
      cleanup: {
        signals: Number(cleanup[0]?.deleted || 0),
        candles: Number(cleanup[1]?.deleted || 0)
      },
      skipped: skippedRows.slice(0, 100),
      run_id: run.id,
      formula_version: TECHNICAL_SIGNAL_FORMULA_VERSION,
      canonical_version: CANONICAL_VERSION
    });
  } catch (error) {
    if (base44 && run?.id) {
      try {
        await base44.asServiceRole.entities.IngestionRun.update(run.id, {
          finished_at: (/* @__PURE__ */ new Date()).toISOString(),
          failed_count: 1,
          status: "failed",
          failure_code: error?.code || "TECHNICAL_PROJECTION_FAILED",
          notes: error?.message || "Technical projection failed"
        });
      } catch {
      }
    }
    return replyError(error);
  }
});
