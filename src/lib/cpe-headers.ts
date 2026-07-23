/**
 * Shared HTTP header constants for CPE device communication.
 * Eliminates duplication across authenticator, API calls, and readers.
 */

export const CPE_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

export const CPE_AJAX_ACCEPT =
  'application/json, text/javascript, */*; q=0.01';

/** Base headers used for authenticated AJAX requests to the CPE. */
export function buildCpeSessionHeaders(
  sessionId: string,
  token: string,
): Record<string, string> {
  return {
    'Cookie': `SessionID=${sessionId}`,
    '__RequestVerificationToken': token,
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': CPE_AJAX_ACCEPT,
    'User-Agent': CPE_USER_AGENT,
    '_ResponseSource': 'Broswer',
  };
}

/** Headers for the initial page load request (no session yet). */
export const CPE_INIT_HEADERS: Record<string, string> = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent': CPE_USER_AGENT,
};

/** Headers for token refresh requests. */
export function buildCpeTokenHeaders(
  sessionId: string,
  token: string,
): Record<string, string> {
  return {
    'Cookie': `SessionID=${sessionId}`,
    '__RequestVerificationToken': token,
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': CPE_AJAX_ACCEPT,
    'User-Agent': CPE_USER_AGENT,
  };
}
