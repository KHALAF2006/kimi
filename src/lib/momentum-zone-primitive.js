/**
 * Momentum zone rendering as a lightweight-charts series primitive.
 *
 * The previous implementation positioned zones with absolutely positioned DOM
 * boxes whose coordinates were recomputed inside `requestAnimationFrame` after
 * chart interaction events. That always painted one or more frames behind the
 * canvas, which made the zones visibly chase the candles while zooming or
 * panning. A series primitive is asked for coordinates by the chart itself
 * during the same paint pass as the candles, so the zones can never lag.
 */

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function rgba(color, alpha) {
  const hex = String(color || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return color;
  const [red, green, blue] = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  return `rgba(${red}, ${green}, ${blue}, ${clamp(Number(alpha) || 0, 0, 1)})`;
}

class MomentumZoneRenderer {
  constructor() {
    this._boxes = [];
    this._labelsVisible = true;
    this._isArabic = true;
  }

  update(boxes, labelsVisible, isArabic) {
    this._boxes = boxes;
    this._labelsVisible = labelsVisible;
    this._isArabic = isArabic;
  }

  draw(target) {
    if (!this._boxes.length) return;
    target.useMediaCoordinateSpace((scope) => {
      const context = scope.context;
      const width = scope.mediaSize.width;
      const height = scope.mediaSize.height;
      context.save();
      this._boxes.forEach((box) => {
        const top = clamp(Math.min(box.top, box.bottom), 0, height);
        const bottom = clamp(Math.max(box.top, box.bottom), 0, height);
        if (bottom - top < 1) return;
        const left = clamp(box.left, 0, width);
        const right = width;
        if (right - left < 1) return;

        context.fillStyle = rgba(box.color, box.fillAlpha);
        context.fillRect(left, top, right - left, bottom - top);

        context.strokeStyle = box.color;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(left, top + 0.5);
        context.lineTo(right, top + 0.5);
        context.moveTo(left, bottom - 0.5);
        context.lineTo(right, bottom - 0.5);
        context.stroke();

        if (!this._labelsVisible || !box.name) return;
        context.font = "bold 11px Tajawal";
        context.direction = this._isArabic ? "rtl" : "ltr";
        const textWidth = Math.min(context.measureText(box.name).width, 220);
        const padding = 6;
        const labelHeight = 18;
        const labelWidth = textWidth + padding * 2;
        const labelLeft = clamp(left + 8, 0, Math.max(0, right - labelWidth));
        const labelTop = clamp((top + bottom) / 2 - labelHeight / 2, 0, Math.max(0, height - labelHeight));
        if (bottom - top < labelHeight + 2) return;
        context.fillStyle = box.color;
        context.beginPath();
        context.roundRect(labelLeft, labelTop, labelWidth, labelHeight, 5);
        context.fill();
        context.fillStyle = "#ffffff";
        context.textAlign = this._isArabic ? "right" : "left";
        context.textBaseline = "middle";
        context.fillText(
          box.name,
          this._isArabic ? labelLeft + labelWidth - padding : labelLeft + padding,
          labelTop + labelHeight / 2,
          textWidth,
        );
      });
      context.restore();
    });
  }
}

class MomentumZonePaneView {
  constructor(source) {
    this._source = source;
    this._renderer = new MomentumZoneRenderer();
  }

  zOrder() {
    return "bottom";
  }

  update() {
    this._renderer.update(this._source.boxes(), this._source.labelsVisible(), this._source.isArabic());
  }

  renderer() {
    return this._renderer;
  }
}

export class MomentumZonePrimitive {
  constructor(options = {}) {
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
    this._zones = [];
    this._referenceTime = null;
    this._fillAlpha = 0.18;
    this._labelsVisible = true;
    this._isArabic = Boolean(options.isArabic);
    this._boxes = [];
    this._paneViews = [new MomentumZonePaneView(this)];
  }

  attached({ chart, series, requestUpdate }) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }

  detached() {
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  /**
   * @param {{ zones?: Array<any>, referenceTime?: number|null, fillAlpha?: number, labelsVisible?: boolean, isArabic?: boolean }} next
   */
  setState(next) {
    if (Array.isArray(next.zones)) this._zones = next.zones;
    if ("referenceTime" in next) this._referenceTime = Number.isFinite(Number(next.referenceTime)) ? Number(next.referenceTime) : null;
    if (Number.isFinite(Number(next.fillAlpha))) this._fillAlpha = clamp(Number(next.fillAlpha), 0, 1);
    if ("labelsVisible" in next) this._labelsVisible = Boolean(next.labelsVisible);
    if ("isArabic" in next) this._isArabic = Boolean(next.isArabic);
    this._requestUpdate?.();
  }

  boxes() {
    return this._boxes;
  }

  labelsVisible() {
    return this._labelsVisible;
  }

  isArabic() {
    return this._isArabic;
  }

  // Called by the chart on every render pass, in the same frame as the candles.
  updateAllViews() {
    const chart = this._chart;
    const series = this._series;
    if (!chart || !series || !this._zones.length) {
      this._boxes = [];
      this._paneViews.forEach((view) => view.update());
      return;
    }
    const timeScale = chart.timeScale();
    const referenceX = this._referenceTime == null ? null : timeScale.timeToCoordinate(this._referenceTime);
    this._boxes = this._zones.map((zone) => {
      const top = series.priceToCoordinate(Number(zone.top));
      const bottom = series.priceToCoordinate(Number(zone.bottom));
      if (top == null || bottom == null) return null;
      return {
        key: zone.key,
        color: zone.color,
        name: zone.name,
        fillAlpha: this._fillAlpha,
        left: referenceX == null ? 0 : Math.max(0, referenceX),
        top,
        bottom,
      };
    }).filter(Boolean);
    this._paneViews.forEach((view) => view.update());
  }

  paneViews() {
    return this._paneViews;
  }
}

export default MomentumZonePrimitive;
