import React, { useState } from "react";
import { SessionLink } from "@/components/SessionLink";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { usePreferences } from "@/lib/preferences";

const copy={ar:{title:'استرجاع كلمة المرور',subtitle:'سنرسل رابطاً آمناً إلى بريدك',back:'العودة لتسجيل الدخول',email:'البريد الإلكتروني',send:'إرسال رابط الاسترجاع',sending:'جارٍ الإرسال…',sent:'إذا كان البريد مسجلاً، فستصلك رسالة استرجاع خلال وقت قصير.'},en:{title:'Reset password',subtitle:'We will send a secure link to your email',back:'Back to sign in',email:'Email address',send:'Send reset link',sending:'Sending…',sent:'If the email is registered, you will receive a reset message shortly.'}};
export default function ForgotPassword() {
  const {language,isArabic}=usePreferences(),t=copy[language],Arrow=isArabic?ArrowLeft:ArrowRight;
  const [email,setEmail]=useState(''),[loading,setLoading]=useState(false),[sent,setSent]=useState(false);
  const submit=async e=>{e.preventDefault();setLoading(true);try{await base44.auth.resetPasswordRequest(email);}catch{}finally{setLoading(false);setSent(true)}};
  return <AuthLayout icon={Mail} title={t.title} subtitle={t.subtitle} footer={<SessionLink to="/login" className="font-medium text-primary hover:underline"><Arrow className="me-1 inline h-3 w-3"/>{t.back}</SessionLink>}>
    {sent?<p className="text-center text-sm text-foreground">{t.sent}</p>:<form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="email">{t.email}</Label><Input id="email" type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} className="h-12" required/></div><Button type="submit" className="h-12 w-full font-medium" disabled={loading}>{loading&&<Loader2 className="h-4 w-4 animate-spin"/>}{loading?t.sending:t.send}</Button></form>}
  </AuthLayout>;
}
