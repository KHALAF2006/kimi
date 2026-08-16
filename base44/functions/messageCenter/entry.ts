import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";
import { audit, authorizationContext, readJsonBody, replyError } from "../../shared/security.ts";

const STAFF_PERMISSION = "messages.manage";

function maskedEmail(value) {
  const [local = "", domain = ""] = String(value || "").split("@");
  return domain ? `${local.slice(0, 2)}***@${domain}` : "***";
}

function maskedPhone(value) {
  const phone = String(value || "");
  return phone.length > 4 ? `${phone.slice(0, 4)}*****${phone.slice(-2)}` : "***";
}
const MAX_BODY = 4000;
const MAX_SUBJECT = 160;
const OPEN_STATUSES = new Set(["open", "pending_customer", "pending_staff"]);
const VALID_STATUSES = new Set([...OPEN_STATUSES, "resolved", "closed"]);
const VALID_CATEGORIES = new Set(["general", "account", "subscription", "market_access", "technical"]);
const VALID_PRIORITIES = new Set(["normal", "important", "urgent"]);

function fail(message, code = "INVALID_MESSAGE_REQUEST", status = 400) {
  throw Object.assign(new Error(message), { code, status });
}

function cleanText(value, max, minimum = 1) {
  const normalized = String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (normalized.length < minimum || normalized.length > max) fail("Message content is invalid", "MESSAGE_CONTENT_INVALID");
  return normalized;
}

function clientMessageId(value) {
  const normalized = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(normalized)) fail("Message identifier is invalid", "CLIENT_MESSAGE_ID_INVALID");
  return normalized;
}

function isStaff(context) {
  return context.role === "owner" || context.permissions.has(STAFF_PERMISSION);
}

function canReadConversation(context, conversation) {
  return isStaff(context) || conversation?.customer_id === context.profile.id;
}

async function requireConversation(base44, context, id) {
  let conversation = null;
  try { conversation = await base44.asServiceRole.entities.SupportConversation.get(String(id || "")); } catch { conversation = null; }
  if (!conversation || !canReadConversation(context, conversation)) fail("Conversation not found", "CONVERSATION_NOT_FOUND", 404);
  return conversation;
}

async function readState(base44, context, conversationId) {
  const rows = await base44.asServiceRole.entities.SupportReadState.filter({ conversation_id: conversationId, viewer_auth_user_id: context.user.id });
  return rows[0] || null;
}

async function markRead(base44, context, conversation, messageId = "") {
  const now = new Date().toISOString();
  const current = await readState(base44, context, conversation.id);
  const payload = {
    conversation_id: conversation.id,
    viewer_auth_user_id: context.user.id,
    viewer_customer_id: context.profile.id,
    viewer_role: isStaff(context) ? "staff" : "customer",
    last_read_message_id: String(messageId || ""),
    last_read_at: now,
    revision: Number(current?.revision || 0) + 1,
  };
  const saved = current
    ? await base44.asServiceRole.entities.SupportReadState.update(current.id, payload)
    : await base44.asServiceRole.entities.SupportReadState.create(payload);
  const confirmed = await base44.asServiceRole.entities.SupportReadState.get(saved.id);
  if (!confirmed?.id || confirmed.viewer_auth_user_id !== context.user.id) fail("Read state could not be confirmed", "READ_STATE_NOT_CONFIRMED", 500);
  return confirmed;
}

async function enforceSendRate(base44, context) {
  const latest = await base44.asServiceRole.entities.SupportMessage.filter({ sender_auth_user_id: context.user.id }, "-created_date", 8);
  const now = Date.now();
  if (latest[0]?.created_date && now - new Date(latest[0].created_date).getTime() < 1500) {
    fail("Please wait before sending another message", "MESSAGE_RATE_LIMITED", 429);
  }
  const recent = latest.filter((item) => now - new Date(item.created_date || 0).getTime() < 60_000);
  if (recent.length >= 8) fail("Please wait before sending more messages", "MESSAGE_RATE_LIMITED", 429);
}

async function permissionStaffProfiles(base44) {
  const profiles = new Map();
  for (const role of ["owner", "admin", "support"]) {
    const rows = await base44.asServiceRole.entities.CustomerProfile.filter({ role, account_status: "active" });
    rows.forEach((profile) => profile?.auth_user_id && profiles.set(profile.auth_user_id, profile));
  }
  const grants = await base44.asServiceRole.entities.RolePermission.filter({ permission_code: STAFF_PERMISSION });
  for (const roleId of [...new Set(grants.map((item) => item.role_id).filter(Boolean))]) {
    const assignments = await base44.asServiceRole.entities.MemberRoleAssignment.filter({ role_id: roleId, status: "active" });
    for (const assignment of assignments) {
      try {
        const member = await base44.asServiceRole.entities.AccountMember.get(assignment.member_id);
        const profile = member?.customer_id ? await base44.asServiceRole.entities.CustomerProfile.get(member.customer_id) : null;
        if (profile?.auth_user_id && profile.account_status === "active") profiles.set(profile.auth_user_id, profile);
      } catch { /* A revoked or orphaned role assignment is not a recipient. */ }
    }
  }
  return [...profiles.values()];
}

async function createNotification(base44, recipient, message, conversation, customerMessage) {
  const dedupeKey = `support:${message.id}:${recipient.auth_user_id}`;
  const existing = await base44.asServiceRole.entities.Message.filter({ dedupe_key: dedupeKey });
  if (existing[0]) return existing[0];
  const customerName = conversation.customer_name || "—";
  return await base44.asServiceRole.entities.Message.create({
    recipient_auth_user_id: recipient.auth_user_id,
    recipient_customer_id: recipient.id,
    message_type: "support",
    priority: conversation.priority === "urgent" ? "critical" : conversation.priority === "important" ? "important" : "normal",
    title_ar: customerMessage ? `رسالة جديدة من ${customerName}` : "رد جديد من إدارة المستثمر الذكي",
    title_en: customerMessage ? `New message from ${customerName}` : "New reply from Smart Investor support",
    body_ar: customerMessage ? `وصلت رسالة جديدة في محادثة «${conversation.subject}».` : `لديك رد جديد في محادثة «${conversation.subject}».`,
    body_en: customerMessage ? `A new message was received in “${conversation.subject}”.` : `You have a new reply in “${conversation.subject}”.`,
    action_path: `/messages?conversation=${encodeURIComponent(conversation.id)}`,
    feed_eligible: false,
    dedupe_key: dedupeKey,
  });
}

async function notifyRecipients(base44, context, conversation, message) {
  if (message.sender_role === "customer") {
    const recipients = await permissionStaffProfiles(base44);
    for (const recipient of recipients) await createNotification(base44, recipient, message, conversation, true);
    return recipients.length;
  }
  const customer = await base44.asServiceRole.entities.CustomerProfile.get(conversation.customer_id);
  if (customer?.auth_user_id && customer.auth_user_id !== context.user.id) {
    await createNotification(base44, customer, message, conversation, false);
    return 1;
  }
  return 0;
}

async function saveMessage(base44, context, conversation, rawBody, rawClientMessageId) {
  const body = cleanText(rawBody, MAX_BODY, 1);
  const idempotencyKey = clientMessageId(rawClientMessageId);
  const duplicate = await base44.asServiceRole.entities.SupportMessage.filter({ client_message_id: idempotencyKey });
  if (duplicate[0]) {
    if (duplicate[0].sender_auth_user_id !== context.user.id || duplicate[0].conversation_id !== conversation.id) fail("Message identifier is already used", "CLIENT_MESSAGE_ID_CONFLICT", 409);
    return { message: duplicate[0], conversation, idempotent: true, notified: 0 };
  }
  await enforceSendRate(base44, context);
  const staff = isStaff(context);
  const now = new Date().toISOString();
  const message = await base44.asServiceRole.entities.SupportMessage.create({
    conversation_id: conversation.id,
    sender_auth_user_id: context.user.id,
    sender_customer_id: context.profile.id,
    sender_role: staff ? "staff" : "customer",
    sender_name: context.profile.full_name,
    body,
    client_message_id: idempotencyKey,
  });
  const confirmedMessage = await base44.asServiceRole.entities.SupportMessage.get(message.id);
  if (!confirmedMessage?.id || confirmedMessage.body !== body) fail("Message could not be confirmed", "MESSAGE_NOT_CONFIRMED", 500);
  const nextStatus = staff ? "pending_customer" : "pending_staff";
  const updated = await base44.asServiceRole.entities.SupportConversation.update(conversation.id, {
    status: nextStatus,
    last_message_at: now,
    last_message_preview: body.slice(0, 180),
    last_sender_auth_user_id: context.user.id,
    last_sender_role: staff ? "staff" : "customer",
    revision: Number(conversation.revision || 1) + 1,
  });
  const confirmedConversation = await base44.asServiceRole.entities.SupportConversation.get(updated.id);
  if (!confirmedConversation?.id || confirmedConversation.last_message_preview !== body.slice(0, 180)) fail("Conversation update could not be confirmed", "CONVERSATION_NOT_CONFIRMED", 500);
  await markRead(base44, context, confirmedConversation, confirmedMessage.id);
  const notified = await notifyRecipients(base44, context, confirmedConversation, confirmedMessage);
  await audit(base44, context.user.id, staff ? "support.staff_replied" : "support.customer_replied", "SupportConversation", conversation.id, "success", "message sent", {}, { message_id: confirmedMessage.id, notified_recipients: notified });
  return { message: confirmedMessage, conversation: confirmedConversation, idempotent: false, notified };
}

async function conversationView(base44, context, conversation) {
  const state = await readState(base44, context, conversation.id);
  const unread = conversation.last_sender_auth_user_id !== context.user.id
    && (!state?.last_read_at || new Date(conversation.last_message_at).getTime() > new Date(state.last_read_at).getTime());
  return { ...conversation, unread, last_read_at: state?.last_read_at || null };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req, 48 * 1024);
    const context = await authorizationContext(base44, body.session_id);
    const staff = isStaff(context);

    if (body.action === "list_customers") {
      if (!staff) fail("Staff permission required", "PERMISSION_DENIED", 403);
      const fullContact = context.role === "owner" || context.permissions.has("customers.full.read");
      const customers = (await base44.asServiceRole.entities.CustomerProfile.list("full_name", 300))
        .filter((profile) => profile.role === "user" && profile.account_status !== "closed")
        .map(({ id, full_name, customer_number, email_normalized, phone_e164, account_status }) => ({
          id, full_name, customer_number, account_status,
          email_normalized: fullContact ? email_normalized : maskedEmail(email_normalized),
          phone_e164: fullContact ? phone_e164 : maskedPhone(phone_e164),
          contact_masked: !fullContact,
        }));
      return Response.json({ customers });
    }

    if (body.action === "list_conversations") {
      const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 200);
      const rows = staff
        ? await base44.asServiceRole.entities.SupportConversation.list("-last_message_at", limit)
        : await base44.asServiceRole.entities.SupportConversation.filter({ customer_id: context.profile.id }, "-last_message_at", limit);
      const conversations = await Promise.all(rows.map((row) => conversationView(base44, context, row)));
      return Response.json({ conversations, staff, unread_count: conversations.filter((row) => row.unread).length });
    }

    if (body.action === "get_conversation") {
      const conversation = await requireConversation(base44, context, body.conversation_id);
      const messages = await base44.asServiceRole.entities.SupportMessage.filter({ conversation_id: conversation.id }, "created_date", 500);
      await markRead(base44, context, conversation, messages.at(-1)?.id || "");
      return Response.json({ conversation: await conversationView(base44, context, conversation), messages, staff });
    }

    if (body.action === "create_conversation") {
      // Validate the sender's persistent rate window before creating the parent
      // record so a rejected first message cannot leave an empty conversation.
      await enforceSendRate(base44, context);
      const customer = staff
        ? await base44.asServiceRole.entities.CustomerProfile.get(String(body.customer_id || ""))
        : context.profile;
      if (!customer || customer.role !== "user" || customer.account_status === "closed") fail("Customer not found", "CUSTOMER_NOT_FOUND", 404);
      const subject = cleanText(body.subject, MAX_SUBJECT, 3);
      const category = VALID_CATEGORIES.has(body.category) ? body.category : "general";
      const priority = staff && VALID_PRIORITIES.has(body.priority) ? body.priority : "normal";
      const now = new Date().toISOString();
      const placeholder = cleanText(body.message, MAX_BODY, 1).slice(0, 180);
      const conversation = await base44.asServiceRole.entities.SupportConversation.create({
        customer_id: customer.id,
        customer_auth_user_id: customer.auth_user_id,
        customer_name: customer.full_name,
        customer_number: customer.customer_number,
        subject,
        category,
        status: staff ? "pending_customer" : "pending_staff",
        priority,
        last_message_at: now,
        last_message_preview: placeholder,
        last_sender_auth_user_id: context.user.id,
        last_sender_role: staff ? "staff" : "customer",
        revision: 1,
      });
      const confirmed = await base44.asServiceRole.entities.SupportConversation.get(conversation.id);
      if (!confirmed?.id || confirmed.customer_id !== customer.id) fail("Conversation could not be confirmed", "CONVERSATION_NOT_CONFIRMED", 500);
      const result = await saveMessage(base44, context, confirmed, body.message, body.client_message_id);
      await audit(base44, context.user.id, "support.conversation_created", "SupportConversation", confirmed.id, "success", "conversation created", {}, { customer_id: customer.id, category, priority });
      return Response.json({ ...result, created: true });
    }

    if (body.action === "send_message") {
      const conversation = await requireConversation(base44, context, body.conversation_id);
      if (conversation.status === "closed") fail("Conversation is closed", "CONVERSATION_CLOSED", 409);
      return Response.json(await saveMessage(base44, context, conversation, body.message, body.client_message_id));
    }

    if (body.action === "mark_read") {
      const conversation = await requireConversation(base44, context, body.conversation_id);
      const state = await markRead(base44, context, conversation, body.message_id);
      return Response.json({ read_state: state });
    }

    if (body.action === "set_status") {
      if (!staff) fail("Staff permission required", "PERMISSION_DENIED", 403);
      const conversation = await requireConversation(base44, context, body.conversation_id);
      const status = String(body.status || "");
      if (!VALID_STATUSES.has(status)) fail("Conversation status is invalid", "CONVERSATION_STATUS_INVALID");
      if (Number(body.expected_revision) !== Number(conversation.revision)) fail("Conversation changed in another session", "REVISION_CONFLICT", 409);
      const now = new Date().toISOString();
      const statusPatch: Record<string, unknown> = {
        status,
        revision: Number(conversation.revision) + 1,
      };
      if (status === "resolved") statusPatch.resolved_at = now;
      if (status === "closed") statusPatch.closed_at = now;
      const updated = await base44.asServiceRole.entities.SupportConversation.update(conversation.id, statusPatch);
      const confirmed = await base44.asServiceRole.entities.SupportConversation.get(updated.id);
      if (confirmed.status !== status) fail("Conversation status could not be confirmed", "CONVERSATION_STATUS_NOT_CONFIRMED", 500);
      await audit(base44, context.user.id, "support.status_changed", "SupportConversation", conversation.id, "success", cleanText(body.reason, 500, 3), { status: conversation.status }, { status });
      return Response.json({ conversation: confirmed });
    }

    return Response.json({ error: "Unsupported action", code: "UNSUPPORTED_ACTION" }, { status: 400 });
  } catch (error) {
    return replyError(error);
  }
});
