import React, { useEffect, useState } from "react";
import { Ban, FileText, RefreshCcw, Search, ShieldCheck, UserRound, WifiOff } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import { invokeAppFunction, isReferencePreview } from "@/services/marketService";
import { useAuthorization } from "@/lib/AuthorizationContext";

function message(error) {
  return error?.response?.data?.error || error?.message || "تعذر تنفيذ العملية.";
}

export default function CustomersAdmin() {
  const { can } = useAuthorization();
  const [state, setState] = useState({ loading: true, customers: [], mode: "masked", error: "", status: "", busy: false });
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [nextStatus, setNextStatus] = useState("active");

  async function load() {
    if (isReferencePreview()) {
      setState((current) => ({ ...current, loading: false, customers: [], error: "" }));
      return;
    }
    try {
      setState((current) => ({ ...current, loading: true, error: "" }));
      const data = await invokeAppFunction("adminCustomers", { action: "list", limit: 100 });
      setState((current) => ({ ...current, loading: false, customers: data.customers || [], mode: data.data_mode || "masked" }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: message(error) }));
    }
  }

  useEffect(() => { load(); }, []);

  async function detail(customer) {
    try {
      setState((current) => ({ ...current, busy: true, error: "" }));
      const data = await invokeAppFunction("adminCustomers", { action: "detail", id: customer.id });
      setSelected(data);
      setNextStatus(data.customer.account_status);
      setState((current) => ({ ...current, busy: false }));
    } catch (error) {
      setState((current) => ({ ...current, busy: false, error: message(error) }));
    }
  }

  async function mutate(payload, success) {
    try {
      setState((current) => ({ ...current, busy: true, error: "", status: "" }));
      await invokeAppFunction("adminCustomers", payload);
      await load();
      if (selected?.customer) await detail(selected.customer);
      setReason("");
      setNote("");
      setState((current) => ({ ...current, busy: false, status: success }));
    } catch (error) {
      setState((current) => ({ ...current, busy: false, error: message(error) }));
    }
  }

  const filtered = state.customers.filter((customer) => `${customer.customer_number} ${customer.full_name} ${customer.email_normalized}`.toLowerCase().includes(query.trim().toLowerCase()));

  return <>
    <PageHeader title="دليل العملاء" description={`عرض ${state.mode === "full" ? "كامل ومصرح" : "مقنّع"} مع ملف شامل وإجراءات مدققة.`} />
    <div className="mx-auto grid max-w-[1800px] gap-5 px-4 pb-10 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d192a]">
        <div className="flex flex-wrap items-center gap-3"><label className="flex min-w-60 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-700"><Search size={15} /><input className="h-10 flex-1 bg-transparent text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو رقم العميل" /></label><button type="button" className="secondary-button" onClick={load}><RefreshCcw size={15} />تحديث</button></div>
        {state.loading ? <StatusPanel loading /> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="text-slate-400"><tr><th className="p-3 text-start">العميل</th><th className="p-3 text-start">التواصل</th><th className="p-3">الحالة</th><th className="p-3">الدور</th></tr></thead><tbody>{filtered.map((customer) => <tr key={customer.id} onClick={() => detail(customer)} className="cursor-pointer border-t border-slate-100 hover:bg-sky-400/5 dark:border-slate-800"><td className="p-3"><b>{customer.full_name}</b><small className="block text-slate-400">{customer.customer_number}</small></td><td className="p-3"><span className="block">{customer.email_normalized}</span><small className="text-slate-400">{customer.phone_e164 || "—"}</small></td><td className="p-3 text-center">{customer.account_status}</td><td className="p-3 text-center">{customer.role}</td></tr>)}</tbody></table>{!filtered.length && <StatusPanel title="لا توجد نتائج" />}</div>}
      </section>

      <aside className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]">
        {!selected ? <div className="grid min-h-64 place-items-center text-center text-slate-400"><div><UserRound size={34} className="mx-auto mb-3" /><p>اختر عميلاً لعرض الحساب والاشتراك والجلسات والموافقات.</p></div></div> : <div className="space-y-5">
          <div><div className="flex items-center gap-2"><UserRound size={18} className="text-sky-500" /><h2 className="font-black">{selected.customer.full_name}</h2></div><p className="mt-1 text-xs text-slate-400">{selected.customer.customer_number} · {selected.customer.email_normalized}</p></div>
          <div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><small className="text-slate-400">الاشتراكات</small><b className="block text-xl">{selected.subscriptions?.length || 0}</b></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><small className="text-slate-400">الجلسات</small><b className="block text-xl">{selected.sessions?.filter((item) => !item.revoked_at).length || 0}</b></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><small className="text-slate-400">قوائم المتابعة</small><b className="block text-xl">{selected.resource_counts?.watchlists || 0}</b></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><small className="text-slate-400">التنبيهات</small><b className="block text-xl">{selected.resource_counts?.alerts || 0}</b></div></div>
          {can("customers.status.manage") && <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><b className="flex items-center gap-2"><Ban size={15} />حالة الحساب</b><div className="mt-3 grid gap-2"><select className="form-input" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>{["pending_verification", "active", "suspended", "banned", "closed"].map((status) => <option key={status}>{status}</option>)}</select><input className="form-input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="سبب التغيير" /><button type="button" className="primary-button" disabled={state.busy || reason.trim().length < 3} onClick={() => mutate({ action: "status", id: selected.customer.id, status: nextStatus, reason }, "حُدثت حالة العميل وسُجلت القيم قبل وبعد.")}>حفظ الحالة</button></div></section>}
          {can("customers.sessions.revoke") && <button type="button" className="secondary-button w-full" disabled={state.busy || reason.trim().length < 3} onClick={() => mutate({ action: "revoke_sessions", id: selected.customer.id, reason }, "أُلغيت جلسات العميل.")}><WifiOff size={15} />إلغاء كل الجلسات النشطة</button>}
          <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><b className="flex items-center gap-2"><FileText size={15} />ملاحظات الإدارة</b><div className="mt-3 space-y-2">{selected.notes?.map((item) => <p key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">{item.body}</p>)}</div><textarea className="form-input mt-3 min-h-20 w-full" value={note} onChange={(event) => setNote(event.target.value)} placeholder="أضف ملاحظة داخلية" /><button type="button" className="secondary-button mt-2 w-full" disabled={state.busy || !note.trim() || reason.trim().length < 3} onClick={() => mutate({ action: "add_note", id: selected.customer.id, note, reason }, "أُضيفت الملاحظة الداخلية.")}>إضافة الملاحظة</button></section>
          <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300"><ShieldCheck size={15} className="mt-0.5" />لا تعرض الجلسات بصمات الجهاز أو الأسرار، وتبقى الإجراءات الحساسة مرتبطة بسبب وسجل تدقيق.</div>
        </div>}
      </aside>
    </div>
    {state.error && <div className="fixed bottom-4 end-4 max-w-sm rounded-xl border border-red-500/30 bg-red-950 p-4 text-sm text-red-200">{state.error}</div>}
    {state.status && <div className="fixed bottom-4 start-4 max-w-sm rounded-xl border border-emerald-500/30 bg-emerald-950 p-4 text-sm text-emerald-200">{state.status}</div>}
  </>;
}
