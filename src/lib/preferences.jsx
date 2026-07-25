import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const PreferencesContext = createContext(null);

const copy = {
  ar: {
    market: "السوق", search: "البحث", watchlists: "المتابعة", alerts: "التنبيهات",
    account: "الحساب", screener: "الاستراتيجيات", dataQuality: "جودة البيانات",
    companies: "الشركات", movers: "الأكثر ارتفاعًا / انخفاضًا", momentum: "مناطق المستثمر",
  },
  en: {
    market: "Market", search: "Search", watchlists: "Watchlists", alerts: "Alerts",
    account: "Account", screener: "Strategies", dataQuality: "Data quality",
    companies: "Companies", movers: "Gainers / Losers", momentum: "Investor zones",
  },
};

export function PreferencesProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("kmy_language") || "ar");
  const [theme, setTheme] = useState(() => localStorage.getItem("kmy_theme") || "light");

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = language === "ar" ? "rtl" : "ltr";
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("kmy_language", language);
    localStorage.setItem("kmy_theme", theme);
  }, [language, theme]);

  const value = useMemo(() => ({
    language,
    theme,
    isArabic: language === "ar",
    text: copy[language],
    toggleLanguage: () => setLanguage((value) => value === "ar" ? "en" : "ar"),
    toggleTheme: () => setTheme((value) => value === "dark" ? "light" : "dark"),
  }), [language, theme]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences must be used inside PreferencesProvider");
  return value;
}
