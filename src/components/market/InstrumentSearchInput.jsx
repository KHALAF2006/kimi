import React, { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { invokeAppFunction } from "@/services/marketService";

export default function InstrumentSearchInput({ value, onChange, onSelect = undefined, isArabic, label, required = false, disabled = false }) {
  const [state, setState] = useState({ loading: false, open: false, rows: [], error: "" });
  const requestRef = useRef(0);

  useEffect(() => {
    const query = String(value || "").trim();
    if (!query) {
      setState({ loading: false, open: false, rows: [], error: "" });
      return undefined;
    }
    const requestId = ++requestRef.current;
    const timer = window.setTimeout(async () => {
      setState((current) => ({ ...current, loading: true, open: true, error: "" }));
      try {
        const data = await invokeAppFunction("marketRead", { action: "instrument_search", query, limit: 12, market_code: "SA_MAIN" });
        if (requestId !== requestRef.current) return;
        setState({ loading: false, open: true, rows: data.instruments || [], error: "" });
      } catch (error) {
        if (requestId !== requestRef.current) return;
        setState({ loading: false, open: true, rows: [], error: error?.response?.data?.error || error.message });
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [value]);

  function choose(instrument) {
    requestRef.current += 1;
    onChange(instrument.symbol);
    onSelect?.(instrument);
    setState({ loading: false, open: false, rows: [], error: "" });
  }

  return <div className="instrument-search">
    <div className="instrument-search-field">
      <Search size={16} aria-hidden="true" />
      <input
        className="form-input"
        value={value}
        onChange={(event) => { onSelect?.(null); onChange(event.target.value.slice(0, 120)); }}
        onFocus={() => value && setState((current) => ({ ...current, open: true }))}
        onBlur={() => window.setTimeout(() => setState((current) => ({ ...current, open: false })), 160)}
        placeholder={label}
        aria-label={label}
        autoComplete="off"
        required={required}
        disabled={disabled}
      />
      {state.loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
    </div>
    {state.open && <div className="instrument-search-results" role="listbox">
      {state.error ? <p className="text-red-600">{isArabic ? "تعذر البحث في دليل الشركات" : "Instrument search failed"}</p>
        : state.rows.length ? state.rows.map((instrument) => <button key={instrument.id} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(instrument)}>
          <span><b>{instrument.symbol}</b><strong>{isArabic ? instrument.name_ar : instrument.name_en}</strong></span>
          <small>{isArabic ? instrument.sector_ar : instrument.sector_en}{instrument.quote?.last_price ? ` · ${Number(instrument.quote.last_price).toFixed(2)} ر.س` : ""}</small>
        </button>)
          : !state.loading && <p>{isArabic ? "لا توجد شركة مطابقة في قاعدة الأدوات" : "No matching instrument in the catalog"}</p>}
    </div>}
  </div>;
}
