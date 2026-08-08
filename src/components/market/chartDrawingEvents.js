export function isDrawingUiEvent(event) {
  const path = typeof event?.composedPath === "function" ? event.composedPath() : [];
  if (path.some((node) => node?.dataset?.drawingUi === "true")) return true;
  return Boolean(event?.target?.closest?.('[data-drawing-ui="true"]'));
}

export function clampFloatingToolbarPosition({ x, y, width, height, boundaryWidth, boundaryHeight, padding = 4 }) {
  const safeWidth = Math.max(0, Number(boundaryWidth) || 0);
  const safeHeight = Math.max(0, Number(boundaryHeight) || 0);
  const toolbarWidth = Math.max(0, Number(width) || 0);
  const toolbarHeight = Math.max(0, Number(height) || 0);
  const inset = Math.max(0, Number(padding) || 0);
  const maxX = Math.max(inset, safeWidth - toolbarWidth - inset);
  const maxY = Math.max(inset, safeHeight - toolbarHeight - inset);
  return {
    x: Math.max(inset, Math.min(maxX, Number(x) || 0)),
    y: Math.max(inset, Math.min(maxY, Number(y) || 0)),
  };
}

function overlaps(left, right, gap = 0) {
  return left.x < right.x + right.width + gap
    && left.x + left.width + gap > right.x
    && left.y < right.y + right.height + gap
    && left.y + left.height + gap > right.y;
}

export function placeFloatingToolbarPosition({
  x,
  y,
  width,
  height,
  boundaryWidth,
  boundaryHeight,
  obstacles = [],
  padding = 4,
}) {
  const base = clampFloatingToolbarPosition({ x, y, width, height, boundaryWidth, boundaryHeight, padding });
  const normalizedObstacles = obstacles.filter((item) => item && Number(item.width) > 0 && Number(item.height) > 0);
  const candidate = (nextX, nextY) => ({
    ...clampFloatingToolbarPosition({ x: nextX, y: nextY, width, height, boundaryWidth, boundaryHeight, padding }),
    width: Number(width) || 0,
    height: Number(height) || 0,
  });
  const right = Number(boundaryWidth) - Number(width) - Number(padding);
  const bottom = Number(boundaryHeight) - Number(height) - Number(padding);
  const candidates = [
    candidate(base.x, base.y),
    candidate(right, padding),
    candidate(padding, padding),
    candidate(right, bottom),
    candidate(padding, bottom),
  ];
  const available = candidates.find((item) => normalizedObstacles.every((obstacle) => !overlaps(item, obstacle, padding)));
  const result = available || candidates[0];
  return { x: result.x, y: result.y };
}
