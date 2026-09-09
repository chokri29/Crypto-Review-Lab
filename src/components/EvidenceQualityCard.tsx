import React from 'react';
import { ShieldCheck, AlertTriangle, XCircle, HelpCircle, Shuffle, Database, Activity, Lock, Cpu, Clock, Layers } from 'lucide-react';
import { CryptoReview, F3VerificationResult } from '../types';
import {
  getDeterministicVerificationPresentation,
  getIntegrityPresentation,
  getTraceabilityPresentation,
  getEvidenceQualityPresentation
} from '../services/verificationPresentation';

interface EvidenceQualityCardProps {
  review?: Partial<CryptoReview> | null;
  f3Result?: F3VerificationResult | null;
  compact?: boolean;
}

export const EvidenceQualityCard: React.FC<EvidenceQualityCardProps> = ({
  review,
  f3Result,
  compact = false
}) => {
  const verification = getDeterministicVerificationPresentation(review, f3Result);
  const integrity = getIntegrityPresentation(review, f3Result);
  const traceability = getTraceabilityPresentation(review, f3Result);
  const evidence = getEvidenceQualityPresentation(review, f3Result);

  const renderVerificationIcon = (state: string) => {
    switch (state) {
      case 'Verified':
        return <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'Partially Verified':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'Contradictory':
        return <Shuffle className="w-4 h-4 text-orange-400 shrink-0" />;
      case 'Invalid':
        return <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'Unverified':
      default:
        return <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div className="bg-slate-950/80 border border-cyber-cyan/20 rounded-xl p-4 md:p-5 space-y-4 shadow-lg text-left">
      {/* Header: Verification Status & Deterministic Invariants */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-cyber-cyan rounded-full"></span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              Deterministic Verification & Evidence Quality
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm font-sans font-bold text-slate-100">Verification Status:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${verification.badgeClass}`}
              title={verification.definition}
            >
              {renderVerificationIcon(verification.state)}
              <span>{verification.state}</span>
            </span>
          </div>
          <p className="text-[11px] font-sans text-slate-400 mt-1">
            {verification.definition}
          </p>
        </div>

        {/* Integrity & Traceability Badges */}
        <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border ${integrity.badgeClass}`}
            title={integrity.detail}
          >
            <Lock className="w-3 h-3 text-cyan-400 shrink-0" />
            <span>{integrity.state}</span>
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border ${traceability.badgeClass}`}
            title={traceability.detail}
          >
            <Cpu className="w-3 h-3 text-cyan-400 shrink-0" />
            <span>{traceability.state}</span>
          </span>
        </div>
      </div>

      {/* Evidence Quality Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-200">
              Evidence Quality
            </h4>
          </div>
          <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded border ${evidence.overallQualityClass}`}>
            Overall: {evidence.overallQuality}
          </span>
        </div>

        {/* 5 Evidence Categories */}
        <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-2.5`}>
          {/* 1. Data Freshness */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> Data Freshness
              </span>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${evidence.dataFreshness.badgeClass}`}>
                {evidence.dataFreshness.status}
              </span>
            </div>
            <p className="text-[11px] font-sans text-slate-300 truncate" title={evidence.dataFreshness.label}>
              {evidence.dataFreshness.label}
            </p>
          </div>

          {/* 2. Source Coverage */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" /> Source Coverage
              </span>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${evidence.sourceCoverage.badgeClass}`}>
                {evidence.sourceCoverage.status}
              </span>
            </div>
            <p className="text-[11px] font-sans text-slate-300 truncate" title={evidence.sourceCoverage.label}>
              {evidence.sourceCoverage.label}
            </p>
          </div>

          {/* 3. On-chain Evidence */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-slate-400" /> On-chain Evidence
              </span>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${evidence.onChainEvidence.badgeClass}`}>
                {evidence.onChainEvidence.status}
              </span>
            </div>
            <p className="text-[11px] font-sans text-slate-300 truncate" title={evidence.onChainEvidence.label}>
              {evidence.onChainEvidence.label}
            </p>
          </div>

          {/* 4. Market Evidence */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Activity className="w-3 h-3 text-slate-400" /> Market Evidence
              </span>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${evidence.marketEvidence.badgeClass}`}>
                {evidence.marketEvidence.status}
              </span>
            </div>
            <p className="text-[11px] font-sans text-slate-300 truncate" title={evidence.marketEvidence.label}>
              {evidence.marketEvidence.label}
            </p>
          </div>

          {/* 5. Security Evidence */}
          <div className={`bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1 ${compact ? 'sm:col-span-2' : 'sm:col-span-2 lg:col-span-1'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-slate-400" /> Security Evidence
              </span>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${evidence.securityEvidence.badgeClass}`}>
                {evidence.securityEvidence.status}
              </span>
            </div>
            <p className="text-[11px] font-sans text-slate-300 truncate" title={evidence.securityEvidence.label}>
              {evidence.securityEvidence.label}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
