import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { audit, profileFor, replyError, requireActiveSession, requireUser } from "../../shared/security.ts";

const TYPES = new Set(["trend_line", "ray", "horizontal_line", "vertical_line", "arrow", "rectangle", "parallel_channel", "polyline", "curve", "brush", "measure"]);
const ALERT_TYPES = new Set(["trend_line", "ray", "horizontal_line"]);
const INTERVALS = new Set(["all", "15m", "1h", "1d", "1wk", "1mo"]);
const LINE_STYLES = new Set(["solid", "dashed", "dotted"]);

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
  if (!Number.isFinite(price) || price <= 0 || (!Number.isFinite(time) && !Number.isFinite(logical))) bad("Every point requires a positive price and a valid chart position");
  return {
    ...(Number.isFinite(time) ? { time } : {}),
    ...(Number.isFinite(logical) ? { logical } : {}),
    price,
  };
}

function cleanDrawing(value) {
  const type = String(value?.type || "");
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
  };
  return {
    client_id: clientId,
    drawing_type: type,
    points,
    options,
    locked: Boolean(value?.locked),
    visible: value?.visible !== false,
    z_index: Math.max(-10000, Math.min(10000, Number(value?.zIndex ?? value?.z_index) || 0)),
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
    alert_rule_id: row.alert_rule_id || null,
    revision: row.revision,
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
      return Response.json({ drawings: rows.map(responseDrawing) });
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
        revision: Number(existing?.revision || 0) + 1,
      };
      const row = existing
        ? await base44.asServiceRole.entities.ChartDrawing.update(existing.id, payload)
        : await base44.asServiceRole.entities.ChartDrawing.create(payload);
      await audit(base44, user.id, existing ? "drawing.update" : "drawing.create", "ChartDrawing", row.id, "success");
      return Response.json({ drawing: responseDrawing(row) });
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
        enabled: true,
      };
      rule = rule && rule.customer_id === profile.id
        ? await base44.asServiceRole.entities.AlertRule.update(rule.id, payload)
        : await base44.asServiceRole.entities.AlertRule.create(payload);
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
