import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { requireUser, profileFor, audit, replyError } from '../../shared/security.ts';
Deno.serve(async (req) => { try {
  const base44=createClientFromRequest(req); const user=await requireUser(base44); const body=await req.json(); const profile=await profileFor(base44,user);
  if(!profile || profile.account_status!=='active') return Response.json({error:'Account is not active'},{status:403});
  const hash=async(v)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  if(body.action==='start'){
    const otp=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0');
    const challenge=await base44.asServiceRole.entities.LoginChallenge.create({customer_id:profile.id,purpose:'login',email_otp_hash:await hash(otp),attempts:0,max_attempts:5,expires_at:new Date(Date.now()+600000).toISOString()});
    await base44.asServiceRole.integrations.Core.SendEmail({to:user.email,subject:'رمز دخول كيمي',body:`رمز التحقق الخاص بك هو: ${otp}\nينتهي خلال 10 دقائق.`});
    return Response.json({challenge_id:challenge.id,expires_at:challenge.expires_at});
  }
  if(body.action!=='verify') return Response.json({error:'Unsupported action'},{status:400});
  const challenge=await base44.asServiceRole.entities.LoginChallenge.get(body.challenge_id);
  if(!challenge||challenge.customer_id!==profile.id||challenge.completed_at||new Date(challenge.expires_at)<=new Date()||challenge.attempts>=5)return Response.json({error:'Challenge expired'},{status:400});
  if(await hash(String(body.otp||''))!==challenge.email_otp_hash){await base44.asServiceRole.entities.LoginChallenge.update(challenge.id,{attempts:challenge.attempts+1});return Response.json({error:'Invalid code'},{status:400});}
  const now=new Date().toISOString(); await base44.asServiceRole.entities.LoginChallenge.update(challenge.id,{completed_at:now}); await base44.asServiceRole.entities.ActiveDeviceSession.updateMany({customer_id:profile.id,revoked_at:null},{$set:{revoked_at:now}});
  const remember=Boolean(body.remember_me),expires=new Date(Date.now()+(remember?30:1)*86400000).toISOString();
  const session=await base44.asServiceRole.entities.ActiveDeviceSession.create({customer_id:profile.id,session_hash:await hash(`${user.id}:${crypto.randomUUID()}`),device_hash:await hash(String(body.device_id||'browser')),remember_me:remember,expires_at:expires,last_seen_at:now});
  await base44.asServiceRole.entities.CustomerProfile.update(profile.id,{last_login_at:now,last_seen_at:now}); await audit(base44,user.id,'session.created','ActiveDeviceSession',session.id,'success');
  return Response.json({session_id:session.id,expires_at:expires});
} catch(error){return replyError(error);} });