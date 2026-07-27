/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Activity, RefreshCw, Award, ChevronRight, ChevronLeft, Play, Pause, ShieldCheck, ShieldAlert, Zap } from 'lucide-react';
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

const getFngClassification = (value: number): string => {
  if (value <= 25) return 'Extreme Fear';
  if (value <= 45) return 'Fear';
  if (value < 55) return 'Neutral';
  if (value <= 75) return 'Greed';
  return 'Extreme Greed';
};

const getFngColor = (value: number): string => {
  if (value <= 25) return '#ff3b3b'; 
  if (value <= 45) return '#ff8c42'; 
  if (value < 55) return '#ffd93d';  
  if (value <= 75) return '#6bcf63';  
  return '#00ff88';                  
};

const parseFngResponse = (data: any) => {
  if (!data) return null;
  const customVal = data.fng_value !== undefined ? parseFloat(data.fng_value) : undefined;
  if (customVal !== undefined && !isNaN(customVal)) {
    return {
      value: Math.round(customVal),
      classification: data.fng_classification || getFngClassification(customVal)
    };
  }
  if (data.data) {
    const d = data.data;
    if (typeof d === 'object' && !Array.isArray(d)) {
      const val = parseFloat(d.value);
      if (!isNaN(val)) {
        return {
          value: Math.round(val),
          classification: d.value_classification || getFngClassification(val)
        };
      }
    } else if (Array.isArray(d) && d[0]) {
      const val = parseFloat(d[0].value);
      if (!isNaN(val)) {
        return {
          value: Math.round(val),
          classification: d[0].value_classification || d[0].classification || getFngClassification(val)
        };
      }
    }
  }
  const directVal = parseFloat(data.value || data.fngValue);
  if (!isNaN(directVal)) {
    return {
      value: Math.round(directVal),
      classification: data.value_classification || data.classification || data.fngClass || getFngClassification(directVal)
    };
  }
  return null;
};

const renderCoinIcon = (symbol: string, logoUrl?: string, name?: string) => {
  const cleanSymbol = symbol.toUpperCase().trim();
  const actualLogo = getCoinLogoUrl(cleanSymbol, logoUrl);

  if (actualLogo) {
    return (
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0 select-none group/icon">
        <div className="absolute inset-0 rounded-2xl bg-cyber-cyan/20 blur-md group-hover/icon:bg-cyber-cyan/35 transition-all animate-pulse"></div>
        <div className="absolute inset-0 rounded-2xl border border-cyber-cyan/40 bg-slate-900/90 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.25)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-cyber-cyan/10 via-transparent to-slate-950 pointer-events-none"></div>
          <div className="absolute -inset-1 rounded-2xl border border-dashed border-cyber-cyan/30 animate-[spin_25s_linear_infinite] pointer-events-none"></div>
        </div>
        <div className="relative z-10 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center p-1">
          <img 
            src={actualLogo} 
            alt={name || symbol} 
            className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,229,255,0.35)] transition-transform duration-300 group-hover/icon:scale-110"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      </div>
    );
  }
  
  if (cleanSymbol === 'BTC' || cleanSymbol === 'BITCOIN') {
    return (
      <div className="relative w-16 h-16 flex items-center justify-center shrink-0 select-none">
        <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-md animate-pulse"></div>
        <div className="absolute inset-0 rounded-full border border-amber-500/30 flex items-center justify-center">
          <div className="w-[92%] h-[92%] rounded-full border border-dashed border-amber-500/40 animate-[spin_20s_linear_infinite]"></div>
        </div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.6)] z-10 border border-amber-300/30">
          <span className="font-display font-black text-2xl text-slate-950">₿</span>
        </div>
      </div>
    );
  }
  
  if (cleanSymbol === 'ETH' || cleanSymbol === 'ETHEREUM') {
    return (
      <div className="relative w-16 h-16 flex items-center justify-center shrink-0 select-none">
        <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-md animate-pulse"></div>
        <div className="absolute inset-0 rounded-full border border-indigo-500/30 flex items-center justify-center">
          <div className="w-[92%] h-[92%] rounded-full border border-dashed border-indigo-500/40 animate-[spin_15s_linear_infinite]"></div>
        </div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-b from-indigo-500 via-purple-600 to-violet-700 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.6)] z-10 border border-indigo-400/30">
          {/* Using ❖ (the multi-dimensional rhombus) representing the iconic Ethereum octahedron crystal */}
          <span className="font-display font-black text-xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">❖</span>
        </div>
      </div>
    );
  }
  
  if (cleanSymbol === 'SOL' || cleanSymbol === 'SOLANA') {
    return (
      <div className="relative w-16 h-16 flex items-center justify-center shrink-0 select-none">
        <div className="absolute inset-0 rounded-full bg-fuchsia-500/20 blur-md animate-pulse"></div>
        <div className="absolute inset-0 rounded-full border border-fuchsia-500/30 flex items-center justify-center">
          <div className="w-[92%] h-[92%] rounded-full border border-dashed border-fuchsia-500/40 animate-[spin_12s_linear_infinite]"></div>
        </div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-fuchsia-500 via-purple-600 to-cyber-cyan flex items-center justify-center shadow-[0_0_20px_rgba(217,70,239,0.6)] z-10 border border-fuchsia-400/30">
          <span className="font-mono font-black text-xs text-white tracking-wider">SOL</span>
        </div>
      </div>
    );
  }
  
  if (cleanSymbol === 'LINK' || cleanSymbol === 'CHAINLINK') {
    return (
      <div className="relative w-16 h-16 flex items-center justify-center shrink-0 select-none">
        <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md animate-pulse"></div>
        <div className="absolute inset-0 rounded-full border border-blue-500/30 flex items-center justify-center">
          <div className="w-[92%] h-[92%] rounded-full border border-dashed border-blue-500/40 animate-[spin_22s_linear_infinite]"></div>
        </div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#375bd2] to-[#1e3a8a] flex items-center justify-center shadow-[0_0_20px_rgba(55,91,210,0.6)] z-10 border border-blue-400/30">
          {/* ⬡ is a beautiful hexagon representing Chainlink's Oracle Nodes and logo shape */}
          <span className="font-display font-black text-xl text-white">⬡</span>
        </div>
      </div>
    );
  }

  if (cleanSymbol === 'SUI' || cleanSymbol === 'SUI NETWORK') {
    return (
      <div className="relative w-16 h-16 flex items-center justify-center shrink-0 select-none">
        <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-md animate-pulse"></div>
        <div className="absolute inset-0 rounded-full border border-cyan-400/30 flex items-center justify-center">
          <div className="w-[92%] h-[92%] rounded-full border border-dashed border-cyan-400/40 animate-[spin_16s_linear_infinite]"></div>
        </div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-b from-sky-400 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.6)] z-10 border border-sky-300/30">
          <span className="font-display font-black text-xs text-white tracking-widest">SUI</span>
        </div>
      </div>
    );
  }

  if (cleanSymbol === 'HYPE' || cleanSymbol === 'HYPERLIQUID') {
    return (
      <div className="relative w-16 h-16 flex items-center justify-center shrink-0 select-none">
        <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-md animate-pulse"></div>
        <div className="absolute inset-0 rounded-full border border-emerald-400/30 flex items-center justify-center">
          <div className="w-[92%] h-[92%] rounded-full border border-dashed border-emerald-400/40 animate-[spin_14s_linear_infinite]"></div>
        </div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-b from-teal-400 to-emerald-600 flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.6)] z-10 border border-teal-300/30">
          <span className="font-display font-black text-xs text-slate-950 tracking-wider">HYPE</span>
        </div>
      </div>
    );
  }

  if (cleanSymbol === 'ARB' || cleanSymbol === 'ARBITRUM') {
    return (
      <div className="relative w-16 h-16 flex items-center justify-center shrink-0 select-none">
        <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md animate-pulse"></div>
        <div className="absolute inset-0 rounded-full border border-blue-500/30 flex items-center justify-center">
          <div className="w-[92%] h-[92%] rounded-full border border-dashed border-blue-500/40 animate-[spin_20s_linear_infinite]"></div>
        </div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-b from-blue-500 to-slate-800 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.6)] z-10 border border-blue-400/30">
          <span className="font-display font-black text-xs text-white tracking-wider">ARB</span>
        </div>
      </div>
    );
  }

  if (cleanSymbol === 'UNI' || cleanSymbol === 'UNISWAP') {
    return (
      <div className="relative w-16 h-16 flex items-center justify-center shrink-0 select-none">
        <div className="absolute inset-0 rounded-full bg-pink-500/20 blur-md animate-pulse"></div>
        <div className="absolute inset-0 rounded-full border border-pink-500/30 flex items-center justify-center">
          <div className="w-[92%] h-[92%] rounded-full border border-dashed border-pink-500/40 animate-[spin_18s_linear_infinite]"></div>
        </div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-b from-pink-500 to-rose-600 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.6)] z-10 border border-pink-300/30">
          <span className="font-display font-black text-sm text-white">🦄</span>
        </div>
      </div>
    );
  }

  if (cleanSymbol === 'KAS' || cleanSymbol === 'KASPA') {
    return (
      <div className="relative w-16 h-16 flex items-center justify-center shrink-0 select-none">
        <div className="absolute inset-0 rounded-full bg-cyber-cyan/20 blur-md animate-pulse"></div>
        <div className="absolute inset-0 rounded-full border border-cyber-cyan/30 flex items-center justify-center">
          <div className="w-[92%] h-[92%] rounded-full border border-dashed border-cyber-cyan/40 animate-[spin_18s_linear_infinite]"></div>
        </div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-b from-cyber-cyan to-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.6)] z-10 border border-cyber-cyan/30">
          <span className="font-display font-black text-sm text-slate-950">KAS</span>
        </div>
      </div>
    );
  }

  if (cleanSymbol === 'MROCKET' || cleanSymbol === 'MEMEROCKET') {
    return (
      <div className="relative w-16 h-16 flex items-center justify-center shrink-0 select-none">
        <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-md animate-pulse"></div>
        <div className="absolute inset-0 rounded-full border border-rose-500/30 flex items-center justify-center">
          <div className="w-[92%] h-[92%] rounded-full border border-dashed border-rose-500/40 animate-[spin_10s_linear_infinite]"></div>
        </div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-b from-rose-400 to-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.6)] z-10 border border-rose-300/30">
          <span className="text-xl">🚀</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-16 h-16 flex items-center justify-center shrink-0 select-none">
      <div className="absolute inset-0 rounded-full bg-cyber-blue/20 blur-md animate-pulse"></div>
      <div className="absolute inset-0 rounded-full border border-cyber-blue/30 flex items-center justify-center">
        <div className="w-[92%] h-[92%] rounded-full border border-dashed border-cyber-blue/40 animate-[spin_25s_linear_infinite]"></div>
      </div>
      <div className="w-12 h-12 rounded-full bg-gradient-to-b from-cyber-blue to-[#00ffff] flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.5)] z-10 border border-cyber-cyan/30">
        <span className="font-mono font-black text-xs text-slate-950">{cleanSymbol.substring(0, 3)}</span>
      </div>
    </div>
  );
};

const FALLBACK_NEWS = [
  { title: "Satoshi-era Bitcoin Wallets Awaken After 14 Years of Inactivity", link: "https://www.coingecko.com" },
  { title: "Layer-2 Ecosystem TVL Hits All-Time High Led by Arbitrum and Base", link: "https://www.coingecko.com" },
  { title: "Ethereum Gas Burn Rate Surges as On-Chain DeFi Transactions Spike", link: "https://www.coingecko.com" },
  { title: "Major Institutional Allocations Continue Into Spot Crypto Exchange Traded Funds", link: "https://www.coingecko.com" },
  { title: "Kaspa BlockDAG Network Reaches New Milestones in Speed and Scalability Tests", link: "https://www.coingecko.com" }
];

export default function MarketTicker({ compact = false, reviews = [], onSelectReview, mode = 'all' }: MarketTickerProps) {
  const [globalStats, setGlobalStats] = useState(() => {
    try {
      const cached = localStorage.getItem('crypto_lab_ecosystem_metrics');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return {
            dominance: typeof parsed.dominance === 'number' ? parsed.dominance : 58.9,
            dominanceChange: typeof parsed.dominanceChange === 'number' ? parsed.dominanceChange : 0.3,
            totalMcap: typeof parsed.totalMcap === 'number' ? parsed.totalMcap : 2.25, 
            totalMcapChange: typeof parsed.totalMcapChange === 'number' ? parsed.totalMcapChange : 1.2,
            volume24h: typeof parsed.volume24h === 'number' ? parsed.volume24h : 65.8, 
            fngValue: typeof parsed.fngValue === 'number' ? parsed.fngValue : 40,
            fngClass: parsed.fngClass || 'Neutral',
            updatedAt: parsed.updatedAt || 'just now'
          };
        }
      }
    } catch (e) {
      // Ignore cache parse error
    }
    return {
      dominance: 58.9,
      dominanceChange: 0.3,
      totalMcap: 2.25, 
      totalMcapChange: 1.2,
      volume24h: 65.8, 
      fngValue: 40,
      fngClass: 'Neutral',
      updatedAt: 'just now'
    };
  });

  const [isFetching, setIsFetching] = useState(false);
  const [news, setNews] = useState<{ title: string; link: string }[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  // Auto-cycling showcase states
  const allAudits = reviews && reviews.length > 0 ? reviews : INITIAL_REVIEWS;
  const [activeAuditIdx, setActiveAuditIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isFading, setIsFading] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const CYCLE_TIME = 5000; // 5 seconds per project cycle

  // Fetch market index metrics
  const fetchMarketData = async () => {
    setIsFetching(true);
    try {
      let fetchedFngVal: number | null = null;
      let fetchedFngClass: string | null = null;
      let fetchedDominance: number | null = null;
      let fetchedDominanceChange: number | null = null;
      let fetchedTotalMcap: number | null = null;
      let fetchedTotalMcapChange: number | null = null;
      let fetchedVolume24h: number | null = null;

      try {
        const gasUrl = 'https://script.google.com/macros/s/AKfycbxxW3v-1S4XobJC0wRjGi_SKBdsuZXY08fLMFgGfJUD2mvkBkgsaVsWcUC8XxnUWw390Q/exec';
        const fngRes = await fetch(gasUrl);
        if (fngRes.ok) {
          const fngData = await fngRes.json();
          
          // 1. Parse Fear & Greed Index
          const parsed = parseFngResponse(fngData);
          if (parsed) {
            fetchedFngVal = parsed.value;
            fetchedFngClass = parsed.classification;
          }

          // 2. Parse other metrics from proxy if available
          if (fngData.btc_dominance !== undefined) {
            const dom = parseFloat(fngData.btc_dominance);
            if (!isNaN(dom)) fetchedDominance = parseFloat(dom.toFixed(1));
          }
          const domChange = fngData.btc_dominance_change !== undefined ? fngData.btc_dominance_change : fngData.btc_dominance_24h_percentage_change;
          if (domChange !== undefined) {
            const dc = parseFloat(domChange);
            if (!isNaN(dc)) fetchedDominanceChange = parseFloat(dc.toFixed(2));
          }

          if (fngData.total_market_cap !== undefined) {
            const rawCap = parseFloat(fngData.total_market_cap);
            if (!isNaN(rawCap)) {
              fetchedTotalMcap = rawCap > 100000000 ? parseFloat((rawCap / 1e12).toFixed(2)) : parseFloat(rawCap.toFixed(2));
            }
          }
          const capChange = fngData.total_market_cap_yesterday_percentage_change !== undefined ? fngData.total_market_cap_yesterday_percentage_change : fngData.total_market_cap_change;
          if (capChange !== undefined) {
            const cc = parseFloat(capChange);
            if (!isNaN(cc)) fetchedTotalMcapChange = parseFloat(cc.toFixed(2));
          }

          if (fngData.total_volume_24h !== undefined) {
            const rawVol = parseFloat(fngData.total_volume_24h);
            if (!isNaN(rawVol)) {
              fetchedVolume24h = rawVol > 100000000 ? parseFloat((rawVol / 1e9).toFixed(1)) : parseFloat(rawVol.toFixed(1));
            }
          }
        }
      } catch (e) {
        console.warn('Could not fetch F&G from custom proxy.', e);
      }

      if (fetchedFngVal === null) {
        try {
          const fngRes = await fetch('https://api.alternative.me/fng/');
          if (fngRes.ok) {
            const fngData = await fngRes.json();
            if (fngData && fngData.data && fngData.data[0]) {
              const item = fngData.data[0];
              const parsedVal = parseInt(item.value, 10);
              if (!isNaN(parsedVal)) {
                fetchedFngVal = parsedVal;
                fetchedFngClass = item.value_classification || getFngClassification(parsedVal);
              }
            }
          }
        } catch (e) {
          console.warn('Alternative.me fallback failed.', e);
        }
      }

      setGlobalStats(prev => {
        const now = new Date();
        const updated = { 
          ...prev, 
          fngValue: fetchedFngVal !== null ? fetchedFngVal : prev.fngValue, 
          fngClass: fetchedFngClass !== null ? fetchedFngClass : prev.fngClass,
          dominance: fetchedDominance !== null ? fetchedDominance : prev.dominance,
          dominanceChange: fetchedDominanceChange !== null ? fetchedDominanceChange : prev.dominanceChange,
          totalMcap: fetchedTotalMcap !== null ? fetchedTotalMcap : prev.totalMcap,
          totalMcapChange: fetchedTotalMcapChange !== null ? fetchedTotalMcapChange : prev.totalMcapChange,
          volume24h: fetchedVolume24h !== null ? fetchedVolume24h : prev.volume24h,
          updatedAt: `at ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
        };
        try {
          localStorage.setItem('crypto_lab_ecosystem_metrics', JSON.stringify(updated));
        } catch (err) {}
        return updated;
      });
    } catch (e) {
      console.warn('Fear/Greed API connection bypassed.');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch CoinGecko News Feed RSS
  useEffect(() => {
    let active = true;
    const fetchNews = async () => {
      try {
        const res = await fetch(
          'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.coingecko.com%2Frss&api_key=9ny0fthvwr82qpycfrjdk72nuqnzsaiwllr1apfu'
        );
        if (res.ok) {
          const data = await res.json();
          if (active && data.items && Array.isArray(data.items)) {
            setNews(data.items.map((item: any) => ({
              title: item.title,
              link: item.link
            })));
          }
        }
      } catch (err) {
        console.error('Failed to fetch CoinGecko news RSS:', err);
      } finally {
        if (active) setNewsLoading(false);
      }
    };
    fetchNews();
    return () => {
      active = false;
    };
  }, []);

  // Handle active audit auto-cycling & progress animation
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    if (isPlaying && allAudits.length > 0) {
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
  }, [isPlaying, activeAuditIdx, allAudits]);

  const handleNextAudit = () => {
    setIsFading(true);
    setTimeout(() => {
      setActiveAuditIdx(prev => (prev + 1) % allAudits.length);
      setProgressPercent(0);
      setIsFading(false);
    }, 300);
  };

  const handlePrevAudit = () => {
    setIsFading(true);
    setTimeout(() => {
      setActiveAuditIdx(prev => (prev - 1 + allAudits.length) % allAudits.length);
      setProgressPercent(0);
      setIsFading(false);
    }, 300);
  };

  // Radian needle calculations for Fear & Greed gauge
  const needleAngle = (globalStats.fngValue / 100) * 180 - 90;

  const getGradeColor = (grade: string) => {
    if (grade === 'AAA') {
      return 'text-cyber-cyan border-cyber-cyan/40 bg-cyber-cyan/10 shadow-[0_0_15px_rgba(0,229,255,0.25)] font-black';
    }
    if (grade === 'AA') {
      return 'text-cyber-green border-cyber-green/30 bg-cyber-green/10 shadow-[0_0_12px_rgba(0,255,136,0.15)] font-extrabold';
    }
    if (grade.charAt(0) === 'A') {
      return 'text-cyber-cyan border-cyber-cyan/20 bg-cyber-cyan/5 font-bold';
    }
    if (grade.charAt(0) === 'B') {
      return 'text-cyber-text-primary border-cyber-text-muted/30 bg-cyber-text-secondary/10 font-semibold';
    }
    if (grade.charAt(0) === 'C') {
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

  const newsList = news.length > 0 ? news : FALLBACK_NEWS;
  const doubledNews = [...newsList, ...newsList];

  // Active showcase project details
  const activeAudit = allAudits[activeAuditIdx] || allAudits[0];

  if (mode === 'showcase') {
    return (
      allAudits.length > 0 && activeAudit ? (
        <TiltCard className="h-full bg-gradient-to-br from-[#09223a] via-[#05111f] to-[#020810] border-t border-l border-cyber-cyan/40 border-r-2 border-b-2 border-r-cyber-cyan/35 border-b-cyber-cyan/30 rounded-3xl shadow-[inset_0_1px_1.5px_rgba(0,229,255,0.35),_0_16px_30px_rgba(0,0,0,0.85),_0_0_25px_rgba(0,229,255,0.1)] overflow-hidden">
          <div className="p-5 sm:p-6 relative flex flex-col justify-between min-h-[190px] md:min-h-[210px] h-full">
            {/* Futuristic HUD brackets & left visual line */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyber-cyan/40 rounded-tl-3xl z-20"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyber-cyan/40 rounded-br-3xl z-20"></div>
            <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-gradient-to-b from-cyber-cyan via-cyber-blue to-transparent z-20"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,229,255,0.05),transparent_60%)] pointer-events-none"></div>

            {/* Header containing ONLY Audited Projects Showcase */}
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-cyber-cyan/15 flex-wrap gap-2">
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectReview) onSelectReview('');
                }}
                className="font-display font-black text-xs uppercase tracking-widest text-cyber-cyan flex items-center gap-2 hover:text-white transition-colors cursor-pointer group"
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
              className={`flex-1 flex flex-col justify-between gap-4 transition-all duration-300 cursor-pointer group py-2 ${
                isFading ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
              }`}
            >
              {/* Top Row: Coin Icon, Name/Category, and Grade/Index badge */}
              <div className="flex items-center gap-3.5 w-full">
                {/* Advanced custom coin render */}
                <div className="scale-85 sm:scale-95 origin-center shrink-0">
                  {renderCoinIcon(activeAudit.symbol, activeAudit.logoUrl, activeAudit.name)}
                </div>

                {/* Name and Meta details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-black text-base sm:text-lg text-cyber-text-primary group-hover:text-cyber-cyan group-hover:drop-shadow-[0_0_8px_rgba(0,229,255,0.4)] transition-all truncate">
                      {activeAudit.name}
                    </span>
                    <span className="font-mono text-[10px] text-cyber-cyan/70 bg-cyber-cyan/5 px-1.5 py-0.2 rounded border border-cyber-cyan/15 uppercase font-bold shrink-0">
                      {activeAudit.symbol}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[10px] font-mono text-cyber-text-secondary uppercase tracking-wider">
                      {activeAudit.category}
                    </span>
                    <span className="text-cyber-cyan/30 text-[9px] font-mono select-none">•</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold tracking-wider ${getRiskStyles(activeAudit.riskLevel)}`}>
                      {activeAudit.riskLevel} Risk
                    </span>
                  </div>
                </div>

                {/* Compact Holographic Index & Grade Badge */}
                <div className="shrink-0 flex items-center gap-2 bg-cyber-cyan/5 px-3 py-2 rounded-xl border border-cyber-cyan/10 select-none">
                  <div className="text-right">
                    <div className="text-[8px] font-mono text-cyber-text-muted leading-none uppercase tracking-wider">INDEX</div>
                    <div className="text-xs font-display font-black text-cyber-text-primary mt-0.5">{activeAudit.overallScore}%</div>
                  </div>
                  <div className="w-[1px] h-6 bg-cyber-cyan/15"></div>
                  <div className="text-center">
                    <div className="text-[8px] font-mono text-cyber-text-muted leading-none uppercase tracking-wider">GRADE</div>
                    <div className={`text-xs font-mono font-black mt-0.5 ${getGradeColor(activeAudit.grade)}`}>
                      {activeAudit.grade}
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Row: Bento-style Compartmentalized Audit Metrics */}
              <div className="grid grid-cols-3 gap-2 border-t border-b border-cyber-cyan/10 py-2.5 my-1 select-none text-[10px] font-mono">
                <div className="flex flex-col items-center sm:items-start px-1">
                  <span className="text-cyber-text-muted text-[8px] tracking-wider uppercase">STABILITY</span>
                  <span className="text-cyber-green font-bold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyber-green inline-block animate-pulse"></span>
                    PASS
                  </span>
                </div>
                <div className="flex flex-col items-center sm:items-start border-l border-r border-cyber-cyan/10 px-1">
                  <span className="text-cyber-text-muted text-[8px] tracking-wider uppercase">SECURITY</span>
                  <span className="text-cyber-cyan font-bold mt-0.5">EXTREME</span>
                </div>
                <div className="flex flex-col items-center sm:items-start px-1">
                  <span className="text-cyber-text-muted text-[8px] tracking-wider uppercase">MONITORING</span>
                  <span className="text-cyber-text-primary font-bold mt-0.5">REAL-TIME</span>
                </div>
              </div>

              {/* Verdict Paragraph with elegant indicator border */}
              <div className="border-l-2 border-cyber-cyan/25 pl-3.5 py-1 my-1">
                <p className="text-xs text-cyber-text-secondary leading-relaxed font-sans line-clamp-2">
                  {activeAudit.verdict || activeAudit.summary}
                </p>
              </div>

              {/* Interactive Footer element */}
              <div className="flex justify-between items-center pt-2.5 border-t border-cyber-cyan/10">
                <span className="text-[9px] font-mono text-cyber-text-muted tracking-wider uppercase select-none hidden sm:inline">
                  Click card to view complete smart contract audit blueprint
                </span>
                <span className="text-[9px] font-mono text-cyber-text-muted tracking-wider uppercase select-none sm:hidden">
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
      ) : null
    );
  }

  if (mode === 'metrics') {
    return (
      <div className="bg-cyber-bg-card border border-cyber-cyan/15 rounded-3xl shadow-xl overflow-hidden cursor-default select-none">
        <div className="p-4 sm:p-5 relative flex flex-col gap-3">
          {/* Header */}
          <div className="flex justify-between items-center pb-2.5 border-b border-cyber-cyan/15">
            <span className="font-display font-bold text-xs uppercase tracking-widest text-cyber-text-secondary flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyber-cyan" />
              Ecosystem Metrics <span className="text-[9px] font-mono font-normal tracking-wider opacity-60">by <span className="font-bold text-cyber-blue uppercase">CMC</span></span>
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); fetchMarketData(); }} 
              disabled={isFetching}
              className="text-cyber-text-muted hover:text-cyber-cyan transition-colors cursor-pointer p-1 -mr-1 shrink-0 flex items-center justify-center rounded-lg hover:bg-cyber-cyan/10"
              title="Refresh market stats"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isFetching ? 'animate-spin text-cyber-cyan' : ''}`} />
            </button>
          </div>

          {/* Side-by-side grid layout for metrics list and fear & greed index */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1">
            {/* Left side: Market Statistics */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center py-1 border-b border-cyber-cyan/5 text-xs gap-2">
                <span className="font-mono text-[10px] text-cyber-text-muted shrink-0 whitespace-nowrap">BTC DOMINANCE</span>
                <span className="font-display font-semibold text-xs text-cyber-text-primary flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  {globalStats.dominance}%
                  <span className={`font-mono text-[9px] ${globalStats.dominanceChange >= 0 ? 'text-cyber-green' : 'text-rose-400'}`}>
                    {globalStats.dominanceChange >= 0 ? '▲' : '▼'} {Math.abs(globalStats.dominanceChange)}%
                  </span>
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-cyber-cyan/5 text-xs gap-2">
                <span className="font-mono text-[10px] text-cyber-text-muted shrink-0 whitespace-nowrap">TOTAL MARKET CAP</span>
                <span className="font-display font-semibold text-xs text-cyber-text-primary flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  ${globalStats.totalMcap}T
                  <span className={`font-mono text-[9px] ${globalStats.totalMcapChange >= 0 ? 'text-cyber-green' : 'text-rose-400'}`}>
                    {globalStats.totalMcapChange >= 0 ? '▲' : '▼'} {Math.abs(globalStats.totalMcapChange)}%
                  </span>
                </span>
              </div>

              <div className="flex justify-between items-center py-1 text-xs gap-2">
                <span className="font-mono text-[10px] text-cyber-text-muted shrink-0 whitespace-nowrap">24H VOLUME</span>
                <span className="font-display font-semibold text-xs text-cyber-text-primary shrink-0 whitespace-nowrap">
                  ${globalStats.volume24h}B
                </span>
              </div>
            </div>

            {/* Right side: Fear & Greed Index Gauge */}
            <div className="flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-cyber-cyan/10 pt-3 sm:pt-0 sm:pl-3">
              <span className="font-mono text-[9px] text-cyber-text-muted uppercase tracking-wider mb-1">Fear & Greed Index</span>
              
              <div className="relative w-28 h-14 flex items-end justify-center overflow-visible select-none">
                <svg className="w-28 h-14 block" viewBox="0 0 112 56">
                  <path
                    d="M 8 52 A 48 48 0 0 1 104 52"
                    fill="none"
                    stroke="rgba(0, 229, 255, 0.12)"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  <path d="M 8 52 A 48 48 0 0 1 17.2 23.8" fill="none" stroke="#ff3b3b" strokeWidth="7" strokeLinecap="round" />
                  <path d="M 17.2 23.8 A 48 48 0 0 1 41.2 6.4" fill="none" stroke="#ff8c42" strokeWidth="7" />
                  <path d="M 41.2 6.4 A 48 48 0 0 1 70.8 6.4" fill="none" stroke="#ffd93d" strokeWidth="7" />
                  <path d="M 70.8 6.4 A 48 48 0 0 1 94.8 23.8" fill="none" stroke="#6bcf63" strokeWidth="7" />
                  <path d="M 94.8 23.8 A 48 48 0 0 1 104 52" fill="none" stroke="#00ff88" strokeWidth="7" strokeLinecap="round" />
                </svg>

                <div 
                  className="absolute left-1/2 bottom-1 w-0.5 h-[40px] bg-cyber-cyan z-10 transition-transform duration-700 ease-out"
                  style={{
                    transform: `translate(-50%, 0) rotate(${needleAngle}deg)`,
                    transformOrigin: 'bottom center',
                    boxShadow: '0 0 8px #00e5ff'
                  }}
                >
                  <div 
                    className="absolute bottom-0 left-1/2 w-2.5 h-2.5 bg-cyber-cyan rounded-full shadow-[0_0_8px_#00e5ff] border border-cyber-bg-primary"
                    style={{ transform: 'translate(-50%, 50%)' }}
                  />
                </div>
              </div>

              <div 
                className="text-xs font-display font-bold mt-1 tracking-wide uppercase"
                style={{ color: getFngColor(globalStats.fngValue) }}
              >
                {globalStats.fngValue} — {globalStats.fngClass}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* CoinGecko News Ticker disabled - we'll find a better spot for it later */}
      {/* 
      <div className="w-full bg-[#00ffff] text-slate-950 rounded-full py-1 px-1 shadow-[0_0_20px_rgba(0,229,255,0.25)] flex items-center relative overflow-hidden border border-cyber-cyan/30">
        <div className="flex items-center justify-center shrink-0 bg-[#00ffff] rounded-full p-1 z-10 select-none w-8 h-8">
          <img 
            alt="CoinGecko Logo" 
            src="https://i.imgur.com/C0XdVOy.png" 
            className="w-full h-full object-contain rounded-full" 
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="relative flex-1 overflow-hidden h-7 flex items-center pl-3">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes ticker-marquee {
              0% { transform: translateX(0%); }
              100% { transform: translateX(-50%); }
            }
            .ticker-marquee-track {
              display: inline-flex;
              white-space: nowrap;
              animation: ticker-marquee 55s linear infinite;
            }
            @media (hover: hover) {
              .ticker-marquee-track:hover {
                animation-play-state: paused;
              }
            }
          `}} />
          <div className="ticker-marquee-track gap-8 pr-4">
            {doubledNews.map((item, idx) => (
              <a 
                key={idx} 
                href={item.link} 
                target="_blank" 
                referrerPolicy="no-referrer" 
                rel="noopener noreferrer"
                className="font-sans font-bold text-[11px] sm:text-xs text-slate-950 hover:text-slate-900 transition-colors hover:underline flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <span className="text-slate-800 font-extrabold text-[14px]">▶</span>
                <span>{item.title}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
      */}

      {/* Auto-Cycling Audited Project Showcase Window (Replaces duplicates & covers overflow cards) */}
      {allAudits.length > 0 && activeAudit && (
        <div className="bg-gradient-to-br from-[#09223a] via-[#05111f] to-[#020810] border-t border-l border-cyber-cyan/40 border-r-2 border-b-2 border-r-cyber-cyan/35 border-b-cyber-cyan/30 rounded-3xl p-3.5 sm:p-4 shadow-[inset_0_1px_1.5px_rgba(0,229,255,0.35),_0_16px_30px_rgba(0,0,0,0.85),_0_0_25px_rgba(0,229,255,0.1)] hover:shadow-[inset_0_1px_2px_rgba(0,229,255,0.45),_0_20px_40px_rgba(0,0,0,0.9),_0_0_30px_rgba(0,229,255,0.15)] transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[175px] md:min-h-[190px]">
          {/* Futuristic HUD brackets & left visual line */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyber-cyan/40 rounded-tl-3xl z-20"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyber-cyan/40 rounded-br-3xl z-20"></div>
          <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-gradient-to-b from-cyber-cyan via-cyber-blue to-transparent z-20"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,229,255,0.05),transparent_60%)] pointer-events-none"></div>

          {/* Header containing ONLY Audited Projects Showcase */}
          <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-cyber-cyan/10">
            <span className="font-display font-black text-xs uppercase tracking-widest text-cyber-cyan flex items-center gap-2">
              <Award className="w-4 h-4 text-cyber-cyan animate-pulse" />
              Audited Projects Showcase
            </span>
            
            {/* Control buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
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
            className={`flex-1 flex flex-col justify-between gap-3.5 transition-all duration-300 cursor-pointer group py-1.5 ${
              isFading ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
            }`}
          >
            {/* Top Row: Coin Icon, Name/Category, and Grade/Index badge */}
            <div className="flex items-center gap-3 w-full">
              {/* Advanced custom coin render */}
              <div className="scale-85 sm:scale-95 origin-center shrink-0">
                {renderCoinIcon(activeAudit.symbol, activeAudit.logoUrl, activeAudit.name)}
              </div>

              {/* Name and Meta details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-black text-base sm:text-lg text-cyber-text-primary group-hover:text-cyber-cyan group-hover:drop-shadow-[0_0_8px_rgba(0,229,255,0.4)] transition-all truncate">
                    {activeAudit.name}
                  </span>
                  <span className="font-mono text-[10px] text-cyber-cyan/70 bg-cyber-cyan/5 px-1.5 py-0.2 rounded border border-cyber-cyan/15 uppercase font-bold shrink-0">
                    {activeAudit.symbol}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-[10px] font-mono text-cyber-text-secondary uppercase tracking-wider">
                    {activeAudit.category}
                  </span>
                  <span className="text-cyber-cyan/30 text-[9px] font-mono select-none">•</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold tracking-wider ${getRiskStyles(activeAudit.riskLevel)}`}>
                    {activeAudit.riskLevel} Risk
                  </span>
                </div>
              </div>

              {/* Compact Holographic Index & Grade Badge */}
              <div className="shrink-0 flex items-center gap-2 bg-cyber-cyan/5 px-2.5 py-1.5 rounded-xl border border-cyber-cyan/10 select-none">
                <div className="text-right">
                  <div className="text-[8px] font-mono text-cyber-text-muted leading-none uppercase tracking-wider">INDEX</div>
                  <div className="text-xs font-display font-black text-cyber-text-primary mt-0.5">{activeAudit.overallScore}%</div>
                </div>
                <div className="w-[1px] h-6 bg-cyber-cyan/15"></div>
                <div className="text-center">
                  <div className="text-[8px] font-mono text-cyber-text-muted leading-none uppercase tracking-wider">GRADE</div>
                  <div className={`text-xs font-mono font-black mt-0.5 ${getGradeColor(activeAudit.grade)}`}>
                    {activeAudit.grade}
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Row: Bento-style Compartmentalized Audit Metrics */}
            <div className="grid grid-cols-3 gap-2 border-t border-b border-cyber-cyan/5 py-2 select-none text-[10px] font-mono">
              <div className="flex flex-col items-center sm:items-start px-1">
                <span className="text-cyber-text-muted text-[8px] tracking-wider uppercase">STABILITY</span>
                <span className="text-cyber-green font-bold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyber-green inline-block animate-pulse"></span>
                  PASS
                </span>
              </div>
              <div className="flex flex-col items-center sm:items-start border-l border-r border-cyber-cyan/10 px-1">
                <span className="text-cyber-text-muted text-[8px] tracking-wider uppercase">SECURITY</span>
                <span className="text-cyber-cyan font-bold mt-0.5">EXTREME</span>
              </div>
              <div className="flex flex-col items-center sm:items-start px-1">
                <span className="text-cyber-text-muted text-[8px] tracking-wider uppercase">MONITORING</span>
                <span className="text-cyber-text-primary font-bold mt-0.5">REAL-TIME</span>
              </div>
            </div>

            {/* Verdict Paragraph with elegant indicator border */}
            <div className="border-l-2 border-cyber-cyan/20 pl-3 py-0.5">
              <p className="text-xs text-cyber-text-secondary leading-relaxed font-sans line-clamp-2">
                {activeAudit.verdict || activeAudit.summary}
              </p>
            </div>

            {/* Interactive Footer element */}
            <div className="flex justify-between items-center pt-2 border-t border-cyber-cyan/5">
              <span className="text-[9px] font-mono text-cyber-text-muted tracking-wider uppercase select-none hidden sm:inline">
                Click card to view complete smart contract audit blueprint
              </span>
              <span className="text-[9px] font-mono text-cyber-text-muted tracking-wider uppercase select-none sm:hidden">
                Tap card to view complete blueprint
              </span>
              <span className="font-display text-xs font-black uppercase text-cyber-cyan flex items-center gap-1 group-hover:translate-x-1.5 transition-transform select-none">
                View Report
                <ChevronRight className="w-4 h-4 text-cyber-cyan animate-pulse" />
              </span>
            </div>
          </div>

          {/* Navigation Controls and Timer Progress Bar */}
          <div className="mt-3 pt-2.5 border-t border-cyber-cyan/10 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handlePrevAudit}
                className="p-1.5 rounded-lg border border-cyber-cyan/10 hover:border-cyber-cyan/30 text-cyber-text-secondary hover:text-cyber-cyan transition-colors bg-cyber-bg-primary/40 cursor-pointer shadow-sm hover:shadow-[0_0_8px_rgba(0,229,255,0.2)]"
                title="Previous Project"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleNextAudit}
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
      )}

      {/* Secondary sidebar metrics block */}
      {!compact && (
        <div className="bg-cyber-bg-card border border-cyber-cyan/10 rounded-3xl p-4 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-cyber-cyan/10">
            <span className="font-display font-bold text-xs uppercase tracking-widest text-cyber-text-secondary flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyber-cyan" />
              Ecosystem Metrics <span className="text-[9px] font-mono font-normal tracking-wider opacity-60">by <span className="font-bold text-cyber-blue uppercase">CMC</span></span>
            </span>
            <button 
              onClick={fetchMarketData} 
              disabled={isFetching}
              className="text-cyber-text-muted hover:text-cyber-cyan transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center py-1 border-b border-cyber-cyan/5">
              <span className="font-mono text-[11px] text-cyber-text-muted">BTC DOMINANCE</span>
              <span className="font-display font-semibold text-xs text-cyber-text-primary flex items-center gap-1.5">
                {globalStats.dominance}%
                <span className="font-mono text-[9px] text-cyber-green">▲ {globalStats.dominanceChange}%</span>
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-cyber-cyan/5">
              <span className="font-mono text-[11px] text-cyber-text-muted">TOTAL MARKET CAP</span>
              <span className="font-display font-semibold text-xs text-cyber-text-primary flex items-center gap-1.5">
                ${globalStats.totalMcap}T
                <span className="font-mono text-[9px] text-cyber-green">▲ {globalStats.totalMcapChange}%</span>
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-cyber-cyan/5">
              <span className="font-mono text-[11px] text-cyber-text-muted">24H VOLUME</span>
              <span className="font-display font-semibold text-xs text-cyber-text-primary">
                ${globalStats.volume24h}B
              </span>
            </div>

            {/* Fear & Greed Radial Gauge */}
            <div className="pt-2 flex flex-col items-center">
              <span className="font-mono text-[9px] text-cyber-text-muted uppercase tracking-wider mb-2">Fear & Greed Index</span>
              
              <div className="relative w-28 h-14 overflow-hidden">
                {/* Colored Gauge Arc */}
                <div 
                  className="absolute top-0 left-0 w-28 h-28 rounded-full"
                  style={{
                    background: 'conic-gradient(from 270deg at 50% 50%, #ff3b3b 0deg, #ff8c42 45deg, #ffd93d 90deg, #6bcf63 135deg, #00ff88 180deg, transparent 180deg, transparent 360deg)',
                    mask: 'radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))',
                    WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))'
                  }}
                ></div>

                {/* Indicator Needle */}
                <div 
                  className="absolute left-1/2 bottom-0 w-0.5 h-[46px] bg-cyber-cyan origin-bottom -translate-x-1/2 transition-transform duration-1000 ease-out"
                  style={{
                    transform: `translateX(-50%) rotate(${needleAngle}deg)`,
                    boxShadow: '0 0 8px #00e5ff'
                  }}
                >
                  {/* Needle Hub Pivot center dot */}
                  <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-cyber-cyan rounded-full shadow-[0_0_6px_#00e5ff]"></div>
                </div>
              </div>

              <div 
                className="text-xs font-display font-bold mt-1.5 tracking-wide uppercase"
                style={{ color: getFngColor(globalStats.fngValue) }}
              >
                {globalStats.fngValue} — {globalStats.fngClass}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
