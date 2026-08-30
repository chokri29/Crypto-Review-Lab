/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CryptoReview, CryptoReviewScores, CryptoAuditSignature, AdminOverrideLog, F3FinalVerificationStatus, PublicCryptoReviewReport } from '../types';
import {
  computeReportHash,
  verifyAuditSignatureServerSide,
  getSigningPublicKey,
} from './auditSigner';
import {
  calculateBlueprintScore,
  getCategoryDimensionWeights,
  normalizeProtocolCategory,
  CategoryWeights,
  BlueprintScoreResult
} from './EvaluationBlueprint';
import { CRL_VERSION_MANIFEST } from '../versionManifest';

/**
 * Evaluation Blueprint Dimension Weights baseline
 */
export const BLUEPRINT_DIMENSION_WEIGHTS = {
  utility: 0.25,
  tokenomics: 0.25,
  security: 0.25,
  team: 0.15,
  community: 0.10,
} as const;

export type AVF05Status = 'VERIFIED' | 'DISCREPANCY_FOUND' | 'INPUT_MISSING';

export interface AVF05DimensionContributions {
  utility: number;
  tokenomics: number;
  security: number;
  team: number;
  community: number;
}

export interface AVF05ScoreVerificationResult {
  moduleId: 'AVF-05';
  moduleName: 'Score & Weight Verification';
  status: AVF05Status;
  isVerified: boolean;
  reportedScore: number | null;
  recomputedScore: number | null;
  discrepancy: number | null;
  tolerance: number;
  weightsApplied: CategoryWeights;
  dimensionContributions: AVF05DimensionContributions | null;
  missingFields: string[];
  details: string;
}

/**
 * AVF-05: Score & Weight Verification (F3 Deterministic Verification Layer)
 * 
 * Hard Constraint: Purely deterministic computation with ZERO AI / LLM calls.
 * Recomputes the overall score from dimension sub-scores using the canonical Evaluation Blueprint
 * calculation (calculateBlueprintScore) as the single source of truth.
 * 
 * If inputs are missing, reports INPUT_MISSING.
 * If recomputed score diverges from review.overallScore, reports DISCREPANCY_FOUND.
 * If recomputed score matches, reports VERIFIED.
 */
export function verifyAVF05ScoreAndWeights(
  review?: Partial<CryptoReview> | null,
  tolerance: number = 0.5
): AVF05ScoreVerificationResult {
  const missingFields: string[] = [];
  const defaultWeights = getCategoryDimensionWeights('Specialized / Experimental');

  if (!review) {
    return {
      moduleId: 'AVF-05',
      moduleName: 'Score & Weight Verification',
      status: 'INPUT_MISSING',
      isVerified: false,
      reportedScore: null,
      recomputedScore: null,
      discrepancy: null,
      tolerance,
      weightsApplied: defaultWeights,
      dimensionContributions: null,
      missingFields: ['review'],
      details: 'Review object is null or undefined.'
    };
  }

  if (typeof review.overallScore !== 'number' || isNaN(review.overallScore)) {
    missingFields.push('overallScore');
  }

  if (!review.scores || typeof review.scores !== 'object') {
    missingFields.push('scores');
  } else {
    const requiredDims: (keyof CryptoReviewScores)[] = ['utility', 'tokenomics', 'security', 'team', 'community'];
    for (const dim of requiredDims) {
      if (typeof review.scores[dim] !== 'number' || isNaN(review.scores[dim])) {
        missingFields.push(`scores.${dim}`);
      }
    }
  }

  const categoryType = normalizeProtocolCategory(review.category);
  const weightsApplied = getCategoryDimensionWeights(categoryType);

  if (missingFields.length > 0) {
    return {
      moduleId: 'AVF-05',
      moduleName: 'Score & Weight Verification',
      status: 'INPUT_MISSING',
      isVerified: false,
      reportedScore: typeof review.overallScore === 'number' && !isNaN(review.overallScore) ? review.overallScore : null,
      recomputedScore: null,
      discrepancy: null,
      tolerance,
      weightsApplied,
      dimensionContributions: null,
      missingFields,
      details: `Cannot verify scores; required fields missing: ${missingFields.join(', ')}.`
    };
  }

  const scores = review.scores!;
  const reportedScore = review.overallScore!;

  // Canonical calculation using single source of truth
  const canonicalResult: BlueprintScoreResult = calculateBlueprintScore(scores, categoryType);
  const recomputedScore = canonicalResult.overallScore;
  const discrepancy = +(Math.abs(recomputedScore - reportedScore)).toFixed(2);

  const isVerified = discrepancy <= tolerance;
  const status: AVF05Status = isVerified ? 'VERIFIED' : 'DISCREPANCY_FOUND';

  const uCont = canonicalResult.dimensionBreakdown.utility.weightedContribution;
  const tCont = canonicalResult.dimensionBreakdown.tokenomics.weightedContribution;
  const sCont = canonicalResult.dimensionBreakdown.security.weightedContribution;
  const tmCont = canonicalResult.dimensionBreakdown.team.weightedContribution;
  const cCont = canonicalResult.dimensionBreakdown.community.weightedContribution;

  const details = isVerified
    ? `Score verified: Reported score (${reportedScore}) matches canonical blueprint score (${recomputedScore}) within tolerance (±${tolerance}). [Utility: ${uCont} + Tokenomics: ${tCont} + Security: ${sCont} + Team: ${tmCont} + Community: ${cCont} = ${recomputedScore}]`
    : `Score discrepancy detected: Reported score is ${reportedScore}, but canonical blueprint score is ${recomputedScore} (Δ = ${discrepancy} pts).`;

  return {
    moduleId: 'AVF-05',
    moduleName: 'Score & Weight Verification',
    status,
    isVerified,
    reportedScore,
    recomputedScore,
    discrepancy,
    tolerance,
    weightsApplied: canonicalResult.categoryWeights,
    dimensionContributions: {
      utility: uCont,
      tokenomics: tCont,
      security: sCont,
      team: tmCont,
      community: cCont
    },
    missingFields: [],
    details
  };
}

/* =========================================================================
   AVF-08: Traceability & Integrity Verification (F3 Verification Layer)
   ========================================================================= */

export type AVF08Status = 'VERIFIED' | 'UNSIGNED' | 'HASH_MISMATCH' | 'SIGNATURE_INVALID' | 'INPUT_MISSING';

export interface AVF08TraceabilityChain {
  conclusion: {
    verdict: string;
    riskLevel: string;
    grade: string;
  };
  scoreChain: {
    overallScore: number;
    scores: CryptoReviewScores;
  };
  algorithm: {
    frameworkVersion: string;
    blueprintVersion: string;
    hashAlgorithm: string;
    signatureAlgorithm: string;
  };
  cryptographicIntegrity: {
    computedHash: string;
    canonicalText: string;
    signatureOnRecord: string | null;
    publicKeyOnRecord: string | null;
    activeSystemPublicKey: string;
    signedAt: string | null;
    hashMatches: boolean;
    signatureValid: boolean;
  };
  datasetProvenance: {
    reportCreatedAt: string | null;
    coingeckoLastSyncedAt?: string;
    cmcLastSyncedAt?: string;
    lastSyncedAt?: string;
  };
}

export interface AVF08TraceabilityResult {
  moduleId: 'AVF-08';
  moduleName: 'Traceability & Integrity Verification';
  status: AVF08Status;
  isVerified: boolean;
  computedHash: string | null;
  canonicalText: string | null;
  signature: CryptoAuditSignature | null;
  traceabilityChain: AVF08TraceabilityChain | null;
  missingFields: string[];
  details: string;
}

/**
 * AVF-08: Traceability & Integrity Verification (F3 Deterministic Verification Layer)
 * 
 * Hard Constraint: Purely deterministic computation with ZERO AI / LLM calls.
 * Wraps existing cryptographic utilities from src/services/auditSigner.ts:
 * - computeReportHash()
 * - verifyAuditSignatureServerSide()
 * - getSigningPublicKey()
 * 
 * Builds an end-to-end traceability chain:
 * CONCLUSION → RISK ASSESSMENT → SCORE → SUB-SCORE → ALGORITHM → INPUT → SOURCE / HASH.
 * 
 * If signature or required content is missing, reports UNSIGNED / INPUT_MISSING (never fabricates 'verified').
 * If hash or signature fails verification, reports HASH_MISMATCH / SIGNATURE_INVALID.
 * If cryptographic verification passes, reports VERIFIED.
 */
export function verifyAVF08Traceability(
  review?: Partial<CryptoReview> | null
): AVF08TraceabilityResult {
  const missingFields: string[] = [];

  if (!review) {
    return {
      moduleId: 'AVF-08',
      moduleName: 'Traceability & Integrity Verification',
      status: 'INPUT_MISSING',
      isVerified: false,
      computedHash: null,
      canonicalText: null,
      signature: null,
      traceabilityChain: null,
      missingFields: ['review'],
      details: 'Review object is null or undefined.'
    };
  }

  if (!review.scores || typeof review.scores !== 'object') {
    missingFields.push('scores');
  }
  if (!review.verdict || typeof review.verdict !== 'string') {
    missingFields.push('verdict');
  }
  if (!review.grade || typeof review.grade !== 'string') {
    missingFields.push('grade');
  }
  if (!review.createdAt || typeof review.createdAt !== 'string') {
    missingFields.push('createdAt');
  }

  if (missingFields.length > 0) {
    return {
      moduleId: 'AVF-08',
      moduleName: 'Traceability & Integrity Verification',
      status: 'INPUT_MISSING',
      isVerified: false,
      computedHash: null,
      canonicalText: null,
      signature: review.auditSignature || null,
      traceabilityChain: null,
      missingFields,
      details: `Cannot compute cryptographic hash & traceability; missing core fields: ${missingFields.join(', ')}.`
    };
  }

  const scores = review.scores!;
  const verdict = review.verdict!;
  const grade = review.grade!;
  const createdAt = review.createdAt!;

  // Deterministically compute canonical SHA-256 hash using existing auditSigner logic
  const { hashHex: computedHash, canonicalText } = computeReportHash(
    scores,
    verdict,
    grade,
    createdAt
  );

  const activeSystemPublicKey = getSigningPublicKey();
  const signatureData = review.auditSignature;

  // Build the complete traceability chain linking Conclusion -> Score -> Algorithm -> Provenance
  const traceabilityChain: AVF08TraceabilityChain = {
    conclusion: {
      verdict,
      riskLevel: review.riskLevel || 'Unknown',
      grade
    },
    scoreChain: {
      overallScore: review.overallScore ?? 0,
      scores
    },
    algorithm: {
      frameworkVersion: CRL_VERSION_MANIFEST.avfVersion,
      blueprintVersion: CRL_VERSION_MANIFEST.blueprintVersion,
      hashAlgorithm: 'SHA-256',
      signatureAlgorithm: signatureData?.algorithm || 'Ed25519'
    },
    cryptographicIntegrity: {
      computedHash,
      canonicalText,
      signatureOnRecord: signatureData?.signature || null,
      publicKeyOnRecord: signatureData?.publicKey || null,
      activeSystemPublicKey,
      signedAt: signatureData?.signedAt || null,
      hashMatches: false,
      signatureValid: false
    },
    datasetProvenance: {
      reportCreatedAt: createdAt,
      coingeckoLastSyncedAt: review.cgLastSyncedAt,
      cmcLastSyncedAt: review.cmcLastSyncedAt,
      lastSyncedAt: review.lastSyncedAt
    }
  };

  // If the review has no audit signature attached, report UNSIGNED honestly
  if (!signatureData || !signatureData.signature || !signatureData.publicKey) {
    return {
      moduleId: 'AVF-08',
      moduleName: 'Traceability & Integrity Verification',
      status: 'UNSIGNED',
      isVerified: false,
      computedHash,
      canonicalText,
      signature: null,
      traceabilityChain,
      missingFields: ['auditSignature'],
      details: `Report content digest computed (${computedHash.slice(0, 16)}...), but review has not been cryptographically signed with an Ed25519 keypair. Status: UNSIGNED.`
    };
  }

  // Verify against existing auditSigner verification engine
  const verification = verifyAuditSignatureServerSide(signatureData, {
    scores,
    verdict,
    grade,
    timestamp: signatureData.signedAt || createdAt
  });

  traceabilityChain.cryptographicIntegrity.hashMatches = verification.hashMatches;
  traceabilityChain.cryptographicIntegrity.signatureValid = verification.signatureMatches;

  if (!verification.hashMatches) {
    return {
      moduleId: 'AVF-08',
      moduleName: 'Traceability & Integrity Verification',
      status: 'HASH_MISMATCH',
      isVerified: false,
      computedHash,
      canonicalText,
      signature: signatureData,
      traceabilityChain,
      missingFields: [],
      details: `Cryptographic integrity failure: computed SHA-256 hash (${computedHash}) does not match signature record hash (${signatureData.hash}). Report content was altered after signing.`
    };
  }

  if (!verification.isValid) {
    return {
      moduleId: 'AVF-08',
      moduleName: 'Traceability & Integrity Verification',
      status: 'SIGNATURE_INVALID',
      isVerified: false,
      computedHash,
      canonicalText,
      signature: signatureData,
      traceabilityChain,
      missingFields: [],
      details: `Ed25519 signature verification failed: ${verification.reason || 'Invalid signature for public key.'}`
    };
  }

  return {
    moduleId: 'AVF-08',
    moduleName: 'Traceability & Integrity Verification',
    status: 'VERIFIED',
    isVerified: true,
    computedHash,
    canonicalText,
    signature: signatureData,
    traceabilityChain,
    missingFields: [],
    details: `Cryptographic traceability verified: SHA-256 hash (${computedHash.slice(0, 16)}...) and Ed25519 signature matched against canonical report payload.`
  };
}

/* =========================================================================
   AVF-01: Classification Verification (F3 Verification Layer)
   ========================================================================= */

export type AVF01Status = 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'MISCLASSIFIED' | 'INPUT_MISSING';

export interface AVF01ClassificationResult {
  moduleId: 'AVF-01';
  moduleName: 'Classification Verification';
  status: AVF01Status;
  isVerified: boolean;
  assignedCategory: string | null;
  keywordMatchedCategory: string | null;
  coingeckoCategories: string[] | null;
  coingeckoMatches: string[];
  taxonomySource: 'external' | 'derived_fallback' | 'none';
  signals: {
    assigned: boolean;
    keywordMatchAgrees: boolean;
    coingeckoAgrees: boolean;
  };
  classificationConfidence: number; // agreeing signals ÷ total evaluated signals
  missingFields: string[];
  details: string;
}

/**
 * Standard classification matcher matching keyword rules from ReviewLab.
 * Deterministic, non-AI category extraction from descriptive text.
 */
export function matchCategoryFromText(catOrDescription?: string): string {
  if (!catOrDescription) return 'Layer 1 Blockchain';
  const lower = catOrDescription.toLowerCase();

  if (lower.includes('restak') || lower.includes('eigen') || lower.includes('shared security') || lower.includes('avs') || lower.includes('actively validated service')) {
    return 'Restaking / Shared Security / AVS';
  }
  if (lower.includes('rwa') || lower.includes('tokenization') || lower.includes('tradfi') || lower.includes('real world asset') || lower.includes('real-world')) {
    return 'RWA (Tokenization / TradFi Bridge)';
  }
  if (lower.includes('depin') || lower.includes('compute') || lower.includes('storage') || lower.includes('wireless') || lower.includes('hardware')) {
    return 'DePIN (Compute / Storage / Wireless)';
  }
  if (lower.includes('layer 2') || lower.includes('l2') || lower.includes('scaling') || lower.includes('rollup') || lower.includes('sidechain')) {
    return 'Layer 2 / Scaling';
  }
  if (lower.includes('defi') || lower.includes('amm') || lower.includes('lending') || lower.includes('vault') || lower.includes('dex') || lower.includes('yield') || lower.includes('money market')) {
    return 'DeFi Protocol (AMM / Lending)';
  }
  if (lower.includes('privacy') || lower.includes('zk') || lower.includes('fhe') || lower.includes('mpc') || lower.includes('cryptographic') || lower.includes('confidential')) {
    return 'Privacy / Cryptographic (FHE / ZK / MPC)';
  }
  if (lower.includes('infra') || lower.includes('oracle') || lower.includes('bridge') || lower.includes('interop')) {
    return 'Infrastructure (Oracle / Bridge)';
  }
  if (lower.includes('meme') || lower.includes('speculative') || lower.includes('pepe') || lower.includes('doge')) {
    return 'Memecoin / Speculative';
  }
  if (lower.includes('layer 1') || lower.includes('l1') || lower.includes('blockchain') || lower.includes('smart contract') || lower.includes('appchain') || lower.includes('parallel')) {
    return 'Layer 1 Blockchain';
  }
  if (lower.includes('specialized') || lower.includes('experimental') || /\b(ai|artificial intelligence)\b/i.test(lower)) {
    return 'Specialized / Experimental';
  }

  return 'Layer 1 Blockchain';
}

/**
 * Helper to loosely check if a CoinGecko category string matches our taxonomy.
 */
function isCoinGeckoCategoryCompatible(cgCategoryStr: string, assignedCategory: string): boolean {
  const cgLower = cgCategoryStr.toLowerCase();
  const assignedLower = assignedCategory.toLowerCase();

  if (assignedLower.includes('restak') && (cgLower.includes('restak') || cgLower.includes('eigen') || cgLower.includes('shared security') || cgLower.includes('avs') || cgLower.includes('liquid restaking') || cgLower.includes('staking'))) {
    return true;
  }
  if (assignedLower.includes('rwa') && (cgLower.includes('real world') || cgLower.includes('rwa') || cgLower.includes('tokeniz') || cgLower.includes('asset-backed'))) {
    return true;
  }
  if (assignedLower.includes('depin') && (cgLower.includes('depin') || cgLower.includes('distributed compute') || cgLower.includes('storage') || cgLower.includes('wireless') || cgLower.includes('ai & compute'))) {
    return true;
  }
  if (assignedLower.includes('layer 2') && (cgLower.includes('layer 2') || cgLower.includes('l2') || cgLower.includes('rollup') || cgLower.includes('scaling') || cgLower.includes('arbitrum') || cgLower.includes('optimism') || cgLower.includes('polygon'))) {
    return true;
  }
  if (assignedLower.includes('layer 1') && (cgLower.includes('layer 1') || cgLower.includes('l1') || cgLower.includes('smart contract platform') || cgLower.includes('blockchain') || cgLower.includes('pos'))) {
    return true;
  }
  if (assignedLower.includes('defi') && (cgLower.includes('decentralized finance') || cgLower.includes('defi') || cgLower.includes('amm') || cgLower.includes('dex') || cgLower.includes('lending') || cgLower.includes('yield') || cgLower.includes('liquid staking'))) {
    return true;
  }
  if (assignedLower.includes('privacy') && (cgLower.includes('privacy') || cgLower.includes('zero knowledge') || cgLower.includes('zk') || cgLower.includes('fhe') || cgLower.includes('confidential'))) {
    return true;
  }
  if (assignedLower.includes('infrastructure') && (cgLower.includes('infrastructure') || cgLower.includes('oracle') || cgLower.includes('bridge') || cgLower.includes('cross-chain') || cgLower.includes('interoperability'))) {
    return true;
  }
  if (assignedLower.includes('memecoin') && (cgLower.includes('meme') || cgLower.includes('doge') || cgLower.includes('frog'))) {
    return true;
  }
  if (assignedLower.includes('specialized') && (cgLower.includes('artificial intelligence') || cgLower.includes('ai') || cgLower.includes('experimental'))) {
    return true;
  }

  return false;
}

/**
 * Standard CoinGecko categories helper to ensure AVF-01 always receives classification taxonomy.
 */
export function getStandardCoinGeckoCategories(review?: Partial<CryptoReview> | null): string[] {
  if (!review) return ['Smart Contract Platform', 'Layer 1 (L1)'];
  const cat = (review.category || '').toLowerCase();
  const cgId = (review.coingeckoId || '').toLowerCase();
  const sym = (review.symbol || '').toLowerCase();

  // 1. Explicit CoinGecko ID / Symbol Mappings
  if (cgId === 'bitcoin' || sym === 'btc') return ['Cryptocurrency', 'Layer 1 (L1)'];
  if (cgId === 'ethereum' || sym === 'eth') return ['Smart Contract Platform', 'Layer 1 (L1)'];
  if (cgId === 'solana' || sym === 'sol') return ['Smart Contract Platform', 'Layer 1 (L1)', 'Solana Ecosystem'];
  if (cgId === 'arbitrum' || sym === 'arb') return ['Layer 2 (L2)', 'Rollup', 'Arbitrum Ecosystem', 'Scaling'];
  if (cgId === 'uniswap' || sym === 'uni') return ['Decentralized Finance (DeFi)', 'Automated Market Maker (AMM)', 'DEX'];
  if (cgId === 'aave' || sym === 'aave') return ['Decentralized Finance (DeFi)', 'Lending/Borrowing', 'Yield'];
  if (cgId === 'chainlink' || sym === 'link') return ['Oracle', 'Infrastructure', 'Cross-Chain Communication'];
  if (cgId === 'render-token' || cgId === 'render' || sym === 'rndr' || sym === 'render') return ['Distributed Compute', 'DePIN', 'AI & Big Data'];
  if (cgId === 'hyperliquid' || sym === 'hype') return ['Decentralized Finance (DeFi)', 'Perpetuals', 'DEX', 'Layer 1 (L1)'];
  if (cgId === 'sui' || sym === 'sui') return ['Layer 1 (L1)', 'Smart Contract Platform', 'Move Ecosystem'];
  if (cgId === 'kaspa' || sym === 'kas') return ['Layer 1 (L1)', 'Proof of Work (PoW)', 'BlockDAG'];
  if (cgId === 'zama' || sym === 'zama') return ['Privacy / Cryptographic', 'FHE', 'Zero Knowledge (ZK)'];
  if (cgId === 'jupiter-exchange-solana' || sym === 'jup') return ['Decentralized Finance (DeFi)', 'DEX Aggregator', 'Solana Ecosystem'];
  if (cgId === 'eigenlayer' || sym === 'eigen' || cgId.includes('eigen') || cgId.includes('symbiotic') || cgId.includes('karak')) {
    return ['Restaking', 'Shared Security', 'AVS', 'Decentralized Finance (DeFi)'];
  }

  // 2. Category Taxonomy Fallbacks
  if (cat.includes('restak') || cat.includes('eigen') || cat.includes('shared security') || cat.includes('avs')) {
    return ['Restaking', 'Shared Security', 'AVS', 'Decentralized Finance (DeFi)'];
  }
  if (cat.includes('rwa') || cat.includes('tokeniz') || cat.includes('real world') || cat.includes('asset')) {
    return ['Real World Assets (RWA)', 'Tokenized Assets', 'Decentralized Finance (DeFi)'];
  }
  if (cat.includes('depin') || cat.includes('compute') || cat.includes('storage') || cat.includes('wireless') || cat.includes('hardware')) {
    return ['DePIN', 'Distributed Compute', 'Storage', 'AI & Big Data'];
  }
  if (cat.includes('layer 2') || cat.includes('l2') || cat.includes('scaling') || cat.includes('rollup')) {
    return ['Layer 2 (L2)', 'Scaling', 'Rollup', 'Arbitrum Ecosystem'];
  }
  if (cat.includes('defi') || cat.includes('amm') || cat.includes('lending') || cat.includes('dex') || cat.includes('yield')) {
    return ['Decentralized Finance (DeFi)', 'Automated Market Maker (AMM)', 'DEX', 'Yield'];
  }
  if (cat.includes('privacy') || cat.includes('zk') || cat.includes('fhe') || cat.includes('mpc') || cat.includes('confidential')) {
    return ['Privacy Coins', 'Zero Knowledge (ZK)', 'Cryptographic', 'FHE'];
  }
  if (cat.includes('infra') || cat.includes('oracle') || cat.includes('bridge') || cat.includes('interop')) {
    return ['Infrastructure', 'Oracle', 'Interoperability', 'Cross-Chain Communication'];
  }
  if (cat.includes('meme') || cat.includes('speculative')) {
    return ['Meme', 'Community / Speculative'];
  }
  if (cat.includes('layer 1') || cat.includes('l1') || cat.includes('blockchain') || cat.includes('smart contract')) {
    return ['Layer 1 (L1)', 'Smart Contract Platform'];
  }

  return ['Smart Contract Platform', 'Decentralized Finance (DeFi)'];
}

/**
 * AVF-01: Classification Verification (F3 Deterministic Verification Layer)
 * 
 * Hard Constraint: Purely deterministic computation with ZERO AI / LLM calls.
 * Compares:
 * 1. review.category (assigned label)
 * 2. matchCategoryFromText(review.summary / description)
 * 3. coingeckoCategories array (independently maintained external dataset passed in by caller or extracted from F1/F2 data)
 * 
 * Output: Classification Status (VERIFIED / PARTIALLY_VERIFIED / MISCLASSIFIED / INPUT_MISSING)
 * Confidence: strictly computed as (agreeing signals ÷ total signals), no guessing.
 */
export function verifyAVF01Classification(
  review?: Partial<CryptoReview> | null,
  coingeckoCategories?: string[] | null
): AVF01ClassificationResult {
  const missingFields: string[] = [];

  if (!review) {
    return {
      moduleId: 'AVF-01',
      moduleName: 'Classification Verification',
      status: 'INPUT_MISSING',
      isVerified: false,
      assignedCategory: null,
      keywordMatchedCategory: null,
      coingeckoCategories: null,
      coingeckoMatches: [],
      taxonomySource: 'none',
      signals: { assigned: false, keywordMatchAgrees: false, coingeckoAgrees: false },
      classificationConfidence: 0,
      missingFields: ['review'],
      details: 'Review object is null or undefined.'
    };
  }

  if (!review.category || typeof review.category !== 'string') {
    missingFields.push('category');
  }

  // Extract effective CoinGecko categories from parameters, review object, or deterministic taxonomy mapping
  let effectiveCgCategories: string[] | null = null;
  let taxonomySource: 'external' | 'derived_fallback' | 'none' = 'none';

  if (Array.isArray(coingeckoCategories) && coingeckoCategories.length > 0) {
    effectiveCgCategories = coingeckoCategories;
    taxonomySource = 'external';
  } else if (Array.isArray(review.coingeckoCategories) && review.coingeckoCategories.length > 0) {
    effectiveCgCategories = review.coingeckoCategories;
    taxonomySource = 'external';
  } else {
    const derived = getStandardCoinGeckoCategories(review);
    if (derived.length > 0) {
      effectiveCgCategories = derived;
      taxonomySource = 'derived_fallback';
    }
  }

  const hasCgData = Array.isArray(effectiveCgCategories) && effectiveCgCategories.length > 0;
  if (!hasCgData) {
    missingFields.push('coingeckoCategories');
  }

  const assignedCategory = review.category || null;

  // Text source for keyword matching: summary, verdict, or pros/cons
  const descriptionCorpus = [
    review.summary || '',
    review.verdict || '',
    (review.pros || []).join(' '),
    (review.cons || []).join(' ')
  ].join(' ').trim();

  const keywordMatchedCategory = descriptionCorpus ? matchCategoryFromText(descriptionCorpus) : null;

  const normAssigned = assignedCategory ? normalizeProtocolCategory(assignedCategory) : null;
  const normKeyword = keywordMatchedCategory ? normalizeProtocolCategory(keywordMatchedCategory) : null;

  if (missingFields.length > 0) {
    return {
      moduleId: 'AVF-01',
      moduleName: 'Classification Verification',
      status: 'INPUT_MISSING',
      isVerified: false,
      assignedCategory,
      keywordMatchedCategory,
      coingeckoCategories: effectiveCgCategories || null,
      coingeckoMatches: [],
      taxonomySource,
      signals: {
        assigned: !!assignedCategory,
        keywordMatchAgrees: !!(normAssigned && normKeyword && normAssigned === normKeyword),
        coingeckoAgrees: false
      },
      classificationConfidence: 0,
      missingFields,
      details: `Cannot complete independent classification verification; missing required inputs: ${missingFields.join(', ')}.`
    };
  }

  // Signal 1: Keyword re-match agreement with assigned category
  const keywordAgrees = !!(normAssigned && normKeyword && normAssigned === normKeyword);

  // Signal 2: CoinGecko external category list agreement
  const matchingCgCategories = (effectiveCgCategories || []).filter(cgCat =>
    isCoinGeckoCategoryCompatible(cgCat, assignedCategory!)
  );

  // If taxonomySource is derived_fallback, force coingeckoAgrees to false:
  // this self-referential synthetic list must never count toward independent agreeing signals.
  const coingeckoAgrees = taxonomySource === 'derived_fallback' ? false : matchingCgCategories.length > 0;

  // Signals array: [assignedLabel, keywordMatch, coingeckoTaxonomy]
  const totalSignals = 3;
  let agreeingCount = 1; // assigned category is the base signal
  if (keywordAgrees) agreeingCount++;
  if (coingeckoAgrees) agreeingCount++;

  const confidence = +(agreeingCount / totalSignals).toFixed(2);

  let status: AVF01Status = 'MISCLASSIFIED';
  let isVerified = false;

  if (agreeingCount === 3) {
    status = 'VERIFIED';
    isVerified = true;
  } else if (agreeingCount === 2) {
    status = 'PARTIALLY_VERIFIED';
    isVerified = false;
  } else {
    status = 'MISCLASSIFIED';
    isVerified = false;
  }

  let details = status === 'VERIFIED'
    ? `Classification VERIFIED (${Math.round(confidence * 100)}% confidence): Assigned '${assignedCategory}' matches independent CoinGecko categories [${matchingCgCategories.join(', ')}] and internal corpus keyword extraction.`
    : status === 'PARTIALLY_VERIFIED'
      ? `Classification PARTIALLY VERIFIED (${Math.round(confidence * 100)}% confidence): Divergence between assigned '${assignedCategory}', keyword match '${keywordMatchedCategory}', or CoinGecko categories [${(effectiveCgCategories || []).slice(0, 3).join(', ')}].`
      : `Classification MISCLASSIFIED (${Math.round(confidence * 100)}% confidence): Assigned '${assignedCategory}' contradicts both external CoinGecko data and description keyword extraction.`;

  if (taxonomySource === 'derived_fallback') {
    details += ' [UNLISTED_ASSET: no external CoinGecko listing was available — the CoinGecko signal was internally derived and excluded from the agreement count, capping status below VERIFIED.]';
  }

  return {
    moduleId: 'AVF-01',
    moduleName: 'Classification Verification',
    status,
    isVerified,
    assignedCategory,
    keywordMatchedCategory,
    coingeckoCategories: effectiveCgCategories || null,
    coingeckoMatches: matchingCgCategories,
    taxonomySource,
    signals: {
      assigned: true,
      keywordMatchAgrees: keywordAgrees,
      coingeckoAgrees
    },
    classificationConfidence: confidence,
    missingFields: [],
    details
  } as AVF01ClassificationResult & { confidence: number };
}

/* =========================================================================
   AVF-03: Methodology Verification (F3 Verification Layer)
   ========================================================================= */

export type AVF03Status = 'VERIFIED' | 'DISCREPANCY_FOUND' | 'INPUT_MISSING';

export interface AVF03MethodologyResult {
  moduleId: 'AVF-03';
  moduleName: 'Methodology Verification';
  status: AVF03Status;
  isVerified: boolean;
  blueprintVersion: string;
  weightTableApplied: CategoryWeights;
  categorySpecificVariantsExist: boolean;
  scoreVerificationStatus: AVF05Status;
  scoreDiscrepancy: number | null;
  missingFields: string[];
  details: string;
}

/**
 * AVF-03: Methodology Verification (F3 Deterministic Verification Layer)
 * 
 * Hard Constraint: Purely deterministic computation with ZERO AI / LLM calls.
 * Reuses AVF-05's verified weights and verification output.
 * Confirms that the canonical Evaluation Blueprint methodology was consistently applied,
 * and reports VERIFIED if AVF-05's discrepancy is within tolerance, DISCREPANCY_FOUND otherwise.
 */
export function verifyAVF03Methodology(
  avf05Result?: AVF05ScoreVerificationResult | null
): AVF03MethodologyResult {
  const defaultWeights = getCategoryDimensionWeights('Specialized / Experimental');

  if (!avf05Result) {
    return {
      moduleId: 'AVF-03',
      moduleName: 'Methodology Verification',
      status: 'INPUT_MISSING',
      isVerified: false,
      blueprintVersion: CRL_VERSION_MANIFEST.blueprintVersion,
      weightTableApplied: defaultWeights,
      categorySpecificVariantsExist: true,
      scoreVerificationStatus: 'INPUT_MISSING',
      scoreDiscrepancy: null,
      missingFields: ['avf05Result'],
      details: 'AVF-05 Score Verification Result is missing. Cannot verify methodology execution.'
    };
  }

  if (avf05Result.status === 'INPUT_MISSING') {
    return {
      moduleId: 'AVF-03',
      moduleName: 'Methodology Verification',
      status: 'INPUT_MISSING',
      isVerified: false,
      blueprintVersion: CRL_VERSION_MANIFEST.blueprintVersion,
      weightTableApplied: avf05Result.weightsApplied,
      categorySpecificVariantsExist: true,
      scoreVerificationStatus: avf05Result.status,
      scoreDiscrepancy: null,
      missingFields: avf05Result.missingFields,
      details: `Methodology verification halted: underlying score inputs are missing (${avf05Result.missingFields.join(', ')}).`
    };
  }

  const isVerified = avf05Result.isVerified && avf05Result.status === 'VERIFIED';
  const status: AVF03Status = isVerified ? 'VERIFIED' : 'DISCREPANCY_FOUND';

  const details = isVerified
    ? `Methodology VERIFIED: Category-specific weighting formula per ${CRL_VERSION_MANIFEST.blueprintVersion} was correctly executed against underlying dimension scores with zero unauthorized formula drift.`
    : `Methodology DISCREPANCY FOUND: Underlying score computation diverged from declared ${CRL_VERSION_MANIFEST.blueprintVersion} weighting rules (Δ = ${avf05Result.discrepancy ?? 'N/A'} pts).`;

  return {
    moduleId: 'AVF-03',
    moduleName: 'Methodology Verification',
    status,
    isVerified,
    blueprintVersion: CRL_VERSION_MANIFEST.blueprintVersion,
    weightTableApplied: avf05Result.weightsApplied,
    categorySpecificVariantsExist: true,
    scoreVerificationStatus: avf05Result.status,
    scoreDiscrepancy: avf05Result.discrepancy,
    missingFields: [],
    details
  };
}

/* =========================================================================
   AVF-02: Data & Evidence Verification (F3 Verification Layer)
   ========================================================================= */

export type AVF02DimensionStatus = 'VERIFIED' | 'CRITICAL_GAP' | 'UNVERIFIED';
export type AVF02Status = 'VERIFIED' | 'CONDITIONAL' | 'CRITICAL_GAP_DETECTED' | 'INPUT_MISSING';

export interface AVF02DimensionEvidence {
  dimension: string;
  sourceType: 'EXTERNAL_API_DUAL_ORACLE' | 'ON_CHAIN_BYTECODE_SCAN' | 'MODEL_GENERATED_NARRATIVE';
  sourceName: string;
  status: AVF02DimensionStatus;
  isExternallyBacked: boolean;
  citationOrReference: string | null;
  retrievedAt?: string | null;
  rawObservedValue?: any;
}

export interface AVF02EvidenceOptions {
  securityScan?: any | null;
  citations?: Record<string, string> | null;
}

export interface AVF02EvidenceResult {
  moduleId: 'AVF-02';
  moduleName: 'Data & Evidence Verification';
  status: AVF02Status;
  isVerified: boolean;
  totalDimensions: number;
  verifiedDimensions: number;
  evidenceCoveragePct: number; // strictly: verified ÷ total (e.g. 0.40 = 40%)
  dimensions: AVF02DimensionEvidence[];
  criticalDataGaps: string[];
  missingFields: string[];
  details: string;
}

/**
 * AVF-02: Data & Evidence Verification (F3 Deterministic Verification Layer)
 * 
 * Hard Constraint: Purely deterministic classification with ZERO AI / LLM calls.
 * Separates what is independently verified from external sources from model-generated narrative:
 * 1. Market Data (price, cap, volume, supply) -> CoinGecko + CMC dual API -> VERIFIED if authentic positive price present.
 *    - Rejects mock, synthetic, or fallback demo market generators (flags as CRITICAL_GAP).
 * 2. Security Data (honeypot, mint authority, ownership, blacklist) -> GoPlus / RugCheck scan.
 *    - Requires actual GoPlus / RugCheck scan results on file; a contract address alone is NOT verified evidence.
 * 3. Qualitative Narrative (Utility, Tokenomics, Team/Community) -> Model-generated text -> UNVERIFIED unless explicit external citation is attached.
 * 
 * evidenceCoveragePct = verified dimensions ÷ 5 (no floor/ceiling clamp; reports genuinely low numbers honestly).
 */
export function verifyAVF02Evidence(
  review?: Partial<CryptoReview> | null,
  options?: AVF02EvidenceOptions | null
): AVF02EvidenceResult {
  if (!review) {
    return {
      moduleId: 'AVF-02',
      moduleName: 'Data & Evidence Verification',
      status: 'INPUT_MISSING',
      isVerified: false,
      totalDimensions: 5,
      verifiedDimensions: 0,
      evidenceCoveragePct: 0,
      dimensions: [],
      criticalDataGaps: ['Review object is null or undefined.'],
      missingFields: ['review'],
      details: 'Review object is null or undefined.'
    };
  }

  const criticalDataGaps: string[] = [];
  const missingFields: string[] = [];

  // Dimension 1: Market Data (Price, Cap, Volume)
  const isSyntheticFallback = (
    review.isFallbackMarketData === true ||
    (typeof review.dataEngine === 'string' && (
      review.dataEngine.toLowerCase().includes('fallback') ||
      review.dataEngine.toLowerCase().includes('synthetic') ||
      review.dataEngine.toLowerCase().includes('mock')
    )) ||
    (review as any).isMockData === true
  );

  const hasValidPrice = (
    (typeof review.livePrice === 'number' && review.livePrice > 0 && !isNaN(review.livePrice)) ||
    (typeof review.cmcPrice === 'number' && review.cmcPrice > 0 && !isNaN(review.cmcPrice))
  );

  const hasMarketData = hasValidPrice && !isSyntheticFallback;
  const marketRetrievedAt = review.lastSyncedAt || review.cgLastSyncedAt || review.createdAt || null;

  let marketStatus: AVF02DimensionStatus = 'CRITICAL_GAP';
  let marketSourceName = 'CoinGecko + CoinMarketCap Dual API';
  let marketCitation: string | null = null;

  if (isSyntheticFallback) {
    criticalDataGaps.push('Market Live Pricing Unverified: Market metrics originate from a synthetic UI fallback generator, not authentic external CoinGecko/CMC API feeds.');
    marketSourceName = 'UI Fallback Generator (Synthetic / Demo Only)';
    marketStatus = 'CRITICAL_GAP';
    missingFields.push('livePrice');
  } else if (hasMarketData) {
    marketStatus = 'VERIFIED';
    marketCitation = `Live price $${review.livePrice ?? review.cmcPrice ?? 'N/A'}, MCap $${review.liveMarketCap ?? 'N/A'}`;
    marketSourceName = review.dataEngine || 'CoinGecko + CoinMarketCap Dual API';
  } else {
    criticalDataGaps.push('Market Live Pricing Missing: CoinGecko/CMC dual liquidity feed unavailable on file.');
    marketStatus = 'CRITICAL_GAP';
    missingFields.push('livePrice');
  }

  const marketEvidence: AVF02DimensionEvidence = {
    dimension: 'Market & Liquidity Data',
    sourceType: 'EXTERNAL_API_DUAL_ORACLE',
    sourceName: marketSourceName,
    status: marketStatus,
    isExternallyBacked: marketStatus === 'VERIFIED',
    citationOrReference: marketCitation,
    retrievedAt: marketRetrievedAt,
    rawObservedValue: hasValidPrice ? { livePrice: review.livePrice, liveMarketCap: review.liveMarketCap } : null
  };

  // Dimension 2: Security & Smart Contract Data (GoPlus / RugCheck)
  const hasContractAddress = Boolean(
    review.contractAddress &&
    typeof review.contractAddress === 'string' &&
    review.contractAddress.trim().length > 4
  );

  const securityScan = options?.securityScan ||
    review.securityScan ||
    (review as any).externalSecurityScan ||
    review.proBenchmarks?.securityScan ||
    null;

  const rawScanData = securityScan?.data || securityScan;
  const hasRequiredSecurityFields = Boolean(
    rawScanData &&
    typeof rawScanData === 'object' &&
    (
      rawScanData.is_honeypot !== undefined ||
      rawScanData.isHoneypot !== undefined ||
      rawScanData.is_mintable !== undefined ||
      rawScanData.isMintable !== undefined ||
      rawScanData.honeypot !== undefined ||
      rawScanData.mintAuthority !== undefined ||
      rawScanData.isOpenSource !== undefined ||
      rawScanData.is_open_source !== undefined ||
      rawScanData.is_blacklisted !== undefined ||
      rawScanData.hasBlacklist !== undefined ||
      rawScanData.custodyRisk !== undefined ||
      rawScanData.owner_is_contract !== undefined ||
      rawScanData.renounced !== undefined ||
      rawScanData.verified !== undefined ||
      rawScanData.score !== undefined ||
      rawScanData.risks !== undefined ||
      rawScanData.auditCount !== undefined ||
      rawScanData.rugcheckVerdict !== undefined ||
      rawScanData.rugcheckScore !== undefined ||
      (Array.isArray(rawScanData.findings) && rawScanData.findings.length > 0) ||
      Object.keys(rawScanData).length >= 2
    )
  );

  const hasValidScan = Boolean(
    rawScanData &&
    typeof rawScanData === 'object' &&
    !rawScanData.error &&
    !securityScan?.error &&
    hasRequiredSecurityFields
  );

  let securityStatus: AVF02DimensionStatus = 'CRITICAL_GAP';
  let securitySourceName = 'GoPlus Security + RugCheck Bytecode Oracle';
  let securityCitation: string | null = null;
  const securityRetrievedAt = securityScan?.timestamp || review.lastSyncedAt || null;

  if (hasContractAddress && hasValidScan) {
    securityStatus = 'VERIFIED';
    securitySourceName = securityScan.source || 'GoPlus Security + RugCheck Bytecode Oracle';
    securityCitation = `On-chain bytecode scan verified (${securitySourceName}) for contract ${review.contractAddress}`;
  } else if (hasContractAddress && !hasValidScan) {
    securityStatus = 'CRITICAL_GAP';
    criticalDataGaps.push('Security Bytecode Scan Missing: Smart contract address is on file, but verified GoPlus/RugCheck on-chain scan with required vulnerability fields is absent.');
    missingFields.push('securityScan');
  } else {
    securityStatus = 'CRITICAL_GAP';
    criticalDataGaps.push('Contract Address Missing: On-chain bytecode, honeypot, and mint authority scan unanchored.');
    missingFields.push('contractAddress');
  }

  const securityEvidence: AVF02DimensionEvidence = {
    dimension: 'Security & Bytecode Analysis',
    sourceType: 'ON_CHAIN_BYTECODE_SCAN',
    sourceName: securitySourceName,
    status: securityStatus,
    isExternallyBacked: securityStatus === 'VERIFIED',
    citationOrReference: securityCitation,
    retrievedAt: securityRetrievedAt,
    rawObservedValue: hasValidScan ? (securityScan.data || securityScan) : (hasContractAddress ? { contractAddress: review.contractAddress } : null)
  };

  // Dimensions 3, 4, 5: Qualitative Narratives (Utility, Tokenomics, Team/Community)
  const citations = options?.citations || review.citations || null;

  const utilityCitation = citations?.utility || null;
  const hasUtilityCitation = Boolean(utilityCitation && typeof utilityCitation === 'string' && utilityCitation.trim().length > 0);
  const utilityEvidence: AVF02DimensionEvidence = {
    dimension: 'Utility & Architecture Narrative',
    sourceType: 'MODEL_GENERATED_NARRATIVE',
    sourceName: hasUtilityCitation ? 'External Technical Whitepaper / Architecture Documentation' : 'Generative AI Candidate / Reviewer Drafting',
    status: hasUtilityCitation ? 'VERIFIED' : 'UNVERIFIED',
    isExternallyBacked: hasUtilityCitation,
    citationOrReference: utilityCitation
  };

  const tokenomicsCitation = citations?.tokenomics || null;
  const hasTokenomicsCitation = Boolean(tokenomicsCitation && typeof tokenomicsCitation === 'string' && tokenomicsCitation.trim().length > 0);
  const tokenomicsEvidence: AVF02DimensionEvidence = {
    dimension: 'Tokenomics & Vesting Narrative',
    sourceType: 'MODEL_GENERATED_NARRATIVE',
    sourceName: hasTokenomicsCitation ? 'External Tokenomics Schedule / Vesting Audit' : 'Generative AI Candidate / Reviewer Drafting',
    status: hasTokenomicsCitation ? 'VERIFIED' : 'UNVERIFIED',
    isExternallyBacked: hasTokenomicsCitation,
    citationOrReference: tokenomicsCitation
  };

  const teamCitation = citations?.team || citations?.community || null;
  const hasTeamCitation = Boolean(teamCitation && typeof teamCitation === 'string' && teamCitation.trim().length > 0);
  const teamCommunityEvidence: AVF02DimensionEvidence = {
    dimension: 'Team & Governance Assessment',
    sourceType: 'MODEL_GENERATED_NARRATIVE',
    sourceName: hasTeamCitation ? 'External Team & Governance Registry Citation' : 'Generative AI Candidate / Reviewer Drafting',
    status: hasTeamCitation ? 'VERIFIED' : 'UNVERIFIED',
    isExternallyBacked: hasTeamCitation,
    citationOrReference: teamCitation
  };

  const dimensions = [
    marketEvidence,
    securityEvidence,
    utilityEvidence,
    tokenomicsEvidence,
    teamCommunityEvidence
  ];

  const totalDimensions = dimensions.length;
  const verifiedDimensions = dimensions.filter(d => d.status === 'VERIFIED').length;
  const evidenceCoveragePct = +(verifiedDimensions / totalDimensions).toFixed(2);

  let status: AVF02Status = 'CONDITIONAL';
  let isVerified = false;

  if (criticalDataGaps.length > 0) {
    status = 'CRITICAL_GAP_DETECTED';
    isVerified = false;
  } else if (evidenceCoveragePct >= 0.8) {
    status = 'VERIFIED';
    isVerified = true;
  } else {
    status = 'CONDITIONAL';
    isVerified = false;
  }

  const details = criticalDataGaps.length > 0
    ? `Data & Evidence CRITICAL GAP (${Math.round(evidenceCoveragePct * 100)}% coverage, ${verifiedDimensions}/${totalDimensions} backed): ${criticalDataGaps.join(' ')}`
    : `Data & Evidence CONDITIONAL (${Math.round(evidenceCoveragePct * 100)}% coverage, ${verifiedDimensions}/${totalDimensions} externally backed): Market data is ${marketStatus}, Security bytecode scan is ${securityStatus}. Qualitative narratives without citations are UNVERIFIED model-generated text.`;

  return {
    moduleId: 'AVF-02',
    moduleName: 'Data & Evidence Verification',
    status,
    isVerified,
    totalDimensions,
    verifiedDimensions,
    evidenceCoveragePct,
    dimensions,
    criticalDataGaps,
    missingFields,
    details
  };
}

/* =========================================================================
   AVF-04: Scenario & Simulation Verification (F3 Verification Layer)
   ========================================================================= */

export type ScenarioLifecycleState = 'DEFINED' | 'EXECUTABLE' | 'EXECUTED' | 'VERIFIED';
export type AVF04ScenarioStatus = 'VERIFIED' | 'EXECUTED' | 'EXECUTABLE' | 'DEFINED' | 'EXECUTED_VERIFIED' | 'UNEXECUTED_NARRATIVE_ONLY' | 'NOT_POSSIBLE' | 'INPUT_MISSING';
export type AVF04Status = 'VERIFIED' | 'PASSED' | 'PARTIALLY_EXECUTED' | 'UNEXECUTED' | 'INPUT_MISSING';

export interface AVF04ScenarioItem {
  name: string;
  category: 'CROSS_VALIDATION_CONVERGENCE' | 'STRESS_TEST_SIMULATION';
  state: ScenarioLifecycleState;
  status: AVF04ScenarioStatus;
  isExecuted: boolean;
  isVerified: boolean;
  inputsCaptured: boolean;
  backingProcess: string;
  executionMetrics: {
    roundsExecuted?: number;
    finalDrift?: number;
    equilibriumAchieved?: boolean;
    simulatedPriceShockPct?: number;
    liquidityDrainResult?: string;
  } | null;
  notes: string;
}

export interface AVF04ScenarioResult {
  moduleId: 'AVF-04';
  moduleName: 'Scenario & Simulation Verification';
  status: AVF04Status;
  isVerified: boolean;
  totalScenarios: number;
  executedScenarios: number;
  scenarioExecutionRate: number; // executed ÷ total
  scenarios: AVF04ScenarioItem[];
  missingFields: string[];
  details: string;
}

/**
 * AVF-04: Scenario & Simulation Verification (F3 Deterministic Verification Layer)
 * 
 * Hard Constraint: Purely deterministic computation with ZERO AI / LLM calls.
 * Enforces explicit 4-stage lifecycle state machine:
 * DEFINED → EXECUTABLE → EXECUTED → VERIFIED
 * 
 * - DEFINED: Scenario parameters and invariants exist in the blueprint model.
 * - EXECUTABLE: Live/on-chain inputs necessary to execute the simulation are captured.
 * - EXECUTED: Computation has actually run against the captured inputs.
 * - VERIFIED: Results meet convergence thresholds or invariant safety bounds.
 * 
 * Rule: NEVER treat narrative-only scenarios as executed.
 */
export function verifyAVF04Scenarios(
  review?: Partial<CryptoReview> | null,
  avfLoopResult?: {
    totalRounds?: number;
    finalCompositeDelta?: number;
    equilibriumAchieved?: boolean;
    rounds?: any[];
  } | null
): AVF04ScenarioResult {
  if (!review) {
    return {
      moduleId: 'AVF-04',
      moduleName: 'Scenario & Simulation Verification',
      status: 'INPUT_MISSING',
      isVerified: false,
      totalScenarios: 4,
      executedScenarios: 0,
      scenarioExecutionRate: 0,
      scenarios: [],
      missingFields: ['review'],
      details: 'Review object is null or undefined.'
    };
  }

  // 1. Cross-Validation Convergence Loop
  const hasRealLoopExecution = Boolean(
    avfLoopResult &&
    (typeof avfLoopResult.totalRounds === 'number' || (Array.isArray(avfLoopResult.rounds) && avfLoopResult.rounds.length > 0))
  );
  const loopRounds = avfLoopResult?.totalRounds ?? avfLoopResult?.rounds?.length ?? 0;
  const loopFinalDrift = avfLoopResult?.finalCompositeDelta ?? 0.0;
  const loopEquilibrium = avfLoopResult?.equilibriumAchieved ?? (loopFinalDrift < 3.0);

  let loopState: ScenarioLifecycleState = 'DEFINED';
  if (hasRealLoopExecution) {
    loopState = loopEquilibrium ? 'VERIFIED' : 'EXECUTED';
  } else if (review.scores && review.overallScore) {
    loopState = 'EXECUTABLE';
  }

  // 2. TVL Liquidity Drain Stress Simulation
  const hasTvlData = Boolean(
    (review as any).tvl ||
    review.defiLlamaSlug ||
    (review.citations && review.citations['tvl'])
  );
  const tvlState: ScenarioLifecycleState = hasTvlData ? 'EXECUTABLE' : 'DEFINED';

  // 3. Price Shock & Cascading Liquidation Stress Matrix
  const hasPriceData = Boolean(
    typeof review.livePrice === 'number' &&
    review.livePrice > 0
  );
  const priceState: ScenarioLifecycleState = hasPriceData ? 'EXECUTABLE' : 'DEFINED';

  // 4. Oracle Latency & Manipulation Simulation
  const hasContractData = Boolean(review.contractAddress && review.contractAddress.trim().length > 4);
  const oracleState: ScenarioLifecycleState = hasContractData ? 'EXECUTABLE' : 'DEFINED';

  const scenarios: AVF04ScenarioItem[] = [
    {
      name: 'AVF Cross-Validation Convergence Loop (F1 vs F2 Multi-Round)',
      category: 'CROSS_VALIDATION_CONVERGENCE',
      state: loopState,
      status: loopState === 'VERIFIED' ? 'VERIFIED' : loopState === 'EXECUTED' ? 'EXECUTED' : 'UNEXECUTED_NARRATIVE_ONLY',
      isExecuted: loopState === 'EXECUTED' || loopState === 'VERIFIED',
      isVerified: loopState === 'VERIFIED',
      inputsCaptured: true,
      backingProcess: 'executeAVFLoop (reControlEngine.ts)',
      executionMetrics: hasRealLoopExecution ? {
        roundsExecuted: loopRounds,
        finalDrift: loopFinalDrift,
        equilibriumAchieved: loopEquilibrium
      } : null,
      notes: hasRealLoopExecution
        ? `Real computation executed: ${loopRounds} round(s), final delta ${loopFinalDrift.toFixed(1)} pts, convergence ${loopEquilibrium ? 'VERIFIED' : 'PENDING'}.`
        : 'Loop execution telemetry was not captured in this run (Status: EXECUTABLE).'
    },
    {
      name: 'TVL Liquidity Drain & Slippage Stress Simulation',
      category: 'STRESS_TEST_SIMULATION',
      state: tvlState,
      status: 'UNEXECUTED_NARRATIVE_ONLY',
      isExecuted: false,
      isVerified: false,
      inputsCaptured: hasTvlData,
      backingProcess: 'None (Stress Engine Unattached)',
      executionMetrics: null,
      notes: hasTvlData
        ? 'TVL telemetry is captured and EXECUTABLE, but automated multi-block drain simulation engine was not run.'
        : 'Descriptive narrative only (DEFINED); on-chain TVL data not captured.'
    },
    {
      name: 'Price Shock & Cascading Liquidation Stress Matrix',
      category: 'STRESS_TEST_SIMULATION',
      state: priceState,
      status: 'UNEXECUTED_NARRATIVE_ONLY',
      isExecuted: false,
      isVerified: false,
      inputsCaptured: hasPriceData,
      backingProcess: 'None (Simulation Engine Unattached)',
      executionMetrics: null,
      notes: hasPriceData
        ? 'Live price captured and EXECUTABLE, but dynamic liquidation engine was not executed.'
        : 'Descriptive narrative only (DEFINED); live price data absent.'
    },
    {
      name: 'Oracle Latency & Manipulation Simulation',
      category: 'STRESS_TEST_SIMULATION',
      state: oracleState,
      status: 'UNEXECUTED_NARRATIVE_ONLY',
      isExecuted: false,
      isVerified: false,
      inputsCaptured: hasContractData,
      backingProcess: 'None (Simulation Engine Unattached)',
      executionMetrics: null,
      notes: hasContractData
        ? 'Contract bytecode address captured and EXECUTABLE, but live simulated latency feed was not executed.'
        : 'Descriptive narrative only (DEFINED); contract bytecode address absent.'
    }
  ];

  const totalScenarios = scenarios.length;
  const executedScenarios = scenarios.filter(s => s.isExecuted).length;
  const verifiedScenarios = scenarios.filter(s => s.isVerified).length;
  const scenarioExecutionRate = +(executedScenarios / totalScenarios).toFixed(2);

  let status: AVF04Status = 'UNEXECUTED';
  let isVerified = false;

  if (verifiedScenarios === totalScenarios) {
    status = 'VERIFIED';
    isVerified = true;
  } else if (executedScenarios > 0) {
    status = 'PARTIALLY_EXECUTED';
    isVerified = false;
  } else {
    status = 'UNEXECUTED';
    isVerified = false;
  }

  const details = hasRealLoopExecution
    ? `Scenario Verification: ${executedScenarios}/${totalScenarios} executed (${Math.round(scenarioExecutionRate * 100)}%). Real AVF convergence loop ${loopState} (${loopRounds} rounds, Δ = ${loopFinalDrift.toFixed(1)} pts). Secondary stress tests: 0 executed (Narrative/Executable only).`
    : `Scenario Verification: 0/${totalScenarios} executed. All scenario items are in DEFINED or EXECUTABLE states without execution.`;

  return {
    moduleId: 'AVF-04',
    moduleName: 'Scenario & Simulation Verification',
    status,
    isVerified,
    totalScenarios,
    executedScenarios,
    scenarioExecutionRate,
    scenarios,
    missingFields: hasRealLoopExecution ? [] : ['avfLoopResult'],
    details
  };
}

/* =========================================================================
   AVF-07: Confidence & Uncertainty Verification (F3 Verification Layer)
   ========================================================================= */

export type AVF07Status = 'COMPUTED' | 'INPUT_MISSING';

export type AVF07ConfidenceLevel = 'HIGH' | 'MODERATE' | 'LOW';

/**
 * Deterministic Confidence Threshold Mapping:
 * - HIGH only if >= 0.85
 * - MODERATE if 0.70–0.84
 * - LOW if < 0.70
 */
export function getConfidenceLevel(overallConfidence: number): AVF07ConfidenceLevel {
  if (overallConfidence >= 0.85) return 'HIGH';
  if (overallConfidence >= 0.70) return 'MODERATE';
  return 'LOW';
}

export interface AVF07ConfidenceBreakdown {
  dataConfidence: number;           // from AVF-02 evidenceCoveragePct (0.0 - 1.0)
  classificationConfidence: number; // from AVF-01 classificationConfidence (0.0 - 1.0)
  scenarioConfidence: number;       // from AVF-04 scenarioExecutionRate (0.0 - 1.0)
  conclusionConfidence: number;     // from AVF-06 risk consistency (0.0 - 1.0)
  overallConfidence: number;        // weighted composite score (0.0 - 1.0)
}

export interface AVF07ConfidenceResult {
  moduleId: 'AVF-07';
  moduleName: 'Confidence & Uncertainty Verification';
  status: AVF07Status;
  isVerified: boolean;
  confidence: AVF07ConfidenceBreakdown;
  confidenceLevel: AVF07ConfidenceLevel;
  confidencePct: number;
  weights: {
    data: number;
    classification: number;
    scenario: number;
    conclusion: number;
  };
  missingModules: string[];
  details: string;
}

/**
 * AVF-07: Confidence & Uncertainty Verification (F3 Deterministic Verification Layer)
 * 
 * Hard Constraint: Purely deterministic aggregation with ZERO AI / LLM calls.
 * Zero hard-coded assumptions or artificial floors.
 * 
 * Canonical Formula:
 * Confidence = (0.20 × C_class) + (0.30 × C_prov) + (0.30 × C_scen) + (0.20 × C_risk)
 * 
 * - Classification Confidence (C_class): AVF-01's classificationConfidence (0.20 weight)
 * - Data Provenance / Coverage (C_prov): AVF-02's evidenceCoveragePct (0.30 weight)
 * - Scenario Execution (C_scen): AVF-04's scenarioExecutionRate (0.30 weight, only truly EXECUTED/VERIFIED)
 * - Risk / Conclusion Consistency (C_risk): AVF-06 consistency score (0.20 weight)
 */
export function verifyAVF07Confidence(
  avf01?: AVF01ClassificationResult | null,
  avf02?: AVF02EvidenceResult | null,
  avf04?: AVF04ScenarioResult | null,
  avf06?: {
    status?: 'CONSISTENT' | 'REQUIRES_REVIEW' | 'CONFLICT' | 'INPUT_MISSING' | 'VERIFIED';
    isConsistent?: boolean;
    [key: string]: any;
  } | null
): AVF07ConfidenceResult {
  const missingModules: string[] = [];

  if (!avf01) missingModules.push('AVF-01 (Classification)');
  if (!avf02) missingModules.push('AVF-02 (Data & Evidence)');
  if (!avf04) missingModules.push('AVF-04 (Scenario & Simulation)');
  if (!avf06) missingModules.push('AVF-06 (Risk-Conclusion)');

  // 1. Classification Confidence (C_class, weight 0.20)
  const classificationConfidence = typeof avf01?.classificationConfidence === 'number'
    ? Math.max(0, Math.min(1, avf01.classificationConfidence))
    : (typeof (avf01 as any)?.confidence === 'number' ? (avf01 as any).confidence : 0);

  // 2. Data Confidence / Provenance (C_prov, weight 0.30)
  const dataConfidence = typeof avf02?.evidenceCoveragePct === 'number'
    ? Math.max(0, Math.min(1, avf02.evidenceCoveragePct))
    : 0;

  // 3. Scenario Confidence (C_scen, weight 0.30)
  // Strictly data-driven from executed scenarios
  let scenarioConfidence = 0;
  if (avf04) {
    if (typeof avf04.scenarioExecutionRate === 'number') {
      scenarioConfidence = Math.max(0, Math.min(1, avf04.scenarioExecutionRate));
    }
  }

  // 4. Conclusion Confidence (C_risk, weight 0.20)
  let conclusionConfidence = 0;
  if (avf06) {
    if (avf06.status === 'CONSISTENT' || avf06.isConsistent === true) {
      conclusionConfidence = 1.0;
    } else if (avf06.status === 'REQUIRES_REVIEW') {
      conclusionConfidence = 0.60;
    } else if (avf06.status === 'CONFLICT') {
      conclusionConfidence = 0.20; // Material conflict penalty
    } else {
      conclusionConfidence = 0.0;
    }
  }

  // Canonical formula: (0.20 × C_class) + (0.30 × C_prov) + (0.30 × C_scen) + (0.20 × C_risk)
  const rawOverall =
    (0.20 * classificationConfidence) +
    (0.30 * dataConfidence) +
    (0.30 * scenarioConfidence) +
    (0.20 * conclusionConfidence);
  const overallConfidence = +rawOverall.toFixed(2);
  const confidenceLevel = getConfidenceLevel(overallConfidence);
  const confidencePct = Math.round(overallConfidence * 100);

  const isVerified = missingModules.length === 0;
  const status: AVF07Status = isVerified ? 'COMPUTED' : 'INPUT_MISSING';

  const details = isVerified
    ? `Overall AVF Confidence is ${confidencePct}% [${confidenceLevel}] (computed deterministically: 0.20×Class ${Math.round(classificationConfidence * 100)}% + 0.30×Data ${Math.round(dataConfidence * 100)}% + 0.30×Scenario ${Math.round(scenarioConfidence * 100)}% + 0.20×Risk ${Math.round(conclusionConfidence * 100)}%).`
    : `AVF Confidence partially computed (${confidencePct}% [${confidenceLevel}]); missing verification modules: ${missingModules.join(', ')}.`;

  return {
    moduleId: 'AVF-07',
    moduleName: 'Confidence & Uncertainty Verification',
    status,
    isVerified,
    confidence: {
      dataConfidence,
      classificationConfidence,
      scenarioConfidence,
      conclusionConfidence,
      overallConfidence
    },
    confidenceLevel,
    confidencePct,
    weights: {
      classification: 0.20,
      data: 0.30,
      scenario: 0.30,
      conclusion: 0.20
    },
    missingModules,
    details
  };
}

/* =========================================================================
   AVF-06: Risk–Conclusion Verification (F3 Verification Layer)
   ========================================================================= */

export type AVF06Status = 'CONSISTENT' | 'REQUIRES_REVIEW' | 'CONFLICT' | 'INPUT_MISSING';

export interface AVF06SignalCheck {
  signalName: string;
  source: string;
  observedValue: any;
  impliedRisk: string;
  isContradiction: boolean;
  notes?: string;
}

export interface AVF06RiskConclusionOptions {
  securityScan?: any | null;
}

export interface AVF06RiskConclusionResult {
  moduleId: 'AVF-06';
  moduleName: 'Risk–Conclusion Verification';
  status: AVF06Status;
  isConsistent: boolean;
  declaredRisk: string | null;
  verifiedRiskLevel: string | null;
  signalsChecked: AVF06SignalCheck[];
  materialFindings: string[];
  contradictions: string[];
  missingFields: string[];
  details: string;
  ruleVersion: string;
}

/**
 * AVF-06: Risk–Conclusion Verification (F3 Deterministic Verification Layer)
 * 
 * Hard Constraint: Purely deterministic cross-check with ZERO AI / LLM calls.
 * Cross-checks stated review.riskLevel against real, externally-sourced and
 * verifiable security/risk signals:
 * 1. Security sub-score (scores.security)
 * 2. Overall mathematical score (overallScore)
 * 3. Contract deployment & verified GoPlus / RugCheck scan results
 * 4. Symbolic execution benchmark flags (reentrancy, flash loan cascade, proxy admin lock)
 * 5. Category-level speculative baseline (Memecoin / Speculative)
 * 
 * Returns CONSISTENT if all verified risk signals align with declared riskLevel.
 * Returns CONFLICT if a direct, material contradiction is detected (e.g. Honeypot/cannot-sell flags or low security score paired with 'Low Risk').
 * Returns REQUIRES_REVIEW if unverified bytecode, unrenounced owner privileges, or moderate variance requires human auditor attention.
 * Returns INPUT_MISSING if required inputs are missing.
 */
export function verifyAVF06RiskConclusion(
  review?: Partial<CryptoReview> | null,
  options?: AVF06RiskConclusionOptions | null
): AVF06RiskConclusionResult {
  const ruleVersion = CRL_VERSION_MANIFEST.combinedVersionString;

  if (!review) {
    return {
      moduleId: 'AVF-06',
      moduleName: 'Risk–Conclusion Verification',
      status: 'INPUT_MISSING',
      isConsistent: false,
      declaredRisk: null,
      verifiedRiskLevel: null,
      signalsChecked: [],
      materialFindings: ['Review object is null or undefined.'],
      contradictions: [],
      missingFields: ['review'],
      details: 'Review object is missing or undefined. Cannot verify risk-conclusion consistency.',
      ruleVersion
    };
  }

  const missingFields: string[] = [];

  if (!review.riskLevel || typeof review.riskLevel !== 'string') {
    missingFields.push('riskLevel');
  }

  if (missingFields.length > 0) {
    return {
      moduleId: 'AVF-06',
      moduleName: 'Risk–Conclusion Verification',
      status: 'INPUT_MISSING',
      isConsistent: false,
      declaredRisk: review.riskLevel || null,
      verifiedRiskLevel: null,
      signalsChecked: [],
      materialFindings: [`Required fields missing for risk verification: ${missingFields.join(', ')}`],
      contradictions: [],
      missingFields,
      details: `Cannot verify risk conclusion consistency; missing required input fields: ${missingFields.join(', ')}.`,
      ruleVersion
    };
  }

  const declaredRisk = review.riskLevel.trim();
  const signalsChecked: AVF06SignalCheck[] = [];
  const materialFindings: string[] = [];
  const contradictions: string[] = [];

  // Risk rank mapping: Low (1) < Medium (2) < High (3) < Critical (4)
  const riskRank: Record<string, number> = {
    Low: 1,
    Medium: 2,
    High: 3,
    Critical: 4
  };

  const declaredRank = riskRank[declaredRisk] ?? 2;
  let maxImpliedRank = 1;

  // Signal 1: Security Dimension Sub-score (scores.security)
  if (review.scores && typeof review.scores.security === 'number') {
    const secScore = review.scores.security;
    let secImpliedRisk = 'Low';
    let secRank = 1;

    if (secScore < 3.5) {
      secImpliedRisk = 'Critical';
      secRank = 4;
    } else if (secScore < 5.5) {
      secImpliedRisk = 'High';
      secRank = 3;
    } else if (secScore < 7.5) {
      secImpliedRisk = 'Medium';
      secRank = 2;
    } else {
      secImpliedRisk = 'Low';
      secRank = 1;
    }

    if (secRank > maxImpliedRank) maxImpliedRank = secRank;

    const isContradiction = (secRank >= 3 && declaredRank === 1) || (secRank === 4 && declaredRank <= 2);
    if (isContradiction) {
      contradictions.push(
        `Critical Security Score Contradiction: Security sub-score (${secScore}/10) implies ${secImpliedRisk} Risk, but report declares '${declaredRisk} Risk'.`
      );
    } else if (secRank > declaredRank) {
      materialFindings.push(
        `Elevated Security Risk: Sub-score (${secScore}/10) indicates ${secImpliedRisk} Risk while headline reports '${declaredRisk} Risk'.`
      );
    }

    signalsChecked.push({
      signalName: 'Security Sub-Score',
      source: 'Evaluation Blueprint v2.4 (Dimension 3)',
      observedValue: `${secScore}/10`,
      impliedRisk: secImpliedRisk,
      isContradiction,
      notes: `Security metric evaluated at ${secScore}/10`
    });
  }

  // Signal 2: Overall Score Aggregation (overallScore)
  if (typeof review.overallScore === 'number') {
    const overall = review.overallScore;
    let scoreImpliedRisk = 'Low';
    let scoreRank = 1;

    if (overall < 40) {
      scoreImpliedRisk = 'Critical';
      scoreRank = 4;
    } else if (overall < 60) {
      scoreImpliedRisk = 'High';
      scoreRank = 3;
    } else if (overall < 75) {
      scoreImpliedRisk = 'Medium';
      scoreRank = 2;
    } else {
      scoreImpliedRisk = 'Low';
      scoreRank = 1;
    }

    if (scoreRank > maxImpliedRank) maxImpliedRank = scoreRank;

    const isContradiction = (scoreRank >= 3 && declaredRank === 1) || (scoreRank === 4 && declaredRank <= 2);
    if (isContradiction) {
      contradictions.push(
        `Overall Score Contradiction: Composite score (${overall}/100) indicates ${scoreImpliedRisk} Risk, contradicting headline '${declaredRisk} Risk'.`
      );
    }

    signalsChecked.push({
      signalName: 'Overall Composite Score',
      source: 'Aggregated F1/F2 Evaluation Score',
      observedValue: `${overall}/100`,
      impliedRisk: scoreImpliedRisk,
      isContradiction,
      notes: `Overall evaluation score ${overall}/100`
    });
  }

  // Signal 3: On-Chain Security Scan (GoPlus Security / RugCheck Bytecode Oracle)
  const hasContract = Boolean(
    review.contractAddress &&
    typeof review.contractAddress === 'string' &&
    review.contractAddress.trim().length > 4
  );

  const securityScan = options?.securityScan ||
    review.securityScan ||
    (review as any).externalSecurityScan ||
    review.proBenchmarks?.securityScan ||
    null;

  const rawScanData = securityScan?.data || securityScan;
  const hasRequiredSecurityFields = Boolean(
    rawScanData &&
    typeof rawScanData === 'object' &&
    (
      rawScanData.is_honeypot !== undefined ||
      rawScanData.isHoneypot !== undefined ||
      rawScanData.is_mintable !== undefined ||
      rawScanData.isMintable !== undefined ||
      rawScanData.is_open_source !== undefined ||
      rawScanData.isOpenSource !== undefined ||
      rawScanData.is_blacklisted !== undefined ||
      rawScanData.hasBlacklist !== undefined ||
      rawScanData.custodyRisk !== undefined ||
      rawScanData.renounced !== undefined ||
      rawScanData.owner_is_contract !== undefined ||
      rawScanData.rugcheckVerdict !== undefined ||
      rawScanData.rugcheckScore !== undefined ||
      rawScanData.source !== undefined ||
      Object.keys(rawScanData).length >= 2
    )
  );

  const hasValidScan = Boolean(
    rawScanData &&
    typeof rawScanData === 'object' &&
    !rawScanData.error &&
    !securityScan?.error &&
    hasRequiredSecurityFields
  );

  if (hasContract && hasValidScan) {
    const scanData = rawScanData;
    const isHoneypot = scanData.is_honeypot === true || scanData.is_honeypot === '1' || scanData.isHoneypot === true || scanData.cannotSell === true || scanData.cannot_sell === true;
    const isBlacklisted = scanData.is_blacklisted === true || scanData.hasBlacklist === true || scanData.owner_change_balance === true;
    const highRiskCount = Number(scanData.highRiskCount || 0);

    if (isHoneypot || isBlacklisted || highRiskCount > 0) {
      const scanRank = 4;
      if (scanRank > maxImpliedRank) maxImpliedRank = scanRank;

      const isContradiction = declaredRank <= 2;
      const exploitList = [
        isHoneypot ? 'Honeypot / Transfer Restriction' : null,
        isBlacklisted ? 'Blacklist / Balance Drain' : null,
        highRiskCount > 0 ? `${highRiskCount} Critical Security CVEs` : null
      ].filter(Boolean).join(', ');

      if (isContradiction) {
        contradictions.push(
          `Critical Security Scan Contradiction: On-chain scan (${securityScan?.source || scanData.source || 'GoPlus/RugCheck'}) identified critical exploit vector(s) (${exploitList}) while report declares '${declaredRisk} Risk'.`
        );
      } else {
        materialFindings.push(
          `Critical Security Scan Alert: Exploit flags present on-chain (${exploitList}).`
        );
      }

      signalsChecked.push({
        signalName: 'On-Chain Security Scan (GoPlus / RugCheck)',
        source: securityScan?.source || scanData.source || 'GoPlus Security / RugCheck Bytecode Oracle',
        observedValue: exploitList,
        impliedRisk: 'Critical',
        isContradiction,
        notes: `Exploit vectors detected: ${exploitList}`
      });
    } else {
      let scanImpliedRisk = 'Low';
      let scanRank = 1;

      // Check unrenounced ownership by external non-contract wallet (aligned with Gate 2 custodyRisk)
      let custodyRisk = scanData.custodyRisk ?? (securityScan as any)?.custodyRisk ?? review.securityScan?.custodyRisk;
      if (!custodyRisk) {
        if (scanData.renounced === true) {
          custodyRisk = 'RENOUNCED';
        } else if (scanData.owner_is_contract === true || scanData.owner_type === 'contract') {
          custodyRisk = 'CONTRACT_OWNER';
        } else if (scanData.owner_address || scanData.ownerAddress || scanData.is_open_source !== undefined || scanData.isOpenSource !== undefined) {
          custodyRisk = 'EOA_OWNER';
        }
      }
      const isUnrenouncedEOA = (custodyRisk === 'EOA_OWNER') || (scanData.renounced === false && scanData.owner_is_contract === false && !scanData.trust_list);
      if (isUnrenouncedEOA) {
        scanRank = Math.max(scanRank, 2);
        scanImpliedRisk = 'Medium';
        if (declaredRank === 1) {
          materialFindings.push(
            `Unrenounced Wallet Privileges: GoPlus scan reveals unrenounced ownership by a non-contract wallet (EOA), which does not support a 'Low Risk' classification without audit review.`
          );
        }
      }

      // Check active mint authority
      const isMintable = scanData.is_mintable === true || scanData.is_mintable === '1' || scanData.isMintable === true;
      if (isMintable) {
        scanRank = Math.max(scanRank, 2);
        scanImpliedRisk = 'Medium';
        if (declaredRank === 1) {
          materialFindings.push(
            `Active Mint Authority: On-chain bytecode inspection reveals mintable token supply while report declares 'Low Risk'.`
          );
        }
      }

      // Check unverified/closed source
      const isClosedSource = scanData.is_open_source === false || scanData.is_open_source === '0' || scanData.isOpenSource === false;
      if (isClosedSource) {
        scanRank = Math.max(scanRank, 3);
        scanImpliedRisk = 'High';
        if (declaredRank === 1) {
          contradictions.push(
            `Unverified Bytecode Contradiction: Smart contract source is closed-source / unverified on block explorer while report declares 'Low Risk'.`
          );
        }
      }

      if (scanRank > maxImpliedRank) maxImpliedRank = scanRank;

      signalsChecked.push({
        signalName: 'On-Chain Security Scan (GoPlus / RugCheck)',
        source: securityScan?.source || scanData.source || 'GoPlus Security / RugCheck Bytecode Oracle',
        observedValue: `Clean Scan (Honeypot: No, Mintable: ${isMintable ? 'Yes' : 'No'}, Renounced: ${scanData.renounced ? 'Yes' : 'No'})`,
        impliedRisk: scanImpliedRisk,
        isContradiction: isClosedSource && declaredRank === 1,
        notes: `Live bytecode scan via ${securityScan?.source || scanData.source || 'GoPlus Security'}`
      });
    }
  } else if (hasContract && !hasValidScan) {
    // Contract is on file, but NO verified scan attached -> Must NOT default to 'Low Risk'
    const contractRank = 2;
    if (contractRank > maxImpliedRank) maxImpliedRank = contractRank;

    if (declaredRank === 1) {
      materialFindings.push(
        `Unverified On-Chain Bytecode: Smart contract address is on file (${review.contractAddress}), but external GoPlus/RugCheck security scan results are absent. Declaring 'Low Risk' without verified on-chain bytecode scan requires auditor review.`
      );
    }

    signalsChecked.push({
      signalName: 'On-Chain Security Scan (GoPlus / RugCheck)',
      source: 'Contract Bytecode Registry',
      observedValue: review.contractAddress,
      impliedRisk: 'Medium',
      isContradiction: false,
      notes: 'Contract address on file, but live security scan was not attached to review'
    });
  } else {
    // No contract address on file
    const contractRank = 2;
    if (contractRank > maxImpliedRank) maxImpliedRank = contractRank;

    const isNativeL1 = typeof review.category === 'string' && review.category.toLowerCase().includes('layer 1');
    if (declaredRank === 1 && !isNativeL1) {
      materialFindings.push(
        `Unanchored Deployment: No verifiable smart contract address on file. Declaring 'Low Risk' without on-chain bytecode verification requires audit review.`
      );
    }

    signalsChecked.push({
      signalName: 'On-Chain Security Scan (GoPlus / RugCheck)',
      source: 'Contract Bytecode Registry',
      observedValue: 'NONE_ON_FILE',
      impliedRisk: 'Medium',
      isContradiction: false,
      notes: 'No contract address or on-chain scan supplied'
    });
  }

  // Signal 4: Symbolic Execution Benchmark Vectors (proBenchmarks)
  if (review.proBenchmarks?.symbolicExecutionMatrix) {
    const matrix = review.proBenchmarks.symbolicExecutionMatrix;
    const reentrancyFlag = matrix.reentrancyVector === 'FLAGGED';
    const flashLoanFlag = matrix.flashLoanDrainCascade === 'FLAGGED';
    const proxyAdminFlag = matrix.proxyAdminLock === 'FLAGGED';

    if (reentrancyFlag || flashLoanFlag || proxyAdminFlag) {
      const flaggedVectors = [
        reentrancyFlag ? 'Reentrancy Vulnerability' : null,
        flashLoanFlag ? 'Flash Loan Drain Cascade' : null,
        proxyAdminFlag ? 'Proxy Admin Lock' : null
      ].filter(Boolean).join(', ');

      const symImpliedRisk = (reentrancyFlag || flashLoanFlag) ? 'Critical' : 'High';
      const symRank = (reentrancyFlag || flashLoanFlag) ? 4 : 3;

      if (symRank > maxImpliedRank) maxImpliedRank = symRank;

      const isContradiction = declaredRank <= 2;
      if (isContradiction) {
        contradictions.push(
          `Symbolic Threat Contradiction: Active critical vulnerability flags detected (${flaggedVectors}) while stated risk is '${declaredRisk}'.`
        );
      } else {
        materialFindings.push(
          `Flagged Symbolic Vectors: ${flaggedVectors} observed in threat matrix.`
        );
      }

      signalsChecked.push({
        signalName: 'Symbolic Threat Matrix',
        source: 'Automated Symbolic Execution Engine',
        observedValue: flaggedVectors,
        impliedRisk: symImpliedRisk,
        isContradiction,
        notes: `Flagged threat vectors detected: ${flaggedVectors}`
      });
    } else {
      signalsChecked.push({
        signalName: 'Symbolic Threat Matrix',
        source: 'Automated Symbolic Execution Engine',
        observedValue: 'ALL_PASSED',
        impliedRisk: 'Low',
        isContradiction: false,
        notes: 'Reentrancy, flash loan cascade, and proxy admin vectors all passed.'
      });
    }
  }

  // Signal 5: Category-Level Risk Baseline
  if (review.category && typeof review.category === 'string') {
    const lowerCat = review.category.toLowerCase();
    if (lowerCat.includes('meme') || lowerCat.includes('speculative')) {
      const catImpliedRisk = 'High';
      const catRank = 3;

      if (catRank > maxImpliedRank) maxImpliedRank = catRank;

      const isContradiction = declaredRank === 1;
      if (isContradiction) {
        contradictions.push(
          `Speculative Asset Contradiction: Protocol is categorized as '${review.category}', but riskLevel is declared as '${declaredRisk}'. Speculative assets cannot be classified as Low Risk.`
        );
      } else if (declaredRank === 2) {
        materialFindings.push(
          `Category Baseline Note: Speculative/Memecoin protocols carry intrinsic high volatility.`
        );
      }

      signalsChecked.push({
        signalName: 'Category Speculative Baseline',
        source: 'Taxonomy Risk Constraints',
        observedValue: review.category,
        impliedRisk: catImpliedRisk,
        isContradiction,
        notes: `Asset taxonomy: ${review.category}`
      });
    }
  }

  // Inverse lookup for verified risk level
  const rankToRisk: Record<number, string> = {
    1: 'Low',
    2: 'Medium',
    3: 'High',
    4: 'Critical'
  };

  const verifiedRiskLevel = rankToRisk[maxImpliedRank] || 'Medium';

  let status: AVF06Status = 'CONSISTENT';
  let isConsistent = true;

  if (contradictions.length > 0) {
    status = 'CONFLICT';
    isConsistent = false;
  } else if (materialFindings.length > 0 || maxImpliedRank > declaredRank) {
    status = 'REQUIRES_REVIEW';
    isConsistent = false;
  } else {
    status = 'CONSISTENT';
    isConsistent = true;
  }

  let details = '';
  if (status === 'CONSISTENT') {
    if (declaredRisk && verifiedRiskLevel && declaredRisk !== verifiedRiskLevel) {
      details = `CONSISTENT (conservative): Declared [${declaredRisk}] is stricter than signal-implied [${verifiedRiskLevel}] — no material contradiction.`;
    } else {
      details = `Risk-Conclusion CONSISTENT: Declared '${declaredRisk} Risk' aligns with verified security signals (implied level: ${verifiedRiskLevel} Risk, ${signalsChecked.length} signals verified).`;
    }
  } else if (status === 'CONFLICT') {
    details = `Risk-Conclusion CONFLICT DETECTED: Declared '${declaredRisk} Risk' materially contradicts verified signals (verified: ${verifiedRiskLevel} Risk). Contradictions: ${contradictions.join(' ')}`;
  } else {
    details = `Risk-Conclusion REQUIRES REVIEW: Declared '${declaredRisk} Risk' diverges from verified implied risk level '${verifiedRiskLevel} Risk'. Findings: ${materialFindings.join(' ')}`;
  }

  return {
    moduleId: 'AVF-06',
    moduleName: 'Risk–Conclusion Verification',
    status,
    isConsistent,
    declaredRisk,
    verifiedRiskLevel,
    signalsChecked,
    materialFindings,
    contradictions,
    missingFields: [],
    details,
    ruleVersion
  };
}

/* =========================================================================
   F3 Central Orchestrator (AVF v2 Pipeline Execution)
   ========================================================================= */

export interface F3ModulesResult {
  avf01Classification: AVF01ClassificationResult;
  avf02Evidence: AVF02EvidenceResult;
  avf03Methodology: AVF03MethodologyResult;
  avf04Scenarios: AVF04ScenarioResult;
  avf05Score: AVF05ScoreVerificationResult;
  avf06RiskConclusion: AVF06RiskConclusionResult;
  avf07Confidence: AVF07ConfidenceResult;
  avf08Traceability: AVF08TraceabilityResult;
}

/**
 * Public projection of AVF-05 without internal Grade / Risk leaks
 */
export interface PublicAVF05ScoreResult {
  moduleId: 'AVF-05';
  moduleName: 'Score & Weight Verification';
  status: AVF05Status;
  isVerified: boolean;
  weightsApplied: CategoryWeights;
  tolerance: number;
  missingFields: string[];
  details: string;
}

/**
 * Public projection of AVF-06 focusing purely on factual security findings and on-chain telemetry
 */
export interface PublicAVF06SecurityResult {
  moduleId: 'AVF-06';
  moduleName: 'Security & Integrity Verification';
  status: AVF06Status;
  isConsistent: boolean;
  signalsChecked: {
    signalName: string;
    source: string;
    observedValue: any;
    isContradiction: boolean;
    notes?: string;
  }[];
  materialFindings: string[];
  contradictions: string[];
  missingFields: string[];
  details: string;
  ruleVersion: string;
}

/**
 * Public projection of AVF-08 Traceability without internal Grade / Risk leaks
 */
export interface PublicAVF08TraceabilityResult {
  moduleId: 'AVF-08';
  moduleName: 'Traceability & Integrity Verification';
  status: AVF08Status;
  isVerified: boolean;
  conclusion: {
    verdict: string;
  };
  hash: string | null;
  signature: string | null;
  publicKey: string | null;
  algorithm: 'Ed25519' | 'ECDSA-P256' | 'NONE';
  missingFields: string[];
  details: string;
}

export interface PublicF3ModulesResult {
  avf01Classification: AVF01ClassificationResult;
  avf02Evidence: AVF02EvidenceResult;
  avf03Methodology: AVF03MethodologyResult;
  avf04Scenarios: AVF04ScenarioResult;
  avf05Score: PublicAVF05ScoreResult;
  avf06Security: PublicAVF06SecurityResult;
  avf07Confidence: AVF07ConfidenceResult;
  avf08Traceability: PublicAVF08TraceabilityResult;
}

export interface PublicF3VerificationResult {
  framework: string;
  ruleVersion: string;
  timestamp: string;
  verifiedAt: string;
  overallStatus: F3FinalVerificationStatus;
  tripartiteCoreState?: string;
  verificationPassed: boolean;
  isVerified: boolean;
  overallConfidence: number;
  confidence: {
    overall: number;
    overallPct: number;
    breakdown: AVF07ConfidenceBreakdown;
  };
  modules: PublicF3ModulesResult;
  discrepancies: string[];
  missingInputs: string[];
  summary: string;
  adminOverride?: AdminOverrideLog;
}

/**
 * Deterministically projects a full internal F3VerificationResult into the public report shape.
 * Ensures zero Grade, Risk, or internal score leaks reach public consumers.
 */
export function projectToPublicF3Verification(
  internal: F3VerificationResult
): PublicF3VerificationResult {
  return {
    framework: internal.framework,
    ruleVersion: internal.ruleVersion,
    timestamp: internal.timestamp,
    verifiedAt: internal.verifiedAt,
    overallStatus: internal.overallStatus,
    tripartiteCoreState: internal.tripartiteCoreState || internal.overallStatus,
    verificationPassed: internal.verificationPassed,
    isVerified: internal.isVerified,
    overallConfidence: internal.overallConfidence,
    confidence: internal.confidence,
    adminOverride: internal.adminOverride,
    modules: {
      avf01Classification: internal.modules.avf01Classification,
      avf02Evidence: internal.modules.avf02Evidence,
      avf03Methodology: internal.modules.avf03Methodology,
      avf04Scenarios: internal.modules.avf04Scenarios,
      avf05Score: {
        moduleId: 'AVF-05',
        moduleName: 'Score & Weight Verification',
        status: internal.modules.avf05Score.status,
        isVerified: internal.modules.avf05Score.isVerified,
        weightsApplied: internal.modules.avf05Score.weightsApplied,
        tolerance: internal.modules.avf05Score.tolerance,
        missingFields: internal.modules.avf05Score.missingFields,
        details: internal.modules.avf05Score.isVerified
          ? 'Mathematical weights and score aggregation independently verified against the canonical Evaluation Blueprint specification.'
          : internal.modules.avf05Score.details
      },
      avf06Security: {
        moduleId: 'AVF-06',
        moduleName: 'Security & Integrity Verification',
        status: internal.modules.avf06RiskConclusion.status,
        isConsistent: internal.modules.avf06RiskConclusion.isConsistent,
        signalsChecked: internal.modules.avf06RiskConclusion.signalsChecked.map(s => ({
          signalName: s.signalName,
          source: s.source,
          observedValue: s.observedValue,
          isContradiction: s.isContradiction,
          notes: s.notes
        })),
        materialFindings: internal.modules.avf06RiskConclusion.materialFindings,
        contradictions: internal.modules.avf06RiskConclusion.contradictions,
        missingFields: internal.modules.avf06RiskConclusion.missingFields,
        details: internal.modules.avf06RiskConclusion.details,
        ruleVersion: internal.modules.avf06RiskConclusion.ruleVersion
      },
      avf07Confidence: internal.modules.avf07Confidence,
      avf08Traceability: {
        moduleId: 'AVF-08',
        moduleName: 'Traceability & Integrity Verification',
        status: internal.modules.avf08Traceability.status,
        isVerified: internal.modules.avf08Traceability.isVerified,
        conclusion: {
          verdict: internal.modules.avf08Traceability.traceabilityChain?.conclusion?.verdict || ''
        },
        hash: internal.modules.avf08Traceability.computedHash,
        signature: internal.modules.avf08Traceability.signature?.signature || null,
        publicKey: internal.modules.avf08Traceability.signature?.publicKey || null,
        algorithm: internal.modules.avf08Traceability.signature?.algorithm || 'NONE',
        missingFields: internal.modules.avf08Traceability.missingFields,
        details: internal.modules.avf08Traceability.details
      }
    },
    discrepancies: internal.discrepancies,
    missingInputs: internal.missingInputs,
    summary: internal.summary
  };
}

/**
 * Deterministically projects a full CryptoReview object into the public report shape.
 * Completely strips internal Grade, Risk Level, overallScore, scores dimensions, and internal AVF scoring details.
 */
export function projectToPublicCryptoReviewReport(
  review: CryptoReview
): PublicCryptoReviewReport {
  return {
    id: review.id,
    name: review.name,
    symbol: review.symbol,
    category: review.category,
    contractAddress: review.contractAddress,
    chainId: review.chainId,
    verdict: review.verdict,
    summary: review.summary,
    pros: review.pros || [],
    cons: review.cons || [],
    createdAt: review.createdAt,
    author: review.author,
    logoUrl: review.logoUrl,
    livePrice: review.livePrice,
    liveChange24h: review.liveChange24h,
    liveMarketCap: review.liveMarketCap,
    liveVolume24h: review.liveVolume24h,
    circulatingSupply: review.circulatingSupply,
    totalSupply: review.totalSupply,
    maxSupply: review.maxSupply,
    realTvl: review.realTvl,
    securityScan: review.securityScan,
    citations: review.citations,
    dataSources: review.dataSources,
    confidenceScore: review.confidenceScore,
    confidenceLevel: review.confidenceLevel,
    multiSourceConvergence: review.multiSourceConvergence,
    publishApproved: (review as any).publishApproved,
    adminOverride: (review as any).adminOverride || (review.f3Verification as any)?.adminOverride,
    f3Verification: review.f3Verification
      ? projectToPublicF3Verification(review.f3Verification)
      : undefined,
    auditSignature: review.auditSignature
  };
}

export interface F3VerificationResult {
  framework: string;
  ruleVersion: string;
  timestamp: string;
  verifiedAt: string;
  overallStatus: F3FinalVerificationStatus;
  tripartiteCoreState?: string;
  verificationPassed: boolean;
  isVerified: boolean;
  overallConfidence: number; // 0.0 to 1.0 (from AVF-07)
  confidence: {
    overall: number; // 0.0 to 1.0
    overallPct: number; // 0 to 100
    breakdown: AVF07ConfidenceBreakdown;
  };
  modules: F3ModulesResult;
  discrepancies: string[];
  missingInputs: string[];
  summary: string;
  adminOverride?: AdminOverrideLog;
}

export interface F3VerificationOptions {
  coingeckoCategories?: string[] | null;
  securityScan?: any | null;
  citations?: Record<string, string> | null;
  activeOverride?: AdminOverrideLog | null;
  avfLoopResult?: {
    totalRounds?: number;
    finalCompositeDelta?: number;
    equilibriumAchieved?: boolean;
    rounds?: any[];
  } | null;
  tolerance?: number;
}

/**
 * F3 Central Verification Orchestrator (runF3Verification)
 * 
 * Sits as the deterministic third stage of the tripartite core:
 * F1 (Candidate Engine) -> F2 (Independent Reviewer Convergence) -> F3 (Verification Layer)
 * 
 * Pipeline Execution Dependency Order:
 * 1. AVF-01 (Classification Verification)
 * 2. AVF-02 (Data & Evidence Verification)
 * 3. AVF-05 (Score & Weight Verification)
 * 4. AVF-03 (Methodology Verification - consumes AVF-05 output)
 * 5. AVF-04 (Scenario & Simulation Verification)
 * 6. AVF-06 (Risk-Conclusion Verification)
 * 7. AVF-07 (Confidence & Uncertainty - consumes AVF-01, AVF-02, AVF-04, AVF-06 outputs)
 * 8. AVF-08 (Traceability & Integrity Verification)
 * 
 * Final State Rules:
 * - FAILED: One or more material integrity, calculation, methodology, or traceability conditions fail
 *   (AVF-05 discrepancy, AVF-03 discrepancy, AVF-08 hash/signature failure, AVF-06 conflict, or AVF-01 misclassified).
 * - INPUT_MISSING: Review is null/undefined or core required evaluation fields are absent.
 * - CONDITIONAL: Assessment is usable, but material evidence or verification limitations remain
 *   (e.g., unsigned report, unexecuted narrative scenarios, model-generated text without external citations).
 * - VERIFIED: All applicable modules passed defined verification rules with complete evidence backing.
 * 
 * Constraint: 100% deterministic, zero AI/LLM calls, no estimation, no mock/random data.
 */
/**
 * Evaluates whether an assessment draft has satisfied the strict 95% F2 Gate.
 * F3 execution is strictly permitted ONLY when Phase 2 (F2) Re-Control has been
 * executed and achieved qualityScorePct >= 95.0% and status === 'PASS'.
 */
export function isF2GatePassed(review?: Partial<CryptoReview> | null): boolean {
  if (!review?.phaseTwoReControl) return false;
  const f2 = review.phaseTwoReControl;
  const effectiveQualityScore = typeof f2.qualityScorePct === 'number' ? f2.qualityScorePct : f2.overallScorePct;
  return typeof effectiveQualityScore === 'number' && effectiveQualityScore >= 95.0 && f2.status === 'PASS';
}

function runF3Verification(
  review?: Partial<CryptoReview> | null,
  optionsOrCategories?: F3VerificationOptions | string[] | null,
  optionalAvfLoopResult?: any | null
): F3VerificationResult {
  // --- STRICT SERVER-SIDE 95% F2 GATE ENFORCEMENT ---
  // F3 may execute ONLY when the existing F2/Phase-2 quality score is >= 95% and Gate 3 passed.
  // No direct or indirect call to runF3Verification() may occur for an assessment whose
  // F2/Phase-2 quality score is <95% or whose F2 stage has not yet been executed.
  const f2Report = review?.phaseTwoReControl;
  const f2Score = typeof f2Report?.qualityScorePct === 'number' ? f2Report.qualityScorePct : f2Report?.overallScorePct;
  const isF2Passed = Boolean(f2Report && typeof f2Score === 'number' && f2Score >= 95.0 && f2Report.status === 'PASS');

  let activeOverride = review?.adminOverride || null;
  if (!activeOverride && optionsOrCategories && typeof optionsOrCategories === 'object' && !Array.isArray(optionsOrCategories)) {
    activeOverride = (optionsOrCategories as any).activeOverride || null;
  }

  if (!isF2Passed && !activeOverride) {
    const reason = !f2Report 
      ? "Phase 2 (F2) Re-Control has not yet been executed (Order remains PENDING_F2 / AWAITING_PHASE_2)"
      : `Phase 2 (F2) quality score is ${f2Score}% (< 95.0% threshold) - PENDING_REGENERATION`;
    throw new Error(
      `[STRICT F3 95% GATE BLOCKED] F3 deterministic verification may execute ONLY when Phase 2 (F2) score is >= 95%. Blocked reason: ${reason}.`
    );
  }

  const verifiedAt = new Date().toISOString();
  const ruleVersion = CRL_VERSION_MANIFEST.combinedVersionString;
  const framework = `Algorithmic Verification Framework (${CRL_VERSION_MANIFEST.avfVersion} / ${CRL_VERSION_MANIFEST.blueprintVersion})`;

  // Parse optional secondary arguments safely
  let coingeckoCategories: string[] | null = null;
  let securityScan: any = null;
  let citations: Record<string, string> | null = null;
  let avfLoopResult: any = null;
  let tolerance = 0.5;

  if (Array.isArray(optionsOrCategories)) {
    coingeckoCategories = optionsOrCategories;
    avfLoopResult = optionalAvfLoopResult || null;
  } else if (optionsOrCategories && typeof optionsOrCategories === 'object') {
    coingeckoCategories = optionsOrCategories.coingeckoCategories || null;
    securityScan = optionsOrCategories.securityScan || null;
    citations = optionsOrCategories.citations || null;
    avfLoopResult = optionsOrCategories.avfLoopResult || null;
    if (typeof optionsOrCategories.tolerance === 'number') {
      tolerance = optionsOrCategories.tolerance;
    }
  }

  // Extract fallback securityScan and citations from review if not explicitly provided in options
  if (!coingeckoCategories && review?.coingeckoCategories) {
    coingeckoCategories = review.coingeckoCategories;
  }
  if (!securityScan && review) {
    securityScan = review.securityScan || (review as any).externalSecurityScan || review.proBenchmarks?.securityScan || null;
  }
  if (!citations && review) {
    citations = review.citations || null;
  }

  // --- Step 1: AVF-01 Classification Verification ---
  const avf01 = verifyAVF01Classification(review, coingeckoCategories);

  // --- Step 2: AVF-02 Data & Evidence Verification ---
  const avf02 = verifyAVF02Evidence(review, { securityScan, citations });

  // --- Step 3: AVF-05 Score & Weight Integrity Verification ---
  const avf05 = verifyAVF05ScoreAndWeights(review, tolerance);

  // --- Step 4: AVF-03 Methodology Verification (depends on AVF-05 output) ---
  const avf03 = verifyAVF03Methodology(avf05);

  // --- Step 5: AVF-04 Scenario & Simulation Verification ---
  const avf04 = verifyAVF04Scenarios(review, avfLoopResult);

  // --- Step 6: AVF-06 Risk-Conclusion Verification ---
  const avf06 = verifyAVF06RiskConclusion(review, { securityScan });

  // --- Step 7: AVF-07 Confidence & Uncertainty Verification (aggregates AVF-01, AVF-02, AVF-04, AVF-06) ---
  const avf07 = verifyAVF07Confidence(avf01, avf02, avf04, avf06);

  // --- Step 8: AVF-08 Traceability & Integrity Verification ---
  const avf08 = verifyAVF08Traceability(review);

  // --- Discrepancies & Contradictions Collection ---
  const discrepancies: string[] = [];

  if (avf05.status === 'DISCREPANCY_FOUND' && avf05.discrepancy !== null) {
    discrepancies.push(`Score Aggregation Discrepancy (AVF-05): Reported ${avf05.reportedScore}, recomputed ${avf05.recomputedScore} (Δ = ${avf05.discrepancy} pts).`);
  }

  if (avf03.status === 'DISCREPANCY_FOUND') {
    discrepancies.push(`Methodology Discrepancy (AVF-03): ${avf03.details}`);
  }

  if (avf08.status === 'HASH_MISMATCH') {
    discrepancies.push(`Cryptographic Integrity Failure (AVF-08): Computed SHA-256 digest does not match signed report record.`);
  } else if (avf08.status === 'SIGNATURE_INVALID') {
    discrepancies.push(`Signature Verification Failure (AVF-08): Ed25519 signature is invalid for public key.`);
  }

  if (avf06.status === 'CONFLICT') {
    for (const c of avf06.contradictions) {
      discrepancies.push(`Risk Contradiction (AVF-06): ${c}`);
    }
  }

  if (avf01.status === 'MISCLASSIFIED') {
    discrepancies.push(`Classification Misalignment (AVF-01): Assigned '${avf01.assignedCategory}' contradicts external taxonomy signals.`);
  }

  // --- Missing Inputs Collection (Deduplicated) ---
  const missingInputsSet = new Set<string>();

  const allMissingSources = [
    ...(avf01.missingFields || []),
    ...(avf02.missingFields || []),
    ...(avf03.missingFields || []),
    ...(avf04.missingFields || []),
    ...(avf05.missingFields || []),
    ...(avf06.missingFields || []),
    ...(avf07.missingModules || []),
    ...(avf08.missingFields || [])
  ];

  for (const field of allMissingSources) {
    if (field) missingInputsSet.add(field);
  }

  const missingInputs = Array.from(missingInputsSet);

  // --- Deterministic Overall Status Determination ---
  let overallStatus: F3FinalVerificationStatus = 'VERIFIED_WITH_WARNINGS';
  let isVerified = false;

  // 1. Material Discrepancies / Failures
  const hasCriticalDiscrepancy = (
    avf05.status === 'DISCREPANCY_FOUND' ||
    avf03.status === 'DISCREPANCY_FOUND'
  );

  const hasCriticalFailure = (
    avf08.status === 'HASH_MISMATCH' ||
    avf08.status === 'SIGNATURE_INVALID' ||
    avf06.status === 'CONFLICT' ||
    avf01.status === 'MISCLASSIFIED'
  );

  // 2. Core Input Absence Checks (Applies only when no material failure exists)
  const isCoreInputMissing = (
    !review ||
    avf05.status === 'INPUT_MISSING' ||
    avf06.status === 'INPUT_MISSING' ||
    avf04.status === 'INPUT_MISSING' ||
    (avf08.status === 'INPUT_MISSING' && avf08.missingFields.some(f => ['scores', 'verdict', 'grade', 'createdAt'].includes(f)))
  );

  if (hasCriticalDiscrepancy) {
    overallStatus = 'DISCREPANCY_FOUND';
    isVerified = false;
  } else if (hasCriticalFailure) {
    overallStatus = 'FAILED';
    isVerified = false;
  } else if (isCoreInputMissing) {
    overallStatus = 'INSUFFICIENT_DATA';
    isVerified = false;
  } else {
    // 3. Check if all required and material verification checks pass
    const allMaterialChecksPass = (
      avf05.status === 'VERIFIED' &&
      avf03.status === 'VERIFIED' &&
      avf06.status === 'CONSISTENT' &&
      avf08.status === 'VERIFIED' &&
      (avf01.status === 'VERIFIED' || avf01.status === 'PARTIALLY_VERIFIED') &&
      avf04.status === 'VERIFIED' &&
      avf02.status !== 'CRITICAL_GAP_DETECTED'
    );

    if (allMaterialChecksPass) {
      overallStatus = 'VERIFIED';
      isVerified = true;
    } else {
      // 4. Non-critical warnings (e.g. unsigned report, review needed on assumptions, critical data gaps)
      overallStatus = 'VERIFIED_WITH_WARNINGS';
      isVerified = false;
    }
  }

  const overallConfidenceNum = avf07.confidence.overallConfidence;
  const overallConfidencePct = Math.round(overallConfidenceNum * 100);

  // Summary message formulation
  let summary = '';
  if (overallStatus === 'VERIFIED') {
    summary = `F3 Verification VERIFIED (${overallConfidencePct}% confidence): Score calculations, weighting methodology, protocol classification, and risk conclusions passed deterministic verification.`;
  } else if (overallStatus === 'DISCREPANCY_FOUND') {
    summary = `F3 Verification DISCREPANCY_FOUND: Detected mathematical score or methodology divergence (${discrepancies.join(' | ')})`;
  } else if (overallStatus === 'FAILED') {
    summary = `F3 Verification FAILED: Detected ${discrepancies.length} material integrity failure(s): ${discrepancies.join(' | ')}`;
  } else if (overallStatus === 'INSUFFICIENT_DATA') {
    summary = `F3 Verification INSUFFICIENT_DATA: Incomplete input data supplied to verification engine (${missingInputs.join(', ')}).`;
  } else {
    const caveats: string[] = [];
    if (avf01.status === 'INPUT_MISSING') caveats.push('external classification inputs missing');
    if (avf08.status === 'UNSIGNED') caveats.push('report unsigned with Ed25519');
    if (avf02.status === 'CONDITIONAL' || avf02.status === 'CRITICAL_GAP_DETECTED') {
      caveats.push(`evidence coverage is ${Math.round(avf02.evidenceCoveragePct * 100)}% (qualitative text unverified)`);
    }
    if (avf04.status === 'UNEXECUTED' || avf04.status === 'PARTIALLY_EXECUTED') {
      caveats.push('secondary stress tests narrative-only');
    }
    if (avf06.status === 'REQUIRES_REVIEW') caveats.push('risk conclusion requires auditor review');

    summary = `F3 Verification VERIFIED_WITH_WARNINGS (${overallConfidencePct}% confidence): Primary scores and calculations align, but assessment operates with explicit limitations (${caveats.join('; ')}).`;
  }

  const verificationPassed = overallStatus === 'VERIFIED';

  return {
    framework,
    ruleVersion,
    timestamp: verifiedAt,
    verifiedAt,
    overallStatus,
    verificationPassed,
    isVerified,
    overallConfidence: overallConfidenceNum,
    confidence: {
      overall: overallConfidenceNum,
      overallPct: overallConfidencePct,
      breakdown: avf07.confidence
    },
    modules: {
      avf01Classification: avf01,
      avf02Evidence: avf02,
      avf03Methodology: avf03,
      avf04Scenarios: avf04,
      avf05Score: avf05,
      avf06RiskConclusion: avf06,
      avf07Confidence: avf07,
      avf08Traceability: avf08
    },
    discrepancies,
    missingInputs,
    summary,
    adminOverride: activeOverride || review?.adminOverride || review?.f3Verification?.adminOverride
  };
}

export { runF3Verification, runF3Verification as runF3VerificationPipeline };

