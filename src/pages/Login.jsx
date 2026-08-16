import React, { useEffect, useState } from "react";
import { SessionLink } from "@/components/SessionLink";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock3, LogIn, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { usePreferences } from "@/lib/preferences";
import { useAuth } from "@/lib/AuthContext";
import { localizedAccessError } from "@/lib/accessCopy";

const copy = {
  ar: { title: "تسجيل الدخول", intro: "الوصول الآمن إلى حسابك", otpIntro: "أدخل الرمز المرسل إلى بريدك", verifiedIntro: "أكمل التحقق الثنائي لحسابك", verified: "حسابك مفعل وجاهز للمتابعة", sendTo: "سيُرسل رمز الدخول إلى", pendingTitle: "طلبك بانتظار مراجعة المالك", pendingBody: "لن يُرسل رمز الدخول ولن يفتح أي سوق قبل الموافقة. يمكنك متابعة حالة طلبك وتصحيح الاسم أو الجوال.", applicationStatus: "متابعة حالة الطلب", email: "البريد الإلكتروني", password: "كلمة المرور", remember: "تذكرني على هذا الجهاز", forgot: "نسيت كلمة المرور؟", otp: "رمز التحقق", next: "متابعة", sendCode: "إرسال رمز التحقق", confirm: "تأكيد الدخول", loading: "جارٍ المتابعة…", noAccount: "ليس لديك حساب؟", register: "إنشاء حساب", error: "تعذر تسجيل الدخول" },
  en: { title: "Sign in", intro: "Secure access to your account", otpIntro: "Enter the code sent to your email", verifiedIntro: "Complete two-factor verification for your account", verified: "Your account is active and ready", sendTo: "The sign-in code will be sent to", pendingTitle: "Your application is awaiting owner review", pendingBody: "No sign-in code or market access will be issued before approval. You can review the application and correct your name or mobile number.", applicationStatus: "View application status", email: "Email address", password: "Password", remember: "Remember me on this device", forgot: "Forgot your password?", otp: "Verification code", next: "Continue", sendCode: "Send verification code", confirm: "Confirm sign in", loading: "Please wait…", noAccount: "Don't have an account?", register: "Create account", error: "Unable to sign in" },
};

function deviceId() {
  const key = "smart_investor_device_id";
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}

export default function Login() {
  const { language } = usePreferences();
  const { user, isAuthenticated } = useAuth();
  const hasAppToken = typeof window !== "undefined" && Boolean(window.localStorage.getItem("base44_access_token"));
  const appAuthenticated = isAuthenticated && hasAppToken;
  const t = copy[language];
  const [form,setForm]=useState({email:"",password:"",otp:"",remember_me:false});
  const [challenge,setChallenge]=useState(null),[error,setError]=useState(""),[loading,setLoading]=useState(false),[registration,setRegistration]=useState(null),[checkingStatus,setCheckingStatus]=useState(false);
  useEffect(() => {
    if (user?.email) setForm((current) => current.email ? current : { ...current, email: user.email });
  }, [user?.email]);
  useEffect(() => {
    if (!appAuthenticated) { setRegistration(null); return; }
    let active = true;
    setCheckingStatus(true);
    Promise.resolve(base44.functions.invoke("authRegistration", { action: "status" }))
      .then((response) => { if (active) setRegistration(response.data || null); })
      .catch((issue) => { if (active) setError(localizedAccessError(issue, language, t.error)); })
      .finally(() => { if (active) setCheckingStatus(false); });
    return () => { active = false; };
  }, [appAuthenticated, language]);
  const awaitingApproval = registration?.profile?.account_status === "pending_owner_approval";
  const change=e=>setForm({...form,[e.target.name]:e.target.type==='checkbox'?e.target.checked:e.target.value});
  const submit=async e=>{e.preventDefault();setError("");setLoading(true);try{
    if(!challenge){if(!appAuthenticated){const login=await base44.auth.loginViaEmailPassword(form.email,form.password);if(login&&typeof login==='object'&&'access_token'in login&&login.access_token)base44.auth.setToken(login.access_token,true);}if(awaitingApproval){window.location.href='/application-status';return;}const r=await base44.functions.invoke('authLogin',{action:'start'});setChallenge(r.data.challenge_id);}
    else{const r=await base44.functions.invoke('authLogin',{action:'verify',challenge_id:challenge,otp:form.otp,remember_me:form.remember_me,device_id:deviceId()});localStorage.setItem('smart_investor_session_id',r.data.session_id);localStorage.setItem('smart_investor_session_expires_at',r.data.expires_at);window.dispatchEvent(new Event('smart_investor-auth-changed'));window.location.href='/dashboard';}
  }catch(err){const code=err.response?.data?.code;if(code==="ACCOUNT_NOT_ACTIVE"||code==="PROFILE_SETUP_REQUIRED"){window.location.href=code==="ACCOUNT_NOT_ACTIVE"?"/application-status":"/register";return;}setError(localizedAccessError(err, language, t.error));}finally{setLoading(false)}};
  return <AuthLayout icon={LogIn} title={t.title} subtitle={challenge?t.otpIntro:appAuthenticated?t.verifiedIntro:t.intro} footer={<span>{t.noAccount} <SessionLink to="/register" className="font-bold text-sky-600 dark:text-sky-400">{t.register}</SessionLink></span>}>
    {error&&<div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}
    {checkingStatus ? <div className="grid min-h-36 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-sky-500" /></div> : awaitingApproval ? <div className="rounded-xl border border-sky-300 bg-sky-50 p-5 text-sm text-sky-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100"><Clock3 className="mb-3 h-6 w-6"/><p className="font-black">{t.pendingTitle}</p><p className="mt-2 leading-6">{t.pendingBody}</p><SessionLink className="secondary-button mt-4 w-full justify-center" to="/application-status">{t.applicationStatus}</SessionLink></div> : <form onSubmit={submit} className="space-y-4">{!challenge?(appAuthenticated?<div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"><p className="font-bold text-slate-950 dark:text-white">{t.verified}</p><p className="mt-1">{t.sendTo} {user?.email || t.email}.</p><label className="mt-4 flex items-center gap-2"><input name="remember_me" type="checkbox" checked={form.remember_me} onChange={change}/>{t.remember}</label></div>:<><Field label={t.email} name="email" type="email" value={form.email} onChange={change}/><Field label={t.password} name="password" type="password" value={form.password} onChange={change}/><label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><input name="remember_me" type="checkbox" checked={form.remember_me} onChange={change}/>{t.remember}</label><SessionLink to="/forgot-password" className="block text-sm font-bold text-sky-600 dark:text-sky-400">{t.forgot}</SessionLink></>):<Field label={t.otp} name="otp" inputMode="numeric" maxLength={6} value={form.otp} onChange={change}/>}<Button className="h-12 w-full bg-sky-400 font-bold text-slate-950 hover:bg-sky-300" disabled={loading}>{loading&&<Loader2 className="h-4 w-4 animate-spin"/>}{loading?t.loading:challenge?t.confirm:appAuthenticated?t.sendCode:t.next}</Button></form>}
  </AuthLayout>;
}
function Field({label,...props}){return <div className="space-y-2"><Label htmlFor={props.name}>{label}</Label><Input id={props.name} required className="h-12 border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" {...props}/></div>}
