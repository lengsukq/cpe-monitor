const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/+$/, '');

/**
 * Prepends NEXT_PUBLIC_BASE_PATH to app-relative paths for browser APIs
 * (fetch, EventSource, <a href>) that Next.js does not rewrite automatically.
 */
export function withBasePath(path: string, basePath = BASE_PATH): string {
  const normalizedBase = basePath.replace(/\/+$/, '');
  if (!path.startsWith('/')) return path;
  if (!normalizedBase || path === normalizedBase || path.startsWith(`${normalizedBase}/`)) {
    return path;
  }
  return `${normalizedBase}${path}`;
}
