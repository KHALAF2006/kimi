import React from "react";
import { Outlet } from "react-router-dom";
import { SessionNavLink } from "@/components/SessionLink";
import { BarChart3, Bell, Eye, LogOut, Moon, Search, Settings, ShieldCheck, Sparkles, Sun } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usePreferences } from "@/lib/preferences";
import { useAuthorization } from "@/lib/AuthorizationContext";

export default function KmyLayout() {
  const { text, isArabic, theme, toggleLanguage, toggleTheme } = usePreferences();
  const { can } = useAuthorization();
  const links = [
    ["/dashboard", text.market, BarChart3],
    ["/search", text.search, Search],
    ["/screener", text.screener, Sparkles],
    ["/watchlists", text.watchlists, Eye],
    ["/alerts", text.alerts, Bell],
    ["/profile", text.account, Settings],
  ];
  if (can("dashboard.owner.read")) links.push(["/admin", isArabic ? "الإدارة" : "Admin", ShieldCheck]);

  return <div className="min-h-screen bg-slate-50 text-slate-950 transition-colors dark:bg-[#08111f] dark:text-slate-100">
    <header className="app-header">
      <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-3 py-3 sm:px-5">
        <SessionNavLink to="/dashboard" className="brand-lockup" aria-label={isArabic ? "المستثمر الذكي" : "Smart Investor"}><span className="brand-mark"><BarChart3 size={19} /></span><span>{isArabic ? "المستثمر الذكي" : "Smart Investor"}<small>SI</small></span></SessionNavLink>
        <nav className="app-nav">{links.map(([to, label, Icon]) => <SessionNavLink key={to} to={to} className={({ isActive }) => isActive ? "active" : ""}><Icon size={16} /><span>{label}</span></SessionNavLink>)}</nav>
        <div className="ms-auto flex items-center gap-1">
          <button className="icon-button language-switch" onClick={toggleLanguage} title={isArabic ? "English" : "العربية"} aria-label={isArabic ? "Switch to English" : "التبديل إلى العربية"}>{isArabic ? "E" : "ع"}</button>
          <button className="icon-button" onClick={toggleTheme} title={isArabic ? "تغيير المظهر" : "Change theme"}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
          <button aria-label={isArabic ? "تسجيل الخروج" : "Sign out"} onClick={() => { localStorage.removeItem("kmy_session_id"); localStorage.removeItem("kmy_session_expires_at"); window.dispatchEvent(new Event("kmy-auth-changed")); base44.auth.logout("/"); }} className="icon-button"><LogOut size={17} /></button>
        </div>
      </div>
    </header>
    <main><Outlet /></main>
  </div>;
}
