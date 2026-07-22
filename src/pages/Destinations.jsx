import React from "react";
import ServicePage from "@/components/ServicePage";

const channels = ["Telegram", "WhatsApp"];

export default function Destinations() {
  return (
    <ServicePage
      title="قنوات التنبيه"
      description="حالة تكاملات تسليم التنبيهات الخارجية."
      functionName="customerSelfService"
      payload={{ action: "alerts" }}
    >
      {() => (
        <div className="space-y-3">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
            القنوات غير مفعلة في هذا الإصدار وتنتظر بيانات اعتماد المالك. لا يتم إرسال أي تنبيهات خارجية حاليًا.
          </div>
          {channels.map((channel) => (
            <div key={channel} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <span className="font-black">{channel}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">بانتظار بيانات اعتماد المالك</span>
            </div>
          ))}
        </div>
      )}
    </ServicePage>
  );
}