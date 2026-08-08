function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundedLabel(context, x, y, text, color, maxWidth) {
  const label = String(text || "");
  if (!label) return;
  context.save();
  context.font = "800 11px Tajawal";
  context.textBaseline = "middle";
  const horizontalPadding = 8;
  const width = Math.min(maxWidth, context.measureText(label).width + horizontalPadding * 2);
  const height = 24;
  const left = clamp(x, 4, Math.max(4, maxWidth - width));
  const top = clamp(y - height / 2, 4, Number.MAX_SAFE_INTEGER);
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(left, top, width, height, 6);
  context.fill();
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.rect(left + horizontalPadding, top, Math.max(0, width - horizontalPadding * 2), height);
  context.clip();
  context.fillText(label, left + horizontalPadding, top + height / 2);
  context.restore();
}

class InvestorZoneRenderer {
  constructor(view) {
    this.view = view;
  }

  draw(target) {
    const zones = this.view.zones;
    if (!zones.length) return;
    target.useMediaCoordinateSpace(({ context, mediaSize }) => {
      context.save();
      context.beginPath();
      context.rect(0, 0, mediaSize.width, mediaSize.height);
      context.clip();
      for (const zone of zones) {
        const top = clamp(Math.min(zone.top, zone.bottom), 0, mediaSize.height);
        const bottom = clamp(Math.max(zone.top, zone.bottom), 0, mediaSize.height);
        if (bottom <= top) continue;
        const left = clamp(zone.left, 0, mediaSize.width);
        const width = Math.max(0, mediaSize.width - left);
        if (!width) continue;
        context.fillStyle = zone.fill;
        context.fillRect(left, top, width, Math.max(2, bottom - top));
        context.strokeStyle = zone.color;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(left, top + 0.5);
        context.lineTo(mediaSize.width, top + 0.5);
        context.moveTo(left, bottom - 0.5);
        context.lineTo(mediaSize.width, bottom - 0.5);
        context.stroke();
        roundedLabel(context, left + 8, (top + bottom) / 2, zone.name, zone.color, mediaSize.width - 8);
      }
      context.restore();
    });
  }
}

class InvestorZonePaneView {
  constructor(primitive) {
    this.primitive = primitive;
    this.zones = [];
    this.rendererInstance = new InvestorZoneRenderer(this);
  }

  update() {
    const { chart, series, data } = this.primitive;
    if (!chart || !series || !data.visible) {
      this.zones = [];
      return;
    }
    const referenceX = Number.isFinite(data.referenceTime)
      ? chart.timeScale().timeToCoordinate(data.referenceTime)
      : null;
    const left = Number.isFinite(referenceX) ? Math.max(0, Number(referenceX)) : 0;
    this.zones = data.zones.flatMap((zone) => {
      const top = series.priceToCoordinate(zone.topPrice);
      const bottom = series.priceToCoordinate(zone.bottomPrice);
      return top == null || bottom == null ? [] : [{ ...zone, left, top, bottom }];
    });
  }

  zOrder() {
    return /** @type {"bottom"} */ ("bottom");
  }

  renderer() {
    return this.rendererInstance;
  }
}

export class InvestorZonePrimitive {
  constructor() {
    this.chart = null;
    this.series = null;
    this.requestUpdate = null;
    this.data = { visible: false, referenceTime: null, zones: [] };
    this.view = new InvestorZonePaneView(this);
    this.views = [this.view];
  }

  attached({ chart, series, requestUpdate }) {
    this.chart = chart;
    this.series = series;
    this.requestUpdate = requestUpdate;
  }

  detached() {
    this.chart = null;
    this.series = null;
    this.requestUpdate = null;
  }

  paneViews() {
    return this.views;
  }

  updateAllViews() {
    this.view.update();
  }

  setData(data) {
    this.data = data || { visible: false, referenceTime: null, zones: [] };
    this.view.update();
    this.requestUpdate?.();
  }
}
