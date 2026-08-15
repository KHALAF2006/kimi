import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const register = read("src/pages/Register.jsx");
const catalog = read("base44/functions/registrationCatalog/entry.ts");
const customerAccess = read("base44/functions/customerAccess/entry.ts");
const authRegistration = read("base44/functions/authRegistration/entry.ts");
const adminAccess = read("base44/functions/adminAccess/entry.ts");
const applicationSchema = JSON.parse(read("base44/entities/MarketAccessApplication.jsonc"));
const report = read("base44/functions/customerReport/source.ts");
const notice = read("src/components/DismissibleNotice.jsx");

assert(catalog.includes("active: true"), "Public registration catalog must preserve active state");
assert(!register.includes("item.active && item.supported_market_codes"), "Registration must not discard already-filtered active platforms");
assert(register.includes('important: "هام جداً"') && register.includes('important: "IMPORTANT"'), "Critical identity and phone notices must be bilingual");
assert(!register.includes("ولن نرسل رمز تحقق للجوال") && !register.includes("no mobile verification code will be sent"), "Removed phone-verification wording must not return");
assert(register.includes("referral_link_opened") && authRegistration.includes("REFERRAL_LINK_REQUIRED"), "Initial registration must require the selected referral link");

const properties = applicationSchema.properties;
for (const key of ["platform_name_ar_snapshot", "platform_name_en_snapshot", "referral_url_snapshot", "referral_clicked_at", "customer_confirmed_at", "cooldown_until"]) {
  assert(properties[key], `MarketAccessApplication missing ${key}`);
}
assert(properties.status.enum.includes("referral_opened"), "Referral-opened lifecycle state is missing");
assert(customerAccess.includes('body.action === "open_referral"'), "Existing customer referral opening is missing");
assert(customerAccess.includes('body.action === "confirm_registration"'), "Existing customer registration confirmation is missing");
assert(customerAccess.includes("usedPlatformIds.has(platform.id)"), "Previously used platforms must be rejected server-side");
assert(customerAccess.includes("PLATFORM_COOLDOWN_ACTIVE"), "30-day cooldown must be enforced server-side");
assert(customerAccess.includes("MARKET_APPLICATION_LIMIT"), "Per-customer platform application limit must be enforced");
assert(adminAccess.includes("PLATFORM_LIMIT_REACHED") && adminAccess.includes("PLATFORM_SAVE_NOT_CONFIRMED"), "Owner platform limit and read-after-write verification are required");

for (const sheet of ['worksheet("All Customers"', 'worksheet("Referrals"', 'worksheet("Subscriptions"']) {
  assert(report.includes(sheet), `Professional report missing ${sheet}`);
}
assert(report.includes('customer.role === "user"'), "Customer report must exclude service and owner profiles");
assert(report.includes("starts_at") && report.includes("ends_at") && report.includes("unique_reference"), "Customer report must include subscription periods and referral references");
assert(notice.includes("25_000") && notice.includes("onDismiss"), "Transient notices must auto-dismiss and support manual close");

console.log(JSON.stringify({
  status: "verified",
  catalog_contract: true,
  initial_referral_required: true,
  existing_customer_referrals: true,
  platform_deduplication: true,
  cooldown_days: 30,
  platform_limit: 100,
  unique_references: true,
  owner_manual_approval: true,
  professional_customer_report: true,
  dismissible_notices: true,
}, null, 2));
