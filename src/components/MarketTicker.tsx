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
}

const CoinIcon: React.FC<CoinIconProps> = ({ symbol, logoUrl, coingeckoId, name }) => {
  const cleanSymbol = (symbol || 'BTC').toUpperCase().trim();
  const resolvedLogo = getCoinLogoUrl(symbol, logoUrl, coingeckoId);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [resolvedLogo, symbol, coingeckoId]);

  if (resolvedLogo && !imgError) {
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
    <TiltCard className="h-full bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 backdrop-blur-md border border-cyber-cyan/35 hover:border-cyber-cyan/65 rounded-2xl shadow-xl hover:shadow-[0_12px_40px_rgba(0,229,255,0.22)] relative overflow-hidden group">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent"></div>
      <div className="absolute top-0 right-0 w-36 h-36 bg-cyber-cyan/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none"></div>
      <div className="p-5 sm:p-6 relative flex flex-col justify-between min-h-[190px] md:min-h-[210px] h-full">

        {/* Header containing Audited Projects Showcase */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-cyber-cyan/15 flex-wrap gap-2">
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectReview) onSelectReview('');
            }}
            className="font-orbitron font-extrabold text-xs uppercase tracking-[2px] text-cyber-cyan flex items-center gap-2 hover:text-white transition-colors cursor-pointer group"
            title="Click to view all audited projects in registry"
          >
            <Award className="w-4 h-4 text-cyber-cyan animate-pulse group-hover:scale-110 transition-transform" />
            <span>Audited Projects Showcase</span>
            <span className="text-[10px] font-mono font-bold text-cyber-cyan bg-cyber-cyan/15 border border-cyber-cyan/35 px-2 py-0.5 rounded-full hover:bg-cyber-cyan hover:text-slate-950 transition-all">
              View All ({allAudits.length})
            </span>
          </button>
          
          {/* Control buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
              className="p-1 hover:text-cyber-cyan text-cyber-text-muted transition-colors rounded hover:bg-cyber-cyan/5 cursor-pointer flex items-center justify-center shrink-0"
              title={isPlaying ? "Pause Showcase rotation" : "Play Showcase rotation"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <span className="text-[10px] font-mono text-cyber-cyan/80 bg-cyber-cyan/5 px-2 py-0.5 rounded border border-cyber-cyan/10 whitespace-nowrap shrink-0">
              {activeAuditIdx + 1} / {allAudits.length}
            </span>
          </div>
        </div>

        {/* Cycling Content Container with smooth fade */}
        <div 
          onClick={() => onSelectReview && onSelectReview(activeAudit.id)}
          className={`flex-1 flex flex-col justify-between gap-4 transition-opacity duration-150 cursor-pointer group py-2 ${
            isFading ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {/* Top Row: Coin Icon, Name/Category, and Grade/Index badge */}
          <div className="flex items-center gap-3.5 w-full">
            {/* Advanced custom coin render */}
            <div className="shrink-0">
              <CoinIcon symbol={activeAudit.symbol} logoUrl={activeAudit.logoUrl} coingeckoId={activeAudit.coingeckoId} name={activeAudit.name} />
            </div>

            {/* Name and Meta details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-black text-base sm:text-lg lg:text-xl text-white group-hover:text-cyber-cyan group-hover:drop-shadow-[0_0_12px_rgba(0,229,255,0.6)] transition-all break-words leading-tight">
                  {activeAudit.name}
                </span>
                <span className="font-mono text-xs text-cyber-cyan font-black bg-cyber-cyan/15 border border-cyber-cyan/30 px-2 py-0.5 rounded-md uppercase shrink-0">
                  {activeAudit.symbol}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
                  {activeAudit.category}
                </span>
                <span className="text-cyber-cyan/40 text-[10px] font-mono select-none">•</span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-md border uppercase font-extrabold tracking-wider ${getRiskStyles(activeAudit.riskLevel)}`}>
                  {activeAudit.riskLevel} Risk
                </span>
              </div>
            </div>

            {/* High Contrast Index & Grade Badge */}
            <div className="shrink-0 flex items-center gap-3 bg-slate-950/80 px-3.5 py-2.5 rounded-2xl border-2 border-cyber-cyan/30 shadow-md select-none">
              <div className="text-center">
                <div className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">INDEX</div>
                <div className="text-base sm:text-lg font-display font-black text-cyber-cyan mt-0.5 drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">
                  {activeAudit.overallScore}%
                </div>
              </div>
              <div className="w-[1.5px] h-7 bg-cyber-cyan/25"></div>
              <div className="text-center">
                <div className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">GRADE</div>
                <div className={`text-base sm:text-lg font-mono font-black mt-0.5 ${getGradeColor(activeAudit.grade)}`}>
                  {activeAudit.grade}
                </div>
              </div>
            </div>
          </div>

          {/* Middle Row: Bento-style Compartmentalized Audit Metrics */}
          <div className="grid grid-cols-3 gap-2 bg-slate-950/80 border border-cyber-cyan/30 p-3 rounded-2xl select-none font-mono">
            <div className="flex flex-col items-center sm:items-start px-1">
              <span className="text-slate-400 text-[9px] font-bold tracking-wider uppercase">STABILITY</span>
              <span className="text-emerald-400 text-xs sm:text-sm font-black flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                PASS
              </span>
            </div>
            <div className="flex flex-col items-center sm:items-start border-l border-r border-cyber-cyan/20 px-1">
              <span className="text-slate-400 text-[9px] font-bold tracking-wider uppercase">SECURITY</span>
              <span className="text-cyber-cyan text-xs sm:text-sm font-black mt-0.5">EXTREME</span>
            </div>
            <div className="flex flex-col items-center sm:items-start px-1">
              <span className="text-slate-400 text-[9px] font-bold tracking-wider uppercase">MONITORING</span>
              <span className="text-amber-300 text-xs sm:text-sm font-black mt-0.5">REAL-TIME</span>
            </div>
          </div>

          {/* Interactive Footer element */}
          <div className="flex justify-between items-center pt-2.5 border-t border-cyber-cyan/15">
            <span className="text-[10px] font-mono text-slate-300 font-medium tracking-wider uppercase select-none hidden sm:inline">
              Click card to view complete smart contract audit blueprint
            </span>
            <span className="text-[10px] font-mono text-slate-300 font-medium tracking-wider uppercase select-none sm:hidden">
              Tap card to view complete blueprint
            </span>
            <span className="font-display text-xs font-black uppercase text-cyber-cyan flex items-center gap-1 group-hover:translate-x-1.5 transition-transform select-none">
              View Report
              <ChevronRight className="w-4 h-4 text-cyber-cyan animate-pulse" />
            </span>
          </div>
        </div>

        {/* Navigation Controls and Timer Progress Bar */}
        <div className="mt-4 pt-3 border-t border-cyber-cyan/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); handlePrevAudit(); }}
              className="p-1.5 rounded-lg border border-cyber-cyan/10 hover:border-cyber-cyan/30 text-cyber-text-secondary hover:text-cyber-cyan transition-colors bg-cyber-bg-primary/40 cursor-pointer shadow-sm hover:shadow-[0_0_8px_rgba(0,229,255,0.2)]"
              title="Previous Project"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleNextAudit(); }}
              className="p-1.5 rounded-lg border border-cyber-cyan/10 hover:border-cyber-cyan/30 text-cyber-text-secondary hover:text-cyber-cyan transition-colors bg-cyber-bg-primary/40 cursor-pointer shadow-sm hover:shadow-[0_0_8px_rgba(0,229,255,0.2)]"
              title="Next Project"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Cycle timer bar */}
          <div className="flex-1 max-w-[200px] ml-4 bg-cyber-cyan/5 rounded-full h-1 overflow-hidden relative">
            <div 
              className="h-full bg-gradient-to-r from-cyber-blue to-cyber-cyan rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(0,229,255,0.6)]"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>
    </TiltCard>
  );
}
