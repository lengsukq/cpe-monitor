export class ClientApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ClientApiError';
    this.status = status;
    this.payload = payload;
  }
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const errorValue = (payload as { error?: unknown }).error;
    if (typeof errorValue === 'string' && errorValue.trim()) {
      return errorValue;
    }
  }
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const messageValue = (payload as { message?: unknown }).message;
    if (typeof messageValue === 'string' && messageValue.trim()) {
      return messageValue;
    }
  }
  return fallback;
}

/**
 * Browser-side fetch helper: checks res.ok, parses JSON, throws ClientApiError.
 */
export async function apiFetch<T>(
  url: string,
  init?: RequestInit,
  fallbackError = '请求失败',
): Promise<T> {
  const response = await fetch(url, init);
  let payload: unknown = null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  } else {
    const text = await response.text();
    payload = text || null;
  }

  if (!response.ok) {
    throw new ClientApiError(
      extractErrorMessage(payload, fallbackError),
      response.status,
      payload,
    );
  }

  return payload as T;
}
