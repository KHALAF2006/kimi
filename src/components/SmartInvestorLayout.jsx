import React from "react";
import { Outlet } from "react-router-dom";
import { SessionNavLink } from "@/components/SessionLink";
import { BarChart3, Bell, BookOpen, Eye, KeyRound, LogOut, MessageCircleMore, Moon, RadioTower, Search, Settings, ShieldCheck, Sparkles, Sun } from "lucide-react";
import MarketAccessSelect from "@/components/MarketAccessSelect";
import { base44 } from "@/api/base44Client";
import { usePreferences } from "@/lib/preferences";
import { useAuthorization } from "@/lib/AuthorizationContext";
import NotificationCenter from "@/components/NotificationCenter";
import IdentityWatermark from "@/components/IdentityWatermark";
import PageNavigation from "@/components/PageNavigation";

export default function SmartInvestorLayout() {
  const { text, isArabic, theme, toggleLanguage, toggleTheme } = usePreferences();
  const { can } = useAuthorization();
  const links = [
    ["/dashboard", text.market, BarChart3],
    ["/search", text.search, Search],
    ["/screener", text.screener, Sparkles],
    ["/watchlists", text.watchlists, Eye],
    ["/alerts", text.alerts, Bell],
    ["/profile", text.account, Settings],
    ["/messages", isArabic ? "الرسائل" : "Messages", MessageCircleMore],
    ["/market-applications", isArabic ? "طلبات الأسواق" : "Market access", KeyRound],
    ["/courses", isArabic ? "الدورات" : "Courses", BookOpen],
  ];
  if (can("dashboard.owner.read")) links.push(["/admin", isArabic ? "الإدارة" : "Admin", ShieldCheck]);
  if (can("delivery.channels.manage")) links.push(["/admin/delivery", isArabic ? "قنوات الإرسال" : "Delivery channels", RadioTower]);

  return <div className="min-h-screen bg-slate-50 text-slate-950 transition-colors dark:bg-[#08111f] dark:text-slate-100">
    <header className="app-header">
      <div className="app-header-inner mx-auto flex max-w-[1800px] items-center gap-3 px-3 py-3 sm:px-5">
        <SessionNavLink to="/dashboard" className="brand-lockup" aria-label={isArabic ? "المستثمر الذكي" : "Smart Investor"}><span className="brand-mark"><BarChart3 size={19} /></span><span>{isArabic ? "المستثمر الذكي" : "Smart Investor"}<small>SI</small></span></SessionNavLink>
        <nav className="app-nav">{links.map(([to, label, Icon]) => <SessionNavLink key={to} to={to} className={({ isActive }) => isActive ? "active" : ""}><Icon size={16} /><span>{label}</span></SessionNavLink>)}</nav>
        <div className="app-header-actions ms-auto flex items-center gap-1">
          <MarketAccessSelect compact />
          <NotificationCenter />
          <button className="icon-button language-switch" onClick={toggleLanguage} title={isArabic ? "English" : "العربية"} aria-label={isArabic ? "Switch to English" : "التبديل إلى العربية"}>{isArabic ? "E" : "ع"}</button>
          <button className="icon-button" onClick={toggleTheme} title={isArabic ? "تغيير المظهر" : "Change theme"}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
          <button aria-label={isArabic ? "تسجيل الخروج" : "Sign out"} onClick={async () => { const sessionId = localStorage.getItem("smart_investor_session_id"); const deviceId = localStorage.getItem("smart_investor_device_id"); try { if (sessionId) await base44.functions.invoke("authLogin", { action: "logout", session_id: sessionId, device_id: deviceId }); } finally { localStorage.removeItem("smart_investor_session_id"); localStorage.removeItem("smart_investor_session_expires_at"); window.dispatchEvent(new Event("smart_investor-auth-changed")); await base44.auth.logout("/"); } }} className="icon-button"><LogOut size={17} /></button>
        </div>
      </div>
    </header>
    <IdentityWatermark />
    <main><PageNavigation /><Outlet /></main>
  </div>;
}
