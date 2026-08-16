import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, readJsonBody, replyError } from "../../shared/security.ts";

const DELIVERY_BATCH = 10;
const EMAIL_BATCH = 20;
const MAX_EVENT_AGE_MS = 60 * 60 * 1000;

function eventTime(event) {
  const timestamp = Date.parse(String(event?.created_date || event?.next_attempt_at || ""));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isExpiredEvent(event, now) {
  const timestamp = eventTime(event);
  return timestamp > 0 && now - timestamp > MAX_EVENT_AGE_MS;
}

async function processEmailBatch(base44, campaign) {
  const pending = (await base44.asServiceRole.entities.EmailCampaignRecipient.filter({ campaign_id: campaign.id, status: "pending" }, "created_date", EMAIL_BATCH)).slice(0, EMAIL_BATCH);
  if (!pending.length) {
    const failed = await base44.asServiceRole.entities.EmailCampaignRecipient.filter({ campaign_id: campaign.id, status: "failed" }, "created_date", 5000);
    await base44.asServiceRole.entities.EmailCampaign.update(campaign.id, { status: failed.length ? "partially_failed" : "sent", completed_at: new Date().toISOString(), revision: Number(campaign.revision) + 1 });
    return { processed: 0, complete: true };
  }
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
  await base44.asServiceRole.entities.EmailCampaign.update(campaign.id, { status: finalStatus, sent_count: Number(current.sent_count) + sent, failed_count: Number(current.failed_count) + failed, completed_at: remaining.length ? undefined : new Date().toISOString(), revision: Number(current.revision) + 1 });
  return { processed: pending.length, sent, failed, complete: !remaining.length };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req, 16 * 1024);
    const args = body.args && typeof body.args === "object" ? body.args : body;
    if (args.action !== "scheduled") return Response.json({ error: "Scheduled worker action required", code: "SCHEDULED_ACTION_REQUIRED" }, { status: 400 });
    const automationUser = await base44.auth.me();
    if (!automationUser || automationUser.role !== "admin") return Response.json({ error: "Automation authentication required", code: "AUTOMATION_AUTH_REQUIRED" }, { status: 401 });
    const now = Date.now();
    const dryRun = args.dry_run === true;
    const [pending, retryRows, campaigns] = await Promise.all([
      base44.asServiceRole.entities.DeliveryEvent.filter({ status: "pending" }, "created_date", DELIVERY_BATCH),
      base44.asServiceRole.entities.DeliveryEvent.filter({ status: "retry" }, "next_attempt_at", DELIVERY_BATCH),
      base44.asServiceRole.entities.EmailCampaign.filter({ status: "sending" }, "created_date", 5),
    ]);
    const retry = retryRows.filter((event) => !event.next_attempt_at || new Date(event.next_attempt_at).getTime() <= now);
    const events = [...new Map([...pending, ...retry].map((event) => [event.id, event])).values()].slice(0, DELIVERY_BATCH);
    const expiredEvents = events.filter((event) => isExpiredEvent(event, now));
    const deliverableEvents = events.filter((event) => !isExpiredEvent(event, now));
    if (dryRun) {
      return Response.json({
        status: "diagnostic_complete",
        dry_run: true,
        queue: {
          inspected: events.length,
          deliverable: deliverableEvents.length,
          expired: expiredEvents.length,
          unsupported: deliverableEvents.filter((event) => !["telegram", "whatsapp"].includes(event.channel)).length,
          campaigns_sending: campaigns.length,
        },
      });
    }
    for (const event of expiredEvents) {
      await base44.asServiceRole.entities.DeliveryEvent.update(event.id, {
        status: "failed",
        provider_code: "expired_before_delivery",
      });
      await audit(base44, automationUser.id, "delivery.event.expired", "DeliveryEvent", event.id, "success", `market:${event.market_code || "unknown"};age_limit_minutes:60`);
    }
    const deliveryResults = [];
    for (const event of deliverableEvents) {
      const functionName = event.channel === "telegram" ? "telegramDelivery" : event.channel === "whatsapp" ? "whatsappDelivery" : "";
      if (!functionName) {
        await base44.asServiceRole.entities.DeliveryEvent.update(event.id, { status: "failed", provider_code: "unsupported_delivery_channel" });
        deliveryResults.push({ event_id: event.id, channel: event.channel, status: "failed", code: "UNSUPPORTED_DELIVERY_CHANNEL" });
        continue;
      }
      try {
        const response = await base44.functions.invoke(functionName, { action: "scheduled_delivery", event_id: event.id });
        deliveryResults.push({ event_id: event.id, channel: event.channel, status: response?.data?.status || "processed" });
      } catch (error) { deliveryResults.push({ event_id: event.id, channel: event.channel, status: "failed", code: String(error?.code || "invoke_failed") }); }
    }
    const emailResults = [];
    for (const campaign of campaigns) {
      try {
        emailResults.push({ campaign_id: campaign.id, ...await processEmailBatch(base44, campaign) });
      } catch (error) {
        emailResults.push({ campaign_id: campaign.id, processed: 0, complete: false, status: "failed", code: String(error?.code || "email_batch_failed") });
      }
    }
    await audit(base44, automationUser.id, "delivery.worker.completed", "DeliveryEvent", "scheduled", "success", `events:${deliverableEvents.length};expired:${expiredEvents.length};campaigns:${campaigns.length}`);
    return Response.json({ status: "complete", expired_count: expiredEvents.length, delivery_results: deliveryResults, email_results: emailResults });
  } catch (error) { return replyError(error); }
});
