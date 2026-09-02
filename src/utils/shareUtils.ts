/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Resolves the public, shareable URL for external visitors without Google authentication requirements.
 * In development container environments (e.g. `ais-dev-...`), it converts the origin to the public
 * preview URL (`ais-pre-...`) which is publicly accessible to any visitor on the web.
 */
export function getPublicBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;

    // If running on an internal ais-dev development URL, transform to the public ais-pre URL
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }

    // If running locally, fallback to the public preview endpoint or canonical production domain
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'https://ais-pre-pdkemchly6453zkdn6oggx-534731101661.europe-west1.run.app';
    }

    return origin;
  }
  return 'https://ais-pre-pdkemchly6453zkdn6oggx-534731101661.europe-west1.run.app';
}

/**
 * Returns a public share link for a specific crypto review report.
 */
export function getPublicReviewShareUrl(reviewId?: string | null): string {
  const base = getPublicBaseUrl();
  const url = new URL(base);
  url.searchParams.set('tab', 'blog');
  if (reviewId) {
    url.searchParams.set('review', reviewId);
  } else {
    url.searchParams.delete('review');
  }
  return url.toString();
}

/**
 * Returns a public share link for a specific tokenized xStock verification telemetry panel.
 */
export function getPublicXStockShareUrl(stockSymbol?: string | null): string {
  const base = getPublicBaseUrl();
  const url = new URL(base);
  url.searchParams.set('tab', 'xstocks');
  if (stockSymbol) {
    url.searchParams.set('stock', stockSymbol);
  } else {
    url.searchParams.delete('stock');
  }
  return url.toString();
}

/**
 * Safely copies text to clipboard with modern Clipboard API and fallback textarea support.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.debug('navigator.clipboard writeText failed, attempting fallback...', err);
  }

  // Fallback for legacy browsers or iframe sandbox restrictions
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackErr) {
    console.warn('Fallback copy to clipboard failed:', fallbackErr);
    return false;
  }
}
