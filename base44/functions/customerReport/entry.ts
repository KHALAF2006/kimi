import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";
import { audit, authorizationContext, readJsonBody, replyError } from "../../shared/security.ts";

function escapeXml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;"); }
function saudiDate(value) { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)).replaceAll("/", "-"); } catch { return "unknown"; } }
const columns = ["Registration date", "Customer number", "Full name", "Email", "Mobile", "Country", "Status", "Preferred language", "Created at"];
function worksheet(name, rows) {
  const header = `<Row>${columns.map((item) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(item)}</Data></Cell>`).join("")}</Row>`;
  const body = rows.map((row) => `<Row>${[saudiDate(row.created_date), row.customer_number, row.full_name, row.email_normalized, row.phone_e164, row.country_code, row.account_status, row.preferred_language, row.created_date].map((item) => `<Cell><Data ss:Type="String">${escapeXml(item)}</Data></Cell>`).join("")}</Row>`).join("");
  return `<Worksheet ss:Name="${escapeXml(name.slice(0, 31))}"><Table>${header}${body}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane></WorksheetOptions></Worksheet>`;
}
function workbook(customers) {
  const groups = new Map(); for (const customer of customers) { const date = saudiDate(customer.created_date); if (!groups.has(date)) groups.set(date, []); groups.get(date).push(customer); }
  const sheets = [worksheet("All Customers", customers), ...[...groups.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([date, rows]) => worksheet(date, rows))];
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Default"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial"/></Style><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#38BDF8" ss:Pattern="Solid"/></Style></Styles>${sheets.join("")}</Workbook>`;
}
async function owner(base44) { const rows = await base44.asServiceRole.entities.CustomerProfile.filter({ acquisition_source: "platform_owner_bootstrap" }); return rows.find((item) => item.role === "owner" && item.tags?.includes("owner")) || null; }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req); const body = await readJsonBody(req, 16 * 1024); const args = body.args && typeof body.args === "object" ? body.args : body; const scheduled = args.action === "scheduled";
    let actor = "scheduled";
    if (scheduled) { const automationUser = await base44.auth.me(); if (!automationUser || automationUser.role !== "admin") throw Object.assign(new Error("Automation authentication required"), { status: 401, code: "AUTOMATION_AUTH_REQUIRED" }); }
    else { const context = await authorizationContext(base44, body.session_id); if (context.role !== "owner") throw Object.assign(new Error("Owner access required"), { status: 403, code: "OWNER_ONLY" }); actor = context.user.id; }
    const reportDate = saudiDate(new Date()); const snapshots = await base44.asServiceRole.entities.CustomerReportSnapshot.filter({ report_key: "customers_master" });
    if (scheduled && snapshots[0]?.report_date === reportDate) return Response.json({ skipped: true, reason: "daily_report_already_generated" });
    const customers = await base44.asServiceRole.entities.CustomerProfile.list("-created_date", 10000); const xml = workbook(customers); const file = new File([xml], `smart-investor-customers-${reportDate}.xls`, { type: "application/vnd.ms-excel" });
    const uploaded = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file }); const fileUri = uploaded.file_uri || uploaded.file_url || uploaded.url; if (!fileUri) throw Object.assign(new Error("Private report upload failed"), { status: 502, code: "REPORT_UPLOAD_FAILED" });
    const now = new Date().toISOString(); const payload = { file_uri: fileUri, generated_at: now, generated_by_user_id: actor, customer_count: customers.length, report_date: reportDate, revision: Number(snapshots[0]?.revision || 0) + 1 };
    const snapshot = snapshots[0] ? await base44.asServiceRole.entities.CustomerReportSnapshot.update(snapshots[0].id, payload) : await base44.asServiceRole.entities.CustomerReportSnapshot.create({ report_key: "customers_master", ...payload });
    const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 86400 }); const downloadUrl = signed.signed_url || signed.url;
    const ownerProfile = await owner(base44); if (scheduled && ownerProfile?.email_normalized && downloadUrl) { try { await base44.asServiceRole.integrations.Core.SendEmail({ to: ownerProfile.email_normalized, subject: `تقرير عملاء المستثمر الذكي — ${reportDate}`, body: `تم تحديث تقرير العملاء اليومي. العدد: ${customers.length}\nرابط التحميل صالح لمدة 24 ساعة:\n${downloadUrl}` }); } catch { /* the report remains available in owner administration */ } }
    if (!scheduled) await audit(base44, actor, "customer_report.generated", "CustomerReportSnapshot", snapshot.id, "success", "owner request", {}, { report_date: reportDate, customer_count: customers.length });
    return Response.json(scheduled ? { snapshot: { id: snapshot.id, report_date: snapshot.report_date, customer_count: snapshot.customer_count } } : { snapshot, download_url: downloadUrl });
  } catch (error) { return replyError(error); }
});
