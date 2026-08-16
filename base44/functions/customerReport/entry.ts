// GENERATED from customerReport/source.ts. Do not edit directly.

// base44/functions/customerReport/source.ts
import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";

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
  const owner2 = hasTrustedOwnerMarker(user, profile) || profile.role === "owner";
  if (!["admin", "owner"].includes(profile.role) || profile.account_status === "pending_verification" || owner2 && profile.role !== "owner") {
    profile = await base44.asServiceRole.entities.CustomerProfile.update(profile.id, {
      role: owner2 ? "owner" : "admin",
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

// base44/functions/customerReport/source.ts
function escapeXml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
function saudiDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)).replaceAll("/", "-");
  } catch {
    return "";
  }
}
function saudiDateTime(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
  } catch {
    return "";
  }
}
function newest(rows = []) {
  return [...rows].sort((a, b) => new Date(b.created_date || b.starts_at || 0).getTime() - new Date(a.created_date || a.starts_at || 0).getTime());
}
function activeSubscription(rows = []) {
  return rows.find((item) => item.status === "active") || newest(rows)[0] || null;
}
function styleForStatus(value) {
  const status = String(value || "").toLowerCase();
  if (["active", "approved"].includes(status)) return "StatusActive";
  if (["pending", "pending_owner_approval", "pending_verification", "referral_opened"].includes(status)) return "StatusPending";
  if (["suspended", "temporarily_blocked"].includes(status)) return "StatusSuspended";
  if (["banned", "rejected", "closed", "expired"].includes(status)) return "StatusDanger";
  return "Cell";
}
function cell(value, style = "Cell") {
  return `<Cell ss:StyleID="${style}"><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}
function row(values, statusIndex = -1, rowIndex = 0) {
  return `<Row ss:StyleID="${rowIndex % 2 ? "AltRow" : "DataRow"}">${values.map((value, index) => cell(value, index === statusIndex ? styleForStatus(value) : "Cell")).join("")}</Row>`;
}
function worksheet(name, title, columns, rows, widths, statusIndex = -1) {
  const safeName = String(name).replace(/[\\/?*\[\]:]/g, " ").slice(0, 31);
  const titleRow = `<Row ss:Height="32"><Cell ss:StyleID="Title" ss:MergeAcross="${columns.length - 1}"><Data ss:Type="String">${escapeXml(title)}</Data></Cell></Row>`;
  const metaRow = `<Row ss:Height="22"><Cell ss:StyleID="Meta" ss:MergeAcross="${columns.length - 1}"><Data ss:Type="String">${escapeXml(`Generated ${saudiDateTime(/* @__PURE__ */ new Date())} Asia/Riyadh \xB7 Rows: ${rows.length}`)}</Data></Cell></Row>`;
  const header = `<Row ss:Height="30">${columns.map((item) => cell(item, "Header")).join("")}</Row>`;
  const columnsXml = widths.map((width) => `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`).join("");
  const body = rows.map((values, index) => row(values, statusIndex, index)).join("");
  return `<Worksheet ss:Name="${escapeXml(safeName)}"><Table ss:DefaultRowHeight="20">${columnsXml}${titleRow}${metaRow}${header}${body}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>3</SplitHorizontal><TopRowBottomPane>3</TopRowBottomPane><Selected/></WorksheetOptions></Worksheet>`;
}
function workbook(customers, applications, subscriptions, platforms) {
  const appsByCustomer = /* @__PURE__ */ new Map();
  const subscriptionsByCustomer = /* @__PURE__ */ new Map();
  for (const application of applications) {
    if (!appsByCustomer.has(application.customer_id)) appsByCustomer.set(application.customer_id, []);
    appsByCustomer.get(application.customer_id).push(application);
  }
  for (const subscription of subscriptions) {
    if (!subscriptionsByCustomer.has(subscription.customer_id)) subscriptionsByCustomer.set(subscription.customer_id, []);
    subscriptionsByCustomer.get(subscription.customer_id).push(subscription);
  }
  const customerById = Object.fromEntries(customers.map((customer) => [customer.id, customer]));
  const platformById = Object.fromEntries(platforms.map((platform) => [platform.id, platform]));
  const masterColumns = [
    "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u0633\u062C\u064A\u0644 | Registration",
    "\u0631\u0642\u0645 \u0627\u0644\u0639\u0645\u064A\u0644 | Customer #",
    "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 | Full name",
    "\u0627\u0644\u0628\u0631\u064A\u062F | Email",
    "\u0627\u0644\u062C\u0648\u0627\u0644 | Mobile",
    "\u0627\u0644\u062F\u0648\u0644\u0629 | Country",
    "\u062D\u0627\u0644\u0629 \u0627\u0644\u062D\u0633\u0627\u0628 | Account status",
    "\u0627\u0644\u0644\u063A\u0629 | Language",
    "\u0627\u0644\u0623\u0633\u0648\u0627\u0642 | Markets",
    "\u062D\u0627\u0644\u0629 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 | Subscription",
    "\u0628\u062F\u0627\u064A\u0629 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 | Start",
    "\u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 | End",
    "\u0645\u0646\u0635\u0627\u062A \u0627\u0644\u0625\u062D\u0627\u0644\u0629 | Platforms",
    "\u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u0637\u0644\u0628\u0627\u062A | References",
    "\u0622\u062E\u0631 \u062A\u062D\u062F\u064A\u062B | Updated"
  ];
  const masterWidths = [90, 105, 180, 210, 120, 70, 110, 70, 170, 110, 105, 105, 180, 220, 125];
  const customerRows = customers.map((customer) => {
    const customerApps = newest(appsByCustomer.get(customer.id) || []);
    const customerSubscriptions = newest(subscriptionsByCustomer.get(customer.id) || []);
    const current = activeSubscription(customerSubscriptions);
    const markets = [...new Set(customerSubscriptions.filter((item) => item.status === "active").map((item) => item.market_code))].join(", ");
    const platformNames = [...new Set(customerApps.map((item) => platformById[item.trading_platform_id]?.name_ar || item.platform_name_ar_snapshot || item.trading_platform_id).filter(Boolean))].join(", ");
    return [
      saudiDate(customer.created_date),
      customer.customer_number,
      customer.full_name,
      customer.email_normalized,
      customer.phone_e164,
      customer.country_code,
      customer.account_status,
      customer.preferred_language,
      markets,
      current?.status || "not_set",
      saudiDate(current?.starts_at),
      saudiDate(current?.ends_at),
      platformNames,
      customerApps.map((item) => item.unique_reference).join(", "),
      saudiDateTime(customer.updated_date || customer.created_date)
    ];
  });
  const referralColumns = [
    "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0637\u0644\u0628 | Application date",
    "\u0631\u0642\u0645 \u0627\u0644\u0639\u0645\u064A\u0644 | Customer #",
    "\u0627\u0644\u0639\u0645\u064A\u0644 | Customer",
    "\u0627\u0644\u0645\u0646\u0635\u0629 | Platform",
    "\u0627\u0644\u0633\u0648\u0642 | Market",
    "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628 \u0627\u0644\u0641\u0631\u064A\u062F | Unique reference",
    "\u0627\u0644\u062D\u0627\u0644\u0629 | Status",
    "\u0641\u062A\u062D \u0631\u0627\u0628\u0637 \u0627\u0644\u0625\u062D\u0627\u0644\u0629 | Referral opened",
    "\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0639\u0645\u064A\u0644 | Customer confirmed",
    "\u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 | Cooldown until",
    "\u0642\u0631\u0627\u0631 \u0627\u0644\u0645\u0627\u0644\u0643 | Owner decision",
    "\u0633\u0628\u0628 \u0627\u0644\u0642\u0631\u0627\u0631 | Decision reason",
    "\u0627\u0644\u0628\u0631\u064A\u062F | Email",
    "\u0627\u0644\u062C\u0648\u0627\u0644 | Mobile"
  ];
  const referralRows = newest(applications).map((application) => {
    const customer = customerById[application.customer_id] || {};
    const platform = platformById[application.trading_platform_id] || {};
    return [
      saudiDate(application.created_date),
      customer.customer_number,
      customer.full_name || application.full_name_snapshot,
      platform.name_ar || application.platform_name_ar_snapshot,
      application.market_code,
      application.unique_reference,
      application.status,
      saudiDateTime(application.referral_clicked_at),
      saudiDateTime(application.customer_confirmed_at),
      saudiDate(application.cooldown_until),
      saudiDateTime(application.reviewed_at),
      application.decision_reason,
      application.email_snapshot,
      application.phone_snapshot
    ];
  });
  const subscriptionColumns = [
    "\u0627\u0644\u0628\u062F\u0627\u064A\u0629 | Start",
    "\u0627\u0644\u0646\u0647\u0627\u064A\u0629 | End",
    "\u0631\u0642\u0645 \u0627\u0644\u0639\u0645\u064A\u0644 | Customer #",
    "\u0627\u0644\u0639\u0645\u064A\u0644 | Customer",
    "\u0627\u0644\u0633\u0648\u0642 | Market",
    "\u0627\u0644\u0645\u0646\u0635\u0629 | Platform",
    "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628 | Reference",
    "\u0627\u0644\u062D\u0627\u0644\u0629 | Status",
    "\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062A\u0641\u0639\u064A\u0644 | Activation",
    "\u0627\u0644\u0633\u0628\u0628 | Reason",
    "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0646\u0634\u0627\u0621 | Created"
  ];
  const subscriptionRows = newest(subscriptions).map((subscription) => {
    const customer = customerById[subscription.customer_id] || {};
    const platform = platformById[subscription.trading_platform_id] || {};
    return [
      saudiDate(subscription.starts_at),
      saudiDate(subscription.ends_at),
      customer.customer_number,
      customer.full_name,
      subscription.market_code,
      platform.name_ar || platform.name_en || subscription.trading_platform_id,
      subscription.unique_reference,
      subscription.status,
      subscription.activation_method,
      subscription.reason,
      saudiDateTime(subscription.created_date)
    ];
  });
  const groups = /* @__PURE__ */ new Map();
  for (const customer of customers) {
    const date = saudiDate(customer.created_date) || "unknown";
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(customer);
  }
  const dailySheets = [...groups.entries()].sort(([left], [right]) => right.localeCompare(left)).map(([date, rows]) => {
    const ids = new Set(rows.map((item) => item.id));
    return worksheet(date, `\u0627\u0644\u0645\u0633\u062C\u0644\u0648\u0646 \u0641\u064A ${date} | Registrations on ${date}`, masterColumns, customerRows.filter((_, index) => ids.has(customers[index].id)), masterWidths, 6);
  });
  const sheets = [
    worksheet("All Customers", "\u0627\u0644\u0645\u0633\u062A\u062B\u0645\u0631 \u0627\u0644\u0630\u0643\u064A \u2014 \u062C\u0645\u064A\u0639 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 | Smart Investor \u2014 All Customers", masterColumns, customerRows, masterWidths, 6),
    worksheet("Referrals", "\u0645\u0646\u0635\u0627\u062A \u0627\u0644\u0625\u062D\u0627\u0644\u0629 \u0648\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0623\u0633\u0648\u0627\u0642 | Referral & Market Applications", referralColumns, referralRows, [95, 105, 175, 155, 115, 210, 105, 135, 135, 105, 130, 190, 200, 120], 6),
    worksheet("Subscriptions", "\u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A \u0648\u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A | Subscriptions & Entitlements", subscriptionColumns, subscriptionRows, [95, 95, 105, 175, 115, 160, 210, 105, 105, 190, 130], 7),
    ...dailySheets
  ];
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles>
    <Style ss:ID="Default"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10"/></Style>
    <Style ss:ID="Title"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="15" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F172A" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Meta"><Alignment ss:Horizontal="Center"/><Font ss:Color="#475569" ss:Italic="1"/><Interior ss:Color="#E0F2FE" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Header"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0284C7" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#075985"/></Borders></Style>
    <Style ss:ID="Cell"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
    <Style ss:ID="DataRow"/>
    <Style ss:ID="AltRow"><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/></Style>
    <Style ss:ID="StatusActive"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Color="#047857"/><Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/></Style>
    <Style ss:ID="StatusPending"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Color="#92400E"/><Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/></Style>
    <Style ss:ID="StatusSuspended"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Color="#C2410C"/><Interior ss:Color="#FFEDD5" ss:Pattern="Solid"/></Style>
    <Style ss:ID="StatusDanger"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Color="#B91C1C"/><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/></Style>
  </Styles>${sheets.join("")}</Workbook>`;
}
async function owner(base44) {
  const rows = await base44.asServiceRole.entities.CustomerProfile.filter({ acquisition_source: "platform_owner_bootstrap" });
  return rows.find((item) => item.role === "owner" && item.tags?.includes("owner")) || null;
}
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req, 16 * 1024);
    const args = body.args && typeof body.args === "object" ? body.args : body;
    const scheduled = args.action === "scheduled";
    let actor = "scheduled";
    if (scheduled) {
      const automationUser = await base44.auth.me();
      if (!automationUser || automationUser.role !== "admin") throw Object.assign(new Error("Automation authentication required"), { status: 401, code: "AUTOMATION_AUTH_REQUIRED" });
    } else {
      const context = await authorizationContext(base44, body.session_id);
      if (context.role !== "owner") throw Object.assign(new Error("Owner access required"), { status: 403, code: "OWNER_ONLY" });
      actor = context.user.id;
    }
    const reportDate = saudiDate(/* @__PURE__ */ new Date());
    const snapshots = await base44.asServiceRole.entities.CustomerReportSnapshot.filter({ report_key: "customers_master" });
    if (scheduled && snapshots[0]?.report_date === reportDate) return Response.json({ skipped: true, reason: "daily_report_already_generated" });
    const [profileRows, applications, subscriptions, platforms] = await Promise.all([
      base44.asServiceRole.entities.CustomerProfile.list("-created_date", 1e4),
      base44.asServiceRole.entities.MarketAccessApplication.list("-created_date", 1e4),
      base44.asServiceRole.entities.Subscription.list("-created_date", 1e4),
      base44.asServiceRole.entities.TradingPlatform.list("display_order", 100)
    ]);
    const customers = profileRows.filter((customer) => customer.role === "user");
    const customerIds = new Set(customers.map((customer) => customer.id));
    const customerApplications = applications.filter((item) => customerIds.has(item.customer_id));
    const customerSubscriptions = subscriptions.filter((item) => customerIds.has(item.customer_id));
    const xml = workbook(customers, customerApplications, customerSubscriptions, platforms);
    const file = new File([xml], `smart-investor-customers-${reportDate}.xls`, { type: "application/vnd.ms-excel" });
    const uploaded = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
    const fileUri = uploaded.file_uri || uploaded.file_url || uploaded.url;
    if (!fileUri) throw Object.assign(new Error("Private report upload failed"), { status: 502, code: "REPORT_UPLOAD_FAILED" });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const payload = { file_uri: fileUri, generated_at: now, generated_by_user_id: actor, customer_count: customers.length, report_date: reportDate, revision: Number(snapshots[0]?.revision || 0) + 1 };
    const snapshot = snapshots[0] ? await base44.asServiceRole.entities.CustomerReportSnapshot.update(snapshots[0].id, payload) : await base44.asServiceRole.entities.CustomerReportSnapshot.create({ report_key: "customers_master", ...payload });
    const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 86400 });
    const downloadUrl = signed.signed_url || signed.url;
    const ownerProfile = await owner(base44);
    if (scheduled && ownerProfile?.email_normalized && downloadUrl) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: ownerProfile.email_normalized,
          subject: `\u062A\u0642\u0631\u064A\u0631 \u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u0633\u062A\u062B\u0645\u0631 \u0627\u0644\u0630\u0643\u064A \u2014 ${reportDate}`,
          body: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u064A\u0648\u0645\u064A \u0627\u0644\u0645\u062A\u0643\u0627\u0645\u0644. \u0627\u0644\u0639\u0645\u0644\u0627\u0621: ${customers.length}\u060C \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0625\u062D\u0627\u0644\u0629: ${customerApplications.length}\u060C \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A: ${customerSubscriptions.length}.
\u0631\u0627\u0628\u0637 \u0627\u0644\u062A\u062D\u0645\u064A\u0644 \u0635\u0627\u0644\u062D \u0644\u0645\u062F\u0629 24 \u0633\u0627\u0639\u0629:
${downloadUrl}`
        });
      } catch {
      }
    }
    if (!scheduled) await audit(base44, actor, "customer_report.generated", "CustomerReportSnapshot", snapshot.id, "success", "owner request", {}, { report_date: reportDate, customer_count: customers.length, application_count: customerApplications.length, subscription_count: customerSubscriptions.length });
    return Response.json(scheduled ? { snapshot: { id: snapshot.id, report_date: snapshot.report_date, customer_count: snapshot.customer_count } } : { snapshot, download_url: downloadUrl, counts: { customers: customers.length, applications: customerApplications.length, subscriptions: customerSubscriptions.length } });
  } catch (error) {
    return replyError(error);
  }
});
