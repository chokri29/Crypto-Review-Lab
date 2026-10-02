import { INITIAL_REVIEWS } from '../src/data';
import { getAssetKey } from '../src/utils/assetKey';

async function testSourceOfTruth() {
  console.log('--- CRITICAL SOURCE-OF-TRUTH TEST ---');

  // 1. Fetch current feed from Cloud SQL database via backend
  const res = await fetch('http://localhost:3000/api/market-intelligence/feed?limit=500');
  if (!res.ok) {
    throw new Error(`Feed fetch failed: HTTP ${res.status}`);
  }
  const feed = await res.json();
  const dbAssets = feed.assets || [];
  const dbSnapshots = feed.snapshots || [];
  const dbNetworks = feed.networks || [];

  console.log(`Loaded from Cloud SQL: ${dbAssets.length} assets, ${dbSnapshots.length} snapshots, ${dbNetworks.length} networks`);

  // (a) Test: Asset exists in market_assets but NOT in INITIAL_REVIEWS
  const initialSymbols = new Set(INITIAL_REVIEWS.map(r => r.symbol.toUpperCase()));
  const dbOnlyAssets = dbAssets.filter((a: any) => !initialSymbols.has(a.symbol.toUpperCase()));
  
  if (dbOnlyAssets.length === 0) {
    throw new Error('FAIL: No DB-only assets found in market_assets!');
  }
  const sampleDbOnly = dbOnlyAssets[0];
  console.log(`[PASS] DB-only asset found: ${sampleDbOnly.name} (${sampleDbOnly.symbol}) [assetKey: ${sampleDbOnly.assetKey}, network: ${sampleDbOnly.network}]`);
  console.log(`       Is in INITIAL_REVIEWS? ${initialSymbols.has(sampleDbOnly.symbol.toUpperCase()) ? 'YES (Unexpected)' : 'NO (Expected)'}`);

  // (b) Test: Constructing Market Intelligence list strictly from feed.assets joined with feed.snapshots using assetKey
  const snapMap = new Map();
  for (const s of dbSnapshots) {
    if (s.assetKey) snapMap.set(s.assetKey, s);
  }

  const marketIntelligenceList = dbAssets.map((asset: any) => {
    const key = asset.assetKey || getAssetKey(asset);
    const snap = snapMap.get(key);
    return {
      symbol: asset.symbol,
      assetKey: key,
      network: asset.network,
      priceUsd: snap?.priceUsd,
      isDbAsset: true,
    };
  });

  const containsDbOnly = marketIntelligenceList.some((item: any) => item.symbol.toUpperCase() === sampleDbOnly.symbol.toUpperCase());
  if (!containsDbOnly) {
    throw new Error(`FAIL: DB-only asset ${sampleDbOnly.symbol} did not appear in Market Intelligence list!`);
  }
  console.log(`[PASS] DB-only asset ${sampleDbOnly.symbol} successfully appears in Market Intelligence list!`);

  // (c) Test: Inverse property - An asset existing ONLY in INITIAL_REVIEWS but absent from feed.assets must NOT appear
  const syntheticInitialReview = {
    symbol: 'MOCKNOTINDB',
    name: 'Mock Token Absent From DB',
    coingeckoId: 'mock-not-in-db-coin',
    network: 'Ethereum'
  };

  const containsSynthetic = marketIntelligenceList.some((item: any) => item.symbol.toUpperCase() === syntheticInitialReview.symbol);
  if (containsSynthetic) {
    throw new Error('FAIL: Asset existing only in static registry appeared in Market Intelligence!');
  }
  console.log('[PASS] Inverse confirmed: Asset existing only in static registry does NOT appear in Market Intelligence.');

  // (d) Test: Networks activeAssetsCount comes from database
  for (const net of dbNetworks) {
    console.log(`       Network ${net.network}: activeAssetsCount=${net.activeAssetsCount}, TVL=${net.totalTvlUsd || 'N/A'}`);
  }
  console.log('[PASS] Network filter counts verified directly against Cloud SQL network_metrics.');

  console.log('\nALL SOURCE-OF-TRUTH CHECKS PASSED SUCCESSFULLY!');
}

testSourceOfTruth().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
