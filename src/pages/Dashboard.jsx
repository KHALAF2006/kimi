import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Activity, BarChart3, Building2, Database, GripVertical, Layers3, RefreshCw, Search, TrendingDown, TrendingUp } from "lucide-react";
import CompanyPanel from "@/components/market/CompanyPanel";
import MarketTable from "@/components/market/MarketTable";
import MarketTicker from "@/components/market/MarketTicker";
import { formatCompact, marketSummary } from "@/lib/market";
import { usePreferences } from "@/lib/preferences";
import { invokeAppFunction } from "@/services/marketService";

function SummaryCard({ icon: Icon, label, value, tone }) {
  return <div className="summary-card"><span className={"summary-icon " + tone}><Icon size={18} /></span><div><p>{label}</p><b>{value}</b></div></div>;
}

export default function Dashboard() {
  const { language, isArabic, text } = usePreferences();
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, rows: [], total: 0, sources: [], error: "", notice: "" });
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");
  const [activeTab, setActiveTab] = useState("companies");
  const [excludeLoss, setExcludeLoss] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [profileWidth, setProfileWidth] = useState(() => Math.min(760, Math.max(380, Number(localStorage.getItem("kmy_profile_width")) || 500)));
  const resizeRef = useRef(null);
  const selectedSymbol = params.get("company") || "";

  async function loadMarket(silent = false) {
    if (!silent) setState((value) => ({ ...value, loading: true, error: "" }));
    try {
      const data = await invokeAppFunction("marketRead", { limit: 500, mode: activeTab === "momentum" ? "screener" : undefined });
      setState({ loading: false, rows: data.instruments || [], total: data.total || 0, sources: data.sources || [], error: "", notice: data.notice || "" });
    } catch (error) {
      setState((value) => ({ ...value, loading: false, error: error?.response?.data?.error || error?.message || "market_fetch_failed" }));
    }
  }

  useEffect(() => {
    loadMarket();
    const timer = window.setInterval(() => loadMarket(true), 15 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [activeTab === "momentum"]);

  const sectors = useMemo(() => {
    const counts = new Map();
    state.rows.forEach((row) => {
      const key = isArabic ? row.sector_ar : row.sector_en;
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [state.rows, isArabic]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return state.rows.filter((row) => {
      const quote = row.quote || {};
      const price = Number(quote.last_price);
      const matchesQuery = !needle || (row.symbol + " " + row.name_ar + " " + row.name_en + " " + row.sector_ar + " " + row.sector_en).toLowerCase().includes(needle);
      const matchesSector = !sector || row.sector_ar === sector || row.sector_en === sector;
      const matchesLoss = !excludeLoss || !(row.warning_flag || row.loss_classification?.level);
      const matchesMin = minPrice === "" || price >= Number(minPrice);
      const matchesMax = maxPrice === "" || price <= Number(maxPrice);
      return matchesQuery && matchesSector && matchesLoss && matchesMin && matchesMax;
    });
  }, [state.rows, query, sector, excludeLoss, minPrice, maxPrice]);

  const summary = useMemo(() => marketSummary(state.rows), [state.rows]);
  const gainers = useMemo(() => [...filtered].filter((row) => Number(row.quote?.change_percent || 0) > 0).sort((a, b) => Number(b.quote?.change_percent) - Number(a.quote?.change_percent)), [filtered]);
  const losers = useMemo(() => [...filtered].filter((row) => Number(row.quote?.change_percent || 0) < 0).sort((a, b) => Number(a.quote?.change_percent) - Number(b.quote?.change_percent)), [filtered]);
  const unchanged = useMemo(() => filtered.filter((row) => Number(row.quote?.change_percent || 0) === 0), [filtered]);

  function selectCompany(symbol) {
    setParams((current) => {
      current.set("company", symbol);
      return current;
    }, { replace: true });
    window.requestAnimationFrame(() => document.getElementById("company-profile")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function beginResize(event) {
    resizeRef.current = { x: event.clientX, width: profileWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function resize(event) {
    if (!resizeRef.current) return;
    const delta = isArabic ? resizeRef.current.x - event.clientX : event.clientX - resizeRef.current.x;
    setProfileWidth(Math.min(760, Math.max(380, resizeRef.current.width + delta)));
  }
  function finishResize(event) {
    if (!resizeRef.current) return;
    resizeRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    localStorage.setItem("kmy_profile_width", String(profileWidth));
  }
  function resetWidth() {
    setProfileWidth(500);
    localStorage.setItem("kmy_profile_width", "500");
  }

  const tabs = [
    ["companies", text.companies, Building2],
    ["movers", text.movers, TrendingUp],
    ["momentum", text.momentum, Layers3],
    ["quality", text.dataQuality, Database],
  ];

  return <div className="dashboard-page">
    <MarketTicker rows={state.rows} />
    <div className="mx-auto max-w-[1800px] space-y-5 px-3 py-5 sm:px-5">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div><span className="eyebrow"><Activity size={14} />{isArabic ? "السوق الرئيسية السعودية" : "Saudi Main Market"}</span><h1 className="mt-3 text-3xl font-black">{isArabic ? "لوحة السوق" : "Market dashboard"}</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{isArabic ? "أسعار وشموع ومؤشرات من مصادرها المسجلة، دون بيانات مولّدة." : "Quotes, candles and indicators from recorded sources, with no generated market data."}</p></div>
        <button className="secondary-button" onClick={() => loadMarket()} disabled={state.loading}><RefreshCw size={15} className={state.loading ? "animate-spin" : ""} />{isArabic ? "تحديث العرض" : "Refresh view"}</button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard icon={Building2} label={isArabic ? "الشركات" : "Companies"} value={summary.total} tone="summary-neutral" />
        <SummaryCard icon={TrendingUp} label={isArabic ? "مرتفعة" : "Gainers"} value={summary.up} tone="summary-up" />
        <SummaryCard icon={TrendingDown} label={isArabic ? "منخفضة" : "Losers"} value={summary.down} tone="summary-down" />
        <SummaryCard icon={Activity} label={isArabic ? "ثابتة" : "Unchanged"} value={summary.flat} tone="summary-flat" />
        <SummaryCard icon={BarChart3} label={isArabic ? "الحجم" : "Volume"} value={formatCompact(summary.volume, language)} tone="summary-neutral" />
        <SummaryCard icon={Database} label={isArabic ? "القيمة" : "Value"} value={formatCompact(summary.value, language)} tone="summary-neutral" />
      </section>

      {state.error && <div className="error-banner">{isArabic ? "تعذر تحديث السوق الآن. لم نعرض بيانات وهمية بدلًا منه." : "Market refresh failed. No mock data was substituted."}</div>}

      <section className="dashboard-grid" style={/** @type {React.CSSProperties} */ ({ "--profile-width": profileWidth + "px" })}>
        <aside id="company-profile" className="min-w-0 scroll-mt-28"><CompanyPanel symbol={selectedSymbol} onResetWidth={resetWidth} /></aside>
        <button type="button" className="dashboard-resizer" aria-label={isArabic ? "اسحب لتغيير عرض لوحة الشركة" : "Drag to resize company panel"} onPointerDown={beginResize} onPointerMove={resize} onPointerUp={finishResize} onDoubleClick={resetWidth}><GripVertical size={18} /></button>

        <div className="min-w-0 space-y-4">
          <section className="content-card p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.4fr)]">
              <label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isArabic ? "ابحث برمز الشركة أو اسمها…" : "Search by symbol or company…"} /></label>
              <div className="flex flex-wrap gap-2"><button className={"filter-chip " + (!sector ? "filter-chip-active" : "")} onClick={() => setSector("")}>{isArabic ? "جميع القطاعات" : "All sectors"}</button>{sectors.map(([name, count]) => <button key={name} className={"filter-chip " + (sector === name ? "filter-chip-active" : "")} onClick={() => setSector(name)}>{name}<span>{count}</span></button>)}</div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <label className="filter-toggle"><input type="checkbox" checked={excludeLoss} onChange={(event) => setExcludeLoss(event.target.checked)} />{isArabic ? "استبعاد الشركات المصنفة بخسائر متراكمة" : "Exclude accumulated-loss classifications"}</label>
              <label className="price-filter">{isArabic ? "السعر من" : "Price from"}<input type="number" min="0" step="0.01" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} /></label>
              <label className="price-filter">{isArabic ? "إلى" : "To"}<input type="number" min="0" step="0.01" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /></label>
              <span className="text-xs text-slate-500">{filtered.length} {isArabic ? "نتيجة" : "results"}</span>
            </div>
          </section>

          <div className="tab-bar">{tabs.map(([id, label, Icon]) => <button key={id} onClick={() => setActiveTab(id)} className={activeTab === id ? "active" : ""}><Icon size={16} />{label}</button>)}</div>

          {state.loading ? <div className="loading-panel"><RefreshCw className="animate-spin" />{isArabic ? "جارٍ تحميل السوق…" : "Loading market…"}</div> : <>
            {activeTab === "companies" && <MarketTable rows={filtered} selectedSymbol={selectedSymbol} onSelect={selectCompany} />}
            {activeTab === "movers" && <div className="space-y-6">
              <section><h2 className="list-title market-up">{isArabic ? "الأكثر ارتفاعًا" : "Top gainers"}</h2><MarketTable rows={gainers.slice(0, 20)} selectedSymbol={selectedSymbol} onSelect={selectCompany} /></section>
              <section><h2 className="list-title market-down">{isArabic ? "الأكثر انخفاضًا" : "Top losers"}</h2><MarketTable rows={losers.slice(0, 20)} selectedSymbol={selectedSymbol} onSelect={selectCompany} /></section>
              <section><h2 className="list-title">{isArabic ? "الثابتة" : "Unchanged"}</h2><MarketTable rows={unchanged.slice(0, 20)} selectedSymbol={selectedSymbol} onSelect={selectCompany} /></section>
            </div>}
            {activeTab === "momentum" && <MarketTable rows={filtered.filter((row) => row.indicator)} selectedSymbol={selectedSymbol} onSelect={selectCompany} />}
            {activeTab === "quality" && <section className="content-card"><h2 className="font-black">{isArabic ? "مصدر وجودة البيانات" : "Data source and quality"}</h2><p className="mt-2 text-sm leading-7 text-slate-500">{state.notice || (isArabic ? "المصدر ووقت السعر يظهران مع كل شركة." : "Source and quote time appear with every company.")}</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{state.sources.map((source) => <div key={source.id || source.code} className="metric-card"><span>{source.source_type}</span><b>{source.name}</b><small>{source.last_verified_at ? new Date(source.last_verified_at).toLocaleString(isArabic ? "ar-SA" : "en-US") : ""}</small></div>)}</div></section>}
          </>}
        </div>
      </section>
    </div>
  </div>;
}
