import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";
import { audit, authorizationContext, marketAccessForContext, readJsonBody, replyError, sha256 } from "../../shared/security.ts";

const MARKETS = new Set(["SA_MAIN", "US_OPTIONS", "US_BENCHMARKS"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/ogg", "video/3gpp", "video/3gpp2"]);
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 15 * 60;

function fail(message, code = "INVALID_TRAINING_REQUEST", status = 400) { throw Object.assign(new Error(message), { code, status }); }
function required(value, max = 300) { const result = String(value || "").trim(); if (!result || result.length > max) fail("Required value is invalid"); return result; }
function safeLesson(lesson) {
  return {
    id: lesson.id,
    course_id: lesson.course_id,
    title_ar: lesson.title_ar,
    title_en: lesson.title_en,
    display_order: lesson.display_order,
    duration_seconds: lesson.duration_seconds,
    published: lesson.published,
    storage_status: lesson.storage_status,
  };
}
async function courseLessons(base44, courses, includePrivate = false) {
  const result = {};
  for (const course of courses) {
    const lessons = await base44.asServiceRole.entities.CourseLesson.filter({ course_id: course.id }, "display_order", 200);
    result[course.id] = includePrivate ? lessons : lessons.map(safeLesson);
  }
  return result;
}
async function signedPlayback(base44, fileUri) {
  if (!String(fileUri || "").startsWith("private/")) fail("Private video file is unavailable", "PRIVATE_VIDEO_UNAVAILABLE", 404);
  const result = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: SIGNED_URL_TTL_SECONDS });
  const url = result?.signed_url || result?.url;
  if (!url) fail("Private video link could not be created", "PRIVATE_VIDEO_LINK_FAILED", 502);
  return { url, expires_at: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString() };
}
async function message(base44, payload) {
  const rows = await base44.asServiceRole.entities.Message.filter({ dedupe_key: payload.dedupe_key });
  return rows[0] || await base44.asServiceRole.entities.Message.create(payload);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req, 32 * 1024);

    if (body.action === "public_list") {
      const courses = await base44.asServiceRole.entities.Course.filter({ visibility: "public", status: "published" }, "display_order", 100);
      return Response.json({ courses, lessons: await courseLessons(base44, courses) });
    }

    if (body.action === "public_playback") {
      const lesson = await base44.asServiceRole.entities.CourseLesson.get(String(body.lesson_id || ""));
      const course = lesson ? await base44.asServiceRole.entities.Course.get(lesson.course_id) : null;
      if (!course || course.visibility !== "public" || course.status !== "published" || !lesson.published || lesson.storage_status !== "ready") fail("Lesson not available", "LESSON_NOT_AVAILABLE", 404);
      return Response.json({ playback: await signedPlayback(base44, lesson.file_uri), watermark: "Smart Investor" });
    }

    const context = await authorizationContext(base44, body.session_id);

    if (body.action === "list") {
      const all = await base44.asServiceRole.entities.Course.filter({ status: "published" }, "display_order", 200);
      const allowed = new Set(marketAccessForContext(context).map((item) => item.market_code));
      const courses = all.filter((course) => course.visibility === "public" || allowed.has(course.market_code));
      return Response.json({ courses, lessons: await courseLessons(base44, courses) });
    }

    if (body.action === "owner_list") {
      if (context.role !== "owner") fail("Owner access required", "OWNER_ONLY", 403);
      const courses = await base44.asServiceRole.entities.Course.list("display_order", 200);
      return Response.json({ courses, lessons: await courseLessons(base44, courses, true), storage: { provider: "base44_private", max_video_bytes: MAX_VIDEO_BYTES } });
    }

    if (body.action === "save_course") {
      if (context.role !== "owner") fail("Owner access required", "OWNER_ONLY", 403);
      const visibility = body.visibility === "market" ? "market" : "public";
      const market = String(body.market_code || "").toUpperCase();
      if (visibility === "market" && !MARKETS.has(market)) fail("Select a market", "MARKET_REQUIRED");
      const payload = {
        code: required(body.code, 80).toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
        title_ar: required(body.title_ar, 160),
        title_en: required(body.title_en, 160),
        description_ar: String(body.description_ar || "").slice(0, 2000),
        description_en: String(body.description_en || "").slice(0, 2000),
        visibility,
        market_code: visibility === "market" ? market : undefined,
        storage_mode: "base44_private",
        status: "draft",
        display_order: Math.max(0, Number(body.display_order) || 0),
        revision: 1,
      };
      const course = body.id
        ? await base44.asServiceRole.entities.Course.update(String(body.id), { ...payload, revision: Number(body.revision || 1) + 1 })
        : await base44.asServiceRole.entities.Course.create(payload);
      await audit(base44, context.user.id, "course.saved", "Course", course.id, "success", "owner action");
      return Response.json({ course });
    }

    if (body.action === "save_lesson_upload") {
      if (context.role !== "owner") fail("Owner access required", "OWNER_ONLY", 403);
      const course = await base44.asServiceRole.entities.Course.get(String(body.course_id || ""));
      if (!course) fail("Course not found", "COURSE_NOT_FOUND", 404);
      const fileUri = required(body.file_uri, 1000);
      const fileName = required(body.file_name, 255);
      const mimeType = required(body.mime_type, 100).toLowerCase();
      const fileSize = Number(body.file_size_bytes);
      if (!fileUri.startsWith("private/")) fail("Video must be stored in Base44 private storage", "PRIVATE_STORAGE_REQUIRED");
      if (!VIDEO_TYPES.has(mimeType)) fail("Unsupported video format", "UNSUPPORTED_VIDEO_FORMAT");
      if (!Number.isInteger(fileSize) || fileSize < 1 || fileSize > MAX_VIDEO_BYTES) fail("Video must be 100 MB or less", "VIDEO_TOO_LARGE");
      const lesson = await base44.asServiceRole.entities.CourseLesson.create({
        course_id: course.id,
        title_ar: required(body.title_ar, 160),
        title_en: required(body.title_en, 160),
        display_order: Math.max(0, Number(body.display_order) || 0),
        storage_provider: "base44_private",
        file_uri: fileUri,
        file_name: fileName,
        mime_type: mimeType,
        file_size_bytes: fileSize,
        storage_status: "ready",
        published: false,
        revision: 1,
      });
      await audit(base44, context.user.id, "course.lesson_uploaded", "CourseLesson", lesson.id, "success", "private Base44 storage");
      return Response.json({ lesson });
    }

    if (body.action === "publish_course") {
      if (context.role !== "owner") fail("Owner access required", "OWNER_ONLY", 403);
      const course = await base44.asServiceRole.entities.Course.get(String(body.course_id || ""));
      if (!course) fail("Course not found", "COURSE_NOT_FOUND", 404);
      const lessons = await base44.asServiceRole.entities.CourseLesson.filter({ course_id: course.id });
      if (!lessons.length || lessons.some((item) => item.storage_provider !== "base44_private" || item.storage_status !== "ready" || !String(item.file_uri || "").startsWith("private/"))) {
        fail("All course videos must be available in private storage before publishing", "COURSE_VIDEOS_NOT_READY", 409);
      }
      for (const lesson of lessons) await base44.asServiceRole.entities.CourseLesson.update(lesson.id, { published: true, revision: Number(lesson.revision || 1) + 1 });
      const updated = await base44.asServiceRole.entities.Course.update(course.id, { status: "published", revision: Number(course.revision || 1) + 1 });
      await audit(base44, context.user.id, "course.published", "Course", course.id, "success", "private storage gate passed");
      return Response.json({ course: updated });
    }

    if (body.action === "playback") {
      const lesson = await base44.asServiceRole.entities.CourseLesson.get(String(body.lesson_id || ""));
      const course = lesson ? await base44.asServiceRole.entities.Course.get(lesson.course_id) : null;
      if (!course || course.status !== "published" || !lesson.published || lesson.storage_status !== "ready") fail("Lesson not available", "LESSON_NOT_AVAILABLE", 404);
      const allowed = new Set(marketAccessForContext(context).map((item) => item.market_code));
      if (course.visibility === "market" && !allowed.has(course.market_code)) fail("Market access required", "MARKET_SUBSCRIPTION_REQUIRED", 403);
      const instance = required(body.player_instance_id, 120);
      const fingerprint = await sha256(String(body.session_id || ""));
      const now = Date.now();
      const leases = await base44.asServiceRole.entities.PlaybackLease.filter({ customer_id: context.profile.id, lesson_id: lesson.id, status: "active" });
      const conflict = leases.find((item) => item.player_instance_id !== instance && new Date(item.expires_at).getTime() > now);
      if (conflict) {
        const events = await base44.asServiceRole.entities.ContentSecurityEvent.filter({ customer_id: context.profile.id, lesson_id: lesson.id, event_type: "parallel_playback" });
        const attempt = events.length + 1;
        const action = attempt >= 3 ? "temporarily_blocked" : attempt === 2 ? "final_warning" : "warned";
        await base44.asServiceRole.entities.ContentSecurityEvent.create({ customer_id: context.profile.id, auth_user_id: context.user.id, course_id: course.id, lesson_id: lesson.id, event_type: "parallel_playback", severity: attempt >= 3 ? "critical" : "warning", fingerprint_hash: fingerprint, evidence: { conflicting_lease_id: conflict.id }, attempt_number: attempt, action_taken: action });
        if (attempt >= 3) {
          await base44.asServiceRole.entities.CustomerProfile.update(context.profile.id, { account_status: "temporarily_blocked", temporary_blocked_at: new Date().toISOString(), temporary_block_reason: "Repeated simultaneous protected-video playback" });
          await base44.asServiceRole.entities.ActiveDeviceSession.updateMany({ customer_id: context.profile.id, revoked_at: null }, { $set: { revoked_at: new Date().toISOString() } });
          const owners = await base44.asServiceRole.entities.CustomerProfile.filter({ acquisition_source: "platform_owner_bootstrap" });
          const owner = owners.find((item) => item.role === "owner" && item.tags?.includes("owner"));
          if (owner) await message(base44, { recipient_auth_user_id: owner.auth_user_id, recipient_customer_id: owner.id, message_type: "security", priority: "critical", title_ar: "حظر أمني مؤقت", title_en: "Temporary security block", body_ar: `حُظر حساب ${context.profile.full_name} مؤقتاً بعد تكرار تشغيل فيديو محمي بالتزامن.`, body_en: `${context.profile.full_name} was temporarily blocked after repeated parallel protected-video playback.`, action_path: "/admin/customers", feed_eligible: true, dedupe_key: `security-block:${context.profile.id}:${lesson.id}` });
          await message(base44, { recipient_auth_user_id: context.user.id, recipient_customer_id: context.profile.id, message_type: "security", priority: "critical", title_ar: "تم حظر الحساب مؤقتاً", title_en: "Account temporarily blocked", body_ar: "تم حظر حسابك مؤقتاً لمحاولة مخالفة سياسة حماية المحتوى. راجع الإدارة.", body_en: "Your account was temporarily blocked after repeated protected-content policy violations. Contact the administration.", action_path: "/application-status", feed_eligible: true, dedupe_key: `security-block-user:${context.profile.id}:${lesson.id}` });
          fail("Account temporarily blocked. Contact the administration", "ACCOUNT_TEMPORARILY_BLOCKED", 403);
        }
        fail(attempt === 2 ? "Final warning: close the other video session before continuing" : "Close the other video session before continuing", "PARALLEL_PLAYBACK_DENIED", 409);
      }
      let lease = leases.find((item) => item.player_instance_id === instance);
      const leasePayload = { last_heartbeat_at: new Date().toISOString(), expires_at: new Date(now + 90_000).toISOString(), session_fingerprint: fingerprint, status: "active" };
      lease = lease
        ? await base44.asServiceRole.entities.PlaybackLease.update(lease.id, leasePayload)
        : await base44.asServiceRole.entities.PlaybackLease.create({ customer_id: context.profile.id, auth_user_id: context.user.id, lesson_id: lesson.id, player_instance_id: instance, ...leasePayload });
      return Response.json({ playback: await signedPlayback(base44, lesson.file_uri), lease_id: lease.id, watermark: `${context.profile.full_name} · ${context.profile.phone_e164}` });
    }

    if (body.action === "playback_heartbeat") {
      const lease = await base44.asServiceRole.entities.PlaybackLease.get(String(body.lease_id || ""));
      if (!lease || lease.customer_id !== context.profile.id || lease.player_instance_id !== String(body.player_instance_id || "")) fail("Playback session not found", "PLAYBACK_SESSION_NOT_FOUND", 404);
      const updated = await base44.asServiceRole.entities.PlaybackLease.update(lease.id, { status: "active", last_heartbeat_at: new Date().toISOString(), expires_at: new Date(Date.now() + 90_000).toISOString() });
      return Response.json({ lease_id: updated.id, expires_at: updated.expires_at });
    }

    if (body.action === "release_playback") {
      const lease = await base44.asServiceRole.entities.PlaybackLease.get(String(body.lease_id || ""));
      if (lease?.customer_id === context.profile.id) await base44.asServiceRole.entities.PlaybackLease.update(lease.id, { status: "released", expires_at: new Date().toISOString() });
      return Response.json({ released: true });
    }

    return Response.json({ error: "Unsupported action", code: "UNSUPPORTED_ACTION" }, { status: 400 });
  } catch (error) {
    return replyError(error);
  }
});
