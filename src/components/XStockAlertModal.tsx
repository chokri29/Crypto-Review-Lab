/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  X, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  Play,
  RotateCcw
} from 'lucide-react';
import { XStockRegistryItem } from '../data/xstocksRegistry';
import { XStockQuoteState } from './XStocksPage';
import { XStockSelectDropdown } from './XStockSelectDropdown';

export interface XStockPriceAlert {
  id: string;
  symbol: string;
  name: string;
  targetPrice: number;
  direction: 'ABOVE' | 'BELOW';
  createdPrice: number;
  createdAt: string;
  active: boolean;
  triggered: boolean;
  triggeredAt?: string;
  triggeredPrice?: number;
  note?: string;
}

interface XStockAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStock: XStockRegistryItem;
  currentQuote?: XStockQuoteState;
  stockQuotes?: Record<string, XStockQuoteState>;
  allStocks: XStockRegistryItem[];
  alerts: XStockPriceAlert[];
  onAddAlert: (alert: Omit<XStockPriceAlert, 'id' | 'createdAt' | 'triggered'>) => void;
  onDeleteAlert: (id: string) => void;
  onToggleAlert: (id: string) => void;
  onResetAlert: (id: string) => void;
  onTestTriggerAlert: (stock: XStockRegistryItem) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export default function XStockAlertModal({
  isOpen,
  onClose,
  selectedStock,
  currentQuote,
  stockQuotes,
  allStocks,
  alerts,
  onAddAlert,
  onDeleteAlert,
  onToggleAlert,
  onResetAlert,
  onTestTriggerAlert,
  soundEnabled,
  onToggleSound
}: XStockAlertModalProps) {
  const [targetStockSymbol, setTargetStockSymbol] = useState<string>(selectedStock.symbol);
  const [targetPriceInput, setTargetPriceInput] = useState<string>('');
  const [direction, setDirection] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync target stock when opened or selected stock changes
  useEffect(() => {
    if (isOpen) {
      setTargetStockSymbol(selectedStock.symbol);
      const curPrice = currentQuote?.livePrice || 0;
      if (curPrice > 0) {
        // Default target to +3%
        const defTarget = (curPrice * 1.03).toFixed(2);
        setTargetPriceInput(defTarget);
        setDirection('ABOVE');
      } else {
        setTargetPriceInput('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, selectedStock, currentQuote]);

  if (!isOpen) return null;

  const targetStock = allStocks.find(s => s.symbol.toUpperCase() === targetStockSymbol.toUpperCase()) || selectedStock;
  const curLivePrice = (stockQuotes && stockQuotes[targetStock.symbol.toUpperCase()]?.livePrice) ||
    (targetStock.symbol === selectedStock.symbol ? currentQuote?.livePrice : 0) ||
    0;

  const handleStockSelect = (newSymbol: string) => {
    setTargetStockSymbol(newSymbol);
    const newStock = allStocks.find(s => s.symbol.toUpperCase() === newSymbol.toUpperCase());
    if (newStock) {
      const newPrice = (stockQuotes && stockQuotes[newStock.symbol.toUpperCase()]?.livePrice) ||
        (newStock.symbol === selectedStock.symbol ? currentQuote?.livePrice : 0) ||
        0;
      if (newPrice > 0) {
        setTargetPriceInput((newPrice * (direction === 'ABOVE' ? 1.03 : 0.97)).toFixed(2));
      }
    }
    setErrorMsg(null);
  };

  // Handle Preset Percentage Click
  const handleApplyPreset = (pct: number) => {
    if (curLivePrice <= 0) return;
    const computed = curLivePrice * (1 + pct / 100);
    setTargetPriceInput(computed.toFixed(2));
    setDirection(pct >= 0 ? 'ABOVE' : 'BELOW');
    setErrorMsg(null);
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(targetPriceInput);
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Please enter a valid positive target price threshold.');
      return;
    }

    onAddAlert({
      symbol: targetStock.symbol,
      name: targetStock.name,
      targetPrice: val,
      direction: direction,
      createdPrice: curLivePrice > 0 ? curLivePrice : val,
      active: true,
      note: note.trim() || undefined
    });

    setNote('');
    setErrorMsg(null);
  };

  const activeStockAlerts = alerts.filter(a => a.symbol.toUpperCase() === targetStock.symbol.toUpperCase());
  const otherAlerts = alerts.filter(a => a.symbol.toUpperCase() !== targetStock.symbol.toUpperCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-gradient-to-br from-slate-950 via-cyber-bg-card to-slate-950 border border-cyber-cyan/40 rounded-2xl w-full max-w-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between relative bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/30 text-cyber-cyan flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.25)]">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-orbitron font-extrabold text-sm sm:text-base text-white tracking-wider uppercase">
                  Price Alert Threshold System
                </h3>
                <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase tracking-wider bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30">
                  REAL-TIME ORACLE ALERTS
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono pt-0.5">
                Set custom target price thresholds and receive visual UI notifications when prices hit target.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleSound}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                soundEnabled 
                  ? 'bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]' 
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
              title={soundEnabled ? 'Alert audio sound chime is enabled' : 'Alert audio sound chime is muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 font-mono text-xs">
          
          {/* Create Alert Form */}
          <form onSubmit={handleCreateAlert} className="p-4 rounded-xl bg-slate-950/80 border border-cyber-cyan/30 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-orbitron font-bold text-xs text-white uppercase flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-cyber-cyan" />
                Configure New Price Threshold
              </span>
              {curLivePrice > 0 && (
                <span className="text-[11px] text-slate-400">
                  Current Converged: <strong className="text-white font-bold">${curLivePrice.toFixed(2)}</strong>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Asset Selector */}
              <XStockSelectDropdown
                stocks={allStocks}
                selectedSymbol={targetStockSymbol}
                onSelect={handleStockSelect}
                stockQuotes={stockQuotes}
                label="Target Tokenized Stock"
              />

              {/* Threshold Direction */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                  Trigger Condition
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('ABOVE')}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                      direction === 'ABOVE'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Rises Above (≥)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDirection('BELOW')}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                      direction === 'BELOW'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Falls Below (≤)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Target Price & Percentage Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Target Price ($ USD)
                </label>
                {/* Quick Presets */}
                {curLivePrice > 0 && (
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-slate-500 text-[9px] mr-1">Presets:</span>
                    {[-10, -5, -2, 2, 5, 10].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleApplyPreset(pct)}
                        className={`px-1.5 py-0.5 rounded border text-[9.5px] transition-all cursor-pointer ${
                          pct > 0 
                            ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/60'
                            : 'bg-rose-950/50 border-rose-500/30 text-rose-400 hover:bg-rose-900/60'
                        }`}
                      >
                        {pct > 0 ? `+${pct}%` : `${pct}%`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={targetPriceInput}
                  onChange={(e) => {
                    setTargetPriceInput(e.target.value);
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && curLivePrice > 0) {
                      if (val > curLivePrice) setDirection('ABOVE');
                      else if (val < curLivePrice) setDirection('BELOW');
                    }
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. 350.00"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyber-cyan rounded-xl pl-7 pr-3 py-2 text-sm text-white font-bold placeholder:text-slate-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Optional Alert Note */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                Alert Note / Trading Thesis (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Resistance breakout, re-evaluation threshold, take profit"
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyber-cyan rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 gap-2">
              <button
                type="button"
                onClick={() => onTestTriggerAlert(targetStock)}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-500/40 hover:border-purple-400 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Send a sample simulated UI alert to test notification popups and chime"
              >
                <Play className="w-3.5 h-3.5 text-purple-400" />
                <span>Test Trigger Alert</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyber-cyan to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-orbitron font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Set Price Alert</span>
              </button>
            </div>
          </form>

          {/* Active & Existing Price Alerts Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-orbitron font-bold text-xs text-white uppercase flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-cyber-cyan" />
                Active Alerts ({alerts.length})
              </span>
              <span className="text-[10px] text-slate-400">
                Monitored against live on-chain & Finnhub feeds
              </span>
            </div>

            {alerts.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center space-y-2">
                <Bell className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-slate-400 text-xs">
                  No active price alerts set yet.
                </p>
                <p className="text-[11px] text-slate-500">
                  Configure a target threshold above to receive instantaneous UI visual alerts whenever oracle prices cross your level.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {alerts.map((alert) => {
                  const isTargetStock = alert.symbol.toUpperCase() === targetStock.symbol.toUpperCase();
                  return (
                    <div 
                      key={alert.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        alert.triggered
                          ? 'bg-amber-950/30 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                          : alert.active
                          ? 'bg-slate-950/90 border-slate-800 hover:border-cyber-cyan/40'
                          : 'bg-slate-950/40 border-slate-900 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          alert.triggered
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse'
                            : alert.direction === 'ABOVE'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                        }`}>
                          {alert.triggered ? (
                            <BellRing className="w-4 h-4" />
                          ) : alert.direction === 'ABOVE' ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-orbitron font-bold text-white text-xs">
                              {alert.symbol}
                            </span>
                            <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold border ${
                              alert.direction === 'ABOVE'
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            }`}>
                              {alert.direction === 'ABOVE' ? '≥' : '≤'} ${alert.targetPrice.toFixed(2)}
                            </span>
                            {alert.triggered && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 animate-bounce">
                                TRIGGERED
                              </span>
                            )}
                          </div>
                          
                          <div className="text-[10px] text-slate-400 pt-0.5">
                            Created at ${alert.createdPrice.toFixed(2)} • {alert.name}
                          </div>
                          {alert.note && (
                            <div className="text-[10px] text-purple-300/90 italic pt-0.5">
                              "{alert.note}"
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {alert.triggered && (
                          <button
                            type="button"
                            onClick={() => onResetAlert(alert.id)}
                            className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                            title="Reset triggered status and re-arm alert"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Re-Arm</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onToggleAlert(alert.id)}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                            alert.active
                              ? 'bg-slate-900 text-slate-300 border-slate-700 hover:border-cyber-cyan'
                              : 'bg-slate-900 text-slate-500 border-slate-800'
                          }`}
                        >
                          {alert.active ? 'Active' : 'Paused'}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteAlert(alert.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                          title="Delete alert"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyber-cyan" />
            <span>Multi-oracle consensus alert engine active</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
