import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";
import { authorizationContext, readJsonBody, replyError } from "../../shared/security.ts";

function fail(message, code = "INVALID_NOTIFICATION_REQUEST", status = 400) { throw Object.assign(new Error(message), { code, status }); }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req, 16 * 1024);
    const context = await authorizationContext(base44, body.session_id, body.device_id);
    const filter = { recipient_auth_user_id: context.user.id };

    if (body.action === "list") {
      const now = Date.now();
      const messages = (await base44.asServiceRole.entities.Message.filter(filter, "-created_date", 100))
        .filter((item) => !item.expires_at || new Date(item.expires_at).getTime() > now);
      let preferences = (await base44.asServiceRole.entities.NotificationPreference.filter({ customer_id: context.profile.id }))[0];
      if (!preferences) preferences = await base44.asServiceRole.entities.NotificationPreference.create({ customer_id: context.profile.id, auth_user_id: context.user.id, feed_enabled: true, messages_enabled: true, revision: 1 });
      return Response.json({ messages, preferences, unread_count: messages.filter((item) => !item.read_at).length });
    }

    if (body.action === "mark_read" || body.action === "hide") {
      const message = await base44.asServiceRole.entities.Message.get(String(body.message_id || ""));
      if (!message || message.recipient_auth_user_id !== context.user.id) fail("Message not found", "MESSAGE_NOT_FOUND", 404);
      const patch = body.action === "mark_read" ? { read_at: new Date().toISOString() } : { hidden_at: new Date().toISOString(), read_at: message.read_at || new Date().toISOString() };
      const updated = await base44.asServiceRole.entities.Message.update(message.id, patch);
      return Response.json({ message: updated });
    }

    if (body.action === "preferences") {
      const rows = await base44.asServiceRole.entities.NotificationPreference.filter({ customer_id: context.profile.id });
      const payload = { feed_enabled: body.feed_enabled !== false, messages_enabled: true, revision: Number(rows[0]?.revision || 0) + 1 };
      const preferences = rows[0]
        ? await base44.asServiceRole.entities.NotificationPreference.update(rows[0].id, payload)
        : await base44.asServiceRole.entities.NotificationPreference.create({ customer_id: context.profile.id, auth_user_id: context.user.id, ...payload });
      await base44.asServiceRole.entities.CustomerProfile.update(context.profile.id, { feed_enabled: payload.feed_enabled });
      return Response.json({ preferences });
    }

    return Response.json({ error: "Unsupported action", code: "UNSUPPORTED_ACTION" }, { status: 400 });
  } catch (error) { return replyError(error); }
});
