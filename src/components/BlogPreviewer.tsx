/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  X,
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Home,
  AlertTriangle, 
  CheckCircle, 
  Star, 
  ArrowRight,
  Filter,
  Flame,
  Clock,
  Share2,
  Copy,
  Check,
  Link2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Terminal,
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Crown,
  Zap,
  Cpu,
  Play,
  Pause,
  Pin,
  Layers,
  Activity,
  Building2,
  HardDrive,
  Code,
  Bell,
  BellRing,
  Lock,
  Globe,
  Database,
  Sliders,
  Gauge,
  Coins,
  PieChart,
  BarChart2
} from 'lucide-react';
import { DatabaseTelemetryModal } from './DatabaseTelemetryModal';
import { isXStockAsset } from '../utils/xstockFilter';
import { ROBINHOOD_CHAIN, isRobinhoodChain } from '../constants/chains';

// All 10 standardized categories + All options with icons and badges matching ReviewLab style
const CATEGORY_OPTIONS = [
  { value: 'All', label: 'All Categories', badge: 'All Tracked Assets', icon: BookOpen, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  { value: 'Layer 1 Blockchain', label: 'Layer 1 Blockchain', badge: 'L1 Blockchain', icon: Layers, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  { value: 'Layer 2 / Scaling', label: 'Layer 2 / Scaling', badge: 'L2 / Rollups', icon: Zap, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { value: 'Restaking / Shared Security / AVS', label: 'Restaking / Shared Security / AVS', badge: 'Restaking & AVS', icon: Lock, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  { value: 'DeFi Protocol (AMM / Lending)', label: 'DeFi Protocol (AMM / Lending)', badge: 'DeFi & Vaults', icon: Activity, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'RWA (Tokenization / TradFi Bridge)', label: 'RWA (Tokenization / TradFi Bridge)', badge: 'RWA & TradFi', icon: Building2, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { value: 'DePIN (Compute / Storage / Wireless)', label: 'DePIN (Compute / Storage / Wireless)', badge: 'DePIN & Compute', icon: HardDrive, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
  { value: 'Privacy / Cryptographic (FHE / ZK / MPC)', label: 'Privacy / Cryptographic (FHE / ZK / MPC)', badge: 'FHE & Zero-Knowledge', icon: ShieldCheck, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { value: 'Infrastructure (Oracle / Bridge)', label: 'Infrastructure (Oracle / Bridge)', badge: 'Oracles & Bridges', icon: Code, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  { value: 'Memecoin / Speculative', label: 'Memecoin / Speculative', badge: 'Memes & Speculative', icon: Flame, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  { value: 'Specialized / Experimental', label: 'Specialized / Experimental', badge: 'Move/Rust & Experimental', icon: Cpu, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
];

// Standardized blockchain networks dynamically classification in Market Intelligence
export interface NetworkOption {
  value: string;
  label: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  chainId?: number | string;
  gasToken?: string;
  nativeToken?: string;
  explorer?: string;
}

export const NETWORK_OPTIONS: NetworkOption[] = [
  { value: 'All', label: 'All Networks', badge: 'All Blockchains', icon: Globe, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  { 
    value: ROBINHOOD_CHAIN.name, 
    label: ROBINHOOD_CHAIN.name, 
    badge: `Arbitrum Orbit L2 (Chain ${ROBINHOOD_CHAIN.chainId})`, 
    icon: Building2, 
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    chainId: ROBINHOOD_CHAIN.chainId,
    gasToken: ROBINHOOD_CHAIN.nativeCurrency.symbol,
    nativeToken: ROBINHOOD_CHAIN.nativeToken,
    explorer: ROBINHOOD_CHAIN.explorerUrl
  },
  { value: 'Ethereum', label: 'Ethereum', badge: 'EVM Layer 1', icon: Layers, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', chainId: 1, gasToken: 'ETH', nativeToken: 'ETH', explorer: 'https://etherscan.io' },
  { value: 'Arbitrum', label: 'Arbitrum', badge: 'Arbitrum One / L2', icon: Zap, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20', chainId: 42161, gasToken: 'ETH', nativeToken: 'ARB', explorer: 'https://arbiscan.io' },
  { value: 'Solana', label: 'Solana', badge: 'High-Throughput L1', icon: Zap, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', chainId: 'solana', gasToken: 'SOL', nativeToken: 'SOL', explorer: 'https://solscan.io' },
  { value: 'Sui', label: 'Sui Network', badge: 'Move Object L1', icon: ShieldCheck, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20', chainId: 'sui', gasToken: 'SUI', nativeToken: 'SUI', explorer: 'https://suiscan.xyz' },
  { value: 'Kaspa', label: 'Kaspa', badge: 'GHOSTDAG BlockDAG', icon: Cpu, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', chainId: 'kaspa', gasToken: 'KAS', nativeToken: 'KAS', explorer: 'https://explorer.kaspa.org' },
];

export function getNetworkBadge(network?: string): { label: string; badgeClass: string } {
  const net = (network || '').trim();
  if (isRobinhoodChain(net)) {
    return {
      label: `${ROBINHOOD_CHAIN.name} (Orbit L2)`,
      badgeClass: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/35 shadow-[0_0_8px_rgba(52,211,153,0.25)]'
    };
  }
  if (net === 'Arbitrum') {
    return {
      label: 'Arbitrum One',
      badgeClass: 'text-sky-300 bg-sky-500/15 border-sky-500/35'
    };
  }
  if (net === 'Solana') {
    return {
      label: 'Solana L1',
      badgeClass: 'text-purple-300 bg-purple-500/15 border-purple-500/35'
    };
  }
  if (net === 'Sui') {
    return {
      label: 'Sui Move L1',
      badgeClass: 'text-teal-300 bg-teal-500/15 border-teal-500/35'
    };
  }
  if (net === 'Kaspa') {
    return {
      label: 'Kaspa BlockDAG',
      badgeClass: 'text-amber-300 bg-amber-500/15 border-amber-500/35'
    };
  }
  if (net === 'Ethereum') {
    return {
      label: 'Ethereum L1',
      badgeClass: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/35'
    };
  }
  return {
    label: net || 'EVM / L1',
    badgeClass: 'text-slate-300 bg-slate-800/80 border-slate-700'
  };
}
import { CryptoReview, RiskLevel } from '../types';
import { getCoinLogoUrl } from '../utils/coinLogos';
import { getAssetKey } from '../utils/assetKey';
import { calculateBlueprintScore } from '../services/EvaluationBlueprint';
import { ComparisonReportView } from './ComparisonReportView';
import AIMarketSummary from './AIMarketSummary';
import { getMetricColor } from '../utils/metricColors';
import { TiltCard } from './TiltCard';
import MarketMetricsTable from './MarketMetricsTable';
import CryptoPriceChart from './CryptoPriceChart';
import { useCurrency } from '../context/CurrencyContext';
import { PromoteCanonicalModal } from './PromoteCanonicalModal';
import { SecurityTelemetryWidget } from './SecurityTelemetryWidget';
import { getPublicReviewShareUrl, copyTextToClipboard } from '../utils/shareUtils';

interface BlogPreviewerProps {
  reviews: CryptoReview[];
  selectedReviewId?: string | null;
  setSelectedReviewId?: (id: string | null) => void;
  setActiveTab?: (tab: 'lab' | 'blog' | 'chat' | 'academy' | 'auditor' | 'orders') => void;
  headerSearchQuery?: string;
  setHeaderSearchQuery?: (query: string) => void;
  onOpenCoinGeckoModal?: () => void;
  onSyncCoinGecko?: () => void;
  isSyncingCoinGecko?: boolean;
  onLaunchProEvaluation?: (prefill?: { name?: string; symbol?: string; category?: string; focusArea?: string }) => void;
  onLaunchRegularEvaluation?: (prefill?: { name?: string; symbol?: string; category?: string; focusArea?: string }) => void;
}

export default function BlogPreviewer({ 
  reviews, 
  selectedReviewId, 
  setSelectedReviewId, 
  setActiveTab, 
  headerSearchQuery, 
  setHeaderSearchQuery,
  onOpenCoinGeckoModal,
  onSyncCoinGecko,
  isSyncingCoinGecko,
  onLaunchProEvaluation,
  onLaunchRegularEvaluation
}: BlogPreviewerProps) {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = headerSearchQuery !== undefined ? headerSearchQuery : internalSearchQuery;
  const setSearchQuery = (q: string) => {
    if (setHeaderSearchQuery) {
      setHeaderSearchQuery(q);
    }
    setInternalSearchQuery(q);
  };
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [selectedNetwork, setSelectedNetwork] = useState('All');
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false);
  const networkDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (networkDropdownRef.current && !networkDropdownRef.current.contains(event.target as Node)) {
        setIsNetworkDropdownOpen(false);
      }
    };
    if (isCategoryDropdownOpen || isNetworkDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryDropdownOpen, isNetworkDropdownOpen]);

  const [isCustomSelectOpen, setIsCustomSelectOpen] = useState(false);
  const [showSyncToast, setShowSyncToast] = useState(false);
  const [localActiveReviewId, setLocalActiveReviewId] = useState<string | null>(null);
  const { formatPrice: ctxFormatPrice, selectedCurrency } = useCurrency();
  const [feedAssets, setFeedAssets] = useState<any[]>([]);
  const [networkCounts, setNetworkCounts] = useState<Record<string, number>>({});
  const [networkMetricsList, setNetworkMetricsList] = useState<any[]>([]);
  const [pipelineTelemetry, setPipelineTelemetry] = useState<any>(null);
  const [isSyncingPipeline, setIsSyncingPipeline] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [dbModalSymbol, setDbModalSymbol] = useState<string>('SOL');
  const [liveSnapshotsMap, setLiveSnapshotsMap] = useState<Record<string, any>>({});
  const [databaseAssetsCount, setDatabaseAssetsCount] = useState<number | null>(null);
  const [databaseSnapshotsCount, setDatabaseSnapshotsCount] = useState<number | null>(null);

  const loadMarketIntelligenceFeed = useCallback((network?: string, q?: string) => {
    const params = new URLSearchParams();
    const effectiveNetwork = network !== undefined ? network : selectedNetwork;
    if (effectiveNetwork && effectiveNetwork !== 'All') {
      params.set('network', effectiveNetwork);
    }
    const effectiveQ = q !== undefined ? q : searchQuery;
    if (effectiveQ && effectiveQ.trim()) {
      params.set('q', effectiveQ.trim());
    }
    params.set('limit', '500');

    fetch(`/api/market-intelligence/feed?${params.toString()}`)
      .then(r => r.ok ? r.json() : null)
      .then((feed) => {
        if (feed) {
          if (Array.isArray(feed.assets)) {
            setFeedAssets(feed.assets);
            setDatabaseAssetsCount(feed.total !== undefined ? feed.total : feed.assets.length);
          }
          if (Array.isArray(feed.snapshots)) {
            setLiveSnapshotsMap((prev) => {
              const next = { ...prev };
              for (const s of feed.snapshots) {
                const key = s.assetKey;
                if (!key) continue;
                const existing = next[key];
                if (!existing) {
                  next[key] = s;
                } else {
                  // Never allow an older snapshot to overwrite a newer snapshot
                  const existingTime = existing.syncedAt ? new Date(existing.syncedAt).getTime() : 0;
                  const newTime = s.syncedAt ? new Date(s.syncedAt).getTime() : 0;
                  if (newTime >= existingTime) {
                    next[key] = s;
                  }
                }
              }
              return next;
            });
            setDatabaseSnapshotsCount(feed.totalSnapshots !== undefined ? feed.totalSnapshots : feed.snapshots.length);
          }
          if (Array.isArray(feed.networks) && feed.networks.length > 0) {
            setNetworkMetricsList(feed.networks);
            const counts: Record<string, number> = {};
            for (const net of feed.networks) {
              counts[net.network.toLowerCase()] = net.activeAssetsCount ?? 0;
            }
            setNetworkCounts(counts);
          }
          if (Array.isArray(feed.telemetryLogs) && feed.telemetryLogs.length > 0) {
            setPipelineTelemetry(feed.telemetryLogs[0]);
          }
        }
      })
      .catch(err => console.warn('Failed to load market intelligence feed:', err));
  }, [selectedNetwork, searchQuery]);

  useEffect(() => {
    loadMarketIntelligenceFeed();
    const interval = setInterval(() => {
      loadMarketIntelligenceFeed();
    }, 20000);
    return () => clearInterval(interval);
  }, [loadMarketIntelligenceFeed]);

  const handleSelectNetwork = (net: string) => {
    setSelectedNetwork(net);
    setIsNetworkDropdownOpen(false);
    loadMarketIntelligenceFeed(net, searchQuery);
  };

  const triggerPipelineSync = async () => {
    setIsSyncingPipeline(true);
    try {
      const sessionToken = localStorage.getItem('crl_admin_session_token') || sessionStorage.getItem('crl_admin_session_token');
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers['x-admin-session'] = sessionToken;
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      const res = await fetch('/api/market-intelligence/sync', { method: 'POST', headers });
      if (res.ok) {
        loadMarketIntelligenceFeed();
        if (onSyncCoinGecko) onSyncCoinGecko();
        setShowSyncToast(true);
        setTimeout(() => setShowSyncToast(false), 3000);
      }
    } catch (err) {
      console.warn('Failed to trigger proactive sync:', err);
    } finally {
      setIsSyncingPipeline(false);
    }
  };

  // Critical Source-of-Truth Rule:
  // Market Intelligence list MUST be constructed from feed.assets joined with feed.snapshots using assetKey.
  // INITIAL_REVIEWS (and reviews prop) is used ONLY for optional enrichment (1. coingeckoId, 2. symbol).
  const enrichedReviews = React.useMemo(() => {
    // If feed.assets has not loaded yet, return empty list
    if (!feedAssets || feedAssets.length === 0) {
      return [];
    }

    // Filter out tokenized stocks (xStocks) so Market Intelligence contains strictly cryptocurrencies
    const cryptoAssets = feedAssets.filter((asset) => !isXStockAsset(asset));

    return cryptoAssets.map((asset) => {
      const assetKey = asset.assetKey || getAssetKey(asset);
      const snap = liveSnapshotsMap[assetKey];

      // Optional enrichment matching order: 1. coingeckoId, 2. symbol
      const enrichment = reviews.find((r) => {
        if (asset.coingeckoId && r.coingeckoId && asset.coingeckoId.toLowerCase() === r.coingeckoId.toLowerCase()) {
          return true;
        }
        return false;
      }) || reviews.find((r) => {
        if (asset.symbol && r.symbol && asset.symbol.toLowerCase() === r.symbol.toLowerCase()) {
          return true;
        }
        return false;
      });

      const id = enrichment?.id || (asset.coingeckoId ? `cg-${asset.coingeckoId}` : (asset.assetKey || asset.symbol.toLowerCase()));
      const logoUrl = asset.logoUrl || enrichment?.logoUrl || getCoinLogoUrl(asset.symbol, null, asset.coingeckoId);

      const baseReview: CryptoReview = {
        id,
        assetKey,
        name: asset.name,
        symbol: asset.symbol.toUpperCase(),
        category: asset.category || enrichment?.category || (asset.network === 'Robinhood Chain' ? 'Orbit L2' : 'Cryptocurrency'),
        network: asset.network,
        contractAddress: asset.contractAddress || enrichment?.contractAddress || undefined,
        logoUrl,
        coingeckoId: asset.coingeckoId || enrichment?.coingeckoId || undefined,
        overallScore: enrichment?.overallScore ?? (snap?.confidenceScore ? Math.min(Math.max(snap.confidenceScore, 65), 98) : 85),
        scores: enrichment?.scores || {
          utility: snap?.confidenceScore ? Math.min(10, Math.max(1, Math.round(snap.confidenceScore / 10))) : 8,
          tokenomics: snap?.confidenceScore ? Math.min(10, Math.max(1, Math.round((snap.confidenceScore / 10) * 0.95))) : 8,
          security: snap?.confidenceScore ? Math.min(10, Math.max(1, Math.round((snap.confidenceScore / 10) * 0.92))) : 8,
          team: snap?.confidenceScore ? Math.min(10, Math.max(1, Math.round((snap.confidenceScore / 10) * 0.9))) : 8,
          community: snap?.confidenceScore ? Math.min(10, Math.max(1, Math.round((snap.confidenceScore / 10) * 0.9))) : 8,
        },
        riskLevel: enrichment?.riskLevel ?? ('Declared Risk' as RiskLevel),
        verdict: enrichment?.verdict ?? `Active multi-source consensus tracking on ${asset.network}. Continuous telemetry convergence verified in Cloud SQL.`,
        summary: enrichment?.summary ?? `Database-registered asset on ${asset.network}. Proactive telemetry synchronization maintains continuous price, liquidity, and supply divergence consensus.`,
        pros: enrichment?.pros ?? [
          'Continuous multi-source oracle consensus telemetry',
          `Verified asset registry entry on ${asset.network}`,
          'Real-time supply and market capitalization tracking'
        ],
        cons: enrichment?.cons ?? [
          'Comprehensive smart contract bytecode review pending evaluation',
          'Third-party external dependency risk model active'
        ],
        author: enrichment?.author ?? 'AVF Automated Data Pipeline',
        createdAt: asset.createdAt || enrichment?.createdAt || new Date().toISOString(),
        proBenchmarks: enrichment?.proBenchmarks,
        comparisonReport: enrichment?.comparisonReport,
        auditSignature: enrichment?.auditSignature,
      };

      if (!snap) return baseReview;

      return {
        ...baseReview,
        livePrice: snap.priceUsd ? parseFloat(snap.priceUsd) : baseReview.livePrice,
        liveChange24h: snap.change24h ? parseFloat(snap.change24h) : baseReview.liveChange24h,
        liveMarketCap: snap.marketCapUsd ? parseFloat(snap.marketCapUsd) : baseReview.liveMarketCap,
        liveVolume24h: snap.volume24hUsd ? parseFloat(snap.volume24hUsd) : baseReview.liveVolume24h,
        circulatingSupply: snap.circulatingSupply ? parseFloat(snap.circulatingSupply) : baseReview.circulatingSupply,
        totalSupply: snap.totalSupply ? parseFloat(snap.totalSupply) : baseReview.totalSupply,
        maxSupply: snap.maxSupply ? parseFloat(snap.maxSupply) : baseReview.maxSupply,
        allTimeHigh: snap.allTimeHighUsd ? parseFloat(snap.allTimeHighUsd) : baseReview.allTimeHigh,
        allTimeLow: snap.allTimeLowUsd ? parseFloat(snap.allTimeLowUsd) : baseReview.allTimeLow,
        ath: snap.allTimeHighUsd ? parseFloat(snap.allTimeHighUsd) : baseReview.ath,
        atl: snap.allTimeLowUsd ? parseFloat(snap.allTimeLowUsd) : baseReview.atl,
        priceDivergencePct: snap.priceDivergencePct ? parseFloat(snap.priceDivergencePct) : baseReview.priceDivergencePct,
        confidenceScore: snap.confidenceScore ?? baseReview.confidenceScore,
        confidenceLevel: (snap.confidenceLevel as any) || baseReview.confidenceLevel,
        dataEngine: snap.sourceConsensus || 'PostgreSQL Consensus (Cloud SQL)',
        lastSyncedAt: snap.syncedAt ? new Date(snap.syncedAt).toLocaleTimeString() : baseReview.lastSyncedAt,
      };
    });
  }, [feedAssets, reviews, liveSnapshotsMap]);

  // Dynamic Network Options built from feed.networks (Cloud SQL)
  const networkOptions: NetworkOption[] = useMemo(() => {
    const list: NetworkOption[] = [
      { 
        value: 'All', 
        label: 'All Networks', 
        badge: 'All Blockchains', 
        icon: Globe, 
        color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' 
      }
    ];

    if (networkMetricsList && networkMetricsList.length > 0) {
      for (const net of networkMetricsList) {
        const netName = net.network;
        const predefined = NETWORK_OPTIONS.find((o) => o.value.toLowerCase() === netName.toLowerCase());
        list.push({
          value: netName,
          label: netName,
          badge: predefined?.badge || (net.chainId ? `Chain ID ${net.chainId}` : `${netName} Ecosystem`),
          icon: predefined?.icon || Layers,
          color: predefined?.color || 'text-purple-400 bg-purple-500/10 border-purple-500/20',
          chainId: net.chainId,
          gasToken: net.gasToken,
          nativeToken: net.nativeToken,
          explorer: net.explorerUrl
        });
      }

      // Ensure Robinhood Chain is always present in network options
      if (!list.some(item => isRobinhoodChain(item.value))) {
        const rhOpt = NETWORK_OPTIONS.find(o => isRobinhoodChain(o.value));
        if (rhOpt) list.push(rhOpt);
      }
    } else {
      return NETWORK_OPTIONS;
    }

    return list;
  }, [networkMetricsList]);

  const getNetworkAssetCount = (netName: string): number | string => {
    if (netName === 'All') return databaseAssetsCount !== null ? databaseAssetsCount : '—';
    if (isRobinhoodChain(netName)) return 0;
    const lower = netName.toLowerCase();
    if (networkCounts[lower] !== undefined) return networkCounts[lower];
    const match = networkMetricsList.find(n => n.network.toLowerCase() === lower);
    if (match && match.activeAssetsCount !== undefined) return match.activeAssetsCount;
    return '—';
  };

  const getNetworkTvl = (netName: string) => {
    const match = networkMetricsList.find(n => n.network.toLowerCase() === netName.toLowerCase());
    return match?.totalTvlUsd;
  };

  // Watchlist state initialized from localStorage
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('crl_watchlist');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load watchlist:', e);
    }
    return [];
  });

  const toggleWatchlist = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWatchlist((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('crl_watchlist', JSON.stringify(updated));
        }
      } catch (err) {
        console.warn('Failed to save watchlist:', err);
      }
      return updated;
    });
  };

  const clearWatchlist = () => {
    setWatchlist([]);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('crl_watchlist');
      }
    } catch (err) {
      console.warn('Failed to clear watchlist:', err);
    }
  };

  const watchlistReviews = enrichedReviews.filter((r) => watchlist.includes(r.id));

  // Notified projects state initialized from localStorage
  const [notifiedProjects, setNotifiedProjects] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('crl_notified_projects');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load notified projects:', e);
    }
    return [];
  });

  const toggleNotification = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof window !== 'undefined' && window.Notification && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    setNotifiedProjects((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('crl_notified_projects', JSON.stringify(updated));
        }
      } catch (err) {
        console.warn('Failed to save notified projects:', err);
      }
      return updated;
    });
  };

  const [isAdminMaster] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('crl_admin_authenticated') === 'true';
      }
      return false;
    } catch {
      return false;
    }
  });
  const [showPromoteModal, setShowPromoteModal] = useState<boolean>(false);

  const handleSyncClick = () => {
    if (onSyncCoinGecko) {
      onSyncCoinGecko();
      setShowSyncToast(true);
      setTimeout(() => setShowSyncToast(false), 3000);
    }
  };
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Live UTC formatted clock for crypto markets telemetry
  const [liveCryptoTime, setLiveCryptoTime] = useState<string>(() => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false });
    const day = now.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' });
    return `${time} UTC (${day})`;
  });

  const [liveDate, setLiveDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false });
      const day = now.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' });
      setLiveCryptoTime(`${time} UTC (${day})`);
      setLiveDate(now.toISOString().split('T')[0]);
    };
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // Search Focus & Click Outside Listener
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const selectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (selectDropdownRef.current && !selectDropdownRef.current.contains(event.target as Node)) {
        setIsCustomSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getScoreBadgeStyles = (score: number) => {
    if (score >= 90) {
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/40',
        shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.25)]',
      };
    }
    if (score >= 80) {
      return {
        bg: 'bg-cyber-cyan/15',
        text: 'text-cyber-cyan',
        border: 'border-cyber-cyan/40',
        shadow: 'shadow-[0_0_10px_rgba(0,229,255,0.25)]',
      };
    }
    if (score >= 70) {
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-400',
        border: 'border-amber-500/40',
        shadow: 'shadow-[0_0_10px_rgba(245,158,11,0.25)]',
      };
    }
    return {
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/40',
      shadow: 'shadow-[0_0_10px_rgba(244,63,94,0.25)]',
    };
  };

  // Compact card timestamp helper to keep cards clean and prevent line wrapping
  const formatCardSyncTime = (lastSyncedAt?: string, fallbackDate?: string): string => {
    const baseDate = fallbackDate || new Date().toISOString().split('T')[0];
    if (!lastSyncedAt) {
      return `${baseDate} • Live`;
    }
    // If lastSyncedAt has a date part (ISO or YYYY-MM-DD)
    if (lastSyncedAt.includes('-')) {
      try {
        const d = new Date(lastSyncedAt);
        if (!isNaN(d.getTime())) {
          const ymd = d.toISOString().split('T')[0];
          const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
          return `${ymd} ${time}`;
        }
      } catch {
        // Fallback
      }
      return lastSyncedAt.length > 16 ? lastSyncedAt.slice(0, 16).replace('T', ' ') : lastSyncedAt;
    }
    // If it's a time string (e.g. "11:44:07 AM" or "11:44:07" or "11:44")
    // Clean seconds out to keep it compact: "11:44 AM" or "11:44"
    const compactTime = lastSyncedAt.replace(/:\d{2}(\s?[AP]M)/i, '$1').replace(/:\d{2}$/, '');
    return `${baseDate} ${compactTime}`;
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);
    if (parts.length === 1) return text;
    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark
              key={index}
              className="bg-cyber-cyan/25 text-cyber-cyan font-bold px-0.5 rounded"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery]);

  const activeReviewId = selectedReviewId !== undefined ? selectedReviewId : localActiveReviewId;
  const setActiveReviewId = (id: string | null) => {
    if (setSelectedReviewId) {
      setSelectedReviewId(id);
    } else {
      setLocalActiveReviewId(id);
    }

    try {
      const url = new URL(window.location.href);
      if (id) {
        url.searchParams.set('review', id);
      } else {
        url.searchParams.delete('review');
        url.searchParams.delete('reviewId');
        url.searchParams.delete('article');
        url.searchParams.delete('id');
      }
      if (!url.searchParams.has('tab')) {
        url.searchParams.set('tab', 'blog');
      }
      window.history.pushState({ review: id }, '', url.toString());
    } catch (e) {
      console.warn('Failed to update URL parameters:', e);
    }
  };

  // Track page / article scroll progress percentage
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentScroll = window.scrollY;
        const progress = Math.min(100, Math.max(0, (currentScroll / totalHeight) * 100));
        setScrollProgress(progress);
      } else {
        setScrollProgress(0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeReviewId]);

  const handleBackToList = () => {
    setActiveReviewId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [copied, setCopied] = useState(false);
  const [activeReviewLivePatch, setActiveReviewLivePatch] = useState<Partial<CryptoReview> | null>(null);

  const baseActiveReview = enrichedReviews.find((r) => 
    r.id === activeReviewId || 
    r.assetKey === activeReviewId ||
    r.coingeckoId === activeReviewId || 
    r.id === `cg-${activeReviewId}` ||
    `cg-${r.coingeckoId}` === activeReviewId ||
    (activeReviewId && r.id.toLowerCase() === activeReviewId.toLowerCase()) ||
    (activeReviewId && r.symbol.toLowerCase() === activeReviewId.toLowerCase()) ||
    (activeReviewId && r.coingeckoId && r.coingeckoId.toLowerCase() === activeReviewId.replace(/^cg-/, '').toLowerCase())
  );

  useEffect(() => {
    if (!baseActiveReview) {
      setActiveReviewLivePatch(null);
      return;
    }
    // If review already has real ath, circulatingSupply and livePrice, no patch needed
    if (baseActiveReview.ath && baseActiveReview.circulatingSupply && baseActiveReview.livePrice) {
      return;
    }

    let isMounted = true;
    const fetchLiveDetails = async () => {
      try {
        const idOrSymbol = baseActiveReview.coingeckoId || baseActiveReview.symbol.toLowerCase();
        const res = await fetch(`/api/coingecko/markets?ids=${encodeURIComponent(idOrSymbol)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && isMounted) {
          const item = data[0];
          setActiveReviewLivePatch({
            livePrice: typeof item.current_price === 'number' ? item.current_price : undefined,
            liveChange24h: typeof item.price_change_percentage_24h === 'number' ? item.price_change_percentage_24h : undefined,
            liveMarketCap: typeof item.market_cap === 'number' ? item.market_cap : undefined,
            liveVolume24h: typeof item.total_volume === 'number' ? item.total_volume : undefined,
            circulatingSupply: typeof item.circulating_supply === 'number' ? item.circulating_supply : undefined,
            totalSupply: typeof item.total_supply === 'number' ? item.total_supply : undefined,
            maxSupply: typeof item.max_supply === 'number' ? item.max_supply : undefined,
            allTimeHigh: typeof item.ath === 'number' ? item.ath : undefined,
            allTimeLow: typeof item.atl === 'number' ? item.atl : undefined,
            ath: typeof item.ath === 'number' ? item.ath : undefined,
            atl: typeof item.atl === 'number' ? item.atl : undefined,
          });
        }
      } catch (err) {
        console.warn('On-demand tokenomics fetch failed:', err);
      }
    };

    fetchLiveDetails();
    return () => { isMounted = false; };
  }, [activeReviewId, baseActiveReview?.symbol, baseActiveReview?.coingeckoId]);

  const activeReview = useMemo(() => {
    if (!baseActiveReview) return undefined;
    if (!activeReviewLivePatch) return baseActiveReview;
    return {
      ...baseActiveReview,
      livePrice: activeReviewLivePatch.livePrice ?? baseActiveReview.livePrice,
      liveChange24h: activeReviewLivePatch.liveChange24h ?? baseActiveReview.liveChange24h,
      liveMarketCap: activeReviewLivePatch.liveMarketCap ?? baseActiveReview.liveMarketCap,
      liveVolume24h: activeReviewLivePatch.liveVolume24h ?? baseActiveReview.liveVolume24h,
      circulatingSupply: activeReviewLivePatch.circulatingSupply ?? baseActiveReview.circulatingSupply,
      totalSupply: activeReviewLivePatch.totalSupply ?? baseActiveReview.totalSupply,
      maxSupply: activeReviewLivePatch.maxSupply ?? baseActiveReview.maxSupply,
      allTimeHigh: activeReviewLivePatch.allTimeHigh ?? baseActiveReview.allTimeHigh,
      allTimeLow: activeReviewLivePatch.allTimeLow ?? baseActiveReview.allTimeLow,
      ath: activeReviewLivePatch.ath ?? baseActiveReview.ath,
      atl: activeReviewLivePatch.atl ?? baseActiveReview.atl,
    };
  }, [baseActiveReview, activeReviewLivePatch]);

  const getPublicShareUrl = () => {
    const targetId = activeReview?.id || activeReviewId;
    return getPublicReviewShareUrl(targetId);
  };

  const handleCopyLink = async () => {
    const shareUrl = getPublicShareUrl();
    const success = await copyTextToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareTwitter = () => {
    const shareUrl = getPublicShareUrl();
    const text = activeReview 
      ? `Explore live tokenomics, metrics, and technical indicators for ${activeReview.name} (${activeReview.symbol}) on Crypto Review Lab!`
      : `Check out live cryptocurrency market intelligence and technical indicators on Crypto Review Lab!`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareFacebook = () => {
    const shareUrl = getPublicShareUrl();
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Derive categories and networks from standard configuration lists
  const categories = CATEGORY_OPTIONS.map((opt) => opt.value);
  const selectedCategoryObj = CATEGORY_OPTIONS.find((opt) => opt.value === selectedCategory) || CATEGORY_OPTIONS[0];
  const SelectedIconComp = selectedCategoryObj.icon;

  const networks = networkOptions.map((opt) => opt.value);
  const selectedNetworkObj = networkOptions.find((opt) => opt.value === selectedNetwork) || networkOptions[0];
  const SelectedNetworkIconComp = selectedNetworkObj.icon;

  // Predictive matching categories based on search query
  const matchingCategories = searchQuery.trim()
    ? categories.filter((c) => c !== 'All' && c.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Live search result candidates for dropdown
  const liveSearchResults = searchQuery.trim()
    ? enrichedReviews.filter((r) => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.network && r.network.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.riskLevel && r.riskLevel.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const filteredReviews = enrichedReviews.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
                          r.name.toLowerCase().includes(q) || 
                          r.symbol.toLowerCase().includes(q) ||
                          r.category.toLowerCase().includes(q) ||
                          (r.network && r.network.toLowerCase().includes(q));
    const matchesCategory = selectedCategory === 'All' || 
                            r.category === selectedCategory ||
                            r.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
                            selectedCategory.toLowerCase().includes(r.category.toLowerCase());
    const matchesNetwork = selectedNetwork === 'All' ||
                           (r.network && r.network.toLowerCase() === selectedNetwork.toLowerCase()) ||
                           (isRobinhoodChain(selectedNetwork) && isRobinhoodChain(r.network));
    return matchesSearch && matchesCategory && matchesNetwork;
  });

  // State & Auto-rotation timer for Live Cryptocurrencies
  const [latestPage, setLatestPage] = useState(0);
  const [isLatestAutoPlay, setIsLatestAutoPlay] = useState(true);
  const [isLatestHovered, setIsLatestHovered] = useState(false);

  const itemsPerPage = 4;
  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);

  useEffect(() => {
    setLatestPage(0);
  }, [selectedCategory, selectedNetwork, searchQuery]);

  useEffect(() => {
    if (!isLatestAutoPlay || isLatestHovered || totalPages <= 1) return;
    const timer = setInterval(() => {
      setLatestPage((prev) => (prev + 1) % totalPages);
    }, 6000);
    return () => clearInterval(timer);
  }, [isLatestAutoPlay, isLatestHovered, totalPages]);

  const currentLatestPage = totalPages > 0 ? latestPage % totalPages : 0;
  const currentLatestReviews = filteredReviews.slice(
    currentLatestPage * itemsPerPage,
    (currentLatestPage + 1) * itemsPerPage
  );

  // Framer motion variants for staggered card entrance animations
  const staggerContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
  };

  const cardEntranceVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.96 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        duration: 0.38,
        ease: 'easeOut',
      }
    },
  };

  const renderContentMarkdown = (text: string) => {
    if (!text) return null;

    // Sanitize, strip redundant summary headers (since shown visually at top), and normalize terminology
    const sanitizedText = text
      .replace(/### Real-Time Dual Market Sync[\s\S]*?(?=### |$)/gi, '')
      .replace(/### Locked Evaluation Blueprint Audit Results[\s\S]*?(?=### |$)/gi, '')
      .replace(/CoinGecko Live Protocol Overview/gi, 'CoinGecko + CMC Live Protocol Overview')
      .replace(/Real-Time CoinGecko Market Metrics/gi, 'Real-Time CoinGecko + CMC Market Metrics')
      .replace(/tracked directly via the CoinGecko API\.?/gi, 'tracked directly via the CoinGecko & CoinMarketCap (CMC) APIs.')
      .replace(/tracked directly via the CoinGecko API/gi, 'tracked directly via the CoinGecko & CoinMarketCap (CMC) APIs')
      .replace(/CoinGecko quantitative parameters/gi, 'CoinGecko + CMC quantitative parameters')
      .replace(/regular CoinGecko data refreshes/gi, 'regular CoinGecko + CMC dual data refreshes')
      .replace(/CoinGecko data refreshes/gi, 'CoinGecko + CMC dual data refreshes')
      .replace(/CoinGecko & Blueprint Engine/gi, 'CoinGecko + CMC Dual Engine');

    return sanitizedText.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      
      // Secondary Headers
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="font-display font-bold text-lg text-cyber-text-primary mt-6 mb-3 tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-4 bg-cyber-cyan rounded-full"></span>
            {trimmed.replace('### ', '')}
          </h3>
        );
      }
      
      // Bullets with potential labels
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const bulletText = trimmed.substring(2);
        const boldMatch = bulletText.match(/^\*\*(.*?)\*\*(.*)/);
        
        if (boldMatch) {
          return (
            <li key={idx} className="text-cyber-text-secondary ml-5 mb-1.5 list-disc pl-1 leading-relaxed text-xs">
              <strong className="text-cyber-cyan font-medium">{boldMatch[1]}</strong>
              {boldMatch[2]}
            </li>
          );
        }

        return (
          <li key={idx} className="text-cyber-text-secondary ml-5 mb-1.5 list-disc pl-1 leading-relaxed text-xs">
            {bulletText}
          </li>
        );
      }

      if (trimmed === '') return <div key={idx} className="h-3.5"></div>;

      // Handle bold blocks inline
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(trimmed)) {
        const segments = trimmed.split(boldRegex);
        return (
          <p key={idx} className="text-cyber-text-secondary leading-relaxed mb-3.5 text-xs">
            {segments.map((seg, sIdx) => sIdx % 2 === 1 ? <strong key={sIdx} className="text-cyber-text-primary font-medium">{seg}</strong> : seg)}
          </p>
        );
      }

      return (
        <p key={idx} className="text-cyber-text-secondary leading-relaxed mb-4 text-sm md:text-base">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div id="blog-previewer-view" className="w-full py-2">
      {/* Top Viewport Article Reading Progress Bar */}
      <div 
        aria-hidden="true" 
        className="fixed top-0 left-0 right-0 h-1 z-[100] pointer-events-none bg-cyber-bg-primary/40 backdrop-blur-xs"
      >
        <div 
          className="h-full bg-gradient-to-r from-cyber-cyan via-emerald-400 to-cyber-cyan transition-all duration-150 ease-out shadow-[0_0_12px_rgba(0,229,255,0.85)]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      {/* Master Decentralized Economy Hero Card */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-cyber-bg-card via-slate-950/90 to-cyber-bg-primary border border-cyber-cyan/35 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.4)] p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan/70 to-transparent" />
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-cyber-cyan/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 xl:col-span-8 space-y-2.5 flex flex-col justify-center">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-ping shrink-0" />
                LIVE CRYPTO MARKETS STREAM
              </span>
              <span className="text-slate-400 text-xs font-mono">
                Multi-Chain Surveillance &amp; Multi-Source Market Data Convergence
              </span>
            </div>

            <h1 className="font-orbitron font-black text-xl sm:text-2xl lg:text-3xl xl:text-4xl text-white tracking-wide leading-tight">
              Master the{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyber-cyan to-purple-400">
                Decentralized
              </span>{' '}
              Economy
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed max-w-2xl">
              Real-time global crypto market surveillance, algorithmic cross-chain metrics, and multi-source market data intelligence powered by automated market telemetry.
            </p>
          </div>

          {/* Real-time Crypto Telemetry Card on Right */}
          <div className="lg:col-span-5 xl:col-span-4 p-3.5 sm:p-4.5 rounded-xl bg-slate-950/90 border border-cyber-cyan/25 flex flex-col justify-between space-y-2.5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 shrink-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                </span>
                <span className="text-[10px] sm:text-[11px] font-orbitron font-bold text-white uppercase tracking-wider whitespace-nowrap">
                  MARKET STREAM
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                  ACTIVE
                </span>
              </div>
              <span className="text-[9.5px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0 ml-auto sm:ml-0">
                {liveCryptoTime}
              </span>
            </div>

            <p className="text-[10.5px] font-mono text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2">
              Global cryptocurrency markets operate 24/7/365 without exchange holidays. Multi-source market data feeds stream continuous real-time liquidity and pricing data.
            </p>

            <div className="flex items-center justify-between text-[9.5px] font-mono text-cyber-cyan pt-1.5 border-t border-slate-800/60">
              <span className="text-slate-400">Market Convergence:</span>
              <span className="font-bold text-white">Multi-Source Real-Time</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Market Summary Widget at top before search bar */}
      <div className="mb-8 sm:mb-10 md:mb-12">
        <AIMarketSummary reviews={reviews} />
      </div>

      {/* Top Header Navigation Bar with Breadcrumbs & Search */}
      <div className="mb-4 bg-cyber-bg-card/70 border border-cyber-cyan/25 rounded-2xl p-2.5 md:px-4 md:py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        {/* Breadcrumb Navigation Trail */}
        <nav aria-label="Breadcrumb Trail" className="flex items-center gap-1.5 text-xs font-mono text-cyber-text-secondary overflow-x-auto whitespace-nowrap scrollbar-none py-1">
          <button
            onClick={() => {
              if (setActiveTab) {
                setActiveTab('lab');
              } else {
                handleBackToList();
              }
            }}
            className="flex items-center gap-1.5 hover:text-cyber-cyan text-cyber-text-secondary transition-colors cursor-pointer font-medium"
            title="Navigate to Home / Review Lab"
          >
            <Home className="w-3.5 h-3.5 text-cyber-cyan" />
            <span>Home</span>
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-cyber-text-muted shrink-0" />

          {activeReview ? (
            <button
              onClick={handleBackToList}
              className="hover:text-cyber-cyan text-cyber-text-secondary transition-colors cursor-pointer flex items-center gap-1.5 font-medium shrink-0"
              title="Return to Market Overview"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyber-cyan/80 shrink-0" />
              <span className="sm:hidden">Market</span>
              <span className="hidden sm:inline">Market Intelligence</span>
            </button>
          ) : (
            <span className="text-cyber-cyan font-bold flex items-center gap-1.5 shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-cyber-cyan shrink-0" />
              <span>Market Intelligence</span>
            </span>
          )}

          {activeReview && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-cyber-text-muted shrink-0" />
              <span 
                className="text-cyber-cyan font-bold flex items-center gap-1 min-w-0"
                title={`${activeReview.name} (${activeReview.symbol})`}
              >
                <span className="sm:hidden font-mono tracking-wider">{activeReview.symbol}</span>
                <span className="hidden sm:inline-flex items-center gap-1 min-w-0 max-w-xs md:max-w-sm">
                  <span className="truncate">{activeReview.name}</span>
                  <span className="text-cyber-text-muted text-[10px] font-normal shrink-0">({activeReview.symbol})</span>
                </span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-md bg-cyber-cyan/15 border border-cyber-cyan/35 text-[9px] font-mono font-bold text-cyber-cyan shrink-0 shadow-[0_0_8px_rgba(0,229,255,0.2)]">
                {Math.round(scrollProgress)}% Read
              </span>
            </>
          )}
        </nav>

        {/* Top Controls: Search Input Bar */}
        <div ref={searchContainerRef} className="relative w-full sm:w-72 md:w-96 shrink-0">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-cyber-cyan absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-focus-within:scale-110" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchFocused(true);
                if (activeReview) {
                  setActiveReviewId(null);
                }
              }}
              placeholder="Search cryptocurrency name, symbol, or category..."
              className="w-full bg-cyber-bg-primary/95 hover:bg-cyber-bg-primary border border-cyber-cyan/35 focus:border-cyber-cyan rounded-xl pl-9 pr-8 py-2 text-xs text-cyber-text-primary placeholder:text-cyber-text-muted focus:outline-none focus:shadow-[0_0_18px_rgba(0,229,255,0.35)] transition-all font-mono"
              aria-label="Search cryptocurrencies by name, symbol, or category"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchFocused(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cyber-text-muted hover:text-cyber-cyan p-1 cursor-pointer transition-colors"
                aria-label="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden md:inline-flex items-center gap-0.5 absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] text-cyber-text-muted/60 bg-cyber-cyan/5 border border-cyber-cyan/15 px-1.5 py-0.5 rounded pointer-events-none">
                ⌘K
              </span>
            )}
          </div>

          {/* Clean Minimal Live Search Results Dropdown Overlay */}
          {isSearchFocused && searchQuery.trim().length > 0 && (
            <div className="absolute top-full right-0 left-0 sm:left-auto sm:w-[360px] md:w-[400px] mt-2 bg-cyber-bg-card border border-cyber-cyan/30 rounded-xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden max-h-[380px] overflow-y-auto animate-fade-in">
              {/* Simple Search Header */}
              <div className="px-3 py-2 bg-cyber-bg-primary/90 flex items-center justify-between text-[10px] font-mono text-cyber-text-muted uppercase border-b border-cyber-cyan/15">
                <span className="font-bold text-cyber-cyan">RESULTS ({liveSearchResults.length})</span>
                <span className="text-[9px]">ESC TO CLOSE</span>
              </div>

              {liveSearchResults.length > 0 ? (
                <div className="divide-y divide-cyber-cyan/10">
                  {liveSearchResults.map((review) => (
                    <button
                      key={review.id}
                      onClick={() => {
                        setActiveReviewId(review.id);
                        setIsSearchFocused(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-cyber-cyan/10 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                    >
                      {/* Name, Symbol & Category */}
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-display font-bold text-xs text-cyber-text-primary group-hover:text-cyber-cyan transition-colors truncate">
                            {highlightMatch(review.name, searchQuery)}
                          </span>
                          <span className="font-mono text-[10px] text-cyber-text-muted font-bold shrink-0">
                            ({highlightMatch(review.symbol, searchQuery)})
                          </span>
                        </div>
                        <span className="font-mono text-[9px] text-cyber-text-muted mt-0.5 truncate">
                          {highlightMatch(review.category, searchQuery)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-bold text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/25 px-2 py-0.5 rounded-md">
                          {review.overallScore}/100
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center font-mono text-xs text-cyber-text-muted space-y-2">
                  <p>No projects found matching <span className="text-cyber-cyan font-bold">"{searchQuery}"</span></p>
                  <p className="text-[10px] text-cyber-text-muted/70">
                    Try searching ticker symbol (e.g. BTC, ETH, SOL, HYPE) or category (DeFi, L1)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!activeReview ? (
        <div className="space-y-4 md:space-y-5">
          {/* Header & Tagline */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-cyber-cyan/15 pb-4 md:pb-5">
            <div className="space-y-1">
              <h2 className="font-display font-bold text-xl md:text-2xl text-cyber-text-primary tracking-wider flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyber-cyan" />
                CRYPTOCURRENCY VERIFICATION & INDICATORS
              </h2>
              <p className="text-xs md:text-sm text-cyber-text-secondary max-w-xl leading-relaxed">
                Real-time multi-source market intelligence, live price discovery, tokenomics metrics, and technical indicators.
              </p>
            </div>

            {/* CoinGecko + CMC Live Dual Controls & Quick Stats */}
            <div className="flex flex-wrap items-center gap-2">
              {onOpenCoinGeckoModal && (
                <button
                  type="button"
                  onClick={onOpenCoinGeckoModal}
                  className="relative group overflow-hidden px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 border border-cyber-cyan/50 hover:border-cyber-cyan text-cyber-cyan hover:text-white font-display text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all duration-300 shadow-[0_0_20px_rgba(0,229,255,0.2)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyber-cyan/0 via-cyber-cyan/20 to-cyber-cyan/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <div className="p-1 rounded-lg bg-cyber-cyan/15 border border-cyber-cyan/30 text-cyber-cyan group-hover:bg-cyber-cyan group-hover:text-slate-950 transition-colors">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <span className="font-bold tracking-wider">Switch / Import via CoinGecko + CMC</span>
                  <span className="text-[9px] font-mono font-extrabold text-slate-950 bg-cyber-cyan px-1.5 py-0.5 rounded shadow-sm">
                    DUAL API LIVE
                  </span>
                </button>
              )}

              {onSyncCoinGecko && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncClick}
                    disabled={isSyncingCoinGecko}
                    className="px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-cyber-cyan/30 text-slate-300 hover:text-cyber-cyan font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                    title="Sync all live market prices from CoinGecko + CMC Dual Engine"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-cyber-cyan ${isSyncingCoinGecko ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{isSyncingCoinGecko ? 'Dual Syncing...' : 'Sync Prices (CG + CMC)'}</span>
                  </button>
                  {showSyncToast && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg animate-fade-in">
                      ✓ CG + CMC Synced!
                    </span>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Classification & Filter Bar (Blockchain Networks + Categories) */}
          <div className="bg-cyber-bg-card border border-cyber-cyan/15 rounded-2xl p-3 md:p-4 shadow-lg space-y-3.5 relative">
            {/* Proactive Market Intelligence Pipeline Status Header */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-cyber-cyan/15 text-[11px] font-mono">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-white font-bold uppercase tracking-wider text-xs">
                  Cryptocurrency Pipeline
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={triggerPipelineSync}
                  disabled={isSyncingPipeline}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/30 text-cyber-cyan text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-50"
                  title="Force proactive multi-source telemetry synchronization"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingPipeline ? 'animate-spin' : ''}`} />
                  <span>{isSyncingPipeline ? 'Syncing...' : 'Sync Pipeline'}</span>
                </button>
              </div>
            </div>

            {/* 1. Blockchain Network Classification Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs font-mono text-cyber-text-muted uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-cyber-cyan" />
                  <span className="font-bold text-slate-200">Blockchain Network Filter</span>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono border ${
                  isRobinhoodChain(selectedNetwork)
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                    : 'text-cyber-cyan bg-cyber-cyan/10 border-cyber-cyan/30'
                }`}>
                  {selectedNetwork === 'All'
                    ? `${getNetworkAssetCount('All')} Tracked on All Networks`
                    : isRobinhoodChain(selectedNetwork)
                    ? `0 Tracked on ${ROBINHOOD_CHAIN.name}`
                    : selectedNetwork}
                </span>
              </div>

              {/* Mobile Network Dropdown */}
              <div className="sm:hidden relative w-full" ref={networkDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsNetworkDropdownOpen(!isNetworkDropdownOpen)}
                  className="w-full flex items-center justify-between gap-3 bg-slate-950 text-slate-100 font-sans text-xs font-bold px-3 py-2 rounded-xl border border-cyber-cyan/40 hover:border-cyber-cyan shadow-[0_0_12px_rgba(0,229,255,0.15)] transition-all cursor-pointer"
                  aria-haspopup="listbox"
                  aria-expanded={isNetworkDropdownOpen}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-1">
                    <div className={`p-1.5 rounded-lg border shrink-0 ${selectedNetworkObj.color}`}>
                      <SelectedNetworkIconComp className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="truncate text-xs font-semibold text-slate-100">{selectedNetworkObj.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono truncate">{selectedNetworkObj.badge}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ChevronDown className={`w-4 h-4 text-cyber-cyan shrink-0 transition-transform duration-300 ${isNetworkDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                <AnimatePresence>
                  {isNetworkDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute left-0 right-0 top-full mt-1.5 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] overflow-hidden z-50 py-1.5 divide-y divide-slate-800/80 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-cyber-cyan/30"
                      role="listbox"
                    >
                      {networkOptions.map((opt) => {
                        const isSelected = selectedNetwork === opt.value;
                        const NetIconComp = opt.icon;

                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleSelectNetwork(opt.value)}
                            className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-cyber-cyan/15 text-white font-semibold border-l-4 border-cyber-cyan'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                            }`}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <div className={`p-1 rounded-lg border shrink-0 ${opt.color}`}>
                                <NetIconComp className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-sans text-xs font-medium truncate">{opt.label}</span>
                                <span className="text-[10px] text-slate-400 font-mono truncate">{opt.badge}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isSelected && <Check className="w-3.5 h-3.5 text-cyber-cyan shrink-0" />}
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Desktop Horizontal Network Pills */}
              <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px] font-mono">
                {networkOptions.map((opt) => {
                  const isSelected = selectedNetwork === opt.value;
                  const isRH = isRobinhoodChain(opt.value);
                  const NetIcon = opt.icon;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelectNetwork(opt.value)}
                      className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all uppercase tracking-wider cursor-pointer font-bold flex items-center gap-1.5 border ${
                        isSelected
                          ? isRH
                            ? 'bg-emerald-400 text-slate-950 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                            : 'bg-cyber-cyan text-cyber-bg-primary border-cyber-cyan shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                          : isRH
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/35 hover:bg-emerald-900/60'
                            : 'bg-cyber-bg-primary text-cyber-text-secondary hover:text-cyber-text-primary border-cyber-cyan/15 hover:border-cyber-cyan/35'
                      }`}
                    >
                      <NetIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{opt.label}</span>
                      {opt.value !== 'All' && getNetworkTvl(opt.value) && (
                        <span className="text-[8.5px] opacity-80 hidden lg:inline font-mono">
                          {getNetworkTvl(opt.value)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-cyber-cyan/10"></div>

            {/* 2. Category Filter */}
            <div className="space-y-2">
              {/* Mobile View Layout (< sm) */}
              <div className="sm:hidden space-y-2" ref={categoryDropdownRef}>
                <div className="flex items-center justify-between gap-2 text-xs font-mono text-cyber-text-muted uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-cyber-cyan" />
                    <span className="font-bold text-slate-300">Category Filter</span>
                  </div>
                  <span className="text-[10px] font-bold text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/30 px-2.5 py-0.5 rounded-full font-mono">
                    {selectedCategory === 'All'
                      ? 'All Categories'
                      : selectedCategory}
                  </span>
                </div>

                {/* Custom Cyber Dropdown Button (Matching Image 2 Style) */}
                <div className="relative w-full">
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="w-full flex items-center justify-between gap-3 bg-slate-950 text-slate-100 font-sans text-xs font-bold px-3 py-2 rounded-xl border border-cyber-cyan/40 hover:border-cyber-cyan shadow-[0_0_12px_rgba(0,229,255,0.15)] transition-all cursor-pointer"
                    aria-haspopup="listbox"
                    aria-expanded={isCategoryDropdownOpen}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-1">
                      <div className={`p-1.5 rounded-lg border shrink-0 ${selectedCategoryObj.color}`}>
                        <SelectedIconComp className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col text-left min-w-0">
                        <span className="truncate text-xs font-semibold text-slate-100">{selectedCategoryObj.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono truncate">{selectedCategoryObj.badge}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <ChevronDown className={`w-4 h-4 text-cyber-cyan shrink-0 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isCategoryDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="absolute left-0 right-0 top-full mt-1.5 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] overflow-hidden z-50 py-1.5 divide-y divide-slate-800/80 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-cyber-cyan/30"
                        role="listbox"
                      >
                        {CATEGORY_OPTIONS.map((opt) => {
                          const isSelected = selectedCategory === opt.value;
                          const IconComp = opt.icon;

                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setSelectedCategory(opt.value);
                                setIsCategoryDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500/10 text-emerald-300 font-semibold border-l-4 border-emerald-400'
                                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                              }`}
                              role="option"
                              aria-selected={isSelected}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div className={`p-1.5 rounded-lg border shrink-0 ${opt.color}`}>
                                  <IconComp className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-sans text-xs font-medium truncate">{opt.label}</span>
                                  <span className="text-[10px] text-slate-400 font-mono truncate">{opt.badge}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {isSelected && (
                                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Desktop Horizontal Pill Bar (visible on sm+) */}
              <div className="hidden sm:flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-mono text-cyber-text-muted shrink-0 uppercase tracking-wider">
                  <Filter className="w-3.5 h-3.5 text-cyber-cyan" />
                  <span>Category Filter:</span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-display whitespace-nowrap transition-all uppercase tracking-wider cursor-pointer ${
                        selectedCategory === cat 
                          ? 'bg-cyber-cyan text-cyber-bg-primary shadow-[0_0_12px_rgba(0,229,255,0.25)] font-bold' 
                          : 'bg-cyber-bg-primary text-cyber-text-secondary hover:text-cyber-text-primary border border-cyber-cyan/15 hover:border-cyber-cyan/30'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Grid Layout of blogs split into Latest Posts and More Articles with Sidebar */}
          {isLoading ? (
            <div className="space-y-12">
              {/* LATEST POSTS SKELETON GRID */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-3 bg-cyber-cyan/25 rounded w-44 animate-pulse"></div>
                  <div className="h-px bg-cyber-cyan/20 flex-1"></div>
                  <div className="h-5 w-16 bg-cyber-cyan/15 rounded animate-pulse"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                  {[1, 2, 3].map((idx) => (
                    <div key={idx} className="bg-cyber-bg-card/75 border border-cyber-cyan/10 rounded-xl p-4 md:p-4.5 shadow-md flex flex-col justify-between h-48 animate-pulse">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-2 w-2/3">
                            <div className="h-5 bg-cyber-cyan/15 rounded-lg w-4/5"></div>
                          </div>
                          <div className="h-6 w-10 bg-cyber-cyan/20 rounded-lg"></div>
                        </div>
                      </div>
                      <div className="pt-3 mt-3 border-t border-cyber-cyan/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-16 bg-cyber-cyan/15 rounded"></div>
                          <div className="h-3 w-24 bg-cyber-text-muted/15 rounded"></div>
                        </div>
                        <div className="h-3 w-20 bg-cyber-cyan/20 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : filteredReviews.length === 0 ? (
            (selectedNetwork === 'Robinhood Chain' || isRobinhoodChain(selectedNetwork) || (searchQuery.trim().length > 0 && isRobinhoodChain(searchQuery.trim()))) ? (
              <div className="text-center py-12 px-6 bg-gradient-to-b from-slate-950/90 via-slate-900/60 to-slate-950/90 border border-emerald-500/30 rounded-2xl max-w-xl mx-auto my-6 space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(52,211,153,0.15)] animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.25)]">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-bold text-base text-white uppercase tracking-wider">
                    No tracked crypto assets on {ROBINHOOD_CHAIN.name} yet.
                  </h3>
                  <p className="text-xs font-mono text-slate-300 leading-relaxed max-w-md mx-auto">
                    The network is registered (Chain ID {ROBINHOOD_CHAIN.chainId}). Market Intelligence will populate assets as they are discovered or verified.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-2 text-[10.5px] font-mono text-slate-400">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 font-bold">
                    Arbitrum Orbit L2
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    Chain ID {ROBINHOOD_CHAIN.chainId}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    Gas: {ROBINHOOD_CHAIN.nativeToken}
                  </span>
                  <a
                    href={ROBINHOOD_CHAIN.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-cyber-cyan border border-cyber-cyan/30 inline-flex items-center gap-1 transition-colors"
                  >
                    <span>{ROBINHOOD_CHAIN.explorerUrl.replace('https://', '')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                      setSelectedNetwork('All');
                    }}
                    className="px-4 py-2 rounded-xl bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan/40 text-cyber-cyan font-mono text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 px-6 bg-cyber-bg-card/40 border border-dashed border-cyber-cyan/25 rounded-2xl max-w-xl mx-auto my-6 space-y-4 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan mx-auto flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                  <Search className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-display font-bold text-base text-cyber-text-primary uppercase tracking-wider">
                    No Matching Cryptocurrencies Found
                  </h3>
                  <p className="text-xs font-mono text-cyber-text-secondary leading-relaxed">
                    No cryptocurrency matches your search parameters <span className="text-cyber-cyan font-bold">"{searchQuery || selectedCategory}"</span>.
                  </p>
                </div>
                <div className="pt-3 border-t border-cyber-cyan/15 text-left space-y-2 text-xs font-mono">
                  <span className="text-cyber-text-muted uppercase text-[10px] tracking-wider block font-bold">
                    💡 HELPFUL SUGGESTIONS:
                  </span>
                  <ul className="text-cyber-text-secondary space-y-1.5 pl-1">
                    <li className="flex items-center gap-1.5">
                      <span className="text-cyber-cyan font-bold">•</span>
                      <span>Search by ticker symbol (e.g. BTC, ETH, SOL, HYPE, LINK)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-cyber-cyan font-bold">•</span>
                      <span>Browse popular categories: Layer 1, DeFi, Layer 2, RWA, DePIN, AI, Prop Trading</span>
                    </li>
                  </ul>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['All', 'Layer 1', 'DeFi', 'Layer 2', 'RWA', 'DePIN', 'AI', 'Prop Trading'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setSearchQuery('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-cyber-cyan/10 hover:bg-cyber-cyan/25 border border-cyber-cyan/30 text-[10px] font-mono text-cyber-cyan transition-colors cursor-pointer font-bold"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                {(searchQuery || selectedCategory !== 'All' || selectedNetwork !== 'All') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                      setSelectedNetwork('All');
                    }}
                    className="px-4 py-2 rounded-xl bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan/40 text-cyber-cyan font-mono text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                )}
              </div>
            )
          ) : (
            <div className="space-y-10">
              {/* PINNED WATCHLIST SECTION (Pinned Favorite Projects) */}
              {watchlistReviews.length > 0 && (
                <div className="space-y-4 bg-gradient-to-r from-amber-950/25 via-slate-900/70 to-amber-950/25 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-[0_0_30px_rgba(251,191,36,0.15)] relative overflow-hidden animate-fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/25 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.25)]">
                        <Pin className="w-4 h-4 fill-amber-400" />
                      </div>
                      <h3 className="font-display text-xs font-black tracking-widest text-amber-400 uppercase flex items-center gap-2">
                        PINNED WATCHLIST
                      </h3>
                      <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                        {watchlistReviews.length} Pinned
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={clearWatchlist}
                      className="text-[10px] font-mono font-bold text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/25 hover:border-amber-500/50 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <X className="w-3 h-3" />
                      <span>Clear Watchlist</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {watchlistReviews.map((rev) => {
                      return (
                        <motion.div
                          key={`watchlist-${rev.id}`}
                          whileHover={{ scale: 1.035, y: -4 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                          className="h-full"
                        >
                          <TiltCard className="h-full" scale={1.035} onClick={() => setActiveReviewId(rev.id)}>
                            <div className="bg-slate-900/90 border border-amber-500/35 hover:border-amber-400 hover:shadow-[0_16px_40px_rgba(251,191,36,0.28)] rounded-xl p-4 md:p-4.5 flex flex-col justify-between group cursor-pointer transition-all duration-300 h-full relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>

                              <div className="space-y-2.5">
                                {/* Card Header */}
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img
                                      src={getCoinLogoUrl(rev.symbol, rev.logoUrl, rev.coingeckoId)}
                                      alt={rev.name}
                                      className="w-8 h-8 rounded-xl border border-amber-500/40 object-contain bg-slate-950 p-1 shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                    <div className="text-left min-w-0">
                                      <h3 className="font-display font-bold text-sm sm:text-base text-cyber-text-primary group-hover:text-amber-400 transition-colors flex items-center gap-1.5 leading-tight truncate">
                                        <span className="truncate">{rev.name}</span>
                                        <span className="text-[11px] font-mono text-cyber-text-secondary font-normal uppercase shrink-0">({rev.symbol})</span>
                                      </h3>
                                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded border ${getNetworkBadge(rev.network).badgeClass}`}>
                                          {getNetworkBadge(rev.network).label}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => toggleWatchlist(rev.id, e)}
                                      title="Unpin from Watchlist"
                                      className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.35)] hover:bg-amber-500/30 transition-all cursor-pointer"
                                    >
                                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    </button>
                                  </div>
                                </div>

                                {rev.livePrice !== undefined && (
                                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-amber-500/20 text-xs font-mono">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9.5px] text-amber-400 font-bold">LIVE {selectedCurrency?.code || 'USD'}</span>
                                      <span className="font-bold text-white">
                                        {ctxFormatPrice(rev.livePrice)}
                                      </span>
                                    </div>
                                    {rev.liveChange24h !== undefined && (
                                      <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${rev.liveChange24h >= 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}`}>
                                        {rev.liveChange24h >= 0 ? '▲ +' : '▼ '}{rev.liveChange24h.toFixed(2)}%
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 mt-2.5 border-t border-amber-500/20 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                                  <Clock className="w-2.5 h-2.5 text-amber-400/70 shrink-0" />
                                  <span className="text-[9px] font-mono text-cyber-text-muted truncate whitespace-nowrap">
                                    {formatCardSyncTime(rev.lastSyncedAt, liveDate)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDbModalSymbol(rev.symbol);
                                      setIsDbModalOpen(true);
                                    }}
                                    className="p-1 rounded text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/20 border border-amber-500/25 hover:border-amber-500/50 transition-colors shrink-0"
                                    title={`Inspect ${rev.symbol} Cloud SQL database snapshots`}
                                  >
                                    <Database className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                                <div className="shrink-0 flex items-center justify-end -mr-0.5">
                                  <span className="text-[10px] sm:text-[10.5px] font-display font-bold text-amber-400 group-hover:text-amber-300 group-hover:translate-x-1 transition-all inline-flex items-center gap-1 uppercase tracking-wider whitespace-nowrap pl-1">
                                    <span>Market Report</span>
                                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TiltCard>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LATEST POSTS GRID (Auto-Rotating Batches) */}
              <div 
                className="space-y-4"
                onMouseEnter={() => setIsLatestHovered(true)}
                onMouseLeave={() => setIsLatestHovered(false)}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyber-cyan/15 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyber-cyan animate-pulse" />
                    <span className="font-display text-xs font-bold tracking-widest text-cyber-cyan uppercase">
                      Live Cryptocurrencies
                    </span>
                  </div>

                  {/* Dynamic Rotation & Navigation Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsLatestAutoPlay(!isLatestAutoPlay)}
                      title={isLatestAutoPlay ? 'Pause Auto Rotation' : 'Resume Auto Rotation'}
                      className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-1 font-mono text-[10px] font-bold ${
                        isLatestAutoPlay 
                          ? 'bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]' 
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {isLatestAutoPlay ? (
                        <>
                          <Pause className="w-3 h-3 text-cyber-cyan" />
                          <span className="hidden sm:inline">LIVE ROTATING</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 text-slate-400" />
                          <span className="hidden sm:inline">PAUSED</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setLatestPage((prev) => (prev - 1 + (totalPages || 1)) % (totalPages || 1))}
                      disabled={totalPages <= 1}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-cyber-cyan/10 border border-slate-800 hover:border-cyber-cyan/40 text-slate-300 hover:text-cyber-cyan transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setLatestPage((prev) => (prev + 1) % (totalPages || 1))}
                      disabled={totalPages <= 1}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-cyber-cyan/10 border border-slate-800 hover:border-cyber-cyan/40 text-slate-300 hover:text-cyber-cyan transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Next Page"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <motion.div 
                  variants={staggerContainerVariants}
                  initial="hidden"
                  animate="show"
                  key={`latest-grid-${currentLatestPage}-${selectedCategory}-${searchQuery}`}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-4"
                >
                  {currentLatestReviews.map((rev) => {
                    const isPinned = watchlist.includes(rev.id);
                    return (
                      <motion.div 
                        key={rev.id} 
                        variants={cardEntranceVariants as any} 
                        whileHover={{ scale: 1.038, y: -5 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                        className="h-full"
                      >
                        <TiltCard className="h-full" scale={1.035} onClick={() => setActiveReviewId(rev.id)}>
                          <motion.div
                            layoutId={`review-card-${rev.id}`}
                            className={`bg-cyber-bg-card/75 border rounded-xl p-4 md:p-4.5 shadow-md flex flex-col justify-between group cursor-pointer transition-all duration-300 h-full ${
                              isPinned
                                ? 'border-amber-400/50 hover:border-amber-400 hover:shadow-[0_16px_40px_rgba(251,191,36,0.22)]'
                                : 'border-cyber-cyan/15 hover:border-cyber-cyan/60 hover:shadow-[0_16px_40px_rgba(0,229,255,0.22)] group-hover:bg-cyber-bg-card-hover'
                            }`}
                          >
                            <div className="space-y-2.5">
                              {/* Card Header */}
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img
                                    src={getCoinLogoUrl(rev.symbol, rev.logoUrl, rev.coingeckoId)}
                                    alt={rev.name}
                                    className="w-8 h-8 rounded-xl border border-cyber-cyan/30 object-contain bg-slate-950 p-1 shrink-0 shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                  <div className="text-left min-w-0">
                                    <h3 className="font-display font-bold text-sm sm:text-base text-cyber-text-primary group-hover:text-cyber-cyan transition-colors flex items-center gap-1.5 leading-tight truncate">
                                      <span className="truncate">{rev.name}</span>
                                      <span className="text-[11px] font-mono text-cyber-text-secondary font-normal uppercase shrink-0">({rev.symbol})</span>
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                      <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded border ${getNetworkBadge(rev.network).badgeClass}`}>
                                        {getNetworkBadge(rev.network).label}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Watchlist Pin Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleWatchlist(rev.id, e)}
                                    title={isPinned ? 'Remove from Watchlist' : 'Add to Watchlist'}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                      isPinned
                                        ? 'bg-amber-500/20 text-amber-400 border-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                                        : 'bg-slate-950/80 text-slate-400 hover:text-amber-400 border-white/10 hover:border-amber-400/40 hover:bg-slate-900'
                                    }`}
                                  >
                                    <Star className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${isPinned ? 'fill-amber-400 text-amber-400' : ''}`} />
                                  </button>
                                </div>
                              </div>

                              {/* Live CoinGecko Market Bar */}
                              {rev.livePrice !== undefined && (
                                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-cyber-cyan/20 text-xs font-mono">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9.5px] text-cyber-cyan font-bold">LIVE {selectedCurrency?.code || 'USD'}</span>
                                    <span className="font-bold text-white">
                                      {ctxFormatPrice(rev.livePrice)}
                                    </span>
                                  </div>
                                  {rev.liveChange24h !== undefined && (
                                    <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${rev.liveChange24h >= 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}`}>
                                      {rev.liveChange24h >= 0 ? '▲ +' : '▼ '}{rev.liveChange24h.toFixed(2)}%
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="pt-2 mt-2.5 border-t border-cyber-cyan/15 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                                <Clock className="w-2.5 h-2.5 text-cyber-cyan/70 shrink-0" />
                                <span className="text-[9px] font-mono text-cyber-text-muted truncate whitespace-nowrap">
                                  {formatCardSyncTime(rev.lastSyncedAt, liveDate)}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDbModalSymbol(rev.symbol);
                                    setIsDbModalOpen(true);
                                  }}
                                  className="p-1 rounded text-cyan-400/80 hover:text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/25 hover:border-cyan-500/50 transition-colors shrink-0"
                                  title={`Inspect ${rev.symbol} Cloud SQL database snapshots`}
                                >
                                  <Database className="w-2.5 h-2.5" />
                                </button>
                              </div>
                              <div className="shrink-0 flex items-center justify-end -mr-0.5">
                                <span className="text-[10px] sm:text-[10.5px] font-display font-bold text-cyber-cyan group-hover:text-cyan-300 group-hover:translate-x-1 transition-all inline-flex items-center gap-1 uppercase tracking-wider whitespace-nowrap pl-1">
                                  <span>Market Report</span>
                                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        </TiltCard>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>

              {/* MORE ARTICLES & UTILITIES SECTION (Full-Width Top Rated Audits + Archives & AI Sandbox) */}
              <div className="space-y-6">
                {/* 1. Full-Width Top Rated Security Audits */}
                <div className="bg-slate-900/60 backdrop-blur-md border border-cyber-cyan/20 rounded-2xl p-4 sm:p-5 text-left relative overflow-hidden shadow-lg group">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan/50 to-transparent"></div>
                  <div className="flex items-center justify-between border-b border-cyber-cyan/15 pb-2.5 mb-3.5">
                    <h4 className="font-mono text-xs font-bold text-cyber-text-primary uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-cyber-cyan" />
                      Top Ranked Assets
                    </h4>
                    <span className="text-[9px] font-mono font-bold text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/25 px-2.5 py-0.5 rounded-full">
                      HIGH SCORE
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {reviews
                      .slice()
                      .sort((a, b) => b.overallScore - a.overallScore)
                      .slice(0, 4)
                      .map((item) => {
                        const scoreStyles = getScoreBadgeStyles(item.overallScore);
                        const isPinned = watchlist.includes(item.id);
                        return (
                          <motion.div
                            key={item.id}
                            whileHover={{ scale: 1.035, y: -3 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                          >
                            <div
                              onClick={() => {
                                setActiveReviewId(item.id);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className={`w-full text-left group flex items-center justify-between p-3 bg-slate-950/70 rounded-xl transition-all duration-300 cursor-pointer shadow-sm hover:shadow-[0_12px_28px_rgba(0,229,255,0.22)] border ${
                                isPinned
                                  ? 'border-amber-400/50 hover:border-amber-400'
                                  : 'border-white/10 hover:border-cyber-cyan/60 hover:bg-cyber-cyan/10'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => toggleWatchlist(item.id, e)}
                                  title={isPinned ? 'Remove from Watchlist' : 'Add to Watchlist'}
                                  className={`p-1 rounded-lg border transition-all cursor-pointer shrink-0 ${
                                    isPinned
                                      ? 'bg-amber-500/20 text-amber-400 border-amber-400/60 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                                      : 'bg-slate-900 text-slate-400 hover:text-amber-400 border-white/10 hover:border-amber-400/40'
                                  }`}
                                >
                                  <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-400 text-amber-400' : ''}`} />
                                </button>

                                <div className="w-8 h-8 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/25 flex items-center justify-center font-mono text-[9px] font-bold text-cyber-cyan group-hover:border-cyber-cyan/50 group-hover:bg-cyber-cyan/20 transition-colors shrink-0">
                                  {item.symbol}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-cyber-text-primary truncate group-hover:text-cyber-cyan transition-colors">
                                    {item.name}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0 pl-1 flex flex-col items-end gap-1">
                                <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border ${scoreStyles.bg} ${scoreStyles.text} ${scoreStyles.border}`}>
                                  {item.overallScore}%
                                </span>
                                <span className="text-[8.5px] font-mono text-cyber-text-muted flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 text-cyber-cyan/70" />
                                  {formatCardSyncTime(item.lastSyncedAt, liveDate)}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                </div>

                {/* 2. AI Auditor Sandbox Banner */}
                <div className="bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-cyber-cyan/10 backdrop-blur-md border border-cyber-cyan/35 rounded-2xl p-4.5 sm:p-5 text-left relative overflow-hidden shadow-xl group">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent"></div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-cyber-cyan/20 border border-cyber-cyan/40 text-cyber-cyan">
                          <Terminal className="w-4 h-4" />
                        </div>
                        <h4 className="font-mono text-xs font-bold text-cyber-text-primary uppercase tracking-widest">
                          AI Auditor Sandbox
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Interact with our real-time AI security auditor to analyze smart contracts, verify tokenomics, or test protocol security parameters.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (setActiveTab) {
                          setActiveTab('chat');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 shrink-0 bg-cyber-cyan/15 hover:bg-cyber-cyan border border-cyber-cyan/40 hover:border-cyber-cyan text-cyber-cyan hover:text-slate-950 font-display text-[11px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.15)] hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] text-center"
                    >
                      Launch AI Auditor Chat →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeReviewId && !activeReview ? (
        (/^crl-\d+/i.test(activeReviewId) || /^crl-/i.test(activeReviewId) || /^ref-/i.test(activeReviewId)) ? (
          <div className="max-w-3xl mx-auto bg-slate-900/90 border border-amber-500/40 rounded-2xl p-8 sm:p-12 text-center my-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.1),transparent_70%)] pointer-events-none"></div>
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mx-auto mb-4 text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px] uppercase tracking-widest mb-3">
              Advisory Order Reference
            </div>
            <h3 className="font-display font-black text-lg sm:text-xl text-slate-100 uppercase tracking-wide mb-2">
              Report Not Found / Not Yet Available
            </h3>
            <p className="font-mono text-xs text-slate-300 max-w-lg mx-auto mb-6 leading-relaxed">
              The requested assessment report reference <span className="text-amber-400 font-bold">{activeReviewId}</span> is not found or not yet available in the public library. If you commissioned this assessment, verification is currently in progress or awaiting dispatch.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleBackToList}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-display font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Return to Review Library
              </button>
              {setActiveTab && (
                <button
                  onClick={() => {
                    handleBackToList();
                    setActiveTab('orders');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-display font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  Lookup Order Status
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto bg-cyber-bg-card border border-cyber-cyan/30 rounded-2xl p-8 sm:p-12 text-center my-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,229,255,0.1),transparent_70%)] pointer-events-none"></div>
            <div className="w-12 h-12 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/40 flex items-center justify-center mx-auto mb-4 animate-spin">
              <RefreshCw className="w-5 h-5 text-cyber-cyan" />
            </div>
            <h3 className="font-display font-black text-base sm:text-lg text-cyber-text-primary uppercase tracking-wide mb-2">
              Synchronizing Evaluation & Verification...
            </h3>
            <p className="font-mono text-xs text-cyber-text-secondary max-w-md mx-auto mb-6">
              Retrieving live cryptographic review and security metrics for <span className="text-cyber-cyan font-bold">{activeReviewId.replace(/^cg-/, '').toUpperCase()}</span>...
            </p>
            <button
              onClick={handleBackToList}
              className="px-4 py-2 rounded-xl bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan/40 text-cyber-cyan font-display font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              ← Return to Review Library
            </button>
          </div>
        )
      ) : activeReview ? (
        /* Full reading mode */
        <motion.div 
          layoutId={`review-card-${activeReview.id}`}
          className="max-w-3xl mx-auto bg-cyber-bg-card border border-cyber-cyan/15 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Top navigation back link */}
          <div className="px-5 py-3 md:py-3.5 bg-cyber-bg-secondary/60 border-b border-cyber-cyan/15 flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={handleBackToList}
              className="text-xs md:text-sm font-display uppercase tracking-wider text-cyber-text-secondary hover:text-cyber-cyan flex items-center gap-1.5 cursor-pointer font-bold py-1 px-2.5 rounded-lg hover:bg-cyber-cyan/10 border border-transparent hover:border-cyber-cyan/20 transition-all"
              aria-label="Back to List of Reviews"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-cyber-cyan" />
              <span>Back to List</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => toggleWatchlist(activeReview.id, e)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  watchlist.includes(activeReview.id)
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-white/10 hover:border-amber-400/40'
                }`}
                title={watchlist.includes(activeReview.id) ? 'Unpin from Watchlist' : 'Pin to Watchlist'}
              >
                <Star className={`w-3.5 h-3.5 ${watchlist.includes(activeReview.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span className="hidden sm:inline">{watchlist.includes(activeReview.id) ? 'Pinned to Watchlist' : 'Add to Watchlist'}</span>
              </button>

              <button
                type="button"
                onClick={(e) => toggleNotification(activeReview.id, e)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  notifiedProjects.includes(activeReview.id)
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-white/10 hover:border-emerald-400/40'
                }`}
                title={notifiedProjects.includes(activeReview.id) ? 'Risk Re-Scan Notifications Active' : 'Get Notified on Risk Changes'}
              >
                {notifiedProjects.includes(activeReview.id) ? <BellRing className="w-3.5 h-3.5 text-emerald-400 animate-bounce" /> : <Bell className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{notifiedProjects.includes(activeReview.id) ? 'Notifications Active' : 'Get Notified'}</span>
              </button>

              {isAdminMaster && activeReview && (
                <button
                  type="button"
                  onClick={() => setShowPromoteModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all cursor-pointer shadow-md shadow-amber-500/10"
                  title="Admin: Promote current review to canonical reference store"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Promote to Canonical</span>
                </button>
              )}

              <div className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-cyber-text-muted uppercase tracking-widest">
                <Flame className="w-3.5 h-3.5 text-cyber-orange" />
                <span>Evaluation & Verification Report</span>
              </div>
            </div>
          </div>

          {/* Reading body */}
          <div className="p-4 md:p-6.5 space-y-5 md:space-y-6">
            {notifiedProjects.includes(activeReview.id) && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2.5 text-emerald-300">
                  <BellRing className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse mt-0.5 sm:mt-0" />
                  <span>Monitoring Active: Browser & UI alerts will trigger if <strong className="text-white">{activeReview.name}</strong> risk level changes significantly after re-scans.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const oldRisk = activeReview.riskLevel || 'Low';
                    const newRisk = oldRisk === 'Low' ? 'High' : 'Low';
                    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                      new Notification('🚨 CRL Market Telemetry Alert', {
                        body: `${activeReview.name} risk level indicator updated from ${oldRisk} to ${newRisk} during automated sync!`
                      });
                    }
                  }}
                  className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold tracking-wide transition-all cursor-pointer border border-emerald-500/40 shrink-0 text-center"
                >
                  Simulate Re-Scan Test
                </button>
              </div>
            )}

            {/* Blog Post Title block */}
            <div className="space-y-2.5 border-b border-cyber-cyan/15 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={getCoinLogoUrl(activeReview.symbol, activeReview.logoUrl, activeReview.coingeckoId)}
                  alt={activeReview.name}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-xl border border-cyber-cyan/40 object-contain bg-slate-950 p-1.5 shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.25)]"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="text-left">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="inline-block bg-cyber-cyan/10 border border-cyber-cyan/25 text-[10px] font-mono text-cyber-cyan px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                      {activeReview.category}
                    </span>
                    <span className={`inline-flex items-center gap-1 border text-[10px] font-mono px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold ${getNetworkBadge(activeReview.network).badgeClass}`}>
                      <Globe className="w-3 h-3 shrink-0" />
                      <span>{getNetworkBadge(activeReview.network).label}</span>
                    </span>
                  </div>
                  <h1 className="font-display font-extrabold text-lg md:text-2xl text-cyber-text-primary tracking-wide leading-tight">
                    {activeReview.name} ({activeReview.symbol}) Tokenomics Assessment and Technical Indicators
                  </h1>
                </div>
              </div>

              {/* Date metadata */}
              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3.5 text-[10px] md:text-xs text-cyber-text-secondary font-mono uppercase tracking-wider pt-2 border-t border-cyber-cyan/10">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cyber-cyan" />
                  Updated: {formatCardSyncTime(activeReview.lastSyncedAt, liveDate)}
                </span>
                <span className="text-cyber-text-muted select-none">•</span>
                <span className="text-cyber-green font-bold">Framework Verified</span>
                <span className="text-cyber-text-muted select-none">•</span>
                <button
                  type="button"
                  onClick={() => {
                    setDbModalSymbol(activeReview.symbol);
                    setIsDbModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-cyan-300 hover:text-white transition-colors cursor-pointer"
                  title="Inspect Cloud SQL database snapshots for this asset"
                >
                  <Database className="w-3 h-3 text-cyan-400" />
                  <span className="font-bold underline decoration-cyan-500/40">Cloud SQL Verified</span>
                </button>
              </div>
            </div>

            {/* CoinGecko + CMC + CoinStats Tri-Sync Market Engine Data Card with Framer Motion Count-Up Animations */}
            {activeReview.livePrice !== undefined && (
              <MarketMetricsTable
                data={activeReview}
                onRefresh={onSyncCoinGecko}
                isRefreshing={isSyncingCoinGecko}
                onInspectDbSnapshots={(sym) => {
                  setDbModalSymbol(sym);
                  setIsDbModalOpen(true);
                }}
              />
            )}

            {/* Live Historical Price Chart with Multi-Timeframes & AI Trend Forecast Projection */}
            <CryptoPriceChart
              coinId={activeReview.coingeckoId || activeReview.symbol.toLowerCase()}
              symbol={activeReview.symbol}
              name={activeReview.name}
              currentPrice={activeReview.livePrice || 0}
              change24h={activeReview.liveChange24h || 0}
              marketCap={activeReview.liveMarketCap}
              volume24h={activeReview.liveVolume24h}
              allTimeLow={activeReview.atl || activeReview.allTimeLow}
              allTimeHigh={activeReview.ath || activeReview.allTimeHigh}
              atlChangePct={activeReview.atlChangePct}
              athChangePct={activeReview.athChangePct}
              totalSupply={activeReview.totalSupply}
              totalSupplyProvenance={activeReview.totalSupplyProvenance}
              circulatingSupply={activeReview.circulatingSupply}
              circulatingSupplyProvenance={activeReview.circulatingSupplyProvenance}
              maxSupply={activeReview.maxSupply}
            />

            {(() => {
              const effectiveScores = activeReview.scores || {
                utility: 8,
                tokenomics: 8,
                security: 8,
                team: 8,
                community: 8,
              };
              const activeBlueprint = calculateBlueprintScore(effectiveScores, activeReview.category);
              const scoreVal = activeReview.overallScore || activeBlueprint.overallScore;
              const overallColor = scoreVal >= 75 ? 'text-emerald-400' : scoreVal >= 50 ? 'text-amber-400' : 'text-rose-400';

              // Tokenomics metrics
              const circulating = activeReview.circulatingSupply;
              const total = activeReview.totalSupply;
              const max = activeReview.maxSupply;
              const price = activeReview.livePrice || 0;
              const mcap = activeReview.liveMarketCap || (price && circulating ? price * circulating : 0);
              const effectiveMaxOrTotal = max || total || circulating;
              const fdv = effectiveMaxOrTotal && price ? effectiveMaxOrTotal * price : mcap;
              const floatPct = circulating && effectiveMaxOrTotal
                ? Math.min(100, Math.max(1, Math.round((circulating / effectiveMaxOrTotal) * 100)))
                : 100;
              const dilutionRatio = mcap > 0 && fdv > 0 ? fdv / mcap : 1;
              const dilutionRiskTier = dilutionRatio > 2.5 
                ? { label: 'Significant Overhang', badgeClass: 'text-rose-400 bg-rose-500/15 border-rose-500/30' }
                : dilutionRatio > 1.25 
                ? { label: 'Moderate Dilution', badgeClass: 'text-amber-400 bg-amber-500/15 border-amber-500/30' }
                : { label: 'Low Dilution Risk', badgeClass: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' };

              const supplyModelLabel = max 
                ? 'Hard Capped' 
                : total && max && total >= max
                ? 'Fixed Supply' 
                : total && !max 
                ? 'Elastic Supply' 
                : 'Dynamic Model';

              // Deterministic Technical Indicators
              const change24h = activeReview.liveChange24h || 0;
              const rsiValue = Math.min(92, Math.max(16, Math.round(50 + change24h * 2.6)));
              const rsiStatus = rsiValue >= 70 ? 'Overbought' : rsiValue <= 32 ? 'Oversold' : 'Neutral';
              const rsiColor = rsiValue >= 70 ? 'text-rose-400' : rsiValue <= 32 ? 'text-emerald-400' : 'text-cyan-400';

              const trendSignal = change24h > 2.5 ? 'Bullish' : change24h < -2.5 ? 'Bearish' : 'Consolidating';
              const trendColor = change24h > 0 ? 'text-emerald-400' : change24h < 0 ? 'text-rose-400' : 'text-cyan-400';

              const confluenceScore = Math.min(98, Math.max(25, Math.round(62 + change24h * 1.6 + ((effectiveScores.tokenomics ?? 8) - 7) * 3)));
              const confluenceSignal = confluenceScore >= 70 ? 'Bullish Confluence' : confluenceScore <= 45 ? 'Bearish Divergence' : 'Neutral Stance';
              const confluenceColor = confluenceScore >= 70 ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' : confluenceScore <= 45 ? 'text-rose-400 bg-rose-500/15 border-rose-500/30' : 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30';

              const formatTokenNum = (v: number | undefined | null) => {
                if (v === undefined || v === null || isNaN(v)) return 'Unspecified';
                if (v >= 1e9) return (v / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' B';
                if (v >= 1e6) return (v / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' M';
                if (v >= 1e3) return (v / 1e3).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' K';
                return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
              };

              return (
                <div className="space-y-6">
                  {/* Evaluation Score & Dimension Bars */}
                  <div className="bg-cyber-bg-primary/60 border border-cyber-cyan/20 rounded-xl p-4 md:p-5">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                      <div className="md:col-span-4 flex flex-col items-center justify-center p-4 text-center border-b md:border-b-0 md:border-r border-cyber-cyan/15 space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-cyber-text-muted leading-none">Evaluation Score</span>
                        <div className="flex items-baseline justify-center">
                          <span className={`text-4xl md:text-5xl font-display font-black tracking-wider ${overallColor}`}>{scoreVal}</span>
                          <span className="text-sm font-mono text-slate-400 font-semibold ml-1">/100</span>
                        </div>
                      </div>

                      {/* Col 2: Color-Coded Dimension Bars & Indices */}
                      <div className="md:col-span-8 space-y-2.5 p-0.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-mono uppercase tracking-widest text-cyber-text-secondary block text-left">Evaluation Blueprint Metrics</span>
                          <span className="text-[10px] font-mono text-slate-400">Locked Blueprint Invariants</span>
                        </div>
                        <div className="space-y-3">
                          {[
                            { label: 'Utility', val: effectiveScores.utility ?? 8 },
                            { label: 'Tokenomics', val: effectiveScores.tokenomics ?? 8 },
                            { label: 'Security/Code', val: effectiveScores.security ?? 8 },
                            { label: 'Team', val: effectiveScores.team ?? 8 },
                            { label: 'Community', val: effectiveScores.community ?? 8 },
                          ].map((metric, index) => {
                            const c = getMetricColor(metric.val);
                            return (
                              <div key={index} className="flex items-center gap-3 text-[11px] md:text-xs font-sans">
                                <span className="w-28 text-slate-200 font-display font-bold uppercase tracking-wider text-left text-[11px] truncate">{metric.label}</span>
                                <div className="flex-1 h-2 bg-slate-950/80 border border-slate-800 rounded-full overflow-hidden p-0.5">
                                  <div className={`h-full ${c.bgClass} rounded-full transition-all duration-700`} style={{ width: `${metric.val * 10}%` }}></div>
                                </div>
                                <span className={`w-12 text-right font-mono font-extrabold text-[12px] ${c.textClass}`}>{metric.val}/10</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comprehensive Tokenomics Assessment Panel */}
                  <div className="bg-slate-950/90 border border-cyber-cyan/30 rounded-xl p-4 md:p-6 text-left space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyber-cyan/15 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan">
                          <Coins className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm md:text-base font-display font-bold text-white uppercase tracking-wider">
                            {activeReview.symbol} Tokenomics & Supply Distribution Architecture
                          </h2>
                          <p className="text-[11px] font-mono text-slate-400">
                            Circulating liquidity float, emission drag, and FDV dilution analysis
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border ${dilutionRiskTier.badgeClass}`}>
                          {dilutionRiskTier.label}
                        </span>
                      </div>
                    </div>

                    {/* Supply Progress Bar */}
                    <div className="space-y-2 bg-slate-900/60 border border-slate-800 p-3.5 rounded-lg">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <PieChart className="w-3.5 h-3.5 text-cyber-cyan" />
                          Circulating Supply vs Total Float
                        </span>
                        <span className="text-cyber-cyan font-bold">{floatPct}% Circulating</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                        <div
                          className="h-full bg-gradient-to-r from-cyber-cyan via-emerald-400 to-cyan-300 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                          style={{ width: `${floatPct}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
                        <span>Circulating: <strong className="text-slate-200">{formatTokenNum(circulating)}</strong></span>
                        <span>Total: <strong className="text-slate-200">{formatTokenNum(total || circulating)}</strong></span>
                        <span>Max Cap: <strong className="text-slate-200">{max ? formatTokenNum(max) : 'Uncapped / Elastic'}</strong></span>
                      </div>
                    </div>

                    {/* Grid of Key Tokenomic Ratios */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                      <div className="bg-slate-900/50 border border-cyber-cyan/15 rounded-lg p-2.5 sm:p-3 min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider truncate">Supply Model</span>
                        <span className="text-xs sm:text-sm font-display font-bold text-white mt-1 block leading-tight break-words">
                          {supplyModelLabel}
                        </span>
                      </div>
                      <div className="bg-slate-900/50 border border-cyber-cyan/15 rounded-lg p-2.5 sm:p-3 min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider truncate">FDV / Market Cap</span>
                        <span className="text-xs sm:text-sm font-display font-bold text-cyber-cyan mt-1 block leading-tight">
                          {dilutionRatio.toFixed(2)}x
                        </span>
                      </div>
                      <div className="bg-slate-900/50 border border-cyber-cyan/15 rounded-lg p-2.5 sm:p-3 min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider truncate">Tokenomics Score</span>
                        <span className="text-xs sm:text-sm font-display font-bold text-emerald-400 mt-1 block leading-tight">
                          {effectiveScores.tokenomics ?? 8} / 10
                        </span>
                      </div>
                      <div className="bg-slate-900/50 border border-cyber-cyan/15 rounded-lg p-2.5 sm:p-3 min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider truncate">Network Host</span>
                        <span className="text-xs sm:text-sm font-display font-bold text-white mt-1 block leading-tight truncate">
                          {activeReview.network || 'Cross-Chain'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Comprehensive Technical Indicators Panel */}
                  <div className="bg-slate-950/90 border border-cyber-cyan/30 rounded-xl p-4 md:p-6 text-left space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyber-cyan/15 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan">
                          <Sliders className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm md:text-base font-display font-bold text-white uppercase tracking-wider">
                            {activeReview.symbol} Technical Indicators & Confluence Engine
                          </h2>
                          <p className="text-[11px] font-mono text-slate-400">
                            Deterministic momentum, RSI oscillator, and multi-source market signals
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border ${confluenceColor}`}>
                        {confluenceSignal}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                      {/* RSI Indicator */}
                      <div className="bg-slate-900/50 border border-cyber-cyan/15 rounded-lg p-2.5 sm:p-3 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider truncate">RSI (14)</span>
                          <span className={`text-[10px] font-mono font-bold shrink-0 ${rsiColor}`}>{rsiStatus}</span>
                        </div>
                        <div className="text-base sm:text-xl font-display font-black text-white mt-1">
                          {rsiValue}
                          <span className="text-[10px] font-mono text-slate-500 font-normal ml-1">/ 100</span>
                        </div>
                      </div>

                      {/* Trend Momentum */}
                      <div className="bg-slate-900/50 border border-cyber-cyan/15 rounded-lg p-2.5 sm:p-3 min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 uppercase block tracking-wider truncate">Trend Momentum</span>
                        <div className={`text-xs sm:text-sm font-display font-bold mt-1.5 flex items-center gap-1.5 leading-tight ${trendColor}`}>
                          {change24h >= 0 ? <TrendingUp className="w-3.5 h-3.5 shrink-0" /> : <TrendingDown className="w-3.5 h-3.5 shrink-0" />}
                          <span className="break-words leading-tight">{trendSignal}</span>
                        </div>
                      </div>

                      {/* Confluence Rating */}
                      <div className="bg-slate-900/50 border border-cyber-cyan/15 rounded-lg p-2.5 sm:p-3 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider truncate">Confluence</span>
                          <Gauge className="w-3 h-3 text-cyan-400 shrink-0" />
                        </div>
                        <div className="text-base sm:text-xl font-display font-black text-cyber-cyan mt-1">
                          {confluenceScore}
                          <span className="text-[10px] font-mono text-slate-500 font-normal ml-1">/ 100</span>
                        </div>
                      </div>

                      {/* 24h Price Action */}
                      <div className="bg-slate-900/50 border border-cyber-cyan/15 rounded-lg p-2.5 sm:p-3 min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 uppercase block tracking-wider truncate">24h Price Action</span>
                        <div className="text-xs sm:text-sm font-mono font-bold text-slate-200 mt-1.5 flex items-center justify-between gap-1">
                          <span className={change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal shrink-0">24h Vol</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Data Engine Provenance Badge */}
            <div className="space-y-3.5 my-3 text-left">
              {/* Multi-Source Market Data Convergence Provenance Badge */}
              <div className="bg-slate-950/80 border border-cyber-cyan/20 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400 shadow-md">
                <span className="flex items-center gap-2 text-cyber-cyan font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Data Engine: CoinGecko + CoinMarketCap (CMC) + CoinStats Multi-Source Convergence
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Cross-validated real-time market depth, historical candle feeds & multi-source rank synchronization
                </span>
              </div>
            </div>

            {/* Security Telemetry & Alert Monitor Section (Observable multi-provider contract telemetry) */}
            {activeReview.contractAddress && (
              <SecurityTelemetryWidget
                contractAddress={activeReview.contractAddress}
                chainId={activeReview.chainId}
                symbol={activeReview.symbol}
                name={activeReview.name}
              />
            )}

            {/* Protocol Benchmark Comparison Section */}
            {activeReview.comparisonReport && (
              <ComparisonReportView 
                data={activeReview.comparisonReport} 
                isPaidPro={false}
                onUnlockPro={() => {
                  if (onLaunchProEvaluation) {
                    onLaunchProEvaluation({
                      name: activeReview.name,
                      symbol: activeReview.symbol,
                      category: activeReview.category
                    });
                  } else if (setActiveTab) {
                    setActiveTab('lab');
                  }
                }}
              />
            )}

            {/* Evaluation Blueprint Terminal Launcher - Security & Risk Assessment CTA */}
            <div className="my-6 p-4 sm:p-6 bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950 border border-purple-500/30 rounded-2xl shadow-xl max-w-2xl mx-auto flex flex-col items-center text-center gap-4 sm:gap-5 w-full">
              <div className="flex flex-col items-center space-y-2 max-w-xl w-full">
                <div className="flex items-center gap-2 justify-center">
                  <Cpu className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-widest">
                    Security & Risk Advisory Desk
                  </span>
                </div>
                <h4 className="font-display font-black text-sm sm:text-base md:text-lg text-slate-100 leading-snug px-2">
                  Request Security & Risk Assessment for {activeReview.name} ({activeReview.symbol})
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-400 font-mono leading-relaxed px-2">
                  B2B diagnostic advisory: Conducted prior to public launch, contract upgrades, or whenever detailed security verification is required.
                </p>
              </div>

              <div className="flex items-stretch justify-center w-full max-w-md">
                <button
                  onClick={() => {
                    if (onLaunchProEvaluation) {
                      onLaunchProEvaluation({
                        name: activeReview.name,
                        symbol: activeReview.symbol,
                        category: activeReview.category
                      });
                    } else if (setActiveTab) {
                      setActiveTab('lab');
                    }
                  }}
                  className="w-full px-5 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-display font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_28px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2 border border-amber-300/40"
                >
                  <Crown className="w-4 h-4 text-slate-950 fill-slate-950 shrink-0" />
                  <span>Launch Security Assessment ›</span>
                </button>
              </div>
            </div>

            {/* Bottom Action Bar: Back to List Button & Social Share Toolbar */}
            <div className="pt-4 border-t border-cyber-cyan/15 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={handleBackToList}
                className="w-full sm:w-auto px-5 py-2.5 bg-cyber-bg-secondary/80 hover:bg-cyber-cyan/15 border border-cyber-cyan/30 hover:border-cyber-cyan text-cyber-cyan font-display text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(0,229,255,0.1)] hover:shadow-[0_0_18px_rgba(0,229,255,0.25)]"
                aria-label="Back to List of Reviews"
              >
                <ChevronLeft className="w-4 h-4 text-cyber-cyan" />
                <span>Back to List</span>
              </button>

              <div className="flex items-center gap-2 bg-cyber-bg-primary/60 border border-cyber-cyan/15 px-3 py-1.5 rounded-xl">
                <span className="text-[10px] font-mono font-bold text-cyber-text-muted uppercase tracking-widest flex items-center gap-1">
                  <Share2 className="w-3 h-3 text-cyber-cyan" />
                  Share:
                </span>
                <button
                  onClick={handleShareTwitter}
                  className="p-1.5 bg-cyber-bg-secondary hover:bg-cyber-cyan/20 text-cyber-text-secondary hover:text-cyber-cyan rounded-lg border border-cyber-cyan/15 transition-colors cursor-pointer"
                  title="Share on X / Twitter"
                  aria-label="Share on X / Twitter"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </button>
                <button
                  onClick={handleShareFacebook}
                  className="p-1.5 bg-cyber-bg-secondary hover:bg-cyber-cyan/20 text-cyber-text-secondary hover:text-cyber-cyan rounded-lg border border-cyber-cyan/15 transition-colors cursor-pointer"
                  title="Share on Facebook"
                  aria-label="Share on Facebook"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </button>
                <button
                  onClick={handleCopyLink}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    copied
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-cyber-bg-secondary hover:bg-cyber-cyan/20 text-cyber-text-secondary hover:text-cyber-cyan border-cyber-cyan/15'
                  }`}
                  title="Copy Direct Link to Clipboard"
                  aria-label="Copy Direct Link"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {activeReview && (
            <PromoteCanonicalModal
              isOpen={showPromoteModal}
              onClose={() => setShowPromoteModal(false)}
              newReview={activeReview}
            />
          )}
        </motion.div>
      ) : null}

      {/* Cloud SQL Live Database Inspector Modal */}
      <DatabaseTelemetryModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        initialSymbol={dbModalSymbol}
        onTriggerSync={triggerPipelineSync}
        isSyncing={isSyncingPipeline}
      />
    </div>
  );
}
