/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Award, 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Download, 
  Cpu, 
  FileText, 
  Sparkles, 
  RefreshCw,
  Binary,
  Database,
  Key,
  Layers,
  FileCheck
} from 'lucide-react';
import { 
  EVALUATION_BLUEPRINT_DIMENSIONS, 
  calculateBlueprintScore 
} from '../services/EvaluationBlueprint';
import { generateBlueprintFormulaPdf } from '../services/pdfGenerator';

interface EvaluationBlueprintRubricProps {
  compact?: boolean;
}

export const EvaluationBlueprintRubric: React.FC<EvaluationBlueprintRubricProps> = () => {
  // Collapsed by default upon visiting the site
  const [isOpen, setIsOpen] = useState(false);
  const [showCalculator, setShowCalculator] = useState(true);
  const [showQualityPipeline, setShowQualityPipeline] = useState(true);
  const [showAvfModules, setShowAvfModules] = useState(true);

  // Live calculator test state
  const [testScores, setTestScores] = useState({
    utility: 10,
    tokenomics: 9,
    security: 9,
    team: 9,
    community: 10
  });

  const calculated = calculateBlueprintScore(testScores);

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 backdrop-blur-md border border-cyan-500/35 hover:border-cyan-500/65 rounded-2xl p-4 md:p-6 shadow-xl hover:shadow-[0_12px_36px_rgba(6,182,212,0.22)] transition-all duration-300 relative text-slate-200 overflow-hidden group">
      {/* Top Cyber Glow Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>

      {/* Background ambient glow */}
      <div 
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-40 overflow-hidden"
        style={{
          background: 'radial-gradient(circle at 90% 10%, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.05) 45%, transparent 70%)'
        }}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4 relative z-10">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1 cursor-pointer group select-none"
        >
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0 mt-0.5 sm:mt-0 shadow-sm group-hover:bg-cyan-500/20 transition-colors">
            <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 max-w-full">
              <h3 className="font-orbitron font-black text-base md:text-xl text-slate-100 tracking-wider flex items-center gap-2">
                Public Evaluation Blueprint & Rubric
              </h3>
              <span className="font-orbitron text-[9px] sm:text-[10px] uppercase tracking-wider text-cyan-300 bg-cyan-500/15 border border-cyan-500/40 px-2 sm:px-2.5 py-0.5 rounded-full font-extrabold flex items-center gap-1 shadow-sm max-w-full">
                <Lock className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">LOCKED STANDARD</span>
              </span>
              <span className="font-orbitron text-[9px] sm:text-[10px] uppercase tracking-wider text-purple-300 bg-purple-500/15 border border-purple-500/40 px-2 sm:px-2.5 py-0.5 rounded-full font-extrabold flex items-center gap-1 shadow-sm max-w-full">
                <Cpu className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="truncate">AVF ENGINE</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-1 hidden sm:block">
              Standardized 5-dimension scoring formula and tripartite algorithmic verification architecture.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-start sm:justify-end w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              generateBlueprintFormulaPdf('crypto_review_lab_technical_whitepaper.pdf');
            }}
            className="px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/50 text-cyan-300 font-bold transition-all cursor-pointer text-xs font-mono flex items-center gap-2 shrink-0 shadow-sm"
            title="Download the official 6-page CRL Technical Whitepaper & Specification PDF"
          >
            <Download className="w-3.5 h-3.5 text-cyan-300" />
            <span>Whitepaper (PDF)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">6 Pgs</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 transition-all cursor-pointer text-xs font-mono font-semibold flex items-center gap-1.5 shrink-0 shadow-inner"
          >
            <span>{isOpen ? 'Collapse Blueprint' : 'Explore Blueprint & Rubric'}</span>
            {isOpen ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Expandable Essentials Section */}
      <div 
        className={`grid transition-all duration-300 ease-in-out relative z-10 ${
          isOpen ? 'grid-rows-[1fr] opacity-100 mt-5 pt-4 border-t border-slate-800/80' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="space-y-6">
            {/* 1. Master Scoring Formula Banner */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2 shadow-inner">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-emerald-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Master Scoring Formula (100 Points Max)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans">
                  Independent Decoupling: Evaluative Score ≠ Security Risk
                </span>
              </div>
              <p className="text-slate-200 leading-relaxed font-sans text-xs sm:text-sm">
                Score (100) = <span className="text-emerald-400 font-mono font-bold">(Utility × 2.5)</span> + <span className="text-emerald-400 font-mono font-bold">(Tokenomics × 2.5)</span> + <span className="text-emerald-400 font-mono font-bold">(Security × 2.5)</span> + <span className="text-cyan-400 font-mono font-bold">(Team × 1.5)</span> + <span className="text-purple-400 font-mono font-bold">(Community × 1.0)</span>
              </p>
            </div>

            {/* 2. The 5 Core Dimensions & Weights */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>The 5 Core Dimensions & Weights</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {EVALUATION_BLUEPRINT_DIMENSIONS.map((dim) => (
                  <div 
                    key={dim.id}
                    className="bg-slate-950/70 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-3.5 flex flex-col justify-between space-y-2 transition-all shadow-sm"
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-xs font-bold text-slate-100 leading-snug">{dim.name}</span>
                      <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full shrink-0">
                        {dim.percentageText}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {dim.description}
                    </p>
                    <div className="pt-2 border-t border-slate-800/80 space-y-1">
                      {dim.keyCriteria.map((crit, cIdx) => (
                        <div key={cIdx} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="truncate">{crit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Stage 2 Automated Quality Control (Gates 0–7) & Workflow Flow */}
            <div className="border-t border-slate-800/80 pt-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowQualityPipeline(!showQualityPipeline)}
                  className="text-xs font-mono text-cyan-300 hover:text-cyan-200 flex items-center gap-2 cursor-pointer transition-colors font-bold uppercase tracking-wider"
                >
                  <FileCheck className="w-4 h-4 text-cyan-400" />
                  <span>Stage 2 Automated Quality Control &amp; Workflow Gate Flow</span>
                  {showQualityPipeline ? <ChevronUp className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
                <span className="text-[10px] font-mono text-slate-400">
                  Dual Oracle &amp; Multi-Explorer Triangulation
                </span>
              </div>

              {showQualityPipeline && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                      <Database className="w-4 h-4 text-cyan-400" />
                      <span>1. Source Triangulation</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                      Dual CoinGecko + CMC cross-ref with CoinStats redundancy. Cross-verifies live pricing, TVL volume, and liquidity pool depth within &plusmn;1% median bounds.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-purple-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                      <Binary className="w-4 h-4 text-purple-400" />
                      <span>2. On-Chain Cross-Check</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                      GoPlus, RugCheck, and Blockscout open-source, mint, honeypot &amp; blacklist scan. Evaluates reentrancy, unverified delegatecalls, and freeze flags.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Workflow Decision Criteria</span>
                      </div>
                      <div className="mt-2 space-y-1.5 text-[11px] font-mono">
                        <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                          <strong className="block text-emerald-400">PASS (95%+):</strong>
                          Deterministic F3 &rarr; Human Approval &rarr; 24 h Delivery
                        </div>
                        <div className="p-2 rounded bg-rose-950/30 border border-rose-500/30 text-rose-300">
                          <strong className="block text-rose-400">FAIL (&lt;95%):</strong>
                          Auto-flag &rarr; Trigger Auto-Regeneration
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. AVF Tripartite Core (F1/F2/F3) & 8-Module Verification Architecture */}
            <div className="border-t border-slate-800/80 pt-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowAvfModules(!showAvfModules)}
                  className="text-xs font-mono text-cyan-300 hover:text-cyan-200 flex items-center gap-2 cursor-pointer transition-colors font-bold uppercase tracking-wider"
                >
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>AVF Tripartite Core (F1/F2/F3) &amp; 8-Module Verification Architecture</span>
                  {showAvfModules ? <ChevronUp className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
                <span className="text-[10px] font-mono text-slate-400">
                  Full 8-Module Math &amp; Cryptographic Proofs in Whitepaper PDF
                </span>
              </div>

              {/* Core 3-Stage High-Level Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Stage 1: F1 Candidate Engine</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    Synthesizes multi-source live telemetry from CoinGecko, CMC, CoinStats, and DefiLlama into initial 5-dimension rubric scores and risk attack vectors.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-purple-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-purple-300 font-bold">
                    <RefreshCw className="w-4 h-4 text-purple-400" />
                    <span>Stage 2: F2 Reviewer Convergence</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    Executes automated 7-gate re-control and adversarial rescoring to ensure score drift convergence strictly below &lt;3.0 composite points.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Stage 3: F3 Deterministic Layer</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    Runs 8 deterministic verification modules with ZERO AI calls, verifying arithmetic invariants, GoPlus/RugCheck/Blockscout scans, and Ed25519 signing.
                  </p>
                </div>
              </div>

              {/* Expandable 8-Module Verification Details (with AVF-07 & AVF-08 Cards) */}
              {showAvfModules && (
                <div className="pt-2 space-y-3">
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>8-Module Deterministic Verification Invariants (AVF-01 to AVF-08)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* AVF-01 to AVF-06 Compact Invariants */}
                    <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between text-cyan-300 font-bold">
                        <span>AVF-01: Category Classification</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">INVARIANT</span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                        Deterministic matching against immutable category criteria (Layer 1, DeFi, RWA, Gaming, Infrastructure) with reference baseline bounds.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between text-cyan-300 font-bold">
                        <span>AVF-02: Citation &amp; Provenance Audit</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">INVARIANT</span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                        Validates telemetry citations across live explorer RPCs and provider hashes; unbacked claims fail with UNCITED_EVIDENCE.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between text-cyan-300 font-bold">
                        <span>AVF-03: Formula Weight Check</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">INVARIANT</span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                        Enforces exact canonical weights: Utility (25%), Tokenomics (25%), Security (25%), Team (15%), Community (10%) summing to 100.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between text-cyan-300 font-bold">
                        <span>AVF-04 to AVF-06: Simulation &amp; Risk Alignment</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">INVARIANT</span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                        Recomputes mathematical aggregations, verifies liquidation stress scenarios, and ensures findings map to deterministic risk tiers.
                      </p>
                    </div>

                    {/* Card 1: AVF-07 — Deterministic Confidence Rule */}
                    <div className="p-4 rounded-xl bg-slate-950/90 border border-cyan-500/40 space-y-2.5 text-xs font-mono md:col-span-1 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-cyan-300 font-bold uppercase tracking-wider text-xs">
                          AVF-07 — Deterministic Confidence Rule
                        </span>
                        <span className="text-[10px] text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/40 font-bold">
                          F3 RULE
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 border border-cyan-500/30 text-emerald-400 font-mono text-[11px] font-bold">
                        Confidence = (0.20 × C_class) + (0.30 × C_prov) + (0.30 × C_scen) + (0.20 × C_risk)
                      </div>

                      <div className="space-y-1.5 text-[11px] text-slate-300 font-sans">
                        <div className="flex items-start gap-1.5">
                          <span className="text-cyan-400 shrink-0 font-mono">▪️</span>
                          <span><strong className="text-slate-100 font-mono">C_class:</strong> Deterministic classification consistency and completeness</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="text-cyan-400 shrink-0 font-mono">▪️</span>
                          <span><strong className="text-slate-100 font-mono">C_prov:</strong> Verified telemetry and citation/provenance completeness</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="text-cyan-400 shrink-0 font-mono">▪️</span>
                          <span><strong className="text-slate-100 font-mono">C_scen:</strong> 100% for PASSED / VERIFIED · 70% for NARRATIVE_ONLY · 20% for FAILED</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="text-cyan-400 shrink-0 font-mono">▪️</span>
                          <span><strong className="text-slate-100 font-mono">C_risk:</strong> Deterministic risk-evidence completeness derived from verified inputs</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="text-cyan-400 shrink-0 font-mono">▪️</span>
                          <span><strong className="text-slate-100 font-mono">Confidence thresholds:</strong> &ge;85% HIGH · 70–84% MODERATE · &lt;70% LOW</span>
                        </div>
                        <div className="flex items-start gap-1.5 pt-1 border-t border-slate-800">
                          <span className="text-emerald-400 shrink-0 font-mono">▪️</span>
                          <span className="text-slate-300 italic"><strong className="text-emerald-400 font-mono not-italic">Deterministic rule:</strong> F3 calculates confidence exclusively from verified inputs and defined evidence states; no AI-generated confidence adjustment is permitted.</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: AVF-08 — Cryptographic Integrity & Signing Rule */}
                    <div className="p-4 rounded-xl bg-slate-950/90 border border-purple-500/40 space-y-2.5 text-xs font-mono md:col-span-1 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-purple-300 font-bold uppercase tracking-wider text-xs">
                          AVF-08 — Cryptographic Integrity &amp; Signing Rule
                        </span>
                        <span className="text-[10px] text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-500/40 font-bold">
                          ED25519 SIGN
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 border border-purple-500/30 text-purple-300 font-mono text-[11px] font-bold flex items-center justify-between">
                        <span>Digest = SHA-256(Canonical Audit Payload)</span>
                        <Key className="w-3.5 h-3.5 text-purple-400" />
                      </div>

                      <div className="space-y-1.5 text-[11px] text-slate-300 font-sans">
                        <div className="flex items-start gap-1.5">
                          <span className="text-purple-400 shrink-0 font-mono">▪️</span>
                          <span><strong className="text-slate-100 font-mono">Canonical Payload:</strong> The deterministic audit data used for verification is normalized into a canonical representation before hashing.</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="text-purple-400 shrink-0 font-mono">▪️</span>
                          <span><strong className="text-slate-100 font-mono">Draft:</strong> &ldquo;Status = UNSIGNED&rdquo; — preliminary audit output; no cryptographic verification claim.</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="text-purple-400 shrink-0 font-mono">▪️</span>
                          <span><strong className="text-slate-100 font-mono">Final Delivery:</strong> Crypto Review Lab applies an Ed25519 digital signature to the finalized audit payload.</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="text-purple-400 shrink-0 font-mono">▪️</span>
                          <span><strong className="text-slate-100 font-mono">Integrity:</strong> The signature and digest must validate against the exact finalized payload.</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="text-purple-400 shrink-0 font-mono">▪️</span>
                          <span><strong className="text-slate-100 font-mono">Immutability:</strong> Any post-signature modification to signed audit data causes verification failure and returns HASH_MISMATCH.</span>
                        </div>
                        <div className="flex items-start gap-1.5 pt-1 border-t border-slate-800">
                          <span className="text-purple-400 shrink-0 font-mono">▪️</span>
                          <span className="text-slate-300 italic"><strong className="text-purple-400 font-mono not-italic">Verification:</strong> F3 uses the established cryptographic signing and verification layer; cryptographic operations are not reimplemented inside the F3 engine.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Interactive Blueprint Calculator */}
            <div className="border-t border-slate-800/80 pt-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowCalculator(!showCalculator)}
                  className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Sliders className="w-4 h-4" />
                  <span className="font-bold uppercase tracking-wider">
                    {showCalculator ? 'Interactive Blueprint Calculator' : 'Show Interactive Calculator'}
                  </span>
                </button>
                <span className="text-[10px] font-mono text-slate-400">
                  Real-time formula simulation
                </span>
              </div>

              {showCalculator && (
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                    {(['utility', 'tokenomics', 'security', 'team', 'community'] as const).map((dimKey) => (
                      <div key={dimKey} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="uppercase text-slate-400">{dimKey}</span>
                          <span className="text-emerald-400 font-bold">{testScores[dimKey]}/10</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={testScores[dimKey]}
                          onChange={(e) => setTestScores({ ...testScores, [dimKey]: parseInt(e.target.value) })}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between bg-slate-900 border border-emerald-500/30 rounded-xl p-3.5 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-center px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                        <div className="text-[10px] font-mono text-slate-400 uppercase">Calculated Score</div>
                        <div className="text-lg font-mono font-black text-emerald-400">{calculated.overallScore} / 100</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200">
                          Risk Level: <span className="text-emerald-400 font-mono font-black">{calculated.riskLevel} Risk</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Protocol Profile: <span className="font-mono text-slate-200 font-bold">{calculated.categoryType}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 italic">
                      Calibrated across standard protocol profiles under master reference bounds.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6. Sleek Whitepaper CTA Banner */}
            <div className="border-t border-slate-800/80 pt-4">
              <div className="bg-gradient-to-r from-cyan-950/30 via-slate-900 to-purple-950/30 border border-cyan-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span className="font-mono font-bold text-xs text-slate-100 uppercase tracking-wider">
                      CRL Technical Whitepaper &amp; Specification
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/20 px-1.5 py-0.5 rounded border border-cyan-500/40">
                      v3.2 Standard
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-2xl">
                    Detailed 6-page institutional specification containing complete Gate 0–7 automated re-control parameters, AVF-01 through AVF-08 deterministic proofs, AVF-07 confidence formulas, and AVF-08 SHA-256 canonical hashing &amp; Ed25519 signing specifications.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => generateBlueprintFormulaPdf('crypto_review_lab_technical_whitepaper.pdf')}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all cursor-pointer text-xs font-mono flex items-center gap-2 shrink-0 shadow-lg shadow-cyan-500/20 active:scale-95"
                >
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Download Whitepaper (6 Pgs PDF)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


