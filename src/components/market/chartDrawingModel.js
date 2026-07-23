export const DRAWING_TYPES = [
  { id: "trend_line", ar: "خط اتجاه", en: "Trend line", points: 2 },
  { id: "ray", ar: "شعاع", en: "Ray", points: 2 },
  { id: "horizontal_line", ar: "خط أفقي", en: "Horizontal line", points: 1 },
  { id: "vertical_line", ar: "خط عمودي", en: "Vertical line", points: 1 },
  { id: "arrow", ar: "سهم", en: "Arrow", points: 2 },
  { id: "rectangle", ar: "مستطيل", en: "Rectangle", points: 2 },
  { id: "parallel_channel", ar: "قناة متوازية", en: "Parallel channel", points: 3 },
  { id: "polyline", ar: "مسار متعدد", en: "Polyline", points: 0 },
  { id: "curve", ar: "منحنى", en: "Curve", points: 3 },
  { id: "brush", ar: "فرشاة", en: "Brush", points: 0 },
  { id: "measure", ar: "قياس السعر والزمن", en: "Price and time range", points: 2 },
];

export const DRAWING_DEFAULTS = {
  color: "#2563eb",
  fillColor: "#2563eb",
  fillOpacity: 12,
  lineWidth: 2,
  lineStyle: "solid",
  extendLeft: false,
  extendRight: false,
  showLabel: true,
};

export function createDrawing(type, point, zIndex = 0) {
  return {
    clientId: crypto.randomUUID(),
    type,
    points: [point],
    options: { ...DRAWING_DEFAULTS },
    locked: false,
    visible: true,
    zIndex,
    alert: null,
  };
}

export function cloneDrawings(drawings) {
  return drawings.map((drawing) => ({
    ...drawing,
    points: drawing.points.map((point) => ({ ...point })),
    options: { ...DRAWING_DEFAULTS, ...(drawing.options || {}) },
    alert: drawing.alert ? { ...drawing.alert } : null,
  }));
}

export function normalizedDrawing(value) {
  if (!value || !DRAWING_TYPES.some((item) => item.id === value.type)) return null;
  const points = Array.isArray(value.points) ? value.points.map((point) => ({
    time: Number(point.time),
    logical: Number(point.logical),
    price: Number(point.price),
  })).filter((point) => Number.isFinite(point.price) && (Number.isFinite(point.time) || Number.isFinite(point.logical))) : [];
  if (!points.length || points.length > 500) return null;
  return {
    clientId: String(value.clientId || value.client_id || crypto.randomUUID()),
    serverId: value.serverId || value.id || null,
    type: value.type,
    points,
    options: { ...DRAWING_DEFAULTS, ...(value.options || {}) },
    locked: Boolean(value.locked),
    visible: value.visible !== false,
    zIndex: Number.isFinite(Number(value.zIndex ?? value.z_index)) ? Number(value.zIndex ?? value.z_index) : 0,
    alert: value.alert_rule_id ? { id: value.alert_rule_id, enabled: true } : (value.alert || null),
  };
}

export function lineStyleDash(style, width = 2) {
  if (style === "dashed") return [6 * width, 4 * width];
  if (style === "dotted") return [width, 3 * width];
  return [];
}

export function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (!dx && !dy) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

export function drawingSegments(type, points, width, height, options = {}) {
  if (!points.length) return [];
  if (type === "horizontal_line") return [[{ x: 0, y: points[0].y }, { x: width, y: points[0].y }]];
  if (type === "vertical_line") return [[{ x: points[0].x, y: 0 }, { x: points[0].x, y: height }]];
  if (["trend_line", "ray", "arrow", "measure"].includes(type) && points[1]) {
    let [start, end] = points;
    const dx = end.x - start.x || 0.0001;
    const dy = end.y - start.y;
    if (type === "ray" || options.extendRight) {
      const scale = (width - start.x) / dx;
      end = { x: width, y: start.y + dy * scale };
    }
    if (options.extendLeft) {
      const scale = (0 - start.x) / dx;
      start = { x: 0, y: start.y + dy * scale };
    }
    return [[start, end]];
  }
  if (type === "rectangle" && points[1]) {
    const [a, b] = points;
    return [[{ x: a.x, y: a.y }, { x: b.x, y: a.y }], [{ x: b.x, y: a.y }, { x: b.x, y: b.y }], [{ x: b.x, y: b.y }, { x: a.x, y: b.y }], [{ x: a.x, y: b.y }, { x: a.x, y: a.y }]];
  }
  if (type === "parallel_channel" && points[1]) {
    const offset = points[2] ? { x: points[2].x - points[1].x, y: points[2].y - points[1].y } : { x: 0, y: 40 };
    return [[points[0], points[1]], [{ x: points[0].x + offset.x, y: points[0].y + offset.y }, { x: points[1].x + offset.x, y: points[1].y + offset.y }]];
  }
  if (["polyline", "brush", "curve"].includes(type)) return points.slice(1).map((point, index) => [points[index], point]);
  return [];
}

export function drawingHitTest(type, points, pointer, width, height, options) {
  const handleIndex = points.findIndex((point) => Math.hypot(point.x - pointer.x, point.y - pointer.y) <= 8);
  if (handleIndex >= 0) return { hit: true, handleIndex };
  const hit = drawingSegments(type, points, width, height, options).some(([start, end]) => distanceToSegment(pointer, start, end) <= 7);
  return { hit, handleIndex: -1 };
}
