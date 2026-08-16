import React, { useEffect, useMemo, useState } from "react";
import { SessionLink } from "@/components/SessionLink";
import { Activity, BellRing, Database, FileClock, MessageCircleMore, ShieldCheck, UserRoundCog, UsersRound, WalletCards } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import { invokeAppFunction, isReferencePreview } from "@/services/marketService";
import { useAuthorization } from "@/lib/AuthorizationContext";

const navigation = [
  { to: "/admin/customers", label: "العملاء", description: "الملف الشامل والحالة والجلسات والملاحظات", permission: "customers.masked.read", icon: UsersRound },
  { to: "/messages", label: "مركز الرسائل", description: "محادثات العملاء وصندوق الفريق المشترك", permission: "messages.manage", icon: MessageCircleMore },
  { to: "/admin/access", label: "طلبات الوصول والمنصات", description: "قبول العملاء وربط كل منصة بسوق واحد", permission: "customers.full.read", icon: ShieldCheck },
  { to: "/admin/courses", label: "الدورات والفيديو", description: "رفع المقاطع ونشر الدورات العامة والخاصة", permission: "settings.manage", icon: FileClock },
  { to: "/admin/subscriptions", label: "الاشتراكات والخطط", description: "التفعيل اليدوي والحدود ودورة الحياة", permission: "subscriptions.read", icon: WalletCards },
  { to: "/admin/roles", label: "الأدوار والصلاحيات", description: "سحب وإفلات وإسناد محكوم من الخلفية", permission: "roles.manage", icon: UserRoundCog },
  { to: "/admin/quality", label: "جودة البيانات", description: "المصادر والأخطاء وحالة المعالجة", permission: "data.quality.manage", icon: Database },
  { to: "/admin/operations", label: "تشغيل السوق", description: "عمليات الجلب وحداثة البيانات والتسليم", permission: "data.operations.read", icon: Activity },
  { to: "/admin/audit", label: "سجل التدقيق", description: "الأفعال الحساسة والقيم قبل وبعد", permission: "audit.read", icon: FileClock },
];

export default function AdminDashboard() {
  const { context, can } = useAuthorization();
  const [state, setState] = useState({ loading: true, data: {}, errors: [] });

  useEffect(() => {
    let active = true;
    if (isReferencePreview()) {
      setState({ loading: false, errors: [], data: { customers: [], subscriptions: [], operations: { sources: [], issues: [], runs: [], delivery_health: {} } } });
      return undefined;
    }
    Promise.allSettled([
      can("customers.masked.read") ? invokeAppFunction("adminCustomers", { action: "list", limit: 100 }) : Promise.resolve({ customers: [] }),
      can("subscriptions.read") ? invokeAppFunction("adminSubscriptions", { action: "list", limit: 200 }) : Promise.resolve({ subscriptions: [] }),
      can("data.operations.read") ? invokeAppFunction("operationsQuality", {}) : Promise.resolve({ sources: [], issues: [], runs: [], delivery_health: {} }),
    ]).then((results) => {
      if (!active) return;
      setState({
        loading: false,
        data: {
          customers: results[0].status === "fulfilled" ? results[0].value.customers || [] : [],
          subscriptions: results[1].status === "fulfilled" ? results[1].value.subscriptions || [] : [],
          operations: results[2].status === "fulfilled" ? results[2].value : {},
        },
        errors: results.filter((result) => result.status === "rejected").map((result) => result.reason?.response?.data?.error || result.reason?.message),
      });
    });
    return () => { active = false; };
  }, [can]);

  const metrics = useMemo(() => {
    const customers = state.data.customers || [];
    const subscriptions = state.data.subscriptions || [];
    const operations = state.data.operations || {};
    return [
      { label: "العملاء النشطون", value: customers.filter((item) => item.account_status === "active").length, icon: UsersRound },
      { label: "الاشتراكات النشطة", value: subscriptions.filter((item) => item.status === "active").length, icon: WalletCards },
      { label: "مشاكل البيانات الفعلية", value: operations.issue_summary?.active_count || 0, icon: Database, to: "/admin/quality" },
      { label: "فشل التنبيهات", value: operations.delivery_health?.failed || 0, icon: BellRing },
    ];
  }, [state.data]);

  return <>
    <PageHeader title="لوحة المالك والإدارة" description={`مركز تشغيل موحد بصلاحيات خلفية. الحساب الحالي: ${context?.identity?.full_name || "—"}`} />
    <div className="mx-auto max-w-[1800px] space-y-6 px-4 pb-10">
      {state.loading && <StatusPanel loading />}
      {state.errors.length > 0 && <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm">تعذر تحميل بعض مؤشرات التشغيل، بينما بقيت الأقسام المصرح بها متاحة.</div>}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, icon: Icon, to }) => { const content = <><div className="flex items-center justify-between text-slate-400"><span className="text-sm">{label}</span><Icon size={18} /></div><b className="mt-4 block text-3xl font-black">{Number(value).toLocaleString("ar-SA")}</b></>; return to ? <SessionLink key={label} to={to} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-sky-400 hover:shadow-lg dark:border-slate-800 dark:bg-[#0d192a]">{content}</SessionLink> : <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]">{content}</div>; })}</section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{navigation.filter((item) => can(item.permission)).map(({ to, label, description, icon: Icon }) => <SessionLink key={to} to={to} className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-sky-400 hover:shadow-xl dark:border-slate-800 dark:bg-[#0d192a]"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-400/15 text-sky-500"><Icon size={19} /></span><b>{label}</b></div><p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">{description}</p></SessionLink>)}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-500" /><b>حالة التحكم</b></div><p className="mt-3 text-sm leading-7 text-slate-500">الواجهة تعرض ما تسمح به الصلاحيات فقط، وكل قراءة أو تعديل حساس يعاد التحقق منه داخل الوظيفة الخلفية مع جلسة نشطة وسجل تدقيق.</p></section>
    </div>
  </>;
}
