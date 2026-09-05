/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CMCQuoteItem {
  id?: number;
  name?: string;
  symbol: string;
  cmcRank?: number;
  price?: number;
  volume24h?: number;
  marketCap?: number;
  percentChange24h?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  lastUpdated?: string;
  dataEngine?: string;
  dataSources?: string[];
}

export const CMC_GAS_URL = 'https://script.google.com/macros/s/AKfycbzjgMcPBg3IKS8HDrDVSax_xH6IuJITWT6OSZtTl_56q7A9S9a0c-LxIb7e6WxRwXM/exec';

// In-memory cache for CMC quotes per symbol (TTL: 90 seconds)
const cmcCache: Record<string, { data: CMCQuoteItem | null; timestamp: number }> = {};
const CACHE_TTL_MS = 90 * 1000;

/**
 * Fetches live quote for a token symbol from CoinMarketCap via the Apps Script Web App Proxy.
 * Fallback rule: If the fetch fails, times out, or symbol isn't found, returns null (never synthesizes fake data).
 */
export async function fetchLiveCMCQuote(symbol: string, forceRefresh = false): Promise<CMCQuoteItem | null> {
  if (!symbol || typeof symbol !== 'string') return null;
  const cleanSymbol = symbol.trim().toUpperCase();
  if (!cleanSymbol) return null;

  const now = Date.now();
  const cached = cmcCache[cleanSymbol];
  if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    // 1. Try server proxy first
    let response = await fetch(`/api/cmc/quote?symbol=${encodeURIComponent(cleanSymbol)}`);

    // 2. Direct Apps Script proxy fallback if server proxy returns non-200
    if (!response.ok) {
      console.warn(`Server /api/cmc/quote returned HTTP ${response.status}. Trying direct GAS Web App proxy...`);
      response = await fetch(`${CMC_GAS_URL}?symbol=${encodeURIComponent(cleanSymbol)}`);
    }

    if (response.ok) {
      const json = await response.json();
      const raw = json?.data?.[cleanSymbol] || json?.data?.[cleanSymbol.toLowerCase()];
      const entry = Array.isArray(raw) ? raw[0] : raw;

      if (entry && entry.quote?.USD && typeof entry.quote.USD.price === 'number' && !isNaN(entry.quote.USD.price)) {
        const usd = entry.quote.USD;
        const item: CMCQuoteItem = {
          id: entry.id,
          name: entry.name,
          symbol: cleanSymbol,
          cmcRank: typeof entry.cmc_rank === 'number' ? entry.cmc_rank : undefined,
          price: usd.price,
          volume24h: typeof usd.volume_24h === 'number' ? usd.volume_24h : undefined,
          marketCap: typeof usd.market_cap === 'number' ? usd.market_cap : undefined,
          percentChange24h: typeof usd.percent_change_24h === 'number' ? usd.percent_change_24h : undefined,
          circulatingSupply: typeof entry.circulating_supply === 'number' ? entry.circulating_supply : undefined,
          totalSupply: typeof entry.total_supply === 'number' ? entry.total_supply : undefined,
          maxSupply: typeof entry.max_supply === 'number' ? entry.max_supply : undefined,
          lastUpdated: typeof usd.last_updated === 'string' ? usd.last_updated : (typeof entry.last_updated === 'string' ? entry.last_updated : undefined),
          dataEngine: 'CoinMarketCap Pro API Proxy (Live Market Data Feed)',
          dataSources: ['CoinMarketCap Apps Script Web App Proxy Feed']
        };

        cmcCache[cleanSymbol] = { data: item, timestamp: now };
        return item;
      }
    } else {
      console.warn(`CMC Proxy returned HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn(`CMC quote fetch error for ${cleanSymbol}:`, error);
  }

  // Record negative cache or null (TTL 90s)
  cmcCache[cleanSymbol] = { data: null, timestamp: now };
  return null;
}

/**
 * Strictly authentic fetcher for verification pipelines.
 * Never returns synthetic or fallback data.
 */
export async function fetchVerifiedCMCQuote(symbol: string): Promise<CMCQuoteItem | null> {
  return await fetchLiveCMCQuote(symbol, true);
}
