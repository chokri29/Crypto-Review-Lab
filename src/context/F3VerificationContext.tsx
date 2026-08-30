/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { CryptoReview, ProOrder, AdminOverrideLog } from '../types';
import { runF3Verification, isF2GatePassed, F3VerificationResult } from '../services/f3Engine';
import { INITIAL_REVIEWS } from '../data';

export type EnhancedReviewedProject = CryptoReview & {
  orderId?: string;
  isProOrder?: boolean;
  proOrderStatus?: string;
  sourceType?: 'PRO_ORDER' | 'AVF_INSTANT' | 'SAVED_REVIEW';
};

export interface F3VerificationContextValue {
  reviewedProjects: EnhancedReviewedProject[];
  proOrders: ProOrder[];
  selectedProjectId: string;
  selectedProject: EnhancedReviewedProject | null;
  setSelectedProjectId: (id: string) => void;
  f3Results: Record<string, F3VerificationResult>;
  getF3Result: (projectId?: string) => F3VerificationResult | null;
  runDeterministicF3: (projectOrId?: CryptoReview | string, options?: { stepCallback?: (step: number) => void; activeOverride?: AdminOverrideLog | null }) => Promise<F3VerificationResult | null>;
  isExecutingF3: boolean;
  executingStep: number;
  adminOverrides: Record<string, AdminOverrideLog>;
  saveAdminOverride: (projectId: string, override: AdminOverrideLog) => Promise<void>;
  clearAdminOverride: (projectId: string) => Promise<void>;
  refreshPipelineData: () => Promise<void>;
  lastSyncTime: Date;
  isSyncing: boolean;
}

const F3VerificationContext = createContext<F3VerificationContextValue | null>(null);

// Set of static initial review IDs from data.ts to filter out from baseline
const STATIC_INITIAL_IDS = new Set(INITIAL_REVIEWS.map(r => r.id.toLowerCase()));
const STATIC_INITIAL_SYMBOLS = new Set(INITIAL_REVIEWS.map(r => r.symbol.toLowerCase()));

interface F3VerificationProviderProps {
  children: React.ReactNode;
  savedReviews?: CryptoReview[];
  allReviews?: CryptoReview[];
}

export const F3VerificationProvider: React.FC<F3VerificationProviderProps> = ({
  children,
  savedReviews = [],
  allReviews = []
}) => {
  const [proOrders, setProOrders] = useState<ProOrder[]>([]);
  const [persistedReviews, setPersistedReviews] = useState<CryptoReview[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [f3Results, setF3Results] = useState<Record<string, F3VerificationResult>>({});
  const [isExecutingF3, setIsExecutingF3] = useState<boolean>(false);
  const [executingStep, setExecutingStep] = useState<number>(0);
  const [adminOverrides, setAdminOverrides] = useState<Record<string, AdminOverrideLog>>({});

  // Dynamic fetch function for live pipeline data from backend
  const refreshPipelineData = useCallback(async () => {
    try {
      setIsSyncing(true);
      // 1. Fetch Pro Orders from server
      const ordersRes = await fetch('/api/pro-order/list');
      if (ordersRes.ok) {
        const orderList: ProOrder[] = await ordersRes.json();
        if (Array.isArray(orderList)) {
          setProOrders(orderList);
        }
      }

      // 2. Fetch persisted reviews from server
      const reviewsRes = await fetch('/api/reviews/list');
      if (reviewsRes.ok) {
        const revList: CryptoReview[] = await reviewsRes.json();
        if (Array.isArray(revList)) {
          setPersistedReviews(revList);
        }
      }
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('F3VerificationContext sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Filter out hardcoded 10 projects and dynamically assemble live reviewed projects from shared state & Pro Orders
  const reviewedProjects = useMemo(() => {
    const list: EnhancedReviewedProject[] = [];
    const seenKeys = new Set<string>();

    // 1. Add all live Pro Orders (e.g., 'Movement (MOVE)', etc.)
    proOrders.forEach((order) => {
      const base = order.finalReview || order.systemDraft;
      const key = `ORDER_${order.orderId}`.toUpperCase();
      const symbolKey = (order.projectSymbol || base?.symbol || '').toUpperCase();

      const revObj: EnhancedReviewedProject = {
        ...(base || {}),
        id: order.orderId,
        orderId: order.orderId,
        name: order.projectName || base?.name || 'Security Assessment Project',
        symbol: (order.projectSymbol || base?.symbol || 'PRO').toUpperCase(),
        category: base?.category || 'Institutional Web3 / Layer 1-2',
        overallScore: base?.overallScore ?? 90,
        grade: base?.grade ?? 'AA',
        verdict: base?.verdict ?? 'Security & Risk Assessment initiated in AVF pipeline.',
        scores: base?.scores || { utility: 9, tokenomics: 9, security: 9, team: 9, community: 9 },
        riskLevel: base?.riskLevel || 'Low',
        createdAt: order.createdAt || base?.createdAt || new Date().toISOString(),
        author: order.humanNotes?.reviewedBy || base?.author || 'AVF F1-F2 Engine',
        summary: base?.summary || `Institutional evaluation for ${order.projectName} (${order.projectSymbol}).`,
        isProOrder: true,
        proOrderStatus: order.status,
        sourceType: 'PRO_ORDER',
        f3Verification: order.f3Verification || base?.f3Verification,
        adminOverride: order.adminOverride || base?.adminOverride || order.humanNotes?.adminOverride,
        citations: base?.citations,
        securityScan: base?.securityScan,
        contractAddress: order.contractAddress || base?.contractAddress
      };

      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        if (symbolKey) seenKeys.add(symbolKey);
        list.push(revObj);
      }
    });

    // 2. Add real-time reviews from user-generated savedReviews and persistedReviews
    // (Explicitly filtering out the hardcoded 10 static template reviews from INITIAL_REVIEWS)
    const combinedLiveReviews = [...persistedReviews, ...savedReviews];
    
    combinedLiveReviews.forEach((r) => {
      if (!r || !r.name) return;
      const rId = (r.id || '').toLowerCase();
      const rSymbol = (r.symbol || '').toLowerCase();

      // Filter out raw initial static reviews unless they represent an active live evaluation
      const isStaticInitial = STATIC_INITIAL_IDS.has(rId) && !r.f3Verification && !r.phaseTwoReControl;
      if (isStaticInitial) return;

      const key = (r.id || r.symbol || r.name).toUpperCase();
      const symbolKey = (r.symbol || '').toUpperCase();

      if (!seenKeys.has(key) && (!symbolKey || !seenKeys.has(symbolKey))) {
        seenKeys.add(key);
        if (symbolKey) seenKeys.add(symbolKey);
        list.push({
          ...r,
          sourceType: savedReviews.some(sr => sr.id === r.id) ? 'SAVED_REVIEW' : 'AVF_INSTANT'
        });
      }
    });

    return list;
  }, [proOrders, persistedReviews, savedReviews]);

  // Set default selected project if none selected or if current is removed
  useEffect(() => {
    if (reviewedProjects.length > 0) {
      if (!selectedProjectId || !reviewedProjects.some(p => p.id === selectedProjectId)) {
        setSelectedProjectId(reviewedProjects[0].id);
      }
    }
  }, [reviewedProjects, selectedProjectId]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return reviewedProjects[0] || null;
    return reviewedProjects.find(p => p.id === selectedProjectId) || reviewedProjects[0] || null;
  }, [reviewedProjects, selectedProjectId]);

  // Retrieve cached or computed F3 result
  const getF3Result = useCallback((projectId?: string): F3VerificationResult | null => {
    const targetId = projectId || selectedProjectId;
    if (!targetId) return null;
    if (f3Results[targetId]) return f3Results[targetId];

    // Check if project has embedded F3 verification
    const proj = reviewedProjects.find(p => p.id === targetId || p.orderId === targetId || p.symbol.toLowerCase() === targetId.toLowerCase());
    if (proj?.f3Verification) return proj.f3Verification;

    return null;
  }, [f3Results, reviewedProjects, selectedProjectId]);

  // Pure deterministic F3 verification runner
  const runDeterministicF3 = useCallback(async (
    projectOrId?: CryptoReview | string,
    options?: { stepCallback?: (step: number) => void; activeOverride?: AdminOverrideLog | null }
  ): Promise<F3VerificationResult | null> => {
    let targetProject: EnhancedReviewedProject | null = null;
    
    if (typeof projectOrId === 'string') {
      targetProject = reviewedProjects.find(p => p.id === projectOrId || p.orderId === projectOrId || p.symbol.toLowerCase() === projectOrId.toLowerCase()) || null;
    } else if (projectOrId && typeof projectOrId === 'object') {
      targetProject = projectOrId as EnhancedReviewedProject;
    } else {
      targetProject = selectedProject;
    }

    if (!targetProject) return null;

    const activeOverride = options?.activeOverride || adminOverrides[targetProject.id] || targetProject.adminOverride || targetProject.f3Verification?.adminOverride;

    // STRICT 95% F2 GATE: F3 may execute ONLY when Phase 2 (F2) score is >= 95% (or explicitly overridden)
    if (!isF2GatePassed(targetProject) && !activeOverride) {
      console.warn(
        `[F3 Gate] Deterministic F3 verification blocked: Phase 2 score is ${
          targetProject.phaseTwoReControl ? `${targetProject.phaseTwoReControl.overallScorePct}% (< 95%)` : 'NOT_EXECUTED'
        }. Order remains PENDING_REGENERATION or PENDING_F2.`
      );
      return null;
    }

    setIsExecutingF3(true);
    setExecutingStep(0);

    for (let step = 1; step <= 8; step++) {
      setExecutingStep(step);
      options?.stepCallback?.(step);
      await new Promise(r => setTimeout(r, 60));
    }

    const result = runF3Verification({
      ...targetProject,
      adminOverride: activeOverride
    }, {
      securityScan: targetProject.securityScan,
      citations: targetProject.citations
    });

    setF3Results(prev => ({
      ...prev,
      [targetProject!.id]: result,
      ...(targetProject!.orderId ? { [targetProject!.orderId]: result } : {}),
      [targetProject!.symbol]: result
    }));

    setIsExecutingF3(false);
    setExecutingStep(0);

    return result;
  }, [reviewedProjects, selectedProject, adminOverrides]);

  // Save Admin Override
  const saveAdminOverride = useCallback(async (projectId: string, override: AdminOverrideLog) => {
    setAdminOverrides(prev => ({ ...prev, [projectId]: override }));

    // If it's a Pro Order, persist to server
    if (projectId.startsWith('CRL-') || projectId.startsWith('draft_')) {
      try {
        await fetch('/api/pro-order/admin-override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: projectId,
            override
          })
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crl_order_updated', { detail: { orderId: projectId, override } }));
        }
      } catch (err) {
        console.warn('Failed to sync admin override to server:', err);
      }
    }
  }, []);

  // Clear Admin Override
  const clearAdminOverride = useCallback(async (projectId: string) => {
    setAdminOverrides(prev => {
      const next = { ...prev };
      delete next[projectId];
      return next;
    });

    if (projectId.startsWith('CRL-')) {
      try {
        await fetch('/api/pro-order/admin-override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: projectId,
            override: null
          })
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('crl_order_updated', { detail: { orderId: projectId, override: null } }));
        }
      } catch (err) {
        console.warn('Failed to clear admin override on server:', err);
      }
    }
  }, []);

  // Real-time listeners: F1-F2 evaluation completions & background updates
  useEffect(() => {
    refreshPipelineData();
    const interval = setInterval(refreshPipelineData, 3500);

    const handleOrderCreated = (e: any) => {
      refreshPipelineData();
      if (e.detail?.orderId) {
        setSelectedProjectId(e.detail.orderId);
        const review = e.detail.finalReview || e.detail.systemDraft;
        // Do NOT automatically run F3. If an existing verified result is present (e.g. from F2 pass or override), cache it.
        if (review?.f3Verification) {
          setF3Results(prev => ({
            ...prev,
            [e.detail.orderId]: review.f3Verification,
            [review.symbol]: review.f3Verification
          }));
        }
      }
    };

    const handleReviewGenerated = (e: any) => {
      refreshPipelineData();
      if (e.detail) {
        const review = e.detail;
        const targetId = review.id || review.symbol;
        if (targetId) {
          setSelectedProjectId(targetId);
          // Do NOT automatically run F3 on initial review generation. If already verified, cache it.
          if (review.f3Verification) {
            setF3Results(prev => ({
              ...prev,
              [targetId]: review.f3Verification,
              [review.symbol]: review.f3Verification
            }));
          }
        }
      }
    };

    const handleOrderUpdated = () => {
      refreshPipelineData();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('crypto_') || e.key?.includes('crl_')) {
        refreshPipelineData();
      }
    };

    window.addEventListener('crl_order_created', handleOrderCreated);
    window.addEventListener('crl_review_generated', handleReviewGenerated);
    window.addEventListener('crl_order_updated', handleOrderUpdated);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('crl_order_created', handleOrderCreated);
      window.removeEventListener('crl_review_generated', handleReviewGenerated);
      window.removeEventListener('crl_order_updated', handleOrderUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshPipelineData]);

  const value = useMemo<F3VerificationContextValue>(() => ({
    reviewedProjects,
    proOrders,
    selectedProjectId,
    selectedProject,
    setSelectedProjectId,
    f3Results,
    getF3Result,
    runDeterministicF3,
    isExecutingF3,
    executingStep,
    adminOverrides,
    saveAdminOverride,
    clearAdminOverride,
    refreshPipelineData,
    lastSyncTime,
    isSyncing
  }), [
    reviewedProjects,
    proOrders,
    selectedProjectId,
    selectedProject,
    f3Results,
    getF3Result,
    runDeterministicF3,
    isExecutingF3,
    executingStep,
    adminOverrides,
    saveAdminOverride,
    clearAdminOverride,
    refreshPipelineData,
    lastSyncTime,
    isSyncing
  ]);

  return (
    <F3VerificationContext.Provider value={value}>
      {children}
    </F3VerificationContext.Provider>
  );
};

/**
 * useF3VerificationState Hook
 * Allows Auditor Desk, F3 Dashboard, and ReviewLab to subscribe to the exact same canonical F3 verification data in real-time.
 */
export const useF3VerificationState = (): F3VerificationContextValue => {
  const context = useContext(F3VerificationContext);
  if (!context) {
    throw new Error('useF3VerificationState must be used within an F3VerificationProvider');
  }
  return context;
};
