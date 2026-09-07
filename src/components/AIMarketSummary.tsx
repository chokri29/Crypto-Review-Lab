/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bot, RefreshCw, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { CryptoReview } from '../types';
import { useCurrency } from '../context/CurrencyContext';

interface AIMarketSummaryProps {
  reviews?: CryptoReview[];
}

export default function AIMarketSummary({ reviews = [] }: AIMarketSummaryProps) {
  const { formatCompactCap } = useCurrency();
  const [globalCap, setGlobalCap] = useState<number>(2.29); // In Trillions USD
  const [globalCapChange, setGlobalCapChange] = useState<number>(0.39);
  const [volume24h, setVolume24h] = useState<number>(55.04); // In Billions USD
  const [btcDominance, setBtcDominance] = useState<number>(56.7);
  const [topGainer, setTopGainer] = useState<{ symbol: string; change: number }>({ symbol: 'ETH', change: 1.80 });
  const [topLoser, setTopLoser] = useState<{ symbol: string; change: number }>({ symbol: 'HYPE', change: -3.20 });
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const fetchGlobalMarketData = async () => {
    setIsFetching(true);
    try {
      // 1. Fetch CoinGecko Global Market Metrics
      const res = await fetch('https://api.coingecko.com/api/v3/global');
      if (res.ok) {
        const payload = await res.json();
        if (payload && payload.data) {
          const data = payload.data;
          if (data.total_market_cap && data.total_market_cap.usd) {
            setGlobalCap(data.total_market_cap.usd / 1e12);
          }
          if (data.market_cap_change_percentage_24h_usd !== undefined) {
            setGlobalCapChange(data.market_cap_change_percentage_24h_usd);
          }
          if (data.total_volume && data.total_volume.usd) {
            setVolume24h(data.total_volume.usd / 1e9);
          }
          if (data.market_cap_percentage && data.market_cap_percentage.btc) {
            setBtcDominance(data.market_cap_percentage.btc);
          }
        }
      }

      // 2. Fetch Top Gainer / Loser from CoinGecko markets
      const coinIds = 'bitcoin,ethereum,solana,kaspa,binancecoin,ripple,chainlink,litecoin,tron,hyperliquid,jupiter-exchange-solana';
      const mRes = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&price_change_percentage=24h`);
      if (mRes.ok) {
        const mData = await mRes.json();
        if (Array.isArray(mData) && mData.length > 0) {
          let best = mData[0];
          let worst = mData[0];
          for (let i = 1; i < mData.length; i++) {
            const chg = mData[i].price_change_percentage_24h || 0;
            if (chg > (best.price_change_percentage_24h || 0)) best = mData[i];
            if (chg < (worst.price_change_percentage_24h || 0)) worst = mData[i];
          }
          if (best) {
            setTopGainer({
              symbol: (best.symbol || 'ETH').toUpperCase(),
              change: best.price_change_percentage_24h || 1.8
            });
          }
          if (worst) {
            setTopLoser({
              symbol: (worst.symbol || 'HYPE').toUpperCase(),
              change: worst.price_change_percentage_24h || -3.2
            });
          }
        }
      }
    } catch (err) {
      console.warn('AI Market Summary live fetch notice:', err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchGlobalMarketData();
    const interval = setInterval(fetchGlobalMarketData, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 backdrop-blur-md border border-cyber-cyan/35 hover:border-cyber-cyan/65 rounded-2xl p-5 md:p-6 shadow-xl hover:shadow-[0_12px_40px_rgba(0,229,255,0.22)] relative overflow-hidden group flex flex-col justify-between h-full select-none transition-all duration-300">
      {/* Top Cyber Glow Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent"></div>
      <div className="absolute top-0 right-0 w-36 h-36 bg-cyber-cyan/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none"></div>

      {/* Header */}
      <div className="flex justify-between items-center pb-3.5 border-b border-slate-800/80 mb-4 relative z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,229,255,0.25)]">
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h3 className="font-orbitron font-extrabold text-xs sm:text-sm text-slate-100 tracking-[2px] uppercase drop-shadow-[0_0_8px_rgba(0,229,255,0.3)]">
            AI Market Summary
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-cyber-cyan bg-cyber-cyan/15 border border-cyber-cyan/35 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold shadow-sm">
            LIVE INTEL
          </span>
          <button 
            onClick={fetchGlobalMarketData}
            disabled={isFetching}
            className="text-cyber-text-muted hover:text-cyber-cyan transition-colors cursor-pointer p-1 shrink-0 rounded-lg hover:bg-cyber-cyan/15 border border-transparent hover:border-cyber-cyan/20"
            title="Refresh AI Market Summary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-cyber-cyan' : ''}`} />
          </button>
        </div>
      </div>

      {/* Live Market Metrics Grid: 1 col on mobile, 2 cols on sm, 5 cols on lg desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Global Market Cap */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyber-cyan/30 flex flex-col justify-between shadow-inner hover:border-cyber-cyan/65 transition-colors">
          <div className="flex items-center justify-between gap-1">
            <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold truncate">
              GLOBAL MARKET CAP
            </div>
            <span className={`font-mono text-[11px] font-black px-1.5 py-0.5 rounded border shrink-0 flex items-center ${
              globalCapChange >= 0 
                ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' 
                : 'text-rose-300 bg-rose-500/15 border-rose-500/30'
            }`}>
              {globalCapChange >= 0 ? '+' : ''}{globalCapChange.toFixed(2)}%
            </span>
          </div>
          <div className="font-display font-black text-xl sm:text-2xl text-white tracking-tight drop-shadow-[0_0_12px_rgba(0,229,255,0.2)] py-1">
            {formatCompactCap(globalCap, 'T')}
          </div>
          <div className="font-mono text-[9.5px] text-slate-400 truncate">
            24h aggregate valuation
          </div>
        </div>

        {/* Metric 2: 24h Volume */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyber-cyan/30 flex flex-col justify-between shadow-sm hover:border-cyber-cyan/65 transition-colors">
          <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold truncate">
            24H VOLUME
          </div>
          <div className="font-display font-black text-xl sm:text-2xl text-cyber-cyan tracking-tight py-1">
            {formatCompactCap(volume24h, 'B')}
          </div>
          <div className="font-mono text-[9.5px] text-slate-400 truncate">
            global exchange vol
          </div>
        </div>

        {/* Metric 3: BTC Dominance */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyber-cyan/30 flex flex-col justify-between shadow-sm hover:border-cyber-cyan/65 transition-colors">
          <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold truncate">
            BTC DOMINANCE
          </div>
          <div className="font-display font-black text-xl sm:text-2xl text-amber-300 tracking-tight py-1">
            {btcDominance.toFixed(1)}%
          </div>
          <div className="font-mono text-[9.5px] text-slate-400 truncate">
            share of total cap
          </div>
        </div>

        {/* Metric 4: Top Gainer (24h) */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyber-cyan/30 flex flex-col justify-between shadow-sm hover:border-cyber-cyan/65 transition-colors">
          <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold truncate">
            TOP GAINER (24H)
          </div>
          <div className="flex items-baseline gap-1.5 py-1">
            <span className="font-mono font-black text-base sm:text-lg text-white">
              {topGainer.symbol}
            </span>
            <span className="font-mono font-black text-xs text-emerald-400">
              +{topGainer.change.toFixed(2)}%
            </span>
          </div>
          <div className="font-mono text-[9.5px] text-slate-400 truncate">
            active market leader
          </div>
        </div>

        {/* Metric 5: Top Loser (24h) */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyber-cyan/30 flex flex-col justify-between shadow-sm hover:border-cyber-cyan/65 transition-colors">
          <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold truncate">
            TOP LOSER (24H)
          </div>
          <div className="flex items-baseline gap-1.5 py-1">
            <span className="font-mono font-black text-base sm:text-lg text-white">
              {topLoser.symbol}
            </span>
            <span className="font-mono font-black text-xs text-rose-400">
              {topLoser.change.toFixed(2)}%
            </span>
          </div>
          <div className="font-mono text-[9.5px] text-slate-400 truncate">
            24h drawdown coin
          </div>
        </div>
      </div>
    </div>
  );
}
