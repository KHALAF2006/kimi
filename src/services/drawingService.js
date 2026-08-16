import { invokeAppFunction, isReferencePreview } from "@/services/marketService";
import { normalizedDrawing } from "@/components/market/chartDrawingModel";

function storageKey(marketCode, symbol, interval = "all") {
  return `smart_investor_chart_drawings_${marketCode}_${symbol}_${interval}`;
}

function readLocal(marketCode, symbol, interval = "all") {
  try {
    const scoped = localStorage.getItem(storageKey(marketCode, symbol, interval));
    const legacyInterval = marketCode === "SA_MAIN" ? localStorage.getItem(`smart_investor_chart_drawings_${symbol}_${interval}`) : null;
    const legacySymbol = marketCode === "SA_MAIN" ? localStorage.getItem(`smart_investor_chart_drawings_${symbol}`) : null;
    const raw = scoped || legacyInterval || legacySymbol || "[]";
    const drawings = (JSON.parse(raw) || []).map(normalizedDrawing).filter(Boolean);
    if (!scoped && drawings.length) localStorage.setItem(storageKey(marketCode, symbol, interval), JSON.stringify(drawings));
    return drawings;
  } catch {
    return [];
  }
}

function writeLocal(marketCode, symbol, interval, drawings) {
  try {
    localStorage.setItem(storageKey(marketCode, symbol, interval), JSON.stringify(drawings));
    return true;
  } catch {
    return false;
  }
}

function replaceLocalDrawing(marketCode, symbol, interval, drawing) {
  const drawings = readLocal(marketCode, symbol, interval);
  const index = drawings.findIndex((item) => item.clientId === drawing.clientId);
  if (index >= 0) drawings[index] = drawing;
  else drawings.push(drawing);
  return writeLocal(marketCode, symbol, interval, drawings);
}

function announceLocalFallback(marketCode, symbol, interval) {
  window.dispatchEvent(new CustomEvent("smart-investor:drawing-local-fallback", { detail: { marketCode, symbol, interval } }));
}

export async function loadChartDrawings(marketCode, symbol, interval) {
  if (isReferencePreview()) return readLocal(marketCode, symbol, interval);
  const local = readLocal(marketCode, symbol, interval);
  try {
    const result = await invokeAppFunction("chartDrawings", { action: "list", market_code: marketCode, symbol, interval_scope: interval });
    const drawings = (result.drawings || []).map(normalizedDrawing).filter(Boolean);
    writeLocal(marketCode, symbol, interval, drawings);
    return drawings;
  } catch (error) {
    if (!local.length) throw error;
    announceLocalFallback(marketCode, symbol, interval);
    return local;
  }
}

export async function saveChartDrawing(marketCode, symbol, interval, drawing) {
  if (isReferencePreview()) {
    const scopedDrawing = { ...drawing, intervalScope: interval };
    const drawings = readLocal(marketCode, symbol, interval);
    const index = drawings.findIndex((item) => item.clientId === drawing.clientId);
    if (index >= 0) drawings[index] = scopedDrawing;
    else drawings.push(scopedDrawing);
    writeLocal(marketCode, symbol, interval, drawings);
    return scopedDrawing;
  }
  const scopedDrawing = normalizedDrawing({ ...drawing, intervalScope: interval });
  const localBackupSaved = replaceLocalDrawing(marketCode, symbol, interval, scopedDrawing);
  try {
    const result = await invokeAppFunction("chartDrawings", {
      action: "save",
      market_code: marketCode,
      symbol,
      interval_scope: interval,
      drawing,
    });
    const saved = normalizedDrawing(result.drawing);
    replaceLocalDrawing(marketCode, symbol, interval, saved);
    return saved;
  } catch (error) {
    error.localBackupSaved = localBackupSaved;
    throw error;
  }
}

export async function deleteChartDrawing(marketCode, symbol, drawing, confirmAlertDelete = false) {
  if (isReferencePreview()) {
    const interval = drawing.intervalScope || "all";
    writeLocal(marketCode, symbol, interval, readLocal(marketCode, symbol, interval).filter((item) => item.clientId !== drawing.clientId));
    return { removed: true };
  }
  const result = await invokeAppFunction("chartDrawings", {
    action: "delete",
    market_code: marketCode,
    symbol,
    drawing_id: drawing.serverId,
    client_id: drawing.clientId,
    confirm_alert_delete: confirmAlertDelete,
  });
  const interval = drawing.intervalScope || "all";
  writeLocal(marketCode, symbol, interval, readLocal(marketCode, symbol, interval).filter((item) => item.clientId !== drawing.clientId));
  return result;
}

export async function duplicateChartDrawing(marketCode, symbol, drawing, clientId, points = drawing.points) {
  if (isReferencePreview()) {
    const copy = {
      ...drawing,
      clientId,
      serverId: null,
      alert: null,
      points,
    };
    const interval = drawing.intervalScope || "all";
    const drawings = readLocal(marketCode, symbol, interval);
    copy.zIndex = Math.max(0, ...drawings.map((item) => Number(item.zIndex || 0))) + 1;
    writeLocal(marketCode, symbol, interval, [...drawings, copy]);
    return normalizedDrawing(copy);
  }
  const result = await invokeAppFunction("chartDrawings", {
    action: "duplicate",
    market_code: marketCode,
    symbol,
    drawing_id: drawing.serverId,
    client_id: drawing.clientId,
    new_client_id: clientId,
    points,
  });
  const copy = normalizedDrawing(result.drawing);
  replaceLocalDrawing(marketCode, symbol, drawing.intervalScope || "all", copy);
  return copy;
}

export async function saveDrawingAlert(marketCode, symbol, drawing, alert) {
  if (isReferencePreview()) {
    const next = { ...drawing, alert: { id: `local-${drawing.clientId}`, ...alert } };
    await saveChartDrawing(marketCode, symbol, drawing.intervalScope || "all", next);
    return next.alert;
  }
  const result = await invokeAppFunction("chartDrawings", {
    action: "save_alert",
    market_code: marketCode,
    symbol,
    drawing_id: drawing.serverId,
    client_id: drawing.clientId,
    alert,
  });
  const nextAlert = { id: result.rule.id, enabled: result.rule.enabled, condition: result.rule.condition };
  replaceLocalDrawing(marketCode, symbol, drawing.intervalScope || "all", { ...drawing, alert: nextAlert });
  return nextAlert;
}

export async function deleteDrawingAlert(marketCode, symbol, drawing) {
  if (isReferencePreview()) {
    await saveChartDrawing(marketCode, symbol, drawing.intervalScope || "all", { ...drawing, alert: null });
    return { removed: true };
  }
  const result = await invokeAppFunction("chartDrawings", {
    action: "delete_alert",
    market_code: marketCode,
    symbol,
    drawing_id: drawing.serverId,
    client_id: drawing.clientId,
  });
  replaceLocalDrawing(marketCode, symbol, drawing.intervalScope || "all", { ...drawing, alert: null });
  return result;
}

export async function setAllChartDrawingsVisibility(marketCode, symbol, interval, visible) {
  if (isReferencePreview()) {
    const drawings = readLocal(marketCode, symbol, interval).map((drawing) => ({ ...drawing, visible: Boolean(visible) }));
    writeLocal(marketCode, symbol, interval, drawings);
    return { updated: drawings.length, drawings };
  }
  const result = await invokeAppFunction("chartDrawings", {
    action: "set_visibility_bulk",
    market_code: marketCode,
    symbol,
    interval_scope: interval,
    visible: Boolean(visible),
  });
  writeLocal(marketCode, symbol, interval, readLocal(marketCode, symbol, interval).map((drawing) => ({ ...drawing, visible: Boolean(visible) })));
  return result;
}

export async function deleteAllChartDrawings(marketCode, symbol, interval, confirmAlertDelete = false) {
  if (isReferencePreview()) {
    const count = readLocal(marketCode, symbol, interval).length;
    writeLocal(marketCode, symbol, interval, []);
    return { removed: count };
  }
  const result = await invokeAppFunction("chartDrawings", {
    action: "delete_all",
    market_code: marketCode,
    symbol,
    interval_scope: interval,
    confirm_all: true,
    confirm_alert_delete: Boolean(confirmAlertDelete),
  });
  writeLocal(marketCode, symbol, interval, []);
  return result;
}
