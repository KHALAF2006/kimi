import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";

function fixedEqual(left, right) { const a = String(left || ""), b = String(right || ""); if (a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0; }
async function hmacHex(secret, raw) { const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)); return Array.from(new Uint8Array(signature), (item) => item.toString(16).padStart(2, "0")).join(""); }

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 }); const raw = await req.text(); if (raw.length > 32_768) return new Response("Too large", { status: 413 });
    const secret = String(Deno.env.get("BUNNY_STREAM_READ_ONLY_API_KEY") || "").trim(); if (!secret) return new Response("Not configured", { status: 503 });
    if (req.headers.get("X-BunnyStream-Signature-Version") !== "v1" || req.headers.get("X-BunnyStream-Signature-Algorithm") !== "hmac-sha256") return new Response("Invalid signature metadata", { status: 401 });
    const supplied = String(req.headers.get("X-BunnyStream-Signature") || ""); const expected = await hmacHex(secret, raw); if (!/^[0-9a-f]{64}$/.test(supplied) || !fixedEqual(supplied, expected)) return new Response("Invalid signature", { status: 401 });
    const payload = JSON.parse(raw); const base44 = createClientFromRequest(req); const lessons = await base44.asServiceRole.entities.CourseLesson.filter({ provider_video_id: String(payload.VideoGuid || "") }); const status = Number(payload.Status); const providerStatus = [3, 4].includes(status) ? "ready" : [5, 8].includes(status) ? "failed" : status === 6 ? "uploading" : "processing"; for (const lesson of lessons) await base44.asServiceRole.entities.CourseLesson.update(lesson.id, { provider_status: providerStatus, revision: Number(lesson.revision || 1) + 1 }); return Response.json({ received: true });
  } catch { return new Response("Invalid webhook", { status: 400 }); }
});
