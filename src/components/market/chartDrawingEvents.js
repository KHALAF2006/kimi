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
