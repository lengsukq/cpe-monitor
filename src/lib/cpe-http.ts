const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

export function getCpeRequestTimeoutMs(): number {
  const configured = Number(process.env.CPE_REQUEST_TIMEOUT_MS || DEFAULT_REQUEST_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 1_000
    ? Math.floor(configured)
    : DEFAULT_REQUEST_TIMEOUT_MS;
}

export async function fetchCpe(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = getCpeRequestTimeoutMs();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`CPE 请求超时（${Math.ceil(timeoutMs / 1000)} 秒）：${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
