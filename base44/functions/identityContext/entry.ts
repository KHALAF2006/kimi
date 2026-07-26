import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { authorizationContext, replyError } from "../../shared/security.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const context = await authorizationContext(base44, body.session_id);
    return Response.json({
      identity: {
        user_id: context.user.id,
        customer_id: context.profile.id,
        customer_number: context.profile.customer_number,
        full_name: context.profile.full_name,
        preferred_language: context.profile.preferred_language,
        account_status: context.profile.account_status,
        role: context.role,
      },
      account: {
        id: context.account.id,
        account_number: context.account.account_number,
        account_type: context.account.account_type,
        name: context.account.name,
        status: context.account.status,
        membership_id: context.membership.id,
        member_type: context.membership.member_type,
      },
      roles: context.roles,
      permissions: [...context.permissions].sort(),
      subscription: context.subscription ? {
        id: context.subscription.id,
        status: context.subscription.status,
        starts_at: context.subscription.starts_at,
        ends_at: context.subscription.ends_at,
        plan: context.plan ? {
          id: context.plan.id,
          code: context.plan.code,
          name_ar: context.plan.name_ar,
          name_en: context.plan.name_en,
        } : null,
      } : null,
      entitlements: context.entitlements.map((item) => ({
        code: item.code,
        enabled: item.enabled,
        limit_value: item.limit_value ?? null,
        config: item.config || {},
      })),
    });
  } catch (error) {
    return replyError(error);
  }
});
