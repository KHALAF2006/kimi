export const PERMISSION_CATALOG = [
  { code: "dashboard.owner.read", group_code: "dashboard", name_ar: "عرض لوحة المالك", name_en: "View owner dashboard", sensitive: true, owner_only: false },
  { code: "customers.masked.read", group_code: "customers", name_ar: "عرض بيانات العملاء المقنّعة", name_en: "View masked customer data", sensitive: true, owner_only: true },
  { code: "customers.full.read", group_code: "customers", name_ar: "عرض بيانات العملاء الكاملة", name_en: "View full customer data", sensitive: true, owner_only: true },
  { code: "customers.status.manage", group_code: "customers", name_ar: "إدارة حالة العميل", name_en: "Manage customer status", sensitive: true, owner_only: true },
  { code: "customers.sessions.revoke", group_code: "customers", name_ar: "إلغاء جلسات العملاء", name_en: "Revoke customer sessions", sensitive: true, owner_only: true },
  { code: "customers.notes.manage", group_code: "customers", name_ar: "إدارة ملاحظات العملاء", name_en: "Manage customer notes", sensitive: true, owner_only: true },
  { code: "subscriptions.read", group_code: "subscriptions", name_ar: "عرض الاشتراكات", name_en: "View subscriptions", sensitive: false, owner_only: false },
  { code: "subscriptions.manage", group_code: "subscriptions", name_ar: "إدارة الاشتراكات", name_en: "Manage subscriptions", sensitive: true, owner_only: false },
  { code: "plans.manage", group_code: "subscriptions", name_ar: "إدارة الخطط والحدود", name_en: "Manage plans and entitlements", sensitive: true, owner_only: true },
  { code: "data.operations.read", group_code: "data", name_ar: "عرض تشغيل البيانات", name_en: "View data operations", sensitive: false, owner_only: false },
  { code: "data.ingestion.run", group_code: "data", name_ar: "تشغيل جلب البيانات", name_en: "Run data ingestion", sensitive: true, owner_only: false },
  { code: "data.quality.manage", group_code: "data", name_ar: "معالجة جودة البيانات", name_en: "Manage data quality", sensitive: true, owner_only: false },
  { code: "alerts.operations.read", group_code: "alerts", name_ar: "عرض تشغيل التنبيهات", name_en: "View alert operations", sensitive: false, owner_only: false },
  { code: "alerts.operations.manage", group_code: "alerts", name_ar: "إدارة تشغيل التنبيهات", name_en: "Manage alert operations", sensitive: true, owner_only: false },
  { code: "audit.read", group_code: "audit", name_ar: "عرض سجل التدقيق", name_en: "View audit log", sensitive: true, owner_only: false },
  { code: "audit.export", group_code: "audit", name_ar: "تصدير سجل التدقيق", name_en: "Export audit log", sensitive: true, owner_only: true },
  { code: "roles.manage", group_code: "administration", name_ar: "إدارة الأدوار والصلاحيات", name_en: "Manage roles and permissions", sensitive: true, owner_only: true },
  { code: "settings.manage", group_code: "administration", name_ar: "إدارة إعدادات النظام", name_en: "Manage system settings", sensitive: true, owner_only: true },
].map((permission) => ({ ...permission, active: true }));

export const PERMISSION_CODES = new Set(PERMISSION_CATALOG.map((permission) => permission.code));

export const LEGACY_ROLE_PERMISSIONS = {
  support: ["dashboard.owner.read"],
  admin: [
    "dashboard.owner.read",
    "subscriptions.read",
    "subscriptions.manage",
    "data.operations.read",
    "data.ingestion.run",
    "data.quality.manage",
    "alerts.operations.read",
    "alerts.operations.manage",
    "audit.read",
  ],
};

export const RESERVED_ROLE_TEMPLATES = [
  { code: "support_agent", name_ar: "موظف الدعم", name_en: "Support Agent", permissions: ["dashboard.owner.read"] },
  { code: "subscription_manager", name_ar: "مدير الاشتراكات", name_en: "Subscription Manager", permissions: ["dashboard.owner.read", "subscriptions.read", "subscriptions.manage"] },
  { code: "data_operator", name_ar: "مشغل بيانات السوق", name_en: "Market Data Operator", permissions: ["dashboard.owner.read", "data.operations.read", "data.ingestion.run", "data.quality.manage", "alerts.operations.read"] },
  { code: "compliance_auditor", name_ar: "مراقب الامتثال", name_en: "Compliance Auditor", permissions: ["dashboard.owner.read", "subscriptions.read", "audit.read"] },
];

export const ENTITLEMENT_CODES = new Set([
  "market.saudi",
  "market.saudi.delayed",
  "market.saudi.realtime",
  "market.us.options",
  "market.us.benchmarks",
  "market.gcc.delayed",
  "charts.drawings",
  "charts.saved_layouts",
  "watchlists",
  "alerts",
  "screener.advanced",
  "exports",
]);
