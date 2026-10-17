/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Canonical Google Apps Script (GAS) API Proxy URLs.
 * Centralized proxy definitions for CoinGecko, CoinStats, Finnhub, and CoinMarketCap.
 */

export const COINGECKO_GAS_URL = 'https://script.google.com/macros/s/AKfycbx8IhUCbCseu3TX25KSOIoc8LjxcxjBJoRrzjNy-YM7bZXbfFdfCMS1NRfxiQZ_skyA/exec';
export const COINSTATS_GAS_URL = 'https://script.google.com/macros/s/AKfycbxZcbIpURQQbpVgeMS0VnZmmvNWNpUL4gjXPawedaMfTHZErcP_eztewwd5fplJzOqvhA/exec';
export const FINNHUB_GAS_URL = 'https://script.google.com/macros/s/AKfycbz3gpHcXA-yc7myC5UNJ-pIJyNnE1xXfAO_v3vlfbjJOSH345Cc4DtoGPYzcHq3diUUAg/exec';
export const CMC_GAS_URL = 'https://script.google.com/macros/s/AKfycbzjgMcPBg3IKS8HDrDVSax_xH6IuJITWT6OSZtTl_56q7A9S9a0c-LxIb7e6WxRwXM/exec';

/**
 * Appends server-side shared GAS authentication token if present in process.env.
 * Strictly operates server-side only; never exposes tokens to browser/client bundles.
 */
export function appendGasToken(url: string): string {
  if (typeof process !== 'undefined' && process?.env?.GAS_SHARED_TOKEN) {
    const token = process.env.GAS_SHARED_TOKEN.trim();
    if (token) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}t=${encodeURIComponent(token)}`;
    }
  }
  return url;
}
