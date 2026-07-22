import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function Login() {
  const [form,setForm]=useState({email:"",password:"",otp:"",remember_me:false});
  const [challenge,setChallenge]=useState(null),[error,setError]=useState(""),[loading,setLoading]=useState(false);
  const change=e=>setForm({...form,[e.target.name]:e.target.type==='checkbox'?e.target.checked:e.target.value});
  const submit=async e=>{e.preventDefault();setError("");setLoading(true);try{
    if(!challenge){await base44.auth.loginViaEmailPassword(form.email,form.password);const r=await base44.functions.invoke('authLogin',{action:'start'});setChallenge(r.data.challenge_id);}
    else{const r=await base44.functions.invoke('authLogin',{action:'verify',challenge_id:challenge,otp:form.otp,remember_me:form.remember_me,device_id:navigator.userAgent});localStorage.setItem('kmy_session_id',r.data.session_id);window.location.href='/dashboard';}
  }catch(err){setError(err.response?.data?.error||err.message||'تعذر تسجيل الدخول');}finally{setLoading(false)}};
  return <AuthLayout icon={LogIn} title="تسجيل الدخول" subtitle={challenge?'أدخل الرمز المرسل إلى بريدك':'الوصول الآمن إلى حسابك'} footer={<span>ليس لديك حساب؟ <Link to="/register" className="font-bold text-amber-600 dark:text-amber-400">إنشاء حساب</Link></span>}>
    {error&&<div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}
    <form onSubmit={submit} className="space-y-4">{!challenge?<><Field label="البريد الإلكتروني" name="email" type="email" value={form.email} onChange={change}/><Field label="كلمة المرور" name="password" type="password" value={form.password} onChange={change}/><label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><input name="remember_me" type="checkbox" checked={form.remember_me} onChange={change}/>تذكرني على هذا الجهاز</label><Link to="/forgot-password" className="block text-sm font-bold text-amber-600 dark:text-amber-400">نسيت كلمة المرور؟</Link></>:<Field label="رمز التحقق" name="otp" inputMode="numeric" maxLength={6} value={form.otp} onChange={change}/>}<Button className="h-12 w-full bg-amber-400 font-bold text-slate-950 hover:bg-amber-300" disabled={loading}>{loading&&<Loader2 className="ml-2 h-4 w-4 animate-spin"/>}{challenge?'تأكيد الدخول':'متابعة'}</Button></form>
  </AuthLayout>;
}
function Field({label,...props}){return <div className="space-y-2"><Label htmlFor={props.name}>{label}</Label><Input id={props.name} required className="h-12 border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" {...props}/></div>}
