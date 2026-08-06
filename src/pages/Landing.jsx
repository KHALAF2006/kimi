import React, { useState } from "react";
import { SessionLink } from "@/components/SessionLink";
import { Activity, ArrowLeft, ArrowRight, BarChart3, BellRing, CheckCircle2, Database, LineChart, LockKeyhole, Moon, ShieldCheck, Sparkles, Sun, Target } from "lucide-react";
import { usePreferences } from "@/lib/preferences";

const sections = {
  market: {
    icon: Database,
    ar: ["كل سوق في مساحته المستقلة لتركيز أوضح", "تابع السوق السعودي والأسهم الأمريكية المؤهلة لعقود الخيارات في مساحتين منفصلتين تمامًا. لكل سوق شريطه، وشركاته، وبحثه، ورسومه البيانية لتصل إلى ما تحتاجه بسرعة ووضوح.", ["بحث وتخصيص سريع", "تحديث مستمر للحركة", "تفاصيل متكاملة لكل شركة", "رؤية أوضح لاتجاهات السوق"]],
    en: ["A dedicated workspace for every market", "Follow the Saudi market and U.S. optionable stocks in two fully separate workspaces. Each market has its own ticker, companies, search, and charts, so you can reach what matters with speed and clarity.", ["Fast search and personalization", "Continuously updated movement", "Integrated company details", "A clearer view of market direction"]],
  },
  chart: {
    icon: LineChart,
    ar: ["أدوات تحليل فني تمنحك رؤية أوضح", "اقرأ حركة السعر عبر شارت تفاعلي ومؤشرات مخصصة تساعدك على متابعة المناطق المهمة واتخاذ قرارك بثقة أكبر.", ["فواصل زمنية متعددة", "شموع وحجم تداول واضحان", "مناطق استثمارية مميزة", "قراءة أسرع لحركة السعر"]],
    en: ["Technical analysis tools for a clearer view", "Read price action through an interactive chart and tailored indicators that help you follow key zones and make more confident decisions.", ["Multiple timeframes", "Clear candles and volume", "Distinct investment zones", "Faster price-action reading"]],
  },
  alerts: {
    icon: BellRing,
    ar: ["لا تدع فرصة مهمة تمر دون انتباه", "أنشئ شروطك واستراتيجياتك، واستقبل تنبيهًا واضحًا عند تحققها دون الحاجة إلى مراقبة الشاشة طوال الوقت.", ["شروط تناسب أسلوبك", "تنبيه واضح عند التحقق", "متابعة دون انشغال دائم", "إدارة سهلة من مكان واحد"]],
    en: ["Keep important opportunities within reach", "Create your conditions and strategies, then receive a clear alert when they are met without watching the screen all day.", ["Conditions that fit your style", "Clear alerts when conditions match", "Less constant screen watching", "Simple management in one place"]],
  },
  security: {
    icon: ShieldCheck,
    ar: ["وصول محمي وتجربة مستقرة", "احتفظ بقوائمك وإعداداتك وتنبيهاتك في حساب واحد، واستعد تجربتك من جهازك بثقة ووضوح.", ["حساب واحد لتجربتك", "وصول محمي", "إعدادات محفوظة", "اشتراك واضح ومخصص"]],
    en: ["Protected access and a stable experience", "Keep your watchlists, preferences, and alerts in one account, and return to your experience with confidence and clarity.", ["One account for your experience", "Protected access", "Saved preferences", "Clear, personalized subscription"]],
  },
};

export default function Landing() {
  const { isArabic, theme, toggleLanguage, toggleTheme } = usePreferences();
  const [active, setActive] = useState("market");
  const item = sections[active];
  const Icon = item.icon;
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  const workflowSteps = [
    { icon: Database, title: isArabic ? "رصد مستمر" : "Continuous monitoring", body: isArabic ? "تبقى حركة السوق والأسعار المحدثة أمامك بوضوح." : "Keep updated prices and market movement clearly in view." },
    { icon: LineChart, title: isArabic ? "قراءة أوضح" : "Clearer insight", body: isArabic ? "تتحول البيانات إلى مؤشرات تساعدك على فهم الاتجاه بسرعة." : "Turn market data into indicators that help you understand direction faster." },
    { icon: Target, title: isArabic ? "مطابقة شروطك" : "Match your conditions", body: isArabic ? "تظهر لك الشركات الأقرب إلى استراتيجيتك وتفضيلاتك." : "See the companies that best match your strategy and preferences." },
    { icon: BellRing, title: isArabic ? "تنبيه في الوقت المناسب" : "A timely alert", body: isArabic ? "يصلك إشعار واضح عند تحقق شرطك لتراجع الفرصة دون تأخير." : "Receive a clear notification when your condition is met so you can review the opportunity promptly." },
  ];
  const tabLabels = isArabic
    ? { market: "الأسواق", chart: "الشارت والمؤشرات", alerts: "التنبيهات الذكية", security: "الحماية والأمان" }
    : { market: "Markets", chart: "Charts & indicators", alerts: "Smart alerts", security: "Security & access" };

  return <div className="landing-page">
    <header className="landing-header">
      <SessionLink to="/" className="brand-lockup"><span className="brand-mark"><BarChart3 size={19} /></span><span>{isArabic ? "المستثمر الذكي" : "Smart Investor"}<small>SI</small></span></SessionLink>
      <nav><a href="#platform">{isArabic ? "المزايا" : "Features"}</a><a href="#workflow">{isArabic ? "رحلة التنبيه" : "Alert journey"}</a><a href="#security">{isArabic ? "ابدأ الآن" : "Get started"}</a></nav>
      <div className="flex items-center gap-1"><button className="icon-button language-switch" onClick={toggleLanguage} aria-label={isArabic ? "Switch to English" : "التبديل إلى العربية"}>{isArabic ? "E" : "ع"}</button><button className="icon-button" onClick={toggleTheme} aria-label={isArabic ? "تبديل المظهر" : "Toggle theme"}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button><SessionLink to="/login" className="secondary-button">{isArabic ? "تسجيل الدخول" : "Sign in"}</SessionLink></div>
    </header>

    <main>
      <section className="hero-section">
        <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />
        <div className="relative z-10 mx-auto grid max-w-[1500px] items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div><span className="eyebrow"><Activity size={14} />{isArabic ? "المستثمر الذكي | منصتك المتكاملة للأسواق" : "Smart Investor | Your unified market platform"}</span><h1>{isArabic ? <>قراراتك الاستثمارية الأوضح.. تبدأ من <em>بيانات موثوقة.</em></> : <>Clearer investment decisions begin with <em>trusted market data.</em></>}</h1><p>{isArabic ? "شاشتك الموحدة لمتابعة السوق السعودي والأسهم الأمريكية المؤهلة لعقود الخيارات بوضوح أكبر. الأسعار المحدثة، وحركة الشموع، والمؤشرات، ومعلومات الشركات في مساحات مستقلة تساعدك على التركيز واكتشاف الفرص دون تشتت." : "Your unified view of the Saudi market and U.S. optionable stocks. Updated prices, candle movement, indicators, and company insights live in focused workspaces that help you spot opportunities without distraction."}</p><div className="mt-8 flex flex-wrap gap-3"><SessionLink to="/register" className="primary-button">{isArabic ? "ابدأ حسابك مجانًا" : "Create your free account"}<Arrow size={17} /></SessionLink><SessionLink to="/login" className="secondary-button">{isArabic ? "تسجيل الدخول" : "Sign in"}</SessionLink></div><div className="hero-trust">{(isArabic ? ["أسعار محدثة وبيانات سوق واضحة", "تحليلات ومعلومات شركات متكاملة", "تجربة مخصصة ووصول محمي"] : ["Updated prices and clear market data", "Integrated analysis and company insights", "A personalized experience with protected access"]).map((label) => <span key={label}><CheckCircle2 size={15} />{label}</span>)}</div></div>
          <div className="hero-console">
            <div className="console-top"><span className="console-source"><Database size={14} />{isArabic ? "بيانات واضحة" : "Clear data"}</span><b>{isArabic ? "متابعة الأسواق" : "Market overview"}</b><Activity size={17} /></div>
            <div className="console-grid"><div className="console-card console-wide"><span>{isArabic ? "مساحتك الاستثمارية" : "Your investing workspace"}</span><b>{isArabic ? "الشركات · القطاعات · الحركة" : "Companies · sectors · movers"}</b><div className="console-fields">{(isArabic ? ["الافتتاح والأعلى والأدنى والإغلاق", "الحجم والقيمة وعدد الصفقات", "وقت آخر تحديث وحالة البيانات"] : ["Open, high, low, and close", "Volume, value, and trades", "Last update and data status"]).map((label) => <span key={label}><CheckCircle2 size={14} />{label}</span>)}</div></div><div className="console-card"><Target /><span>{isArabic ? "مناطق الاستثمار" : "Investment zones"}</span><b>{isArabic ? "رؤية أوضح للمناطق المهمة" : "Key zones at a glance"}</b></div><div className="console-card"><BellRing /><span>{isArabic ? "تنبيهات ذكية" : "Smart alerts"}</span><b>{isArabic ? "شروطك وفرصك في مكان واحد" : "Your conditions in one place"}</b></div><div className="console-card console-wide"><LockKeyhole /><span>{isArabic ? "وصول محمي" : "Protected access"}</span><b>{isArabic ? "حسابك · قوائمك · إعداداتك" : "Your account · lists · preferences"}</b></div></div>
          </div>
        </div>
      </section>

      <section id="platform" className="landing-section">
        <div className="section-kicker"><Sparkles size={16} />{isArabic ? "تجربة استثمار متكاملة" : "A complete investing experience"}</div><h2>{isArabic ? "كل ما تحتاجه لتحليل السوق واكتشاف الفرص في مكان واحد" : "Everything you need to analyze markets and discover opportunities in one place"}</h2>
        <div className="landing-tabs">{Object.entries(sections).map(([key, value]) => { const TabIcon = value.icon; return <button key={key} onClick={() => setActive(key)} className={active === key ? "active" : ""}><TabIcon size={17} />{tabLabels[key]}</button>; })}</div>
        <div className="landing-feature-panel"><div><span className="feature-icon"><Icon size={25} /></span><h3>{isArabic ? item.ar[0] : item.en[0]}</h3><p>{isArabic ? item.ar[1] : item.en[1]}</p></div><div className="feature-checks">{(isArabic ? item.ar[2] : item.en[2]).map((label) => <span key={label}><CheckCircle2 size={17} />{label}</span>)}</div></div>
      </section>

      <section id="workflow" className="landing-section landing-section-muted"><div className="workflow-glow" /><div className="relative z-10"><div className="section-kicker"><BarChart3 size={16} />{isArabic ? "من البيانات إلى الفرصة" : "From market data to opportunity"}</div><h2>{isArabic ? "رحلة التنبيه الذكي.. من حركة السوق إلى إشعار واضح" : "The smart-alert journey—from market movement to a clear notification"}</h2><div className="workflow-grid">{workflowSteps.map(({ icon: StepIcon, title, body }, index) => <article key={title}><span>{index + 1}</span><StepIcon /><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>

      <section id="security" className="landing-section"><div className="cta-panel"><div><span className="section-kicker"><ShieldCheck size={16} />{isArabic ? "ابدأ رحلتك الاستثمارية اليوم" : "Start your investing journey today"}</span><h2>{isArabic ? "رؤية أوضح.. قرارات أسرع.. وثقة أكبر." : "Clearer insight. Faster decisions. Greater confidence."}</h2><p>{isArabic ? "لا تترك قرارك للتشتت. أنشئ حسابك، ورتّب قوائمك واستراتيجياتك، واجعل التنبيهات الذكية تتابع السوق معك." : "Leave distraction behind. Create your account, organize your watchlists and strategies, and let smart alerts follow the market with you."}</p></div><SessionLink to="/register" className="primary-button">{isArabic ? "إنشاء حساب جديد" : "Create a new account"}<Arrow size={17} /></SessionLink></div></section>
    </main>
    <footer className="landing-footer"><div className="brand-lockup"><span className="brand-mark"><BarChart3 size={18} /></span><span>{isArabic ? "المستثمر الذكي" : "Smart Investor"}<small>SI</small></span></div><p>{isArabic ? "المستثمر الذكي أداة لمراقبة وتحليل بيانات الأسواق المالية. المعلومات والتنبيهات المقدمة لأغراض معلوماتية وتحليلية، ولا تمثل توصية استثمارية أو مالية مباشرة." : "Smart Investor is a market-data monitoring and analysis tool. Its information and alerts are provided for informational and analytical purposes and do not constitute direct investment or financial advice."}</p></footer>
  </div>;
}
