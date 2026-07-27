/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  ChevronRight, 
  FileCheck, 
  ShieldAlert, 
  Activity, 
  Users, 
  Layers, 
  BadgeCheck, 
  AlertTriangle, 
  Save, 
  HelpCircle,
  TrendingUp,
  Cpu,
  Clock
} from 'lucide-react';
import { CryptoReview, CryptoReviewScores, RiskLevel } from '../types';

interface ReviewLabProps {
  onSaveReview: (review: CryptoReview) => void;
  savedReviews: CryptoReview[];
}

const POPULAR_SUGGESTIONS = [
  { name: 'Avalanche', symbol: 'AVAX', category: 'Smart Contract / Layer 1' },
  { name: 'Cardano', symbol: 'ADA', category: 'Smart Contract / Layer 1' },
  { name: 'Uniswap', symbol: 'UNI', category: 'DeFi / Exchange' },
  { name: 'Pepe', symbol: 'PEPE', category: 'Memecoin / Speculative' },
  { name: 'Render Network', symbol: 'RENDER', category: 'DePIN / AI Compute' },
];

export default function ReviewLab({ onSaveReview, savedReviews }: ReviewLabProps) {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [category, setCategory] = useState('Smart Contract / Layer 1');
  const [focusArea, setFocusArea] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [generatedReview, setGeneratedReview] = useState<CryptoReview | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const loadingMessages = [
    'Initializing secure connection to Crypto Review Lab core...',
    'Analyzing token contract architecture & multisig setups...',
    'Simulating 5-year token inflation and unlock schedules...',
    'Scanning social sentiment channels and developer commit histories...',
    'Synthesizing risk parameters and grading final scores...'
  ];

  const handleSuggestionClick = (sug: typeof POPULAR_SUGGESTIONS[0]) => {
    setName(sug.name);
    setSymbol(sug.symbol);
    setCategory(sug.category);
    setError(null);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !symbol.trim()) {
      setError('Please provide both the project name and its token ticker symbol.');
      return;
    }

    setIsLoading(true);
    setGeneratedReview(null);
    setError(null);
    setIsSaved(false);
    setLoadingStep(0);

    // Cycle through loading steps to keep user engaged with real-sounding security checks
    const loadingInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < loadingMessages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2200);

    try {
      const response = await fetch('/api/review/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          symbol: symbol.toUpperCase().trim(),
          category,
          focusArea: focusArea.trim() || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error occurred during generation.');
      }

      const reviewData = await response.json();
      
      // Inject ID and metadata for frontend local management
      const completeReview: CryptoReview = {
        ...reviewData,
        id: `${reviewData.symbol.toLowerCase()}-${Date.now()}`,
        createdAt: new Date().toISOString().split('T')[0],
        author: 'Crypto Review Lab Assistant'
      };

      setGeneratedReview(completeReview);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'A pipeline failure occurred. Please ensure your Gemini API Key is configured.');
    } finally {
      clearInterval(loadingInterval);
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!generatedReview) return;
    onSaveReview(generatedReview);
    setIsSaved(true);
  };

  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case 'Low': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'High': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'Critical': return 'text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getGradeColor = (grade: string) => {
    const mainChar = grade.charAt(0);
    if (mainChar === 'A') return 'text-emerald-400 border-emerald-400/20 bg-emerald-950/20';
    if (mainChar === 'B') return 'text-teal-400 border-teal-400/20 bg-teal-950/20';
    if (mainChar === 'C') return 'text-amber-400 border-amber-400/20 bg-amber-950/20';
    return 'text-rose-400 border-rose-400/20 bg-rose-950/20';
  };

  // Safe and beautiful markdown formatter to bypass dangerous outer dependencies in React 19
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-sans font-semibold text-lg text-slate-100 mt-6 mb-3 tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full inline-block"></span>
            {trimmed.replace('### ', '')}
          </h4>
        );
      }
      
      // Bullet points
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const bulletContent = trimmed.substring(2);
        
        // Handle bolding in bullets like **Label:** text
        const boldMatch = bulletContent.match(/^\*\*(.*?)\*\*(.*)/);
        if (boldMatch) {
          return (
            <li key={idx} className="text-sm text-slate-300 ml-4 mb-2 list-disc pl-1">
              <strong className="text-emerald-400 font-medium">{boldMatch[1]}</strong>
              {boldMatch[2]}
            </li>
          );
        }

        return (
          <li key={idx} className="text-sm text-slate-300 ml-4 mb-2 list-disc pl-1">
            {bulletContent}
          </li>
        );
      }

      // Standard text line with potential bold highlights
      if (trimmed === '') return <div key={idx} className="h-2"></div>;

      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(trimmed)) {
        const parts = trimmed.split(boldRegex);
        return (
          <p key={idx} className="text-sm text-slate-300 leading-relaxed mb-3">
            {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-slate-100 font-medium">{part}</strong> : part)}
          </p>
        );
      }

      return (
        <p key={idx} className="text-sm text-slate-300 leading-relaxed mb-3">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div id="review-lab-view" className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 py-4 md:py-6">
      {/* Configuration & Inputs panel */}
      <div className="lg:col-span-5 space-y-6 md:space-y-7">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-12 -mt-12"></div>
          
          <h2 className="font-sans font-bold text-lg md:text-xl text-slate-100 tracking-tight mb-5 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Evaluation Blueprint
          </h2>
          
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null); }}
                placeholder="e.g. Polkadot"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs md:text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Token Ticker</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => { setSymbol(e.target.value); setError(null); }}
                  placeholder="e.g. DOT"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs md:text-sm focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:uppercase"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-300 text-xs md:text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                  disabled={isLoading}
                >
                  <option value="Smart Contract / Layer 1">Smart Contract / L1</option>
                  <option value="DeFi / Automated Protocol">DeFi / Protocol</option>
                  <option value="DePIN / Physical Infra">DePIN Infrastructure</option>
                  <option value="AI / Decentralized Compute">AI / Compute</option>
                  <option value="Web3 Middleware / Layer 2">Layer 2 / Scaling</option>
                  <option value="Memecoin / Speculative">Memecoin</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">Custom Focus Lens</label>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Optional</span>
              </div>
              <textarea
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                placeholder="e.g. Evaluate unlock schedule on VC allocations or cross-chain security"
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs md:text-sm focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                disabled={isLoading}
              />
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full relative overflow-hidden group bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-sans font-bold text-xs md:text-sm py-2.5 md:py-3 px-4 rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Cpu className="w-4 h-4" />
              <span>Begin AI Security Audit</span>
            </motion.button>
          </form>

          {/* Quick suggestions to save user typing */}
          <div className="mt-6 pt-5 border-t border-slate-800/60 space-y-2.5">
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-wider">Sandbox Accelerators</h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SUGGESTIONS.map((sug) => (
                <motion.button
                  key={sug.symbol}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSuggestionClick(sug)}
                  disabled={isLoading}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-xs text-slate-300 hover:text-emerald-300 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                >
                  {sug.name} ({sug.symbol})
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Informational Help card */}
        <div className="bg-slate-900/50 border border-slate-800/40 rounded-2xl p-5 md:p-6 space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            Lab Assessment Pipeline
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed text-left">
            The **Crypto Review Lab** pipeline evaluates projects across 5 key dimensions. Each dimension is scored 1-10, with results compiled into a credit-rating standard (AAA down to D).
          </p>
        </div>
      </div>

      {/* Main visualizer output panel */}
      <div className="lg:col-span-7">
        {/* Loading skeleton state */}
        {isLoading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 min-h-[480px] flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-500/10 border-t-emerald-400 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2 max-w-md">
              <p className="font-sans font-semibold text-slate-200 text-sm">Synthesizing Laboratory Metrics</p>
              <motion.p 
                key={loadingStep}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-mono text-xs text-emerald-400 h-8"
              >
                {loadingMessages[loadingStep]}
              </motion.p>
            </div>
          </div>
        )}

        {/* Empty state when no review is requested */}
        {!isLoading && !generatedReview && !error && (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 min-h-[480px] flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500 mb-4">
              <FileCheck className="w-6 h-6" />
            </div>
            <h3 className="font-sans font-semibold text-slate-300 text-base mb-1">Audit Screen Offline</h3>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Define a project in the Blueprint configuration or click one of our Sandbox accelerators to run a comprehensive crypto analysis.
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="bg-slate-900 border border-rose-950/40 rounded-2xl p-8 min-h-[480px] flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center text-rose-400 mb-4">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            </div>
            <h3 className="font-sans font-semibold text-rose-400 text-base mb-1">Audit Stream Disrupted</h3>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-4">
              {error}
            </p>
            <p className="text-[11px] font-mono text-slate-500 max-w-xs">
              Make sure your API key is correctly configured via settings to run full-scale server audits.
            </p>
          </div>
        )}

        {/* Polished generated output */}
        {!isLoading && generatedReview && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.005 }}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_15px_40px_rgba(0,229,255,0.1)]"
          >
            {/* Header rating banner */}
            <div className="border-b border-slate-800 bg-slate-950/80 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-sans font-semibold text-lg text-slate-100">{generatedReview.name}</h3>
                  <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300 uppercase">{generatedReview.symbol}</span>
                  <span className="text-[10px] text-slate-500 border border-slate-800 rounded px-1.5 py-0.2">{generatedReview.category}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400/80 inline shrink-0" />
                  <span>Updated: {generatedReview.createdAt} by {generatedReview.author}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Score badge */}
                <div className={`border rounded-xl px-3 py-1 text-center min-w-[60px] ${getGradeColor(generatedReview.grade)}`}>
                  <div className="text-[8px] font-mono uppercase tracking-wider text-slate-400 leading-none">Grade</div>
                  <div className="text-xl font-sans font-bold leading-tight tracking-tight">{generatedReview.grade}</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 text-center min-w-[60px]">
                  <div className="text-[8px] font-mono uppercase tracking-wider text-slate-400 leading-none">Score</div>
                  <div className="text-xl font-sans font-bold text-slate-100 leading-tight tracking-tight">{generatedReview.overallScore}</div>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Verdict banner */}
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="bg-slate-950/40 border border-slate-800/80 hover:border-emerald-500/40 rounded-xl p-3 flex items-start gap-2.5 transition-all duration-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.12)]"
              >
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-1.5 text-emerald-400 shrink-0">
                  <BadgeCheck className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Executive Verdict</h4>
                  <p className="text-xs text-slate-200 leading-relaxed text-left">{generatedReview.verdict}</p>
                </div>
              </motion.div>

              {/* Score bars block */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">Audit Dimension Breakdown</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                  {[
                    { label: 'Token Utility & Function', val: generatedReview.scores.utility, icon: Activity },
                    { label: 'Tokenomics & Economics', val: generatedReview.scores.tokenomics, icon: TrendingUp },
                    { label: 'Network Security & Code', val: generatedReview.scores.security, icon: Cpu },
                    { label: 'Team, Backers & Devs', val: generatedReview.scores.team, icon: Layers },
                    { label: 'Community & Social Reach', val: generatedReview.scores.community, icon: Users },
                  ].map((dim, i) => (
                    <motion.div 
                      key={i} 
                      whileHover={{ scale: 1.02 }}
                      className="p-2 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:border-emerald-500/40 hover:bg-slate-950/80 hover:shadow-[0_0_12px_rgba(16,185,129,0.15)] transition-all duration-200 cursor-default space-y-1"
                    >
                      <div className="flex justify-between items-center text-xs font-sans">
                        <span className="text-slate-350 flex items-center gap-1.5 text-[11px]">
                          <dim.icon className="w-3 h-3 text-emerald-400/80" />
                          {dim.label}
                        </span>
                        <span className="font-mono text-emerald-400 font-medium text-[11px]">{dim.val}/10</span>
                      </div>
                      <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-400 rounded-full transition-all duration-1000" 
                          style={{ width: `${dim.val * 10}%` }}
                        ></div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Risk Level Badge */}
              <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Synthesized Risk Rating</span>
                <span className={`border text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${getRiskColor(generatedReview.riskLevel)}`}>
                  {generatedReview.riskLevel} Risk
                </span>
              </div>

              {/* Pros & Cons side-by-side card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Pros */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="bg-emerald-500/[0.02] border border-emerald-500/10 hover:border-emerald-500/30 rounded-xl p-3 space-y-2 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.18)]"
                >
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Key Opportunities
                  </h4>
                  <ul className="space-y-1">
                    {generatedReview.pros.map((pro, i) => (
                      <li key={i} className="text-[11px] text-slate-300 flex items-start gap-1 text-left">
                        <span className="text-emerald-500">•</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Cons */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="bg-rose-500/[0.02] border border-rose-500/10 hover:border-rose-500/30 rounded-xl p-3 space-y-2 transition-all duration-300 hover:shadow-[0_0_20px_rgba(244,63,94,0.18)]"
                >
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Structural Vulnerabilities
                  </h4>
                  <ul className="space-y-1">
                    {generatedReview.cons.map((con, i) => (
                      <li key={i} className="text-[11px] text-slate-300 flex items-start gap-1 text-left">
                        <span className="text-rose-500">•</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>

              {/* Full detailed review markdown body */}
              <div className="border-t border-slate-800/60 pt-3 space-y-1.5">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">Detailed Laboratory Report</h4>
                <div className="bg-slate-950/35 border border-slate-800/40 rounded-xl p-3.5 overflow-y-auto max-h-[220px] prose prose-invert prose-sm">
                  {renderMarkdown(generatedReview.summary)}
                </div>
              </div>

              {/* Actions footer */}
              <div className="border-t border-slate-800/60 pt-3 flex justify-between items-center">
                <p className="text-[10px] text-slate-400 font-mono">Review complies with Lab Audit methodologies.</p>
                <button
                  onClick={handleSave}
                  disabled={isSaved}
                  className={`px-3 py-1.5 rounded-lg text-xs font-sans font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                    isSaved 
                      ? 'bg-slate-800 text-slate-500 border border-slate-700' 
                      : 'bg-slate-100 hover:bg-white text-slate-950 hover:shadow-lg'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaved ? 'Draft Saved' : 'Save to Blog Drafts'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
