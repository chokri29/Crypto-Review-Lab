/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CoinStatsItem {
  id: string;
  icon?: string;
  name: string;
  symbol: string;
  rank: number;
  price: number;
  volume: number;
  marketCap: number;
  availableSupply?: number;
  totalSupply?: number;
  fullyDilutedValuation?: number;
  priceChange1d?: number;
  priceChange1h?: number;
  priceChange1w?: number;
  slug?: string;
  contractAddresses?: string[];
  dataEngine?: string;
  dataSources?: string[];
}

export const COINSTATS_GAS_URL = 'https://script.google.com/macros/s/AKfycbxZcbIpURQQbpVgeMS0VnZmmvNWNpUL4gjXPawedaMfTHZErcP_eztewwd5fplJzOqvhA/exec';

// In-memory cache for CoinStats feed (TTL: 90 seconds)
let coinstatsCache: { data: Record<string, CoinStatsItem>; timestamp: number } | null = null;
const CACHE_TTL_MS = 90 * 1000;

/**
 * Fetches live market items from CoinStats via the Apps Script Web App Proxy.
 * Indexed by coin ID and uppercase/lowercase symbol.
 * Does NOT generate synthetic/mock data.
 */
export async function fetchLiveCoinStatsMarkets(forceRefresh = false): Promise<Record<string, CoinStatsItem>> {
  const now = Date.now();
  if (!forceRefresh && coinstatsCache && (now - coinstatsCache.timestamp) < CACHE_TTL_MS) {
    return coinstatsCache.data;
  }

  const map: Record<string, CoinStatsItem> = {};

  try {
    // 1. Try server proxy first
    let response = await fetch('/api/coinstats/markets?limit=500');
    
    // 2. Direct Apps Script proxy fallback if server proxy returns non-200
    if (!response.ok) {
      console.warn(`Server /api/coinstats/markets returned HTTP ${response.status}. Trying direct GAS Web App proxy...`);
      response = await fetch(`${COINSTATS_GAS_URL}?limit=500`);
    }

    if (response.ok) {
      const json = await response.json();
      const rawList: any[] = Array.isArray(json?.result) ? json.result : (Array.isArray(json) ? json : []);

      rawList.forEach((item) => {
        if (item && item.id && typeof item.price === 'number' && !isNaN(item.price)) {
          const coinStatsItem: CoinStatsItem = {
            id: String(item.id).toLowerCase(),
            icon: item.icon || item.image || '',
            name: item.name || item.id,
            symbol: String(item.symbol || '').toUpperCase(),
            rank: typeof item.rank === 'number' ? item.rank : 9999,
            price: item.price,
            volume: typeof item.volume === 'number' ? item.volume : 0,
            marketCap: typeof item.marketCap === 'number' ? item.marketCap : 0,
            availableSupply: item.availableSupply || item.circulatingSupply,
            totalSupply: item.totalSupply,
            fullyDilutedValuation: item.fullyDilutedValuation,
            priceChange1d: item.priceChange1d || item.priceChange24h,
            priceChange1h: item.priceChange1h,
            priceChange1w: item.priceChange1w,
            slug: item.slug,
            dataEngine: 'CoinStats API Proxy (Live External Oracle)',
            dataSources: ['CoinStats Apps Script Web App Proxy Feed']
          };

          map[coinStatsItem.id] = coinStatsItem;
          if (coinStatsItem.symbol) {
            map[coinStatsItem.symbol.toLowerCase()] = coinStatsItem;
          }
        }
      });

      coinstatsCache = { data: map, timestamp: now };
    } else {
      console.warn(`CoinStats Proxy returned HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn('CoinStats market fetch error:', error);
  }

  return map;
}

/**
 * Strictly authentic fetcher for verification pipelines (AVF / F3).
 * Never returns synthetic or fallback data.
 */
export async function fetchVerifiedCoinStatsMarkets(): Promise<Record<string, CoinStatsItem>> {
  return await fetchLiveCoinStatsMarkets(true);
}
