function duplicateError(message, code, status = 409) {
  throw Object.assign(new Error(message), { code, status });
}

async function ensureConsent(base44, customerId, channel, purpose, values) {
  const rows = await base44.asServiceRole.entities.CustomerConsent.filter({ customer_id: customerId, channel, purpose });
  return rows[0] || await base44.asServiceRole.entities.CustomerConsent.create({
    customer_id: customerId,
    channel,
    purpose,
    ...values,
  });
}

async function ensureNotificationPreference(base44, customerId, authUserId) {
  const rows = await base44.asServiceRole.entities.NotificationPreference.filter({ customer_id: customerId });
  return rows[0] || await base44.asServiceRole.entities.NotificationPreference.create({
    customer_id: customerId,
    auth_user_id: authUserId,
    feed_enabled: true,
    messages_enabled: true,
    revision: 1,
  });
}

async function ensureOwnerMessage(base44, owner, profile, application) {
  const dedupeKey = `registration:${application.id}`;
  const existing = await base44.asServiceRole.entities.Message.filter({ dedupe_key: dedupeKey });
  return existing[0] || await base44.asServiceRole.entities.Message.create({
    recipient_auth_user_id: owner.auth_user_id,
    recipient_customer_id: owner.id,
    message_type: "registration",
    priority: "important",
    title_ar: "تسجيل عميل جديد",
    title_en: "New customer registration",
    body_ar: `سجّل ${profile.full_name} وطلب الوصول إلى ${application.market_code}. رقم الطلب: ${application.unique_reference}`,
    body_en: `${profile.full_name} registered and requested access to ${application.market_code}. Reference: ${application.unique_reference}`,
    action_path: `/admin/customers?application=${application.id}`,
    feed_eligible: true,
    dedupe_key: dedupeKey,
  });
}

export async function uniqueCustomerNumber(base44, year = new Date().getUTCFullYear()) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = `SI-${year}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
    const existing = await base44.asServiceRole.entities.CustomerProfile.filter({ customer_number: candidate });
    if (!existing[0]) return candidate;
  }
  throw Object.assign(new Error("Unable to allocate a unique customer number"), { code: "CUSTOMER_NUMBER_ALLOCATION_FAILED", status: 503 });
}

export async function reconcileRegistrationGraph(base44, input) {
  const { user, owner, platform, values, now, allocateReference } = input;
  if (!owner?.id || !owner?.auth_user_id) {
    throw Object.assign(new Error("Registration administration is temporarily unavailable"), { code: "OWNER_NOTIFICATION_TARGET_MISSING", status: 503 });
  }

  const profiles = await base44.asServiceRole.entities.CustomerProfile.filter({ auth_user_id: user.id });
  let profile = profiles[0] || null;
  let profileCreated = false;
  if (profiles.length > 1) duplicateError("Duplicate customer profile detected", "DUPLICATE_CUSTOMER_PROFILE");
  if (profile && profile.role !== "user") duplicateError("This identity cannot be used for customer registration", "IDENTITY_ROLE_CONFLICT", 403);

  if (!profile) {
    profile = await base44.asServiceRole.entities.CustomerProfile.create({
      customer_number: await uniqueCustomerNumber(base44),
      auth_user_id: user.id,
      email_normalized: values.email,
      phone_e164: values.phone,
      full_name: values.fullName,
      country_code: values.country,
      preferred_language: values.language,
      account_status: "pending_owner_approval",
      role: "user",
      tags: ["email_verified", "phone_provided_unverified", "owner_approval_required"],
      email_verified_at: now,
      phone_accuracy_acknowledged_at: now,
      marketing_consent_at: now,
      terms_version: values.termsVersion,
      name_last_updated_at: now,
      feed_enabled: true,
      last_seen_at: now,
      registration_state: "profile_created",
    });
    profileCreated = true;
  }

  const canonical = profileCreated ? values : {
    ...values,
    email: profile.email_normalized,
    phone: profile.phone_e164,
    fullName: profile.full_name,
    country: profile.country_code,
    language: profile.preferred_language,
  };

  let applications = await base44.asServiceRole.entities.MarketAccessApplication.filter({ customer_id: profile.id });
  let application = applications[0] || null;
  let applicationCreated = false;
  if (!application) {
    application = await base44.asServiceRole.entities.MarketAccessApplication.create({
      unique_reference: await allocateReference(base44, canonical.marketCode),
      customer_id: profile.id,
      auth_user_id: user.id,
      trading_platform_id: platform.id,
      market_code: canonical.marketCode,
      status: "pending",
      full_name_snapshot: canonical.fullName,
      email_snapshot: canonical.email,
      phone_snapshot: canonical.phone,
      platform_name_ar_snapshot: platform.name_ar,
      platform_name_en_snapshot: platform.name_en,
      referral_url_snapshot: platform.referral_url,
      referral_clicked_at: now,
      referral_click_count: 1,
      customer_confirmed_at: now,
      cooldown_until: canonical.cooldownUntil,
      revision: 1,
    });
    applications = [application];
    applicationCreated = true;
  }

  await ensureConsent(base44, profile.id, "email", "service_and_marketing", {
    status: "granted",
    source: "registration_required_checkbox",
    captured_at: now,
  });
  await ensureConsent(base44, profile.id, "whatsapp", "training_and_account_contact", {
    status: "granted",
    source: "customer_provided_mobile",
    captured_at: now,
  });
  await ensureNotificationPreference(base44, profile.id, user.id);
  const ownerMessage = await ensureOwnerMessage(base44, owner, profile, application);

  profile = await base44.asServiceRole.entities.CustomerProfile.update(profile.id, {
    registration_state: "completed",
    registration_completed_at: profile.registration_completed_at || now,
    initial_application_id: profile.initial_application_id || application.id,
    last_seen_at: now,
  });

  return {
    profile,
    application,
    applications,
    ownerMessage,
    created: { profile: profileCreated, application: applicationCreated },
  };
}
