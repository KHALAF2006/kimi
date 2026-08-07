import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, BellOff, BellPlus, Brush, ChevronDown, ChevronRight, ClipboardPaste, Copy, Equal, Eye, EyeOff, Frame,
  Grip, LayoutList, Lock, Minus, MousePointer2, MoveHorizontal, MoveUpRight, MoveVertical, PanelLeftClose, PanelTopClose,
  PenLine, Redo2, RefreshCcw, Slash, Spline, Square, Trash2, Undo2, Unlock, Waypoints, X,
} from "lucide-react";
import {
  cloneDrawings, createDrawing, DRAWING_TYPES, drawingFillPolygon, drawingHitTest, drawingSegments, lineStyleDash,
  normalizedDrawing,
} from "@/components/market/chartDrawingModel";
import {
  deleteAllChartDrawings, deleteChartDrawing, deleteDrawingAlert, duplicateChartDrawing, loadChartDrawings,
  saveChartDrawing, saveDrawingAlert, setAllChartDrawingsVisibility,
} from "@/services/drawingService";

// Icon glyphs follow the shapes traders already recognise from TradingView:
// the icon is a miniature of the drawing it produces, not a themed pictogram.
const icons = {
  trend_line: { Icon: Slash, rotate: 0 },
  ray: { Icon: MoveUpRight, rotate: 0 },
  horizontal_line: { Icon: Minus, rotate: 0 },
  vertical_line: { Icon: Minus, rotate: 90 },
  arrow: { Icon: MoveUpRight, rotate: 0 },
  rectangle: { Icon: Square, rotate: 0 },
  parallel_channel: { Icon: Equal, rotate: -28 },
  polyline: { Icon: Waypoints, rotate: 0 },
  curve: { Icon: Spline, rotate: 0 },
  brush: { Icon: Brush, rotate: 0 },
  price_range: { Icon: MoveVertical, rotate: 0 },
  date_range: { Icon: MoveHorizontal, rotate: 0 },
  date_and_price_range: { Icon: Frame, rotate: 0 },
};
const ALERT_TYPES = new Set(["trend_line", "ray", "horizontal_line"]);
const RANGE_TYPES = new Set(["price_range", "date_range", "date_and_price_range"]);
const TOOLBAR_STORAGE_KEY = "si_drawing_toolbar_layout";
const SELECTION_TOOLBAR_STORAGE_KEY = "si_drawing_selection_toolbar_layout";
const DRAWING_CLIPBOARD_STORAGE_KEY = "kmy_drawing_clipboard_v1";
const DRAWING_CLIPBOARD_PREFIX = "KMY_DRAWING:";
const DEFAULT_TOOLBAR_LAYOUT = { x: null, y: 8, orientation: "horizontal", collapsed: false, hidden: false };

function storedToolbarLayout() {
  try {
    const value = JSON.parse(localStorage.getItem(TOOLBAR_STORAGE_KEY) || "null");
    if (!value || typeof value !== "object") return { ...DEFAULT_TOOLBAR_LAYOUT };
    const x = value.x === null || value.x === undefined || !Number.isFinite(Number(value.x)) ? null : Math.max(4, Number(value.x));
    const y = Number.isFinite(Number(value.y)) ? Math.max(4, Number(value.y)) : DEFAULT_TOOLBAR_LAYOUT.y;
    return { x, y, orientation: value.orientation === "vertical" ? "vertical" : "horizontal", collapsed: Boolean(value.collapsed), hidden: Boolean(value.hidden) };
  } catch {
    return { ...DEFAULT_TOOLBAR_LAYOUT };
  }
}

function storedSelectionToolbarLayout() {
  try {
    const value = JSON.parse(localStorage.getItem(SELECTION_TOOLBAR_STORAGE_KEY) || "null");
    return value && Number.isFinite(Number(value.x)) && Number.isFinite(Number(value.y))
      ? { x: Number(value.x), y: Number(value.y) }
      : { x: null, y: 96 };
  } catch {
    return { x: null, y: 96 };
  }
}

function clipboardPayloadDrawing(value) {
  const drawing = value?.drawing ? normalizedDrawing(value.drawing) : null;
  if (!drawing) return null;
  return {
    ...drawing,
    clipboardMarket: String(value.marketCode || "SA_MAIN").slice(0, 32),
    clipboardSymbol: String(value.symbol || "").slice(0, 32),
    clipboardInterval: String(value.interval || "").slice(0, 8),
  };
}

function storedClipboardDrawing() {
  try {
    return clipboardPayloadDrawing(JSON.parse(localStorage.getItem(DRAWING_CLIPBOARD_STORAGE_KEY) || "null"));
  } catch {
    return null;
  }
}

function smoothPath(context, points, tension = 0.85) {
  if (!points.length) return;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  if (points.length === 2) {
    context.lineTo(points[1].x, points[1].y);
  } else {
    for (let index = 0; index < points.length - 1; index += 1) {
      const previous = points[index - 1] || points[index];
      const start = points[index];
      const end = points[index + 1];
      const next = points[index + 2] || end;
      const firstControl = {
        x: start.x + (end.x - previous.x) / 6 * tension,
        y: start.y + (end.y - previous.y) / 6 * tension,
      };
      const secondControl = {
        x: end.x - (next.x - start.x) / 6 * tension,
        y: end.y - (next.y - start.y) / 6 * tension,
      };
      context.bezierCurveTo(firstControl.x, firstControl.y, secondControl.x, secondControl.y, end.x, end.y);
    }
  }
  context.stroke();
}

function squareDistanceToSegment(point, start, end) {
  let x = start.x;
  let y = start.y;
  const dx = end.x - x;
  const dy = end.y - y;
  if (dx || dy) {
    const ratio = Math.max(0, Math.min(1, ((point.x - x) * dx + (point.y - y) * dy) / (dx * dx + dy * dy)));
    x += dx * ratio;
    y += dy * ratio;
  }
  const offsetX = point.x - x;
  const offsetY = point.y - y;
  return offsetX * offsetX + offsetY * offsetY;
}

function simplifyFreehand(points, tolerance = 1.6) {
  if (points.length <= 2) return points;
  const squareTolerance = tolerance * tolerance;
  const radial = [points[0]];
  let previous = points[0];
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    const dx = Number(point.x) - Number(previous.x);
    const dy = Number(point.y) - Number(previous.y);
    if (dx * dx + dy * dy >= squareTolerance || index === points.length - 1) {
      radial.push(point);
      previous = point;
    }
  }
  if (radial.length <= 2) return radial;
  const keep = new Uint8Array(radial.length);
  keep[0] = 1;
  keep[radial.length - 1] = 1;
  const stack = [[0, radial.length - 1]];
  while (stack.length) {
    const [startIndex, endIndex] = stack.pop();
    let furthestIndex = 0;
    let furthestDistance = squareTolerance;
    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const distance = squareDistanceToSegment(radial[index], radial[startIndex], radial[endIndex]);
      if (distance > furthestDistance) {
        furthestIndex = index;
        furthestDistance = distance;
      }
    }
    if (furthestIndex) {
      keep[furthestIndex] = 1;
      stack.push([startIndex, furthestIndex], [furthestIndex, endIndex]);
    }
  }
  return radial.filter((_point, index) => keep[index]).slice(0, 500);
}

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

function offsetPointsForPaste(drawing, chart, series, canvas) {
  const rect = canvas?.getBoundingClientRect();
  if (!rect) return drawing.points.map((point) => ({ ...point }));
  return drawing.points.map((point) => {
    const projected = toCanvasPoint(point, chart, series);
    if (!projected) return { ...point, logical: Number(point.logical || 0) + 1 };
    const x = Math.max(0, Math.min(rect.width - 1, projected.x + 18));
    const y = Math.max(0, Math.min(rect.height - 1, projected.y + 12));
    const time = chart.timeScale().coordinateToTime(x);
    const logical = chart.timeScale().coordinateToLogical(x);
    const price = series.coordinateToPrice(y);
    return {
      ...(Number.isFinite(Number(time)) ? { time: Number(time) } : {}),
      ...(Number.isFinite(Number(logical)) ? { logical: Number(logical) } : {}),
      price: Number.isFinite(Number(price)) && Number(price) > 0 ? Number(price) : Number(point.price),
    };
  });
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

function drawDoubleArrow(context, start, end, color, width) {
  drawArrowHead(context, start, end, color, width);
  drawArrowHead(context, end, start, color, width);
}

function fillColor(color, opacity) {
  const value = String(color || "#2563eb").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return "rgba(37,99,235,.12)";
  const [r, g, b] = [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(100, Number(opacity) || 0)) / 100})`;
}

function formatDuration(seconds, isArabic) {
  const absolute = Math.max(0, Math.round(Math.abs(seconds)));
  const units = /** @type {Array<[number, string]>} */ ([
    [31_536_000, isArabic ? "سنة" : "y"],
    [2_592_000, isArabic ? "شهر" : "mo"],
    [86_400, isArabic ? "يوم" : "d"],
    [3_600, isArabic ? "ساعة" : "h"],
    [60, isArabic ? "دقيقة" : "m"],
  ]);
  const [size, label] = units.find(([value]) => absolute >= value) || [1, isArabic ? "ثانية" : "s"];
  return `${Math.max(1, Math.round(absolute / size)).toLocaleString(isArabic ? "ar-SA" : "en-US")} ${label}`;
}

function measurementLabel(drawing, isArabic, minMove) {
  const [start, end] = drawing.points;
  const parts = [];
  if (drawing.type !== "date_range") {
    const priceChange = Number(end.price) - Number(start.price);
    const percentage = Number(start.price) ? priceChange / Number(start.price) * 100 : 0;
    const ticks = Math.round(Math.abs(priceChange) / Math.max(Number(minMove) || 0.01, 1e-9));
    parts.push(`${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(2)} (${percentage >= 0 ? "+" : ""}${percentage.toFixed(2)}%)`);
    parts.push(`${ticks.toLocaleString(isArabic ? "ar-SA" : "en-US")} ${isArabic ? "خطوة" : "ticks"}`);
  }
  if (drawing.type !== "price_range") {
    const bars = Math.max(0, Math.round(Math.abs(Number(end.logical) - Number(start.logical))));
    const seconds = Number.isFinite(Number(start.time)) && Number.isFinite(Number(end.time)) ? Number(end.time) - Number(start.time) : 0;
    parts.push(`${bars.toLocaleString(isArabic ? "ar-SA" : "en-US")} ${isArabic ? "شمعة" : "bars"}`);
    if (seconds) parts.push(formatDuration(seconds, isArabic));
  }
  return parts.join(" · ");
}

function renderDrawing(context, drawing, points, width, height, selected, isArabic, minMove) {
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

  const fillPolygon = drawingFillPolygon(drawing.type, points, width, height, options);
  if (fillPolygon.length >= 3) {
    context.beginPath();
    context.moveTo(fillPolygon[0].x, fillPolygon[0].y);
    fillPolygon.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    context.closePath();
    context.fill();
  }

  if ((drawing.type === "curve" || drawing.type === "brush") && points.length >= 2) {
    smoothPath(context, points);
  } else {
    const segments = drawingSegments(drawing.type, points, width, height, options);
    segments.forEach(([start, end], index) => {
      if (drawing.type === "parallel_channel" && index === 2) {
        context.setLineDash(lineStyleDash(options.medianStyle || "dashed", Math.max(1, lineWidth - 1)));
        context.globalAlpha = 0.72;
      } else {
        context.setLineDash(lineStyleDash(options.lineStyle, lineWidth));
        context.globalAlpha = 1;
      }
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    });
  }

  if (drawing.type === "arrow" && points[1]) drawArrowHead(context, points[0], points[1], color, lineWidth);
  if (RANGE_TYPES.has(drawing.type) && points[1]) {
    const segments = drawingSegments(drawing.type, points, width, height, options);
    if (drawing.type === "price_range") drawDoubleArrow(context, ...segments[2], color, lineWidth);
    if (drawing.type === "date_range") drawDoubleArrow(context, ...segments[2], color, lineWidth);
    if (drawing.type === "date_and_price_range") {
      drawDoubleArrow(context, ...segments.at(-1), color, lineWidth);
      drawDoubleArrow(context, ...segments.at(-2), color, lineWidth);
    }
  }
  if (RANGE_TYPES.has(drawing.type) && points[1] && options.showLabel !== false) {
    const label = measurementLabel(drawing, isArabic, minMove);
    context.font = "bold 12px Tajawal";
    const labelWidth = context.measureText(label).width + 14;
    const x = Math.min(width - labelWidth - 4, Math.max(4, (points[0].x + points[1].x) / 2 - labelWidth / 2));
    const y = Math.max(22, Math.min(height - 4, Math.min(points[0].y, points[1].y) - 8));
    context.fillStyle = "#0f172a";
    context.fillRect(x, y - 18, labelWidth, 20);
    context.fillStyle = "#fff";
    // Canvas inherits the page RTL direction. Without an explicit anchor,
    // Arabic measurement text starts at the box's left edge and renders
    // outside it. Anchor RTL labels to the right padding of their own box.
    context.direction = isArabic ? "rtl" : "ltr";
    context.textAlign = isArabic ? "right" : "left";
    context.fillText(label, isArabic ? x + labelWidth - 7 : x + 7, y - 4);
  }

  if (selected) {
    context.setLineDash([]);
    const handles = drawing.type === "brush" && points.length > 2 ? [points[0], points.at(-1)] : points;
    handles.forEach((point) => {
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

export default function ChartDrawingTools({ chart, series, marketCode = "SA_MAIN", symbol, interval, mainPaneHeight = 470, isArabic, onResetChart, visibilityCommand = null, onDrawingVisibilityChange = (_visible) => {} }) {
  const instanceRef = useRef(crypto.randomUUID());
  const canvasRef = useRef(null);
  const toolbarRef = useRef(null);
  const toolbarDragRef = useRef(null);
  const selectionToolbarRef = useRef(null);
  const confirmationRef = useRef(null);
  const selectionToolbarDragRef = useRef(null);
  const pendingSavesRef = useRef(new Map());
  const interactionRef = useRef(null);
  const draftRef = useRef(null);
  const drawingsRef = useRef([]);
  const [drawings, setDrawings] = useState([]);
  // "select" is the resting tool, exactly like TradingView. Without it the
  // drawing canvas was pointer-transparent whenever no tool was picked, so a
  // finished drawing could never be clicked - and therefore never deleted on
  // its own; only "delete everything" worked.
  const [activeTool, setActiveTool] = useState("select");
  const [pointerOverDrawing, setPointerOverDrawing] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [status, setStatus] = useState("");
  const [showAlertEditor, setShowAlertEditor] = useState(false);
  const [showDrawingList, setShowDrawingList] = useState(false);
  const [clipboardDrawing, setClipboardDrawing] = useState(storedClipboardDrawing);
  const [contextMenu, setContextMenu] = useState(null);
  const [busyDrawingId, setBusyDrawingId] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [toolbarLayout, setToolbarLayout] = useState(storedToolbarLayout);
  const [selectionToolbarLayout, setSelectionToolbarLayout] = useState(storedSelectionToolbarLayout);
  const [alertForm, setAlertForm] = useState({ condition: "crosses", frequency: "repeat", cooldown_minutes: 15 });
  drawingsRef.current = drawings;
  draftRef.current = draft;
  const selected = drawings.find((drawing) => drawing.clientId === selectedId) || null;
  const toolbarStyle = toolbarLayout.x == null ? { top: toolbarLayout.y, insetInlineEnd: 8 } : { top: toolbarLayout.y, left: toolbarLayout.x };
  const selectionToolbarStyle = selectionToolbarLayout.x == null
    ? { top: selectionToolbarLayout.y, insetInlineEnd: 8 }
    : { top: selectionToolbarLayout.y, left: selectionToolbarLayout.x };

  useEffect(() => {
    localStorage.setItem(TOOLBAR_STORAGE_KEY, JSON.stringify(toolbarLayout));
  }, [toolbarLayout]);

  useEffect(() => {
    if (!pendingConfirmation) return undefined;
    const previousFocus = document.activeElement;
    const dialog = confirmationRef.current;
    /** @type {HTMLElement | null} */ (dialog?.querySelector("[data-confirm-cancel]") || null)?.focus();
    const keyDown = (event) => {
      if (event.key === "Escape" && !busyDrawingId) setPendingConfirmation(null);
      if (event.key !== "Tab" || !dialog) return;
      const controls = [...dialog.querySelectorAll("button:not(:disabled)")];
      if (!controls.length) return;
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { /** @type {HTMLElement} */ (last).focus(); event.preventDefault(); }
      else if (!event.shiftKey && document.activeElement === last) { /** @type {HTMLElement} */ (first).focus(); event.preventDefault(); }
    };
    document.addEventListener("keydown", keyDown);
    return () => {
      document.removeEventListener("keydown", keyDown);
      /** @type {HTMLElement | null} */ (previousFocus)?.focus?.();
    };
  }, [pendingConfirmation, busyDrawingId]);

  useEffect(() => {
    if (toolbarLayout.hidden) return undefined;
    let frame = 0;
    const ensureInside = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
      const toolbar = toolbarRef.current;
      const boundary = canvasRef.current?.parentElement;
      if (!toolbar || !boundary) return;
      const toolbarRect = toolbar.getBoundingClientRect();
      const boundaryRect = boundary.getBoundingClientRect();
      const outside = toolbarRect.right < boundaryRect.left + 8
        || toolbarRect.left > boundaryRect.right - 8
        || toolbarRect.bottom < boundaryRect.top + 8
        || toolbarRect.top > boundaryRect.top + mainPaneHeight - 8;
      if (outside) setToolbarLayout({ ...DEFAULT_TOOLBAR_LAYOUT });
      });
    };
    ensureInside();
    const boundary = canvasRef.current?.parentElement;
    const observer = boundary ? new ResizeObserver(ensureInside) : null;
    if (boundary) observer.observe(boundary);
    window.addEventListener("resize", ensureInside);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", ensureInside);
      window.cancelAnimationFrame(frame);
    };
  }, [toolbarLayout.hidden, toolbarLayout.orientation, toolbarLayout.collapsed, mainPaneHeight]);

  useEffect(() => {
    localStorage.setItem(SELECTION_TOOLBAR_STORAGE_KEY, JSON.stringify(selectionToolbarLayout));
  }, [selectionToolbarLayout]);

  useEffect(() => {
    onDrawingVisibilityChange(drawings.length === 0 || drawings.some((drawing) => drawing.visible));
  }, [drawings, onDrawingVisibilityChange]);

  useEffect(() => {
    const buttons = [...(toolbarRef.current?.querySelectorAll("button:not(:disabled)") || [])];
    buttons.forEach((button, index) => { button.tabIndex = index === 0 ? 0 : -1; });
  }, [toolbarLayout, activeTool, undoStack.length, redoStack.length]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !chart || !series) return;
    try {
      const priceScaleWidth = Number(chart.priceScale?.("right")?.width?.());
      canvas.style.setProperty("--drawing-price-axis-width", `${Number.isFinite(priceScaleWidth) ? Math.max(48, Math.ceil(priceScaleWidth)) : 74}px`);
    } catch {
      canvas.style.setProperty("--drawing-price-axis-width", "74px");
    }
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(rect.height * ratio)) {
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
    }
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    const minMove = Number(series.options?.().priceFormat?.minMove) || 0.01;
    [...drawingsRef.current, ...(draftRef.current ? [draftRef.current] : [])]
      .sort((a, b) => Number(a.zIndex || 0) - Number(b.zIndex || 0))
      .forEach((drawing) => {
        const points = drawing.points.map((point) => toCanvasPoint(point, chart, series)).filter(Boolean);
        if (points.length === drawing.points.length) renderDrawing(context, drawing, points, rect.width, rect.height, drawing.clientId === selectedId, isArabic, minMove);
      });
  }, [chart, series, selectedId, isArabic]);

  useEffect(() => { redraw(); }, [drawings, draft, redraw, mainPaneHeight]);

  // Returns the drawing under a viewport coordinate, or null. Used both to
  // decide whether the drawing canvas should swallow the pointer (mouse) and
  // to resolve taps on touch devices.
  const drawingAt = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas || !chart || !series) return null;
    const rect = canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    const point = canvasPoint({ clientX, clientY }, canvas, chart, series);
    if (!point) return null;
    return [...drawingsRef.current]
      .sort((a, b) => Number(b.zIndex || 0) - Number(a.zIndex || 0))
      .find((drawing) => {
        if (!drawing.visible) return false;
        const points = drawing.points.map((item) => toCanvasPoint(item, chart, series)).filter(Boolean);
        return points.length === drawing.points.length
          && drawingHitTest(drawing.type, points, point, rect.width, rect.height, drawing.options).hit;
      }) || null;
  }, [chart, series]);

  // In select mode the canvas stays pointer-transparent so the chart keeps its
  // native pan / pinch / wheel behaviour, and only becomes interactive while a
  // drawing is actually under the pointer. On touch there is no hover, so a
  // short tap that did not move is resolved as a selection instead.
  useEffect(() => {
    const boundary = canvasRef.current?.parentElement;
    if (!boundary) return undefined;
    let frame = 0;
    let tap = null;
    const track = (event) => {
      if (activeTool !== "select" || interactionRef.current || event.pointerType === "touch") return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setPointerOverDrawing(Boolean(drawingAt(event.clientX, event.clientY))));
    };
    const down = (event) => {
      if (event.pointerType !== "touch" || activeTool !== "select" || interactionRef.current) return;
      tap = { x: event.clientX, y: event.clientY, at: Date.now() };
    };
    const up = (event) => {
      if (!tap || event.pointerType !== "touch") return;
      const moved = Math.hypot(event.clientX - tap.x, event.clientY - tap.y);
      const quick = Date.now() - tap.at < 500;
      tap = null;
      if (moved > 12 || !quick) return;
      const found = drawingAt(event.clientX, event.clientY);
      setSelectedId(found ? found.clientId : "");
      setPointerOverDrawing(Boolean(found));
    };
    const leave = () => setPointerOverDrawing(false);
    boundary.addEventListener("pointermove", track, { passive: true });
    boundary.addEventListener("pointerdown", down, { passive: true });
    boundary.addEventListener("pointerup", up, { passive: true });
    boundary.addEventListener("pointercancel", leave, { passive: true });
    boundary.addEventListener("pointerleave", leave, { passive: true });
    return () => {
      boundary.removeEventListener("pointermove", track);
      boundary.removeEventListener("pointerdown", down);
      boundary.removeEventListener("pointerup", up);
      boundary.removeEventListener("pointercancel", leave);
      boundary.removeEventListener("pointerleave", leave);
      window.cancelAnimationFrame(frame);
    };
  }, [activeTool, drawingAt]);

  useEffect(() => {
    if (activeTool !== "select") setPointerOverDrawing(false);
  }, [activeTool]);

  useEffect(() => {
    if (!chart || !canvasRef.current) return undefined;
    let firstFrame = 0;
    let secondFrame = 0;
    const handler = () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      firstFrame = window.requestAnimationFrame(() => {
        redraw();
        secondFrame = window.requestAnimationFrame(redraw);
      });
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
    const observer = new ResizeObserver(handler);
    observer.observe(canvasRef.current.parentElement || canvasRef.current);
    const interactionTarget = canvasRef.current.parentElement;
    const interactionEvents = ["wheel", "pointermove", "pointerdown", "pointerup", "touchmove", "dblclick"];
    interactionEvents.forEach((eventName) => interactionTarget?.addEventListener(eventName, handler, { passive: true }));
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
      observer.disconnect();
      interactionEvents.forEach((eventName) => interactionTarget?.removeEventListener(eventName, handler));
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [chart, redraw]);

  useEffect(() => {
    let active = true;
    setSelectedId("");
    setStatus("");
    loadChartDrawings(marketCode, symbol, interval).then((values) => active && setDrawings(values)).catch((error) => active && setStatus(displayError(error, isArabic)));
    return () => { active = false; };
  }, [marketCode, symbol, interval, isArabic]);

  useEffect(() => {
    if (!visibilityCommand?.id) return;
    setAllVisibility(Boolean(visibilityCommand.visible)).catch(() => {});
  }, [visibilityCommand?.id]);

  // Every shortcut goes through this ref. Previously the listener closed over
  // `drawings`, which is replaced as soon as a save round-trips with a server
  // id - so Delete/Copy operated on a stale object and silently did nothing.
  const shortcutsRef = useRef({});
  shortcutsRef.current = { undo, redo, removeSelected, copySelected, pasteCopied, onResetChart, hasSelection: Boolean(selectedId) };

  useEffect(() => {
    const editable = (target) => typeof target?.closest === "function" && Boolean(target.closest("input,select,textarea,[contenteditable=\"true\"]"));
    const handler = (event) => {
      const actions = shortcutsRef.current;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) actions.redo(); else actions.undo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault(); actions.redo();
      } else if (event.key === "Escape") {
        setDraft(null); setSelectedId(""); setActiveTool("select");
      } else if ((event.key === "Delete" || event.key === "Backspace") && actions.hasSelection && !editable(event.target)) {
        event.preventDefault(); actions.removeSelected();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c" && actions.hasSelection && !editable(event.target)) {
        event.preventDefault(); actions.copySelected();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v" && !editable(event.target)) {
        event.preventDefault(); actions.pasteCopied();
      } else if (event.altKey && event.key.toLowerCase() === "r") {
        event.preventDefault(); actions.onResetChart?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const boundary = canvasRef.current?.parentElement;
    if (!boundary) return undefined;
    const openMenu = (event) => {
      event.preventDefault();
      const rect = boundary.getBoundingClientRect();
      setContextMenu({
        x: Math.max(6, Math.min(rect.width - 220, event.clientX - rect.left)),
        y: Math.max(6, Math.min(rect.height - 210, event.clientY - rect.top)),
      });
    };
    const closeMenu = () => setContextMenu(null);
    boundary.addEventListener("contextmenu", openMenu);
    window.addEventListener("pointerdown", closeMenu);
    return () => {
      boundary.removeEventListener("contextmenu", openMenu);
      window.removeEventListener("pointerdown", closeMenu);
    };
  }, []);

  function pushHistory(previous) {
    setUndoStack((stack) => [...stack.slice(-39), cloneDrawings(previous)]);
    setRedoStack([]);
  }

  function replaceDrawings(next, previous = drawingsRef.current) {
    pushHistory(previous);
    setDrawings(next);
  }

  async function persist(drawing) {
    const operation = (async () => {
      const saved = await saveChartDrawing(marketCode, symbol, interval, drawing);
      if (saved?.serverId) setDrawings((values) => values.map((item) => item.clientId === saved.clientId ? saved : item));
      setStatus(isArabic ? "تم حفظ الرسم." : "Drawing saved.");
      return saved;
    })();
    pendingSavesRef.current.set(drawing.clientId, operation);
    try {
      return await operation;
    } catch (error) {
      setStatus(displayError(error, isArabic));
      throw error;
    } finally {
      if (pendingSavesRef.current.get(drawing.clientId) === operation) pendingSavesRef.current.delete(drawing.clientId);
    }
  }

  async function persistSnapshot(next, previous) {
    const nextIds = new Set(next.map((item) => item.clientId));
    const saves = await Promise.allSettled(next.map((item) => persist(item)));
    const failedSave = saves.find((result) => result.status === "rejected");
    if (failedSave?.status === "rejected") setStatus(displayError(failedSave.reason, isArabic));
    await Promise.allSettled(previous.filter((item) => !nextIds.has(item.clientId)).map(async (item) => {
      try {
        const pending = pendingSavesRef.current.get(item.clientId);
        const current = pending ? await pending : item;
        await deleteChartDrawing(marketCode, symbol, current, true);
      } catch (error) {
        setStatus(displayError(error, isArabic));
      }
    }));
  }

  function undo() {
    setUndoStack((stack) => {
      if (!stack.length) return stack;
      const previous = stack[stack.length - 1];
      const current = cloneDrawings(drawingsRef.current);
      setRedoStack((redoValues) => [...redoValues, current]);
      setDrawings(cloneDrawings(previous));
      persistSnapshot(previous, current).catch((error) => setStatus(displayError(error, isArabic)));
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
      persistSnapshot(next, current).catch((error) => setStatus(displayError(error, isArabic)));
      return stack.slice(0, -1);
    });
  }

  function finishDrawing(value) {
    if (!value || value.points.length < 1) return;
    const finished = value.type === "brush"
      ? { ...value, points: simplifyFreehand(value.points) }
      : value;
    const next = [...drawingsRef.current, finished];
    replaceDrawings(next);
    setDraft(null);
    setSelectedId(finished.clientId);
    setActiveTool("select");
    persist(finished).catch(() => {});
  }

  function pointerDown(event) {
    if (!chart || !series || !canvasRef.current || !activeTool) return;
    // A second finger means the user is pinch-zooming. Abandon whatever the
    // first finger started and hand the gesture back to the chart.
    if (event.isPrimary === false) {
      interactionRef.current = null;
      setDraft(null);
      setPointerOverDrawing(false);
      return;
    }
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
      if (!found) { setSelectedId(""); setPointerOverDrawing(false); return; }
      setSelectedId(found.clientId);
      setPointerOverDrawing(true);
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
    if (event.isPrimary === false) return;
    const point = canvasPoint(event, canvasRef.current, chart, series);
    if (!point) return;
    const interaction = interactionRef.current;
    if (interaction?.mode === "draw" && draftRef.current) setDraft({ ...draftRef.current, points: [draftRef.current.points[0], point] });
    else if (interaction?.mode === "brush" && draftRef.current) {
      const previous = draftRef.current.points.at(-1);
      const distance = previous ? Math.hypot(Number(point.x) - Number(previous.x), Number(point.y) - Number(previous.y)) : Number.POSITIVE_INFINITY;
      if (distance >= 1.8) setDraft({ ...draftRef.current, points: [...draftRef.current.points, point].slice(-500) });
    }
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
      if (changed) persist(changed).catch(() => {});
    }
  }

  function updateSelected(patch) {
    if (!selected || selected.locked && !Object.hasOwn(patch, "locked")) return;
    const nextDrawing = { ...selected, ...patch, options: patch.options ? { ...selected.options, ...patch.options } : selected.options };
    replaceDrawings(drawingsRef.current.map((item) => item.clientId === selected.clientId ? nextDrawing : item));
    persist(nextDrawing).catch(() => {});
  }

  async function removeDrawing(drawing, force = false) {
    if (!drawing) return;
    if (drawing.alert && !force) {
      setPendingConfirmation({ kind: "drawing", drawing });
      return;
    }
    try {
      setBusyDrawingId(drawing.clientId);
      const pending = pendingSavesRef.current.get(drawing.clientId);
      let current = drawing;
      if (pending) {
        try {
          current = await pending;
        } catch (saveError) {
          if (drawing.serverId) throw saveError;
          replaceDrawings(drawingsRef.current.filter((item) => item.clientId !== drawing.clientId));
          setSelectedId((value) => value === drawing.clientId ? "" : value);
          setStatus(isArabic ? "حُذف الرسم غير المحفوظ محليًا." : "Unsaved local drawing removed.");
          return;
        }
      }
      await deleteChartDrawing(marketCode, symbol, current, force);
      replaceDrawings(drawingsRef.current.filter((item) => item.clientId !== drawing.clientId));
      setSelectedId((value) => value === drawing.clientId ? "" : value);
      setStatus(isArabic ? "تم حذف الرسم." : "Drawing deleted.");
    } catch (error) {
      if (error?.response?.data?.code === "DRAWING_ALERT_DELETE_CONFIRMATION_REQUIRED" && !force) {
        setPendingConfirmation({ kind: "drawing", drawing });
        return;
      }
      setStatus(displayError(error, isArabic));
    } finally {
      setBusyDrawingId("");
    }
  }

  function liveSelected() {
    return drawingsRef.current.find((item) => item.clientId === selectedId) || null;
  }

  function removeSelected(force = false) {
    const target = liveSelected();
    if (!target) {
      setStatus(isArabic ? "حدد رسماً أولاً ثم احذفه." : "Select a drawing before deleting.");
      return undefined;
    }
    return removeDrawing(target, force);
  }

  async function copySelected() {
    const current = liveSelected();
    if (!current) {
      setStatus(isArabic ? "حدد رسماً أولاً ثم انسخه." : "Select a drawing before copying.");
      return;
    }
    const drawing = { ...cloneDrawings([current])[0], clipboardMarket: marketCode, clipboardSymbol: symbol, clipboardInterval: interval };
    setClipboardDrawing(drawing);
    const payload = { version: 1, marketCode, symbol, interval, drawing };
    localStorage.setItem(DRAWING_CLIPBOARD_STORAGE_KEY, JSON.stringify(payload));
    try {
      await navigator.clipboard?.writeText(DRAWING_CLIPBOARD_PREFIX + JSON.stringify(payload));
    } catch {
      // The durable in-app clipboard remains available when browser clipboard permission is unavailable.
    }
    setStatus(isArabic ? "تم نسخ الرسم. استخدم لصق أو Ctrl+V." : "Drawing copied. Use Paste or Ctrl+V.");
  }

  async function pasteCopied() {
    // The in-app clipboard is authoritative. The system clipboard is only an
    // optional upgrade: reading it can prompt, reject, or be unavailable, and
    // previously any of those paths could leave the paste doing nothing at all.
    let source = clipboardDrawing || storedClipboardDrawing();
    if (!source) {
      try {
        const systemValue = await navigator.clipboard?.readText?.();
        if (systemValue?.startsWith(DRAWING_CLIPBOARD_PREFIX) && systemValue.length < 200_000) {
          source = clipboardPayloadDrawing(JSON.parse(systemValue.slice(DRAWING_CLIPBOARD_PREFIX.length))) || source;
        }
      } catch {
        // Browser clipboard access is optional; the in-app clipboard is the fallback.
      }
    }
    if (!source) {
      setStatus(isArabic ? "انسخ رسماً أولاً ثم استخدم اللصق." : "Copy a drawing before pasting.");
      return;
    }
    if (!chart || !series || !canvasRef.current) {
      setStatus(isArabic ? "الشارت غير جاهز بعد. أعد المحاولة بعد تحميل الشموع." : "The chart is not ready yet. Retry once candles load.");
      return;
    }
    try {
      setBusyDrawingId(source.clientId);
      const sourceSymbol = source.clipboardSymbol;
      const sourceMarket = source.clipboardMarket || "SA_MAIN";
      const pending = pendingSavesRef.current.get(source.clientId);
      if (pending) source = await pending;
      const newClientId = crypto.randomUUID();
      const canDuplicate = sourceMarket === marketCode && sourceSymbol === symbol && source.serverId;
      const pastedPoints = offsetPointsForPaste(source, chart, series, canvasRef.current);
      const copy = canDuplicate
        ? await duplicateChartDrawing(marketCode, symbol, source, newClientId, pastedPoints)
        : await saveChartDrawing(marketCode, symbol, interval, {
          ...source,
          clientId: newClientId,
          serverId: null,
          alert: null,
          locked: false,
          visible: true,
          zIndex: Math.max(0, ...drawingsRef.current.map((item) => Number(item.zIndex || 0))) + 1,
          points: pastedPoints,
        });
      replaceDrawings([...drawingsRef.current, copy]);
      setSelectedId(copy.clientId);
      setActiveTool("select");
      setPointerOverDrawing(true);
      setStatus(isArabic ? "تم لصق نسخة مستقلة من الرسم." : "An independent drawing copy was pasted.");
    } catch (error) {
      // Keep the paste visible locally and retry persistence in the background
      // so a transient backend failure never looks like "paste does nothing".
      const localCopy = {
        ...source,
        clientId: crypto.randomUUID(),
        serverId: null,
        alert: null,
        locked: false,
        visible: true,
        zIndex: Math.max(0, ...drawingsRef.current.map((item) => Number(item.zIndex || 0))) + 1,
        points: offsetPointsForPaste(source, chart, series, canvasRef.current),
      };
      replaceDrawings([...drawingsRef.current, localCopy]);
      setSelectedId(localCopy.clientId);
      setActiveTool("select");
      setPointerOverDrawing(true);
      persist(localCopy).catch(() => {});
      setStatus(`${isArabic ? "تم اللصق محلياً؛ تعذر الحفظ على الخادم:" : "Pasted locally; server save failed:"} ${displayError(error, isArabic)}`);
    } finally {
      setBusyDrawingId("");
    }
  }

  async function setAllVisibility(visible) {
    try {
      setBusyDrawingId("bulk");
      await setAllChartDrawingsVisibility(marketCode, symbol, interval, visible);
      const next = drawingsRef.current.map((drawing) => ({ ...drawing, visible }));
      replaceDrawings(next);
      setStatus(visible
        ? (isArabic ? "تم إظهار جميع الرسومات." : "All drawings are visible.")
        : (isArabic ? "تم إخفاء جميع الرسومات." : "All drawings are hidden."));
    } catch (error) {
      setStatus(displayError(error, isArabic));
      throw error;
    } finally {
      setBusyDrawingId("");
    }
  }

  function wheelZoom(event) {
    if (!chart || !canvasRef.current) return;
    const scale = chart.timeScale();
    const visible = scale.getVisibleLogicalRange();
    if (!visible) return;
    event.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const coordinate = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const anchor = scale.coordinateToLogical(coordinate) ?? (visible.from + visible.to) / 2;
    const span = Math.max(4, visible.to - visible.from);
    const nextSpan = Math.max(4, Math.min(5000, span * (event.deltaY > 0 ? 1.14 : 0.86)));
    const ratio = span ? (anchor - visible.from) / span : 0.5;
    scale.setVisibleLogicalRange({
      from: anchor - nextSpan * ratio,
      to: anchor + nextSpan * (1 - ratio),
    });
    redraw();
  }

  async function clearAllDrawings() {
    if (!drawingsRef.current.length) return;
    setPendingConfirmation({ kind: "all", hasAlerts: drawingsRef.current.some((drawing) => drawing.alert) });
  }

  async function performClearAllDrawings() {
    try {
      setBusyDrawingId("bulk");
      await deleteAllChartDrawings(marketCode, symbol, interval, drawingsRef.current.some((drawing) => drawing.alert));
      replaceDrawings([]);
      setSelectedId("");
      setStatus(isArabic ? "تم مسح جميع الرسومات." : "All drawings were deleted.");
    } catch (error) {
      setStatus(displayError(error, isArabic));
    } finally {
      setBusyDrawingId("");
      setPendingConfirmation(null);
    }
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
      if (!drawing.serverId && !String(drawing.alert?.id || "").startsWith("local-")) drawing = await saveChartDrawing(marketCode, symbol, interval, drawing);
      const alert = await saveDrawingAlert(marketCode, symbol, drawing, alertForm);
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
      await deleteDrawingAlert(marketCode, symbol, selected);
      setDrawings((values) => values.map((item) => item.clientId === selected.clientId ? { ...item, alert: null } : item));
      setShowAlertEditor(false);
      setStatus(isArabic ? "تم حذف تنبيه الرسم." : "Drawing alert removed.");
    } catch (error) { setStatus(displayError(error, isArabic)); }
  }

  function beginToolbarDrag(event) {
    const toolbar = toolbarRef.current;
    const boundary = canvasRef.current?.parentElement;
    if (!toolbar || !boundary) return;
    const toolbarRect = toolbar.getBoundingClientRect();
    const boundaryRect = boundary.getBoundingClientRect();
    toolbarDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - toolbarRect.left,
      offsetY: event.clientY - toolbarRect.top,
      boundaryRect,
      width: toolbarRect.width,
      height: toolbarRect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveToolbar(event) {
    const drag = toolbarDragRef.current;
    if (!drag) return;
    const x = Math.max(4, Math.min(drag.boundaryRect.width - drag.width - 4, event.clientX - drag.boundaryRect.left - drag.offsetX));
    const y = Math.max(4, Math.min(mainPaneHeight - drag.height - 4, event.clientY - drag.boundaryRect.top - drag.offsetY));
    setToolbarLayout((value) => ({ ...value, x, y }));
  }

  function finishToolbarDrag(event) {
    if (!toolbarDragRef.current) return;
    toolbarDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function beginSelectionToolbarDrag(event) {
    const toolbar = selectionToolbarRef.current;
    const boundary = canvasRef.current?.parentElement;
    if (!toolbar || !boundary) return;
    const toolbarRect = toolbar.getBoundingClientRect();
    const boundaryRect = boundary.getBoundingClientRect();
    selectionToolbarDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - toolbarRect.left,
      offsetY: event.clientY - toolbarRect.top,
      boundaryRect,
      width: toolbarRect.width,
      height: toolbarRect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function moveSelectionToolbar(event) {
    const drag = selectionToolbarDragRef.current;
    if (!drag) return;
    const x = Math.max(4, Math.min(drag.boundaryRect.width - drag.width - 4, event.clientX - drag.boundaryRect.left - drag.offsetX));
    const y = Math.max(4, Math.min(mainPaneHeight - drag.height - 4, event.clientY - drag.boundaryRect.top - drag.offsetY));
    setSelectionToolbarLayout({ x, y });
  }

  function finishSelectionToolbarDrag(event) {
    if (!selectionToolbarDragRef.current) return;
    selectionToolbarDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function toggleDrawingVisibility(drawing) {
    const next = { ...drawing, visible: !drawing.visible };
    replaceDrawings(drawingsRef.current.map((item) => item.clientId === drawing.clientId ? next : item));
    persist(next).catch(() => {});
  }

  function toggleDrawingLock(drawing) {
    const next = { ...drawing, locked: !drawing.locked };
    replaceDrawings(drawingsRef.current.map((item) => item.clientId === drawing.clientId ? next : item));
    persist(next).catch(() => {});
  }

  function toolbarKeyDown(event) {
    const horizontal = toolbarLayout.orientation === "horizontal";
    const forward = horizontal ? "ArrowRight" : "ArrowDown";
    const backward = horizontal ? "ArrowLeft" : "ArrowUp";
    if (![forward, backward, "Home", "End"].includes(event.key)) return;
    const buttons = [...event.currentTarget.querySelectorAll("button:not(:disabled)")];
    if (!buttons.length) return;
    const index = Math.max(0, buttons.indexOf(event.target.closest("button")));
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : event.key === forward ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length;
    buttons.forEach((button, buttonIndex) => { button.tabIndex = buttonIndex === nextIndex ? 0 : -1; });
    buttons[nextIndex].focus();
    event.preventDefault();
  }

  function resetToolbarLayout() {
    setShowDrawingList(false);
    setToolbarLayout({ ...DEFAULT_TOOLBAR_LAYOUT });
    setStatus(isArabic ? "تمت استعادة أدوات الرسم في موضعها الافتراضي." : "Drawing tools were restored to their default position.");
  }

  const selectedType = useMemo(() => DRAWING_TYPES.find((item) => item.id === selected?.type), [selected]);

  return <>
    {toolbarLayout.hidden && <button type="button" className="drawing-tools-restore" onClick={resetToolbarLayout} title={isArabic ? "إظهار أدوات الرسم وإعادتها لموضعها" : "Show and reset drawing tools"} aria-label={isArabic ? "إظهار أدوات الرسم وإعادتها لموضعها" : "Show and reset drawing tools"}><PenLine size={17} /><span>{isArabic ? "أدوات الرسم" : "Drawing tools"}</span><Eye size={15} /></button>}
    {!toolbarLayout.hidden && <div ref={toolbarRef} style={toolbarStyle} onKeyDown={toolbarKeyDown} className={"drawing-tools-bar " + (toolbarLayout.orientation === "vertical" ? "drawing-tools-vertical" : "drawing-tools-horizontal") + (toolbarLayout.collapsed ? " drawing-tools-collapsed" : "")} data-drawing-instance={instanceRef.current} data-active-tool={activeTool || ""} role="toolbar" aria-orientation={toolbarLayout.orientation === "vertical" ? "vertical" : "horizontal"} aria-label={isArabic ? "أدوات الرسم" : "Drawing tools"}>
      <button type="button" className="drawing-toolbar-drag-handle" onPointerDown={beginToolbarDrag} onPointerMove={moveToolbar} onPointerUp={finishToolbarDrag} onPointerCancel={finishToolbarDrag} title={isArabic ? "اسحب لتحريك شريط الأدوات" : "Drag to move toolbar"} aria-label={isArabic ? "تحريك شريط أدوات الرسم" : "Move drawing toolbar"}><Grip size={16} /></button>
      <div className="drawing-toolbar-controls">
        <button type="button" onClick={() => setToolbarLayout((value) => ({ ...value, orientation: value.orientation === "horizontal" ? "vertical" : "horizontal" }))} title={isArabic ? "تبديل اتجاه الشريط" : "Change toolbar orientation"} aria-label={isArabic ? "تبديل اتجاه شريط الرسم" : "Change drawing toolbar orientation"}>{toolbarLayout.orientation === "horizontal" ? <PanelLeftClose size={15} /> : <PanelTopClose size={15} />}</button>
        <button type="button" onClick={resetToolbarLayout} title={isArabic ? "إعادة الشريط لموضعه" : "Reset toolbar position"} aria-label={isArabic ? "إعادة شريط الرسم لموضعه الافتراضي" : "Reset drawing toolbar position"}><RefreshCcw size={15} /></button>
        <button type="button" onClick={() => setToolbarLayout((value) => ({ ...value, collapsed: !value.collapsed }))} title={toolbarLayout.collapsed ? (isArabic ? "توسيع الأدوات" : "Expand tools") : (isArabic ? "تصغير الأدوات" : "Collapse tools")} aria-label={toolbarLayout.collapsed ? (isArabic ? "توسيع أدوات الرسم" : "Expand drawing tools") : (isArabic ? "تصغير أدوات الرسم" : "Collapse drawing tools")}>{toolbarLayout.collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</button>
        <button type="button" onClick={() => setShowDrawingList((value) => !value)} className={showDrawingList ? "active" : ""} title={isArabic ? "قائمة الرسومات" : "Object tree"} aria-label={isArabic ? "قائمة الرسومات" : "Drawing object tree"}><LayoutList size={15} /></button>
        <button type="button" onClick={() => { setShowDrawingList(false); setToolbarLayout((value) => ({ ...value, hidden: true })); }} title={isArabic ? "إخفاء شريط الأدوات" : "Hide toolbar"} aria-label={isArabic ? "إخفاء شريط أدوات الرسم" : "Hide drawing toolbar"}><EyeOff size={15} /></button>
      </div>
      {!toolbarLayout.collapsed && <div className="drawing-toolbar-tools">
      <button type="button" className={activeTool === "select" ? "active" : ""} onClick={() => { setActiveTool("select"); setDraft(null); }} title={isArabic ? "تحديد وتحريك الرسومات" : "Select and move drawings"} aria-label={isArabic ? "تحديد وتحريك الرسومات" : "Select and move drawings"}><MousePointer2 size={16} /></button>
      {DRAWING_TYPES.map((tool) => {
        const { Icon, rotate } = icons[tool.id];
        const label = isArabic ? tool.ar : tool.en;
        return <button type="button" key={tool.id} className={activeTool === tool.id ? "active" : ""} onClick={() => { setActiveTool(tool.id); setSelectedId(""); setDraft(null); }} title={label} aria-label={label}><Icon size={16} style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined} /></button>;
      })}
      <span className="drawing-tools-separator" />
      <button type="button" onClick={undo} disabled={!undoStack.length} title={isArabic ? "تراجع" : "Undo"}><Undo2 size={16} /></button>
      <button type="button" onClick={redo} disabled={!redoStack.length} title={isArabic ? "إعادة" : "Redo"}><Redo2 size={16} /></button>
      <span className="drawing-tools-separator" />
      <button type="button" data-action="toggle-all-drawings" disabled={!drawings.length || busyDrawingId === "bulk"} onClick={() => setAllVisibility(!drawings.some((drawing) => drawing.visible))} title={drawings.some((drawing) => drawing.visible) ? (isArabic ? "إخفاء جميع الرسومات" : "Hide all drawings") : (isArabic ? "إظهار جميع الرسومات" : "Show all drawings")}>{drawings.some((drawing) => drawing.visible) ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      <button type="button" data-action="clear-all-drawings" disabled={!drawings.length || busyDrawingId === "bulk"} className="danger" onClick={clearAllDrawings} title={isArabic ? "مسح جميع الرسومات" : "Delete all drawings"}><Trash2 size={16} /></button>
      </div>}
    </div>}

    {showDrawingList && <aside className="drawing-object-tree" aria-label={isArabic ? "قائمة الرسومات" : "Drawing object tree"}>
      <header><b>{isArabic ? "قائمة الرسومات" : "Drawings"}</b><button type="button" onClick={() => setShowDrawingList(false)}><X size={14} /></button></header>
      {!drawings.length && <p>{isArabic ? "لا توجد رسومات محفوظة." : "No saved drawings."}</p>}
      {drawings.slice().sort((a, b) => Number(b.zIndex || 0) - Number(a.zIndex || 0)).map((drawing) => {
        const type = DRAWING_TYPES.find((item) => item.id === drawing.type);
        return <div key={drawing.clientId} className={drawing.clientId === selectedId ? "active" : ""}>
          <button type="button" className="drawing-object-select" onClick={() => { setSelectedId(drawing.clientId); setActiveTool("select"); }}>{isArabic ? type?.ar : type?.en}</button>
          <button type="button" onClick={() => toggleDrawingVisibility(drawing)} title={drawing.visible ? (isArabic ? "إخفاء" : "Hide") : (isArabic ? "إظهار" : "Show")}>{drawing.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
          <button type="button" onClick={() => toggleDrawingLock(drawing)} title={drawing.locked ? (isArabic ? "فتح القفل" : "Unlock") : (isArabic ? "قفل" : "Lock")}>{drawing.locked ? <Lock size={14} /> : <Unlock size={14} />}</button>
          <button type="button" className="danger" onClick={() => removeDrawing(drawing)} title={isArabic ? "حذف" : "Delete"}><Trash2 size={14} /></button>
        </div>;
      })}
    </aside>}

    {status && <div className="drawing-status" role="status"><span>{status}</span><button type="button" onClick={() => setStatus("")}><X size={13} /></button></div>}

    {contextMenu && <div className="chart-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} role="menu" onPointerDown={(event) => event.stopPropagation()}>
      <button type="button" role="menuitem" onClick={() => { onResetChart?.(); setContextMenu(null); }}><RefreshCcw size={15} />{isArabic ? "إعادة الرسم للوضع الطبيعي" : "Reset chart view"}<kbd>Alt+R</kbd></button>
      <button type="button" role="menuitem" disabled={!selected} onClick={() => { copySelected(); setContextMenu(null); }}><Copy size={15} />{isArabic ? "نسخ الرسم المحدد" : "Copy selected drawing"}<kbd>Ctrl+C</kbd></button>
      <button type="button" role="menuitem" onClick={() => { pasteCopied(); setContextMenu(null); }}><ClipboardPaste size={15} />{isArabic ? "لصق الرسم" : "Paste drawing"}<kbd>Ctrl+V</kbd></button>
      <button type="button" role="menuitem" disabled={!drawings.length} onClick={() => { setAllVisibility(!drawings.some((drawing) => drawing.visible)); setContextMenu(null); }}>{drawings.some((drawing) => drawing.visible) ? <EyeOff size={15} /> : <Eye size={15} />}{drawings.some((drawing) => drawing.visible) ? (isArabic ? "إخفاء جميع الرسومات" : "Hide all drawings") : (isArabic ? "إظهار جميع الرسومات" : "Show all drawings")}</button>
      <button type="button" role="menuitem" disabled={!drawings.length} className="danger" onClick={() => { clearAllDrawings(); setContextMenu(null); }}><Trash2 size={15} />{isArabic ? "مسح جميع الرسومات" : "Delete all drawings"}</button>
      <button type="button" role="menuitem" disabled={!selected || busyDrawingId === selected?.clientId} className="danger" onClick={() => { removeSelected(); setContextMenu(null); }}><Trash2 size={15} />{isArabic ? "حذف الرسم المحدد" : "Delete selected drawing"}<kbd>Del</kbd></button>
    </div>}

    <canvas
      ref={canvasRef}
      className={"chart-drawing-canvas "
        + (activeTool && activeTool !== "select" ? "chart-drawing-canvas-active " : "")
        + (activeTool === "select" && pointerOverDrawing ? "chart-drawing-canvas-grab " : "")}
      style={{ height: mainPaneHeight, touchAction: activeTool && activeTool !== "select" ? "none" : "auto" }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onWheel={wheelZoom}
      onDoubleClick={() => draftRef.current && ["polyline"].includes(draftRef.current.type) && finishDrawing(draftRef.current)}
      aria-label={isArabic ? "طبقة الرسم على الشارت" : "Chart drawing layer"}
    />

    {selected && <div ref={selectionToolbarRef} style={selectionToolbarStyle} className="drawing-selection-toolbar" role="toolbar" aria-label={isArabic ? "خصائص الرسم المحدد" : "Selected drawing properties"}>
      <button type="button" className="drawing-selection-drag-handle" onPointerDown={beginSelectionToolbarDrag} onPointerMove={moveSelectionToolbar} onPointerUp={finishSelectionToolbarDrag} onPointerCancel={finishSelectionToolbarDrag} title={isArabic ? "اسحب لتحريك خصائص الرسم" : "Drag drawing properties"}><Grip size={15} /></button>
      <b>{isArabic ? selectedType?.ar : selectedType?.en}</b>
      <input type="color" value={selected.options.color} onChange={(event) => updateSelected({ options: { color: event.target.value } })} title={isArabic ? "لون الخط" : "Line color"} />
      {["rectangle", "parallel_channel", ...RANGE_TYPES].includes(selected.type) && <><input type="color" value={selected.options.fillColor || selected.options.color} onChange={(event) => updateSelected({ options: { fillColor: event.target.value } })} title={isArabic ? "لون التعبئة" : "Fill color"} /><label><span>{isArabic ? "شفافية" : "Opacity"}</span><input type="range" min="0" max="100" value={selected.options.fillOpacity} onChange={(event) => updateSelected({ options: { fillOpacity: Number(event.target.value) } })} /></label></>}
      <select value={selected.options.lineWidth} onChange={(event) => updateSelected({ options: { lineWidth: Number(event.target.value) } })} aria-label={isArabic ? "سماكة الخط" : "Line width"}><option value="1">1px</option><option value="2">2px</option><option value="3">3px</option><option value="4">4px</option></select>
      <select value={selected.options.lineStyle} onChange={(event) => updateSelected({ options: { lineStyle: event.target.value } })} aria-label={isArabic ? "نمط الخط" : "Line style"}><option value="solid">{isArabic ? "متصل" : "Solid"}</option><option value="dashed">{isArabic ? "متقطع" : "Dashed"}</option><option value="dotted">{isArabic ? "منقط" : "Dotted"}</option></select>
      {["trend_line", "ray", "parallel_channel"].includes(selected.type) && <><label><input type="checkbox" checked={selected.options.extendLeft} onChange={(event) => updateSelected({ options: { extendLeft: event.target.checked } })} />{isArabic ? "امتداد يسار" : "Extend left"}</label><label><input type="checkbox" checked={selected.options.extendRight || selected.type === "ray"} disabled={selected.type === "ray"} onChange={(event) => updateSelected({ options: { extendRight: event.target.checked } })} />{isArabic ? "امتداد يمين" : "Extend right"}</label></>}
      {selected.type === "parallel_channel" && <><label><input type="checkbox" checked={selected.options.showMedian !== false} onChange={(event) => updateSelected({ options: { showMedian: event.target.checked } })} />{isArabic ? "خط المنتصف" : "Median"}</label><select value={selected.options.medianStyle || "dashed"} onChange={(event) => updateSelected({ options: { medianStyle: event.target.value } })} aria-label={isArabic ? "نمط خط المنتصف" : "Median line style"}><option value="solid">{isArabic ? "متصل" : "Solid"}</option><option value="dashed">{isArabic ? "متقطع" : "Dashed"}</option><option value="dotted">{isArabic ? "منقط" : "Dotted"}</option></select></>}
      {RANGE_TYPES.has(selected.type) && <label><input type="checkbox" checked={selected.options.showLabel !== false} onChange={(event) => updateSelected({ options: { showLabel: event.target.checked } })} />{isArabic ? "إظهار القياس" : "Show measurement"}</label>}
      <button type="button" onClick={() => updateSelected({ locked: !selected.locked })} title={selected.locked ? (isArabic ? "فتح القفل" : "Unlock") : (isArabic ? "قفل الرسم" : "Lock")}>{selected.locked ? <Lock size={15} /> : <Unlock size={15} />}</button>
      <button type="button" onClick={() => updateSelected({ visible: !selected.visible })} title={selected.visible ? (isArabic ? "إخفاء" : "Hide") : (isArabic ? "إظهار" : "Show")}>{selected.visible ? <Eye size={15} /> : <EyeOff size={15} />}</button>
      <button type="button" disabled={!ALERT_TYPES.has(selected.type)} onClick={() => setShowAlertEditor(true)} title={!ALERT_TYPES.has(selected.type) ? (isArabic ? "التنبيه متاح للخطوط السعرية فقط" : "Alerts are available for price lines") : (isArabic ? "تنبيه الرسم" : "Drawing alert")}>{selected.alert ? <BellOff size={15} /> : <BellPlus size={15} />}</button>
      <button type="button" onClick={copySelected} title={isArabic ? "نسخ الرسم إلى الحافظة" : "Copy drawing"}><Copy size={15} /></button>
      <button type="button" disabled={Boolean(busyDrawingId)} onClick={pasteCopied} title={isArabic ? "لصق نسخة مستقلة" : "Paste independent copy"}><ClipboardPaste size={15} /></button>
      {drawings.length > 1 && <select defaultValue="" onChange={(event) => { if (event.target.value) orderSelected(event.target.value); event.target.value = ""; }} aria-label={isArabic ? "ترتيب طبقة الرسم" : "Drawing layer order"}>
        <option value="" disabled>{isArabic ? "ترتيب الطبقة" : "Layer order"}</option>
        <option value="front">{isArabic ? "إحضار إلى الأمام" : "Bring to front"}</option>
        <option value="back">{isArabic ? "إرسال إلى الخلف" : "Send to back"}</option>
      </select>}
      <button type="button" disabled={busyDrawingId === selected.clientId} className="danger" onClick={() => removeSelected()} title={isArabic ? "حذف الرسم" : "Delete"}><Trash2 size={15} /></button>
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

    {pendingConfirmation && <div className="drawing-confirm-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busyDrawingId && setPendingConfirmation(null)}>
      <section ref={confirmationRef} role="alertdialog" aria-modal="true" aria-labelledby="drawing-confirm-title" aria-describedby="drawing-confirm-description" className="drawing-confirm-dialog" dir={isArabic ? "rtl" : "ltr"}>
        <div className="drawing-confirm-accent" />
        <header className="drawing-confirm-header">
          <div className="drawing-confirm-icon"><AlertTriangle size={24} /></div>
          <div>
            <h2 id="drawing-confirm-title">{pendingConfirmation?.kind === "all"
              ? (isArabic ? "مسح جميع رسومات الشارت؟" : "Delete every chart drawing?")
              : (isArabic ? "حذف الرسم والتنبيه المرتبط؟" : "Delete the drawing and linked alert?")}</h2>
            <p id="drawing-confirm-description">{pendingConfirmation?.kind === "all"
              ? (pendingConfirmation?.hasAlerts
                ? (isArabic ? "سيتم حذف جميع الرسومات المحفوظة والتنبيهات المرتبطة بها. لا يمكن التراجع بعد تأكيد الخادم." : "All saved drawings and their linked alerts will be deleted. This cannot be undone after server confirmation.")
                : (isArabic ? "سيتم حذف جميع الرسومات المحفوظة لهذا السهم والفاصل. لا يمكن التراجع بعد تأكيد الخادم." : "All saved drawings for this symbol and interval will be deleted. This cannot be undone after server confirmation."))
              : (isArabic ? "هذا الرسم يشغّل تنبيهًا سعريًا. سيحذف الخادم الرسم والتنبيه معًا في عملية واحدة." : "This drawing powers a price alert. The backend will delete both in one operation.")}</p>
          </div>
        </header>
        <div className="drawing-confirm-summary">
          <span>{isArabic ? "النطاق" : "Scope"}</span>
          <b>{symbol} · {interval}</b>
        </div>
        <footer className="drawing-confirm-actions">
          <button type="button" data-confirm-cancel disabled={Boolean(busyDrawingId)} onClick={() => setPendingConfirmation(null)}>{isArabic ? "إلغاء" : "Cancel"}</button>
          <button
            type="button"
            className="drawing-confirm-danger"
            disabled={Boolean(busyDrawingId)}
            onClick={() => {
              const current = pendingConfirmation;
              setPendingConfirmation(null);
              if (current?.kind === "all") performClearAllDrawings();
              else if (current?.drawing) removeDrawing(current.drawing, true);
            }}
          >
            <Trash2 size={16} />{isArabic ? "تأكيد الحذف" : "Confirm deletion"}
          </button>
        </footer>
      </section>
    </div>}
  </>;
}
