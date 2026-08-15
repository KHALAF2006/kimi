import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { reconcileRegistrationGraph } from "../base44/shared/registrationState.mjs";
import { uniqueApplicationReference } from "../base44/shared/marketAccess.ts";
import { acquireRegistrationLease, releaseRegistrationLease } from "../base44/shared/registrationLease.mjs";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

function mockBase44({ failApplicationOnce = false } = {}) {
  const collections = new Map();
  let sequence = 0;
  let shouldFailApplication = failApplicationOnce;
  const entities = new Proxy({}, {
    get(_target, name) {
      if (!collections.has(name)) collections.set(name, []);
      const rows = collections.get(name);
      return {
        async filter(query = {}) {
          return rows.filter((row) => Object.entries(query).every(([key, value]) => row[key] === value));
        },
        async create(values) {
          if (name === "MarketAccessApplication" && shouldFailApplication) {
            shouldFailApplication = false;
            throw Object.assign(new Error("simulated application write failure"), { code: "SIMULATED_WRITE_FAILURE", status: 503 });
          }
          const row = { id: `${String(name)}-${++sequence}`, created_date: new Date().toISOString(), ...structuredClone(values) };
          rows.push(row);
          return structuredClone(row);
        },
        async update(id, patch) {
          const index = rows.findIndex((row) => row.id === id);
          if (index < 0) throw new Error(`${String(name)} not found`);
          rows[index] = { ...rows[index], ...structuredClone(patch) };
          return structuredClone(rows[index]);
        },
      };
    },
  });
  return { base44: { asServiceRole: { entities } }, collections };
}

const user = { id: "auth-user-1", email: "customer@example.com" };
const owner = { id: "owner-profile-1", auth_user_id: "owner-auth-1" };
const platform = { id: "platform-1", name_ar: "منصة اختبار", name_en: "Test Platform", referral_url: "https://example.com/ref" };
const values = {
  email: user.email,
  phone: "+966500000000",
  fullName: "عميل اختبار حقيقي",
  country: "SA",
  language: "ar",
  marketCode: "SA_MAIN",
  termsVersion: "test",
  cooldownUntil: "2026-09-14T00:00:00.000Z",
};
const now = "2026-08-15T00:00:00.000Z";
const environment = mockBase44({ failApplicationOnce: true });

const leaseUser = { id: user.id };
const leaseBase44 = {
  asServiceRole: {
    entities: {
      User: {
        async updateMany(query, operations) {
          if (query.id !== leaseUser.id) return { success: true, updated: 0 };
          if (query.registration_lock_token && query.registration_lock_token !== leaseUser.registration_lock_token) {
            return { success: true, updated: 0 };
          }
          if (query.$or) {
            const expired = leaseUser.registration_lock_expires_at && leaseUser.registration_lock_expires_at < now;
            if (leaseUser.registration_lock_token && !expired) return { success: true, updated: 0 };
          }
          Object.assign(leaseUser, operations.$set || {});
          for (const field of Object.keys(operations.$unset || {})) delete leaseUser[field];
          return { success: true, updated: 1 };
        },
      },
    },
  },
};
const firstLease = await acquireRegistrationLease(leaseBase44, user.id, new Date(now));
await assert.rejects(
  acquireRegistrationLease(leaseBase44, user.id, new Date(now)),
  (error) => error.code === "REGISTRATION_IN_PROGRESS",
  "Concurrent registration completion must be rejected while the first request owns the lease",
);
await releaseRegistrationLease(leaseBase44, user.id, firstLease.token);
await acquireRegistrationLease(leaseBase44, user.id, new Date(now));

await assert.rejects(
  reconcileRegistrationGraph(environment.base44, { user, owner, platform, values, now, allocateReference: uniqueApplicationReference }),
  /simulated application write failure/,
  "The failure injection must interrupt the first registration attempt",
);
assert.equal(environment.collections.get("CustomerProfile").length, 1, "The injected failure should leave one resumable profile");
assert.equal(environment.collections.get("MarketAccessApplication").length, 0, "The failed application write must not fabricate a request");

const resumed = await reconcileRegistrationGraph(environment.base44, { user, owner, platform, values, now, allocateReference: uniqueApplicationReference });
assert.equal(resumed.profile.registration_state, "completed", "Retry must complete the server-side registration state");
assert.match(resumed.application.unique_reference, /^SI-SAMAIN-[A-F0-9]{16}$/, "Customer must receive a valid unique application reference");
assert.equal(Boolean(resumed.ownerMessage?.id), true, "Owner message must be created before success is returned");

const repeated = await reconcileRegistrationGraph(environment.base44, { user, owner, platform, values, now, allocateReference: uniqueApplicationReference });
assert.equal(repeated.application.id, resumed.application.id, "Repeated completion must return the same application");
assert.equal(environment.collections.get("CustomerProfile").length, 1, "Repeated completion must not duplicate the customer");
assert.equal(environment.collections.get("MarketAccessApplication").length, 1, "Repeated completion must not duplicate the application");
assert.equal(environment.collections.get("Message").length, 1, "Repeated completion must not duplicate the owner notification");
assert.equal(environment.collections.get("CustomerConsent").length, 2, "Repeated completion must not duplicate consent records");
assert.equal(environment.collections.get("NotificationPreference").length, 1, "Repeated completion must not duplicate notification preferences");

const missingOwnerEnvironment = mockBase44();
await assert.rejects(
  reconcileRegistrationGraph(missingOwnerEnvironment.base44, { user, owner: null, platform, values, now, allocateReference: uniqueApplicationReference }),
  (error) => error.code === "OWNER_NOTIFICATION_TARGET_MISSING",
  "Registration must fail before writes when no trusted owner can receive the request",
);
assert.equal(missingOwnerEnvironment.collections.size, 0, "Missing owner must not leave partial database records");

console.log(JSON.stringify({
  status: "verified",
  partial_failure_resumable: true,
  idempotent_completion: true,
  unique_reference_visible: true,
  owner_notification_required: true,
  duplicate_graph_prevented: true,
  concurrent_completion_serialized: true,
}, null, 2));
