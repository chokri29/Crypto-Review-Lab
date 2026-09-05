/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FinnhubQuote {
  symbol: string;
  c: number;   // Current price
  d?: number;  // Change
  dp?: number; // Percent change
  h?: number;  // High price of the day
  l?: number;  // Low price of the day
  o?: number;  // Open price of the day
  pc: number;  // Previous close price
  t?: number;  // Timestamp
  effectivePrice?: number;
  isLiveQuote?: boolean;
  priceLabel?: 'Live Equity Basis' | 'Last Close / After-Hours Basis' | 'Live Price' | 'Last Close' | 'Unavailable';
  basisLabel?: 'Live Equity Basis' | 'Last Close / After-Hours Basis';
  basisTimestampFormatted?: string;
}

export const FINNHUB_GAS_URL = 'https://script.google.com/macros/s/AKfycbz3gpHcXA-yc7myC5UNJ-pIJyNnE1xXfAO_v3vlfbjJOSH345Cc4DtoGPYzcHq3diUUAg/exec';

// In-memory cache for Finnhub quotes per ticker symbol (TTL: 60 seconds)
const finnhubCache: Record<string, { data: FinnhubQuote | null; timestamp: number }> = {};
const CACHE_TTL_MS = 60 * 1000;

/**
 * Fetches live underlying equity quote from Finnhub via server proxy or Google Apps Script proxy.
 * Strict Fallback Rule: If Finnhub fails or returns zero data, returns null.
 * Never synthesizes or fabricates synthetic price numbers.
 */
export async function fetchLiveFinnhubQuote(
  symbol: string, 
  isMarketOpen: boolean = true,
  forceRefresh = false
): Promise<FinnhubQuote | null> {
  if (!symbol || typeof symbol !== 'string') return null;
  const cleanSymbol = symbol.trim().toUpperCase();
  if (!cleanSymbol) return null;

  const now = Date.now();
  const cached = finnhubCache[cleanSymbol];
  if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    // 1. Try server proxy first
    let response = await fetch(`/api/finnhub/quote?symbol=${encodeURIComponent(cleanSymbol)}`);

    // 2. Direct Apps Script proxy fallback if server proxy fails
    if (!response.ok) {
      response = await fetch(`${FINNHUB_GAS_URL}?symbol=${encodeURIComponent(cleanSymbol)}`);
    }

    if (response.ok) {
      const data = await response.json();
      
      const c = typeof data.c === 'number' && !isNaN(data.c) ? data.c : 0;
      const pc = typeof data.pc === 'number' && !isNaN(data.pc) ? data.pc : 0;

      // If both c and pc are 0, it means ticker returned no valid quote
      if (c <= 0 && pc <= 0) {
        finnhubCache[cleanSymbol] = { data: null, timestamp: now };
        return null;
      }

      // If market is closed, use previous close (pc) if available, otherwise c
      // If market is open and c > 0, use c (live quote)
      let effectivePrice = 0;
      let isLiveQuote = false;
      const basisLabel: 'Live Equity Basis' | 'Last Close / After-Hours Basis' = isMarketOpen ? 'Live Equity Basis' : 'Last Close / After-Hours Basis';
      let priceLabel: 'Live Equity Basis' | 'Last Close / After-Hours Basis' = basisLabel;

      if (isMarketOpen && c > 0) {
        effectivePrice = c;
        isLiveQuote = true;
        priceLabel = 'Live Equity Basis';
      } else if (!isMarketOpen && pc > 0) {
        effectivePrice = pc;
        isLiveQuote = false;
        priceLabel = 'Last Close / After-Hours Basis';
      } else if (c > 0) {
        effectivePrice = c;
        isLiveQuote = isMarketOpen;
        priceLabel = isMarketOpen ? 'Live Equity Basis' : 'Last Close / After-Hours Basis';
      } else if (pc > 0) {
        effectivePrice = pc;
        isLiveQuote = false;
        priceLabel = 'Last Close / After-Hours Basis';
      }

      if (effectivePrice <= 0) {
        finnhubCache[cleanSymbol] = { data: null, timestamp: now };
        return null;
      }

      const quoteTimestamp = typeof data.t === 'number' && data.t > 0 ? data.t : null;
      const basisTimestampFormatted = quoteTimestamp !== null ? new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(new Date(quoteTimestamp * 1000)) + ' ET' : undefined;

      const quote: FinnhubQuote = {
        symbol: cleanSymbol,
        c,
        d: typeof data.d === 'number' ? data.d : undefined,
        dp: typeof data.dp === 'number' ? data.dp : undefined,
        h: typeof data.h === 'number' ? data.h : undefined,
        l: typeof data.l === 'number' ? data.l : undefined,
        o: typeof data.o === 'number' ? data.o : undefined,
        pc,
        t: quoteTimestamp ?? undefined,
        effectivePrice,
        isLiveQuote,
        priceLabel,
        basisLabel,
        basisTimestampFormatted
      };

      finnhubCache[cleanSymbol] = { data: quote, timestamp: now };
      return quote;
    }
  } catch (err) {
    console.warn(`Finnhub quote fetch error for ${cleanSymbol}:`, err);
  }

  finnhubCache[cleanSymbol] = { data: null, timestamp: now };
  return null;
}
