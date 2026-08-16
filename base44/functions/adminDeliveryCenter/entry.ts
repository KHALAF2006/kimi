import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, authorizationContext, MARKET_ACCESS, readJsonBody, replyError, sha256 } from "../../shared/security.ts";

const CHANNEL_PERMISSION = "delivery.channels.manage";
const EMAIL_PERMISSION = "email.campaigns.manage";
const CAMPAIGN_BODY_BYTES = 4 * 1024 * 1024;
const EMAIL_BATCH_SIZE = 20;

function fail(message, code, status = 400) {
  throw Object.assign(new Error(message), { code, status });
}

function cleanText(value, field, min, max) {
  const result = String(value || "").trim();
  if (result.length < min || result.length > max) fail(`${field} is invalid`, "INVALID_FIELD");
  return result;
}

function marketCodes(value) {
  const codes = [...new Set((Array.isArray(value) ? value : []).map((item) => String(item || "").trim().toUpperCase()))];
  if (!codes.length || codes.some((code) => !MARKET_ACCESS[code])) fail("Unsupported market", "UNSUPPORTED_MARKET");
  return codes;
}

function ownerPermission(context, permission) {
  if (context.role !== "owner" || !context.permissions.has(permission)) fail("Owner access required", "OWNER_REQUIRED", 403);
}

function safeChannel(row) {
  const { secret_ref: _secretRef, ...safe } = row;
  return { ...safe, secret_name: row.secret_ref, secret_configured: Boolean(row.secret_ref && Deno.env.get(row.secret_ref)) };
}

function channelPayload(body) {
  const channel = ["telegram", "whatsapp"].includes(body.channel) ? body.channel : fail("Unsupported channel", "UNSUPPORTED_CHANNEL");
  const market_code = marketCodes([body.market_code])[0];
  const external_id = cleanText(body.external_id, "external_id", 2, 160);
  if (channel === "telegram" && !/^(@[A-Za-z0-9_]{5,32}|-100\d{6,20})$/.test(external_id)) fail("Invalid Telegram chat", "INVALID_TELEGRAM_CHAT");
  if (channel === "whatsapp" && !/^\d{5,40}$/.test(external_id)) fail("Invalid WhatsApp phone number ID", "INVALID_WHATSAPP_PHONE_ID");
  const secret_ref = cleanText(body.secret_ref, "secret_ref", 3, 100);
  if (!/^[A-Z][A-Z0-9_]{2,99}$/.test(secret_ref)) fail("Invalid secret reference", "INVALID_SECRET_REFERENCE");
  const configuration = channel === "whatsapp" ? {
    graph_version: /^v\d+\.\d+$/.test(String(body.configuration?.graph_version || "")) ? String(body.configuration.graph_version) : "v23.0",
    template_name: cleanText(body.configuration?.template_name, "template_name", 2, 120),
    template_language: cleanText(body.configuration?.template_language || "ar", "template_language", 2, 20),
  } : {};
  return { channel, market_code, label: cleanText(body.label, "label", 2, 100), external_id, secret_ref, configuration };
}

async function eligibleRecipients(base44, codes) {
  const now = Date.now();
  const byCustomer = new Map();
  for (const marketCode of codes) {
    const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ market_code: marketCode, status: "active" }, "-updated_date", 5000);
    for (const subscription of subscriptions) {
      if (subscription.ends_at && new Date(subscription.ends_at).getTime() <= now) continue;
      const current = byCustomer.get(subscription.customer_id) || new Set();
      current.add(marketCode);
      byCustomer.set(subscription.customer_id, current);
    }
  }
  const recipients = [];
  for (const [customerId, markets] of byCustomer) {
    let profile;
    try { profile = await base44.asServiceRole.entities.CustomerProfile.get(customerId); } catch { profile = null; }
    if (!profile || profile.role !== "user" || profile.account_status !== "active" || !profile.auth_user_id || !profile.marketing_consent_at) continue;
    const email = String(profile.email_normalized || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    recipients.push({ customer_id: profile.id, auth_user_id: profile.auth_user_id, email, market_codes: [...markets].sort() });
  }
  recipients.sort((a, b) => a.email.localeCompare(b.email, "en"));
  return recipients;
}

async function listState(base44) {
  const [channels, campaigns, completedRuns, pendingEvents, retryEvents] = await Promise.all([
    base44.asServiceRole.entities.DeliveryChannel.list("-updated_date", 500),
    base44.asServiceRole.entities.EmailCampaign.list("-created_date", 100),
    base44.asServiceRole.entities.AuditLog.filter({ action: "delivery.worker.completed" }, "-created_date", 1),
    base44.asServiceRole.entities.DeliveryEvent.filter({ status: "pending" }, "created_date", 500),
    base44.asServiceRole.entities.DeliveryEvent.filter({ status: "retry" }, "next_attempt_at", 500),
  ]);
  const latestRun = completedRuns[0] || null;
  return {
    markets: Object.entries(MARKET_ACCESS).map(([market_code, value]) => ({ market_code, ...value })),
    channels: channels.map(safeChannel),
    campaigns: campaigns.map(({ body: _body, ...campaign }) => campaign),
    email_batch_size: EMAIL_BATCH_SIZE,
    worker_health: {
      has_completed_run: Boolean(latestRun),
      last_completed_at: latestRun?.created_date || null,
      last_result: latestRun?.result || null,
      last_summary: latestRun?.reason || "",
      pending_count: pendingEvents.length,
      retry_count: retryEvents.length,
      counts_capped: pendingEvents.length >= 500 || retryEvents.length >= 500,
    },
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req, CAMPAIGN_BODY_BYTES);
    const context = await authorizationContext(base44, body.session_id, body.device_id);
    if (body.action === "list") {
      ownerPermission(context, CHANNEL_PERMISSION);
      return Response.json(await listState(base44));
    }
    if (body.action === "save_channel") {
      ownerPermission(context, CHANNEL_PERMISSION);
      const payload = channelPayload(body);
      let channel;
      if (body.channel_id) {
        const current = await base44.asServiceRole.entities.DeliveryChannel.get(String(body.channel_id));
        if (!current) fail("Channel not found", "CHANNEL_NOT_FOUND", 404);
        if (Number(body.revision) !== Number(current.revision)) fail("Channel changed in another session", "REVISION_CONFLICT", 409);
        channel = await base44.asServiceRole.entities.DeliveryChannel.update(current.id, { ...payload, active: false, verified_at: null, last_verified_by_user_id: null, revision: current.revision + 1 });
        await audit(base44, context.user.id, "delivery.channel.updated", "DeliveryChannel", channel.id, "success", `market:${payload.market_code}`, safeChannel(current), safeChannel(channel));
      } else {
        const duplicates = await base44.asServiceRole.entities.DeliveryChannel.filter({ channel: payload.channel, market_code: payload.market_code, external_id: payload.external_id });
        if (duplicates.length) fail("Channel already exists", "CHANNEL_DUPLICATE", 409);
        channel = await base44.asServiceRole.entities.DeliveryChannel.create({ ...payload, active: false, revision: 1 });
        await audit(base44, context.user.id, "delivery.channel.created", "DeliveryChannel", channel.id, "success", `market:${payload.market_code}`);
      }
      return Response.json({ channel: safeChannel(channel) });
    }
    if (body.action === "verify_channel") {
      ownerPermission(context, CHANNEL_PERMISSION);
      const channel = await base44.asServiceRole.entities.DeliveryChannel.get(String(body.channel_id || ""));
      if (!channel) fail("Channel not found", "CHANNEL_NOT_FOUND", 404);
      const token = Deno.env.get(channel.secret_ref);
      if (!token) fail("Channel secret is not configured", "SECRET_NOT_CONFIGURED", 409);
      let response;
      if (channel.channel === "telegram") {
        response = await fetch(`https://api.telegram.org/bot${token}/getChat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: channel.external_id }) });
      } else {
        response = await fetch(`https://graph.facebook.com/${channel.configuration?.graph_version || "v23.0"}/${channel.external_id}`, { headers: { authorization: `Bearer ${token}` } });
      }
      const result = await response.json();
      if (!response.ok || result?.ok === false || result?.error) fail("Provider verification failed", "PROVIDER_VERIFICATION_FAILED", 422);
      const verified = await base44.asServiceRole.entities.DeliveryChannel.update(channel.id, { verified_at: new Date().toISOString(), last_verified_by_user_id: context.user.id, active: true, revision: Number(channel.revision) + 1 });
      await audit(base44, context.user.id, "delivery.channel.verified", "DeliveryChannel", channel.id, "success", `market:${channel.market_code}`);
      return Response.json({ channel: safeChannel(verified) });
    }
    if (body.action === "toggle_channel") {
      ownerPermission(context, CHANNEL_PERMISSION);
      const channel = await base44.asServiceRole.entities.DeliveryChannel.get(String(body.channel_id || ""));
      if (!channel) fail("Channel not found", "CHANNEL_NOT_FOUND", 404);
      const active = Boolean(body.active);
      if (active && !channel.verified_at) fail("Verify channel before activation", "CHANNEL_NOT_VERIFIED", 422);
      const updated = await base44.asServiceRole.entities.DeliveryChannel.update(channel.id, { active, revision: Number(channel.revision) + 1 });
      await audit(base44, context.user.id, "delivery.channel.toggled", "DeliveryChannel", channel.id, "success", active ? "active" : "inactive", { active: channel.active }, { active });
      return Response.json({ channel: safeChannel(updated) });
    }
    if (body.action === "delete_channel") {
      ownerPermission(context, CHANNEL_PERMISSION);
      const channel = await base44.asServiceRole.entities.DeliveryChannel.get(String(body.channel_id || ""));
      if (!channel) fail("Channel not found", "CHANNEL_NOT_FOUND", 404);
      const pending = await base44.asServiceRole.entities.DeliveryEvent.filter({ destination_id: channel.id, status: "pending" });
      const retry = await base44.asServiceRole.entities.DeliveryEvent.filter({ destination_id: channel.id, status: "retry" });
      if (pending.length || retry.length) fail("Channel has pending deliveries", "CHANNEL_HAS_PENDING_DELIVERIES", 409);
      await base44.asServiceRole.entities.DeliveryChannel.delete(channel.id);
      await audit(base44, context.user.id, "delivery.channel.deleted", "DeliveryChannel", channel.id, "success", `market:${channel.market_code}`, safeChannel(channel), {});
      return Response.json({ removed: true });
    }
    if (body.action === "preview_campaign") {
      ownerPermission(context, EMAIL_PERMISSION);
      const codes = marketCodes(body.market_codes);
      const recipients = await eligibleRecipients(base44, codes);
      const counts = Object.fromEntries(codes.map((code) => [code, recipients.filter((recipient) => recipient.market_codes.includes(code)).length]));
      return Response.json({ market_codes: codes, recipient_count: recipients.length, counts, estimated_integration_credits_default_domain: recipients.length, estimated_integration_credits_custom_domain: recipients.length * 2 });
    }
    if (body.action === "create_campaign") {
      ownerPermission(context, EMAIL_PERMISSION);
      const codes = marketCodes(body.market_codes);
      const title = cleanText(body.title, "title", 2, 140);
      const subject = cleanText(body.subject, "subject", 2, 200);
      const content = String(body.body || "").replace(/\r\n?/g, "\n").trim();
      if (!content || content.length > 2_000_000 || content.split("\n").length > 20_000) fail("Email body exceeds the supported limit", "CAMPAIGN_BODY_TOO_LARGE", 413);
      const recipients = await eligibleRecipients(base44, codes);
      if (!recipients.length) fail("No eligible recipients", "NO_ELIGIBLE_RECIPIENTS", 422);
      const campaign = await base44.asServiceRole.entities.EmailCampaign.create({ title, subject, body: content, market_codes: codes, status: "ready", recipient_count: recipients.length, sent_count: 0, failed_count: 0, created_by_user_id: context.user.id, revision: 1 });
      const rows = [];
      for (const recipient of recipients) rows.push({ ...recipient, campaign_id: campaign.id, status: "pending", attempt_count: 0, dedupe_key: await sha256(`${campaign.id}:${recipient.customer_id}:${recipient.email}`) });
      for (let index = 0; index < rows.length; index += 50) await base44.asServiceRole.entities.EmailCampaignRecipient.bulkCreate(rows.slice(index, index + 50));
      await audit(base44, context.user.id, "email.campaign.created", "EmailCampaign", campaign.id, "success", `markets:${codes.join(",")};recipients:${rows.length}`);
      return Response.json({ campaign: { ...campaign, body: undefined } });
    }
    if (body.action === "send_campaign_batch") {
      ownerPermission(context, EMAIL_PERMISSION);
      const campaign = await base44.asServiceRole.entities.EmailCampaign.get(String(body.campaign_id || ""));
      if (!campaign) fail("Campaign not found", "CAMPAIGN_NOT_FOUND", 404);
      if (["sent", "cancelled"].includes(campaign.status)) return Response.json({ campaign, processed: 0 });
      const pending = (await base44.asServiceRole.entities.EmailCampaignRecipient.filter({ campaign_id: campaign.id, status: "pending" }, "created_date", EMAIL_BATCH_SIZE)).slice(0, EMAIL_BATCH_SIZE);
      if (!pending.length) {
        const failed = await base44.asServiceRole.entities.EmailCampaignRecipient.filter({ campaign_id: campaign.id, status: "failed" }, "created_date", 5000);
        const status = failed.length ? "partially_failed" : "sent";
        const completed = await base44.asServiceRole.entities.EmailCampaign.update(campaign.id, { status, completed_at: new Date().toISOString(), revision: Number(campaign.revision) + 1 });
        return Response.json({ campaign: { ...completed, body: undefined }, processed: 0, complete: true });
      }
      if (campaign.status === "ready") await base44.asServiceRole.entities.EmailCampaign.update(campaign.id, { status: "sending", started_at: new Date().toISOString(), revision: Number(campaign.revision) + 1 });
      let sent = 0;
      let failed = 0;
      for (const recipient of pending) {
        await base44.asServiceRole.entities.EmailCampaignRecipient.update(recipient.id, { status: "sending", attempt_count: Number(recipient.attempt_count) + 1 });
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({ to: recipient.email, subject: campaign.subject, body: campaign.body });
          await base44.asServiceRole.entities.EmailCampaignRecipient.update(recipient.id, { status: "sent", provider_code: "base44_send_email", sent_at: new Date().toISOString() });
          sent += 1;
        } catch (error) {
          await base44.asServiceRole.entities.EmailCampaignRecipient.update(recipient.id, { status: "failed", provider_code: String(error?.code || "send_failed").slice(0, 120) });
          failed += 1;
        }
      }
      const current = await base44.asServiceRole.entities.EmailCampaign.get(campaign.id);
      const remaining = await base44.asServiceRole.entities.EmailCampaignRecipient.filter({ campaign_id: campaign.id, status: "pending" }, "created_date", 1);
      const finalStatus = remaining.length ? "sending" : (Number(current.failed_count) + failed > 0 ? "partially_failed" : "sent");
      const updated = await base44.asServiceRole.entities.EmailCampaign.update(campaign.id, { status: finalStatus, sent_count: Number(current.sent_count) + sent, failed_count: Number(current.failed_count) + failed, completed_at: remaining.length ? undefined : new Date().toISOString(), revision: Number(current.revision) + 1 });
      await audit(base44, context.user.id, "email.campaign.batch", "EmailCampaign", campaign.id, failed ? "partial" : "success", `sent:${sent};failed:${failed}`);
      return Response.json({ campaign: { ...updated, body: undefined }, processed: pending.length, sent, failed, complete: !remaining.length });
    }
    fail("Unsupported action", "UNSUPPORTED_ACTION");
  } catch (error) {
    return replyError(error);
  }
});
