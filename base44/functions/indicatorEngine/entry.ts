import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { replyError, requirePermission } from "../../shared/security.ts";
import { MOMENTUM_FORMULA_VERSION, calculateMomentumZones } from "../../shared/momentum.ts";
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    await requirePermission(base44, body.session_id, "data.operations.read");
    if (!Array.isArray(body.bars) || body.bars.length < 2) {
      return Response.json({ status: "insufficient_history", required: 2 }, { status: 422 });
    }
    const result = calculateMomentumZones(body.bars, Number(body.lookback_days || 20));
    if (!result) return Response.json({ status: "insufficient_history", formula_version: MOMENTUM_FORMULA_VERSION }, { status: 422 });
    return Response.json({ status: "success", ...result, formula_version: MOMENTUM_FORMULA_VERSION });
  } catch (error) {
    return replyError(error);
  }
});
