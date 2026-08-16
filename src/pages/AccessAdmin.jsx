import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Download, ExternalLink, Pencil, Plus, RefreshCcw, Save, ShieldCheck, UsersRound, XCircle } from "lucide-react";
import DismissibleNotice from "@/components/DismissibleNotice";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { invokeAppFunction, isReferencePreview } from "@/services/marketService";
import { usePreferences } from "@/lib/preferences";
import { localizedAccessError, localizedStatus } from "@/lib/accessCopy";

const emptyPlatform = { id: "", code: "", name_ar: "", name_en: "", referral_url: "", supported_market_codes: ["SA_MAIN"], active: true, display_order: 0, revision: 1 };
const MARKET_META = {
  SA_MAIN: { ar: "السوق السعودي", en: "Saudi Market" },
  US_OPTIONS: { ar: "الأسهم الأمريكية المؤهلة للخيارات", en: "U.S. Optionable Stocks" },
  US_BENCHMARKS: { ar: "المؤشرات والصناديق الأمريكية", en: "U.S. Indices & ETFs" },
};
const COLUMN_KEYS = ["pending", "approved", "rejected"];

export default function AccessAdmin() {
  const { language, isArabic } = usePreferences();
  const t = isArabic ? {
    title: "طلبات الوصول ومنصات التداول", description: "مراجعة الطلبات وتفعيل سوق واحد لكل طلب بعد تأكيد الخادم.", applications: "مسار طلبات العملاء",
    excel: "Excel العملاء", refresh: "تحديث", noApplications: "لا توجد طلبات في هذه المرحلة", platforms: "منصات التداول والإحالة",
    platformHelp: "الأسواق أدناه هي الأسواق التي تدعمها منصة التداول، وليست الأسواق المفعلة لأي عميل.", add: "إضافة منصة", edit: "تعديل المنصة",
    code: "الرمز الداخلي", arName: "الاسم بالعربية", enName: "الاسم بالإنجليزية", url: "رابط الإحالة الكامل", platformCoverage: "الأسواق التي تدعمها المنصة",
    active: "مفعلة", inactive: "غير مفعلة", save: "حفظ المنصة", cancel: "إلغاء", saved: "تم حفظ المنصة وتأكيد بياناتها من الخادم.",
    accepted: "تم تفعيل السوق لمدة 30 يوماً", rejected: "تم رفض الطلب", opened: "فتح رابط الإحالة", pending: "بانتظار المراجعة", approve: "قبول وتفعيل",
    reject: "رفض", limit: "منصة من 100", loadFailed: "تعذر تحميل طلبات الوصول.", selected: "طلب محدد", selectAll: "تحديد كل المعلق", clear: "إلغاء التحديد",
    enabledForCustomer: "الأسواق المفعلة فعلياً للعميل", noneEnabled: "لا يوجد سوق مفعّل", decisionTitle: "تأكيد قرار الطلبات", reason: "سبب القرار",
    reasonHelp: "سيُحفظ السبب في سجل التدقيق ويظهر للعميل عند الرفض.", execute: "تنفيذ وتأكيد", batchResult: "اكتملت العملية",
  } : {
    title: "Access applications & trading platforms", description: "Review applications and activate one market per request after server confirmation.", applications: "Customer application workflow",
    excel: "Customer Excel", refresh: "Refresh", noApplications: "No applications in this stage", platforms: "Trading platforms & referrals",
    platformHelp: "The markets below are supported by the trading platform; they are not customer-enabled markets.", add: "Add platform", edit: "Edit platform",
    code: "Internal code", arName: "Arabic name", enName: "English name", url: "Full referral URL", platformCoverage: "Markets supported by this platform",
    active: "Active", inactive: "Inactive", save: "Save platform", cancel: "Cancel", saved: "The platform was saved and confirmed by the server.",
    accepted: "Market access activated for 30 days", rejected: "Application rejected", opened: "Referral opened", pending: "Awaiting review", approve: "Approve & activate",
    reject: "Reject", limit: "of 100 platforms", loadFailed: "Unable to load access applications.", selected: "application(s) selected", selectAll: "Select all pending", clear: "Clear selection",
    enabledForCustomer: "Markets actually enabled for customer", noneEnabled: "No enabled market", decisionTitle: "Confirm application decision", reason: "Decision reason",
    reasonHelp: "The reason is stored in the audit log and shown to the customer when rejected.", execute: "Execute and confirm", batchResult: "Operation completed",
  };
  const [state, setState] = useState({ loading: true, applications: [], platforms: {}, customerAccess: {}, platformList: [], error: "", notice: "", busy: false });
  const [form, setForm] = useState(emptyPlatform);
  const [selected, setSelected] = useState([]);
  const [decision, setDecision] = useState({ open: false, value: "approved", ids: [], reason: "" });

  const load = useCallback(async () => {
    if (isReferencePreview()) return setState((current) => ({ ...current, loading: false }));
    try {
      const migrationKey = "smart_investor_access_30d_reconciled_v1";
      if (!sessionStorage.getItem(migrationKey)) {
        const reconciliation = await invokeAppFunction("adminAccess", { action: "reconcile_legacy_access" });
        if (reconciliation?.confirmed) sessionStorage.setItem(migrationKey, "1");
      }
      const [applications, platforms] = await Promise.all([
        invokeAppFunction("adminAccess", { action: "list_applications", limit: 300 }),
        invokeAppFunction("adminAccess", { action: "list_platforms" }),
      ]);
      setState((current) => ({ ...current, loading: false, applications: applications.applications || [], platforms: applications.platforms || {}, customerAccess: applications.customer_access || {}, platformList: platforms.platforms || [], error: "" }));
      setSelected((current) => current.filter((id) => (applications.applications || []).some((row) => row.id === id && row.status === "pending")));
      return platforms.platforms || [];
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: localizedAccessError(error, language, t.loadFailed) }));
      return [];
    }
  }, [isArabic, language]);
  useEffect(() => { load(); }, [load]);

  async function save(event) {
    event.preventDefault();
    if (state.busy) return;
    setState((current) => ({ ...current, busy: true, error: "", notice: "" }));
    try {
      const result = await invokeAppFunction("adminAccess", { action: "save_platform", ...form });
      const rows = await load();
      if (!result?.confirmed || !rows.some((item) => item.id === result.platform?.id && Number(item.revision) === Number(result.platform.revision))) throw Object.assign(new Error("not confirmed"), { code: "PLATFORM_SAVE_NOT_CONFIRMED" });
      setForm(emptyPlatform);
      setState((current) => ({ ...current, busy: false, notice: t.saved }));
    } catch (error) { setState((current) => ({ ...current, busy: false, error: localizedAccessError(error, language, isArabic ? "تعذر حفظ المنصة. لم تتغير البيانات." : "Unable to save the platform. No data was changed.") })); }
  }
  function editPlatform(platform) {
    setForm({ id: platform.id, code: platform.code || "", name_ar: platform.name_ar || "", name_en: platform.name_en || "", referral_url: platform.referral_url || "", supported_market_codes: platform.supported_market_codes || [], active: platform.active !== false, display_order: Number(platform.display_order || 0), revision: Number(platform.revision || 1) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function openDecision(ids, value) { setDecision({ open: true, value, ids: [...new Set(ids)], reason: "" }); }
  async function executeDecision() {
    if (!decision.reason.trim() || !decision.ids.length || state.busy) return;
    setState((current) => ({ ...current, busy: true, error: "", notice: "" }));
    try {
      const expectedRevisions = Object.fromEntries(state.applications.filter((item) => decision.ids.includes(item.id)).map((item) => [item.id, item.revision || 1]));
      const result = await invokeAppFunction("adminAccess", { action: decision.ids.length > 1 ? "decide_applications" : "decide_application", application_ids: decision.ids, application_id: decision.ids[0], decision: decision.value, reason: decision.reason.trim(), expected_revisions: expectedRevisions });
      await load();
      setDecision((current) => ({ ...current, open: false }));
      setSelected([]);
      const summary = isArabic ? `نجح ${result.success_count} من ${result.requested_count}${result.failure_count ? `، وتعذر ${result.failure_count}` : ""}.` : `${result.success_count} of ${result.requested_count} succeeded${result.failure_count ? `; ${result.failure_count} failed` : ""}.`;
      setState((current) => ({ ...current, busy: false, notice: `${t.batchResult}: ${summary}` }));
    } catch (error) { setState((current) => ({ ...current, busy: false, error: localizedAccessError(error, language, isArabic ? "تعذر تنفيذ القرار. راجع حالة الطلبات؛ لم نعرض نجاحاً غير مؤكد." : "Unable to execute the decision. Review application states; no unconfirmed success was shown.") })); }
  }
  async function report() {
    try { const data = await invokeAppFunction("customerReport", { action: "generate" }); if (data.download_url) window.open(data.download_url, "_blank", "noopener,noreferrer"); setState((current) => ({ ...current, notice: isArabic ? "تم إنشاء التقرير وفتح رابط التنزيل الآمن." : "The report was generated and its secure download opened." })); }
    catch (error) { setState((current) => ({ ...current, error: localizedAccessError(error, language, t.loadFailed) })); }
  }

  const ordered = useMemo(() => [...state.applications].sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime()), [state.applications]);
  const columns = useMemo(() => ({
    pending: ordered.filter((row) => ["pending", "referral_opened"].includes(row.status)),
    approved: ordered.filter((row) => row.status === "approved"),
    rejected: ordered.filter((row) => ["rejected", "cancelled"].includes(row.status)),
  }), [ordered]);
  const pendingIds = columns.pending.filter((row) => row.status === "pending").map((row) => row.id);

  return <>
    <PageHeader title={t.title} description={t.description} />
    <main className="mx-auto max-w-[1900px] space-y-5 px-4 pb-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0d192a]">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-black"><ShieldCheck size={18} />{t.applications}</h2><div className="flex flex-wrap gap-2"><button type="button" className="secondary-button" onClick={report}><Download size={15}/>{t.excel}</button><button type="button" className="secondary-button" onClick={load}><RefreshCcw size={15}/>{t.refresh}</button></div></div>
        {!!pendingIds.length && <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-sky-300 bg-sky-400/5 p-3"><UsersRound size={17}/><b>{selected.length} {t.selected}</b><button className="secondary-button" type="button" onClick={() => setSelected(pendingIds)}>{t.selectAll}</button>{selected.length > 0 && <><button className="primary-button" type="button" onClick={() => openDecision(selected, "approved")}><CheckCircle2 size={15}/>{t.approve}</button><button className="secondary-button" type="button" onClick={() => openDecision(selected, "rejected")}><XCircle size={15}/>{t.reject}</button><button className="secondary-button" type="button" onClick={() => setSelected([])}>{t.clear}</button></>}</div>}
        {state.loading ? <StatusPanel loading/> : <div className="mt-4 grid gap-4 xl:grid-cols-3">{COLUMN_KEYS.map((key) => <section key={key} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60"><header className="mb-3 flex items-center justify-between"><b>{localizedStatus("application", key, language)}</b><span className="rounded-full bg-white px-2.5 py-1 text-xs dark:bg-slate-900">{columns[key].length}</span></header><div className="space-y-3">{columns[key].map((application) => <ApplicationCard key={application.id} application={application} platform={state.platforms[application.trading_platform_id]} access={state.customerAccess[application.customer_id] || []} isArabic={isArabic} language={language} t={t} checked={selected.includes(application.id)} onCheck={(checked) => setSelected((current) => checked ? [...new Set([...current, application.id])] : current.filter((id) => id !== application.id))} onDecision={(value) => openDecision([application.id], value)}/>) }{!columns[key].length && <StatusPanel title={t.noApplications}/>}</div></section>)}</div>}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0d192a]"><div className="flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 font-black"><Building2 size={18}/>{t.platforms}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{t.platformHelp}</p></div><span className="rounded-full bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-600">{state.platformList.length} {t.limit}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{state.platformList.map((item) => <article key={item.id} className={`rounded-2xl border p-4 ${item.active ? "border-emerald-400/40 bg-emerald-400/5" : "border-slate-200 opacity-70 dark:border-slate-700"}`}><div className="flex items-start justify-between"><div><b>{isArabic ? item.name_ar : item.name_en}</b><p className="text-xs text-slate-500">{item.active ? t.active : t.inactive}</p></div><button className="icon-button" type="button" onClick={() => editPlatform(item)} aria-label={t.edit}><Pencil size={14}/></button></div><p className="mt-3 text-[11px] font-bold text-slate-500">{t.platformCoverage}</p><div className="mt-2 flex flex-wrap gap-1">{item.supported_market_codes?.map((code) => <span key={code} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] dark:bg-slate-800">{MARKET_META[code]?.[isArabic ? "ar" : "en"] || code}</span>)}</div></article>)}</div></div>
        <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0d192a]" onSubmit={save}><div className="flex items-center justify-between"><h3 className="font-black">{form.id ? t.edit : t.add}</h3>{form.id && <button type="button" className="secondary-button" onClick={() => setForm(emptyPlatform)}>{t.cancel}</button>}</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label={t.code}><input className="form-input w-full" required value={form.code} onChange={(e) => setForm({...form,code:e.target.value})}/></Field><Field label={t.arName}><input className="form-input w-full" required value={form.name_ar} onChange={(e) => setForm({...form,name_ar:e.target.value})}/></Field><Field label={t.enName}><input className="form-input w-full" required value={form.name_en} onChange={(e) => setForm({...form,name_en:e.target.value})}/></Field><Field label={t.url}><input className="form-input w-full" required type="url" value={form.referral_url} onChange={(e) => setForm({...form,referral_url:e.target.value})}/></Field></div><Field label={t.platformCoverage}><div className="mt-3 grid gap-2 sm:grid-cols-3">{Object.entries(MARKET_META).map(([code,meta]) => <label key={code} className={`cursor-pointer rounded-xl border p-3 text-xs ${form.supported_market_codes.includes(code)?"border-sky-400 bg-sky-400/10":"border-slate-200 dark:border-slate-700"}`}><input className="me-2" type="checkbox" checked={form.supported_market_codes.includes(code)} onChange={(e) => setForm({...form,supported_market_codes:e.target.checked?[...form.supported_market_codes,code]:form.supported_market_codes.filter((item)=>item!==code)})}/>{isArabic?meta.ar:meta.en}</label>)}</div></Field><label className="mt-4 flex items-center justify-between rounded-xl border p-3 text-sm"><span>{form.active?t.active:t.inactive}</span><input type="checkbox" checked={form.active} onChange={(e)=>setForm({...form,active:e.target.checked})}/></label><button className="primary-button mt-4 w-full justify-center" type="submit" disabled={state.busy||!form.supported_market_codes.length}>{form.id?<Save size={16}/>:<Plus size={16}/>} {t.save}</button></form>
      </section>
    </main>

    <Dialog open={decision.open} onOpenChange={(open) => !state.busy && setDecision((current) => ({...current,open}))}><DialogContent dir={isArabic?"rtl":"ltr"}><DialogHeader><DialogTitle>{t.decisionTitle}</DialogTitle><DialogDescription>{decision.ids.length} {t.selected}. {decision.value === "approved" ? t.accepted : t.rejected}. {t.reasonHelp}</DialogDescription></DialogHeader><label className="text-sm font-bold">{t.reason}<textarea autoFocus className="form-input mt-2 min-h-28 w-full resize-y" value={decision.reason} onChange={(e)=>setDecision({...decision,reason:e.target.value})}/></label><DialogFooter><button type="button" className="secondary-button" disabled={state.busy} onClick={()=>setDecision((current)=>({...current,open:false}))}>{t.cancel}</button><button type="button" className={decision.value==="approved"?"primary-button":"secondary-button"} disabled={state.busy||!decision.reason.trim()} onClick={executeDecision}>{decision.value==="approved"?<CheckCircle2 size={15}/>:<XCircle size={15}/>} {t.execute}</button></DialogFooter></DialogContent></Dialog>
    <DismissibleNotice message={state.error} tone="error" onDismiss={()=>setState((current)=>({...current,error:""}))}/><DismissibleNotice message={state.notice} onDismiss={()=>setState((current)=>({...current,notice:""}))}/>
  </>;
}

function ApplicationCard({ application, platform, access, isArabic, language, t, checked, onCheck, onDecision }) {
  const enabled = access.map((row) => MARKET_META[row.market_code]?.[isArabic ? "ar" : "en"] || row.market_code);
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#0d192a]"><div className="flex items-start gap-3">{application.status === "pending" && <input className="mt-1 h-4 w-4" type="checkbox" checked={checked} onChange={(e)=>onCheck(e.target.checked)} aria-label={application.full_name_snapshot}/>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><b className="block">{application.full_name_snapshot}</b><p className="mt-1 text-xs text-slate-500">{application.unique_reference} · {MARKET_META[application.market_code]?.[isArabic?"ar":"en"]||application.market_code} · {platform?.[isArabic?"name_ar":"name_en"]||application[isArabic?"platform_name_ar_snapshot":"platform_name_en_snapshot"]||"—"}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] dark:bg-slate-800">{localizedStatus("application",application.status,language)}</span></div><div className="mt-2 flex flex-wrap gap-3 text-xs"><a className="text-sky-600 underline" href={`mailto:${application.email_snapshot}`}>{application.email_snapshot}</a><a className="flex items-center gap-1 text-emerald-600 underline" target="_blank" rel="noreferrer" href={`https://wa.me/${String(application.phone_snapshot||"").replace(/\D/g,"")}`}>{application.phone_snapshot}<ExternalLink size={11}/></a></div><div className="mt-3 rounded-xl bg-slate-50 p-2 text-xs dark:bg-slate-950"><b>{t.enabledForCustomer}: </b>{enabled.length?enabled.join("، "):t.noneEnabled}</div>{application.status==="pending"&&<div className="mt-3 flex gap-2"><button className="primary-button" type="button" onClick={()=>onDecision("approved")}><CheckCircle2 size={14}/>{t.approve}</button><button className="secondary-button" type="button" onClick={()=>onDecision("rejected")}><XCircle size={14}/>{t.reject}</button></div>}</div></div></article>;
}
function Field({ label, children }) { return <label className="mt-3 block"><span className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>{children}</label>; }
