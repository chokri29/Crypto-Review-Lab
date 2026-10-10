/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CryptoReview } from '../types';
import { INITIAL_REVIEWS } from '../data';
import { XSTOCKS_REGISTRY, XStockRegistryItem } from '../data/xstocksRegistry';
import { getCoinLogoUrl } from '../utils/coinLogos';

export type TrackedAssetType = 'crypto' | 'xstock';

export interface TrackedAssetItem {
  id: string; // Crypto review id (e.g. 'bitcoin') or xstock symbol (e.g. 'AAPLX')
  type: TrackedAssetType;
  symbol: string;
  name: string;
  underlyingTicker?: string; // e.g. 'AAPL' for AAPLX
  category: string;
  logoUrl?: string;
  coingeckoId?: string;
  chain?: string;
  issuer?: string;
  score: number; // Verification score (0-100)
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  stabilityStatus: string;
  lastViewedAt: number; // Timestamp ms
  viewCount24h: number; // Total views in last 24h window
}

interface StoredViewRecord {
  id: string;
  type: TrackedAssetType;
  symbol: string;
  name: string;
  underlyingTicker?: string;
  category: string;
  logoUrl?: string;
  coingeckoId?: string;
  chain?: string;
  issuer?: string;
  score?: number;
  riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical';
  stabilityStatus?: string;
  viewTimestamps: number[];
}

const STORAGE_KEY = 'crl_tracked_assets_24h_v2';
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// Default baseline 24h seed items if storage is empty
function generateDefault24hSeeds(): StoredViewRecord[] {
  const now = Date.now();
  const h = (hoursAgo: number) => now - hoursAgo * 3600 * 1000;

  return [
    {
      id: 'NVDAX',
      type: 'xstock',
      symbol: 'NVDAX',
      name: 'NVIDIA xStock',
      underlyingTicker: 'NVDA',
      category: 'Semiconductors',
      logoUrl: 'https://coin-images.coingecko.com/coins/images/38911/large/bNVDA_200p.png',
      chain: 'Solana',
      issuer: 'Backed Finance',
      score: 99,
      riskLevel: 'Low',
      stabilityStatus: 'Peg Synchronized (1:1)',
      viewTimestamps: [h(0.4), h(1.2), h(2.8), h(4.5), h(6.1), h(8.9), h(12.3), h(15.7), h(19.2), h(22.1)]
    },
    {
      id: 'bitcoin',
      type: 'crypto',
      symbol: 'BTC',
      name: 'Bitcoin',
      category: 'Layer 1 / Store of Value',
      logoUrl: getCoinLogoUrl('BTC', null, 'bitcoin'),
      coingeckoId: 'bitcoin',
      chain: 'Bitcoin Network',
      issuer: 'Decentralized Protocol',
      score: 98,
      riskLevel: 'Low',
      stabilityStatus: 'Consensus & State Verified',
      viewTimestamps: [h(0.2), h(1.1), h(2.5), h(3.9), h(5.8), h(8.0), h(11.2), h(14.5), h(18.0), h(21.4)]
    },
    {
      id: 'TSLAX',
      type: 'xstock',
      symbol: 'TSLAX',
      name: 'Tesla xStock',
      underlyingTicker: 'TSLA',
      category: 'EV & CleanTech',
      logoUrl: 'https://coin-images.coingecko.com/coins/images/38916/large/bTSLA_200p.png',
      chain: 'Solana',
      issuer: 'Backed Finance',
      score: 98,
      riskLevel: 'Low',
      stabilityStatus: 'Peg Synchronized (1:1)',
      viewTimestamps: [h(0.8), h(2.1), h(3.5), h(5.4), h(7.9), h(11.0), h(14.2), h(18.1), h(23.0)]
    },
    {
      id: 'ethereum',
      type: 'crypto',
      symbol: 'ETH',
      name: 'Ethereum',
      category: 'Smart Contract Platform',
      logoUrl: getCoinLogoUrl('ETH', null, 'ethereum'),
      coingeckoId: 'ethereum',
      chain: 'Ethereum',
      issuer: 'Decentralized Protocol',
      score: 96,
      riskLevel: 'Low',
      stabilityStatus: 'Consensus & State Verified',
      viewTimestamps: [h(1.0), h(2.4), h(4.2), h(6.8), h(9.5), h(13.1), h(16.5), h(20.3)]
    },
    {
      id: 'AAPLX',
      type: 'xstock',
      symbol: 'AAPLX',
      name: 'Apple xStock',
      underlyingTicker: 'AAPL',
      category: 'Tech Megacap',
      logoUrl: 'https://assets.coingecko.com/coins/images/31871/large/bAAPL_200p.png',
      chain: 'Solana',
      issuer: 'Backed Finance',
      score: 99,
      riskLevel: 'Low',
      stabilityStatus: 'Peg Synchronized (1:1)',
      viewTimestamps: [h(1.5), h(3.0), h(5.1), h(7.6), h(10.8), h(15.2), h(19.8)]
    },
    {
      id: 'solana',
      type: 'crypto',
      symbol: 'SOL',
      name: 'Solana',
      category: 'High-Throughput L1',
      logoUrl: getCoinLogoUrl('SOL', null, 'solana'),
      coingeckoId: 'solana',
      chain: 'Solana',
      issuer: 'Decentralized Protocol',
      score: 94,
      riskLevel: 'Low',
      stabilityStatus: 'Consensus & State Verified',
      viewTimestamps: [h(1.8), h(3.7), h(6.3), h(9.1), h(13.4), h(17.2), h(22.5)]
    },
    {
      id: 'METAX',
      type: 'xstock',
      symbol: 'METAX',
      name: 'Meta Platforms xStock',
      underlyingTicker: 'META',
      category: 'Tech Megacap',
      logoUrl: 'https://coin-images.coingecko.com/coins/images/38914/large/bMETA_200p.png',
      chain: 'Solana',
      issuer: 'Backed Finance',
      score: 97,
      riskLevel: 'Low',
      stabilityStatus: 'Peg Synchronized (1:1)',
      viewTimestamps: [h(2.2), h(4.6), h(7.2), h(10.5), h(14.8), h(20.1)]
    },
    {
      id: 'chainlink',
      type: 'crypto',
      symbol: 'LINK',
      name: 'Chainlink',
      category: 'Oracle / RWA Infrastructure',
      logoUrl: getCoinLogoUrl('LINK', null, 'chainlink'),
      coingeckoId: 'chainlink',
      chain: 'Ethereum',
      issuer: 'Chainlink Network',
      score: 95,
      riskLevel: 'Low',
      stabilityStatus: 'Consensus & State Verified',
      viewTimestamps: [h(2.6), h(5.2), h(8.4), h(12.0), h(16.9), h(21.7)]
    },
    {
      id: 'GOOGLX',
      type: 'xstock',
      symbol: 'GOOGLX',
      name: 'Alphabet xStock',
      underlyingTicker: 'GOOGL',
      category: 'Tech Megacap',
      logoUrl: 'https://coin-images.coingecko.com/coins/images/38912/large/bGOOGL_200p.png',
      chain: 'Solana',
      issuer: 'Backed Finance',
      score: 98,
      riskLevel: 'Low',
      stabilityStatus: 'Peg Synchronized (1:1)',
      viewTimestamps: [h(3.1), h(6.0), h(9.8), h(14.0), h(18.5)]
    },
    {
      id: 'COINX',
      type: 'xstock',
      symbol: 'COINX',
      name: 'Coinbase xStock',
      underlyingTicker: 'COIN',
      category: 'Crypto Infrastructure',
      logoUrl: 'https://coin-images.coingecko.com/coins/images/38915/large/bCOIN_200p.png',
      chain: 'Solana',
      issuer: 'Backed Finance',
      score: 96,
      riskLevel: 'Low',
      stabilityStatus: 'Peg Synchronized (1:1)',
      viewTimestamps: [h(3.5), h(6.9), h(11.2), h(15.9), h(20.4)]
    }
  ];
}

/**
 * Read raw stored records from localStorage
 */
function readStorage(): StoredViewRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaults = generateDefault24hSeeds();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed: StoredViewRecord[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const defaults = generateDefault24hSeeds();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    return parsed;
  } catch (err) {
    console.warn('Failed to parse tracked assets from localStorage:', err);
    return generateDefault24hSeeds();
  }
}

/**
 * Save records to localStorage
 */
function writeStorage(records: StoredViewRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('tracked-assets-updated'));
  } catch (err) {
    console.warn('Failed to save tracked assets to localStorage:', err);
  }
}

/**
 * Record a view for an asset (crypto or tokenized stock) in the last 24h window
 */
export function recordAssetView(item: {
  id: string;
  type: TrackedAssetType;
  symbol: string;
  name: string;
  underlyingTicker?: string;
  category?: string;
  logoUrl?: string;
  coingeckoId?: string;
  chain?: string;
  issuer?: string;
  score?: number;
  riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical';
  stabilityStatus?: string;
}): void {
  if (!item.id || !item.symbol) return;
  const now = Date.now();
  const records = readStorage();

  const existingIdx = records.findIndex(r => r.id.toLowerCase() === item.id.toLowerCase() || (r.type === item.type && r.symbol.toUpperCase() === item.symbol.toUpperCase()));

  if (existingIdx >= 0) {
    const rec = records[existingIdx];
    // Filter timestamps to 24h window
    const validTimestamps = (rec.viewTimestamps || []).filter(ts => (now - ts) <= WINDOW_MS);
    
    // If viewed within the last 60 seconds, update metadata without duplicating timestamp or spamming events
    if (validTimestamps.length > 0 && (now - validTimestamps[0]) < 60000) {
      records[existingIdx] = {
        ...rec,
        ...item,
        category: item.category || rec.category,
        logoUrl: item.logoUrl || rec.logoUrl,
        score: item.score ?? rec.score ?? 95,
        riskLevel: item.riskLevel || rec.riskLevel || 'Low',
        stabilityStatus: item.stabilityStatus || rec.stabilityStatus || (item.type === 'xstock' ? 'Peg Synchronized (1:1)' : 'Consensus & State Verified'),
        viewTimestamps: validTimestamps
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      } catch {}
      return;
    }

    validTimestamps.unshift(now);

    records[existingIdx] = {
      ...rec,
      ...item,
      category: item.category || rec.category,
      logoUrl: item.logoUrl || rec.logoUrl,
      score: item.score ?? rec.score ?? 95,
      riskLevel: item.riskLevel || rec.riskLevel || 'Low',
      stabilityStatus: item.stabilityStatus || rec.stabilityStatus || (item.type === 'xstock' ? 'Peg Synchronized (1:1)' : 'Consensus & State Verified'),
      viewTimestamps: validTimestamps
    };
  } else {
    records.unshift({
      id: item.id,
      type: item.type,
      symbol: item.symbol.toUpperCase(),
      name: item.name,
      underlyingTicker: item.underlyingTicker,
      category: item.category || (item.type === 'xstock' ? 'Tokenized Stock' : 'Cryptocurrency'),
      logoUrl: item.logoUrl,
      coingeckoId: item.coingeckoId,
      chain: item.chain || (item.type === 'xstock' ? 'Solana' : 'Ethereum'),
      issuer: item.issuer || (item.type === 'xstock' ? 'Backed Finance' : 'Decentralized Protocol'),
      score: item.score ?? 95,
      riskLevel: item.riskLevel || 'Low',
      stabilityStatus: item.stabilityStatus || (item.type === 'xstock' ? 'Peg Synchronized (1:1)' : 'Consensus & State Verified'),
      viewTimestamps: [now]
    });
  }

  writeStorage(records);
}

/**
 * Retrieve the list of most tracked crypto and RWA assets within the last 24h
 */
export function getMostTrackedAssets24h(reviews?: CryptoReview[]): TrackedAssetItem[] {
  const now = Date.now();
  const rawRecords = readStorage();

  // Clean up and aggregate
  const activeItems: TrackedAssetItem[] = [];

  for (const rec of rawRecords) {
    // Keep only timestamps within 24h
    const validTimestamps = (rec.viewTimestamps || []).filter(ts => (now - ts) <= WINDOW_MS);
    if (validTimestamps.length === 0) continue;

    // Resolve latest metadata if review is available
    let resolvedScore = rec.score ?? 95;
    let resolvedRisk: 'Low' | 'Medium' | 'High' | 'Critical' = rec.riskLevel || 'Low';
    let resolvedLogo = rec.logoUrl;

    if (rec.type === 'crypto' && reviews && reviews.length > 0) {
      const match = reviews.find(r => r.id === rec.id || r.symbol.toUpperCase() === rec.symbol.toUpperCase() || (r.coingeckoId && rec.coingeckoId && r.coingeckoId === rec.coingeckoId));
      if (match) {
        resolvedScore = match.overallScore ?? resolvedScore;
        resolvedRisk = (match.riskLevel as any) || resolvedRisk;
        resolvedLogo = match.logoUrl || resolvedLogo;
      }
    } else if (rec.type === 'xstock') {
      const stockMatch = XSTOCKS_REGISTRY.find(s => s.symbol.toUpperCase() === rec.symbol.toUpperCase());
      if (stockMatch) {
        resolvedLogo = stockMatch.logoUrl || resolvedLogo;
      }
    }

    const latestView = Math.max(...validTimestamps);

    activeItems.push({
      id: rec.id,
      type: rec.type,
      symbol: rec.symbol.toUpperCase(),
      name: rec.name,
      underlyingTicker: rec.underlyingTicker,
      category: rec.category,
      logoUrl: resolvedLogo,
      coingeckoId: rec.coingeckoId,
      chain: rec.chain,
      issuer: rec.issuer,
      score: resolvedScore,
      riskLevel: resolvedRisk,
      stabilityStatus: rec.stabilityStatus || (rec.type === 'xstock' ? 'Peg Synchronized (1:1)' : 'Consensus & State Verified'),
      lastViewedAt: latestView,
      viewCount24h: validTimestamps.length
    });
  }

  // Sort by:
  // 1. Total views in last 24h descending
  // 2. Most recent view timestamp descending
  activeItems.sort((a, b) => {
    if (b.viewCount24h !== a.viewCount24h) {
      return b.viewCount24h - a.viewCount24h;
    }
    return b.lastViewedAt - a.lastViewedAt;
  });

  // Ensure default fallback items if empty so MarketTicker never disappears
  const hasCrypto = activeItems.some(i => i.type === 'crypto');
  const hasXStock = activeItems.some(i => i.type === 'xstock');

  if (!hasCrypto) {
    activeItems.push({
      id: 'btc',
      type: 'crypto',
      symbol: 'BTC',
      name: 'Bitcoin',
      category: 'Cryptocurrency',
      score: 95,
      riskLevel: 'Low',
      stabilityStatus: 'Consensus & State Verified',
      lastViewedAt: now,
      viewCount24h: 10
    });
    activeItems.push({
      id: 'eth',
      type: 'crypto',
      symbol: 'ETH',
      name: 'Ethereum',
      category: 'Smart Contract Platform',
      score: 96,
      riskLevel: 'Low',
      stabilityStatus: 'Consensus & State Verified',
      lastViewedAt: now,
      viewCount24h: 9
    });
  }

  if (!hasXStock) {
    const defaultStock = XSTOCKS_REGISTRY[0];
    if (defaultStock) {
      activeItems.push({
        id: defaultStock.symbol,
        type: 'xstock',
        symbol: defaultStock.symbol,
        name: defaultStock.name,
        underlyingTicker: defaultStock.underlyingTicker,
        category: defaultStock.category,
        logoUrl: defaultStock.logoUrl,
        chain: defaultStock.chain,
        issuer: defaultStock.issuer,
        score: 98,
        riskLevel: 'Low',
        stabilityStatus: 'Peg Synchronized (1:1)',
        lastViewedAt: now,
        viewCount24h: 10
      });
    }
  }

  return activeItems;
}
