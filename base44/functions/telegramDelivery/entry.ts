import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { requireRole, replyError } from '../../shared/security.ts';
Deno.serve(async(req)=>{try{const base44=createClientFromRequest(req);await requireRole(base44,['admin','owner']);return Response.json({status:'blocked',reason:'Telegram provider secret is not configured'},{status:409});}catch(error){return replyError(error);}});