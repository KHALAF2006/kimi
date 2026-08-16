// GENERATED from base44/functions/marketRead/entry.ts — do not edit directly.

// base44/functions/marketRead/entry.ts
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { authorizationContext, marketAccessForContext, readJsonBody, replyError, requireMarketEntitlement } from "../../shared/security.ts";
import { US_OPTIONS_CATALOG, US_OPTIONS_MARKET_CODE, US_OPTIONS_SYMBOLS } from "../../shared/us-options-catalog.ts";
import { US_BENCHMARKS_CATALOG, US_BENCHMARKS_MARKET_CODE, US_BENCHMARKS_SYMBOLS } from "../../shared/us-benchmarks-catalog.ts";
import {
  COVERAGE_FAILED_PERCENT,
  COVERAGE_HEALTHY_PERCENT,
  EXPECTED_INSTRUMENT_COUNT,
  SAUDI_DELAY_SECONDS,
  marketPhase,
  mergeStoredCandleSeries,
  riyadhClock
} from "../../shared/market-data.ts";
import { calculateMomentumZones, MOMENTUM_FORMULA_VERSION } from "../../shared/momentum.ts";
const US_OPTIONS_COMPANY_BY_SYMBOL = new Map(US_OPTIONS_CATALOG.companies.map((company) => [company.symbol, company]));
function localizedInstrument(instrument) {
  if (instrument?.market_code !== US_OPTIONS_MARKET_CODE) return instrument;
  const catalogCompany = US_OPTIONS_COMPANY_BY_SYMBOL.get(String(instrument.symbol || "").toUpperCase());
  if (!catalogCompany) return instrument;
  return {
    ...instrument,
    name_ar: catalogCompany.nameAr,
    name_en: catalogCompany.nameEn,
    sector_ar: catalogCompany.sectorAr,
    sector_en: catalogCompany.sectorEn,
  };
}
var official_main_market_catalog_2026_07_21_default = {
  source: "Saudi Exchange",
  sourceUrl: "https://www.saudiexchange.sa/Resources/Reports-v2/DetailedDaily_en.html",
  classificationUrl: "https://www.saudiexchange.sa/wps/portal/saudiexchange/ourmarkets/main-market-watch/issuers-trading-information?locale=en",
  marketDate: "2026-07-21",
  quoteTime: "2026-07-21T12:20:00.000Z",
  listedCompanyCount: 270,
  accumulatedLossRules: {
    yellow: "20% to less than 35% of capital",
    orange: "35% to less than 50% of capital",
    red: "50% or more of capital"
  },
  companies: [
    {
      symbol: "2030",
      nameAr: "\u0627\u0644\u0645\u0635\u0627\u0641\u064A",
      nameEn: "Saudi Arabia Refineries Co.",
      sectorAr: "\u0627\u0644\u0637\u0627\u0642\u0629",
      sectorEn: "Energy",
      warningFlag: null,
      officialQuote: {
        openPrice: 49.22,
        highPrice: 51.15,
        lowPrice: 49.2,
        lastPrice: 49.42,
        changePercent: -0.52,
        volume: 316195,
        tradedValue: 1588134642e-2,
        tradeCount: 1741,
        marketCap: 7413e5
      }
    },
    {
      symbol: "2222",
      nameAr: "\u0623\u0631\u0627\u0645\u0643\u0648 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Saudi Arabian Oil Co.",
      sectorAr: "\u0627\u0644\u0637\u0627\u0642\u0629",
      sectorEn: "Energy",
      warningFlag: null,
      officialQuote: {
        openPrice: 26.7,
        highPrice: 26.76,
        lowPrice: 26.5,
        lastPrice: 26.7,
        changePercent: -0.37,
        volume: 4798049,
        tradedValue: 12795368826e-2,
        tradeCount: 9963,
        marketCap: 64614e8
      }
    },
    {
      symbol: "2380",
      nameAr: "\u0628\u062A\u0631\u0648 \u0631\u0627\u0628\u063A",
      nameEn: "Rabigh Refining and Petrochemical Co.",
      sectorAr: "\u0627\u0644\u0637\u0627\u0642\u0629",
      sectorEn: "Energy",
      warningFlag: null,
      officialQuote: {
        openPrice: 14.78,
        highPrice: 14.8,
        lowPrice: 13.92,
        lastPrice: 14.41,
        changePercent: -1.97,
        volume: 10754342,
        tradedValue: 15411769386e-2,
        tradeCount: 12535,
        marketCap: 2407911e4
      }
    },
    {
      symbol: "2381",
      nameAr: "\u0627\u0644\u062D\u0641\u0631 \u0627\u0644\u0639\u0631\u0628\u064A\u0629",
      nameEn: "Arabian Drilling Co.",
      sectorAr: "\u0627\u0644\u0637\u0627\u0642\u0629",
      sectorEn: "Energy",
      warningFlag: null,
      officialQuote: {
        openPrice: 88.35,
        highPrice: 89.25,
        lowPrice: 88.3,
        lastPrice: 88.8,
        changePercent: 0.51,
        volume: 41205,
        tradedValue: 3657005,
        tradeCount: 558,
        marketCap: 79032e5
      }
    },
    {
      symbol: "2382",
      nameAr: "\u0623\u062F\u064A\u0633",
      nameEn: "Ades Holding Co.",
      sectorAr: "\u0627\u0644\u0637\u0627\u0642\u0629",
      sectorEn: "Energy",
      warningFlag: null,
      officialQuote: {
        openPrice: 17.87,
        highPrice: 17.89,
        lowPrice: 17.71,
        lastPrice: 17.86,
        changePercent: -0.06,
        volume: 724616,
        tradedValue: 1289223735e-2,
        tradeCount: 2566,
        marketCap: 2016505648218e-2
      }
    },
    {
      symbol: "4030",
      nameAr: "\u0627\u0644\u0628\u062D\u0631\u064A",
      nameEn: "National Shipping Company of Saudi Arabia",
      sectorAr: "\u0627\u0644\u0637\u0627\u0642\u0629",
      sectorEn: "Energy",
      warningFlag: null,
      officialQuote: {
        openPrice: 32.88,
        highPrice: 33,
        lowPrice: 32.08,
        lastPrice: 32.5,
        changePercent: -1.75,
        volume: 1168023,
        tradedValue: 3801593776e-2,
        tradeCount: 5250,
        marketCap: 29992675765
      }
    },
    {
      symbol: "1201",
      nameAr: "\u062A\u0643\u0648\u064A\u0646",
      nameEn: "Takween Advanced Industries Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: "red",
      officialQuote: {
        openPrice: 4.51,
        highPrice: 4.53,
        lowPrice: 4.28,
        lastPrice: 4.29,
        changePercent: -4.88,
        volume: 591360,
        tradedValue: 25992109e-1,
        tradeCount: 1220,
        marketCap: 32803315974e-2
      }
    },
    {
      symbol: "1202",
      nameAr: "\u0645\u0628\u0643\u0648",
      nameEn: "Middle East Paper Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 16.2,
        highPrice: 16.27,
        lowPrice: 16,
        lastPrice: 16.06,
        changePercent: -1.23,
        volume: 343396,
        tradedValue: 553104182e-2,
        tradeCount: 947,
        marketCap: 13918666399e-1
      }
    },
    {
      symbol: "1210",
      nameAr: "\u0628\u064A \u0633\u064A \u0622\u064A",
      nameEn: "Basic Chemical Industries Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 23.06,
        highPrice: 23.29,
        lowPrice: 23,
        lastPrice: 23.07,
        changePercent: 0.04,
        volume: 8201,
        tradedValue: 188990.31,
        tradeCount: 234,
        marketCap: 634425e3
      }
    },
    {
      symbol: "1211",
      nameAr: "\u0645\u0639\u0627\u062F\u0646",
      nameEn: "Saudi Arabian Mining Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 56.9,
        highPrice: 57.3,
        lowPrice: 56.3,
        lastPrice: 56.8,
        changePercent: -0.35,
        volume: 829741,
        tradedValue: 469874251e-1,
        tradeCount: 3902,
        marketCap: 2208817621424e-1
      }
    },
    {
      symbol: "1301",
      nameAr: "\u0623\u0633\u0644\u0627\u0643",
      nameEn: "United Wire Factories Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 15.82,
        highPrice: 15.92,
        lowPrice: 15.5,
        lastPrice: 15.85,
        changePercent: -0.19,
        volume: 58212,
        tradedValue: 914437.19,
        tradeCount: 338,
        marketCap: 445068e3
      }
    },
    {
      symbol: "1304",
      nameAr: "\u0627\u0644\u064A\u0645\u0627\u0645\u0629 \u0644\u0644\u062D\u062F\u064A\u062F",
      nameEn: "Al Yamamah Steel Industries Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 39.72,
        highPrice: 39.98,
        lowPrice: 38.04,
        lastPrice: 38.2,
        changePercent: -4.5,
        volume: 430674,
        tradedValue: 166215704e-1,
        tradeCount: 2199,
        marketCap: 194056e4
      }
    },
    {
      symbol: "1320",
      nameAr: "\u0623\u0646\u0627\u0628\u064A\u0628 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Saudi Steel Pipe Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 47.62,
        highPrice: 48.7,
        lowPrice: 47.5,
        lastPrice: 47.74,
        changePercent: 0.51,
        volume: 152818,
        tradedValue: 734425488e-2,
        tradeCount: 1100,
        marketCap: 243474e4
      }
    },
    {
      symbol: "1321",
      nameAr: "\u0623\u0646\u0627\u0628\u064A\u0628 \u0627\u0644\u0634\u0631\u0642",
      nameEn: "East Pipes Integrated Company for Industry",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 220.6,
        highPrice: 224.9,
        lowPrice: 219.3,
        lastPrice: 220.9,
        changePercent: 0.5,
        volume: 265736,
        tradedValue: 590298854e-1,
        tradeCount: 3258,
        marketCap: 695835e4
      }
    },
    {
      symbol: "1322",
      nameAr: "\u0623\u0645\u0627\u0643",
      nameEn: "Almasane Alkobra Mining Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 70.3,
        highPrice: 73,
        lowPrice: 70,
        lastPrice: 70.7,
        changePercent: 0.71,
        volume: 403454,
        tradedValue: 2869419975e-2,
        tradeCount: 3303,
        marketCap: 6363e6
      }
    },
    {
      symbol: "1323",
      nameAr: "\u064A\u0648 \u0633\u064A \u0622\u064A \u0633\u064A",
      nameEn: "United Carton Industries Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 24.5,
        highPrice: 24.68,
        lowPrice: 24.38,
        lastPrice: 24.4,
        changePercent: -1.65,
        volume: 47622,
        tradedValue: 116681587e-2,
        tradeCount: 527,
        marketCap: 976e6
      }
    },
    {
      symbol: "1324",
      nameAr: "\u0635\u0627\u0644\u062D \u0627\u0644\u0631\u0627\u0634\u062F",
      nameEn: "Saleh Abdulaziz Al Rashed and Sons Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 41.72,
        highPrice: 41.82,
        lowPrice: 40.74,
        lastPrice: 40.8,
        changePercent: -2.21,
        volume: 171597,
        tradedValue: 705326102e-2,
        tradeCount: 1149,
        marketCap: 75888e4
      }
    },
    {
      symbol: "2001",
      nameAr: "\u0643\u064A\u0645\u0627\u0646\u0648\u0644",
      nameEn: "Methanol Chemicals Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: "red",
      officialQuote: {
        openPrice: 0,
        highPrice: 0,
        lowPrice: 0,
        lastPrice: 39.88,
        changePercent: 0,
        volume: 0,
        tradedValue: 0,
        tradeCount: 0,
        marketCap: 5982e5
      }
    },
    {
      symbol: "2010",
      nameAr: "\u0633\u0627\u0628\u0643",
      nameEn: "Saudi Basic Industries Corp.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 52,
        highPrice: 52.45,
        lowPrice: 51.75,
        lastPrice: 52.2,
        changePercent: 0.29,
        volume: 945603,
        tradedValue: 492653054e-1,
        tradeCount: 3390,
        marketCap: 1566e8
      }
    },
    {
      symbol: "2020",
      nameAr: "\u0633\u0627\u0628\u0643 \u0644\u0644\u0645\u063A\u0630\u064A\u0627\u062A \u0627\u0644\u0632\u0631\u0627\u0639\u064A\u0629",
      nameEn: "SABIC Agri-Nutrients Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 122.3,
        highPrice: 122.6,
        lowPrice: 121.7,
        lastPrice: 121.7,
        changePercent: -0.49,
        volume: 169086,
        tradedValue: 206353951e-1,
        tradeCount: 1707,
        marketCap: 579335086668e-1
      }
    },
    {
      symbol: "2060",
      nameAr: "\u0627\u0644\u062A\u0635\u0646\u064A\u0639",
      nameEn: "National Industrialization Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 9,
        highPrice: 9.12,
        lowPrice: 8.96,
        lastPrice: 9.1,
        changePercent: 1.11,
        volume: 304771,
        tradedValue: 276072199e-2,
        tradeCount: 705,
        marketCap: 60871189106e-1
      }
    },
    {
      symbol: "2090",
      nameAr: "\u062C\u0628\u0633\u0643\u0648",
      nameEn: "National Gypsum Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.99,
        highPrice: 14.06,
        lowPrice: 13.9,
        lastPrice: 13.92,
        changePercent: -0.5,
        volume: 77368,
        tradedValue: 108102526e-2,
        tradeCount: 209,
        marketCap: 44080000464e-2
      }
    },
    {
      symbol: "2150",
      nameAr: "\u0632\u062C\u0627\u062C",
      nameEn: "The National Company for Glass Industries",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 35.9,
        highPrice: 35.9,
        lowPrice: 35.52,
        lastPrice: 35.52,
        changePercent: -1.06,
        volume: 69858,
        tradedValue: 24937845e-1,
        tradeCount: 363,
        marketCap: 1168608e3
      }
    },
    {
      symbol: "2170",
      nameAr: "\u0627\u0644\u0644\u062C\u064A\u0646",
      nameEn: "Alujain Corp.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 27.2,
        highPrice: 27.42,
        lowPrice: 26.82,
        lastPrice: 26.9,
        changePercent: -1.1,
        volume: 220605,
        tradedValue: 597524758e-2,
        tradeCount: 1224,
        marketCap: 186148e4
      }
    },
    {
      symbol: "2180",
      nameAr: "\u0641\u064A\u0628\u0643\u0648",
      nameEn: "Filing and Packing Materials Manufacturing Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 31.6,
        highPrice: 31.98,
        lowPrice: 31.6,
        lastPrice: 31.84,
        changePercent: 0.51,
        volume: 23192,
        tradedValue: 737822.84,
        tradeCount: 168,
        marketCap: 36616e4
      }
    },
    {
      symbol: "2200",
      nameAr: "\u0623\u0646\u0627\u0628\u064A\u0628",
      nameEn: "Arabian Pipes Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.72,
        highPrice: 6.84,
        lowPrice: 6.62,
        lastPrice: 6.62,
        changePercent: -1.19,
        volume: 3193838,
        tradedValue: 214449666e-1,
        tradeCount: 2471,
        marketCap: 1324e6
      }
    },
    {
      symbol: "2210",
      nameAr: "\u0646\u0645\u0627\u0621 \u0644\u0644\u0643\u064A\u0645\u0627\u0648\u064A\u0627\u062A",
      nameEn: "Nama Chemicals Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 0,
        highPrice: 0,
        lowPrice: 0,
        lastPrice: 18.74,
        changePercent: 0,
        volume: 0,
        tradedValue: 0,
        tradeCount: 0,
        marketCap: 440764800
      }
    },
    {
      symbol: "2220",
      nameAr: "\u0645\u0639\u062F\u0646\u064A\u0629",
      nameEn: "National Metal Manufacturing and Casting Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: "orange",
      officialQuote: {
        openPrice: 11.75,
        highPrice: 11.9,
        lowPrice: 11.71,
        lastPrice: 11.76,
        changePercent: 0.09,
        volume: 44318,
        tradedValue: 522941.96,
        tradeCount: 242,
        marketCap: 416304e3
      }
    },
    {
      symbol: "2223",
      nameAr: "\u0644\u0648\u0628\u0631\u064A\u0641",
      nameEn: "Saudi Aramco Base Oil Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 132,
        highPrice: 132.2,
        lowPrice: 130.3,
        lastPrice: 131,
        changePercent: -0.83,
        volume: 235829,
        tradedValue: 30870658,
        tradeCount: 3087,
        marketCap: 2210625e4
      }
    },
    {
      symbol: "2240",
      nameAr: "\u0635\u0646\u0627\u0639\u0627\u062A",
      nameEn: "Advanced Building Industries Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 30.54,
        highPrice: 30.54,
        lowPrice: 28.84,
        lastPrice: 29.48,
        changePercent: -3.28,
        volume: 366833,
        tradedValue: 1082912738e-2,
        tradeCount: 1866,
        marketCap: 17688e5
      }
    },
    {
      symbol: "2250",
      nameAr: "\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Saudi Industrial Investment Group",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 12.7,
        highPrice: 12.88,
        lowPrice: 12.68,
        lastPrice: 12.83,
        changePercent: 1.02,
        volume: 697481,
        tradedValue: 891283656e-2,
        tradeCount: 1214,
        marketCap: 8715675600
      }
    },
    {
      symbol: "2290",
      nameAr: "\u064A\u0646\u0633\u0627\u0628",
      nameEn: "Yanbu National Petrochemical Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 30.64,
        highPrice: 31.42,
        lowPrice: 30.6,
        lastPrice: 31.3,
        changePercent: 2.09,
        volume: 733594,
        tradedValue: 2277485784e-2,
        tradeCount: 2552,
        marketCap: 1760625e4
      }
    },
    {
      symbol: "2300",
      nameAr: "\u0635\u0646\u0627\u0639\u0629 \u0627\u0644\u0648\u0631\u0642",
      nameEn: "Saudi Paper Manufacturing Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 62.5,
        highPrice: 63.75,
        lowPrice: 61.25,
        lastPrice: 63,
        changePercent: 1.61,
        volume: 86158,
        tradedValue: 54102955e-1,
        tradeCount: 635,
        marketCap: 233541e4
      }
    },
    {
      symbol: "2310",
      nameAr: "\u0633\u0628\u0643\u064A\u0645 \u0627\u0644\u0639\u0627\u0644\u0645\u064A\u0629",
      nameEn: "Sahara International Petrochemical Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.48,
        highPrice: 13.7,
        lowPrice: 13.41,
        lastPrice: 13.63,
        changePercent: 0.96,
        volume: 807380,
        tradedValue: 1093518334e-2,
        tradeCount: 1970,
        marketCap: 999533331516e-2
      }
    },
    {
      symbol: "2330",
      nameAr: "\u0627\u0644\u0645\u062A\u0642\u062F\u0645\u0629",
      nameEn: "Advanced Petrochemical Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 22.31,
        highPrice: 22.45,
        lowPrice: 22.3,
        lastPrice: 22.4,
        changePercent: -0.04,
        volume: 293281,
        tradedValue: 656318272e-2,
        tradeCount: 1159,
        marketCap: 5824e6
      }
    },
    {
      symbol: "2350",
      nameAr: "\u0643\u064A\u0627\u0646 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Saudi Kayan Petrochemical Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: "orange",
      officialQuote: {
        openPrice: 5.01,
        highPrice: 5.03,
        lowPrice: 4.97,
        lastPrice: 5.01,
        changePercent: -0.2,
        volume: 3150516,
        tradedValue: 1574805804e-2,
        tradeCount: 2189,
        marketCap: 7515e6
      }
    },
    {
      symbol: "2360",
      nameAr: "\u0627\u0644\u0641\u062E\u0627\u0631\u064A\u0629",
      nameEn: "Saudi Vitrified Clay Pipes Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: "red",
      officialQuote: {
        openPrice: 17.1,
        highPrice: 17.1,
        lowPrice: 16.56,
        lastPrice: 16.73,
        changePercent: -2.39,
        volume: 183004,
        tradedValue: 307235425e-2,
        tradeCount: 938,
        marketCap: 25095e4
      }
    },
    {
      symbol: "3002",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0646\u062C\u0631\u0627\u0646",
      nameEn: "Najran Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 5.66,
        highPrice: 5.72,
        lowPrice: 5.66,
        lastPrice: 5.7,
        changePercent: 0.71,
        volume: 184649,
        tradedValue: 105224119e-2,
        tradeCount: 252,
        marketCap: 969e6
      }
    },
    {
      symbol: "3003",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u0645\u062F\u064A\u0646\u0629",
      nameEn: "City Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.27,
        highPrice: 10.43,
        lowPrice: 10.23,
        lastPrice: 10.33,
        changePercent: 0.78,
        volume: 632346,
        tradedValue: 653009269e-2,
        tradeCount: 3186,
        marketCap: 14462e5
      }
    },
    {
      symbol: "3004",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u0634\u0645\u0627\u0644\u064A\u0629",
      nameEn: "Northern Region Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.53,
        highPrice: 6.56,
        lowPrice: 6.51,
        lastPrice: 6.55,
        changePercent: 0,
        volume: 90496,
        tradedValue: 591151.67,
        tradeCount: 386,
        marketCap: 1179e6
      }
    },
    {
      symbol: "3005",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0645 \u0627\u0644\u0642\u0631\u0649",
      nameEn: "Umm Al-Qura Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.52,
        highPrice: 13.69,
        lowPrice: 13.46,
        lastPrice: 13.65,
        changePercent: 0.07,
        volume: 27654,
        tradedValue: 375599.37,
        tradeCount: 246,
        marketCap: 75075e4
      }
    },
    {
      symbol: "3007",
      nameAr: "\u0627\u0644\u0648\u0627\u062D\u0629",
      nameEn: "Zahrat Al Waha for Trading Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 2.81,
        highPrice: 2.83,
        lowPrice: 2.76,
        lastPrice: 2.76,
        changePercent: -1.78,
        volume: 1151032,
        tradedValue: 320199937e-2,
        tradeCount: 680,
        marketCap: 621e6
      }
    },
    {
      symbol: "3008",
      nameAr: "\u0627\u0644\u0643\u062B\u064A\u0631\u064A",
      nameEn: "Al Kathiri Holding Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: "red",
      officialQuote: {
        openPrice: 1.37,
        highPrice: 1.37,
        lowPrice: 1.36,
        lastPrice: 1.37,
        changePercent: 0,
        volume: 1088924,
        tradedValue: 148575738e-2,
        tradeCount: 860,
        marketCap: 309680280
      }
    },
    {
      symbol: "3010",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u0639\u0631\u0628\u064A\u0629",
      nameEn: "Arabian Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 23.26,
        highPrice: 23.28,
        lowPrice: 23.05,
        lastPrice: 23.08,
        changePercent: -0.39,
        volume: 74939,
        tradedValue: 173399826e-2,
        tradeCount: 444,
        marketCap: 2308e6
      }
    },
    {
      symbol: "3020",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u064A\u0645\u0627\u0645\u0629",
      nameEn: "Yamama Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 24.1,
        highPrice: 24.24,
        lowPrice: 24,
        lastPrice: 24.11,
        changePercent: 0.04,
        volume: 179889,
        tradedValue: 433990224e-2,
        tradeCount: 830,
        marketCap: 4882275e3
      }
    },
    {
      symbol: "3030",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Saudi Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 29.58,
        highPrice: 29.64,
        lowPrice: 29.42,
        lastPrice: 29.5,
        changePercent: -0.27,
        volume: 97304,
        tradedValue: 287065432e-2,
        tradeCount: 874,
        marketCap: 45135e5
      }
    },
    {
      symbol: "3040",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u0642\u0635\u064A\u0645",
      nameEn: "Qassim Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 45.14,
        highPrice: 45.24,
        lowPrice: 45.04,
        lastPrice: 45.1,
        changePercent: 0.13,
        volume: 43614,
        tradedValue: 196773894e-2,
        tradeCount: 517,
        marketCap: 4986210900
      }
    },
    {
      symbol: "3050",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u062C\u0646\u0648\u0628",
      nameEn: "Southern Province Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 19.1,
        highPrice: 19.2,
        lowPrice: 19.07,
        lastPrice: 19.08,
        changePercent: -0.26,
        volume: 29351,
        tradedValue: 561757.65,
        tradeCount: 296,
        marketCap: 26712e5
      }
    },
    {
      symbol: "3060",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u064A\u0646\u0628\u0639",
      nameEn: "Yanbu Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 15.03,
        highPrice: 15.09,
        lowPrice: 14.98,
        lastPrice: 14.98,
        changePercent: -0.33,
        volume: 299918,
        tradedValue: 450632171e-2,
        tradeCount: 1083,
        marketCap: 235935e4
      }
    },
    {
      symbol: "3080",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u0634\u0631\u0642\u064A\u0629",
      nameEn: "Eastern Province Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 26.2,
        highPrice: 26.6,
        lowPrice: 26.18,
        lastPrice: 26.3,
        changePercent: 0.08,
        volume: 44438,
        tradedValue: 116821718e-2,
        tradeCount: 282,
        marketCap: 22618e5
      }
    },
    {
      symbol: "3090",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u062A\u0628\u0648\u0643",
      nameEn: "Tabuk Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 7.5,
        highPrice: 7.56,
        lowPrice: 7.46,
        lastPrice: 7.5,
        changePercent: -0.4,
        volume: 61906,
        tradedValue: 465377.68,
        tradeCount: 317,
        marketCap: 675e6
      }
    },
    {
      symbol: "3091",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u062C\u0648\u0641",
      nameEn: "Al Jouf Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 4.92,
        highPrice: 4.92,
        lowPrice: 4.84,
        lastPrice: 4.84,
        changePercent: -1.63,
        volume: 253964,
        tradedValue: 123757361e-2,
        tradeCount: 646,
        marketCap: 526108e3
      }
    },
    {
      symbol: "3092",
      nameAr: "\u0623\u0633\u0645\u0646\u062A \u0627\u0644\u0631\u064A\u0627\u0636",
      nameEn: "Riyadh Cement Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 22.14,
        highPrice: 22.38,
        lowPrice: 22.14,
        lastPrice: 22.28,
        changePercent: 0.68,
        volume: 65617,
        tradedValue: 146422123e-2,
        tradeCount: 490,
        marketCap: 26736e5
      }
    },
    {
      symbol: "4143",
      nameAr: "\u062A\u0627\u0644\u0643\u0648",
      nameEn: "Al Taiseer Group Talco Industrial Co.",
      sectorAr: "\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      sectorEn: "Materials",
      warningFlag: null,
      officialQuote: {
        openPrice: 30.9,
        highPrice: 31.12,
        lowPrice: 30.7,
        lastPrice: 30.76,
        changePercent: -0.77,
        volume: 28405,
        tradedValue: 879907.8,
        tradeCount: 279,
        marketCap: 12304e5
      }
    },
    {
      symbol: "1212",
      nameAr: "\u0623\u0633\u062A\u0631\u0627 \u0627\u0644\u0635\u0646\u0627\u0639\u064A\u0629",
      nameEn: "Astra Industrial Group",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 128,
        highPrice: 130,
        lowPrice: 128,
        lastPrice: 129.7,
        changePercent: 1.33,
        volume: 35948,
        tradedValue: 46464491e-1,
        tradeCount: 592,
        marketCap: 10376e6
      }
    },
    {
      symbol: "1214",
      nameAr: "\u0634\u0627\u0643\u0631",
      nameEn: "Al Hassan Ghazi Ibrahim Shaker Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.08,
        highPrice: 13.1,
        lowPrice: 13,
        lastPrice: 13,
        changePercent: -0.31,
        volume: 217003,
        tradedValue: 283143758e-2,
        tradeCount: 794,
        marketCap: 88023e4
      }
    },
    {
      symbol: "1302",
      nameAr: "\u0628\u0648\u0627\u0646",
      nameEn: "Bawan Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 36,
        highPrice: 36.26,
        lowPrice: 35.3,
        lastPrice: 35.46,
        changePercent: -1.77,
        volume: 185399,
        tradedValue: 66223992e-1,
        tradeCount: 1291,
        marketCap: 21276e5
      }
    },
    {
      symbol: "1303",
      nameAr: "\u0627\u0644\u0635\u0646\u0627\u0639\u0627\u062A \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629",
      nameEn: "Electrical Industries Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.04,
        highPrice: 13.44,
        lowPrice: 13.03,
        lastPrice: 13.21,
        changePercent: 0.3,
        volume: 2648087,
        tradedValue: 3502492227e-2,
        tradeCount: 4560,
        marketCap: 1486125e4
      }
    },
    {
      symbol: "2040",
      nameAr: "\u0627\u0644\u062E\u0632\u0641 \u0627\u0644\u0633\u0639\u0648\u062F\u064A",
      nameEn: "Saudi Ceramic Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 24.41,
        highPrice: 24.5,
        lowPrice: 24.1,
        lastPrice: 24.12,
        changePercent: -1.19,
        volume: 139520,
        tradedValue: 3381611,
        tradeCount: 856,
        marketCap: 2412e6
      }
    },
    {
      symbol: "2110",
      nameAr: "\u0627\u0644\u0643\u0627\u0628\u0644\u0627\u062A \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Saudi Cable Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: "red",
      officialQuote: {
        openPrice: 160.9,
        highPrice: 164,
        lowPrice: 158.3,
        lastPrice: 158.9,
        changePercent: 0,
        volume: 30540,
        tradedValue: 49114311e-1,
        tradeCount: 765,
        marketCap: 10603247634e-1
      }
    },
    {
      symbol: "2160",
      nameAr: "\u0623\u0645\u064A\u0627\u0646\u062A\u064A\u062A",
      nameEn: "Saudi Arabian Amiantit Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 12.67,
        highPrice: 12.72,
        lowPrice: 12.45,
        lastPrice: 12.45,
        changePercent: -1.5,
        volume: 185149,
        tradedValue: 232999995e-2,
        tradeCount: 720,
        marketCap: 554647500
      }
    },
    {
      symbol: "2320",
      nameAr: "\u0627\u0644\u0628\u0627\u0628\u0637\u064A\u0646",
      nameEn: "Al-Babtain Power and Telecommunication Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 58.6,
        highPrice: 59.15,
        lowPrice: 58.2,
        lastPrice: 58.25,
        changePercent: -0.94,
        volume: 278750,
        tradedValue: 1634170885e-2,
        tradeCount: 2259,
        marketCap: 3724910886
      }
    },
    {
      symbol: "2370",
      nameAr: "\u0645\u0633\u0643",
      nameEn: "Middle East Specialized Cables Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 32,
        highPrice: 32.22,
        lowPrice: 31,
        lastPrice: 31.22,
        changePercent: -2.74,
        volume: 210172,
        tradedValue: 660764074e-2,
        tradeCount: 1386,
        marketCap: 12488e5
      }
    },
    {
      symbol: "4110",
      nameAr: "\u0628\u0627\u062A\u0643",
      nameEn: "Batic Investments and Logistics Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 2.05,
        highPrice: 2.06,
        lowPrice: 2.02,
        lastPrice: 2.02,
        changePercent: -1.46,
        volume: 3553224,
        tradedValue: 723901587e-2,
        tradeCount: 1298,
        marketCap: 1212e6
      }
    },
    {
      symbol: "4140",
      nameAr: "\u0635\u0627\u062F\u0631\u0627\u062A",
      nameEn: "Saudi Industrial Export Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: "orange",
      officialQuote: {
        openPrice: 2.34,
        highPrice: 2.36,
        lowPrice: 2.3,
        lastPrice: 2.32,
        changePercent: -0.85,
        volume: 2231038,
        tradedValue: 5195869,
        tradeCount: 844,
        marketCap: 451008e3
      }
    },
    {
      symbol: "4141",
      nameAr: "\u0627\u0644\u0639\u0645\u0631\u0627\u0646",
      nameEn: "Al-Omran Industrial Trading Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 20.5,
        highPrice: 20.72,
        lowPrice: 20.3,
        lastPrice: 20.3,
        changePercent: -1.31,
        volume: 19934,
        tradedValue: 408563.97,
        tradeCount: 226,
        marketCap: 2436e5
      }
    },
    {
      symbol: "4142",
      nameAr: "\u0643\u0627\u0628\u0644\u0627\u062A \u0627\u0644\u0631\u064A\u0627\u0636",
      nameEn: "Riyadh Cables Group Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 107.6,
        highPrice: 109.9,
        lowPrice: 107.5,
        lastPrice: 108.8,
        changePercent: 1.12,
        volume: 187112,
        tradedValue: 203662808e-1,
        tradeCount: 1778,
        marketCap: 1632e7
      }
    },
    {
      symbol: "4144",
      nameAr: "\u0631\u0624\u0648\u0645",
      nameEn: "Raoom Trading Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 73.55,
        highPrice: 74.6,
        lowPrice: 71.1,
        lastPrice: 72,
        changePercent: -2.11,
        volume: 94597,
        tradedValue: 68785369e-1,
        tradeCount: 650,
        marketCap: 9e8
      }
    },
    {
      symbol: "4145",
      nameAr: "\u0623\u0648 \u062C\u064A \u0633\u064A",
      nameEn: "Obeikan Glass Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 24.72,
        highPrice: 24.9,
        lowPrice: 24.28,
        lastPrice: 24.28,
        changePercent: -1.7,
        volume: 90128,
        tradedValue: 220704338e-2,
        tradeCount: 533,
        marketCap: 77696e4
      }
    },
    {
      symbol: "4146",
      nameAr: "\u062C\u0627\u0632",
      nameEn: "Gas Arabian Services Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 16.28,
        highPrice: 16.28,
        lowPrice: 15.82,
        lastPrice: 15.93,
        changePercent: -0.93,
        volume: 116945,
        tradedValue: 186282499e-2,
        tradeCount: 469,
        marketCap: 251694e4
      }
    },
    {
      symbol: "4147",
      nameAr: "\u0633\u064A \u062C\u064A \u0625\u0633",
      nameEn: "Consolidated Grunenfelder Saady Holding Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.64,
        highPrice: 6.69,
        lowPrice: 6.35,
        lastPrice: 6.39,
        changePercent: -3.77,
        volume: 974473,
        tradedValue: 634392367e-2,
        tradeCount: 1062,
        marketCap: 639e6
      }
    },
    {
      symbol: "4148",
      nameAr: "\u0627\u0644\u0648\u0633\u0627\u0626\u0644 \u0627\u0644\u0635\u0646\u0627\u0639\u064A\u0629",
      nameEn: "Alwasail Industrial Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Capital Goods",
      warningFlag: null,
      officialQuote: {
        openPrice: 2.9,
        highPrice: 2.98,
        lowPrice: 2.9,
        lastPrice: 2.93,
        changePercent: 0.34,
        volume: 822334,
        tradedValue: 241858178e-2,
        tradeCount: 664,
        marketCap: 7325e5
      }
    },
    {
      symbol: "1831",
      nameAr: "\u0645\u0647\u0627\u0631\u0629",
      nameEn: "Maharah Human Resources Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0647\u0646\u064A\u0629",
      sectorEn: "Commercial & Professional Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 5.3,
        highPrice: 5.35,
        lowPrice: 5.27,
        lastPrice: 5.31,
        changePercent: 0.19,
        volume: 2414269,
        tradedValue: 1284074643e-2,
        tradeCount: 3100,
        marketCap: 3186e6
      }
    },
    {
      symbol: "1832",
      nameAr: "\u0635\u062F\u0631",
      nameEn: "Sadr Logistics Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0647\u0646\u064A\u0629",
      sectorEn: "Commercial & Professional Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 2.55,
        highPrice: 2.57,
        lowPrice: 2.48,
        lastPrice: 2.49,
        changePercent: -3.11,
        volume: 1705770,
        tradedValue: 430359421e-2,
        tradeCount: 1656,
        marketCap: 43575e4
      }
    },
    {
      symbol: "1833",
      nameAr: "\u0627\u0644\u0645\u0648\u0627\u0631\u062F",
      nameEn: "Al Mawarid Manpower Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0647\u0646\u064A\u0629",
      sectorEn: "Commercial & Professional Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 108.6,
        highPrice: 112.1,
        lowPrice: 108.3,
        lastPrice: 111,
        changePercent: 2.21,
        volume: 171278,
        tradedValue: 189249018e-1,
        tradeCount: 1611,
        marketCap: 222e7
      }
    },
    {
      symbol: "1834",
      nameAr: "\u0633\u0645\u0627\u0633\u0643\u0648",
      nameEn: "Saudi Manpower Solutions Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0647\u0646\u064A\u0629",
      sectorEn: "Commercial & Professional Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.2,
        highPrice: 6.3,
        lowPrice: 6.19,
        lastPrice: 6.23,
        changePercent: 0.32,
        volume: 1086174,
        tradedValue: 677235394e-2,
        tradeCount: 1671,
        marketCap: 2492e6
      }
    },
    {
      symbol: "1835",
      nameAr: "\u062A\u0645\u0643\u064A\u0646",
      nameEn: "Tamkeen Human Resource Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0647\u0646\u064A\u0629",
      sectorEn: "Commercial & Professional Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 47.84,
        highPrice: 48.16,
        lowPrice: 47.34,
        lastPrice: 47.74,
        changePercent: 0.93,
        volume: 74869,
        tradedValue: 357782772e-2,
        tradeCount: 484,
        marketCap: 126511e4
      }
    },
    {
      symbol: "4270",
      nameAr: "\u0637\u0628\u0627\u0639\u0629 \u0648\u062A\u063A\u0644\u064A\u0641",
      nameEn: "Saudi Printing and Packaging Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0647\u0646\u064A\u0629",
      sectorEn: "Commercial & Professional Svc",
      warningFlag: "red",
      officialQuote: {
        openPrice: 7.17,
        highPrice: 7.27,
        lowPrice: 6.94,
        lastPrice: 6.94,
        changePercent: -3.07,
        volume: 353965,
        tradedValue: 250925643e-2,
        tradeCount: 1107,
        marketCap: 45253702416e-2
      }
    },
    {
      symbol: "6004",
      nameAr: "\u0643\u0627\u062A\u0631\u064A\u0648\u0646",
      nameEn: "CATRION Catering Holding Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0647\u0646\u064A\u0629",
      sectorEn: "Commercial & Professional Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 73.15,
        highPrice: 73.8,
        lowPrice: 72.8,
        lastPrice: 72.8,
        changePercent: -0.68,
        volume: 88870,
        tradedValue: 650229535e-2,
        tradeCount: 888,
        marketCap: 59696e5
      }
    },
    {
      symbol: "2190",
      nameAr: "\u0633\u064A\u0633\u0643\u0648 \u0627\u0644\u0642\u0627\u0628\u0636\u0629",
      nameEn: "Sustained Infrastructure Holding Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: null,
      officialQuote: {
        openPrice: 35.86,
        highPrice: 35.98,
        lowPrice: 35.08,
        lastPrice: 35.42,
        changePercent: -1.77,
        volume: 237896,
        tradedValue: 84576361e-1,
        tradeCount: 1419,
        marketCap: 2890272e3
      }
    },
    {
      symbol: "4031",
      nameAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0631\u0636\u064A\u0629",
      nameEn: "Saudi Ground Services Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: null,
      officialQuote: {
        openPrice: 27.6,
        highPrice: 27.62,
        lowPrice: 27.18,
        lastPrice: 27.2,
        changePercent: -1.52,
        volume: 441083,
        tradedValue: 120645857e-1,
        tradeCount: 2263,
        marketCap: 51136e5
      }
    },
    {
      symbol: "4040",
      nameAr: "\u0633\u0627\u0628\u062A\u0643\u0648",
      nameEn: "Saudi Public Transport Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 11.12,
        highPrice: 11.17,
        lowPrice: 10.8,
        lastPrice: 10.84,
        changePercent: -2.52,
        volume: 550647,
        tradedValue: 603012159e-2,
        tradeCount: 1339,
        marketCap: 1355e6
      }
    },
    {
      symbol: "4260",
      nameAr: "\u0628\u062F\u062C\u062A \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "United International Transportation Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: null,
      officialQuote: {
        openPrice: 28.7,
        highPrice: 29,
        lowPrice: 28.68,
        lastPrice: 28.82,
        changePercent: 0.56,
        volume: 508273,
        tradedValue: 146656507e-1,
        tradeCount: 3140,
        marketCap: 301290689568e-2
      }
    },
    {
      symbol: "4261",
      nameAr: "\u0630\u064A\u0628",
      nameEn: "Theeb Rent a Car Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: null,
      officialQuote: {
        openPrice: 22.49,
        highPrice: 22.68,
        lowPrice: 22.45,
        lastPrice: 22.46,
        changePercent: -0.22,
        volume: 303995,
        tradedValue: 684405609e-2,
        tradeCount: 1350,
        marketCap: 148171997984e-2
      }
    },
    {
      symbol: "4262",
      nameAr: "\u0644\u0648\u0645\u064A",
      nameEn: "Lumi Rental Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: null,
      officialQuote: {
        openPrice: 29.92,
        highPrice: 30.26,
        lowPrice: 29.92,
        lastPrice: 29.94,
        changePercent: -0.07,
        volume: 99800,
        tradedValue: 300046316e-2,
        tradeCount: 574,
        marketCap: 16467e5
      }
    },
    {
      symbol: "4263",
      nameAr: "\u0633\u0627\u0644",
      nameEn: "SAL Saudi Logistics Services Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: null,
      officialQuote: {
        openPrice: 163.5,
        highPrice: 164.8,
        lowPrice: 163,
        lastPrice: 164.2,
        changePercent: -0.12,
        volume: 138135,
        tradedValue: 226678827e-1,
        tradeCount: 2432,
        marketCap: 13136e6
      }
    },
    {
      symbol: "4264",
      nameAr: "\u0637\u064A\u0631\u0627\u0646 \u0646\u0627\u0633",
      nameEn: "Flynas Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: null,
      officialQuote: {
        openPrice: 50.3,
        highPrice: 50.4,
        lowPrice: 49.36,
        lastPrice: 49.62,
        changePercent: -1.65,
        volume: 427395,
        tradedValue: 2124691866e-2,
        tradeCount: 2753,
        marketCap: 847767093066e-2
      }
    },
    {
      symbol: "4265",
      nameAr: "\u0634\u0631\u064A",
      nameEn: "Cherry Trading Co.",
      sectorAr: "\u0627\u0644\u0646\u0642\u0644",
      sectorEn: "Transportation",
      warningFlag: null,
      officialQuote: {
        openPrice: 22.59,
        highPrice: 22.99,
        lowPrice: 22.59,
        lastPrice: 22.75,
        changePercent: 0.89,
        volume: 78124,
        tradedValue: 177777455e-2,
        tradeCount: 414,
        marketCap: 6825e5
      }
    },
    {
      symbol: "1213",
      nameAr: "\u0646\u0633\u064A\u062C",
      nameEn: "Naseej International Trading Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0637\u0648\u064A\u0644\u0629 \u0627\u0644\u0623\u062C\u0644",
      sectorEn: "Consumer Durables & Apparel",
      warningFlag: "red",
      officialQuote: {
        openPrice: 22.86,
        highPrice: 23.44,
        lowPrice: 22.5,
        lastPrice: 22.5,
        changePercent: -2.13,
        volume: 452371,
        tradedValue: 1035961799e-2,
        tradeCount: 2083,
        marketCap: 2451892725e-1
      }
    },
    {
      symbol: "2130",
      nameAr: "\u0635\u062F\u0642",
      nameEn: "Saudi Industrial Development Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0637\u0648\u064A\u0644\u0629 \u0627\u0644\u0623\u062C\u0644",
      sectorEn: "Consumer Durables & Apparel",
      warningFlag: null,
      officialQuote: {
        openPrice: 16.74,
        highPrice: 16.94,
        lowPrice: 16.17,
        lastPrice: 16.22,
        changePercent: -2.29,
        volume: 406726,
        tradedValue: 674183205e-2,
        tradeCount: 1357,
        marketCap: 4866e5
      }
    },
    {
      symbol: "2340",
      nameAr: "\u0627\u0631\u062A\u064A\u0643\u0633",
      nameEn: "ARTEX Industrial Investment Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0637\u0648\u064A\u0644\u0629 \u0627\u0644\u0623\u062C\u0644",
      sectorEn: "Consumer Durables & Apparel",
      warningFlag: null,
      officialQuote: {
        openPrice: 12.28,
        highPrice: 12.28,
        lowPrice: 11.85,
        lastPrice: 12.07,
        changePercent: -0.49,
        volume: 63382,
        tradedValue: 763995.87,
        tradeCount: 391,
        marketCap: 980687500
      }
    },
    {
      symbol: "4011",
      nameAr: "\u0644\u0627\u0632\u0648\u0631\u062F\u064A",
      nameEn: "Lazurde Company for Jewelry",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0637\u0648\u064A\u0644\u0629 \u0627\u0644\u0623\u062C\u0644",
      sectorEn: "Consumer Durables & Apparel",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.05,
        highPrice: 11.09,
        lowPrice: 10.96,
        lastPrice: 10.97,
        changePercent: -1.17,
        volume: 76966,
        tradedValue: 846546.24,
        tradeCount: 246,
        marketCap: 630775e3
      }
    },
    {
      symbol: "4012",
      nameAr: "\u0627\u0644\u0623\u0635\u064A\u0644",
      nameEn: "Thob Al Aseel Co.",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0637\u0648\u064A\u0644\u0629 \u0627\u0644\u0623\u062C\u0644",
      sectorEn: "Consumer Durables & Apparel",
      warningFlag: null,
      officialQuote: {
        openPrice: 3.62,
        highPrice: 3.62,
        lowPrice: 3.59,
        lastPrice: 3.6,
        changePercent: -0.28,
        volume: 142634,
        tradedValue: 513322.39,
        tradeCount: 427,
        marketCap: 144e7
      }
    },
    {
      symbol: "4180",
      nameAr: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0641\u062A\u064A\u062D\u064A",
      nameEn: "Fitaihi Holding Group",
      sectorAr: "\u0627\u0644\u0633\u0644\u0639 \u0637\u0648\u064A\u0644\u0629 \u0627\u0644\u0623\u062C\u0644",
      sectorEn: "Consumer Durables & Apparel",
      warningFlag: null,
      officialQuote: {
        openPrice: 2.46,
        highPrice: 2.46,
        lowPrice: 2.39,
        lastPrice: 2.4,
        changePercent: -1.64,
        volume: 1296608,
        tradedValue: 312582228e-2,
        tradeCount: 941,
        marketCap: 66e7
      }
    },
    {
      symbol: "1810",
      nameAr: "\u0633\u064A\u0631\u0627",
      nameEn: "Seera Group Holding",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 21.55,
        highPrice: 21.55,
        lowPrice: 20.9,
        lastPrice: 20.91,
        changePercent: -2.97,
        volume: 963245,
        tradedValue: 2051620723e-2,
        tradeCount: 1804,
        marketCap: 573035731332e-2
      }
    },
    {
      symbol: "1820",
      nameAr: "\u0628\u0627\u0646",
      nameEn: "BAAN Holding Group Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: "red",
      officialQuote: {
        openPrice: 2.07,
        highPrice: 2.07,
        lowPrice: 2.02,
        lastPrice: 2.03,
        changePercent: -1.93,
        volume: 2313206,
        tradedValue: 472171208e-2,
        tradeCount: 938,
        marketCap: 125853288008e-2
      }
    },
    {
      symbol: "1830",
      nameAr: "\u0644\u062C\u0627\u0645 \u0644\u0644\u0631\u064A\u0627\u0636\u0629",
      nameEn: "Leejam Sports Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 69.75,
        highPrice: 71.75,
        lowPrice: 69.65,
        lastPrice: 70.2,
        changePercent: 0.57,
        volume: 91978,
        tradedValue: 65035859e-1,
        tradeCount: 1229,
        marketCap: 36773119422e-1
      }
    },
    {
      symbol: "4170",
      nameAr: "\u0634\u0645\u0633",
      nameEn: "Tourism Enterprise Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 15.32,
        highPrice: 15.62,
        lowPrice: 15.15,
        lastPrice: 15.15,
        changePercent: -1.17,
        volume: 178953,
        tradedValue: 275883953e-2,
        tradeCount: 695,
        marketCap: 87602788845e-2
      }
    },
    {
      symbol: "4290",
      nameAr: "\u0627\u0644\u062E\u0644\u064A\u062C \u0644\u0644\u062A\u062F\u0631\u064A\u0628",
      nameEn: "Alkhaleej Training and Education Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.65,
        highPrice: 13.69,
        lowPrice: 13.51,
        lastPrice: 13.52,
        changePercent: -1.24,
        volume: 144292,
        tradedValue: 195751708e-2,
        tradeCount: 706,
        marketCap: 8788e5
      }
    },
    {
      symbol: "4291",
      nameAr: "\u0627\u0644\u0648\u0637\u0646\u064A\u0629 \u0644\u0644\u062A\u0639\u0644\u064A\u0645",
      nameEn: "National Company for Learning and Education",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 126.2,
        highPrice: 127,
        lowPrice: 122,
        lastPrice: 125.9,
        changePercent: 1.45,
        volume: 13085,
        tradedValue: 16290894e-1,
        tradeCount: 405,
        marketCap: 54137e5
      }
    },
    {
      symbol: "4292",
      nameAr: "\u0639\u0637\u0627\u0621",
      nameEn: "Ataa Educational Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 42.62,
        highPrice: 44.4,
        lowPrice: 42.62,
        lastPrice: 44.38,
        changePercent: 3.79,
        volume: 91822,
        tradedValue: 401572556e-2,
        tradeCount: 819,
        marketCap: 18678306017e-1
      }
    },
    {
      symbol: "6002",
      nameAr: "\u0647\u0631\u0641\u064A \u0644\u0644\u0623\u063A\u0630\u064A\u0629",
      nameEn: "Herfy Food Services Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.39,
        highPrice: 13.49,
        lowPrice: 13.16,
        lastPrice: 13.23,
        changePercent: -0.53,
        volume: 82399,
        tradedValue: 109584933e-2,
        tradeCount: 549,
        marketCap: 855716400
      }
    },
    {
      symbol: "6012",
      nameAr: "\u0631\u064A\u062F\u0627\u0646",
      nameEn: "Raydan Food Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: "red",
      officialQuote: {
        openPrice: 13.43,
        highPrice: 13.49,
        lowPrice: 13.06,
        lastPrice: 13.1,
        changePercent: -2.46,
        volume: 32131,
        tradedValue: 425240.35,
        tradeCount: 505,
        marketCap: 958081993e-1
      }
    },
    {
      symbol: "6013",
      nameAr: "\u0627\u0644\u062A\u0637\u0648\u064A\u0631\u064A\u0629 \u0627\u0644\u063A\u0630\u0627\u0626\u064A\u0629",
      nameEn: "Development Works Food Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: "orange",
      officialQuote: {
        openPrice: 93.35,
        highPrice: 94.9,
        lowPrice: 92.95,
        lastPrice: 93,
        changePercent: -0.53,
        volume: 15902,
        tradedValue: 149572035e-2,
        tradeCount: 312,
        marketCap: 279e6
      }
    },
    {
      symbol: "6014",
      nameAr: "\u0627\u0644\u0622\u0645\u0627\u0631",
      nameEn: "Alamar Foods Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 37.8,
        highPrice: 37.86,
        lowPrice: 37.18,
        lastPrice: 37.28,
        changePercent: -1.38,
        volume: 63833,
        tradedValue: 238974272e-2,
        tradeCount: 860,
        marketCap: 95064e4
      }
    },
    {
      symbol: "6015",
      nameAr: "\u0623\u0645\u0631\u064A\u0643\u0627\u0646\u0627",
      nameEn: "Americana Restaurants International PLC - Foreign Company",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 2.09,
        highPrice: 2.11,
        lowPrice: 2.07,
        lastPrice: 2.09,
        changePercent: 0,
        volume: 10804483,
        tradedValue: 2260150027e-2,
        tradeCount: 1934,
        marketCap: 17605393179
      }
    },
    {
      symbol: "6016",
      nameAr: "\u0628\u0631\u063A\u0631\u0627\u064A\u0632\u0632\u0631",
      nameEn: "Shatirah House Restaurant Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 7.19,
        highPrice: 7.22,
        lowPrice: 7.08,
        lastPrice: 7.09,
        changePercent: -1.8,
        volume: 138899,
        tradedValue: 992260.56,
        tradeCount: 351,
        marketCap: 39704e4
      }
    },
    {
      symbol: "6017",
      nameAr: "\u062C\u0627\u0647\u0632",
      nameEn: "Jahez International Company for Information System Technology",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.95,
        highPrice: 12.15,
        lowPrice: 11.82,
        lastPrice: 11.99,
        changePercent: 0.33,
        volume: 1139833,
        tradedValue: 1368259775e-2,
        tradeCount: 2370,
        marketCap: 25159343594e-1
      }
    },
    {
      symbol: "6018",
      nameAr: "\u0627\u0644\u0623\u0646\u062F\u064A\u0629 \u0644\u0644\u0631\u064A\u0627\u0636\u0629",
      nameEn: "Sport Clubs Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.69,
        highPrice: 6.73,
        lowPrice: 6.61,
        lastPrice: 6.61,
        changePercent: -1.64,
        volume: 1038630,
        tradedValue: 691747294e-2,
        tradeCount: 1660,
        marketCap: 756184e3
      }
    },
    {
      symbol: "6019",
      nameAr: "\u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0634\u0627\u0645\u0644",
      nameEn: "Al Masar Al Shamil Education Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 22.91,
        highPrice: 23.32,
        lowPrice: 22.91,
        lastPrice: 23.1,
        changePercent: 0.43,
        volume: 58798,
        tradedValue: 135867639e-2,
        tradeCount: 427,
        marketCap: 23654707692e-1
      }
    },
    {
      symbol: "4070",
      nameAr: "\u062A\u0647\u0627\u0645\u0629",
      nameEn: "Tihama Advertising, Public Relations and Marketing Co.",
      sectorAr: "\u0627\u0644\u0625\u0639\u0644\u0627\u0645 \u0648\u0627\u0644\u062A\u0631\u0641\u064A\u0647",
      sectorEn: "Media and Entertainment",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 16.94,
        highPrice: 17.25,
        lowPrice: 16.94,
        lastPrice: 17.17,
        changePercent: 0.53,
        volume: 78950,
        tradedValue: 135224488e-2,
        tradeCount: 337,
        marketCap: 39356495371e-2
      }
    },
    {
      symbol: "4071",
      nameAr: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
      nameEn: "Arabian Contracting Services Co.",
      sectorAr: "\u0627\u0644\u0625\u0639\u0644\u0627\u0645 \u0648\u0627\u0644\u062A\u0631\u0641\u064A\u0647",
      sectorEn: "Media and Entertainment",
      warningFlag: null,
      officialQuote: {
        openPrice: 84.55,
        highPrice: 89.4,
        lowPrice: 84.55,
        lastPrice: 85.65,
        changePercent: 0.18,
        volume: 127653,
        tradedValue: 111253218e-1,
        tradeCount: 1482,
        marketCap: 471075e4
      }
    },
    {
      symbol: "4072",
      nameAr: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0625\u0645 \u0628\u064A \u0633\u064A",
      nameEn: "MBC Group Co.",
      sectorAr: "\u0627\u0644\u0625\u0639\u0644\u0627\u0645 \u0648\u0627\u0644\u062A\u0631\u0641\u064A\u0647",
      sectorEn: "Media and Entertainment",
      warningFlag: null,
      officialQuote: {
        openPrice: 21.06,
        highPrice: 21.74,
        lowPrice: 21.06,
        lastPrice: 21.29,
        changePercent: 1.09,
        volume: 208211,
        tradedValue: 446502779e-2,
        tradeCount: 1151,
        marketCap: 7078925e3
      }
    },
    {
      symbol: "4210",
      nameAr: "\u0627\u0644\u0623\u0628\u062D\u0627\u062B \u0648\u0627\u0644\u0625\u0639\u0644\u0627\u0645",
      nameEn: "Saudi Research and Media Group",
      sectorAr: "\u0627\u0644\u0625\u0639\u0644\u0627\u0645 \u0648\u0627\u0644\u062A\u0631\u0641\u064A\u0647",
      sectorEn: "Media and Entertainment",
      warningFlag: null,
      officialQuote: {
        openPrice: 63,
        highPrice: 67.5,
        lowPrice: 62.2,
        lastPrice: 64.75,
        changePercent: 5.46,
        volume: 841287,
        tradedValue: 5522024865e-2,
        tradeCount: 5811,
        marketCap: 518e7
      }
    },
    {
      symbol: "4003",
      nameAr: "\u0625\u0643\u0633\u062A\u0631\u0627",
      nameEn: "United Electronics Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 68.5,
        highPrice: 68.5,
        lowPrice: 67.7,
        lastPrice: 67.7,
        changePercent: -1.31,
        volume: 69214,
        tradedValue: 47073076e-1,
        tradeCount: 1050,
        marketCap: 5416e6
      }
    },
    {
      symbol: "4008",
      nameAr: "\u0633\u0627\u0643\u0648",
      nameEn: "Saudi Company for Hardware",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 22.25,
        highPrice: 22.57,
        lowPrice: 22.23,
        lastPrice: 22.27,
        changePercent: -1.46,
        volume: 49031,
        tradedValue: 10938253e-1,
        tradeCount: 401,
        marketCap: 80172e4
      }
    },
    {
      symbol: "4050",
      nameAr: "\u0633\u0627\u0633\u0643\u0648",
      nameEn: "Saudi Automotive Services Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 41,
        highPrice: 42.1,
        lowPrice: 40.3,
        lastPrice: 40.36,
        changePercent: -0.05,
        volume: 455234,
        tradedValue: 1867527054e-2,
        tradeCount: 2268,
        marketCap: 28252e5
      }
    },
    {
      symbol: "4051",
      nameAr: "\u0628\u0627\u0639\u0638\u064A\u0645",
      nameEn: "Baazeem Trading Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 5.58,
        highPrice: 5.58,
        lowPrice: 5.51,
        lastPrice: 5.52,
        changePercent: -1.08,
        volume: 90019,
        tradedValue: 499070.25,
        tradeCount: 345,
        marketCap: 5589e5
      }
    },
    {
      symbol: "4190",
      nameAr: "\u062C\u0631\u064A\u0631",
      nameEn: "Jarir Marketing Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 17,
        highPrice: 17.13,
        lowPrice: 16.7,
        lastPrice: 16.91,
        changePercent: -1.28,
        volume: 2473291,
        tradedValue: 4165593326e-2,
        tradeCount: 4987,
        marketCap: 20292e6
      }
    },
    {
      symbol: "4191",
      nameAr: "\u0623\u0628\u0648 \u0645\u0639\u0637\u064A",
      nameEn: "Abdullah Saad Mohammed Abo Moati for Bookstores Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 44,
        highPrice: 44.9,
        lowPrice: 39.64,
        lastPrice: 41.02,
        changePercent: -6.69,
        volume: 1398066,
        tradedValue: 585075986e-1,
        tradeCount: 4494,
        marketCap: 8204e5
      }
    },
    {
      symbol: "4192",
      nameAr: "\u0627\u0644\u0633\u064A\u0641 \u063A\u0627\u0644\u064A\u0631\u064A",
      nameEn: "AlSaif Stores for Development and Investment Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.57,
        highPrice: 6.59,
        lowPrice: 6.5,
        lastPrice: 6.5,
        changePercent: -1.07,
        volume: 50423,
        tradedValue: 329246.56,
        tradeCount: 242,
        marketCap: 2275e6
      }
    },
    {
      symbol: "4193",
      nameAr: "\u0646\u0627\u064A\u0633 \u0648\u0646",
      nameEn: "Nice One Beauty Digital Marketing Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 12.64,
        highPrice: 12.75,
        lowPrice: 12.41,
        lastPrice: 12.42,
        changePercent: -1.74,
        volume: 571507,
        tradedValue: 717119198e-2,
        tradeCount: 1698,
        marketCap: 143451e4
      }
    },
    {
      symbol: "4194",
      nameAr: "\u0645\u062D\u0637\u0629 \u0627\u0644\u0628\u0646\u0627\u0621",
      nameEn: "Marketing Home Group for Trading Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 42.9,
        highPrice: 42.98,
        lowPrice: 42.4,
        lastPrice: 42.4,
        changePercent: -1.17,
        volume: 37435,
        tradedValue: 15989742e-1,
        tradeCount: 553,
        marketCap: 6784e5
      }
    },
    {
      symbol: "4200",
      nameAr: "\u0627\u0644\u062F\u0631\u064A\u0633",
      nameEn: "Aldrees Petroleum and Transport Services Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 113.1,
        highPrice: 118,
        lowPrice: 112.9,
        lastPrice: 114.1,
        changePercent: 6.34,
        volume: 1128209,
        tradedValue: 1297363613e-1,
        tradeCount: 6950,
        marketCap: 1141e7
      }
    },
    {
      symbol: "4240",
      nameAr: "\u0633\u064A\u0646\u0648\u0645\u064A \u0631\u064A\u062A\u064A\u0644",
      nameEn: "AFG International Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0643\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Consumer Discretionary Distribution & Retail",
      warningFlag: "red",
      officialQuote: {
        openPrice: 12.3,
        highPrice: 12.41,
        lowPrice: 12.22,
        lastPrice: 12.36,
        changePercent: 0.49,
        volume: 388549,
        tradedValue: 479356814e-2,
        tradeCount: 1181,
        marketCap: 141851329728e-2
      }
    },
    {
      symbol: "4001",
      nameAr: "\u0623\u0633\u0648\u0627\u0642 \u0639 \u0627\u0644\u0639\u062B\u064A\u0645",
      nameEn: "Abdullah Al Othaim Markets Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Staples Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 5.25,
        highPrice: 5.25,
        lowPrice: 5.19,
        lastPrice: 5.21,
        changePercent: -0.76,
        volume: 671256,
        tradedValue: 350326238e-2,
        tradeCount: 1598,
        marketCap: 4689e6
      }
    },
    {
      symbol: "4006",
      nameAr: "\u0623\u0633\u0648\u0627\u0642 \u0627\u0644\u0645\u0632\u0631\u0639\u0629",
      nameEn: "Saudi Marketing Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Staples Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 12.8,
        highPrice: 12.85,
        lowPrice: 12.71,
        lastPrice: 12.85,
        changePercent: 0.47,
        volume: 19301,
        tradedValue: 246660.73,
        tradeCount: 176,
        marketCap: 57825e4
      }
    },
    {
      symbol: "4061",
      nameAr: "\u0623\u0646\u0639\u0627\u0645 \u0627\u0644\u0642\u0627\u0628\u0636\u0629",
      nameEn: "Anaam International Holding Group",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Staples Distribution & Retail",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 11.63,
        highPrice: 11.98,
        lowPrice: 11.45,
        lastPrice: 11.5,
        changePercent: -1.12,
        volume: 382647,
        tradedValue: 448592617e-2,
        tradeCount: 1357,
        marketCap: 36225e4
      }
    },
    {
      symbol: "4160",
      nameAr: "\u062B\u0645\u0627\u0631",
      nameEn: "Thimar Development Holding Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Staples Distribution & Retail",
      warningFlag: "red",
      officialQuote: {
        openPrice: 33.98,
        highPrice: 35.46,
        lowPrice: 33.8,
        lastPrice: 33.96,
        changePercent: 0.47,
        volume: 267269,
        tradedValue: 924911194e-2,
        tradeCount: 2084,
        marketCap: 22074e4
      }
    },
    {
      symbol: "4161",
      nameAr: "\u0628\u0646 \u062F\u0627\u0648\u062F",
      nameEn: "BinDawood Holding Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Staples Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 4.66,
        highPrice: 4.67,
        lowPrice: 4.61,
        lastPrice: 4.63,
        changePercent: -0.64,
        volume: 231428,
        tradedValue: 107357512e-2,
        tradeCount: 545,
        marketCap: 529209e4
      }
    },
    {
      symbol: "4162",
      nameAr: "\u0627\u0644\u0645\u0646\u062C\u0645",
      nameEn: "Almunajem Foods Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Staples Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 61.1,
        highPrice: 61.75,
        lowPrice: 60.95,
        lastPrice: 61.75,
        changePercent: 0.82,
        volume: 54617,
        tradedValue: 334183925e-2,
        tradeCount: 594,
        marketCap: 3705e6
      }
    },
    {
      symbol: "4163",
      nameAr: "\u0627\u0644\u062F\u0648\u0627\u0621",
      nameEn: "Aldawaa Medical Services Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Staples Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 41,
        highPrice: 41,
        lowPrice: 40.36,
        lastPrice: 40.36,
        changePercent: -1.32,
        volume: 81097,
        tradedValue: 329633512e-2,
        tradeCount: 856,
        marketCap: 34306e5
      }
    },
    {
      symbol: "4164",
      nameAr: "\u0627\u0644\u0646\u0647\u062F\u064A",
      nameEn: "Nahdi Medical Co.",
      sectorAr: "\u062A\u0648\u0632\u064A\u0639 \u0648\u062A\u062C\u0632\u0626\u0629 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643\u064A\u0629",
      sectorEn: "Consumer Staples Distribution & Retail",
      warningFlag: null,
      officialQuote: {
        openPrice: 90.15,
        highPrice: 91.85,
        lowPrice: 90,
        lastPrice: 91.2,
        changePercent: 1.33,
        volume: 138056,
        tradedValue: 1257920555e-2,
        tradeCount: 1135,
        marketCap: 11856e6
      }
    },
    {
      symbol: "2050",
      nameAr: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0635\u0627\u0641\u0648\u0644\u0627",
      nameEn: "Savola Group",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 26.1,
        highPrice: 26.24,
        lowPrice: 25.94,
        lastPrice: 26.1,
        changePercent: -0.38,
        volume: 543985,
        tradedValue: 1416409252e-2,
        tradeCount: 2773,
        marketCap: 783e7
      }
    },
    {
      symbol: "2100",
      nameAr: "\u0648\u0641\u0631\u0629",
      nameEn: "Wafrah for Industry and Development Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 21.45,
        highPrice: 22.31,
        lowPrice: 21.33,
        lastPrice: 21.33,
        changePercent: -0.33,
        volume: 368554,
        tradedValue: 80568743e-1,
        tradeCount: 1627,
        marketCap: 49381306965e-2
      }
    },
    {
      symbol: "2270",
      nameAr: "\u0633\u062F\u0627\u0641\u0643\u0648",
      nameEn: "Saudia Dairy and Foodstuff Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 212,
        highPrice: 213.2,
        lowPrice: 206.9,
        lastPrice: 207.5,
        changePercent: -1.89,
        volume: 19906,
        tradedValue: 41664232e-1,
        tradeCount: 847,
        marketCap: 674375e4
      }
    },
    {
      symbol: "2280",
      nameAr: "\u0627\u0644\u0645\u0631\u0627\u0639\u064A",
      nameEn: "Almarai Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 46.2,
        highPrice: 46.34,
        lowPrice: 45.76,
        lastPrice: 45.94,
        changePercent: -1.16,
        volume: 249802,
        tradedValue: 1149082766e-2,
        tradeCount: 1559,
        marketCap: 4594e7
      }
    },
    {
      symbol: "2281",
      nameAr: "\u062A\u0646\u0645\u064A\u0629",
      nameEn: "Tanmiah Food Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 60.15,
        highPrice: 60.45,
        lowPrice: 59.05,
        lastPrice: 59.35,
        changePercent: -1.33,
        volume: 77566,
        tradedValue: 46325675e-1,
        tradeCount: 795,
        marketCap: 1187e6
      }
    },
    {
      symbol: "2282",
      nameAr: "\u0646\u0642\u064A",
      nameEn: "Naqi Water Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 55.3,
        highPrice: 56.4,
        lowPrice: 55,
        lastPrice: 56.4,
        changePercent: 1.44,
        volume: 24307,
        tradedValue: 135203785e-2,
        tradeCount: 321,
        marketCap: 1128e6
      }
    },
    {
      symbol: "2283",
      nameAr: "\u0627\u0644\u0645\u0637\u0627\u062D\u0646 \u0627\u0644\u0623\u0648\u0644\u0649",
      nameEn: "First Milling Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 51.65,
        highPrice: 52,
        lowPrice: 51.5,
        lastPrice: 51.55,
        changePercent: -0.39,
        volume: 16331,
        tradedValue: 844847.9,
        tradeCount: 306,
        marketCap: 2861025e3
      }
    },
    {
      symbol: "2284",
      nameAr: "\u0627\u0644\u0645\u0637\u0627\u062D\u0646 \u0627\u0644\u062D\u062F\u064A\u062B\u0629",
      nameEn: "Modern Mills for Food Products Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 28.38,
        highPrice: 28.6,
        lowPrice: 28.34,
        lastPrice: 28.42,
        changePercent: 0.14,
        volume: 38908,
        tradedValue: 110773802e-2,
        tradeCount: 582,
        marketCap: 2325665440
      }
    },
    {
      symbol: "2285",
      nameAr: "\u0627\u0644\u0645\u0637\u0627\u062D\u0646 \u0627\u0644\u0639\u0631\u0628\u064A\u0629",
      nameEn: "Arabian Mills for Food Products Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 45.86,
        highPrice: 46.26,
        lowPrice: 45.84,
        lastPrice: 46.08,
        changePercent: -0.39,
        volume: 30547,
        tradedValue: 140657282e-2,
        tradeCount: 556,
        marketCap: 236459547648e-2
      }
    },
    {
      symbol: "2286",
      nameAr: "\u0627\u0644\u0645\u0637\u0627\u062D\u0646 \u0627\u0644\u0631\u0627\u0628\u0639\u0629",
      nameEn: "Fourth Milling Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 4.08,
        highPrice: 4.08,
        lowPrice: 4.05,
        lastPrice: 4.08,
        changePercent: 0,
        volume: 304846,
        tradedValue: 123900177e-2,
        tradeCount: 641,
        marketCap: 22032e5
      }
    },
    {
      symbol: "2287",
      nameAr: "\u0625\u0646\u062A\u0627\u062C",
      nameEn: "Arabian Company for Agricultural and Industrial Investment",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 27.5,
        highPrice: 27.68,
        lowPrice: 26.98,
        lastPrice: 27,
        changePercent: -1.24,
        volume: 224039,
        tradedValue: 609358222e-2,
        tradeCount: 1263,
        marketCap: 81e7
      }
    },
    {
      symbol: "2288",
      nameAr: "\u0646\u0641\u0648\u0630",
      nameEn: "Nofoth Food Products Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.59,
        highPrice: 6.61,
        lowPrice: 6.39,
        lastPrice: 6.43,
        changePercent: -1.53,
        volume: 115326,
        tradedValue: 742091.56,
        tradeCount: 345,
        marketCap: 61728e4
      }
    },
    {
      symbol: "4080",
      nameAr: "\u0633\u0646\u0627\u062F \u0627\u0644\u0642\u0627\u0628\u0636\u0629",
      nameEn: "Sinad Holding Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 8.37,
        highPrice: 8.37,
        lowPrice: 8.21,
        lastPrice: 8.22,
        changePercent: -0.96,
        volume: 72811,
        tradedValue: 600493.83,
        tradeCount: 421,
        marketCap: 103891666758e-2
      }
    },
    {
      symbol: "6001",
      nameAr: "\u062D\u0644\u0648\u0627\u0646\u064A \u0625\u062E\u0648\u0627\u0646",
      nameEn: "Halwani Bros. Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 31,
        highPrice: 31.5,
        lowPrice: 31,
        lastPrice: 31.4,
        changePercent: 1.49,
        volume: 25461,
        tradedValue: 795331.46,
        tradeCount: 231,
        marketCap: 1110214353
      }
    },
    {
      symbol: "6010",
      nameAr: "\u0646\u0627\u062F\u0643",
      nameEn: "National Agricultural Development Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 14.8,
        highPrice: 14.96,
        lowPrice: 14.5,
        lastPrice: 14.52,
        changePercent: -2.35,
        volume: 868971,
        tradedValue: 127983095e-1,
        tradeCount: 2760,
        marketCap: 4379812800
      }
    },
    {
      symbol: "6020",
      nameAr: "\u062C\u0627\u0643\u0648",
      nameEn: "Al Gassim Investment Holding Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 12.3,
        highPrice: 12.41,
        lowPrice: 12,
        lastPrice: 12.06,
        changePercent: -1.95,
        volume: 85569,
        tradedValue: 104584806e-2,
        tradeCount: 285,
        marketCap: 3618e5
      }
    },
    {
      symbol: "6040",
      nameAr: "\u062A\u0628\u0648\u0643 \u0627\u0644\u0632\u0631\u0627\u0639\u064A\u0629",
      nameEn: "Tabuk Agricultural Development Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: "red",
      officialQuote: {
        openPrice: 7,
        highPrice: 7.2,
        lowPrice: 6.7,
        lastPrice: 6.77,
        changePercent: -3.29,
        volume: 580037,
        tradedValue: 405698534e-2,
        tradeCount: 1506,
        marketCap: 265226259
      }
    },
    {
      symbol: "6050",
      nameAr: "\u0627\u0644\u0623\u0633\u0645\u0627\u0643",
      nameEn: "Saudi Fisheries Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 65.8,
        highPrice: 71.1,
        lowPrice: 64.9,
        lastPrice: 67.5,
        changePercent: 3.85,
        volume: 1324411,
        tradedValue: 9086524425e-2,
        tradeCount: 8091,
        marketCap: 452155770
      }
    },
    {
      symbol: "6060",
      nameAr: "\u0627\u0644\u0634\u0631\u0642\u064A\u0629 \u0644\u0644\u062A\u0646\u0645\u064A\u0629",
      nameEn: "Ash-Sharqiyah Development Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 14.8,
        highPrice: 15.48,
        lowPrice: 14.75,
        lastPrice: 14.82,
        changePercent: 0.47,
        volume: 1258461,
        tradedValue: 1903016119e-2,
        tradeCount: 2406,
        marketCap: 4446e5
      }
    },
    {
      symbol: "6070",
      nameAr: "\u0627\u0644\u062C\u0648\u0641",
      nameEn: "Al-Jouf Agricultural Development Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: null,
      officialQuote: {
        openPrice: 41.3,
        highPrice: 41.86,
        lowPrice: 41.3,
        lastPrice: 41.76,
        changePercent: 1.21,
        volume: 48391,
        tradedValue: 201658902e-2,
        tradeCount: 221,
        marketCap: 12528e5
      }
    },
    {
      symbol: "6090",
      nameAr: "\u062C\u0627\u0632\u0627\u062F\u0643\u0648",
      nameEn: "Jazan Development and Investment Co.",
      sectorAr: "\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0623\u063A\u0630\u064A\u0629",
      sectorEn: "Food & Beverages",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 8.02,
        highPrice: 8.17,
        lowPrice: 8,
        lastPrice: 8,
        changePercent: -1.6,
        volume: 71853,
        tradedValue: 579598.43,
        tradeCount: 229,
        marketCap: 4e8
      }
    },
    {
      symbol: "4165",
      nameAr: "\u0627\u0644\u0645\u0627\u062C\u062F \u0644\u0644\u0639\u0648\u062F",
      nameEn: "Al Majed Oud Co.",
      sectorAr: "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0645\u0646\u0632\u0644\u064A\u0629 \u0648\u0627\u0644\u0634\u062E\u0635\u064A\u0629",
      sectorEn: "Household & Personal Products",
      warningFlag: null,
      officialQuote: {
        openPrice: 118,
        highPrice: 120.9,
        lowPrice: 118,
        lastPrice: 120.9,
        changePercent: 2.28,
        volume: 55361,
        tradedValue: 66466324e-1,
        tradeCount: 814,
        marketCap: 30225e5
      }
    },
    {
      symbol: "2140",
      nameAr: "\u0623\u064A\u0627\u0646",
      nameEn: "AYYAN Investment Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.5,
        highPrice: 10.5,
        lowPrice: 10.27,
        lastPrice: 10.3,
        changePercent: -1.9,
        volume: 172322,
        tradedValue: 178217896e-2,
        tradeCount: 412,
        marketCap: 10365541784e-1
      }
    },
    {
      symbol: "2230",
      nameAr: "\u0627\u0644\u0643\u064A\u0645\u064A\u0627\u0626\u064A\u0629",
      nameEn: "Saudi Chemical Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 8.44,
        highPrice: 8.49,
        lowPrice: 8.25,
        lastPrice: 8.26,
        changePercent: -2.13,
        volume: 2844808,
        tradedValue: 2381329313e-2,
        tradeCount: 2215,
        marketCap: 6964832e3
      }
    },
    {
      symbol: "4002",
      nameAr: "\u0627\u0644\u0645\u0648\u0627\u0633\u0627\u0629",
      nameEn: "Mouwasat Medical Services Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 60.5,
        highPrice: 60.5,
        lowPrice: 59.45,
        lastPrice: 59.65,
        changePercent: -1.4,
        volume: 314037,
        tradedValue: 1875550505e-2,
        tradeCount: 2438,
        marketCap: 1193e7
      }
    },
    {
      symbol: "4004",
      nameAr: "\u062F\u0644\u0647 \u0627\u0644\u0635\u062D\u064A\u0629",
      nameEn: "Dallah Healthcare Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 104.5,
        highPrice: 106,
        lowPrice: 104.1,
        lastPrice: 105,
        changePercent: 0.48,
        volume: 59296,
        tradedValue: 62318097e-1,
        tradeCount: 959,
        marketCap: 10665350745
      }
    },
    {
      symbol: "4005",
      nameAr: "\u0631\u0639\u0627\u064A\u0629",
      nameEn: "National Medical Care Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 102.3,
        highPrice: 107.1,
        lowPrice: 102.3,
        lastPrice: 103.4,
        changePercent: 0.68,
        volume: 152075,
        tradedValue: 159404417e-1,
        tradeCount: 2246,
        marketCap: 463749e4
      }
    },
    {
      symbol: "4007",
      nameAr: "\u0627\u0644\u062D\u0645\u0627\u062F\u064A",
      nameEn: "Al Hammadi Holding",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 26.68,
        highPrice: 26.86,
        lowPrice: 26.44,
        lastPrice: 26.6,
        changePercent: 0,
        volume: 103353,
        tradedValue: 275934064e-2,
        tradeCount: 449,
        marketCap: 4256e6
      }
    },
    {
      symbol: "4009",
      nameAr: "\u0627\u0644\u0633\u0639\u0648\u062F\u064A \u0627\u0644\u0623\u0644\u0645\u0627\u0646\u064A \u0627\u0644\u0635\u062D\u064A\u0629",
      nameEn: "Middle East Healthcare Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 30.5,
        highPrice: 30.64,
        lowPrice: 30.18,
        lastPrice: 30.46,
        changePercent: -0.13,
        volume: 245500,
        tradedValue: 74797196e-1,
        tradeCount: 980,
        marketCap: 2803538400
      }
    },
    {
      symbol: "4013",
      nameAr: "\u0633\u0644\u064A\u0645\u0627\u0646 \u0627\u0644\u062D\u0628\u064A\u0628",
      nameEn: "Dr. Sulaiman Al Habib Medical Services Group",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 215.3,
        highPrice: 215.9,
        lowPrice: 214,
        lastPrice: 214.7,
        changePercent: -0.28,
        volume: 62475,
        tradedValue: 134011015e-1,
        tradeCount: 1119,
        marketCap: 75145e6
      }
    },
    {
      symbol: "4014",
      nameAr: "\u062F\u0627\u0631 \u0627\u0644\u0645\u0639\u062F\u0627\u062A",
      nameEn: "Scientific and Medical Equipment House Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 27.84,
        highPrice: 27.88,
        lowPrice: 27.3,
        lastPrice: 27.38,
        changePercent: -1.65,
        volume: 21640,
        tradedValue: 598249.76,
        tradeCount: 273,
        marketCap: 8214e5
      }
    },
    {
      symbol: "4017",
      nameAr: "\u0641\u0642\u064A\u0647 \u0627\u0644\u0637\u0628\u064A\u0629",
      nameEn: "Dr. Soliman Abdel Kader Fakeeh Hospital Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 34.36,
        highPrice: 36,
        lowPrice: 34.08,
        lastPrice: 34.68,
        changePercent: 0.99,
        volume: 86971,
        tradedValue: 301143038e-2,
        tradeCount: 1196,
        marketCap: 804576e4
      }
    },
    {
      symbol: "4018",
      nameAr: "\u0627\u0644\u0645\u0648\u0633\u0649",
      nameEn: "Almoosa Health Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 115.8,
        highPrice: 117.8,
        lowPrice: 115.7,
        lastPrice: 116.9,
        changePercent: 1.21,
        volume: 8471,
        tradedValue: 989414.5,
        tradeCount: 331,
        marketCap: 5179088502
      }
    },
    {
      symbol: "4019",
      nameAr: "\u0627\u0633 \u0627\u0645 \u0633\u064A \u0644\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      nameEn: "Specialized Medical Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 15.56,
        highPrice: 15.88,
        lowPrice: 15.56,
        lastPrice: 15.61,
        changePercent: 0.32,
        volume: 348862,
        tradedValue: 545775392e-2,
        tradeCount: 810,
        marketCap: 39025e5
      }
    },
    {
      symbol: "4021",
      nameAr: "\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u0643\u0646\u062F\u064A \u0627\u0644\u0637\u0628\u064A",
      nameEn: "Canadian Medical Center Co.",
      sectorAr: "\u0645\u0639\u062F\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629",
      sectorEn: "Health Care Equipment & Svc",
      warningFlag: null,
      officialQuote: {
        openPrice: 5.36,
        highPrice: 5.38,
        lowPrice: 5.25,
        lastPrice: 5.26,
        changePercent: -1.68,
        volume: 547096,
        tradedValue: 290031072e-2,
        tradeCount: 805,
        marketCap: 40502e4
      }
    },
    {
      symbol: "2070",
      nameAr: "\u0627\u0644\u062F\u0648\u0627\u0626\u064A\u0629",
      nameEn: "Saudi Pharmaceutical Industries and Medical Appliances Corp.",
      sectorAr: "\u0627\u0644\u0623\u062F\u0648\u064A\u0629 \u0648\u0627\u0644\u062A\u0642\u0646\u064A\u0627\u062A \u0627\u0644\u062D\u064A\u0648\u064A\u0629 \u0648\u0639\u0644\u0648\u0645 \u0627\u0644\u062D\u064A\u0627\u0629",
      sectorEn: "Pharma, Biotech & Life Science",
      warningFlag: null,
      officialQuote: {
        openPrice: 29.2,
        highPrice: 29.56,
        lowPrice: 29.12,
        lastPrice: 29.42,
        changePercent: 0.2,
        volume: 12169383,
        tradedValue: 33137719666e-2,
        tradeCount: 1313,
        marketCap: 35304e5
      }
    },
    {
      symbol: "4015",
      nameAr: "\u062C\u0645\u062C\u0648\u0645 \u0641\u0627\u0631\u0645\u0627",
      nameEn: "Jamjoom Pharmaceuticals Factory Co.",
      sectorAr: "\u0627\u0644\u0623\u062F\u0648\u064A\u0629 \u0648\u0627\u0644\u062A\u0642\u0646\u064A\u0627\u062A \u0627\u0644\u062D\u064A\u0648\u064A\u0629 \u0648\u0639\u0644\u0648\u0645 \u0627\u0644\u062D\u064A\u0627\u0629",
      sectorEn: "Pharma, Biotech & Life Science",
      warningFlag: null,
      officialQuote: {
        openPrice: 147,
        highPrice: 147.2,
        lowPrice: 145.8,
        lastPrice: 147.1,
        changePercent: 0.07,
        volume: 27180,
        tradedValue: 39870088e-1,
        tradeCount: 681,
        marketCap: 10297e6
      }
    },
    {
      symbol: "4016",
      nameAr: "\u0623\u0641\u0627\u0644\u0648\u0646 \u0641\u0627\u0631\u0645\u0627",
      nameEn: "Middle East Pharmaceutical Industries Co.",
      sectorAr: "\u0627\u0644\u0623\u062F\u0648\u064A\u0629 \u0648\u0627\u0644\u062A\u0642\u0646\u064A\u0627\u062A \u0627\u0644\u062D\u064A\u0648\u064A\u0629 \u0648\u0639\u0644\u0648\u0645 \u0627\u0644\u062D\u064A\u0627\u0629",
      sectorEn: "Pharma, Biotech & Life Science",
      warningFlag: null,
      officialQuote: {
        openPrice: 60.55,
        highPrice: 60.8,
        lowPrice: 59.75,
        lastPrice: 59.75,
        changePercent: -1.32,
        volume: 37356,
        tradedValue: 22455451e-1,
        tradeCount: 589,
        marketCap: 209125e4
      }
    },
    {
      symbol: "1010",
      nameAr: "\u0627\u0644\u0631\u064A\u0627\u0636",
      nameEn: "Riyad Bank",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 21.17,
        highPrice: 21.29,
        lowPrice: 20.82,
        lastPrice: 20.9,
        changePercent: -0.81,
        volume: 5543647,
        tradedValue: 11677878613e-2,
        tradeCount: 5861,
        marketCap: 836e8
      }
    },
    {
      symbol: "1020",
      nameAr: "\u0627\u0644\u062C\u0632\u064A\u0631\u0629",
      nameEn: "Bank Aljazira",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.82,
        highPrice: 11.89,
        lowPrice: 11.73,
        lastPrice: 11.74,
        changePercent: -0.68,
        volume: 1589944,
        tradedValue: 18778146,
        tradeCount: 2676,
        marketCap: 15041875e3
      }
    },
    {
      symbol: "1030",
      nameAr: "\u0627\u0644\u0625\u0633\u062A\u062B\u0645\u0627\u0631",
      nameEn: "Saudi Investment Bank",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.65,
        highPrice: 13.75,
        lowPrice: 13.58,
        lastPrice: 13.7,
        changePercent: 0.37,
        volume: 485345,
        tradedValue: 663725225e-2,
        tradeCount: 1192,
        marketCap: 17125e6
      }
    },
    {
      symbol: "1050",
      nameAr: "\u0628\u064A \u0627\u0633 \u0627\u0641",
      nameEn: "Banque Saudi Fransi",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 20.15,
        highPrice: 20.59,
        lowPrice: 19.99,
        lastPrice: 20.48,
        changePercent: 2.14,
        volume: 1953429,
        tradedValue: 3986495314e-2,
        tradeCount: 3989,
        marketCap: 512e8
      }
    },
    {
      symbol: "1060",
      nameAr: "\u0627\u0644\u0623\u0648\u0644",
      nameEn: "Saudi Awwal Bank",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 32.66,
        highPrice: 32.84,
        lowPrice: 32.26,
        lastPrice: 32.3,
        changePercent: -0.8,
        volume: 1796821,
        tradedValue: 583920415e-1,
        tradeCount: 3026,
        marketCap: 663698630606e-1
      }
    },
    {
      symbol: "1080",
      nameAr: "\u0627\u0644\u0639\u0631\u0628\u064A",
      nameEn: "Arab National Bank",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 21.73,
        highPrice: 21.88,
        lowPrice: 21.5,
        lastPrice: 21.73,
        changePercent: 0.09,
        volume: 1735317,
        tradedValue: 3764856451e-2,
        tradeCount: 2929,
        marketCap: 4346e7
      }
    },
    {
      symbol: "1120",
      nameAr: "\u0627\u0644\u0631\u0627\u062C\u062D\u064A",
      nameEn: "Al Rajhi Bank",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 65.4,
        highPrice: 65.5,
        lowPrice: 63.8,
        lastPrice: 64,
        changePercent: -1.84,
        volume: 7166583,
        tradedValue: 46045328605e-2,
        tradeCount: 14872,
        marketCap: 384e9
      }
    },
    {
      symbol: "1140",
      nameAr: "\u0627\u0644\u0628\u0644\u0627\u062F",
      nameEn: "Bank Albilad",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 24.6,
        highPrice: 24.7,
        lowPrice: 24.28,
        lastPrice: 24.4,
        changePercent: -0.37,
        volume: 1667366,
        tradedValue: 4079812614e-2,
        tradeCount: 3148,
        marketCap: 366e8
      }
    },
    {
      symbol: "1150",
      nameAr: "\u0627\u0644\u0625\u0646\u0645\u0627\u0621",
      nameEn: "Alinma Bank",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 24.28,
        highPrice: 24.3,
        lowPrice: 23.51,
        lastPrice: 23.51,
        changePercent: -4.43,
        volume: 14102845,
        tradedValue: 33460454411e-2,
        tradeCount: 19548,
        marketCap: 7053e7
      }
    },
    {
      symbol: "1180",
      nameAr: "\u0627\u0644\u0623\u0647\u0644\u064A",
      nameEn: "The Saudi National Bank",
      sectorAr: "\u0627\u0644\u0628\u0646\u0648\u0643",
      sectorEn: "Banks",
      warningFlag: null,
      officialQuote: {
        openPrice: 38.96,
        highPrice: 39.36,
        lowPrice: 38.52,
        lastPrice: 38.8,
        changePercent: 0.62,
        volume: 8038675,
        tradedValue: 31279773748e-2,
        tradeCount: 8523,
        marketCap: 2328e8
      }
    },
    {
      symbol: "1111",
      nameAr: "\u0645\u062C\u0645\u0648\u0639\u0629 \u062A\u062F\u0627\u0648\u0644",
      nameEn: "Saudi Tadawul Group Holding Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 123.9,
        highPrice: 124.5,
        lowPrice: 121.9,
        lastPrice: 123.5,
        changePercent: -0.16,
        volume: 185289,
        tradedValue: 227852905e-1,
        tradeCount: 1730,
        marketCap: 1482e7
      }
    },
    {
      symbol: "1182",
      nameAr: "\u0623\u0645\u0644\u0627\u0643",
      nameEn: "Amlak International Finance Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 8.39,
        highPrice: 8.45,
        lowPrice: 8.35,
        lastPrice: 8.4,
        changePercent: 0.12,
        volume: 128294,
        tradedValue: 107829731e-2,
        tradeCount: 560,
        marketCap: 85617e4
      }
    },
    {
      symbol: "1183",
      nameAr: "\u0633\u0647\u0644",
      nameEn: "SHL Finance Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 14.8,
        highPrice: 14.97,
        lowPrice: 14.58,
        lastPrice: 14.58,
        changePercent: -1.15,
        volume: 28264,
        tradedValue: 416308.75,
        tradeCount: 301,
        marketCap: 1458e6
      }
    },
    {
      symbol: "2120",
      nameAr: "\u0645\u062A\u0637\u0648\u0631\u0629",
      nameEn: "Saudi Advanced Industries Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 16.22,
        highPrice: 16.22,
        lowPrice: 15.6,
        lastPrice: 15.65,
        changePercent: -3.51,
        volume: 270687,
        tradedValue: 431402014e-2,
        tradeCount: 787,
        marketCap: 939e6
      }
    },
    {
      symbol: "4081",
      nameAr: "\u0627\u0644\u0646\u0627\u064A\u0641\u0627\u062A",
      nameEn: "Nayifat Finance Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 9.56,
        highPrice: 9.58,
        lowPrice: 9.39,
        lastPrice: 9.4,
        changePercent: -1.78,
        volume: 127355,
        tradedValue: 120854268e-2,
        tradeCount: 507,
        marketCap: 1128e6
      }
    },
    {
      symbol: "4082",
      nameAr: "\u0645\u0631\u0646\u0629",
      nameEn: "Morabaha Marina Financing Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 7.63,
        highPrice: 7.72,
        lowPrice: 7.5,
        lastPrice: 7.5,
        changePercent: -3.23,
        volume: 24098,
        tradedValue: 182824.92,
        tradeCount: 211,
        marketCap: 535714290
      }
    },
    {
      symbol: "4083",
      nameAr: "\u062A\u0633\u0647\u064A\u0644",
      nameEn: "United International Holding Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 29.62,
        highPrice: 29.72,
        lowPrice: 29.18,
        lastPrice: 29.18,
        changePercent: -1.55,
        volume: 204067,
        tradedValue: 599621738e-2,
        tradeCount: 1022,
        marketCap: 21885e5
      }
    },
    {
      symbol: "4084",
      nameAr: "\u062F\u0631\u0627\u064A\u0629",
      nameEn: "Derayah Financial Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 21.93,
        highPrice: 22.16,
        lowPrice: 21.93,
        lastPrice: 22.1,
        changePercent: 0.27,
        volume: 438101,
        tradedValue: 967709392e-2,
        tradeCount: 931,
        marketCap: 55191478095e-1
      }
    },
    {
      symbol: "4130",
      nameAr: "\u062F\u0631\u0628 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Saudi Darb Investment Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 2.19,
        highPrice: 2.23,
        lowPrice: 2.14,
        lastPrice: 2.15,
        changePercent: -1.38,
        volume: 11440568,
        tradedValue: 2496448587e-2,
        tradeCount: 2912,
        marketCap: 469334250
      }
    },
    {
      symbol: "4280",
      nameAr: "\u0627\u0644\u0645\u0645\u0644\u0643\u0629",
      nameEn: "Kingdom Holding Co.",
      sectorAr: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
      sectorEn: "Financial Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.29,
        highPrice: 11.3,
        lowPrice: 11.12,
        lastPrice: 11.26,
        changePercent: 0.36,
        volume: 506429,
        tradedValue: 568029735e-2,
        tradeCount: 1015,
        marketCap: 41728234698
      }
    },
    {
      symbol: "8010",
      nameAr: "\u0627\u0644\u062A\u0639\u0627\u0648\u0646\u064A\u0629",
      nameEn: "The Company for Cooperative Insurance",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 138,
        highPrice: 139.2,
        lowPrice: 137.1,
        lastPrice: 138.7,
        changePercent: 0.95,
        volume: 116773,
        tradedValue: 16159604,
        tradeCount: 1327,
        marketCap: 20805e6
      }
    },
    {
      symbol: "8012",
      nameAr: "\u062C\u0632\u064A\u0631\u0629 \u062A\u0643\u0627\u0641\u0644",
      nameEn: "Aljazira Takaful Taawuni Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.95,
        highPrice: 12.08,
        lowPrice: 11.87,
        lastPrice: 12.08,
        changePercent: -0.08,
        volume: 49282,
        tradedValue: 590768,
        tradeCount: 312,
        marketCap: 79728e4
      }
    },
    {
      symbol: "8020",
      nameAr: "\u0645\u0644\u0627\u0630 \u0644\u0644\u062A\u0623\u0645\u064A\u0646",
      nameEn: "Malath Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.35,
        highPrice: 10.41,
        lowPrice: 10.2,
        lastPrice: 10.31,
        changePercent: -0.1,
        volume: 127951,
        tradedValue: 131616162e-2,
        tradeCount: 263,
        marketCap: 5155e5
      }
    },
    {
      symbol: "8030",
      nameAr: "\u0645\u064A\u062F\u063A\u0644\u0641 \u0644\u0644\u062A\u0623\u0645\u064A\u0646",
      nameEn: "The Mediterranean and Gulf Insurance and Reinsurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 15.14,
        highPrice: 15.44,
        lowPrice: 15.12,
        lastPrice: 15.17,
        changePercent: -0.46,
        volume: 380409,
        tradedValue: 578932045e-2,
        tradeCount: 866,
        marketCap: 209585525198e-2
      }
    },
    {
      symbol: "8040",
      nameAr: "\u0645\u062A\u0643\u0627\u0645\u0644\u0629",
      nameEn: "Mutakamela Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.4,
        highPrice: 13.89,
        lowPrice: 12.68,
        lastPrice: 13.5,
        changePercent: 0.75,
        volume: 965807,
        tradedValue: 1270408236e-2,
        tradeCount: 2387,
        marketCap: 81e7
      }
    },
    {
      symbol: "8050",
      nameAr: "\u0633\u0644\u0627\u0645\u0629",
      nameEn: "Salama Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 8.73,
        highPrice: 8.78,
        lowPrice: 8.6,
        lastPrice: 8.62,
        changePercent: -1.37,
        volume: 123995,
        tradedValue: 107721253e-2,
        tradeCount: 327,
        marketCap: 2586e5
      }
    },
    {
      symbol: "8060",
      nameAr: "\u0648\u0644\u0627\u0621",
      nameEn: "Walaa Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 9.94,
        highPrice: 10.02,
        lowPrice: 9.9,
        lastPrice: 9.93,
        changePercent: -0.1,
        volume: 271647,
        tradedValue: 270510116e-2,
        tradeCount: 554,
        marketCap: 126665416725e-2
      }
    },
    {
      symbol: "8070",
      nameAr: "\u0627\u0644\u062F\u0631\u0639 \u0627\u0644\u0639\u0631\u0628\u064A",
      nameEn: "Arabian Shield Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.95,
        highPrice: 11.95,
        lowPrice: 11.76,
        lastPrice: 11.82,
        changePercent: -0.84,
        volume: 74755,
        tradedValue: 885744.81,
        tradeCount: 264,
        marketCap: 9434167869e-1
      }
    },
    {
      symbol: "8100",
      nameAr: "\u0633\u0627\u064A\u0643\u0648",
      nameEn: "Saudi Arabian Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.4,
        highPrice: 10.72,
        lowPrice: 10.33,
        lastPrice: 10.52,
        changePercent: 0.77,
        volume: 231505,
        tradedValue: 242894763e-2,
        tradeCount: 892,
        marketCap: 3156e5
      }
    },
    {
      symbol: "8120",
      nameAr: "\u0625\u062A\u062D\u0627\u062F \u0627\u0644\u062E\u0644\u064A\u062C \u0627\u0644\u0623\u0647\u0644\u064A\u0629",
      nameEn: "Gulf Union Alahlia Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 14.12,
        highPrice: 14.26,
        lowPrice: 14.07,
        lastPrice: 14.22,
        changePercent: 0.71,
        volume: 61460,
        tradedValue: 870116.95,
        tradeCount: 303,
        marketCap: 65262587616e-2
      }
    },
    {
      symbol: "8150",
      nameAr: "\u0623\u0633\u064A\u062C",
      nameEn: "Allied Cooperative Insurance Group",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: "red",
      officialQuote: {
        openPrice: 7,
        highPrice: 7.09,
        lowPrice: 6.89,
        lastPrice: 6.91,
        changePercent: -1.99,
        volume: 273231,
        tradedValue: 190957031e-2,
        tradeCount: 534,
        marketCap: 201081e3
      }
    },
    {
      symbol: "8160",
      nameAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646 \u0627\u0644\u0639\u0631\u0628\u064A\u0629",
      nameEn: "Arabia Insurance Cooperative Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 8.42,
        highPrice: 8.42,
        lowPrice: 8.3,
        lastPrice: 8.41,
        changePercent: -0.12,
        volume: 53782,
        tradedValue: 447894.5,
        tradeCount: 140,
        marketCap: 44573e4
      }
    },
    {
      symbol: "8170",
      nameAr: "\u0627\u0644\u0627\u062A\u062D\u0627\u062F",
      nameEn: "Al-Etihad Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: "orange",
      officialQuote: {
        openPrice: 7.27,
        highPrice: 7.45,
        lowPrice: 6.87,
        lastPrice: 7.1,
        changePercent: -4.05,
        volume: 1734363,
        tradedValue: 1228009616e-2,
        tradeCount: 2399,
        marketCap: 355e6
      }
    },
    {
      symbol: "8180",
      nameAr: "\u0627\u0644\u0635\u0642\u0631 \u0644\u0644\u062A\u0623\u0645\u064A\u0646",
      nameEn: "Al Sagr Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.2,
        highPrice: 11.26,
        lowPrice: 10.97,
        lastPrice: 11.07,
        changePercent: -0.45,
        volume: 119864,
        tradedValue: 133488866e-2,
        tradeCount: 281,
        marketCap: 3321e5
      }
    },
    {
      symbol: "8190",
      nameAr: "\u0627\u0644\u0645\u062A\u062D\u062F\u0629 \u0644\u0644\u062A\u0623\u0645\u064A\u0646",
      nameEn: "United Cooperative Assurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: "red",
      officialQuote: {
        openPrice: 3.21,
        highPrice: 3.23,
        lowPrice: 3.13,
        lastPrice: 3.13,
        changePercent: -2.49,
        volume: 184446,
        tradedValue: 587430.76,
        tradeCount: 364,
        marketCap: 1252e5
      }
    },
    {
      symbol: "8200",
      nameAr: "\u0627\u0644\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Saudi Reinsurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 25.82,
        highPrice: 26.34,
        lowPrice: 25.82,
        lastPrice: 25.9,
        changePercent: -0.77,
        volume: 149673,
        tradedValue: 390266806e-2,
        tradeCount: 911,
        marketCap: 4398079e3
      }
    },
    {
      symbol: "8210",
      nameAr: "\u0628\u0648\u0628\u0627 \u0627\u0644\u0639\u0631\u0628\u064A\u0629",
      nameEn: "Bupa Arabia for Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 163,
        highPrice: 165.6,
        lowPrice: 161.3,
        lastPrice: 164.8,
        changePercent: 1.1,
        volume: 143596,
        tradedValue: 234692925e-1,
        tradeCount: 2283,
        marketCap: 2472e7
      }
    },
    {
      symbol: "8230",
      nameAr: "\u062A\u0643\u0627\u0641\u0644 \u0627\u0644\u0631\u0627\u062C\u062D\u064A",
      nameEn: "Al-Rajhi Company for Cooperative Insurance",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 49.2,
        highPrice: 49.86,
        lowPrice: 48.72,
        lastPrice: 49.34,
        changePercent: 0.73,
        volume: 294220,
        tradedValue: 145399444e-1,
        tradeCount: 1591,
        marketCap: 9868e6
      }
    },
    {
      symbol: "8240",
      nameAr: "\u062A\u0652\u0634\u0628",
      nameEn: "CHUBB Arabia Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 17.69,
        highPrice: 17.75,
        lowPrice: 17.5,
        lastPrice: 17.51,
        changePercent: -0.45,
        volume: 141454,
        tradedValue: 249258576e-2,
        tradeCount: 558,
        marketCap: 7004e5
      }
    },
    {
      symbol: "8250",
      nameAr: "\u062C\u064A \u0622\u064A \u062C\u064A",
      nameEn: "Gulf Insurance Group",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 32.2,
        highPrice: 34.44,
        lowPrice: 32.18,
        lastPrice: 34,
        changePercent: 5.92,
        volume: 586838,
        tradedValue: 1984062308e-2,
        tradeCount: 2070,
        marketCap: 1785e6
      }
    },
    {
      symbol: "8260",
      nameAr: "\u0627\u0644\u062E\u0644\u064A\u062C\u064A\u0629 \u0627\u0644\u0639\u0627\u0645\u0629",
      nameEn: "Gulf General Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: "red",
      officialQuote: {
        openPrice: 3.84,
        highPrice: 3.86,
        lowPrice: 3.76,
        lastPrice: 3.78,
        changePercent: -0.79,
        volume: 363237,
        tradedValue: 138339935e-2,
        tradeCount: 295,
        marketCap: 1134e5
      }
    },
    {
      symbol: "8280",
      nameAr: "\u0644\u064A\u0641\u0627",
      nameEn: "LIVA Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 14.4,
        highPrice: 15.94,
        lowPrice: 13.51,
        lastPrice: 15.17,
        changePercent: 3.62,
        volume: 2234452,
        tradedValue: 3259668021e-2,
        tradeCount: 5467,
        marketCap: 6068e5
      }
    },
    {
      symbol: "8300",
      nameAr: "\u0627\u0644\u0648\u0637\u0646\u064A\u0629",
      nameEn: "Wataniya Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 12.52,
        highPrice: 12.7,
        lowPrice: 12.5,
        lastPrice: 12.54,
        changePercent: -0.48,
        volume: 262215,
        tradedValue: 33000304e-1,
        tradeCount: 400,
        marketCap: 5016e5
      }
    },
    {
      symbol: "8310",
      nameAr: "\u0623\u0645\u0627\u0646\u0629 \u0644\u0644\u062A\u0623\u0645\u064A\u0646",
      nameEn: "Amana Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: "orange",
      officialQuote: {
        openPrice: 7.21,
        highPrice: 7.3,
        lowPrice: 6.96,
        lastPrice: 6.96,
        changePercent: -2.66,
        volume: 536988,
        tradedValue: 380869181e-2,
        tradeCount: 769,
        marketCap: 29928e4
      }
    },
    {
      symbol: "8311",
      nameAr: "\u0639\u0646\u0627\u064A\u0629",
      nameEn: "Saudi Enaya Cooperative Insurance Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 9.6,
        highPrice: 9.72,
        lowPrice: 8.81,
        lastPrice: 8.96,
        changePercent: -5.58,
        volume: 1041744,
        tradedValue: 950943473e-2,
        tradeCount: 2236,
        marketCap: 20608e4
      }
    },
    {
      symbol: "8313",
      nameAr: "\u0631\u0633\u0646",
      nameEn: "Rasan Information Technology Co.",
      sectorAr: "\u0627\u0644\u062A\u0623\u0645\u064A\u0646",
      sectorEn: "Insurance",
      warningFlag: null,
      officialQuote: {
        openPrice: 137,
        highPrice: 140,
        lowPrice: 137,
        lastPrice: 138,
        changePercent: 0.73,
        volume: 412469,
        tradedValue: 569305644e-1,
        tradeCount: 2835,
        marketCap: 10695966e3
      }
    },
    {
      symbol: "7200",
      nameAr: "\u0627\u0645 \u0622\u064A \u0627\u0633",
      nameEn: "Al Moammar Information Systems Co.",
      sectorAr: "\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u0642\u0646\u064A\u0629",
      sectorEn: "Software & Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 233,
        highPrice: 235.9,
        lowPrice: 232.3,
        lastPrice: 235,
        changePercent: 0.82,
        volume: 24446,
        tradedValue: 57242691e-1,
        tradeCount: 480,
        marketCap: 705e7
      }
    },
    {
      symbol: "7201",
      nameAr: "\u0628\u062D\u0631 \u0627\u0644\u0639\u0631\u0628",
      nameEn: "Arab Sea Information System Co.",
      sectorAr: "\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u0642\u0646\u064A\u0629",
      sectorEn: "Software & Services",
      warningFlag: "yellow",
      officialQuote: {
        openPrice: 3.32,
        highPrice: 3.35,
        lowPrice: 3.28,
        lastPrice: 3.3,
        changePercent: -0.6,
        volume: 564066,
        tradedValue: 186334273e-2,
        tradeCount: 473,
        marketCap: 33e7
      }
    },
    {
      symbol: "7202",
      nameAr: "\u0633\u0644\u0648\u0634\u0646\u0632",
      nameEn: "Arabian Internet and Communications Services Co.",
      sectorAr: "\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u0642\u0646\u064A\u0629",
      sectorEn: "Software & Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 204,
        highPrice: 204.8,
        lowPrice: 201.8,
        lastPrice: 204.3,
        changePercent: 0.15,
        volume: 61653,
        tradedValue: 125281462e-1,
        tradeCount: 1523,
        marketCap: 24516e6
      }
    },
    {
      symbol: "7203",
      nameAr: "\u0639\u0644\u0645",
      nameEn: "Elm Co.",
      sectorAr: "\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u0642\u0646\u064A\u0629",
      sectorEn: "Software & Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 646,
        highPrice: 664,
        lowPrice: 644,
        lastPrice: 662,
        changePercent: 2.64,
        volume: 54234,
        tradedValue: 354962305e-1,
        tradeCount: 2303,
        marketCap: 5296e7
      }
    },
    {
      symbol: "7204",
      nameAr: "\u062A\u0648\u0628\u064A",
      nameEn: "Perfect Presentation for Commercial Services Co.",
      sectorAr: "\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u0642\u0646\u064A\u0629",
      sectorEn: "Software & Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.13,
        highPrice: 6.13,
        lowPrice: 6.01,
        lastPrice: 6.04,
        changePercent: -1.15,
        volume: 600995,
        tradedValue: 363502457e-2,
        tradeCount: 1167,
        marketCap: 19932e5
      }
    },
    {
      symbol: "7205",
      nameAr: "\u062F\u064A \u0628\u064A \u0627\u0633",
      nameEn: "Dar Albalad for Business Solutions Co.",
      sectorAr: "\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u0642\u0646\u064A\u0629",
      sectorEn: "Software & Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.67,
        highPrice: 10.85,
        lowPrice: 10.48,
        lastPrice: 10.55,
        changePercent: -0.19,
        volume: 1272584,
        tradedValue: 1354509646e-2,
        tradeCount: 2337,
        marketCap: 7385e5
      }
    },
    {
      symbol: "7211",
      nameAr: "\u0639\u0632\u0645",
      nameEn: "Saudi Azm for Communication and Information Technology Co.",
      sectorAr: "\u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0648\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u0642\u0646\u064A\u0629",
      sectorEn: "Software & Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 21.8,
        highPrice: 22.4,
        lowPrice: 21.8,
        lastPrice: 22.09,
        changePercent: 1.33,
        volume: 161939,
        tradedValue: 359008781e-2,
        tradeCount: 615,
        marketCap: 13254e5
      }
    },
    {
      symbol: "7010",
      nameAr: "\u0627\u0633 \u062A\u064A \u0633\u064A",
      nameEn: "Saudi Telecom Co.",
      sectorAr: "\u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A",
      sectorEn: "Telecommunication Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 43.32,
        highPrice: 43.36,
        lowPrice: 43,
        lastPrice: 43.08,
        changePercent: -0.55,
        volume: 1816440,
        tradedValue: 7827798572e-2,
        tradeCount: 5590,
        marketCap: 2154e8
      }
    },
    {
      symbol: "7020",
      nameAr: "\u0625\u062A\u062D\u0627\u062F \u0625\u062A\u0635\u0627\u0644\u0627\u062A",
      nameEn: "Etihad Etisalat Co.",
      sectorAr: "\u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A",
      sectorEn: "Telecommunication Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 62.55,
        highPrice: 63.95,
        lowPrice: 62.4,
        lastPrice: 62.4,
        changePercent: 0.81,
        volume: 1110004,
        tradedValue: 698504232e-1,
        tradeCount: 4220,
        marketCap: 48048e6
      }
    },
    {
      symbol: "7030",
      nameAr: "\u0632\u064A\u0646 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Mobile Telecommunication Company Saudi Arabia",
      sectorAr: "\u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A",
      sectorEn: "Telecommunication Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.14,
        highPrice: 10.19,
        lowPrice: 10.11,
        lastPrice: 10.17,
        changePercent: 0.3,
        volume: 1540977,
        tradedValue: 1564665441e-2,
        tradeCount: 2484,
        marketCap: 914007570975e-2
      }
    },
    {
      symbol: "7040",
      nameAr: "\u0642\u0648 \u0644\u0644\u0625\u062A\u0635\u0627\u0644\u0627\u062A",
      nameEn: "Etihad GO Telecom Co.",
      sectorAr: "\u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A",
      sectorEn: "Telecommunication Services",
      warningFlag: null,
      officialQuote: {
        openPrice: 86.3,
        highPrice: 86.85,
        lowPrice: 85.35,
        lastPrice: 85.6,
        changePercent: -0.81,
        volume: 56993,
        tradedValue: 489424395e-2,
        tradeCount: 594,
        marketCap: 2910391440
      }
    },
    {
      symbol: "2080",
      nameAr: "\u0627\u0644\u063A\u0627\u0632 \u0627\u0644\u0642\u0627\u0628\u0636\u0629",
      nameEn: "Alghaz Waltsnae Company Eligibility Alqabida",
      sectorAr: "\u0627\u0644\u0645\u0631\u0627\u0641\u0642 \u0627\u0644\u0639\u0627\u0645\u0629",
      sectorEn: "Utilities",
      warningFlag: null,
      officialQuote: {
        openPrice: 65.95,
        highPrice: 68.6,
        lowPrice: 65.9,
        lastPrice: 67,
        changePercent: 1.59,
        volume: 109225,
        tradedValue: 736665265e-2,
        tradeCount: 1254,
        marketCap: 5025e6
      }
    },
    {
      symbol: "2081",
      nameAr: "\u0627\u0644\u062E\u0631\u064A\u0641",
      nameEn: "Alkhorayef Water and Power Technologies Co.",
      sectorAr: "\u0627\u0644\u0645\u0631\u0627\u0641\u0642 \u0627\u0644\u0639\u0627\u0645\u0629",
      sectorEn: "Utilities",
      warningFlag: null,
      officialQuote: {
        openPrice: 106.5,
        highPrice: 109.8,
        lowPrice: 105.8,
        lastPrice: 109,
        changePercent: 2.64,
        volume: 110357,
        tradedValue: 119991315e-1,
        tradeCount: 1639,
        marketCap: 3815e6
      }
    },
    {
      symbol: "2082",
      nameAr: "\u0623\u0643\u0648\u0627",
      nameEn: "ACWA POWER Co.",
      sectorAr: "\u0627\u0644\u0645\u0631\u0627\u0641\u0642 \u0627\u0644\u0639\u0627\u0645\u0629",
      sectorEn: "Utilities",
      warningFlag: null,
      officialQuote: {
        openPrice: 183.9,
        highPrice: 187.7,
        lowPrice: 182.5,
        lastPrice: 187.7,
        changePercent: 1.84,
        volume: 242544,
        tradedValue: 45049397,
        tradeCount: 2685,
        marketCap: 1438702664746e-1
      }
    },
    {
      symbol: "2083",
      nameAr: "\u0645\u0631\u0627\u0641\u0642",
      nameEn: "The Power and Water Utility Company for Jubail and Yanbu",
      sectorAr: "\u0627\u0644\u0645\u0631\u0627\u0641\u0642 \u0627\u0644\u0639\u0627\u0645\u0629",
      sectorEn: "Utilities",
      warningFlag: null,
      officialQuote: {
        openPrice: 36,
        highPrice: 36.2,
        lowPrice: 35.62,
        lastPrice: 35.62,
        changePercent: -1.27,
        volume: 304110,
        tradedValue: 109318103e-1,
        tradeCount: 1990,
        marketCap: 8905e6
      }
    },
    {
      symbol: "2084",
      nameAr: "\u0645\u064A\u0627\u0647\u0646\u0627",
      nameEn: "Miahona Co.",
      sectorAr: "\u0627\u0644\u0645\u0631\u0627\u0641\u0642 \u0627\u0644\u0639\u0627\u0645\u0629",
      sectorEn: "Utilities",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.03,
        highPrice: 13.33,
        lowPrice: 13.01,
        lastPrice: 13.08,
        changePercent: 0.46,
        volume: 563494,
        tradedValue: 742202881e-2,
        tradeCount: 1500,
        marketCap: 210490610244e-2
      }
    },
    {
      symbol: "5110",
      nameAr: "\u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629 \u0644\u0644\u0637\u0627\u0642\u0629",
      nameEn: "Saudi Energy Co.",
      sectorAr: "\u0627\u0644\u0645\u0631\u0627\u0641\u0642 \u0627\u0644\u0639\u0627\u0645\u0629",
      sectorEn: "Utilities",
      warningFlag: null,
      officialQuote: {
        openPrice: 17.51,
        highPrice: 17.6,
        lowPrice: 17.23,
        lastPrice: 17.25,
        changePercent: -2.32,
        volume: 712295,
        tradedValue: 1234740646e-2,
        tradeCount: 2135,
        marketCap: 7187374330875e-2
      }
    },
    {
      symbol: "4330",
      nameAr: "\u0627\u0644\u0631\u064A\u0627\u0636 \u0631\u064A\u062A",
      nameEn: "Riyad REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 4.93,
        highPrice: 4.93,
        lowPrice: 4.86,
        lastPrice: 4.88,
        changePercent: -1.01,
        volume: 100277,
        tradedValue: 488820.87,
        tradeCount: 366,
        marketCap: 83788185288e-2
      }
    },
    {
      symbol: "4331",
      nameAr: "\u0627\u0644\u062C\u0632\u064A\u0631\u0629 \u0631\u064A\u062A",
      nameEn: "AlJazira REIT",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.07,
        highPrice: 11.13,
        lowPrice: 11.02,
        lastPrice: 11.07,
        changePercent: -0.09,
        volume: 21744,
        tradedValue: 240879.27,
        tradeCount: 259,
        marketCap: 130626e3
      }
    },
    {
      symbol: "4332",
      nameAr: "\u062C\u062F\u0648\u0649 \u0631\u064A\u062A \u0627\u0644\u062D\u0631\u0645\u064A\u0646",
      nameEn: "Jadwa REIT Al Haramain Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 4.87,
        highPrice: 4.9,
        lowPrice: 4.87,
        lastPrice: 4.88,
        changePercent: 0.21,
        volume: 7240,
        tradedValue: 35319.29,
        tradeCount: 56,
        marketCap: 32208e4
      }
    },
    {
      symbol: "4333",
      nameAr: "\u062A\u0639\u0644\u064A\u0645 \u0631\u064A\u062A",
      nameEn: "Taleem REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.47,
        highPrice: 10.51,
        lowPrice: 10.44,
        lastPrice: 10.46,
        changePercent: 0,
        volume: 8819,
        tradedValue: 92395.17,
        tradeCount: 120,
        marketCap: 53346e4
      }
    },
    {
      symbol: "4334",
      nameAr: "\u0627\u0644\u0645\u0639\u0630\u0631 \u0631\u064A\u062A",
      nameEn: "AL Maather REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 9.06,
        highPrice: 9.06,
        lowPrice: 8.98,
        lastPrice: 9,
        changePercent: -0.55,
        volume: 40227,
        tradedValue: 362440.82,
        tradeCount: 114,
        marketCap: 55233e4
      }
    },
    {
      symbol: "4335",
      nameAr: "\u0645\u0634\u0627\u0631\u0643\u0629 \u0631\u064A\u062A",
      nameEn: "Musharaka REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 3.72,
        highPrice: 3.73,
        lowPrice: 3.66,
        lastPrice: 3.69,
        changePercent: -1.07,
        volume: 112601,
        tradedValue: 414915.24,
        tradeCount: 457,
        marketCap: 32472e4
      }
    },
    {
      symbol: "4336",
      nameAr: "\u0645\u0644\u0643\u064A\u0629 \u0631\u064A\u062A",
      nameEn: "Mulkia Gulf Real Estate REIT",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 4.62,
        highPrice: 4.62,
        lowPrice: 4.59,
        lastPrice: 4.61,
        changePercent: -0.22,
        volume: 45460,
        tradedValue: 209423.98,
        tradeCount: 150,
        marketCap: 47836123695e-2
      }
    },
    {
      symbol: "4337",
      nameAr: "\u0627\u0644\u0639\u0632\u064A\u0632\u064A\u0629 \u0631\u064A\u062A",
      nameEn: "AL AZIZIAH REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 5.01,
        highPrice: 5.05,
        lowPrice: 5,
        lastPrice: 5.01,
        changePercent: 0,
        volume: 66541,
        tradedValue: 335258.42,
        tradeCount: 80,
        marketCap: 286772400
      }
    },
    {
      symbol: "4338",
      nameAr: "\u0627\u0644\u0623\u0647\u0644\u064A \u0631\u064A\u062A 1",
      nameEn: "AlAhli REIT Fund 1",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.55,
        highPrice: 6.62,
        lowPrice: 6.55,
        lastPrice: 6.6,
        changePercent: -0.3,
        volume: 28236,
        tradedValue: 186238.56,
        tradeCount: 111,
        marketCap: 9075e5
      }
    },
    {
      symbol: "4339",
      nameAr: "\u062F\u0631\u0627\u064A\u0629 \u0631\u064A\u062A",
      nameEn: "Derayah REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 5.45,
        highPrice: 5.47,
        lowPrice: 5.4,
        lastPrice: 5.43,
        changePercent: -0.37,
        volume: 136888,
        tradedValue: 742728.5,
        tradeCount: 236,
        marketCap: 58376320005e-2
      }
    },
    {
      symbol: "4340",
      nameAr: "\u0627\u0644\u0631\u0627\u062C\u062D\u064A \u0631\u064A\u062A",
      nameEn: "Al Rajhi REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 8.21,
        highPrice: 8.22,
        lowPrice: 8.18,
        lastPrice: 8.2,
        changePercent: -0.36,
        volume: 138868,
        tradedValue: 113832058e-2,
        tradeCount: 662,
        marketCap: 22599814836e-1
      }
    },
    {
      symbol: "4342",
      nameAr: "\u062C\u062F\u0648\u0649 \u0631\u064A\u062A \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
      nameEn: "Jadwa REIT Saudi Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.5,
        highPrice: 10.6,
        lowPrice: 10.47,
        lastPrice: 10.47,
        changePercent: -0.29,
        volume: 156494,
        tradedValue: 164266849e-2,
        tradeCount: 475,
        marketCap: 195275744895e-2
      }
    },
    {
      symbol: "4344",
      nameAr: "\u0633\u062F\u0643\u0648 \u0643\u0627\u0628\u064A\u062A\u0627\u0644 \u0631\u064A\u062A",
      nameEn: "SEDCO Capital REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 7.86,
        highPrice: 7.97,
        lowPrice: 7.85,
        lastPrice: 7.91,
        changePercent: -0.5,
        volume: 103022,
        tradedValue: 814866.65,
        tradeCount: 336,
        marketCap: 147873055204e-2
      }
    },
    {
      symbol: "4345",
      nameAr: "\u0627\u0644\u0625\u0646\u0645\u0627\u0621 \u0631\u064A\u062A \u0644\u0644\u062A\u062C\u0632\u0626\u0629",
      nameEn: "Alinma Retail REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 4.83,
        highPrice: 4.83,
        lowPrice: 4.79,
        lastPrice: 4.81,
        changePercent: -0.41,
        volume: 114437,
        tradedValue: 549823.99,
        tradeCount: 224,
        marketCap: 56758e4
      }
    },
    {
      symbol: "4346",
      nameAr: "\u0645\u064A\u0641\u0643 \u0631\u064A\u062A",
      nameEn: "MEFIC REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 3.35,
        highPrice: 3.35,
        lowPrice: 3.32,
        lastPrice: 3.35,
        changePercent: 0,
        volume: 9310,
        tradedValue: 31079.64,
        tradeCount: 89,
        marketCap: 245477280
      }
    },
    {
      symbol: "4347",
      nameAr: "\u0628\u0646\u064A\u0627\u0646 \u0631\u064A\u062A",
      nameEn: "Bonyan REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 10.13,
        highPrice: 10.14,
        lowPrice: 10.09,
        lastPrice: 10.12,
        changePercent: -0.2,
        volume: 58390,
        tradedValue: 591261.28,
        tradeCount: 155,
        marketCap: 1648356732
      }
    },
    {
      symbol: "4348",
      nameAr: "\u0627\u0644\u062E\u0628\u064A\u0631 \u0631\u064A\u062A",
      nameEn: "Alkhabeer REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 5.72,
        highPrice: 5.73,
        lowPrice: 5.7,
        lastPrice: 5.72,
        changePercent: 0,
        volume: 97700,
        tradedValue: 558451.44,
        tradeCount: 532,
        marketCap: 80657061056e-2
      }
    },
    {
      symbol: "4349",
      nameAr: "\u0627\u0644\u0625\u0646\u0645\u0627\u0621 \u0631\u064A\u062A \u0627\u0644\u0641\u0646\u062F\u0642\u064A",
      nameEn: "Alinma Hospitality REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 8.12,
        highPrice: 8.15,
        lowPrice: 8.1,
        lastPrice: 8.14,
        changePercent: 0.25,
        volume: 53567,
        tradedValue: 435466.14,
        tradeCount: 230,
        marketCap: 830297094
      }
    },
    {
      symbol: "4350",
      nameAr: "\u0627\u0644\u0625\u0633\u062A\u062B\u0645\u0627\u0631 \u0631\u064A\u062A",
      nameEn: "Alistithmar AREIC Diversified REIT Fund",
      sectorAr: "\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
      sectorEn: "REITs",
      warningFlag: null,
      officialQuote: {
        openPrice: 7.06,
        highPrice: 7.58,
        lowPrice: 7.04,
        lastPrice: 7.5,
        changePercent: 6.23,
        volume: 612335,
        tradedValue: 45060156e-1,
        tradeCount: 1275,
        marketCap: 45375e4
      }
    },
    {
      symbol: "4020",
      nameAr: "\u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629",
      nameEn: "Saudi Real Estate Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 17.65,
        highPrice: 17.65,
        lowPrice: 17.22,
        lastPrice: 17.45,
        changePercent: -1.13,
        volume: 298192,
        tradedValue: 51748831e-1,
        tradeCount: 807,
        marketCap: 654375e4
      }
    },
    {
      symbol: "4090",
      nameAr: "\u0637\u064A\u0628\u0629",
      nameEn: "Taiba Investments Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 18.33,
        highPrice: 18.72,
        lowPrice: 18.24,
        lastPrice: 18.46,
        changePercent: 0.71,
        volume: 523789,
        tradedValue: 97056351e-1,
        tradeCount: 840,
        marketCap: 923e7
      }
    },
    {
      symbol: "4100",
      nameAr: "\u0645\u0643\u0629",
      nameEn: "Makkah Construction and Development Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 83.45,
        highPrice: 84.4,
        lowPrice: 83.25,
        lastPrice: 84.1,
        changePercent: 0.18,
        volume: 95698,
        tradedValue: 80333539e-1,
        tradeCount: 909,
        marketCap: 1682e7
      }
    },
    {
      symbol: "4150",
      nameAr: "\u0627\u0644\u062A\u0639\u0645\u064A\u0631",
      nameEn: "Arriyadh Development Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 17.95,
        highPrice: 17.95,
        lowPrice: 17.7,
        lastPrice: 17.77,
        changePercent: -1,
        volume: 122332,
        tradedValue: 218175776e-2,
        tradeCount: 815,
        marketCap: 415695063586e-2
      }
    },
    {
      symbol: "4220",
      nameAr: "\u0625\u0639\u0645\u0627\u0631",
      nameEn: "Emaar The Economic City",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 9.72,
        highPrice: 9.77,
        lowPrice: 9.6,
        lastPrice: 9.68,
        changePercent: -0.92,
        volume: 356861,
        tradedValue: 345051863e-2,
        tradeCount: 990,
        marketCap: 85467614804e-1
      }
    },
    {
      symbol: "4230",
      nameAr: "\u0627\u0644\u0628\u062D\u0631 \u0627\u0644\u0623\u062D\u0645\u0631",
      nameEn: "Red Sea International Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 26.5,
        highPrice: 26.5,
        lowPrice: 25.44,
        lastPrice: 25.54,
        changePercent: -3.62,
        volume: 1553499,
        tradedValue: 4030003054e-2,
        tradeCount: 4739,
        marketCap: 123274896182e-2
      }
    },
    {
      symbol: "4250",
      nameAr: "\u062C\u0628\u0644 \u0639\u0645\u0631",
      nameEn: "Jabal Omar Development Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 15.75,
        highPrice: 15.79,
        lowPrice: 15.64,
        lastPrice: 15.7,
        changePercent: -0.32,
        volume: 2216256,
        tradedValue: 3481121243e-2,
        tradeCount: 2005,
        marketCap: 185263596085e-1
      }
    },
    {
      symbol: "4300",
      nameAr: "\u062F\u0627\u0631 \u0627\u0644\u0623\u0631\u0643\u0627\u0646",
      nameEn: "Dar Alarkan Real Estate Development Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 18.6,
        highPrice: 19.19,
        lowPrice: 18.6,
        lastPrice: 19.19,
        changePercent: 2.62,
        volume: 1083492,
        tradedValue: 2058083219e-2,
        tradeCount: 2676,
        marketCap: 207252e5
      }
    },
    {
      symbol: "4310",
      nameAr: "\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u0645\u0639\u0631\u0641\u0629",
      nameEn: "Knowledge Economic City",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 13.84,
        highPrice: 14.72,
        lowPrice: 13.78,
        lastPrice: 14.6,
        changePercent: 5.49,
        volume: 1794437,
        tradedValue: 2553617297e-2,
        tradeCount: 4227,
        marketCap: 495378e4
      }
    },
    {
      symbol: "4320",
      nameAr: "\u0627\u0644\u0623\u0646\u062F\u0644\u0633",
      nameEn: "Alandalus Property Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 14.27,
        highPrice: 14.49,
        lowPrice: 14.18,
        lastPrice: 14.39,
        changePercent: 0.84,
        volume: 75192,
        tradedValue: 108141647e-2,
        tradeCount: 389,
        marketCap: 134306666187e-2
      }
    },
    {
      symbol: "4321",
      nameAr: "\u0633\u064A\u0646\u0648\u0645\u064A \u0633\u0646\u062A\u0631\u0632",
      nameEn: "Arabian Centres Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 16.17,
        highPrice: 16.25,
        lowPrice: 16,
        lastPrice: 16.23,
        changePercent: 0.25,
        volume: 357044,
        tradedValue: 576163137e-2,
        tradeCount: 1020,
        marketCap: 770925e4
      }
    },
    {
      symbol: "4322",
      nameAr: "\u0631\u062A\u0627\u0644",
      nameEn: "Retal Urban Development Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 11.11,
        highPrice: 11.3,
        lowPrice: 11.11,
        lastPrice: 11.24,
        changePercent: -0.27,
        volume: 325603,
        tradedValue: 365873396e-2,
        tradeCount: 926,
        marketCap: 562e7
      }
    },
    {
      symbol: "4323",
      nameAr: "\u0633\u0645\u0648",
      nameEn: "Sumou Real Estate Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 26.7,
        highPrice: 26.84,
        lowPrice: 26.5,
        lastPrice: 26.62,
        changePercent: -0.89,
        volume: 29349,
        tradedValue: 781178.74,
        tradeCount: 296,
        marketCap: 1331e6
      }
    },
    {
      symbol: "4324",
      nameAr: "\u0628\u0646\u0627\u0646",
      nameEn: "Banan Real Estate Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 3.06,
        highPrice: 3.09,
        lowPrice: 3.06,
        lastPrice: 3.08,
        changePercent: 0.65,
        volume: 63267,
        tradedValue: 194182.45,
        tradeCount: 166,
        marketCap: 616e6
      }
    },
    {
      symbol: "4325",
      nameAr: "\u0645\u0633\u0627\u0631",
      nameEn: "Umm Al Qura for Development and Construction Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 17.94,
        highPrice: 17.99,
        lowPrice: 17.1,
        lastPrice: 17.63,
        changePercent: -1.73,
        volume: 830075,
        tradedValue: 1474517737e-2,
        tradeCount: 1675,
        marketCap: 2536335650043e-2
      }
    },
    {
      symbol: "4326",
      nameAr: "\u0627\u0644\u0645\u0627\u062C\u062F\u064A\u0629",
      nameEn: "Dar Al Majed Real Estate Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 6.8,
        highPrice: 6.82,
        lowPrice: 6.75,
        lastPrice: 6.76,
        changePercent: -0.73,
        volume: 435492,
        tradedValue: 2950971,
        tradeCount: 1028,
        marketCap: 2028e6
      }
    },
    {
      symbol: "4327",
      nameAr: "\u0627\u0644\u0631\u0645\u0632",
      nameEn: "Alramz Real Estate Co.",
      sectorAr: "\u0625\u062F\u0627\u0631\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
      sectorEn: "Real Estate Mgmt & Dev't",
      warningFlag: null,
      officialQuote: {
        openPrice: 53.3,
        highPrice: 53.3,
        lowPrice: 52.5,
        lastPrice: 53,
        changePercent: -0.66,
        volume: 29338,
        tradedValue: 15500301e-1,
        tradeCount: 297,
        marketCap: 2271428579
      }
    }
  ]
};
var ALLOWED_INTERVALS = /* @__PURE__ */ new Set(["15m", "1h", "2h", "3h", "4h", "1d", "1wk", "1mo"]);
var ALLOWED_RANGES = /* @__PURE__ */ new Set(["5d", "1mo", "3mo", "1y", "2y", "5y", "10y", "max"]);
var MAIN_MARKET_SYMBOLS = new Set(official_main_market_catalog_2026_07_21_default.companies.map((company) => company.symbol));
var TASI_SYMBOL = "TASI";
var MARKET_CATALOG = [
  { market_code: "SA_MAIN", country_code: "SA", name_ar: "\u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629", name_en: "Saudi Main Market", currency: "SAR", timezone: "Asia/Riyadh", quote_mode: "delayed", delay_seconds: 900, license_status: "pending", active: true },
  US_OPTIONS_CATALOG.market,
  { market_code: "US_BENCHMARKS", country_code: "US", name_ar: "\u0627\u0644\u0645\u0624\u0634\u0631\u0627\u062A \u0648\u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u0623\u0645\u0631\u064A\u0643\u064A\u0629", name_en: "U.S. Indices & ETFs", currency: "USD", timezone: "America/New_York", quote_mode: "delayed", delay_seconds: 900, license_status: "pending", active: true }
];
function entityRows(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (Array.isArray(value?.data)) return value.data.filter(Boolean);
  if (Array.isArray(value?.items)) return value.items.filter(Boolean);
  return [];
}
function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\u0622\u0623\u0625]/g, "\u0627")
    .replace(/\u0649/g, "\u064a")
    .replace(/\u0629/g, "\u0647")
    .toLocaleLowerCase("ar")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
function sectorTicker(nameEn, nameAr) {
  const base = normalizeSearchText(nameEn || nameAr)
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return `SECTOR:${base || "INDEX"}`;
}
function searchCandidateScore(candidate, query) {
  const symbol = normalizeSearchText(candidate.symbol);
  const code = normalizeSearchText(candidate.instrument_code);
  const names = [candidate.name_ar, candidate.name_en, candidate.sector_ar, candidate.sector_en].map(normalizeSearchText).filter(Boolean);
  const aliases = (candidate.search_aliases || []).map(normalizeSearchText).filter(Boolean);
  if (symbol === query || code === query) return 0;
  if (symbol.startsWith(query) || code.startsWith(query)) return 10 + Math.min(symbol.length, code.length) / 100;
  if (aliases.some((alias) => alias === query)) return 20;
  if (names.some((name) => name.startsWith(query)) || aliases.some((alias) => alias.startsWith(query))) return 30;
  if (symbol.includes(query) || code.includes(query)) return 40;
  if (names.some((name) => name.includes(query)) || aliases.some((alias) => alias.includes(query))) return 50;
  return Number.POSITIVE_INFINITY;
}
function usableQuote(value) {
  const last = Number(value?.last_price);
  const previous = Number(value?.previous_close);
  return Number.isFinite(last) && last > 0
    && (!Number.isFinite(previous) || previous > 0)
    && value?.quality_status !== "quarantined";
}
async function optionalRows(operation, label) {
  try {
    return entityRows(await operation());
  } catch (error) {
    console.warn(`SMART_INVESTOR optional ${label} query failed`, error?.message || error);
    return [];
  }
}
function stateFor(value, source, now = Date.now(), options = {}) {
  const age = value ? now - new Date(value).getTime() : Number.POSITIVE_INFINITY;
  const final = options.isFinal === true;
  const explicitlyStale = options.freshnessStatus === "stale";
  if (final && !explicitlyStale) {
    return {
      label: "\u0625\u063A\u0644\u0627\u0642 \u0646\u0647\u0627\u0626\u064A",
      stale: false,
      code: "final"
    };
  }
  const expectedDelaySeconds = Math.max(0, Number(source?.delay_seconds || SAUDI_DELAY_SECONDS));
  const refreshCadenceSeconds = Math.max(5 * 60, Number(source?.refresh_cadence_seconds || 60 * 60));
  const processingGraceSeconds = 10 * 60;
  const stale = explicitlyStale || age > (expectedDelaySeconds + refreshCadenceSeconds + processingGraceSeconds) * 1e3;
  return {
    label: stale ? "\u0645\u062A\u0642\u0627\u062F\u0645\u0629" : "\u0645\u062A\u0623\u062E\u0631\u0629 15 \u062F\u0642\u064A\u0642\u0629",
    stale,
    code: stale ? "stale" : "delayed"
  };
}
async function requireMarketAccess(base44, body) {
  const context = await authorizationContext(base44, body.session_id, body.device_id);
  if (body.action !== "markets") requireMarketEntitlement(context, body.market_code);
  return context;
}
var US_MARKET_CLOCK_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});
var MARKET_SESSION_DATE_FORMATTERS = new Map();
function marketClockFor(marketCode, now = new Date()) {
  if (marketCode === "SA_MAIN") return riyadhClock(now);
  const parts = Object.fromEntries(US_MARKET_CLOCK_FORMATTER.formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, weekday: parts.weekday, hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second) };
}
function marketPhaseFor(marketCode, clock) {
  if (marketCode === "SA_MAIN") return marketPhase(clock);
  if (!["Mon", "Tue", "Wed", "Thu", "Fri"].includes(clock.weekday)) return "closed";
  const minute = clock.hour * 60 + clock.minute;
  return minute >= 570 && minute < 960 ? "continuous" : "closed";
}
async function instrumentFor(base44, body) {
  const marketCode = String(body.market_code || "").trim().toUpperCase();
  if (!marketCode) throw Object.assign(new Error("market_code is required"), { status: 400, code: "MARKET_IDENTITY_REQUIRED" });
  const instrumentCode = String(body.instrument_code || "").trim();
  if (instrumentCode) {
    const rows = await base44.asServiceRole.entities.Instrument.filter({ market_code: marketCode, instrument_code: instrumentCode });
    if (!rows[0] && marketCode === "SA_MAIN" && /^\d{4}$/.test(instrumentCode)) {
      const legacyRows = await base44.asServiceRole.entities.Instrument.filter({ symbol: instrumentCode });
      if (legacyRows[0]) return legacyRows[0];
    }
    if (!rows[0]) throw Object.assign(new Error("Instrument not found"), { status: 404, code: "INSTRUMENT_NOT_FOUND" });
    return localizedInstrument(rows[0]);
  }
  const symbol = String(body.symbol || "").trim();
  if (symbol) {
    if (marketCode === "SA_MAIN" && !/^\d{4}$/.test(symbol) && symbol !== TASI_SYMBOL) throw Object.assign(new Error("Invalid Saudi market instrument symbol"), { status: 400 });
    if (marketCode === US_OPTIONS_MARKET_CODE && !US_OPTIONS_SYMBOLS.has(symbol.toUpperCase())) throw Object.assign(new Error("Instrument is outside the U.S. options catalog"), { status: 400, code: "INSTRUMENT_OUT_OF_MARKET" });
    if (marketCode === US_BENCHMARKS_MARKET_CODE && !US_BENCHMARKS_SYMBOLS.has(symbol.toUpperCase())) throw Object.assign(new Error("Instrument is outside the U.S. benchmarks catalog"), { status: 400, code: "INSTRUMENT_OUT_OF_MARKET" });
    const rows = await base44.asServiceRole.entities.Instrument.filter({ symbol: symbol.toUpperCase(), market_code: marketCode });
    if (!rows[0]) throw Object.assign(new Error("Instrument not found"), { status: 404 });
    return localizedInstrument(rows[0]);
  }
  if (!body.instrument_id) throw Object.assign(new Error("symbol or instrument_id is required"), { status: 400 });
  const instrument = await base44.asServiceRole.entities.Instrument.get(String(body.instrument_id));
  if (!instrument) throw Object.assign(new Error("Instrument not found"), { status: 404 });
  if (instrument.market_code !== marketCode) throw Object.assign(new Error("Instrument is outside the requested market"), { status: 403, code: "CROSS_MARKET_ACCESS_DENIED" });
  return instrument;
}
var RANGE_MILLISECONDS = {
  "5d": 5 * 24 * 60 * 60 * 1e3,
  "1mo": 31 * 24 * 60 * 60 * 1e3,
  "3mo": 93 * 24 * 60 * 60 * 1e3,
  "1y": 366 * 24 * 60 * 60 * 1e3,
  "2y": 2 * 366 * 24 * 60 * 60 * 1e3,
  "5y": 5 * 366 * 24 * 60 * 60 * 1e3,
  "10y": 10 * 366 * 24 * 60 * 60 * 1e3
};
var INTERVAL_RANGE_MATRIX = {
  "15m": ["5d", "1mo"],
  "1h": ["5d", "1mo", "3mo"],
  "2h": ["5d", "1mo", "3mo"],
  "3h": ["5d", "1mo", "3mo"],
  "4h": ["5d", "1mo", "3mo"],
  "1d": ["5d", "1mo", "3mo", "1y", "2y", "5y", "10y", "max"],
  "1wk": ["3mo", "1y", "2y", "5y", "10y", "max"],
  "1mo": ["1y", "2y", "5y", "10y", "max"]
};
function rangeToleranceMilliseconds(range) {
  if (range === "5d") return 2 * 24 * 60 * 60 * 1e3;
  if (["1mo", "3mo"].includes(range)) return 4 * 24 * 60 * 60 * 1e3;
  return 10 * 24 * 60 * 60 * 1e3;
}
function candleRangeMetadata(bars, interval, range, historyComplete = false) {
  const validTimes = bars.map((bar) => new Date(bar.time).getTime()).filter(Number.isFinite).sort((a, b) => a - b);
  const earliest = validTimes[0];
  const latest = validTimes.at(-1);
  if (!Number.isFinite(earliest) || !Number.isFinite(latest)) {
    return { requestedFrom: null, availableFrom: null, availableTo: null, complete: false, availableRanges: [] };
  }
  const supported = INTERVAL_RANGE_MATRIX[interval] || [];
  const completeFor = (candidate) => {
    if (candidate === "max") return historyComplete;
    const duration = RANGE_MILLISECONDS[candidate];
    return Number.isFinite(duration) && earliest <= latest - duration + rangeToleranceMilliseconds(candidate);
  };
  return {
    requestedFrom: range === "max" ? null : new Date(latest - RANGE_MILLISECONDS[range]).toISOString(),
    availableFrom: new Date(earliest).toISOString(),
    availableTo: new Date(latest).toISOString(),
    complete: completeFor(range),
    availableRanges: supported.filter(completeFor)
  };
}
function marketCandleOptions(marketCode) {
  return marketCode === "SA_MAIN" ? { timeZone: "Asia/Riyadh", sessionStartMinutes: 600, weekStartsOn: 0 } : { timeZone: "America/New_York", sessionStartMinutes: 570, weekStartsOn: 1 };
}
function marketSessionDate(value, marketCode) {
  const timeZone = marketCandleOptions(marketCode).timeZone;
  if (!MARKET_SESSION_DATE_FORMATTERS.has(timeZone)) {
    MARKET_SESSION_DATE_FORMATTERS.set(timeZone, new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }));
  }
  return MARKET_SESSION_DATE_FORMATTERS.get(timeZone).format(new Date(value));
}
function normalizedStoredBars(chunks, marketCode) {
  const byTime = new Map();
  for (const chunk of chunks) for (const bar of chunk.bars || []) {
    const time = new Date(bar.time).getTime();
    const open = Number(bar.open);
    const high = Number(bar.high);
    const low = Number(bar.low);
    const close = Number(bar.close);
    const volume = Math.max(0, Number(bar.volume || 0));
    if (!Number.isFinite(time) || ![open, high, low, close].every((value) => Number.isFinite(value) && value > 0)) continue;
    if (high < Math.max(open, close) || low > Math.min(open, close)) continue;
    const isoTime = new Date(time).toISOString();
    const key = chunk.interval === "1d" ? `day:${marketSessionDate(isoTime, marketCode)}` : isoTime;
    const canonicalVersion = String(chunk.canonical_version || "");
    const sourcePriority = canonicalVersion === "candle-projection-v1" || canonicalVersion.includes("daily-projection") ? 3 : chunk.is_historical_archive === true ? 2 : 1;
    const receivedTime = new Date(chunk.received_time || chunk.updated_date || chunk.created_date || 0).getTime();
    const current = byTime.get(key);
    if (current && (current.sourcePriority > sourcePriority
      || current.sourcePriority === sourcePriority && current.receivedTime > receivedTime)) continue;
    byTime.set(key, { time: isoTime, open, high, low, close, volume, sourcePriority, receivedTime });
  }
  return [...byTime.values()]
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    .map(({ sourcePriority: _sourcePriority, receivedTime: _receivedTime, ...bar }) => bar);
}
function fallbackIntervals(interval) {
  // Long-horizon charts must never scan the much larger 15-minute archive.
  // Daily storage is the canonical fallback for daily/weekly/monthly views.
  if (interval === "1wk" || interval === "1mo") return [interval, "1d"];
  if (interval === "1d") return [interval];
  if (["1h", "2h", "3h", "4h"].includes(interval)) return [interval, "15m"];
  return [interval];
}
async function entityReadWithRetry(read) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await read();
    } catch (error) {
      lastError = error;
      const status = Number(error?.status || error?.response?.status || error?.response?.data?.status || 0);
      const message = String(error?.message || error?.response?.data?.error || "").toLowerCase();
      if (attempt >= 3 || status !== 429 && !message.includes("rate limit")) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}
function availableIntervals(storedIntervals) {
  const stored = new Set(storedIntervals || []);
  const available = new Set(stored);
  if (stored.has("15m")) ["15m", "1h", "2h", "3h", "4h", "1d", "1wk", "1mo"].forEach((interval) => available.add(interval));
  if (stored.has("1d")) ["1d", "1wk", "1mo"].forEach((interval) => available.add(interval));
  return [...available];
}
function normalizedMarketCode(value) {
  return String(value || "").trim().toUpperCase();
}
function storedMarketRecordBelongsToMarket(record, marketCode) {
  const requestedMarket = normalizedMarketCode(marketCode);
  const storedMarket = normalizedMarketCode(record?.market_code);
  if (requestedMarket === "SA_MAIN") return !storedMarket || storedMarket === requestedMarket;
  return storedMarket === requestedMarket;
}
function candleChunkQuery(filter, marketCode) {
  const requestedMarket = normalizedMarketCode(marketCode);
  return requestedMarket === "SA_MAIN" ? filter : { ...filter, market_code: requestedMarket };
}
async function readStoredCandleChunks(base44, filter, marketCode, sort, limit) {
  const chunks = entityRows(await entityReadWithRetry(() => base44.asServiceRole.entities.CandleChunk.filter(
    candleChunkQuery(filter, marketCode),
    sort,
    limit
  )));
  return chunks.filter((chunk) => storedMarketRecordBelongsToMarket(chunk, marketCode));
}
async function readIndicatorSnapshots(base44, filter, marketCode, sort, limit) {
  const { market_code: _marketCode, ...identityFilter } = filter;
  const requestedMarket = normalizedMarketCode(marketCode);
  const query = requestedMarket === "SA_MAIN"
    ? identityFilter
    : { ...identityFilter, market_code: requestedMarket };
  const readSnapshots = () => {
    if (sort && Number.isFinite(Number(limit))) {
      return base44.asServiceRole.entities.IndicatorSnapshot.filter(query, sort, Number(limit));
    }
    if (sort) {
      return base44.asServiceRole.entities.IndicatorSnapshot.filter(query, sort);
    }
    return base44.asServiceRole.entities.IndicatorSnapshot.filter(query);
  };
  const rows = entityRows(await entityReadWithRetry(readSnapshots));
  return rows.filter((row) => storedMarketRecordBelongsToMarket(row, marketCode));
}
function candleIdentityFilter(instruments, interval, marketCode) {
  if (normalizedMarketCode(marketCode) === "SA_MAIN") {
    const symbols = instruments.map((instrument) => String(instrument.symbol || "").trim().toUpperCase()).filter(Boolean);
    return { symbol: symbols.length === 1 ? symbols[0] : { $in: symbols }, interval };
  }
  const instrumentIds = instruments.map((instrument) => instrument.id);
  return { instrument_id: instrumentIds.length === 1 ? instrumentIds[0] : { $in: instrumentIds }, interval };
}
function instrumentForCandleChunk(chunk, instrumentsById, instrumentsBySymbol, marketCode) {
  if (normalizedMarketCode(marketCode) === "SA_MAIN") {
    return instrumentsBySymbol.get(String(chunk.symbol || "").trim().toUpperCase()) || null;
  }
  return instrumentsById.get(chunk.instrument_id) || null;
}
async function readHistoricalSyncs(base44, instrument, marketCode) {
  const requestedMarket = normalizedMarketCode(marketCode);
  const filter = requestedMarket === "SA_MAIN"
    ? { symbol: String(instrument.symbol || "").trim().toUpperCase(), interval: "1d" }
    : { instrument_id: instrument.id, market_code: requestedMarket, interval: "1d" };
  const rows = await optionalRows(
    () => base44.asServiceRole.entities.HistoricalCandleSync.filter(filter, "-completed_at", 20),
    "historical candle sync"
  );
  return rows.filter((row) => storedMarketRecordBelongsToMarket(row, marketCode));
}
async function storedCandlesForInterval(base44, instrument, interval, marketCode) {
  const series = [];
  const allChunks = [];
  for (const storedInterval of fallbackIntervals(interval)) {
    const chunks = (await readStoredCandleChunks(base44, candleIdentityFilter([instrument], storedInterval, marketCode), marketCode, "-end_time", 500))
      .filter((chunk) => chunk.quality_status !== "quarantined" && Array.isArray(chunk.bars))
      .sort((a, b) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime());
    if (!chunks.length) continue;
    const storedBars = normalizedStoredBars(chunks, marketCode);
    if (!storedBars.length) continue;
    series.push({ interval: storedInterval, bars: storedBars });
    allChunks.push(...chunks);
  }
  const merged = mergeStoredCandleSeries(series, interval, marketCandleOptions(marketCode));
  const latestChunk = allChunks
    .sort((a, b) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime())
    .at(-1) || null;
  return {
    bars: merged.bars,
    chunks: allChunks,
    latestChunk,
    latestSourceTime: merged.latestSourceTime,
    storedInterval: merged.storedIntervals.join("+") || null,
    storedIntervals: merged.storedIntervals
  };
}
function hasRequestedRange(bars, interval, range) {
  if (!Array.isArray(bars) || bars.length < 2) return false;
  if (range === "max") return false;
  return candleRangeMetadata(bars, interval, range, false).complete;
}
async function storedCandlesForInstruments(base44, instruments, interval, marketCode, range) {
  const instrumentsById = new Map(instruments.map((instrument) => [instrument.id, instrument]));
  const instrumentsBySymbol = new Map(instruments.map((instrument) => [String(instrument.symbol || "").trim().toUpperCase(), instrument]));
  const chunksByInstrument = new Map(instruments.map((instrument) => [instrument.id, []]));
  const pendingIds = new Set(instruments.map((instrument) => instrument.id));
  for (const storedInterval of fallbackIntervals(interval)) {
    const pendingInstruments = instruments.filter((instrument) => pendingIds.has(instrument.id));
    if (!pendingInstruments.length) break;
    const chunks = (await readStoredCandleChunks(base44, candleIdentityFilter(pendingInstruments, storedInterval, marketCode), marketCode, "-end_time", 5e3))
      .filter((chunk) => chunk.quality_status !== "quarantined" && Array.isArray(chunk.bars));
    for (const chunk of chunks) {
      const instrument = instrumentForCandleChunk(chunk, instrumentsById, instrumentsBySymbol, marketCode);
      if (instrument) chunksByInstrument.get(instrument.id)?.push(chunk);
    }
    for (const instrument of pendingInstruments) {
      const instrumentChunks = chunksByInstrument.get(instrument.id) || [];
      const candidateSeries = fallbackIntervals(interval).map((candidateInterval) => {
        const matching = instrumentChunks.filter((chunk) => chunk.interval === candidateInterval);
        return matching.length ? { interval: candidateInterval, bars: normalizedStoredBars(matching, marketCode) } : null;
      }).filter(Boolean);
      const candidate = mergeStoredCandleSeries(candidateSeries, interval, marketCandleOptions(marketCode));
      if (hasRequestedRange(candidate.bars, interval, range)) pendingIds.delete(instrument.id);
    }
  }
  return new Map(instruments.map((instrument) => {
    const instrumentId = instrument.id;
    const chunks = (chunksByInstrument.get(instrumentId) || []).sort((a, b) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime());
    const series = fallbackIntervals(interval).map((storedInterval) => {
      const matching = chunks.filter((chunk) => chunk.interval === storedInterval);
      return matching.length ? { interval: storedInterval, bars: normalizedStoredBars(matching, marketCode) } : null;
    }).filter(Boolean);
    const merged = mergeStoredCandleSeries(series, interval, marketCandleOptions(marketCode));
    return [instrumentId, {
      bars: merged.bars,
      chunks,
      latestChunk: chunks.at(-1) || null,
      latestSourceTime: merged.latestSourceTime,
      storedInterval: merged.storedIntervals.join("+") || null,
      storedIntervals: merged.storedIntervals
    }];
  }));
}
async function chartResponse(base44, body, sources) {
  const instrument = await instrumentFor(base44, body);
  const interval = String(body.interval || "1d");
  const range = String(body.range || "3mo");
  if (!ALLOWED_INTERVALS.has(interval) || !ALLOWED_RANGES.has(range) || !INTERVAL_RANGE_MATRIX[interval]?.includes(range)) {
    throw Object.assign(new Error("Unsupported chart interval or range"), { status: 400 });
  }
  const [stored, historyRows] = await Promise.all([
    storedCandlesForInterval(base44, instrument, interval, body.market_code),
    readHistoricalSyncs(base44, instrument, body.market_code)
  ]);
  if (!stored.bars.length) {
    throw Object.assign(new Error("Stored chart data is not available until a market ingestion run provides it"), { status: 503, code: "CHART_DATA_NOT_AVAILABLE" });
  }
  const latestChunk = stored.latestChunk;
  const latestBarTime = new Date(stored.bars[stored.bars.length - 1].time).getTime();
  const history = historyRows.find((item) => item.status === "complete" && item.coverage_verified === true && item.provider_partial !== true) || historyRows[0] || null;
  const historyComplete = history?.status === "complete" && history?.coverage_verified === true && history?.provider_partial !== true;
  const rangeMetadata = candleRangeMetadata(stored.bars, interval, range, historyComplete);
  const cutoff = range === "max" ? Number.NEGATIVE_INFINITY : latestBarTime - RANGE_MILLISECONDS[range];
  const candles = stored.bars.filter((bar) => new Date(bar.time).getTime() >= cutoff);
  if (!candles.length) throw Object.assign(new Error("Stored chart data contains no valid candles for the requested range"), { status: 503, code: "CHART_DATA_NOT_AVAILABLE" });
  const source = sources.find((item) => item.id === latestChunk.source_id) || null;
  const asOf = latestChunk.provider_as_of || stored.latestSourceTime || latestChunk.end_time || candles[candles.length - 1].time;
  const momentumBars = stored.bars.map((bar, index) => ({
    ...bar,
    is_final: index < stored.bars.length - 1 || latestChunk?.is_final !== false,
  }));
  const momentumIndicator = calculateMomentumZones(
    momentumBars,
    Math.min(30, Math.max(6, Math.round(Number(body.lookback_days) || 20))),
    Number.POSITIVE_INFINITY,
    interval,
  );
  return {
    candles,
    momentum_indicator: momentumIndicator ? {
      indicator_key: "momentum_zones",
      timeframe: interval,
      values: momentumIndicator,
      source_as_of: momentumBars.filter((bar) => bar.is_final !== false).at(-1)?.time || null,
      calculated_at: new Date().toISOString(),
      formula_version: MOMENTUM_FORMULA_VERSION,
    } : null,
    as_of: asOf,
    data_state: stateFor(asOf, source),
    data_meta: {
      source_time: asOf,
      received_time: latestChunk.updated_date || latestChunk.created_date || asOf,
      delay_seconds: Number(source?.delay_seconds || SAUDI_DELAY_SECONDS),
      quality_status: latestChunk.quality_status,
      license_status: source?.license_status || "restricted",
      requested_interval: interval,
      available_intervals: availableIntervals(stored.storedIntervals),
      stored_interval: stored.storedInterval,
      stored_intervals: stored.storedIntervals,
      snapshot_version: latestChunk.snapshot_version || null,
      run_id: latestChunk.run_id || null,
      provider_as_of: latestChunk.provider_as_of || asOf,
      history_status: history?.status || "not_started",
      history_complete: historyComplete,
      history_available_from: history?.earliest_bar_time || stored.bars[0]?.time || null,
      history_available_to: history?.latest_bar_time || stored.bars.at(-1)?.time || null,
      history_bar_count: Number(history?.bar_count || stored.bars.length),
      history_provider_partial: history?.provider_partial === true,
      requested_range: range,
      requested_from: rangeMetadata.requestedFrom,
      available_from: rangeMetadata.availableFrom,
      available_to: rangeMetadata.availableTo,
      available_ranges: rangeMetadata.availableRanges,
      range_complete: rangeMetadata.complete,
      returned_bar_count: candles.length,
      stored_bar_count: stored.bars.length
    }
  };
}
function quoteView(quote, source) {
  if (!quote) return null;
  const asOf = quote.provider_as_of || quote.source_time || quote.quote_time;
  return {
    ...quote,
    data_state: stateFor(asOf, source, Date.now(), {
      isFinal: quote.is_final,
      freshnessStatus: quote.freshness_status
    }),
    data_meta: {
      source_time: quote.source_time || quote.quote_time,
      provider_as_of: asOf,
      last_trade_time: quote.last_trade_time || null,
      received_time: quote.received_time || quote.updated_date,
      delay_seconds: Number(quote.delay_seconds || source?.delay_seconds || SAUDI_DELAY_SECONDS),
      snapshot_version: quote.snapshot_version || null,
      market_phase: quote.market_phase || null,
      freshness_status: quote.freshness_status || "stale",
      quality_status: quote.quality_status,
      license_status: quote.license_status || source?.license_status || "pending",
      is_final: quote.is_final === true
    }
  };
}
function latestSnapshot(instruments, quoteByInstrument, sourceById, requestedMarket) {
  const clock = marketClockFor(requestedMarket);
  const fallback = {
    market_code: requestedMarket,
    session_phase: marketPhaseFor(requestedMarket, clock),
    as_of: null,
    received_at: null,
    delay_seconds: SAUDI_DELAY_SECONDS,
    snapshot_version: null,
    coverage_percent: 0,
    freshness_status: "stale",
    is_final: false
  };
  const candidates = instruments.map((instrument) => quoteByInstrument.get(instrument.id)).filter(Boolean)
    .filter((quote) => quote.snapshot_version)
    .sort((a, b) => new Date(b.received_time || b.updated_date || 0).getTime() - new Date(a.received_time || a.updated_date || 0).getTime());
  if (!candidates.length) {
    const reference = instruments.map((instrument) => quoteByInstrument.get(instrument.id)).filter(Boolean)
      .sort((a, b) => new Date(b.source_time || b.quote_time || 0).getTime() - new Date(a.source_time || a.quote_time || 0).getTime())[0];
    return reference ? {
      ...fallback,
      as_of: reference.provider_as_of || reference.source_time || reference.quote_time || null,
      received_at: reference.received_time || reference.updated_date || null
    } : fallback;
  }
  const licensedCandidate = candidates.find((quote) => {
    const source = sourceById.get(quote.source_id);
    return source?.source_type === "licensed"
      && source?.license_status === "approved"
      && source?.public_enabled === true;
  });
  const selected = licensedCandidate || candidates[0];
  const selectedSource = sourceById.get(selected.source_id);
  const snapshotVersion = selected.snapshot_version;
  const current = candidates.filter((quote) => quote.snapshot_version === snapshotVersion);
  const denominator = requestedMarket === "SA_MAIN" ? EXPECTED_INSTRUMENT_COUNT : Math.max(instruments.length, 1);
  const coveragePercent = Math.round(current.length / denominator * 10000) / 100;
  const freshness = current.some((quote) => stateFor(
    quote.provider_as_of || quote.source_time || quote.quote_time,
    sourceById.get(quote.source_id),
    Date.now(),
    { isFinal: quote.is_final, freshnessStatus: quote.freshness_status },
  ).stale)
    ? "stale"
    : coveragePercent >= COVERAGE_HEALTHY_PERCENT
      ? "healthy"
      : coveragePercent >= COVERAGE_FAILED_PERCENT
        ? "degraded"
        : "failed";
  const latestValue = (field, fallbackField) => current.map((quote) => quote[field] || quote[fallbackField]).filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;
  return {
    market_code: requestedMarket,
    session_phase: current[0].market_phase || marketPhaseFor(requestedMarket, clock),
    as_of: latestValue("provider_as_of", "source_time"),
    received_at: latestValue("received_time", "updated_date"),
    delay_seconds: Math.max(0, ...current.map((quote) => Number(quote.delay_seconds || selectedSource?.delay_seconds || SAUDI_DELAY_SECONDS))),
    snapshot_version: snapshotVersion,
    coverage_percent: coveragePercent,
    freshness_status: freshness,
    is_final: current.length > 0 && current.every((quote) => quote.is_final === true)
  };
}
function cleanSectorName(value) {
  const sector = String(value || "").trim();
  if (!sector || sector.length > 120) throw Object.assign(new Error("Valid sector is required"), { status: 400, code: "INVALID_SECTOR" });
  return sector;
}
async function sectorInstruments(base44, body) {
  const requestedMarket = String(body.market_code || "SA_MAIN");
  const sector = cleanSectorName(body.sector);
  const instruments = entityRows(await entityReadWithRetry(() => base44.asServiceRole.entities.Instrument.filter({ market_code: requestedMarket }, "symbol", 500)))
    .map(localizedInstrument)
    .filter((item) => item.sector_ar === sector || item.sector_en === sector);
  if (!instruments.length) throw Object.assign(new Error("Sector not found"), { status: 404, code: "SECTOR_NOT_FOUND" });
  return { requestedMarket, sector, instruments };
}
function sectorWeights(instruments, quoteByInstrument) {
  const caps = instruments.map((instrument) => Math.max(0, Number(quoteByInstrument.get(instrument.id)?.market_cap || 0)));
  const total = caps.reduce((sum, value) => sum + value, 0);
  return new Map(instruments.map((instrument, index) => [instrument.id, total > 0 ? caps[index] / total : 1 / instruments.length]));
}
function sectorSummaries(instruments, quoteByInstrument, marketCode) {
  const equities = instruments.filter((instrument) => instrument.status !== "delisted");
  const groups = new Map();
  for (const instrument of equities) {
    const key = instrument.sector_ar || instrument.sector_en;
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(instrument);
  }
  return [...groups.values()].map((members) => {
    const weights = sectorWeights(members, quoteByInstrument);
    const weighted = (valueFor) => {
      let sum = 0;
      let coverage = 0;
      for (const instrument of members) {
        const value = Number(valueFor(instrument));
        const weight = Number(weights.get(instrument.id) || 0);
        if (!Number.isFinite(value) || !weight) continue;
        sum += value * weight;
        coverage += weight;
      }
      return coverage > 0 ? sum / coverage : null;
    };
    const currentChange = weighted((instrument) => quoteByInstrument.get(instrument.id)?.change_percent);
    const movementStatus = Number(currentChange) <= -1.5
      ? "strong_down"
      : Number(currentChange) >= 1.5
        ? "strong_up"
        : Number(currentChange) > 0.05
          ? "up"
          : Number(currentChange) < -0.05
            ? "soft_down"
            : "neutral";
    return {
      symbol: sectorTicker(members[0].sector_en, members[0].sector_ar),
      market_code: members[0].market_code || "SA_MAIN",
      instrument_type: "sector_index",
      name_ar: `\u0645\u0624\u0634\u0631 \u0642\u0637\u0627\u0639 ${members[0].sector_ar}`,
      name_en: `${members[0].sector_en} Sector Index`,
      sector_ar: members[0].sector_ar,
      sector_en: members[0].sector_en,
      constituent_count: members.length,
      change_percent: currentChange == null ? null : Number(currentChange.toFixed(4)),
      prior_change_percent: null,
      movement_status: movementStatus
    };
  }).sort((a, b) => String(a.sector_ar).localeCompare(String(b.sector_ar), "ar"));
}
async function sectorResponse(base44, body, sourceById) {
  const { requestedMarket, sector, instruments } = await sectorInstruments(base44, body);
  const quotes = entityRows(await entityReadWithRetry(() => base44.asServiceRole.entities.QuoteLatest.filter({ market_code: requestedMarket, instrument_id: { $in: instruments.map((instrument) => instrument.id) } }, "-quote_time", 1000)));
  const quoteByInstrument = new Map();
  for (const quote of quotes) if (usableQuote(quote) && !quoteByInstrument.has(quote.instrument_id)) quoteByInstrument.set(quote.instrument_id, quote);
  const weights = sectorWeights(instruments, quoteByInstrument);
  const constituents = instruments.map((instrument) => {
    const quote = quoteByInstrument.get(instrument.id) || null;
    return { ...instrument, quote: quoteView(quote, quote ? sourceById.get(quote.source_id) : null), sector_weight: weights.get(instrument.id) || 0 };
  });
  const available = constituents.filter((item) => item.quote);
  const weightedChange = available.reduce((sum, item) => sum + Number(item.quote.change_percent || 0) * Number(item.sector_weight || 0), 0);
  const weightCoverage = available.reduce((sum, item) => sum + Number(item.sector_weight || 0), 0);
  const changePercent = weightCoverage > 0 ? weightedChange / weightCoverage : 0;
  const previousClose = 1000;
  const lastPrice = previousClose * (1 + changePercent / 100);
  const latestAsOf = available.map((item) => item.quote.provider_as_of || item.quote.source_time || item.quote.quote_time).filter(Boolean).sort().at(-1) || null;
  return {
    sector: {
      key: `${requestedMarket}:${sector}`,
      symbol: sectorTicker(instruments[0].sector_en, instruments[0].sector_ar),
      instrument_code: sectorTicker(instruments[0].sector_en, instruments[0].sector_ar),
      instrument_type: "sector_index",
      market_code: requestedMarket,
      name_ar: instruments[0].sector_ar,
      name_en: instruments[0].sector_en,
      constituent_count: instruments.length,
      methodology: available.some((item) => Number(item.quote?.market_cap || 0) > 0) ? "market_cap_weighted" : "equal_weighted"
    },
    quote: {
      last_price: Number(lastPrice.toFixed(4)),
      previous_close: previousClose,
      change_value: Number((lastPrice - previousClose).toFixed(4)),
      change_percent: Number(changePercent.toFixed(4)),
      provider_as_of: latestAsOf,
      received_time: available.map((item) => item.quote.received_time).filter(Boolean).sort().at(-1) || latestAsOf,
      delay_seconds: Math.max(0, ...available.map((item) => Number(item.quote.delay_seconds || SAUDI_DELAY_SECONDS)))
    },
    constituents
  };
}
async function sectorChartResponse(base44, body) {
  const { requestedMarket, sector, instruments } = await sectorInstruments(base44, body);
  const interval = String(body.interval || "1d");
  const range = String(body.range || "3mo");
  if (!ALLOWED_INTERVALS.has(interval) || !ALLOWED_RANGES.has(range) || !INTERVAL_RANGE_MATRIX[interval]?.includes(range)) {
    throw Object.assign(new Error("Unsupported chart interval or range"), { status: 400 });
  }
  const quotes = entityRows(await entityReadWithRetry(() => base44.asServiceRole.entities.QuoteLatest.filter({ market_code: requestedMarket, instrument_id: { $in: instruments.map((instrument) => instrument.id) } }, "-quote_time", 1000)));
  const quoteByInstrument = new Map();
  for (const quote of quotes) if (usableQuote(quote) && !quoteByInstrument.has(quote.instrument_id)) quoteByInstrument.set(quote.instrument_id, quote);
  const weights = sectorWeights(instruments, quoteByInstrument);
  const storedByInstrument = await storedCandlesForInstruments(base44, instruments, interval, requestedMarket, range);
  const candlesByInstrument = instruments.map((instrument) => ({
    instrument,
    stored: storedByInstrument.get(instrument.id) || { bars: [] }
  }));
  const latestTime = Math.max(...candlesByInstrument.flatMap(({ stored }) => stored.bars.map((bar) => new Date(bar.time).getTime())).filter(Number.isFinite));
  if (!Number.isFinite(latestTime)) throw Object.assign(new Error("Stored sector chart data is not available"), { status: 503, code: "CHART_DATA_NOT_AVAILABLE" });
  const cutoff = range === "max" ? Number.NEGATIVE_INFINITY : latestTime - RANGE_MILLISECONDS[range];
  const series = candlesByInstrument.map(({ instrument, stored }) => {
    const fullBars = stored.bars.filter((bar) => Number(bar.close) > 0);
    const base = Number(fullBars[0]?.close);
    const bars = fullBars.filter((bar) => new Date(bar.time).getTime() >= cutoff);
    return { instrument, weight: weights.get(instrument.id) || 0, base, bars, fullBars };
  }).filter((item) => Number.isFinite(item.base) && item.base > 0 && item.bars.length);
  if (!series.length) throw Object.assign(new Error("Stored sector chart data contains no valid candles"), { status: 503, code: "CHART_DATA_NOT_AVAILABLE" });
  const coverageTimeline = [...new Set(series.flatMap((item) => item.fullBars.map((bar) => new Date(bar.time).toISOString())))].sort();
  const timestamps = [...new Set(series.flatMap((item) => item.bars.map((bar) => new Date(bar.time).toISOString())))].sort();
  const barMaps = new Map(series.map((item) => [item.instrument.id, new Map(item.bars.map((bar) => [new Date(bar.time).toISOString(), bar]))]));
  const allCandles = timestamps.map((time) => {
    const members = series.map((item) => ({ item, bar: barMaps.get(item.instrument.id).get(time) })).filter((value) => value.bar);
    const presentWeight = members.reduce((sum, value) => sum + value.item.weight, 0);
    if (!presentWeight) return null;
    const aggregate = (field) => members.reduce((sum, value) => sum + (Number(value.bar[field]) / value.item.base * 1000) * (value.item.weight / presentWeight), 0);
    const open = aggregate("open");
    const close = aggregate("close");
    const rawHigh = aggregate("high");
    const rawLow = aggregate("low");
    return {
      time,
      open: Number(open.toFixed(6)),
      high: Number(Math.max(rawHigh, open, close).toFixed(6)),
      low: Number(Math.min(rawLow, open, close).toFixed(6)),
      close: Number(close.toFixed(6)),
      volume: members.reduce((sum, value) => sum + Math.max(0, Number(value.bar.volume || 0)), 0)
    };
  }).filter(Boolean);
  const rangeMetadata = candleRangeMetadata(coverageTimeline.map((time) => ({ time })), interval, range, false);
  const candles = allCandles;
  if (candles.length < 2) throw Object.assign(new Error("Stored sector chart data is incomplete"), { status: 503, code: "CHART_DATA_NOT_AVAILABLE" });
  const momentumIndicator = calculateMomentumZones(
    candles,
    Math.min(30, Math.max(6, Math.round(Number(body.lookback_days) || 20))),
    Number.POSITIVE_INFINITY,
    interval,
  );
  return {
    sector,
    candles,
    momentum_indicator: momentumIndicator ? {
      indicator_key: "momentum_zones",
      timeframe: interval,
      values: momentumIndicator,
      source_as_of: candles.at(-1)?.time || null,
      calculated_at: new Date().toISOString(),
      formula_version: MOMENTUM_FORMULA_VERSION,
    } : null,
    as_of: candles[candles.length - 1].time,
    methodology: series.some((item) => Number(quoteByInstrument.get(item.instrument.id)?.market_cap || 0) > 0) ? "market_cap_weighted" : "equal_weighted",
    data_meta: {
      requested_interval: interval,
      requested_range: range,
      requested_from: rangeMetadata.requestedFrom,
      available_from: rangeMetadata.availableFrom,
      available_to: rangeMetadata.availableTo,
      available_ranges: rangeMetadata.availableRanges,
      range_complete: rangeMetadata.complete,
      returned_bar_count: candles.length,
      stored_bar_count: coverageTimeline.length
    }
  };
}
Deno.serve(async (req) => {
  let requestDetails = {};
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req);
    requestDetails = {
      action: body?.action || "snapshot",
      market_code: body?.market_code || null,
      symbol: body?.symbol || null,
      sector: body?.sector || null,
      interval: body?.interval || null,
      range: body?.range || null,
    };
    const accessContext = await requireMarketAccess(base44, body);
    if (body.action === "sector_summaries") {
      const requestedMarket = String(body.market_code || "").toUpperCase();
      const instruments = entityRows(await entityReadWithRetry(() => base44.asServiceRole.entities.Instrument.filter({ market_code: requestedMarket }, "symbol", 500)))
        .filter((item) => requestedMarket !== "SA_MAIN" || MAIN_MARKET_SYMBOLS.has(item.symbol));
      if (requestedMarket === "SA_MAIN" && instruments.length !== MAIN_MARKET_SYMBOLS.size) {
        throw Object.assign(new Error(`Main-market catalog mismatch: ${instruments.length}/${MAIN_MARKET_SYMBOLS.size}`), { status: 503 });
      }
      if (requestedMarket === US_OPTIONS_MARKET_CODE && instruments.length !== US_OPTIONS_CATALOG.companies.length) {
        throw Object.assign(new Error(`U.S. options catalog mismatch: ${instruments.length}/${US_OPTIONS_CATALOG.companies.length}`), { status: 503, code: "US_OPTIONS_CATALOG_INCOMPLETE" });
      }
      if (requestedMarket === US_BENCHMARKS_MARKET_CODE && (instruments.length !== US_BENCHMARKS_CATALOG.instruments.length || instruments.some((item) => !US_BENCHMARKS_SYMBOLS.has(item.symbol)))) {
        throw Object.assign(new Error(`U.S. benchmarks catalog mismatch: ${instruments.length}/${US_BENCHMARKS_CATALOG.instruments.length}`), { status: 503, code: "US_BENCHMARKS_CATALOG_INCOMPLETE" });
      }
      const quotes = entityRows(await entityReadWithRetry(() => base44.asServiceRole.entities.QuoteLatest.filter({ market_code: requestedMarket, instrument_id: { $in: instruments.map((item) => item.id) } }, "-quote_time", 1000)));
      const quoteByInstrument = new Map();
      for (const quote of quotes) if (usableQuote(quote) && !quoteByInstrument.has(quote.instrument_id)) quoteByInstrument.set(quote.instrument_id, quote);
      return Response.json({
        market_code: requestedMarket,
        sector_summaries: sectorSummaries(instruments, quoteByInstrument, requestedMarket),
      });
    }
    const sources = await optionalRows(
      () => base44.asServiceRole.entities.DataSource.list("-last_verified_at", 20),
      "data-source"
    );
    const sourceById = new Map(sources.map((item) => [item.id, item]));
    if (body.action === "markets") {
      const allowed = new Set(marketAccessForContext(accessContext).map((item) => item.market_code));
      return Response.json({ markets: MARKET_CATALOG.filter((market) => allowed.has(market.market_code) && market.active) });
    }
    if (body.action === "sector") return Response.json(await sectorResponse(base44, body, sourceById));
    if (body.action === "sector_chart") return Response.json(await sectorChartResponse(base44, body));
    if (body.action === "chart") return Response.json(await chartResponse(base44, body, sources));
    if (body.action === "instrument_search") {
      const query = normalizeSearchText(body.query);
      if (query.length < 1 || query.length > 120) throw Object.assign(new Error("Search query must be 1-120 characters"), { status: 400 });
      const limit = Math.min(Math.max(Number(body.limit || 12), 1), 25);
      const requestedMarket = String(body.market_code || "").toUpperCase();
      const [storedInstruments, aliases] = await Promise.all([
        base44.asServiceRole.entities.Instrument.filter({ market_code: requestedMarket }, "symbol", 500),
        optionalRows(() => base44.asServiceRole.entities.InstrumentAlias.filter({ market_code: requestedMarket, active: true }, "alias", 5e3), "instrument aliases")
      ]);
      const instruments = entityRows(storedInstruments)
        .map(localizedInstrument)
        .filter((item) => item.status !== "delisted");
      const quotes = await base44.asServiceRole.entities.QuoteLatest.filter({ market_code: requestedMarket, instrument_id: { $in: instruments.map((item) => item.id) } }, "-quote_time", 1000);
      const aliasesByInstrument = new Map();
      for (const alias of entityRows(aliases)) {
        if (!aliasesByInstrument.has(alias.instrument_id)) aliasesByInstrument.set(alias.instrument_id, []);
        aliasesByInstrument.get(alias.instrument_id).push(alias.alias, alias.normalized_alias);
      }
      const candidates = instruments.map((instrument) => ({
        ...instrument,
        instrument_type: instrument.instrument_type || "equity",
        search_aliases: aliasesByInstrument.get(instrument.id) || []
      }));
      const sectors = new Map();
      for (const instrument of instruments) {
        const key = instrument.sector_ar || instrument.sector_en;
        if (!key) continue;
        if (!sectors.has(key)) sectors.set(key, { instruments: [], sample: instrument });
        sectors.get(key).instruments.push(instrument);
      }
      for (const { instruments: members, sample } of sectors.values()) {
        const symbol = sectorTicker(sample.sector_en, sample.sector_ar);
        candidates.push({
          id: `sector:${requestedMarket}:${symbol}`,
          symbol,
          instrument_code: symbol,
          instrument_type: "sector_index",
          market_code: requestedMarket,
          name_ar: `\u0645\u0624\u0634\u0631 \u0642\u0637\u0627\u0639 ${sample.sector_ar}`,
          name_en: `${sample.sector_en} Sector Index`,
          sector_ar: sample.sector_ar,
          sector_en: sample.sector_en,
          status: "active",
          constituent_count: members.length,
          search_aliases: [sample.sector_ar, sample.sector_en, `\u0642\u0637\u0627\u0639 ${sample.sector_ar}`, `\u0645\u0624\u0634\u0631 ${sample.sector_ar}`]
        });
      }
      if (requestedMarket === "SA_MAIN" && !candidates.some((item) => item.symbol === TASI_SYMBOL)) {
        candidates.push({
          id: "market-index:SA_MAIN:TASI",
          symbol: TASI_SYMBOL,
          instrument_code: TASI_SYMBOL,
          instrument_type: "market_index",
          market_code: requestedMarket,
          name_ar: "\u0645\u0624\u0634\u0631 \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629 (\u062a\u0627\u0633\u064a)",
          name_en: "Tadawul All Share Index (TASI)",
          sector_ar: "\u0645\u0624\u0634\u0631\u0627\u062a \u0627\u0644\u0633\u0648\u0642",
          sector_en: "Market Indices",
          status: "active",
          search_aliases: ["\u062a\u0627\u0633\u064a", "\u0627\u0644\u0645\u0624\u0634\u0631 \u0627\u0644\u0639\u0627\u0645", "Saudi market index"]
        });
      }
      const ranked = candidates.map((candidate) => ({ candidate, score: searchCandidateScore(candidate, query) }))
        .filter((item) => Number.isFinite(item.score))
        .sort((left, right) => left.score - right.score || String(left.candidate.symbol).localeCompare(String(right.candidate.symbol), "en"))
        .slice(0, limit)
        .map((item) => item.candidate);
      const ids = new Set(instruments.map((item) => item.id));
      const quoteByInstrument = new Map();
      for (const quote of entityRows(quotes)) if (ids.has(quote.instrument_id) && usableQuote(quote) && !quoteByInstrument.has(quote.instrument_id)) quoteByInstrument.set(quote.instrument_id, quote);
      return Response.json({
        instruments: ranked.map((instrument) => {
          let quote = quoteByInstrument.get(instrument.id) || null;
          if (instrument.instrument_type === "sector_index") {
            const members = sectors.get(instrument.sector_ar)?.instruments || [];
            const weights = sectorWeights(members, quoteByInstrument);
            const available = members.map((member) => ({ quote: quoteByInstrument.get(member.id), weight: weights.get(member.id) || 0 })).filter((item) => item.quote);
            const coverage = available.reduce((sum, item) => sum + item.weight, 0);
            const change = coverage > 0 ? available.reduce((sum, item) => sum + Number(item.quote.change_percent || 0) * item.weight, 0) / coverage : null;
            quote = change == null ? null : { last_price: 1000 * (1 + change / 100), previous_close: 1000, change_percent: change };
          }
          const { search_aliases: _searchAliases, ...result } = instrument;
          return {
          ...result,
          id: instrument.id,
          symbol: instrument.symbol,
          instrument_code: instrument.instrument_code || instrument.symbol,
          instrument_type: instrument.instrument_type || "equity",
          market_code: instrument.market_code || requestedMarket,
          name_ar: instrument.name_ar,
          name_en: instrument.name_en,
          sector_ar: instrument.sector_ar,
          sector_en: instrument.sector_en,
          status: instrument.status,
          quote: instrument.instrument_type === "sector_index" ? quote : quoteView(quote, sourceById.get(quote?.source_id)),
        };
        }),
      });
    }
    if (body.symbol || body.instrument_id) {
      const instrument = await instrumentFor(base44, body);
      const [quotes2, indicators2, financials, actions, announcements, shareholders, losses2] = await Promise.all([
        base44.asServiceRole.entities.QuoteLatest.filter({ instrument_id: instrument.id, market_code: body.market_code }),
        optionalRows(() => readIndicatorSnapshots(base44, { instrument_id: instrument.id, market_code: body.market_code }, body.market_code), "company indicators"),
        instrument.market_code === US_BENCHMARKS_MARKET_CODE ? Promise.resolve([]) : optionalRows(() => base44.asServiceRole.entities.CompanyFinancial.filter({ instrument_id: instrument.id, market_code: body.market_code }), "company financials"),
        instrument.market_code === US_BENCHMARKS_MARKET_CODE ? Promise.resolve([]) : optionalRows(() => base44.asServiceRole.entities.CorporateAction.filter({ instrument_id: instrument.id, market_code: body.market_code }), "company actions"),
        instrument.market_code === US_BENCHMARKS_MARKET_CODE ? Promise.resolve([]) : optionalRows(() => base44.asServiceRole.entities.CompanyAnnouncement.filter({ instrument_id: instrument.id, market_code: body.market_code }), "company announcements"),
        instrument.market_code === US_BENCHMARKS_MARKET_CODE ? Promise.resolve([]) : optionalRows(() => base44.asServiceRole.entities.MajorShareholder.filter({ instrument_id: instrument.id, market_code: body.market_code }), "company shareholders"),
        instrument.market_code === "SA_MAIN" ? optionalRows(() => base44.asServiceRole.entities.LossClassification.filter({ instrument_id: instrument.id }), "company loss classification") : Promise.resolve([])
      ]);
      let quote = quotes2.filter(usableQuote).sort((a, b) => new Date(b.quote_time).getTime() - new Date(a.quote_time).getTime())[0] || null;
      if (!quote && instrument.instrument_type === "market_index") {
        const stored = await storedCandlesForInterval(base44, instrument, "1d", body.market_code);
        const current = stored.bars.at(-1) || null;
        const previous = stored.bars.at(-2) || null;
        if (current && previous && Number(previous.close) > 0) {
          const changeValue = Number(current.close) - Number(previous.close);
          quote = {
            instrument_id: instrument.id,
            symbol: instrument.symbol,
            last_price: Number(current.close),
            previous_close: Number(previous.close),
            change_value: changeValue,
            change_percent: changeValue / Number(previous.close) * 100,
            open: Number(current.open),
            high: Number(current.high),
            low: Number(current.low),
            volume: Number(current.volume || 0),
            quote_time: current.time,
            provider_as_of: current.time,
            received_time: stored.latestChunk?.received_time || stored.latestChunk?.updated_date || current.time,
            delay_seconds: 0,
            quality_status: stored.latestChunk?.quality_status || "accepted",
            freshness_status: "stale",
            license_status: "approved",
            is_final: true
          };
        }
      }
      const source = quote ? sourceById.get(quote.source_id) : null;
      const indicators = entityRows(indicators2).sort((a, b) => String(b.source_as_of || b.calculated_at || b.updated_date || "").localeCompare(String(a.source_as_of || a.calculated_at || a.updated_date || "")));
      const requestedTimeframe = ALLOWED_INTERVALS.has(String(body.timeframe || "1d")) ? String(body.timeframe || "1d") : "1d";
      const momentumIndicator = indicators.find((item) => item.indicator_key === "momentum_zones" && item.timeframe === requestedTimeframe) || null;
      const shareholderRows = instrument.market_code === US_OPTIONS_MARKET_CODE && shareholders.length
        ? shareholders.filter((item) => item.as_of === shareholders.map((row) => row.as_of || "").sort().at(-1))
        : shareholders;
      return Response.json({
        instrument: { ...instrument, warning_flag: losses2[0]?.level === "none" ? null : losses2[0]?.level },
        quote: quoteView(quote, source),
        indicators,
        momentum_indicator: momentumIndicator,
        financials: financials.sort((a, b) => String(b.period_end || b.as_of || "").localeCompare(String(a.period_end || a.as_of || ""))),
        actions: actions.sort((a, b) => String(b.ex_date || b.as_of || "").localeCompare(String(a.ex_date || a.as_of || ""))),
        announcements: announcements.sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || ""))),
        shareholders: shareholderRows.sort((a, b) => Number(b.ownership_percent || 0) - Number(a.ownership_percent || 0)),
        loss_classification: losses2[0] || null,
        notice: quote?.snapshot_version
          ? "\u0628\u064A\u0627\u0646\u0627\u062A \u0633\u0648\u0642 \u0645\u062A\u0623\u062E\u0631\u0629 15 \u062F\u0642\u064A\u0642\u0629"
          : "\u0622\u062E\u0631 \u0628\u064A\u0627\u0646\u0627\u062A \u0633\u0648\u0642 \u0645\u062A\u0627\u062D\u0629"
      });
    }
    const limit = Math.min(Math.max(Number(body.limit || 500), 1), 500);
    const requestedMarket = String(body.market_code || "").toUpperCase();
    const instruments = entityRows(await entityReadWithRetry(() => base44.asServiceRole.entities.Instrument.filter({ market_code: requestedMarket }, "symbol", 500)))
      .map(localizedInstrument)
      .filter((item) => requestedMarket !== "SA_MAIN" || MAIN_MARKET_SYMBOLS.has(item.symbol));
    if (requestedMarket === US_OPTIONS_MARKET_CODE && instruments.some((item) => !US_OPTIONS_SYMBOLS.has(item.symbol))) {
      throw Object.assign(new Error("U.S. options catalog contains an out-of-scope instrument"), { status: 503, code: "CATALOG_ISOLATION_FAILED" });
    }
    const instrumentIds = instruments.map((item) => item.id);
    const screenerTimeframe = ["1d", "1wk", "1mo"].includes(String(body.timeframe || "1d")) ? String(body.timeframe || "1d") : "1d";
    const [quotes, indicators, losses] = await Promise.all([
      entityReadWithRetry(() => base44.asServiceRole.entities.QuoteLatest.filter({ market_code: requestedMarket, instrument_id: { $in: instrumentIds } }, "-quote_time", 1000)),
      body.mode === "screener"
        ? optionalRows(() => readIndicatorSnapshots(base44, {
          market_code: requestedMarket,
          instrument_id: { $in: instrumentIds },
          indicator_key: "technical_signals",
          timeframe: screenerTimeframe,
        }, requestedMarket, "-source_as_of", 1000), "indicator-snapshot")
        : Promise.resolve([]),
      optionalRows(() => base44.asServiceRole.entities.LossClassification.filter({ instrument_id: { $in: instrumentIds } }, "-as_of", 500), "loss-classification")
    ]);
    if (requestedMarket === "SA_MAIN" && instruments.length !== MAIN_MARKET_SYMBOLS.size) {
      throw Object.assign(new Error(`Main-market catalog mismatch: ${instruments.length}/${MAIN_MARKET_SYMBOLS.size}`), { status: 503 });
    }
    if (requestedMarket === US_OPTIONS_MARKET_CODE && instruments.length !== US_OPTIONS_CATALOG.companies.length) {
      throw Object.assign(new Error(`U.S. options catalog mismatch: ${instruments.length}/${US_OPTIONS_CATALOG.companies.length}`), { status: 503, code: "US_OPTIONS_CATALOG_INCOMPLETE" });
    }
    if (requestedMarket === US_BENCHMARKS_MARKET_CODE && (instruments.length !== US_BENCHMARKS_CATALOG.instruments.length || instruments.some((item) => !US_BENCHMARKS_SYMBOLS.has(item.symbol)))) {
      throw Object.assign(new Error(`U.S. benchmarks catalog mismatch: ${instruments.length}/${US_BENCHMARKS_CATALOG.instruments.length}`), { status: 503, code: "US_BENCHMARKS_CATALOG_INCOMPLETE" });
    }
    const quoteByInstrument = /* @__PURE__ */ new Map();
    for (const quote of quotes) if (usableQuote(quote) && !quoteByInstrument.has(quote.instrument_id)) quoteByInstrument.set(quote.instrument_id, quote);
    const sectorSummaryRows = [];
    const indicatorsByInstrument = new Map();
    const latestIndicatorByIdentity = new Map();
    for (const item of indicators) {
      const identity = `${item.instrument_id}:${item.indicator_key}:${item.timeframe}`;
      const current = latestIndicatorByIdentity.get(identity);
      const itemTime = Date.parse(item.source_as_of || item.calculated_at || item.updated_date || item.created_date || "") || 0;
      const currentTime = Date.parse(current?.source_as_of || current?.calculated_at || current?.updated_date || current?.created_date || "") || 0;
      if (!current || itemTime > currentTime) latestIndicatorByIdentity.set(identity, item);
    }
    for (const item of latestIndicatorByIdentity.values()) {
      if (!indicatorsByInstrument.has(item.instrument_id)) indicatorsByInstrument.set(item.instrument_id, []);
      indicatorsByInstrument.get(item.instrument_id).push(item);
    }
    const lossByInstrument = new Map(losses.map((item) => [item.instrument_id, item]));
    const query = String(body.query || "").trim().toLocaleLowerCase("ar");
    const sector = String(body.sector || "").trim();
    let rows = instruments.map((instrument) => {
      const quote = quoteByInstrument.get(instrument.id) || null;
      const source = quote ? sourceById.get(quote.source_id) : null;
      const loss = lossByInstrument.get(instrument.id) || null;
      const instrumentIndicators = indicatorsByInstrument.get(instrument.id) || [];
      const signals = Object.fromEntries(instrumentIndicators
        .filter((item) => item.indicator_key === "technical_signals")
        .map((item) => [item.timeframe, item]));
      const requestedSignalTimeframe = ["1d", "1wk", "1mo"].includes(String(body.timeframe || "1d")) ? String(body.timeframe || "1d") : "1d";
      const momentumIndicator = instrumentIndicators.find((item) => item.indicator_key === "momentum_zones" && item.timeframe === requestedSignalTimeframe) || null;
      return {
        ...instrument,
        warning_flag: loss?.level === "none" ? null : loss?.level,
        quote: quoteView(quote, source),
        indicator: momentumIndicator,
        indicators: instrumentIndicators,
        signals
      };
    }).filter((item) => !query || `${item.symbol} ${item.name_ar} ${item.name_en} ${item.sector_ar} ${item.sector_en}`.toLocaleLowerCase("ar").includes(query)).filter((item) => !sector || item.sector_ar === sector || item.sector_en === sector);
    if (body.mode === "screener") {
      const timeframe = ["1d", "1wk", "1mo"].includes(String(body.timeframe)) ? String(body.timeframe) : "1d";
      const supportedSignals = ["pin_bar_signal", "bullish_pin_bar", "bearish_pin_bar", "engulfing_signal", "bullish_engulfing", "bearish_engulfing", "zone_pin_bar", "bullish_zone_pin_bar", "bearish_zone_pin_bar", "price_cross_sma20", "price_cross_sma50", "sma20_cross_sma50"];
      const primarySignals = ["bullish_pin_bar", "bearish_pin_bar", "bullish_engulfing", "bearish_engulfing", "bullish_zone_pin_bar", "bearish_zone_pin_bar", "price_cross_sma20", "price_cross_sma50", "sma20_cross_sma50"];
      const signal = supportedSignals.includes(String(body.signal))
        ? String(body.signal)
        : "";
      rows = rows.flatMap((item) => {
        const snapshot = item.signals?.[timeframe];
        if (!snapshot) return [];
        const storedWindow = Array.isArray(snapshot.values?.signal_window)
          ? snapshot.values.signal_window.slice(0, 3)
          : [snapshot.values || {}];
        const match = signal
          ? storedWindow.find((values) => values?.[signal] === true)
          : storedWindow.find((values) => primarySignals.some((key) => values?.[key] === true));
        if (!match) return [];
        const primaryMatches = primarySignals.filter((key) => match?.[key] === true);
        const matchedSignals = primaryMatches.length ? primaryMatches : [signal].filter(Boolean);
        return [{
          ...item,
          screener_match: {
            timeframe,
            signal: signal || null,
            candle_offset: Number(match.offset || 0),
            matched_signals: matchedSignals,
            values: match,
          },
        }];
      });
    }
    if (body.mode === "movers") rows.sort((a, b) => Number(b.quote?.change_percent || 0) - Number(a.quote?.change_percent || 0));
    const snapshot = latestSnapshot(instruments, quoteByInstrument, sourceById, requestedMarket);
    return Response.json({
      instruments: rows.slice(0, limit),
      total: requestedMarket === "SA_MAIN" ? MAIN_MARKET_SYMBOLS.size : rows.length,
      sources: sources.map((source) => ({ source_type: source.source_type, license_status: source.license_status, last_verified_at: source.last_verified_at })),
      market: MARKET_CATALOG.find((market) => market.market_code === requestedMarket) || null,
      sector_summaries: sectorSummaryRows,
      snapshot,
      session_phase: snapshot.session_phase,
      as_of: snapshot.as_of,
      received_at: snapshot.received_at,
      delay_seconds: snapshot.delay_seconds,
      snapshot_version: snapshot.snapshot_version,
      coverage_percent: snapshot.coverage_percent,
      freshness_status: snapshot.freshness_status,
      is_final: snapshot.is_final,
      notice: snapshot.freshness_status === "stale"
        ? "\u0622\u062E\u0631 \u0628\u064A\u0627\u0646\u0627\u062A \u0633\u0648\u0642 \u0645\u062A\u0627\u062D\u0629"
        : "\u0628\u064A\u0627\u0646\u0627\u062A \u0633\u0648\u0642 \u0645\u062A\u0623\u062E\u0631\u0629 15 \u062F\u0642\u064A\u0642\u0629",
      signal_coverage: body.mode === "screener" ? {
        timeframe: ["1d", "1wk", "1mo"].includes(String(body.timeframe)) ? String(body.timeframe) : "1d",
        instrument_count: instruments.length,
        snapshot_count: [...latestIndicatorByIdentity.values()].filter((item) => item.indicator_key === "technical_signals" && item.timeframe === (["1d", "1wk", "1mo"].includes(String(body.timeframe)) ? String(body.timeframe) : "1d")).length,
        latest_calculated_at: [...latestIndicatorByIdentity.values()].map((item) => item.calculated_at).filter(Boolean).sort().at(-1) || null,
      } : null
    });
  } catch (error) {
    console.error("marketRead request failed", {
      ...requestDetails,
      status: Number(error?.status) || 500,
      code: error?.code || "BACKEND_FAILURE",
      message: error?.message || "Request failed",
    });
    return replyError(error);
  }
});
