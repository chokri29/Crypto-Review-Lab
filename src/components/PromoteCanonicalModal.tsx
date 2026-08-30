/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  X, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  FileCode, 
  FileText, 
  Check, 
  RefreshCw,
  Award,
  Layers
} from 'lucide-react';
import { CryptoReview } from '../types';
import { INITIAL_REVIEWS } from '../data';

interface PromoteCanonicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  newReview: CryptoReview;
  onSuccess?: (updatedReview: CryptoReview) => void;
}

export function PromoteCanonicalModal({
  isOpen,
  onClose,
  newReview,
  onSuccess
}: PromoteCanonicalModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeDiffTab, setActiveDiffTab] = useState<'overview' | 'verdict' | 'scores' | 'report'>('overview');

  if (!isOpen || !newReview) return null;

  // Find existing canonical review in INITIAL_REVIEWS matching id, coingeckoId, or symbol
  const targetSymbol = (newReview.symbol || '').toUpperCase();
  const targetCgId = (newReview.coingeckoId || '').toLowerCase();
  const targetId = (newReview.id || '').toLowerCase();

  const oldCanonical = INITIAL_REVIEWS.find(r => 
    (r.id && r.id.toLowerCase() === targetId) ||
    (r.coingeckoId && targetCgId && r.coingeckoId.toLowerCase() === targetCgId) ||
    (r.symbol && r.symbol.toUpperCase() === targetSymbol)
  );

  const getSessionToken = (): string => {
    try {
      return localStorage.getItem('crl_admin_session_token') || '';
    } catch {
      return '';
    }
  };

  const handleConfirmPromote = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const sessionToken = getSessionToken();

    try {
      const res = await fetch('/api/admin/promote-canonical', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'x-admin-session': sessionToken,
          'x-session-token': sessionToken
        },
        body: JSON.stringify({
          sessionToken,
          review: newReview
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to promote review to canonical.');
      }

      setSuccessMsg(data.message || `Successfully promoted ${newReview.symbol} to canonical in src/data.ts!`);
      
      if (onSuccess) {
        onSuccess(newReview);
      }

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error('Failed to promote to canonical:', err);
      setError(err.message || 'An unexpected error occurred during canonical promotion.');
      setIsSubmitting(false);
    }
  };

  // Score comparison color helper
  const getScoreDiffBadge = (oldVal?: number, newVal?: number) => {
    if (oldVal === undefined || newVal === undefined) {
      return <span className="text-emerald-400 font-mono font-bold">New</span>;
    }
    const diff = newVal - oldVal;
    if (diff > 0) {
      return <span className="text-emerald-400 font-mono font-bold">+{diff} (Improved)</span>;
    } else if (diff < 0) {
      return <span className="text-rose-400 font-mono font-bold">{diff} (Adjusted)</span>;
    }
    return <span className="text-cyber-text-muted font-mono">Unchanged</span>;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-cyber-bg-card border border-amber-500/30 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Top Glow Bar */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-emerald-400 to-cyber-cyan" />

        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-cyber-cyan/15 flex items-start justify-between gap-4 bg-cyber-bg-primary/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                  ADMIN ACTION ONLY
                </span>
                <span className="font-mono text-[10px] text-cyber-text-muted">
                  SRC/DATA.TS CANONICAL COMMIT
                </span>
              </div>
              <h2 className="font-display font-black text-lg sm:text-xl text-cyber-text-primary tracking-tight mt-0.5">
                Promote {newReview.name} ({newReview.symbol}) to Canonical
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-cyber-text-muted hover:text-cyber-text-primary hover:bg-cyber-cyan/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Diff Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Target Record Info Banner */}
          <div className="p-3.5 rounded-2xl bg-cyber-bg-primary border border-cyber-cyan/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <FileCode className="w-4 h-4 text-cyber-cyan shrink-0" />
              <div className="text-xs">
                <span className="text-cyber-text-muted font-mono">Target Store: </span>
                <span className="font-mono font-bold text-cyber-text-primary">src/data.ts (INITIAL_REVIEWS)</span>
              </div>
            </div>

            {oldCanonical ? (
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3" /> Replaces Existing Canonical Record
              </span>
            ) : (
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Adds New 11th Canonical Record
              </span>
            )}
          </div>

          {/* Navigation Tabs for Detailed Diff View */}
          <div className="flex items-center gap-2 border-b border-cyber-cyan/15 pb-2">
            <button
              onClick={() => setActiveDiffTab('overview')}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all ${
                activeDiffTab === 'overview'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'text-cyber-text-muted hover:text-cyber-text-primary hover:bg-cyber-cyan/5'
              }`}
            >
              Overview & Grades
            </button>

            <button
              onClick={() => setActiveDiffTab('scores')}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all ${
                activeDiffTab === 'scores'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'text-cyber-text-muted hover:text-cyber-text-primary hover:bg-cyber-cyan/5'
              }`}
            >
              5-Dimension Scores
            </button>

            <button
              onClick={() => setActiveDiffTab('verdict')}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all ${
                activeDiffTab === 'verdict'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'text-cyber-text-muted hover:text-cyber-text-primary hover:bg-cyber-cyan/5'
              }`}
            >
              Rating Verdict
            </button>

            <button
              onClick={() => setActiveDiffTab('report')}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all ${
                activeDiffTab === 'report'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'text-cyber-text-muted hover:text-cyber-text-primary hover:bg-cyber-cyan/5'
              }`}
            >
              Pros & Cons / Report
            </button>
          </div>

          {/* TAB 1: OVERVIEW & GRADES DIFF */}
          {activeDiffTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Left: Old Canonical */}
                <div className="p-4 rounded-2xl bg-cyber-bg-primary/80 border border-rose-500/20 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-rose-500/20">
                    <span className="font-mono text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> CURRENT CANONICAL (OLD)
                    </span>
                    <span className="font-mono text-[10px] text-cyber-text-muted">
                      {oldCanonical ? 'From src/data.ts' : 'Non-existent'}
                    </span>
                  </div>

                  {oldCanonical ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-cyber-text-muted">Overall Rating:</span>
                        <span className="font-mono font-bold text-rose-300">
                          {oldCanonical.overallScore}/100 ({oldCanonical.grade})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyber-text-muted">Risk Level:</span>
                        <span className="font-mono font-semibold text-cyber-text-primary">
                          {oldCanonical.riskLevel}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyber-text-muted">Category:</span>
                        <span className="font-mono text-cyber-text-muted truncate max-w-[150px]">
                          {oldCanonical.category}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-rose-500/10">
                        <span className="text-[11px] text-cyber-text-muted block italic line-clamp-3">
                          "{oldCanonical.verdict}"
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-cyber-text-muted text-xs font-mono">
                      No prior canonical entry exists for {newReview.symbol}.
                    </div>
                  )}
                </div>

                {/* Right: Proposed New Canonical */}
                <div className="p-4 rounded-2xl bg-cyber-bg-primary/80 border border-emerald-500/30 space-y-3 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                  <div className="flex justify-between items-center pb-2 border-b border-emerald-500/20">
                    <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> PROPOSED NEW CANONICAL
                    </span>
                    <span className="font-mono text-[10px] text-emerald-400/80">
                      Pending Commit
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-cyber-text-muted">Overall Rating:</span>
                      <span className="font-mono font-bold text-emerald-300">
                        {newReview.overallScore}/100 ({newReview.grade})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyber-text-muted">Risk Level:</span>
                      <span className="font-mono font-semibold text-cyber-text-primary">
                        {newReview.riskLevel}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyber-text-muted">Category:</span>
                      <span className="font-mono text-cyber-text-muted truncate max-w-[150px]">
                        {newReview.category}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-emerald-500/10">
                      <span className="text-[11px] text-emerald-300/90 block italic line-clamp-3">
                        "{newReview.verdict}"
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 5-DIMENSION SCORES DIFF */}
          {activeDiffTab === 'scores' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-cyber-bg-primary/80 border border-cyber-cyan/15 space-y-3">
                <h4 className="font-mono text-xs font-bold text-cyber-text-secondary uppercase tracking-wider">
                  Dimension Breakdown Comparison (1 to 10 Scale)
                </h4>

                {[
                  { key: 'utility', label: 'Token Utility & Ecosystem Function' },
                  { key: 'tokenomics', label: 'Tokenomics & Emission Structure' },
                  { key: 'security', label: 'Network Security & Audit Health' },
                  { key: 'team', label: 'Team, Backers & Dev Execution' },
                  { key: 'community', label: 'Community & Social Presence' }
                ].map((dim) => {
                  const oldVal = oldCanonical?.scores?.[dim.key as keyof typeof oldCanonical.scores];
                  const newVal = newReview?.scores?.[dim.key as keyof typeof newReview.scores];

                  return (
                    <div key={dim.key} className="flex items-center justify-between p-2.5 rounded-xl bg-cyber-bg-card border border-cyber-cyan/10 text-xs">
                      <span className="font-medium text-cyber-text-primary">{dim.label}</span>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-rose-400/80">
                          {oldVal !== undefined ? `${oldVal}/10` : '—'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-cyber-text-muted" />
                        <span className="font-bold text-emerald-400">
                          {newVal !== undefined ? `${newVal}/10` : '—'}
                        </span>
                        <div className="w-24 text-right">
                          {getScoreDiffBadge(oldVal, newVal)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: VERDICT DIFF */}
          {activeDiffTab === 'verdict' && (
            <div className="space-y-4 text-xs">
              <div>
                <span className="font-mono font-bold text-rose-400 uppercase tracking-wider block mb-1.5">
                  OLD VERDICT (CURRENT IN DATA.TS)
                </span>
                <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-200/90 leading-relaxed font-sans">
                  {oldCanonical?.verdict ? `"${oldCanonical.verdict}"` : 'No existing canonical review.'}
                </div>
              </div>

              <div>
                <span className="font-mono font-bold text-emerald-400 uppercase tracking-wider block mb-1.5">
                  NEW PROPOSED VERDICT (TO BE COMMITTED)
                </span>
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 leading-relaxed font-sans font-medium">
                  "{newReview.verdict}"
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PROS & CONS / REPORT DIFF */}
          {activeDiffTab === 'report' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pros */}
                <div className="p-3.5 rounded-2xl bg-cyber-bg-primary border border-cyber-cyan/15 space-y-2">
                  <h5 className="font-mono font-bold text-emerald-400 uppercase">New Pros Highlights</h5>
                  <ul className="space-y-1.5 text-cyber-text-muted list-disc list-inside">
                    {newReview.pros?.map((p, i) => (
                      <li key={i} className="text-emerald-300/90">{p}</li>
                    ))}
                  </ul>
                </div>

                {/* Cons */}
                <div className="p-3.5 rounded-2xl bg-cyber-bg-primary border border-cyber-cyan/15 space-y-2">
                  <h5 className="font-mono font-bold text-rose-400 uppercase">New Cons & Vulnerabilities</h5>
                  <ul className="space-y-1.5 text-cyber-text-muted list-disc list-inside">
                    {newReview.cons?.map((c, i) => (
                      <li key={i} className="text-rose-300/90">{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Summary Markdown Preview Excerpt */}
              <div className="p-3.5 rounded-2xl bg-cyber-bg-primary border border-cyber-cyan/15 space-y-2">
                <h5 className="font-mono font-bold text-cyber-text-secondary uppercase">
                  Proposed Report Summary Excerpt
                </h5>
                <p className="text-cyber-text-muted text-[11px] font-mono leading-relaxed line-clamp-6 whitespace-pre-wrap">
                  {newReview.summary}
                </p>
              </div>
            </div>
          )}

          {/* Error Message Display */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message Display */}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer / Action Bar */}
        <div className="p-4 sm:p-5 border-t border-cyber-cyan/15 bg-cyber-bg-primary/80 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl font-mono text-xs font-semibold text-cyber-text-muted hover:text-cyber-text-primary hover:bg-cyber-cyan/10 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmPromote}
            disabled={isSubmitting || !!successMsg}
            className="px-5 py-2.5 rounded-xl font-mono text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 active:scale-98 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Committing to src/data.ts...</span>
              </>
            ) : successMsg ? (
              <>
                <Check className="w-4 h-4" />
                <span>Promoted Successfully</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Confirm & Promote to src/data.ts</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
