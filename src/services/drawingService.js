import { invokeAppFunction, isReferencePreview } from "@/services/marketService";
import { normalizedDrawing } from "@/components/market/chartDrawingModel";

function storageKey(marketCode, symbol, interval = "all") {
  return `kmy_chart_drawings_${marketCode}_${symbol}_${interval}`;
}

function readLocal(marketCode, symbol, interval = "all") {
  try {
    const scoped = localStorage.getItem(storageKey(marketCode, symbol, interval));
    const legacyInterval = marketCode === "SA_MAIN" ? localStorage.getItem(`kmy_chart_drawings_${symbol}_${interval}`) : null;
    const legacySymbol = marketCode === "SA_MAIN" ? localStorage.getItem(`kmy_chart_drawings_${symbol}`) : null;
    const raw = scoped || legacyInterval || legacySymbol || "[]";
    const drawings = (JSON.parse(raw) || []).map(normalizedDrawing).filter(Boolean);
    if (!scoped && drawings.length) localStorage.setItem(storageKey(marketCode, symbol, interval), JSON.stringify(drawings));
    return drawings;
  } catch {
    return [];
  }
}

function writeLocal(marketCode, symbol, interval, drawings) {
  localStorage.setItem(storageKey(marketCode, symbol, interval), JSON.stringify(drawings));
  return drawings;
}

export async function loadChartDrawings(marketCode, symbol, interval) {
  if (isReferencePreview()) return readLocal(marketCode, symbol, interval);
  const result = await invokeAppFunction("chartDrawings", { action: "list", market_code: marketCode, symbol, interval_scope: interval });
  return (result.drawings || []).map(normalizedDrawing).filter(Boolean);
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
  const result = await invokeAppFunction("chartDrawings", {
    action: "save",
    market_code: marketCode,
    symbol,
    interval_scope: interval,
    drawing,
  });
  return normalizedDrawing(result.drawing);
}

export async function deleteChartDrawing(marketCode, symbol, drawing, confirmAlertDelete = false) {
  if (isReferencePreview()) {
    const interval = drawing.intervalScope || "all";
    writeLocal(marketCode, symbol, interval, readLocal(marketCode, symbol, interval).filter((item) => item.clientId !== drawing.clientId));
    return { removed: true };
  }
  return invokeAppFunction("chartDrawings", {
    action: "delete",
    market_code: marketCode,
    symbol,
    drawing_id: drawing.serverId,
    client_id: drawing.clientId,
    confirm_alert_delete: confirmAlertDelete,
  });
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
  return normalizedDrawing(result.drawing);
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
  return { id: result.rule.id, enabled: result.rule.enabled, condition: result.rule.condition };
}

export async function deleteDrawingAlert(marketCode, symbol, drawing) {
  if (isReferencePreview()) {
    await saveChartDrawing(marketCode, symbol, drawing.intervalScope || "all", { ...drawing, alert: null });
    return { removed: true };
  }
  return invokeAppFunction("chartDrawings", {
    action: "delete_alert",
    market_code: marketCode,
    symbol,
    drawing_id: drawing.serverId,
    client_id: drawing.clientId,
  });
}

export async function setAllChartDrawingsVisibility(marketCode, symbol, interval, visible) {
  if (isReferencePreview()) {
    const drawings = readLocal(marketCode, symbol, interval).map((drawing) => ({ ...drawing, visible: Boolean(visible) }));
    writeLocal(marketCode, symbol, interval, drawings);
    return { updated: drawings.length, drawings };
  }
  return invokeAppFunction("chartDrawings", {
    action: "set_visibility_bulk",
    market_code: marketCode,
    symbol,
    interval_scope: interval,
    visible: Boolean(visible),
  });
}

export async function deleteAllChartDrawings(marketCode, symbol, interval, confirmAlertDelete = false) {
  if (isReferencePreview()) {
    const count = readLocal(marketCode, symbol, interval).length;
    writeLocal(marketCode, symbol, interval, []);
    return { removed: count };
  }
  return invokeAppFunction("chartDrawings", {
    action: "delete_all",
    market_code: marketCode,
    symbol,
    interval_scope: interval,
    confirm_all: true,
    confirm_alert_delete: Boolean(confirmAlertDelete),
  });
}
