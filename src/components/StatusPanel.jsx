import React from "react";
import { AlertTriangle, Database, Loader2 } from "lucide-react";
export default function StatusPanel({ loading = false, error = "", title="لا توجد نتائج متاحة" }) {
  if(loading)return <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"><Loader2 className="ml-2 h-5 w-5 animate-spin"/>جارٍ التحميل</div>;
  const sessionExpired=error==="Active device session required";
  const message=sessionExpired?"انتهت جلسة الجهاز؛ سجّل الدخول مجددًا للوصول الآمن إلى بيانات السوق.":error?"تعذر تحميل البيانات الآن. ستبقى آخر بيانات حقيقية محفوظة متاحة عند عودة الخدمة.":"لا توجد بيانات محفوظة لهذا القسم حتى الآن.";
  return <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">{error?<AlertTriangle className="text-amber-500"/>:<Database className="text-slate-400"/>}</div><h2 className="font-bold text-slate-950 dark:text-white">{sessionExpired?"جلسة الجهاز مطلوبة":error||title}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">{message}</p></div>;
}
