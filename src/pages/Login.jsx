import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { usePreferences } from "@/lib/preferences";

const copy = {
  ar: { title: "تسجيل الدخول", intro: "الوصول الآمن إلى حسابك", otpIntro: "أدخل الرمز المرسل إلى بريدك", email: "البريد الإلكتروني", password: "كلمة المرور", remember: "تذكرني على هذا الجهاز", forgot: "نسيت كلمة المرور؟", otp: "رمز التحقق", next: "متابعة", confirm: "تأكيد الدخول", loading: "جارٍ المتابعة…", noAccount: "ليس لديك حساب؟", register: "إنشاء حساب", error: "تعذر تسجيل الدخول" },
  en: { title: "Sign in", intro: "Secure access to your account", otpIntro: "Enter the code sent to your email", email: "Email address", password: "Password", remember: "Remember me on this device", forgot: "Forgot your password?", otp: "Verification code", next: "Continue", confirm: "Confirm sign in", loading: "Please wait…", noAccount: "Don't have an account?", register: "Create account", error: "Unable to sign in" },
};

export default function Login() {
  const { language } = usePreferences();
  const t = copy[language];
  const [form,setForm]=useState({email:"",password:"",otp:"",remember_me:false});
  const [challenge,setChallenge]=useState(null),[error,setError]=useState(""),[loading,setLoading]=useState(false);
  const change=e=>setForm({...form,[e.target.name]:e.target.type==='checkbox'?e.target.checked:e.target.value});
  const submit=async e=>{e.preventDefault();setError("");setLoading(true);try{
    if(!challenge){await base44.auth.loginViaEmailPassword(form.email,form.password);const r=await base44.functions.invoke('authLogin',{action:'start'});setChallenge(r.data.challenge_id);}
    else{const r=await base44.functions.invoke('authLogin',{action:'verify',challenge_id:challenge,otp:form.otp,remember_me:form.remember_me,device_id:navigator.userAgent});localStorage.setItem('kmy_session_id',r.data.session_id);window.location.href='/dashboard';}
  }catch(err){setError(err.response?.data?.error||err.message||t.error);}finally{setLoading(false)}};
  return <AuthLayout icon={LogIn} title={t.title} subtitle={challenge?t.otpIntro:t.intro} footer={<span>{t.noAccount} <Link to="/register" className="font-bold text-amber-600 dark:text-amber-400">{t.register}</Link></span>}>
    {error&&<div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}
    <form onSubmit={submit} className="space-y-4">{!challenge?<><Field label={t.email} name="email" type="email" value={form.email} onChange={change}/><Field label={t.password} name="password" type="password" value={form.password} onChange={change}/><label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><input name="remember_me" type="checkbox" checked={form.remember_me} onChange={change}/>{t.remember}</label><Link to="/forgot-password" className="block text-sm font-bold text-amber-600 dark:text-amber-400">{t.forgot}</Link></>:<Field label={t.otp} name="otp" inputMode="numeric" maxLength={6} value={form.otp} onChange={change}/>}<Button className="h-12 w-full bg-amber-400 font-bold text-slate-950 hover:bg-amber-300" disabled={loading}>{loading&&<Loader2 className="h-4 w-4 animate-spin"/>}{loading?t.loading:challenge?t.confirm:t.next}</Button></form>
  </AuthLayout>;
}
function Field({label,...props}){return <div className="space-y-2"><Label htmlFor={props.name}>{label}</Label><Input id={props.name} required className="h-12 border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" {...props}/></div>}