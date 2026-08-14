import React, { useEffect, useState } from "react";
import { Building2, CheckCircle2, Download, ExternalLink, RefreshCcw, ShieldCheck, XCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import { invokeAppFunction, isReferencePreview } from "@/services/marketService";

const emptyPlatform = { code: "", name_ar: "", name_en: "", referral_url: "", supported_market_codes: ["SA_MAIN"], active: true, display_order: 0 };
function errorText(error) { return error?.response?.data?.error || error?.message || "تعذر تنفيذ العملية."; }

export default function AccessAdmin() {
  const [state, setState] = useState({ loading: true, applications: [], platforms: {}, platformList: [], error: "", notice: "" });
  const [form, setForm] = useState(emptyPlatform);
  async function load() {
    if (isReferencePreview()) return setState((current) => ({ ...current, loading: false }));
    try {
      const [applications, platforms] = await Promise.all([invokeAppFunction("adminAccess", { action: "list_applications", limit: 300 }), invokeAppFunction("adminAccess", { action: "list_platforms" })]);
      setState((current) => ({ ...current, loading: false, applications: applications.applications || [], platforms: applications.platforms || {}, platformList: platforms.platforms || [], error: "" }));
    } catch (error) { setState((current) => ({ ...current, loading: false, error: errorText(error) })); }
  }
  useEffect(() => { load(); }, []);
  async function save(event) {
    event.preventDefault();
    try { await invokeAppFunction("adminAccess", { action: "save_platform", ...form }); setForm(emptyPlatform); await load(); setState((current) => ({ ...current, notice: "حُفظت منصة التداول وأصبحت متاحة في التسجيل حسب الأسواق المحددة." })); }
    catch (error) { setState((current) => ({ ...current, error: errorText(error) })); }
  }
  async function decide(application, decision) {
    const reason = window.prompt(decision === "approved" ? "اكتب سبب القبول للتدقيق:" : "اكتب سبب الرفض الذي سيظهر للعميل:");
    if (!reason?.trim()) return;
    try { await invokeAppFunction("adminAccess", { action: "decide_application", application_id: application.id, decision, reason }); await load(); setState((current) => ({ ...current, notice: decision === "approved" ? "تم قبول الطلب وتفعيل سوق واحد لمدة 10 أيام." : "تم رفض الطلب وإبلاغ العميل." })); }
    catch (error) { setState((current) => ({ ...current, error: errorText(error) })); }
  }
  async function report() { try { const data = await invokeAppFunction("customerReport", { action: "generate" }); if (data.download_url) window.open(data.download_url, "_blank", "noopener,noreferrer"); setState((current) => ({ ...current, notice: "تم تحديث ملف Excel الموحد وفتحه برابط خاص مؤقت." })); } catch (error) { setState((current) => ({ ...current, error: errorText(error) })); } }
  return <>
    <PageHeader title="طلبات الوصول ومنصات التداول" description="مركز المالك لربط كل تسجيل بمنصة تداول واحدة وسوق واحد وقرار موثق." />
    <div className="mx-auto grid max-w-[1800px] gap-5 px-4 pb-10 xl:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-black"><ShieldCheck size={18} />طلبات العملاء</h2><div className="flex gap-2"><button className="secondary-button" onClick={report}><Download size={15} />Excel العملاء</button><button className="secondary-button" onClick={load}><RefreshCcw size={15} />تحديث</button></div></div>
        {state.loading ? <StatusPanel loading /> : <div className="mt-4 space-y-3">{state.applications.map((application) => { const platform = state.platforms[application.trading_platform_id]; return <article key={application.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex flex-wrap items-start justify-between gap-3"><div><b>{application.full_name_snapshot}</b><p className="text-xs text-slate-500">{application.unique_reference} · {application.market_code} · {platform?.name_ar || "منصة غير متاحة"}</p><div className="mt-2 flex flex-wrap gap-3 text-sm"><a className="text-sky-600 underline" href={`mailto:${application.email_snapshot}`}>{application.email_snapshot}</a><a className="flex items-center gap-1 text-emerald-600 underline" target="_blank" rel="noreferrer" href={`https://wa.me/${String(application.phone_snapshot || "").replace(/\D/g, "")}`}>{application.phone_snapshot}<ExternalLink size={12} /></a></div></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">{application.status}</span></div>{application.status === "pending" && <div className="mt-3 flex gap-2"><button className="primary-button" onClick={() => decide(application, "approved")}><CheckCircle2 size={15} />قبول وتفعيل</button><button className="secondary-button" onClick={() => decide(application, "rejected")}><XCircle size={15} />رفض</button></div>}</article>; })}{!state.applications.length && <StatusPanel title="لا توجد طلبات وصول حالياً" />}</div>}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]">
        <h2 className="flex items-center gap-2 font-black"><Building2 size={18} />منصات التداول والإحالة</h2>
        <div className="mt-3 flex flex-wrap gap-2">{state.platformList.map((item) => <span key={item.id} className="rounded-full border border-slate-200 px-3 py-1 text-xs dark:border-slate-700">{item.name_ar} · {item.supported_market_codes?.join(", ")}</span>)}</div>
        <form className="mt-4 grid gap-2" onSubmit={save}><input className="form-input" required placeholder="الرمز الداخلي" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /><input className="form-input" required placeholder="الاسم بالعربية" value={form.name_ar} onChange={(event) => setForm({ ...form, name_ar: event.target.value })} /><input className="form-input" required placeholder="Name in English" value={form.name_en} onChange={(event) => setForm({ ...form, name_en: event.target.value })} /><input className="form-input" required type="url" placeholder="رابط الإحالة الكامل" value={form.referral_url} onChange={(event) => setForm({ ...form, referral_url: event.target.value })} /><div className="flex flex-wrap gap-3 text-sm">{["SA_MAIN", "US_OPTIONS", "US_BENCHMARKS"].map((market) => <label key={market} className="flex items-center gap-1"><input type="checkbox" checked={form.supported_market_codes.includes(market)} onChange={(event) => setForm({ ...form, supported_market_codes: event.target.checked ? [...form.supported_market_codes, market] : form.supported_market_codes.filter((item) => item !== market) })} />{market}</label>)}</div><button className="primary-button" type="submit">إضافة منصة تداول</button></form>
      </section>
    </div>
    {state.error && <div className="fixed bottom-4 end-4 z-[100] max-w-sm rounded-xl bg-red-950 p-4 text-sm text-red-200">{state.error}</div>}{state.notice && <div className="fixed bottom-4 start-4 z-[100] max-w-sm rounded-xl bg-emerald-950 p-4 text-sm text-emerald-200">{state.notice}</div>}
  </>;
}
