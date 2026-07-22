import React from "react";
import { Link } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import { ShieldCheck } from "lucide-react";
import { usePreferences } from "@/lib/preferences";

const copy={ar:{title:'تأكيد وسائل الاتصال',subtitle:'أكمل تأكيد البريد والجوال',body:'يتم تأكيد البريد ضمن التسجيل. تأكيد الجوال محجوب حتى اعتماد مزود رسائل خليجي.',back:'العودة للدخول'},en:{title:'Verify contact details',subtitle:'Complete email and mobile verification',body:'Email is verified during registration. Mobile verification remains unavailable until a Gulf messaging provider is approved.',back:'Back to sign in'}};
export default function VerifyContact(){const{language}=usePreferences(),t=copy[language];return <AuthLayout icon={ShieldCheck} title={t.title} subtitle={t.subtitle}><p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{t.body}</p><Link className="mt-6 block rounded-xl bg-emerald-400 px-4 py-3 text-center font-bold text-slate-950" to="/login">{t.back}</Link></AuthLayout>}