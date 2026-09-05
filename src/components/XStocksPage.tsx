/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  RefreshCw, 
  Search, 
  Activity, 
  ShieldCheck, 
  ExternalLink,
  Layers,
  ChevronRight,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Scale,
  ArrowRightLeft,
  Star,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Play
} from 'lucide-react';
import { 
  XSTOCKS_REGISTRY, 
  XStockRegistryItem, 
  getUsMarketHoursStatus, 
  UsMarketHoursStatus 
} from '../data/xstocksRegistry';
import XStockPriceChart from './XStockPriceChart';
import AIXStocksMarketSummary from './AIXStocksMarketSummary';
import XStockAlertModal, { XStockPriceAlert } from './XStockAlertModal';
import XStockAlertBanner from './XStockAlertBanner';
import XStockVerificationPanel from './XStockVerificationPanel';
import { useCurrency } from '../context/CurrencyContext';
import { fetchVerifiedCoinGeckoMarkets } from '../services/coingecko';
import { 
  fetchCoinGeckoRwaMarkets, 
  fetchCoinGeckoRwaDetail, 
  fetchCoinGeckoRwaIssuer, 
  CoinGeckoRwaDetail, 
  CoinGeckoRwaIssuerDetail 
} from '../services/coingeckoRwa';
import { fetchLiveCMCQuote } from '../services/cmc';
import { fetchLiveFinnhubQuote, FinnhubQuote } from '../services/finnhub';
import { computeMultiSourceConvergence } from '../services/marketConvergence';
import { MultiSourceConvergenceReport } from '../types';
import { XStockNormalizedEvidence } from '../services/xstockEvidenceEngine';

export interface XStockQuoteState {
  livePrice: number | null; // Converged tokenized price (null if divergent or unavailable)
  change24h?: number;
  volume24h: number | null;
  marketCap: number | null;
  status: 'LIVE_MULTI_SOURCE' | 'SINGLE_SOURCE' | 'UNRESOLVED_DIVERGENCE' | 'UNAVAILABLE' | 'LIVE_DUAL_ORACLE' | 'SINGLE_ORACLE';
  provenance: 'LIVE' | 'STALE' | 'SYNTHETIC' | 'UNAVAILABLE';
  cgPrice?: number;
  rwaPrice?: number;
  rwaVolume24h?: number;
  cmcPrice?: number;
  cmcLastUpdated?: string;
  equityQuote?: FinnhubQuote | null;
  equityPrice?: number;
  pegDeviation?: number;
  pegDeviationPct?: number;
  pegStatus?: 'TIGHT_PEG' | 'MODERATE_VARIANCE' | 'DIVERGENT' | 'UNAVAILABLE';
  report?: MultiSourceConvergenceReport;
  evidence?: Record<string, XStockNormalizedEvidence>;
}

const FAVORITES_STORAGE_KEY = 'crl_xstocks_favorites';
const ALERTS_STORAGE_KEY = 'crl_xstocks_price_alerts';
const SOUND_STORAGE_KEY = 'crl_xstocks_alert_sound';

// Synthesize pleasant cyber audio chime for price alert triggers
function playCyberAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.15); // E6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1760, now + 0.08); // A6
    osc2.frequency.exponentialRampToValueAtTime(2640, now + 0.25);

    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.45);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.debug('Audio chime policy notice:', e);
  }
}

export default function XStocksPage() {
  const [selectedStock, setSelectedStock] = useState<XStockRegistryItem>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const stockParam = params.get('stock') || params.get('xstock') || params.get('symbol');
        if (stockParam) {
          const clean = stockParam.trim().toLowerCase();
          const match = XSTOCKS_REGISTRY.find(
            s => s.symbol.toLowerCase() === clean || 
                 s.underlyingTicker.toLowerCase() === clean || 
                 s.coingeckoId.toLowerCase() === clean ||
                 s.name.toLowerCase().includes(clean)
          );
          if (match) return match;
        }
      }
    } catch (e) {
      console.warn('Failed to parse initial stock param:', e);
    }
    return XSTOCKS_REGISTRY[0];
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [marketHours, setMarketHours] = useState<UsMarketHoursStatus>(() => getUsMarketHoursStatus());

  // Sync selectedStock to URL search params when in xstocks tab
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('tab') === 'xstocks' || url.searchParams.has('stock')) {
        if (url.searchParams.get('stock') !== selectedStock.symbol) {
          url.searchParams.set('stock', selectedStock.symbol);
          window.history.replaceState({ tab: 'xstocks', stock: selectedStock.symbol }, '', url.toString());
        }
      }
    } catch (e) {
      console.warn('Failed to sync stock to URL:', e);
    }
  }, [selectedStock.symbol]);

  // Favorites state persisted in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error loading favorites from storage:', e);
    }
    // Default favorites
    return ['TSLAX', 'NVDAX', 'AAPLX', 'SPYX'];
  });

  // Price Alerts state persisted in localStorage
  const [alerts, setAlerts] = useState<XStockPriceAlert[]>(() => {
    try {
      const saved = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error loading alerts from storage:', e);
    }
    return [
      {
        id: 'alert-default-1',
        symbol: 'TSLAX',
        name: 'Tesla Inc (xStock)',
        targetPrice: 360.00,
        direction: 'ABOVE',
        createdPrice: 345.32,
        createdAt: new Date().toISOString(),
        active: true,
        triggered: false,
        note: 'Breakout above $360 resistance'
      },
      {
        id: 'alert-default-2',
        symbol: 'COINX',
        name: 'Coinbase Global Inc (xStock)',
        targetPrice: 175.00,
        direction: 'ABOVE',
        createdPrice: 172.43,
        createdAt: new Date().toISOString(),
        active: true,
        triggered: false,
        note: 'Crypto market momentum target'
      }
    ];
  });

  // Sound chime toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SOUND_STORAGE_KEY);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Modal open state
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);

  // Multi-source Market Data Maps
  const [stockQuotes, setStockQuotes] = useState<Record<string, XStockQuoteState>>({});

  // CoinGecko Native RWA Metadata & Issuer State
  const [activeRwaDetail, setActiveRwaDetail] = useState<CoinGeckoRwaDetail | null>(null);
  const [activeRwaIssuer, setActiveRwaIssuer] = useState<CoinGeckoRwaIssuerDetail | null>(null);
  const [isLoadingRwaMeta, setIsLoadingRwaMeta] = useState<boolean>(false);

  // Sync CoinGecko RWA detail and issuer info for selected stock
  useEffect(() => {
    let isCancelled = false;
    async function loadRwaMeta() {
      if (!selectedStock.coingeckoRwaId) {
        setActiveRwaDetail(null);
        setActiveRwaIssuer(null);
        return;
      }
      setIsLoadingRwaMeta(true);
      try {
        const [rwaDetail, rwaIssuer] = await Promise.all([
          fetchCoinGeckoRwaDetail(selectedStock.coingeckoRwaId).catch(() => null),
          fetchCoinGeckoRwaIssuer(selectedStock.issuerId || 'backed').catch(() => null)
        ]);
        if (!isCancelled) {
          setActiveRwaDetail(rwaDetail);
          setActiveRwaIssuer(rwaIssuer);
        }
      } catch (e) {
        console.warn('Failed to load RWA metadata:', e);
      } finally {
        if (!isCancelled) {
          setIsLoadingRwaMeta(false);
        }
      }
    }

    loadRwaMeta();
    return () => {
      isCancelled = true;
    };
  }, [selectedStock.coingeckoRwaId, selectedStock.issuerId]);

  // Persist Favorites
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.warn('Error saving favorites:', e);
    }
  }, [favorites]);

  // Persist Alerts
  useEffect(() => {
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    } catch (e) {
      console.warn('Error saving alerts:', e);
    }
  }, [alerts]);

  // Persist Sound Setting
  useEffect(() => {
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(soundEnabled));
    } catch (e) {
      console.warn('Error saving sound setting:', e);
    }
  }, [soundEnabled]);

  // Toggle Favorite Handler
  const toggleFavorite = (symbol: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const symUpper = symbol.toUpperCase();
      if (prev.includes(symUpper)) {
        return prev.filter(s => s !== symUpper);
      } else {
        return [...prev, symUpper];
      }
    });
  };

  const isFavorite = (symbol: string) => favorites.includes(symbol.toUpperCase());

  // Evaluate Price Alerts against Live Price Feeds
  const evaluateAlerts = useCallback((quotes: Record<string, XStockQuoteState>) => {
    setAlerts(prevAlerts => {
      let newlyTriggered = false;
      const updated = prevAlerts.map(alert => {
        if (!alert.active || alert.triggered) return alert;

        const quote = quotes[alert.symbol.toUpperCase()];
        const livePrice = quote?.livePrice;
        // Do not trigger automated alert execution on divergent, synthetic, or unavailable feeds
        if (!livePrice || livePrice <= 0 || quote?.status === 'UNRESOLVED_DIVERGENCE' || quote?.provenance !== 'LIVE') return alert;

        let shouldTrigger = false;
        if (alert.direction === 'ABOVE' && livePrice >= alert.targetPrice) {
          shouldTrigger = true;
        } else if (alert.direction === 'BELOW' && livePrice <= alert.targetPrice) {
          shouldTrigger = true;
        }

        if (shouldTrigger) {
          newlyTriggered = true;
          return {
            ...alert,
            triggered: true,
            triggeredAt: new Date().toISOString(),
            triggeredPrice: livePrice
          };
        }

        return alert;
      });

      if (newlyTriggered && soundEnabled) {
        playCyberAlertChime();
      }

      return updated;
    });
  }, [soundEnabled]);

  // Regular clock ticker for Market Hours status (every 30 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setMarketHours(getUsMarketHoursStatus());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Secondary Market Feeds (CoinGecko RWA + CMC) and Finnhub Underlying Equity Quote
  const syncXStocksData = async () => {
    setIsRefreshing(true);
    try {
      const currentHours = getUsMarketHoursStatus();
      setMarketHours(currentHours);

      // 1. Gather all RWA IDs, CMC symbols, and Unique Underlying Tickers
      const rwaIds = XSTOCKS_REGISTRY.map(s => s.coingeckoRwaId).filter(Boolean) as string[];
      const cmcSymbols = XSTOCKS_REGISTRY.map(s => s.cmcSymbol);
      const underlyingTickers = Array.from(new Set(XSTOCKS_REGISTRY.map(s => s.underlyingTicker)));

      // Execute CoinGecko native RWA markets (/rwas/markets), CMC, and Finnhub equity quote fetches in parallel
      const [rwaMarketsMap, cmcQuoteMap, finnhubQuoteMap] = await Promise.all([
        // CoinGecko Native RWA Markets (/rwas/markets) - Authoritative CoinGecko source for xStocks
        fetchCoinGeckoRwaMarkets(rwaIds).catch(() => ({})),
        // CoinMarketCap On-Chain Quotes
        Promise.all(
          cmcSymbols.map(sym => 
            fetchLiveCMCQuote(sym).then(q => ({ sym, q })).catch(() => ({ sym, q: null }))
          )
        ).then(results => {
          const map: Record<string, any> = {};
          results.forEach(r => {
            if (r.q) map[r.sym.toUpperCase()] = r.q;
          });
          return map;
        }),
        // Finnhub Real Underlying Equity Quotes
        Promise.all(
          underlyingTickers.map(ticker =>
            fetchLiveFinnhubQuote(ticker, currentHours.isOpen).then(q => ({ ticker, q })).catch(() => ({ ticker, q: null }))
          )
        ).then(results => {
          const map: Record<string, FinnhubQuote | null> = {};
          results.forEach(r => {
            if (r.q) map[r.ticker.toUpperCase()] = r.q;
          });
          return map;
        })
      ]);

      const newQuotes: Record<string, XStockQuoteState> = {};

      for (const item of XSTOCKS_REGISTRY) {
        const sym = item.symbol.toUpperCase();
        const underlying = item.underlyingTicker.toUpperCase();
        const rwaMarketEntry = item.coingeckoRwaId ? rwaMarketsMap[item.coingeckoRwaId.toLowerCase()] : undefined;
        const cmcData = cmcQuoteMap[item.cmcSymbol.toUpperCase()] || cmcQuoteMap[sym];
        const finnhubData = finnhubQuoteMap[underlying] || null;

        // Native CoinGecko RWA Tokenized-Market Data (strictly authoritative for xStocks)
        const rwaMkt = rwaMarketEntry?.tokenized_market_data;
        const hasRwaLivePrice = rwaMkt && typeof rwaMkt.current_price === 'number' && rwaMkt.current_price > 0;
        const rwaPrice = hasRwaLivePrice ? rwaMkt.current_price : undefined;
        const rwaVolume24h = (typeof rwaMkt?.total_volume === 'number' && rwaMkt.total_volume > 0) ? rwaMkt.total_volume : undefined;
        const rwaMarketCap = (typeof rwaMkt?.market_cap === 'number' && rwaMkt.market_cap > 0) ? rwaMkt.market_cap : undefined;
        const rwaChange = (typeof rwaMkt?.price_change_percentage_24h === 'number') ? rwaMkt.price_change_percentage_24h : undefined;

        // Check CoinGecko RWA provenance: Authoritative; never substitute generic CoinGecko data
        const cgProvenance: 'LIVE' | 'UNAVAILABLE' = hasRwaLivePrice ? 'LIVE' : 'UNAVAILABLE';
        const cgPrice = rwaPrice;
        const cgVol = rwaVolume24h;
        const cgCap = rwaMarketCap;
        const cgChange = rwaChange;

        // Check CoinMarketCap provenance
        const isCmcValid = cmcData && typeof cmcData.price === 'number' && cmcData.price > 0;
        const cmcProvenance: 'LIVE' | 'UNAVAILABLE' = isCmcValid ? 'LIVE' : 'UNAVAILABLE';
        const cmcPrice = isCmcValid ? cmcData.price : undefined;
        const cmcVol = (isCmcValid && typeof cmcData.volume24h === 'number' && cmcData.volume24h > 0) ? cmcData.volume24h : undefined;
        const cmcCap = (isCmcValid && typeof cmcData.marketCap === 'number' && cmcData.marketCap > 0) ? cmcData.marketCap : undefined;
        const cmcChange = isCmcValid ? cmcData.percentChange24h : undefined;

        // Converge secondary market feeds (CoinGecko RWA + CMC only, no CoinStats)
        const convergenceResult = computeMultiSourceConvergence({
          cgPrice,
          cgVolume: cgVol,
          cgMarketCap: cgCap,
          cgChange24h: cgChange,
          cgIsFallback: !hasRwaLivePrice,
          cgProvenance,

          cmcPrice,
          cmcVolume: cmcVol,
          cmcMarketCap: cmcCap,
          cmcChange24h: cmcChange,
          cmcIsFallback: !isCmcValid,
          cmcProvenance,

          isXStock: true
        });

        // Determine best verified tokenized market price
        // STRICT P0 REQUIREMENT: If consensus is unresolved/divergent or missing, livePrice MUST BE null!
        // NEVER select CoinGecko or CMC as fallback merely because consensus is unresolved!
        const isDivergent = convergenceResult.status === 'UNRESOLVED_DIVERGENCE';
        const livePrice = isDivergent ? null : convergenceResult.livePrice;
        const change24h = typeof cmcChange === 'number' ? cmcChange : (typeof cgChange === 'number' ? cgChange : undefined);
        const volume24h = (typeof convergenceResult.liveVolume24h === 'number' && convergenceResult.liveVolume24h > 0) 
          ? convergenceResult.liveVolume24h 
          : (cmcVol ?? rwaVolume24h ?? null);
        const marketCap = (typeof convergenceResult.liveMarketCap === 'number' && convergenceResult.liveMarketCap > 0) 
          ? convergenceResult.liveMarketCap 
          : (cmcCap ?? rwaMarketCap ?? null);

        let status: 'LIVE_MULTI_SOURCE' | 'SINGLE_SOURCE' | 'UNRESOLVED_DIVERGENCE' | 'UNAVAILABLE' = 'UNAVAILABLE';
        let provenance: 'LIVE' | 'STALE' | 'SYNTHETIC' | 'UNAVAILABLE' = 'UNAVAILABLE';

        if (isDivergent) {
          status = 'UNRESOLVED_DIVERGENCE';
          provenance = 'UNAVAILABLE';
        } else if (convergenceResult.status === 'FULL_CONSENSUS' || convergenceResult.status === 'PARTIAL_CONSENSUS') {
          status = 'LIVE_MULTI_SOURCE';
          provenance = 'LIVE';
        } else if (convergenceResult.status === 'SINGLE_SOURCE_DEGRADED' || (livePrice !== null && livePrice > 0)) {
          status = 'SINGLE_SOURCE';
          provenance = 'LIVE';
        } else {
          status = 'UNAVAILABLE';
          provenance = 'UNAVAILABLE';
        }

        // Finnhub Underlying Equity Quote & Peg Deviation Calculation
        let equityPrice: number | undefined = undefined;
        let pegDeviation: number | undefined = undefined;
        let pegDeviationPct: number | undefined = undefined;
        let pegStatus: 'TIGHT_PEG' | 'MODERATE_VARIANCE' | 'DIVERGENT' | 'UNAVAILABLE' = 'UNAVAILABLE';

        if (finnhubData && typeof finnhubData.effectivePrice === 'number' && finnhubData.effectivePrice > 0) {
          equityPrice = finnhubData.effectivePrice;
          // STRICT RULE: If divergence is unresolved or token price is missing, peg calculation is SUPPRESSED
          if (livePrice !== null && livePrice > 0 && status !== 'UNRESOLVED_DIVERGENCE') {
            pegDeviation = (livePrice - equityPrice) / equityPrice;
            pegDeviationPct = pegDeviation * 100;
            const absDev = Math.abs(pegDeviationPct);
            if (absDev < 0.5) {
              pegStatus = 'TIGHT_PEG';
            } else if (absDev < 2.0) {
              pegStatus = 'MODERATE_VARIANCE';
            } else {
              pegStatus = 'DIVERGENT';
            }
          }
        }

        // Build Normalized Evidence Objects for each individual datum (P2-FINAL Requirement 1 & 2)
        const rwaEvidence: XStockNormalizedEvidence = {
          value: hasRwaLivePrice ? rwaPrice! : null,
          source: 'TOKENIZED_MARKET',
          dataType: 'Tokenized Secondary Market Price (USD)',
          assetId: item.symbol,
          rwaId: item.coingeckoRwaId || undefined,
          timestamp: (typeof rwaMkt?.last_updated === 'string' ? rwaMkt.last_updated : null),
          freshness: hasRwaLivePrice ? 'LIVE' : 'UNAVAILABLE',
          state: hasRwaLivePrice ? 'VALID' : 'MISSING'
        };

        const cmcEvidence: XStockNormalizedEvidence = {
          value: isCmcValid ? cmcPrice! : null,
          source: 'SECONDARY_TOKEN_MARKET',
          dataType: 'Secondary Token Market Price (USD)',
          assetId: item.cmcSymbol,
          timestamp: (typeof cmcData?.lastUpdated === 'string' ? cmcData.lastUpdated : null),
          freshness: isCmcValid ? 'LIVE' : 'UNAVAILABLE',
          state: isCmcValid ? 'VALID' : 'MISSING'
        };

        const livePriceEvidence: XStockNormalizedEvidence = {
          value: livePrice,
          source: 'TOKENIZED_MARKET',
          dataType: 'Converged Tokenized Market Price (USD)',
          assetId: item.symbol,
          rwaId: item.coingeckoRwaId || undefined,
          timestamp: (typeof rwaMkt?.last_updated === 'string' ? rwaMkt.last_updated : (typeof cmcData?.lastUpdated === 'string' ? cmcData.lastUpdated : null)),
          freshness: livePrice !== null ? 'LIVE' : 'UNAVAILABLE',
          state: isDivergent ? 'CONTRADICTORY' : (livePrice !== null ? 'VALID' : 'MISSING')
        };

        const equityEvidence: XStockNormalizedEvidence = {
          value: equityPrice ?? null,
          source: 'UNDERLYING_EQUITY',
          dataType: currentHours.isOpen ? 'Live Equity Basis Price (USD)' : 'Official Close / After-Hours Price (USD)',
          assetId: item.underlyingTicker,
          timestamp: (finnhubData?.t && finnhubData.t > 0) ? new Date(finnhubData.t * 1000).toISOString() : null,
          freshness: equityPrice ? (currentHours.isOpen ? 'LIVE' : 'STALE') : 'UNAVAILABLE',
          state: equityPrice ? 'VALID' : 'MISSING'
        };

        const volumeEvidence: XStockNormalizedEvidence = {
          value: volume24h,
          source: 'TOKENIZED_MARKET',
          dataType: 'Secondary Market 24h Volume (USD)',
          assetId: item.symbol,
          rwaId: item.coingeckoRwaId || undefined,
          timestamp: (typeof rwaMkt?.last_updated === 'string' ? rwaMkt.last_updated : null),
          freshness: volume24h !== null ? 'LIVE' : 'UNAVAILABLE',
          state: volume24h !== null ? 'VALID' : 'MISSING'
        };

        const marketCapEvidence: XStockNormalizedEvidence = {
          value: marketCap,
          source: 'TOKENIZED_MARKET',
          dataType: 'Circulating Market Capitalization (USD)',
          assetId: item.symbol,
          rwaId: item.coingeckoRwaId || undefined,
          timestamp: (typeof rwaMkt?.last_updated === 'string' ? rwaMkt.last_updated : null),
          freshness: marketCap !== null ? 'LIVE' : 'UNAVAILABLE',
          state: marketCap !== null ? 'VALID' : 'MISSING'
        };

        // Genuine Direct DEX / On-chain Market Telemetry
        // If genuine direct DEX/on-chain market telemetry is unavailable, explicitly expose ON_CHAIN/DEX_UNAVAILABLE
        const dexTelemetryEvidence: XStockNormalizedEvidence = {
          value: null,
          source: 'ON_CHAIN',
          dataType: 'Direct DEX Orderbook / Pool Telemetry (USD)',
          assetId: item.contractAddress || item.symbol,
          timestamp: null,
          freshness: 'UNAVAILABLE',
          state: 'MISSING',
          details: 'ON_CHAIN/DEX_UNAVAILABLE: Direct DEX on-chain liquidity/pool telemetry is unavailable. Token aggregators (CoinGecko RWA, CoinMarketCap) provide secondary market observations and are not direct on-chain telemetry.'
        };

        const itemEvidence: Record<string, XStockNormalizedEvidence> = {
          coingecko_rwa_price: rwaEvidence,
          cmc_cross_check_price: cmcEvidence,
          live_price: livePriceEvidence,
          underlying_equity_price: equityEvidence,
          volume_24h: volumeEvidence,
          market_cap: marketCapEvidence,
          direct_dex_telemetry: dexTelemetryEvidence
        };

        newQuotes[sym] = {
          livePrice,
          change24h,
          volume24h,
          marketCap,
          status,
          provenance,
          cgPrice,
          rwaPrice,
          rwaVolume24h,
          cmcPrice,
          cmcLastUpdated: typeof cmcData?.lastUpdated === 'string' ? cmcData.lastUpdated : undefined,
          equityQuote: finnhubData,
          equityPrice,
          pegDeviation,
          pegDeviationPct,
          pegStatus,
          report: convergenceResult.report,
          evidence: itemEvidence
        };
      }

      setStockQuotes(newQuotes);
      evaluateAlerts(newQuotes);
    } catch (err) {
      console.warn('Error loading xStocks data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    syncXStocksData();
  }, []);

  // Filter Categories with Favorites tab
  const categories = useMemo(() => {
    const set = new Set<string>();
    XSTOCKS_REGISTRY.forEach(s => set.add(s.category));
    return ['All', '★ Favorites', ...Array.from(set)];
  }, []);

  const filteredStocks = useMemo(() => {
    return XSTOCKS_REGISTRY.filter(item => {
      if (categoryFilter === '★ Favorites') {
        if (!isFavorite(item.symbol)) return false;
      } else if (categoryFilter !== 'All' && item.category !== categoryFilter) {
        return false;
      }

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = 
        !q || 
        item.symbol.toLowerCase().includes(q) || 
        item.name.toLowerCase().includes(q) || 
        item.underlyingTicker.toLowerCase().includes(q) ||
        item.underlyingName.toLowerCase().includes(q);
      return matchesSearch;
    });
  }, [categoryFilter, searchQuery, favorites]);

  // Alert Management Handlers
  const handleAddAlert = (newAlertData: Omit<XStockPriceAlert, 'id' | 'createdAt' | 'triggered'>) => {
    const newAlert: XStockPriceAlert = {
      ...newAlertData,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      triggered: false
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleToggleAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const handleResetAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, triggered: false, triggeredAt: undefined, triggeredPrice: undefined, active: true } : a));
  };

  const handleDismissTriggeredAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, triggered: false } : a));
  };

  // Test Trigger Alert to immediately demonstrate visual UI alert & chime
  const handleTestTriggerAlert = (targetStock: XStockRegistryItem) => {
    const quote = stockQuotes[targetStock.symbol.toUpperCase()];
    const curPrice = quote?.livePrice || 350.00;
    const testAlert: XStockPriceAlert = {
      id: `alert-test-${Date.now()}`,
      symbol: targetStock.symbol,
      name: targetStock.name,
      targetPrice: curPrice,
      direction: 'ABOVE',
      createdPrice: curPrice * 0.98,
      createdAt: new Date().toISOString(),
      active: true,
      triggered: true,
      triggeredAt: new Date().toISOString(),
      triggeredPrice: curPrice,
      note: 'Simulated Threshold Cross Test'
    };

    setAlerts(prev => [testAlert, ...prev.filter(a => a.id !== testAlert.id)]);
    if (soundEnabled) {
      playCyberAlertChime();
    }
  };

  const activeQuote = stockQuotes[selectedStock.symbol.toUpperCase()];
  const triggeredAlerts = alerts.filter(a => a.triggered);
  const activeAlertsCount = alerts.filter(a => a.active && !a.triggered).length;
  const { formatPrice, selectedCurrency } = useCurrency();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Visual Live UI Triggered Alert Banner */}
      <XStockAlertBanner 
        triggeredAlerts={triggeredAlerts}
        onDismissAlert={handleDismissTriggeredAlert}
        onSelectStock={(sym) => {
          const item = XSTOCKS_REGISTRY.find(s => s.symbol.toUpperCase() === sym.toUpperCase());
          if (item) setSelectedStock(item);
        }}
        onResetAlert={handleResetAlert}
        onOpenAlertsModal={() => setIsAlertModalOpen(true)}
      />

      {/* 1. Header Banner with US Market Hours Telemetry Badge & Price Alerts Button */}
      <div className="rounded-2xl bg-gradient-to-br from-cyber-bg-card via-slate-950/90 to-cyber-bg-primary border border-cyber-cyan/35 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.4)] p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan/70 to-transparent" />
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-cyber-cyan/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30">
                TOKENIZED STOCKS (xSTOCKS)
              </span>
              <span className="text-slate-400 text-xs font-mono">
                Backed Finance Collateralized Assets
              </span>
            </div>

            <h1 className="font-orbitron font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-wide">
              Tokenized Equities & <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyber-cyan to-purple-400">Market Intelligence</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              24/7 on-chain secondary market quoting for tokenized US equities with Market Data Cross-Check (CoinGecko &amp; CoinMarketCap aggregators) and real-time underlying equity basis verification via Finnhub.
            </p>

            {/* Quick Action Pills: Favorites Count & Price Alert Manager & Currency Selector */}
            <div className="flex items-center gap-2.5 pt-2 flex-wrap">
              <button
                type="button"
                onClick={() => setCategoryFilter('★ Favorites')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  categoryFilter === '★ Favorites'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-amber-500/40 hover:text-white'
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>Favorites ({favorites.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAlertModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-cyber-cyan/40 hover:border-cyber-cyan text-cyber-cyan text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm group"
              >
                <BellRing className="w-3.5 h-3.5 group-hover:animate-bounce" />
                <span>Price Alerts</span>
                {alerts.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    triggeredAlerts.length > 0
                      ? 'bg-amber-500 text-slate-950 animate-pulse'
                      : 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40'
                  }`}>
                    {triggeredAlerts.length > 0 ? `${triggeredAlerts.length} Triggered` : alerts.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1 transition-all cursor-pointer ${
                  soundEnabled 
                    ? 'bg-slate-950/80 text-slate-300 border-slate-800 hover:text-white' 
                    : 'bg-slate-950/40 text-slate-500 border-slate-800'
                }`}
                title={soundEnabled ? 'Alert audio sound chime is on' : 'Alert audio sound chime is muted'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyber-cyan" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                <span className="text-[10px]">{soundEnabled ? 'Chime ON' : 'Chime MUTED'}</span>
              </button>
            </div>
          </div>

          {/* Market Hours Telemetry Status Card */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-cyber-cyan/25 shrink-0 min-w-[280px] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  marketHours.isOpen ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`} />
                <span className="text-[11px] font-orbitron font-bold text-white uppercase">
                  {marketHours.statusLabel}
                </span>
              </div>
              <span className="text-[9.5px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {marketHours.easternTimeFormatted}
              </span>
            </div>

            <p className="text-[10px] font-mono text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2">
              {marketHours.detail}
            </p>

            <div className="flex items-center justify-between text-[9px] font-mono text-cyber-cyan pt-1">
              <span>Next Session Event:</span>
              <span className="font-bold text-white">{marketHours.nextEventLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. AI xStocks Market Summary Widget */}
      <div className="w-full">
        <AIXStocksMarketSummary 
          stockQuotes={stockQuotes}
          isRefreshing={isRefreshing}
          onRefresh={syncXStocksData}
        />
      </div>

      {/* 3. Main Terminal Content Grid: Left Selector List & Right Chart View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (4 cols): Configurable Ticker Selector & Search */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl bg-cyber-bg-card/90 border border-cyber-cyan/30 backdrop-blur-md shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyber-cyan" />
                <span className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
                  xStocks Registry ({filteredStocks.length})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsAlertModalOpen(true)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-cyber-cyan/15 border border-slate-800 hover:border-cyber-cyan/40 text-cyber-cyan cursor-pointer transition-all"
                  title="Configure Price Alerts"
                >
                  <Bell className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={syncXStocksData}
                  disabled={isRefreshing}
                  className="p-1.5 rounded-lg bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/30 text-cyber-cyan cursor-pointer transition-all disabled:opacity-50"
                  title="Refresh Market Data & Finnhub Quotes"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-cyber-cyan absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search xStock ticker or company..."
                className="w-full bg-slate-950 border border-cyber-cyan/30 focus:border-cyber-cyan rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all font-mono"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px] font-mono">
              {categories.map((cat) => {
                const isFavCat = cat === '★ Favorites';
                const isSelected = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg shrink-0 transition-all font-bold cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? isFavCat
                          ? 'bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                          : 'bg-cyber-cyan text-slate-950 shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                        : isFavCat
                        ? 'bg-slate-950 text-amber-400 hover:text-amber-300 hover:bg-slate-900 border border-amber-500/30'
                        : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {isFavCat && <Star className={`w-3 h-3 ${isSelected ? 'fill-slate-950' : 'fill-amber-400'}`} />}
                    <span>{isFavCat ? `Favorites (${favorites.length})` : cat}</span>
                  </button>
                );
              })}
            </div>

            {/* Tickers Scrollable List */}
            <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredStocks.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center space-y-2">
                  <Star className="w-7 h-7 text-amber-400/40 mx-auto" />
                  <p className="text-slate-300 text-xs font-mono font-bold">
                    {categoryFilter === '★ Favorites' ? 'No favorites added yet' : 'No matching xStocks found'}
                  </p>
                  <p className="text-slate-500 text-[11px] font-mono">
                    {categoryFilter === '★ Favorites'
                      ? 'Click the star icon on any asset card to save it to your quick-access favorites list.'
                      : 'Try adjusting your search query or category filter.'}
                  </p>
                  {categoryFilter === '★ Favorites' && (
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('All')}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyber-cyan text-xs font-mono font-bold transition-all cursor-pointer border border-cyber-cyan/30 mt-2"
                    >
                      Browse All xStocks
                    </button>
                  )}
                </div>
              ) : (
                filteredStocks.map((item) => {
                  const quote = stockQuotes[item.symbol.toUpperCase()];
                  const isSelected = selectedStock.symbol === item.symbol;
                  const isPos = (quote?.change24h ?? 0) >= 0;
                  const itemIsFav = isFavorite(item.symbol);
                  const stockAlerts = alerts.filter(a => a.symbol.toUpperCase() === item.symbol.toUpperCase());
                  const hasTriggeredAlert = stockAlerts.some(a => a.triggered);
                  const hasActiveAlert = stockAlerts.some(a => a.active && !a.triggered);

                  return (
                    <div
                      key={item.symbol}
                      onClick={() => setSelectedStock(item)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 group relative ${
                        isSelected
                          ? 'bg-cyber-cyan/15 border-cyber-cyan shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                          : 'bg-slate-950/80 border-slate-800/80 hover:border-cyber-cyan/40 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Favorite Star Button */}
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(item.symbol, e)}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer shrink-0"
                          title={itemIsFav ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star className={`w-3.5 h-3.5 ${itemIsFav ? 'fill-amber-400 text-amber-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                        </button>

                        {item.logoUrl ? (
                          <img 
                            src={item.logoUrl} 
                            alt={item.symbol} 
                            className="w-7 h-7 rounded-lg object-contain bg-slate-900 border border-slate-800 p-0.5 shrink-0" 
                            referrerPolicy="no-referrer"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-cyber-cyan/20 text-cyber-cyan font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                            {item.symbol.slice(0, 3)}
                          </div>
                        )}

                        <div className="flex flex-col truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-orbitron font-bold text-xs text-white group-hover:text-cyber-cyan transition-colors">
                              {item.symbol}
                            </span>
                            <span className="text-[9px] font-mono text-purple-300 bg-purple-500/15 px-1 rounded">
                              {item.underlyingTicker}
                            </span>
                            {/* Alert Indicator Badge */}
                            {hasTriggeredAlert ? (
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" title="Price alert triggered!" />
                            ) : hasActiveAlert ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan" title="Active price alert configured" />
                            ) : null}
                          </div>
                          <span className="text-[10px] text-slate-400 truncate">
                            {item.underlyingName}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end">
                        <div className="font-mono font-bold text-xs text-white">
                          {quote?.status === 'UNRESOLVED_DIVERGENCE' ? (
                            <span className="text-amber-400 font-semibold text-[10px]" title="Price feeds diverged beyond tolerance limit — consensus unresolved">
                              Divergent
                            </span>
                          ) : quote?.livePrice && quote.livePrice > 0 ? (
                            formatPrice(quote.livePrice)
                          ) : isRefreshing ? (
                            <span className="text-slate-500 text-[10px]">...</span>
                          ) : (
                            <span className="text-slate-500 font-normal text-[10px]">Price unavailable</span>
                          )}
                        </div>
                        
                        {/* Peg deviation indicator or 24h change */}
                        {quote?.status === 'UNRESOLVED_DIVERGENCE' ? (
                          <div className="text-[9.5px] font-mono text-amber-400/90 font-bold">Peg: Unresolved</div>
                        ) : typeof quote?.pegDeviationPct === 'number' ? (
                          <div className={`text-[9.5px] font-mono font-bold ${
                            Math.abs(quote.pegDeviationPct) < 0.5 
                              ? 'text-emerald-400' 
                              : Math.abs(quote.pegDeviationPct) < 2.0 
                              ? 'text-amber-400' 
                              : 'text-rose-400'
                          }`}>
                            Peg: {quote.pegDeviationPct >= 0 ? '+' : ''}{quote.pegDeviationPct.toFixed(2)}%
                          </div>
                        ) : quote && quote.livePrice && quote.livePrice > 0 && typeof quote.change24h === 'number' ? (
                          <div className={`text-[9.5px] font-mono font-bold ${
                            isPos ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {isPos ? '+' : ''}{quote.change24h.toFixed(2)}%
                          </div>
                        ) : (
                          <div className="text-[9.5px] font-mono text-slate-600">Peg: N/A</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Backed Token Collateralization Notice */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-2 text-cyber-cyan font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>1:1 Collateralized Architecture</span>
            </div>
            <p className="leading-relaxed">
              xStocks are tokenized tracker certificates issued under the Swiss DLT Act. Underlying stocks are held in custody by regulated Swiss custodians.
            </p>
          </div>
        </div>

        {/* Right Column (8 cols): Active xStock Terminal View */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Active Stock Quick Header Toolbar (Favorites & Price Alert Controls) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-cyber-bg-card to-slate-950 border border-cyber-cyan/35 shadow-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleFavorite(selectedStock.symbol)}
                className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                  isFavorite(selectedStock.symbol)
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white hover:border-amber-400/50'
                }`}
                title={isFavorite(selectedStock.symbol) ? 'Remove from favorites' : 'Pin to favorites list'}
              >
                <Star className={`w-4 h-4 ${isFavorite(selectedStock.symbol) ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span>{isFavorite(selectedStock.symbol) ? 'Favorited' : 'Add to Favorites'}</span>
              </button>

              <div className="h-5 w-[1px] bg-slate-800" />

              <div className="font-mono text-xs text-slate-400 flex items-center gap-1.5">
                <span className="text-white font-bold">{selectedStock.symbol}</span>
                <span>•</span>
                <span className="text-purple-300 font-bold">{selectedStock.underlyingTicker}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTestTriggerAlert(selectedStock)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-500/40 hover:border-purple-400 text-purple-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Send a sample simulated UI alert for this stock"
              >
                <Play className="w-3.5 h-3.5 text-purple-400" />
                <span>Test Alert</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAlertModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyber-cyan to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Set Price Alert</span>
              </button>
            </div>
          </div>

          {/* Active Stock Interactive Price Chart */}
          <XStockPriceChart 
            symbol={selectedStock.symbol}
            name={selectedStock.name}
            underlyingTicker={selectedStock.underlyingTicker}
            coingeckoId={selectedStock.coingeckoId}
            coingeckoRwaId={selectedStock.coingeckoRwaId}
            currentPrice={activeQuote?.livePrice}
            change24h={activeQuote?.change24h}
            volume24h={activeQuote?.volume24h}
            isMarketOpen={marketHours.isOpen}
          />

          {/* Dedicated Free Public Verification & Telemetry Panel */}
          <XStockVerificationPanel
            selectedStock={selectedStock}
            activeQuote={activeQuote}
            marketHours={marketHours}
            isRefreshingQuotes={isRefreshing}
            onRefreshAll={syncXStocksData}
            rwaDetail={activeRwaDetail}
            rwaIssuerDetail={activeRwaIssuer}
            isLoadingRwa={isLoadingRwaMeta}
          />

          {/* Market Data Cross-Check & Finnhub Equity Feeds Breakdown Box */}
          <div className="p-5 rounded-2xl bg-cyber-bg-card/90 border border-cyber-cyan/30 backdrop-blur-md shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-cyber-cyan/15 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyber-cyan" />
                <span className="font-orbitron font-bold text-xs sm:text-sm text-white uppercase tracking-wide">
                  Market Data Cross-Check &amp; Equity Feeds ({selectedStock.symbol})
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                activeQuote?.status === 'LIVE_DUAL_ORACLE'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : activeQuote?.status === 'SINGLE_ORACLE'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : activeQuote?.status === 'UNRESOLVED_DIVERGENCE'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {activeQuote?.status === 'LIVE_DUAL_ORACLE' 
                  ? 'Dual Source Cross-Checked' 
                  : activeQuote?.status === 'SINGLE_ORACLE'
                  ? 'Single Aggregator Feed'
                  : activeQuote?.status === 'UNRESOLVED_DIVERGENCE'
                  ? '⚠️ Unresolved Divergence'
                  : 'Data Unavailable'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              {/* CoinGecko Native RWA Feed (Tokenized Market Quote) */}
              <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span className="text-cyan-300 font-bold">CoinGecko RWA (Tokenized Market)</span>
                  <span className={`w-2 h-2 rounded-full ${
                    (activeQuote?.rwaPrice || activeQuote?.cgPrice) ? 'bg-cyan-400' : 'bg-slate-600'
                  }`} />
                </div>
                <div className="text-sm font-bold text-white">
                  {(activeQuote?.rwaPrice || activeQuote?.cgPrice) ? formatPrice(activeQuote.rwaPrice || activeQuote.cgPrice!) : 'No direct quote'}
                </div>
                <div className="text-[9.5px] text-cyan-400/80">
                  RWA ID: {selectedStock.coingeckoRwaId || selectedStock.coingeckoId} • Tokenized Price
                </div>
              </div>

              {/* Finnhub Equity Reference (Underlying Equity Reference) */}
              <div className="p-3 rounded-xl bg-slate-950 border border-purple-900/50 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span className="text-purple-300 font-bold">Finnhub (Underlying Equity)</span>
                  <span className={`w-2 h-2 rounded-full ${
                    activeQuote?.equityPrice ? 'bg-purple-400' : 'bg-slate-600'
                  }`} />
                </div>
                <div className="text-sm font-bold text-white">
                  {activeQuote?.equityPrice ? formatPrice(activeQuote.equityPrice) : 'Basis check unavailable'}
                </div>
                <div className="text-[9.5px] text-purple-400/80 flex items-center justify-between">
                  <span>Ticker: {selectedStock.underlyingTicker}</span>
                  <span>{activeQuote?.equityQuote?.basisLabel || (marketHours.isOpen ? 'Live Equity Basis' : 'Last Close / After-Hours Basis')}</span>
                </div>
              </div>

              {/* CoinMarketCap Secondary Cross-Check */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>CoinMarketCap (CMC Cross-Check)</span>
                  <span className={`w-2 h-2 rounded-full ${
                    activeQuote?.cmcPrice ? 'bg-emerald-400' : 'bg-slate-600'
                  }`} />
                </div>
                <div className="text-sm font-bold text-white">
                  {activeQuote?.cmcPrice ? formatPrice(activeQuote.cmcPrice) : 'No direct quote'}
                </div>
                <div className="text-[9.5px] text-slate-500">
                  Market Cross-Check: {selectedStock.cmcSymbol}
                </div>
              </div>
            </div>

            {/* Token Specifications */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
              <div>
                <span className="text-[9px] text-slate-500 block">PRIMARY CHAIN</span>
                <span className="text-white font-bold">{selectedStock.chain}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">UNDERLYING EXCHANGE</span>
                <span className="text-white font-bold">{selectedStock.exchange}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">ISSUER</span>
                <span className="text-white font-bold">{selectedStock.issuer}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">CATEGORY</span>
                <span className="text-white font-bold">{selectedStock.category}</span>
              </div>
            </div>
          </div>

          {/* Underlying Asset Information Box */}
          <div className="p-5 rounded-2xl bg-slate-950/90 border border-cyber-cyan/20 space-y-2">
            <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
              About {selectedStock.name} ({selectedStock.symbol})
            </h4>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {selectedStock.description}
            </p>
          </div>

        </div>
      </div>

      {/* Price Alert Configuration & Management Modal */}
      <XStockAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        selectedStock={selectedStock}
        currentQuote={activeQuote}
        stockQuotes={stockQuotes}
        allStocks={XSTOCKS_REGISTRY}
        alerts={alerts}
        onAddAlert={handleAddAlert}
        onDeleteAlert={handleDeleteAlert}
        onToggleAlert={handleToggleAlert}
        onResetAlert={handleResetAlert}
        onTestTriggerAlert={handleTestTriggerAlert}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
      />
    </div>
  );
}
