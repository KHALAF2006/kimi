import React, { useEffect, useMemo, useState } from "react";
import { Ban, CalendarDays, Download, ExternalLink, FileText, Mail, MessageCircle, RefreshCcw, Search, ShieldCheck, Smartphone, UserRound, UsersRound, WifiOff, X, Zap } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import { SessionLink } from "@/components/SessionLink";
import { invokeAppFunction, isReferencePreview } from "@/services/marketService";
import { useAuthorization } from "@/lib/AuthorizationContext";
import { usePreferences } from "@/lib/preferences";
import DismissibleNotice from "@/components/DismissibleNotice";

const MARKET_META = {
  SA_MAIN: { ar: "السوق السعودي", en: "Saudi Market", mark: "🇸🇦" },
  US_OPTIONS: { ar: "الأسهم الأمريكية", en: "U.S. Options", mark: "🇺🇸" },
  US_BENCHMARKS: { ar: "المؤشرات الأمريكية", en: "U.S. Benchmarks", mark: "📊" },
};
const FILTERS = ["all", "active", "pending", "suspended", "banned", "closed"];

const STATUS_LABELS = {
  ar: { active: "نشط", pending: "بانتظار المراجعة", pending_verification: "بانتظار التحقق", pending_owner_approval: "بانتظار موافقة المالك", referral_opened: "رابط الإحالة مفتوح", approved: "مقبول", rejected: "مرفوض", suspended: "موقوف", temporarily_blocked: "محظور مؤقتاً", banned: "محظور", closed: "مغلق" },
  en: { active: "Active", pending: "Pending review", pending_verification: "Pending verification", pending_owner_approval: "Pending owner approval", referral_opened: "Referral opened", approved: "Approved", rejected: "Rejected", suspended: "Suspended", temporarily_blocked: "Temporarily blocked", banned: "Banned", closed: "Closed" },
};

function failure(error, isArabic) { return error?.response?.data?.error || error?.message || (isArabic ? "تعذر تنفيذ العملية." : "The action could not be completed."); }
function digits(value) { return String(value || "").replace(/\D/g, ""); }
function dateLabel(value, language) { return value ? new Date(value).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US") : "—"; }
function statusLabel(value, language) { return STATUS_LABELS[language === "ar" ? "ar" : "en"][value] || value || "—"; }
function currentSubscription(rows = []) { return rows.find((item) => item.status === "active") || [...rows].sort((a, b) => new Date(b.ends_at || 0).getTime() - new Date(a.ends_at || 0).getTime())[0] || null; }

export default function CustomersAdmin() {
  const { can } = useAuthorization();
  const { isArabic, language } = usePreferences();
  const [state, setState] = useState({ loading: true, customers: [], mode: "masked", error: "", status: "", busy: false });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null);
  const [form, setForm] = useState({ reason: "", message: "", title: "", priority: "normal" });
  const t = isArabic ? {
    title: "مركز إدارة العملاء", description: "كل معلومات العميل وأسواقه واشتراكه وإجراءاته في مكان واحد — للمالك فقط.",
    all: "الكل", active: "النشطون", pending: "بانتظار الموافقة", suspended: "الموقوفون", banned: "المحظورون", closed: "المغلقون",
    search: "ابحث بالاسم أو البريد أو الجوال أو رقم العميل", refresh: "تحديث", export: "تصدير Excel", customer: "العميل", contact: "التواصل", status: "الحالة", joined: "التسجيل", actions: "الإجراءات",
    choose: "اختر عميلاً لعرض ملفه وأسواقه واشتراكه وإجراءاته.", markets: "الأسواق المفعلة", notActive: "غير مفعّل", period: "فترة التجربة / الاشتراك", start: "البداية", end: "النهاية", noSubscription: "لا يوجد اشتراك",
    activate: "تفعيل", suspend: "تعليق", ban: "حظر", restore: "استعادة", revoke: "إخراج الأجهزة", message: "رسالة", access: "إدارة الأسواق", subscription: "الاشتراك", oneDevice: "قيد الجهاز الواحد", oneDeviceHelp: "الجلسات النشطة محكومة بسياسة جهاز واحد.", activeSessions: "جلسة نشطة",
    referrals: "منصات الإحالة وأرقام الطلبات", notes: "ملاحظات الإدارة", addNote: "إضافة ملاحظة", cancel: "إلغاء", confirm: "تأكيد الإجراء", reason: "سبب الإجراء", body: "نص الرسالة", subject: "عنوان الرسالة", noResults: "لا توجد نتائج مطابقة", full: "بيانات كاملة", masked: "بيانات مقنّعة", open: "فتح الملف",
    priority: "أهمية الرسالة", normalPriority: "عادية", importantPriority: "مهمة",
  } : {
    title: "Customer Operations Center", description: "Customer identity, markets, subscription, and actions in one owner-only workspace.",
    all: "All", active: "Active", pending: "Pending", suspended: "Suspended", banned: "Banned", closed: "Closed",
    search: "Search by name, email, phone, or customer number", refresh: "Refresh", export: "Export Excel", customer: "Customer", contact: "Contact", status: "Status", joined: "Joined", actions: "Actions",
    choose: "Select a customer to view their profile, markets, subscription, and actions.", markets: "Enabled markets", notActive: "Not active", period: "Trial / subscription period", start: "Start", end: "End", noSubscription: "No subscription",
    activate: "Activate", suspend: "Suspend", ban: "Ban", restore: "Restore", revoke: "Sign out devices", message: "Message", access: "Manage markets", subscription: "Subscription", oneDevice: "One-device restriction", oneDeviceHelp: "Active sessions are governed by the one-device policy.", activeSessions: "active session(s)",
    referrals: "Referral platforms & references", notes: "Admin notes", addNote: "Add note", cancel: "Cancel", confirm: "Confirm action", reason: "Action reason", body: "Message body", subject: "Message title", noResults: "No matching customers", full: "Full data", masked: "Masked data", open: "Open profile",
    priority: "Message priority", normalPriority: "Normal", importantPriority: "Important",
  };

  async function load() {
    if (isReferencePreview()) return setState((current) => ({ ...current, loading: false, customers: [], error: "" }));
    try {
      setState((current) => ({ ...current, loading: true, error: "" }));
      const data = await invokeAppFunction("adminCustomers", { action: "list", limit: 100 });
      setState((current) => ({ ...current, loading: false, customers: data.customers || [], mode: data.data_mode || "masked" }));
    } catch (error) { setState((current) => ({ ...current, loading: false, error: failure(error, isArabic) })); }
  }
  useEffect(() => { load(); }, []);

  async function detail(customer) {
    try {
      setState((current) => ({ ...current, busy: true, error: "" }));
      setSelected(await invokeAppFunction("adminCustomers", { action: "detail", id: customer.id }));
      setState((current) => ({ ...current, busy: false }));
    } catch (error) { setState((current) => ({ ...current, busy: false, error: failure(error, isArabic) })); }
  }

  async function runAction() {
    if (!action || !selected?.customer || form.reason.trim().length < 3) return;
    const payload = { action: action.kind, id: selected.customer.id, reason: form.reason.trim() };
    if (action.kind === "status") payload.status = action.status;
    if (action.kind === "add_note") payload.note = form.message.trim();
    if (action.kind === "message") Object.assign(payload, { message: form.message.trim(), title: form.title.trim(), priority: form.priority });
    try {
      setState((current) => ({ ...current, busy: true, error: "", status: "" }));
      await invokeAppFunction("adminCustomers", payload);
      setSelected(await invokeAppFunction("adminCustomers", { action: "detail", id: selected.customer.id }));
      setAction(null);
      setForm({ reason: "", message: "", title: "", priority: "normal" });
      await load();
      setState((current) => ({ ...current, busy: false, status: isArabic ? "تم تنفيذ الإجراء وتأكيده من الخادم." : "The action was completed and confirmed by the server." }));
    } catch (error) { setState((current) => ({ ...current, busy: false, error: failure(error, isArabic) })); }
  }

  async function exportReport() {
    try {
      const result = await invokeAppFunction("customerReport", { action: "generate" });
      if (result.download_url) window.open(result.download_url, "_blank", "noopener,noreferrer");
      setState((current) => ({ ...current, status: isArabic ? "تم تحديث ملف العملاء وفتح رابط التنزيل الآمن." : "The customer workbook was refreshed and its secure download opened." }));
    } catch (error) { setState((current) => ({ ...current, error: failure(error, isArabic) })); }
  }

  const counts = useMemo(() => state.customers.reduce((result, customer) => {
    result.all += 1;
    if (["pending_verification", "pending_owner_approval"].includes(customer.account_status)) result.pending += 1;
    else if (result[customer.account_status] !== undefined) result[customer.account_status] += 1;
    return result;
  }, { all: 0, active: 0, pending: 0, suspended: 0, banned: 0, closed: 0 }), [state.customers]);

  const filtered = useMemo(() => state.customers.filter((customer) => {
    const inFilter = filter === "all" || (filter === "pending" ? ["pending_verification", "pending_owner_approval"].includes(customer.account_status) : customer.account_status === filter);
    return inFilter && `${customer.customer_number} ${customer.full_name} ${customer.email_normalized} ${customer.phone_e164}`.toLowerCase().includes(query.trim().toLowerCase());
  }), [state.customers, filter, query]);

  const subscription = currentSubscription(selected?.subscriptions);
  const activeSessions = selected?.sessions?.filter((item) => !item.revoked_at && (!item.expires_at || new Date(item.expires_at) > new Date())).length || 0;
  const marketStatuses = useMemo(() => {
    const values = {};
    for (const row of selected?.applications || []) values[row.market_code] = row.status;
    for (const row of selected?.subscriptions || []) if (row.status === "active") values[row.market_code] = "active";
    return values;
  }, [selected]);
  function openAction(kind, status = "") { setForm({ reason: "", message: "", title: "", priority: "normal" }); setAction({ kind, status }); }
  const actionTiles = selected ? [
    { label: t.activate, icon: Zap, tone: "bg-emerald-600", show: can("customers.status.manage") && selected.customer.account_status !== "active", run: () => openAction("status", "active") },
    { label: t.suspend, icon: Smartphone, tone: "bg-amber-600", show: can("customers.status.manage") && selected.customer.account_status === "active", run: () => openAction("status", "suspended") },
    { label: t.ban, icon: Ban, tone: "bg-red-700", show: can("customers.status.manage") && selected.customer.account_status !== "banned", run: () => openAction("status", "banned") },
    { label: t.restore, icon: RefreshCcw, tone: "bg-sky-600", show: can("customers.status.manage") && ["suspended", "banned", "temporarily_blocked"].includes(selected.customer.account_status), run: () => openAction("status", "active") },
    { label: t.revoke, icon: WifiOff, tone: "bg-violet-600", show: can("customers.sessions.revoke"), run: () => openAction("revoke_sessions") },
    { label: t.message, icon: MessageCircle, tone: "bg-blue-700", show: can("customers.notes.manage"), run: () => openAction("message") },
  ].filter((item) => item.show) : [];

  return <>
    <PageHeader title={t.title} description={t.description} />
    <main className="mx-auto max-w-[1900px] space-y-4 px-4 pb-10">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{FILTERS.map((key) => <button type="button" key={key} onClick={() => setFilter(key)} className={`rounded-2xl border p-4 text-start transition ${filter === key ? "border-sky-400 bg-sky-400/10 text-sky-700 dark:text-sky-300" : "border-slate-200 bg-white hover:border-sky-300 dark:border-slate-800 dark:bg-[#0d192a]"}`}><small className="text-slate-500">{t[key]}</small><b className="mt-2 block text-2xl">{counts[key]}</b></button>)}</section>
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0d192a]"><label className="flex min-w-64 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-700"><Search size={16} /><input className="h-11 flex-1 bg-transparent text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></label><span className="rounded-full bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-slate-900">{state.mode === "full" ? t.full : t.masked}</span><button type="button" className="secondary-button" onClick={exportReport}><Download size={15} />{t.export}</button><button type="button" className="secondary-button" onClick={load}><RefreshCcw size={15} />{t.refresh}</button></section>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,.8fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0d192a]">{state.loading ? <StatusPanel loading /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-slate-500 dark:bg-slate-900/60"><tr><th className="p-4 text-start">{t.customer}</th><th className="p-4 text-start">{t.contact}</th><th className="p-4">{t.status}</th><th className="p-4">{t.joined}</th><th className="p-4">{t.actions}</th></tr></thead><tbody>{filtered.map((customer) => <tr key={customer.id} className={`border-t border-slate-100 transition hover:bg-sky-400/5 dark:border-slate-800 ${selected?.customer?.id === customer.id ? "bg-sky-400/10" : ""}`}><td className="p-4"><button type="button" onClick={() => detail(customer)} className="text-start"><b className="block">{customer.full_name}</b><small className="text-slate-400">{customer.customer_number}</small></button></td><td className="p-4"><span className="block">{customer.email_normalized}</span><small className="text-slate-400">{customer.phone_e164 || "—"}</small></td><td className="p-4 text-center"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">{statusLabel(customer.account_status, language)}</span></td><td className="p-4 text-center text-slate-500">{dateLabel(customer.created_date, language)}</td><td className="p-4 text-center"><button type="button" className="secondary-button" onClick={() => detail(customer)}><UserRound size={14} />{t.open}</button></td></tr>)}</tbody></table>{!filtered.length && <StatusPanel title={t.noResults} />}</div>}</section>
        <aside className="self-start rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/5 xl:sticky xl:top-24 dark:border-slate-800 dark:bg-[#0d192a]">{!selected ? <div className="grid min-h-[520px] place-items-center text-center text-slate-400"><div><UsersRound size={42} className="mx-auto mb-4" /><p>{t.choose}</p></div></div> : <div className="space-y-6">
          <header className="border-b border-slate-200 pb-4 dark:border-slate-800"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-black">{selected.customer.full_name}</h2><p className="mt-1 text-xs text-slate-500">{selected.customer.customer_number} · {statusLabel(selected.customer.account_status, language)}</p></div><button type="button" className="icon-button" onClick={() => setSelected(null)} aria-label={t.cancel}><X size={16} /></button></div><div className="mt-3 flex flex-wrap gap-3 text-xs"><span className="flex items-center gap-1"><CalendarDays size={14} />{dateLabel(selected.customer.created_date, language)}</span><span className="flex items-center gap-1"><Smartphone size={14} />{activeSessions} {t.activeSessions}</span></div><div className="mt-3 flex flex-wrap gap-2"><a className="secondary-button" href={`mailto:${selected.customer.email_normalized}`}><Mail size={14} />{selected.customer.email_normalized}</a>{digits(selected.customer.phone_e164) && <a className="secondary-button text-emerald-600" href={`https://wa.me/${digits(selected.customer.phone_e164)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} />{selected.customer.phone_e164}<ExternalLink size={11} /></a>}</div></header>
          <section><h3 className="mb-3 text-sm font-black">{t.markets}</h3><div className="grid grid-cols-2 gap-2">{Object.entries(MARKET_META).map(([code, meta]) => <div key={code} className={`rounded-2xl border p-3 ${marketStatuses[code] === "active" ? "border-emerald-400 bg-emerald-400/10" : "border-slate-200 dark:border-slate-700"}`}><div className="flex items-center justify-between"><span>{meta.mark}</span><small className={marketStatuses[code] === "active" ? "text-emerald-600" : "text-slate-400"}>{marketStatuses[code] ? statusLabel(marketStatuses[code], language) : t.notActive}</small></div><b className="mt-2 block text-sm">{isArabic ? meta.ar : meta.en}</b></div>)}</div></section>
          <section><h3 className="mb-3 text-center text-xs font-black tracking-[.18em] text-slate-500">{t.period}</h3><div className="grid grid-cols-3 gap-3 rounded-2xl border border-sky-300/50 bg-sky-400/5 p-4 text-sm"><div><small className="text-slate-500">{t.start}</small><b className="mt-1 block text-emerald-500">{dateLabel(subscription?.starts_at, language)}</b></div><div><small className="text-slate-500">{t.end}</small><b className="mt-1 block">{dateLabel(subscription?.ends_at, language)}</b></div><div><small className="text-slate-500">{t.status}</small><b className="mt-1 block text-sky-500">{subscription ? statusLabel(subscription.status, language) : t.noSubscription}</b></div></div></section>
          <section><h3 className="mb-3 text-sm font-black">{t.referrals}</h3><div className="space-y-2">{selected.applications?.map((application) => { const platform = selected.platforms?.[application.trading_platform_id]; return <article key={application.id} className="rounded-2xl border border-slate-200 p-3 text-xs dark:border-slate-700"><div className="flex items-start justify-between gap-2"><div><b>{platform?.[isArabic ? "name_ar" : "name_en"] || application[isArabic ? "platform_name_ar_snapshot" : "platform_name_en_snapshot"] || "—"}</b><p className="mt-1 font-mono text-slate-500">{application.unique_reference}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">{statusLabel(application.status, language)}</span></div><p className="mt-2 text-slate-500">{MARKET_META[application.market_code]?.[isArabic ? "ar" : "en"] || application.market_code} · {dateLabel(application.referral_clicked_at || application.created_date, language)}</p></article>; })}{!selected.applications?.length && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-900">{t.notActive}</p>}</div></section>
          <section><h3 className="mb-3 text-sm font-black">{t.actions}</h3><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{actionTiles.map(({ label, icon: Icon, tone, run }) => <button type="button" key={label} onClick={run} className={`${tone} grid min-h-20 place-items-center rounded-2xl p-3 text-center text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg`}><span><Icon className="mx-auto mb-1" size={19} />{label}</span></button>)}<SessionLink to={`/admin/access?customer=${encodeURIComponent(selected.customer.id)}`} className="grid min-h-20 place-items-center rounded-2xl border border-slate-300 p-3 text-center text-sm font-black dark:border-slate-700"><span><ShieldCheck className="mx-auto mb-1 text-sky-500" size={19} />{t.access}</span></SessionLink><SessionLink to={`/admin/subscriptions?customer=${encodeURIComponent(selected.customer.id)}`} className="grid min-h-20 place-items-center rounded-2xl border border-slate-300 p-3 text-center text-sm font-black dark:border-slate-700"><span><CalendarDays className="mx-auto mb-1 text-violet-500" size={19} />{t.subscription}</span></SessionLink></div></section>
          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex items-center justify-between"><div><b className="flex items-center gap-2"><Smartphone size={16} />{t.oneDevice}</b><p className="mt-1 text-xs text-slate-500">{t.oneDeviceHelp}</p></div><span className={`rounded-full px-3 py-1 text-xs ${activeSessions > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{activeSessions}</span></div></section>
          {can("customers.notes.manage") && <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex items-center justify-between"><b className="flex items-center gap-2"><FileText size={15} />{t.notes}</b><button type="button" className="secondary-button" onClick={() => openAction("add_note")}><FileText size={14} />{t.addNote}</button></div><div className="mt-3 max-h-36 space-y-2 overflow-y-auto">{selected.notes?.map((item) => <p key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">{item.body}</p>)}</div></section>}
        </div>}</aside>
      </div>
    </main>
    {action && <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/70 p-4" role="dialog" aria-modal="true"><section className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0d192a]"><div className="flex items-center justify-between"><h2 className="text-lg font-black">{action.kind === "message" ? t.message : action.kind === "add_note" ? t.addNote : t.confirm}</h2><button type="button" className="icon-button" onClick={() => setAction(null)}><X size={16} /></button></div><div className="mt-5 grid gap-4">{action.kind === "message" && <><label className="grid gap-2 text-sm font-bold"><span>{t.subject}</span><input className="form-input" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label><label className="grid gap-2 text-sm font-bold"><span>{t.priority}</span><select className="form-input" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}><option value="normal">{t.normalPriority}</option><option value="important">{t.importantPriority}</option></select></label></>}{["message", "add_note"].includes(action.kind) && <label className="grid gap-2 text-sm font-bold"><span>{t.body}</span><textarea className="form-input min-h-28" value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} /></label>}<label className="grid gap-2 text-sm font-bold"><span>{t.reason}</span><textarea className="form-input min-h-20" value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} /></label><div className="flex justify-end gap-2"><button type="button" className="secondary-button" onClick={() => setAction(null)}>{t.cancel}</button><button type="button" className="primary-button" disabled={state.busy || form.reason.trim().length < 3 || (["message", "add_note"].includes(action.kind) && form.message.trim().length < 3)} onClick={runAction}>{state.busy ? "…" : t.confirm}</button></div></div></section></div>}
    <DismissibleNotice message={state.error} tone="error" onDismiss={() => setState((current) => ({ ...current, error: "" }))} />
    <DismissibleNotice message={state.status} onDismiss={() => setState((current) => ({ ...current, status: "" }))} />
  </>;
}
