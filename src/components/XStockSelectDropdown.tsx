/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, Search, X, Layers, TrendingUp, TrendingDown } from 'lucide-react';
import { XStockRegistryItem } from '../data/xstocksRegistry';
import { XStockQuoteState } from './XStocksPage';

interface XStockSelectDropdownProps {
  stocks: XStockRegistryItem[];
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
  stockQuotes?: Record<string, XStockQuoteState>;
  className?: string;
  label?: string;
}

export const XStockSelectDropdown: React.FC<XStockSelectDropdownProps> = ({
  stocks,
  selectedSymbol,
  onSelect,
  stockQuotes,
  className = '',
  label = 'Target Tokenized Stock'
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedStock = useMemo(() => {
    return (
      stocks.find((s) => s.symbol.toUpperCase() === selectedSymbol.toUpperCase()) ||
      stocks[0]
    );
  }, [stocks, selectedSymbol]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      // Auto-focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Filter stocks by symbol, underlyingName, underlyingTicker, or category
  const filteredStocks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return stocks;
    return stocks.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.underlyingName.toLowerCase().includes(q) ||
        s.underlyingTicker.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.chain.toLowerCase().includes(q)
    );
  }, [stocks, searchQuery]);

  const handleSelect = (symbol: string) => {
    onSelect(symbol);
    setIsOpen(false);
    setSearchQuery('');
  };

  const selectedQuote = selectedStock ? stockQuotes?.[selectedStock.symbol.toUpperCase()] : undefined;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1 font-mono">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        id="xstock-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-900/90 hover:bg-slate-800/90 border transition-all duration-200 rounded-xl px-3 py-2.5 text-xs text-white flex items-center justify-between gap-2 cursor-pointer select-none group shadow-sm focus:outline-none ${
          isOpen
            ? 'border-cyber-cyan shadow-[0_0_15px_rgba(0,229,255,0.25)] ring-1 ring-cyber-cyan/50'
            : 'border-slate-700/80 hover:border-cyber-cyan/60'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Stock Logo or Icon Badge */}
          {selectedStock?.logoUrl ? (
            <img
              src={selectedStock.logoUrl}
              alt={selectedStock.symbol}
              className="w-6 h-6 rounded-lg object-contain bg-slate-950 border border-slate-800 p-0.5 shrink-0"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-6 h-6 rounded-lg bg-cyber-cyan/20 border border-cyber-cyan/40 text-cyber-cyan font-orbitron font-bold text-[9px] flex items-center justify-center shrink-0">
              {selectedStock?.symbol.slice(0, 3)}
            </div>
          )}

          {/* Symbol & Name */}
          <div className="flex items-baseline gap-2 truncate min-w-0">
            <span className="font-orbitron font-extrabold text-xs text-cyber-cyan tracking-wider shrink-0">
              {selectedStock?.symbol}
            </span>
            <span className="text-slate-500 shrink-0 font-mono text-[11px]">—</span>
            <span className="text-white font-medium truncate text-xs group-hover:text-slate-100">
              {selectedStock?.underlyingName}
            </span>
            <span className="text-slate-400 font-mono text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/70 shrink-0 hidden sm:inline-block">
              {selectedStock?.underlyingTicker}
            </span>
          </div>
        </div>

        {/* Right side: Live Price and Chevron */}
        <div className="flex items-center gap-2 shrink-0">
          {selectedQuote?.livePrice && selectedQuote.livePrice > 0 ? (
            <span className="text-emerald-400 font-mono font-bold text-xs bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded hidden xs:inline-block">
              ${selectedQuote.livePrice.toFixed(2)}
            </span>
          ) : null}

          <ChevronDown
            className={`w-4 h-4 text-slate-400 group-hover:text-cyber-cyan transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-cyber-cyan' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-[#090e15] border border-cyber-cyan/40 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_20px_rgba(0,229,255,0.15)] backdrop-blur-xl p-2 overflow-hidden flex flex-col"
          >
            {/* Header with Search and Asset Counter */}
            <div className="p-1.5 border-b border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider px-1">
                <span className="flex items-center gap-1.5 text-cyber-cyan font-bold">
                  <Layers className="w-3 h-3" /> Tokenized Equities
                </span>
                <span className="text-slate-500">{stocks.length} Registered (1:1 Backed)</span>
              </div>

              {/* Quick Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter stock (e.g. AAPL, TSLA, NVDA)..."
                  className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-cyber-cyan rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none focus:ring-1 focus:ring-cyber-cyan/50"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Stocks List */}
            <div
              className="max-h-56 sm:max-h-64 overflow-y-auto space-y-1 p-1 mt-1 font-mono text-xs custom-scrollbar"
              role="listbox"
            >
              {filteredStocks.length === 0 ? (
                <div className="py-6 text-center text-slate-500 font-mono text-xs">
                  No tokenized stocks found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredStocks.map((stock) => {
                  const isSelected = stock.symbol.toUpperCase() === selectedSymbol.toUpperCase();
                  const quote = stockQuotes?.[stock.symbol.toUpperCase()];
                  const livePrice = quote?.livePrice;
                  const change24h = quote?.change24h;

                  return (
                    <button
                      key={stock.symbol}
                      type="button"
                      onClick={() => handleSelect(stock.symbol)}
                      className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-2.5 transition-all duration-150 text-left cursor-pointer group ${
                        isSelected
                          ? 'bg-cyber-cyan/15 border border-cyber-cyan/40 text-white shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                          : 'bg-slate-900/40 hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 text-slate-300 hover:text-white'
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      {/* Left: Logo & Info */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {stock.logoUrl ? (
                          <img
                            src={stock.logoUrl}
                            alt={stock.symbol}
                            className="w-6 h-6 rounded-lg object-contain bg-slate-950 border border-slate-800 p-0.5 shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-cyber-cyan/20 border border-cyber-cyan/40 text-cyber-cyan font-orbitron font-bold text-[9px] flex items-center justify-center shrink-0">
                            {stock.symbol.slice(0, 3)}
                          </div>
                        )}

                        <div className="flex flex-col min-w-0 truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className={`font-orbitron font-bold text-xs tracking-wide shrink-0 ${
                                isSelected
                                  ? 'text-cyber-cyan'
                                  : 'text-white group-hover:text-cyber-cyan transition-colors'
                              }`}
                            >
                              {stock.symbol}
                            </span>
                            <span className="text-slate-500 text-[10px] shrink-0 font-mono">—</span>
                            <span className="text-slate-200 font-medium text-xs truncate group-hover:text-white">
                              {stock.underlyingName}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-mono">
                            <span className="bg-slate-800 px-1 py-0.2 rounded border border-slate-700/60 text-slate-300">
                              {stock.underlyingTicker}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 truncate">{stock.category}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Live Price & Selection Indicator */}
                      <div className="flex items-center gap-2 shrink-0">
                        {livePrice && livePrice > 0 ? (
                          <div className="text-right flex flex-col items-end">
                            <span className="font-mono font-bold text-xs text-white">
                              ${livePrice.toFixed(2)}
                            </span>
                            {change24h !== undefined && (
                              <span
                                className={`text-[10px] font-mono flex items-center gap-0.5 ${
                                  change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {change24h >= 0 ? (
                                  <TrendingUp className="w-2.5 h-2.5" />
                                ) : (
                                  <TrendingDown className="w-2.5 h-2.5" />
                                )}
                                {change24h >= 0 ? '+' : ''}
                                {change24h.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        ) : null}

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default XStockSelectDropdown;
