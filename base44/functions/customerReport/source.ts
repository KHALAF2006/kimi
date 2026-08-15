import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";
import { audit, authorizationContext, readJsonBody, replyError } from "../../shared/security.ts";

function escapeXml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;"); }
function saudiDate(value) {
  if (!value) return "";
  try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)).replaceAll("/", "-"); }
  catch { return ""; }
}
function saudiDateTime(value) {
  if (!value) return "";
  try { return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }
  catch { return ""; }
}
function newest(rows = []) { return [...rows].sort((a, b) => new Date(b.created_date || b.starts_at || 0).getTime() - new Date(a.created_date || a.starts_at || 0).getTime()); }
function activeSubscription(rows = []) { return rows.find((item) => item.status === "active") || newest(rows)[0] || null; }
function styleForStatus(value) {
  const status = String(value || "").toLowerCase();
  if (["active", "approved"].includes(status)) return "StatusActive";
  if (["pending", "pending_owner_approval", "pending_verification", "referral_opened"].includes(status)) return "StatusPending";
  if (["suspended", "temporarily_blocked"].includes(status)) return "StatusSuspended";
  if (["banned", "rejected", "closed", "expired"].includes(status)) return "StatusDanger";
  return "Cell";
}
function cell(value, style = "Cell") { return `<Cell ss:StyleID="${style}"><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`; }
function row(values, statusIndex = -1, rowIndex = 0) {
  return `<Row ss:StyleID="${rowIndex % 2 ? "AltRow" : "DataRow"}">${values.map((value, index) => cell(value, index === statusIndex ? styleForStatus(value) : "Cell")).join("")}</Row>`;
}

function worksheet(name, title, columns, rows, widths, statusIndex = -1) {
  const safeName = String(name).replace(/[\\/?*\[\]:]/g, " ").slice(0, 31);
  const titleRow = `<Row ss:Height="32"><Cell ss:StyleID="Title" ss:MergeAcross="${columns.length - 1}"><Data ss:Type="String">${escapeXml(title)}</Data></Cell></Row>`;
  const metaRow = `<Row ss:Height="22"><Cell ss:StyleID="Meta" ss:MergeAcross="${columns.length - 1}"><Data ss:Type="String">${escapeXml(`Generated ${saudiDateTime(new Date())} Asia/Riyadh · Rows: ${rows.length}`)}</Data></Cell></Row>`;
  const header = `<Row ss:Height="30">${columns.map((item) => cell(item, "Header")).join("")}</Row>`;
  const columnsXml = widths.map((width) => `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`).join("");
  const body = rows.map((values, index) => row(values, statusIndex, index)).join("");
  return `<Worksheet ss:Name="${escapeXml(safeName)}"><Table ss:DefaultRowHeight="20">${columnsXml}${titleRow}${metaRow}${header}${body}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>3</SplitHorizontal><TopRowBottomPane>3</TopRowBottomPane><Selected/></WorksheetOptions></Worksheet>`;
}

function workbook(customers, applications, subscriptions, platforms) {
  const appsByCustomer = new Map();
  const subscriptionsByCustomer = new Map();
  for (const application of applications) {
    if (!appsByCustomer.has(application.customer_id)) appsByCustomer.set(application.customer_id, []);
    appsByCustomer.get(application.customer_id).push(application);
  }
  for (const subscription of subscriptions) {
    if (!subscriptionsByCustomer.has(subscription.customer_id)) subscriptionsByCustomer.set(subscription.customer_id, []);
    subscriptionsByCustomer.get(subscription.customer_id).push(subscription);
  }
  const customerById = Object.fromEntries(customers.map((customer) => [customer.id, customer]));
  const platformById = Object.fromEntries(platforms.map((platform) => [platform.id, platform]));
  const masterColumns = [
    "تاريخ التسجيل | Registration", "رقم العميل | Customer #", "الاسم الكامل | Full name", "البريد | Email", "الجوال | Mobile",
    "الدولة | Country", "حالة الحساب | Account status", "اللغة | Language", "الأسواق | Markets", "حالة الاشتراك | Subscription",
    "بداية الاشتراك | Start", "نهاية الاشتراك | End", "منصات الإحالة | Platforms", "أرقام الطلبات | References", "آخر تحديث | Updated",
  ];
  const masterWidths = [90, 105, 180, 210, 120, 70, 110, 70, 170, 110, 105, 105, 180, 220, 125];
  const customerRows = customers.map((customer) => {
    const customerApps = newest(appsByCustomer.get(customer.id) || []);
    const customerSubscriptions = newest(subscriptionsByCustomer.get(customer.id) || []);
    const current = activeSubscription(customerSubscriptions);
    const markets = [...new Set(customerSubscriptions.filter((item) => item.status === "active").map((item) => item.market_code))].join(", ");
    const platformNames = [...new Set(customerApps.map((item) => platformById[item.trading_platform_id]?.name_ar || item.platform_name_ar_snapshot || item.trading_platform_id).filter(Boolean))].join(", ");
    return [
      saudiDate(customer.created_date), customer.customer_number, customer.full_name, customer.email_normalized, customer.phone_e164,
      customer.country_code, customer.account_status, customer.preferred_language, markets, current?.status || "not_set",
      saudiDate(current?.starts_at), saudiDate(current?.ends_at), platformNames, customerApps.map((item) => item.unique_reference).join(", "), saudiDateTime(customer.updated_date || customer.created_date),
    ];
  });
  const referralColumns = [
    "تاريخ الطلب | Application date", "رقم العميل | Customer #", "العميل | Customer", "المنصة | Platform", "السوق | Market",
    "رقم الطلب الفريد | Unique reference", "الحالة | Status", "فتح رابط الإحالة | Referral opened", "تأكيد العميل | Customer confirmed",
    "نهاية الانتظار | Cooldown until", "قرار المالك | Owner decision", "سبب القرار | Decision reason", "البريد | Email", "الجوال | Mobile",
  ];
  const referralRows = newest(applications).map((application) => {
    const customer = customerById[application.customer_id] || {};
    const platform = platformById[application.trading_platform_id] || {};
    return [
      saudiDate(application.created_date), customer.customer_number, customer.full_name || application.full_name_snapshot,
      platform.name_ar || application.platform_name_ar_snapshot, application.market_code, application.unique_reference, application.status,
      saudiDateTime(application.referral_clicked_at), saudiDateTime(application.customer_confirmed_at), saudiDate(application.cooldown_until),
      saudiDateTime(application.reviewed_at), application.decision_reason, application.email_snapshot, application.phone_snapshot,
    ];
  });
  const subscriptionColumns = [
    "البداية | Start", "النهاية | End", "رقم العميل | Customer #", "العميل | Customer", "السوق | Market", "المنصة | Platform",
    "رقم الطلب | Reference", "الحالة | Status", "طريقة التفعيل | Activation", "السبب | Reason", "تاريخ الإنشاء | Created",
  ];
  const subscriptionRows = newest(subscriptions).map((subscription) => {
    const customer = customerById[subscription.customer_id] || {};
    const platform = platformById[subscription.trading_platform_id] || {};
    return [
      saudiDate(subscription.starts_at), saudiDate(subscription.ends_at), customer.customer_number, customer.full_name, subscription.market_code,
      platform.name_ar || platform.name_en || subscription.trading_platform_id, subscription.unique_reference, subscription.status,
      subscription.activation_method, subscription.reason, saudiDateTime(subscription.created_date),
    ];
  });
  const groups = new Map();
  for (const customer of customers) {
    const date = saudiDate(customer.created_date) || "unknown";
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(customer);
  }
  const dailySheets = [...groups.entries()].sort(([left], [right]) => right.localeCompare(left)).map(([date, rows]) => {
    const ids = new Set(rows.map((item) => item.id));
    return worksheet(date, `المسجلون في ${date} | Registrations on ${date}`, masterColumns, customerRows.filter((_, index) => ids.has(customers[index].id)), masterWidths, 6);
  });
  const sheets = [
    worksheet("All Customers", "المستثمر الذكي — جميع العملاء | Smart Investor — All Customers", masterColumns, customerRows, masterWidths, 6),
    worksheet("Referrals", "منصات الإحالة وطلبات الأسواق | Referral & Market Applications", referralColumns, referralRows, [95, 105, 175, 155, 115, 210, 105, 135, 135, 105, 130, 190, 200, 120], 6),
    worksheet("Subscriptions", "الاشتراكات والصلاحيات | Subscriptions & Entitlements", subscriptionColumns, subscriptionRows, [95, 95, 105, 175, 115, 160, 210, 105, 105, 190, 130], 7),
    ...dailySheets,
  ];
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles>
    <Style ss:ID="Default"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10"/></Style>
    <Style ss:ID="Title"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="15" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F172A" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Meta"><Alignment ss:Horizontal="Center"/><Font ss:Color="#475569" ss:Italic="1"/><Interior ss:Color="#E0F2FE" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Header"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0284C7" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#075985"/></Borders></Style>
    <Style ss:ID="Cell"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
    <Style ss:ID="DataRow"/>
    <Style ss:ID="AltRow"><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/></Style>
    <Style ss:ID="StatusActive"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Color="#047857"/><Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/></Style>
    <Style ss:ID="StatusPending"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Color="#92400E"/><Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/></Style>
    <Style ss:ID="StatusSuspended"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Color="#C2410C"/><Interior ss:Color="#FFEDD5" ss:Pattern="Solid"/></Style>
    <Style ss:ID="StatusDanger"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Color="#B91C1C"/><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/></Style>
  </Styles>${sheets.join("")}</Workbook>`;
}

async function owner(base44) {
  const rows = await base44.asServiceRole.entities.CustomerProfile.filter({ acquisition_source: "platform_owner_bootstrap" });
  return rows.find((item) => item.role === "owner" && item.tags?.includes("owner")) || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req, 16 * 1024);
    const args = body.args && typeof body.args === "object" ? body.args : body;
    const scheduled = args.action === "scheduled";
    let actor = "scheduled";
    if (scheduled) {
      const automationUser = await base44.auth.me();
      if (!automationUser || automationUser.role !== "admin") throw Object.assign(new Error("Automation authentication required"), { status: 401, code: "AUTOMATION_AUTH_REQUIRED" });
    } else {
      const context = await authorizationContext(base44, body.session_id);
      if (context.role !== "owner") throw Object.assign(new Error("Owner access required"), { status: 403, code: "OWNER_ONLY" });
      actor = context.user.id;
    }
    const reportDate = saudiDate(new Date());
    const snapshots = await base44.asServiceRole.entities.CustomerReportSnapshot.filter({ report_key: "customers_master" });
    if (scheduled && snapshots[0]?.report_date === reportDate) return Response.json({ skipped: true, reason: "daily_report_already_generated" });
    const [profileRows, applications, subscriptions, platforms] = await Promise.all([
      base44.asServiceRole.entities.CustomerProfile.list("-created_date", 10000),
      base44.asServiceRole.entities.MarketAccessApplication.list("-created_date", 10000),
      base44.asServiceRole.entities.Subscription.list("-created_date", 10000),
      base44.asServiceRole.entities.TradingPlatform.list("display_order", 100),
    ]);
    const customers = profileRows.filter((customer) => customer.role === "user");
    const customerIds = new Set(customers.map((customer) => customer.id));
    const customerApplications = applications.filter((item) => customerIds.has(item.customer_id));
    const customerSubscriptions = subscriptions.filter((item) => customerIds.has(item.customer_id));
    const xml = workbook(customers, customerApplications, customerSubscriptions, platforms);
    const file = new File([xml], `smart-investor-customers-${reportDate}.xls`, { type: "application/vnd.ms-excel" });
    const uploaded = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
    const fileUri = uploaded.file_uri || uploaded.file_url || uploaded.url;
    if (!fileUri) throw Object.assign(new Error("Private report upload failed"), { status: 502, code: "REPORT_UPLOAD_FAILED" });
    const now = new Date().toISOString();
    const payload = { file_uri: fileUri, generated_at: now, generated_by_user_id: actor, customer_count: customers.length, report_date: reportDate, revision: Number(snapshots[0]?.revision || 0) + 1 };
    const snapshot = snapshots[0]
      ? await base44.asServiceRole.entities.CustomerReportSnapshot.update(snapshots[0].id, payload)
      : await base44.asServiceRole.entities.CustomerReportSnapshot.create({ report_key: "customers_master", ...payload });
    const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 86400 });
    const downloadUrl = signed.signed_url || signed.url;
    const ownerProfile = await owner(base44);
    if (scheduled && ownerProfile?.email_normalized && downloadUrl) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: ownerProfile.email_normalized,
          subject: `تقرير عملاء المستثمر الذكي — ${reportDate}`,
          body: `تم تحديث التقرير اليومي المتكامل. العملاء: ${customers.length}، طلبات الإحالة: ${customerApplications.length}، الاشتراكات: ${customerSubscriptions.length}.\nرابط التحميل صالح لمدة 24 ساعة:\n${downloadUrl}`,
        });
      } catch { /* owner administration remains the authoritative download channel */ }
    }
    if (!scheduled) await audit(base44, actor, "customer_report.generated", "CustomerReportSnapshot", snapshot.id, "success", "owner request", {}, { report_date: reportDate, customer_count: customers.length, application_count: customerApplications.length, subscription_count: customerSubscriptions.length });
    return Response.json(scheduled
      ? { snapshot: { id: snapshot.id, report_date: snapshot.report_date, customer_count: snapshot.customer_count } }
      : { snapshot, download_url: downloadUrl, counts: { customers: customers.length, applications: customerApplications.length, subscriptions: customerSubscriptions.length } });
  } catch (error) { return replyError(error); }
});
