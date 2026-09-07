/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Award, ChevronRight, ChevronLeft, Play, Pause } from 'lucide-react';
import { CryptoReview } from '../types';
import { INITIAL_REVIEWS } from '../data';
import { getCoinLogoUrl } from '../utils/coinLogos';
import { TiltCard } from './TiltCard';

interface MarketTickerProps {
  compact?: boolean;
  reviews?: CryptoReview[];
  onSelectReview?: (id: string) => void;
  mode?: 'all' | 'showcase' | 'metrics';
}

interface CoinIconProps {
  symbol: string;
  logoUrl?: string;
  coingeckoId?: string;
  name?: string;
  size?: 'sm' | 'md';
}

const CoinIcon: React.FC<CoinIconProps> = ({ symbol, logoUrl, coingeckoId, name, size = 'md' }) => {
  const cleanSymbol = (symbol || 'BTC').toUpperCase().trim();
  const resolvedLogo = getCoinLogoUrl(symbol, logoUrl, coingeckoId);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [resolvedLogo, symbol, coingeckoId]);

  if (resolvedLogo && !imgError) {
    if (size === 'sm') {
      return (
        <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-cyber-cyan/40 bg-slate-900/90 flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.25)] overflow-hidden p-1 shrink-0">
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
        <div className="absolute inset-0 rounded-2xl bg-cyber-cyan/20 blur-md group-hover/icon:bg-cyber-cyan/35 transition-all animate-pulse"></div>
        <div className="absolute inset-0 rounded-2xl border border-cyber-cyan/40 bg-slate-900/90 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.25)] overflow-hidden p-2">
          <div className="absolute inset-0 bg-gradient-to-b from-cyber-cyan/10 via-transparent to-slate-950 pointer-events-none"></div>
          <div className="absolute -inset-1 rounded-2xl border border-dashed border-cyber-cyan/30 animate-[spin_25s_linear_infinite] pointer-events-none"></div>
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
      <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-cyber-cyan/40 bg-slate-900/95 flex items-center justify-center font-display font-black text-[10px] text-cyber-cyan tracking-wider shrink-0 shadow-[0_0_10px_rgba(0,229,255,0.15)]">
        {cleanSymbol.length > 4 ? cleanSymbol.substring(0, 3) : cleanSymbol}
      </div>
    );
  }

  return (
    <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0 select-none group/icon">
      <div className="absolute inset-0 rounded-2xl bg-cyber-cyan/20 blur-md group-hover/icon:bg-cyber-cyan/35 transition-all animate-pulse"></div>
      <div className="absolute inset-0 rounded-2xl border border-cyber-cyan/40 bg-slate-900/95 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.2)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/50 pointer-events-none"></div>
        <span className="font-display font-black text-xs sm:text-sm text-cyber-cyan tracking-wider z-10 px-1 text-center truncate">
          {cleanSymbol.length > 5 ? cleanSymbol.substring(0, 4) : cleanSymbol}
        </span>
      </div>
    </div>
  );
};

export default function MarketTicker({ reviews = [], onSelectReview, mode = 'showcase' }: MarketTickerProps) {
  // Auto-cycling showcase states
  const allAudits = reviews && reviews.length > 0 ? reviews : INITIAL_REVIEWS;
  const [activeAuditIdx, setActiveAuditIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isFading, setIsFading] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const CYCLE_TIME = 5000; // 5 seconds per project cycle

  // Handle active audit auto-cycling & progress animation
  const auditsCount = allAudits.length;
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    if (isPlaying && auditsCount > 0) {
      const startTime = Date.now();
      
      progressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const percentage = Math.min((elapsed / CYCLE_TIME) * 100, 100);
        setProgressPercent(percentage);
      }, 50);

      timerRef.current = setTimeout(() => {
        handleNextAudit();
      }, CYCLE_TIME);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isPlaying, activeAuditIdx, auditsCount]);

  const handleNextAudit = () => {
    setIsFading(true);
    setTimeout(() => {
      setActiveAuditIdx(prev => (prev + 1) % (allAudits.length || 1));
      setProgressPercent(0);
      setIsFading(false);
    }, 150);
  };

  const handlePrevAudit = () => {
    setIsFading(true);
    setTimeout(() => {
      setActiveAuditIdx(prev => (prev - 1 + (allAudits.length || 1)) % (allAudits.length || 1));
      setProgressPercent(0);
      setIsFading(false);
    }, 150);
  };

  const getGradeColor = (grade: string) => {
    if (grade === 'AAA') {
      return 'text-cyber-cyan border-cyber-cyan/40 bg-cyber-cyan/10 shadow-[0_0_15px_rgba(0,229,255,0.25)] font-black';
    }
    if (grade === 'AA') {
      return 'text-cyber-green border-cyber-green/30 bg-cyber-green/10 shadow-[0_0_12px_rgba(0,255,136,0.15)] font-extrabold';
    }
    if (grade?.charAt(0) === 'A') {
      return 'text-cyber-cyan border-cyber-cyan/20 bg-cyber-cyan/5 font-bold';
    }
    if (grade?.charAt(0) === 'B') {
      return 'text-cyber-text-primary border-cyber-text-muted/30 bg-cyber-text-secondary/10 font-semibold';
    }
    if (grade?.charAt(0) === 'C') {
      return 'text-cyber-orange border-cyber-orange/20 bg-cyber-orange/10 font-semibold';
    }
    return 'text-rose-400 border-rose-400/20 bg-rose-500/10 font-bold';
  };

  const getGradeTextColor = (grade: string) => {
    if (grade === 'AAA') return 'text-cyber-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]';
    if (grade === 'AA') return 'text-emerald-400';
    if (grade?.charAt(0) === 'A') return 'text-cyber-cyan';
    if (grade?.charAt(0) === 'B') return 'text-slate-100';
    if (grade?.charAt(0) === 'C') return 'text-amber-400';
    return 'text-rose-400';
  };

  const getRiskStyles = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-cyber-green bg-cyber-green/5 border-cyber-green/20';
      case 'Medium': return 'text-amber-400 bg-amber-500/5 border-amber-500/20';
      case 'High': return 'text-cyber-orange bg-cyber-orange/5 border-cyber-orange/20';
      case 'Critical': return 'text-rose-400 bg-rose-500/5 border-rose-500/20 animate-pulse';
      default: return 'text-cyber-text-secondary bg-cyber-text-secondary/5 border-cyber-text-muted/30';
    }
  };

  // Active showcase project details
  const activeAudit = allAudits[activeAuditIdx] || allAudits[0];

  if (!allAudits.length || !activeAudit) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 backdrop-blur-md border border-cyber-cyan/35 hover:border-cyber-cyan/65 rounded-2xl p-5 md:p-6 shadow-xl hover:shadow-[0_12px_40px_rgba(0,229,255,0.22)] relative overflow-hidden group flex flex-col justify-between h-full select-none transition-all duration-300">
      {/* Top Cyber Glow Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent"></div>
      <div className="absolute top-0 right-0 w-36 h-36 bg-cyber-cyan/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none"></div>

      {/* Header */}
      <div className="flex justify-between items-center pb-3.5 border-b border-slate-800/80 mb-4 relative z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,229,255,0.25)]">
            <Award className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h3 className="font-orbitron font-extrabold text-xs sm:text-sm text-slate-100 tracking-[2px] uppercase drop-shadow-[0_0_8px_rgba(0,229,255,0.3)] flex items-center gap-2">
            <span>Audited Projects Showcase</span>
          </h3>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectReview) onSelectReview('');
            }}
            className="text-[10px] font-mono font-bold text-cyber-cyan bg-cyber-cyan/15 border border-cyber-cyan/35 px-2.5 py-0.5 rounded-full hover:bg-cyber-cyan hover:text-slate-950 transition-all cursor-pointer"
            title="Click to view all audited projects in registry"
          >
            View All ({allAudits.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Previous / Next buttons */}
          <button 
            onClick={(e) => { e.stopPropagation(); handlePrevAudit(); }}
            className="p-1 hover:text-cyber-cyan text-cyber-text-muted transition-colors rounded hover:bg-cyber-cyan/15 border border-transparent hover:border-cyber-cyan/20 cursor-pointer flex items-center justify-center shrink-0"
            title="Previous Audited Project"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleNextAudit(); }}
            className="p-1 hover:text-cyber-cyan text-cyber-text-muted transition-colors rounded hover:bg-cyber-cyan/15 border border-transparent hover:border-cyber-cyan/20 cursor-pointer flex items-center justify-center shrink-0"
            title="Next Audited Project"
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
          <span className="font-mono text-[9px] text-cyber-cyan bg-cyber-cyan/15 border border-cyber-cyan/35 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold shadow-sm">
            {activeAuditIdx + 1} / {allAudits.length}
          </span>
        </div>
      </div>

      {/* 5-Column Grid matching AI Market Summary and AI XStocks Market Summary */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 transition-opacity duration-150 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
        {/* Metric 1: Audited Asset */}
        <div 
          onClick={() => onSelectReview && onSelectReview(activeAudit.id)}
          className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyber-cyan/30 flex flex-col justify-between shadow-inner hover:border-cyber-cyan/65 transition-colors cursor-pointer group/tile"
          title={`Click to view ${activeAudit.name} audit report`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold truncate">
              AUDITED ASSET
            </div>
            <span className="font-mono text-[10px] text-cyber-cyan font-black bg-cyber-cyan/15 border border-cyber-cyan/30 px-1.5 py-0.5 rounded uppercase shrink-0">
              {activeAudit.symbol}
            </span>
          </div>
          <div className="flex items-center gap-2.5 py-1 min-w-0">
            <CoinIcon 
              symbol={activeAudit.symbol} 
              logoUrl={activeAudit.logoUrl} 
              coingeckoId={activeAudit.coingeckoId} 
              name={activeAudit.name}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="font-display font-black text-base sm:text-lg text-white group-hover/tile:text-cyber-cyan transition-colors truncate">
                {activeAudit.name}
              </div>
            </div>
          </div>
          <div className="font-mono text-[9.5px] text-slate-400 truncate">
            {activeAudit.category}
          </div>
        </div>

        {/* Metric 2: Audit Index */}
        <div 
          onClick={() => onSelectReview && onSelectReview(activeAudit.id)}
          className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyber-cyan/30 flex flex-col justify-between shadow-sm hover:border-cyber-cyan/65 transition-colors cursor-pointer group/tile"
          title={`Click to view ${activeAudit.name} audit report`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold truncate">
              AUDIT INDEX
            </div>
            <span className="font-mono text-[10px] font-black text-cyber-cyan bg-cyber-cyan/15 border border-cyber-cyan/30 px-1.5 py-0.5 rounded shrink-0">
              VERIFIED
            </span>
          </div>
          <div className="font-display font-black text-xl sm:text-2xl text-cyber-cyan tracking-tight drop-shadow-[0_0_12px_rgba(0,229,255,0.2)] py-1">
            {activeAudit.overallScore}%
          </div>
          <div className="font-mono text-[9.5px] text-slate-400 truncate">
            algorithmic security score
          </div>
        </div>

        {/* Metric 3: Security Grade */}
        <div 
          onClick={() => onSelectReview && onSelectReview(activeAudit.id)}
          className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyber-cyan/30 flex flex-col justify-between shadow-sm hover:border-cyber-cyan/65 transition-colors cursor-pointer group/tile"
          title={`Click to view ${activeAudit.name} audit report`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold truncate">
              SECURITY GRADE
            </div>
            <span className={`font-mono text-[9.5px] font-extrabold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getRiskStyles(activeAudit.riskLevel)}`}>
              {activeAudit.riskLevel} Risk
            </span>
          </div>
          <div className="flex items-baseline gap-2 py-1">
            <span className={`font-display font-black text-xl sm:text-2xl tracking-tight ${getGradeTextColor(activeAudit.grade)}`}>
              {activeAudit.grade}
            </span>
            <span className="font-mono text-[10px] text-slate-400 uppercase font-bold">
              Tier Rating
            </span>
          </div>
          <div className="font-mono text-[9.5px] text-slate-400 truncate">
            smart contract rating
          </div>
        </div>

        {/* Metric 4: System Stability */}
        <div 
          onClick={() => onSelectReview && onSelectReview(activeAudit.id)}
          className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyber-cyan/30 flex flex-col justify-between shadow-sm hover:border-cyber-cyan/65 transition-colors cursor-pointer group/tile"
          title={`Click to view ${activeAudit.name} audit report`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold truncate">
              SYSTEM STABILITY
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse shrink-0" />
          </div>
          <div className="font-display font-black text-xl sm:text-2xl text-emerald-400 tracking-tight flex items-center gap-1.5 py-1">
            PASS
          </div>
          <div className="font-mono text-[9.5px] text-slate-400 truncate">
            consensus &amp; state verified
          </div>
        </div>

        {/* Metric 5: Audit Blueprint */}
        <div 
          onClick={() => onSelectReview && onSelectReview(activeAudit.id)}
          className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyber-cyan/30 flex flex-col justify-between shadow-sm hover:border-cyber-cyan/65 transition-colors cursor-pointer group/tile hover:bg-cyber-cyan/5"
          title={`Click to view ${activeAudit.name} audit report`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold truncate">
              AUDIT BLUEPRINT
            </div>
            <span className="font-mono text-[9px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded shrink-0">
              REAL-TIME
            </span>
          </div>
          <div className="flex items-center gap-1.5 py-1 font-orbitron font-extrabold text-sm sm:text-base text-cyber-cyan group-hover/tile:text-white group-hover/tile:translate-x-1 transition-all">
            <span>VIEW REPORT</span>
            <ChevronRight className="w-4 h-4 text-cyber-cyan animate-pulse" />
          </div>
          <div className="font-mono text-[9.5px] text-slate-400 truncate">
            inspect full findings →
          </div>
        </div>
      </div>

      {/* Cycle timer progress bar */}
      <div className="w-full bg-slate-900/60 rounded-full h-1 overflow-hidden mt-3.5 relative">
        <div 
          className="h-full bg-gradient-to-r from-cyber-blue via-cyber-cyan to-emerald-400 rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(0,229,255,0.6)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
