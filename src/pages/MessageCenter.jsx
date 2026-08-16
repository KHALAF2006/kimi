import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCheck, CircleDot, Inbox, Loader2, MessageCircleMore, Plus, RefreshCcw, Search, Send, UserRound, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import DismissibleNotice from "@/components/DismissibleNotice";
import { invokeAppFunction, isReferencePreview } from "@/services/marketService";
import { usePreferences } from "@/lib/preferences";
import { useAuthorization } from "@/lib/AuthorizationContext";

const COPY = {
  ar: {
    title: "مركز الرسائل", description: "محادثات واضحة ومحفوظة بينك وبين إدارة المستثمر الذكي.", staffDescription: "صندوق موحد لمحادثات العملاء، مع متابعة مستقلة لكل موظف مخوّل.",
    newConversation: "محادثة جديدة", search: "ابحث في المحادثات", all: "الكل", active: "المفتوحة", resolved: "المكتملة", noConversations: "لا توجد محادثات مطابقة", selectConversation: "اختر محادثة لعرض الرسائل", customer: "العميل", subject: "عنوان المحادثة", message: "اكتب رسالتك", category: "التصنيف", priority: "الأهمية", send: "إرسال", create: "بدء المحادثة", cancel: "إلغاء", refresh: "تحديث", resolvedAction: "إغلاق كمكتملة", reopen: "إعادة فتح", reason: "سبب تغيير الحالة", unread: "غير مقروءة", statusSaved: "تم تحديث حالة المحادثة وتأكيدها.", sent: "تم إرسال الرسالة وحفظها في المحادثة.",
    categories: { general: "استفسار عام", account: "الحساب", subscription: "الاشتراك", market_access: "تفعيل الأسواق", technical: "مشكلة تقنية" }, priorities: { normal: "عادية", important: "مهمة", urgent: "عاجلة" }, statuses: { open: "مفتوحة", pending_customer: "بانتظار رد العميل", pending_staff: "بانتظار رد الإدارة", resolved: "مكتملة", closed: "مغلقة" },
  },
  en: {
    title: "Message Center", description: "Clear, saved conversations between you and Smart Investor support.", staffDescription: "A shared customer inbox with independent read tracking for every authorized staff member.",
    newConversation: "New conversation", search: "Search conversations", all: "All", active: "Open", resolved: "Completed", noConversations: "No matching conversations", selectConversation: "Select a conversation to view its messages", customer: "Customer", subject: "Conversation subject", message: "Write your message", category: "Category", priority: "Priority", send: "Send", create: "Start conversation", cancel: "Cancel", refresh: "Refresh", resolvedAction: "Mark completed", reopen: "Reopen", reason: "Reason for status change", unread: "Unread", statusSaved: "The conversation status was updated and confirmed.", sent: "The message was sent and saved in the conversation.",
    categories: { general: "General question", account: "Account", subscription: "Subscription", market_access: "Market access", technical: "Technical issue" }, priorities: { normal: "Normal", important: "Important", urgent: "Urgent" }, statuses: { open: "Open", pending_customer: "Awaiting customer", pending_staff: "Awaiting staff", resolved: "Completed", closed: "Closed" },
  },
};

const ERROR_COPY = {
  ar: { MESSAGE_RATE_LIMITED: "تم الإرسال بسرعة متكررة. انتظر لحظة ثم أعد المحاولة.", CONVERSATION_CLOSED: "هذه المحادثة مغلقة. اطلب من الإدارة إعادة فتحها.", REVISION_CONFLICT: "تغيرت المحادثة في جلسة أخرى. حدّث الصفحة ثم أعد المحاولة.", CONVERSATION_NOT_FOUND: "المحادثة غير موجودة أو لا تملك صلاحية عرضها.", PERMISSION_DENIED: "لا تملك صلاحية إدارة محادثات العملاء." },
  en: { MESSAGE_RATE_LIMITED: "Messages were sent too quickly. Wait a moment and try again.", CONVERSATION_CLOSED: "This conversation is closed. Ask support to reopen it.", REVISION_CONFLICT: "The conversation changed in another session. Refresh and try again.", CONVERSATION_NOT_FOUND: "The conversation does not exist or you cannot access it.", PERMISSION_DENIED: "You do not have permission to manage customer conversations." },
};

function errorText(error, language) {
  const code = String(error?.response?.data?.code || error?.code || "");
  return ERROR_COPY[language][code] || (language === "ar" ? "تعذر تنفيذ الطلب الآن. حاول مرة أخرى." : "The request could not be completed. Please try again.");
}

function dateTime(value, language) {
  return value ? new Date(value).toLocaleString(language === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

export default function MessageCenter() {
  const { language, isArabic } = usePreferences();
  const { role, can } = useAuthorization();
  const staff = role === "owner" || can("messages.manage");
  const t = COPY[language];
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, conversations: [], customers: [], error: "", notice: "", busy: false });
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("active");
  const [composer, setComposer] = useState("");
  const [newForm, setNewForm] = useState({ open: false, customer_id: params.get("customer") || "", subject: "", category: "general", priority: "normal", message: "" });
  const [statusForm, setStatusForm] = useState({ open: false, status: "resolved", reason: "" });
  const logRef = useRef(null);

  const loadList = useCallback(async ({ quiet = false } = {}) => {
    if (isReferencePreview()) return setState((current) => ({ ...current, loading: false }));
    try {
      if (!quiet) setState((current) => ({ ...current, loading: true, error: "" }));
      const [conversationData, customerData] = await Promise.all([
        invokeAppFunction("messageCenter", { action: "list_conversations", limit: 200 }),
        staff ? invokeAppFunction("messageCenter", { action: "list_customers" }) : Promise.resolve({ customers: [] }),
      ]);
      setState((current) => ({ ...current, loading: false, conversations: conversationData.conversations || [], customers: customerData.customers || [], error: "" }));
      const requested = params.get("conversation");
      if (requested && !selected) {
        const match = (conversationData.conversations || []).find((item) => item.id === requested);
        if (match) setSelected(match);
      }
    } catch (error) {
      if (!quiet) setState((current) => ({ ...current, loading: false, error: errorText(error, language) }));
    }
  }, [language, params, selected, staff]);

  const loadConversation = useCallback(async (conversation, { quiet = false } = {}) => {
    if (!conversation || isReferencePreview()) return;
    try {
      if (!quiet) setState((current) => ({ ...current, busy: true, error: "" }));
      const data = await invokeAppFunction("messageCenter", { action: "get_conversation", conversation_id: conversation.id });
      setSelected(data.conversation);
      setMessages(data.messages || []);
      setState((current) => ({ ...current, busy: false, conversations: current.conversations.map((item) => item.id === data.conversation.id ? data.conversation : item) }));
      window.setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: quiet ? "auto" : "smooth" }), 0);
    } catch (error) { if (!quiet) setState((current) => ({ ...current, busy: false, error: errorText(error, language) })); }
  }, [language]);

  useEffect(() => { loadList(); }, []);
  useEffect(() => { if (params.get("customer")) setNewForm((current) => ({ ...current, open: true, customer_id: params.get("customer") || "" })); }, []);
  useEffect(() => { if (selected?.id) loadConversation(selected); }, [selected?.id]);
  useEffect(() => {
    const refresh = () => { loadList({ quiet: true }); if (selected?.id) loadConversation(selected, { quiet: true }); };
    const timer = window.setInterval(refresh, 45_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [loadConversation, loadList, selected?.id]);

  const filtered = useMemo(() => state.conversations.filter((item) => {
    const active = ["open", "pending_customer", "pending_staff"].includes(item.status);
    const matchesFilter = filter === "all" || (filter === "active" ? active : ["resolved", "closed"].includes(item.status));
    return matchesFilter && `${item.subject} ${item.customer_name} ${item.customer_number} ${item.last_message_preview}`.toLocaleLowerCase(language).includes(query.trim().toLocaleLowerCase(language));
  }), [filter, language, query, state.conversations]);

  async function createConversation(event) {
    event.preventDefault();
    try {
      setState((current) => ({ ...current, busy: true, error: "" }));
      const data = await invokeAppFunction("messageCenter", { action: "create_conversation", ...newForm, client_message_id: crypto.randomUUID() });
      setNewForm({ open: false, customer_id: "", subject: "", category: "general", priority: "normal", message: "" });
      setParams({ conversation: data.conversation.id });
      setSelected(data.conversation);
      setMessages([data.message]);
      await loadList({ quiet: true });
      setState((current) => ({ ...current, busy: false, notice: t.sent }));
    } catch (error) { setState((current) => ({ ...current, busy: false, error: errorText(error, language) })); }
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!selected || !composer.trim()) return;
    try {
      setState((current) => ({ ...current, busy: true, error: "" }));
      const data = await invokeAppFunction("messageCenter", { action: "send_message", conversation_id: selected.id, message: composer, client_message_id: crypto.randomUUID() });
      setComposer("");
      setSelected(data.conversation);
      await loadConversation(data.conversation, { quiet: true });
      await loadList({ quiet: true });
      setState((current) => ({ ...current, busy: false, notice: t.sent }));
    } catch (error) { setState((current) => ({ ...current, busy: false, error: errorText(error, language) })); }
  }

  async function changeStatus(event) {
    event.preventDefault();
    try {
      setState((current) => ({ ...current, busy: true, error: "" }));
      const data = await invokeAppFunction("messageCenter", { action: "set_status", conversation_id: selected.id, status: statusForm.status, reason: statusForm.reason, expected_revision: selected.revision });
      setStatusForm({ open: false, status: "resolved", reason: "" });
      setSelected(data.conversation);
      await loadList({ quiet: true });
      setState((current) => ({ ...current, busy: false, notice: t.statusSaved }));
    } catch (error) { setState((current) => ({ ...current, busy: false, error: errorText(error, language) })); }
  }

  return <>
    <PageHeader title={t.title} description={staff ? t.staffDescription : t.description} />
    <main className="mx-auto max-w-[1800px] px-4 pb-10">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-950/5 dark:border-slate-800 dark:bg-[#0d192a]">
        <div className="grid min-h-[680px] lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 p-4 lg:border-b-0 lg:border-e dark:border-slate-800">
            <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-black"><Inbox size={18}/>{t.title}</h2><button type="button" className="primary-button" onClick={() => setNewForm((current) => ({ ...current, open: true }))}><Plus size={15}/>{t.newConversation}</button></div>
            <label className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-700"><Search size={15}/><input className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search}/></label>
            <div className="mt-3 grid grid-cols-3 gap-2">{["active", "resolved", "all"].map((key) => <button type="button" key={key} onClick={() => setFilter(key)} className={`rounded-xl px-2 py-2 text-xs font-bold ${filter === key ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-900"}`}>{t[key]}</button>)}</div>
            <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto">{state.loading ? <StatusPanel loading/> : filtered.map((item) => <button type="button" key={item.id} onClick={() => { setSelected(item); setParams({ conversation: item.id }); }} className={`w-full rounded-2xl border p-3 text-start transition ${selected?.id === item.id ? "border-sky-400 bg-sky-400/10" : "border-slate-200 hover:border-sky-300 dark:border-slate-700"}`}><div className="flex items-start justify-between gap-2"><b className="line-clamp-1 text-sm">{item.subject}</b>{item.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" aria-label={t.unread}/>}</div>{staff && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><UserRound size={12}/>{item.customer_name} · {item.customer_number}</p>}<p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.last_message_preview}</p><div className="mt-2 flex items-center justify-between text-[11px]"><span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">{t.statuses[item.status]}</span><time className="text-slate-400">{dateTime(item.last_message_at, language)}</time></div></button>)}{!state.loading && !filtered.length && <p className="py-12 text-center text-sm text-slate-400">{t.noConversations}</p>}</div>
          </aside>
          <section className="flex min-h-[680px] min-w-0 flex-col">{!selected ? <div className="grid flex-1 place-items-center p-8 text-center text-slate-400"><div><MessageCircleMore className="mx-auto mb-4" size={44}/><p>{t.selectConversation}</p></div></div> : <><header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800"><div><h2 className="text-xl font-black">{selected.subject}</h2><p className="mt-1 text-sm text-slate-500">{staff ? `${selected.customer_name} · ${selected.customer_number} · ` : ""}{t.categories[selected.category]} · {t.statuses[selected.status]}</p></div><div className="flex gap-2"><button type="button" className="secondary-button" onClick={() => { loadList(); loadConversation(selected); }}><RefreshCcw size={14}/>{t.refresh}</button>{staff && <button type="button" className="secondary-button" onClick={() => setStatusForm({ open: true, status: ["resolved", "closed"].includes(selected.status) ? "open" : "resolved", reason: "" })}><CheckCheck size={15}/>{["resolved", "closed"].includes(selected.status) ? t.reopen : t.resolvedAction}</button>}</div></header><div ref={logRef} role="log" aria-live="polite" aria-label={isArabic ? "سجل المحادثة" : "Conversation history"} className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-5 dark:bg-slate-950/30">{messages.map((item) => { const mine = staff ? item.sender_role === "staff" : item.sender_role === "customer"; return <article key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[min(80%,720px)] rounded-2xl px-4 py-3 ${mine ? "bg-sky-500 text-white" : "border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}><div className="flex items-center justify-between gap-5 text-xs"><b>{item.sender_name}</b><time className={mine ? "text-sky-100" : "text-slate-400"}>{dateTime(item.created_date, language)}</time></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{item.body}</p></div></article>; })}</div>{selected.status !== "closed" && <form onSubmit={sendMessage} className="border-t border-slate-200 p-4 dark:border-slate-800"><div className="flex items-end gap-2"><label className="min-w-0 flex-1"><span className="sr-only">{t.message}</span><textarea className="form-input min-h-24 w-full resize-y" value={composer} maxLength={4000} onChange={(event) => setComposer(event.target.value)} placeholder={t.message}/></label><button type="submit" className="primary-button min-h-12" disabled={state.busy || !composer.trim()}>{state.busy ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>}<span>{t.send}</span></button></div></form>}</>}</section>
        </div>
      </section>
    </main>
    {newForm.open && <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="new-conversation-title"><form onSubmit={createConversation} className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0d192a]"><div className="flex items-center justify-between"><h2 id="new-conversation-title" className="text-lg font-black">{t.newConversation}</h2><button type="button" className="icon-button" onClick={() => setNewForm((current) => ({ ...current, open: false }))} aria-label={t.cancel}><X size={16}/></button></div><div className="mt-5 grid gap-4">{staff && <label className="grid gap-2 text-sm font-bold"><span>{t.customer}</span><select required className="form-input" value={newForm.customer_id} onChange={(event) => setNewForm((current) => ({ ...current, customer_id: event.target.value }))}><option value="">—</option>{state.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name} · {customer.customer_number}</option>)}</select></label>}<label className="grid gap-2 text-sm font-bold"><span>{t.subject}</span><input required minLength={3} maxLength={160} className="form-input" value={newForm.subject} onChange={(event) => setNewForm((current) => ({ ...current, subject: event.target.value }))}/></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold"><span>{t.category}</span><select className="form-input" value={newForm.category} onChange={(event) => setNewForm((current) => ({ ...current, category: event.target.value }))}>{Object.entries(t.categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{staff && <label className="grid gap-2 text-sm font-bold"><span>{t.priority}</span><select className="form-input" value={newForm.priority} onChange={(event) => setNewForm((current) => ({ ...current, priority: event.target.value }))}>{Object.entries(t.priorities).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}</div><label className="grid gap-2 text-sm font-bold"><span>{t.message}</span><textarea required maxLength={4000} className="form-input min-h-36" value={newForm.message} onChange={(event) => setNewForm((current) => ({ ...current, message: event.target.value }))}/></label><div className="flex justify-end gap-2"><button type="button" className="secondary-button" onClick={() => setNewForm((current) => ({ ...current, open: false }))}>{t.cancel}</button><button type="submit" className="primary-button" disabled={state.busy || (staff && !newForm.customer_id)}>{state.busy ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>} {t.create}</button></div></div></form></div>}
    {statusForm.open && <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/70 p-4" role="dialog" aria-modal="true"><form onSubmit={changeStatus} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0d192a]"><h2 className="text-lg font-black">{statusForm.status === "resolved" ? t.resolvedAction : t.reopen}</h2><label className="mt-5 grid gap-2 text-sm font-bold"><span>{t.reason}</span><textarea required minLength={3} maxLength={500} autoFocus className="form-input min-h-28" value={statusForm.reason} onChange={(event) => setStatusForm((current) => ({ ...current, reason: event.target.value }))}/></label><div className="mt-4 flex justify-end gap-2"><button type="button" className="secondary-button" onClick={() => setStatusForm((current) => ({ ...current, open: false }))}>{t.cancel}</button><button type="submit" className="primary-button" disabled={state.busy || statusForm.reason.trim().length < 3}>{state.busy ? <Loader2 className="animate-spin" size={16}/> : <CircleDot size={16}/>} {t.send}</button></div></form></div>}
    <DismissibleNotice message={state.error} tone="error" onDismiss={() => setState((current) => ({ ...current, error: "" }))}/>
    <DismissibleNotice message={state.notice} onDismiss={() => setState((current) => ({ ...current, notice: "" }))}/>
  </>;
}
