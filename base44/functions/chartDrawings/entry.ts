// GENERATED from base44/functions/chartDrawings/entry.ts — do not edit directly.

// base44/functions/chartDrawings/entry.ts
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
async function requireActiveSession(base44, profile, sessionId) {
  if (!profile || !sessionId) throw Object.assign(new Error("Active device session required"), { status: 403 });
  const session = await base44.asServiceRole.entities.ActiveDeviceSession.get(sessionId);
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
async function audit(base44, userId, action, entityType, entityId, result, reason = "") {
  return await base44.asServiceRole.entities.AuditLog.create({ actor_user_id: userId, action, entity_type: entityType, entity_id: entityId || "system", reason, before: {}, after: {}, result, ip_hash: "server-managed" });
}

// base44/functions/chartDrawings/entry.ts
var TYPES = /* @__PURE__ */ new Set(["trend_line", "ray", "horizontal_line", "vertical_line", "arrow", "rectangle", "parallel_channel", "polyline", "curve", "brush", "measure", "price_range", "date_range", "date_and_price_range"]);
var ALERT_TYPES = /* @__PURE__ */ new Set(["trend_line", "ray", "horizontal_line"]);
var INTERVALS = /* @__PURE__ */ new Set(["all", "15m", "1h", "1d", "1wk", "1mo"]);
var LINE_STYLES = /* @__PURE__ */ new Set(["solid", "dashed", "dotted"]);
function bad(message, code = "INVALID_DRAWING") {
  throw Object.assign(new Error(message), { status: 400, code });
}
function cleanColor(value, fallback) {
  const color = String(value || fallback);
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
}
function cleanPoint(value) {
  const price = Number(value?.price);
  const time = Number(value?.time);
  const logical = Number(value?.logical);
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(time) && !Number.isFinite(logical)) bad("Every point requires a positive price and a valid chart position");
  return {
    ...Number.isFinite(time) ? { time } : {},
    ...Number.isFinite(logical) ? { logical } : {},
    price
  };
}
function cleanDrawing(value) {
  const requestedType = String(value?.type || "");
  const type = requestedType === "measure" ? "date_and_price_range" : requestedType;
  if (!TYPES.has(type)) bad("Unsupported drawing type");
  const clientId = String(value?.clientId || value?.client_id || "").trim();
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(clientId)) bad("Invalid drawing identifier");
  const points = Array.isArray(value?.points) ? value.points.map(cleanPoint) : [];
  if (!points.length || points.length > 500) bad("Drawing must contain 1-500 valid points");
  const raw = value?.options || {};
  const options = {
    color: cleanColor(raw.color, "#2563eb"),
    fillColor: cleanColor(raw.fillColor, "#2563eb"),
    fillOpacity: Math.max(0, Math.min(100, Number(raw.fillOpacity) || 0)),
    lineWidth: Math.max(1, Math.min(4, Number(raw.lineWidth) || 2)),
    lineStyle: LINE_STYLES.has(raw.lineStyle) ? raw.lineStyle : "solid",
    extendLeft: Boolean(raw.extendLeft),
    extendRight: Boolean(raw.extendRight),
    showLabel: raw.showLabel !== false,
    showMedian: raw.showMedian !== false,
    medianStyle: LINE_STYLES.has(raw.medianStyle) ? raw.medianStyle : "dashed"
  };
  return {
    client_id: clientId,
    drawing_type: type,
    points,
    options,
    locked: Boolean(value?.locked),
    visible: value?.visible !== false,
    z_index: Math.max(-1e4, Math.min(1e4, Number(value?.zIndex ?? value?.z_index) || 0))
  };
}
async function instrumentFor(base44, symbol) {
  if (!/^\d{4}$/.test(symbol)) bad("Valid four-digit symbol required", "INVALID_SYMBOL");
  const instruments = await base44.asServiceRole.entities.Instrument.filter({ symbol });
  if (!instruments[0]) throw Object.assign(new Error("Instrument not found"), { status: 404, code: "INSTRUMENT_NOT_FOUND" });
  return instruments[0];
}
async function ownedDrawing(base44, profile, body) {
  let row = null;
  if (body.drawing_id) row = await base44.asServiceRole.entities.ChartDrawing.get(String(body.drawing_id));
  if (!row && body.client_id) {
    const rows = await base44.asServiceRole.entities.ChartDrawing.filter({ customer_id: profile.id, client_id: String(body.client_id) });
    row = rows[0] || null;
  }
  if (!row || row.customer_id !== profile.id) throw Object.assign(new Error("Drawing not found"), { status: 404, code: "DRAWING_NOT_FOUND" });
  return row;
}
function responseDrawing(row) {
  return {
    serverId: row.id,
    clientId: row.client_id,
    type: row.drawing_type,
    points: row.points,
    options: row.options,
    locked: row.locked,
    visible: row.visible,
    zIndex: row.z_index,
    intervalScope: row.interval_scope || "all",
    alert_rule_id: row.alert_rule_id || null,
    revision: row.revision
  };
}
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const profile = await profileFor(base44, user);
    if (!profile) throw Object.assign(new Error("Profile not found"), { status: 404 });
    const body = await req.json();
    await requireActiveSession(base44, profile, body.session_id);
    if (body.action === "list") {
      const symbol = String(body.symbol || "").trim();
      await instrumentFor(base44, symbol);
      const rows = await base44.asServiceRole.entities.ChartDrawing.filter({ customer_id: profile.id, symbol });
      const interval = INTERVALS.has(body.interval_scope) ? body.interval_scope : "all";
      return Response.json({ drawings: rows.filter((row) => row.interval_scope === "all" || row.interval_scope === interval).map(responseDrawing) });
    }
    if (body.action === "save") {
      const symbol = String(body.symbol || "").trim();
      const instrument = await instrumentFor(base44, symbol);
      const clean = cleanDrawing(body.drawing);
      const interval = INTERVALS.has(body.interval_scope) ? body.interval_scope : "all";
      const matches = await base44.asServiceRole.entities.ChartDrawing.filter({ customer_id: profile.id, client_id: clean.client_id });
      const existing = matches[0] || null;
      if (existing && (existing.customer_id !== profile.id || existing.symbol !== symbol)) throw Object.assign(new Error("Drawing identifier conflict"), { status: 409, code: "DRAWING_ID_CONFLICT" });
      const payload = {
        customer_id: profile.id,
        instrument_id: instrument.id,
        symbol,
        interval_scope: interval,
        ...clean,
        revision: Number(existing?.revision || 0) + 1
      };
      const row = existing ? await base44.asServiceRole.entities.ChartDrawing.update(existing.id, payload) : await base44.asServiceRole.entities.ChartDrawing.create(payload);
      await audit(base44, user.id, existing ? "drawing.update" : "drawing.create", "ChartDrawing", row.id, "success");
      return Response.json({ drawing: responseDrawing(row) });
    }
    if (body.action === "duplicate") {
      const drawing = await ownedDrawing(base44, profile, body);
      const clientId = String(body.new_client_id || "").trim();
      if (!/^[a-zA-Z0-9-]{8,80}$/.test(clientId)) bad("Invalid duplicate drawing identifier");
      const conflicts = await base44.asServiceRole.entities.ChartDrawing.filter({ customer_id: profile.id, client_id: clientId });
      if (conflicts[0]) throw Object.assign(new Error("Drawing identifier conflict"), { status: 409, code: "DRAWING_ID_CONFLICT" });
      const siblings = await base44.asServiceRole.entities.ChartDrawing.filter({ customer_id: profile.id, symbol: drawing.symbol });
      const maxZIndex = Math.max(0, ...siblings.map((item) => Number(item.z_index || 0)));
      const points = (drawing.points || []).map((point) => ({
        ...point,
        ...(Number.isFinite(Number(point.logical)) ? { logical: Number(point.logical) + 1 } : {}),
      }));
      const copy = await base44.asServiceRole.entities.ChartDrawing.create({
        customer_id: profile.id,
        instrument_id: drawing.instrument_id,
        symbol: drawing.symbol,
        interval_scope: drawing.interval_scope || "all",
        client_id: clientId,
        drawing_type: drawing.drawing_type,
        points,
        options: drawing.options,
        locked: false,
        visible: true,
        z_index: maxZIndex + 1,
        alert_rule_id: null,
        revision: 1,
      });
      await audit(base44, user.id, "drawing.duplicate", "ChartDrawing", copy.id, "success", `source:${drawing.id}`);
      return Response.json({ drawing: responseDrawing(copy) });
    }
    if (body.action === "save_alert") {
      const drawing = await ownedDrawing(base44, profile, body);
      if (!ALERT_TYPES.has(drawing.drawing_type)) bad("Alerts are supported for trend lines, rays, and horizontal lines", "DRAWING_ALERT_UNSUPPORTED");
      const requested = String(body.alert?.condition || "crosses");
      const condition = requested === "crosses_above" ? "crosses_drawing_above" : requested === "crosses_below" ? "crosses_drawing_below" : "crosses_drawing";
      const frequency = body.alert?.frequency === "once" ? "once" : "repeat";
      const cooldown = Math.max(15, Math.min(10080, Number(body.alert?.cooldown_minutes) || 15));
      let rule = drawing.alert_rule_id ? await base44.asServiceRole.entities.AlertRule.get(drawing.alert_rule_id) : null;
      const payload = {
        customer_id: profile.id,
        instrument_id: drawing.instrument_id,
        symbol: drawing.symbol,
        indicator_key: "chart_drawing",
        condition,
        drawing_id: drawing.id,
        drawing_type: drawing.drawing_type,
        drawing_points: drawing.points,
        frequency,
        cooldown_minutes: cooldown,
        enabled: true
      };
      rule = rule && rule.customer_id === profile.id ? await base44.asServiceRole.entities.AlertRule.update(rule.id, payload) : await base44.asServiceRole.entities.AlertRule.create(payload);
      await base44.asServiceRole.entities.ChartDrawing.update(drawing.id, { alert_rule_id: rule.id });
      await audit(base44, user.id, "drawing.alert.save", "AlertRule", rule.id, "success");
      return Response.json({ rule });
    }
    if (body.action === "delete_alert") {
      const drawing = await ownedDrawing(base44, profile, body);
      if (drawing.alert_rule_id) {
        const rule = await base44.asServiceRole.entities.AlertRule.get(drawing.alert_rule_id);
        if (rule?.customer_id === profile.id) await base44.asServiceRole.entities.AlertRule.delete(rule.id);
      }
      await base44.asServiceRole.entities.ChartDrawing.update(drawing.id, { alert_rule_id: null });
      await audit(base44, user.id, "drawing.alert.delete", "ChartDrawing", drawing.id, "success");
      return Response.json({ removed: true });
    }
    if (body.action === "set_visibility_bulk") {
      const symbol = String(body.symbol || "").trim();
      await instrumentFor(base44, symbol);
      const interval = INTERVALS.has(body.interval_scope) ? body.interval_scope : "all";
      const visible = body.visible === true;
      const rows = await base44.asServiceRole.entities.ChartDrawing.filter({ customer_id: profile.id, symbol });
      const scoped = rows.filter((row) => row.interval_scope === "all" || row.interval_scope === interval);
      await Promise.all(scoped.map((row) => base44.asServiceRole.entities.ChartDrawing.update(row.id, {
        visible,
        revision: Number(row.revision || 0) + 1
      })));
      await audit(base44, user.id, visible ? "drawing.bulk.show" : "drawing.bulk.hide", "ChartDrawing", `${symbol}:${interval}`, "success", `count:${scoped.length}`);
      return Response.json({ updated: scoped.length, visible });
    }
    if (body.action === "delete_all") {
      if (body.confirm_all !== true) bad("Explicit confirmation is required", "DRAWING_DELETE_ALL_CONFIRMATION_REQUIRED");
      const symbol = String(body.symbol || "").trim();
      await instrumentFor(base44, symbol);
      const interval = INTERVALS.has(body.interval_scope) ? body.interval_scope : "all";
      const rows = await base44.asServiceRole.entities.ChartDrawing.filter({ customer_id: profile.id, symbol });
      const scoped = rows.filter((row) => row.interval_scope === "all" || row.interval_scope === interval);
      const withAlerts = scoped.filter((row) => row.alert_rule_id);
      if (withAlerts.length && body.confirm_alert_delete !== true) {
        throw Object.assign(new Error("One or more drawings have active alerts"), { status: 409, code: "DRAWING_ALERT_DELETE_CONFIRMATION_REQUIRED" });
      }
      await Promise.all(withAlerts.map(async (drawing) => {
        const rule = await base44.asServiceRole.entities.AlertRule.get(drawing.alert_rule_id);
        if (rule?.customer_id === profile.id) await base44.asServiceRole.entities.AlertRule.delete(rule.id);
      }));
      await Promise.all(scoped.map((row) => base44.asServiceRole.entities.ChartDrawing.delete(row.id)));
      await audit(base44, user.id, "drawing.bulk.delete", "ChartDrawing", `${symbol}:${interval}`, "success", `count:${scoped.length};alerts:${withAlerts.length}`);
      return Response.json({ removed: scoped.length });
    }
    if (body.action === "delete") {
      const drawing = await ownedDrawing(base44, profile, body);
      if (drawing.alert_rule_id && body.confirm_alert_delete !== true) {
        throw Object.assign(new Error("Drawing has an active alert"), { status: 409, code: "DRAWING_ALERT_DELETE_CONFIRMATION_REQUIRED" });
      }
      if (drawing.alert_rule_id) {
        const rule = await base44.asServiceRole.entities.AlertRule.get(drawing.alert_rule_id);
        if (rule?.customer_id === profile.id) await base44.asServiceRole.entities.AlertRule.delete(rule.id);
      }
      await base44.asServiceRole.entities.ChartDrawing.delete(drawing.id);
      await audit(base44, user.id, "drawing.delete", "ChartDrawing", drawing.id, "success", drawing.alert_rule_id ? "alert_deleted_with_drawing" : "");
      return Response.json({ removed: true });
    }
    return Response.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return replyError(error);
  }
});
