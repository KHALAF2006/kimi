import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";
import { readJsonBody, replyError } from "../../shared/security.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    await readJsonBody(req, 4 * 1024);
    const rows = await base44.asServiceRole.entities.TradingPlatform.list("display_order", 100);
    const platforms = rows.filter((row) => row.active).map((row) => ({
      id: row.id,
      code: row.code,
      name_ar: row.name_ar,
      name_en: row.name_en,
      referral_url: row.referral_url,
      supported_market_codes: row.supported_market_codes || [],
      display_order: row.display_order,
      active: true,
    }));
    return Response.json({
      platforms,
      markets: [
        { code: "SA_MAIN", name_ar: "السوق السعودي", name_en: "Saudi Market" },
        { code: "US_OPTIONS", name_ar: "الأسهم الأمريكية المؤهلة لعقود الخيارات", name_en: "U.S. Optionable Stocks" },
        { code: "US_BENCHMARKS", name_ar: "المؤشرات والصناديق الأمريكية", name_en: "U.S. Indices and ETFs" },
      ],
      terms_version: "2026-08-14",
    });
  } catch (error) {
    return replyError(error);
  }
});
