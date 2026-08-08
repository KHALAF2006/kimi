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
  { id: "price_range", ar: "نطاق السعر", en: "Price range", points: 2 },
  { id: "date_range", ar: "نطاق الزمن", en: "Date range", points: 2 },
  { id: "date_and_price_range", ar: "نطاق السعر والزمن", en: "Date and price range", points: 2 },
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
  showMedian: true,
  medianStyle: "dashed",
};

export function createDrawing(type, point, zIndex = 0) {
  const channelOptions = type === "parallel_channel"
    ? { extendLeft: true, extendRight: true, showMedian: true, medianStyle: "dashed" }
    : {};
  return {
    clientId: crypto.randomUUID(),
    type,
    points: [point],
    options: { ...DRAWING_DEFAULTS, ...channelOptions },
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
  if (!value) return null;
  const type = value.type === "measure" ? "date_and_price_range" : value.type;
  if (!DRAWING_TYPES.some((item) => item.id === type)) return null;
  const points = Array.isArray(value.points) ? value.points.map((point) => ({
    time: Number(point.time),
    logical: Number(point.logical),
    price: Number(point.price),
  })).filter((point) => Number.isFinite(point.price) && (Number.isFinite(point.time) || Number.isFinite(point.logical))) : [];
  if (!points.length || points.length > 500) return null;
  return {
    clientId: String(value.clientId || value.client_id || crypto.randomUUID()),
    serverId: value.serverId || value.id || null,
    type,
    points,
    options: {
      ...DRAWING_DEFAULTS,
      ...(type === "parallel_channel" ? { extendLeft: true, extendRight: true } : {}),
      ...(value.options || {}),
      ...(value.options?.extend_left !== undefined ? { extendLeft: Boolean(value.options.extend_left) } : {}),
      ...(value.options?.extend_right !== undefined ? { extendRight: Boolean(value.options.extend_right) } : {}),
      ...(value.options?.show_median !== undefined ? { showMedian: Boolean(value.options.show_median) } : {}),
      ...(value.options?.median_style ? { medianStyle: value.options.median_style } : {}),
    },
    locked: Boolean(value.locked),
    visible: value.visible !== false,
    zIndex: Number.isFinite(Number(value.zIndex ?? value.z_index)) ? Number(value.zIndex ?? value.z_index) : 0,
    intervalScope: String(value.intervalScope || value.interval_scope || "all"),
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

function clipParametricLine(start, end, width, height, minT = 0, maxT = 1) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return null;
  let low = minT;
  let high = maxT;
  const constraints = [
    [-dx, start.x],
    [dx, width - start.x],
    [-dy, start.y],
    [dy, height - start.y],
  ];
  for (const [p, q] of constraints) {
    if (Math.abs(p) < 1e-9) {
      if (q < 0) return null;
      continue;
    }
    const ratio = q / p;
    if (p < 0) low = Math.max(low, ratio);
    else high = Math.min(high, ratio);
    if (low > high) return null;
  }
  return [
    { x: start.x + low * dx, y: start.y + low * dy },
    { x: start.x + high * dx, y: start.y + high * dy },
  ];
}

function extensionRange(options = {}, forceRight = false) {
  return {
    min: options.extendLeft ? -Infinity : 0,
    max: forceRight || options.extendRight ? Infinity : 1,
  };
}

function channelLines(points) {
  if (!points[1]) return null;
  const offset = points[2]
    ? { x: points[2].x - points[1].x, y: points[2].y - points[1].y }
    : { x: 0, y: 40 };
  return {
    first: [points[0], points[1]],
    second: [
      { x: points[0].x + offset.x, y: points[0].y + offset.y },
      { x: points[1].x + offset.x, y: points[1].y + offset.y },
    ],
    median: [
      { x: points[0].x + offset.x / 2, y: points[0].y + offset.y / 2 },
      { x: points[1].x + offset.x / 2, y: points[1].y + offset.y / 2 },
    ],
  };
}

function rangeBounds(points) {
  const [a, b] = points;
  return {
    left: Math.min(a.x, b.x),
    right: Math.max(a.x, b.x),
    top: Math.min(a.y, b.y),
    bottom: Math.max(a.y, b.y),
  };
}

function rectangleSegments(bounds) {
  const { left, right, top, bottom } = bounds;
  return [
    [{ x: left, y: top }, { x: right, y: top }],
    [{ x: right, y: top }, { x: right, y: bottom }],
    [{ x: right, y: bottom }, { x: left, y: bottom }],
    [{ x: left, y: bottom }, { x: left, y: top }],
  ];
}

export function smoothCurveSegments(points, tension = 0.85, subdivisions = 18) {
  if (points.length < 2) return [];
  const sampled = [points[0]];
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
    for (let step = 1; step <= subdivisions; step += 1) {
      const t = step / subdivisions;
      const inverse = 1 - t;
      sampled.push({
        x: inverse ** 3 * start.x + 3 * inverse ** 2 * t * firstControl.x + 3 * inverse * t ** 2 * secondControl.x + t ** 3 * end.x,
        y: inverse ** 3 * start.y + 3 * inverse ** 2 * t * firstControl.y + 3 * inverse * t ** 2 * secondControl.y + t ** 3 * end.y,
      });
    }
  }
  return sampled.slice(1).map((point, index) => [sampled[index], point]);
}

function clipPolygonToRect(polygon, width, height) {
  const boundaries = [
    [(point) => point.x >= 0, (a, b) => ({ x: 0, y: a.y + (b.y - a.y) * ((0 - a.x) / (b.x - a.x)) })],
    [(point) => point.x <= width, (a, b) => ({ x: width, y: a.y + (b.y - a.y) * ((width - a.x) / (b.x - a.x)) })],
    [(point) => point.y >= 0, (a, b) => ({ x: a.x + (b.x - a.x) * ((0 - a.y) / (b.y - a.y)), y: 0 })],
    [(point) => point.y <= height, (a, b) => ({ x: a.x + (b.x - a.x) * ((height - a.y) / (b.y - a.y)), y: height })],
  ];
  return boundaries.reduce((input, [inside, intersect]) => {
    if (!input.length) return input;
    const output = [];
    for (let index = 0; index < input.length; index += 1) {
      const current = input[index];
      const previous = input[(index + input.length - 1) % input.length];
      const currentInside = inside(current);
      const previousInside = inside(previous);
      if (currentInside !== previousInside) output.push(intersect(previous, current));
      if (currentInside) output.push(current);
    }
    return output.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  }, polygon);
}

export function drawingFillPolygon(type, points, width, height, options = {}) {
  if (!points[1]) return [];
  if (["rectangle", "price_range", "date_range", "date_and_price_range"].includes(type)) {
    const bounds = rangeBounds(points);
    return clipPolygonToRect([
      { x: bounds.left, y: bounds.top },
      { x: bounds.right, y: bounds.top },
      { x: bounds.right, y: bounds.bottom },
      { x: bounds.left, y: bounds.bottom },
    ], width, height);
  }
  if (type !== "parallel_channel" || !points[2]) return [];
  const lines = channelLines(points);
  const [start, end] = lines.first;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const reach = 4 + (width + height + Math.abs(start.x) + Math.abs(start.y)) / length;
  const low = options.extendLeft ? -reach : 0;
  const high = options.extendRight ? reach : 1;
  const project = (point, t) => ({ x: point.x + t * dx, y: point.y + t * dy });
  return clipPolygonToRect([
    project(lines.first[0], low),
    project(lines.first[0], high),
    project(lines.second[0], high),
    project(lines.second[0], low),
  ], width, height);
}

export function drawingSegments(type, points, width, height, options = {}) {
  if (!points.length) return [];
  if (type === "horizontal_line") return [[{ x: 0, y: points[0].y }, { x: width, y: points[0].y }]];
  if (type === "vertical_line") return [[{ x: points[0].x, y: 0 }, { x: points[0].x, y: height }]];
  if (["trend_line", "ray", "arrow"].includes(type) && points[1]) {
    const range = extensionRange(options, type === "ray");
    const clipped = clipParametricLine(points[0], points[1], width, height, range.min, range.max);
    return clipped ? [clipped] : [];
  }
  if (type === "rectangle" && points[1]) {
    return rectangleSegments(rangeBounds(points));
  }
  if (type === "parallel_channel" && points[1]) {
    const lines = channelLines(points);
    const range = extensionRange(options);
    const segments = [lines.first, lines.second]
      .map(([start, end]) => clipParametricLine(start, end, width, height, range.min, range.max))
      .filter(Boolean);
    if (options.showMedian !== false) {
      const median = clipParametricLine(lines.median[0], lines.median[1], width, height, range.min, range.max);
      if (median) segments.push(median);
    }
    return segments;
  }
  if (["price_range", "date_range", "date_and_price_range"].includes(type) && points[1]) {
    const bounds = rangeBounds(points);
    const middleX = (bounds.left + bounds.right) / 2;
    const middleY = (bounds.top + bounds.bottom) / 2;
    if (type === "price_range") {
      return [
        [{ x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top }],
        [{ x: bounds.left, y: bounds.bottom }, { x: bounds.right, y: bounds.bottom }],
        [{ x: middleX, y: bounds.top }, { x: middleX, y: bounds.bottom }],
      ];
    }
    if (type === "date_range") {
      return [
        [{ x: bounds.left, y: bounds.top }, { x: bounds.left, y: bounds.bottom }],
        [{ x: bounds.right, y: bounds.top }, { x: bounds.right, y: bounds.bottom }],
        [{ x: bounds.left, y: middleY }, { x: bounds.right, y: middleY }],
      ];
    }
    return [
      ...rectangleSegments(bounds),
      [{ x: middleX, y: bounds.top }, { x: middleX, y: bounds.bottom }],
      [{ x: bounds.left, y: middleY }, { x: bounds.right, y: middleY }],
    ];
  }
  if (type === "curve") return smoothCurveSegments(points);
  if (["polyline", "brush"].includes(type)) return points.slice(1).map((point, index) => [points[index], point]);
  return [];
}

export function drawingHitTest(type, points, pointer, width, height, options, tolerance = 7) {
  const hitTolerance = Math.max(4, Number(tolerance) || 7);
  const handleIndex = points.findIndex((point) => Math.hypot(point.x - pointer.x, point.y - pointer.y) <= hitTolerance + 2);
  if (handleIndex >= 0) return { hit: true, handleIndex };
  const hit = drawingSegments(type, points, width, height, options).some(([start, end]) => distanceToSegment(pointer, start, end) <= hitTolerance);
  return { hit, handleIndex: -1 };
}
