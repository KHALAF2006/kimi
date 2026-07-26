import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { replyError, requirePermission } from "../../shared/security.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    await requirePermission(base44, body.session_id, "data.operations.read");
    const [sources, issues, runs, deliveryEvents] = await Promise.all([
      base44.asServiceRole.entities.DataSource.list("name", 100),
      base44.asServiceRole.entities.DataQualityIssue.filter({ status: "open" }),
      base44.asServiceRole.entities.IngestionRun.list("-started_at", 50),
      base44.asServiceRole.entities.DeliveryEvent.list("-created_date", 100),
    ]);
    return Response.json({
      sources,
      issues,
      runs,
      delivery_health: {
        total: deliveryEvents.length,
        delivered: deliveryEvents.filter((event) => event.status === "delivered").length,
        failed: deliveryEvents.filter((event) => event.status === "failed").length,
        pending: deliveryEvents.filter((event) => !["delivered", "failed"].includes(event.status)).length,
      },
    });
  } catch (error) {
    return replyError(error);
  }
});
