import { invokeAppFunction, isReferencePreview } from "@/services/marketService";
import { normalizedDrawing } from "@/components/market/chartDrawingModel";

function storageKey(symbol, interval = "all") {
  return `kmy_chart_drawings_${symbol}_${interval}`;
}

function readLocal(symbol, interval = "all") {
  try {
    const scoped = localStorage.getItem(storageKey(symbol, interval));
    const legacy = localStorage.getItem(`kmy_chart_drawings_${symbol}`);
    return (JSON.parse(scoped || legacy || "[]") || []).map(normalizedDrawing).filter(Boolean);
  } catch {
    return [];
  }
}

function writeLocal(symbol, interval, drawings) {
  localStorage.setItem(storageKey(symbol, interval), JSON.stringify(drawings));
  return drawings;
}

export async function loadChartDrawings(symbol, interval) {
  if (isReferencePreview()) return readLocal(symbol, interval);
  const result = await invokeAppFunction("chartDrawings", { action: "list", symbol, interval_scope: interval });
  return (result.drawings || []).map(normalizedDrawing).filter(Boolean);
}

export async function saveChartDrawing(symbol, interval, drawing) {
  if (isReferencePreview()) {
    const scopedDrawing = { ...drawing, intervalScope: interval };
    const drawings = readLocal(symbol, interval);
    const index = drawings.findIndex((item) => item.clientId === drawing.clientId);
    if (index >= 0) drawings[index] = scopedDrawing;
    else drawings.push(scopedDrawing);
    writeLocal(symbol, interval, drawings);
    return scopedDrawing;
  }
  const result = await invokeAppFunction("chartDrawings", {
    action: "save",
    symbol,
    interval_scope: interval,
    drawing,
  });
  return normalizedDrawing(result.drawing);
}

export async function deleteChartDrawing(symbol, drawing, confirmAlertDelete = false) {
  if (isReferencePreview()) {
    const interval = drawing.intervalScope || "all";
    writeLocal(symbol, interval, readLocal(symbol, interval).filter((item) => item.clientId !== drawing.clientId));
    return { removed: true };
  }
  return invokeAppFunction("chartDrawings", {
    action: "delete",
    symbol,
    drawing_id: drawing.serverId,
    client_id: drawing.clientId,
    confirm_alert_delete: confirmAlertDelete,
  });
}

export async function duplicateChartDrawing(symbol, drawing, clientId) {
  if (isReferencePreview()) {
    const copy = {
      ...drawing,
      clientId,
      serverId: null,
      alert: null,
      points: drawing.points.map((point) => ({ ...point, logical: Number(point.logical || 0) + 1 })),
    };
    const interval = drawing.intervalScope || "all";
    const drawings = readLocal(symbol, interval);
    copy.zIndex = Math.max(0, ...drawings.map((item) => Number(item.zIndex || 0))) + 1;
    writeLocal(symbol, interval, [...drawings, copy]);
    return normalizedDrawing(copy);
  }
  const result = await invokeAppFunction("chartDrawings", {
    action: "duplicate",
    symbol,
    drawing_id: drawing.serverId,
    client_id: drawing.clientId,
    new_client_id: clientId,
  });
  return normalizedDrawing(result.drawing);
}

export async function saveDrawingAlert(symbol, drawing, alert) {
  if (isReferencePreview()) {
    const next = { ...drawing, alert: { id: `local-${drawing.clientId}`, ...alert } };
    await saveChartDrawing(symbol, drawing.intervalScope || "all", next);
    return next.alert;
  }
  const result = await invokeAppFunction("chartDrawings", {
    action: "save_alert",
    symbol,
    drawing_id: drawing.serverId,
    client_id: drawing.clientId,
    alert,
  });
  return { id: result.rule.id, enabled: result.rule.enabled, condition: result.rule.condition };
}

export async function deleteDrawingAlert(symbol, drawing) {
  if (isReferencePreview()) {
    await saveChartDrawing(symbol, drawing.intervalScope || "all", { ...drawing, alert: null });
    return { removed: true };
  }
  return invokeAppFunction("chartDrawings", {
    action: "delete_alert",
    symbol,
    drawing_id: drawing.serverId,
    client_id: drawing.clientId,
  });
}
