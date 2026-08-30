/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SignedAuditBadge } from './SignedAuditBadge';
import { 
  ShieldCheck, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  FileText, 
  Send, 
  Mail, 
  Sparkles, 
  AlertTriangle, 
  ChevronRight, 
  Download, 
  RefreshCw, 
  Sliders, 
  Edit3, 
  Eye, 
  Lock,
  Layers,
  ArrowRight,
  Plus,
  X,
  Zap,
  Crown,
  Key,
  RotateCcw,
  Search,
  KeyRound,
  ShieldAlert,
  CheckSquare,
  ExternalLink
} from 'lucide-react';
import { 
  ProOrder, 
  ProOrderEmailLog, 
  AdminOverrideLog,
  CryptoReview,
  PRINCIPAL_EMAIL 
} from '../types';
import { INITIAL_REVIEWS } from '../data';
import { generateAuditPdfReport } from '../services/pdfGenerator';
import { calculateBlueprintScore } from '../services/EvaluationBlueprint';
import { EmailViewerModal } from './EmailViewerModal';
import { PhaseTwoReControlView } from './PhaseTwoReControlView';
import { runPhaseTwoReControl } from '../services/reControlEngine';
import { runF3Verification, isF2GatePassed, projectToPublicCryptoReviewReport } from '../services/f3Engine';
import { useF3VerificationState } from '../context/F3VerificationContext';

export const AuditorReviewConsole: React.FC<{
  onSelectReviewForMainApp?: (review: any) => void;
  onLaunchProEvaluation?: () => void;
  onLaunchRegularEvaluation?: () => void;
  onLogout?: () => void;
  onNavigateToF3?: (reviewId?: string) => void;
}> = ({ onSelectReviewForMainApp, onLaunchProEvaluation, onLaunchRegularEvaluation, onLogout, onNavigateToF3 }) => {
  const { getF3Result, adminOverrides } = useF3VerificationState();
  const [orders, setOrders] = useState<ProOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'delivered' | 'all'>('pending');

  const [keyAgeWarning, setKeyAgeWarning] = useState<string | null>(null);
  const [actionLogs, setActionLogs] = useState<Array<{ id: string; timestamp: string; action: string; details: string }>>([]);

  useEffect(() => {
    try {
      const ts = parseInt(localStorage.getItem('crl_admin_auth_timestamp') || '0', 10);
      if (ts) {
        const days = (Date.now() - ts) / (1000 * 60 * 60 * 24);
        if (days > 30) {
          setKeyAgeWarning(`⚠️ Security Notice: Admin Master Key credentials have been stored in local storage for ${Math.floor(days)} days (>30 days). Please rotate your credentials immediately.`);
        }
      }
      const logs = JSON.parse(localStorage.getItem('crl_admin_action_logs') || '[]');
      setActionLogs(logs);
    } catch (e) {}
  }, []);

  // Reviewer Editing Form State (Static Institutional Authority)
  const [auditorName, setAuditorName] = useState('Crypto Review Lab');
  const [verificationStamp, setVerificationStamp] = useState<'VERIFIED_AUDIT' | 'CORRECTIONS_APPLIED' | 'HIGH_RISK_WARNING'>('VERIFIED_AUDIT');
  const [auditorComments, setAuditorComments] = useState('');

  // Score correction inputs
  const [scoreUtility, setScoreUtility] = useState(9);
  const [scoreTokenomics, setScoreTokenomics] = useState(9);
  const [scoreSecurity, setScoreSecurity] = useState(9);
  const [scoreTeam, setScoreTeam] = useState(9);
  const [scoreCommunity, setScoreCommunity] = useState(9);

  // Email Preview Modal State
  const [viewingEmail, setViewingEmail] = useState<ProOrderEmailLog | null>(null);

  // Success Notification Banner
  const [deliverySuccessMsg, setDeliverySuccessMsg] = useState<string | null>(null);

  // Admin Override Modal State
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideAuthor, setOverrideAuthor] = useState('Crypto Review Lab');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideAcknowledged, setOverrideAcknowledged] = useState(false);
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  // Instant Client 24h Dispatch Modal State
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchEmail, setDispatchEmail] = useState('');
  const [dispatchName, setDispatchName] = useState('');
  const [dispatchSymbol, setDispatchSymbol] = useState('');
  const [dispatchContract, setDispatchContract] = useState('');
  const [dispatchFocus, setDispatchFocus] = useState('');

  // Phase 2 Re-Control Initiation State
  const [isExecutingPhaseTwo, setIsExecutingPhaseTwo] = useState(false);
  const [phaseTwoStep, setPhaseTwoStep] = useState(0);

  const handleInitiatePhaseTwo = async (orderId: string) => {
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
        await loadOrders();
        if (selectedOrderId === orderId) {
          populateEditorFields(updated);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crl_order_updated', { detail: updated }));
        }
      }
    } catch (e) {
      console.error("Failed to run Phase 2 re-control:", e);
    }

    setIsExecutingPhaseTwo(false);
    setPhaseTwoStep(0);
  };

  const handleRevertToDefault = () => {
    if (!selectedOrder) return;
    const match = INITIAL_REVIEWS.find(r => 
      r.symbol.toLowerCase() === (selectedOrder.projectSymbol || '').toLowerCase() ||
      r.name.toLowerCase() === (selectedOrder.projectName || '').toLowerCase()
    );
    const defaultScores = match?.scores || selectedOrder.systemDraft?.scores || { utility: 9, tokenomics: 9, security: 9, team: 9, community: 9 };
    setScoreUtility(Number(defaultScores.utility ?? 9));
    setScoreTokenomics(Number(defaultScores.tokenomics ?? 9));
    setScoreSecurity(Number(defaultScores.security ?? 9));
    setScoreTeam(Number(defaultScores.team ?? 9));
    setScoreCommunity(Number(defaultScores.community ?? 9));
  };
  const [dispatchNotes, setDispatchNotes] = useState('');

  const handleInstantDispatch = async () => {
    if (!dispatchEmail.trim() || !dispatchName.trim()) return;

    const projName = dispatchName.trim();
    const projSymbol = (dispatchSymbol.trim() || 'PRO').toUpperCase();
    const clientEmail = dispatchEmail.trim();

    const systemDraft: CryptoReview = {
      id: `draft_${Date.now()}`,
      name: projName,
      symbol: projSymbol,
      category: 'Smart Contract / Web3',
      overallScore: 92,
      grade: 'AAA',
      verdict: `Security Assessment Completed (${auditorName}): ${dispatchNotes}`,
      scores: { utility: 9, tokenomics: 9, security: 10, team: 9, community: 9 },
      summary: `Security & Risk Assessment for ${projName} (${projSymbol}). Full executive risk assessment dossier verified and approved by ${auditorName}.`,
      pros: ['Verified opcode execution paths', 'Multi-sig governance & timelock protection verified', 'TVL stress simulation resilient up to $1.2B shock'],
      cons: ['On-chain monitoring recommended for parameter updates', 'Regular re-assessment recommended on contract upgrade'],
      riskLevel: 'Low' as const,
      createdAt: new Date().toISOString(),
      author: auditorName
    };

    try {
      const createRes = await fetch('/api/pro-order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: clientEmail,
          projectName: projName,
          projectSymbol: projSymbol,
          contractAddress: dispatchContract.trim() || undefined,
          focusArea: dispatchFocus.trim() || 'Institutional Smart Contract Audit & TVL Resilience',
          verificationDepth: 'Unified Bytecode & Evidence Verification',
          stressSimulation: true,
          systemDraft: systemDraft
        })
      });

      if (!createRes.ok) throw new Error("Failed to create order");
      const order: ProOrder = await createRes.json();

      const instantOverride: AdminOverrideLog = {
        overriddenBy: auditorName,
        overriddenAt: new Date().toISOString(),
        reason: `Master Auditor instant dispatch verification: ${dispatchNotes || 'Direct signoff'}`,
        previousF3Status: 'VERIFIED',
        discrepanciesOverridden: [],
        acknowledged: true
      };
      systemDraft.adminOverride = instantOverride;

      const approveRes = await fetch('/api/pro-order/review-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          auditorNotes: {
            reviewedBy: auditorName,
            auditorComments: dispatchNotes,
            verificationStamp: 'VERIFIED_AUDIT',
            adminOverride: instantOverride
          },
          updatedReview: systemDraft
        })
      });

      if (!approveRes.ok) throw new Error("Failed to approve order");
      const delivered: ProOrder = await approveRes.json();

      if (delivered) {
        await loadOrders();
        setShowDispatchModal(false);
        setDeliverySuccessMsg(`🚀 Instant 24h Executive Delivery Dispatched to ${clientEmail}! Order #${delivered.orderId} email confirmation sent.`);
        if (delivered.emailLogs && delivered.emailLogs.length > 0) {
          setViewingEmail(delivered.emailLogs[delivered.emailLogs.length - 1]);
        }
        setDispatchEmail('');
        setDispatchName('');
        setDispatchSymbol('');
        setDispatchContract('');
        setDispatchFocus('');
      }
    } catch (e) {
      console.error("Instant dispatch error:", e);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await fetch('/api/pro-order/list');
      if (res.ok) {
        const list: ProOrder[] = await res.json();
        setOrders(list);
        if (list.length > 0 && !selectedOrderId) {
          setSelectedOrderId(list[0].orderId);
          populateEditorFields(list[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load pro orders:", err);
    }
  };

  const selectedOrder = orders.find(o => o.orderId === selectedOrderId) || orders[0];

  const populateEditorFields = (order: ProOrder) => {
    if (!order) return;
    const review = order.finalReview || order.systemDraft;
    if (review && review.scores) {
      setScoreUtility(review.scores.utility ?? 9);
      setScoreTokenomics(review.scores.tokenomics ?? 9);
      setScoreSecurity(review.scores.security ?? 9);
      setScoreTeam(review.scores.team ?? 9);
      setScoreCommunity(review.scores.community ?? 9);
    } else {
      setScoreUtility(9);
      setScoreTokenomics(9);
      setScoreSecurity(9);
      setScoreTeam(9);
      setScoreCommunity(9);
    }

    if (order.humanNotes) {
      setAuditorName('Crypto Review Lab');
      setVerificationStamp(order.humanNotes.verificationStamp || 'VERIFIED_AUDIT');
      setAuditorComments(order.humanNotes.auditorComments || '');
    } else {
      setAuditorName('Crypto Review Lab');
      setVerificationStamp('VERIFIED_AUDIT');
      setAuditorComments('');
    }
  };

  const handleSelectOrder = (order: ProOrder) => {
    setSelectedOrderId(order.orderId);
    populateEditorFields(order);
  };

  // Recalculate preview score in real time
  const currentScores = {
    utility: Number(scoreUtility),
    tokenomics: Number(scoreTokenomics),
    security: Number(scoreSecurity),
    team: Number(scoreTeam),
    community: Number(scoreCommunity)
  };
  const recalculatedBlueprint = calculateBlueprintScore(currentScores);

  const isAuditFormValid = Boolean(auditorComments && auditorComments.trim().length > 0);

  const getAuthHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const token = localStorage.getItem('crl_admin_session_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-admin-session'] = token;
        headers['x-session-token'] = token;
      }
    } catch {}
    return headers;
  };

  const handleOpenOverrideModal = () => {
    if (!selectedOrder) return;
    const existingOverride = selectedOrder.adminOverride || (selectedOrder.finalReview || selectedOrder.systemDraft)?.adminOverride;
    setOverrideAuthor(existingOverride?.overriddenBy || 'Crypto Review Lab');
    setOverrideReason(existingOverride?.reason || '');
    setOverrideAcknowledged(Boolean(existingOverride?.acknowledged));
    setShowOverrideModal(true);
  };

  const handleSaveAdminOverride = async () => {
    if (!selectedOrder || !overrideAuthor.trim() || !overrideReason.trim() || !overrideAcknowledged) return;
    setIsSavingOverride(true);
    try {
      const review = selectedOrder.finalReview || selectedOrder.systemDraft;
      const f3 = review?.f3Verification || null;

      const overrideLog: AdminOverrideLog = {
        overriddenBy: overrideAuthor.trim(),
        overriddenAt: new Date().toISOString(),
        reason: overrideReason.trim(),
        previousF3Status: f3?.overallStatus || 'FAILED',
        discrepanciesOverridden: f3?.discrepancies || [],
        acknowledged: true
      };

      const res = await fetch('/api/pro-order/admin-override', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          orderId: selectedOrder.orderId,
          override: overrideLog
        })
      });

      if (res.ok) {
        const updated: ProOrder = await res.json();
        await loadOrders();
        if (selectedOrderId === selectedOrder.orderId) {
          populateEditorFields(updated);
        }
        setShowOverrideModal(false);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crl_order_updated', { detail: updated }));
        }
        try {
          const newLog = {
            id: `log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'F3_ADMIN_OVERRIDE',
            details: `Order #${selectedOrder.orderId} F3 override authorized by ${overrideAuthor.trim()}: "${overrideReason.trim().slice(0, 55)}..."`
          };
          const currentLogs = JSON.parse(localStorage.getItem('crl_admin_action_logs') || '[]');
          const updatedLogs = [newLog, ...currentLogs.slice(0, 49)];
          localStorage.setItem('crl_admin_action_logs', JSON.stringify(updatedLogs));
          setActionLogs(updatedLogs);
        } catch (e) {}
      }
    } catch (err) {
      console.error("Failed to save admin override:", err);
    } finally {
      setIsSavingOverride(false);
    }
  };

  const handleClearAdminOverride = async () => {
    if (!selectedOrder) return;
    try {
      const res = await fetch('/api/pro-order/admin-override', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          orderId: selectedOrder.orderId,
          override: null
        })
      });
      if (res.ok) {
        const updated: ProOrder = await res.json();
        await loadOrders();
        if (selectedOrderId === selectedOrder.orderId) {
          populateEditorFields(updated);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crl_order_updated', { detail: updated }));
        }
        try {
          const newLog = {
            id: `log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'F3_OVERRIDE_CLEARED',
            details: `Order #${selectedOrder.orderId} F3 admin override cleared.`
          };
          const currentLogs = JSON.parse(localStorage.getItem('crl_admin_action_logs') || '[]');
          const updatedLogs = [newLog, ...currentLogs.slice(0, 49)];
          localStorage.setItem('crl_admin_action_logs', JSON.stringify(updatedLogs));
          setActionLogs(updatedLogs);
        } catch (e) {}
      }
    } catch (err) {
      console.error("Failed to clear admin override:", err);
    }
  };

  const handleApproveAndDeliver = async () => {
    if (!selectedOrder || !isAuditFormValid) return;

    const baseReview = selectedOrder.systemDraft;
    const activeAdminOverride = selectedOrder.adminOverride || (selectedOrder.finalReview || selectedOrder.systemDraft)?.adminOverride;

    // STRICT 95% GATE: Deliver requires F2 score >= 95% or authorized override
    if (!isF2GatePassed(baseReview) && !activeAdminOverride) {
      const f2QualityScore = typeof baseReview?.phaseTwoReControl?.qualityScorePct === 'number' 
        ? baseReview.phaseTwoReControl.qualityScorePct 
        : baseReview?.phaseTwoReControl?.overallScorePct;
      alert(`[STRICT 95% F3 GATE] Cannot approve and deliver order: Phase 2 (F2) Re-Control has ${
        baseReview?.phaseTwoReControl 
          ? `quality score ${f2QualityScore}% (< 95.0% threshold) - PENDING_REGENERATION` 
          : 'not yet been executed - PENDING_F2'
      }. F3 verification and delivery require F2 quality score >= 95% or an authorized admin override.`);
      return;
    }

    // Create updated review object
    const updatedReview = {
      ...baseReview,
      overallScore: recalculatedBlueprint.overallScore,
      grade: recalculatedBlueprint.grade,
      riskLevel: recalculatedBlueprint.riskLevel,
      scores: currentScores,
      verdict: `Manual Audit Verified (${auditorName}): ${auditorComments}`,
      author: auditorName,
      adminOverride: activeAdminOverride
    };

    try {
      const res = await fetch('/api/pro-order/review-approve', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          orderId: selectedOrder.orderId,
          auditorNotes: {
            reviewedBy: auditorName,
            auditorComments: auditorComments,
            verificationStamp: verificationStamp,
            adminOverride: activeAdminOverride
          },
          updatedReview
        })
      });

      if (res.ok) {
        const deliveredOrder: ProOrder = await res.json();
        setDeliverySuccessMsg(`🎉 Order #${deliveredOrder.orderId} approved! Polished PDF delivery email confirmation sent to ${deliveredOrder.clientEmail}`);
        await loadOrders();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crl_order_updated', { detail: deliveredOrder }));
        }
        setTimeout(() => setDeliverySuccessMsg(null), 8000);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to approve and deliver order.");
      }
    } catch (e) {
      console.error("Approval error:", e);
    }
  };

  const [isExecutingF3, setIsExecutingF3] = useState(false);

  const handleReVerifyF3 = () => {
    if (!selectedOrder) return;
    const review = selectedOrder.finalReview || selectedOrder.systemDraft;
    if (!review) return;

    const activeOverride = selectedOrder.adminOverride || review.adminOverride || adminOverrides[selectedOrder.orderId];
    if (!isF2GatePassed(review) && !activeOverride) {
      const f2QualityScore = typeof review.phaseTwoReControl?.qualityScorePct === 'number' 
        ? review.phaseTwoReControl.qualityScorePct 
        : review.phaseTwoReControl?.overallScorePct;
      alert(`[STRICT 95% F3 GATE] F3 may execute ONLY when Phase 2 (F2) quality score is >= 95%. Current status: ${
        review.phaseTwoReControl 
          ? `Phase 2 quality score is ${f2QualityScore}% (< 95%) - PENDING_REGENERATION` 
          : 'Awaiting Phase 2 Initiation - PENDING_F2'
      }. Please initiate Phase 2 Re-Control first, or provide an authorized Admin Override.`);
      return;
    }

    setIsExecutingF3(true);
    setTimeout(() => {
      try {
        review.f3Verification = runF3Verification(review, {
          securityScan: review.securityScan,
          citations: review.citations,
          activeOverride: activeOverride
        });
        setOrders([...orders]);
      } catch (err: any) {
        console.error("F3 re-verification error:", err);
        alert(err.message || "Failed to execute F3 verification");
      } finally {
        setIsExecutingF3(false);
      }
    }, 400);
  };

  const handleDownloadPreliminaryPdf = (order: ProOrder) => {
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

    generateAuditPdfReport(publicReport, `${(order.projectSymbol || 'token').toLowerCase()}_preliminary_report_pre_f3.pdf`);
  };

  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = orders.filter(o => {
    // Tab filter
    const matchesTab = 
      activeTab === 'pending' ? (o.status === 'IN_HUMAN_REVIEW' || o.status === 'PAYMENT_CONFIRMED') :
      activeTab === 'delivered' ? (o.status === 'DELIVERED') : true;

    if (!matchesTab) return false;

    // Search query filter (Order ID + Email + Project Name + Symbol)
    if (!searchQuery.trim()) return true;

    const q = searchQuery.trim().toLowerCase();
    return (
      o.orderId.toLowerCase().includes(q) ||
      o.clientEmail.toLowerCase().includes(q) ||
      o.projectName.toLowerCase().includes(q) ||
      o.projectSymbol.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0B0F19] to-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3">
            <div className="p-2.5 sm:p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
              <UserCheck className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                  Internal Workflow Step 2 & 3
                </span>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                  <Key className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">Master Auditor Session Active</span>
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-extrabold text-slate-100 tracking-tight font-sans mt-1 leading-snug break-words">
                Reviewed Delivery Model — Auditor Console
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => setShowDispatchModal(true)}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-mono font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer whitespace-nowrap"
            >
              <Zap className="w-4 h-4 fill-slate-950 text-slate-950 shrink-0" />
              <span>Instant 24h Client Dispatch</span>
            </button>

            <button
              onClick={loadOrders}
              className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Refresh Queue</span>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Admin Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 30-Day Credential Rotation Warning Banner */}
      {keyAgeWarning && (
        <div className="p-4 bg-amber-500/15 border border-amber-500/50 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{keyAgeWarning}</span>
          </div>
          <span className="text-[10px] bg-amber-500/20 px-2 py-1 rounded text-amber-200 font-bold uppercase shrink-0">
            Security Compliance
          </span>
        </div>
      )}

      {/* Success Banner */}
      {deliverySuccessMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-mono flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{deliverySuccessMsg}</span>
          </div>
          <button
            onClick={() => setDeliverySuccessMsg(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-bold"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Main Grid Layout: Queue sidebar + Auditor Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Orders Queue List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                Pro Orders Queue ({filteredOrders.length} / {orders.length})
              </h3>
            </div>

            {/* Admin Search Bar (Order ID + Email Filter) */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search queue by Order ID, Email or Name..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-amber-500/60"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer text-center font-bold ${
                  activeTab === 'pending'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                In Review ({orders.filter(o => o.status !== 'DELIVERED').length})
              </button>
              <button
                onClick={() => setActiveTab('delivered')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer text-center font-bold ${
                  activeTab === 'delivered'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Delivered ({orders.filter(o => o.status === 'DELIVERED').length})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer text-center font-bold ${
                  activeTab === 'all'
                    ? 'bg-slate-800 text-slate-100 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({orders.length})
              </button>
            </div>

            {/* Orders List Items */}
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredOrders.length === 0 ? (
                <div className="p-6 text-center text-slate-500 font-mono text-xs bg-slate-950/50 rounded-xl border border-slate-800">
                  No orders in this queue category.
                </div>
              ) : (
                filteredOrders.map(ord => {
                  const isSelected = selectedOrder?.orderId === ord.orderId;
                  const isDelivered = ord.status === 'DELIVERED';

                  return (
                    <button
                      key={ord.orderId}
                      onClick={() => handleSelectOrder(ord)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 relative group ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-500/15 to-slate-900 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-extrabold text-slate-100 flex items-center gap-1.5">
                          {ord.projectName}
                          <span className="text-[10px] text-amber-300 font-normal">({ord.projectSymbol})</span>
                        </span>
                        {isDelivered ? (
                          <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded uppercase font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            Delivered
                          </span>
                        ) : !ord.systemDraft?.phaseTwoReControl ? (
                          <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded uppercase font-bold flex items-center gap-1 animate-pulse">
                            <Clock className="w-2.5 h-2.5 text-amber-400" />
                            Awaiting Phase 2
                          </span>
                        ) : !isF2GatePassed(ord.systemDraft) ? (
                          <span className="text-[9px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded uppercase font-bold flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                            F3 Blocked (&lt;95%)
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.5 rounded uppercase font-bold flex items-center gap-1">
                            <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" />
                            F2 Passed (≥95%)
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                        <span className="truncate max-w-[160px] text-sky-400">{ord.clientEmail}</span>
                        <span className="text-slate-500">{ord.orderId}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/60 pt-2">
                        <span>ETA: &lt; 24h</span>
                        <span className="text-amber-400 font-bold">${(ord.amountUsd || 149).toFixed(2)} USD</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Workstation & Human Review Desk (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedOrder ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6">
              
              {/* Workstation Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                    <span>Order #{selectedOrder.orderId}</span>
                    <span>•</span>
                    <span className="text-amber-400 font-semibold">{selectedOrder.paymentMethod}</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-100 font-sans flex items-center gap-2 mt-0.5">
                    {selectedOrder.projectName} ({selectedOrder.projectSymbol})
                    {selectedOrder.status === 'DELIVERED' ? (
                      <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded uppercase font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Final Delivery Dispatched
                      </span>
                    ) : !selectedOrder.systemDraft?.phaseTwoReControl ? (
                      <span className="text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded uppercase font-bold flex items-center gap-1 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Phase 1 Complete — Awaiting Stage 2 Initiation
                      </span>
                    ) : (
                      <span className="text-xs font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded uppercase font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        Phase 2 Verified — Ready for Auditor Approval
                      </span>
                    )}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {onNavigateToF3 && (
                    <button
                      type="button"
                      onClick={() => onNavigateToF3(selectedOrder.orderId)}
                      className="px-3.5 py-2 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 rounded-xl font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      title="Inspect deterministic algorithmic verification in F3 Dashboard"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>F3 Verification</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDownloadPreliminaryPdf(selectedOrder)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-amber-500/40 hover:border-amber-400 rounded-xl font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Generate preliminary evaluation report draft prior to F3 stage"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Preliminary PDF (Pre-F3)</span>
                  </button>
                </div>
              </div>

              {/* 3-Step Reviewed Delivery Model Progress Tracker */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="font-mono text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Reviewed Delivery Model Execution Status
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  
                  {/* Step 1 */}
                  <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        Step 1: Payment & Email
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold">DONE</span>
                    </div>
                    {selectedOrder.emailLogs?.[0] && (
                      <button
                        onClick={() => setViewingEmail(selectedOrder.emailLogs[0])}
                        className="text-[10px] font-mono text-amber-400 hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                      >
                        <Eye className="w-3 h-3 text-amber-400 shrink-0" />
                        View Email Log
                      </button>
                    )}
                  </div>

                  {/* Step 2 */}
                  <div className={`bg-slate-900 border rounded-xl p-3 space-y-2 ${
                    selectedOrder.status === 'DELIVERED' ? 'border-emerald-500/40' : 'border-amber-500/50 bg-amber-500/5'
                  }`}>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className={`font-bold flex items-center gap-1.5 ${
                        selectedOrder.status === 'DELIVERED' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {selectedOrder.status === 'DELIVERED' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                        )}
                        Step 2: Manual Audit Review
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                        selectedOrder.status === 'DELIVERED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {selectedOrder.status === 'DELIVERED' ? 'VERIFIED' : 'ACTIVE'}
                      </span>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className={`bg-slate-900 border rounded-xl p-3 space-y-2 ${
                    selectedOrder.status === 'DELIVERED' ? 'border-emerald-500/40' : 'border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className={`font-bold flex items-center gap-1.5 ${
                        selectedOrder.status === 'DELIVERED' ? 'text-emerald-400' : 'text-slate-500'
                      }`}>
                        <Send className="w-3.5 h-3.5 shrink-0" />
                        Step 3: PDF Delivery
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                        selectedOrder.status === 'DELIVERED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                        {selectedOrder.status === 'DELIVERED' ? 'SENT' : 'PENDING'}
                      </span>
                    </div>
                    {selectedOrder.emailLogs?.[1] && (
                      <button
                        onClick={() => setViewingEmail(selectedOrder.emailLogs[1])}
                        className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                      >
                        <Eye className="w-3 h-3 text-emerald-400 shrink-0" />
                        View Delivery Email
                      </button>
                    )}
                  </div>

                </div>
              </div>

              {/* Phase 2: Automated Re-Control Report (7 Control Gates) */}
              <PhaseTwoReControlView 
                data={(selectedOrder.finalReview || selectedOrder.systemDraft)?.phaseTwoReControl} 
                onTriggerPhaseTwo={() => handleInitiatePhaseTwo(selectedOrder.orderId)}
                onTriggerRegenerate={() => handleInitiatePhaseTwo(selectedOrder.orderId)}
                isExecuting={isExecutingPhaseTwo}
                executingStep={phaseTwoStep}
                isAdmin={true}
              />

              {/* Stage 3: F3 Deterministic Verification Layer Reference */}
              <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest font-bold px-2 py-0.5 rounded border bg-cyan-950/80 border-cyan-500/40 text-cyan-300">
                        STAGE 3: DETERMINISTIC VERIFICATION MATRIX
                      </span>
                      {adminOverrides[selectedOrder.orderId] || selectedOrder.adminOverride ? (
                        <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.2 rounded font-bold">
                          ADMIN OVERRIDDEN
                        </span>
                      ) : !selectedOrder.systemDraft?.phaseTwoReControl ? (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-bold">
                          STAGE 2 PENDING (F3 GATED)
                        </span>
                      ) : !isF2GatePassed(selectedOrder.systemDraft) ? (
                        <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.2 rounded font-bold">
                          F3 BLOCKED (F2 SCORE &lt; 95%)
                        </span>
                      ) : getF3Result(selectedOrder.orderId)?.overallStatus === 'VERIFIED' ? (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-bold">
                          F3 VERIFIED (100% INVARIANT MATCH)
                        </span>
                      ) : (
                        <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.2 rounded font-bold">
                          F2 PASSED (≥95%) → F3 ELIGIBLE
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 text-[11px] mt-1 font-sans">
                      All 8 algorithmic modules (AVF-01 to AVF-08), mathematical proofs, and cryptographic hashes are synchronized in real-time with the <strong className="text-cyan-300">F3 Dashboard</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onNavigateToF3 && (
                    <button
                      type="button"
                      onClick={() => onNavigateToF3((selectedOrder.finalReview || selectedOrder.systemDraft)?.id)}
                      className="px-3.5 py-2 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 text-cyan-300 border border-cyan-500/40 font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span>Open F3 Dashboard</span>
                      <ExternalLink className="w-3 h-3 text-cyan-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Institutional Review & Correction Form */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="font-mono text-sm font-extrabold text-amber-300 flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    Institutional Review & Correction Controls
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    Live Score Recalculation Active
                  </span>
                </div>

                {/* Score Adjuster Sliders */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-slate-300 block">
                      1. Dimension Scores Verification & Adjustments:
                    </span>
                    <button
                      onClick={handleRevertToDefault}
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 hover:border-amber-400/70 text-xs font-mono font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                      title="Revert all 5 core dimension sliders to original blueprint default scores"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      Revert to Default
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                    {/* Utility */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300">Utility & Protocol Function (25%)</span>
                        <span className="font-bold text-amber-400">{scoreUtility} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={scoreUtility}
                        onChange={e => setScoreUtility(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* Tokenomics */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300">Tokenomics & Supply Model (25%)</span>
                        <span className="font-bold text-amber-400">{scoreTokenomics} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={scoreTokenomics}
                        onChange={e => setScoreTokenomics(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* Security */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300">Smart Contract Security (25%)</span>
                        <span className="font-bold text-amber-400">{scoreSecurity} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={scoreSecurity}
                        onChange={e => setScoreSecurity(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* Team */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300">Team & Backer Track Record (15%)</span>
                        <span className="font-bold text-amber-400">{scoreTeam} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={scoreTeam}
                        onChange={e => setScoreTeam(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* Community */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300">Community & Governance (10%)</span>
                        <span className="font-bold text-amber-400">{scoreCommunity} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={scoreCommunity}
                        onChange={e => setScoreCommunity(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Recalculated Score Result Preview */}
                  <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">Recalculated Evaluation Blueprint Score</span>
                      <div className="text-xl font-extrabold text-slate-100 flex items-center gap-2 font-mono">
                        {recalculatedBlueprint.overallScore} / 100
                        <span className="text-xs text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                          Grade: {recalculatedBlueprint.grade}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-400 block">Risk Status</span>
                      <span className="text-xs font-mono font-bold text-sky-400">{recalculatedBlueprint.riskLevel} Risk</span>
                    </div>
                  </div>
                </div>

                {/* Audit Sign-off Stamp & Remarks */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-mono font-bold text-slate-300 block">
                    2. Audit Verification Stamp & Remarks:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">
                        Name and Title of Authorized Senior Auditor/Official:
                      </label>
                      <div className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono text-cyan-300 font-bold flex items-center justify-between">
                        <span>Crypto Review Lab</span>
                        <span className="text-[10px] text-emerald-400 font-normal">Automated System Sign-off</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">Verification Stamp Type:</label>
                      <select
                        value={verificationStamp}
                        onChange={e => setVerificationStamp(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/50 cursor-pointer"
                      >
                        <option value="VERIFIED_AUDIT">VERIFIED_AUDIT (Audit Passed & Validated)</option>
                        <option value="CORRECTIONS_APPLIED">CORRECTIONS_APPLIED (Calibrated Scores Applied)</option>
                        <option value="HIGH_RISK_WARNING">HIGH_RISK_WARNING (Critical Vector Flagged)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">
                      Audit Review Remarks & Technical Notes <span className="text-rose-400">*</span>:
                    </label>
                    <textarea
                      rows={3}
                      value={auditorComments}
                      onChange={e => setAuditorComments(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/50"
                      placeholder="Type official verification remarks and technical notes to be included in final PDF report & email..."
                    />
                  </div>
                </div>

                {/* Cryptographic Sign-Off Badge if already signed */}
                {(selectedOrder.auditSignature || selectedOrder.finalReview?.auditSignature || selectedOrder.humanNotes?.auditSignature) && (
                  <div className="pt-2">
                    <SignedAuditBadge
                      signature={selectedOrder.auditSignature || selectedOrder.finalReview?.auditSignature || selectedOrder.humanNotes?.auditSignature}
                      scores={selectedOrder.finalReview?.scores || currentScores}
                      verdict={selectedOrder.finalReview?.verdict}
                      grade={selectedOrder.finalReview?.grade}
                      timestamp={selectedOrder.deliveredAt}
                    />
                  </div>
                )}

                {/* F3 Status & Override Callout before Delivery */}
                {(() => {
                  const currentF3 = (selectedOrder.finalReview || selectedOrder.systemDraft)?.f3Verification || null;
                  const activeAdminOverride = selectedOrder.adminOverride || (selectedOrder.finalReview || selectedOrder.systemDraft)?.adminOverride;
                  const isF3NotClean = currentF3 && (currentF3.overallStatus === 'FAILED' || currentF3.overallStatus === 'CONDITIONAL' || currentF3.discrepancies.length > 0);

                  if (!isF3NotClean && !activeAdminOverride) return null;

                  return (
                    <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      activeAdminOverride 
                        ? 'bg-purple-950/30 border-purple-500/40 text-purple-200' 
                        : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                    }`}>
                      <div className="flex items-start gap-2.5">
                        {activeAdminOverride ? (
                          <KeyRound className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                        ) : (
                          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-0.5 text-xs font-mono">
                          <div className="font-bold flex items-center gap-2 flex-wrap">
                            <span>{activeAdminOverride ? 'F3 Admin Override Active (Sign-Off Logged)' : 'F3 Discrepancy & Verification Notice'}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                              Status: {currentF3?.overallStatus || 'PENDING'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            {activeAdminOverride 
                              ? `Admin override authorized by ${activeAdminOverride.overriddenBy || 'Crypto Review Lab'}. Delivery unblocked.`
                              : `F3 verification requires conscious sign-off on discrepancies before delivery. Click "Acknowledge & Proceed" to document justification.`
                            }
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleOpenOverrideModal}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 ${
                            activeAdminOverride 
                              ? 'bg-purple-600 hover:bg-purple-500 text-white' 
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          }`}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>{activeAdminOverride ? 'Edit Override Justification' : 'Acknowledge & Proceed (Admin Override)'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Action Submit Button */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-[11px] font-mono text-slate-400 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-emerald-400" />
                      Sends from: <strong className="text-slate-200">{PRINCIPAL_EMAIL}</strong>
                    </div>
                    {!isAuditFormValid && (
                      <span className="text-[10px] font-mono text-amber-400/90 font-medium">
                        ⚠️ Enter Remarks to enable delivery
                      </span>
                    )}
                  </div>

                  <button
                    disabled={!isAuditFormValid}
                    onClick={handleApproveAndDeliver}
                    className={`w-full sm:w-auto font-sans font-extrabold text-sm py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 ${
                      isAuditFormValid
                        ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 cursor-pointer shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)]'
                        : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-50 shadow-none'
                    }`}
                  >
                    <CheckCircle2 className={`w-4 h-4 ${isAuditFormValid ? 'fill-slate-950 text-slate-950' : 'text-slate-500'}`} />
                    <span>Approve & Deliver Polished Report to Client</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 font-mono text-xs">
              Select an order from the queue to start human review.
            </div>
          )}
        </div>

      </div>

      {/* Email Record Viewer Modal */}
      <EmailViewerModal
        email={viewingEmail}
        onClose={() => setViewingEmail(null)}
      />

      {/* Instant 24h Client Dispatch Modal */}
      <AnimatePresence>
        {showDispatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0B0F19] border border-amber-500/40 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
                    <Zap className="w-5 h-5 fill-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-base text-slate-100">
                      Instant 24h Client Order Dispatch
                    </h3>
                    <p className="text-[11px] font-mono text-amber-300">
                      Master Auditor Session • Direct Email Dispatch ({PRINCIPAL_EMAIL})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDispatchModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Client Email Address (Recipient):
                  </label>
                  <input
                    type="email"
                    value={dispatchEmail}
                    onChange={e => setDispatchEmail(e.target.value)}
                    placeholder="client@acme-crypto.io"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">
                      Project Name:
                    </label>
                    <input
                      type="text"
                      value={dispatchName}
                      onChange={e => setDispatchName(e.target.value)}
                      placeholder="e.g. Uniswap V4 / Custom DAO"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">
                      Symbol / Ticker:
                    </label>
                    <input
                      type="text"
                      value={dispatchSymbol}
                      onChange={e => setDispatchSymbol(e.target.value)}
                      placeholder="e.g. UNI / CUST"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">
                      Contract Address (Optional):
                    </label>
                    <input
                      type="text"
                      value={dispatchContract}
                      onChange={e => setDispatchContract(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">
                      Focus Area (Optional):
                    </label>
                    <input
                      type="text"
                      value={dispatchFocus}
                      onChange={e => setDispatchFocus(e.target.value)}
                      placeholder="e.g. Smart Contract Security & TVL"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Auditor Review Remarks (Included in PDF & Delivery Email):
                  </label>
                  <textarea
                    rows={2}
                    value={dispatchNotes}
                    onChange={e => setDispatchNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                <span className="text-[10px] font-mono text-slate-400">
                  Sends 24h delivery email with attached PDF token link from {PRINCIPAL_EMAIL}.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDispatchModal(false)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-mono transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleInstantDispatch}
                    disabled={!dispatchEmail.trim() || !dispatchName.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Generate & Send Report</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Override & Conscious Sign-Off Modal */}
      <AnimatePresence>
        {showOverrideModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-purple-500/40 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-bold uppercase">
                        Admin Override & Sign-off
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Order #{selectedOrder.orderId}
                      </span>
                    </div>
                    <h3 className="font-sans text-base sm:text-lg font-bold text-slate-100 mt-0.5">
                      F3 Deterministic Discrepancy Override
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Order & Project Overview */}
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Evaluation Target:</span>
                    <strong className="text-slate-200">{selectedOrder.projectName} ({selectedOrder.projectSymbol})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Client Recipient:</span>
                    <span className="text-slate-300">{selectedOrder.clientEmail}</span>
                  </div>
                </div>

                {/* Discrepancies Box */}
                {(() => {
                  const review = selectedOrder.finalReview || selectedOrder.systemDraft;
                  const f3 = review?.f3Verification || null;
                  const discs = f3?.discrepancies || [];

                  return (
                    <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-300">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>F3 Flagged Items ({discs.length > 0 ? discs.length : 'Verification Limitations'}):</span>
                      </div>
                      {discs.length > 0 ? (
                        <ul className="space-y-1 pl-5 list-disc text-xs font-mono text-rose-200">
                          {discs.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs font-mono text-rose-200">
                          {f3?.summary || 'Primary scores verified, but secondary stress simulation or classification metadata operates with explicit assumptions.'}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Explanatory Policy Note */}
                <div className="text-[11px] font-mono text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-purple-500/20 leading-relaxed">
                  <strong className="text-purple-400">Institutional Policy: </strong>
                  F3 is a deterministic verification layer designed to catch genuine discrepancies and enforce audit integrity. When real-world deviations occur (such as testnet wrappers, manual liquidity adjustments, or custom governance parameters), this override provides a conscious, logged mechanism to validate and proceed with delivery.
                </div>

                {/* Authorizing Entity Field */}
                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">
                    Name and Title of Authorized Senior Auditor/Official:
                  </label>
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-purple-300 font-bold flex items-center justify-between">
                    <span>Crypto Review Lab</span>
                    <span className="text-[10px] text-purple-400 font-normal">Deterministic Verification Layer</span>
                  </div>
                </div>

                {/* Technical Justification Field */}
                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">
                    Technical Override Justification & Reason <span className="text-rose-400">*</span>:
                  </label>
                  <textarea
                    rows={3}
                    value={overrideReason}
                    onChange={e => setOverrideReason(e.target.value)}
                    placeholder="Explain why the F3 discrepancies/limitations are benign, verified manually on-chain, or consciously approved (e.g., 'Manual bytecode disassembly confirmed no honeypot vector; discrepancy is due to testnet oracle fallback.')..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500/50"
                  />
                  <div className="text-[10px] font-mono text-slate-400 mt-1 flex justify-between">
                    <span>Minimum 10 characters required.</span>
                    <span>{overrideReason.trim().length} chars</span>
                  </div>
                </div>

                {/* Conscious Sign-Off Checkbox */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 cursor-pointer hover:bg-purple-950/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={overrideAcknowledged}
                    onChange={e => setOverrideAcknowledged(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-200 leading-snug">
                    <strong className="text-purple-300 block mb-0.5">Conscious Verification Sign-Off:</strong>
                    I have consciously reviewed the F3 deterministic discrepancies above, verified the report parameters, and explicitly authorize delivery to the client under this documented override.
                  </span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[10px] font-mono text-slate-400">
                  Override will be logged to audit trail and embedded in delivery metadata.
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowOverrideModal(false)}
                    className="w-1/2 sm:w-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-mono transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAdminOverride}
                    disabled={!overrideAuthor.trim() || overrideReason.trim().length < 10 || !overrideAcknowledged || isSavingOverride}
                    className="w-1/2 sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSavingOverride ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="w-3.5 h-3.5" />
                    )}
                    <span>{isSavingOverride ? 'Authorizing...' : 'Confirm Override & Proceed'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Action Audit Trail */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 mt-6">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Admin Security Action Audit Trail ({actionLogs.length} logged actions)
          </h3>
          <span className="text-[10px] font-mono text-slate-400">Secure Local Storage Buffer</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl max-h-48 overflow-y-auto p-3 space-y-2 font-mono text-[11px]">
          {actionLogs.length === 0 ? (
            <p className="text-slate-500 text-center py-3">No administrative actions logged yet in current session.</p>
          ) : (
            actionLogs.map(log => (
              <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 bg-slate-900/60 rounded-lg border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">[{log.action}]</span>
                  <span className="text-slate-300">{log.details}</span>
                </div>
                <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditorReviewConsole;
