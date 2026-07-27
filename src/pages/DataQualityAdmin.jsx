import React from "react";
import ServicePage from "@/components/ServicePage";

export default function DataQualityAdmin() {
  return <ServicePage title="مشاكل جودة بيانات السوق" description="القيم المرفوضة ونقص التغطية وفقد دورات التحديث دون استبدال آخر سعر سليم." functionName="adminMarketData" payload={{ action: "issues", status: "open", limit: 300 }}>
    {(data) => <div className="mx-auto max-w-[1800px] space-y-3 px-4 pb-10">{data.issues?.map((issue) => <article key={issue.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d192a]"><div className="flex flex-wrap items-center justify-between gap-2"><b>{issue.symbol || "السوق"} · {issue.issue_type}</b><span className={"rounded-full px-3 py-1 text-xs font-bold " + (issue.severity === "critical" ? "bg-rose-500/15 text-rose-500" : "bg-amber-500/15 text-amber-500")}>{issue.severity}</span></div><p className="mt-2 text-sm text-slate-500">{issue.message}</p><p className="mt-2 text-xs text-slate-400">آخر ظهور: {issue.last_seen_at ? new Date(issue.last_seen_at).toLocaleString("ar-SA") : "—"} · التكرار: {issue.occurrence_count || 1}</p></article>)}{!data.issues?.length && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-[#0d192a]">لا توجد مشاكل مفتوحة.</div>}</div>}
  </ServicePage>;
}
