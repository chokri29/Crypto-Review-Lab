/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoinGeckoMarketItem } from './coingecko';

/**
 * CoinGecko Native RWA List item (from /rwas/list)
 */
export interface CoinGeckoRwaListItem {
  id: string;
  symbol: string;
  name: string;
  asset_type: 'stock' | 'etf' | 'commodity' | string;
}

/**
 * Tokenized market statistics strictly from CoinGecko RWA endpoints
 */
export interface CoinGeckoRwaTokenizedMarketData {
  current_price: number;
  market_cap: number;
  total_volume: number;
  high_24h?: number;
  low_24h?: number;
  price_change_24h?: number;
  price_change_percentage_24h?: number;
  market_cap_change_24h?: number;
  market_cap_change_percentage_24h?: number;
  last_updated?: string;
}

/**
 * CoinGecko RWA Market Entry (from /rwas/markets)
 */
export interface CoinGeckoRwaMarketItem {
  id: string;
  symbol: string;
  name: string;
  asset_type: string;
  image?: string;
  tokenized_market_data?: CoinGeckoRwaTokenizedMarketData;
}

/**
 * On-chain token representation recorded in CoinGecko RWA registry
 */
export interface CoinGeckoRwaToken {
  id: string;
  symbol: string;
  name: string;
  platforms: Record<string, string>;
  issuer_details?: {
    id: string;
    name: string;
  };
}

/**
 * Detailed RWA document (from /rwas/{id}?tokens=true&tokenized_market_data=true)
 */
export interface CoinGeckoRwaDetail {
  id: string;
  symbol: string;
  name: string;
  web_slug?: string;
  asset_type: string;
  image?: { thumb?: string; small?: string; large?: string };
  tokenized_market_data?: CoinGeckoRwaTokenizedMarketData;
  tokens?: CoinGeckoRwaToken[];
  last_updated?: string;
}

/**
 * CoinGecko RWA Issuer List item (from /rwas/issuers/list)
 */
export interface CoinGeckoRwaIssuerItem {
  id: string;
  name: string;
}

/**
 * CoinGecko RWA Issuer Detail (from /rwas/issuers/{id})
 */
export interface CoinGeckoRwaIssuerDetail {
  id: string;
  name: string;
  market_cap?: number;
  market_cap_change_24h?: number;
  volume_24h?: number;
  tokens?: Array<{
    id: string;
    symbol: string;
    name: string;
    platforms: Record<string, string>;
  }>;
  updated_at?: string;
}

// Client-side in-memory cache to prevent redundant HTTP requests and handle rapid tab switches
const clientRwaListCache: { data: CoinGeckoRwaListItem[]; timestamp: number } | null = null;
const clientRwaMarketsCache = new Map<string, { data: Record<string, CoinGeckoRwaMarketItem>; timestamp: number }>();
const clientRwaDetailCache = new Map<string, { data: CoinGeckoRwaDetail; timestamp: number }>();
const clientRwaIssuerCache = new Map<string, { data: CoinGeckoRwaIssuerDetail; timestamp: number }>();

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Utility: fetch with timeout and json parsing
 */
async function fetchWithTimeout<T>(url: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status} from ${url}`);
    }
    return await res.json() as T;
  } catch (err: any) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Fetch discovery list of all supported Real World Assets from /rwas/list
 * Free/Demo CoinGecko endpoint.
 */
export async function fetchCoinGeckoRwaList(assetType?: string): Promise<CoinGeckoRwaListItem[]> {
  const cacheKey = assetType || 'all';
  if (clientRwaListCache && Date.now() - clientRwaListCache.timestamp < 3 * 60 * 1000) {
    return clientRwaListCache.data;
  }

  try {
    const url = assetType 
      ? `/api/coingecko/rwas/list?asset_type=${encodeURIComponent(assetType)}` 
      : `/api/coingecko/rwas/list`;
    const data = await fetchWithTimeout<CoinGeckoRwaListItem[]>(url, 7000);
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (err) {
    console.warn('[CoinGecko RWA] Failed to fetch RWA list:', err);
    return [];
  }
}

/**
 * Fetch tokenized market data for specified canonical CoinGecko RWA IDs from /rwas/markets
 * Free/Demo CoinGecko endpoint.
 *
 * Returns a dictionary keyed by canonical RWA ID (e.g. 'apple', 'tesla', 'nvidia').
 */
export async function fetchCoinGeckoRwaMarkets(
  rwaIds: string[]
): Promise<Record<string, CoinGeckoRwaMarketItem>> {
  if (!rwaIds || rwaIds.length === 0) {
    return {};
  }

  const cleanIds = Array.from(new Set(rwaIds.map(id => id.trim().toLowerCase())));
  const sortedKey = cleanIds.slice().sort().join(',');

  const cached = clientRwaMarketsCache.get(sortedKey);
  if (cached && Date.now() - cached.timestamp < 20 * 1000) {
    return cached.data;
  }

  try {
    const url = `/api/coingecko/rwas/markets?ids=${encodeURIComponent(cleanIds.join(','))}&per_page=100`;
    const rawList = await fetchWithTimeout<CoinGeckoRwaMarketItem[]>(url, 8000);

    const resultMap: Record<string, CoinGeckoRwaMarketItem> = {};
    if (Array.isArray(rawList)) {
      for (const item of rawList) {
        if (item && item.id) {
          resultMap[item.id.toLowerCase()] = item;
        }
      }
    }

    clientRwaMarketsCache.set(sortedKey, { data: resultMap, timestamp: Date.now() });
    return resultMap;
  } catch (err) {
    console.warn('[CoinGecko RWA] Failed to fetch RWA markets:', err);
    // Return stale cache if available, else empty map (Never fabricate synthetic quotes)
    if (cached) {
      return cached.data;
    }
    return {};
  }
}

/**
 * Fetch rich RWA asset document from /rwas/{id}?tokens=true&tokenized_market_data=true
 * Free/Demo CoinGecko endpoint.
 */
export async function fetchCoinGeckoRwaDetail(rwaId: string): Promise<CoinGeckoRwaDetail | null> {
  if (!rwaId) return null;
  const cleanId = rwaId.trim().toLowerCase();

  const cached = clientRwaDetailCache.get(cleanId);
  if (cached && Date.now() - cached.timestamp < 45 * 1000) {
    return cached.data;
  }

  try {
    const url = `/api/coingecko/rwas/${encodeURIComponent(cleanId)}`;
    const data = await fetchWithTimeout<CoinGeckoRwaDetail>(url, 7000);
    if (data && data.id) {
      clientRwaDetailCache.set(cleanId, { data, timestamp: Date.now() });
      return data;
    }
    return null;
  } catch (err) {
    console.warn(`[CoinGecko RWA] Failed to fetch RWA detail for ${rwaId}:`, err);
    if (cached) return cached.data;
    return null;
  }
}

/**
 * Fetch supported RWA Issuers list from /rwas/issuers/list
 * Free/Demo CoinGecko endpoint.
 */
export async function fetchCoinGeckoRwaIssuersList(): Promise<CoinGeckoRwaIssuerItem[]> {
  try {
    const url = `/api/coingecko/rwas/issuers/list`;
    const data = await fetchWithTimeout<CoinGeckoRwaIssuerItem[]>(url, 7000);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[CoinGecko RWA] Failed to fetch RWA issuers list:', err);
    return [];
  }
}

/**
 * Fetch RWA Issuer details and aggregate portfolio metrics from /rwas/issuers/{id}
 * Free/Demo CoinGecko endpoint.
 */
export async function fetchCoinGeckoRwaIssuer(issuerId: string): Promise<CoinGeckoRwaIssuerDetail | null> {
  if (!issuerId) return null;
  const cleanId = issuerId.trim().toLowerCase();

  const cached = clientRwaIssuerCache.get(cleanId);
  if (cached && Date.now() - cached.timestamp < 60 * 1000) {
    return cached.data;
  }

  try {
    const url = `/api/coingecko/rwas/issuers/${encodeURIComponent(cleanId)}`;
    const data = await fetchWithTimeout<CoinGeckoRwaIssuerDetail>(url, 7000);
    if (data && data.id) {
      clientRwaIssuerCache.set(cleanId, { data, timestamp: Date.now() });
      return data;
    }
    return null;
  } catch (err) {
    console.warn(`[CoinGecko RWA] Failed to fetch RWA issuer for ${issuerId}:`, err);
    if (cached) return cached.data;
    return null;
  }
}

/**
 * Converts a CoinGecko RWA Market Item into a normalized CoinGeckoMarketItem
 * suitable for the Multi-Source Convergence Engine, while strictly labeling
 * dataEngine as "CoinGecko RWA Tokenized Market Engine" and ensuring provenance is LIVE.
 */
export function convertRwaToMarketItem(
  rwaItem: CoinGeckoRwaMarketItem,
  canonicalRwaId: string
): CoinGeckoMarketItem {
  const mkt = rwaItem.tokenized_market_data;
  const hasLivePrice = mkt && typeof mkt.current_price === 'number' && mkt.current_price > 0;

  return {
    id: canonicalRwaId,
    symbol: rwaItem.symbol?.toUpperCase() || canonicalRwaId.toUpperCase(),
    name: rwaItem.name || canonicalRwaId,
    image: rwaItem.image || '',
    current_price: hasLivePrice ? mkt.current_price : 0,
    market_cap: mkt?.market_cap || 0,
    market_cap_rank: 0,
    total_volume: mkt?.total_volume || 0,
    price_change_percentage_24h: mkt?.price_change_percentage_24h || 0,
    high_24h: mkt?.high_24h,
    low_24h: mkt?.low_24h,
    dataEngine: 'CoinGecko RWA Tokenized Market Engine',
    dataSources: ['CoinGecko RWA Native (/rwas/markets)'],
    isFallback: !hasLivePrice,
    provenance: hasLivePrice ? 'LIVE' : 'UNAVAILABLE'
  };
}
