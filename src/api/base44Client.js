import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;
const configuredReferenceApi = String(import.meta.env.VITE_KMY_REFERENCE_API || "").replace(/\/$/, "");
const isLocalReferencePreview = import.meta.env.DEV
  && (!configuredReferenceApi || /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(configuredReferenceApi));

function referenceOnlyError() {
  throw new Error("base44_unavailable_in_reference_preview");
}

const referenceClient = {
  auth: {
    me: async () => ({ id: "reference-preview", role: "owner" }),
    logout: () => {
      localStorage.removeItem("base44_access_token");
      window.location.assign("/");
    },
    redirectToLogin: () => window.location.assign("/login"),
    resetPasswordRequest: referenceOnlyError,
    loginViaEmailPassword: referenceOnlyError,
    register: referenceOnlyError,
    verifyOtp: referenceOnlyError,
    setToken: referenceOnlyError,
    resetPassword: referenceOnlyError,
  },
  functions: { invoke: referenceOnlyError },
};

// The SDK is not initialized in the local reference preview. This prevents
// stale Base44 credentials from starting background network refreshes while
// every market read is intentionally served by the verified local backend.
export const base44 = isLocalReferencePreview
  ? referenceClient
  : createClient({
      appId,
      token,
      functionsVersion,
      serverUrl: "",
      requiresAuth: false,
      appBaseUrl,
    });
