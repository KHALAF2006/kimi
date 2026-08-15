const LEASE_MS = 45_000;

function leaseError() {
  return Object.assign(new Error("Registration is already being completed. Please wait a moment and try again."), {
    code: "REGISTRATION_IN_PROGRESS",
    status: 409,
  });
}

export async function acquireRegistrationLease(base44, userId, now = new Date()) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + LEASE_MS).toISOString();
  await base44.asServiceRole.entities.User.update(userId, {
    registration_lock_token: token,
    registration_lock_expires_at: expiresAt,
  });
  await new Promise((resolve) => setTimeout(resolve, 80));
  const current = await base44.asServiceRole.entities.User.get(userId);
  if (current?.registration_lock_token !== token) throw leaseError();
  return { token, expiresAt };
}

export async function assertRegistrationLease(base44, userId, token) {
  const current = await base44.asServiceRole.entities.User.get(userId);
  if (current?.registration_lock_token !== token || new Date(current.registration_lock_expires_at || 0) <= new Date()) throw leaseError();
}

export async function releaseRegistrationLease(base44, userId, token) {
  if (!token) return;
  const current = await base44.asServiceRole.entities.User.get(userId);
  if (current?.registration_lock_token !== token) return;
  await base44.asServiceRole.entities.User.update(userId, {
    registration_lock_token: "released",
    registration_lock_expires_at: "1970-01-01T00:00:00.000Z",
  });
}
