import React, { useEffect, useState } from "react";
import { BadgeCheck, Clock3, Plus, RefreshCcw, Save, WalletCards } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import { invokeAppFunction, isReferencePreview } from "@/services/marketService";
import { useAuthorization } from "@/lib/AuthorizationContext";

function message(error) {
  return error?.response?.data?.error || error?.message || "تعذر تنفيذ العملية.";
}

export default function SubscriptionsAdmin() {
  const { can } = useAuthorization();
  const [state, setState] = useState({ loading: true, plans: [], subscriptions: [], customers: [], error: "", status: "", busy: false });
  const [activation, setActivation] = useState({ customer_id: "", plan_id: "", starts_at: new Date().toISOString().slice(0, 10), reason: "" });
  const [transition, setTransition] = useState({ id: "", status: "suspended", reason: "", expected_revision: 1 });
  const [plan, setPlan] = useState({ code: "starter", name_ar: "الخطة الأساسية", name_en: "Starter", duration_months: 1, price_sar: 0, active: true });
  const [planReason, setPlanReason] = useState("");
  const [entitlementEditor, setEntitlementEditor] = useState({ plan_id: "", expected_revision: 1, reason: "", entitlements: [] });

  const entitlementCatalog = [
    ["market.saudi", "السوق السعودي"],
    ["market.saudi.delayed", "السوق السعودي المتأخر"],
    ["market.saudi.realtime", "السوق السعودي اللحظي"],
    ["market.us.options", "شركات عقود الخيارات الأمريكية"],
    ["market.gcc.delayed", "أسواق الخليج المتأخرة"],
    ["charts.drawings", "أدوات الرسم"],
    ["charts.saved_layouts", "حفظ تخطيطات الرسم"],
    ["watchlists", "قوائم المتابعة"],
    ["alerts", "التنبيهات"],
    ["screener.advanced", "الفلتر المتقدم"],
    ["exports", "التصدير"],
  ];

  async function load() {
    if (isReferencePreview()) {
      setState((current) => ({ ...current, loading: false }));
      return;
    }
    try {
      setState((current) => ({ ...current, loading: true, error: "" }));
      const [plans, subscriptions, customers] = await Promise.all([
        invokeAppFunction("adminSubscriptions", { action: "plans" }),
        invokeAppFunction("adminSubscriptions", { action: "list", limit: 200 }),
        can("customers.masked.read") ? invokeAppFunction("adminCustomers", { action: "list", limit: 100 }) : Promise.resolve({ customers: [] }),
      ]);
      setState((current) => ({ ...current, loading: false, plans: plans.plans || [], subscriptions: subscriptions.subscriptions || [], customers: customers.customers || [] }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: message(error) }));
    }
  }

  useEffect(() => { load(); }, []);

  async function run(payload, success) {
    try {
      setState((current) => ({ ...current, busy: true, error: "", status: "" }));
      await invokeAppFunction("adminSubscriptions", payload);
      await load();
      setState((current) => ({ ...current, busy: false, status: success }));
    } catch (error) {
      setState((current) => ({ ...current, busy: false, error: message(error) }));
    }
  }

  function chooseTransition(subscription) {
    setTransition({ id: subscription.id, status: subscription.status === "active" ? "suspended" : "active", reason: "", expected_revision: subscription.revision || 1 });
  }

  function chooseEntitlements(selectedPlan) {
    const byCode = new Map((selectedPlan.entitlements || []).map((item) => [item.code, item]));
    setEntitlementEditor({
      plan_id: selectedPlan.id,
      expected_revision: selectedPlan.revision || 1,
      reason: "",
      entitlements: entitlementCatalog.map(([code]) => ({
        code,
        enabled: byCode.get(code)?.enabled === true,
        ...(byCode.get(code)?.limit_value !== undefined ? { limit_value: byCode.get(code).limit_value } : {}),
        original_enabled: byCode.get(code)?.enabled === true,
        original_limit_value: byCode.get(code)?.limit_value,
      })),
    });
  }

  function updateEntitlement(code, patch) {
    setEntitlementEditor((current) => ({
      ...current,
      entitlements: current.entitlements.map((item) => item.code === code ? { ...item, ...patch } : item),
    }));
  }

  function entitlementChanges() {
    return entitlementEditor.entitlements
      .filter((item) => item.enabled !== item.original_enabled || item.limit_value !== item.original_limit_value)
      .map(({ code, enabled, limit_value }) => ({ code, enabled, ...(limit_value !== undefined ? { limit_value } : {}) }));
  }

  return <>
    <PageHeader title="الاشتراكات والخطط" description="تفعيل يدوي، حدود قابلة للتطوير، وانتقالات محكومة بسبب ومراجعة." />
    <div className="mx-auto max-w-[1800px] space-y-5 px-4 pb-10">
      {state.loading && <StatusPanel loading />}
      {state.error && <StatusPanel error={state.error} />}
      {state.status && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">{state.status}</div>}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{state.plans.map((item) => <button type="button" onClick={() => can("plans.manage") && chooseEntitlements(item)} key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 text-start transition hover:border-sky-400 dark:border-slate-800 dark:bg-[#0d192a]"><div className="flex items-center justify-between"><WalletCards className="text-sky-500" size={19} /><span className={`rounded-full px-2 py-1 text-[10px] ${item.active ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500"}`}>{item.active ? "نشطة" : "موقفة"}</span></div><b className="mt-4 block">{item.name_ar}</b><p className="mt-1 text-xs text-slate-400">{item.duration_months} شهر · {Number(item.price_sar).toLocaleString("ar-SA")} ر.س</p><small className="mt-3 block text-slate-400">{item.entitlements?.filter((value) => value.enabled).length || 0} خاصية مفعلة</small></button>)}</section>

      {can("plans.manage") && entitlementEditor.plan_id && <section className="rounded-2xl border border-sky-400/30 bg-sky-400/10 p-5">
        <h2 className="font-black">خصائص وحدود الخطة</h2>
        <p className="mt-1 text-xs text-slate-500">يُرسل فرق الخصائص للخادم مع رقم المراجعة لمنع الكتابة فوق تعديل أحدث.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{entitlementCatalog.map(([code, label]) => {
          const item = entitlementEditor.entitlements.find((value) => value.code === code) || { code, enabled: false };
          return <label key={code} className="rounded-xl border border-sky-400/20 bg-white/70 p-3 dark:bg-slate-950/40">
            <span className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={item.enabled} onChange={(event) => updateEntitlement(code, { enabled: event.target.checked })} />{label}</span>
            <input type="number" min="0" className="form-input mt-2 w-full" value={item.limit_value ?? ""} onChange={(event) => updateEntitlement(code, event.target.value === "" ? { limit_value: undefined } : { limit_value: Number(event.target.value) })} placeholder="الحد — اختياري" />
          </label>;
        })}</div>
        <div className="mt-4 flex flex-wrap gap-3"><input className="form-input min-w-64 flex-1" value={entitlementEditor.reason} onChange={(event) => setEntitlementEditor((value) => ({ ...value, reason: event.target.value }))} placeholder="سبب تغيير خصائص الخطة" /><button type="button" className="primary-button" disabled={state.busy || entitlementEditor.reason.trim().length < 3 || entitlementChanges().length === 0} onClick={() => run({ action: "set_entitlements", plan_id: entitlementEditor.plan_id, expected_revision: entitlementEditor.expected_revision, reason: entitlementEditor.reason, changes: entitlementChanges() }, "حُفظت خصائص الخطة مع سجل القيم قبل وبعد.")}><Save size={15} />حفظ الخصائص</button></div>
      </section>}

      <section className="grid gap-5 xl:grid-cols-2">
        {can("subscriptions.manage") && <form onSubmit={(event) => { event.preventDefault(); run({ action: "activate", ...activation }, "فُعل اشتراك العميل يدوياً وسُجلت العملية."); }} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]"><h2 className="flex items-center gap-2 font-black"><BadgeCheck size={18} />تفعيل يدوي</h2><div className="mt-4 grid gap-3"><select className="form-input" value={activation.customer_id} onChange={(event) => setActivation((value) => ({ ...value, customer_id: event.target.value }))} required><option value="">اختر العميل</option>{state.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name} · {customer.customer_number}</option>)}</select><select className="form-input" value={activation.plan_id} onChange={(event) => setActivation((value) => ({ ...value, plan_id: event.target.value }))} required><option value="">اختر الخطة</option>{state.plans.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name_ar}</option>)}</select><input type="date" className="form-input" value={activation.starts_at} onChange={(event) => setActivation((value) => ({ ...value, starts_at: event.target.value }))} /><input className="form-input" value={activation.reason} onChange={(event) => setActivation((value) => ({ ...value, reason: event.target.value }))} placeholder="سبب التفعيل" required /><button className="primary-button" disabled={state.busy}><Save size={15} />تفعيل الاشتراك</button></div></form>}

        {can("plans.manage") && <form onSubmit={(event) => { event.preventDefault(); run({ action: "create_plan", plan, reason: planReason }, "أُنشئت الخطة وسُجلت العملية."); }} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]"><h2 className="flex items-center gap-2 font-black"><Plus size={18} />إنشاء خطة</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input className="form-input" value={plan.code} onChange={(event) => setPlan((value) => ({ ...value, code: event.target.value }))} placeholder="رمز الخطة" required /><input className="form-input" value={plan.name_ar} onChange={(event) => setPlan((value) => ({ ...value, name_ar: event.target.value }))} placeholder="الاسم العربي" required /><input className="form-input" value={plan.name_en} onChange={(event) => setPlan((value) => ({ ...value, name_en: event.target.value }))} placeholder="الاسم الإنجليزي" required /><select className="form-input" value={plan.duration_months} onChange={(event) => setPlan((value) => ({ ...value, duration_months: Number(event.target.value) }))}><option value="1">شهر</option><option value="3">3 أشهر</option><option value="6">6 أشهر</option></select><input type="number" min="0" className="form-input" value={plan.price_sar} onChange={(event) => setPlan((value) => ({ ...value, price_sar: Number(event.target.value) }))} placeholder="السعر" /><input className="form-input" value={planReason} onChange={(event) => setPlanReason(event.target.value)} placeholder="سبب الإنشاء" required /><button className="primary-button sm:col-span-2" disabled={state.busy}><Plus size={15} />إنشاء الخطة</button></div></form>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-black"><Clock3 size={18} />سجل الاشتراكات</h2><button type="button" className="secondary-button" onClick={load}><RefreshCcw size={15} />تحديث</button></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="text-slate-400"><tr><th className="p-3 text-start">العميل</th><th className="p-3 text-start">الخطة</th><th className="p-3">الحالة</th><th className="p-3">البداية</th><th className="p-3">النهاية</th><th className="p-3">الإجراء</th></tr></thead><tbody>{state.subscriptions.map((item) => <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3">{state.customers.find((customer) => customer.id === item.customer_id)?.full_name || item.customer_id}</td><td className="p-3">{state.plans.find((planItem) => planItem.id === item.plan_id)?.name_ar || item.plan_id}</td><td className="p-3 text-center">{item.status}</td><td className="p-3 text-center">{new Date(item.starts_at).toLocaleDateString("ar-SA")}</td><td className="p-3 text-center">{new Date(item.ends_at).toLocaleDateString("ar-SA")}</td><td className="p-3 text-center"><button type="button" className="secondary-button" onClick={() => chooseTransition(item)}>تغيير</button></td></tr>)}</tbody></table>{!state.subscriptions.length && <StatusPanel title="لا توجد اشتراكات بعد" />}</div></section>

      {transition.id && <section className="rounded-2xl border border-sky-400/30 bg-sky-400/10 p-5"><h2 className="font-black">تغيير حالة الاشتراك</h2><div className="mt-3 flex flex-wrap gap-3"><select className="form-input" value={transition.status} onChange={(event) => setTransition((value) => ({ ...value, status: event.target.value }))}>{["active", "suspended", "expired", "banned"].map((status) => <option key={status}>{status}</option>)}</select><input className="form-input min-w-64 flex-1" value={transition.reason} onChange={(event) => setTransition((value) => ({ ...value, reason: event.target.value }))} placeholder="سبب التغيير" /><button type="button" className="primary-button" disabled={state.busy || transition.reason.trim().length < 3} onClick={() => run({ action: "transition", ...transition }, "حُدثت حالة الاشتراك وسُجلت القيم قبل وبعد.")}>حفظ التغيير</button></div></section>}
    </div>
  </>;
}
