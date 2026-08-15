import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Download, ExternalLink, Pencil, Plus, RefreshCcw, Save, ShieldCheck, XCircle } from "lucide-react";
import DismissibleNotice from "@/components/DismissibleNotice";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import { invokeAppFunction, isReferencePreview } from "@/services/marketService";
import { usePreferences } from "@/lib/preferences";

const emptyPlatform = { id: "", code: "", name_ar: "", name_en: "", referral_url: "", supported_market_codes: ["SA_MAIN"], active: true, display_order: 0, revision: 1 };
const MARKET_META = {
  SA_MAIN: { ar: "السوق السعودي", en: "Saudi Market" },
  US_OPTIONS: { ar: "الأسهم الأمريكية المؤهلة للخيارات", en: "U.S. Optionable Stocks" },
  US_BENCHMARKS: { ar: "المؤشرات والصناديق الأمريكية", en: "U.S. Indices & ETFs" },
};
function errorText(error, fallback) { return error?.response?.data?.error || error?.message || fallback; }

export default function AccessAdmin() {
  const { isArabic } = usePreferences();
  const t = isArabic ? {
    title: "طلبات الوصول ومنصات التداول", description: "إدارة طلبات الإحالة وتفعيل سوق واحد لكل تسجيل موثّق.",
    applications: "طلبات العملاء", excel: "Excel العملاء", refresh: "تحديث", noApplications: "لا توجد طلبات وصول حالياً",
    platforms: "منصات التداول والإحالة", platformHelp: "يمكن إضافة حتى 100 منصة. كل منصة تحمل رابط إحالة وأسواقاً محددة.",
    add: "إضافة منصة", edit: "تعديل المنصة", code: "الرمز الداخلي", arName: "الاسم بالعربية", enName: "الاسم بالإنجليزية", url: "رابط الإحالة الكامل",
    markets: "الأسواق المتاحة عبر المنصة", active: "مفعلة", inactive: "غير مفعلة", save: "حفظ المنصة", cancel: "إلغاء التعديل",
    saved: "تم حفظ منصة التداول والتأكد من ظهورها في الكتالوج.", accepted: "تم قبول الطلب وتفعيل سوق واحد لمدة 10 أيام.", rejected: "تم رفض الطلب وإبلاغ العميل.",
    opened: "فتح رابط الإحالة", pending: "بانتظار مراجعة المالك", approve: "قبول وتفعيل", reject: "رفض", limit: "منصة من 100",
    saveFailed: "تعذر حفظ منصة التداول.", loadFailed: "تعذر تحميل طلبات الوصول.",
  } : {
    title: "Access Applications & Trading Platforms", description: "Manage referral applications and activate one market for each verified registration.",
    applications: "Customer applications", excel: "Customer Excel", refresh: "Refresh", noApplications: "No access applications yet",
    platforms: "Trading platforms & referrals", platformHelp: "Add up to 100 platforms, each with one referral link and selected markets.",
    add: "Add platform", edit: "Edit platform", code: "Internal code", arName: "Arabic name", enName: "English name", url: "Full referral URL",
    markets: "Markets available through this platform", active: "Active", inactive: "Inactive", save: "Save platform", cancel: "Cancel edit",
    saved: "The platform was saved and confirmed in the catalog.", accepted: "The application was approved and one market was activated for 10 days.", rejected: "The application was rejected and the customer was notified.",
    opened: "Referral opened", pending: "Awaiting owner review", approve: "Approve & activate", reject: "Reject", limit: "of 100 platforms",
    saveFailed: "Unable to save the trading platform.", loadFailed: "Unable to load access applications.",
  };
  const [state, setState] = useState({ loading: true, applications: [], platforms: {}, platformList: [], error: "", notice: "", busy: false });
  const [form, setForm] = useState(emptyPlatform);

  const load = useCallback(async () => {
    if (isReferencePreview()) return setState((current) => ({ ...current, loading: false }));
    try {
      const [applications, platforms] = await Promise.all([
        invokeAppFunction("adminAccess", { action: "list_applications", limit: 300 }),
        invokeAppFunction("adminAccess", { action: "list_platforms" }),
      ]);
      setState((current) => ({ ...current, loading: false, applications: applications.applications || [], platforms: applications.platforms || {}, platformList: platforms.platforms || [], error: "" }));
      return platforms.platforms || [];
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: errorText(error, t.loadFailed) }));
      return [];
    }
  }, [isArabic]);

  useEffect(() => { load(); }, [load]);

  async function save(event) {
    event.preventDefault();
    setState((current) => ({ ...current, busy: true, error: "", notice: "" }));
    try {
      const result = await invokeAppFunction("adminAccess", { action: "save_platform", ...form });
      const rows = await load();
      if (!rows.some((item) => item.id === result.platform?.id)) throw new Error(isArabic ? "تم الحفظ لكن تعذر تأكيد ظهور المنصة في القائمة." : "Saved, but catalog confirmation failed.");
      setForm(emptyPlatform);
      setState((current) => ({ ...current, busy: false, notice: t.saved }));
    } catch (error) { setState((current) => ({ ...current, busy: false, error: errorText(error, t.saveFailed) })); }
  }

  function editPlatform(platform) {
    setForm({
      id: platform.id,
      code: platform.code || "",
      name_ar: platform.name_ar || "",
      name_en: platform.name_en || "",
      referral_url: platform.referral_url || "",
      supported_market_codes: platform.supported_market_codes || [],
      active: platform.active !== false,
      display_order: Number(platform.display_order || 0),
      revision: Number(platform.revision || 1),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function decide(application, decision) {
    const promptText = decision === "approved"
      ? (isArabic ? "اكتب سبب القبول للتدقيق:" : "Enter the approval reason for the audit log:")
      : (isArabic ? "اكتب سبب الرفض الذي سيظهر للعميل:" : "Enter the rejection reason shown to the customer:");
    const reason = window.prompt(promptText);
    if (!reason?.trim()) return;
    try {
      setState((current) => ({ ...current, busy: true, error: "", notice: "" }));
      await invokeAppFunction("adminAccess", { action: "decide_application", application_id: application.id, decision, reason });
      await load();
      setState((current) => ({ ...current, busy: false, notice: decision === "approved" ? t.accepted : t.rejected }));
    } catch (error) { setState((current) => ({ ...current, busy: false, error: errorText(error, t.loadFailed) })); }
  }

  async function report() {
    try {
      const data = await invokeAppFunction("customerReport", { action: "generate" });
      if (data.download_url) window.open(data.download_url, "_blank", "noopener,noreferrer");
      setState((current) => ({ ...current, notice: isArabic ? "تم إنشاء تقرير Excel وفتح رابط التنزيل الآمن." : "The Excel report was generated and its secure download opened." }));
    } catch (error) { setState((current) => ({ ...current, error: errorText(error, t.loadFailed) })); }
  }

  const orderedApplications = useMemo(() => [...state.applications].sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime()), [state.applications]);
  return <>
    <PageHeader title={t.title} description={t.description} />
    <main className="mx-auto grid max-w-[1800px] gap-5 px-4 pb-10 xl:grid-cols-[1.12fr_.88fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0d192a]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-black"><ShieldCheck size={18} />{t.applications}</h2>
          <div className="flex gap-2"><button type="button" className="secondary-button" onClick={report}><Download size={15} />{t.excel}</button><button type="button" className="secondary-button" onClick={load}><RefreshCcw size={15} />{t.refresh}</button></div>
        </div>
        {state.loading ? <StatusPanel loading /> : <div className="mt-4 space-y-3">{orderedApplications.map((application) => {
          const platform = state.platforms[application.trading_platform_id];
          return <article key={application.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-sky-300 dark:border-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><b>{application.full_name_snapshot}</b><p className="mt-1 text-xs text-slate-500">{application.unique_reference} · {MARKET_META[application.market_code]?.[isArabic ? "ar" : "en"] || application.market_code} · {platform?.[isArabic ? "name_ar" : "name_en"] || application.platform_name_ar_snapshot || "—"}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm"><a className="text-sky-600 underline" href={`mailto:${application.email_snapshot}`}>{application.email_snapshot}</a><a className="flex items-center gap-1 text-emerald-600 underline" target="_blank" rel="noreferrer" href={`https://wa.me/${String(application.phone_snapshot || "").replace(/\D/g, "")}`}>{application.phone_snapshot}<ExternalLink size={12} /></a></div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${application.status === "pending" ? "bg-amber-500/10 text-amber-600" : application.status === "approved" ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 text-slate-600 dark:bg-slate-800"}`}>{application.status === "referral_opened" ? t.opened : application.status === "pending" ? t.pending : application.status}</span>
            </div>
            {application.status === "pending" && <div className="mt-3 flex gap-2"><button type="button" disabled={state.busy} className="primary-button" onClick={() => decide(application, "approved")}><CheckCircle2 size={15} />{t.approve}</button><button type="button" disabled={state.busy} className="secondary-button" onClick={() => decide(application, "rejected")}><XCircle size={15} />{t.reject}</button></div>}
          </article>;
        })}{!orderedApplications.length && <StatusPanel title={t.noApplications} />}</div>}
      </section>

      <section className="self-start rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24 dark:border-slate-800 dark:bg-[#0d192a]">
        <div className="flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 font-black"><Building2 size={18} />{t.platforms}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{t.platformHelp}</p></div><span className="rounded-full bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-600">{state.platformList.length} {t.limit}</span></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">{state.platformList.map((item) => <article key={item.id} className={`rounded-2xl border p-3 ${item.active ? "border-emerald-400/40 bg-emerald-400/5" : "border-slate-200 opacity-70 dark:border-slate-700"}`}><div className="flex items-start justify-between gap-2"><div><b className="text-sm">{isArabic ? item.name_ar : item.name_en}</b><p className="mt-1 text-[11px] text-slate-500">{item.code} · {item.active ? t.active : t.inactive}</p></div><button type="button" className="icon-button" onClick={() => editPlatform(item)} aria-label={t.edit}><Pencil size={14} /></button></div><div className="mt-2 flex flex-wrap gap-1">{item.supported_market_codes?.map((code) => <span key={code} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] dark:bg-slate-800">{MARKET_META[code]?.[isArabic ? "ar" : "en"] || code}</span>)}</div></article>)}</div>
        <form className="mt-5 grid gap-4 border-t border-slate-200 pt-5 dark:border-slate-800" onSubmit={save}>
          <div className="flex items-center justify-between"><h3 className="font-black">{form.id ? t.edit : t.add}</h3>{form.id && <button type="button" className="secondary-button" onClick={() => setForm(emptyPlatform)}>{t.cancel}</button>}</div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label={t.code}><input className="form-input w-full" required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></Field><Field label={t.arName}><input className="form-input w-full" required value={form.name_ar} onChange={(event) => setForm({ ...form, name_ar: event.target.value })} /></Field><Field label={t.enName}><input className="form-input w-full" required value={form.name_en} onChange={(event) => setForm({ ...form, name_en: event.target.value })} /></Field><Field label={t.url}><input className="form-input w-full" required type="url" value={form.referral_url} onChange={(event) => setForm({ ...form, referral_url: event.target.value })} /></Field></div>
          <Field label={t.markets}><div className="grid gap-2 sm:grid-cols-3">{Object.entries(MARKET_META).map(([code, meta]) => <label key={code} className={`cursor-pointer rounded-xl border p-3 text-xs transition ${form.supported_market_codes.includes(code) ? "border-sky-400 bg-sky-400/10 text-sky-700 dark:text-sky-300" : "border-slate-200 dark:border-slate-700"}`}><input className="me-2" type="checkbox" checked={form.supported_market_codes.includes(code)} onChange={(event) => setForm({ ...form, supported_market_codes: event.target.checked ? [...form.supported_market_codes, code] : form.supported_market_codes.filter((item) => item !== code) })} />{isArabic ? meta.ar : meta.en}</label>)}</div></Field>
          <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><span>{form.active ? t.active : t.inactive}</span><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /></label>
          <button className="primary-button justify-center" type="submit" disabled={state.busy || !form.supported_market_codes.length}>{form.id ? <Save size={16} /> : <Plus size={16} />}{t.save}</button>
        </form>
      </section>
    </main>
    <DismissibleNotice message={state.error} tone="error" onDismiss={() => setState((current) => ({ ...current, error: "" }))} />
    <DismissibleNotice message={state.notice} onDismiss={() => setState((current) => ({ ...current, notice: "" }))} />
  </>;
}

function Field({ label, children }) { return <label className="block"><span className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>{children}</label>; }
