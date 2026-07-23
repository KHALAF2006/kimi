import { invokeAppFunction, isReferencePreview } from "@/services/marketService";
import { normalizedDrawing } from "@/components/market/chartDrawingModel";

function storageKey(symbol) {
  return `kmy_chart_drawings_${symbol}`;
}

function readLocal(symbol) {
  try {
    return (JSON.parse(localStorage.getItem(storageKey(symbol)) || "[]") || []).map(normalizedDrawing).filter(Boolean);
  } catch {
    return [];
  }
}

function writeLocal(symbol, drawings) {
  localStorage.setItem(storageKey(symbol), JSON.stringify(drawings));
  return drawings;
}

export async function loadChartDrawings(symbol) {
  if (isReferencePreview()) return readLocal(symbol);
  const result = await invokeAppFunction("chartDrawings", { action: "list", symbol });
  return (result.drawings || []).map(normalizedDrawing).filter(Boolean);
}

export async function saveChartDrawing(symbol, interval, drawing) {
  if (isReferencePreview()) {
    const drawings = readLocal(symbol);
    const index = drawings.findIndex((item) => item.clientId === drawing.clientId);
    if (index >= 0) drawings[index] = drawing;
    else drawings.push(drawing);
    writeLocal(symbol, drawings);
    return drawing;
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
    writeLocal(symbol, readLocal(symbol).filter((item) => item.clientId !== drawing.clientId));
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

export async function saveDrawingAlert(symbol, drawing, alert) {
  if (isReferencePreview()) {
    const next = { ...drawing, alert: { id: `local-${drawing.clientId}`, ...alert } };
    await saveChartDrawing(symbol, "all", next);
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
    await saveChartDrawing(symbol, "all", { ...drawing, alert: null });
    return { removed: true };
  }
  return invokeAppFunction("chartDrawings", {
    action: "delete_alert",
    symbol,
    drawing_id: drawing.serverId,
    client_id: drawing.clientId,
  });
}
