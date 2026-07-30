import React, { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Database, RefreshCw } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import { useAuthorization } from "@/lib/AuthorizationContext";
import { invokeAppFunction } from "@/services/marketService";

function dateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" });
}

export default function OperationsAdmin() {
  const { can } = useAuthorization();
  const [state, setState] = useState({ loading: true, data: null, error: "", running: false });
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setState((value) => ({ ...value, loading: true, error: "" }));
    try {
      const data = await invokeAppFunction("adminMarketData", { action: "health" });
      setState({ loading: false, data, error: "", running: false });
    } catch (error) {
      setState((value) => ({ ...value, loading: false, error: error?.response?.data?.error || error?.message || "تعذر تحميل حالة السوق", running: false }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function run(action) {
    if (reason.trim().length < 10) {
      setState((value) => ({ ...value, error: "اكتب سبباً واضحاً من 10 أحرف على الأقل قبل التشغيل اليدوي." }));
      return;
    }
    setState((value) => ({ ...value, running: true, error: "" }));
    try {
      await invokeAppFunction("adminMarketData", { action, reason });
      setReason("");
      await load();
    } catch (error) {
      setState((value) => ({ ...value, running: false, error: error?.response?.data?.error || error?.message || "فشل التشغيل اليدوي" }));
    }
  }

  const data = state.data;
  return <>
    <PageHeader title="تشغيل بيانات السوق" description="مراقبة مزامنة السوق السعودي المتأخرة 15 دقيقة، التغطية، جودة اللقطات واستهلاك الأتمتة." />
    <div className="mx-auto max-w-[1800px] space-y-5 px-4 pb-10">
      {state.loading && !data && <StatusPanel loading />}
      {state.error && <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-700 dark:text-rose-200">{state.error}</div>}
      {data && <>
        <section className={"rounded-2xl border p-5 " + (data.provider_readiness?.ready ? "border-emerald-400/30 bg-emerald-400/10" : "border-amber-400/30 bg-amber-400/10")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">{data.provider_readiness?.ready ? <CheckCircle2 className="text-emerald-500" /> : <AlertTriangle className="text-amber-500" />}<b>{data.provider_readiness?.ready ? "مصدر البيانات المرخص جاهز للنشر" : "مصدر البيانات المرخص غير جاهز للنشر"}</b></div>
            <button className="secondary-button" type="button" onClick={load} disabled={state.loading}><RefreshCw size={15} className={state.loading ? "animate-spin" : ""} />تحديث الحالة</button>
          </div>
          <p className="mt-3 text-sm opacity-75">حالة الترخيص: {data.provider_readiness?.license_status || "pending"} · الخرائط المعتمدة: {data.provider_readiness?.mapping_count || 0}/{data.provider_readiness?.expected_mapping_count || 270} · العرض العام: {data.provider_readiness?.public_enabled ? "مفعّل" : "متوقف"}</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["تغطية آخر لقطة", `${Number(data.snapshot?.coverage_percent || 0).toFixed(1)}%`, Database],
            ["الأسهم القديمة", data.snapshot?.stale_count || 0, AlertTriangle],
            ["المشاكل المفتوحة", data.open_issue_count || 0, Activity],
            ["تشغيل شهري مقدر", data.automation_budget?.estimated_monthly_runs || 506, RefreshCw],
          ].map(([label, value, Icon]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]"><div className="flex items-center justify-between text-slate-500"><span className="text-sm">{label}</span><Icon size={17} /></div><b className="mt-4 block text-3xl font-black">{value}</b></div>)}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]"><h2 className="font-black">آخر لقطة منشورة</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><dt className="text-slate-500">نسخة اللقطة</dt><dd className="break-all font-mono text-xs">{data.snapshot?.version || "—"}</dd><dt className="text-slate-500">وقت المصدر</dt><dd>{dateTime(data.snapshot?.provider_as_of)}</dd><dt className="text-slate-500">وقت الاستلام</dt><dd>{dateTime(data.snapshot?.received_at)}</dd><dt className="text-slate-500">إغلاق نهائي</dt><dd>{data.snapshot?.is_final ? "نعم" : "لا"}</dd></dl></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]"><h2 className="font-black">آخر تشغيل</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><dt className="text-slate-500">الحالة</dt><dd>{data.latest_run?.status || "—"}</dd><dt className="text-slate-500">بدأ</dt><dd>{dateTime(data.latest_run?.started_at)}</dd><dt className="text-slate-500">التغطية</dt><dd>{data.latest_run?.coverage_percent == null ? "—" : `${Number(data.latest_run.coverage_percent).toFixed(1)}%`}</dd><dt className="text-slate-500">المحاولات</dt><dd>{data.latest_run?.attempt_count || "—"}</dd></dl></div>
        </section>

        {can("data.ingestion.run") && <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]"><h2 className="font-black">تشغيل يدوي مراقب</h2><p className="mt-2 text-sm text-slate-500">كل محاولة وسببها تسجل في سجل التدقيق، ولا تستبدل آخر بيانات سليمة عند الفشل.</p><textarea className="form-input mt-4 min-h-24 w-full" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="سبب إعادة التشغيل أو مطابقة الإغلاق…" maxLength={500} /><div className="mt-3 flex flex-wrap gap-2"><button className="primary-button" type="button" onClick={() => run("retry_slot")} disabled={state.running}>إعادة دورة الربع ساعة</button><button className="secondary-button" type="button" onClick={() => run("reconcile_close")} disabled={state.running}>مطابقة الإغلاق النهائي</button><button className="secondary-button" type="button" onClick={() => run("refresh_signals")} disabled={state.running}>تثبيت الشموع والإشارات</button></div></section>}
      </>}
    </div>
  </>;
}
