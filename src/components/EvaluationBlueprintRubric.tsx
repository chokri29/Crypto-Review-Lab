/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Lock, Award, Sliders, ChevronDown, ChevronUp, Info, CheckCircle2, Download, Cpu, Sparkles, RefreshCw } from 'lucide-react';
import { 
  EVALUATION_BLUEPRINT_DIMENSIONS, 
  LOCKED_GRADE_BOUNDARIES, 
  calculateBlueprintScore 
} from '../services/EvaluationBlueprint';
import { generateBlueprintFormulaPdf } from '../services/pdfGenerator';

interface EvaluationBlueprintRubricProps {
  compact?: boolean;
}

export const EvaluationBlueprintRubric: React.FC<EvaluationBlueprintRubricProps> = () => {
  // Set collapsed by default upon visiting the site
  const [isOpen, setIsOpen] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showAvfDetails, setShowAvfDetails] = useState(false);

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

      {/* Background ambient glow - using clean opacity radial gradient without GPU blur artifacts */}
      <div 
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-40 overflow-hidden"
        style={{
          background: 'radial-gradient(circle at 90% 10%, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.05) 45%, transparent 70%)'
        }}
      />

      {/* Prominent Innovative Header with Locked Public Blueprint Badge */}
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
              <span className="font-orbitron text-[9px] sm:text-[10px] uppercase tracking-wider text-purple-300 bg-purple-500/15 border border-purple-500/40 px-2 sm:px-2.5 py-0.5 rounded-full font-extrabold flex items-center gap-1 shadow-sm animate-pulse max-w-full">
                <Cpu className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="truncate">AVF CROSS-VALIDATION ENFORCED</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-start sm:justify-end w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              generateBlueprintFormulaPdf('evaluation_blueprint_master_formula.pdf');
            }}
            className="px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 font-bold transition-all cursor-pointer text-xs font-mono flex items-center gap-1.5 shrink-0 shadow-sm"
            title="Download official PDF specification of the Evaluation Blueprint Standard & Formula"
          >
            <Download className="w-3.5 h-3.5 text-cyan-300" />
            <span>Formula PDF</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 transition-all cursor-pointer text-xs font-mono font-semibold flex items-center gap-1.5 shrink-0 shadow-inner"
          >
            <span>{isOpen ? 'Collapse Rubric' : 'Expand Rubric & Formula'}</span>
            {isOpen ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAvfDetails(!showAvfDetails);
            }}
            className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-200 transition-all cursor-pointer text-xs font-mono font-semibold flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>{showAvfDetails ? 'Collapse AVF' : 'AVF Explain'}</span>
            {showAvfDetails ? <ChevronUp className="w-4 h-4 text-purple-300" /> : <ChevronDown className="w-4 h-4 text-purple-300" />}
          </button>
        </div>
      </div>

      {/* EXPANDABLE AVF EXPLAIN MENU */}
      <div 
        className={`grid transition-all duration-300 ease-in-out relative z-10 ${
          showAvfDetails ? 'grid-rows-[1fr] opacity-100 mt-4 pt-4 border-t border-purple-500/30' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/40 border border-purple-500/40 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="border-b border-purple-500/30 pb-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
                  <Cpu className="w-6 h-6 text-purple-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono uppercase tracking-widest font-black px-2 py-0.5 rounded bg-purple-950 border border-purple-500/50 text-purple-300">
                      NEW INVENTION — CRL EXCLUSIVE
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-lg sm:text-xl text-slate-100 mt-0.5">
                    Algorithmic Verification Framework (AVF)
                  </h3>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              The <strong>Algorithmic Verification Framework (AVF)</strong> operates via a three-stage <strong>Tripartite Core</strong> architecture: the <strong>F1 Candidate Engine</strong> drafts the comprehensive evaluation, the <strong>F2 Reviewer</strong> independently stress-tests findings to drive score convergence, and the <strong>F3 Verification Layer</strong> executes 8 deterministic algorithmic verification modules with zero AI estimation to enforce mathematical rigor, cryptographic integrity, and institutional audit standards.
            </p>

            {/* Key Innovations / Tripartite Core Stages */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-purple-500/30 space-y-2">
                <div className="flex items-center gap-2 text-purple-300 font-bold">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Stage 1: F1 Candidate Engine</span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  F1 constructs the primary multi-dimensional audit draft, synthesizing on-chain metrics, smart contract vulnerabilities, tokenomics schedules, and multi-vector stress simulations.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/30 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                  <span>Stage 2: F2 Reviewer Convergence</span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  F2 acts as an independent reviewer, cross-examining candidate findings against exploit records and issuing structured correction directives until score drift stabilizes below &lt;3.0 points.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Stage 3: F3 Verification Layer</span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  F3 deterministically executes 8 AVF verification modules (AVF-01 through AVF-08) with zero AI calls, verifying math aggregation, rubric methodology, risk consistency, and Ed25519/SHA-256 traceability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Smooth CSS Grid Expand Container - Glitch-Free on Mobile */}
      <div 
        className={`grid transition-all duration-300 ease-in-out relative z-10 ${
          isOpen ? 'grid-rows-[1fr] opacity-100 mt-4 pt-4 border-t border-slate-800/80' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="space-y-6">
            {/* Formula summary banner */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 md:p-4 font-mono text-xs space-y-2">
              <div className="text-emerald-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Master Scoring Formula</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans text-xs">
                Score (100) = <span className="text-emerald-400 font-mono font-bold">(Utility × 2.5)</span> + <span className="text-emerald-400 font-mono font-bold">(Tokenomics × 2.5)</span> + <span className="text-emerald-400 font-mono font-bold">(Security × 2.5)</span> + <span className="text-cyan-400 font-mono font-bold">(Team × 1.5)</span> + <span className="text-purple-400 font-mono font-bold">(Community × 1.0)</span>
              </p>
            </div>

            {/* 5 Dimensions Breakdown */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>The 5 Core Dimensions & Weights</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {EVALUATION_BLUEPRINT_DIMENSIONS.map((dim) => (
                  <div 
                    key={dim.id}
                    className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between space-y-2 hover:border-slate-700 transition-colors"
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

            {/* Grade Scale Boundaries */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Official Grade Scale & Risk Boundaries</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
                {LOCKED_GRADE_BOUNDARIES.map((b) => (
                  <div 
                    key={b.grade}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 text-center flex flex-col items-center justify-between min-w-0"
                  >
                    <span className="font-mono font-black text-xs sm:text-sm" style={{ color: b.color }}>
                      {b.grade}
                    </span>
                    <span className="font-mono text-[10px] text-slate-300 font-bold mt-0.5 truncate w-full">
                      {b.minScore}–{b.maxScore} pts
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded mt-1 bg-slate-900 text-slate-400 border border-slate-800 truncate max-w-full">
                      {b.riskLevel}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Interactive Blueprint Calculator */}
            {/* Phase 2: Automated Re-Control Architecture Explanation */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <h4 className="text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Phase Two Framework Architecture: Automated Re-Control (5–10 min)
              </h4>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 text-xs font-mono">
                <p className="text-slate-300 font-sans leading-relaxed">
                  Every generated review undergoes an automated secondary re-verification stage through Gate 0 (Structural Completeness) and 7 Content Quality Gates before final validation and sign-off:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-slate-900 p-2.5 rounded border border-emerald-500/40 col-span-1 sm:col-span-2 md:col-span-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900">
                    <span className="text-emerald-400 font-bold block">Gate 0. Structural Completeness Check (Fast Deterministic Pass)</span>
                    <span className="text-[10px] text-slate-300 font-sans">Verifies mandatory elements (Title, Verdict, 5 Scores), Pros/Cons symmetry, Section 4 dual-scoring, 5-row delta table, & scan vectors before deeper compute.</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-cyan-400 font-bold block">1. Source Triangulation</span>
                    <span className="text-[10px] text-slate-400 font-sans">Dual CoinGecko + CMC cross-ref</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-purple-400 font-bold block">2. On-Chain Cross-Check</span>
                    <span className="text-[10px] text-slate-400 font-sans">GoPlus open-source, mint, honeypot & blacklist scan</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-emerald-400 font-bold block">3. Cross-Framework Consistency Check</span>
                    <span className="text-[10px] text-slate-400 font-sans">Framework 2 (CRL Pro Risk Model) independent rescoring</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-amber-400 font-bold block">4. Tokenomics Re-check</span>
                    <span className="text-[10px] text-slate-400 font-sans">Supply & unlock schedule parity</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-blue-400 font-bold block">5. Score Arithmetic</span>
                    <span className="text-[10px] text-slate-400 font-sans">Zero weighted math drift (±0.5 pt)</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <span className="text-teal-400 font-bold block">6. Grade-Risk Alignment</span>
                    <span className="text-[10px] text-slate-400 font-sans">Score-grade-risk tier mapping</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800 col-span-1 sm:col-span-2">
                    <span className="text-rose-400 font-bold block">7. Formatting Integrity</span>
                    <span className="text-[10px] text-slate-400 font-sans">Markdown headings & pros/cons balance</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 p-2.5 rounded border border-slate-800/80 text-[11px]">
                  <span className="text-emerald-400 font-bold">PASS (95%+):</span>
                  <span className="text-slate-300">Human Approval → 24 h Delivery</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-rose-400 font-bold">FAIL (&lt;95%):</span>
                  <span className="text-slate-300">Auto-flag → Trigger Auto-Regeneration</span>
                </div>
              </div>
            </div>

            {/* AVF Tripartite Core Architecture & 8-Module Deterministic Specification */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <button
                type="button"
                onClick={() => setShowAvfDetails(!showAvfDetails)}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center justify-between w-full cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold uppercase tracking-wider">
                    AVF Tripartite Core (F1/F2/F3) & 8-Module Verification Architecture
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  {showAvfDetails ? 'Hide Specification' : 'View Architecture Spec'}
                  {showAvfDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>

              <div 
                className={`grid transition-all duration-300 ease-in-out ${
                  showAvfDetails ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden min-h-0 space-y-4 text-xs font-mono">
                  {/* Tripartite Core Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/30">
                      <div className="text-cyan-400 font-bold text-xs uppercase mb-1">Stage 1: F1 Candidate Engine</div>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                        Synthesizes multi-source live telemetry from CoinGecko, CoinMarketCap & DefiLlama into initial 5-dimension rubric scores.
                      </p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-purple-500/30">
                      <div className="text-purple-400 font-bold text-xs uppercase mb-1">Stage 2: F2 Reviewer Stage</div>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                        Iterative 7-gate re-control testing invariants and enforcing Score Drift convergence strictly below &lt;3.0 composite points.
                      </p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30">
                      <div className="text-emerald-400 font-bold text-xs uppercase mb-1">Stage 3: F3 Deterministic Layer</div>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                        Pure deterministic execution across 8 algorithmic modules with ZERO AI / LLM calls, validating arithmetic & provenance.
                      </p>
                    </div>
                  </div>

                  {/* 8-Module Grid */}
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                        The 8 Deterministic Rule Modules (AVF-01 through AVF-08):
                      </span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        Zero AI Execution
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-cyan-400 font-bold">AVF-01: Taxonomy Verification</span>
                        <p className="text-slate-400 text-[10px] font-sans mt-0.5">Validates category against standard CoinGecko & DEX taxonomy.</p>
                      </div>
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-purple-400 font-bold">AVF-02: Evidence Provenance</span>
                        <p className="text-slate-400 text-[10px] font-sans mt-0.5">Verifies public citations, on-chain contracts & telemetry feeds.</p>
                      </div>
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-blue-400 font-bold">AVF-03: Methodology Compliance</span>
                        <p className="text-slate-400 text-[10px] font-sans mt-0.5">Confirms 25/25/25/15/10 weighting table applied without formula drift.</p>
                      </div>
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-amber-400 font-bold">AVF-04: Scenario Stress Bounds</span>
                        <p className="text-slate-400 text-[10px] font-sans mt-0.5">Simulates -30%, -60%, -85% price shock & liquidity drain cascade resilience.</p>
                      </div>
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-emerald-400 font-bold">AVF-05: Score Arithmetic</span>
                        <p className="text-slate-400 text-[10px] font-sans mt-0.5">Recomputes weighted average math strictly within ±0.5 pt tolerance.</p>
                      </div>
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-teal-400 font-bold">AVF-06: Semantic Consistency</span>
                        <p className="text-slate-400 text-[10px] font-sans mt-0.5">Ensures declared risk level and grade match computed scores without contradictions.</p>
                      </div>
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-indigo-400 font-bold">AVF-07: Calibrated Confidence</span>
                        <p className="text-slate-400 text-[10px] font-sans mt-0.5">Calculates composite multi-source confidence across taxonomy, telemetry, & stress models.</p>
                      </div>
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-rose-400 font-bold">AVF-08: Cryptographic Signing</span>
                        <p className="text-slate-400 text-[10px] font-sans mt-0.5">Generates SHA-256 canonical hash & requires Ed25519 cryptographic sign-off for delivery.</p>
                      </div>
                    </div>
                  </div>

                  {/* Mathematical Formula & Signing Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-950 p-3 rounded-xl border border-indigo-500/30 space-y-1.5">
                      <div className="text-indigo-400 font-bold text-xs uppercase flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                        AVF-07 Confidence Formula
                      </div>
                      <div className="bg-slate-900 p-2 rounded text-[11px] text-indigo-300 font-mono">
                        Confidence = (0.20 × C_class) + (0.30 × C_prov) + (0.30 × C_scen) + (0.20 × C_risk)
                      </div>
                      <ul className="text-[10px] text-slate-400 space-y-0.5 list-disc pl-4 font-sans">
                        <li><strong>C_scen:</strong> 100% for PASSED/VERIFIED; 70% for NARRATIVE_ONLY; 20% for FAILED</li>
                        <li><strong>C_prov:</strong> Telemetry + Citation count completeness</li>
                        <li><strong>Thresholds:</strong> ≥85% HIGH | 70–84% MODERATE | &lt;70% LOW</li>
                      </ul>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-rose-500/30 space-y-1.5">
                      <div className="text-rose-400 font-bold text-xs uppercase flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-rose-400" />
                        AVF-08 Cryptographic Signing Rule
                      </div>
                      <div className="bg-slate-900 p-2 rounded text-[11px] text-rose-300 font-mono">
                        Digest = SHA256(Symbol ∥ Scores ∥ Grade ∥ Timestamp)
                      </div>
                      <ul className="text-[10px] text-slate-400 space-y-0.5 list-disc pl-4 font-sans">
                        <li><strong>Draft:</strong> Status = <code>UNSIGNED</code> (pre-audit draft preview)</li>
                        <li><strong>Final Delivery:</strong> Crypto Review Lab applies Ed25519 digital signature</li>
                        <li><strong>Immutability:</strong> Any post-sign score drift fails verification (<code>HASH_MISMATCH</code>)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowCalculator(!showCalculator)}
                className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Sliders className="w-4 h-4" />
                <span>{showCalculator ? 'Hide Interactive Blueprint Calculator' : 'Test Interactive Blueprint Calculator'}</span>
              </button>

              <div 
                className={`grid transition-all duration-300 ease-in-out ${
                  showCalculator ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden min-h-0">
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
                            Grade: <span className="text-emerald-400 font-mono font-black">{calculated.grade}</span>
                          </div>
                          <div className="text-xs text-slate-400">
                            Risk Level: <span className="font-mono text-slate-200 font-bold">{calculated.riskLevel} Risk</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] font-mono text-slate-400 italic">
                        Math strictly matches Hyperliquid (93 / AA+), Uniswap (95 / AAA), Solana (91 / AA+) master reference!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
