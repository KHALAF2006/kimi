import React, { useEffect, useMemo, useState } from "react";
import { Bell, EyeOff, Inbox, X } from "lucide-react";
import { invokeAppFunction, isReferencePreview } from "@/services/marketService";
import { usePreferences } from "@/lib/preferences";
import { SessionLink } from "@/components/SessionLink";

export default function NotificationCenter() {
  const { isArabic } = usePreferences();
  const [state, setState] = useState({ open: false, messages: [], preferences: { feed_enabled: true }, unread: 0 });
  async function load() { if (isReferencePreview()) return; try { const data = await invokeAppFunction("notificationCenter", { action: "list" }); setState((current) => ({ ...current, messages: data.messages || [], preferences: data.preferences || { feed_enabled: true }, unread: data.unread_count || 0 })); } catch { /* navigation remains usable */ } }
  useEffect(() => { load(); const timer = window.setInterval(load, 60_000); return () => window.clearInterval(timer); }, []);
  const feed = useMemo(() => state.preferences.feed_enabled ? state.messages.filter((item) => item.feed_eligible && !item.hidden_at && !item.read_at).slice(0, 1) : [], [state.messages, state.preferences.feed_enabled]);
  async function action(kind, item) { await invokeAppFunction("notificationCenter", { action: kind, message_id: item.id }); await load(); }
  async function toggleFeed() { const enabled = !state.preferences.feed_enabled; await invokeAppFunction("notificationCenter", { action: "preferences", feed_enabled: enabled }); setState((current) => ({ ...current, preferences: { ...current.preferences, feed_enabled: enabled } })); }
  async function openMessage(item) { await action("mark_read", item); setState((current) => ({ ...current, open: false })); }
  return <>
    <button className="icon-button relative" onClick={() => setState((current) => ({ ...current, open: !current.open }))} aria-label={isArabic ? "صندوق الرسائل" : "Message inbox"}><Bell size={17} />{state.unread > 0 && <span className="absolute -end-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-[10px] text-white">{state.unread > 9 ? "9+" : state.unread}</span>}</button>
    {state.open && <div className="fixed end-3 top-16 z-[100] w-[min(92vw,390px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-[#0d192a]">
      <div className="flex items-center justify-between"><b className="flex items-center gap-2"><Inbox size={17} />{isArabic ? "صندوق الرسائل" : "Messages"}</b><button className="icon-button" onClick={() => setState((current) => ({ ...current, open: false }))}><X size={15} /></button></div>
      <button type="button" className="mt-2 flex items-center gap-2 text-xs text-slate-500" onClick={toggleFeed}><EyeOff size={14} />{state.preferences.feed_enabled ? (isArabic ? "إخفاء التنبيهات العائمة" : "Hide feed notices") : (isArabic ? "إظهار التنبيهات العائمة" : "Show feed notices")}</button>
      <div className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto">{state.messages.filter((item) => !item.hidden_at).map((item) => <article key={item.id} className={`rounded-xl border p-3 text-sm ${item.priority === "critical" ? "border-red-400/50 bg-red-500/5" : "border-slate-200 dark:border-slate-700"}`}><b>{isArabic ? item.title_ar : item.title_en}</b><p className="mt-1 leading-6 text-slate-500">{isArabic ? item.body_ar : item.body_en}</p><div className="mt-2 flex flex-wrap gap-2">{item.action_path && <SessionLink className="text-xs font-black text-sky-600" to={item.action_path} onClick={() => openMessage(item)}>{isArabic ? "فتح الطلب" : "Open request"}</SessionLink>}<button className="text-xs font-bold text-sky-600" onClick={() => action("mark_read", item)}>{isArabic ? "تمت القراءة" : "Mark read"}</button>{item.priority !== "critical" && <button className="text-xs text-slate-400" onClick={() => action("hide", item)}>{isArabic ? "إخفاء" : "Hide"}</button>}</div></article>)}{!state.messages.filter((item) => !item.hidden_at).length && <p className="py-8 text-center text-sm text-slate-400">{isArabic ? "لا توجد رسائل جديدة" : "No new messages"}</p>}</div>
    </div>}
    {feed.map((item) => <div key={item.id} className="fixed bottom-4 end-4 z-[90] max-w-sm rounded-2xl border border-sky-400/40 bg-white p-4 shadow-2xl dark:bg-[#0d192a]"><button className="absolute end-2 top-2 text-slate-400" onClick={() => action("hide", item)} aria-label={isArabic ? "إخفاء التنبيه" : "Hide notification"}><X size={15} /></button><b className="pe-6 text-sm">{isArabic ? item.title_ar : item.title_en}</b><p className="mt-1 text-sm text-slate-500">{isArabic ? item.body_ar : item.body_en}</p>{item.action_path && <SessionLink className="mt-3 inline-flex text-xs font-black text-sky-600" to={item.action_path} onClick={() => openMessage(item)}>{isArabic ? "فتح الطلب" : "Open request"}</SessionLink>}</div>)}
  </>;
}
