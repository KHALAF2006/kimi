const MAX_REFERENCE_ATTEMPTS = 8;

export const MARKET_APPLICATION_LIMIT = 100;
export const PLATFORM_COOLDOWN_DAYS = 30;

export function cooldownUntil(value: unknown) {
  const start = new Date(String(value || ""));
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + PLATFORM_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
}

export async function uniqueApplicationReference(base44: any, marketCode: string) {
  const market = String(marketCode || "MARKET").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "MARKET";
  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    const entropy = crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase();
    const candidate = `SI-${market}-${entropy}`;
    const duplicate = await base44.asServiceRole.entities.MarketAccessApplication.filter({ unique_reference: candidate });
    if (!duplicate[0]) return candidate;
  }
  throw Object.assign(new Error("Unable to allocate a unique application reference"), {
    code: "REFERENCE_ALLOCATION_FAILED",
    status: 503,
  });
}

export function latestApplication(rows: any[] = []) {
  return [...rows].sort((left, right) => {
    const leftTime = new Date(left.referral_clicked_at || left.created_date || 0).getTime();
    const rightTime = new Date(right.referral_clicked_at || right.created_date || 0).getTime();
    return rightTime - leftTime;
  })[0] || null;
}
