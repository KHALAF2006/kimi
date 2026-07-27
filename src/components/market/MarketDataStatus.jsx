import React from "react";
import { AlertTriangle, CheckCircle2, Clock3, Database } from "lucide-react";
import { usePreferences } from "@/lib/preferences";

const PHASES = {
  opening_auction: ["مزاد الافتتاح", "Opening auction"],
  continuous: ["السوق مفتوح", "Market open"],
  closing_auction: ["مزاد الإغلاق", "Closing auction"],
  trade_at_last: ["التداول على الإغلاق", "Trade at last"],
  closed: ["السوق مغلق", "Market closed"],
};

function dateTime(value, isArabic) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(isArabic ? "ar-SA" : "en-GB", {
    timeZone: "Asia/Riyadh",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function MarketDataStatus({ snapshot, notice }) {
  const { isArabic } = usePreferences();
  if (!snapshot && !notice) return null;
  const status = snapshot?.freshness_status || "experimental";
  const unsafe = ["experimental", "stale", "failed"].includes(status);
  const phase = PHASES[snapshot?.session_phase] || PHASES.closed;
  const Icon = unsafe ? AlertTriangle : CheckCircle2;
  const statusLabel = status === "experimental"
    ? (isArabic ? "بيانات تجريبية غير معتمدة" : "Unlicensed experimental data")
    : status === "stale"
      ? (isArabic ? "آخر بيانات سليمة — التحديث متوقف" : "Last good data — updates delayed")
      : status === "degraded"
        ? (isArabic ? "تغطية جزئية" : "Partial coverage")
        : snapshot?.is_final
          ? (isArabic ? "إغلاق نهائي" : "Final close")
          : (isArabic ? "متأخرة 15 دقيقة" : "Delayed 15 minutes");

  return <section className={"rounded-2xl border p-4 " + (unsafe ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100" : "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100")} aria-live="polite">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><Icon size={18} /><b>{statusLabel}</b></div>
      <span className="rounded-full border border-current/20 px-3 py-1 text-xs font-bold">{isArabic ? phase[0] : phase[1]}</span>
    </div>
    <p className="mt-2 text-sm opacity-80">{notice}</p>
    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
      <span className="flex items-center gap-2"><Clock3 size={14} />{isArabic ? "البيانات حتى: " : "Data as of: "}<b>{dateTime(snapshot?.as_of, isArabic)}</b></span>
      <span className="flex items-center gap-2"><Clock3 size={14} />{isArabic ? "وصلت المنصة: " : "Received: "}<b>{dateTime(snapshot?.received_at, isArabic)}</b></span>
      <span className="flex items-center gap-2"><Database size={14} />{isArabic ? "التغطية: " : "Coverage: "}<b>{Number(snapshot?.coverage_percent || 0).toFixed(1)}%</b></span>
    </div>
  </section>;
}
