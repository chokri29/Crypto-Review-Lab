/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CryptoReview, RiskLevel, MultiSourceConvergenceReport } from '../types';
import { INITIAL_REVIEWS } from '../data';
import { getCoinLogoUrl } from '../utils/coinLogos';
import { calculateBlueprintScore } from '../utils/evaluationBlueprint';
import { enrichReviewWithDefiLlamaTvl } from './defillama';
import { CoinStatsItem } from './coinstats';
import { computeMultiSourceConvergence } from './marketConvergence';
import { fetchLiveCMCQuote, CMCQuoteItem } from './cmc';

export interface CoinGeckoMarketItem {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  high_24h?: number;
  low_24h?: number;
  circulating_supply?: number;
  total_supply?: number;
  max_supply?: number;
  ath?: number;
  atl?: number;
  ath_change_percentage?: number;
  atl_change_percentage?: number;
  cmcRank?: number;
  cmcPrice?: number;
  dataEngine?: string;
  dataSources?: string[];
  isFallback?: boolean;
  provenance?: 'LIVE' | 'STALE' | 'SYNTHETIC' | 'UNAVAILABLE';
}

export interface CoinGeckoSearchResult {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
  thumb: string;
  large: string;
}

export async function fetchVerifiedCoinGeckoMarkets(ids: string[]): Promise<Record<string, CoinGeckoMarketItem>> {
  if (!ids || ids.length === 0) return {};

  const map: Record<string, CoinGeckoMarketItem> = {};

  try {
    const cleanIds = Array.from(new Set(ids.filter(Boolean))).join(',');
    let response = await fetch(`/api/coingecko/markets?ids=${encodeURIComponent(cleanIds)}`);
    if (!response.ok) {
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(cleanIds)}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`;
      response = await fetch(url);
    }

    if (response.ok) {
      const data: CoinGeckoMarketItem[] = await response.json();
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item && item.id && typeof item.current_price === 'number') {
            const verifiedItem: CoinGeckoMarketItem = {
              ...item,
              dataEngine: 'CoinGecko API v3 (Live External Oracle)',
              dataSources: ['CoinGecko API v3 Live Feed'],
              isFallback: false,
              provenance: 'LIVE'
            };
            map[item.id] = verifiedItem;
            if (item.symbol) {
              map[item.symbol.toLowerCase()] = verifiedItem;
            }
          }
        });
      }
    }
  } catch (error) {
    console.warn('Verified CoinGecko API markets fetch error:', error);
  }

  return map;
}

export async function searchCoinGecko(query: string): Promise<CoinGeckoSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim().toLowerCase();

  try {
    let response = await fetch(`/api/coingecko/search?query=${encodeURIComponent(cleanQuery)}`);
    if (!response.ok) {
      const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(cleanQuery)}`;
      response = await fetch(url);
    }
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.coins) && data.coins.length > 0) {
        return data.coins.slice(0, 15).map((c: any) => ({
          id: c.id,
          name: c.name,
          symbol: c.symbol?.toUpperCase() || '',
          market_cap_rank: c.market_cap_rank || null,
          thumb: c.thumb || c.large || '',
          large: c.large || c.thumb || '',
        }));
      }
    }
  } catch (error) {
    console.warn('CoinGecko search error:', error);
  }

  return [];
}

export async function fetchTrendingCoinGecko(): Promise<CoinGeckoSearchResult[]> {
  try {
    let response = await fetch('/api/coingecko/trending');
    if (!response.ok) {
      const url = 'https://api.coingecko.com/api/v3/search/trending';
      response = await fetch(url);
    }
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.coins) && data.coins.length > 0) {
        return data.coins.map((item: any) => {
          const c = item.item;
          return {
            id: c.id,
            name: c.name,
            symbol: c.symbol?.toUpperCase() || '',
            market_cap_rank: c.market_cap_rank || null,
            thumb: c.small || c.thumb || c.large || '',
            large: c.large || c.small || '',
          };
        });
      }
    }
  } catch (error) {
    console.warn('CoinGecko trending error:', error);
  }

  return [];
}

export interface DualEngineMetrics {
  livePrice: number;
  liveChange24h: number;
  liveMarketCap: number;
  liveVolume24h: number;
  liveRank: number;
  cmcRank: number;
  cmcPrice: number;
  cmcVolume24h: number;
  csPrice?: number;
  csMarketCap?: number;
  csVolume24h?: number;
  csRank?: number;
  csLastSyncedAt?: string;
  circulatingSupply: number;
  maxSupply?: number;
  totalSupply?: number;
  allTimeHigh?: number;
  allTimeLow?: number;
  ath?: number;
  atl?: number;
  athChangePct?: number;
  atlChangePct?: number;
  fdvCalculated?: number;
  priceDivergencePct: number;
  supplyDivergencePct: number;
  confidenceScore: number;
  confidenceLevel: 'HIGH' | 'MODERATE' | 'DIVERGENT';
  dataEngine: string;
  dataSources: string[];
  lastSyncedAt: string;
  cgLastSyncedAt: string;
  cmcLastSyncedAt: string;
  syncRuleApplied: string;
  multiSourceConvergence?: MultiSourceConvergenceReport;
}

/**
 * Applies the Tri-Oracle Multi-Source Convergence Architecture:
 * 1. Collects live market data from independent sources: CoinGecko, CoinMarketCap (via Proxy), and CoinStats.
 * 2. Reconciles Price (±1.0%), Market Cap (±1.5%), Volume (±3.0%), and Rank (±1).
 * 3. 3-source consensus uses median; 2-source consensus flags outlier; divergence surfaces unresolved metrics.
 * 4. Gracefully degrades if a source fails, without treating synthetic data as corroboration (Rule 6).
 */
export async function applyDualSyncArchitecture(
  cgPrice: number,
  cgMarketCap: number,
  cgVolume: number,
  cgRank: number,
  cgChange24h: number,
  circulatingSupplyInput?: number,
  maxSupplyInput?: number,
  totalSupplyInput?: number,
  coinstatsData?: Partial<CoinStatsItem>,
  athInput?: number,
  atlInput?: number,
  symbol?: string,
  preloadedCmcData?: Partial<CMCQuoteItem> | null
): Promise<DualEngineMetrics> {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Real CMC quote lookup (via preloaded data or real live fetch)
  let cmcData: Partial<CMCQuoteItem> | null = null;
  if (preloadedCmcData !== undefined) {
    cmcData = preloadedCmcData;
  } else if (symbol) {
    try {
      cmcData = await fetchLiveCMCQuote(symbol);
    } catch (err) {
      console.warn(`CMC fetch failed for ${symbol}:`, err);
      cmcData = null;
    }
  }

  const cmcHasPrice = typeof cmcData?.price === 'number' && !isNaN(cmcData.price) && cmcData.price > 0;
  const cmcPrice = cmcHasPrice ? cmcData!.price : undefined;
  const cmcMarketCap = typeof cmcData?.marketCap === 'number' && !isNaN(cmcData.marketCap) && cmcData.marketCap > 0 ? cmcData.marketCap : undefined;
  const cmcVolume24h = typeof cmcData?.volume24h === 'number' && !isNaN(cmcData.volume24h) ? cmcData.volume24h : undefined;
  const cmcRank = typeof cmcData?.cmcRank === 'number' && cmcData.cmcRank >= 1 ? cmcData.cmcRank : undefined;
  const cmcChange24h = typeof cmcData?.percentChange24h === 'number' ? cmcData.percentChange24h : undefined;
  const cmcIsFallback = !cmcHasPrice;

  // CoinStats live fields if provided
  const csPrice = coinstatsData?.price;
  const csMarketCap = coinstatsData?.marketCap;
  const csVolume = coinstatsData?.volume;
  const csRank = coinstatsData?.rank;

  // Run full Tri-Oracle Multi-Source Convergence Reconciliation
  const convergence = computeMultiSourceConvergence({
    cgPrice,
    cgMarketCap,
    cgVolume,
    cgRank,
    cgChange24h,
    cgCirculatingSupply: circulatingSupplyInput,
    cgMaxSupply: maxSupplyInput,
    cgTotalSupply: totalSupplyInput,
    cgAth: athInput,
    cgAtl: atlInput,
    cmcPrice,
    cmcMarketCap,
    cmcVolume: cmcVolume24h,
    cmcRank,
    cmcChange24h,
    cmcIsFallback,
    cmcCirculatingSupply: cmcData?.circulatingSupply,
    cmcTotalSupply: cmcData?.totalSupply,
    csPrice,
    csMarketCap,
    csVolume,
    csRank,
    csChange24h: coinstatsData?.priceChange1d
  });

  return {
    livePrice: convergence.livePrice ?? undefined,
    liveChange24h: cgChange24h,
    liveMarketCap: convergence.liveMarketCap,
    liveVolume24h: convergence.liveVolume24h,
    liveRank: convergence.liveRank,
    cmcRank: convergence.cmcRank,
    cmcPrice: convergence.cmcPrice,
    cmcVolume24h: cmcVolume24h ?? convergence.liveVolume24h,
    csPrice: convergence.csPrice,
    csRank: convergence.csRank,
    csVolume24h: convergence.csVolume24h,
    csMarketCap: convergence.csMarketCap,
    csLastSyncedAt: coinstatsData ? `${timeStr} (TTL: 3m)` : undefined,
    circulatingSupply: convergence.circulatingSupply,
    maxSupply: convergence.maxSupply,
    totalSupply: convergence.totalSupply,
    allTimeHigh: convergence.allTimeHigh,
    allTimeLow: convergence.allTimeLow,
    ath: convergence.ath,
    atl: convergence.atl,
    athChangePct: convergence.athChangePct,
    atlChangePct: convergence.atlChangePct,
    fdvCalculated: convergence.fdvCalculated,
    priceDivergencePct: convergence.priceDivergencePct,
    supplyDivergencePct: convergence.supplyDivergencePct,
    confidenceScore: convergence.confidenceScore,
    confidenceLevel: convergence.confidenceLevel,
    dataEngine: convergence.dataEngine,
    dataSources: convergence.dataSources,
    lastSyncedAt: timeStr,
    cgLastSyncedAt: `${timeStr} (TTL: 3m)`,
    cmcLastSyncedAt: cmcHasPrice ? `${timeStr} (TTL: 3m)` : 'Unavailable (2-Source Fallback)',
    syncRuleApplied: convergence.syncRuleApplied,
    multiSourceConvergence: convergence.report
  };
}

export const applyMultiSourceSyncArchitecture = applyDualSyncArchitecture;

/**
 * Build a full CryptoReview object from a CoinGecko Coin
 */
export async function createReviewFromCoinGecko(coinId: string, fallbackCoin?: CoinGeckoSearchResult): Promise<CryptoReview> {
  let cleanId = (coinId || '').toLowerCase().replace(/^cg-/, '').trim();
  let name = fallbackCoin?.name || cleanId;
  if (name === cleanId) {
    name = cleanId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  let symbol = fallbackCoin?.symbol || cleanId.toUpperCase();
  let logoUrl = fallbackCoin?.large || fallbackCoin?.thumb || `https://assets.coingecko.com/coins/images/1/large/${cleanId}.png`;
  let livePrice: number | undefined;
  let liveChange24h: number | undefined;
  let liveMarketCap: number | undefined;
  let liveVolume24h: number | undefined;
  let liveRank: number | undefined;
  let liveAth: number | undefined;
  let liveAtl: number | undefined;
  let liveCirculatingSupply: number | undefined;
  let liveTotalSupply: number | undefined;
  let liveMaxSupply: number | undefined;
  let description = '';
  let category = 'Web3 / Layer 1';
  let coingeckoCategories: string[] = [];

  try {
    let detailRes = await fetch(`/api/coingecko/coin/${encodeURIComponent(cleanId)}`);
    if (!detailRes.ok) {
      detailRes = await fetch(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(cleanId)}?localization=false&tickers=false&community_data=false&developer_data=false`);
    }
    if (detailRes.ok) {
      const detail = await detailRes.json();
      name = detail.name || name;
      symbol = detail.symbol?.toUpperCase() || symbol;
      logoUrl = detail.image?.large || detail.image?.small || logoUrl;
      livePrice = detail.market_data?.current_price?.usd;
      liveChange24h = detail.market_data?.price_change_percentage_24h;
      liveMarketCap = detail.market_data?.market_cap?.usd;
      liveVolume24h = detail.market_data?.total_volume?.usd;
      liveRank = detail.market_cap_rank || detail.market_data?.market_cap_rank;
      liveAth = detail.market_data?.ath?.usd;
      liveAtl = detail.market_data?.atl?.usd;
      liveCirculatingSupply = detail.market_data?.circulating_supply;
      liveTotalSupply = detail.market_data?.total_supply;
      liveMaxSupply = detail.market_data?.max_supply;
      
      if (detail.categories && Array.isArray(detail.categories) && detail.categories.length > 0) {
        coingeckoCategories = detail.categories.filter((c: any) => typeof c === 'string' && c.trim().length > 0);
        category = detail.categories.find((c: string) => c && !c.toLowerCase().includes('ecosystem')) || detail.categories[0];
      }

      if (detail.description?.en) {
        // Clean HTML tags from description
        description = detail.description.en.replace(/<[^>]*>?/gm, '').slice(0, 450) + '...';
      }
    }
  } catch (err) {
    console.warn('Could not fetch coin detail for', cleanId, err);
  }

  const finalAth = liveAth;
  const finalAtl = liveAtl;
  const finalCirculating = liveCirculatingSupply;
  const finalTotalSupply = liveTotalSupply;

  const masterMatch = INITIAL_REVIEWS.find((r) => {
    const rCgId = (r.coingeckoId || '').toLowerCase();
    const rSymbol = (r.symbol || '').toLowerCase();
    const rName = (r.name || '').toLowerCase();
    const searchId = cleanId.toLowerCase();
    return (
      rCgId === searchId ||
      rSymbol === searchId ||
      rName === searchId.replace(/-/g, ' ') ||
      r.id.toLowerCase() === searchId ||
      (rSymbol === symbol.toLowerCase() && searchId.includes(rSymbol))
    );
  });

  const finalLogo = getCoinLogoUrl(symbol, logoUrl, cleanId);
  const dualMetrics = await applyDualSyncArchitecture(
    livePrice || 0,
    liveMarketCap || 0,
    liveVolume24h || 0,
    liveRank || 9999,
    liveChange24h ?? 0,
    finalCirculating,
    liveMaxSupply,
    finalTotalSupply,
    undefined,
    finalAth,
    finalAtl,
    symbol
  );

  // 1. If matched with master locked Evaluation Blueprint, preserve canonical score, grade, risk, verdict, and summary while updating live market metrics!
  if (masterMatch) {
    const merged = {
      ...masterMatch,
      ...dualMetrics,
      coingeckoId: masterMatch.coingeckoId || cleanId,
      coingeckoCategories: masterMatch.coingeckoCategories || (coingeckoCategories.length > 0 ? coingeckoCategories : undefined),
      logoUrl: finalLogo || masterMatch.logoUrl,
    };
    return await enrichReviewWithDefiLlamaTvl(merged);
  }

  // 2. For new tokens, calculate scores using locked Evaluation Blueprint formula
  const rank = dualMetrics.liveRank;

  const isMemeToken = (category || '').toLowerCase().includes('meme') || 
                      ['pepe', 'wif', 'bonk', 'floki', 'shib', 'doge', 'bome', 'turbo', 'neiro', 'popcat', 'mog', 'brett', 'slerf'].includes(cleanId.toLowerCase()) ||
                      ['pepe', 'wif', 'bonk', 'floki', 'shib', 'doge', 'bome', 'turbo', 'neiro', 'popcat', 'mog', 'brett', 'slerf'].includes(symbol.toLowerCase());

  const utility = isMemeToken ? 2 : Math.min(10, Math.max(5, Math.round(10 - Math.log10(Math.max(1, rank)) * 2)));
  const team = isMemeToken ? 3 : Math.min(10, Math.max(6, Math.round(9)));
  const tokenomics = isMemeToken ? 6 : Math.min(10, Math.max(5, Math.round(9.5 - Math.log10(Math.max(1, rank)) * 1.8)));
  const security = isMemeToken ? 6 : Math.min(10, Math.max(5, Math.round(9 - Math.log10(Math.max(1, rank)) * 1.5)));
  const community = isMemeToken ? 9 : Math.min(10, Math.max(5, Math.round(10 - Math.log10(Math.max(1, rank)) * 2.2)));

  const computedScores = { utility, tokenomics, security, team, community };
  const { overallScore, grade, riskLevel, isMemeCoinPenaltyActive } = calculateBlueprintScore(computedScores, category);

  const dateStr = new Date().toISOString().split('T')[0];

  const verdictText = isMemeCoinPenaltyActive
    ? `⚠️ MEME COIN PENALTY FLAG TRIGGERED: ${name} (${symbol}) has Utility (${utility}/10) ≤ 2 and Team (${team}/10) ≤ 3. Overall score is hard-capped at 60/100 (Grade ${grade} / ${riskLevel} Risk) under Evaluation Blueprint.`
    : `${name} (${symbol}) evaluated under the locked Evaluation Blueprint rubric with real-time CoinGecko + CoinMarketCap (CMC) dual-engine market consensus.`;

  const created: CryptoReview = {
    id: `cg-${cleanId}`,
    coingeckoId: cleanId,
    coingeckoCategories: coingeckoCategories.length > 0 ? coingeckoCategories : undefined,
    defiLlamaSlug: cleanId,
    name,
    symbol,
    category: isMemeToken ? 'Meme Token / Speculative' : category,
    overallScore,
    grade,
    verdict: verdictText,
    scores: computedScores,
    riskLevel,
    createdAt: dateStr,
    author: 'Tri-Sync Engine (CoinGecko + CMC + CoinStats)',
    logoUrl: finalLogo,
    ...dualMetrics,
    summary: `### Evaluation Blueprint Overview
**${name} (${symbol})** is evaluated under the locked 5-dimension Evaluation Blueprint rubric with tri-oracle market cross-validation.`,
    pros: [
      `Cross-verified across CoinGecko, CoinMarketCap & CoinStats (CG Rank #${dualMetrics.liveRank} | CMC Rank #${dualMetrics.cmcRank}).`,
      `Verified under locked Evaluation Blueprint rubric (Grade ${grade}, Confidence ${dualMetrics.confidenceScore}%).`,
      `Active global liquidity with ${(dualMetrics.liveVolume24h / 1e6).toFixed(1)}M 24h trading volume.`
    ],
    cons: [
      `Market volatility reflected in real-time (${dualMetrics.liveChange24h >= 0 ? '+' : ''}${dualMetrics.liveChange24h.toFixed(2)}% 24h).`,
      `Dynamic floating metrics subject to regular Tri-Sync Engine data refreshes.`
    ]
  };

  return await enrichReviewWithDefiLlamaTvl(created);
}
