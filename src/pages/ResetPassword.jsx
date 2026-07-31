import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SessionLink } from "@/components/SessionLink";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { usePreferences } from "@/lib/preferences";

const copy={ar:{invalid:'رابط غير صالح',invalidSub:'رابط استرجاع كلمة المرور مفقود أو غير صالح',invalidBody:'يبدو أن الرابط غير مكتمل. اطلب رسالة جديدة لاسترجاع كلمة المرور.',newLink:'طلب رابط جديد',title:'كلمة مرور جديدة',subtitle:'أدخل كلمة مرور جديدة لحسابك',password:'كلمة المرور الجديدة',confirm:'تأكيد كلمة المرور',save:'حفظ كلمة المرور',saving:'جارٍ الحفظ…',mismatch:'كلمتا المرور غير متطابقتين',error:'تعذر تغيير كلمة المرور'},en:{invalid:'Invalid link',invalidSub:'The password reset link is missing or invalid',invalidBody:'This link appears incomplete. Please request a new password reset email.',newLink:'Request a new link',title:'New password',subtitle:'Enter a new password for your account',password:'New password',confirm:'Confirm password',save:'Save password',saving:'Saving…',mismatch:'Passwords do not match',error:'Unable to reset password'}};
export default function ResetPassword(){
  const{language}=usePreferences(),t=copy[language];const[params]=useSearchParams(),resetToken=params.get('token');const[newPassword,setNewPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  const submit=async e=>{e.preventDefault();setError('');if(newPassword!==confirmPassword)return setError(t.mismatch);setLoading(true);try{await base44.auth.resetPassword({resetToken,newPassword});window.location.href='/login'}catch(err){setError(err.message||t.error)}finally{setLoading(false)}};
  if(!resetToken)return <AuthLayout icon={AlertTriangle} title={t.invalid} subtitle={t.invalidSub} footer={<SessionLink to="/forgot-password" className="font-medium text-primary hover:underline">{t.newLink}</SessionLink>}><p className="text-center text-sm text-foreground">{t.invalidBody}</p></AuthLayout>;
  return <AuthLayout icon={Lock} title={t.title} subtitle={t.subtitle}>{error&&<div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}<form onSubmit={submit} className="space-y-4"><PasswordField id="password" label={t.password} value={newPassword} onChange={e=>setNewPassword(e.target.value)}/><PasswordField id="confirm" label={t.confirm} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/><Button type="submit" className="h-12 w-full font-medium" disabled={loading}>{loading&&<Loader2 className="h-4 w-4 animate-spin"/>}{loading?t.saving:t.save}</Button></form></AuthLayout>;
}
function PasswordField({id,label,...props}){return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type="password" autoComplete="new-password" placeholder="••••••••" className="h-12" required {...props}/></div>}
