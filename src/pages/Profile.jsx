import React from "react";
import { SessionLink } from "@/components/SessionLink";
import ServicePage from "@/components/ServicePage";

export default function Profile() {
  return (
    <ServicePage title="الحساب والجهاز" description="بيانات الحساب واللغة والموافقات والجلسة النشطة." functionName="customerSelfService" payload={{ action: "read" }}>
      {(data) => (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-bold">{data.profile.full_name}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{data.profile.email_normalized}</p>
            <p className="mt-4 text-sm">حالة الحساب: {data.profile.account_status}</p>
          </div>
          <SessionLink to="/destinations" className="secondary-button">إعدادات قنوات التنبيه</SessionLink>
        </div>
      )}
    </ServicePage>
  );
}
