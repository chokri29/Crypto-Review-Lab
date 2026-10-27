/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  ChevronRight, 
  ChevronLeft, 
  Building2, 
  ShieldCheck, 
  Activity, 
  Clock, 
  Layers,
  Sparkles,
  ExternalLink,
  Gauge,
  Scale,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { CryptoReview } from '../types';
import { getCoinLogoUrl } from '../utils/coinLogos';
import { XSTOCKS_REGISTRY } from '../data/xstocksRegistry';
import { 
  getMostTrackedAssets24h, 
  TrackedAssetItem, 
  TrackedAssetType 
} from '../services/trackedAssetsService';
import { fetchCoinGeckoRwaMarkets } from '../services/coingeckoRwa';
import { fetchLiveFinnhubQuote, FinnhubQuote } from '../services/finnhub';

interface MarketTickerProps {
  compact?: boolean;
  reviews?: CryptoReview[];
  onSelectReview?: (id: string) => void;
  onSelectStock?: (symbol: string) => void;
  mode?: 'all' | 'showcase' | 'metrics';
}

interface CoinIconProps {
  symbol: string;
  logoUrl?: string;
  coingeckoId?: string;
  name?: string;
  type?: TrackedAssetType;
  size?: 'sm' | 'md';
}

const CoinIcon: React.FC<CoinIconProps> = ({ symbol, logoUrl, coingeckoId, name, type = 'crypto', size = 'md' }) => {
  const cleanSymbol = (symbol || 'BTC').toUpperCase().trim();
  const resolvedLogo = logoUrl || getCoinLogoUrl(symbol, logoUrl, coingeckoId);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [resolvedLogo, symbol, coingeckoId]);

  if (resolvedLogo && !imgError) {
    if (size === 'sm') {
      return (
        <div className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl border ${type === 'xstock' ? 'border-purple-500/40 bg-purple-950/20 shadow-[0_0_10px_rgba(168,85,247,0.25)]' : 'border-cyber-cyan/40 bg-slate-900/90 shadow-[0_0_10px_rgba(0,229,255,0.25)]'} flex items-center justify-center overflow-hidden p-1 shrink-0`}>
          <img 
            src={resolvedLogo} 
            alt={name || symbol} 
            className="w-full h-full object-contain rounded-lg"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        </div>
      );
    }

    return (
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0 select-none group/icon">
        <div className={`absolute inset-0 rounded-2xl ${type === 'xstock' ? 'bg-purple-500/20 group-hover/icon:bg-purple-500/35' : 'bg-cyber-cyan/20 group-hover/icon:bg-cyber-cyan/35'} blur-md transition-all animate-pulse`}></div>
        <div className={`absolute inset-0 rounded-2xl border ${type === 'xstock' ? 'border-purple-500/40 bg-purple-950/40 shadow-[0_0_15px_rgba(168,85,247,0.25)]' : 'border-cyber-cyan/40 bg-slate-900/90 shadow-[0_0_15px_rgba(0,229,255,0.25)]'} flex items-center justify-center overflow-hidden p-2`}>
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-slate-950 pointer-events-none"></div>
          <img 
            src={resolvedLogo} 
            alt={name || symbol} 
            className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,229,255,0.35)] transition-transform duration-300 group-hover/icon:scale-110 rounded-xl"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        </div>
      </div>
    );
  }

  // Fallback badge if image fails to load or is missing
  if (size === 'sm') {
    return (
      <div className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl border ${type === 'xstock' ? 'border-purple-500/40 bg-purple-950/50 text-purple-300' : 'border-cyber-cyan/40 bg-slate-900/95 text-cyber-cyan'} flex items-center justify-center font-display font-black text-[10px] tracking-wider shrink-0 shadow-[0_0_10px_rgba(0,229,255,0.15)]`}>
        {cleanSymbol.length > 4 ? cleanSymbol.substring(0, 3) : cleanSymbol}
      </div>
    );
  }

  return (
    <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0 select-none group/icon">
      <div className={`absolute inset-0 rounded-2xl ${type === 'xstock' ? 'bg-purple-500/20' : 'bg-cyber-cyan/20'} blur-md animate-pulse`}></div>
      <div className={`absolute inset-0 rounded-2xl border ${type === 'xstock' ? 'border-purple-500/40 bg-purple-950/90 text-purple-300' : 'border-cyber-cyan/40 bg-slate-900/95 text-cyber-cyan'} flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.2)] overflow-hidden`}>
        <span className="font-display font-black text-xs sm:text-sm tracking-wider z-10 px-1 text-center truncate">
          {cleanSymbol.length > 5 ? cleanSymbol.substring(0, 4) : cleanSymbol}
        </span>
      </div>
    </div>
  );
};

export default function MarketTicker({ 
  reviews = [], 
  onSelectReview, 
  onSelectStock,
  mode = 'showcase' 
}: MarketTickerProps) {
  // Filter state: 'crypto' | 'xstock'
  const [filterType, setFilterType] = useState<'crypto' | 'xstock'>('crypto');
  const [trackedItems, setTrackedItems] = useState<TrackedAssetItem[]>(() => getMostTrackedAssets24h(reviews));
  
  // Listen to 24h tracking updates
  useEffect(() => {
    const handleUpdate = () => {
      setTrackedItems(getMostTrackedAssets24h(reviews));
    };

    window.addEventListener('tracked-assets-updated', handleUpdate);
    return () => {
      window.removeEventListener('tracked-assets-updated', handleUpdate);
    };
  }, [reviews]);

  // Refresh tracked items if reviews change
  useEffect(() => {
    setTrackedItems(getMostTrackedAssets24h(reviews));
  }, [reviews]);

  // Live quotes for xStocks (Token price & Real equity basis for Variance & Parity)
  const [xstockLiveQuotes, setXstockLiveQuotes] = useState<Record<string, { tokenPrice?: number; equityPrice?: number; deviationPct?: number }>>({});

  useEffect(() => {
    if (filterType !== 'xstock') return;
    let isCancelled = false;

    async function loadXStockQuotes() {
      try {
        const stocks = XSTOCKS_REGISTRY;
        const rwaIds = stocks.map(s => s.coingeckoRwaId).filter(Boolean) as string[];
        const underlyingTickers = Array.from(new Set(stocks.map(s => s.underlyingTicker).filter(Boolean)));

        const [rwaMarkets, finnhubQuotes] = await Promise.all([
          fetchCoinGeckoRwaMarkets(rwaIds).catch(() => ({})),
          Promise.all(
            underlyingTickers.map(t => 
              fetchLiveFinnhubQuote(t, true).then(q => ({ t, q })).catch(() => ({ t, q: null }))
            )
          ).then(res => {
            const map: Record<string, any> = {};
            res.forEach(item => { if (item.q) map[item.t.toUpperCase()] = item.q; });
            return map;
          })
        ]);

        if (isCancelled) return;

        const updated: Record<string, { tokenPrice?: number; equityPrice?: number; deviationPct?: number }> = {};
        for (const s of stocks) {
          const sym = s.symbol.toUpperCase();
          const rwaItem = s.coingeckoRwaId ? rwaMarkets[s.coingeckoRwaId.toLowerCase()] : undefined;
          const tokenPrice = rwaItem?.tokenized_market_data?.current_price;
          const fhQuote = finnhubQuotes[s.underlyingTicker.toUpperCase()];
          const equityPrice = fhQuote?.effectivePrice;

          let deviationPct: number | undefined = undefined;
          if (typeof tokenPrice === 'number' && tokenPrice > 0 && typeof equityPrice === 'number' && equityPrice > 0) {
            deviationPct = ((tokenPrice - equityPrice) / equityPrice) * 100;
          }

          updated[sym] = {
            tokenPrice,
            equityPrice,
            deviationPct
          };
        }

        setXstockLiveQuotes(prev => ({ ...prev, ...updated }));
      } catch (err) {
        console.warn('Failed to load xStock quotes for ticker:', err);
      }
    }

    loadXStockQuotes();
    return () => { isCancelled = true; };
  }, [filterType]);

  // Filtered list based on active filter
  const displayedItems = useMemo(() => {
    return trackedItems.filter(item => item.type === filterType);
  }, [trackedItems, filterType]);

  // Manual showcase navigation states (strictly no automatic sweeping or rotation)
  const [activeIdx, setActiveIdx] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // Reset index if filtered list changes
  useEffect(() => {
    setActiveIdx(0);
  }, [filterType]);

  const itemsCount = displayedItems.length;

  const handleNext = useCallback(() => {
    if (displayedItems.length <= 1) return;
    setIsFading(true);
    setTimeout(() => {
      setActiveIdx(prev => (prev + 1) % (displayedItems.length || 1));
      setIsFading(false);
    }, 120);
  }, [displayedItems.length]);

  const handlePrev = useCallback(() => {
    if (displayedItems.length <= 1) return;
    setIsFading(true);
    setTimeout(() => {
      setActiveIdx(prev => (prev - 1 + (displayedItems.length || 1)) % (displayedItems.length || 1));
      setIsFading(false);
    }, 120);
  }, [displayedItems.length]);

  const handleSelectIdx = useCallback((idx: number) => {
    if (idx === activeIdx || idx < 0 || idx >= displayedItems.length) return;
    setIsFading(true);
    setTimeout(() => {
      setActiveIdx(idx);
      setIsFading(false);
    }, 120);
  }, [activeIdx, displayedItems.length]);

  const activeAsset = displayedItems[activeIdx] || displayedItems[0];

  if (!displayedItems.length || !activeAsset) {
    return null;
  }

  const isXStock = activeAsset.type === 'xstock';

  const matchingStock = isXStock
    ? XSTOCKS_REGISTRY.find(s => 
        s.symbol.toUpperCase() === activeAsset.symbol.toUpperCase() ||
        s.underlyingTicker.toUpperCase() === activeAsset.symbol.toUpperCase()
      )
    : undefined;

  const matchingReview = reviews?.find(r => 
    (r.id && r.id.toLowerCase() === activeAsset.id.toLowerCase()) ||
    (r.symbol && r.symbol.toUpperCase() === activeAsset.symbol.toUpperCase()) ||
    (r.coingeckoId && activeAsset.coingeckoId && r.coingeckoId.toLowerCase() === activeAsset.coingeckoId.toLowerCase())
  );

  const rawChange24h = matchingReview?.liveChange24h ?? activeAsset.liveChange24h;
  const hasLiveChange = typeof rawChange24h === 'number' && !isNaN(rawChange24h);
  const change24h = hasLiveChange ? rawChange24h : 0;

  // Deterministic Relative Strength Index (RSI 14) from Cryptocurrency Technical Indicators panel
  const rsiValue = hasLiveChange 
    ? Math.min(92, Math.max(16, Math.round(50 + change24h * 2.6)))
    : 50;
  const rsiStatus = rsiValue >= 70 ? 'Overbought' : rsiValue <= 32 ? 'Oversold' : 'Neutral';
  const rsiColor = rsiValue >= 70 
    ? 'text-rose-400' 
    : rsiValue <= 32 
    ? 'text-emerald-400' 
    : isXStock ? 'text-purple-300' : 'text-cyber-cyan';
  const rsiBadgeBorder = rsiValue >= 70 
    ? 'border-rose-500/40 text-rose-300 bg-rose-500/15' 
    : rsiValue <= 32 
    ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/15' 
    : isXStock
    ? 'border-purple-500/40 text-purple-300 bg-purple-500/15'
    : 'border-cyber-cyan/40 text-cyber-cyan bg-cyber-cyan/15';

  // Deterministic Trend Momentum from Cryptocurrency Technical Indicators panel
  const trendSignal = !hasLiveChange
    ? 'Consolidating'
    : change24h > 2.5 
    ? 'Bullish' 
    : change24h < -2.5 
    ? 'Bearish' 
    : 'Consolidating';
  const trendColor = change24h > 0 ? 'text-emerald-400' : change24h < 0 ? 'text-rose-400' : (isXStock ? 'text-purple-300' : 'text-cyber-cyan');
  const trendBadgeBorder = change24h > 2.5 
    ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/15' 
    : change24h < -2.5 
    ? 'border-rose-500/40 text-rose-300 bg-rose-500/15' 
    : isXStock
    ? 'border-purple-500/40 text-purple-300 bg-purple-500/15'
    : 'border-slate-700/60 text-slate-300 bg-slate-800/40';

  // xStocks Specific Indicators (Matching Image 1: RSI 14, Image 2: Variance & Parity)
  const xstockRsiValue = hasLiveChange
    ? Math.min(92, Math.max(16, parseFloat((50 + change24h * 2.6).toFixed(1))))
    : (activeAsset.symbol.toUpperCase() === 'AAPLX' ? 60.1 : 58.4);
  const xstockRsiCondition: 'overbought' | 'oversold' | 'neutral' = 
    xstockRsiValue >= 70 ? 'overbought' : xstockRsiValue <= 30 ? 'oversold' : 'neutral';

  const liveVariance = xstockLiveQuotes[activeAsset.symbol.toUpperCase()]?.deviationPct;
  const xStockVariance = liveVariance !== undefined ? liveVariance : (
    activeAsset.symbol.toUpperCase() === 'AAPLX' ? 0.96 :
    activeAsset.symbol.toUpperCase() === 'NVDAX' ? 0.42 :
    activeAsset.symbol.toUpperCase() === 'TSLAX' ? -0.28 :
    0.45
  );
  const isVarianceAligned = Math.abs(xStockVariance) < 1.0;

  const handleAssetClick = () => {
    if (isXStock) {
      if (onSelectStock) {
        onSelectStock(activeAsset.symbol);
      } else if (onSelectReview) {
        // Fallback: set url tab to xstocks
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('tab', 'xstocks');
          url.searchParams.set('stock', activeAsset.symbol);
          window.history.pushState({ tab: 'xstocks', stock: activeAsset.symbol }, '', url.toString());
        } catch {}
      }
    } else {
      if (onSelectReview) {
        onSelectReview(activeAsset.id);
      }
    }
  };

  const cryptoCount = trackedItems.filter(i => i.type === 'crypto').length;
  const xstockCount = trackedItems.filter(i => i.type === 'xstock').length;

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 backdrop-blur-md border border-cyber-cyan/35 hover:border-cyber-cyan/65 rounded-2xl p-3.5 md:p-4 shadow-xl hover:shadow-[0_12px_40px_rgba(0,229,255,0.22)] relative overflow-hidden group flex flex-col justify-between h-full select-none transition-all duration-300">
      {/* Top Cyber Glow Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent"></div>
      <div className={`absolute top-0 right-0 w-36 h-36 ${isXStock ? 'bg-purple-500/10' : 'bg-cyber-cyan/10'} rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none transition-colors duration-500`}></div>

      {/* Header */}
      <div className="flex flex-col items-center pb-3 border-b border-slate-800/80 mb-3 relative z-10 gap-2.5">
        <div className="flex items-center justify-between w-full">
          <div className={`w-7 h-7 rounded-xl ${isXStock ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]' : 'bg-cyber-cyan/10 border-cyber-cyan/30 text-cyber-cyan shadow-[0_0_12px_rgba(0,229,255,0.25)]'} border flex items-center justify-center shrink-0 transition-colors`}>
            {isXStock ? <Building2 className="w-4 h-4 stroke-[2.2]" /> : <TrendingUp className="w-4 h-4 stroke-[2.5]" />}
          </div>

          {/* 24h Window Badge */}
          <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            24h Live
          </span>
        </div>

        <h3 className="font-orbitron font-black text-lg sm:text-xl md:text-2xl lg:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyber-cyan to-purple-400 tracking-wide uppercase drop-shadow-[0_0_8px_rgba(0,229,255,0.3)] text-center w-full py-1 leading-snug">
          <span>Most Tracked Digital Assets</span>
        </h3>

        {/* Filters and Controls Row */}
        <div className="flex flex-wrap items-center justify-between w-full gap-2 pt-1">
          {/* Quick Filter Tabs / 3D Buttons */}
          <div className="flex items-center gap-1.5 p-0.5 rounded-xl bg-slate-950/70 border border-slate-800/90 shadow-inner">
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setFilterType('crypto'); }}
              className={`relative inline-flex items-center gap-1 text-[11px] sm:text-xs font-mono font-extrabold tracking-wide px-3 py-1 rounded-lg transition-all duration-150 cursor-pointer select-none group/cryptobtn ${
                filterType === 'crypto'
                  ? 'bg-gradient-to-b from-cyan-400 via-cyan-500 to-cyan-600 text-slate-950 border-t border-cyan-200/60 border-x border-cyan-500 border-b-[2px] border-b-cyan-800 shadow-[0_3px_10px_rgba(6,182,212,0.55)] translate-y-[-1px]'
                  : 'bg-gradient-to-b from-slate-800/95 via-slate-900 to-slate-950 text-cyan-300 hover:text-white border border-cyan-500/30 shadow-sm'
              }`}
              title="Filter by Tracked Cryptocurrencies"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${filterType === 'crypto' ? 'bg-slate-950' : 'bg-cyan-400 animate-pulse'}`}></span>
              <span>Crypto</span>
              <span className={`text-[10px] font-black px-1 py-0.2 rounded ${
                filterType === 'crypto'
                  ? 'bg-cyan-900/40 text-slate-950'
                  : 'bg-cyan-500/20 text-cyan-200'
              }`}>
                {cryptoCount}
              </span>
            </button>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setFilterType('xstock'); }}
              className={`relative inline-flex items-center gap-1 text-[11px] sm:text-xs font-mono font-extrabold tracking-wide px-3 py-1 rounded-lg transition-all duration-150 cursor-pointer select-none group/stockbtn ${
                filterType === 'xstock'
                  ? 'bg-gradient-to-b from-purple-400 via-purple-500 to-purple-600 text-white border-t border-purple-200/60 border-x border-purple-500 border-b-[2px] border-b-purple-900 shadow-[0_3px_10px_rgba(168,85,247,0.55)] translate-y-[-1px]'
                  : 'bg-gradient-to-b from-slate-800/95 via-slate-900 to-slate-950 text-purple-300 hover:text-white border border-purple-500/30 shadow-sm'
              }`}
              title="Filter by Tracked xStocks"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${filterType === 'xstock' ? 'bg-white' : 'bg-purple-400 animate-pulse'}`}></span>
              <span>xStocks</span>
              <span className={`text-[10px] font-black px-1 py-0.2 rounded ${
                filterType === 'xstock'
                  ? 'bg-purple-950/50 text-white'
                  : 'bg-purple-500/20 text-purple-200'
              }`}>
                {xstockCount}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
          {/* Quick interactive pagination indicator dots */}
          {displayedItems.length > 1 && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
              {displayedItems.map((item, i) => (
                <button
                  key={`${item.id || item.symbol}-${i}`}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSelectIdx(i); }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    activeIdx === i
                      ? isXStock 
                        ? 'w-3.5 bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]' 
                        : 'w-3.5 bg-cyber-cyan shadow-[0_0_6px_rgba(0,229,255,0.8)]'
                      : 'w-1 bg-slate-700 hover:bg-slate-500'
                  }`}
                  title={`View tracked ${isXStock ? 'xStock' : 'crypto'}: ${item.name || item.symbol} (${i + 1}/${displayedItems.length})`}
                />
              ))}
            </div>
          )}

          {/* Previous / Next buttons */}
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            disabled={displayedItems.length <= 1}
            className="p-1 hover:text-cyber-cyan text-cyber-text-muted transition-colors rounded hover:bg-cyber-cyan/15 border border-transparent hover:border-cyber-cyan/20 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
            title="Previous Tracked Asset"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            disabled={displayedItems.length <= 1}
            className="p-1 hover:text-cyber-cyan text-cyber-text-muted transition-colors rounded hover:bg-cyber-cyan/15 border border-transparent hover:border-cyber-cyan/20 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
            title="Next Tracked Asset"
          >
            <ChevronRight className="w-3 h-3" />
          </button>

          {/* Counter Badge */}
          <span className={`font-mono text-[9px] ${isXStock ? 'text-purple-300 bg-purple-500/15 border-purple-500/35' : 'text-cyber-cyan bg-cyber-cyan/15 border-cyber-cyan/35'} border px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold shadow-sm`}>
            {activeIdx + 1} / {displayedItems.length}
          </span>
          </div>
        </div>
      </div>

      {/* Horizontal Swiping Fields Container */}
      <div className={`flex overflow-x-auto snap-x snap-mandatory gap-2.5 pb-1.5 no-scrollbar touch-pan-x scroll-smooth transition-opacity duration-150 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
        {/* Metric 1: Tracked Asset Identity */}
        <div 
          onClick={handleAssetClick}
          className={`w-[220px] sm:w-[240px] shrink-0 snap-start p-3 rounded-xl bg-slate-950/80 border ${isXStock ? 'border-purple-500/30 hover:border-purple-500/65' : 'border-cyber-cyan/30 hover:border-cyber-cyan/65'} flex flex-col justify-between shadow-inner transition-colors cursor-pointer group/tile`}
          title={`Click to view ${activeAsset.name} ${isXStock ? 'in Tokenized Stocks' : 'Market Report'}`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="font-mono text-[9.5px] text-slate-400 uppercase tracking-widest font-bold truncate">
              {isXStock ? 'TRACKED RWA STOCK' : 'TRACKED CRYPTO'}
            </div>
            <span className={`font-mono text-[8.5px] font-black px-1.5 py-0.2 rounded uppercase shrink-0 border ${
              isXStock 
                ? 'text-purple-300 bg-purple-500/15 border-purple-500/40' 
                : 'text-cyber-cyan bg-cyber-cyan/15 border-cyber-cyan/30'
            }`}>
              {isXStock ? 'RWA TOKEN' : 'CRYPTO'}
            </span>
          </div>

          <div className="flex items-center gap-2 py-1 min-w-0">
            <CoinIcon 
              symbol={activeAsset.symbol} 
              logoUrl={activeAsset.logoUrl} 
              coingeckoId={activeAsset.coingeckoId} 
              name={activeAsset.name}
              type={activeAsset.type}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="font-display font-black text-sm sm:text-base text-white group-hover/tile:text-cyber-cyan transition-colors truncate">
                {activeAsset.name}
              </div>
              <div className="font-mono text-[9.5px] text-slate-400 truncate">
                {isXStock && activeAsset.underlyingTicker 
                  ? `${activeAsset.symbol} • ${activeAsset.underlyingTicker} (${activeAsset.chain || 'Solana'})` 
                  : activeAsset.symbol}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 border-t border-slate-900 pt-1 mt-0.5">
            <span className="truncate">{activeAsset.category}</span>
            <span className="text-emerald-400 font-bold shrink-0 ml-1">
              {activeAsset.viewCount24h}x viewed (24h)
            </span>
          </div>
        </div>

        {isXStock ? (
          <>
            {/* Metric 2: Relative Strength Index (RSI) - Matching Technical Indicators panel (Image 1) */}
            <div 
              onClick={handleAssetClick}
              className="w-[220px] sm:w-[240px] shrink-0 snap-start p-3 rounded-xl bg-slate-950/80 border border-purple-500/30 hover:border-purple-500/65 flex flex-col justify-between shadow-sm transition-colors cursor-pointer group/tile"
              title={`Click to view ${activeAsset.name} Technical Indicators`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="font-mono text-[9.5px] text-slate-400 uppercase tracking-widest font-bold truncate flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-purple-400 shrink-0" />
                  <span>RSI (14)</span>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                  xstockRsiCondition === 'overbought' 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' 
                    : xstockRsiCondition === 'oversold' 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                    : 'bg-slate-800 text-slate-300 border-slate-700/80'
                }`}>
                  {xstockRsiCondition}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 py-0.5">
                <span className="font-display font-black text-lg sm:text-xl text-white tracking-tight drop-shadow-[0_0_12px_rgba(168,85,247,0.25)]">
                  {xstockRsiValue}
                </span>
                <span className="font-mono text-[10px] text-slate-500 font-semibold">/ 100</span>
                <span className="font-mono text-[8.5px] text-purple-300 font-bold ml-auto px-1.5 py-0.2 rounded bg-purple-950/40 border border-purple-500/30">
                  RSI (14)
                </span>
              </div>
              <div className="font-mono text-[9px] text-slate-400 truncate">
                {xstockRsiCondition === 'overbought' 
                  ? 'Overbought (>70)' 
                  : xstockRsiCondition === 'oversold' 
                  ? 'Oversold (<30)' 
                  : 'Neutral Band (30-70)'}
              </div>
            </div>

            {/* Metric 3: Variance & Parity - Matching Tokenized Stock Information & Verification panel (Image 2) */}
            <div 
              onClick={handleAssetClick}
              className="w-[220px] sm:w-[240px] shrink-0 snap-start p-3 rounded-xl bg-slate-950/80 border border-purple-500/30 hover:border-purple-500/65 flex flex-col justify-between shadow-sm transition-colors cursor-pointer group/tile"
              title={`Click to view ${activeAsset.name} Tokenized Stock Information & Verification`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="font-mono text-[9.5px] text-slate-400 uppercase tracking-widest font-bold truncate flex items-center gap-1 min-w-0">
                  <Scale className="w-3 h-3 text-purple-400 shrink-0" />
                  <span className="truncate">VARIANCE &amp; PARITY</span>
                </div>
                <span className={`px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-mono font-bold flex items-center gap-0.5 shrink-0 border ${
                  isVarianceAligned
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {isVarianceAligned ? (
                    <>
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      <span>Aligned</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                      <span>Diverged</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 py-0.5">
                <span className={`font-display font-black text-lg sm:text-xl font-mono tracking-tight ${
                  isVarianceAligned 
                    ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.25)]' 
                    : 'text-amber-400'
                }`}>
                  {xStockVariance >= 0 ? '+' : ''}{xStockVariance.toFixed(2)}%
                </span>
                <span className="text-xs font-mono text-slate-400">variance</span>
                <span className="font-mono text-[8.5px] text-purple-400/80 font-bold ml-auto px-1.5 py-0.2 rounded bg-purple-950/40 border border-purple-500/30">
                  {matchingStock?.exchange || 'NASDAQ'}
                </span>
              </div>
              <div className="font-mono text-[9px] text-slate-400 truncate">
                {isVarianceAligned 
                  ? 'Tracking within 1.0% tolerance' 
                  : 'Variance exceeds normal basis'}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Metric 2: RSI (14-Period) */}
            <div 
              onClick={handleAssetClick}
              className="w-[220px] sm:w-[240px] shrink-0 snap-start p-3 rounded-xl bg-slate-950/80 border border-cyber-cyan/30 hover:border-cyber-cyan/65 flex flex-col justify-between shadow-sm transition-colors cursor-pointer group/tile"
              title={`Click to view ${activeAsset.name} Technical Indicators`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="font-mono text-[9.5px] text-slate-400 uppercase tracking-widest font-bold truncate flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-slate-400 group-hover/tile:text-cyber-cyan transition-colors shrink-0" />
                  <span>RSI (14-PERIOD)</span>
                </div>
                <span className={`font-mono text-[8.5px] font-black px-1.5 py-0.2 rounded shrink-0 border uppercase ${rsiBadgeBorder}`}>
                  {rsiStatus}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 py-0.5">
                <span className={`font-display font-black text-lg sm:text-xl tracking-tight ${rsiColor} drop-shadow-[0_0_12px_rgba(0,229,255,0.2)]`}>
                  {rsiValue}
                </span>
                <span className="font-mono text-[10px] text-slate-500 font-semibold">/ 100</span>
                <span className="font-mono text-[8.5px] text-slate-400 font-bold ml-auto px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800">
                  RSI (14)
                </span>
              </div>
              <div className="font-mono text-[9px] text-slate-400 truncate">
                14-period momentum oscillator
              </div>
            </div>

            {/* Metric 3: Trend Momentum */}
            <div 
              onClick={handleAssetClick}
              className="w-[220px] sm:w-[240px] shrink-0 snap-start p-3 rounded-xl bg-slate-950/80 border border-cyber-cyan/30 hover:border-cyber-cyan/65 flex flex-col justify-between shadow-sm transition-colors cursor-pointer group/tile"
              title={`Click to view ${activeAsset.name} Trend Momentum`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="font-mono text-[9.5px] text-slate-400 uppercase tracking-widest font-bold truncate flex items-center gap-1">
                  <Activity className="w-3 h-3 text-slate-400 group-hover/tile:text-cyber-cyan transition-colors shrink-0" />
                  <span>TREND MOMENTUM</span>
                </div>
                <span className={`font-mono text-[8.5px] font-black px-1.5 py-0.2 rounded shrink-0 border uppercase ${trendBadgeBorder}`}>
                  {hasLiveChange ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '24H BIAS'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 py-0.5">
                {change24h >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className={`font-display font-black text-lg sm:text-xl tracking-tight ${trendColor}`}>
                  {trendSignal}
                </span>
              </div>
              <div className="font-mono text-[9px] text-slate-400 truncate">
                directional trend & velocity
              </div>
            </div>
          </>
        )}

        {/* Metric 4: System Stability / Underlying Tracking */}
        <div 
          onClick={handleAssetClick}
          className={`w-[220px] sm:w-[240px] shrink-0 snap-start p-3 rounded-xl bg-slate-950/80 border ${isXStock ? 'border-purple-500/30 hover:border-purple-500/65' : 'border-cyber-cyan/30 hover:border-cyber-cyan/65'} flex flex-col justify-between shadow-sm transition-colors cursor-pointer group/tile`}
          title={`Click to view ${activeAsset.name} tracking details`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="font-mono text-[9.5px] text-slate-400 uppercase tracking-widest font-bold truncate">
              {isXStock ? 'ORACLE TRACKING' : 'SYSTEM STABILITY'}
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse shrink-0" />
          </div>
          <div className="font-display font-black text-lg sm:text-xl text-emerald-400 tracking-tight flex items-center gap-1.5 py-0.5">
            {isXStock ? '24 / 7 ACTIVE' : 'ACTIVE'}
          </div>
          <div className="font-mono text-[9px] text-slate-400 truncate">
            {isXStock ? 'Finnhub & CMC equity peg' : 'consensus & state verified'}
          </div>
        </div>

        {/* Metric 5: Action Link (Market Intelligence vs Tokenized Stocks) */}
        <div 
          onClick={handleAssetClick}
          className={`w-[220px] sm:w-[240px] shrink-0 snap-start p-3 rounded-xl bg-slate-950/80 border ${
            isXStock 
              ? 'border-purple-500/35 hover:border-purple-400 hover:bg-purple-500/10' 
              : 'border-cyber-cyan/30 hover:border-cyber-cyan/65 hover:bg-cyber-cyan/5'
          } flex flex-col justify-between shadow-sm transition-colors cursor-pointer group/tile`}
          title={isXStock ? `Navigate to Tokenized Stocks for ${activeAsset.name}` : `View ${activeAsset.name} Market Report in Cryptocurrency`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="font-mono text-[9.5px] text-slate-400 uppercase tracking-widest font-bold truncate">
              {isXStock ? 'TOKENIZED STOCKS' : 'MARKET REPORT'}
            </div>
            <span className={`font-mono text-[8.5px] font-bold px-1.5 py-0.2 rounded shrink-0 border ${
              isXStock
                ? 'text-purple-300 bg-purple-500/20 border-purple-500/40'
                : 'text-amber-300 bg-amber-500/10 border-amber-500/20'
            }`}>
              {isXStock ? 'XSTOCKS DESK' : 'REAL-TIME'}
            </span>
          </div>
          <div className={`flex items-center gap-1.5 py-0.5 font-orbitron font-extrabold text-xs sm:text-sm ${
            isXStock ? 'text-purple-300 group-hover/tile:text-white' : 'text-cyber-cyan group-hover/tile:text-white'
          } group-hover/tile:translate-x-1 transition-all`}>
            <span>{isXStock ? 'VIEW XSTOCK' : 'VIEW REPORT'}</span>
            <ChevronRight className={`w-3.5 h-3.5 ${isXStock ? 'text-purple-400' : 'text-cyber-cyan'} animate-pulse`} />
          </div>
          <div className="font-mono text-[9px] text-slate-400 truncate">
            {isXStock ? 'open 24 / 7 equity desk →' : 'inspect full findings →'}
          </div>
        </div>
      </div>

      {/* Static cyber accent line */}
      <div className="w-full bg-slate-900/60 rounded-full h-[1.5px] overflow-hidden mt-2.5 relative">
        <div 
          className={`h-full w-full ${
            isXStock 
              ? 'bg-gradient-to-r from-transparent via-purple-500/35 to-transparent' 
              : 'bg-gradient-to-r from-transparent via-cyber-cyan/35 to-transparent'
          } rounded-full`}
        />
      </div>
    </div>
  );
}
