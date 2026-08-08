export function isDrawingUiEvent(event) {
  const path = typeof event?.composedPath === "function" ? event.composedPath() : [];
  if (path.some((node) => node?.dataset?.drawingUi === "true")) return true;
  return Boolean(event?.target?.closest?.('[data-drawing-ui="true"]'));
}
