import React, { useEffect, useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import { base44 } from "@/api/base44Client";
import { SessionLink } from "@/components/SessionLink";
import { CheckCircle2, Clock3, ExternalLink, Pencil, ShieldCheck, XCircle } from "lucide-react";
import DismissibleNotice from "@/components/DismissibleNotice";
import { usePreferences } from "@/lib/preferences";

const statusIcon = { approved: CheckCircle2, rejected: XCircle, pending: Clock3 };
export default function ApplicationStatus() {
  const { language, isArabic } = usePreferences();
  const [data, setData] = useState(null); const [name, setName] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function load() { try { const response = await base44.functions.invoke("authRegistration", { action: "status" }); setData(response.data); setName(response.data?.profile?.full_name || ""); } catch (issue) { setError(issue?.response?.data?.error || issue.message); } }
  useEffect(() => { load(); }, []);
  async function saveName() { setSaving(true); setError(""); try { await base44.functions.invoke("authRegistration", { action: "update_pending_name", full_name: name }); await load(); } catch (issue) { setError(issue?.response?.data?.error || issue.message); } finally { setSaving(false); } }
  const profile = data?.profile; const pending = profile?.account_status === "pending_owner_approval";
  return <AuthLayout icon={ShieldCheck} title={isArabic ? "حالة طلب الوصول" : "Access application status"} subtitle={isArabic ? "متابعة واضحة من التسجيل حتى تفعيل السوق" : "Clear progress from registration to market activation"}>
    {!data ? <p>{isArabic ? "جارٍ تحميل حالة الطلب…" : "Loading application status…"}</p> : !data.registered ? <SessionLink className="primary-button" to="/register">{isArabic ? "بدء التسجيل" : "Start registration"}</SessionLink> : <div className="space-y-4">
      <div className="rounded-xl bg-sky-400/10 p-4"><b>{profile.full_name}</b><p className="mt-1 text-sm text-slate-500">{profile.customer_number}</p></div>
      <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><b>{isArabic ? "حالة الحساب: " : "Account status: "}</b>{profile.account_status}{profile.temporary_block_reason && <p className="mt-2 text-red-500">{isArabic ? "الحساب موقوف مؤقتاً. راجع الإدارة لاستعادة الوصول." : "The account is temporarily blocked. Contact the administration to restore access."}</p>}</div>
      {pending && <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><label className="text-sm font-bold">{isArabic ? "تصحيح الاسم قبل المراجعة" : "Correct your name before review"}</label><div className="mt-2 flex gap-2"><input className="form-input flex-1" value={name} onChange={(event) => setName(event.target.value)} /><button className="secondary-button" type="button" disabled={saving || name.trim() === profile.full_name} onClick={saveName}><Pencil size={15} />{isArabic ? "حفظ" : "Save"}</button></div></div>}
      {(data.applications || []).map((application) => { const Icon = statusIcon[application.status] || Clock3; const platform = data.platforms?.[application.trading_platform_id]; return <div key={application.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex items-center gap-2"><Icon size={18} /><b>{application.unique_reference}</b></div><p className="mt-2 text-sm">{platform?.[isArabic ? "name_ar" : "name_en"] || application[isArabic ? "platform_name_ar_snapshot" : "platform_name_en_snapshot"] || "—"} · {application.market_code} · {application.status}</p>{platform?.referral_url && <a className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-sky-600 underline" href={platform.referral_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />{isArabic ? "فتح رابط منصة التداول" : "Open trading-platform link"}</a>}{application.decision_reason && <p className="mt-2 text-sm text-slate-500">{application.decision_reason}</p>}</div>; })}
      <p className="text-sm leading-6 text-slate-500">{isArabic ? "يفتح كل تسجيل في منصة تداول سوقاً واحداً فقط بعد موافقة المالك. ستصلك رسالة فور قبول الطلب أو تحديثه." : "Each trading-platform registration unlocks one market only after owner approval. You will receive a message when the request is updated."}</p>
      <SessionLink className="secondary-button w-full justify-center" to="/login">{isArabic ? "الانتقال إلى تسجيل الدخول" : "Go to sign in"}</SessionLink>
    </div>}
    <DismissibleNotice message={error} tone="error" onDismiss={() => setError("")} />
  </AuthLayout>;
}
