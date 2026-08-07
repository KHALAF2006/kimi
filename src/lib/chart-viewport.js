/**
 * Single arbiter for the chart's visible logical range.
 *
 * Two effects want to control the viewport and they run in different phases:
 *
 *   - the pane/resize effect captures the current range synchronously, then
 *     restores it inside `requestAnimationFrame` (after re-adding the volume
 *     and RSI panes);
 *   - the data effect calls `fitContent()` synchronously when new candles for
 *     a new chart identity arrive.
 *
 * The restore therefore lands one frame *after* the fit and overwrites it. When
 * `fitContent()` ran on every data refresh that was invisible, because the next
 * refresh healed it. Once the fit became a once-per-identity operation, the
 * stale range - captured while the chart was still empty - survived, and the
 * viewport ended up parked on whitespace with the candles off-screen.
 *
 * This controller makes the two paths cooperate: while a fit is pending nobody
 * captures or restores a range, and whichever path reaches the next animation
 * frame first performs the fit exactly once.
 */
export function createViewportController() {
  let pendingFit = true;

  return {
    /** Ask for a fit as soon as candles for the new identity are on screen. */
    requestFit() {
      pendingFit = true;
    },

    isFitPending() {
      return pendingFit;
    },

    /**
     * Capture the range to restore later, or `null` while a fit is pending.
     * @param {() => any} getRange
     */
    captureRange(getRange) {
      return pendingFit ? null : getRange();
    },

    /**
     * Resolve the viewport inside an animation frame. Returns what it did so
     * callers (and tests) can assert the outcome.
     * @param {{ savedRange?: any, hasData?: boolean, setRange?: (range: any) => void, fitContent?: () => void }} options
     * @returns {"restored" | "fitted" | "skipped"}
     */
    apply({ savedRange = null, hasData = false, setRange = () => {}, fitContent = () => {} }) {
      if (savedRange) {
        setRange(savedRange);
        return "restored";
      }
      if (pendingFit && hasData) {
        pendingFit = false;
        fitContent();
        return "fitted";
      }
      return "skipped";
    },
  };
}

export default createViewportController;
