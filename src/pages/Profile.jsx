import React from "react";
import ServicePage from "@/components/ServicePage";
import { usePreferences } from "@/lib/preferences";
import { localizedStatus } from "@/lib/accessCopy";

export default function Profile() {
  const { language, isArabic } = usePreferences();
  return (
    <ServicePage title={isArabic ? "الحساب والجهاز" : "Account & device"} description={isArabic ? "بيانات الحساب واللغة والموافقات والجلسة النشطة." : "Account, language, consent, and active-session details."} functionName="customerSelfService" payload={{ action: "read" }}>
      {(data) => (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-bold">{data.profile.full_name}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{data.profile.email_normalized}</p>
            <p className="mt-4 text-sm">{isArabic ? "حالة الحساب" : "Account status"}: {localizedStatus("account", data.profile.account_status, language)}</p>
          </div>
        </div>
      )}
    </ServicePage>
  );
}
