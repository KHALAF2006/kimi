type IngestionRun = {
  id?: string;
  status?: string;
  lease_expires_at?: string;
  notes?: string;
};

function rows(value: unknown): IngestionRun[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray((value as any)?.data)) return (value as any).data;
  if (Array.isArray((value as any)?.items)) return (value as any).items;
  return [];
}

export function isExpiredIngestionRun(run: IngestionRun, nowMs = Date.now()) {
  if (run?.status !== "running") return false;
  const leaseExpiresAt = Date.parse(String(run.lease_expires_at || ""));
  return Number.isFinite(leaseExpiresAt) && leaseExpiresAt <= nowMs;
}

export async function closeExpiredIngestionRuns(base44: any, marketCode: string, now = new Date()) {
  const candidates = rows(await base44.asServiceRole.entities.IngestionRun.filter(
    { market_code: marketCode, status: "running" },
    "started_at",
    500,
  ));
  const expired = candidates.filter((run) => run.id && isExpiredIngestionRun(run, now.getTime()));

  for (const run of expired) {
    await base44.asServiceRole.entities.IngestionRun.update(run.id, {
      status: "failed",
      finished_at: now.toISOString(),
      failure_code: "LEASE_EXPIRED",
      notes: JSON.stringify({
        reason: "execution_lease_expired",
        previous_notes: String(run.notes || "").slice(0, 700),
      }).slice(0, 1000),
    });
  }

  return { inspected: candidates.length, closed: expired.length };
}
