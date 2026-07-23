import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight, BellOff, BellPlus, BringToFront, Copy, Eye, EyeOff, GitCommitHorizontal,
  Lock, MousePointer2, MoveHorizontal, MoveVertical, Paintbrush, PenLine, Redo2, Route,
  Ruler, SendToBack, Spline, Square, Trash2, TrendingUp, Undo2, Unlock, X,
} from "lucide-react";
import {
  cloneDrawings, createDrawing, DRAWING_TYPES, drawingHitTest, drawingSegments, lineStyleDash,
} from "@/components/market/chartDrawingModel";
import {
  deleteChartDrawing, deleteDrawingAlert, loadChartDrawings, saveChartDrawing, saveDrawingAlert,
} from "@/services/drawingService";

const icons = {
  trend_line: TrendingUp,
  ray: GitCommitHorizontal,
  horizontal_line: MoveHorizontal,
  vertical_line: MoveVertical,
  arrow: ArrowUpRight,
  rectangle: Square,
  parallel_channel: Route,
  polyline: PenLine,
  curve: Spline,
  brush: Paintbrush,
  measure: Ruler,
};

function displayError(error, isArabic) {
  const code = error?.response?.data?.code;
  if (code === "DRAWING_ALERT_DELETE_CONFIRMATION_REQUIRED") return isArabic ? "هذا الرسم مرتبط بتنبيه. أكّد حذف الرسم والتنبيه معًا." : "This drawing has an alert. Confirm deleting both.";
  return error?.response?.data?.error || error?.message || (isArabic ? "تعذر حفظ الرسم." : "Drawing could not be saved.");
}

function canvasPoint(event, canvas, chart, series) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
  const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
  const time = chart.timeScale().coordinateToTime(x);
  const logical = chart.timeScale().coordinateToLogical(x);
  const price = series.coordinateToPrice(y);
  if (!Number.isFinite(Number(price)) || (!Number.isFinite(Number(time)) && !Number.isFinite(Number(logical)))) return null;
  return { time: Number(time), logical: Number(logical), price: Number(price), x, y };
}

function toCanvasPoint(point, chart, series) {
  const timeX = Number.isFinite(Number(point.time)) ? chart.timeScale().timeToCoordinate(Number(point.time)) : null;
  const logicalX = Number.isFinite(Number(point.logical)) ? chart.timeScale().logicalToCoordinate(Number(point.logical)) : null;
  const y = series.priceToCoordinate(Number(point.price));
  const x = timeX == null ? logicalX : timeX;
  return x == null || y == null ? null : { x, y };
}

function drawArrowHead(context, start, end, color, width) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const size = 9 + width * 2;
  context.beginPath();
  context.moveTo(end.x, end.y);
  context.lineTo(end.x - size * Math.cos(angle - Math.PI / 6), end.y - size * Math.sin(angle - Math.PI / 6));
  context.moveTo(end.x, end.y);
  context.lineTo(end.x - size * Math.cos(angle + Math.PI / 6), end.y - size * Math.sin(angle + Math.PI / 6));
  context.strokeStyle = color;
  context.stroke();
}

function fillColor(color, opacity) {
  const value = String(color || "#2563eb").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return "rgba(37,99,235,.12)";
  const [r, g, b] = [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(100, Number(opacity) || 0)) / 100})`;
}

function renderDrawing(context, drawing, points, width, height, selected, isArabic) {
  if (!drawing.visible || !points.length) return;
  const options = drawing.options || {};
  const color = options.color || "#2563eb";
  const lineWidth = Number(options.lineWidth) || 2;
  context.save();
  context.strokeStyle = color;
  context.fillStyle = fillColor(options.fillColor || color, options.fillOpacity);
  context.lineWidth = lineWidth;
  context.setLineDash(lineStyleDash(options.lineStyle, lineWidth));
  context.lineCap = "round";
  context.lineJoin = "round";

  if (drawing.type === "rectangle" && points[1]) {
    context.fillRect(points[0].x, points[0].y, points[1].x - points[0].x, points[1].y - points[0].y);
  } else if (drawing.type === "parallel_channel" && points[2]) {
    const offset = { x: points[2].x - points[1].x, y: points[2].y - points[1].y };
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    context.lineTo(points[1].x, points[1].y);
    context.lineTo(points[1].x + offset.x, points[1].y + offset.y);
    context.lineTo(points[0].x + offset.x, points[0].y + offset.y);
    context.closePath();
    context.fill();
  }

  if (drawing.type === "curve" && points.length >= 3) {
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    context.quadraticCurveTo(points[1].x, points[1].y, points[2].x, points[2].y);
    context.stroke();
  } else {
    drawingSegments(drawing.type, points, width, height, options).forEach(([start, end]) => {
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    });
  }

  if (drawing.type === "arrow" && points[1]) drawArrowHead(context, points[0], points[1], color, lineWidth);
  if (drawing.type === "measure" && points[1] && options.showLabel !== false) {
    const priceChange = drawing.points[1].price - drawing.points[0].price;
    const percentage = drawing.points[0].price ? priceChange / drawing.points[0].price * 100 : 0;
    const label = `${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(2)} (${percentage >= 0 ? "+" : ""}${percentage.toFixed(2)}%)`;
    context.font = "bold 12px Tajawal";
    const labelWidth = context.measureText(label).width + 14;
    const x = Math.min(width - labelWidth - 4, Math.max(4, (points[0].x + points[1].x) / 2 - labelWidth / 2));
    const y = Math.max(22, Math.min(height - 4, Math.min(points[0].y, points[1].y) - 8));
    context.fillStyle = "#0f172a";
    context.fillRect(x, y - 18, labelWidth, 20);
    context.fillStyle = "#fff";
    context.fillText(label, x + 7, y - 4);
  }

  if (selected) {
    context.setLineDash([]);
    points.forEach((point) => {
      context.beginPath();
      context.arc(point.x, point.y, 5, 0, Math.PI * 2);
      context.fillStyle = "#fff";
      context.fill();
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.stroke();
    });
    if (drawing.locked) {
      context.font = "bold 11px Tajawal";
      context.fillStyle = "#0f172a";
      context.fillText(isArabic ? "مقفل" : "Locked", points[0].x + 8, points[0].y - 8);
    }
  }
  context.restore();
}

export default function ChartDrawingTools({ chart, series, symbol, interval, mainPaneHeight = 470, isArabic }) {
  const instanceRef = useRef(crypto.randomUUID());
  const canvasRef = useRef(null);
  const interactionRef = useRef(null);
  const draftRef = useRef(null);
  const drawingsRef = useRef([]);
  const [drawings, setDrawings] = useState([]);
  const [activeTool, setActiveTool] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [status, setStatus] = useState("");
  const [showAlertEditor, setShowAlertEditor] = useState(false);
  const [alertForm, setAlertForm] = useState({ condition: "crosses", frequency: "repeat", cooldown_minutes: 15 });
  drawingsRef.current = drawings;
  draftRef.current = draft;
  const selected = drawings.find((drawing) => drawing.clientId === selectedId) || null;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !chart || !series) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(rect.height * ratio)) {
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
    }
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    [...drawingsRef.current, ...(draftRef.current ? [draftRef.current] : [])]
      .sort((a, b) => Number(a.zIndex || 0) - Number(b.zIndex || 0))
      .forEach((drawing) => {
        const points = drawing.points.map((point) => toCanvasPoint(point, chart, series)).filter(Boolean);
        if (points.length === drawing.points.length) renderDrawing(context, drawing, points, rect.width, rect.height, drawing.clientId === selectedId, isArabic);
      });
  }, [chart, series, selectedId, isArabic]);

  useEffect(() => { redraw(); }, [drawings, draft, redraw, mainPaneHeight]);

  useEffect(() => {
    if (!chart || !canvasRef.current) return undefined;
    const handler = () => window.requestAnimationFrame(redraw);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
    const observer = new ResizeObserver(handler);
    observer.observe(canvasRef.current);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
      observer.disconnect();
    };
  }, [chart, redraw]);

  useEffect(() => {
    let active = true;
    setSelectedId("");
    setStatus("");
    loadChartDrawings(symbol).then((values) => active && setDrawings(values)).catch((error) => active && setStatus(displayError(error, isArabic)));
    return () => { active = false; };
  }, [symbol, isArabic]);

  useEffect(() => {
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault(); redo();
      } else if (event.key === "Escape") {
        setDraft(null); setSelectedId(""); setActiveTool(null);
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectedId && !event.target.closest("input,select,textarea")) {
        event.preventDefault(); removeSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  function pushHistory(previous) {
    setUndoStack((stack) => [...stack.slice(-39), cloneDrawings(previous)]);
    setRedoStack([]);
  }

  function replaceDrawings(next, previous = drawingsRef.current) {
    pushHistory(previous);
    setDrawings(next);
  }

  async function persist(drawing) {
    try {
      const saved = await saveChartDrawing(symbol, interval, drawing);
      if (saved?.serverId) setDrawings((values) => values.map((item) => item.clientId === saved.clientId ? saved : item));
      setStatus(isArabic ? "تم حفظ الرسم." : "Drawing saved.");
    } catch (error) {
      setStatus(displayError(error, isArabic));
    }
  }

  async function persistSnapshot(next, previous) {
    const nextIds = new Set(next.map((item) => item.clientId));
    await Promise.all(next.map((item) => persist(item)));
    await Promise.all(previous.filter((item) => !nextIds.has(item.clientId)).map((item) => deleteChartDrawing(symbol, item, true).catch((error) => setStatus(displayError(error, isArabic)))));
  }

  function undo() {
    setUndoStack((stack) => {
      if (!stack.length) return stack;
      const previous = stack[stack.length - 1];
      const current = cloneDrawings(drawingsRef.current);
      setRedoStack((redoValues) => [...redoValues, current]);
      setDrawings(cloneDrawings(previous));
      persistSnapshot(previous, current);
      return stack.slice(0, -1);
    });
  }

  function redo() {
    setRedoStack((stack) => {
      if (!stack.length) return stack;
      const next = stack[stack.length - 1];
      const current = cloneDrawings(drawingsRef.current);
      setUndoStack((undoValues) => [...undoValues, current]);
      setDrawings(cloneDrawings(next));
      persistSnapshot(next, current);
      return stack.slice(0, -1);
    });
  }

  function finishDrawing(value) {
    if (!value || value.points.length < 1) return;
    const next = [...drawingsRef.current, value];
    replaceDrawings(next);
    setDraft(null);
    setSelectedId(value.clientId);
    setActiveTool("select");
    persist(value);
  }

  function pointerDown(event) {
    if (!chart || !series || !canvasRef.current || !activeTool) return;
    const point = canvasPoint(event, canvasRef.current, chart, series);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (activeTool === "select") {
      const canvas = canvasRef.current.getBoundingClientRect();
      const ordered = [...drawingsRef.current].sort((a, b) => Number(b.zIndex || 0) - Number(a.zIndex || 0));
      const found = ordered.find((drawing) => {
        if (!drawing.visible) return false;
        const points = drawing.points.map((item) => toCanvasPoint(item, chart, series)).filter(Boolean);
        return points.length === drawing.points.length && drawingHitTest(drawing.type, points, point, canvas.width, canvas.height, drawing.options).hit;
      });
      if (!found) { setSelectedId(""); return; }
      setSelectedId(found.clientId);
      if (found.locked) return;
      const points = found.points.map((item) => toCanvasPoint(item, chart, series));
      const hit = drawingHitTest(found.type, points, point, canvas.width, canvas.height, found.options);
      interactionRef.current = { mode: hit.handleIndex >= 0 ? "handle" : "move", handleIndex: hit.handleIndex, start: point, original: cloneDrawings([found])[0], before: cloneDrawings(drawingsRef.current) };
      return;
    }
    const value = createDrawing(activeTool, point, Math.max(0, ...drawingsRef.current.map((item) => Number(item.zIndex || 0))) + 1);
    if (["horizontal_line", "vertical_line"].includes(activeTool)) return finishDrawing(value);
    if (["polyline", "curve", "parallel_channel"].includes(activeTool)) {
      const current = draftRef.current?.type === activeTool ? { ...draftRef.current, points: [...draftRef.current.points, point] } : value;
      setDraft(current);
      if ((activeTool === "curve" || activeTool === "parallel_channel") && current.points.length === 3) finishDrawing(current);
      return;
    }
    setDraft({ ...value, points: [point, point] });
    interactionRef.current = { mode: activeTool === "brush" ? "brush" : "draw" };
  }

  function pointerMove(event) {
    if (!chart || !series || !canvasRef.current) return;
    const point = canvasPoint(event, canvasRef.current, chart, series);
    if (!point) return;
    const interaction = interactionRef.current;
    if (interaction?.mode === "draw" && draftRef.current) setDraft({ ...draftRef.current, points: [draftRef.current.points[0], point] });
    else if (interaction?.mode === "brush" && draftRef.current) setDraft({ ...draftRef.current, points: [...draftRef.current.points, point].slice(-500) });
    else if (interaction && ["move", "handle"].includes(interaction.mode)) {
      const original = interaction.original;
      let points;
      if (interaction.mode === "handle") {
        points = original.points.map((item, index) => index === interaction.handleIndex ? point : item);
      } else {
        points = original.points.map((item) => {
          const coordinate = toCanvasPoint(item, chart, series);
          const moved = coordinate ? canvasPoint({ clientX: event.clientX + coordinate.x - interaction.start.x, clientY: event.clientY + coordinate.y - interaction.start.y }, canvasRef.current, chart, series) : null;
          return moved || item;
        });
      }
      setDrawings((values) => values.map((item) => item.clientId === original.clientId ? { ...item, points } : item));
    }
  }

  function pointerUp(event) {
    const interaction = interactionRef.current;
    interactionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (interaction?.mode === "draw" || interaction?.mode === "brush") finishDrawing(draftRef.current);
    else if (interaction && ["move", "handle"].includes(interaction.mode)) {
      const changed = drawingsRef.current.find((item) => item.clientId === interaction.original.clientId);
      pushHistory(interaction.before);
      if (changed) persist(changed);
    }
  }

  function updateSelected(patch) {
    if (!selected || selected.locked && !Object.hasOwn(patch, "locked")) return;
    const nextDrawing = { ...selected, ...patch, options: patch.options ? { ...selected.options, ...patch.options } : selected.options };
    replaceDrawings(drawingsRef.current.map((item) => item.clientId === selected.clientId ? nextDrawing : item));
    persist(nextDrawing);
  }

  async function removeSelected(force = false) {
    if (!selected) return;
    if (selected.alert && !force) {
      const confirmed = window.confirm(isArabic ? "هذا الرسم مرتبط بتنبيه. هل تريد حذف الرسم والتنبيه معًا؟" : "This drawing has an alert. Delete both the drawing and alert?");
      if (!confirmed) return;
      force = true;
    }
    try {
      await deleteChartDrawing(symbol, selected, force);
      replaceDrawings(drawingsRef.current.filter((item) => item.clientId !== selected.clientId));
      setSelectedId("");
      setStatus(isArabic ? "تم حذف الرسم." : "Drawing deleted.");
    } catch (error) {
      if (error?.response?.data?.code === "DRAWING_ALERT_DELETE_CONFIRMATION_REQUIRED" && !force) return removeSelected(true);
      setStatus(displayError(error, isArabic));
    }
  }

  function duplicateSelected() {
    if (!selected) return;
    const copy = { ...cloneDrawings([selected])[0], clientId: crypto.randomUUID(), serverId: null, alert: null, zIndex: Math.max(0, ...drawingsRef.current.map((item) => item.zIndex || 0)) + 1 };
    replaceDrawings([...drawingsRef.current, copy]);
    setSelectedId(copy.clientId);
    persist(copy);
  }

  function orderSelected(direction) {
    if (!selected) return;
    const values = drawingsRef.current.map((item) => Number(item.zIndex || 0));
    updateSelected({ zIndex: direction === "front" ? Math.max(...values) + 1 : Math.min(...values) - 1 });
  }

  async function submitAlert(event) {
    event.preventDefault();
    if (!selected) return;
    try {
      let drawing = selected;
      if (!drawing.serverId && !String(drawing.alert?.id || "").startsWith("local-")) drawing = await saveChartDrawing(symbol, interval, drawing);
      const alert = await saveDrawingAlert(symbol, drawing, alertForm);
      setDrawings((values) => values.map((item) => item.clientId === drawing.clientId ? { ...item, serverId: drawing.serverId, alert } : item));
      setShowAlertEditor(false);
      setStatus(isArabic ? "تم تفعيل تنبيه الرسم." : "Drawing alert enabled.");
    } catch (error) {
      setStatus(displayError(error, isArabic));
    }
  }

  async function removeAlert() {
    if (!selected?.alert) return;
    try {
      await deleteDrawingAlert(symbol, selected);
      setDrawings((values) => values.map((item) => item.clientId === selected.clientId ? { ...item, alert: null } : item));
      setShowAlertEditor(false);
      setStatus(isArabic ? "تم حذف تنبيه الرسم." : "Drawing alert removed.");
    } catch (error) { setStatus(displayError(error, isArabic)); }
  }

  const selectedType = useMemo(() => DRAWING_TYPES.find((item) => item.id === selected?.type), [selected]);

  return <>
    <div className="drawing-tools-bar" data-drawing-instance={instanceRef.current} data-active-tool={activeTool || ""} role="toolbar" aria-label={isArabic ? "أدوات الرسم" : "Drawing tools"}>
      <button type="button" className={activeTool === "select" ? "active" : ""} onClick={() => setActiveTool(activeTool === "select" ? null : "select")} title={isArabic ? "تحديد وتحريك الرسومات" : "Select and move drawings"}><MousePointer2 size={16} /></button>
      {DRAWING_TYPES.map((tool) => {
        const Icon = icons[tool.id];
        return <button type="button" key={tool.id} className={activeTool === tool.id ? "active" : ""} onClick={() => { setActiveTool(tool.id); setSelectedId(""); setDraft(null); }} title={isArabic ? tool.ar : tool.en}><Icon size={16} /></button>;
      })}
      <span className="drawing-tools-separator" />
      <button type="button" onClick={undo} disabled={!undoStack.length} title={isArabic ? "تراجع" : "Undo"}><Undo2 size={16} /></button>
      <button type="button" onClick={redo} disabled={!redoStack.length} title={isArabic ? "إعادة" : "Redo"}><Redo2 size={16} /></button>
    </div>

    {status && <div className="drawing-status" role="status"><span>{status}</span><button type="button" onClick={() => setStatus("")}><X size={13} /></button></div>}

    <canvas
      ref={canvasRef}
      className={"chart-drawing-canvas " + (activeTool ? "chart-drawing-canvas-active" : "")}
      style={{ height: mainPaneHeight }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onDoubleClick={() => draftRef.current && ["polyline"].includes(draftRef.current.type) && finishDrawing(draftRef.current)}
      aria-label={isArabic ? "طبقة الرسم على الشارت" : "Chart drawing layer"}
    />

    {selected && <div className="drawing-selection-toolbar" role="toolbar" aria-label={isArabic ? "خصائص الرسم المحدد" : "Selected drawing properties"}>
      <b>{isArabic ? selectedType?.ar : selectedType?.en}</b>
      <input type="color" value={selected.options.color} onChange={(event) => updateSelected({ options: { color: event.target.value } })} title={isArabic ? "لون الخط" : "Line color"} />
      <select value={selected.options.lineWidth} onChange={(event) => updateSelected({ options: { lineWidth: Number(event.target.value) } })} aria-label={isArabic ? "سماكة الخط" : "Line width"}><option value="1">1px</option><option value="2">2px</option><option value="3">3px</option><option value="4">4px</option></select>
      <select value={selected.options.lineStyle} onChange={(event) => updateSelected({ options: { lineStyle: event.target.value } })} aria-label={isArabic ? "نمط الخط" : "Line style"}><option value="solid">{isArabic ? "متصل" : "Solid"}</option><option value="dashed">{isArabic ? "متقطع" : "Dashed"}</option><option value="dotted">{isArabic ? "منقط" : "Dotted"}</option></select>
      {["trend_line", "ray"].includes(selected.type) && <><label><input type="checkbox" checked={selected.options.extendLeft} onChange={(event) => updateSelected({ options: { extendLeft: event.target.checked } })} />{isArabic ? "امتداد يسار" : "Extend left"}</label><label><input type="checkbox" checked={selected.options.extendRight || selected.type === "ray"} disabled={selected.type === "ray"} onChange={(event) => updateSelected({ options: { extendRight: event.target.checked } })} />{isArabic ? "امتداد يمين" : "Extend right"}</label></>}
      <button type="button" onClick={() => updateSelected({ locked: !selected.locked })} title={selected.locked ? (isArabic ? "فتح القفل" : "Unlock") : (isArabic ? "قفل الرسم" : "Lock")}>{selected.locked ? <Lock size={15} /> : <Unlock size={15} />}</button>
      <button type="button" onClick={() => updateSelected({ visible: !selected.visible })} title={selected.visible ? (isArabic ? "إخفاء" : "Hide") : (isArabic ? "إظهار" : "Show")}>{selected.visible ? <Eye size={15} /> : <EyeOff size={15} />}</button>
      <button type="button" onClick={() => setShowAlertEditor(true)} title={isArabic ? "تنبيه الرسم" : "Drawing alert"}>{selected.alert ? <BellOff size={15} /> : <BellPlus size={15} />}</button>
      <button type="button" onClick={duplicateSelected} title={isArabic ? "نسخ" : "Duplicate"}><Copy size={15} /></button>
      <button type="button" onClick={() => orderSelected("front")} title={isArabic ? "إلى الأمام" : "Bring to front"}><BringToFront size={15} /></button>
      <button type="button" onClick={() => orderSelected("back")} title={isArabic ? "إلى الخلف" : "Send to back"}><SendToBack size={15} /></button>
      <button type="button" className="danger" onClick={() => removeSelected()} title={isArabic ? "حذف" : "Delete"}><Trash2 size={15} /></button>
    </div>}

    {showAlertEditor && selected && <div className="drawing-alert-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowAlertEditor(false)}>
      <form className="drawing-alert-dialog" onSubmit={submitAlert}>
        <div><b>{isArabic ? "تنبيه الرسم" : "Drawing alert"}</b><button type="button" onClick={() => setShowAlertEditor(false)}><X size={16} /></button></div>
        <p>{isArabic ? "يُفحص السعر مقابل الرسم في دورات تحديث السوق. لا يُرسل تنبيه مكرر داخل مدة التهدئة." : "Price is evaluated against this drawing during market refresh cycles. Cooldown prevents duplicates."}</p>
        <label><span>{isArabic ? "الشرط" : "Condition"}</span><select value={alertForm.condition} onChange={(event) => setAlertForm((value) => ({ ...value, condition: event.target.value }))}><option value="crosses">{isArabic ? "عبور الرسم بأي اتجاه" : "Crosses either direction"}</option><option value="crosses_above">{isArabic ? "اختراق صاعد" : "Crosses above"}</option><option value="crosses_below">{isArabic ? "كسر هابط" : "Crosses below"}</option></select></label>
        <label><span>{isArabic ? "التكرار" : "Frequency"}</span><select value={alertForm.frequency} onChange={(event) => setAlertForm((value) => ({ ...value, frequency: event.target.value }))}><option value="repeat">{isArabic ? "متكرر" : "Repeat"}</option><option value="once">{isArabic ? "مرة واحدة" : "Once"}</option></select></label>
        <label><span>{isArabic ? "مدة منع التكرار بالدقائق" : "Cooldown minutes"}</span><input type="number" min="15" max="10080" value={alertForm.cooldown_minutes} onChange={(event) => setAlertForm((value) => ({ ...value, cooldown_minutes: Number(event.target.value) }))} /></label>
        <div className="drawing-alert-actions">{selected.alert && <button type="button" className="danger" onClick={removeAlert}>{isArabic ? "حذف التنبيه" : "Delete alert"}</button>}<button type="button" onClick={() => setShowAlertEditor(false)}>{isArabic ? "إلغاء" : "Cancel"}</button><button type="submit" className="primary">{isArabic ? "حفظ التنبيه" : "Save alert"}</button></div>
      </form>
    </div>}
  </>;
}
