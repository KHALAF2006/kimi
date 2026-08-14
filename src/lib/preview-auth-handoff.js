const LEGACY_HANDOFF_HASH_KEY = "smart_investor_preview_auth";
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
  for (const key of PREVIEW_CONTEXT_KEYS) {
    const value = currentSearch.get(key);
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
