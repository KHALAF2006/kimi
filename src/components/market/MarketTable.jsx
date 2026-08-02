import React from "react";
import { SessionLink } from "@/components/SessionLink";
import { ExternalLink } from "lucide-react";
import LossFlagBadge from "@/components/market/LossFlagBadge";
import { companyDashboardPath, formatCompact, formatNumber, quoteDirection } from "@/lib/market";
import { usePreferences } from "@/lib/preferences";

function quoteStatusLabel(quote, isArabic) {
  const code = quote.data_state?.code;
  if (quote.is_final === true || code === "final") return isArabic ? "إغلاق نهائي" : "Final close";
  if (quote.freshness_status === "healthy" || quote.freshness_status === "degraded" || code === "delayed") return isArabic ? "متأخرة 15 دقيقة" : "Delayed 15 minutes";
  return isArabic ? "آخر بيانات متاحة" : "Latest available data";
}

export default function MarketTable({ rows = [], selectedSymbol = "", onSelect = null, detailsTimeframe = "" }) {
  const { language, isArabic } = usePreferences();
  const labels = isArabic
    ? ["الرمز", "الشركة", "السعر", "التغير", "نسبة التغير", "الإغلاق السابق", "أعلى / أدنى", "الحجم"]
    : ["Symbol", "Company", "Price", "Change", "Change %", "Prev close", "High / Low", "Volume"];

  function select(event, row) {
    if (!onSelect || event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) return;
    event.preventDefault();
    onSelect(row.symbol);
  }

  function signalDate(row) {
    const timestamp = Date.parse(row.screener_match?.values?.candle_time || "");
    if (!Number.isFinite(timestamp)) return "";
    return new Date(timestamp).toLocaleDateString(isArabic ? "ar-SA" : "en-US");
  }

  return <div className="market-table-shell">
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[980px] text-sm">
        <thead><tr>{labels.map((label) => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => {
            const quote = row.quote || {};
            const direction = quoteDirection(quote.change_percent);
            return <tr key={row.id || row.symbol} className={selectedSymbol === row.symbol ? "selected-market-row" : ""}>
              <td><SessionLink to={companyDashboardPath(row.symbol, detailsTimeframe)} onClick={(event) => select(event, row)} className="market-symbol">{row.symbol}<ExternalLink size={11} /></SessionLink></td>
              <td><SessionLink to={companyDashboardPath(row.symbol, detailsTimeframe)} onClick={(event) => select(event, row)} className="block"><b className="text-slate-950 dark:text-white">{isArabic ? row.name_ar : row.name_en}</b><span className="mt-1 block text-xs text-slate-500">{isArabic ? row.sector_ar : row.sector_en}</span>{signalDate(row) && <span className="mt-1 block text-[11px] font-bold text-amber-700 dark:text-amber-300">{isArabic ? "الإشارة: " : "Signal: "}{signalDate(row)}</span>}<div className="mt-1"><LossFlagBadge flag={row.warning_flag || row.loss_classification?.level} compact /></div></SessionLink></td>
              <td className="font-black">{formatNumber(quote.last_price, language)}<span className="mt-1 block text-[10px] font-medium text-slate-500">{quoteStatusLabel(quote, isArabic)}</span></td>
              <td className={"market-" + direction}>{Number(quote.change_value || 0) > 0 ? "+" : ""}{formatNumber(quote.change_value, language)}</td>
              <td className={"font-black market-" + direction}>{Number(quote.change_percent || 0) > 0 ? "+" : ""}{formatNumber(quote.change_percent, language)}%</td>
              <td>{formatNumber(quote.previous_close, language)}</td>
              <td><span className="market-up">{formatNumber(quote.high, language)}</span><span className="mx-1 text-slate-300">/</span><span className="market-down">{formatNumber(quote.low, language)}</span></td>
              <td>{formatCompact(quote.volume, language)}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    <div className="divide-y divide-slate-200 dark:divide-slate-800 md:hidden">
      {rows.map((row) => {
        const quote = row.quote || {};
        const direction = quoteDirection(quote.change_percent);
        return <SessionLink key={row.id || row.symbol} to={companyDashboardPath(row.symbol, detailsTimeframe)} onClick={(event) => select(event, row)} className={"block p-4 " + (selectedSymbol === row.symbol ? "bg-amber-50 dark:bg-amber-400/10" : "")}>
          <div className="flex items-start justify-between gap-3"><div><b>{row.symbol} · {isArabic ? row.name_ar : row.name_en}</b><p className="mt-1 text-xs text-slate-500">{isArabic ? row.sector_ar : row.sector_en}</p>{signalDate(row) && <p className="mt-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">{isArabic ? "الإشارة: " : "Signal: "}{signalDate(row)}</p>}<div className="mt-2"><LossFlagBadge flag={row.warning_flag || row.loss_classification?.level} compact /></div></div><div className="text-left" dir="ltr"><b className="text-lg">{formatNumber(quote.last_price, language)}</b><p className={"text-sm font-black market-" + direction}>{Number(quote.change_percent || 0) > 0 ? "+" : ""}{formatNumber(quote.change_percent, language)}%</p><p className="mt-1 text-[10px] text-slate-500" dir={isArabic ? "rtl" : "ltr"}>{quoteStatusLabel(quote, isArabic)}</p></div></div>
        </SessionLink>;
      })}
    </div>
    {!rows.length && <div className="p-12 text-center text-sm text-slate-500">{isArabic ? "لا توجد شركات تطابق البحث." : "No companies match these filters."}</div>}
  </div>;
}
