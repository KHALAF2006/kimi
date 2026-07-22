import React from "react";
import { Link } from "react-router-dom";
import { Languages, Moon, Sun } from "lucide-react";
import { usePreferences } from "@/lib/preferences";

export default function AuthLayout({ icon: Icon, title, subtitle = "", footer = null, children }) {
  const { isArabic, toggleLanguage, theme, toggleTheme } = usePreferences();
  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(245,158,11,.14),transparent_32%),radial-gradient(circle_at_80%_85%,rgba(15,23,42,.08),transparent_35%)] dark:bg-[radial-gradient(circle_at_20%_10%,rgba(245,158,11,.12),transparent_32%)]" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" className="flex items-center gap-3 font-black"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-sm text-amber-400 dark:bg-amber-400 dark:text-slate-950">KMY</span><span>منصة كيمي</span></Link>
        <div className="flex gap-2"><button type="button" className="icon-button" onClick={toggleLanguage} aria-label={isArabic ? "Switch to English" : "التبديل إلى العربية"}><Languages size={17} /></button><button type="button" className="icon-button" onClick={toggleTheme} aria-label="theme">{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button></div>
      </header>
      <div className="relative mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-md items-center">
        <div className="w-full">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 shadow-lg shadow-amber-500/20">
            <Icon className="h-7 w-7 text-slate-950" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900">
          {children}
        </div>
        {footer && (
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</p>
        )}
        </div>
      </div>
    </div>
  );
}