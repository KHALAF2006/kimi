import React, { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Database, RefreshCw } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import { useAuthorization } from "@/lib/AuthorizationContext";
import { invokeAppFunction } from "@/services/marketService";
import { useActiveMarket } from "@/lib/MarketContext";

function dateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" });
}

export default function OperationsAdmin() {
  const { can } = useAuthorization();
  const { marketCode, market } = useActiveMarket();
  const [state, setState] = useState({ loading: true, data: null, error: "", running: false, progress: "" });
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    if (!marketCode) return;
    setState((value) => ({ ...value, loading: true, error: "" }));
    try {
      const [healthResult, qualityResult] = await Promise.allSettled([
        invokeAppFunction("adminMarketData", { action: "health", market_code: marketCode }),
        invokeAppFunction("operationsQuality", { market_code: marketCode }),
      ]);
      if (healthResult.status === "rejected") throw healthResult.reason;
      const data = {
        ...healthResult.value,
        quality_summary: qualityResult.status === "fulfilled" ? qualityResult.value?.issue_summary : null,
      };
      setState({ loading: false, data, error: "", running: false, progress: "" });
    } catch (error) {
      setState((value) => ({ ...value, loading: false, error: error?.response?.data?.error || error?.message || "تعذر تحميل حالة السوق", running: false }));
    }
  }, [marketCode]);

  useEffect(() => { load(); }, [load]);

  async function run(action) {
    if (reason.trim().length < 10) {
      setState((value) => ({ ...value, error: "اكتب سبباً واضحاً من 10 أحرف على الأقل قبل التشغيل اليدوي." }));
      return;
    }
    setState((value) => ({ ...value, running: true, error: "", progress: "" }));
    try {
      if (action === "refresh_signals" && marketCode === "US_OPTIONS") {
        let batchIndex = 0;
        let batchCount = 1;
        do {
          setState((value) => ({ ...value, progress: `حساب دفعة الإشارات ${batchIndex + 1} من ${batchCount}` }));
          const result = await invokeAppFunction("usOptionsSignalRefresh", {
            mode: "projection_batch",
            reason,
            market_code: marketCode,
            batch_index: batchIndex,
          });
          batchCount = Math.max(1, Number(result?.batch_count) || 1);
          batchIndex += 1;
          if (batchIndex < batchCount) await new Promise((resolve) => setTimeout(resolve, 350));
        } while (batchIndex < batchCount);
      } else {
        await invokeAppFunction("adminMarketData", { action, reason, market_code: marketCode });
      }
      setReason("");
      await load();
    } catch (error) {
      setState((value) => ({ ...value, running: false, error: error?.response?.data?.error || error?.message || "فشل التشغيل اليدوي" }));
    }
  }

  const data = state.data;
  return <>
    <PageHeader title="تشغيل بيانات السوق" description={`مراقبة مزامنة ${market?.name_ar || "السوق"}، التغطية، جودة اللقطات واستهلاك الأتمتة.`} />
    <div className="mx-auto max-w-[1800px] space-y-5 px-4 pb-10">
      {state.loading && !data && <StatusPanel loading />}
      {state.error && <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-700 dark:text-rose-200">{state.error}</div>}
      {data && <>
        <section className={"rounded-2xl border p-5 " + (data.provider_readiness?.ready ? "border-emerald-400/30 bg-emerald-400/10" : "border-amber-400/30 bg-amber-400/10")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">{data.provider_readiness?.ready ? <CheckCircle2 className="text-emerald-500" /> : <AlertTriangle className="text-amber-500" />}<b>{data.provider_readiness?.ready ? "مصدر بيانات السوق مربوط" : "ربط مصدر بيانات السوق غير مكتمل"}</b></div>
            <button className="secondary-button" type="button" onClick={load} disabled={state.loading}><RefreshCw size={15} className={state.loading ? "animate-spin" : ""} />تحديث الحالة</button>
          </div>
          <p className="mt-3 text-sm opacity-75">نوع المصدر: {data.provider_readiness?.source_type || "—"} · حالة الاستخدام: {data.provider_readiness?.license_status || "pending"} · الخرائط: {data.provider_readiness?.mapping_count || 0}/{data.provider_readiness?.expected_mapping_count || 0}</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["تغطية آخر لقطة", `${Number(data.snapshot?.coverage_percent || 0).toFixed(1)}%`, Database],
            ["الأسهم القديمة", data.snapshot?.stale_count || 0, AlertTriangle],
            ["المشاكل الفعلية المفتوحة", data.quality_summary?.active_count ?? data.open_issue_count ?? 0, Activity],
            ["تشغيل شهري مقدر", data.automation_budget?.estimated_monthly_runs || 506, RefreshCw],
          ].map(([label, value, Icon]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]"><div className="flex items-center justify-between text-slate-500"><span className="text-sm">{label}</span><Icon size={17} /></div><b className="mt-4 block text-3xl font-black">{value}</b></div>)}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black">الأرشيف التاريخي الدائم</h2><p className="mt-1 text-sm text-slate-500">يُطلب السجل الناقص فقط، ثم تُقرأ الشموع اليومية والأسبوعية والشهرية من التخزين دون إعادة تحميله.</p></div><Database size={22} className={data.historical_archive?.complete ? "text-emerald-500" : "text-amber-500"} /></div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div><dt className="text-slate-500">مكتمل</dt><dd className="mt-1 text-xl font-black">{data.historical_archive?.complete_count || 0}/{data.historical_archive?.total_instruments || 0}</dd></div><div><dt className="text-slate-500">لم يبدأ</dt><dd className="mt-1 text-xl font-black">{data.historical_archive?.not_started_count || 0}</dd></div><div><dt className="text-slate-500">ناقص أو فاشل</dt><dd className="mt-1 text-xl font-black">{Number(data.historical_archive?.partial_count || 0) + Number(data.historical_archive?.failed_count || 0)}</dd></div><div><dt className="text-slate-500">شموع محفوظة</dt><dd className="mt-1 text-xl font-black">{Number(data.historical_archive?.bar_count || 0).toLocaleString("ar-SA")}</dd></div></dl>
        </section>

        {data.company_intelligence && <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black">معلومات الشركات الأمريكية</h2><p className="mt-1 text-sm text-slate-500">ملفات SEC والقوائم المالية والإفصاحات وكبار الملاك وإجراءات الشركات، محفوظة ومفصولة عن أسعار السوق.</p></div><Database size={22} className={data.company_intelligence.complete ? "text-emerald-500" : "text-amber-500"} /></div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div><dt className="text-slate-500">مكتمل</dt><dd className="mt-1 text-xl font-black">{data.company_intelligence.complete_count || 0}/{data.company_intelligence.total_instruments || 0}</dd></div><div><dt className="text-slate-500">لم يبدأ</dt><dd className="mt-1 text-xl font-black">{data.company_intelligence.not_started_count || 0}</dd></div><div><dt className="text-slate-500">جزئي</dt><dd className="mt-1 text-xl font-black">{data.company_intelligence.partial_count || 0}</dd></div><div><dt className="text-slate-500">فاشل</dt><dd className="mt-1 text-xl font-black">{data.company_intelligence.failed_count || 0}</dd></div></dl>
        </section>}

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]"><h2 className="font-black">آخر لقطة منشورة</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><dt className="text-slate-500">نسخة اللقطة</dt><dd className="break-all font-mono text-xs">{data.snapshot?.version || "—"}</dd><dt className="text-slate-500">وقت المصدر</dt><dd>{dateTime(data.snapshot?.provider_as_of)}</dd><dt className="text-slate-500">وقت الاستلام</dt><dd>{dateTime(data.snapshot?.received_at)}</dd><dt className="text-slate-500">إغلاق نهائي</dt><dd>{data.snapshot?.is_final ? "نعم" : "لا"}</dd></dl></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]"><h2 className="font-black">آخر تشغيل</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><dt className="text-slate-500">الحالة</dt><dd>{data.latest_run?.status || "—"}</dd><dt className="text-slate-500">بدأ</dt><dd>{dateTime(data.latest_run?.started_at)}</dd><dt className="text-slate-500">التغطية</dt><dd>{data.latest_run?.coverage_percent == null ? "—" : `${Number(data.latest_run.coverage_percent).toFixed(1)}%`}</dd><dt className="text-slate-500">المحاولات</dt><dd>{data.latest_run?.attempt_count || "—"}</dd></dl></div>
        </section>

        {can("data.ingestion.run") && <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]"><h2 className="font-black">تشغيل يدوي مراقب</h2><p className="mt-2 text-sm text-slate-500">كل محاولة وسببها تسجل في سجل التدقيق، ولا تستبدل آخر بيانات سليمة عند الفشل.</p>{state.progress && <p className="mt-3 text-sm font-bold text-sky-600 dark:text-sky-300" role="status">{state.progress}</p>}<textarea className="form-input mt-4 min-h-24 w-full" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="سبب إعادة التشغيل أو مطابقة الإغلاق…" maxLength={500} /><div className="mt-3 flex flex-wrap gap-2"><button className="primary-button" type="button" onClick={() => run("retry_slot")} disabled={state.running}>إعادة دورة الربع ساعة</button><button className="secondary-button" type="button" onClick={() => run("reconcile_close")} disabled={state.running}>مطابقة الإغلاق النهائي</button><button className="secondary-button" type="button" onClick={() => run("refresh_signals")} disabled={state.running}>تثبيت الشموع والإشارات</button><button className="secondary-button" type="button" onClick={() => run("backfill_history")} disabled={state.running || data.historical_archive?.complete}>تحميل السجل التاريخي الناقص</button>{data.company_intelligence && <button className="secondary-button" type="button" onClick={() => run("refresh_company_intelligence")} disabled={state.running || data.company_intelligence.complete}>تحديث معلومات الشركات</button>}</div></section>}
      </>}
    </div>
  </>;
}
