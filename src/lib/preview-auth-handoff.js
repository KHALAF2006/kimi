const LEGACY_HANDOFF_HASH_KEY = "smart_investor_preview_auth";
const PREVIEW_CONTEXT_STORAGE_KEY = "smart_investor_preview_context";
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

function safeStoredPreviewContext(hostname, storage) {
  if (!isBase44PreviewHost(hostname) || !storage) return {};
  try {
    const parsed = JSON.parse(storage.getItem(PREVIEW_CONTEXT_STORAGE_KEY) || "{}");
    if (parsed.hostname !== String(hostname).toLowerCase() || !parsed.values || typeof parsed.values !== "object") return {};
    return parsed.values;
  } catch {
    return {};
  }
}

/** Preserve non-secret Base44 preview routing context for same-origin tabs. */
export function rememberPreviewContext(options = {}) {
  const browserLocation = options.location ?? (typeof window === "undefined" ? null : window.location);
  const storage = options.storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!browserLocation || !storage || !isBase44PreviewHost(browserLocation.hostname)) return false;
  const current = new URLSearchParams(browserLocation.search || "");
  const previous = safeStoredPreviewContext(browserLocation.hostname, storage);
  const values = { ...previous };
  for (const key of PREVIEW_CONTEXT_KEYS) {
    const value = current.get(key);
    if (!value) continue;
    if (key === "server_url" && !safePreviewServerUrl(value, browserLocation.hostname)) continue;
    values[key] = value;
  }
  if (!Object.keys(values).length) return false;
  storage.setItem(PREVIEW_CONTEXT_STORAGE_KEY, JSON.stringify({
    hostname: String(browserLocation.hostname).toLowerCase(),
    values,
  }));
  return true;
}

/**
 * @param {import("react-router-dom").LinkProps["to"]} to
 * @param {{hostname?: string, search?: string, storage?: Storage | null}} [options]
 */
export function previewSafeHref(to, options = {}) {
  const { hostname, search } = options;
  if (typeof to !== "string" || !to.startsWith("/")) return to;
  const browserHostname = hostname ?? (typeof window === "undefined" ? "" : window.location.hostname);
  if (!isBase44PreviewHost(browserHostname)) return to;
  const url = new URL(to, "https://preview.invalid");
  const currentSearch = new URLSearchParams(search ?? (typeof window === "undefined" ? "" : window.location.search));
  const storage = options.storage ?? (typeof window === "undefined" ? null : window.localStorage);
  const stored = safeStoredPreviewContext(browserHostname, storage);
  for (const key of PREVIEW_CONTEXT_KEYS) {
    const value = currentSearch.get(key) || stored[key];
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * @param {{location?: Location | {hostname: string, pathname: string, search: string, hash: string}, history?: History | {replaceState: Function}, storage?: Storage | null}} [options]
 */
export function consumePreviewAuthHandoff(options = {}) {
  const { location, history } = options;
  const browserLocation = location ?? (typeof window === "undefined" ? null : window.location);
  const browserHistory = history ?? (typeof window === "undefined" ? null : window.history);
  if (!browserLocation || !browserHistory || !isBase44PreviewHost(browserLocation.hostname)) return false;
  const hash = new URLSearchParams(String(browserLocation.hash || "").slice(1));
  if (!hash.has(LEGACY_HANDOFF_HASH_KEY)) return false;
  hash.delete(LEGACY_HANDOFF_HASH_KEY);
  const cleanHash = hash.toString();
  browserHistory.replaceState({}, "", `${browserLocation.pathname}${browserLocation.search}${cleanHash ? `#${cleanHash}` : ""}`);
  return false;
}
