export type PreviewRole = "guest" | "faculty" | "admin";

export const PREVIEW_ROLE_STORAGE_KEY = "museum-preview-role";
export const PREVIEW_ROLE_COOKIE_KEY = "museum-preview-role";
export const PREVIEW_ROLE_EVENT = "museum-preview-role-change";
export const PREVIEW_ROLE_HEADER = "X-Preview-Role";
export function isPreviewAuthFeatureEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_PREVIEW_AUTH === "true";
}

export function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function canUsePreviewAuthForHostname(hostname: string) {
  return isPreviewAuthFeatureEnabled() && isLocalHostname(hostname);
}
