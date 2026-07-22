import React from "react";

export default function SourceStamp({ quote }) {
  if (!quote) return <span className="text-xs text-slate-500">لم يصل السعر بعد</span>;
  return <div className="mt-2 text-xs text-slate-500"><span>{quote.source?.name || "مصدر مرجعي"}</span><span className="mx-2">·</span><time>{new Date(quote.quote_time).toLocaleString("ar-SA")}</time><span className="mx-2">·</span><span className={quote.data_state?.stale ? "text-amber-300" : "text-emerald-300"}>{quote.data_state?.label || "متأخرة"}</span></div>;
}