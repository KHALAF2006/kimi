// GENERATED from base44/functions/indicatorEngine/entry.ts — do not edit directly.

// base44/functions/indicatorEngine/entry.ts
import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

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
async function requireRole(base44, roles) {
  const user = await requireUser(base44);
  const profile = await profileFor(base44, user);
  const role = profile?.role || user.role;
  if (!roles.includes(role)) throw Object.assign(new Error("Forbidden"), { status: 403 });
  return { user, profile, role };
}
function replyError(error) {
  const status = Number(error?.status) || 500;
  if (status >= 500) console.error("KMY backend error", error);
  return Response.json({
    error: status >= 500 ? "Backend operation failed" : error?.message || "Request failed",
    code: error?.code || (status >= 500 ? "BACKEND_FAILURE" : "REQUEST_FAILED")
  }, { status });
}

// base44/shared/momentum.ts
var MOMENTUM_FORMULA_VERSION = "momentum-zones-v1";
var LOOKBACK_DAYS = 20;
var HISTORY_BARS = 500;
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
  const bars = inputBars.map((bar) => ({
    time: String(bar.time || ""),
    high: Number(bar.high),
    close: Number(bar.close)
  })).filter((bar) => bar.time && Number.isFinite(bar.high) && Number.isFinite(bar.close) && bar.high > 0 && bar.close > 0).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()).slice(-historyBars);
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
    historyBars,
    formulaVersion: MOMENTUM_FORMULA_VERSION,
    zone4Active,
    zone5Active,
    zones: buildMomentumZones(referencePeak, zone4Active, zone5Active)
  };
}

// base44/functions/indicatorEngine/entry.ts
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    await requireRole(base44, ["admin", "owner"]);
    const body = await req.json();
    if (!Array.isArray(body.bars) || body.bars.length < 2) {
      return Response.json({ status: "insufficient_history", required: 2 }, { status: 422 });
    }
    const result = calculateMomentumZones(body.bars, Number(body.lookback_days || 20), 500);
    if (!result) return Response.json({ status: "insufficient_history", formula_version: MOMENTUM_FORMULA_VERSION }, { status: 422 });
    return Response.json({ status: "success", ...result, formula_version: MOMENTUM_FORMULA_VERSION });
  } catch (error) {
    return replyError(error);
  }
});
