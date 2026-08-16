// GENERATED from sectorChartRefresh/source.ts. Do not edit directly.

// base44/functions/sectorChartRefresh/source.ts
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// base44/shared/market-data.ts
var SAUDI_DELAY_SECONDS = 15 * 60;
var MARKET_REFRESH_CADENCE_SECONDS = 60 * 60;
var INGESTION_PROCESSING_GRACE_SECONDS = 10 * 60;
var PROVIDER_FRESHNESS_GRACE_SECONDS = MARKET_REFRESH_CADENCE_SECONDS + INGESTION_PROCESSING_GRACE_SECONDS;
var EXPERIMENTAL_SOURCE_MAX_AGE_SECONDS = 60 * 60;
var PUBLIC_CANDLE_OVERLAP_MILLISECONDS = 15 * 60 * 1e3;
var PUBLIC_CANDLE_MAX_INCREMENTAL_LOOKBACK_MILLISECONDS = 8 * 24 * 60 * 60 * 1e3;
var SAUDI_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Riyadh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});
var MARKET_AUTOMATION_SPECS = Object.freeze([
  { name: "saudi_t15_1015_1045_riyadh", cron: "15,30,45 7 * * 0-4", slotKind: "quarter_hour", active: false },
  { name: "saudi_t15_1100_1445_riyadh", cron: "0,15,30,45 8-11 * * 0-4", slotKind: "quarter_hour", active: false },
  { name: "saudi_t15_1500_1515_riyadh", cron: "0,15 12 * * 0-4", slotKind: "quarter_hour", active: false },
  { name: "saudi_close_price_1526_riyadh", cron: "26 12 * * 0-4", slotKind: "close_price", active: false },
  { name: "saudi_session_final_1536_riyadh", cron: "36 12 * * 0-4", slotKind: "session_final", active: false }
]);
var RIYADH_TIMEZONE = "Asia/Riyadh";
var RIYADH_CLOCK_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: RIYADH_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});
var SAUDI_CANDLE_OPTIONS = Object.freeze({ timeZone: "Asia/Riyadh", sessionStartMinutes: 600, weekStartsOn: 0 });
var MARKET_CLOCK_FORMATTERS = /* @__PURE__ */ new Map();
function marketClockFormatter(timeZone) {
  const key = String(timeZone || SAUDI_CANDLE_OPTIONS.timeZone);
  if (!MARKET_CLOCK_FORMATTERS.has(key)) {
    MARKET_CLOCK_FORMATTERS.set(key, new Intl.DateTimeFormat("en-CA", {
      timeZone: key,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }));
  }
  return MARKET_CLOCK_FORMATTERS.get(key);
}
function marketClockParts(value, timeZone) {
  return Object.fromEntries(marketClockFormatter(timeZone).formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
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
  const parts = Object.fromEntries(RIYADH_CLOCK_FORMATTER.formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
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
async function ensureAdministrativeProfile(base44, user) {
  let profile = await profileFor(base44, user);
  if (!profile || user?.role !== "admin") return profile;
  const owner = hasTrustedOwnerMarker(user, profile);
  if (owner && (profile.role !== "owner" || profile.account_status !== "active")) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    profile = await base44.asServiceRole.entities.CustomerProfile.update(profile.id, {
      role: "owner",
      account_status: "active",
      email_verified_at: profile.email_verified_at || now,
      last_seen_at: now
    });
    await audit(base44, user.id, "customer.owner_reconciled", "CustomerProfile", profile.id, "success");
  }
  return profile;
}
async function requireActiveSession(base44, profile, sessionId, deviceId) {
  if (!profile || !sessionId || !deviceId) throw Object.assign(new Error("Active device session required"), { status: 403, code: "DEVICE_SESSION_REQUIRED" });
  const token = parseSessionToken(sessionId);
  if (!token) throw Object.assign(new Error("Active device session required"), { status: 403 });
  let session = null;
  try {
    session = await base44.asServiceRole.entities.ActiveDeviceSession.get(token.sessionId);
  } catch {
    session = null;
  }
  const presentedHash = session ? await sha256(token.secret) : "";
  const presentedDeviceHash = session ? await sha256(String(deviceId)) : "";
  if (!session || session.customer_id !== profile.id || session.revoked_at || new Date(session.expires_at) <= /* @__PURE__ */ new Date() || !fixedTimeEqual(presentedHash, session.session_hash) || !fixedTimeEqual(presentedDeviceHash, session.device_hash)) {
    throw Object.assign(new Error("Active device session required"), { status: 403, code: "DEVICE_SESSION_MISMATCH" });
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
  entitlementGroups.forEach((group, index) => {
    const codes = new Set(group.map((item) => item.code));
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
    plan: plans.find((item) => item.id === subscriptions[0]?.plan_id) || null,
    plans,
    entitlements,
    marketAccess
  };
}
async function authorizationContext(base44, sessionId, deviceId) {
  const user = await requireUser(base44);
  const profile = await ensureAdministrativeProfile(base44, user);
  if (!profile) throw Object.assign(new Error("Profile not found"), { status: 404, code: "PROFILE_NOT_FOUND" });
  await requireActiveSession(base44, profile, sessionId, deviceId);
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
async function requirePermission(base44, sessionId, deviceId, permissionCode) {
  const context = await authorizationContext(base44, sessionId, deviceId);
  if (!context.permissions.has(permissionCode)) {
    throw Object.assign(new Error("Forbidden"), { status: 403, code: "PERMISSION_DENIED" });
  }
  return context;
}

// base44/functions/sectorChartRefresh/source.ts
var MARKET_CODE = "SA_MAIN";
var SECTORS_PER_BATCH = 2;
var INTERVALS = ["15m", "1h", "2h", "3h", "4h", "1d", "1wk", "1mo"];
var RANGE_MS = {
  "15m": 31 * 24 * 60 * 60 * 1e3,
  "1h": 93 * 24 * 60 * 60 * 1e3,
  "2h": 93 * 24 * 60 * 60 * 1e3,
  "3h": 93 * 24 * 60 * 60 * 1e3,
  "4h": 93 * 24 * 60 * 60 * 1e3
};
function rows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}
function fallbackIntervals(interval) {
  if (interval === "1wk" || interval === "1mo") return [interval, "1d"];
  if (interval === "1d") return [interval];
  if (["1h", "2h", "3h", "4h"].includes(interval)) return [interval, "15m"];
  return [interval];
}
var dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Riyadh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});
function normalizedBars(chunks) {
  const byTime = /* @__PURE__ */ new Map();
  for (const chunk of chunks) {
    for (const bar of Array.isArray(chunk.bars) ? chunk.bars : []) {
      const time = new Date(bar.time).getTime();
      const open = Number(bar.open);
      const high = Number(bar.high);
      const low = Number(bar.low);
      const close = Number(bar.close);
      const volume = Math.max(0, Number(bar.volume || 0));
      if (!Number.isFinite(time) || ![open, high, low, close].every((value) => Number.isFinite(value) && value > 0)) continue;
      if (high < Math.max(open, close) || low > Math.min(open, close)) continue;
      const isoTime = new Date(time).toISOString();
      const key = chunk.interval === "1d" ? `day:${dateFormatter.format(new Date(isoTime))}` : isoTime;
      const canonical = String(chunk.canonical_version || "");
      const priority = canonical === "candle-projection-v1" || canonical.includes("daily-projection") ? 3 : chunk.is_historical_archive === true ? 2 : 1;
      const received = new Date(chunk.received_time || chunk.updated_date || chunk.created_date || 0).getTime();
      const current = byTime.get(key);
      if (current && (current.priority > priority || current.priority === priority && current.received > received)) continue;
      byTime.set(key, { time: isoTime, open, high, low, close, volume, priority, received });
    }
  }
  return [...byTime.values()].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()).map(({ priority: _priority, received: _received, ...bar }) => bar);
}
function weightsFor(instruments, quoteByInstrument) {
  const caps = instruments.map((instrument) => Math.max(0, Number(quoteByInstrument.get(instrument.id)?.market_cap || 0)));
  const total = caps.reduce((sum, value) => sum + value, 0);
  return new Map(instruments.map((instrument, index) => [
    instrument.id,
    total > 0 ? caps[index] / total : 1 / instruments.length
  ]));
}
function aggregateSector(instruments, chunksByInstrument, quoteByInstrument, interval) {
  const weights = weightsFor(instruments, quoteByInstrument);
  const memberSeries = instruments.map((instrument) => {
    const chunks = chunksByInstrument.get(instrument.id) || [];
    const series = fallbackIntervals(interval).map((storedInterval) => {
      const matching = chunks.filter((chunk) => chunk.interval === storedInterval);
      return matching.length ? { interval: storedInterval, bars: normalizedBars(matching) } : null;
    }).filter(Boolean);
    const merged = mergeStoredCandleSeries(series, interval, {
      timeZone: "Asia/Riyadh",
      sessionStartMinutes: 600,
      weekStartsOn: 0
    });
    const fullBars = merged.bars.filter((bar) => Number(bar.close) > 0);
    const base = Number(fullBars[0]?.close);
    return {
      instrument,
      weight: weights.get(instrument.id) || 0,
      base,
      bars: fullBars
    };
  }).filter((item) => Number.isFinite(item.base) && item.base > 0 && item.bars.length);
  const latestTime = Math.max(...memberSeries.flatMap((item) => item.bars.map((bar) => new Date(bar.time).getTime())).filter(Number.isFinite));
  if (!Number.isFinite(latestTime)) return [];
  const cutoff = RANGE_MS[interval] ? latestTime - RANGE_MS[interval] : Number.NEGATIVE_INFINITY;
  const maps = new Map(memberSeries.map((item) => [
    item.instrument.id,
    new Map(item.bars.filter((bar) => new Date(bar.time).getTime() >= cutoff).map((bar) => [new Date(bar.time).toISOString(), bar]))
  ]));
  const timestamps = [...new Set([...maps.values()].flatMap((map) => [...map.keys()]))].sort();
  return timestamps.map((time) => {
    const members = memberSeries.map((item) => ({ item, bar: maps.get(item.instrument.id)?.get(time) })).filter((value) => value.bar);
    const presentWeight = members.reduce((sum, value) => sum + value.item.weight, 0);
    if (!presentWeight) return null;
    const aggregate = (field) => members.reduce(
      (sum, value) => sum + Number(value.bar[field]) / value.item.base * 1e3 * (value.item.weight / presentWeight),
      0
    );
    const open = aggregate("open");
    const close = aggregate("close");
    const rawHigh = aggregate("high");
    const rawLow = aggregate("low");
    return {
      time,
      open: Number(open.toFixed(6)),
      high: Number(Math.max(rawHigh, open, close).toFixed(6)),
      low: Number(Math.min(rawLow, open, close).toFixed(6)),
      close: Number(close.toFixed(6)),
      volume: members.reduce((sum, value) => sum + Math.max(0, Number(value.bar.volume || 0)), 0)
    };
  }).filter(Boolean);
}
async function upsertSnapshot(base44, row) {
  const existing = rows(await base44.asServiceRole.entities.SectorChartSnapshot.filter(
    { snapshot_key: row.snapshot_key },
    "-calculated_at",
    5
  ));
  if (existing[0]?.id) await base44.asServiceRole.entities.SectorChartSnapshot.update(existing[0].id, row);
  else await base44.asServiceRole.entities.SectorChartSnapshot.create(row);
  if (existing.length > 1) {
    await Promise.allSettled(existing.slice(1).map((item) => base44.asServiceRole.entities.SectorChartSnapshot.delete(item.id)));
  }
}
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req);
    if (body.session_id) {
      await requirePermission(base44, body.session_id, body.device_id, "data.ingestion.run");
    } else {
      await requireTrustedOwner(base44);
    }
    const batchIndex = Number(body.batch_index);
    if (!Number.isInteger(batchIndex) || batchIndex < 0) {
      throw Object.assign(new Error("Valid sector snapshot batch_index is required"), { status: 400, code: "INVALID_SECTOR_BATCH" });
    }
    const instruments = rows(await base44.asServiceRole.entities.Instrument.filter(
      { market_code: MARKET_CODE, status: { "$ne": "delisted" } },
      "symbol",
      500
    ));
    const sectors = [...new Map(instruments.filter((item) => item.sector_ar || item.sector_en).map((item) => [String(item.sector_ar || item.sector_en), {
      sector: String(item.sector_ar || item.sector_en),
      sector_ar: item.sector_ar || item.sector_en,
      sector_en: item.sector_en || item.sector_ar
    }])).values()].sort((a, b) => a.sector.localeCompare(b.sector, "ar"));
    const selected = sectors.slice(batchIndex * SECTORS_PER_BATCH, (batchIndex + 1) * SECTORS_PER_BATCH);
    if (!selected.length) {
      return Response.json({ status: "skipped", reason: "sector_batch_empty", batch_index: batchIndex, sector_count: sectors.length });
    }
    const results = [];
    for (const sectorInfo of selected) {
      const members = instruments.filter((item) => item.sector_ar === sectorInfo.sector_ar || item.sector_en === sectorInfo.sector_en);
      const ids = members.map((item) => item.id);
      const symbols = members.map((item) => String(item.symbol || "").trim().toUpperCase()).filter(Boolean);
      const [quotesValue, chunksValue] = await Promise.all([
        base44.asServiceRole.entities.QuoteLatest.filter({ market_code: MARKET_CODE, instrument_id: { "$in": ids } }, "-quote_time", 1e3),
        base44.asServiceRole.entities.CandleChunk.filter({ symbol: { "$in": symbols } }, "-end_time", 5e3)
      ]);
      const quoteByInstrument = /* @__PURE__ */ new Map();
      for (const quote of rows(quotesValue)) {
        if (!quoteByInstrument.has(quote.instrument_id) && quote.quality_status !== "quarantined") quoteByInstrument.set(quote.instrument_id, quote);
      }
      const instrumentBySymbol = new Map(members.map((item) => [String(item.symbol || "").trim().toUpperCase(), item]));
      const chunksByInstrument = new Map(members.map((item) => [item.id, []]));
      for (const chunk of rows(chunksValue)) {
        if (chunk.quality_status === "quarantined" || !Array.isArray(chunk.bars)) continue;
        const storedMarket = String(chunk.market_code || "").trim().toUpperCase();
        if (storedMarket && storedMarket !== MARKET_CODE) continue;
        const instrument = instrumentBySymbol.get(String(chunk.symbol || "").trim().toUpperCase());
        if (instrument) chunksByInstrument.get(instrument.id)?.push(chunk);
      }
      const calculatedAt = (/* @__PURE__ */ new Date()).toISOString();
      const methodology = members.some((item) => Number(quoteByInstrument.get(item.id)?.market_cap || 0) > 0) ? "market_cap_weighted" : "equal_weighted";
      let written = 0;
      for (const interval of INTERVALS) {
        const candles = aggregateSector(members, chunksByInstrument, quoteByInstrument, interval);
        if (candles.length < 2) continue;
        const payload = {
          sector: sectorInfo.sector,
          sector_ar: sectorInfo.sector_ar,
          sector_en: sectorInfo.sector_en,
          candles,
          momentum_indicator: null,
          as_of: candles.at(-1)?.time || null,
          calculated_at: calculatedAt,
          methodology,
          data_meta: {
            requested_interval: interval,
            requested_range: interval === "15m" ? "1mo" : ["1h", "2h", "3h", "4h"].includes(interval) ? "3mo" : "max",
            available_from: candles[0]?.time || null,
            available_to: candles.at(-1)?.time || null,
            returned_bar_count: candles.length,
            stored_bar_count: candles.length,
            storage_mode: "central_sector_snapshot"
          }
        };
        await upsertSnapshot(base44, {
          snapshot_key: [MARKET_CODE, sectorInfo.sector, interval].join("|"),
          market_code: MARKET_CODE,
          sector: sectorInfo.sector,
          interval,
          payload,
          source_as_of: payload.as_of,
          calculated_at: calculatedAt
        });
        written += 1;
      }
      results.push({ sector: sectorInfo.sector, member_count: members.length, snapshots_written: written });
    }
    return Response.json({
      status: "completed",
      market_code: MARKET_CODE,
      batch_index: batchIndex,
      sectors_per_batch: SECTORS_PER_BATCH,
      sector_count: sectors.length,
      results
    });
  } catch (error) {
    return replyError(error, error?.code || "SECTOR_CHART_REFRESH_FAILED");
  }
});
