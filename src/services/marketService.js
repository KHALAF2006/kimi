import { base44 } from "@/api/base44Client";

const configuredReferenceApi = String(import.meta.env.VITE_KMY_REFERENCE_API || "").replace(/\/$/, "");
const localBrowserHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const isLocalBrowser = typeof window !== "undefined" && localBrowserHosts.has(window.location.hostname);
const referenceApi = isLocalBrowser ? (configuredReferenceApi || "/reference-api") : "";

function quoteFromReference(company) {
  return {
    instrument_id: company.id,
    symbol: company.symbol,
    last_price: company.lastPrice,
    previous_close: company.previousClose,
    change_value: company.changeValue,
    change_percent: company.changePercent,
    open: company.openPrice,
    high: company.high,
    low: company.low,
    volume: company.volume,
    trade_count: company.tradeCount,
    week52_high: company.week52High,
    week52_low: company.week52Low,
    traded_value: company.tradedValue,
    market_cap: company.marketCap,
    quote_time: company.quoteTime,
    quality_status: "verified",
    source: { code: company.quoteSource?.includes("saudi") ? "SAUDI_EXCHANGE_REFERENCE" : "YAHOO_FINANCE_SA_DELAYED", name: company.quoteSource, source_type: company.quoteSource?.includes("saudi") ? "official" : "reference" },
    data_state: { label: "مرجعية متأخرة", stale: Date.now() - new Date(company.quoteTime).getTime() > 36 * 60 * 60 * 1000 },
  };
}

function instrumentFromReference(company) {
  return {
    id: company.id,
    symbol: company.symbol,
    name_ar: company.nameAr,
    name_en: company.nameEn,
    sector_ar: company.sectorAr,
    sector_en: company.sectorEn,
    market: company.market,
    currency: company.currency,
    official_url: company.tadawulUrl,
    warning_flag: company.warningFlag || null,
    quote: quoteFromReference(company),
  };
}

async function referenceFetch(path) {
  const response = await fetch(referenceApi + path);
  if (!response.ok) throw new Error("reference_api_" + response.status);
  return response.json();
}

async function referenceMarketRead(payload) {
  if (payload.action === "chart") {
    const referenceRanges = { "5d": "1w", "1mo": "1M", "3mo": "3M", "1y": "1y", "5y": "5y" };
    const referenceRange = referenceRanges[payload.range] || "3M";
    const path = "/api/companies/" + encodeURIComponent(payload.symbol) + "/chart?interval=" + encodeURIComponent(payload.interval || "1d") + "&range=" + encodeURIComponent(referenceRange);
    const data = await referenceFetch(path);
    return { candles: data.candles || [], source: data.source, as_of: data.asOf, data_state: { label: "مرجعية متأخرة", stale: false } };
  }
  const symbol = payload.symbol || (/^\d{4}$/.test(String(payload.instrument_id || "")) ? payload.instrument_id : "");
  if (symbol) {
    const company = await referenceFetch("/api/companies/" + encodeURIComponent(symbol));
    let momentum = null;
    try { momentum = await referenceFetch("/api/momentum/" + encodeURIComponent(symbol)); } catch { momentum = null; }
    const instrument = instrumentFromReference(company);
    return {
      instrument,
      quote: instrument.quote,
      indicators: momentum ? [momentum] : [],
      financials: company.financials || [],
      actions: company.corporateActions || [],
      shareholders: company.shareholders || [],
      loss_classification: company.warningFlag ? { level: company.warningFlag } : null,
      notice: "بيانات حقيقية مرجعية متأخرة — المصدر والوقت موضحان",
    };
  }
  const companies = await referenceFetch("/api/companies?limit=500");
  let rows = companies.map(instrumentFromReference);
  const query = String(payload.query || "").trim().toLowerCase();
  const sector = String(payload.sector || "").trim();
  if (query) rows = rows.filter((row) => (row.symbol + " " + row.name_ar + " " + row.name_en + " " + row.sector_ar + " " + row.sector_en).toLowerCase().includes(query));
  if (sector) rows = rows.filter((row) => row.sector_ar === sector || row.sector_en === sector);
  if (payload.mode === "movers") rows.sort((a, b) => Number(b.quote?.change_percent || 0) - Number(a.quote?.change_percent || 0));
  return {
    instruments: rows.slice(0, Math.min(Number(payload.limit || 500), 500)),
    total: companies.length,
    sources: [],
    notice: "بيانات حقيقية مرجعية متأخرة — المصدر والوقت موضحان",
  };
}

export async function invokeAppFunction(functionName, payload = {}) {
  if (referenceApi && functionName === "marketRead") return referenceMarketRead(payload);
  const response = await base44.functions.invoke(functionName, { ...payload, session_id: localStorage.getItem("kmy_session_id") });
  return response.data;
}

export function isReferencePreview() {
  return Boolean(referenceApi);
}
