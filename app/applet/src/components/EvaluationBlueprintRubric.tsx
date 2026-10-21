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
    <div className="bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 backdrop-blur-md border border-cyan-500/35 hover:border-cyan-500/65 rounded-2xl p-3 md:p-4 shadow-xl hover:shadow-[0_12px_36px_rgba(6,182,212,0.22)] transition-all duration-300 relative text-slate-200 overflow-hidden group">
      {/* Top Cyber Glow Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
      
      {/* Background ambient glow */}
      <div 
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-40 overflow-hidden"
        style={{
          background: 'radial-gradient(circle at 90% 10%, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.05) 45%, transparent 70%)'
        }}
      />

      {/* Header Bar - More compact and side-by-side elements */}
      <div className="flex flex-row items-center justify-between gap-3 relative z-10 flex-wrap lg:flex-nowrap">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group select-none"
        >
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0 shadow-sm group-hover:bg-cyan-500/20 transition-colors">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-orbitron font-black text-xs sm:text-sm md:text-base text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyber-cyan to-purple-400 tracking-wide uppercase">
                Public Evaluation Blueprint &amp; Rubric
              </h3>
              <span className="font-orbitron text-[9px] uppercase tracking-wider text-cyan-300 bg-cyan-500/15 border border-cyan-500/40 px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1 shadow-sm">
                <Lock className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>LOCKED STANDARD</span>
              </span>
              <span className="font-orbitron text-[9px] uppercase tracking-wider text-purple-300 bg-purple-500/15 border border-purple-500/40 px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1 shadow-sm">
                <Cpu className="w-3 h-3 text-purple-400 shrink-0" />
                <span>AVF ENGINE</span>
                <ChevronDown className={`w-3 h-3 text-purple-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              generateBlueprintFormulaPdf('crypto_review_lab_technical_whitepaper.pdf');
            }}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/50 text-cyan-300 font-bold transition-all cursor-pointer text-xs font-mono flex items-center gap-1.5 shrink-0 shadow-sm"
            title="Download the official 6-page CRL Technical Whitepaper & Specification PDF"
          >
            <Download className="w-3.5 h-3.5 text-cyan-300" />
            <span>Whitepaper (PDF)</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">6 Pgs</span>
          </button>
          
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="px-3 py-1.5 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 transition-all cursor-pointer text-xs font-mono font-semibold flex items-center gap-1.5 shrink-0 shadow-inner"
          >
            <span>{isOpen ? 'Collapse Blueprint' : 'Explore Blueprint & Rubric'}</span>
            {isOpen ? <ChevronUp className="w-4 h-4 text-yellow-400" /> : <ChevronDown className="w-4 h-4 text-yellow-400" />}
          </button>
        </div>
      </div>

      {/* Expandable Essentials Section */}
      <div 
        className={`grid transition-all duration-300 ease-in-out relative z-10 ${
          isOpen ? 'grid-rows-[1fr] opacity-100 mt-4 pt-3 border-t border-slate-800/80' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="space-y-4 text-xs">
            {/* 1. Master Scoring Formula Banner */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono space-y-2 shadow-inner">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-emerald-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Master Scoring Formula (100 Points Max)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans">
                  Independent Decoupling: Evaluative Score ≠ Security Risk
                </span>
              </div>
              <p className="text-slate-200 leading-relaxed font-sans text-xs">
                Score (100) = <span className="text-emerald-400 font-mono font-bold">(Utility × 2.5)</span> + <span className="text-emerald-400 font-mono font-bold">(Tokenomics × 2.5)</span> + <span className="text-emerald-400 font-mono font-bold">(Security × 2.5)</span> + <span className="text-cyan-400 font-mono font-bold">(Team × 1.5)</span> + <span className="text-purple-400 font-mono font-bold">(Community × 1.0)</span>
              </p>
            </div>

            {/* 2. Interactive Calculator */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Interactive Blueprint Calculator
                </span>
                <span className="text-[10px] font-mono text-slate-400">Real-time simulation</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {(['utility', 'tokenomics', 'security', 'team', 'community'] as const).map((dimKey) => (
                  <div key={dimKey} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
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
              <div className="flex items-center justify-between bg-slate-900 border border-emerald-500/30 rounded-xl p-3 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-center px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <div className="text-[9px] font-mono text-slate-400 uppercase">Calculated Score</div>
                    <div className="text-base font-mono font-black text-emerald-400">{calculated.overallScore} / 100</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      Risk Level: <span className="text-emerald-400 font-mono font-black">{calculated.riskLevel} Risk</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Protocol Profile: <span className="font-mono text-slate-200 font-bold">{calculated.categoryType}</span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400 italic">
                  Calibrated across standard protocol profiles under master reference bounds.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
