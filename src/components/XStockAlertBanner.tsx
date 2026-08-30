/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BellRing, X, ArrowRight, TrendingUp, TrendingDown, Sparkles, RotateCcw } from 'lucide-react';
import { XStockPriceAlert } from './XStockAlertModal';
import { XStockRegistryItem } from '../data/xstocksRegistry';

interface XStockAlertBannerProps {
  triggeredAlerts: XStockPriceAlert[];
  onDismissAlert: (id: string) => void;
  onSelectStock: (symbol: string) => void;
  onResetAlert: (id: string) => void;
  onOpenAlertsModal: () => void;
}

export default function XStockAlertBanner({
  triggeredAlerts,
  onDismissAlert,
  onSelectStock,
  onResetAlert,
  onOpenAlertsModal
}: XStockAlertBannerProps) {
  if (!triggeredAlerts || triggeredAlerts.length === 0) return null;

  return (
    <div className="space-y-2.5 animate-fadeIn">
      {triggeredAlerts.map((alert) => (
        <div
          key={alert.id}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/90 via-slate-950 to-amber-950/90 border-2 border-amber-500/70 p-4 sm:p-5 shadow-[0_0_30px_rgba(245,158,11,0.35)] backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          {/* Ambient Corner Pulse */}
          <div className="absolute -top-10 -left-10 w-28 h-28 bg-amber-500/20 rounded-full blur-2xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-amber-500/20 rounded-full blur-2xl pointer-events-none animate-pulse" />

          {/* Left Content */}
          <div className="flex items-start sm:items-center gap-3.5 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/60 text-amber-300 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-bounce">
              <BellRing className="w-5 h-5" />
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-sm">
                  PRICE ALERT TRIGGERED
                </span>
                <span className="font-orbitron font-extrabold text-sm sm:text-base text-white">
                  {alert.symbol} ({alert.name})
                </span>
              </div>

              <p className="text-xs font-mono text-amber-200/90 flex items-center gap-1.5 flex-wrap">
                <span>Oracle price hit threshold:</span>
                <strong className="text-white font-black bg-slate-900/90 px-1.5 py-0.5 rounded border border-amber-500/30">
                  {alert.direction === 'ABOVE' ? '≥' : '≤'} ${alert.targetPrice.toFixed(2)} USD
                </strong>
                {alert.triggeredPrice && (
                  <span className="text-slate-400">
                    (Current Converged: ${alert.triggeredPrice.toFixed(2)})
                  </span>
                )}
              </p>

              {alert.note && (
                <p className="text-[11px] font-mono text-purple-300 italic pt-0.5">
                  Note: "{alert.note}"
                </p>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 relative z-10 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => onSelectStock(alert.symbol)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
            >
              <span>View Terminal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onResetAlert(alert.id)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs flex items-center gap-1 transition-all cursor-pointer"
              title="Reset alert threshold to monitor again"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Re-Arm</span>
            </button>

            <button
              type="button"
              onClick={() => onDismissAlert(alert.id)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition-all cursor-pointer"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
