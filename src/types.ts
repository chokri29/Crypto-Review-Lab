/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { F3VerificationResult, PublicF3VerificationResult } from './services/f3Engine';

export interface CryptoReviewScores {
  utility: number;     // 1-10
  tokenomics: number;  // 1-10
  security: number;    // 1-10
  team: number;        // 1-10
  community: number;   // 1-10
}

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical' | 'INPUT_MISSING' | 'DRAFT_UNAVAILABLE';

export interface ProSecurityBenchmarks {
  crlInstitutionalScore: number;
  crlSecurityGrade: string;
  crlAuditStatus: string;
  crlThreatMatrixStatus: string;
  crlOpenFindings: string;
  crlVerificationScore?: number;
  crlRiskModelSummary: string;
  symbolicExecutionMatrix: {
    reentrancyVector: 'PASSED' | 'FLAGGED' | 'UNVERIFIED' | 'NOT_PERFORMED';
    flashLoanDrainCascade: 'PASSED' | 'FLAGGED' | 'UNVERIFIED' | 'NOT_PERFORMED';
    proxyAdminLock: 'PASSED' | 'FLAGGED' | 'UNVERIFIED' | 'NOT_PERFORMED';
    tvlStressLimit: string;
  };
  securityScan?: any;
}

export interface CryptoAuditSignature {
  hash: string;
  signature: string;
  algorithm: 'Ed25519' | 'ECDSA-P256';
  signedAt: string;
  publicKey: string;
  canonicalText?: string;
  tier?: 'pro';
}

export type MetricProvenanceType = 'SOURCE' | 'DERIVED' | 'UNAVAILABLE';

export interface CryptoReview {
  id: string;
  coingeckoId?: string;
  coingeckoCategories?: string[];
  contractAddress?: string;
  chainId?: string | number;
  defiLlamaSlug?: string;
  realTvl?: number | null;
  name: string;
  symbol: string;
  category: string;
  overallScore: number; // 1-100
  grade: string;        // AAA, AA, A, BBB, BB, B, C, D
  verdict: string;      // Summary verdict sentence
  scores: CryptoReviewScores;
  summary: string;      // Markdown review detail
  pros: string[];
  cons: string[];
  riskLevel: RiskLevel;
  createdAt: string;
  author: string;
  logoUrl?: string;
  proBenchmarks?: ProSecurityBenchmarks;
  comparisonReport?: ComparisonReportData;
  phaseTwoReControl?: PhaseTwoReControlReport;
  auditSignature?: CryptoAuditSignature;
  f3Verification?: F3VerificationResult;
  // CoinGecko, CoinMarketCap & CoinStats Multi-Source Market Data fields
  livePrice?: number;
  liveChange24h?: number;
  liveMarketCap?: number;
  liveVolume24h?: number;
  liveRank?: number;
  cmcRank?: number;
  cmcPrice?: number;
  cmcVolume24h?: number;
  csPrice?: number;
  csMarketCap?: number;
  csVolume24h?: number;
  csRank?: number;
  csLastSyncedAt?: string;
  circulatingSupply?: number;
  circulatingSupplyProvenance?: MetricProvenanceType;
  maxSupply?: number;
  maxSupplyProvenance?: MetricProvenanceType;
  totalSupply?: number;
  totalSupplyProvenance?: MetricProvenanceType;
  ath?: number;
  atl?: number;
  athChangePct?: number;
  atlChangePct?: number;
  allTimeHigh?: number;
  allTimeLow?: number;
  fdvCalculated?: number;
  fdvProvenance?: MetricProvenanceType;
  marketCapProvenance?: MetricProvenanceType;
  priceProvenance?: MetricProvenanceType;
  priceDivergencePct?: number;
  supplyDivergencePct?: number;
  confidenceScore?: number;
  confidenceLevel?: 'HIGH' | 'MODERATE' | 'DIVERGENT';
  dataEngine?: string;
  dataSources?: string[];
  lastSyncedAt?: string;
  cgLastSyncedAt?: string;
  cmcLastSyncedAt?: string;
  syncRuleApplied?: string;
  multiSourceConvergence?: MultiSourceConvergenceReport;
  securityScan?: any;
  citations?: Record<string, string>;
  isFallbackMarketData?: boolean;
  marketDataProvenance?: {
    source?: string;
    retrievedAt?: string;
    isRealTime?: boolean;
    isFallback?: boolean;
  };
  adminOverride?: AdminOverrideLog;
  publishApproved?: boolean;
  publishRequestedAt?: string;
  publishApprovedAt?: string;
  publishApprovedBy?: string;
  publishWrittenConfirmation?: string;
}

export const PRINCIPAL_EMAIL = 'reports@cryptoreviewlab.com';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export type ProOrderStatus = 'PENDING_F2' | 'PENDING_REGENERATION' | 'PAYMENT_CONFIRMED' | 'IN_HUMAN_REVIEW' | 'DELIVERED';

export type ProOrderPaymentStatus = 
  | 'PAID' 
  | 'PENDING' 
  | 'WAITING' 
  | 'CONFIRMING' 
  | 'FAILED' 
  | 'EXPIRED' 
  | 'PARTIALLY_PAID' 
  | 'REFUNDED';

export interface NowPaymentsIpnLog {
  receivedAt: string;
  paymentId: string | number;
  paymentStatus: string;
  payAmount?: number;
  actuallyPaid?: number;
  payCurrency?: string;
  priceAmount?: number;
  priceCurrency?: string;
  orderId?: string;
  rawStatus?: string;
}

export type F3FinalVerificationStatus =
  | 'VERIFIED'
  | 'VERIFIED_WITH_WARNINGS'
  | 'DISCREPANCY_FOUND'
  | 'INSUFFICIENT_DATA'
  | 'FAILED'
  | 'CONDITIONAL'
  | 'INPUT_MISSING';

export interface AdminOverrideLog {
  overriddenBy: string;
  overriddenAt: string;
  reason: string;
  previousF3Status: F3FinalVerificationStatus;
  discrepanciesOverridden: string[];
  acknowledged: boolean;
}

export interface HumanReviewNotes {
  reviewedBy: string;
  reviewedAt: string;
  auditorComments: string;
  verificationStamp: 'VERIFIED_AUDIT' | 'CORRECTIONS_APPLIED' | 'HIGH_RISK_WARNING';
  customAdjustments?: string;
  auditSignature?: CryptoAuditSignature;
  adminOverride?: AdminOverrideLog;
}

export interface ProOrderEmailLog {
  id: string;
  type: 'CONFIRMATION' | 'DELIVERY';
  from: string; // 'reports@cryptoreviewlab.com'
  to: string;
  subject: string;
  sentAt: string;
  bodyPreview: string;
  fullHtmlContent?: string;
}

export interface ProOrder {
  orderId: string;
  clientEmail: string;
  projectName: string;
  projectSymbol: string;
  contractAddress?: string;
  focusArea?: string;
  verificationDepth?: string;
  stressSimulation?: boolean;
  amountUsd: number;
  paymentStatus: ProOrderPaymentStatus;
  paymentMethod: string;
  paymentReference?: string;
  nowpaymentsPaymentId?: string | number;
  nowpaymentsIpnLogs?: NowPaymentsIpnLog[];
  status: ProOrderStatus;
  createdAt: string;
  estimatedDeliveryAt: string;
  deliveredAt?: string;
  systemDraft: CryptoReview;
  finalReview?: CryptoReview;
  humanNotes?: HumanReviewNotes;
  adminOverride?: AdminOverrideLog;
  f3Verification?: any;
  auditSignature?: CryptoAuditSignature;
  emailLogs: ProOrderEmailLog[];
  privateDownloadToken: string;
  publishApproved: boolean;
  publishRequestedAt?: string;
  publishApprovedAt?: string;
  publishApprovedBy?: string;
  publishWrittenConfirmation?: string;
}

export interface ProtocolBenchmarkSummary {
  name: string;
  symbol: string;
  category: string;
  overallScore: number;
  grade: string;
  riskLevel: RiskLevel;
  createdAt: string;
  verificationDepth: string;
  isFresh: boolean;
  daysOld: number;
  scores: CryptoReviewScores;
}

export interface ComparisonDimensionDelta {
  dimensionKey: keyof CryptoReviewScores;
  dimensionName: string;
  weightLabel: string;
  primaryScore: number;
  benchmarkScore: number;
  delta: number;
  lead: 'primary' | 'benchmark' | 'tie';
}

export interface ComparisonVectorVerdict {
  vectorName: string;
  checkDescription: string;
  primaryVerdict: string;
  benchmarkVerdict: string;
}

export interface ComparisonReportData {
  targetProtocol: ProtocolBenchmarkSummary;
  benchmarkProtocol: ProtocolBenchmarkSummary;
  freshnessDisclaimer?: string;
  dimensionDeltas: ComparisonDimensionDelta[];
  scanVectorVerdicts: ComparisonVectorVerdict[];
  synthesizedNarrative: string;
}

export interface CorrectionDirective {
  id: string;
  dimensionKey?: keyof CryptoReviewScores | 'composite';
  targetArea: string;
  f1Value: number | string;
  f2Value: number | string;
  discrepancyDelta: number;
  severity: 'CRITICAL' | 'WARNING' | 'MINOR';
  mandate: string;
  status: 'OPEN' | 'RESOLVED';
  confidence?: number;
}

export interface AVFRoundResult {
  roundNumber: number;
  f1CompositeScore: number;
  f2CompositeScore: number;
  compositeDelta: number;
  maxDimensionDelta: number;
  severityTier: 1 | 2 | 3;
  status: 'CONVERGED' | 'ADAPTED' | 'DISCREPANCY_FLAGGED';
  directives: CorrectionDirective[];
  f1RefinementsApplied: string[];
  timestamp: string;
}

export interface AVFSessionResult {
  sessionId: string;
  protocolName: string;
  initialF1Score: number;
  finalF1Score: number;
  initialF2Score: number;
  finalF2Score: number;
  initialCompositeDelta: number;
  finalCompositeDelta: number;
  totalRounds: number;
  equilibriumAchieved: boolean;
  requiresManualAuditEscalation?: boolean;
  isStatisticalOutlier?: boolean;
  outlierAnalysis?: string;
  categoryStats?: {
    meanDelta: number;
    stdDevDelta: number;
    sampleCount: number;
  };
  rounds: AVFRoundResult[];
  summaryDirective: string;
}

export interface PhaseTwoGateResult {
  gateNumber: number;
  gateName: string;
  description: string;
  scorePct: number; // 0 - 100
  passed: boolean; // scorePct >= 90
  notes: string;
  checks: { name: string; status: 'PASSED' | 'FLAGGED' | 'VERIFIED'; detail: string }[];
}

export interface PhaseTwoRiskAttentionItem {
  gateNumber: number;
  gateName: string;
  scorePct: number;
  notes?: string;
}

export interface PhaseTwoReControlReport {
  overallScorePct: number; // 0 - 100
  qualityScorePct?: number; // average of gates 0,3,5,6,7 (one decimal)
  riskAttention?: PhaseTwoRiskAttentionItem[]; // gates 1,2,4 where scorePct < 90 or !passed
  status: 'PASS' | 'FAIL'; // PASS if qualityScorePct >= 95 and Gate 3 passed
  executionTimeMinutes: number; // e.g. 6.5 minutes
  completedAt: string;
  recommendation: 'READY_FOR_HUMAN_APPROVAL' | 'READY_FOR_HUMAN_APPROVAL_WITH_RISK_FLAGS' | 'AUTO_FLAGGED_FOR_REGENERATION';
  gates: PhaseTwoGateResult[];
  narrative: string;
  avfSession?: AVFSessionResult;
}

export type { F3VerificationResult, F3ModulesResult, PublicF3VerificationResult, PublicF3ModulesResult } from './services/f3Engine';
export { projectToPublicCryptoReviewReport, projectToPublicF3Verification } from './services/f3Engine';

/**
 * Public Audit / Diagnostic Report Shape
 * Decoupled from internal numeric Grade and Risk Level scores.
 */
export interface PublicCryptoReviewReport {
  id: string;
  name: string;
  symbol: string;
  category: string;
  contractAddress?: string;
  chainId?: string | number;
  verdict: string;
  summary: string;
  pros: string[];
  cons: string[];
  createdAt: string;
  author: string;
  logoUrl?: string;
  livePrice?: number;
  liveChange24h?: number;
  liveMarketCap?: number;
  liveVolume24h?: number;
  circulatingSupply?: number;
  circulatingSupplyProvenance?: MetricProvenanceType;
  totalSupply?: number;
  totalSupplyProvenance?: MetricProvenanceType;
  maxSupply?: number;
  maxSupplyProvenance?: MetricProvenanceType;
  fdvCalculated?: number;
  fdvProvenance?: MetricProvenanceType;
  marketCapProvenance?: MetricProvenanceType;
  priceProvenance?: MetricProvenanceType;
  realTvl?: number | null;
  securityScan?: any;
  citations?: Record<string, string>;
  dataSources?: string[];
  confidenceScore?: number;
  confidenceLevel?: 'HIGH' | 'MODERATE' | 'DIVERGENT';
  multiSourceConvergence?: MultiSourceConvergenceReport;
  publishApproved?: boolean;
  adminOverride?: AdminOverrideLog;
  f3Verification?: PublicF3VerificationResult;
  auditSignature?: CryptoAuditSignature;
}

export type MetricReconciliationStatus =
  | 'FULLY_CROSS_VALIDATED'      // All 3 valid sources agree within tolerance (median selected)
  | 'PARTIALLY_CROSS_VALIDATED'  // 2 sources agree within tolerance (outlier flagged / 2-source agreement)
  | 'UNRESOLVED_DIVERGENCE'      // Sources diverge beyond tolerance or < 2 valid sources for multi-source consensus
  | 'SINGLE_SOURCE_UNVERIFIED'   // Gracefully degraded to 1 source (never claimed multi-source)
  | 'NO_DATA';                   // 0 sources returned valid data

export interface MetricReconciliationResult<T = number> {
  metricName: 'price' | 'marketCap' | 'volume24h' | 'marketCapRank';
  status: MetricReconciliationStatus;
  consensusValue: T | null;
  validSourcesCount: number;
  sourceValues: Record<string, T>;
  agreeingSources: string[];
  outlierSource: string | null;
  toleranceUsed: string;
  divergencePct: number;
  details: string;
}

export interface MultiSourceConvergenceReport {
  overallStatus: 'FULL_CONSENSUS' | 'PARTIAL_CONSENSUS' | 'UNRESOLVED_DIVERGENCE' | 'SINGLE_SOURCE_DEGRADED' | 'NO_DATA';
  activeSourcesCount: number;
  activeSources: string[];
  metrics: {
    price: MetricReconciliationResult<number>;
    marketCap: MetricReconciliationResult<number>;
    volume24h: MetricReconciliationResult<number>;
    marketCapRank: MetricReconciliationResult<number>;
  };
  confidenceScore: number;
  confidenceLevel: 'HIGH' | 'MODERATE' | 'DIVERGENT' | 'SINGLE_SOURCE';
  summary: string;
  reconciledAt: string;
  metricProvenances?: {
    price?: MetricProvenanceType;
    marketCap?: MetricProvenanceType;
    volume24h?: MetricProvenanceType;
    circulatingSupply?: MetricProvenanceType;
    totalSupply?: MetricProvenanceType;
    maxSupply?: MetricProvenanceType;
    fdv?: MetricProvenanceType;
  };
}



