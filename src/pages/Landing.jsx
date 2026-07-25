import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, ArrowRight, BarChart3, BellRing, CheckCircle2, Database, LineChart, LockKeyhole, Moon, ShieldCheck, Sparkles, Sun, Target } from "lucide-react";
import { usePreferences } from "@/lib/preferences";

const sections = {
  market: { icon: Database, ar: ["سوق كامل، لا قائمة مختصرة", "شركات السوق الرئيسية بأسمائها وقطاعاتها، مع ترتيب المرتفعة والمنخفضة والثابتة وتوقيت آخر تحديث."], en: ["The full market, not a shortlist", "Saudi Main Market companies with names, sectors, movers and a clear last-updated time."] },
  chart: { icon: LineChart, ar: ["شموع حقيقية ومؤشر واضح", "فواصل متعددة، حجم التداول، قيم الافتتاح والأعلى والأدنى والإغلاق، ومناطق المستثمر بأسمائها وألوانها وأسعارها."], en: ["Verified candles and a clear indicator", "Multiple intervals, OHLCV and investor zones with explicit names, colors, prices and stops."] },
  alerts: { icon: BellRing, ar: ["تنبيه حين يتحقق الشرط", "قواعد محفوظة لكل شركة واستراتيجية، مع منع التكرار وسجل تسليم إلى قنوات تيليجرام وواتساب المعتمدة."], en: ["Alerts when the rule is met", "Saved rules per company and strategy with deduplication and audited Telegram and WhatsApp delivery."] },
  security: { icon: ShieldCheck, ar: ["اشتراك وصلاحيات من الخلفية", "تحقق بريد عند الدخول، جهاز نشط واحد، حظر واشتراكات وصلاحيات لا يمكن تجاوزها من الواجهة."], en: ["Backend-enforced access", "Login verification, one active device, subscription state and permissions that cannot be bypassed from the interface."] },
};

export default function Landing() {
  const { isArabic, theme, toggleLanguage, toggleTheme } = usePreferences();
  const [active, setActive] = useState("market");
  const item = sections[active];
  const Icon = item.icon;
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  const workflowSteps = [
    { icon: Database, title: isArabic ? "جلب" : "Ingest", body: isArabic ? "الوقت والجودة والتحقق" : "Timestamp, quality and validation" },
    { icon: LineChart, title: isArabic ? "حساب" : "Calculate", body: isArabic ? "معادلات حتمية ثابتة الإصدار" : "Versioned deterministic formulas" },
    { icon: Target, title: isArabic ? "مطابقة" : "Match", body: isArabic ? "شروط المستخدم المحفوظة" : "Saved user conditions" },
    { icon: BellRing, title: isArabic ? "تسليم" : "Deliver", body: isArabic ? "منع تكرار وسجل نتيجة" : "Deduplication and result log" },
  ];
  return <div className="landing-page">
    <header className="landing-header">
      <Link to="/" className="brand-lockup"><span className="brand-mark"><BarChart3 size={19} /></span><span>{isArabic ? "المستثمر الذكي" : "Smart Investor"}<small>SI</small></span></Link>
      <nav><a href="#platform">{isArabic ? "المنصة" : "Platform"}</a><a href="#workflow">{isArabic ? "كيف تعمل" : "How it works"}</a><a href="#security">{isArabic ? "الحماية" : "Security"}</a></nav>
      <div className="flex items-center gap-1"><button className="icon-button language-switch" onClick={toggleLanguage} aria-label={isArabic ? "Switch to English" : "التبديل إلى العربية"}>{isArabic ? "E" : "ع"}</button><button className="icon-button" onClick={toggleTheme}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button><Link to="/login" className="secondary-button">{isArabic ? "دخول" : "Sign in"}</Link></div>
    </header>

    <main>
      <section className="hero-section">
        <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />
        <div className="relative z-10 mx-auto grid max-w-[1500px] items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div><span className="eyebrow"><Activity size={14} />{isArabic ? "المستثمر الذكي للسوق السعودي" : "Smart Investor · Saudi Market"}</span><h1>{isArabic ? <>قرار أوضح يبدأ من <em>بيانات أوضح.</em></> : <>Clearer decisions begin with <em>clearer data.</em></>}</h1><p>{isArabic ? "منصة عربية وإنجليزية لمراقبة السوق الرئيسية، تجمع الأسعار والشموع والمؤشرات ومعلومات الشركة، وتحوّل شروطك الدقيقة إلى متابعة وتنبيهات." : "A bilingual platform for the Saudi Main Market, combining quotes, candles, company information, strict indicators, watchlists and alerts."}</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/register" className="primary-button">{isArabic ? "ابدأ حسابك" : "Create account"}<Arrow size={17} /></Link><Link to="/login" className="secondary-button">{isArabic ? "لدي حساب" : "I have an account"}</Link></div><div className="hero-trust">{[isArabic ? "بيانات سوق فعلية" : "Actual market data", isArabic ? "معلومات شركة متكاملة" : "Integrated company information", isArabic ? "صلاحيات خلفية" : "Backend authorization"].map((label) => <span key={label}><CheckCircle2 size={15} />{label}</span>)}</div></div>
          <div className="hero-console">
            <div className="console-top"><span className="console-source"><Database size={14} />{isArabic ? "بيانات موثقة" : "Sourced data"}</span><b>{isArabic ? "مراقبة السوق" : "Market monitor"}</b><Activity size={17} /></div>
            <div className="console-grid"><div className="console-card console-wide"><span>{isArabic ? "السوق الرئيسية" : "Main Market"}</span><b>{isArabic ? "الشركات · القطاعات · الحركة" : "Companies · sectors · movers"}</b><div className="console-fields">{(isArabic ? ["الافتتاح والأعلى والأدنى والإغلاق", "الحجم والقيمة وعدد الصفقات", "وقت آخر تحديث وحالة البيانات"] : ["Open, high, low and close", "Volume, value and trades", "Last-updated time and data status"]).map((label) => <span key={label}><CheckCircle2 size={14} />{label}</span>)}</div></div><div className="console-card"><Target /><span>{isArabic ? "مناطق محددة" : "Strict zones"}</span><b>{isArabic ? "اسم · لون · سعر · وقف" : "Name · color · price · stop"}</b></div><div className="console-card"><BellRing /><span>{isArabic ? "تنبيهات" : "Alerts"}</span><b>{isArabic ? "شرط واضح وسجل تسليم" : "Explicit rule and delivery log"}</b></div><div className="console-card console-wide"><LockKeyhole /><span>{isArabic ? "وصول محمي" : "Protected access"}</span><b>{isArabic ? "اشتراك · جهاز واحد · تدقيق" : "Subscription · one device · audit"}</b></div></div>
          </div>
        </div>
      </section>

      <section id="platform" className="landing-section">
        <div className="section-kicker"><Sparkles size={16} />{isArabic ? "تجربة مترابطة" : "One connected experience"}</div><h2>{isArabic ? "كل ما تحتاجه الشركة في مكان واحد" : "Everything you need for a company, in one place"}</h2>
        <div className="landing-tabs">{Object.entries(sections).map(([key, value]) => { const TabIcon = value.icon; return <button key={key} onClick={() => setActive(key)} className={active === key ? "active" : ""}><TabIcon size={17} />{isArabic ? { market: "السوق", chart: "الشارت والمؤشر", alerts: "التنبيهات", security: "الحماية" }[key] : { market: "Market", chart: "Chart & indicator", alerts: "Alerts", security: "Security" }[key]}</button>; })}</div>
        <div className="landing-feature-panel"><div><span className="feature-icon"><Icon size={25} /></span><h3>{isArabic ? item.ar[0] : item.en[0]}</h3><p>{isArabic ? item.ar[1] : item.en[1]}</p></div><div className="feature-checks">{(isArabic ? ["بحث وتخصيص", "تحديث مجدول", "حالة بيانات صريحة", "فتح تفاصيل الشركة"] : ["Search and personalize", "Scheduled refresh", "Explicit data status", "Open company details"]).map((label) => <span key={label}><CheckCircle2 size={17} />{label}</span>)}</div></div>
      </section>

      <section id="workflow" className="landing-section landing-section-muted"><div className="section-kicker"><BarChart3 size={16} />{isArabic ? "من البيانات إلى التنبيه" : "From data to alert"}</div><h2>{isArabic ? "تدفق واحد يمكن مراجعته" : "One traceable workflow"}</h2><div className="workflow-grid">{workflowSteps.map(({ icon: StepIcon, title, body }, index) => <article key={title}><span>{index + 1}</span><StepIcon /><h3>{title}</h3><p>{body}</p></article>)}</div></section>

      <section id="security" className="landing-section"><div className="cta-panel"><div><span className="section-kicker"><ShieldCheck size={16} />{isArabic ? "منصة اشتراكات كاملة" : "Complete subscription platform"}</span><h2>{isArabic ? "رؤية دقيقة، ووصول مضبوط." : "Precise insight, controlled access."}</h2><p>{isArabic ? "أنشئ حسابك، فعّل اشتراكك، وابدأ ببناء قوائمك واستراتيجياتك وتنبيهاتك." : "Create your account, activate a plan, then build your watchlists, strategies and alerts."}</p></div><Link to="/register" className="primary-button">{isArabic ? "إنشاء حساب" : "Create account"}<Arrow size={17} /></Link></div></section>
    </main>
    <footer className="landing-footer"><div className="brand-lockup"><span className="brand-mark"><BarChart3 size={18} /></span><span>{isArabic ? "المستثمر الذكي" : "Smart Investor"}<small>SI</small></span></div><p>{isArabic ? "المستثمر الذكي أداة معلومات ومراقبة وليست توصية استثمارية." : "Smart Investor is an information and monitoring tool, not investment advice."}</p><a href="/third-party-notices.html">{isArabic ? "إشعارات البرمجيات" : "Software notices"}</a></footer>
  </div>;
}
