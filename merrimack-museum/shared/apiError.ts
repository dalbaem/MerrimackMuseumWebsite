interface ApiErrorPayload {
  details?: string;
  error?: string;
  message?: string;
}

export function readApiErrorMessage(
  responseText: string,
  fallbackMessage: string,
) {
  if (!responseText) {
    return fallbackMessage;
  }

  try {
    const parsed = JSON.parse(responseText) as ApiErrorPayload;
    return parsed.error || parsed.details || parsed.message || fallbackMessage;
  } catch {
    return responseText;
  }
}
