import { 
  getMarketAssets, 
  upsertMarketAsset, 
  getNetworkMetrics, 
  upsertNetworkMetric, 
  upsertMarketSnapshot, 
  recordTelemetrySyncLog, 
  getLatestMarketSnapshots 
} from '../db/queries.ts';
import { INITIAL_REVIEWS } from '../data.ts';
import { XSTOCKS_REGISTRY } from '../data/xstocksRegistry.ts';

// Initial canonical networks
const INITIAL_NETWORKS = [
  {
    network: 'Robinhood Chain',
    chainId: '4663',
    gasToken: 'ETH',
    nativeToken: 'none',
    explorerUrl: 'https://robinhoodchain.blockscout.com',
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
];

let syncInterval: NodeJS.Timeout | null = null;
let isSyncRunning = false;

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

    // 2. Seed Crypto Assets from INITIAL_REVIEWS
    for (const rev of INITIAL_REVIEWS) {
      await upsertMarketAsset({
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

    // 3. Seed Verified Tokenized Stocks from XSTOCKS_REGISTRY
    for (const xstock of XSTOCKS_REGISTRY) {
      await upsertMarketAsset({
        symbol: xstock.symbol,
        name: xstock.name,
        coingeckoId: xstock.coingeckoId,
        category: 'Tokenized Stock',
        network: xstock.chain,
        contractAddress: xstock.contractAddress,
        logoUrl: xstock.logoUrl,
        isVerified: 1,
      });
    }

    // 4. Compute active counts per network based on actual registered assets
    const assets = await getMarketAssets();
    const networkCounts: Record<string, number> = {};
    for (const net of INITIAL_NETWORKS) {
      networkCounts[net.network] = 0;
    }
    for (const asset of assets) {
      if (asset.network) {
        const net = INITIAL_NETWORKS.find(n => n.network.toLowerCase() === asset.network.toLowerCase());
        if (net) {
          networkCounts[net.network] = (networkCounts[net.network] || 0) + 1;
        }
      }
    }

    for (const net of INITIAL_NETWORKS) {
      await upsertNetworkMetric({
        network: net.network,
        chainId: net.chainId,
        gasToken: net.gasToken,
        nativeToken: net.nativeToken,
        explorerUrl: net.explorerUrl,
        activeAssetsCount: networkCounts[net.network] || 0,
      });
    }

    console.log('[MarketIntelligence] Initial networks and assets seeded into Cloud SQL successfully.');
  } catch (error) {
    console.warn('[MarketIntelligence] Seed skipped or failed (will retry on next cycle):', error);
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
          for (const net of INITIAL_NETWORKS) {
            const tvl = chainMap[net.network.toLowerCase()];
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

    const cgIds = assets.map(a => a.coingeckoId).filter(Boolean) as string[];
    let cgDataMap: Record<string, any> = {};
    let csDataMap: Record<string, any> = {};

    // 3. Parallel Multi-Source Ingestion: CoinGecko + CoinStats Oracles
    const [cgResult, csResult] = await Promise.allSettled([
      // Source A: CoinGecko API
      (async () => {
        if (cgIds.length === 0) return {};
        const cgRes = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(cgIds.join(','))}&sparkline=false`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'CryptoReviewLab/3.2.0'
            }
          }
        );
        if (cgRes.ok) {
          const list = await cgRes.json();
          const map: Record<string, any> = {};
          if (Array.isArray(list)) {
            for (const item of list) {
              if (item.id) map[item.id.toLowerCase()] = item;
              if (item.symbol) map[item.symbol.toLowerCase()] = item;
            }
          }
          return map;
        }
        return {};
      })(),
      // Source B: CoinStats Public Feed
      (async () => {
        try {
          const csRes = await fetch(
            'https://script.google.com/macros/s/AKfycbxZcbIpURQQbpVgeMS0VnZmmvNWNpUL4gjXPawedaMfTHZErcP_eztewwd5fplJzOqvhA/exec?action=markets&limit=500',
            { headers: { 'Accept': 'application/json' } }
          );
          if (csRes.ok) {
            const csJson = await csRes.json();
            const items = csJson?.data || csJson?.coins || (Array.isArray(csJson) ? csJson : []);
            const map: Record<string, any> = {};
            if (Array.isArray(items)) {
              for (const it of items) {
                if (it.id) map[it.id.toLowerCase()] = it;
                if (it.symbol) map[it.symbol.toLowerCase()] = it;
              }
            }
            return map;
          }
        } catch {}
        return {};
      })()
    ]);

    if (cgResult.status === 'fulfilled') {
      cgDataMap = cgResult.value;
    }
    if (csResult.status === 'fulfilled') {
      csDataMap = csResult.value;
    }

    // 4. Process Multi-Source Consensus Convergence and Upsert Snapshots
    for (const asset of assets) {
      const cgItem = (asset.coingeckoId && cgDataMap[asset.coingeckoId.toLowerCase()]) || cgDataMap[asset.symbol.toLowerCase()];
      const csItem = (asset.coingeckoId && csDataMap[asset.coingeckoId.toLowerCase()]) || csDataMap[asset.symbol.toLowerCase()];

      const cgPrice = cgItem?.current_price ?? null;
      const csPrice = csItem?.price ?? null;
      const effectivePrice = cgPrice !== null ? cgPrice : (csPrice !== null ? csPrice : null);

      const change24h = cgItem?.price_change_percentage_24h ?? csItem?.priceChange1d ?? null;
      const marketCap = cgItem?.market_cap ?? csItem?.marketCap ?? null;
      const volume24h = cgItem?.total_volume ?? csItem?.volume ?? null;
      const circulatingSupply = cgItem?.circulating_supply ?? csItem?.availableSupply ?? null;
      const totalSupply = cgItem?.total_supply ?? csItem?.totalSupply ?? null;
      const maxSupply = cgItem?.max_supply ?? null;
      const ath = cgItem?.ath ?? null;
      const atl = cgItem?.atl ?? null;

      // Multi-Source Reconciliation & Divergence Scoring
      let priceDivergencePct = '0.00%';
      let confidenceScore = 80;
      let confidenceLevel = 'Moderate';
      let sourceConsensus = 'INDEPENDENT_INDEX';

      if (cgPrice !== null && csPrice !== null && cgPrice > 0 && csPrice > 0) {
        const mean = (cgPrice + csPrice) / 2;
        const diff = Math.abs(cgPrice - csPrice);
        const divPct = (diff / mean) * 100;
        priceDivergencePct = `${divPct.toFixed(2)}%`;

        if (divPct <= 1.0) {
          confidenceScore = 99;
          confidenceLevel = 'High';
          sourceConsensus = 'FULLY_CROSS_VALIDATED (CG + COINSTATS)';
        } else if (divPct <= 3.0) {
          confidenceScore = 93;
          confidenceLevel = 'High';
          sourceConsensus = 'PARTIALLY_CROSS_VALIDATED (TOLERANCE ±3%)';
        } else {
          confidenceScore = 75;
          confidenceLevel = 'Moderate';
          sourceConsensus = 'UNRESOLVED_DIVERGENCE (>3%)';
        }
      } else if (cgPrice !== null && cgPrice > 0) {
        confidenceScore = 95;
        confidenceLevel = 'High';
        sourceConsensus = 'COINGECKO_VERIFIED_PRIMARY';
      } else if (csPrice !== null && csPrice > 0) {
        confidenceScore = 90;
        confidenceLevel = 'High';
        sourceConsensus = 'COINSTATS_VERIFIED_PRIMARY';
      }

      await upsertMarketSnapshot({
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
          symbol: asset.symbol,
          cgPrice,
          csPrice,
          divergence: priceDivergencePct,
          timestamp: new Date().toISOString()
        }
      });

      itemsSynced++;
    }

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

// Start the continuous proactive background sync service
export function startMarketIntelligenceSyncService(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  // Initial seeding and first run after 3 seconds
  setTimeout(async () => {
    await seedInitialMarketIntelligenceData();
    await runMarketIntelligenceSync();
  }, 3000);

  // Recurring sync every 5 minutes (300,000 ms)
  syncInterval = setInterval(async () => {
    await runMarketIntelligenceSync();
  }, 5 * 60 * 1000);
}
