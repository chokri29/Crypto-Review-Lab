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
  ArrowRightLeft
} from 'lucide-react';
import { 
  XSTOCKS_REGISTRY, 
  XStockRegistryItem, 
  getUsMarketHoursStatus, 
  UsMarketHoursStatus 
} from '../data/xstocksRegistry';
import XStockPriceChart from './XStockPriceChart';
import AIXStocksMarketSummary from './AIXStocksMarketSummary';
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
  circulatingSupply?: number;
  circulatingSupplyProvenance?: 'SOURCE' | 'DERIVED' | 'UNAVAILABLE';
  maxSupply?: number;
  maxSupplyProvenance?: 'SOURCE' | 'UNAVAILABLE';
  totalSupply?: number;
  totalSupplyProvenance?: 'SOURCE' | 'DERIVED' | 'UNAVAILABLE';
  fdv?: number;
  fdvProvenance?: 'SOURCE' | 'DERIVED' | 'UNAVAILABLE';
  marketCapProvenance?: 'SOURCE' | 'UNAVAILABLE';
  priceProvenance?: 'SOURCE' | 'UNAVAILABLE';
  report?: MultiSourceConvergenceReport;
  evidence?: Record<string, XStockNormalizedEvidence>;
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
        // STRICT P0 REQUIREMENT: If price consensus is unresolved/divergent or missing, livePrice MUST BE null!
        const priceMetric = convergenceResult.report.metrics.price;
        const isDivergent = priceMetric.status === 'UNRESOLVED_DIVERGENCE';
        const livePrice = isDivergent ? null : (convergenceResult.livePrice ?? priceMetric.consensusValue ?? null);
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
          state: hasRwaLivePrice ? 'VALID' : 'MISSING',
          provenanceCategory: hasRwaLivePrice ? 'SOURCE' : 'UNAVAILABLE',
          isVerificationGrade: hasRwaLivePrice
        };

        const cmcEvidence: XStockNormalizedEvidence = {
          value: isCmcValid ? cmcPrice! : null,
          source: 'SECONDARY_TOKEN_MARKET',
          dataType: 'Secondary Token Market Price (USD)',
          assetId: item.cmcSymbol,
          timestamp: (typeof cmcData?.lastUpdated === 'string' ? cmcData.lastUpdated : null),
          freshness: isCmcValid ? 'LIVE' : 'UNAVAILABLE',
          state: isCmcValid ? 'VALID' : 'MISSING',
          provenanceCategory: isCmcValid ? 'SOURCE' : 'UNAVAILABLE',
          isVerificationGrade: isCmcValid
        };

        const livePriceEvidence: XStockNormalizedEvidence = {
          value: livePrice,
          source: 'TOKENIZED_MARKET',
          dataType: 'Converged Tokenized Market Price (USD)',
          assetId: item.symbol,
          rwaId: item.coingeckoRwaId || undefined,
          timestamp: (typeof rwaMkt?.last_updated === 'string' ? rwaMkt.last_updated : (typeof cmcData?.lastUpdated === 'string' ? cmcData.lastUpdated : null)),
          freshness: livePrice !== null ? 'LIVE' : 'UNAVAILABLE',
          state: isDivergent ? 'CONTRADICTORY' : (livePrice !== null ? 'VALID' : 'MISSING'),
          provenanceCategory: livePrice !== null ? 'SOURCE' : 'UNAVAILABLE',
          isVerificationGrade: livePrice !== null && !isDivergent
        };

        const equityEvidence: XStockNormalizedEvidence = {
          value: equityPrice ?? null,
          source: 'UNDERLYING_EQUITY',
          dataType: currentHours.isOpen ? 'Live Equity Basis Price (USD)' : 'Official Close / After-Hours Price (USD)',
          assetId: item.underlyingTicker,
          timestamp: (finnhubData?.t && finnhubData.t > 0) ? new Date(finnhubData.t * 1000).toISOString() : null,
          freshness: equityPrice ? (currentHours.isOpen ? 'LIVE' : 'STALE') : 'UNAVAILABLE',
          state: equityPrice ? 'VALID' : 'MISSING',
          provenanceCategory: equityPrice ? 'SOURCE' : 'UNAVAILABLE',
          isVerificationGrade: equityPrice ? Boolean(currentHours.isOpen) : false
        };

        const volumeEvidence: XStockNormalizedEvidence = {
          value: volume24h,
          source: 'TOKENIZED_MARKET',
          dataType: 'Secondary Market 24h Volume (USD)',
          assetId: item.symbol,
          rwaId: item.coingeckoRwaId || undefined,
          timestamp: (typeof rwaMkt?.last_updated === 'string' ? rwaMkt.last_updated : null),
          freshness: volume24h !== null ? 'LIVE' : 'UNAVAILABLE',
          state: volume24h !== null ? 'VALID' : 'MISSING',
          provenanceCategory: volume24h !== null ? 'SOURCE' : 'UNAVAILABLE',
          isVerificationGrade: volume24h !== null
        };

        const marketCapEvidence: XStockNormalizedEvidence = {
          value: marketCap,
          source: 'TOKENIZED_MARKET',
          dataType: 'Circulating Market Capitalization (USD)',
          assetId: item.symbol,
          rwaId: item.coingeckoRwaId || undefined,
          timestamp: (typeof rwaMkt?.last_updated === 'string' ? rwaMkt.last_updated : null),
          freshness: marketCap !== null ? 'LIVE' : 'UNAVAILABLE',
          state: marketCap !== null ? 'VALID' : 'MISSING',
          provenanceCategory: marketCap !== null ? convergenceResult.marketCapProvenance : 'UNAVAILABLE',
          isVerificationGrade: marketCap !== null
        };

        const circSupplyEvidence: XStockNormalizedEvidence = {
          value: convergenceResult.circulatingSupply ?? null,
          source: convergenceResult.circulatingSupplyProvenance === 'SOURCE' ? 'RWA_ISSUER_FEED' : 'MATHEMATICAL_DERIVATION',
          dataType: 'Circulating Token Supply (Tokens)',
          assetId: item.symbol,
          timestamp: (typeof rwaMkt?.last_updated === 'string' ? rwaMkt.last_updated : null),
          freshness: convergenceResult.circulatingSupply ? 'LIVE' : 'UNAVAILABLE',
          state: convergenceResult.circulatingSupply ? 'VALID' : 'MISSING',
          provenanceCategory: convergenceResult.circulatingSupplyProvenance,
          isVerificationGrade: convergenceResult.circulatingSupplyProvenance === 'SOURCE',
          details: convergenceResult.circulatingSupplyProvenance === 'SOURCE'
            ? 'Reported circulating supply from primary RWA data provider.'
            : (convergenceResult.circulatingSupplyProvenance === 'DERIVED'
                ? 'Mathematically derived: Circulating Market Cap ÷ Converged Token Price.'
                : 'Circulating supply unavailable.')
        };

        const totalSupplyEvidence: XStockNormalizedEvidence = {
          value: convergenceResult.totalSupply ?? null,
          source: convergenceResult.totalSupplyProvenance === 'SOURCE' ? 'RWA_ISSUER_FEED' : 'MATHEMATICAL_DERIVATION',
          dataType: 'Total Token Supply (Tokens)',
          assetId: item.symbol,
          timestamp: (typeof rwaMkt?.last_updated === 'string' ? rwaMkt.last_updated : null),
          freshness: convergenceResult.totalSupply ? 'LIVE' : 'UNAVAILABLE',
          state: convergenceResult.totalSupply ? 'VALID' : 'MISSING',
          provenanceCategory: convergenceResult.totalSupplyProvenance,
          isVerificationGrade: convergenceResult.totalSupplyProvenance === 'SOURCE',
          details: convergenceResult.totalSupplyProvenance === 'SOURCE'
            ? 'Reported total supply from primary RWA data provider.'
            : (convergenceResult.totalSupplyProvenance === 'DERIVED'
                ? 'Mathematically derived from reported max supply or circulating supply.'
                : 'Total supply unavailable.')
        };

        const fdvEvidence: XStockNormalizedEvidence = {
          value: convergenceResult.fdvCalculated ?? null,
          source: 'MATHEMATICAL_DERIVATION',
          dataType: 'Fully Diluted Valuation (FDV) (USD)',
          assetId: item.symbol,
          timestamp: (typeof rwaMkt?.last_updated === 'string' ? rwaMkt.last_updated : null),
          freshness: convergenceResult.fdvCalculated ? 'LIVE' : 'UNAVAILABLE',
          state: convergenceResult.fdvCalculated ? 'VALID' : 'MISSING',
          provenanceCategory: convergenceResult.fdvProvenance,
          isVerificationGrade: false,
          details: convergenceResult.fdvProvenance === 'DERIVED'
            ? 'Mathematically derived: Converged Token Price × Total/Max Supply. Marked as DERIVED.'
            : 'FDV calculation unavailable due to missing supply metrics.'
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
          provenanceCategory: 'UNAVAILABLE',
          isVerificationGrade: false,
          details: 'ON_CHAIN/DEX_UNAVAILABLE: Direct DEX on-chain liquidity/pool telemetry is unavailable. Token aggregators (CoinGecko RWA, CoinMarketCap) provide secondary market observations and are not direct on-chain telemetry.'
        };

        const itemEvidence: Record<string, XStockNormalizedEvidence> = {
          coingecko_rwa_price: rwaEvidence,
          cmc_cross_check_price: cmcEvidence,
          live_price: livePriceEvidence,
          underlying_equity_price: equityEvidence,
          volume_24h: volumeEvidence,
          market_cap: marketCapEvidence,
          circulating_supply: circSupplyEvidence,
          total_supply: totalSupplyEvidence,
          fully_diluted_valuation: fdvEvidence,
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
          circulatingSupply: convergenceResult.circulatingSupply,
          circulatingSupplyProvenance: convergenceResult.circulatingSupplyProvenance,
          maxSupply: convergenceResult.maxSupply,
          maxSupplyProvenance: convergenceResult.maxSupplyProvenance,
          totalSupply: convergenceResult.totalSupply,
          totalSupplyProvenance: convergenceResult.totalSupplyProvenance,
          fdv: convergenceResult.fdvCalculated,
          fdvProvenance: convergenceResult.fdvProvenance,
          marketCapProvenance: convergenceResult.marketCapProvenance,
          priceProvenance: convergenceResult.priceProvenance,
          report: convergenceResult.report,
          evidence: itemEvidence
        };
      }

      setStockQuotes(newQuotes);
    } catch (err) {
      console.warn('Error loading xStocks data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    syncXStocksData();
  }, []);

  // Filter Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    XSTOCKS_REGISTRY.forEach(s => set.add(s.category));
    return ['All', ...Array.from(set)];
  }, []);

  const filteredStocks = useMemo(() => {
    return XSTOCKS_REGISTRY.filter(item => {
      if (categoryFilter !== 'All' && item.category !== categoryFilter) {
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
  }, [categoryFilter, searchQuery]);

  const activeQuote = stockQuotes[selectedStock.symbol.toUpperCase()];
  const { formatPrice, selectedCurrency } = useCurrency();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header Banner with US Market Hours Telemetry Badge */}
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
                const isSelected = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg shrink-0 transition-all font-bold cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-cyber-cyan text-slate-950 shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                        : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>

            {/* Tickers Scrollable List */}
            <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredStocks.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center space-y-2">
                  <p className="text-slate-300 text-xs font-mono font-bold">
                    No matching xStocks found
                  </p>
                  <p className="text-slate-500 text-[11px] font-mono">
                    Try adjusting your search query or category filter.
                  </p>
                </div>
              ) : (
                filteredStocks.map((item) => {
                  const quote = stockQuotes[item.symbol.toUpperCase()];
                  const isSelected = selectedStock.symbol === item.symbol;
                  const isPos = (quote?.change24h ?? 0) >= 0;

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
        </div>
      </div>
    </div>
  );
}
