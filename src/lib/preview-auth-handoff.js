const HANDOFF_HASH_KEY = "kmy_preview_auth";
const PREVIEW_CONTEXT_KEYS = [
  "functions_version",
  "server_url",
  "base44_data_env",
  "_b44_commit",
  "previewFE_version",
  "app_id",
  "app_base_url",
];

export function isBase44PreviewHost(hostname = "") {
  const host = String(hostname).toLowerCase();
  return (host.startsWith("preview--") || host.startsWith("preview-sandbox--"))
    && host.endsWith(".base44.app");
}

export function safePreviewServerUrl(value, hostname = "") {
  if (!isBase44PreviewHost(hostname) || !value) return "";
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" && url.hostname === String(hostname).toLowerCase()
      ? url.origin
      : "";
  } catch {
    return "";
  }
}

function encodePayload(payload) {
  const value = btoa(JSON.stringify(payload));
  return value.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodePayload(value) {
  const normalized = String(value || "").replaceAll("-", "+").replaceAll("_", "/");
  const padding = "=".repeat((4 - normalized.length % 4) % 4);
  return JSON.parse(atob(normalized + padding));
}

/**
 * @param {import("react-router-dom").LinkProps["to"]} to
 * @param {{hostname?: string, search?: string, storage?: Storage | null}} [options]
 */
export function previewSafeHref(to, options = {}) {
  const { hostname, search, storage } = options;
  if (typeof to !== "string" || !to.startsWith("/")) return to;
  const browserHostname = hostname ?? (typeof window === "undefined" ? "" : window.location.hostname);
  const browserStorage = storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!browserStorage || !isBase44PreviewHost(browserHostname)) return to;
  const accessToken = browserStorage.getItem("base44_access_token") || browserStorage.getItem("token");
  const sessionId = browserStorage.getItem("kmy_session_id");
  if (!accessToken || !sessionId) return to;
  const payload = encodePayload({
    access_token: accessToken,
    session_id: sessionId,
    session_expires_at: browserStorage.getItem("kmy_session_expires_at") || "",
  });
  const url = new URL(to, "https://preview.invalid");
  const currentSearch = new URLSearchParams(search ?? (typeof window === "undefined" ? "" : window.location.search));
  for (const key of PREVIEW_CONTEXT_KEYS) {
    const value = currentSearch.get(key);
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  const hash = new URLSearchParams(url.hash.slice(1));
  hash.set(HANDOFF_HASH_KEY, payload);
  return `${url.pathname}${url.search}#${hash.toString()}`;
}

/**
 * @param {{location?: Location | {hostname: string, pathname: string, search: string, hash: string}, history?: History | {replaceState: Function}, storage?: Storage | null}} [options]
 */
export function consumePreviewAuthHandoff(options = {}) {
  const { location, history, storage } = options;
  const browserLocation = location ?? (typeof window === "undefined" ? null : window.location);
  const browserHistory = history ?? (typeof window === "undefined" ? null : window.history);
  const browserStorage = storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!browserLocation || !browserHistory || !browserStorage || !isBase44PreviewHost(browserLocation.hostname)) return false;
  const hash = new URLSearchParams(String(browserLocation.hash || "").slice(1));
  const encoded = hash.get(HANDOFF_HASH_KEY);
  if (!encoded) return false;
  let restored = false;
  try {
    const payload = decodePayload(encoded);
    if (payload?.access_token && payload?.session_id) {
      browserStorage.setItem("base44_access_token", payload.access_token);
      browserStorage.setItem("token", payload.access_token);
      browserStorage.setItem("kmy_session_id", payload.session_id);
      if (payload.session_expires_at) browserStorage.setItem("kmy_session_expires_at", payload.session_expires_at);
      restored = true;
    }
  } catch {
    restored = false;
  } finally {
    hash.delete(HANDOFF_HASH_KEY);
    const cleanHash = hash.toString();
    browserHistory.replaceState({}, "", `${browserLocation.pathname}${browserLocation.search}${cleanHash ? `#${cleanHash}` : ""}`);
  }
  return restored;
}
