/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Sparkles, RefreshCw, Plus, Check, X, TrendingUp, ShieldCheck, ExternalLink, Zap } from 'lucide-react';
import { CoinGeckoSearchResult, searchCoinGecko, fetchTrendingCoinGecko, createReviewFromCoinGecko } from '../services/coingecko';
import { CryptoReview } from '../types';

interface CoinGeckoExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingReviews: CryptoReview[];
  onAddOrSwapReview: (review: CryptoReview) => void;
  onSyncAllReviews?: () => void;
  isSyncing?: boolean;
}

export default function CoinGeckoExplorerModal({
  isOpen,
  onClose,
  existingReviews,
  onAddOrSwapReview,
  onSyncAllReviews,
  isSyncing
}: CoinGeckoExplorerModalProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CoinGeckoSearchResult[]>([]);
  const [trending, setTrending] = useState<CoinGeckoSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [isSyncingLocal, setIsSyncingLocal] = useState(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState(false);

  const handleTopSyncClick = async () => {
    setIsSyncingLocal(true);
    try {
      if (onSyncAllReviews) {
        await onSyncAllReviews();
      }
      setSyncSuccessToast(true);
      setTimeout(() => setSyncSuccessToast(false), 3000);
    } catch (err) {
      console.error('Failed to sync reviews from modal header:', err);
    } finally {
      setIsSyncingLocal(false);
    }
  };

  // Fetch trending on open
  useEffect(() => {
    if (isOpen) {
      setIsLoadingTrending(true);
      fetchTrendingCoinGecko().then(res => {
        setTrending(res);
        setIsLoadingTrending(false);
      });
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearching(true);
      searchCoinGecko(query).then(res => {
        setSearchResults(res);
        setIsSearching(false);
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleImport = async (coin: CoinGeckoSearchResult) => {
    setImportingId(coin.id);
    try {
      const review = await createReviewFromCoinGecko(coin.id, coin);
      onAddOrSwapReview(review);
      onClose();
    } catch (err) {
      console.error('Failed to import CoinGecko review:', err);
    } finally {
      setImportingId(null);
    }
  };

  const isCoinImported = (coinId: string) => {
    return existingReviews.some(
      r => r.coingeckoId === coinId || r.id === `cg-${coinId}` || r.id.toLowerCase().includes(coinId.toLowerCase())
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="relative w-full max-w-3xl bg-slate-900 border border-cyber-cyan/35 rounded-2xl shadow-[0_0_50px_rgba(0,229,255,0.2)] overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Glass Top Highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent"></div>

          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-cyber-cyan/20 flex items-center justify-between bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/35 text-cyber-cyan shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-base sm:text-lg text-cyber-text-primary uppercase tracking-wide flex items-center gap-2 flex-wrap">
                  Tri-Sync Market Explorer & Synchronizer
                  <span className="text-[9px] font-mono font-bold text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    CoinGecko + CMC + CoinStats Active
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-sans">
                  Cross-verify & switch projects using live CoinGecko API, CoinMarketCap (CMC), and CoinStats consensus feeds.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {syncSuccessToast && (
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg animate-fade-in shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  ✓ Tri-Synced!
                </span>
              )}
              <button
                type="button"
                onClick={handleTopSyncClick}
                disabled={isSyncing || isSyncingLocal}
                className="px-3 py-1.5 rounded-xl bg-cyber-cyan/15 hover:bg-cyber-cyan border border-cyber-cyan/40 hover:border-cyber-cyan text-cyber-cyan hover:text-slate-950 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                title="Update all registry prices using Tri-Sync Engine (CoinGecko + CMC + CoinStats)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${(isSyncing || isSyncingLocal) ? 'animate-spin text-white' : ''}`} />
                <span className="hidden sm:inline">{(isSyncing || isSyncingLocal) ? 'Syncing Tri-Engine...' : 'Sync Tri-Sync Engine'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-4 bg-slate-950/30 border-b border-cyber-cyan/10">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-cyan/70" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search thousands of projects via CoinGecko + CMC Dual Engine (e.g. Hyperliquid, Zama, Berachain, Ondo)..."
                className="w-full bg-slate-950 border border-cyber-cyan/30 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-cyber-text-primary placeholder:text-slate-500 focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan/50 font-sans transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
            {/* Search Results */}
            {query.trim().length >= 2 ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5" />
                    CoinGecko + CMC Dual Search Results
                  </h4>
                  {isSearching && (
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin text-cyber-cyan" /> Querying CoinGecko + CMC Dual API...
                    </span>
                  )}
                </div>

                {searchResults.length === 0 && !isSearching ? (
                  <div className="p-8 text-center bg-slate-950/40 border border-white/5 rounded-xl">
                    <p className="text-xs text-slate-400 font-sans">No protocols found matching "{query}". Try another ticker or project name.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {searchResults.map((coin) => {
                      const imported = isCoinImported(coin.id);
                      const isLoading = importingId === coin.id;

                      return (
                        <div
                          key={coin.id}
                          className="p-3 bg-slate-950/50 hover:bg-slate-950/80 border border-white/10 hover:border-cyber-cyan/40 rounded-xl flex items-center justify-between gap-3 transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {coin.thumb ? (
                              <img src={coin.thumb} alt={coin.name} className="w-7 h-7 rounded-lg bg-slate-950 p-0.5 border border-cyber-cyan/30 object-contain shrink-0" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center text-[10px] font-mono font-bold text-cyber-cyan shrink-0">
                                {coin.symbol.slice(0, 2)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                <span className="truncate">{coin.name}</span>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/25 shrink-0">
                                  {coin.symbol}
                                </span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                {coin.market_cap_rank ? `Rank #${coin.market_cap_rank}` : 'CoinGecko Project'}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleImport(coin)}
                            disabled={imported || isLoading}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                              imported
                                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 cursor-default'
                                : 'bg-cyber-cyan/15 hover:bg-cyber-cyan border border-cyber-cyan/40 text-cyber-cyan hover:text-slate-950 shadow-sm'
                            }`}
                          >
                            {isLoading ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Importing...</span>
                              </>
                            ) : imported ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>In Registry</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Switch / Add</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Trending Section */
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-cyber-cyan" />
                    CoinGecko + CMC Trending Protocols Right Now
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoadingTrending(true);
                      setTimeout(() => {
                        fetchTrendingCoinGecko().then(res => {
                          setTrending(res);
                          setIsLoadingTrending(false);
                        });
                      }, 300);
                    }}
                    disabled={isLoadingTrending}
                    className="text-[10px] font-mono text-cyber-cyan hover:text-white bg-cyber-cyan/10 hover:bg-cyber-cyan/25 px-2.5 py-1 rounded-lg border border-cyber-cyan/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingTrending ? 'animate-spin' : ''}`} />
                    <span>{isLoadingTrending ? 'Refreshing...' : 'Refresh List'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {trending.map((coin) => {
                    const imported = isCoinImported(coin.id);
                    const isLoading = importingId === coin.id;

                    return (
                      <div
                        key={coin.id}
                        className="p-3 bg-slate-950/50 hover:bg-slate-950/80 border border-white/10 hover:border-cyber-cyan/40 rounded-xl flex items-center justify-between gap-3 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {coin.thumb ? (
                            <img src={coin.thumb} alt={coin.name} className="w-8 h-8 rounded-full object-contain shrink-0" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center text-[10px] font-mono font-bold text-cyber-cyan shrink-0">
                              {coin.symbol.slice(0, 2)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                              <span className="truncate">{coin.name}</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/25 shrink-0">
                                {coin.symbol}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {coin.market_cap_rank ? `Rank #${coin.market_cap_rank}` : 'Trending'}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleImport(coin)}
                          disabled={imported || isLoading}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                            imported
                              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 cursor-default'
                              : 'bg-cyber-cyan/15 hover:bg-cyber-cyan border border-cyber-cyan/40 text-cyber-cyan hover:text-slate-950 shadow-sm'
                          }`}
                        >
                          {isLoading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Importing...</span>
                            </>
                          ) : imported ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>In Registry</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Switch / Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-slate-950/80 border-t border-cyber-cyan/15 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyber-cyan" />
              <span>Data source: Official CoinGecko API + CoinMarketCap (CMC) Pro API</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <a
                href="https://www.coingecko.com"
                target="_blank"
                rel="noreferrer noopener"
                className="text-cyber-cyan hover:underline flex items-center gap-1"
              >
                CoinGecko.com <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-slate-600">|</span>
              <a
                href="https://coinmarketcap.com"
                target="_blank"
                rel="noreferrer noopener"
                className="text-cyber-blue hover:underline flex items-center gap-1"
              >
                CoinMarketCap.com <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
