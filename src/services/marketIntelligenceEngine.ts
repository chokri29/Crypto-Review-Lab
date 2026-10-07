import { 
  getMarketAssets, 
  upsertMarketAsset, 
  deleteMarketAssetsByCoingeckoIds,
  getNetworkMetrics, 
  upsertNetworkMetric, 
  upsertMarketSnapshot, 
  recordTelemetrySyncLog, 
  getLatestMarketSnapshots,
  pruneOldSnapshots 
} from '../db/queries.ts';
import { INITIAL_REVIEWS } from '../data.ts';
import { getAssetKey } from '../utils/assetKey.ts';
import { isXStockAsset } from '../utils/xstockFilter.ts';
import { ROBINHOOD_CHAIN, isRobinhoodChain } from '../constants/chains.ts';

// Initial canonical networks
const INITIAL_NETWORKS = [
  {
    network: ROBINHOOD_CHAIN.name,
    chainId: String(ROBINHOOD_CHAIN.chainId),
    gasToken: ROBINHOOD_CHAIN.nativeCurrency.symbol,
    nativeToken: ROBINHOOD_CHAIN.nativeToken,
    explorerUrl: ROBINHOOD_CHAIN.explorerUrl,
    status: 'active',
  },
  {
    network: 'Ethereum',
    chainId: '1',
    gasToken: 'ETH',
    nativeToken: 'ETH',
    explorerUrl: 'https://etherscan.io',
    status: 'active',
  },
  {
    network: 'Arbitrum',
    chainId: '42161',
    gasToken: 'ETH',
    nativeToken: 'ARB',
    explorerUrl: 'https://arbiscan.io',
    status: 'active',
  },
  {
    network: 'Solana',
    chainId: 'solana',
    gasToken: 'SOL',
    nativeToken: 'SOL',
    explorerUrl: 'https://solscan.io',
    status: 'active',
  },
  {
    network: 'Sui',
    chainId: 'sui',
    gasToken: 'SUI',
    nativeToken: 'SUI',
    explorerUrl: 'https://suiscan.xyz',
    status: 'active',
  },
  {
    network: 'Kaspa',
    chainId: 'kaspa',
    gasToken: 'KAS',
    nativeToken: 'KAS',
    explorerUrl: 'https://explorer.kaspa.org',
    status: 'active',
  },
  {
    network: 'Base',
    chainId: '8453',
    gasToken: 'ETH',
    nativeToken: 'ETH',
    explorerUrl: 'https://basescan.org',
    status: 'active',
  },
  {
    network: 'BNB Chain',
    chainId: '56',
    gasToken: 'BNB',
    nativeToken: 'BNB',
    explorerUrl: 'https://bscscan.com',
    status: 'active',
  },
  {
    network: 'Bitcoin',
    chainId: 'bitcoin',
    gasToken: 'BTC',
    nativeToken: 'BTC',
    explorerUrl: 'https://mempool.space',
    status: 'active',
  },
  {
    network: 'Other',
    chainId: 'other',
    gasToken: 'N/A',
    nativeToken: 'N/A',
    explorerUrl: '',
    status: 'active',
  }
];

// Single canonical mapping table from CoinGecko asset_platform_id / platforms to CRL network name
export const PLATFORM_TO_NETWORK_MAP: Record<string, string> = {
  'ethereum': 'Ethereum',
  'arbitrum-one': 'Arbitrum',
  'arbitrum': 'Arbitrum',
  'solana': 'Solana',
  'base': 'Base',
  'binance-smart-chain': 'BNB Chain',
  'binancecoin': 'BNB Chain',
  'polygon-pos': 'Polygon',
  'polygon': 'Polygon',
  'avalanche': 'Avalanche',
  'optimistic-ethereum': 'Optimism',
  'optimism': 'Optimism',
  'sui': 'Sui',
  'aptos': 'Aptos',
  'near-protocol': 'NEAR',
  'near': 'NEAR',
  'fantom': 'Fantom',
  'cosmos': 'Cosmos',
  'cardano': 'Cardano',
  'polkadot': 'Polkadot',
  'tron': 'TRON',
  'the-open-network': 'TON',
  'ton': 'TON',
  'blast': 'Blast',
  'linea': 'Linea',
  'scroll': 'Scroll',
  'zksync': 'zkSync',
  'mantle': 'Mantle',
  'hyperliquid': 'Hyperliquid',
  'sei-network': 'Sei',
  'sei': 'Sei',
  'cronos': 'Cronos',
  'celo': 'Celo',
  'gnosis': 'Gnosis',
  'kaia': 'Kaia',
  'klay-token': 'Kaia',
  // Robinhood Chain mainnet (Chain ID 4663): only map verified mainnet identifiers, never testnet
  '4663': ROBINHOOD_CHAIN.name,
  '0x1237': ROBINHOOD_CHAIN.name,
  'robinhood-chain-mainnet': ROBINHOOD_CHAIN.name,
};

// Canonical alias map for DefiLlama v2 chains lookup (e.g. "BNB Chain"→"BSC", "XRP Ledger"→"Ripple", "zkSync"→"zkSync Era")
export const DEFILLAMA_CHAIN_ALIAS_MAP: Record<string, string> = {
  'bnb chain': 'bsc',
  'binance smart chain': 'bsc',
  'xrp ledger': 'ripple',
  'xrpl': 'ripple',
  'zksync': 'zksync era',
  'zksync era': 'zksync era',
  'op mainnet': 'optimism',
  'the open network': 'ton',
  'polygon pos': 'polygon',
  'optimistic ethereum': 'optimism',
};

// Known native L1 assets by id or symbol when platform data is absent (FALLBACK ONLY)
export const NATIVE_L1_COIN_MAP: Record<string, string> = {
  'bitcoin': 'Bitcoin',
  'btc': 'Bitcoin',
  'ethereum': 'Ethereum',
  'eth': 'Ethereum',
  'solana': 'Solana',
  'sol': 'Solana',
  'binancecoin': 'BNB Chain',
  'bnb': 'BNB Chain',
  'kaspa': 'Kaspa',
  'kas': 'Kaspa',
  'sui': 'Sui',
  'cardano': 'Cardano',
  'ada': 'Cardano',
  'ripple': 'XRP Ledger',
  'xrp': 'XRP Ledger',
  'dogecoin': 'Dogecoin',
  'doge': 'Dogecoin',
  'avalanche-2': 'Avalanche',
  'avax': 'Avalanche',
  'polkadot': 'Polkadot',
  'dot': 'Polkadot',
  'near': 'NEAR',
  'tron': 'TRON',
  'trx': 'TRON',
  'the-open-network': 'TON',
  'ton': 'TON',
  'aptos': 'Aptos',
  'apt': 'Aptos',
  'cosmos': 'Cosmos',
  'atom': 'Cosmos',
  'monero': 'Monero',
  'xmr': 'Monero',
  'litecoin': 'Litecoin',
  'ltc': 'Litecoin',
  'stellar': 'Stellar',
  'xlm': 'Stellar',
  'filecoin': 'Filecoin',
  'fil': 'Filecoin',
  'algorand': 'Algorand',
  'algo': 'Algorand',
  'hedera-hashgraph': 'Hedera',
  'hbar': 'Hedera',
  'zcash': 'Zcash',
  'zec': 'Zcash',
  'hyperliquid': 'Hyperliquid',
  'hype': 'Hyperliquid'
};

let cachedAssetPlatforms: Map<string, string> = new Map();
let lastAssetPlatformsFetchTime = 0;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function fetchAssetPlatformsMap(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cachedAssetPlatforms.size > 0 && (now - lastAssetPlatformsFetchTime) < TWENTY_FOUR_HOURS_MS) {
    return cachedAssetPlatforms;
  }

  const url = 'https://api.coingecko.com/api/v3/asset_platforms';
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'CryptoReviewLab/3.2.0',
    ...(process.env.COINGECKO_API_KEY ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY } : {})
  };

  try {
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const newMap = new Map<string, string>();
        for (const item of data) {
          if (item && item.id && item.name) {
            newMap.set(item.id.toLowerCase().trim(), item.name.trim());
          }
        }
        cachedAssetPlatforms = newMap;
        lastAssetPlatformsFetchTime = now;
        console.log(`[MarketIntelligence] Loaded ${newMap.size} asset platforms from CoinGecko.`);
        return cachedAssetPlatforms;
      }
    } else {
      console.warn(`[MarketIntelligence] /asset_platforms returned HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn('[MarketIntelligence] Error fetching asset platforms:', err);
  }
  return cachedAssetPlatforms;
}

export function resolveNetworkFromCoin(
  coin: {
    id?: string;
    symbol?: string;
    name?: string;
    asset_platform_id?: string | null;
    platforms?: Record<string, string> | null;
  },
  assetPlatformsMap?: Map<string, string>
): string {
  const idLower = (coin.id || '').toLowerCase().trim();
  const symLower = (coin.symbol || '').toLowerCase().trim();
  const apMap = assetPlatformsMap || cachedAssetPlatforms;

  // Edge case for BNB: CoinGecko still lists legacy 2017 ERC-20 contract in platforms, but BNB is the native coin of BNB Chain
  if (idLower === 'binancecoin' || symLower === 'bnb') {
    return 'BNB Chain';
  }

  // 1. Resolve from explicit asset_platform_id
  if (coin.asset_platform_id && typeof coin.asset_platform_id === 'string') {
    const rawPlatform = coin.asset_platform_id.toLowerCase().trim();
    if (rawPlatform) {
      if (PLATFORM_TO_NETWORK_MAP[rawPlatform]) {
        return PLATFORM_TO_NETWORK_MAP[rawPlatform];
      }
      if (apMap && apMap.has(rawPlatform)) {
        return apMap.get(rawPlatform)!;
      }
    }
  }

  // 2. Resolve from platforms object (from /coins/list?include_platform=true)
  const platformKeys = coin.platforms && typeof coin.platforms === 'object'
    ? Object.keys(coin.platforms).map(k => k.toLowerCase().trim()).filter(Boolean)
    : [];

  if (platformKeys.length > 0) {
    for (const key of platformKeys) {
      if (PLATFORM_TO_NETWORK_MAP[key]) {
        return PLATFORM_TO_NETWORK_MAP[key];
      }
      if (apMap && apMap.has(key)) {
        return apMap.get(key)!;
      }
    }
  }

  // 3. Fallback only: Coins without platform data: Treat as native L1 assets
  if (idLower && NATIVE_L1_COIN_MAP[idLower]) {
    return NATIVE_L1_COIN_MAP[idLower];
  }
  if (symLower && NATIVE_L1_COIN_MAP[symLower]) {
    return NATIVE_L1_COIN_MAP[symLower];
  }

  // If platforms is empty or null and the coin isn't in NATIVE_L1_COIN_MAP, return the coin's own name (e.g. "Bitcoin Cash") instead of 'Other'
  if (platformKeys.length === 0) {
    if (coin.name && coin.name.trim()) {
      return coin.name.trim();
    }
  }

  // If platform keys were present but neither matched, still fallback to coin.name before 'Other'
  if (coin.name && coin.name.trim()) {
    return coin.name.trim();
  }

  // 4. Unknown platform fallback
  return 'Other';
}

// CoinGecko page fetcher: direct API with GAS proxy fallback
async function fetchCoinGeckoMarketsPage(page = 1, perPage = 250, ids?: string[]): Promise<any[]> {
  const vsCurrency = 'usd';
  const directHeaders: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'CryptoReviewLab/3.2.0',
    ...(process.env.COINGECKO_API_KEY ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY } : {})
  };

  // For global discovery (no specific ids), try direct CoinGecko API first for full 250-item pages
  if (!ids || ids.length === 0) {
    const directUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`;
    try {
      const res = await fetch(directUrl, { headers: directHeaders });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (directErr) {
      console.warn(`[MarketIntelligence] Direct CoinGecko page ${page} fetch error, trying proxy fallback...`, directErr);
    }
  }

  const gasBase = 'https://script.google.com/macros/s/AKfycbyE6MqLewGEK4aq-fCD1tbQpO-IWetUk7-uuTYZDD_3XUvUuxRnWaPZQBZE3H_ui32y5g/exec';

  // Sub-chunk IDs if more than 50 to prevent Google Apps Script URL length limit overflow (Limiet overschreden: Lengte URLFetch-URL)
  if (ids && ids.length > 50) {
    const allResults: any[] = [];
    const SAFE_BATCH = 50;
    for (let i = 0; i < ids.length; i += SAFE_BATCH) {
      const batchIds = ids.slice(i, i + SAFE_BATCH);
      const batchItems = await fetchCoinGeckoMarketsPage(page, perPage, batchIds);
      allResults.push(...batchItems);
    }
    return allResults;
  }

  let gasUrl = `${gasBase}?action=markets&page=${page}&per_page=${perPage}&vs_currency=${vsCurrency}`;
  if (ids && ids.length > 0) {
    gasUrl += `&ids=${encodeURIComponent(ids.join(','))}`;
  }

  try {
    const gasRes = await fetch(gasUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CryptoReviewLab/3.2.0'
      }
    });
    if (gasRes.ok) {
      const gasData = await gasRes.json();
      if (Array.isArray(gasData)) return gasData;
      if (gasData && gasData.error) {
        console.warn('[MarketIntelligence] CoinGecko proxy response warning:', gasData.message || gasData);
      }
    }
  } catch (gasErr) {
    console.warn(`[MarketIntelligence] CoinGecko proxy page ${page} fetch error:`, gasErr);
  }

  return [];
}

let syncInterval: NodeJS.Timeout | null = null;
let discoveryInterval: NodeJS.Timeout | null = null;
let isSyncRunning = false;
let isDiscoveryRunning = false;

// Recompute active_assets_count per network from market_assets
export async function recomputeNetworkActiveAssets(): Promise<void> {
  try {
    const assets = await getMarketAssets();
    const networks = await getNetworkMetrics();
    const counts: Record<string, number> = {};

    for (const asset of assets) {
      if (asset.network) {
        const netKey = asset.network.toLowerCase().trim();
        counts[netKey] = (counts[netKey] || 0) + 1;
      }
    }

    for (const net of networks) {
      const count = counts[net.network.toLowerCase().trim()] || 0;
      await upsertNetworkMetric({
        network: net.network,
        activeAssetsCount: count
      });
    }
  } catch (err) {
    console.warn('[MarketIntelligence] Recomputing active assets count per network failed:', err);
  }
}

// Seed initial network metadata and tracked assets into Cloud SQL
export async function seedInitialMarketIntelligenceData(): Promise<void> {
  try {
    // 1. Seed Networks
    for (const net of INITIAL_NETWORKS) {
      await upsertNetworkMetric({
        network: net.network,
        chainId: net.chainId,
        gasToken: net.gasToken,
        nativeToken: net.nativeToken,
        explorerUrl: net.explorerUrl,
        status: net.status,
      });
    }

    // 2. Seed Crypto Assets from INITIAL_REVIEWS with deterministic assetKey
    for (const rev of INITIAL_REVIEWS) {
      const assetKey = getAssetKey({
        coingeckoId: rev.coingeckoId,
        network: rev.network || 'Ethereum',
        contractAddress: rev.contractAddress,
        symbol: rev.symbol,
      });
      await upsertMarketAsset({
        assetKey,
        symbol: rev.symbol,
        name: rev.name,
        coingeckoId: rev.coingeckoId,
        category: rev.category,
        network: rev.network || 'Ethereum',
        contractAddress: rev.contractAddress,
        logoUrl: rev.logoUrl,
        isVerified: 1,
      });
    }

    // 3. Compute active counts per network based on actual registered assets
    await recomputeNetworkActiveAssets();

    console.log('[MarketIntelligence] Initial networks and assets seeded into Cloud SQL successfully.');
  } catch (error) {
    console.warn('[MarketIntelligence] Seed skipped or failed (will retry on next cycle):', error);
  }
}

// Fetch complete id -> platforms mapping from CoinGecko /coins/list?include_platform=true
export async function fetchCoinGeckoCoinsListPlatforms(): Promise<Map<string, Record<string, string>>> {
  const map = new Map<string, Record<string, string>>();
  const url = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true';
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'CryptoReviewLab/3.2.0',
    ...(process.env.COINGECKO_API_KEY ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY } : {})
  };

  try {
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item && item.id && item.platforms && typeof item.platforms === 'object') {
            map.set(item.id.toLowerCase().trim(), item.platforms);
          }
        }
        console.log(`[MarketIntelligence] Loaded platforms mapping for ${map.size} coins from CoinGecko /coins/list.`);
        return map;
      }
    } else {
      console.warn(`[MarketIntelligence] /coins/list?include_platform=true returned HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn('[MarketIntelligence] Error fetching CoinGecko /coins/list platforms:', err);
  }
  return map;
}

// Fetch excluded tokenized RWA coins from CoinGecko /coins/markets?category=real-world-assets-rwa (pages 1-2)
export async function fetchRwaExcludedCoinIds(): Promise<Set<string>> {
  const rwaIds = new Set<string>();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'CryptoReviewLab/3.2.0',
    ...(process.env.COINGECKO_API_KEY ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY } : {})
  };

  for (const page of [1, 2]) {
    try {
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=real-world-assets-rwa&per_page=250&page=${page}&sparkline=false`;
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item && item.id) {
              rwaIds.add(item.id.toLowerCase().trim());
            }
          }
        }
      } else {
        console.warn(`[MarketIntelligence] /coins/markets RWA page ${page} returned HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn(`[MarketIntelligence] Error fetching RWA coins page ${page}:`, err);
    }
  }
  return rwaIds;
}

// DISCOVERY: Fetch current top 500 coins by market cap (pages 1-2, per_page=250) and merge into Cloud SQL
export async function discoverAssets(): Promise<{ discovered: number }> {
  if (isDiscoveryRunning) {
    return { discovered: 0 };
  }
  isDiscoveryRunning = true;
  try {
    console.log('[MarketIntelligence] Starting top 500 asset discovery via CoinGecko...');
    let discovered = 0;

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    // Ensure asset platforms map is loaded (fetch once, cached 24h)
    const assetPlatformsMap = await fetchAssetPlatformsMap();

    // 1. Sequential call 1: /coins/list?include_platform=true
    const platformsMap = await fetchCoinGeckoCoinsListPlatforms();

    // If fetchCoinGeckoCoinsListPlatforms() returns size 0: skip all upserts, log failure telemetry, and return { discovered: 0 }
    if (platformsMap.size === 0) {
      console.warn('[MarketIntelligence] Platforms map is empty (likely 429). Skipping all discovery upserts.');
      await recordTelemetrySyncLog({
        jobName: 'asset_discovery',
        status: 'failed',
        details: 'platforms map empty (likely 429)'
      });
      return { discovered: 0 };
    }

    // 1.5 s delay between sequential calls
    await delay(1500);

    // 2. Sequential call 2: page 1
    const page1 = await fetchCoinGeckoMarketsPage(1, 250).catch(err => {
      console.warn('[MarketIntelligence] Page 1 fetch error:', err);
      return [];
    });

    // 1.5 s delay between sequential calls
    await delay(1500);

    // 3. Sequential call 3: page 2
    const page2 = await fetchCoinGeckoMarketsPage(2, 250).catch(err => {
      console.warn('[MarketIntelligence] Page 2 fetch error:', err);
      return [];
    });

    // 4. Once per run, fetch RWA coins to build exclusion Set (pages 1-2)
    const rwaExcludedSet = await fetchRwaExcludedCoinIds();
    // Purge any existing tokenized RWA assets from market_assets so figure-heloc, ylds, tradable-* are absent
    if (rwaExcludedSet.size > 0) {
      await deleteMarketAssetsByCoingeckoIds(Array.from(rwaExcludedSet));
    }

    const coins: any[] = [];
    if (Array.isArray(page1)) {
      coins.push(...page1);
    }
    if (Array.isArray(page2)) {
      coins.push(...page2);
    }

    if (coins.length === 0) {
      console.warn('[MarketIntelligence] CoinGecko discovery returned 0 coins.');
      return { discovered: 0 };
    }

    const existingNetworks = await getNetworkMetrics();
    const existingNetworkNames = new Set(existingNetworks.map(n => n.network.toLowerCase().trim()));

    for (const coin of coins) {
      if (!coin.id || !coin.symbol) continue;

      const coinIdLower = coin.id.toLowerCase().trim();

      // Strictly exclude tokenized stocks / xStocks from crypto market intelligence
      if (isXStockAsset({ symbol: coin.symbol, name: coin.name, category: coin.category, coingeckoId: coin.id })) {
        continue;
      }

      // Strictly exclude tokenized real-world assets (RWA category Set or tradable-* tokens)
      if (
        rwaExcludedSet.has(coinIdLower) ||
        coinIdLower.startsWith('tradable-') ||
        coinIdLower === 'figure-heloc' ||
        coinIdLower === 'ylds'
      ) {
        continue;
      }

      // Look up platform mapping from /coins/list?include_platform=true (or coin.platforms)
      const coinPlatforms = platformsMap.get(coinIdLower) || coin.platforms || null;

      const network = resolveNetworkFromCoin({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        asset_platform_id: coin.asset_platform_id,
        platforms: coinPlatforms
      }, assetPlatformsMap);
      const networkLower = network.toLowerCase().trim();

      // Ensure network_metrics exists if network does not already exist
      if (!existingNetworkNames.has(networkLower)) {
        try {
          await upsertNetworkMetric({
            network,
            status: 'active',
            activeAssetsCount: 0
          });
          existingNetworkNames.add(networkLower);
        } catch {}
      }

      const assetKey = getAssetKey({
        coingeckoId: coin.id,
        network,
        symbol: coin.symbol.toUpperCase()
      });

      // Merge/upsert behavior: persist platforms JSON and never delete existing market_assets
      await upsertMarketAsset({
        assetKey,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name || coin.symbol.toUpperCase(),
        coingeckoId: coin.id,
        category: coin.category || (isRobinhoodChain(network) ? 'Orbit L2' : 'Cryptocurrency'),
        network,
        platforms: coinPlatforms && Object.keys(coinPlatforms).length > 0 ? coinPlatforms : null,
        logoUrl: coin.image || null,
        isVerified: 1
      });
      discovered++;
    }

    await recomputeNetworkActiveAssets();
    console.log(`[MarketIntelligence] Discovery finished. Upserted/merged ${discovered} assets into market_assets.`);
    return { discovered };
  } catch (error) {
    console.error('[MarketIntelligence] Asset discovery error:', error);
    return { discovered: 0 };
  } finally {
    isDiscoveryRunning = false;
  }
}

// Proactive telemetry synchronization cycle with multi-source consensus & DefiLlama TVL
export async function runMarketIntelligenceSync(): Promise<{ success: boolean; itemsSynced: number; networksSynced?: number }> {
  if (isSyncRunning) {
    return { success: false, itemsSynced: 0 };
  }

  isSyncRunning = true;
  const startTime = Date.now();
  let itemsSynced = 0;
  let networksSynced = 0;

  try {
    // 1. Sync DefiLlama Network TVLs for registered chains
    try {
      const llamaRes = await fetch('https://api.llama.fi/v2/chains', {
        headers: { 'Accept': 'application/json', 'User-Agent': 'CryptoReviewLab/3.2.0' }
      });
      if (llamaRes.ok) {
        const chains = await llamaRes.json();
        if (Array.isArray(chains)) {
          const chainMap: Record<string, number> = {};
          for (const c of chains) {
            if (c.name && typeof c.tvl === 'number') {
              chainMap[c.name.toLowerCase()] = c.tvl;
            }
          }
          const allNets = await getNetworkMetrics();
          for (const net of allNets) {
            const netKey = net.network.toLowerCase().trim();
            const aliasKey = DEFILLAMA_CHAIN_ALIAS_MAP[netKey] || netKey;
            let tvl = chainMap[aliasKey];
            if (tvl === undefined && (aliasKey === 'ripple' || netKey === 'xrp ledger')) {
              tvl = chainMap['xrpl'] ?? chainMap['ripple'];
            }
            if (tvl === undefined) {
              tvl = chainMap[netKey];
            }
            if (tvl !== undefined) {
              const formattedTvl = tvl >= 1e9 
                ? `$${(tvl / 1e9).toFixed(2)}B` 
                : tvl >= 1e6 
                  ? `$${(tvl / 1e6).toFixed(2)}M` 
                  : `$${tvl.toLocaleString()}`;
              await upsertNetworkMetric({
                network: net.network,
                totalTvlUsd: formattedTvl
              });
              networksSynced++;
            }
          }
        }
      }
    } catch (llamaErr) {
      console.warn('[MarketIntelligence] DefiLlama chain TVL fetch non-critical failure:', llamaErr);
    }

    // 2. Fetch Assets to sync from Cloud SQL
    const assets = await getMarketAssets();
    if (!assets || assets.length === 0) {
      isSyncRunning = false;
      return { success: true, itemsSynced: 0, networksSynced };
    }

    // 3. Batch CoinGecko IDs in chunks of 250
    const assetsWithCg = assets.filter(a => a.coingeckoId && a.coingeckoId.trim());
    const cgDataMap: Record<string, any> = {};

    const CHUNK_SIZE = 50;
    for (let i = 0; i < assetsWithCg.length; i += CHUNK_SIZE) {
      const chunk = assetsWithCg.slice(i, i + CHUNK_SIZE);
      const chunkIds = chunk.map(a => a.coingeckoId!).filter(Boolean);
      try {
        const items = await fetchCoinGeckoMarketsPage(1, CHUNK_SIZE, chunkIds);
        for (const item of items) {
          if (item.id) cgDataMap[item.id.toLowerCase()] = item;
          if (item.symbol) cgDataMap[item.symbol.toLowerCase()] = item;
        }
      } catch (chunkErr) {
        console.warn(`[MarketIntelligence] Error syncing CoinGecko chunk ${i}:`, chunkErr);
      }
    }

    // Source B: CoinStats Public Feed
    let csDataMap: Record<string, any> = {};
    try {
      const csRes = await fetch(
        'https://script.google.com/macros/s/AKfycbxZcbIpURQQbpVgeMS0VnZmmvNWNpUL4gjXPawedaMfTHZErcP_eztewwd5fplJzOqvhA/exec?action=markets&limit=500',
        { headers: { 'Accept': 'application/json' } }
      );
      if (csRes.ok) {
        const csJson = await csRes.json();
        const items = csJson?.data || csJson?.coins || (Array.isArray(csJson) ? csJson : []);
        if (Array.isArray(items)) {
          for (const it of items) {
            if (it.id) csDataMap[it.id.toLowerCase()] = it;
            if (it.symbol) csDataMap[it.symbol.toLowerCase()] = it;
          }
        }
      }
    } catch {}

    // 4. Process Multi-Source Consensus Convergence and Upsert Snapshots
    for (const asset of assets) {
      const cgItem = asset.coingeckoId ? (cgDataMap[asset.coingeckoId.toLowerCase()] || cgDataMap[asset.symbol.toLowerCase()]) : null;
      const csItem = asset.coingeckoId ? (csDataMap[asset.coingeckoId.toLowerCase()] || csDataMap[asset.symbol.toLowerCase()]) : null;

      if (!cgItem && !csItem) {
        continue;
      }

      const cgPrice = cgItem && typeof cgItem.current_price === 'number' ? cgItem.current_price : null;
      const csPrice = csItem && (typeof csItem.price === 'number' ? csItem.price : (typeof csItem.priceUsd === 'number' ? csItem.priceUsd : null));

      let effectivePrice = cgPrice ?? csPrice;
      let priceDivergencePct = '0.00%';
      let confidenceScore = 90;
      let confidenceLevel = 'High';
      let sourceConsensus = 'COINGECKO_VERIFIED_PRIMARY';

      if (cgPrice !== null && csPrice !== null && cgPrice > 0 && csPrice > 0) {
        const diff = Math.abs(cgPrice - csPrice);
        const avg = (cgPrice + csPrice) / 2;
        const divPct = (diff / avg) * 100;
        priceDivergencePct = `${divPct.toFixed(2)}%`;

        if (divPct <= 1.5) {
          effectivePrice = avg;
          confidenceScore = 98;
          confidenceLevel = 'VERY_HIGH';
          sourceConsensus = 'MULTI_ORACLE_CONSENSUS (CoinGecko + CoinStats)';
        } else if (divPct <= 3.5) {
          effectivePrice = cgPrice;
          confidenceScore = 88;
          confidenceLevel = 'HIGH';
          sourceConsensus = 'COINGECKO_PRIMARY (CoinStats Secondary)';
        } else {
          effectivePrice = cgPrice;
          confidenceScore = 72;
          confidenceLevel = 'DIVERGENT';
          sourceConsensus = 'DIVERGENCE_FLAGGED (Using CoinGecko Reference)';
        }
      } else if (csPrice !== null && cgPrice === null) {
        effectivePrice = csPrice;
        confidenceScore = 80;
        confidenceLevel = 'MODERATE';
        sourceConsensus = 'COINSTATS_STANDALONE';
      }

      const change24h = cgItem?.price_change_percentage_24h ?? csItem?.priceChange1d ?? csItem?.change24h ?? null;
      const marketCap = cgItem?.market_cap ?? csItem?.marketCap ?? null;
      const volume24h = cgItem?.total_volume ?? csItem?.volume ?? null;
      const circulatingSupply = cgItem?.circulating_supply ?? csItem?.availableSupply ?? null;
      const totalSupply = cgItem?.total_supply ?? csItem?.totalSupply ?? null;
      const maxSupply = cgItem?.max_supply ?? null;
      const ath = cgItem?.ath ?? null;
      const atl = cgItem?.atl ?? null;

      const assetKey = asset.assetKey || getAssetKey(asset);

      await upsertMarketSnapshot({
        assetKey,
        symbol: asset.symbol,
        network: asset.network,
        priceUsd: effectivePrice !== null ? String(effectivePrice) : undefined,
        change24h: change24h !== null ? String(change24h) : undefined,
        marketCapUsd: marketCap !== null ? String(marketCap) : undefined,
        volume24hUsd: volume24h !== null ? String(volume24h) : undefined,
        circulatingSupply: circulatingSupply !== null ? String(circulatingSupply) : undefined,
        totalSupply: totalSupply !== null ? String(totalSupply) : undefined,
        maxSupply: maxSupply !== null ? String(maxSupply) : undefined,
        allTimeHighUsd: ath !== null ? String(ath) : undefined,
        allTimeLowUsd: atl !== null ? String(atl) : undefined,
        priceDivergencePct,
        supplyDivergencePct: '0.00%',
        confidenceScore,
        confidenceLevel,
        sourceConsensus,
        rawPayload: {
          assetKey,
          symbol: asset.symbol,
          cgPrice,
          csPrice,
          divergence: priceDivergencePct,
          timestamp: new Date().toISOString()
        }
      });

      itemsSynced++;
    }

    // 5. Call pruneOldSnapshots() at the end of each cycle
    await pruneOldSnapshots(7);

    // 6. Recompute active_assets_count per network from market_assets after each cycle
    await recomputeNetworkActiveAssets();

    const latencyMs = Date.now() - startTime;
    await recordTelemetrySyncLog({
      jobName: 'proactive_market_sync',
      status: 'success',
      itemsSynced,
      latencyMs,
      details: `Synced ${itemsSynced} assets & ${networksSynced} networks in ${latencyMs}ms with multi-source consensus.`
    });

    console.log(`[MarketIntelligence] Proactive multi-source sync completed: ${itemsSynced} assets (${latencyMs}ms).`);
    return { success: true, itemsSynced, networksSynced };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error('[MarketIntelligence] Sync cycle error:', error);
    try {
      await recordTelemetrySyncLog({
        jobName: 'proactive_market_sync',
        status: 'failed',
        itemsSynced,
        latencyMs,
        details: error?.message || String(error)
      });
    } catch {}
    return { success: false, itemsSynced, networksSynced };
  } finally {
    isSyncRunning = false;
  }
}

/**
 * Background jobs architecture & lifecycle:
 * Note that in-process setInterval timers will NOT run under serverless container runtimes
 * such as Cloud Run with scale-to-zero enabled; instances are suspended or terminated when idle.
 * Production environments rely on an external Cloud Scheduler job hitting the admin-protected
 * POST /api/market-intelligence/sync endpoint (e.g. every 5-15 minutes).
 *
 * The in-process intervals below are retained for local development, testing, and warm container runtimes.
 */
export function startMarketIntelligenceSyncService(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
  }
  if (discoveryInterval) {
    clearInterval(discoveryInterval);
  }

  // Initial seeding, discovery, and sync after 3 seconds
  setTimeout(async () => {
    await seedInitialMarketIntelligenceData();
    await discoverAssets();
    await runMarketIntelligenceSync();
  }, 3000);

  // Discovery every 24 hours
  discoveryInterval = setInterval(async () => {
    await discoverAssets();
  }, 24 * 60 * 60 * 1000);

  // Sync cycle every 5 minutes
  syncInterval = setInterval(async () => {
    await runMarketIntelligenceSync();
  }, 5 * 60 * 1000);
}
