import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, Plus, Send, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import { invokeAppFunction } from "@/services/marketService";
import { usePreferences } from "@/lib/preferences";

export default function Destinations() {
  const { isArabic } = usePreferences();
  const [state, setState] = useState({ loading: true, data: { destinations: [], groups: [], recipients: [] }, error: "", busy: "" });
  const [telegram, setTelegram] = useState({ label: "", external_id: "" });
  const [groupName, setGroupName] = useState("");
  const [recipient, setRecipient] = useState({ group_id: "", phone_e164: "", consent_confirmed: false });
  const [whatsapp, setWhatsapp] = useState({ label: "", external_id: "" });
  const t = isArabic
    ? { title: "قنوات التنبيه", description: "اربط تيليجرام أو مجموعات واتساب، تحقق من القناة، ثم فعّل أو أوقف التسليم.", telegram: "تيليجرام", whatsapp: "واتساب", label: "اسم القناة", telegramId: "اسم القناة مثل ‎@channel أو رقمها", create: "إنشاء", verify: "تحقق", enable: "تفعيل", disable: "إيقاف", remove: "حذف", groups: "مجموعات المستلمين", groupName: "اسم المجموعة", recipient: "رقم المستلم بصيغة دولية", consent: "أؤكد وجود موافقة موثقة من المستلم", addRecipient: "إضافة مستلم", chooseGroup: "اختر مجموعة", noDestinations: "لم تُضف قنوات بعد", verified: "متحققة", waiting: "تحتاج تحقق" }
    : { title: "Alert destinations", description: "Connect Telegram or WhatsApp groups, verify each destination, then enable or pause delivery.", telegram: "Telegram", whatsapp: "WhatsApp", label: "Destination name", telegramId: "Channel handle such as @channel or numeric ID", create: "Create", verify: "Verify", enable: "Enable", disable: "Disable", remove: "Delete", groups: "Recipient groups", groupName: "Group name", recipient: "Recipient number in international format", consent: "I confirm documented recipient consent", addRecipient: "Add recipient", chooseGroup: "Choose a group", noDestinations: "No destinations yet", verified: "Verified", waiting: "Needs verification" };

  async function load() {
    setState((value) => ({ ...value, loading: true, error: "" }));
    try {
      const data = await invokeAppFunction("customerSelfService", { action: "alerts" });
      setState({ loading: false, data: { destinations: data.destinations || [], groups: data.groups || [], recipients: data.recipients || [] }, error: "", busy: "" });
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

  async function createTelegram(event) {
    event.preventDefault();
    if (await mutate("telegram", { action: "create_destination", channel: "telegram", ...telegram })) setTelegram({ label: "", external_id: "" });
  }
  async function createGroup(event) {
    event.preventDefault();
    const response = await mutate("group", { action: "create_recipient_group", name: groupName });
    if (response) setGroupName("");
  }
  async function addRecipient(event) {
    event.preventDefault();
    if (await mutate("recipient", { action: "add_recipient", ...recipient })) setRecipient((value) => ({ ...value, phone_e164: "", consent_confirmed: false }));
  }
  async function createWhatsApp(event) {
    event.preventDefault();
    if (await mutate("whatsapp", { action: "create_destination", channel: "whatsapp", ...whatsapp })) setWhatsapp({ label: "", external_id: "" });
  }

  const recipientsByGroup = useMemo(() => {
    const map = new Map();
    state.data.recipients.forEach((item) => map.set(item.group_id, [...(map.get(item.group_id) || []), item]));
    return map;
  }, [state.data.recipients]);

  return <div className="space-y-5">
    <PageHeader title={t.title} description={t.description}/>
    {state.error && <div className="error-banner" role="alert">{state.error}</div>}
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="content-card p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-black"><Send size={18}/>{t.telegram}</h2>
        <form onSubmit={createTelegram} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input className="form-input" value={telegram.label} onChange={(event) => setTelegram({ ...telegram, label: event.target.value })} placeholder={t.label} aria-label={`${t.telegram}: ${t.label}`} minLength={2} maxLength={80} required/>
          <input className="form-input" dir="ltr" value={telegram.external_id} onChange={(event) => setTelegram({ ...telegram, external_id: event.target.value.trim() })} placeholder="@channel" aria-label={t.telegramId} required/>
          <button className="primary-button justify-center sm:col-span-2" disabled={state.busy === "telegram"}>{state.busy === "telegram" ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}<span>{t.create}</span></button>
        </form>
      </section>

      <section className="content-card p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-black"><MessageCircle size={18}/>{t.whatsapp}</h2>
        <form onSubmit={createWhatsApp} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input className="form-input" value={whatsapp.label} onChange={(event) => setWhatsapp({ ...whatsapp, label: event.target.value })} placeholder={t.label} aria-label={`${t.whatsapp}: ${t.label}`} minLength={2} maxLength={80} required/>
          <select className="form-input" value={whatsapp.external_id} onChange={(event) => setWhatsapp({ ...whatsapp, external_id: event.target.value })} aria-label={t.chooseGroup} required><option value="">{t.chooseGroup}</option>{state.data.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
          <button className="primary-button justify-center sm:col-span-2" disabled={state.busy === "whatsapp"}>{state.busy === "whatsapp" ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}<span>{t.create}</span></button>
        </form>
      </section>
    </div>

    <section className="content-card p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-black"><UserPlus size={18}/>{t.groups}</h2>
      <form onSubmit={createGroup} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input className="form-input min-w-0 flex-1" value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder={t.groupName} aria-label={t.groupName} minLength={2} maxLength={80} required/>
        <button className="secondary-button justify-center" disabled={state.busy === "group"}><Plus size={16}/><span>{t.create}</span></button>
      </form>
      {state.data.groups.map((group) => <article key={group.id} className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <header className="flex items-center justify-between gap-3"><div><b>{group.name}</b><p className="mt-1 text-xs text-slate-500">{recipientsByGroup.get(group.id)?.length || 0}</p></div><button type="button" className="icon-button text-red-600" onClick={() => window.confirm(t.remove + "؟") && mutate(`group-delete:${group.id}`, { action: "delete_recipient_group", group_id: group.id })} title={t.remove} aria-label={`${t.remove}: ${group.name}`}><Trash2 size={16}/></button></header>
        <form onSubmit={addRecipient} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input type="hidden" value={group.id}/>
          <input className="form-input" dir="ltr" value={recipient.group_id === group.id ? recipient.phone_e164 : ""} onFocus={() => setRecipient((value) => ({ ...value, group_id: group.id }))} onChange={(event) => setRecipient({ ...recipient, group_id: group.id, phone_e164: event.target.value })} placeholder="+9665XXXXXXXX" aria-label={`${t.recipient}: ${group.name}`} required/>
          <button className="secondary-button justify-center" disabled={!recipient.consent_confirmed || state.busy === "recipient"}><UserPlus size={16}/><span>{t.addRecipient}</span></button>
          <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 sm:col-span-2"><input type="checkbox" checked={recipient.group_id === group.id && recipient.consent_confirmed} onChange={(event) => setRecipient({ ...recipient, group_id: group.id, consent_confirmed: event.target.checked })}/><span>{t.consent}</span></label>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">{(recipientsByGroup.get(group.id) || []).map((item) => <span key={item.id} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800"><span dir="ltr">{item.phone_masked}</span><button type="button" onClick={() => mutate(`recipient-delete:${item.id}`, { action: "remove_recipient", group_id: group.id, recipient_id: item.id })} title={t.remove} aria-label={`${t.remove}: ${item.phone_masked}`}><Trash2 size={13}/></button></span>)}</div>
      </article>)}
    </section>

    {state.loading ? <StatusPanel loading/> : state.data.destinations.length ? <section className="grid gap-3 md:grid-cols-2">{state.data.destinations.map((destination) => <article key={destination.id} className="content-card p-4">
      <div className="flex items-start justify-between gap-3"><div><b>{destination.label}</b><p className="mt-1 text-sm text-slate-500">{destination.channel === "telegram" ? t.telegram : t.whatsapp} · {destination.address_masked}</p></div><span className={destination.verified_at ? "status-badge status-success" : "status-badge"}>{destination.verified_at ? <CheckCircle2 size={13}/> : <ShieldCheck size={13}/>}<span>{destination.verified_at ? t.verified : t.waiting}</span></span></div>
      <div className="mt-4 flex flex-wrap gap-2">
        {!destination.verified_at && <button type="button" className="primary-button" onClick={() => mutate(`verify:${destination.id}`, { action: "verify_destination", destination_id: destination.id })}><ShieldCheck size={15}/><span>{t.verify}</span></button>}
        {destination.verified_at && <button type="button" className="secondary-button" onClick={() => mutate(`toggle:${destination.id}`, { action: "toggle_destination", destination_id: destination.id, active: !destination.active })}><span>{destination.active ? t.disable : t.enable}</span></button>}
        <button type="button" className="icon-button text-red-600" onClick={() => window.confirm(t.remove + "؟") && mutate(`delete:${destination.id}`, { action: "delete_destination", destination_id: destination.id })} title={t.remove} aria-label={`${t.remove}: ${destination.label}`}><Trash2 size={16}/></button>
      </div>
    </article>)}</section> : <StatusPanel title={t.noDestinations}/>}
  </div>;
}
