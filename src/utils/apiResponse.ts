/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Validates that a fetch response is successful and contains valid JSON,
 * protecting against custom domains, Cloudflare SPA rules, or proxy masks
 * that return an HTML page (such as index.html) with HTTP 200.
 */
export function isJsonResponse(res: Response): boolean {
  if (!res.ok) return false;
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  return contentType.includes('application/json');
}

/**
 * Safely parses JSON from a fetch Response. Returns null if the response is not OK,
 * not JSON, or if JSON parsing fails.
 */
export async function safeJsonParse<T = any>(res: Response): Promise<T | null> {
  try {
    if (!isJsonResponse(res)) return null;
    return await res.json();
  } catch {
    return null;
  }
}
