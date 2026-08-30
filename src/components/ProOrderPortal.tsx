/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { SignedAuditBadge } from './SignedAuditBadge';
import { 
  Search,
  ShieldCheck,
  CheckCircle2, 
  Clock, 
  Download, 
  Mail, 
  ExternalLink, 
  Lock, 
  FileCheck, 
  Send,
  Eye,
  Key,
  Sparkles,
  Crown,
  Zap,
  Cpu
} from 'lucide-react';
import { 
  ProOrder, 
  ProOrderEmailLog, 
  PRINCIPAL_EMAIL 
} from '../types';
import { generateAuditPdfReport } from '../services/pdfGenerator';
import { EmailViewerModal } from './EmailViewerModal';
import { PhaseTwoReControlView } from './PhaseTwoReControlView';
import { getConfidenceLevel, projectToPublicCryptoReviewReport } from '../services/f3Engine';

export const ProOrderPortal: React.FC<{
  initialOrderId?: string;
  onSelectReview?: (review: any) => void;
  onLaunchProEvaluation?: () => void;
  onLaunchRegularEvaluation?: () => void;
}> = ({ initialOrderId, onSelectReview, onLaunchProEvaluation, onLaunchRegularEvaluation }) => {
  const [searchOrderId, setSearchOrderId] = useState(initialOrderId || '');
  const [searchEmail, setSearchEmail] = useState('');
  const [matchingOrders, setMatchingOrders] = useState<ProOrder[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [viewingEmail, setViewingEmail] = useState<ProOrderEmailLog | null>(null);

  // Phase 2 Re-Control Regeneration Execution State
  const [isExecutingPhaseTwo, setIsExecutingPhaseTwo] = useState(false);
  const [phaseTwoStep, setPhaseTwoStep] = useState(0);

  const handleRegenerateOrder = async (orderId: string) => {
    setIsExecutingPhaseTwo(true);
    setPhaseTwoStep(0);

    for (let step = 0; step <= 7; step++) {
      setPhaseTwoStep(step);
      await new Promise(res => setTimeout(res, 200));
    }

    try {
      const res = await fetch('/api/pro-order/re-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      if (res.ok) {
        const updated: ProOrder = await res.json();
        if (updated) {
          setMatchingOrders(prev => prev.map(o => o.orderId === orderId ? updated : o));
        }
      }
    } catch (e) {
      console.error("Failed to regenerate report:", e);
    }

    setIsExecutingPhaseTwo(false);
    setPhaseTwoStep(0);
  };

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlOrder = params.get('orderId') || initialOrderId;
      const urlEmail = params.get('email');
      if (urlOrder) setSearchOrderId(urlOrder);
      if (urlEmail) setSearchEmail(urlEmail);

      const targetOrder = urlOrder || searchOrderId;
      const targetEmail = urlEmail || searchEmail;

      if (targetOrder && targetEmail) {
        handleSearch(targetOrder, targetEmail);
      }
    } catch (e) {
      if (searchOrderId && searchEmail) {
        handleSearch(searchOrderId, searchEmail);
      }
    }
  }, [initialOrderId]);

  const handleSearch = async (idArg?: string, emailArg?: string) => {
    const id = (idArg !== undefined ? idArg : searchOrderId).trim();
    const mail = (emailArg !== undefined ? emailArg : searchEmail).trim();
    
    setHasSearched(true);
    setSearchError(null);

    if (!id || !mail) {
      setSearchError("For security reasons, both a valid Order ID and your registration Email address are required.");
      setMatchingOrders([]);
      return;
    }

    try {
      const res = await fetch(`/api/pro-order/lookup?strict=true&orderId=${encodeURIComponent(id)}&email=${encodeURIComponent(mail)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      const orders: ProOrder[] = data.orders || [];

      if (orders.length === 0) {
        if (data.idMatch && !data.mailMatch) {
          setSearchError("Order ID found, but email address does not match security records.");
        } else if (!data.idMatch && data.mailMatch) {
          setSearchError("Email registered, but Order ID was not found.");
        } else {
          setSearchError("No matching order found for this Order ID and Email combination.");
        }
        setMatchingOrders([]);
      } else {
        setMatchingOrders(orders);
      }
    } catch (err) {
      console.error("Lookup error:", err);
      setSearchError("Network error while verifying order credentials.");
      setMatchingOrders([]);
    }
  };

  const handleDownloadPdf = (order: ProOrder) => {
    if (!order) return;
    const review = order.finalReview || order.systemDraft || {} as any;

    const publicReport = projectToPublicCryptoReviewReport({
      ...review,
      id: review.id || order.orderId,
      name: order.projectName || review.name,
      symbol: order.projectSymbol || review.symbol,
      contractAddress: order.contractAddress || review.contractAddress,
      auditSignature: order.auditSignature || review.auditSignature || order.humanNotes?.auditSignature,
      createdAt: order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : review.createdAt,
      publishApproved: order.publishApproved === true || order.status === 'DELIVERED',
      f3Verification: order.f3Verification || review.f3Verification,
      adminOverride: (order as any).adminOverride || (review as any)?.adminOverride
    });

    generateAuditPdfReport(publicReport, `${(order.projectSymbol || 'token').toLowerCase()}_security_risk_assessment.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0B0F19] to-slate-900 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                Client Portal & Secure Order Verification
              </span>
              <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                Algorithmic Security Intelligence
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight font-sans mt-1">
              Security & Risk Assessment Delivery Portal
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Secure Dual-Authentication Lookup • Track 24h Reviewed Delivery Workflow • Download Actionable Remediation PDF
            </p>
          </div>
        </div>

        {/* Dual Input Search Bar (Security Authentication: Order ID + Email) */}
        <div className="relative z-10 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Security Protocol: Order ID + Registered Email Required
            </span>
            <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
              Dual verification prevents unauthorized access to private assessments
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Input 1: Order ID */}
            <div className="md:col-span-5 relative">
              <label className="block text-[10px] font-mono text-slate-400 mb-1">1. ORDER ID</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Order ID (e.g. CRL-884291)..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500 shadow-inner"
                />
              </div>
            </div>

            {/* Input 2: Client Email */}
            <div className="md:col-span-5 relative">
              <label className="block text-[10px] font-mono text-slate-400 mb-1">2. CLIENT EMAIL</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Email used for order (e.g. client@domain.io)..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500 shadow-inner"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="md:col-span-2 flex items-end">
              <button
                onClick={() => handleSearch()}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold font-mono text-xs py-2.5 px-4 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap h-[42px]"
              >
                <Key className="w-3.5 h-3.5 text-slate-950" />
                Verify Order
              </button>
            </div>
          </div>

          {searchError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        {matchingOrders.length === 0 ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <Lock className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No verified Pro orders displayed.</p>
            <p className="text-xs text-slate-500 font-mono">
              Please enter both your exact Order ID (e.g. CRL-884291) and registered Email address to view private status.
            </p>
          </div>
        ) : (
          matchingOrders.map(order => {
            const isDelivered = order.status === 'DELIVERED';
            const review = order.finalReview || order.systemDraft || {} as any;

            return (
              <motion.div
                key={order.orderId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 sm:p-6 space-y-5 transition-all shadow-xl relative overflow-hidden"
              >
                {/* Header Meta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                      <span>Order #{order.orderId}</span>
                      <span>•</span>
                      <span className="text-sky-400 font-semibold">{order.clientEmail}</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-100 font-sans mt-1 flex flex-wrap items-center gap-2">
                      {order.projectName} ({order.projectSymbol})
                      {isDelivered ? (
                        <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded uppercase font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Final Report Ready & Delivered
                        </span>
                      ) : (
                        <span className="text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded uppercase font-bold flex items-center gap-1 animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          Pending
                        </span>
                      )}
                      <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-cyan-400 animate-pulse" /> AVF Engine Active
                      </span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {isDelivered ? (
                      <button
                        onClick={() => handleDownloadPdf(order)}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-sans font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-4 h-4 fill-slate-950" />
                        Download Executive PDF
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDownloadPdf(order)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        Download Preliminary Draft
                      </button>
                    )}
                  </div>
                </div>

                {/* AVF Pro Feature Callout Banner */}
                <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-950 border border-purple-500/40 rounded-xl p-3.5 text-xs text-purple-200 flex items-start gap-2.5 shadow-md">
                  <Sparkles className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <strong className="font-mono text-[11px] text-cyan-300 block mb-0.5 uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      AVF (Algorithmic Verification Framework) Tripartite Core Included
                    </strong>
                    <span className="text-[11px] text-slate-300 leading-relaxed">
                      Your Pro Order includes full AVF Tripartite Core verification: F1 Candidate Engine draft, F2 independent reviewer feedback loop, and F3 deterministic verification layer with 8 algorithmic verification modules.
                    </span>
                  </div>
                </div>

                {/* 3-Step Timeline Visualizer */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
                  <h4 className="font-mono text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Reviewed Delivery Model Timeline
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    
                    {/* Step 1 */}
                    <div className="bg-slate-900 border border-emerald-500/40 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          1. Instant Email Confirmation
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Email confirmation sent to <strong>{order.clientEmail}</strong>: <em>"Payment received. Your Security & Risk Assessment is being prepared. Delivery within 24 hours"</em>
                      </p>
                      {order.emailLogs?.[0] && (
                        <button
                          onClick={() => setViewingEmail(order.emailLogs[0])}
                          className="text-[10px] font-mono text-amber-400 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                        >
                          <Eye className="w-3 h-3 text-amber-400" />
                          Inspect Sent Confirmation Email
                        </button>
                      )}
                    </div>

                    {/* Step 2 */}
                    <div className={`bg-slate-900 border rounded-lg p-3 space-y-1 ${
                      isDelivered ? 'border-emerald-500/40' : 'border-amber-500/50 bg-amber-500/5'
                    }`}>
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className={`font-bold flex items-center gap-1 ${
                          isDelivered ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {isDelivered ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                          )}
                          2. F2 & AVF Automated Re-Control & Validation
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {isDelivered 
                          ? `Security assessment verified bytecode, F2 parameters, AVF score drift, and liquidity risk vectors.`
                          : `Order confirmed. Algorithmic security assessment & AVF cross-validation currently in progress.`
                        }
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className={`bg-slate-900 border rounded-lg p-3 space-y-1 ${
                      isDelivered ? 'border-emerald-500/40' : 'border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className={`font-bold flex items-center gap-1 ${
                          isDelivered ? 'text-emerald-400' : 'text-slate-500'
                        }`}>
                          <Send className="w-3.5 h-3.5" />
                          3. Remediation PDF Delivery & Private Token
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {isDelivered
                          ? `Email confirmation sent to ${order.clientEmail}. Private access token active.`
                          : `Guaranteed delivery within 24 hours of payment confirmation.`
                        }
                      </p>
                      {order.emailLogs?.[1] && (
                        <button
                          onClick={() => setViewingEmail(order.emailLogs[1])}
                          className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                        >
                          <Eye className="w-3 h-3 text-emerald-400" />
                          Inspect Delivery Email Record
                        </button>
                      )}
                    </div>

                  </div>
                </div>

                {/* Phase 2 / Client Status Card */}
                {!isDelivered ? (
                  <div className="mt-6 border-t border-slate-800/80 pt-6">
                    <div className="p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 text-xs font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-200 shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
                          <Clock className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50 uppercase">
                              Status: Pending
                            </span>
                            <span className="text-[10px] text-slate-400">Guaranteed Delivery &lt; 24h</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-100 font-mono mt-1">
                            Security Assessment & Algorithmic Verification Pending
                          </h4>
                          <p className="text-xs text-slate-400 font-sans mt-0.5">
                            Your Security & Risk Assessment order for {order.projectName} ({order.projectSymbol}) is currently being processed through our AVF Cross-Validation Engine and automated verification workflow.
                          </p>
                        </div>
                      </div>

                      <span className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider shrink-0 animate-pulse flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Pending
                      </span>
                    </div>
                  </div>
                ) : (
                  <PhaseTwoReControlView 
                    data={review?.phaseTwoReControl}
                    isAdmin={false}
                  />
                )}

                {/* Assessment Status & Verification Summary Box */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        Assessment Status
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        isDelivered 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {isDelivered ? 'VERIFICATION COMPLETED' : 'IN REVIEW / PENDING VERIFICATION'}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-200 font-mono flex items-center gap-2 flex-wrap">
                      <span className="text-cyan-300">AVF/F3 Framework Verification</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-300">
                        {review?.pros?.length || 0} Verified Strengths / {review?.cons?.length || 0} Risk Factors
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans">
                      Security-Provider Telemetry: Bytecode Scan & Invariant Analysis Active • Actionable Remediation in Dossier
                    </div>
                  </div>

                  {order.humanNotes && (
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs font-mono max-w-md">
                      <div className="text-[10px] text-amber-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        Security Analyst Remarks: Crypto Review Lab
                      </div>
                      <p className="text-slate-300 italic text-[11px]">"{order.humanNotes.auditorComments}"</p>
                    </div>
                  )}
                </div>

                {/* Cryptographic Sign-Off Badge */}
                {(order.auditSignature || review?.auditSignature || order.humanNotes?.auditSignature) && (
                  <SignedAuditBadge
                    signature={order.auditSignature || review?.auditSignature || order.humanNotes?.auditSignature}
                    scores={review?.scores}
                    verdict={review?.verdict}
                    grade={review?.grade}
                    timestamp={order.deliveredAt || review?.createdAt}
                  />
                )}

                {/* Download Button Footer */}
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/80">
                  <span className="flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    Private Token: <strong className="text-slate-300">{order.privateDownloadToken}</strong>
                  </span>

                  {onSelectReview && (
                    <button
                      onClick={() => onSelectReview(review)}
                      className="text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      Inspect Full Assessment Details &rarr;
                    </button>
                  )}
                </div>

              </motion.div>
            );
          })
        )}
      </div>

      {/* Email Record Modal */}
      <EmailViewerModal
        email={viewingEmail}
        onClose={() => setViewingEmail(null)}
      />
    </div>
  );
};

export default ProOrderPortal;
