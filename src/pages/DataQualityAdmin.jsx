import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, Wrench } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import { invokeAppFunction } from "@/services/marketService";
import { useActiveMarket } from "@/lib/MarketContext";
import { usePreferences } from "@/lib/preferences";

export default function DataQualityAdmin() {
  const { marketCode, market } = useActiveMarket();
  const { isArabic } = usePreferences();
  const [state, setState] = useState({ loading: true, reconciling: false, data: null, error: "", notice: "" });

  const load = useCallback(async () => {
    if (!marketCode) return;
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await invokeAppFunction("operationsQuality", { action: "issues", market_code: marketCode });
      setState((current) => ({ ...current, loading: false, data, error: "" }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error?.response?.data?.error || error.message }));
    }
  }, [marketCode]);

  useEffect(() => { load(); }, [load]);

  async function reconcileRecovered() {
    setState((current) => ({ ...current, reconciling: true, error: "", notice: "" }));
    try {
      const result = await invokeAppFunction("operationsQuality", {
        action: "reconcile_recovered_issues",
        market_code: marketCode,
        reason: "مراجعة آلية للمشاكل التي أعقبها تشغيل سوق ناجح وكامل",
        limit: 100,
      });
      await load();
      setState((current) => ({
        ...current,
        reconciling: false,
        notice: isArabic
          ? `أُغلقت ${result.resolved_count || 0} مشكلة متعافية. المتبقي للمراجعة: ${result.remaining_recovered_count || 0}.`
          : `${result.resolved_count || 0} recovered issues were closed. Remaining for review: ${result.remaining_recovered_count || 0}.`,
      }));
    } catch (error) {
      setState((current) => ({ ...current, reconciling: false, error: error?.response?.data?.error || error.message }));
    }
  }

  const issues = state.data?.issues || [];
  const summary = state.data?.issue_summary || {};
  return <>
    <PageHeader
      title={isArabic ? "جودة بيانات السوق" : "Market data quality"}
      description={isArabic ? `المشاكل الفعلية الحالية في ${market?.name_ar || "السوق"}، مع فصل السجلات التي تعافت عن الأعطال النشطة.` : `Current actionable issues in ${market?.name_en || "the market"}, with recovered records separated from active failures.`}
      action={<button type="button" className="secondary-button" onClick={load} disabled={state.loading}><RefreshCw size={15} className={state.loading ? "animate-spin" : ""} />{isArabic ? "تحديث" : "Refresh"}</button>}
    />
    <div className="mx-auto max-w-[1800px] space-y-4 px-4 pb-10">
      {state.loading && !state.data && <StatusPanel loading />}
      {state.error && <div className="error-banner">{state.error}</div>}
      {state.notice && <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-700 dark:text-emerald-200" role="status">{state.notice}</div>}
      {Number(summary.recovered_pending_reconciliation || 0) > 0 && <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-400/30 bg-sky-400/10 p-4">
        <div><b>{isArabic ? "سجلات قديمة تعافت" : "Recovered historical records"}</b><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{isArabic ? `${summary.recovered_pending_reconciliation} سجلًا لم يتكرر بعد تشغيل ناجح، ويمكن إغلاقه مع حفظ الأثر في سجل التدقيق.` : `${summary.recovered_pending_reconciliation} records did not recur after a successful run and can be closed with an audit trail.`}</p></div>
        <button type="button" className="primary-button" onClick={reconcileRecovered} disabled={state.reconciling}><Wrench size={15} />{state.reconciling ? (isArabic ? "جارٍ التدقيق…" : "Reconciling…") : (isArabic ? "إغلاق المتعافي" : "Close recovered")}</button>
      </section>}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="content-card"><span className="text-sm text-slate-500">{isArabic ? "المشاكل الفعلية" : "Active issues"}</span><b className="mt-3 block text-3xl font-black">{Number(summary.active_count || 0).toLocaleString(isArabic ? "ar-SA" : "en-US")}</b></div>
        <div className="content-card"><span className="text-sm text-slate-500">{isArabic ? "متعافية بانتظار الإغلاق" : "Recovered pending closure"}</span><b className="mt-3 block text-3xl font-black">{Number(summary.recovered_pending_reconciliation || 0).toLocaleString(isArabic ? "ar-SA" : "en-US")}</b></div>
        <div className="content-card"><span className="text-sm text-slate-500">{isArabic ? "السجلات المفتوحة المخزنة" : "Stored open records"}</span><b className="mt-3 block text-3xl font-black">{Number(summary.stored_open_count || 0).toLocaleString(isArabic ? "ar-SA" : "en-US")}</b></div>
      </section>
      <div className="space-y-3">{issues.map((issue) => <article key={issue.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d192a]"><div className="flex flex-wrap items-center justify-between gap-2"><b>{issue.symbol || (isArabic ? "السوق" : "Market")} · {issue.issue_type}</b><span className={"rounded-full px-3 py-1 text-xs font-bold " + (issue.severity === "critical" ? "bg-rose-500/15 text-rose-500" : "bg-amber-500/15 text-amber-500")}>{issue.severity}</span></div><p className="mt-2 text-sm text-slate-500">{issue.message}</p><p className="mt-2 text-xs text-slate-400">{isArabic ? "آخر ظهور" : "Last seen"}: {issue.last_seen_at ? new Date(issue.last_seen_at).toLocaleString(isArabic ? "ar-SA" : "en-US") : "—"} · {isArabic ? "التكرار" : "Occurrences"}: {issue.occurrence_count || 1}</p></article>)}
        {!state.loading && !issues.length && <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-8 text-center"><CheckCircle2 className="mx-auto text-emerald-500" size={28} /><b className="mt-3 block">{isArabic ? "لا توجد مشاكل فعلية مفتوحة في هذا السوق" : "No active issues are open for this market"}</b></div>}
      </div>
    </div>
  </>;
}
