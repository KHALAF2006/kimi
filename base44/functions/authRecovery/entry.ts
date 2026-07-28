import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, profileFor, replyError, requireUser } from "../../shared/security.ts";
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const profile = await profileFor(base44, user);
    if (profile) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await base44.asServiceRole.entities.ActiveDeviceSession.updateMany({ customer_id: profile.id, revoked_at: null }, { $set: { revoked_at: now } });
      await audit(base44, user.id, "sessions.revoked", "ActiveDeviceSession", profile.id, "success", "password_reset");
    }
    return Response.json({ ok: true });
  } catch (error) {
    return replyError(error);
  }
});
