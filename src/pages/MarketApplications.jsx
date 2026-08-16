import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Clock3, ExternalLink, Send, ShieldCheck } from "lucide-react";
import DismissibleNotice from "@/components/DismissibleNotice";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import { invokeAppFunction } from "@/services/marketService";
import { usePreferences } from "@/lib/preferences";
import { localizedAccessError, localizedStatus } from "@/lib/accessCopy";

const MARKETS = {
  SA_MAIN: { ar: "السوق السعودي", en: "Saudi Market" },
  US_OPTIONS: { ar: "الأسهم الأمريكية المؤهلة للخيارات", en: "U.S. Optionable Stocks" },
  US_BENCHMARKS: { ar: "المؤشرات والصناديق الأمريكية", en: "U.S. Indices & ETFs" },
};
function dateLabel(value, language) { return value ? new Date(value).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"; }

export default function MarketApplications() {
  const { isArabic, language } = usePreferences();
  const t = isArabic ? {
    title: "طلبات الأسواق", description: "كل تسجيل في منصة تداول يفتح سوقاً واحداً فقط بعد موافقة المالك.",
    request: "طلب منصة وسوق إضافي", chooseMarket: "اختر السوق", choosePlatform: "اختر منصة جديدة", open: "فتح رابط الإحالة وإنشاء رقم الطلب", confirm: "سجلت في المنصة — إرسال للمراجعة",
    applications: "طلباتي وأرقام الإحالة", none: "لا توجد منصة أخرى متاحة لهذا السوق.", cooldown: "يمكنك التقديم على منصة أخرى بعد", remaining: "طلبات متاحة", opened: "تم فتح رابط الإحالة وحفظ رقم طلبك.", confirmed: "تم تأكيد تسجيلك وإرسال الطلب للمالك.",
    loadFailed: "تعذر تحميل طلباتك.", onePlatform: "المنصات المستخدمة سابقاً لا تظهر مرة أخرى.", copy: "رقم الطلب", status: "الحالة",
  } : {
    title: "Market Applications", description: "Each trading-platform registration unlocks one market only after owner approval.",
    request: "Request another platform & market", chooseMarket: "Choose market", choosePlatform: "Choose a new platform", open: "Open referral link & create reference", confirm: "I registered — send for review",
    applications: "My applications & referral references", none: "No other platform is available for this market.", cooldown: "You can apply to another platform after", remaining: "applications remaining", opened: "The referral link was opened and your reference was saved.", confirmed: "Your registration was confirmed and sent to the owner.",
    loadFailed: "Unable to load your applications.", onePlatform: "Previously used platforms are hidden.", copy: "Reference", status: "Status",
  };
  const [data, setData] = useState({ applications: [], platforms: [], cooldown: { active: false }, remaining_platform_slots: 100 });
  const [market, setMarket] = useState("SA_MAIN");
  const [platformId, setPlatformId] = useState("");
  const [state, setState] = useState({ loading: true, busy: false, error: "", notice: "" });

  const load = useCallback(async () => {
    try {
      const result = await invokeAppFunction("customerAccess", { action: "list" });
      setData(result);
      setState((current) => ({ ...current, loading: false, error: "" }));
      return result;
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: localizedAccessError(error, language, t.loadFailed) }));
      return null;
    }
  }, [isArabic]);
  useEffect(() => { load(); }, [load]);

  const platforms = useMemo(() => data.platforms.filter((item) => item.supported_market_codes?.includes(market)), [data.platforms, market]);
  const selected = platforms.find((item) => item.id === platformId);
  useEffect(() => { if (!platforms.some((item) => item.id === platformId)) setPlatformId(platforms[0]?.id || ""); }, [platformId, platforms]);

  async function openReferral() {
    if (!selected || data.cooldown?.active) return;
    const popup = window.open("", "_blank");
    setState((current) => ({ ...current, busy: true, error: "", notice: "" }));
    try {
      const result = await invokeAppFunction("customerAccess", { action: "open_referral", market_code: market, trading_platform_id: platformId });
      if (popup) {
        popup.opener = null;
        popup.location.replace(result.referral_url);
      } else window.location.assign(result.referral_url);
      await load();
      setState((current) => ({ ...current, busy: false, notice: t.opened }));
    } catch (error) {
      popup?.close();
      setState((current) => ({ ...current, busy: false, error: localizedAccessError(error, language, t.loadFailed) }));
    }
  }

  async function confirm(application) {
    setState((current) => ({ ...current, busy: true, error: "", notice: "" }));
    try {
      await invokeAppFunction("customerAccess", { action: "confirm_registration", application_id: application.id });
      await load();
      setState((current) => ({ ...current, busy: false, notice: t.confirmed }));
    } catch (error) { setState((current) => ({ ...current, busy: false, error: localizedAccessError(error, language, t.loadFailed) })); }
  }

  return <>
    <PageHeader title={t.title} description={t.description} />
    <main className="mx-auto grid max-w-6xl gap-5 px-4 pb-10 lg:grid-cols-[.9fr_1.1fr]">
      <section className="self-start rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0d192a]">
        <h2 className="flex items-center gap-2 font-black"><Building2 size={18} />{t.request}</h2>
        <p className="mt-2 text-xs leading-5 text-slate-500">{t.onePlatform}</p>
        {data.cooldown?.active && <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-800 dark:text-amber-200"><Clock3 className="mb-2" size={18} /><b>{t.cooldown}</b><p className="mt-1">{dateLabel(data.cooldown.until, language)}</p><small>{data.cooldown.latest_reference}</small></div>}
        <div className="mt-4 grid gap-3">
          <Field label={t.chooseMarket}><select className="form-input w-full" value={market} onChange={(event) => setMarket(event.target.value)}>{Object.entries(MARKETS).map(([code, names]) => <option key={code} value={code}>{names[isArabic ? "ar" : "en"]}</option>)}</select></Field>
          <Field label={t.choosePlatform}><select className="form-input w-full" value={platformId} onChange={(event) => setPlatformId(event.target.value)} disabled={data.cooldown?.active || !platforms.length}><option value="">{t.choosePlatform}</option>{platforms.map((item) => <option key={item.id} value={item.id}>{isArabic ? item.name_ar : item.name_en}</option>)}</select></Field>
          {!platforms.length && !data.cooldown?.active && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-500 dark:bg-slate-900">{t.none}</p>}
          <button type="button" className="primary-button justify-center" disabled={!platformId || state.busy || data.cooldown?.active} onClick={openReferral}><ExternalLink size={16} />{t.open}</button>
          <small className="text-center text-slate-500">{data.remaining_platform_slots} {t.remaining}</small>
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0d192a]">
        <h2 className="flex items-center gap-2 font-black"><ShieldCheck size={18} />{t.applications}</h2>
        {state.loading ? <StatusPanel loading /> : <div className="mt-4 space-y-3">{data.applications.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex flex-wrap items-start justify-between gap-3"><div><small className="text-slate-500">{t.copy}</small><b className="mt-1 block font-mono text-sm">{item.unique_reference}</b><p className="mt-2 text-sm">{item.platform?.[isArabic ? "name_ar" : "name_en"] || "—"} · {MARKETS[item.market_code]?.[isArabic ? "ar" : "en"] || item.market_code}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">{t.status}: {localizedStatus("application", item.status, language)}</span></div>{item.platform?.referral_url && <a className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-sky-600 underline" href={item.platform.referral_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} />{isArabic ? "فتح رابط المنصة" : "Open platform link"}</a>}{item.status === "referral_opened" && <button type="button" className="primary-button mt-3 w-full justify-center" disabled={state.busy} onClick={() => confirm(item)}><Send size={15} />{t.confirm}</button>}{item.status === "approved" && <p className="mt-3 flex items-center gap-2 text-sm font-bold text-emerald-600"><CheckCircle2 size={16} />{isArabic ? "تم تفعيل السوق" : "Market activated"}</p>}</article>)}</div>}
      </section>
    </main>
    <DismissibleNotice message={state.error} tone="error" onDismiss={() => setState((current) => ({ ...current, error: "" }))} />
    <DismissibleNotice message={state.notice} onDismiss={() => setState((current) => ({ ...current, notice: "" }))} />
  </>;
}

function Field({ label, children }) { return <label className="block"><span className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>{children}</label>; }
