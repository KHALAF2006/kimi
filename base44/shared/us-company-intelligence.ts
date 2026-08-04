import { US_OPTIONS_MARKET_CODE } from "./us-options-catalog.ts";

const FINANCIAL_FORMS = new Set(["10-K", "10-K/A", "10-Q", "10-Q/A", "20-F", "20-F/A", "40-F", "40-F/A", "6-K", "6-K/A"]);
const FILING_FORMS = new Set([...FINANCIAL_FORMS, "8-K", "8-K/A", "DEF 14A", "SC 13D", "SC 13D/A", "SC 13G", "SC 13G/A"]);

const TAGS = {
  revenue: ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet", "Revenue", "InterestAndDividendIncomeOperating"],
  net_income: ["NetIncomeLoss", "ProfitLoss"],
  operating_income: ["OperatingIncomeLoss", "OperatingProfitLoss"],
  total_assets: ["Assets"],
  total_liabilities: ["Liabilities"],
  shareholders_equity: ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest", "Equity"],
  eps: ["EarningsPerShareDiluted", "EarningsPerShareBasic", "DilutedEarningsLossPerShare", "BasicEarningsLossPerShare"],
};

function clean(value) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function number(value) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(String(value).replace(/[$,%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function isoDateTime(value, fallback) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function cik10(value) {
  return String(value || "").replace(/\D/g, "").padStart(10, "0");
}

export function normalizeSecTickerMap(payload) {
  const records = Array.isArray(payload) ? payload : Object.values(payload || {});
  return new Map(records
    .filter((row) => row?.ticker && row?.cik_str)
    .map((row) => [String(row.ticker).toUpperCase().replace("-", "."), { cik: cik10(row.cik_str), title: clean(row.title) }]));
}

function recentColumns(submissions) {
  const recent = submissions?.filings?.recent || {};
  const length = Math.max(...Object.values(recent).filter(Array.isArray).map((value) => value.length), 0);
  return Array.from({ length }, (_, index) => Object.fromEntries(Object.entries(recent).map(([key, values]) => [key, Array.isArray(values) ? values[index] : undefined])));
}

function filingUrl(cik, accessionNumber, primaryDocument = "") {
  const accession = String(accessionNumber || "").replace(/-/g, "");
  const document = String(primaryDocument || "").replace(/^\/+/, "");
  if (!cik || !accession) return `https://www.sec.gov/edgar/browse/?CIK=${encodeURIComponent(String(cik || ""))}`;
  return document
    ? `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession}/${encodeURIComponent(document)}`
    : `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession}/`;
}

export function normalizeSecProfile(submissions, instrument, nowIso) {
  const cik = cik10(submissions?.cik || "");
  const website = /^https?:\/\//i.test(String(submissions?.website || "")) ? String(submissions.website) : undefined;
  return {
    cik,
    legal_name_en: clean(submissions?.name) || instrument.name_en,
    sic_code: clean(submissions?.sic),
    sic_description: clean(submissions?.sicDescription),
    fiscal_year_end: clean(submissions?.fiscalYearEnd),
    state_of_incorporation: clean(submissions?.stateOfIncorporation),
    phone: clean(submissions?.phone),
    ...(website ? { website_url: website } : {}),
    sec_filing_url: `https://www.sec.gov/edgar/browse/?CIK=${encodeURIComponent(cik)}`,
    profile_source_url: `https://data.sec.gov/submissions/CIK${cik}.json`,
    profile_as_of: nowIso.slice(0, 10),
  };
}

export function normalizeSecFilings(submissions, instrument, sourceId, nowIso) {
  const cik = cik10(submissions?.cik || "");
  return recentColumns(submissions)
    .filter((row) => FILING_FORMS.has(String(row.form || "")) && row.accessionNumber && row.filingDate)
    .slice(0, 30)
    .map((row) => ({
      instrument_id: instrument.id,
      market_code: US_OPTIONS_MARKET_CODE,
      symbol: instrument.symbol,
      announcement_id: String(row.accessionNumber),
      title_ar: `إيداع ${clean(row.form)} لدى هيئة الأوراق المالية الأمريكية`,
      title_en: `${clean(row.form)} filing with the U.S. SEC`,
      summary_ar: clean(row.primaryDocument ? `المستند: ${row.primaryDocument}` : ""),
      summary_en: clean(row.primaryDocument ? `Document: ${row.primaryDocument}` : ""),
      category: clean(row.form),
      published_at: isoDateTime(row.acceptanceDateTime || `${row.filingDate}T00:00:00Z`, nowIso),
      source_id: sourceId,
      source_url: filingUrl(cik, row.accessionNumber, row.primaryDocument),
      checksum: String(row.accessionNumber),
      as_of: nowIso,
    }));
}

function factEntries(companyFacts, candidates) {
  for (const namespace of ["us-gaap", "ifrs-full"]) {
    for (const tag of candidates) {
      const fact = companyFacts?.facts?.[namespace]?.[tag];
      if (!fact?.units) continue;
      const rows = Object.entries(fact.units).flatMap(([unit, values]) => (Array.isArray(values) ? values : []).map((value) => ({ ...value, unit, tag })));
      if (rows.length) return rows;
    }
  }
  return [];
}

function latestFact(entries, period) {
  return entries
    .filter((row) => row.end === period.end && FINANCIAL_FORMS.has(String(row.form || "")) && Number.isFinite(Number(row.val)))
    .sort((a, b) => {
      const startMatch = Number(String(b.start || "") === String(period.start || "")) - Number(String(a.start || "") === String(period.start || ""));
      return startMatch || Number(Boolean(b.frame)) - Number(Boolean(a.frame)) || String(b.filed || "").localeCompare(String(a.filed || ""));
    })[0];
}

export function normalizeSecFinancials(companyFacts, submissions, instrument, sourceId, nowIso) {
  const metrics = Object.fromEntries(Object.entries(TAGS).map(([key, tags]) => [key, factEntries(companyFacts, tags)]));
  const seeds = [...metrics.revenue, ...metrics.net_income, ...metrics.total_assets]
    .filter((row) => row.end && row.filed && FINANCIAL_FORMS.has(String(row.form || "")) && Number.isFinite(Number(row.val)))
    .sort((a, b) => String(b.end).localeCompare(String(a.end))
      || String(b.filed).localeCompare(String(a.filed))
      || Number(Boolean(b.frame)) - Number(Boolean(a.frame)));
  const periods = [...new Map(seeds.map((row) => [`${row.end}|${row.fp || row.form}`, row])).values()].slice(0, 8);
  const filingByAccession = new Map(recentColumns(submissions).map((row) => [String(row.accessionNumber || ""), row]));
  const cik = cik10(submissions?.cik || companyFacts?.cik || "");
  return periods.map((period) => {
    const selected = Object.fromEntries(Object.entries(metrics).map(([key, entries]) => [key, latestFact(entries, period)]));
    const anchor = selected.revenue || selected.net_income || selected.total_assets || period;
    const filing = filingByAccession.get(String(anchor.accn || ""));
    const currencyUnit = String(selected.revenue?.unit || selected.net_income?.unit || selected.total_assets?.unit || "USD");
    return {
      instrument_id: instrument.id,
      market_code: US_OPTIONS_MARKET_CODE,
      symbol: instrument.symbol,
      period: `${anchor.fy || String(anchor.end).slice(0, 4)} ${anchor.fp || anchor.form}`,
      period_end: String(anchor.end),
      statement_type: String(anchor.form || "SEC filing"),
      currency: currencyUnit.includes("USD") ? "USD" : currencyUnit.split("/")[0],
      ...Object.fromEntries(Object.entries(selected).filter(([, row]) => row && Number.isFinite(Number(row.val))).map(([key, row]) => [key, Number(row.val)])),
      source_id: sourceId,
      source_url: filingUrl(cik, anchor.accn, filing?.primaryDocument),
      checksum: `${instrument.symbol}:${anchor.accn || anchor.end}:${anchor.fp || anchor.form}`,
      as_of: isoDateTime(`${anchor.filed}T00:00:00Z`, nowIso),
    };
  });
}

export function normalizeYahooActions(payload, instrument, sourceId, nowIso) {
  const result = payload?.chart?.result?.[0] || {};
  const sourceUrl = `https://finance.yahoo.com/quote/${encodeURIComponent(instrument.symbol)}/history/`;
  const dividends = Object.values(result?.events?.dividends || {}).map((row) => {
    const date = isoDate(Number(row.date) * 1000);
    return {
      instrument_id: instrument.id, market_code: US_OPTIONS_MARKET_CODE, symbol: instrument.symbol,
      event_type: "dividend", ex_date: date, amount: number(row.amount), currency: "USD", status: "completed",
      description_ar: `توزيع نقدي ${number(row.amount) ?? ""} دولار للسهم`,
      description_en: `Cash dividend ${number(row.amount) ?? ""} USD per share`,
      source_id: sourceId, source_url: sourceUrl, as_of: nowIso,
    };
  });
  const splits = Object.values(result?.events?.splits || {}).map((row) => {
    const date = isoDate(Number(row.date) * 1000);
    const numerator = number(row.numerator);
    const denominator = number(row.denominator);
    const ratio = numerator && denominator ? numerator / denominator : number(String(row.splitRatio || "").split(":")[0]);
    return {
      instrument_id: instrument.id, market_code: US_OPTIONS_MARKET_CODE, symbol: instrument.symbol,
      event_type: "split", ex_date: date, ratio, status: "completed",
      description_ar: `تجزئة أسهم بنسبة ${clean(row.splitRatio) || ratio || "—"}`,
      description_en: `Stock split ${clean(row.splitRatio) || ratio || "—"}`,
      source_id: sourceId, source_url: sourceUrl, as_of: nowIso,
    };
  });
  return [...dividends, ...splits].filter((row) => row.ex_date);
}

export function normalizeNasdaqHolders(payload, instrument, sourceId, nowIso) {
  const data = payload?.data || {};
  const outstandingMillions = number(data?.ownershipSummary?.ShareoutstandingTotal?.value);
  const totalShares = outstandingMillions ? outstandingMillions * 1e6 : undefined;
  const holders = data?.holdingsTransactions?.table?.rows;
  if (!Array.isArray(holders) || !totalShares) return [];
  return holders.slice(0, 10).map((row) => {
    const shares = number(row.sharesHeld);
    const sharesChange = number(row.sharesChange);
    const current = shares === undefined ? undefined : shares / totalShares * 100;
    const previous = shares === undefined || sharesChange === undefined ? undefined : (shares - sharesChange) / totalShares * 100;
    const path = String(row.url || "");
    return {
      instrument_id: instrument.id, market_code: US_OPTIONS_MARKET_CODE, symbol: instrument.symbol,
      shareholder_name_ar: clean(row.ownerName), shareholder_name_en: clean(row.ownerName),
      shareholder_key: clean(row.ownerName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      ownership_percent: current,
      previous_ownership_percent: previous,
      change_percent: current !== undefined && previous !== undefined ? current - previous : undefined,
      source_id: sourceId,
      source_url: path.startsWith("/") ? `https://www.nasdaq.com${path}` : `https://www.nasdaq.com/market-activity/stocks/${instrument.symbol.toLowerCase()}/institutional-holdings`,
      as_of: nowIso,
    };
  }).filter((row) => row.shareholder_key && Number.isFinite(row.ownership_percent));
}
