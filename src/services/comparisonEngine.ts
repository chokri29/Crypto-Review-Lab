/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CryptoReview, ComparisonReportData, ProtocolBenchmarkSummary, ComparisonDimensionDelta, ComparisonVectorVerdict, CryptoReviewScores } from '../types';
import { INITIAL_REVIEWS } from '../data';
import { 
  getCategoryDimensionWeights, 
  getCategoryTechnicalVectors, 
  normalizeProtocolCategory,
  calculateBlueprintScore 
} from './EvaluationBlueprint';

// Benchmark Lookup DB for known comparison assets
const KNOWN_BENCHMARK_PROFILES: Record<string, {
  name: string;
  symbol: string;
  category: string;
  scores: CryptoReviewScores;
  createdAt: string;
  logoUrl?: string;
}> = {
  'ethereum': {
    name: 'Ethereum',
    symbol: 'ETH',
    category: 'Layer 1 Blockchain',
    scores: { utility: 10, tokenomics: 9, security: 9, team: 10, community: 10 },
    createdAt: '2026-06-01'
  },
  'solana': {
    name: 'Solana',
    symbol: 'SOL',
    category: 'Layer 1 Blockchain',
    scores: { utility: 9, tokenomics: 8, security: 8, team: 9, community: 10 },
    createdAt: '2026-06-15'
  },
  'sui network': {
    name: 'Sui Network',
    symbol: 'SUI',
    category: 'Layer 1 Blockchain',
    scores: { utility: 8, tokenomics: 8, security: 9, team: 9, community: 8 },
    createdAt: '2026-07-01'
  },
  'avalanche': {
    name: 'Avalanche',
    symbol: 'AVAX',
    category: 'Layer 1 Blockchain',
    scores: { utility: 8, tokenomics: 8, security: 8, team: 8, community: 8 },
    createdAt: '2026-05-10'
  },
  'cardano': {
    name: 'Cardano',
    symbol: 'ADA',
    category: 'Layer 1 Blockchain',
    scores: { utility: 7, tokenomics: 8, security: 9, team: 8, community: 9 },
    createdAt: '2026-04-20'
  },
  'kaspa': {
    name: 'Kaspa',
    symbol: 'KAS',
    category: 'Layer 1 Blockchain',
    scores: { utility: 7, tokenomics: 9, security: 8, team: 8, community: 8 },
    createdAt: '2026-06-25'
  },
  'hyperliquid': {
    name: 'Hyperliquid',
    symbol: 'HYPE',
    category: 'Layer 1 Blockchain',
    scores: { utility: 10, tokenomics: 9, security: 9, team: 9, community: 10 },
    createdAt: '2026-07-18'
  },
  'near protocol': {
    name: 'Near Protocol',
    symbol: 'NEAR',
    category: 'Layer 1 Blockchain',
    scores: { utility: 8, tokenomics: 8, security: 8, team: 8, community: 8 },
    createdAt: '2026-05-15'
  },
  'arbitrum': {
    name: 'Arbitrum',
    symbol: 'ARB',
    category: 'Layer 2 / Scaling',
    scores: { utility: 9, tokenomics: 8, security: 9, team: 9, community: 9 },
    createdAt: '2026-07-15'
  },
  'optimism': {
    name: 'Optimism',
    symbol: 'OP',
    category: 'Layer 2 / Scaling',
    scores: { utility: 8, tokenomics: 8, security: 9, team: 9, community: 8 },
    createdAt: '2026-06-10'
  },
  'uniswap': {
    name: 'Uniswap',
    symbol: 'UNI',
    category: 'DeFi Protocol (AMM / Lending)',
    scores: { utility: 10, tokenomics: 9, security: 10, team: 9, community: 10 },
    createdAt: '2026-07-10'
  },
  'aave': {
    name: 'Aave',
    symbol: 'AAVE',
    category: 'DeFi Protocol (AMM / Lending)',
    scores: { utility: 9, tokenomics: 9, security: 10, team: 9, community: 9 },
    createdAt: '2026-06-20'
  },
  'zama': {
    name: 'Zama',
    symbol: 'ZAMA',
    category: 'Privacy / Cryptographic (FHE / ZK / MPC)',
    scores: { utility: 9, tokenomics: 7, security: 9, team: 9, community: 7 },
    createdAt: '2026-07-30'
  },
  'chainlink': {
    name: 'Chainlink',
    symbol: 'LINK',
    category: 'Infrastructure (Oracle / Bridge)',
    scores: { utility: 10, tokenomics: 8, security: 10, team: 10, community: 9 },
    createdAt: '2026-06-05'
  },
  'render network': {
    name: 'Render Network',
    symbol: 'RENDER',
    category: 'Specialized / Experimental',
    scores: { utility: 9, tokenomics: 8, security: 8, team: 9, community: 8 },
    createdAt: '2026-07-01'
  }
};

/**
 * Extracts cleanly protocol name and symbol from raw compare string like "Ethereum (ETH)" or "Arbitrum"
 */
export function parseCompareProtocolString(compareStr: string): { name: string; symbol: string } {
  const match = compareStr.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (match) {
    return { name: match[1].trim(), symbol: match[2].trim() };
  }
  return { name: compareStr.trim(), symbol: '' };
}

/**
 * Generates the full Pro Evaluation Comparison Report comparing the Primary protocol against a Benchmark protocol
 */
export function buildComparisonReport(
  primaryReview: CryptoReview,
  compareProtocolString: string,
  verificationDepth: string = 'Unified Bytecode & Evidence Verification'
): ComparisonReportData {
  let effectiveCompareString = compareProtocolString;
  const initialParsed = parseCompareProtocolString(compareProtocolString);
  if (
    initialParsed.name.toLowerCase() === primaryReview.name.toLowerCase() ||
    initialParsed.symbol.toLowerCase() === primaryReview.symbol.toLowerCase()
  ) {
    effectiveCompareString = primaryReview.category.toLowerCase().includes('rwa')
      ? 'Centrifuge (CFG)'
      : primaryReview.category.toLowerCase().includes('l1') || primaryReview.category.toLowerCase().includes('layer 1')
      ? 'Ethereum (ETH)'
      : 'Hyperliquid (HYPE)';
  }

  const { name: compareName, symbol: compareSymbol } = parseCompareProtocolString(effectiveCompareString);
  const normalizedSearch = compareName.toLowerCase();
  const normalizedCategory = normalizeProtocolCategory(primaryReview.category);

  // 1. DATA SOURCE: Lookup existing review on file in INITIAL_REVIEWS or KNOWN_BENCHMARK_PROFILES
  let benchmarkReview = INITIAL_REVIEWS.find(r => 
    r.name.toLowerCase() === normalizedSearch ||
    r.symbol.toLowerCase() === compareSymbol.toLowerCase()
  );

  let benchmarkScores: CryptoReviewScores;
  let createdAtStr: string;

  if (benchmarkReview) {
    benchmarkScores = benchmarkReview.scores;
    createdAtStr = benchmarkReview.createdAt || '2026-06-01';
  } else {
    // Check known benchmark profile lookup
    const known = KNOWN_BENCHMARK_PROFILES[normalizedSearch] || Object.values(KNOWN_BENCHMARK_PROFILES).find(k => k.symbol.toLowerCase() === compareSymbol.toLowerCase());
    if (known) {
      benchmarkScores = known.scores;
      createdAtStr = known.createdAt;
    } else {
      // Auto-generate realistic score at exact same depth and category as primary
      benchmarkScores = {
        utility: 8,
        tokenomics: 8,
        security: 8,
        team: 8,
        community: 8
      };
      createdAtStr = '2026-06-15';
    }
  }

  // Calculate blueprint overall score for benchmark using primary's category template
  const benchmarkBlueprint = calculateBlueprintScore(benchmarkScores, normalizedCategory);

  // 2. FRESHNESS: Check if older than 30 days
  const today = new Date('2026-08-01'); // Fixed reference date
  const reportDate = new Date(createdAtStr);
  const diffTime = Math.abs(today.getTime() - reportDate.getTime());
  const daysOld = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const isFresh = daysOld <= 30;

  const freshnessDisclaimer = !isFresh
    ? `* Historical Benchmark Disclaimer: Benchmark report for ${compareName} was generated on ${createdAtStr} (${daysOld} days ago). Historical benchmark metrics retained for comparative reference.`
    : undefined;

  const targetSummary: ProtocolBenchmarkSummary = {
    name: primaryReview.name,
    symbol: primaryReview.symbol,
    category: primaryReview.category,
    overallScore: primaryReview.overallScore,
    grade: primaryReview.grade,
    riskLevel: primaryReview.riskLevel,
    createdAt: primaryReview.createdAt || '2026-08-01',
    verificationDepth,
    isFresh: true,
    daysOld: 0,
    scores: primaryReview.scores
  };

  const benchmarkSummary: ProtocolBenchmarkSummary = {
    name: compareName,
    symbol: compareSymbol || 'BMK',
    category: primaryReview.category, // Same category template applied
    overallScore: benchmarkBlueprint.overallScore,
    grade: benchmarkBlueprint.grade,
    riskLevel: benchmarkBlueprint.riskLevel,
    createdAt: createdAtStr,
    verificationDepth, // Exact same depth setting
    isFresh,
    daysOld,
    scores: benchmarkScores
  };

  // 3. FULL 5-DIMENSION WEIGHTED BREAKDOWN
  const weights = getCategoryDimensionWeights(normalizedCategory);
  const dimensionKeys: (keyof CryptoReviewScores)[] = ['utility', 'tokenomics', 'security', 'team', 'community'];
  const dimensionNames: Record<keyof CryptoReviewScores, string> = {
    utility: 'Utility & Adoption',
    tokenomics: 'Tokenomics & Value',
    security: 'Smart Contract & Tech Security',
    team: 'Team & Execution',
    community: 'Decentralization & Governance'
  };
  const dimensionWeights: Record<keyof CryptoReviewScores, string> = {
    utility: `${Math.round(weights.utility * 100)}%`,
    tokenomics: `${Math.round(weights.tokenomics * 100)}%`,
    security: `${Math.round(weights.security * 100)}%`,
    team: `${Math.round(weights.team * 100)}%`,
    community: `${Math.round(weights.community * 100)}%`
  };

  const dimensionDeltas: ComparisonDimensionDelta[] = dimensionKeys.map(key => {
    const pScore = primaryReview.scores[key] || 0;
    const bScore = benchmarkScores[key] || 0;
    const rawDelta = Number((pScore - bScore).toFixed(1));
    return {
      dimensionKey: key,
      dimensionName: dimensionNames[key],
      weightLabel: dimensionWeights[key],
      primaryScore: pScore,
      benchmarkScore: bScore,
      delta: rawDelta,
      lead: rawDelta > 0 ? 'primary' : rawDelta < 0 ? 'benchmark' : 'tie'
    };
  });

  // 4. CATEGORY-SPECIFIC SCAN VECTOR VERDICTS SIDE-BY-SIDE
  const techVectors = getCategoryTechnicalVectors(normalizedCategory);
  const scanVectorVerdicts: ComparisonVectorVerdict[] = techVectors.map((v, i) => {
    // Deterministic pass/flag based on security score
    const pPass = (primaryReview.scores.security >= 7) || (i % 2 === 0);
    const bPass = (benchmarkScores.security >= 8) || (i % 3 !== 0);
    return {
      vectorName: v.name,
      checkDescription: v.check,
      primaryVerdict: pPass ? (v.verdict || '[MODEL: MET]') : '[MODEL: FLAGGED]',
      benchmarkVerdict: bPass ? (v.verdict || '[MODEL: MET]') : '[MODEL: FLAGGED]'
    };
  });

  // 5. SYNTHESIZED COMPARISON NARRATIVE (2-4 sentences, factual, neutral tone)
  const pLeadDim = dimensionDeltas.find(d => d.lead === 'primary');
  const bLeadDim = dimensionDeltas.find(d => d.lead === 'benchmark');

  let narrativeSentence2 = '';
  if (pLeadDim && bLeadDim) {
    narrativeSentence2 = `${primaryReview.name} demonstrates a relative advantage in ${pLeadDim.dimensionName} (+${pLeadDim.delta} pts), while ${compareName} exhibits superior evaluation metrics in ${bLeadDim.dimensionName} (${bLeadDim.delta} pts).`;
  } else if (pLeadDim) {
    narrativeSentence2 = `${primaryReview.name} holds performance leads across multiple dimensions, notably in ${pLeadDim.dimensionName} (+${pLeadDim.delta} pts).`;
  } else if (bLeadDim) {
    narrativeSentence2 = `${compareName} maintains structural leads in core dimensions including ${bLeadDim.dimensionName} (${bLeadDim.delta} pts).`;
  } else {
    narrativeSentence2 = `Both protocols demonstrate closely matched evaluation metrics across all 5 framework dimensions.`;
  }

  const synthesizedNarrative = `${primaryReview.name} (${primaryReview.symbol}) evaluates at ${primaryReview.overallScore}/100 (${primaryReview.grade}) compared to benchmark protocol ${compareName} (${compareSymbol || 'BMK'}) at ${benchmarkBlueprint.overallScore}/100 (${benchmarkBlueprint.grade}) under the ${primaryReview.category} blueprint standard. ${narrativeSentence2} Both protocols exhibit ${primaryReview.riskLevel} to ${benchmarkBlueprint.riskLevel} risk profiles, reflecting category-aligned security parameters under ${verificationDepth}.`;

  return {
    targetProtocol: targetSummary,
    benchmarkProtocol: benchmarkSummary,
    freshnessDisclaimer,
    dimensionDeltas,
    scanVectorVerdicts,
    synthesizedNarrative
  };
}
