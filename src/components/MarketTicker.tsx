/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  Pause, 
  Building2, 
  ShieldCheck, 
  Activity, 
  Clock, 
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { CryptoReview } from '../types';
import { getCoinLogoUrl } from '../utils/coinLogos';
import { 
  getMostTrackedAssets24h, 
  TrackedAssetItem, 
  TrackedAssetType 
} from '../services/trackedAssetsService';

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

  // Filtered list based on active filter
  const displayedItems = useMemo(() => {
    return trackedItems.filter(item => item.type === filterType);
  }, [trackedItems, filterType]);

  // Auto-cycling showcase states
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isFading, setIsFading] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const CYCLE_TIME = 5000; // 5 seconds per cycle

  // Reset index if filtered list changes
  useEffect(() => {
    setActiveIdx(0);
    setProgressPercent(0);
  }, [filterType]);

  const itemsCount = displayedItems.length;

  const handleNext = useCallback(() => {
    setIsFading(true);
    setTimeout(() => {
      setActiveIdx(prev => (prev + 1) % (displayedItems.length || 1));
      setProgressPercent(0);
      setIsFading(false);
    }, 150);
  }, [displayedItems.length]);

  const handlePrev = useCallback(() => {
    setIsFading(true);
    setTimeout(() => {
      setActiveIdx(prev => (prev - 1 + (displayedItems.length || 1)) % (displayedItems.length || 1));
      setProgressPercent(0);
      setIsFading(false);
    }, 150);
  }, [displayedItems.length]);

  // Auto cycle timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    if (isPlaying && itemsCount > 0) {
      const startTime = Date.now();
      
      progressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const percentage = Math.min((elapsed / CYCLE_TIME) * 100, 100);
        setProgressPercent(percentage);
      }, 50);

      timerRef.current = setTimeout(() => {
        handleNext();
      }, CYCLE_TIME);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isPlaying, activeIdx, itemsCount, handleNext]);

  const getRiskStyles = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-cyber-green bg-cyber-green/5 border-cyber-green/20';
      case 'Medium': return 'text-amber-400 bg-amber-500/5 border-amber-500/20';
      case 'High': return 'text-cyber-orange bg-cyber-orange/5 border-cyber-orange/20';
      case 'Critical': return 'text-rose-400 bg-rose-500/5 border-rose-500/20 animate-pulse';
      default: return 'text-cyber-text-secondary bg-cyber-text-secondary/5 border-cyber-text-muted/30';
    }
  };

  const activeAsset = displayedItems[activeIdx] || displayedItems[0];

  if (!displayedItems.length || !activeAsset) {
    return null;
  }

  const isXStock = activeAsset.type === 'xstock';

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
    <div className="bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 backdrop-blur-md border border-cyber-cyan/35 hover:border-cyber-cyan/65 rounded-2xl p-5 md:p-6 shadow-xl hover:shadow-[0_12px_40px_rgba(0,229,255,0.22)] relative overflow-hidden group flex flex-col justify-between h-full select-none transition-all duration-300">
      {/* Top Cyber Glow Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent"></div>
      <div className={`absolute top-0 right-0 w-36 h-36 ${isXStock ? 'bg-purple-500/10' : 'bg-cyber-cyan/10'} rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none transition-colors duration-500`}></div>

      {/* Header */}
      <div className="flex justify-between items-center pb-3.5 border-b border-slate-800/80 mb-4 relative z-10 flex-wrap gap-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className={`w-7 h-7 rounded-xl ${isXStock ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]' : 'bg-cyber-cyan/10 border-cyber-cyan/30 text-cyber-cyan shadow-[0_0_12px_rgba(0,229,255,0.25)]'} border flex items-center justify-center shrink-0 transition-colors`}>
            {isXStock ? <Building2 className="w-4 h-4 stroke-[2.2]" /> : <TrendingUp className="w-4 h-4 stroke-[2.5]" />}
          </div>
          
          <h3 className="font-orbitron font-extrabold text-xs sm:text-sm text-slate-100 tracking-[2px] uppercase drop-shadow-[0_0_8px_rgba(0,229,255,0.3)] flex items-center gap-2">
            <span>Most Tracked Crypto and RWA Tokens</span>
          </h3>

          {/* 24h Window Badge */}
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            24h Live Tracking
          </span>

          {/* Quick Filter Tabs / 3D Buttons */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-950/70 border border-slate-800/90 shadow-inner">
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setFilterType('crypto'); }}
              className={`relative inline-flex items-center gap-1.5 text-xs sm:text-sm font-mono font-extrabold tracking-wide px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all duration-150 cursor-pointer select-none group/cryptobtn ${
                filterType === 'crypto'
                  ? 'bg-gradient-to-b from-cyan-400 via-cyan-500 to-cyan-600 text-slate-950 border-t border-cyan-200/60 border-x border-cyan-500 border-b-[3px] border-b-cyan-800 shadow-[0_4px_14px_rgba(6,182,212,0.55),0_2px_0_0_#155e75] translate-y-[-1px]'
                  : 'bg-gradient-to-b from-slate-800/95 via-slate-900 to-slate-950 text-cyan-300 hover:text-white border-t border-cyan-500/30 border-x border-cyan-500/30 border-b-[3px] border-b-cyan-950/90 hover:border-cyan-400/50 shadow-[0_3px_0_0_#082f49,0_0_14px_rgba(6,182,212,0.18)] hover:shadow-[0_4px_18px_rgba(6,182,212,0.35)] active:translate-y-0.5 active:border-b-[1px] active:shadow-none'
              }`}
              title="Filter by Tracked Cryptocurrencies"
            >
              <span className={`w-2 h-2 rounded-full ${filterType === 'crypto' ? 'bg-slate-950 shadow-[0_0_6px_rgba(0,0,0,0.6)]' : 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)] animate-pulse'}`}></span>
              <span>Crypto</span>
              <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                filterType === 'crypto'
                  ? 'bg-cyan-900/40 text-slate-950 border border-cyan-900/30'
                  : 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30'
              }`}>
                {cryptoCount}
              </span>
            </button>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setFilterType('xstock'); }}
              className={`relative inline-flex items-center gap-1.5 text-xs sm:text-sm font-mono font-extrabold tracking-wide px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all duration-150 cursor-pointer select-none group/stockbtn ${
                filterType === 'xstock'
                  ? 'bg-gradient-to-b from-purple-400 via-purple-500 to-purple-600 text-white border-t border-purple-200/60 border-x border-purple-500 border-b-[3px] border-b-purple-900 shadow-[0_4px_14px_rgba(168,85,247,0.55),0_2px_0_0_#581c87] translate-y-[-1px]'
                  : 'bg-gradient-to-b from-slate-800/95 via-slate-900 to-slate-950 text-purple-300 hover:text-white border-t border-purple-500/30 border-x border-purple-500/30 border-b-[3px] border-b-purple-950/90 hover:border-purple-400/50 shadow-[0_3px_0_0_#3b0764,0_0_14px_rgba(168,85,247,0.18)] hover:shadow-[0_4px_18px_rgba(168,85,247,0.35)] active:translate-y-0.5 active:border-b-[1px] active:shadow-none'
              }`}
              title="Filter by Tracked Tokenized Stocks"
            >
              <span className={`w-2 h-2 rounded-full ${filterType === 'xstock' ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]' : 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.9)] animate-pulse'}`}></span>
              <span>Tokenized Stocks</span>
              <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                filterType === 'xstock'
                  ? 'bg-purple-950/50 text-white border border-purple-300/40'
                  : 'bg-purple-500/20 text-purple-200 border border-purple-400/30'
              }`}>
                {xstockCount}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Previous / Next buttons */}
          <button 
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="p-1 hover:text-cyber-cyan text-cyber-text-muted transition-colors rounded hover:bg-cyber-cyan/15 border border-transparent hover:border-cyber-cyan/20 cursor-pointer flex items-center justify-center shrink-0"
            title="Previous Tracked Asset"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="p-1 hover:text-cyber-cyan text-cyber-text-muted transition-colors rounded hover:bg-cyber-cyan/15 border border-transparent hover:border-cyber-cyan/20 cursor-pointer flex items-center justify-center shrink-0"
            title="Next Tracked Asset"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Pause / Play button */}
          <button 
            onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
            className="p-1 hover:text-cyber-cyan text-cyber-text-muted transition-colors rounded hover:bg-cyber-cyan/15 border border-transparent hover:border-cyber-cyan/20 cursor-pointer flex items-center justify-center shrink-0"
            title={isPlaying ? "Pause rotation" : "Play rotation"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Counter Badge */}
          <span className={`font-mono text-[9px] ${isXStock ? 'text-purple-300 bg-purple-500/15 border-purple-500/35' : 'text-cyber-cyan bg-cyber-cyan/15 border-cyber-cyan/35'} border px-2.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold shadow-sm`}>
            {activeIdx + 1} / {displayedItems.length}
          </span>
        </div>
      </div>

      {/* 5-Column Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 transition-opacity duration-150 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
        {/* Metric 1: Tracked Asset Identity */}
        <div 
          onClick={handleAssetClick}
          className={`p-3.5 rounded-2xl bg-slate-950/80 border ${isXStock ? 'border-purple-500/30 hover:border-purple-500/65' : 'border-cyber-cyan/30 hover:border-cyber-cyan/65'} flex flex-col justify-between shadow-inner transition-colors cursor-pointer group/tile`}
          title={`Click to view ${activeAsset.name} ${isXStock ? 'in Tokenized Stocks' : 'Market Report'}`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold truncate">
              {isXStock ? 'TRACKED RWA STOCK' : 'TRACKED CRYPTO'}
            </div>
            <span className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded uppercase shrink-0 border ${
              isXStock 
                ? 'text-purple-300 bg-purple-500/15 border-purple-500/40' 
                : 'text-cyber-cyan bg-cyber-cyan/15 border-cyber-cyan/30'
            }`}>
              {isXStock ? 'RWA TOKEN' : 'CRYPTO'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 py-1 min-w-0">
            <CoinIcon 
              symbol={activeAsset.symbol} 
              logoUrl={activeAsset.logoUrl} 
              coingeckoId={activeAsset.coingeckoId} 
              name={activeAsset.name}
              type={activeAsset.type}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="font-display font-black text-base sm:text-lg text-white group-hover/tile:text-cyber-cyan transition-colors truncate">
                {activeAsset.name}
              </div>
              <div className="font-mono text-[10px] text-slate-400 truncate">
                {isXStock && activeAsset.underlyingTicker 
                  ? `${activeAsset.symbol} • ${activeAsset.underlyingTicker} (${activeAsset.chain || 'Solana'})` 
                  : activeAsset.symbol}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 border-t border-slate-900 pt-1 mt-1">
            <span className="truncate">{activeAsset.category}</span>
            <span className="text-emerald-400 font-bold shrink-0 ml-1">
              {activeAsset.viewCount24h}x viewed (24h)
            </span>
          </div>
        </div>

        {/* Metric 2: Audit Index / Peg Convergence */}
        <div 
          onClick={handleAssetClick}
          className={`p-3.5 rounded-2xl bg-slate-950/80 border ${isXStock ? 'border-purple-500/30 hover:border-purple-500/65' : 'border-cyber-cyan/30 hover:border-cyber-cyan/65'} flex flex-col justify-between shadow-sm transition-colors cursor-pointer group/tile`}
          title={`Click to view ${activeAsset.name} verification details`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold truncate">
              {isXStock ? 'PEG CONVERGENCE' : 'AUDIT INDEX'}
            </div>
            <span className={`font-mono text-[9.5px] font-black px-1.5 py-0.5 rounded shrink-0 border ${
              isXStock
                ? 'text-purple-300 bg-purple-500/15 border-purple-500/40'
                : 'text-cyber-cyan bg-cyber-cyan/15 border-cyber-cyan/30'
            }`}>
              {isXStock ? '1:1 BACKED' : 'VERIFIED'}
            </span>
          </div>
          <div className={`font-display font-black text-xl sm:text-2xl ${isXStock ? 'text-purple-300 drop-shadow-[0_0_12px_rgba(168,85,247,0.25)]' : 'text-cyber-cyan drop-shadow-[0_0_12px_rgba(0,229,255,0.2)]'} tracking-tight py-1`}>
            {activeAsset.score}%
          </div>
          <div className="font-mono text-[9.5px] text-slate-400 truncate">
            {isXStock ? 'multi-source price peg' : 'algorithmic security score'}
          </div>
        </div>

        {/* Metric 3: Risk Profile / Regulatory Backing */}
        <div 
          onClick={handleAssetClick}
          className={`p-3.5 rounded-2xl bg-slate-950/80 border ${isXStock ? 'border-purple-500/30 hover:border-purple-500/65' : 'border-cyber-cyan/30 hover:border-cyber-cyan/65'} flex flex-col justify-between shadow-sm transition-colors cursor-pointer group/tile`}
          title={`Click to view ${activeAsset.name} risk profile`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold truncate">
              {isXStock ? 'CUSTODY & RISK' : 'RISK PROFILE'}
            </div>
            <span className={`font-mono text-[9.5px] font-extrabold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getRiskStyles(activeAsset.riskLevel)}`}>
              {isXStock ? 'SWISS DLT' : 'STATUS'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 py-1">
            <span className={`font-display font-black text-xl sm:text-2xl tracking-tight ${activeAsset.riskLevel === 'Low' ? 'text-cyber-green' : activeAsset.riskLevel === 'Medium' ? 'text-amber-400' : 'text-cyber-orange'}`}>
              {activeAsset.riskLevel} Risk
            </span>
          </div>
          <div className="font-mono text-[9.5px] text-slate-400 truncate">
            {isXStock ? `${activeAsset.issuer || 'Backed Finance'} Custody` : 'assessed risk classification'}
          </div>
        </div>

        {/* Metric 4: System Stability / Underlying Tracking */}
        <div 
          onClick={handleAssetClick}
          className={`p-3.5 rounded-2xl bg-slate-950/80 border ${isXStock ? 'border-purple-500/30 hover:border-purple-500/65' : 'border-cyber-cyan/30 hover:border-cyber-cyan/65'} flex flex-col justify-between shadow-sm transition-colors cursor-pointer group/tile`}
          title={`Click to view ${activeAsset.name} tracking details`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold truncate">
              {isXStock ? 'ORACLE TRACKING' : 'SYSTEM STABILITY'}
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse shrink-0" />
          </div>
          <div className="font-display font-black text-xl sm:text-2xl text-emerald-400 tracking-tight flex items-center gap-1.5 py-1">
            {isXStock ? '24/7 ACTIVE' : 'ACTIVE'}
          </div>
          <div className="font-mono text-[9.5px] text-slate-400 truncate">
            {isXStock ? 'Finnhub & CMC equity peg' : 'consensus & state verified'}
          </div>
        </div>

        {/* Metric 5: Action Link (Market Intelligence vs Tokenized Stocks) */}
        <div 
          onClick={handleAssetClick}
          className={`p-3.5 rounded-2xl bg-slate-950/80 border ${
            isXStock 
              ? 'border-purple-500/35 hover:border-purple-400 hover:bg-purple-500/10' 
              : 'border-cyber-cyan/30 hover:border-cyber-cyan/65 hover:bg-cyber-cyan/5'
          } flex flex-col justify-between shadow-sm transition-colors cursor-pointer group/tile`}
          title={isXStock ? `Navigate to Tokenized Stocks for ${activeAsset.name}` : `View ${activeAsset.name} Market Report in Market Intelligence`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold truncate">
              {isXStock ? 'TOKENIZED STOCKS' : 'MARKET REPORT'}
            </div>
            <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 border ${
              isXStock
                ? 'text-purple-300 bg-purple-500/20 border-purple-500/40'
                : 'text-amber-300 bg-amber-500/10 border-amber-500/20'
            }`}>
              {isXStock ? 'XSTOCKS DESK' : 'REAL-TIME'}
            </span>
          </div>
          <div className={`flex items-center gap-1.5 py-1 font-orbitron font-extrabold text-sm sm:text-base ${
            isXStock ? 'text-purple-300 group-hover/tile:text-white' : 'text-cyber-cyan group-hover/tile:text-white'
          } group-hover/tile:translate-x-1 transition-all`}>
            <span>{isXStock ? 'VIEW XSTOCK' : 'VIEW REPORT'}</span>
            <ChevronRight className={`w-4 h-4 ${isXStock ? 'text-purple-400' : 'text-cyber-cyan'} animate-pulse`} />
          </div>
          <div className="font-mono text-[9.5px] text-slate-400 truncate">
            {isXStock ? 'open 24/7 equity desk →' : 'inspect full findings →'}
          </div>
        </div>
      </div>

      {/* Cycle timer progress bar */}
      <div className="w-full bg-slate-900/60 rounded-full h-1 overflow-hidden mt-3.5 relative">
        <div 
          className={`h-full ${
            isXStock 
              ? 'bg-gradient-to-r from-purple-500 via-pink-400 to-cyber-cyan' 
              : 'bg-gradient-to-r from-cyber-blue via-cyber-cyan to-emerald-400'
          } rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(0,229,255,0.6)]`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
