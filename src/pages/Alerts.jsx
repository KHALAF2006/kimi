import React, { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import { invokeAppFunction } from "@/services/marketService";
import { usePreferences } from "@/lib/preferences";

const conditions = [
  ["crosses_above", "اختراق السعر صعودًا", "Crosses above"],
  ["crosses_below", "كسر السعر هبوطًا", "Crosses below"],
];

export default function Alerts() {
  const { language, isArabic } = usePreferences();
  const [state, setState] = useState({ loading: true, rules: [], error: "", busy: "" });
  const [form, setForm] = useState({ symbol: "", condition: "crosses_above", threshold: "", frequency: "repeat", cooldown_minutes: 15 });
  const text = isArabic
    ? { title: "مركز التنبيهات", description: "أنشئ قواعد السعر وأوقفها أو فعّلها واحذفها من مكان واحد.", symbol: "رمز الشركة", price: "السعر", create: "إنشاء تنبيه", empty: "لا توجد تنبيهات", delete: "حذف التنبيه", confirm: "هل تريد حذف هذا التنبيه؟", repeat: "متكرر", once: "مرة واحدة", cooldown: "التهدئة بالدقائق" }
    : { title: "Alert center", description: "Create, enable, disable and delete price rules in one place.", symbol: "Company symbol", price: "Price", create: "Create alert", empty: "No alerts yet", delete: "Delete alert", confirm: "Delete this alert?", repeat: "Repeat", once: "Once", cooldown: "Cooldown in minutes" };

  async function load() {
    setState((value) => ({ ...value, loading: true, error: "" }));
    try {
      const data = await invokeAppFunction("customerSelfService", { action: "alerts" });
      setState({ loading: false, rules: data.rules || [], error: "", busy: "" });
    } catch (error) {
      setState((value) => ({ ...value, loading: false, error: error?.response?.data?.error || error.message, busy: "" }));
    }
  }
  useEffect(() => { load(); }, []);

  async function mutate(key, payload) {
    setState((value) => ({ ...value, busy: key, error: "" }));
    try {
      await invokeAppFunction("customerSelfService", payload);
      await load();
      return true;
    } catch (error) {
      setState((value) => ({ ...value, busy: "", error: error?.response?.data?.error || error.message }));
      return false;
    }
  }

  async function create(event) {
    event.preventDefault();
    const ok = await mutate("create", { action: "create_alert", ...form, threshold: Number(form.threshold), cooldown_minutes: Number(form.cooldown_minutes) });
    if (ok) setForm((value) => ({ ...value, symbol: "", threshold: "" }));
  }

  return <div className="space-y-5">
    <PageHeader title={text.title} description={text.description}/>
    <form onSubmit={create} className="content-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6">
      <input className="form-input" value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder={text.symbol} aria-label={text.symbol} inputMode="numeric" pattern="\d{4}" required/>
      <select className="form-input" value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })} aria-label={isArabic ? "شرط التنبيه" : "Alert condition"}>{conditions.map(([value, ar, en]) => <option key={value} value={value}>{language === "ar" ? ar : en}</option>)}</select>
      <input className="form-input" value={form.threshold} onChange={(event) => setForm({ ...form, threshold: event.target.value })} placeholder={text.price} aria-label={text.price} type="number" min="0.01" step="0.01" required/>
      <select className="form-input" value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })} aria-label={isArabic ? "التكرار" : "Frequency"}><option value="repeat">{text.repeat}</option><option value="once">{text.once}</option></select>
      <input className="form-input" value={form.cooldown_minutes} onChange={(event) => setForm({ ...form, cooldown_minutes: Number(event.target.value) })} aria-label={text.cooldown} title={text.cooldown} type="number" min="15" max="10080" step="15"/>
      <button className="primary-button justify-center" disabled={state.busy === "create"}>{state.busy === "create" ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}<span>{text.create}</span></button>
    </form>
    {state.error && <div className="error-banner" role="alert">{state.error}</div>}
    {state.loading ? <StatusPanel loading/> : state.rules.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{state.rules.map((rule) => {
      const condition = conditions.find(([value]) => value === rule.condition);
      return <article key={rule.id} className="content-card p-4">
        <div className="flex items-start justify-between gap-3"><div><b className="text-xl">{rule.symbol}</b><p className="mt-1 text-sm text-slate-500">{condition ? condition[language === "ar" ? 1 : 2] : rule.condition}</p></div><span className={rule.enabled ? "status-badge status-success" : "status-badge"}>{rule.enabled ? <Bell size={13}/> : <BellOff size={13}/>}</span></div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">{text.price}</dt><dd className="font-black">{Number(rule.threshold).toFixed(2)}</dd></div><div><dt className="text-slate-500">{text.cooldown}</dt><dd className="font-black">{rule.cooldown_minutes}</dd></div></dl>
        <div className="mt-4 flex gap-2">
          <button type="button" className="secondary-button flex-1 justify-center" onClick={() => mutate(`toggle:${rule.id}`, { action: "toggle_alert", rule_id: rule.id, enabled: !rule.enabled })}>{rule.enabled ? <BellOff size={15}/> : <Bell size={15}/>}<span>{rule.enabled ? (isArabic ? "إيقاف" : "Disable") : (isArabic ? "تفعيل" : "Enable")}</span></button>
          <button type="button" className="icon-button text-red-600" onClick={() => window.confirm(text.confirm) && mutate(`delete:${rule.id}`, { action: "delete_alert", rule_id: rule.id })} title={text.delete} aria-label={`${text.delete}: ${rule.symbol}`}><Trash2 size={16}/></button>
        </div>
      </article>;
    })}</div> : <StatusPanel title={text.empty}/>}
  </div>;
}
