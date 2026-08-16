import { base44 } from "@/api/base44Client";

const configuredReferenceApi = String(import.meta.env.VITE_SMART_INVESTOR_REFERENCE_API || "").replace(/\/$/, "");
const localBrowserHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const isLocalBrowser = typeof window !== "undefined" && localBrowserHosts.has(window.location.hostname);
const referenceApi = isLocalBrowser ? (configuredReferenceApi || "/reference-api") : "";
const chartRequestCache = new Map();
const chartRequestInflight = new Map();
const marketSupplementCache = new Map();
const marketSupplementInflight = new Map();
const marketReadQueue = [];
let marketReadActive = false;
const CHART_CACHE_MAX_AGE_MS = 60_000;
const CHART_CACHE_MAX_ENTRIES = 80;
const MARKET_SUPPLEMENT_MAX_AGE_MS = 15 * 60_000;

function stableRequestKey(payload) {
  const sessionId = localStorage.getItem("smart_investor_session_id") || "anonymous";
  const values = Object.entries(payload || {}).sort(([left], [right]) => left.localeCompare(right));
  return `${sessionId}:${JSON.stringify(Object.fromEntries(values))}`;
}

function quoteFromReference(company) {
  const asOf = company.quoteTime || null;
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
    quote_time: asOf,
    provider_as_of: asOf,
    received_time: asOf,
    delay_seconds: 900,
    quality_status: "unverified",
    freshness_status: "stale",
    license_status: "restricted",
    is_final: false,
    snapshot_version: null,
    data_state: { label: "آخر بيانات متاحة", stale: true, code: "stale" },
    data_meta: {
      provider_as_of: asOf,
      received_time: asOf,
      delay_seconds: 900,
      freshness_status: "stale",
      quality_status: "unverified",
      license_status: "restricted",
      is_final: false,
    },
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

function buildReferenceSectorCandles(seriesLists) {
  const series = seriesLists.map((bars) => {
    const ordered = [...(bars || [])].filter((bar) => Number(bar.close) > 0).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    return { bars: ordered, base: Number(ordered[0]?.close), byTime: new Map(ordered.map((bar) => [new Date(bar.time).toISOString(), bar])) };
  }).filter((item) => Number.isFinite(item.base) && item.base > 0 && item.bars.length);
  const times = [...new Set(series.flatMap((item) => item.bars.map((bar) => new Date(bar.time).toISOString())))].sort();
  return times.map((time) => {
    const members = series.map((item) => ({ item, bar: item.byTime.get(time) })).filter((value) => value.bar);
    if (!members.length) return null;
    const average = (field) => members.reduce((sum, value) => sum + Number(value.bar[field]) / value.item.base * 1000, 0) / members.length;
    const open = average("open");
    const close = average("close");
    return {
      time,
      open,
      high: Math.max(average("high"), open, close),
      low: Math.min(average("low"), open, close),
      close,
      volume: members.reduce((sum, value) => sum + Number(value.bar.volume || 0), 0),
    };
  }).filter(Boolean);
}

async function referenceMarketRead(payload) {
  if (payload.action === "markets") {
    return {
      markets: [
        { market_code: "SA_MAIN", country_code: "SA", name_ar: "السوق السعودية الرئيسية", name_en: "Saudi Main Market", currency: "SAR", timezone: "Asia/Riyadh", quote_mode: "delayed", delay_seconds: 900, license_status: "pending", active: true },
        { market_code: "AE_ADX", country_code: "AE", name_ar: "سوق أبوظبي", name_en: "Abu Dhabi Securities Exchange", currency: "AED", timezone: "Asia/Dubai", quote_mode: "disabled", delay_seconds: 0, license_status: "pending", active: false },
        { market_code: "AE_DFM", country_code: "AE", name_ar: "سوق دبي", name_en: "Dubai Financial Market", currency: "AED", timezone: "Asia/Dubai", quote_mode: "disabled", delay_seconds: 0, license_status: "pending", active: false },
        { market_code: "KW_BK", country_code: "KW", name_ar: "بورصة الكويت", name_en: "Boursa Kuwait", currency: "KWD", timezone: "Asia/Kuwait", quote_mode: "disabled", delay_seconds: 0, license_status: "pending", active: false },
        { market_code: "QA_QE", country_code: "QA", name_ar: "بورصة قطر", name_en: "Qatar Stock Exchange", currency: "QAR", timezone: "Asia/Qatar", quote_mode: "disabled", delay_seconds: 0, license_status: "pending", active: false },
        { market_code: "BH_BHB", country_code: "BH", name_ar: "بورصة البحرين", name_en: "Bahrain Bourse", currency: "BHD", timezone: "Asia/Bahrain", quote_mode: "disabled", delay_seconds: 0, license_status: "pending", active: false },
        { market_code: "OM_MSX", country_code: "OM", name_ar: "بورصة مسقط", name_en: "Muscat Stock Exchange", currency: "OMR", timezone: "Asia/Muscat", quote_mode: "disabled", delay_seconds: 0, license_status: "pending", active: false },
      ],
    };
  }
  if (payload.action === "instrument_search") {
    const companies = await referenceFetch("/api/companies?limit=500");
    const equities = companies.map((company) => ({ ...instrumentFromReference(company), instrument_code: company.symbol, instrument_type: "equity" }));
    const sectors = [...new Map(companies.map((company) => [company.sectorAr, company])).values()].map((company) => ({
      id: `sector:SA_MAIN:${company.sectorEn}`,
      symbol: `SECTOR:${String(company.sectorEn || company.sectorAr).toUpperCase().replace(/[^A-Z0-9\u0600-\u06ff]+/g, "_").replace(/^_+|_+$/g, "")}`,
      instrument_code: `SECTOR:${String(company.sectorEn || company.sectorAr).toUpperCase().replace(/[^A-Z0-9\u0600-\u06ff]+/g, "_").replace(/^_+|_+$/g, "")}`,
      instrument_type: "sector_index",
      market_code: "SA_MAIN",
      name_ar: `مؤشر قطاع ${company.sectorAr}`,
      name_en: `${company.sectorEn} Sector Index`,
      sector_ar: company.sectorAr,
      sector_en: company.sectorEn,
    }));
    const tasi = { id: "market-index:SA_MAIN:TASI", symbol: "TASI", instrument_code: "TASI", instrument_type: "market_index", market_code: "SA_MAIN", name_ar: "مؤشر السوق الرئيسية (تاسي)", name_en: "Tadawul All Share Index (TASI)", sector_ar: "مؤشرات السوق", sector_en: "Market Indices" };
    const query = String(payload.query || "").trim().toLocaleLowerCase("ar");
    const rows = [...equities, ...sectors, tasi]
      .filter((row) => `${row.symbol} ${row.name_ar} ${row.name_en} ${row.sector_ar} ${row.sector_en}`.toLocaleLowerCase("ar").includes(query))
      .sort((left, right) => Number(String(left.symbol).toLocaleLowerCase("ar") !== query) - Number(String(right.symbol).toLocaleLowerCase("ar") !== query) || String(left.symbol).localeCompare(String(right.symbol), "en"));
    return { instruments: rows.slice(0, Math.min(Number(payload.limit || 12), 25)) };
  }
  if (payload.action === "sector" || payload.action === "sector_chart") {
    const companies = await referenceFetch("/api/companies?limit=500");
    const members = companies.filter((company) => company.sectorAr === payload.sector || company.sectorEn === payload.sector);
    if (!members.length) throw new Error("sector_not_found");
    if (payload.action === "sector") {
      const constituents = members.map(instrumentFromReference);
      const changePercent = constituents.reduce((sum, item) => sum + Number(item.quote?.change_percent || 0), 0) / constituents.length;
      return {
        sector: { key: `SA_MAIN:${payload.sector}`, market_code: "SA_MAIN", name_ar: members[0].sectorAr, name_en: members[0].sectorEn, constituent_count: members.length, methodology: "equal_weighted" },
        quote: { last_price: 1000 * (1 + changePercent / 100), previous_close: 1000, change_value: 10 * changePercent, change_percent: changePercent, provider_as_of: constituents.map((item) => item.quote?.provider_as_of).filter(Boolean).sort().at(-1) || null, delay_seconds: 900 },
        constituents,
      };
    }
    const referenceRanges = { "5d": "1w", "1mo": "1M", "3mo": "3M", "1y": "1y", "5y": "5y", "max": "max" };
    const range = referenceRanges[payload.range] || "3M";
    const results = await Promise.allSettled(members.map((company) => referenceFetch(`/api/companies/${encodeURIComponent(company.symbol)}/chart?interval=${encodeURIComponent(payload.interval || "1d")}&range=${encodeURIComponent(range)}`)));
    const candles = buildReferenceSectorCandles(results.filter((result) => result.status === "fulfilled").map((result) => result.value.candles || []));
    return { sector: payload.sector, candles, as_of: candles.at(-1)?.time || null, methodology: "equal_weighted" };
  }
  if (payload.action === "chart") {
    const referenceRanges = { "5d": "1w", "1mo": "1M", "3mo": "3M", "1y": "1y", "5y": "5y", "max": "max" };
    const referenceRange = referenceRanges[payload.range] || "3M";
    const path = "/api/companies/" + encodeURIComponent(payload.symbol) + "/chart?interval=" + encodeURIComponent(payload.interval || "1d") + "&range=" + encodeURIComponent(referenceRange);
    const data = await referenceFetch(path);
    return {
      candles: data.candles || [],
      as_of: data.asOf,
      data_state: { label: "آخر بيانات متاحة", stale: true, code: "stale" },
      data_meta: {
        provider_as_of: data.asOf || null,
        received_time: data.asOf || null,
        delay_seconds: 900,
        freshness_status: "stale",
        quality_status: "unverified",
        license_status: "restricted",
        is_final: false,
        history_status: data.historyStatus || data.data_meta?.history_status || "available",
        history_complete: data.historyComplete ?? data.data_meta?.history_complete ?? null,
      },
    };
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
      momentum_indicator: momentum,
      financials: company.financials || [],
      actions: company.corporateActions || [],
      shareholders: company.shareholders || [],
      loss_classification: company.warningFlag ? { level: company.warningFlag } : null,
      notice: "بيانات السوق متأخرة 15 دقيقة",
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
    snapshot: {
      market_code: payload.market_code || "SA_MAIN",
      session_phase: "closed",
      as_of: rows.map((row) => row.quote?.provider_as_of).filter(Boolean).sort().at(-1) || null,
      received_at: rows.map((row) => row.quote?.received_time).filter(Boolean).sort().at(-1) || null,
      delay_seconds: 900,
      snapshot_version: null,
      coverage_percent: 0,
      freshness_status: "stale",
      is_final: false,
    },
    notice: "بيانات السوق متأخرة 15 دقيقة",
  };
}

function invokeWithTimeout(factory, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(Object.assign(new Error("market_read_timeout"), { code: "MARKET_READ_TIMEOUT" })), timeoutMs);
    Promise.resolve().then(factory).then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

function runNextMarketRead() {
  if (marketReadActive || !marketReadQueue.length) return;
  marketReadActive = true;
  const task = marketReadQueue.shift();
  Promise.resolve()
    .then(task.factory)
    .then(task.resolve, task.reject)
    .finally(() => {
      marketReadActive = false;
      runNextMarketRead();
    });
}

function enqueueMarketRead(factory, { navigation = false } = {}) {
  return new Promise((resolve, reject) => {
    if (navigation) {
      for (let index = marketReadQueue.length - 1; index >= 0; index -= 1) {
        if (!marketReadQueue[index].navigation) continue;
        const [superseded] = marketReadQueue.splice(index, 1);
        superseded.reject(Object.assign(new Error("market_read_superseded"), { code: "MARKET_READ_SUPERSEDED" }));
      }
    }
    const task = { factory, navigation, resolve, reject };
    if (navigation) marketReadQueue.unshift(task);
    else marketReadQueue.push(task);
    runNextMarketRead();
  });
}

export async function invokeAppFunction(functionName, payload = {}) {
  if (referenceApi && functionName === "marketRead") return referenceMarketRead(payload);
  try {
    const directInvoke = () => base44.functions.invoke(functionName, {
      ...payload,
      session_id: localStorage.getItem("smart_investor_session_id"),
      device_id: localStorage.getItem("smart_investor_device_id"),
    });
    const navigationRead = functionName === "marketRead" && ["chart", "sector_chart"].includes(String(payload.action || ""));
    const invoke = () => functionName === "marketRead"
      ? enqueueMarketRead(() => invokeWithTimeout(directInvoke, 30_000), { navigation: navigationRead })
      : invokeWithTimeout(directInvoke, 30_000);
    const maxAttempts = functionName === "marketRead" ? 2 : 1;
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await invoke();
        return response.data;
      } catch (error) {
        lastError = error;
        const status = Number(error?.response?.status || error?.response?.data?.status || 0);
        const code = String(error?.response?.data?.code || error?.code || "");
        const transient = status === 429 || status >= 500 || code === "MARKET_READ_TIMEOUT";
        if (!transient || attempt >= maxAttempts) throw error;
        await new Promise((resolve) => window.setTimeout(resolve, 1000 * attempt));
      }
    }
    throw lastError || new Error("market_read_failed");
  } catch (error) {
    const message = error?.response?.data?.error || error?.message;
    if (message === "Active device session required") {
      localStorage.removeItem("smart_investor_session_id");
      localStorage.removeItem("smart_investor_session_expires_at");
      window.dispatchEvent(new Event("smart_investor-auth-changed"));
      if (window.location.pathname !== "/login") window.location.assign("/login");
    }
    throw error;
  }
}

export function isReferencePreview() {
  return Boolean(referenceApi);
}

export async function readMarketChart(payload, { maxAgeMs = CHART_CACHE_MAX_AGE_MS } = {}) {
  const key = stableRequestKey(payload);
  const cached = chartRequestCache.get(key);
  if (cached && Date.now() - cached.receivedAt <= maxAgeMs) return cached.data;
  if (chartRequestInflight.has(key)) return chartRequestInflight.get(key);

  const request = invokeAppFunction("marketRead", payload)
    .then((data) => {
      if (chartRequestCache.size >= CHART_CACHE_MAX_ENTRIES) {
        const oldestKey = chartRequestCache.keys().next().value;
        if (oldestKey) chartRequestCache.delete(oldestKey);
      }
      chartRequestCache.set(key, { data, receivedAt: Date.now() });
      return data;
    })
    .finally(() => chartRequestInflight.delete(key));
  chartRequestInflight.set(key, request);
  return request;
}

export async function readMarketSupplement(payload, { maxAgeMs = MARKET_SUPPLEMENT_MAX_AGE_MS } = {}) {
  const key = stableRequestKey(payload);
  const cached = marketSupplementCache.get(key);
  if (cached && Date.now() - cached.receivedAt <= maxAgeMs) return cached.data;
  if (marketSupplementInflight.has(key)) return marketSupplementInflight.get(key);
  const request = invokeAppFunction("marketRead", payload)
    .then((data) => {
      if (marketSupplementCache.size >= 8) marketSupplementCache.delete(marketSupplementCache.keys().next().value);
      marketSupplementCache.set(key, { data, receivedAt: Date.now() });
      return data;
    })
    .finally(() => marketSupplementInflight.delete(key));
  marketSupplementInflight.set(key, request);
  return request;
}
