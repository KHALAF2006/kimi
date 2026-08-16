import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Activity, BarChart3, Building2, Database, GripVertical, Layers3, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import CompanyPanel from "@/components/market/CompanyPanel";
import InstrumentSearchInput from "@/components/market/InstrumentSearchInput";
import MarketIndexPanel from "@/components/market/MarketIndexPanel";
import SectorPanel from "@/components/market/SectorPanel";
import MarketTable from "@/components/market/MarketTable";
import MarketTicker from "@/components/market/MarketTicker";
import { formatCompact, marketSummary } from "@/lib/market";
import { usePreferences } from "@/lib/preferences";
import { invokeAppFunction, readMarketSupplement } from "@/services/marketService";
import { useActiveMarket } from "@/lib/MarketContext";

const SECTOR_GROUPS = [
  { ar: "القطاعات القيادية", en: "Market leaders", sectors: ["البنوك", "المواد الأساسية", "الطاقة", "الاتصالات", "المرافق العامة"] },
  { ar: "المال وإدارة المخاطر", en: "Finance & risk", sectors: ["الخدمات المالية", "التأمين"] },
  { ar: "النمو والعقار", en: "Growth & real estate", sectors: ["التطبيقات وخدمات التقنية", "السلع الرأسمالية", "الخدمات التجارية والمهنية", "إدارة وتطوير العقارات", "الصناديق العقارية المتداولة"] },
  { ar: "الاستهلاك والإعلام", en: "Consumer & media", sectors: ["إنتاج الأغذية", "توزيع وتجزئة السلع الاستهلاكية", "المنتجات المنزلية والشخصية", "توزيع وتجزئة السلع الكمالية", "الخدمات الاستهلاكية", "السلع طويلة الأجل", "الإعلام والترفيه"] },
  { ar: "الصحة", en: "Health care", sectors: ["معدات وخدمات الرعاية الصحية", "الأدوية والتقنيات الحيوية وعلوم الحياة"] },
  { ar: "النقل", en: "Transportation", sectors: ["النقل"] },
];

function SummaryCard({ icon: Icon, label, value, tone, active, onClick }) {
  return <button type="button" className={"summary-card summary-card-button " + (active ? "summary-card-active" : "")} onClick={onClick} aria-pressed={active}><span className={"summary-icon " + tone}><Icon size={18} /></span><div><p>{label}</p><b>{value}</b></div></button>;
}

export default function Dashboard() {
  const { language, isArabic, text } = usePreferences();
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, marketCodeLoaded: "", rows: [], total: 0, sources: [], markets: [], market: null, snapshot: null, sectorSummaries: [], error: "", errorCode: "", refreshWarning: "", notice: "" });
  const { loading: marketContextLoading, error: marketContextError, marketCode, availableMarkets, refresh: refreshMarketAccess } = useActiveMarket();
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState(() => params.get("sector") || "");
  const [directionFilter, setDirectionFilter] = useState("");
  const [activeTab, setActiveTab] = useState("companies");
  const [excludeLoss, setExcludeLoss] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [profileWidth, setProfileWidth] = useState(() => Math.min(760, Math.max(380, Number(localStorage.getItem("smart_investor_profile_width")) || 500)));
  const resizeRef = useRef(null);
  const loadRequestRef = useRef(0);
  const selectedSymbol = params.get("company") || "";
  const selectedIndexCode = params.get("index") || "";
  const requestedTimeframe = params.get("timeframe") || "";
  const urlSector = params.get("sector") || "";

  async function loadMarket(silent = false) {
    if (marketContextLoading) return;
    if (!marketCode) {
      if (!silent) setState((value) => ({
        ...value,
        loading: false,
        error: marketContextError || "market_access_unavailable",
        errorCode: "MARKET_SUBSCRIPTION_REQUIRED",
      }));
      return;
    }
    const requestId = ++loadRequestRef.current;
    if (!silent) setState((value) => value.marketCodeLoaded === marketCode
      ? { ...value, loading: true, error: "", errorCode: "", refreshWarning: "" }
      : { ...value, loading: true, marketCodeLoaded: "", rows: [], total: 0, sources: [], market: null, snapshot: null, sectorSummaries: [], error: "", errorCode: "", refreshWarning: "", notice: "" });
    try {
      const [data, marketData] = await Promise.all([
        invokeAppFunction("marketRead", { limit: 500, market_code: marketCode, mode: activeTab === "momentum" ? "screener" : undefined }),
        availableMarkets.length ? Promise.resolve({ markets: availableMarkets }) : invokeAppFunction("marketRead", { action: "markets" }),
      ]);
      if (requestId !== loadRequestRef.current) return;
      const markets = marketData.markets || state.markets;
      setState((value) => ({ loading: false, marketCodeLoaded: marketCode, rows: data.instruments || [], total: data.total || 0, sources: data.sources || [], markets, market: data.market || markets.find((market) => market.market_code === marketCode) || null, snapshot: data.snapshot || null, sectorSummaries: value.marketCodeLoaded === marketCode ? value.sectorSummaries : [], error: "", errorCode: "", refreshWarning: "", notice: data.notice || "" }));
      if (activeTab !== "momentum") {
        window.setTimeout(() => {
          readMarketSupplement({ action: "sector_summaries", market_code: marketCode })
            .then((sectorData) => {
              if (requestId !== loadRequestRef.current) return;
              setState((value) => value.marketCodeLoaded === marketCode
                ? { ...value, sectorSummaries: sectorData.sector_summaries || [] }
                : value);
            })
            .catch(() => {});
        }, 2_000);
      }
    } catch (error) {
      if (requestId !== loadRequestRef.current) return;
      setState((value) => {
        const retained = value.marketCodeLoaded === marketCode && value.rows.length > 0;
        return {
          ...value,
          loading: false,
          error: retained ? "" : "market_fetch_failed",
          errorCode: retained ? "" : String(error?.response?.data?.code || error?.code || "MARKET_DATA_UNAVAILABLE"),
          refreshWarning: retained ? "last_snapshot_retained" : "",
        };
      });
    }
  }

  useEffect(() => {
    if (marketContextLoading) return undefined;
    loadMarket();
    if (!marketCode) return undefined;
    const timer = window.setInterval(() => loadMarket(true), 15 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [activeTab === "momentum", marketCode, marketContextLoading]);

  useEffect(() => { setSector(urlSector); }, [urlSector]);

  const sectorGroups = useMemo(() => {
    const sectors = new Map();
    const summaries = new Map(state.sectorSummaries.map((item) => [item.sector_ar, item]));
    state.rows.forEach((row) => {
      if (!row.sector_ar) return;
      const value = sectors.get(row.sector_ar) || { ar: row.sector_ar, en: row.sector_en, count: 0, summary: summaries.get(row.sector_ar) || null };
      value.count += 1;
      sectors.set(row.sector_ar, value);
    });
    const used = new Set();
    const groups = SECTOR_GROUPS.map((group) => ({
      ...group,
      items: group.sectors.map((name) => sectors.get(name)).filter(Boolean).map((item) => {
        used.add(item.ar);
        return item;
      }),
    })).filter((group) => group.items.length);
    const remaining = [...sectors.values()].filter((item) => !used.has(item.ar)).sort((a, b) => a.ar.localeCompare(b.ar, "ar"));
    if (remaining.length) groups.push({ ar: "قطاعات أخرى", en: "Other sectors", sectors: [], items: remaining });
    return groups;
  }, [state.rows, state.sectorSummaries]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return state.rows.filter((row) => {
      const quote = row.quote || {};
      const price = Number(quote.last_price);
      const change = Number(quote.change_percent || 0);
      const matchesQuery = !needle || (row.symbol + " " + row.name_ar + " " + row.name_en + " " + row.sector_ar + " " + row.sector_en).toLowerCase().includes(needle);
      const matchesSector = !sector || row.sector_ar === sector || row.sector_en === sector;
      const matchesLoss = !excludeLoss || !(row.warning_flag || row.loss_classification?.level);
      const matchesMin = minPrice === "" || price >= Number(minPrice);
      const matchesMax = maxPrice === "" || price <= Number(maxPrice);
      const matchesDirection = !directionFilter
        || directionFilter === "up" && change > 0
        || directionFilter === "down" && change < 0
        || directionFilter === "flat" && change === 0;
      return matchesQuery && matchesSector && matchesLoss && matchesMin && matchesMax && matchesDirection;
    });
  }, [state.rows, query, sector, excludeLoss, minPrice, maxPrice, directionFilter]);

  const summary = useMemo(() => marketSummary(state.rows), [state.rows]);
  const gainers = useMemo(() => [...filtered].filter((row) => Number(row.quote?.change_percent || 0) > 0).sort((a, b) => Number(b.quote?.change_percent) - Number(a.quote?.change_percent)), [filtered]);
  const losers = useMemo(() => [...filtered].filter((row) => Number(row.quote?.change_percent || 0) < 0).sort((a, b) => Number(a.quote?.change_percent) - Number(b.quote?.change_percent)), [filtered]);
  const unchanged = useMemo(() => filtered.filter((row) => Number(row.quote?.change_percent || 0) === 0), [filtered]);
  const orderedCompanies = useMemo(() => [...filtered].sort((a, b) => {
    const aChange = Number(a.quote?.change_percent || 0);
    const bChange = Number(b.quote?.change_percent || 0);
    if (directionFilter === "down") return aChange - bChange || a.symbol.localeCompare(b.symbol);
    if (directionFilter === "flat") return a.symbol.localeCompare(b.symbol);
    return bChange - aChange || a.symbol.localeCompare(b.symbol);
  }), [filtered, directionFilter]);
  const selectedIndex = orderedCompanies.findIndex((row) => row.symbol === selectedSymbol);
  const previousCompany = selectedIndex > 0 ? orderedCompanies[selectedIndex - 1] : null;
  const nextCompany = selectedIndex >= 0 && selectedIndex < orderedCompanies.length - 1 ? orderedCompanies[selectedIndex + 1] : null;

  function selectCompany(symbol) {
    setSector("");
    setParams((current) => {
      current.set("company", symbol);
      current.delete("sector");
      current.delete("index");
      return current;
    }, { replace: true });
    window.requestAnimationFrame(() => document.getElementById("company-profile")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function selectSector(nextSector) {
    setSector(nextSector);
    setParams((current) => {
      current.delete("company");
      current.delete("index");
      if (nextSector) current.set("sector", nextSector);
      else current.delete("sector");
      return current;
    }, { replace: true });
    if (nextSector) window.requestAnimationFrame(() => document.getElementById("company-profile")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function selectMarketIndex(indexCode) {
    setSector("");
    setParams((current) => {
      current.delete("company");
      current.delete("sector");
      if (indexCode) current.set("index", indexCode);
      else current.delete("index");
      return current;
    }, { replace: true });
    if (indexCode) window.requestAnimationFrame(() => document.getElementById("company-profile")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function selectInstrument(instrument) {
    if (!instrument) return;
    setQuery(instrument.symbol);
    if (instrument.instrument_type === "sector_index") selectSector(instrument.sector_ar || instrument.sector_en);
    else if (marketCode === "US_BENCHMARKS") selectCompany(instrument.symbol);
    else if (instrument.instrument_type === "market_index") selectMarketIndex(instrument.instrument_code || instrument.symbol);
    else selectCompany(instrument.symbol);
  }

  function applyDirection(direction) {
    setDirectionFilter((current) => current === direction ? "" : direction);
    setActiveTab("companies");
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
    localStorage.setItem("smart_investor_profile_width", String(profileWidth));
  }
  function resetWidth() {
    setProfileWidth(500);
    localStorage.setItem("smart_investor_profile_width", "500");
  }

  const tabs = [
    ["companies", text.companies, Building2],
    ["movers", text.movers, TrendingUp],
    ["momentum", text.momentum, Layers3],
    ["quality", text.dataQuality, Database],
  ];

  return <div className="dashboard-page">
    <MarketTicker rows={state.rows} marketCode={marketCode} />
    <div className="mx-auto max-w-[1800px] space-y-5 px-3 py-5 sm:px-5">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div><span className="eyebrow"><Activity size={14} />{isArabic ? state.market?.name_ar || "السوق الرئيسية السعودية" : state.market?.name_en || "Saudi Main Market"}</span><h1 className="mt-3 text-3xl font-black">{isArabic ? "لوحة السوق" : "Market dashboard"}</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{isArabic ? "السوق والشركات والشارت والمؤشرات في مساحة واحدة مترابطة." : "Market, companies, charts and indicators in one connected workspace."}</p></div>
        <div className="flex flex-wrap gap-2"><button className="secondary-button" onClick={() => marketCode ? loadMarket() : refreshMarketAccess()} disabled={state.loading || marketContextLoading}><RefreshCw size={15} className={state.loading || marketContextLoading ? "animate-spin" : ""} />{isArabic ? "تحديث العرض" : "Refresh view"}</button></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard icon={TrendingUp} label={isArabic ? "مرتفعة" : "Gainers"} value={summary.up} tone="summary-up" active={directionFilter === "up"} onClick={() => applyDirection("up")} />
        <SummaryCard icon={TrendingDown} label={isArabic ? "منخفضة" : "Losers"} value={summary.down} tone="summary-down" active={directionFilter === "down"} onClick={() => applyDirection("down")} />
        <SummaryCard icon={Activity} label={isArabic ? "ثابتة" : "Unchanged"} value={summary.flat} tone="summary-flat" active={directionFilter === "flat"} onClick={() => applyDirection("flat")} />
        <div className="summary-card"><span className="summary-icon summary-neutral"><BarChart3 size={18} /></span><div><p>{isArabic ? "الحجم" : "Volume"}</p><b>{formatCompact(summary.volume, language)}</b></div></div>
        <div className="summary-card"><span className="summary-icon summary-neutral"><Database size={18} /></span><div><p>{isArabic ? "القيمة" : "Value"}</p><b>{formatCompact(summary.value, language)}</b></div></div>
      </section>

      {state.error && <div className="error-banner" role="status">{state.errorCode === "MARKET_SUBSCRIPTION_REQUIRED"
        ? (isArabic ? "هذا السوق غير مفعّل لحسابك. قدّم طلب تفعيل أو تواصل مع الإدارة." : "This market is not active for your account. Apply for access or contact support.")
        : isArabic
        ? selectedIndexCode
          ? "تعذر تحديث ملخص مؤشر السوق؛ سيبقى آخر شارت محفوظ ظاهرًا إن كان متاحًا."
          : sector
            ? "تعذر تحديث قائمة شركات القطاع؛ سيبقى آخر شارت محفوظ ظاهرًا إن كان متاحًا."
            : selectedSymbol
              ? "تعذر تحديث ملخص الشركة؛ سيبقى آخر شارت محفوظ ظاهرًا إن كان متاحًا."
              : "تعذر تحديث ملخص السوق الآن. أعد المحاولة بعد قليل."
        : "The latest summary could not be refreshed. Previously stored data remains visible when available."}</div>}
      {state.refreshWarning && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200" role="status">{isArabic ? "تعذر التحديث الآن؛ نعرض لك أحدث معلومات متاحة." : "The latest refresh is delayed; you are viewing the most recent available information."}</div>}

      <section className="dashboard-grid" style={/** @type {React.CSSProperties} */ ({ "--profile-width": profileWidth + "px" })}>
        <aside id="company-profile" className="min-w-0 scroll-mt-28">{selectedSymbol
          ? <CompanyPanel symbol={selectedSymbol} marketCode={marketCode} requestedTimeframe={requestedTimeframe} onResetWidth={resetWidth} previousCompany={previousCompany} nextCompany={nextCompany} onSelectCompany={selectCompany} />
          : selectedIndexCode
            ? <MarketIndexPanel indexCode={selectedIndexCode} marketCode={marketCode} onResetWidth={resetWidth} />
          : sector
            ? <SectorPanel sector={sector} marketCode={marketCode} onResetWidth={resetWidth} />
            : <CompanyPanel symbol="" marketCode={marketCode} onResetWidth={resetWidth} onSelectCompany={selectCompany} />}</aside>
        <button type="button" className="dashboard-resizer" aria-label={isArabic ? "اسحب لتغيير عرض لوحة الشركة" : "Drag to resize company panel"} onPointerDown={beginResize} onPointerMove={resize} onPointerUp={finishResize} onDoubleClick={resetWidth}><GripVertical size={18} /></button>

        <div className="min-w-0 space-y-4">
          <section className="content-card p-4">
            <div className="grid gap-4">
              <InstrumentSearchInput value={query} onChange={setQuery} onSelect={selectInstrument} marketCode={marketCode} isArabic={isArabic} label={isArabic ? "ابحث بالرمز أو اسم الشركة أو القطاع…" : "Search symbol, company, or sector…"} />
              <div className="sector-groups">
                <button className={"filter-chip sector-all-chip " + (!sector ? "filter-chip-active" : "")} onClick={() => selectSector("")}>{isArabic ? "جميع القطاعات" : "All sectors"}</button>
                {sectorGroups.map((group) => <div key={group.ar} className="sector-group"><b>{isArabic ? group.ar : group.en}</b><div>{group.items.map((item) => <button key={item.ar} className={`filter-chip sector-heat-${item.summary?.movement_status || "neutral"} ${sector === item.ar ? "filter-chip-active" : ""}`} onClick={() => selectSector(item.ar)} aria-label={`${isArabic ? item.ar : item.en}، ${item.count} ${isArabic ? "شركة" : "companies"}${Number.isFinite(Number(item.summary?.change_percent)) ? `، ${Number(item.summary.change_percent) > 0 ? "+" : ""}${Number(item.summary.change_percent).toFixed(2)}%` : ""}`}>{isArabic ? item.ar : item.en}<span>{item.count}</span>{Number.isFinite(Number(item.summary?.change_percent)) && <em dir="ltr">{Number(item.summary.change_percent) > 0 ? "+" : ""}{Number(item.summary.change_percent).toFixed(2)}%</em>}</button>)}</div></div>)}
              </div>
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
            {activeTab === "companies" && <MarketTable rows={orderedCompanies} marketCode={marketCode} selectedSymbol={selectedSymbol} onSelect={selectCompany} />}
            {activeTab === "movers" && <div className="space-y-6">
              <section><h2 className="list-title market-up">{isArabic ? "الأكثر ارتفاعًا" : "Top gainers"}</h2><MarketTable rows={gainers.slice(0, 20)} marketCode={marketCode} selectedSymbol={selectedSymbol} onSelect={selectCompany} /></section>
              <section><h2 className="list-title market-down">{isArabic ? "الأكثر انخفاضًا" : "Top losers"}</h2><MarketTable rows={losers.slice(0, 20)} marketCode={marketCode} selectedSymbol={selectedSymbol} onSelect={selectCompany} /></section>
              <section><h2 className="list-title">{isArabic ? "الثابتة" : "Unchanged"}</h2><MarketTable rows={unchanged.slice(0, 20)} marketCode={marketCode} selectedSymbol={selectedSymbol} onSelect={selectCompany} /></section>
            </div>}
            {activeTab === "momentum" && <MarketTable rows={filtered.filter((row) => row.indicator)} marketCode={marketCode} selectedSymbol={selectedSymbol} onSelect={selectCompany} />}
            {activeTab === "quality" && <section className="content-card"><h2 className="font-black">{isArabic ? "جودة البيانات" : "Data quality"}</h2><p className="mt-2 text-sm leading-7 text-slate-500">{isArabic ? "تراقب المنصة اكتمال الأسعار وحداثتها وتوضح وقت آخر دورة ونسبة التغطية." : "The platform monitors price completeness and freshness, with the latest cycle time and coverage."}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="metric-card"><span>{isArabic ? "حالة الفحص" : "Validation"}</span><b>{state.snapshot?.freshness_status === "healthy" ? (isArabic ? "سليم" : "Healthy") : state.snapshot?.freshness_status === "degraded" ? (isArabic ? "تغطية جزئية" : "Degraded") : (isArabic ? "بانتظار الدورة التالية" : "Awaiting next cycle")}</b></div><div className="metric-card"><span>{isArabic ? "نسبة التغطية" : "Coverage"}</span><b>{Number(state.snapshot?.coverage_percent || 0).toFixed(1)}%</b></div></div></section>}
          </>}
        </div>
      </section>
    </div>
  </div>;
}
