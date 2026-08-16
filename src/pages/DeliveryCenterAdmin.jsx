import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Mail, MessageCircle, Pencil, Plus, RadioTower, Send, ShieldCheck, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import { invokeAppFunction } from "@/services/marketService";
import { usePreferences } from "@/lib/preferences";

const blankChannel = { channel_id: "", revision: 0, channel: "telegram", market_code: "SA_MAIN", label: "", external_id: "", secret_ref: "", configuration: { graph_version: "v23.0", template_name: "", template_language: "ar" } };
const blankCampaign = { title: "", market_codes: [], subject: "", body: "" };

function messageFor(error, isArabic) {
  const code = error?.response?.data?.code || error?.code;
  const map = {
    OWNER_REQUIRED: ["هذه الصفحة متاحة للمالك فقط.", "This page is restricted to the owner."],
    SECRET_NOT_CONFIGURED: ["اسم المفتاح محفوظ، لكن قيمته غير مضافة في أسرار المشروع.", "The secret name is saved, but its value is not configured."],
    PROVIDER_VERIFICATION_FAILED: ["تعذر التحقق من بيانات القناة لدى مزود الخدمة.", "The provider could not verify this channel."],
    CHANNEL_NOT_VERIFIED: ["تحقق من القناة قبل تفعيلها.", "Verify the channel before enabling it."],
    NO_ELIGIBLE_RECIPIENTS: ["لا يوجد مشتركون نشطون ومستوفون للشروط في الأسواق المحددة.", "No eligible active subscribers were found in the selected markets."],
    REVISION_CONFLICT: ["تم تعديل السجل في جلسة أخرى. حدّث الصفحة ثم أعد المحاولة.", "This record changed in another session. Refresh and try again."],
  };
  return map[code]?.[isArabic ? 0 : 1] || error?.response?.data?.error || error?.message || (isArabic ? "تعذر إكمال العملية." : "The operation could not be completed.");
}

function campaignStatus(value, isArabic) {
  const labels = {
    draft: ["مسودة", "Draft"], ready: ["جاهزة للإرسال", "Ready"], sending: ["جارٍ الإرسال", "Sending"],
    sent: ["اكتمل الإرسال", "Sent"], partially_failed: ["اكتملت مع بعض حالات الفشل", "Completed with failures"], cancelled: ["ملغاة", "Cancelled"],
  };
  return labels[value]?.[isArabic ? 0 : 1] || value;
}

export default function DeliveryCenterAdmin() {
  const { isArabic } = usePreferences();
  const [state, setState] = useState({ loading: true, busy: "", error: "", success: "", markets: [], channels: [], campaigns: [], workerHealth: null });
  const [channel, setChannel] = useState(blankChannel);
  const [campaign, setCampaign] = useState(blankCampaign);
  const [preview, setPreview] = useState(null);
  const [channelToDelete, setChannelToDelete] = useState(null);
  const marketByCode = useMemo(() => new Map(state.markets.map((item) => [item.market_code, item])), [state.markets]);
  const t = isArabic ? {
    title: "مركز قنوات الإرسال", description: "إدارة مركزية للمالك تربط كل تنبيه بسوقه الصحيح في تيليجرام وواتساب والبريد.",
    channels: "قنوات تيليجرام وواتساب", add: "حفظ القناة", telegram: "تيليجرام", whatsapp: "واتساب", label: "اسم القناة", market: "السوق", externalTelegram: "معرّف القناة @channel أو -100...", externalWhatsapp: "معرّف رقم واتساب لدى Meta", secret: "اسم المفتاح المحفوظ في أسرار المشروع", verify: "تحقق وتفعيل", enable: "تفعيل", disable: "إيقاف", edit: "تعديل", remove: "حذف", configured: "المفتاح مضاف", missing: "المفتاح غير مضاف", verified: "تم التحقق", unverified: "بانتظار التحقق", template: "اسم قالب واتساب المعتمد", language: "لغة القالب", graph: "إصدار Graph API",
    email: "مراسلة الأعضاء بالبريد", campaignTitle: "اسم الحملة داخل لوحة الإدارة", subject: "عنوان الرسالة", body: "نص الرسالة — حتى 20,000 سطر", recipients: "الأسواق المستلمة", preview: "معاينة المستلمين والتكلفة", create: "إنشاء الحملة", sendBatch: "إرسال الدفعة التالية", noChannels: "لا توجد قنوات مركزية بعد.", noCampaigns: "لا توجد حملات بريدية بعد.", campaignReady: "تم إنشاء الحملة وتجميد قائمة مستلميها بنجاح.", saved: "تم حفظ القناة. يلزم التحقق منها قبل استخدامها.", deleted: "تم حذف القناة.", estimate: "مستلم فريد", defaultCredits: "رصيد تقريبي بالنطاق الافتراضي", customCredits: "رصيد تقريبي بالنطاق المخصص", campaigns: "سجل الحملات", sent: "مرسل", failed: "فشل", status: "الحالة", deleteTitle: "حذف قناة الإرسال؟", deleteDescription: "سيتم إيقاف استخدامها فور نشر التغيير. لا يمكن التراجع عن الحذف.", cancel: "إلغاء", confirmDelete: "تأكيد الحذف", worker: "حالة عامل الإرسال", workerVerified: "آخر تشغيل مكتمل", workerUnverified: "لم يُثبت تشغيل العامل بعد", pendingQueue: "قيد الانتظار", retryQueue: "بانتظار إعادة المحاولة", workflowAction: "أعد تفعيل Workflow «معالجة قنوات الإرسال المركزية» من لوحة Base44، ثم راقب ظهور وقت آخر تشغيل هنا."
  } : {
    title: "Delivery channel center", description: "Owner-only centralized routing that keeps every Telegram, WhatsApp and email delivery inside its market.",
    channels: "Telegram and WhatsApp channels", add: "Save channel", telegram: "Telegram", whatsapp: "WhatsApp", label: "Channel name", market: "Market", externalTelegram: "Channel ID @channel or -100...", externalWhatsapp: "Meta WhatsApp phone number ID", secret: "Secret name configured in project secrets", verify: "Verify & enable", enable: "Enable", disable: "Disable", edit: "Edit", remove: "Delete", configured: "Secret configured", missing: "Secret missing", verified: "Verified", unverified: "Not verified", template: "Approved WhatsApp template", language: "Template language", graph: "Graph API version",
    email: "Email registered members", campaignTitle: "Internal campaign name", subject: "Email subject", body: "Email body — up to 20,000 lines", recipients: "Recipient markets", preview: "Preview recipients & cost", create: "Create campaign", sendBatch: "Send next batch", noChannels: "No centralized channels yet.", noCampaigns: "No email campaigns yet.", campaignReady: "Campaign and recipient snapshot created.", saved: "Channel saved. Verify it before use.", deleted: "Channel deleted.", estimate: "unique recipients", defaultCredits: "estimated default-domain credits", customCredits: "estimated custom-domain credits", campaigns: "Campaign history", sent: "sent", failed: "failed", status: "Status", deleteTitle: "Delete this delivery channel?", deleteDescription: "It will stop being used after the change is published. Deletion cannot be undone.", cancel: "Cancel", confirmDelete: "Delete channel", worker: "Delivery worker health", workerVerified: "Last completed run", workerUnverified: "No completed worker run has been recorded", pendingQueue: "pending", retryQueue: "waiting to retry", workflowAction: "Re-enable the “معالجة قنوات الإرسال المركزية” workflow in Base44, then confirm that a completion time appears here."
  };

  async function load() {
    setState((value) => ({ ...value, loading: true, error: "" }));
    try {
      const data = await invokeAppFunction("adminDeliveryCenter", { action: "list" });
      setState((value) => ({ ...value, loading: false, markets: data.markets || [], channels: data.channels || [], campaigns: data.campaigns || [], workerHealth: data.worker_health || null, busy: "" }));
      if (!channel.market_code && data.markets?.[0]) setChannel((value) => ({ ...value, market_code: data.markets[0].market_code }));
    } catch (error) { setState((value) => ({ ...value, loading: false, busy: "", error: messageFor(error, isArabic) })); }
  }
  useEffect(() => { load(); }, []);

  async function run(key, payload, success) {
    setState((value) => ({ ...value, busy: key, error: "", success: "" }));
    try { const result = await invokeAppFunction("adminDeliveryCenter", payload); if (success) success(result); await load(); return result; }
    catch (error) { setState((value) => ({ ...value, busy: "", error: messageFor(error, isArabic) })); return null; }
  }

  async function saveChannel(event) {
    event.preventDefault();
    await run("save-channel", { action: "save_channel", ...channel }, () => { setChannel(blankChannel); setState((value) => ({ ...value, success: t.saved })); });
  }

  function toggleMarket(code) {
    setCampaign((value) => ({ ...value, market_codes: value.market_codes.includes(code) ? value.market_codes.filter((item) => item !== code) : [...value.market_codes, code] }));
    setPreview(null);
  }

  async function previewCampaign() {
    const result = await run("preview", { action: "preview_campaign", market_codes: campaign.market_codes });
    if (result) setPreview(result);
  }

  async function createCampaign(event) {
    event.preventDefault();
    await run("create-campaign", { action: "create_campaign", ...campaign }, () => { setCampaign(blankCampaign); setPreview(null); setState((value) => ({ ...value, success: t.campaignReady })); });
  }

  if (state.loading) return <StatusPanel loading />;
  return <div className="space-y-6">
    <PageHeader title={t.title} description={t.description} />
    {state.error && <div className="error-banner" role="alert">{state.error}</div>}
    {state.success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" role="status"><CheckCircle2 className="me-2 inline" size={18}/>{state.success}</div>}

    <section className={`content-card border p-5 ${state.workerHealth?.has_completed_run ? "border-emerald-300 dark:border-emerald-900" : "border-amber-300 dark:border-amber-900"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-black"><RadioTower size={20}/>{t.worker}</h2><p className="mt-2 text-sm text-slate-500">{state.workerHealth?.has_completed_run ? `${t.workerVerified}: ${new Date(state.workerHealth.last_completed_at).toLocaleString(isArabic ? "ar-SA" : "en-US")}` : t.workerUnverified}</p></div><div className="flex flex-wrap gap-2"><span className="status-badge">{t.pendingQueue}: {state.workerHealth?.pending_count ?? 0}</span><span className="status-badge">{t.retryQueue}: {state.workerHealth?.retry_count ?? 0}</span></div></div>
      {!state.workerHealth?.has_completed_run && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{t.workflowAction}</p>}
    </section>

    <section className="content-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><RadioTower size={20}/>{t.channels}</h2>
      <form onSubmit={saveChannel} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <select className="form-input" value={channel.channel} onChange={(event) => setChannel({ ...blankChannel, channel: event.target.value, market_code: channel.market_code })} aria-label={t.channels}><option value="telegram">{t.telegram}</option><option value="whatsapp">{t.whatsapp}</option></select>
        <select className="form-input" value={channel.market_code} onChange={(event) => setChannel({ ...channel, market_code: event.target.value })} aria-label={t.market}>{state.markets.map((item) => <option key={item.market_code} value={item.market_code}>{isArabic ? item.name_ar : item.name_en}</option>)}</select>
        <input className="form-input" value={channel.label} onChange={(event) => setChannel({ ...channel, label: event.target.value })} placeholder={t.label} required maxLength={100}/>
        <input className="form-input" value={channel.external_id} onChange={(event) => setChannel({ ...channel, external_id: event.target.value })} placeholder={channel.channel === "telegram" ? t.externalTelegram : t.externalWhatsapp} required/>
        <input className="form-input" value={channel.secret_ref} onChange={(event) => setChannel({ ...channel, secret_ref: event.target.value.toUpperCase() })} placeholder={t.secret} required pattern="[A-Z][A-Z0-9_]+"/>
        {channel.channel === "whatsapp" && <><input className="form-input" value={channel.configuration.template_name} onChange={(event) => setChannel({ ...channel, configuration: { ...channel.configuration, template_name: event.target.value } })} placeholder={t.template} required/><input className="form-input" value={channel.configuration.template_language} onChange={(event) => setChannel({ ...channel, configuration: { ...channel.configuration, template_language: event.target.value } })} placeholder={t.language} required/><input className="form-input" value={channel.configuration.graph_version} onChange={(event) => setChannel({ ...channel, configuration: { ...channel.configuration, graph_version: event.target.value } })} placeholder={t.graph} required/></>}
        <button className="primary-button justify-center" disabled={state.busy === "save-channel"}>{state.busy === "save-channel" ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>} {t.add}</button>
      </form>
      <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {state.channels.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-start justify-between gap-3"><div><b className="flex items-center gap-2">{item.channel === "telegram" ? <Send size={16}/> : <MessageCircle size={16}/>} {item.label}</b><p className="mt-1 text-sm text-slate-500">{isArabic ? marketByCode.get(item.market_code)?.name_ar : marketByCode.get(item.market_code)?.name_en}</p><code className="mt-2 block text-xs">{item.external_id}</code></div><span className={item.active ? "status-badge status-success" : "status-badge"}>{item.active ? t.enable : t.disable}</span></div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className={item.secret_configured ? "status-badge status-success" : "status-badge status-error"}>{item.secret_configured ? t.configured : t.missing}</span><span className={item.verified_at ? "status-badge status-success" : "status-badge"}>{item.verified_at ? t.verified : t.unverified}</span></div>
          <div className="mt-4 flex flex-wrap gap-2"><button className="secondary-button" disabled={Boolean(state.busy)} onClick={() => run(`verify:${item.id}`, { action: "verify_channel", channel_id: item.id })}><ShieldCheck size={15}/>{t.verify}</button><button className="secondary-button" disabled={Boolean(state.busy)} onClick={() => run(`toggle:${item.id}`, { action: "toggle_channel", channel_id: item.id, active: !item.active })}>{item.active ? t.disable : t.enable}</button><button className="secondary-button" disabled={Boolean(state.busy)} onClick={() => setChannel({ channel_id: item.id, revision: item.revision, channel: item.channel, market_code: item.market_code, label: item.label, external_id: item.external_id, secret_ref: item.secret_name, configuration: item.configuration || blankChannel.configuration })}><Pencil size={15}/>{t.edit}</button><button className="icon-button text-red-600" title={t.remove} aria-label={`${t.remove}: ${item.label}`} onClick={() => setChannelToDelete(item)}><Trash2 size={16}/></button></div>
        </article>)}
        {!state.channels.length && <StatusPanel title={t.noChannels}/>}
      </div>
    </section>

    <section className="content-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><Mail size={20}/>{t.email}</h2>
      <form onSubmit={createCampaign} className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2"><input className="form-input" value={campaign.title} onChange={(event) => setCampaign({ ...campaign, title: event.target.value })} placeholder={t.campaignTitle} required maxLength={140}/><input className="form-input" value={campaign.subject} onChange={(event) => setCampaign({ ...campaign, subject: event.target.value })} placeholder={t.subject} required maxLength={200}/></div>
        <fieldset><legend className="mb-2 text-sm font-bold">{t.recipients}</legend><div className="flex flex-wrap gap-2">{state.markets.map((item) => <label key={item.market_code} className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-bold ${campaign.market_codes.includes(item.market_code) ? "border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200" : "border-slate-200 dark:border-slate-700"}`}><input className="me-2" type="checkbox" checked={campaign.market_codes.includes(item.market_code)} onChange={() => toggleMarket(item.market_code)}/>{isArabic ? item.name_ar : item.name_en}</label>)}</div></fieldset>
        <textarea className="form-input min-h-64 w-full" value={campaign.body} onChange={(event) => setCampaign({ ...campaign, body: event.target.value })} placeholder={t.body} required/>
        {preview && <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm dark:border-sky-900 dark:bg-sky-950"><b>{preview.recipient_count} {t.estimate}</b><p className="mt-1">{t.defaultCredits}: {preview.estimated_integration_credits_default_domain} · {t.customCredits}: {preview.estimated_integration_credits_custom_domain}</p><div className="mt-2 flex flex-wrap gap-2">{Object.entries(preview.counts || {}).map(([code, count]) => <span key={code} className="status-badge">{isArabic ? marketByCode.get(code)?.name_ar : marketByCode.get(code)?.name_en}: {count}</span>)}</div></div>}
        <div className="flex flex-wrap gap-2"><button type="button" className="secondary-button" disabled={!campaign.market_codes.length || Boolean(state.busy)} onClick={previewCampaign}>{state.busy === "preview" ? <Loader2 className="animate-spin" size={16}/> : <ShieldCheck size={16}/>} {t.preview}</button><button className="primary-button" disabled={!preview || Boolean(state.busy)}>{state.busy === "create-campaign" ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>} {t.create}</button></div>
      </form>
    </section>

    <section className="content-card p-5"><h2 className="mb-4 text-xl font-black">{t.campaigns}</h2><div className="space-y-3">{state.campaigns.map((item) => <article key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between dark:border-slate-700"><div><b>{item.title}</b><p className="mt-1 text-sm text-slate-500">{item.subject}</p><p className="mt-2 text-xs">{t.status}: {campaignStatus(item.status, isArabic)} · {t.sent}: {item.sent_count}/{item.recipient_count} · {t.failed}: {item.failed_count}</p></div>{!["sent", "cancelled"].includes(item.status) && <button className="primary-button justify-center" disabled={Boolean(state.busy)} onClick={() => run(`send:${item.id}`, { action: "send_campaign_batch", campaign_id: item.id })}>{state.busy === `send:${item.id}` ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>} {t.sendBatch}</button>}</article>)}{!state.campaigns.length && <StatusPanel title={t.noCampaigns}/>}</div></section>
    {channelToDelete && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setChannelToDelete(null); }}><section className="content-card w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="delete-channel-title"><h2 id="delete-channel-title" className="text-xl font-black">{t.deleteTitle}</h2><p className="mt-2 text-sm text-slate-500">{channelToDelete.label}</p><p className="mt-3 text-sm">{t.deleteDescription}</p><div className="mt-5 flex justify-end gap-2"><button className="secondary-button" onClick={() => setChannelToDelete(null)}>{t.cancel}</button><button className="primary-button bg-red-600" disabled={Boolean(state.busy)} onClick={() => run(`delete:${channelToDelete.id}`, { action: "delete_channel", channel_id: channelToDelete.id }, () => { setChannelToDelete(null); setState((value) => ({ ...value, success: t.deleted })); })}>{state.busy === `delete:${channelToDelete.id}` ? <Loader2 className="animate-spin" size={16}/> : <Trash2 size={16}/>} {t.confirmDelete}</button></div></section></div>}
  </div>;
}
