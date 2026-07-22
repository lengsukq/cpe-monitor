export type CpeXmlValue = string | number | boolean;

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x2F;/gi, '/')
    .replace(/&#x3D;/gi, '=')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function escapeXml(value: CpeXmlValue): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function extractXmlTag(xml: string, tag: string): string {
  const safeTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = xml.match(new RegExp(`<${safeTag}>([\\s\\S]*?)</${safeTag}>`, 'i'));
  return match ? decodeHtmlEntities(match[1]).trim() : '';
}

export function parseCpeRecord(value: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    const source = object.response && typeof object.response === 'object'
      ? object.response as Record<string, unknown>
      : object.data && typeof object.data === 'object'
        ? object.data as Record<string, unknown>
        : object;
    for (const [key, item] of Object.entries(source)) {
      if (item !== null && ['string', 'number', 'boolean'].includes(typeof item)) {
        result[key] = decodeHtmlEntities(String(item));
      }
    }
    return result;
  }

  if (typeof value !== 'string' || /<error[\s>]/i.test(value)) return result;
  const matches = value.matchAll(/<([\w-]+)>([^<]*)<\/\1>/g);
  for (const match of matches) {
    result[match[1]] = decodeHtmlEntities(match[2]);
  }
  return result;
}

export function buildXmlRequest(values: Record<string, CpeXmlValue>): string {
  const body = Object.entries(values)
    .map(([key, value]) => `<${key}>${escapeXml(value)}</${key}>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><request>${body}</request>`;
}

export function isCpeAuthenticationFailure(status: number, responseText: string): boolean {
  if (status === 401 || status === 403) return true;
  if (/<title>[^<]*(登录|login)/i.test(responseText)) return true;
  return ['125001', '125002', '125003'].includes(extractXmlTag(responseText, 'code'));
}
