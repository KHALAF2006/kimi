import React from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Home } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { SessionLink } from "@/components/SessionLink";
import { usePreferences } from "@/lib/preferences";

const ROUTES = {
  "/company": ["الشركة", "Company"],
  "/movers": ["الأكثر حركة", "Market movers"],
  "/screener": ["الاستراتيجيات", "Strategies"],
  "/search": ["البحث", "Search"],
  "/watchlists": ["المتابعة", "Watchlists"],
  "/alerts": ["التنبيهات الذكية", "Smart alerts"],
  "/destinations": ["قنوات التنبيه", "Alert channels"],
  "/profile": ["الحساب", "Account"],
  "/market-applications": ["طلبات الأسواق", "Market access"],
  "/courses": ["الدورات والتدريب", "Courses and training"],
  "/admin": ["الإدارة", "Administration"],
  "/admin/subscriptions": ["الاشتراكات والخطط", "Subscriptions and plans"],
  "/admin/customers": ["العملاء", "Customers"],
  "/admin/access": ["طلبات الوصول والمنصات", "Access and platforms"],
  "/admin/courses": ["إدارة الدورات", "Course management"],
  "/admin/quality": ["جودة البيانات", "Data quality"],
  "/admin/operations": ["تشغيل السوق", "Market operations"],
  "/admin/audit": ["سجل التدقيق", "Audit log"],
  "/admin/roles": ["الأدوار والصلاحيات", "Roles and permissions"],
};

function safeInternalPath(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "";
}

export default function PageNavigation({ fallbackTo = "/dashboard", hideOnDashboard = true }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isArabic } = usePreferences();
  if (hideOnDashboard && location.pathname === "/dashboard") return null;

  const remembered = safeInternalPath(location.state?.smartInvestorFrom);
  const parent = location.pathname.startsWith("/admin/") ? "/admin" : fallbackTo;
  const backTarget = remembered && remembered !== `${location.pathname}${location.search}${location.hash}` ? remembered : parent;
  const label = ROUTES[location.pathname]?.[isArabic ? 0 : 1] || (isArabic ? "الصفحة الحالية" : "Current page");
  const BackArrow = isArabic ? ArrowRight : ArrowLeft;
  const Separator = isArabic ? ChevronLeft : ChevronRight;

  return <div className="page-navigation-shell">
    <button type="button" className="page-back-button" onClick={() => navigate(backTarget)} aria-label={isArabic ? "الرجوع إلى الصفحة السابقة" : "Back to previous page"}>
      <BackArrow size={17} />
      <span>{isArabic ? "رجوع" : "Back"}</span>
    </button>
    <nav className="page-breadcrumb" aria-label={isArabic ? "مسار الصفحة" : "Breadcrumb"}>
      <SessionLink to="/dashboard"><Home size={14} /><span>{isArabic ? "الأسواق" : "Markets"}</span></SessionLink>
      {location.pathname.startsWith("/admin/") && <><Separator size={13} aria-hidden="true" /><SessionLink to="/admin">{isArabic ? "الإدارة" : "Administration"}</SessionLink></>}
      <Separator size={13} aria-hidden="true" />
      <span aria-current="page">{label}</span>
    </nav>
  </div>;
}
