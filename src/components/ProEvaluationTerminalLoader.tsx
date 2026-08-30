import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cpu,
  Activity,
  Terminal,
  Code,
  ArrowRight,
  Layers
} from 'lucide-react';

export interface SecurityCheckTerminalLoaderProps {
  auditMode?: string;
  symbol?: string;
  name?: string;
  category?: string;
  compareProtocol?: string;
  stepIndex: number;
}

// Plain descriptive steps structured around the F1 Draft -> F2 (AVF) -> F3 pipeline
const SECURITY_CHECK_STEPS = [
  {
    phase: 'F1 · STEP 01/05',
    title: 'Ingesting Contract Evidence & Market Data',
    detail: 'Collecting verified on-chain parameters, contract bytecode, repository commits, and liquidity feeds...',
    stageBadge: 'EVIDENCE INGESTION',
    progress: 18,
    log: 'EVIDENCE_INGEST: Target parameters, contract addresses, and token state collected.'
  },
  {
    phase: 'F1 · STEP 02/05',
    title: 'Static Contract Analysis & Permission Checks',
    detail: 'Inspecting contract opcodes, authority structures, proxy upgrade mechanics, and invariant constraints...',
    stageBadge: 'STATIC ANALYSIS',
    progress: 38,
    log: 'CONTRACT_ANALYSIS: Control-flow graphs inspected; role permissions and invariant assertions checked.'
  },
  {
    phase: 'F1 · STEP 03/05',
    title: 'Liquidity Stress & TVL Volatility Modeling',
    detail: 'Simulating multi-vector liquidity stress, collateral shock resilience, and transaction slippage limits...',
    stageBadge: 'STRESS SIMULATION',
    progress: 62,
    log: 'STRESS_MODEL: Multi-vector TVL volatility and liquidity depth boundaries computed.'
  },
  {
    phase: 'F1 · STEP 04/05',
    title: 'Peer Benchmarking & Category Delta Analysis',
    detail: 'Measuring comparative metric variance across 5 core evaluation dimensions against category peers...',
    stageBadge: 'PEER BENCHMARKING',
    progress: 84,
    log: 'PEER_BENCHMARK: Comparative variance vectors evaluated against category standard.'
  },
  {
    phase: 'F1 · STEP 05/05',
    title: 'Compiling F1 Draft for F2 (AVF) Verification',
    detail: 'Assembling preliminary F1 draft findings. Draft proceeds to F2 (AVF) verification and F3 modules, pending admin sign-off...',
    stageBadge: 'F2/F3 QUEUED',
    progress: 96,
    log: 'PIPELINE_HANDOFF: F1 draft compiled; queued for F2 (AVF) critic verification and admin review.'
  }
];

export const ProEvaluationTerminalLoader: React.FC<SecurityCheckTerminalLoaderProps> = ({
  symbol = 'TARGET',
  name = 'Protocol',
  category,
  compareProtocol,
  stepIndex
}) => {
  const steps = SECURITY_CHECK_STEPS;
  const currentStep = steps[Math.min(Math.max(0, stepIndex), steps.length - 1)];

  const cleanSymbol = (symbol || 'TARGET').toUpperCase().trim();
  const cleanName = (name || 'Protocol').trim();
  const cleanCategory = (category || 'SMART_CONTRACT').toUpperCase();

  return (
    <div
      id="security-check-execution-screen"
      className="relative rounded-2xl overflow-hidden border shadow-2xl p-5 sm:p-7 min-h-[520px] flex flex-col justify-between transition-all duration-500 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.12)] font-sans"
    >
      {/* Background Matrix Grid & Glowing Ambient Lights */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a15_1px,transparent_1px),linear-gradient(to_bottom,#0f172a15_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Top Animated Laser Scanline */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />

      {/* Terminal Window Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
            <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-amber-300/90 font-semibold tracking-wide">
              Security Check Execution Screen
            </span>
          </div>

          {/* High-Legibility Dark Background Pill for Explicit F1 -> F2 (AVF) -> F3 Pipeline */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/95 border border-slate-800 text-[10px] sm:text-[11px] font-mono shadow-inner">
            <span className="text-amber-300 font-bold tracking-tight">F1 Draft</span>
            <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="text-cyan-300 font-bold tracking-tight">F2 (AVF)</span>
            <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="text-emerald-400 font-bold tracking-tight">F3</span>
          </div>
        </div>

        {/* Live Execution Status Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-750 text-[10px] font-mono text-emerald-400 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
            <span className="font-semibold tracking-wider">EXECUTION IN PROGRESS</span>
          </div>
        </div>
      </div>

      {/* Terminal CLI Command Line Strip */}
      <div className="relative z-10 mt-2 px-3 py-1.5 rounded-lg bg-slate-950/85 border border-slate-800/80 font-mono text-[11px] text-slate-300 flex items-center justify-between overflow-hidden">
        <div className="flex items-center gap-2 truncate">
          <span className="text-amber-400 font-bold">$</span>
          <span className="text-slate-400">crl-eval</span>
          <span className="text-cyan-300">--target</span>
          <span className="text-slate-100 font-semibold">{cleanSymbol}</span>
          <span className="text-cyan-300">--category</span>
          <span className="text-amber-200/90 font-medium truncate">{category || 'SMART_CONTRACT'}</span>
        </div>
        <div className="text-[10px] font-mono text-amber-400/90 shrink-0 ml-2 hidden md:flex items-center gap-1">
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>F1 PIPELINE ACTIVE</span>
        </div>
      </div>

      {/* Centerpiece: Gyroscopic Radar Scanner (Preserved Rotating Wheel with Refined Styling) */}
      <div className="relative z-10 py-5 sm:py-7 flex flex-col items-center justify-center">
        {/* Main Radar Gyro Container */}
        <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center">
          {/* Subtle Outer Pulsing Ring */}
          <div
            className="absolute inset-0 rounded-full border border-amber-500/20 animate-ping opacity-30"
            style={{ animationDuration: '3s' }}
          />

          {/* Layer 1: Outer Orbit Ring with Ticks (Slow Reverse Rotation) */}
          <div
            className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/30 animate-spin"
            style={{ animationDuration: '16s', animationDirection: 'reverse' }}
          />

          {/* 4 Cardinal Radar Nodes on Outer Ring */}
          <div
            className="absolute inset-0 animate-spin"
            style={{ animationDuration: '16s', animationDirection: 'reverse' }}
          >
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
            <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
            <span className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
          </div>

          {/* Layer 2: Conic Gradient Radar Sweep Beam (Rotating Continuously) */}
          <div
            className="absolute inset-2 sm:inset-3 rounded-full overflow-hidden animate-spin opacity-80 pointer-events-none"
            style={{
              animationDuration: '2.4s',
              background: 'conic-gradient(from 0deg, rgba(245, 158, 11, 0.4) 0deg, rgba(6, 182, 212, 0.15) 60deg, transparent 110deg, transparent 360deg)'
            }}
          />

          {/* Layer 3: Middle Technical Segmented HUD Ring (Forward Fast Spin) */}
          <div
            className="absolute inset-4 sm:inset-5 rounded-full border-2 border-transparent border-t-amber-400 border-r-cyan-400 border-b-amber-500/20 animate-spin"
            style={{ animationDuration: '2s' }}
          />

          {/* Layer 4: Counter-Rotating Fine Precision Arc */}
          <div
            className="absolute inset-7 sm:inset-9 rounded-full border-2 border-dashed border-cyan-400/60 animate-spin"
            style={{ animationDuration: '4s', animationDirection: 'reverse' }}
          />

          {/* Layer 5: Central Glowing Security Core */}
          <div
            className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-xl backdrop-blur-md border bg-gradient-to-br from-amber-950/80 via-slate-950 to-cyan-950/80 border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.25)]"
          >
            {/* Core Icon with Pulse */}
            <motion.div
              animate={{
                scale: [1, 1.08, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              <Cpu className="w-8 h-8 sm:w-9 sm:h-9 text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
            </motion.div>

            {/* Orbiting Photon Bead */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '1.8s' }}>
              <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#fcd34d]" />
            </div>
          </div>
        </div>

        {/* Dynamic Phase & Title Readout */}
        <div className="mt-5 text-center space-y-2 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/90 border border-slate-800 text-[11px] font-mono shadow-inner">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-bold text-amber-300">
              {currentStep.phase}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-200 uppercase tracking-wide font-semibold">
              {cleanSymbol} {cleanName && cleanName !== cleanSymbol ? `(${cleanName})` : ''}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-extrabold text-slate-100 font-sans tracking-tight">
            {currentStep.title}
          </h3>

          <AnimatePresence mode="wait">
            <motion.p
              key={stepIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans px-2 min-h-[38px]"
            >
              {currentStep.detail}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Terminal Telemetry Log Strip */}
      <div className="relative z-10 mb-3 px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 font-mono text-[10px] text-slate-400 flex items-center gap-2 shadow-inner">
        <Code className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="text-slate-500 shrink-0">LOG:</span>
        <span className="text-slate-300 truncate">
          {currentStep.log}
        </span>
      </div>

      {/* Progress Bar & Telemetry Matrix */}
      <div className="relative z-10 space-y-3 pt-3 border-t border-slate-800/80">
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Execution Pipeline Progress</span>
            </span>
            <span className="font-bold text-amber-300">
              {currentStep.progress}%
            </span>
          </div>

          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <motion.div
              className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-amber-500 via-yellow-400 to-cyan-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
              initial={{ width: '10%' }}
              animate={{ width: `${currentStep.progress}%` }}
            />
          </div>
        </div>

        {/* Telemetry Status Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
              VECTOR: <strong className="text-cyan-300">{cleanCategory}</strong>
            </span>
            {compareProtocol && (
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                BENCHMARK: <strong className="text-amber-300">{compareProtocol}</strong>
              </span>
            )}
            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300 font-semibold">
              STAGE: <span className="text-slate-200">{currentStep.stageBadge}</span>
            </span>
          </div>

          <div className="text-[10px] font-mono text-slate-400 hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>F1 DRAFT IN PROGRESS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
