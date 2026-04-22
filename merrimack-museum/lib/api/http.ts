import {
  PREVIEW_ROLE_HEADER,
  PREVIEW_ROLE_STORAGE_KEY,
  canUsePreviewAuthForHostname,
} from "@/shared/previewAuth";
import { readApiErrorMessage } from "@/shared/apiError";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
};
function getPreviewRoleHeader() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!canUsePreviewAuthForHostname(window.location.hostname)) {
    return null;
  }

  const value = window.localStorage.getItem(PREVIEW_ROLE_STORAGE_KEY);
  return value === "admin" || value === "faculty" ? value : null;
}

export async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  for (const [key, value] of Object.entries(JSON_HEADERS)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }

  const previewRole = getPreviewRoleHeader();
  if (previewRole && !headers.has(PREVIEW_ROLE_HEADER)) {
    headers.set(PREVIEW_ROLE_HEADER, previewRole);
  }

  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });

  const responseText = await response.text();

  if (!response.ok) {
    const fallbackMessage = `HTTP error! Status: ${response.status}`;
    const detail = readApiErrorMessage(responseText, "");

    throw new Error(detail ? `${fallbackMessage} - ${detail}` : fallbackMessage);
  }

  if (response.status === 204 || !responseText) {
    return undefined as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error("Expected a JSON response body");
  }
}
