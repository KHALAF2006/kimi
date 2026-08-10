import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { readJsonBody, replyError, requirePermission, requireTrustedOwner } from "../../shared/security.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const requestBody = await readJsonBody(req);
    const body = { ...requestBody, ...(requestBody.args || {}) };
    if (body.session_id) await requirePermission(base44, body.session_id, "data.ingestion.run");
    else await requireTrustedOwner(base44);
    if (!["projection_batch", "projection_finalize"].includes(body.mode)) {
      throw Object.assign(new Error("A bounded projection worker mode is required"), {
        status: 400,
        code: "INVALID_PROJECTION_WORKER_MODE",
      });
    }
    const response = await base44.functions.invoke("marketSignalRefresh", body);
    return Response.json(response?.data || response);
  } catch (error) {
    return replyError(error);
  }
});
