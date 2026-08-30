/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ComparisonReportData } from '../types';
import {
  Sliders,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Scale,
  CheckCircle2,
  AlertOctagon,
  Calendar,
  Check,
  Info,
  Lock,
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface ComparisonReportViewProps {
  data: ComparisonReportData;
  isPaidPro?: boolean;
  onUnlockPro?: () => void;
}

export const ComparisonReportView: React.FC<ComparisonReportViewProps> = ({
  data,
  isPaidPro = false,
  onUnlockPro
}) => {
  if (!data) return null;

  const {
    targetProtocol,
    benchmarkProtocol,
    freshnessDisclaimer,
    dimensionDeltas,
    scanVectorVerdicts,
    synthesizedNarrative
  } = data;

  return (
    <div className="mt-8 border-t border-slate-800/80 pt-8 space-y-6 text-slate-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-cyan-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-6 -translate-y-6 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                  {isPaidPro ? 'Security & Risk Assessment' : 'Institutional Benchmark'}
                </span>
                <span className="text-xs font-mono text-slate-400">Institutional Benchmark Analysis</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold font-mono text-slate-100 mt-0.5 flex items-center gap-2">
                {isPaidPro ? 'SECURITY ASSESSMENT COMPARISON' : 'BENCHMARK VARIANCE ANALYSIS'}
              </h3>
            </div>
          </div>

          <div className="text-right text-xs font-mono text-slate-400">
            <span>Framework: </span>
            <span className="text-amber-300 font-semibold">{targetProtocol.category}</span>
          </div>
        </div>

        {/* Disclaimer Banner if older than 30 days */}
        {freshnessDisclaimer && (
          <div className="mt-3 bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-xs font-mono text-amber-200/90 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 block mb-0.5">Historical Benchmark Notice</span>
              <span>{freshnessDisclaimer}</span>
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Headline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
        {/* VS Badge in Middle for Desktop */}
        <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-slate-900 border-2 border-amber-500/50 text-amber-300 font-mono text-xs font-bold items-center justify-center shadow-lg">
          VS
        </div>

        {/* Target Protocol Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">
                Primary Protocol
              </span>
              <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2 mt-0.5">
                {targetProtocol.name} <span className="text-xs font-mono text-cyan-400 font-semibold">({targetProtocol.symbol})</span>
              </h4>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold font-mono text-cyan-300">{targetProtocol.overallScore}</span>
              <span className="text-xs text-slate-400 font-mono">/100</span>
              <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                Grade: {targetProtocol.grade}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
            <div>
              <span>Risk: </span>
              <span className="text-slate-200 font-semibold">{targetProtocol.riskLevel}</span>
            </div>
            <div>
              <span>Date: </span>
              <span className="text-slate-300">{targetProtocol.createdAt}</span>
            </div>
          </div>
        </div>

        {/* Benchmark Protocol Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold block">
                Benchmark Protocol
              </span>
              <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2 mt-0.5">
                {benchmarkProtocol.name} <span className="text-xs font-mono text-amber-400 font-semibold">({benchmarkProtocol.symbol})</span>
              </h4>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold font-mono text-amber-300">{benchmarkProtocol.overallScore}</span>
              <span className="text-xs text-slate-400 font-mono">/100</span>
              <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                Grade: {benchmarkProtocol.grade}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
            <div>
              <span>Risk: </span>
              <span className="text-slate-200 font-semibold">{benchmarkProtocol.riskLevel}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>{benchmarkProtocol.createdAt}</span>
              {!benchmarkProtocol.isFresh && (
                <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1 rounded border border-amber-500/20">
                  {benchmarkProtocol.daysOld}d historical
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: 5-Dimension Weighted Variance Breakdown */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-3.5 sm:p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h4 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            5-Dimension Weighted Variance Breakdown
          </h4>
          <span className="text-[10px] font-mono text-slate-400">
            {targetProtocol.symbol} vs {benchmarkProtocol.symbol}
          </span>
        </div>

        {/* Mobile Touch Scroll Hint */}
        <div className="flex md:hidden items-center justify-between px-3 py-1 bg-amber-500/5 border-b border-amber-500/10 text-[10px] font-mono text-amber-400/90">
          <span>Touch & Swipe horizontally to view full benchmark metrics</span>
          <span className="flex items-center gap-1 font-bold">Scroll →</span>
        </div>

        <div className="benchmark-touch-scroll">
          <table className="w-full min-w-[620px] text-left text-xs font-mono">
            <thead className="bg-slate-950/40 text-slate-400 text-[10px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Evaluation Dimension</th>
                <th className="py-2.5 px-3 font-semibold text-center">Weight</th>
                <th className="py-2.5 px-3 font-semibold text-center">{targetProtocol.symbol}</th>
                <th className="py-2.5 px-3 font-semibold text-center">{benchmarkProtocol.symbol}</th>
                <th className="py-2.5 px-4 font-semibold text-right">Variance Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {dimensionDeltas.map((dim) => {
                const isPositive = dim.delta > 0;
                const isNegative = dim.delta < 0;
                return (
                  <tr key={dim.dimensionKey} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-200">
                      {dim.dimensionName}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400">
                      {dim.weightLabel}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-cyan-300">
                      {dim.primaryScore}/10
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-300">
                      {dim.benchmarkScore}/10
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {isPositive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                          +{dim.delta} pts
                        </span>
                      ) : isNegative ? (
                        <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                          {dim.delta} pts
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-bold">
                          0.0 pts
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Category Scan Vector Verdicts */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {/* Section Header: Always Displays the Name */}
        <div className="p-3.5 sm:p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
              Category Scan Vector Verdicts
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
              Exact Category Vectors: {targetProtocol.category}
            </span>
            {!isPaidPro ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                <Lock className="w-3 h-3" /> Assessment Required
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                <CheckCircle2 className="w-3 h-3" /> Unlocked
              </span>
            )}
          </div>
        </div>

        {isPaidPro ? (
          // UNLOCKED STATE: Full Comparative Table for Security Assessment
          <>
            {/* Mobile Touch Scroll Hint */}
            <div className="flex md:hidden items-center justify-between px-3 py-1 bg-cyan-500/5 border-b border-cyan-500/10 text-[10px] font-mono text-cyan-400/90">
              <span>Touch & Swipe horizontally to view vector verdicts</span>
              <span className="flex items-center gap-1 font-bold">Scroll →</span>
            </div>

            <div className="benchmark-touch-scroll">
              <table className="w-full min-w-[620px] text-left text-xs font-mono">
                <thead className="bg-slate-950/40 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Technical Threat Vector</th>
                    <th className="py-2.5 px-3 font-semibold text-center">{targetProtocol.symbol} Verdict</th>
                    <th className="py-2.5 px-3 font-semibold text-center">{benchmarkProtocol.symbol} Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {scanVectorVerdicts.map((vec, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-slate-200 block">{vec.vectorName}</span>
                        <span className="text-[10px] text-slate-400 block font-sans">{vec.checkDescription}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {vec.primaryVerdict.includes('FLAGGED') ? (
                          <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-bold font-mono text-[10px]">
                            <AlertOctagon className="w-3 h-3" /> {vec.primaryVerdict}
                          </span>
                        ) : (vec.primaryVerdict.includes('UNVERIFIED') || vec.primaryVerdict.includes('NOT_PERFORMED')) ? (
                          <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700 font-bold font-mono text-[10px]">
                            <HelpCircle className="w-3 h-3 text-slate-500" /> {vec.primaryVerdict}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold font-mono text-[10px]">
                            <Check className="w-3 h-3" /> {vec.primaryVerdict}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {vec.benchmarkVerdict.includes('FLAGGED') ? (
                          <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-bold font-mono text-[10px]">
                            <AlertOctagon className="w-3 h-3" /> {vec.benchmarkVerdict}
                          </span>
                        ) : (vec.benchmarkVerdict.includes('UNVERIFIED') || vec.benchmarkVerdict.includes('NOT_PERFORMED')) ? (
                          <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700 font-bold font-mono text-[10px]">
                            <HelpCircle className="w-3 h-3 text-slate-500" /> {vec.benchmarkVerdict}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold font-mono text-[10px]">
                            <Check className="w-3 h-3" /> {vec.benchmarkVerdict}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          // LOCKED STATE: Comparative Table Locked with Assessment Upgrade Overlay
          <div className="relative overflow-hidden bg-slate-950/90 p-6 sm:p-8 flex flex-col items-center justify-center text-center">
            {/* Background Frosted Ghost Matrix */}
            <div className="absolute inset-0 opacity-10 filter blur-[1px] pointer-events-none p-4 select-none flex flex-col justify-around">
              <div className="flex justify-between border-b border-slate-700 pb-2 text-[10px] font-mono text-slate-500">
                <span>Threat Vector Checklist</span>
                <span>{targetProtocol.symbol} Verdict</span>
                <span>{benchmarkProtocol.symbol} Verdict</span>
              </div>
              <div className="flex justify-between py-1.5 text-xs text-slate-600 font-mono">
                <span>Honeypot & Bytecode Trap Detection</span>
                <span>PASSED</span>
                <span>PASSED</span>
              </div>
              <div className="flex justify-between py-1.5 text-xs text-slate-600 font-mono">
                <span>Mintable Infinite Supply Vector</span>
                <span>PASSED</span>
                <span>FLAGGED</span>
              </div>
              <div className="flex justify-between py-1.5 text-xs text-slate-600 font-mono">
                <span>Flash-Loan Cascading Stress Limit</span>
                <span>PASSED</span>
                <span>PASSED</span>
              </div>
              <div className="flex justify-between py-1.5 text-xs text-slate-600 font-mono">
                <span>Proxy Admin Multi-Sig Governance Lock</span>
                <span>FLAGGED</span>
                <span>PASSED</span>
              </div>
            </div>

            {/* Foreground Lock Shield & Call to Action */}
            <div className="relative z-10 max-w-md space-y-3.5 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/40 text-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <Lock className="w-6 h-6 text-amber-400" />
              </div>
              <div className="space-y-1.5">
                <h5 className="text-sm sm:text-base font-bold font-mono text-slate-100 uppercase tracking-wide">
                  Comparative Threat Vector Table Locked
                </h5>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Deep comparative bytecode threat verdicts (Honeypot Bytecode, Mintable Supply, Proxy Multi-Sig Governance, Flash-Loan Immunity, and Liquidity Cascades) are restricted to the <strong className="text-amber-300 font-semibold">Security & Risk Assessment</strong>.
                </p>
              </div>

              {onUnlockPro && (
                <button
                  type="button"
                  onClick={onUnlockPro}
                  className="mt-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-amber-500/25 active:scale-98"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Unlock Security & Risk Assessment</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Synthesized Comparison Narrative */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-inner">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold font-mono text-amber-300 uppercase tracking-wider">
            Synthesized Institutional Comparison Narrative
          </h4>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
          {synthesizedNarrative}
        </p>
      </div>
    </div>
  );
};
