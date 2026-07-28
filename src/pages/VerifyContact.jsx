import React from "react";
import { Link } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import { ShieldCheck } from "lucide-react";
import { usePreferences } from "@/lib/preferences";

const copy={ar:{title:'تم تفعيل حسابك',subtitle:'اكتمل تأكيد البريد وإنشاء حسابك الشخصي',body:'يمكنك الآن تسجيل الدخول. رقم الجوال محفوظ في ملفك، ولا يمنع الدخول ما دام تأكيد الرسائل غير مفعّل.',back:'الانتقال إلى تسجيل الدخول'},en:{title:'Your account is active',subtitle:'Email verification and personal account setup are complete',body:'You can sign in now. Your mobile number is saved to your profile and does not block access while messaging verification is unavailable.',back:'Continue to sign in'}};
export default function VerifyContact(){const{language}=usePreferences(),t=copy[language];return <AuthLayout icon={ShieldCheck} title={t.title} subtitle={t.subtitle}><p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{t.body}</p><Link className="mt-6 block rounded-xl bg-emerald-400 px-4 py-3 text-center font-bold text-slate-950" to="/login">{t.back}</Link></AuthLayout>}
