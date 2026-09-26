import { safeJsonParse } from '../utils/apiResponse';

export interface CmcRwaMapItem {
  rwa_id: number | string;
  name: string;
  symbol: string;
  asset_type?: string;
  rwa_slug?: string;
}

export interface CmcRwaAssetItem {
  rwa_id: number | string;
  name?: string;
  symbol?: string;
  asset_type?: string;
  rwa_rank?: number;
  average_tokenized_price?: number | null;
  tokenized_market_cap?: number | null;
  tokenized_volume_24h?: number | null;
  last_updated?: string | null;
  dataEngine?: string;
  dataSources?: string[];
}

export interface CmcRwaInfoItem {
  rwa_id: number | string;
  name?: string;
  symbol?: string;
  asset_type?: string;
  primary_exchange?: string;
  description?: string;
  founded?: string;
  industry?: string;
}

let rwaMapCache: { data: CmcRwaMapItem[]; timestamp: number } | null = null;
const MAP_CACHE_TTL_MS = 5 * 60 * 1000;

const rwaAssetCache: Record<string, { data: CmcRwaAssetItem | null; timestamp: number }> = {};
const ASSET_CACHE_TTL_MS = 90 * 1000;

const rwaInfoCache: Record<string, { data: CmcRwaInfoItem | null; timestamp: number }> = {};
const INFO_CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchCmcRwaMap(symbol?: string, forceRefresh = false): Promise<CmcRwaMapItem[]> {
  const now = Date.now();
  if (!symbol && !forceRefresh && rwaMapCache && (now - rwaMapCache.timestamp) < MAP_CACHE_TTL_MS) {
    return rwaMapCache.data;
  }

  try {
    const url = symbol 
      ? `/api/cmc/rwa/map?symbol=${encodeURIComponent(symbol.trim().toUpperCase())}`
      : '/api/cmc/rwa/map';
    const response = await fetch(url);
    const json = await safeJsonParse(response);

    if (json && json.status?.error_code === 0 && json.data) {
      const rawList = Array.isArray(json.data.rwa_assets)
        ? json.data.rwa_assets
        : (Array.isArray(json.data) ? json.data : []);

      const items: CmcRwaMapItem[] = rawList.map((entry: any) => ({
        rwa_id: entry.rwa_id ?? entry.id,
        name: entry.name || '',
        symbol: entry.symbol || '',
        asset_type: entry.asset_type,
        rwa_slug: entry.rwa_slug
      })).filter((item: CmcRwaMapItem) => item.rwa_id !== undefined && item.rwa_id !== null);

      if (!symbol) {
        rwaMapCache = { data: items, timestamp: now };
      }
      return items;
    }
  } catch (err) {
    console.warn('Failed to fetch CMC RWA Map:', err);
  }

  return rwaMapCache ? rwaMapCache.data : [];
}

export async function resolveCmcRwaId(
  underlyingTicker: string,
  xstockSymbol?: string
): Promise<string | number | null> {
  if (!underlyingTicker) return null;
  const cleanUnderlying = underlyingTicker.trim().toUpperCase();
  const cleanXStock = xstockSymbol ? xstockSymbol.trim().toUpperCase() : '';

  try {
    const targetedMap = await fetchCmcRwaMap(cleanUnderlying);
    const match = targetedMap.find(item => 
      item.symbol?.toUpperCase() === cleanUnderlying ||
      (cleanXStock && item.symbol?.toUpperCase() === cleanXStock)
    );
    if (match && match.rwa_id != null) {
      return match.rwa_id;
    }
  } catch {
  }

  const fullMap = await fetchCmcRwaMap();
  const fullMatch = fullMap.find(item => 
    item.symbol?.toUpperCase() === cleanUnderlying ||
    (cleanXStock && item.symbol?.toUpperCase() === cleanXStock)
  );

  return fullMatch ? fullMatch.rwa_id : null;
}

export async function fetchCmcRwaAsset(
  rwaId: string | number,
  forceRefresh = false
): Promise<CmcRwaAssetItem | null> {
  if (rwaId === undefined || rwaId === null || rwaId === '') return null;
  const key = String(rwaId);
  const now = Date.now();

  const cached = rwaAssetCache[key];
  if (!forceRefresh && cached && (now - cached.timestamp) < ASSET_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const response = await fetch(`/api/cmc/rwa/assets/list?rwa_id=${encodeURIComponent(key)}`);
    const json = await safeJsonParse(response);

    if (json && json.status?.error_code === 0 && json.data) {
      const rawList = Array.isArray(json.data.rwa_assets)
        ? json.data.rwa_assets
        : (Array.isArray(json.data) ? json.data : null);

      let rawEntry: any = null;
      if (rawList) {
        rawEntry = rawList.find((e: any) => String(e.rwa_id ?? e.id) === key) || rawList[0];
      } else if (json.data.rwa_assets && typeof json.data.rwa_assets === 'object') {
        rawEntry = json.data.rwa_assets[key] || json.data.rwa_assets;
      } else if (typeof json.data === 'object') {
        rawEntry = json.data[key] || json.data;
      }

      if (rawEntry) {
        const avgPrice = typeof rawEntry.average_tokenized_price === 'number' && !isNaN(rawEntry.average_tokenized_price) && rawEntry.average_tokenized_price > 0
          ? rawEntry.average_tokenized_price
          : null;

        const mcap = typeof rawEntry.tokenized_market_cap === 'number' && !isNaN(rawEntry.tokenized_market_cap) && rawEntry.tokenized_market_cap > 0
          ? rawEntry.tokenized_market_cap
          : null;

        const vol = typeof rawEntry.tokenized_volume_24h === 'number' && !isNaN(rawEntry.tokenized_volume_24h) && rawEntry.tokenized_volume_24h > 0
          ? rawEntry.tokenized_volume_24h
          : null;

        const lastUpdated = typeof rawEntry.last_updated === 'string' && rawEntry.last_updated.trim() !== ''
          ? rawEntry.last_updated
          : null;

        const item: CmcRwaAssetItem = {
          rwa_id: rawEntry.rwa_id ?? rawEntry.id ?? rwaId,
          name: rawEntry.name,
          symbol: rawEntry.symbol,
          asset_type: rawEntry.asset_type,
          rwa_rank: typeof rawEntry.rwa_rank === 'number' ? rawEntry.rwa_rank : undefined,
          average_tokenized_price: avgPrice,
          tokenized_market_cap: mcap,
          tokenized_volume_24h: vol,
          last_updated: lastUpdated,
          dataEngine: 'CoinMarketCap Real-World Assets (RWA) API',
          dataSources: ['CoinMarketCap RWA API (/v5/real-world-assets/assets/list)']
        };

        rwaAssetCache[key] = { data: item, timestamp: now };
        return item;
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch CMC RWA asset for rwa_id ${key}:`, err);
  }

  rwaAssetCache[key] = { data: null, timestamp: now };
  return null;
}

export async function fetchCmcRwaInfo(
  rwaId: string | number,
  forceRefresh = false
): Promise<CmcRwaInfoItem | null> {
  if (rwaId === undefined || rwaId === null || rwaId === '') return null;
  const key = String(rwaId);
  const now = Date.now();

  const cached = rwaInfoCache[key];
  if (!forceRefresh && cached && (now - cached.timestamp) < INFO_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const response = await fetch(`/api/cmc/rwa/info?rwa_id=${encodeURIComponent(key)}`);
    const json = await safeJsonParse(response);

    if (json && json.status?.error_code === 0 && json.data) {
      const rwaAssets = json.data.rwa_assets;
      let raw: any = null;
      if (rwaAssets && typeof rwaAssets === 'object') {
        raw = Array.isArray(rwaAssets) ? rwaAssets.find((e: any) => String(e.rwa_id ?? e.id) === key) : (rwaAssets[key] || rwaAssets);
      }
      if (!raw && typeof json.data === 'object') {
        raw = Array.isArray(json.data) ? json.data.find((e: any) => String(e.rwa_id ?? e.id) === key) : (json.data[key] || json.data);
      }

      if (raw) {
        const item: CmcRwaInfoItem = {
          rwa_id: raw.rwa_id ?? raw.id ?? rwaId,
          name: raw.name,
          symbol: raw.symbol,
          asset_type: raw.asset_type,
          primary_exchange: raw.primary_exchange,
          description: raw.description,
          founded: raw.founded,
          industry: raw.industry
        };
        rwaInfoCache[key] = { data: item, timestamp: now };
        return item;
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch CMC RWA info for rwa_id ${key}:`, err);
  }

  rwaInfoCache[key] = { data: null, timestamp: now };
  return null;
}

export async function fetchLiveCmcRwaForStock(
  stock: { underlyingTicker: string; symbol: string; cmcRwaId?: number | string },
  forceRefresh = false
): Promise<CmcRwaAssetItem | null> {
  if (!stock || !stock.underlyingTicker) return null;

  let rwaId: string | number | null = stock.cmcRwaId ?? null;
  if (!rwaId) {
    rwaId = await resolveCmcRwaId(stock.underlyingTicker, stock.symbol);
  }

  if (!rwaId) {
    return null;
  }

  return await fetchCmcRwaAsset(rwaId, forceRefresh);
}
