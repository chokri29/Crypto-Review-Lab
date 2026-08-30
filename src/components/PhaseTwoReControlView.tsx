/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PhaseTwoReControlReport } from '../types';
import { ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Layers, Cpu, FileCheck, Scale, Database, Binary, Clock, Info, Activity } from 'lucide-react';

interface PhaseTwoReControlViewProps {
  data?: PhaseTwoReControlReport | null;
  onTriggerPhaseTwo?: () => void;
  onTriggerRegenerate?: () => void;
  isExecuting?: boolean;
  executingStep?: number;
  isAdmin?: boolean;
  compact?: boolean;
}

export const PhaseTwoReControlView: React.FC<PhaseTwoReControlViewProps> = ({ 
  data, 
  onTriggerPhaseTwo, 
  onTriggerRegenerate, 
  isExecuting = false,
  executingStep = 0,
  isAdmin = false,
  compact = false 
}) => {
  const [expandedGate, setExpandedGate] = useState<number | null>(null);

  const gateIconsMap: Record<number, React.ReactNode> = {
    0: <FileCheck className="w-4 h-4 text-emerald-400" />,
    1: <Database className="w-4 h-4 text-cyan-400" />,
    2: <Binary className="w-4 h-4 text-purple-400" />,
    3: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
    4: <Layers className="w-4 h-4 text-amber-400" />,
    5: <Scale className="w-4 h-4 text-blue-400" />,
    6: <FileCheck className="w-4 h-4 text-teal-400" />,
    7: <Cpu className="w-4 h-4 text-rose-400" />
  };

  const gateStepList = [
    { num: 0, name: 'Structural Completeness Check' },
    { num: 1, name: 'Source Triangulation' },
    { num: 2, name: 'On-Chain Cross-Check' },
    { num: 3, name: 'Cross-Framework Consistency Check' },
    { num: 4, name: 'Tokenomics Re-verification' },
    { num: 5, name: 'Score Arithmetic Check' },
    { num: 6, name: 'Grade-Risk Alignment' },
    { num: 7, name: 'Formatting Integrity' }
  ];

  // If no report data yet
  if (!data) {
    if (isAdmin) {
      return (
        <div className="mt-8 border-t border-slate-800/80 pt-8 text-slate-200">
          <div className="p-5 sm:p-6 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-950 shadow-xl space-y-4 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-xl border bg-amber-500/20 border-amber-500/40 text-amber-300 shrink-0">
                  <ShieldCheck className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase tracking-widest font-bold px-2 py-0.5 rounded border bg-amber-950/60 border-amber-700/60 text-amber-300">
                      STAGE 2 RE-CONTROL: F2 & AVF CROSS-VALIDATION ENGINE VERIFICATION
                    </span>
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Phase 1 Complete (Client Draft Ready)
                    </span>
                  </div>
                  <h3 className="text-lg font-bold font-mono text-slate-100 mt-1">
                    PHASE 2 AUTOMATED RE-CONTROL (GATE 0 + 7 CONTROL GATES)
                  </h3>
                </div>
              </div>

              {isAdmin && onTriggerPhaseTwo && (
                <button
                  onClick={onTriggerPhaseTwo}
                  disabled={isExecuting}
                  className="shrink-0 w-full md:w-auto px-6 py-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-500 via-emerald-500 to-teal-400 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      Executing Gate {executingStep}/7...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4.5 h-4.5 text-slate-950" />
                      Initiate Phase 2 Verification
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Live Execution Scan Progress Panel */}
            {isExecuting && (
              <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-cyan-500/40 space-y-3 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-300 font-bold flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    Executing Gate 0 & 7 Automated Control Gates...
                  </span>
                  <span className="text-slate-400 text-[11px]">Gate {executingStep} / 7</span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-2 transition-all duration-300"
                    style={{ width: `${((executingStep + 1) / 8) * 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                  {gateStepList.map((item) => {
                    const isDone = executingStep > item.num;
                    const isCurrent = executingStep === item.num;
                    return (
                      <div 
                        key={item.num}
                        className={`p-2 rounded border flex items-center justify-between ${
                          isDone ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' :
                          isCurrent ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-200 animate-pulse' :
                          'bg-slate-900/60 border-slate-800 text-slate-500'
                        }`}
                      >
                        <span className="truncate">G{item.num}: {item.name}</span>
                        {isDone ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : isCurrent ? (
                          <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin shrink-0" />
                        ) : (
                          <span className="text-[9px] text-slate-600">WAIT</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Client view when Phase 2 has not run yet
    return (
      <div className="mt-8 border-t border-slate-800/80 pt-6">
        <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 text-xs font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-cyan-200 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50 uppercase">
                  Phase 1 Complete
                </span>
                <span className="text-[10px] text-slate-400">2-Stage Verification Architecture</span>
              </div>
              <h4 className="text-sm font-bold text-slate-100 font-mono mt-1">
                Stage 2 Re-Control & AVF Cross-Validation Engine Upgrade Active
              </h4>
            </div>
          </div>

          <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-bold text-[11px] uppercase tracking-wider shrink-0">
            F2 & AVF Active
          </span>
        </div>
      </div>
    );
  }

  const isPass = data?.status === 'PASS';
  const displayScore = typeof data.qualityScorePct === 'number' ? data.qualityScorePct : data.overallScorePct;
  const hasRiskFlags = (data.riskAttention && data.riskAttention.length > 0) || false;
  const riskGateNumbers = [1, 2, 4];

  return (
    <div className="mt-8 border-t border-slate-800/80 pt-8 space-y-6 text-slate-200">
      {/* Header Banner */}
      <div className={`p-5 rounded-2xl border shadow-xl relative overflow-hidden ${
        isPass 
          ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border-emerald-500/40' 
          : 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/40 border-rose-500/40'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-xl border shrink-0 ${
              isPass 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
            }`}>
              {isPass ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold px-2 py-0.5 rounded border bg-slate-950/60 border-slate-700 text-slate-300">
                  2-STAGE QUALITY CONTROL FRAMEWORK
                </span>
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  Phase 2: Automated Re-Control (5–10 min execution)
                </span>
              </div>
              <h3 className="text-lg font-bold font-mono text-slate-100 mt-1 flex items-center gap-2">
                PHASE 2: AUTOMATED RE-CONTROL STATUS
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs font-mono text-slate-400">Quality Score</div>
              <div className={`text-2xl font-black font-mono ${isPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                {displayScore}%
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                Composite: {data.overallScorePct}%
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold font-mono shadow-md ${
                isPass 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
              }`}>
                {isPass ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {isPass ? 'PASS (95%+)' : 'FAIL (<95%)'}
              </span>
            </div>
          </div>
        </div>

        {/* Workflow Delivery Banner */}
        <div className={`mt-4 p-3 rounded-xl border text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
          isPass 
            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' 
            : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
        }`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold">Workflow State:</span>
            {isPass ? (
              hasRiskFlags ? (
                <span className="text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  Passed QA — {data.riskAttention?.length} risk flag(s) for human review
                </span>
              ) : (
                <span className="text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  PASS (95%+) → Clean Pass → Manual Audit Sign-off → 24 h Delivery
                </span>
              )
            ) : (
              <span className="text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                FAIL (&lt;95%) → Auto-flag → Trigger Auto-Regeneration
              </span>
            )}
          </div>

          {isAdmin && (onTriggerRegenerate || onTriggerPhaseTwo) && (
            <button
              onClick={onTriggerRegenerate || onTriggerPhaseTwo}
              disabled={isExecuting}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 font-bold rounded-lg shadow transition-all text-xs cursor-pointer disabled:opacity-50 shrink-0 ${
                isPass
                  ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 font-extrabold'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin text-amber-300' : ''}`} />
              <span>
                {isExecuting 
                  ? `Executing Gate ${executingStep}/7...` 
                  : isPass 
                    ? 'Re-Run Re-Control Check' 
                    : 'Auto-Regenerate Report'}
              </span>
            </button>
          )}
        </div>

        {/* Risk Attention Summary Strip (when present) */}
        {hasRiskFlags && data.riskAttention && (
          <div className="mt-3 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs font-mono space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Attention / Risk Flags for Human Auditor:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {data.riskAttention.map(item => (
                <div key={item.gateNumber} className="p-2 rounded bg-slate-900/80 border border-amber-500/30 text-[11px]">
                  <div className="flex items-center justify-between text-amber-300 font-bold">
                    <span>Gate {item.gateNumber}: {item.gateName}</span>
                    <span className="text-amber-400">{item.scorePct}%</span>
                  </div>
                  {item.notes && <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Gate 0 + 7 Automated Control Gates Grid */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h4 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Automated Control Gates Verification Matrix (Gate 0 + Gates 1–7)
          </h4>
          <span className="text-[10px] font-mono text-slate-400">
            Re-Control Executed: {data.completedAt}
          </span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {data.gates.map((gate) => {
            const isExpanded = expandedGate === gate.gateNumber;
            const isRiskGate = riskGateNumbers.includes(gate.gateNumber);
            return (
              <div key={gate.gateNumber} className="p-3.5 sm:p-4 hover:bg-slate-800/30 transition-colors">
                <div 
                  className="flex items-center justify-between cursor-pointer gap-2.5"
                  onClick={() => setExpandedGate(isExpanded ? null : gate.gateNumber)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-slate-800 border border-slate-700 shrink-0">
                      {gateIconsMap[gate.gateNumber] || <ShieldCheck className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-bold shrink-0">
                          Gate {gate.gateNumber}
                        </span>
                        {isRiskGate && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                            Risk Track
                          </span>
                        )}
                        <h5 className="text-xs sm:text-sm font-bold text-slate-100 font-mono truncate">
                          {gate.gateName}
                        </h5>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <span className={`text-xs sm:text-sm font-bold font-mono ${
                        gate.passed ? 'text-emerald-400' : isRiskGate ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {gate.scorePct}%
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold border ${
                      gate.passed 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : isRiskGate
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {gate.passed ? 'PASSED' : isRiskGate ? 'ATTENTION' : 'FLAGGED'}
                    </span>

                    <button className="text-slate-400 hover:text-slate-200">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details & Check Items */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-3 text-xs font-mono">
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
                      <strong className="text-slate-200 font-mono text-[11px]">Assessment:</strong>
                      <span className="text-slate-300 text-[11px] font-sans truncate">{gate.notes}</span>
                    </div>

                    {/* Dedicated 4-Step Resolution Rule Visual for Gate 3 */}
                    {gate.gateNumber === 3 && (
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-2">
                            <Scale className="w-4 h-4 text-emerald-400" />
                            Gate 3 Resolution Rule (4-Step Dual-Model Reconciliation)
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            F1 vs F2
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                              Step 1 — Delta Computation
                            </span>
                          </div>

                          <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                              Step 2 — Severity Tiers (0–100 Scale)
                            </span>
                          </div>

                          <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                              Step 3 — Action Per Tier
                            </span>
                          </div>

                          <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">
                              Step 4 — Per-Dimension Drill-Down
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {gate.checks.map((chk, i) => (
                        <div key={i} className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400 font-bold truncate">{chk.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                            chk.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-300' :
                            chk.status === 'PASSED' ? 'bg-cyan-500/20 text-cyan-300' :
                            'bg-rose-500/20 text-rose-300'
                          }`}>
                            {chk.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ALGORITHMIC VERIFICATION FRAMEWORK (AVF) — CROSS-VALIDATION ENGINE PANEL */}
      {data.avfSession && (
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/40 border border-purple-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 shrink-0">
                <Cpu className="w-5 h-5 text-purple-400 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest font-black px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/50 text-purple-300">
                    AVF CROSS-VALIDATION ENGINE
                  </span>
                  {data.avfSession.equilibriumAchieved ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> STABLE CONVERGENCE
                    </span>
                  ) : data.avfSession.requiresManualAuditEscalation ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" /> MANDATORY AUDIT ESCALATION
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      REFINEMENT ACTIVE
                    </span>
                  )}
                  {data.avfSession.isStatisticalOutlier && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40 flex items-center gap-1">
                      <Activity className="w-3 h-3 text-orange-400" /> STATISTICAL OUTLIER
                    </span>
                  )}
                </div>
                <h4 className="text-sm sm:text-base font-bold font-mono text-slate-100 mt-1 truncate">
                  Algorithmic Verification Framework (AVF)
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs self-start sm:self-auto">
              <div className="bg-slate-950/80 px-2.5 py-1 rounded-lg border border-purple-500/30 text-center">
                <span className="text-[9px] text-slate-400 block uppercase">Total Rounds</span>
                <span className="font-bold text-purple-300">{data.avfSession.totalRounds}</span>
              </div>
              <div className="bg-slate-950/80 px-2.5 py-1 rounded-lg border border-purple-500/30 text-center">
                <span className="text-[9px] text-slate-400 block uppercase">Initial Drift</span>
                <span className="font-bold text-amber-400">{data.avfSession.initialCompositeDelta.toFixed(1)} pts</span>
              </div>
              <div className="bg-slate-950/80 px-2.5 py-1 rounded-lg border border-purple-500/30 text-center">
                <span className="text-[9px] text-slate-400 block uppercase">Final Drift</span>
                <span className="font-bold text-emerald-400">{data.avfSession.finalCompositeDelta.toFixed(1)} pts</span>
              </div>
            </div>
          </div>

          {data.avfSession.categoryStats && (
            <div className={`p-2.5 rounded-xl border font-mono text-xs flex items-center justify-between gap-2 ${
              data.avfSession.isStatisticalOutlier
                ? 'bg-orange-950/40 border-orange-500/40 text-orange-200'
                : 'bg-slate-950/80 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-center gap-2 truncate">
                <Activity className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="text-[11px] truncate">
                  <strong>Category Memory Baseline:</strong> {data.avfSession.categoryStats.meanDelta.toFixed(1)} ± {data.avfSession.categoryStats.stdDevDelta.toFixed(1)} pts mean drift
                </span>
              </div>
              {data.avfSession.isStatisticalOutlier && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/30 text-orange-300 border border-orange-500/50 shrink-0">
                  Outlier Risk
                </span>
              )}
            </div>
          )}

          {/* Cross-Validation Interactive Flow Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-950/90 border border-cyan-500/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                  F1 — Candidate Engine
                </span>
                <span className="text-[10px] text-slate-400">Candidate Report</span>
              </div>
              <div className="text-xs text-cyan-300 font-mono font-bold bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-500/30">
                {data.avfSession.finalF1Score}/100
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/90 border border-purple-500/40 text-center flex items-center justify-between">
              <div className="text-purple-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400 shrink-0" />
                <span>Directives Loop</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-1 rounded border border-emerald-500/30">
                Comp Δ: {data.avfSession.finalCompositeDelta.toFixed(1)} pts
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/90 border border-emerald-500/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  F2 — Reviewer
                </span>
                <span className="text-[10px] text-slate-400">Independent Assessor</span>
              </div>
              <div className="text-xs text-emerald-300 font-mono font-bold bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30">
                {data.avfSession.finalF2Score}/100
              </div>
            </div>
          </div>

          {/* AVF Round Evolution History */}
          <div className="space-y-2 pt-2">
            <h5 className="text-xs font-bold font-mono text-purple-300 uppercase tracking-wider">
              AVF Round-by-Round Evolution & Correction Directives Log
            </h5>

            <div className="space-y-3">
              {data.avfSession.rounds.map((rnd) => (
                <div key={rnd.roundNumber} className="p-3 sm:p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 font-mono text-xs">
                  {/* Round Header - Optimized for Mobile & Desktop */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px] shrink-0 border border-purple-500/40">
                        ROUND {rnd.roundNumber}
                      </span>
                      <span className="text-slate-100 font-bold text-xs whitespace-nowrap">
                        F1: {rnd.f1CompositeScore} pts vs F2: {rnd.f2CompositeScore} pts
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        Comp Δ: <strong className="text-slate-200">{rnd.compositeDelta.toFixed(1)}</strong> | Max Dim Δ: <strong className="text-slate-200">{rnd.maxDimensionDelta.toFixed(1)}</strong>
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border shrink-0 ${
                        rnd.status === 'CONVERGED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                        rnd.status === 'ADAPTED' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                        'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {rnd.status}
                      </span>
                    </div>
                  </div>

                  {/* Directives issued in this round */}
                  {rnd.directives.length > 0 && (
                    <div className="space-y-1.5 pt-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                        F2 Reviewer Correction Directives:
                      </span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {rnd.directives.map((dir) => (
                          <div key={dir.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="text-[9.5px] font-bold text-amber-300 font-mono bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/40 shrink-0">
                                {dir.id}
                              </span>
                              <span className="text-xs font-bold text-slate-200 truncate">{dir.targetArea}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                dir.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                                dir.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-300' :
                                'bg-cyan-500/20 text-cyan-300'
                              }`}>
                                {dir.severity}
                              </span>
                            </div>

                            <div className="shrink-0 font-mono text-[10px] flex items-center gap-2 ml-auto sm:ml-0">
                              <span className="text-slate-400">F1: <strong className="text-cyan-300">{dir.f1Value}</strong> vs F2: <strong className="text-purple-300">{dir.f2Value}</strong></span>
                              <span className="text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">Δ {dir.discrepancyDelta} pts</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Refinements applied badge */}
                  {rnd.f1RefinementsApplied.length > 0 && (
                    <div className="pt-1 flex items-center gap-2 text-[10px] font-mono text-cyan-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      <span className="text-cyan-400 font-bold uppercase tracking-wider shrink-0">F1 Adaptations:</span>
                      <span className="text-slate-300 font-sans truncate">Stable Convergence reached at Round {rnd.roundNumber}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
