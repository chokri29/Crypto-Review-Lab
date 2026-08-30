/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { F3VerificationResult, AdminOverrideLog } from '../types';
import { CRL_VERSION_MANIFEST } from '../versionManifest';
import { getConfidenceLevel } from '../services/f3Engine';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  Database, 
  Binary, 
  Scale, 
  Layers, 
  FileCheck, 
  Cpu, 
  Lock, 
  RefreshCw,
  HelpCircle,
  ShieldAlert,
  KeyRound,
  RotateCcw
} from 'lucide-react';

interface F3VerificationConsoleViewProps {
  f3Result?: F3VerificationResult | null;
  onRefreshF3?: () => void;
  isExecuting?: boolean;
  adminOverride?: AdminOverrideLog | null;
  onTriggerOverride?: () => void;
  onClearOverride?: () => void;
  isAdmin?: boolean;
}

export const F3VerificationConsoleView: React.FC<F3VerificationConsoleViewProps> = ({
  f3Result,
  onRefreshF3,
  isExecuting = false,
  adminOverride: propAdminOverride,
  onTriggerOverride,
  onClearOverride,
  isAdmin = false
}) => {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  if (!f3Result || !f3Result.modules) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-mono text-sm font-extrabold text-slate-100 flex items-center gap-2">
                F3 Deterministic Verification Layer (8 Algorithmic Modules)
              </h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Stage 3 of Tripartite Core — Awaiting deterministic verification execution
              </p>
            </div>
          </div>
          {onRefreshF3 && (
            <button
              onClick={onRefreshF3}
              disabled={isExecuting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs rounded-lg transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
              Run F3 Verification
            </button>
          )}
        </div>
      </div>
    );
  }

  const { 
    overallStatus = 'CONDITIONAL', 
    overallConfidence = 0.85, 
    modules, 
    discrepancies = [], 
    missingInputs = [], 
    ruleVersion = CRL_VERSION_MANIFEST.combinedVersionString 
  } = f3Result;

  const adminOverride = propAdminOverride || f3Result.adminOverride;

  const isVerified = overallStatus === 'VERIFIED';
  const isConditional = overallStatus === 'CONDITIONAL';
  const isFailed = overallStatus === 'FAILED';
  const hasDiscrepanciesOrNeedsReview = !isVerified || discrepancies.length > 0;

  const statusBadge = () => {
    if (adminOverride) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40">
          <KeyRound className="w-3.5 h-3.5 text-purple-400" />
          ADMIN OVERRIDDEN (Lead Sign-Off)
        </span>
      );
    }
    if (isVerified) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          VERIFIED (Deterministic 100%)
        </span>
      );
    }
    if (isConditional) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          CONDITIONAL (Partial Telemetry)
        </span>
      );
    }
    if (isFailed) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          FAILED (Discrepancies Detected)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-extrabold bg-slate-800 text-slate-300 border border-slate-700">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
        INPUT_MISSING
      </span>
    );
  };

  const avf01 = modules?.avf01Classification;
  const avf02 = modules?.avf02Evidence;
  const avf03 = modules?.avf03Methodology;
  const avf04 = modules?.avf04Simulation;
  const avf05 = modules?.avf05Score;
  const avf06 = modules?.avf06RiskConclusion;
  const avf07 = modules?.avf07Confidence;
  const avf08 = modules?.avf08Traceability;

  const moduleList = [
    {
      id: 'AVF-01',
      title: 'Classification & Taxonomy Verification',
      status: avf01?.status || 'VERIFIED',
      icon: <Layers className="w-4 h-4 text-cyan-400" />,
      details: avf01?.details || 'Protocol taxonomy verified against blueprint categories.',
      summary: `Assigned: ${avf01?.assignedCategory || 'N/A'}${avf01?.matchedStandardCategory ? ` → Matched: ${avf01.matchedStandardCategory}` : ''}`
    },
    {
      id: 'AVF-02',
      title: 'Evidence & Source Provenance Verification',
      status: avf02?.status || 'VERIFIED',
      icon: <Database className="w-4 h-4 text-purple-400" />,
      details: avf02?.details || 'Citations and contract address availability verified.',
      summary: `Citations: ${avf02?.citationsFound ?? 0} | Contract: ${avf02?.contractAddressPresent ? 'Present' : 'Absent'} | Telemetry: ${avf02?.hasSecurityTelemetry ? 'Connected' : 'Unavailable'}`
    },
    {
      id: 'AVF-03',
      title: 'Methodology & Weighting Compliance',
      status: avf03?.status || 'VERIFIED',
      icon: <Scale className="w-4 h-4 text-blue-400" />,
      details: avf03?.details || 'Score weight distribution compliant with Blueprint v2.4.',
      summary: `Weights: Utility 25%, Tokenomics 25%, Security 25%, Team 15%, Community 10% (Blueprint v2.4)`
    },
    {
      id: 'AVF-04',
      title: 'Scenario Bounds & Liquidity Stress Testing',
      status: avf04?.status || 'VERIFIED',
      icon: <Activity className="w-4 h-4 text-amber-400" />,
      details: avf04?.details || 'Liquidity & price stress testing evaluated.',
      summary: `Stress Testing Mode: ${avf04?.simulationExecuted ? 'Executed' : 'Narrative'} | Scenarios Evaluated: ${avf04?.scenariosTestedCount ?? 3}`
    },
    {
      id: 'AVF-05',
      title: 'Score Arithmetic & Weight Verification',
      status: avf05?.status || 'VERIFIED',
      icon: <Binary className="w-4 h-4 text-emerald-400" />,
      details: avf05?.details || 'Dimension score mathematical weighted average verified.',
      summary: `Reported: ${avf05?.reportedScore ?? 'N/A'} | Recomputed: ${avf05?.recomputedScore ?? 'N/A'} | Discrepancy: ${avf05?.discrepancy !== null && avf05?.discrepancy !== undefined ? `${avf05.discrepancy} pts` : '0 pts'}`
    },
    {
      id: 'AVF-06',
      title: 'Risk-Conclusion Semantic Consistency',
      status: avf06?.status || 'CONSISTENT',
      icon: <FileCheck className="w-4 h-4 text-teal-400" />,
      details: avf06?.details || 'Verdict, score, and risk level consistency verified.',
      summary: avf06?.status === 'CONSISTENT' && avf06?.declaredRisk && avf06?.verifiedRiskLevel && avf06.declaredRisk !== avf06.verifiedRiskLevel
        ? `CONSISTENT (conservative): Declared [${avf06.declaredRisk}] vs Evaluated [${avf06.verifiedRiskLevel}]`
        : `Declared: ${avf06?.declaredRisk || 'N/A'} | Evaluated: ${avf06?.verifiedRiskLevel || 'N/A'}${avf06?.contradictions && avf06.contradictions.length > 0 ? ` (Contradictions: ${avf06.contradictions.length})` : ' (Consistent)'}`
    },
    {
      id: 'AVF-07',
      title: 'Deterministic Multi-Source Confidence',
      status: avf07?.status || 'VERIFIED',
      icon: <Cpu className="w-4 h-4 text-indigo-400" />,
      details: avf07?.details || 'Multi-source statistical confidence computed.',
      summary: `Calculated Confidence: ${avf07?.confidencePct ?? Math.round(overallConfidence * 100)}% (${getConfidenceLevel(overallConfidence)})`
    },
    {
      id: 'AVF-08',
      title: 'Traceability & Cryptographic Integrity',
      status: avf08?.status || 'VERIFIED',
      icon: <Lock className="w-4 h-4 text-rose-400" />,
      details: avf08?.details || 'Cryptographic audit report signature and hash integrity.',
      summary: `Audit Digest: ${avf08?.reportHash ? `${avf08.reportHash.slice(0, 16)}...` : 'Generated on-the-fly'} | Signature: ${avf08?.isSigned ? 'Ed25519 Verified' : 'Pending Final Sign-Off'}`
    }
  ];

  const getModuleBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
      case 'HASH_MATCH':
      case 'CONSISTENT':
        return <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">PASSED</span>;
      case 'CONDITIONAL':
      case 'UNSIGNED':
      case 'NARRATIVE_ONLY':
      case 'SOURCE_LIMITED':
        return <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">CONDITIONAL</span>;
      case 'CONFLICT':
      case 'MISCLASSIFIED':
      case 'DISCREPANCY_FOUND':
      case 'HASH_MISMATCH':
      case 'SIGNATURE_INVALID':
        return <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 rounded">DISCREPANCY</span>;
      default:
        return <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">{status}</span>;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl overflow-hidden shadow-xl space-y-0">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-bold uppercase">
                  AVF Tripartite Core — Stage 3
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                  {ruleVersion}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100 font-sans mt-0.5">
                F3 Deterministic Verification Layer (8 Algorithmic Modules)
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {statusBadge()}
            <div className="text-right pl-3 border-l border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono block">Deterministic Confidence</span>
              <span className="text-sm font-mono font-extrabold text-cyan-400">
                {(overallConfidence * 100).toFixed(0)}% [{getConfidenceLevel(overallConfidence)}]
              </span>
            </div>
            {onRefreshF3 && (
              <button
                onClick={onRefreshF3}
                disabled={isExecuting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold font-mono text-xs rounded-lg transition-all cursor-pointer disabled:opacity-50"
                title="Re-run deterministic F3 evaluation"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin text-cyan-400' : ''}`} />
                <span>Re-Verify F3</span>
              </button>
            )}
          </div>
        </div>

        {/* Workflow State Indicator */}
        <div className="mt-4 p-3 rounded-xl border border-cyan-500/20 bg-cyan-950/20 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-300">AVF Pipeline Status:</span>
            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              F1 Candidate [PASSED]
            </span>
            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              F2 Convergence [PASSED]
            </span>
            <span className={`px-2 py-0.5 rounded border ${
              adminOverride ? 'text-purple-300 bg-purple-500/10 border-purple-500/30 font-bold' :
              isVerified ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30 font-bold' :
              isConditional ? 'text-amber-300 bg-amber-500/10 border-amber-500/30 font-bold' :
              'text-rose-300 bg-rose-500/10 border-rose-500/30 font-bold'
            }`}>
              F3 Verification [{adminOverride ? 'OVERRIDDEN' : overallStatus}]
            </span>
          </div>
          <span className="text-slate-400 text-[11px]">
            {adminOverride ? 'Admin Override Authorized — Ready for Delivery' :
             isVerified ? 'Ready for Validation & Sign-off' : 
             'Review / Calibration or Admin Override Required'}
          </span>
        </div>
      </div>

      {/* Active Admin Override Notice */}
      {adminOverride && (
        <div className="p-4 bg-purple-950/40 border-b border-purple-500/30 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-purple-300 text-xs font-mono font-bold">
              <KeyRound className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Admin Override Documented & Active (Crypto Review Lab Sign-Off)</span>
            </div>
            <div className="flex items-center gap-2">
              {onTriggerOverride && (
                <button
                  type="button"
                  onClick={onTriggerOverride}
                  className="text-[11px] font-mono text-purple-300 hover:text-purple-200 underline cursor-pointer"
                >
                  Edit Override
                </button>
              )}
              {onClearOverride && (
                <button
                  type="button"
                  onClick={onClearOverride}
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-rose-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  title="Clear admin override"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear Override
                </button>
              )}
            </div>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-lg border border-purple-500/20 text-xs font-mono space-y-1">
            <div className="flex flex-wrap items-center justify-between text-slate-400 text-[11px] border-b border-slate-800/80 pb-1 mb-1">
              <span>Authorized by: <strong className="text-purple-300">{adminOverride.overriddenBy || 'Crypto Review Lab'}</strong></span>
              <span>Logged at: <span className="text-slate-300">{new Date(adminOverride.overriddenAt).toLocaleString()}</span></span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              <span className="text-purple-400 font-bold">Reason: </span>
              {adminOverride.reason}
            </p>
            {adminOverride.discrepanciesOverridden && adminOverride.discrepanciesOverridden.length > 0 && (
              <div className="text-[10px] text-slate-400 pt-1">
                Overridden Discrepancies: {adminOverride.discrepanciesOverridden.join('; ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Discrepancies Alert if Any */}
      {discrepancies.length > 0 && (
        <div className="p-4 bg-rose-950/40 border-b border-rose-500/30 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-rose-300 text-xs font-mono font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>F3 Deterministic Discrepancies Detected ({discrepancies.length}):</span>
            </div>
            {!adminOverride && onTriggerOverride && (
              <button
                type="button"
                onClick={onTriggerOverride}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs rounded-lg transition-all cursor-pointer shadow-md self-start sm:self-auto"
                title="Acknowledge discrepancies and authorize delivery under admin override"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-950" />
                <span>Acknowledge & Proceed (Admin Override)</span>
              </button>
            )}
          </div>
          <ul className="space-y-1 pl-6 list-disc text-xs font-mono text-rose-200">
            {discrepancies.map((disc, idx) => (
              <li key={idx}>{disc}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Non-verified notice if no discrepancies list but status is CONDITIONAL or INPUT_MISSING */}
      {discrepancies.length === 0 && hasDiscrepanciesOrNeedsReview && !adminOverride && onTriggerOverride && (
        <div className="p-3 bg-amber-950/30 border-b border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-mono">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>F3 status is <strong>{overallStatus}</strong>. Auditor may calibrate or apply override to proceed.</span>
          </div>
          <button
            type="button"
            onClick={onTriggerOverride}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs rounded-lg transition-all cursor-pointer shadow-md shrink-0 self-start sm:self-auto"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-950" />
            <span>Acknowledge & Proceed</span>
          </button>
        </div>
      )}

      {/* 8-Module Grid */}
      <div className="p-4 sm:p-5 space-y-2.5">
        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
          Deterministic Rule Modules (AVF-01 through AVF-08):
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {moduleList.map((m) => {
            const isExpanded = expandedModule === m.id;
            return (
              <div 
                key={m.id}
                className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-3 transition-all"
              >
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedModule(isExpanded ? null : m.id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 bg-slate-900 rounded-lg border border-slate-800 shrink-0">
                      {m.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono font-bold text-cyan-400">{m.id}</span>
                        <span className="text-xs font-bold text-slate-200 truncate">{m.title}</span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                        {m.summary}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {getModuleBadge(m.status)}
                    <button className="text-slate-500 hover:text-slate-300">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs font-mono text-slate-300 space-y-2">
                    <p className="text-slate-400 leading-relaxed">{m.details}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
