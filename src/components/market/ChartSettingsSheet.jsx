import React, { useEffect, useRef, useState } from "react";
import { ChartCandlestick, Grid2X2, Palette, RotateCcw, Save, SlidersHorizontal, X } from "lucide-react";
import { chartVisualDefaults, sanitizeChartPreferences } from "@/lib/chart-visuals";

const candleTypes = [
  { value: "candles", ar: "شموع عادية", en: "Candles" },
  { value: "hollow", ar: "شموع مفرغة", en: "Hollow candles" },
  { value: "heikin_ashi", ar: "هايكن آشي", en: "Heikin Ashi" },
];

function ColorField({ label, value, onChange }) {
  return <label className="chart-setting-field chart-setting-color">
    <span>{label}</span>
    <span><input type="color" value={value} onChange={(event) => onChange(event.target.value)} /><code>{value}</code></span>
  </label>;
}

function SmaEditor({ title, value, onChange, isArabic }) {
  return <section className="chart-settings-section">
    <div className="chart-settings-section-title"><SlidersHorizontal size={17} /><div><b>{title}</b><small>{isArabic ? `الاسم المعروض يتغير تلقائيًا إلى المتوسط البسيط ${value.length}` : `The label updates automatically to SMA ${value.length}`}</small></div></div>
    <div className="chart-settings-grid">
      <label className="chart-setting-field"><span>{isArabic ? "الفترة" : "Length"}</span><input type="number" min="1" max="500" value={value.length} onChange={(event) => onChange({ length: Math.max(1, Math.min(500, Number(event.target.value) || 1)) })} /></label>
      <label className="chart-setting-field"><span>{isArabic ? "سماكة الخط" : "Line width"}</span><select value={value.lineWidth} onChange={(event) => onChange({ lineWidth: Number(event.target.value) })}>{[1, 2, 3, 4, 5].map((width) => <option key={width} value={width}>{width}</option>)}</select></label>
      <ColorField label={isArabic ? "لون الخط" : "Line color"} value={value.color} onChange={(color) => onChange({ color })} />
    </div>
  </section>;
}

export default function ChartSettingsSheet({ open, onOpenChange, preferences, onApply, theme, isArabic, saving = false }) {
  const [draft, setDraft] = useState(() => sanitizeChartPreferences(preferences, theme));
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setDraft(sanitizeChartPreferences(preferences, theme));
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    /** @type {HTMLElement | null} */ (dialog?.querySelector("button") || null)?.focus();
    const keyDown = (event) => {
      if (event.key === "Escape") onOpenChange(false);
      if (event.key !== "Tab" || !dialog) return;
      const controls = [...dialog.querySelectorAll("button:not(:disabled),input:not(:disabled),select:not(:disabled)")];
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
  }, [open, preferences, theme]);

  const patch = (value) => setDraft((current) => sanitizeChartPreferences({ ...current, ...value }, theme));
  const patchSma = (slot, value) => setDraft((current) => sanitizeChartPreferences({
    ...current,
    sma: { ...current.sma, [slot]: { ...current.sma[slot], ...value } },
  }, theme));

  if (!open) return null;

  return <div className="chart-settings-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onOpenChange(false)}>
    <aside ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="chart-settings-title" className={"chart-settings-sheet " + (isArabic ? "chart-settings-sheet-right" : "chart-settings-sheet-left")} dir={isArabic ? "rtl" : "ltr"}>
      <button type="button" className="chart-settings-dismiss" onClick={() => onOpenChange(false)} aria-label={isArabic ? "إغلاق إعدادات الشارت" : "Close chart settings"}><X size={17} /></button>
      <header className="chart-settings-header">
        <div className="chart-settings-heading-icon"><ChartCandlestick size={22} /></div>
        <div><h2 id="chart-settings-title">{isArabic ? "إعدادات الرسم البياني" : "Chart settings"}</h2><p>{isArabic ? "انقر نقراً مزدوجاً على مساحة الشارت لفتح هذه الإعدادات في أي وقت." : "Double-click the chart area to open these settings at any time."}</p></div>
      </header>

      <div className="chart-settings-scroll">
        <section className="chart-settings-section">
          <div className="chart-settings-section-title"><ChartCandlestick size={17} /><div><b>{isArabic ? "نوع الشموع" : "Candle type"}</b><small>{draft.candleType === "heikin_ashi" ? (isArabic ? "شموع حسابية للعرض؛ السعر والإشارات يظلان من الشموع الأصلية." : "Synthetic display candles; signals remain based on standard OHLC.") : (isArabic ? "اختر شكل عرض السعر." : "Choose the price display style.")}</small></div></div>
          <div className="chart-candle-type-grid">{candleTypes.map((item) => <button type="button" key={item.value} onClick={() => patch({ candleType: item.value })} className={draft.candleType === item.value ? "active" : ""} aria-pressed={draft.candleType === item.value}><ChartCandlestick size={18} /><span>{isArabic ? item.ar : item.en}</span></button>)}</div>
          <div className="chart-settings-grid">
            <ColorField label={isArabic ? "لون الصعود" : "Up color"} value={draft.upColor} onChange={(upColor) => patch({ upColor })} />
            <ColorField label={isArabic ? "لون الهبوط" : "Down color"} value={draft.downColor} onChange={(downColor) => patch({ downColor })} />
            <label className="chart-setting-check"><input type="checkbox" checked={draft.borderVisible} onChange={(event) => patch({ borderVisible: event.target.checked })} /><span>{isArabic ? "إظهار حدود الشموع" : "Show candle borders"}</span></label>
            <label className="chart-setting-check"><input type="checkbox" checked={draft.wickVisible} onChange={(event) => patch({ wickVisible: event.target.checked })} /><span>{isArabic ? "إظهار ظلال الشموع" : "Show candle wicks"}</span></label>
          </div>
        </section>

        <section className="chart-settings-section">
          <div className="chart-settings-section-title"><Palette size={17} /><div><b>{isArabic ? "خلفية الشارت" : "Chart background"}</b><small>{isArabic ? "مستقلة عن ثيم الموقع ويمكن تغييرها في أي وقت." : "Independent from the website theme and editable at any time."}</small></div></div>
          <div className="chart-background-mode">
            <button type="button" className={draft.backgroundMode === "theme" ? "active" : ""} onClick={() => patch({ backgroundMode: "theme" })}>{isArabic ? "مطابقة الثيم" : "Follow theme"}</button>
            <button type="button" className={draft.backgroundMode === "custom" ? "active" : ""} onClick={() => patch({ backgroundMode: "custom" })}>{isArabic ? "لون مخصص" : "Custom color"}</button>
          </div>
          <div className="chart-settings-grid">
            <ColorField label={isArabic ? "لون الخلفية" : "Background"} value={draft.backgroundColor} onChange={(backgroundColor) => patch({ backgroundColor, backgroundMode: "custom" })} />
            <ColorField label={isArabic ? "لون النص والمقاييس" : "Text and scales"} value={draft.textColor} onChange={(textColor) => patch({ textColor, backgroundMode: "custom" })} />
            <ColorField label={isArabic ? "لون الشبكة" : "Grid color"} value={draft.gridColor} onChange={(gridColor) => patch({ gridColor, backgroundMode: "custom" })} />
            <label className="chart-setting-check"><input type="checkbox" checked={draft.gridVisible} onChange={(event) => patch({ gridVisible: event.target.checked })} /><span><Grid2X2 size={15} />{isArabic ? "إظهار خطوط الشبكة" : "Show grid lines"}</span></label>
            <label className="chart-setting-check"><input type="checkbox" checked={draft.watermarkVisible} onChange={(event) => patch({ watermarkVisible: event.target.checked })} /><span>{isArabic ? "إظهار اسم الشركة ورمزها كعلامة مائية" : "Show company identity watermark"}</span></label>
          </div>
        </section>

        <SmaEditor title={isArabic ? `المتوسط البسيط ${draft.sma.fast.length}` : `SMA ${draft.sma.fast.length}`} value={draft.sma.fast} onChange={(value) => patchSma("fast", value)} isArabic={isArabic} />
        <SmaEditor title={isArabic ? `المتوسط البسيط ${draft.sma.slow.length}` : `SMA ${draft.sma.slow.length}`} value={draft.sma.slow} onChange={(value) => patchSma("slow", value)} isArabic={isArabic} />
      </div>

      <footer className="chart-settings-footer">
        <button type="button" className="secondary-button" onClick={() => setDraft(chartVisualDefaults(theme))}><RotateCcw size={15} />{isArabic ? "الافتراضي" : "Defaults"}</button>
        <button type="button" className="primary-button" disabled={saving} onClick={() => onApply(sanitizeChartPreferences(draft, theme))}><Save size={15} />{saving ? (isArabic ? "جارٍ الحفظ…" : "Saving…") : (isArabic ? "حفظ الإعدادات" : "Save settings")}</button>
      </footer>
    </aside>
  </div>;
}
