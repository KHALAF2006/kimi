const LEASE_MS = 45_000;

function leaseError() {
  return Object.assign(new Error("Registration is already being completed. Please wait a moment and try again."), {
    code: "REGISTRATION_IN_PROGRESS",
    status: 409,
  });
}

export async function acquireRegistrationLease(base44, userId, now = new Date()) {
  const token = crypto.randomUUID();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + LEASE_MS).toISOString();
  const result = await base44.asServiceRole.entities.User.updateMany(
    {
      id: userId,
      $or: [
        { registration_lock_token: null },
        { registration_lock_expires_at: { $lt: nowIso } },
      ],
    },
    {
      $set: {
        registration_lock_token: token,
        registration_lock_expires_at: expiresAt,
      },
    },
  );
  if (!result?.success || Number(result.updated) !== 1) throw leaseError();
  return { token, expiresAt };
}

export async function releaseRegistrationLease(base44, userId, token) {
  if (!token) return;
  await base44.asServiceRole.entities.User.updateMany(
    { id: userId, registration_lock_token: token },
    { $unset: { registration_lock_token: 1, registration_lock_expires_at: 1 } },
  );
}
