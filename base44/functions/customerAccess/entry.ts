import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";
import { audit, authorizationContext, readJsonBody, replyError } from "../../shared/security.ts";

const MARKETS = new Set(["SA_MAIN", "US_OPTIONS", "US_BENCHMARKS"]);
function fail(message, code = "INVALID_APPLICATION_REQUEST", status = 400) { throw Object.assign(new Error(message), { code, status }); }
function reference(market) { return `SI-${market}-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`; }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req); const body = await readJsonBody(req, 16 * 1024); const context = await authorizationContext(base44, body.session_id);
    const applications = await base44.asServiceRole.entities.MarketAccessApplication.filter({ customer_id: context.profile.id }, "-created_date", 100);
    if (body.action === "list") {
      const platforms = await base44.asServiceRole.entities.TradingPlatform.filter({ active: true }, "display_order", 200);
      return Response.json({ applications, platforms });
    }
    if (body.action === "apply") {
      const market = String(body.market_code || "").toUpperCase(); if (!MARKETS.has(market)) fail("Select a supported market", "MARKET_REQUIRED");
      const platform = await base44.asServiceRole.entities.TradingPlatform.get(String(body.trading_platform_id || ""));
      if (!platform?.active || !platform.supported_market_codes?.includes(market)) fail("Select an active trading platform", "TRADING_PLATFORM_REQUIRED");
      if (applications.some((item) => item.market_code === market && ["pending", "approved"].includes(item.status))) fail("You already have an active or pending request for this market", "MARKET_APPLICATION_EXISTS", 409);
      const application = await base44.asServiceRole.entities.MarketAccessApplication.create({ unique_reference: reference(market), customer_id: context.profile.id, auth_user_id: context.user.id, trading_platform_id: platform.id, market_code: market, status: "pending", full_name_snapshot: context.profile.full_name, email_snapshot: context.profile.email_normalized, phone_snapshot: context.profile.phone_e164, revision: 1 });
      const owners = await base44.asServiceRole.entities.CustomerProfile.filter({ acquisition_source: "platform_owner_bootstrap" }); const owner = owners.find((item) => item.role === "owner" && item.tags?.includes("owner"));
      if (owner) await base44.asServiceRole.entities.Message.create({ recipient_auth_user_id: owner.auth_user_id, recipient_customer_id: owner.id, message_type: "application", priority: "important", title_ar: "طلب سوق إضافي", title_en: "Additional market request", body_ar: `قدّم ${context.profile.full_name} طلباً جديداً للسوق ${market}.`, body_en: `${context.profile.full_name} submitted a new request for ${market}.`, action_path: `/admin/access?application=${application.id}`, feed_eligible: true, dedupe_key: `additional-application:${application.id}` });
      await audit(base44, context.user.id, "market_access.applied", "MarketAccessApplication", application.id, "success", "customer application");
      return Response.json({ application });
    }
    return Response.json({ error: "Unsupported action", code: "UNSUPPORTED_ACTION" }, { status: 400 });
  } catch (error) { return replyError(error); }
});
