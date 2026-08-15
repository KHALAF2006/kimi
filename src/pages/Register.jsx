import React, { useEffect, useState } from "react";
import { SessionLink } from "@/components/SessionLink";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { usePreferences } from "@/lib/preferences";
import DismissibleNotice from "@/components/DismissibleNotice";

const copy = {
  ar: {
    title: "إنشاء حساب", emailTitle: "تأكيد البريد", intro: "بيانات صحيحة لوصول أسرع وأكثر أماناً",
    important: "هام جداً", identityNotice: "اكتب اسمك كما يظهر في الهوية الوطنية أو الإقامة أو جواز السفر. يمكنك تعديله قبل مراجعة الطلب، وأي بيانات غير صحيحة قد تؤدي إلى رفض الطلب وفقدان الفترة المجانية.",
    directEmail: "استخدم بريدك الحقيقي والمباشر. عناوين إخفاء البريد من Apple غير مقبولة.", name: "الاسم الكامل", email: "البريد الإلكتروني الحقيقي",
    phone: "رقم الجوال بصيغة دولية", phoneHelp: "اكتب رقمك الحالي بدقة؛ سنستخدمه لإرسال روابط التدريب والتواصل معك عبر واتساب أو تيليجرام. الرقم الخاطئ قد يؤدي إلى رفض الطلب.", phoneAcknowledgement: "أؤكد أن رقم الجوال المكتوب هو رقمي الحالي والمسؤول عن استقبال روابط التدريب والتواصل.", country: "الدولة",
    market: "السوق المطلوب", platform: "منصة التداول", referral: "فتح رابط التسجيل في منصة التداول", password: "كلمة المرور", confirm: "تأكيد كلمة المرور",
    emailOtp: "رمز البريد", consent: "أوافق على استلام رسائل المستثمر الذكي الخدمية والتدريبية والتسويقية عبر البريد ووسائل التواصل المسجلة.",
    submit: "إنشاء الحساب", verifyEmail: "تأكيد البريد وإرسال الطلب", loading: "جارٍ المتابعة…",
    hasAccount: "لديك حساب؟", login: "تسجيل الدخول", short: "كلمة المرور يجب أن تكون 12 حرفاً على الأقل", mismatch: "كلمتا المرور غير متطابقتين",
    noPlatform: "لا توجد منصة تداول مفعلة لهذا السوق حالياً. تواصل مع الإدارة.", openReferralFirst: "افتح رابط منصة التداول أولاً قبل إنشاء الحساب.", success: "تم إرسال طلبك للمالك. احتفظ برقم الطلب الظاهر في صفحة الحالة.",
  },
  en: {
    title: "Create account", emailTitle: "Verify email", intro: "Accurate details for faster, safer access",
    important: "IMPORTANT", identityNotice: "Enter your name exactly as shown on your national ID, residence permit, or passport. You can correct it before review; incorrect details may cause rejection and loss of free access.",
    directEmail: "Use your real, direct email address. Apple Hide My Email relay addresses are not accepted.", name: "Full legal name", email: "Real email address",
    phone: "Mobile number in international format", phoneHelp: "Enter your current number accurately. We use it for training links and contact through WhatsApp or Telegram. An incorrect number may cause rejection.", phoneAcknowledgement: "I confirm that this is my current mobile number for training links and account contact.", country: "Country",
    market: "Requested market", platform: "Trading platform", referral: "Open trading-platform registration link", password: "Password", confirm: "Confirm password",
    emailOtp: "Email code", consent: "I agree to receive Smart Investor service, training, and promotional messages through my registered email and contact channels.",
    submit: "Create account", verifyEmail: "Verify email and submit request", loading: "Please wait…",
    hasAccount: "Already have an account?", login: "Sign in", short: "Password must be at least 12 characters", mismatch: "Passwords do not match",
    noPlatform: "No trading platform is currently active for this market. Contact support.", openReferralFirst: "Open the trading-platform referral link before creating your account.", success: "Your request was sent to the owner. Keep the reference shown on the status page.",
  },
};
const countries = { ar: [["SA", "السعودية"], ["AE", "الإمارات"], ["KW", "الكويت"], ["QA", "قطر"], ["BH", "البحرين"], ["OM", "عُمان"]], en: [["SA", "Saudi Arabia"], ["AE", "United Arab Emirates"], ["KW", "Kuwait"], ["QA", "Qatar"], ["BH", "Bahrain"], ["OM", "Oman"]] };
const markets = { ar: [["SA_MAIN", "السوق السعودية"], ["US_OPTIONS", "عقود الخيارات الأمريكية"], ["US_BENCHMARKS", "المؤشرات والصناديق الأمريكية"]], en: [["SA_MAIN", "Saudi Market"], ["US_OPTIONS", "U.S. Options"], ["US_BENCHMARKS", "U.S. Indices & ETFs"]] };

function apiError(error, fallback) { return error?.response?.data?.error || error?.message || fallback; }

export default function Register() {
  const { language } = usePreferences();
  const t = copy[language];
  const [stage, setStage] = useState("account");
  const [catalog, setCatalog] = useState({ platforms: [] });
  const [form, setForm] = useState({ full_name: "", email: "", phone_e164: "", country_code: "SA", market_code: "SA_MAIN", trading_platform_id: "", password: "", confirm: "", email_otp: "", consent: false, phone_accuracy_acknowledged: false, referral_link_opened: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  const available = catalog.platforms.filter((item) => item.supported_market_codes?.includes(form.market_code));
  const platform = available.find((item) => item.id === form.trading_platform_id);

  useEffect(() => {
    Promise.resolve(base44.functions.invoke("registrationCatalog", {})).then((response) => setCatalog(response?.data || { platforms: [] })).catch((issue) => {
      setCatalog({ platforms: [] });
      setError(apiError(issue, language === "ar" ? "تعذر تحميل منصات التداول. أعد المحاولة." : "Unable to load trading platforms. Please try again."));
    });
  }, []);
  useEffect(() => {
    if (!available.some((item) => item.id === form.trading_platform_id)) setForm((current) => ({ ...current, trading_platform_id: available[0]?.id || "", referral_link_opened: false }));
  }, [form.market_code, catalog.platforms]);

  async function submitAccount(event) {
    event.preventDefault(); setError("");
    if (form.password.length < 12) return setError(t.short);
    if (form.password !== form.confirm) return setError(t.mismatch);
    if (!form.consent) return setError(t.consent);
    if (!form.phone_accuracy_acknowledged) return setError(t.phoneAcknowledgement);
    if (!form.trading_platform_id) return setError(t.noPlatform);
    if (!form.referral_link_opened) return setError(t.openReferralFirst);
    setLoading(true);
    try { await base44.auth.register({ email: form.email, password: form.password }); setStage("email"); }
    catch (issue) { setError(apiError(issue, language === "ar" ? "تعذر إنشاء الحساب" : "Unable to create account")); }
    finally { setLoading(false); }
  }

  async function verifyEmail(event) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const result = await base44.auth.verifyOtp({ email: form.email, otpCode: form.email_otp });
      base44.auth.setToken(result.access_token);
      await base44.functions.invoke("authRegistration", { action: "complete_registration", ...form, preferred_language: language, marketing_consent: form.consent });
      window.location.href = "/application-status";
    } catch (issue) { setError(apiError(issue, language === "ar" ? "تعذر تأكيد البريد أو إرسال الطلب" : "Unable to verify email or submit the request")); }
    finally { setLoading(false); }
  }

  const title = stage === "email" ? t.emailTitle : t.title;
  return <AuthLayout icon={stage === "account" ? UserPlus : ShieldCheck} title={title} subtitle={t.intro} footer={<span>{t.hasAccount} <SessionLink to="/login" className="font-bold text-sky-600 dark:text-sky-400">{t.login}</SessionLink></span>}>
    <div className="mb-4 flex gap-2" aria-label="Registration progress">{["account", "email"].map((item) => <span key={item} className={`h-1.5 flex-1 rounded-full ${item === stage || (stage === "email" && item === "account") ? "bg-sky-400" : "bg-slate-200 dark:bg-slate-700"}`} />)}</div>
    {stage === "account" && <form onSubmit={submitAccount} className="space-y-3">
      <div className="rounded-xl border border-sky-400/30 bg-sky-400/10 p-3 text-sm leading-6"><strong className="mb-1 block font-black text-red-600 dark:text-red-400">{t.important}</strong><b className="flex items-start gap-2"><CheckCircle2 className="mt-1 shrink-0" size={16} />{t.identityNotice}</b><p className="mt-2 text-slate-600 dark:text-slate-300">{t.directEmail}</p></div>
      <Field label={t.name} name="full_name" value={form.full_name} onChange={change} autoComplete="name" />
      <Field label={t.email} name="email" type="email" value={form.email} onChange={change} autoComplete="email" />
      <Field label={t.phone} name="phone_e164" placeholder="+9665XXXXXXXX" value={form.phone_e164} onChange={change} autoComplete="tel" help={<><strong className="font-black text-red-600 dark:text-red-400">{t.important}</strong><span> — {t.phoneHelp}</span></>} />
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sky-400/30 bg-sky-400/5 p-3 text-sm leading-6"><input className="mt-1 h-4 w-4" type="checkbox" name="phone_accuracy_acknowledged" checked={form.phone_accuracy_acknowledged} onChange={change} required /><span>{t.phoneAcknowledgement}</span></label>
      <Select label={t.country} name="country_code" value={form.country_code} onChange={change} options={countries[language]} />
      <Select label={t.market} name="market_code" value={form.market_code} onChange={change} options={markets[language]} />
      <Select label={t.platform} name="trading_platform_id" value={form.trading_platform_id} onChange={change} options={available.map((item) => [item.id, language === "ar" ? item.name_ar : item.name_en])} />
      {platform?.referral_url && <a className="block rounded-xl border border-sky-400/30 bg-sky-400/5 p-3 text-sm font-bold text-sky-600 underline" href={platform.referral_url} target="_blank" rel="noreferrer" onClick={() => setForm((current) => ({ ...current, referral_link_opened: true }))}>{t.referral}</a>}
      {!available.length && <p className="text-sm text-sky-700 dark:text-sky-300">{t.noPlatform}</p>}
      <Field label={t.password} name="password" type="password" value={form.password} onChange={change} autoComplete="new-password" />
      <Field label={t.confirm} name="confirm" type="password" value={form.confirm} onChange={change} autoComplete="new-password" />
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm leading-6 dark:border-slate-700"><input className="mt-1 h-4 w-4" type="checkbox" name="consent" checked={form.consent} onChange={change} required /><span>{t.consent}</span></label>
      <Submit loading={loading} label={t.submit} loadingLabel={t.loading} disabled={!available.length} />
    </form>}
    {stage === "email" && <form onSubmit={verifyEmail} className="space-y-3"><Field label={t.emailOtp} name="email_otp" inputMode="numeric" maxLength={8} value={form.email_otp} onChange={change} /><Submit loading={loading} label={t.verifyEmail} loadingLabel={t.loading} /></form>}
    <DismissibleNotice message={error} tone="error" onDismiss={() => setError("")} />
  </AuthLayout>;
}

function Field({ label, help = null, ...props }) { return <div><Label htmlFor={props.name}>{label}</Label><Input id={props.name} required className="mt-2 h-12 border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" {...props} />{help && <small className="mt-1 block text-slate-500">{help}</small>}</div>; }
function Select({ label, options, ...props }) { return <div><Label htmlFor={props.name}>{label}</Label><select id={props.name} required className="mt-2 h-12 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" {...props}>{options.map(([value, labelText]) => <option key={value} value={value}>{labelText}</option>)}</select></div>; }
function Submit({ loading, label, loadingLabel, disabled = false }) { return <Button className="h-12 w-full bg-sky-400 font-bold text-slate-950 hover:bg-sky-300" disabled={loading || disabled}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}{loading ? loadingLabel : label}</Button>; }
