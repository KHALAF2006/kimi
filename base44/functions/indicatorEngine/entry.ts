import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { requireRole, replyError } from '../../shared/security.ts';
import { calculateMomentumZones, MOMENTUM_FORMULA_VERSION } from '../../shared/momentum.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    await requireRole(base44, ['admin', 'owner']);
    const body = await req.json();
    if (!Array.isArray(body.bars) || body.bars.length < 2) {
      return Response.json({ status: 'insufficient_history', required: 2 }, { status: 422 });
    }
    const result = calculateMomentumZones(body.bars, Number(body.lookback_days || 20), 500);
    if (!result) return Response.json({ status: 'insufficient_history', formula_version: MOMENTUM_FORMULA_VERSION }, { status: 422 });
    return Response.json({ status: 'success', ...result, formula_version: MOMENTUM_FORMULA_VERSION });
  } catch (error) {
    return replyError(error);
  }
});
