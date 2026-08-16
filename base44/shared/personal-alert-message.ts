const MARKET_DETAILS = {
  SA_MAIN: { name_ar: "السوق السعودية الرئيسية", name_en: "Saudi Main Market", currency: "SAR" },
  US_OPTIONS: { name_ar: "شركات عقود الخيارات", name_en: "U.S. Optionable Companies", currency: "USD" },
  US_BENCHMARKS: { name_ar: "المؤشرات والصناديق الأمريكية", name_en: "U.S. Indices & ETFs", currency: "USD" },
};

const CONDITION_COPY = {
  crosses_above: { ar: "اخترق السعر القيمة المحددة صعوداً", en: "Price crossed above your threshold" },
  crosses_below: { ar: "كسر السعر القيمة المحددة هبوطاً", en: "Price crossed below your threshold" },
  crosses_drawing: { ar: "تقاطع السعر مع الرسم المحدد", en: "Price crossed your drawing" },
  crosses_drawing_above: { ar: "اخترق السعر الرسم المحدد صعوداً", en: "Price crossed above your drawing" },
  crosses_drawing_below: { ar: "كسر السعر الرسم المحدد هبوطاً", en: "Price crossed below your drawing" },
};

function rows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

function validObservedAt(value) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

export async function queuePersonalAlertMessage(base44, rule, quote, bucket, options = {}) {
  const marketCode = String(rule?.market_code || "").trim().toUpperCase();
  const details = MARKET_DETAILS[marketCode];
  const observedAt = validObservedAt(quote?.provider_as_of || quote?.source_time || quote?.quote_time);
  const triggerPrice = Number(quote?.last_price);
  if (!rule?.id || !rule.customer_id || !details || !observedAt || !Number.isFinite(triggerPrice)) {
    return { created: false, reason: "invalid_alert_identity" };
  }
  if (quote?.market_code && quote.market_code !== marketCode) {
    return { created: false, reason: "market_mismatch" };
  }

  const [profile, subscriptions, instrument] = await Promise.all([
    base44.asServiceRole.entities.CustomerProfile.get(rule.customer_id).catch(() => null),
    base44.asServiceRole.entities.Subscription.filter({ customer_id: rule.customer_id, market_code: marketCode, status: "active" }, "-updated_date", 100),
    base44.asServiceRole.entities.Instrument.get(rule.instrument_id).catch(() => null),
  ]);
  const now = Date.now();
  const hasAccess = rows(subscriptions).some((subscription) => !subscription.ends_at || Date.parse(subscription.ends_at) > now);
  if (!profile || profile.role !== "user" || profile.account_status !== "active" || !profile.auth_user_id || !hasAccess) {
    return { created: false, reason: "recipient_not_entitled" };
  }
  if (!instrument || instrument.market_code !== marketCode || instrument.symbol !== rule.symbol) {
    return { created: false, reason: "instrument_market_mismatch" };
  }

  const dedupeKey = `personal-alert:${rule.id}:${bucket}`;
  const existing = rows(await base44.asServiceRole.entities.Message.filter({ dedupe_key: dedupeKey }, "-created_date", 1));
  if (existing.length) return { created: false, reason: "duplicate", message: existing[0] };

  const condition = CONDITION_COPY[rule.condition] || { ar: "تحقق شرط التنبيه الذي حددته", en: "Your alert condition was met" };
  const threshold = Number(options.threshold ?? rule.threshold);
  const thresholdAr = Number.isFinite(threshold) ? `، والقيمة المحددة ${threshold.toFixed(2)} ${details.currency}` : "";
  const thresholdEn = Number.isFinite(threshold) ? `, with a threshold of ${threshold.toFixed(2)} ${details.currency}` : "";
  const symbol = String(rule.symbol || instrument.symbol);
  const instrumentAr = instrument.name_ar || instrument.name_en || symbol;
  const instrumentEn = instrument.name_en || instrument.name_ar || symbol;
  const message = await base44.asServiceRole.entities.Message.create({
    recipient_auth_user_id: profile.auth_user_id,
    recipient_customer_id: profile.id,
    message_type: "system",
    priority: "important",
    title_ar: `تحقق تنبيهك على ${symbol}`,
    title_en: `Your ${symbol} alert was triggered`,
    body_ar: `${condition.ar} في ${instrumentAr}. سعر التحقق ${triggerPrice.toFixed(2)} ${details.currency}${thresholdAr}.`,
    body_en: `${condition.en} for ${instrumentEn}. Trigger price: ${triggerPrice.toFixed(2)} ${details.currency}${thresholdEn}.`,
    action_path: `/company?symbol=${encodeURIComponent(symbol)}&market=${encodeURIComponent(marketCode)}`,
    feed_eligible: true,
    dedupe_key: dedupeKey,
    expires_at: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  return { created: true, reason: "created", message, observed_at: observedAt };
}
