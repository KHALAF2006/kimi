const MENUS = new Set(["candle-type", "indicators", "reversals"]);
const PANELS = new Set(["momentum", "rsi"]);

/** @typedef {{ menu: string, panel: string }} ChartControlState */
/** @type {Readonly<ChartControlState>} */
export const closedChartControls = Object.freeze({ menu: "", panel: "" });

/**
 * @param {ChartControlState} state
 * @param {{ type?: string, menu?: string, panel?: string }} action
 * @returns {ChartControlState}
 */
export function chartControlTransition(state = closedChartControls, action) {
  const current = {
    menu: MENUS.has(state?.menu) ? state.menu : "",
    panel: PANELS.has(state?.panel) ? state.panel : "",
  };

  if (action?.type === "close-all") return closedChartControls;

  if (action?.type === "close-menu") {
    return current.menu === action.menu ? { ...current, menu: "" } : current;
  }

  if (action?.type === "close-panel") {
    return current.panel ? { ...current, panel: "" } : current;
  }

  if (action?.type === "toggle-menu" && MENUS.has(action.menu)) {
    // The indicators button owns its inline settings too. Pressing the same
    // control while a settings panel is open closes that panel in one click.
    if (action.menu === "indicators" && current.panel) return closedChartControls;
    if (current.menu === action.menu) return closedChartControls;
    return { menu: action.menu, panel: "" };
  }

  if (action?.type === "toggle-panel" && PANELS.has(action.panel)) {
    if (current.panel === action.panel) return closedChartControls;
    return { menu: "", panel: action.panel };
  }

  return current;
}
