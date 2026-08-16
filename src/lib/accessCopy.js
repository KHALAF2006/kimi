export const APPLICATION_STATUS = {
  ar: { referral_opened: "تم فتح رابط الإحالة", pending: "بانتظار مراجعة المالك", approved: "مقبول", rejected: "مرفوض", cancelled: "ملغي" },
  en: { referral_opened: "Referral opened", pending: "Awaiting owner review", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled" },
};

export const ACCOUNT_STATUS = {
  ar: { pending_verification: "بانتظار إكمال التسجيل", pending_owner_approval: "بانتظار موافقة المالك", active: "نشط", temporarily_blocked: "موقوف مؤقتاً", suspended: "معلّق", banned: "محظور", closed: "مغلق" },
  en: { pending_verification: "Registration incomplete", pending_owner_approval: "Awaiting owner approval", active: "Active", temporarily_blocked: "Temporarily blocked", suspended: "Suspended", banned: "Banned", closed: "Closed" },
};
export const SUBSCRIPTION_STATUS = {
  ar: { pending: "معلّق", active: "نشط", suspended: "موقوف", expired: "منتهي", banned: "محظور" },
  en: { pending: "Pending", active: "Active", suspended: "Suspended", expired: "Expired", banned: "Banned" },
};
export const COURSE_STATUS = {
  ar: { public: "عامة", market: "خاصة بسوق", draft: "مسودة", published: "منشورة", archived: "مؤرشفة", ready: "جاهز" },
  en: { public: "Public", market: "Market-only", draft: "Draft", published: "Published", archived: "Archived", ready: "Ready" },
};

const ERRORS = {
  ar: {
    RATE_LIMITED: "تم إرسال طلبات متتالية بسرعة. لم تتغير البيانات؛ انتظر لحظات ثم أعد المحاولة.",
    REVISION_CONFLICT: "تغيرت هذه البيانات في جلسة أخرى. حدّث القائمة ثم أعد التعديل.",
    APPLICATION_ALREADY_REVIEWED: "تمت مراجعة هذا الطلب مسبقاً. حدّث القائمة لرؤية حالته الحالية.",
    MARKET_SUBSCRIPTION_REQUIRED: "هذا السوق غير مفعّل لحسابك. قدّم طلب تفعيل أو تواصل مع الإدارة.",
    ACCOUNT_NOT_ACTIVE: "حسابك ما زال بانتظار موافقة المالك.",
    PENDING_APPLICATION_NOT_FOUND: "لا يوجد طلب معلق قابل للتعديل.",
    INVALID_PHONE: "أدخل رقم الجوال بصيغة دولية صحيحة.",
    PHONE_COUNTRY_MISMATCH: "رقم الجوال لا يطابق الدولة المسجلة.",
    SUBSCRIPTION_NOT_CONFIRMED: "لم يؤكد الخادم تفعيل الاشتراك؛ لم نعرض نجاحاً غير مؤكد.",
    ACCESS_SNAPSHOT_NOT_CONFIRMED: "تمت العملية جزئياً لكن صلاحية السوق لم تتأكد. راجع سجل العملية.",
    COURSE_ACCESS_EXPIRED: "انتهت مدة مشاهدة هذه الدورة بعد 10 أيام من أول مشاهدة.",
    COURSE_ACCESS_NOT_CONFIRMED: "لم يؤكد الخادم بدء مدة مشاهدة الدورة؛ لم يبدأ التشغيل.",
  },
  en: {
    RATE_LIMITED: "Requests were sent too quickly. No data was changed; wait briefly and try again.",
    REVISION_CONFLICT: "This record changed in another session. Refresh the list and try again.",
    APPLICATION_ALREADY_REVIEWED: "This application was already reviewed. Refresh to see its current state.",
    MARKET_SUBSCRIPTION_REQUIRED: "This market is not active for your account. Apply for access or contact support.",
    ACCOUNT_NOT_ACTIVE: "Your account is still awaiting owner approval.",
    PENDING_APPLICATION_NOT_FOUND: "There is no pending application available to edit.",
    INVALID_PHONE: "Enter a valid mobile number in international format.",
    PHONE_COUNTRY_MISMATCH: "The mobile number does not match your registered country.",
    SUBSCRIPTION_NOT_CONFIRMED: "The server did not confirm subscription activation; no unconfirmed success was shown.",
    ACCESS_SNAPSHOT_NOT_CONFIRMED: "The operation was partial, but market access was not confirmed. Review the operation log.",
    COURSE_ACCESS_EXPIRED: "This course's 10-day viewing period has ended.",
    COURSE_ACCESS_NOT_CONFIRMED: "The server did not confirm the course viewing period, so playback did not start.",
  },
};

export function localizedStatus(kind, value, language = "ar") {
  const table = kind === "account" ? ACCOUNT_STATUS : kind === "subscription" ? SUBSCRIPTION_STATUS : kind === "course" ? COURSE_STATUS : APPLICATION_STATUS;
  return table[language]?.[value] || table.en[value] || "—";
}

export function localizedAccessError(error, language = "ar", fallback = "") {
  const status = Number(error?.response?.status || error?.status || 0);
  const code = String(error?.response?.data?.code || error?.code || (status === 429 ? "RATE_LIMITED" : ""));
  return ERRORS[language]?.[code] || fallback || (language === "ar" ? "تعذر إكمال العملية. لم تتغير البيانات." : "The operation could not be completed. No data was changed.");
}
