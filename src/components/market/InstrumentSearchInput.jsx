import React, { useEffect, useId, useRef, useState } from "react";
import { BarChart3, Building2, Layers3, Loader2, Search } from "lucide-react";
import { invokeAppFunction } from "@/services/marketService";

const typeMeta = {
  equity: { ar: "سهم", en: "Stock", Icon: Building2 },
  sector_index: { ar: "مؤشر قطاع", en: "Sector index", Icon: Layers3 },
  market_index: { ar: "مؤشر سوق", en: "Market index", Icon: BarChart3 },
};

export default function InstrumentSearchInput({ value, onChange, onSelect = undefined, isArabic, label, required = false, disabled = false }) {
  const [state, setState] = useState({ loading: false, open: false, rows: [], error: "", activeIndex: -1 });
  const requestRef = useRef(0);
  const suppressNextQueryRef = useRef(false);
  const inputRef = useRef(null);
  const generatedId = useId().replace(/:/g, "");
  const listboxId = `instrument-search-${generatedId}`;

  useEffect(() => {
    if (suppressNextQueryRef.current) {
      suppressNextQueryRef.current = false;
      return undefined;
    }
    const query = String(value || "").trim();
    if (!query) {
      requestRef.current += 1;
      setState({ loading: false, open: false, rows: [], error: "", activeIndex: -1 });
      return undefined;
    }
    const requestId = ++requestRef.current;
    const timer = window.setTimeout(async () => {
      setState((current) => ({ ...current, loading: true, open: true, error: "", activeIndex: -1 }));
      try {
        const data = await invokeAppFunction("marketRead", { action: "instrument_search", query, limit: 12, market_code: "SA_MAIN" });
        if (requestId !== requestRef.current) return;
        const rows = Array.isArray(data.instruments) ? data.instruments : [];
        setState({ loading: false, open: true, rows, error: "", activeIndex: rows.length ? 0 : -1 });
      } catch (error) {
        if (requestId !== requestRef.current) return;
        setState({ loading: false, open: true, rows: [], error: error?.response?.data?.error || error.message, activeIndex: -1 });
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [value]);

  function choose(instrument) {
    if (!instrument) return;
    requestRef.current += 1;
    suppressNextQueryRef.current = true;
    onChange(instrument.symbol);
    onSelect?.(instrument);
    setState({ loading: false, open: false, rows: [], error: "", activeIndex: -1 });
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      if (state.open) event.preventDefault();
      setState((current) => ({ ...current, open: false, activeIndex: -1 }));
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!state.rows.length) return;
      event.preventDefault();
      setState((current) => {
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const start = current.activeIndex < 0 ? (direction > 0 ? -1 : 0) : current.activeIndex;
        const activeIndex = (start + direction + current.rows.length) % current.rows.length;
        return { ...current, open: true, activeIndex };
      });
      return;
    }
    if (event.key === "Enter" && state.open && state.activeIndex >= 0) {
      event.preventDefault();
      choose(state.rows[state.activeIndex]);
    }
  }

  const activeOptionId = state.open && state.activeIndex >= 0 ? `${listboxId}-option-${state.activeIndex}` : undefined;

  return <div className="instrument-search">
    <div className="instrument-search-field">
      <Search size={16} aria-hidden="true" />
      <input
        ref={inputRef}
        className="form-input"
        value={value}
        onChange={(event) => { onSelect?.(null); onChange(event.target.value.slice(0, 120)); }}
        onFocus={() => value && setState((current) => ({ ...current, open: true }))}
        onBlur={() => window.setTimeout(() => setState((current) => ({ ...current, open: false, activeIndex: -1 })), 160)}
        onKeyDown={handleKeyDown}
        placeholder={label}
        aria-label={label}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={state.open}
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        autoComplete="off"
        required={required}
        disabled={disabled}
      />
      {state.loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
    </div>
    {state.open && <div id={listboxId} className="instrument-search-results" role="listbox" aria-label={isArabic ? "نتائج البحث عن سهم أو مؤشر" : "Stock and index search results"}>
      {state.error ? <p className="text-red-600">{isArabic ? "تعذر البحث في دليل الأدوات" : "Instrument search failed"}</p>
        : state.rows.length ? state.rows.map((instrument, index) => {
          const meta = typeMeta[instrument.instrument_type] || typeMeta.equity;
          const TypeIcon = meta.Icon;
          return <button
            id={`${listboxId}-option-${index}`}
            key={`${instrument.instrument_type || "equity"}:${instrument.id || instrument.symbol}`}
            type="button"
            role="option"
            aria-selected={state.activeIndex === index}
            className={state.activeIndex === index ? "active" : ""}
            onMouseEnter={() => setState((current) => ({ ...current, activeIndex: index }))}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(instrument)}
          >
            <span className="instrument-search-result-main"><TypeIcon size={15} aria-hidden="true" /><b dir="ltr">{instrument.symbol}</b><strong>{isArabic ? instrument.name_ar : instrument.name_en}</strong></span>
            <small><span className={`instrument-kind instrument-kind-${instrument.instrument_type || "equity"}`}>{isArabic ? meta.ar : meta.en}</span>{isArabic ? instrument.sector_ar : instrument.sector_en}{instrument.quote?.last_price ? ` · ${Number(instrument.quote.last_price).toFixed(2)} ر.س` : ""}</small>
          </button>;
        })
          : !state.loading && <p>{isArabic ? "لا توجد أداة مطابقة في قاعدة البيانات" : "No matching instrument in the database"}</p>}
    </div>}
  </div>;
}
