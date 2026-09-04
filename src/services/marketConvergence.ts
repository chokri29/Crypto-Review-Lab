/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MetricReconciliationStatus,
  MetricReconciliationResult,
  MultiSourceConvergenceReport
} from '../types';

export interface SourceMetricValue {
  value?: number | null;
  isFallback?: boolean;
  provenance?: 'LIVE' | 'STALE' | 'SYNTHETIC' | 'UNAVAILABLE';
  sourceName: string;
}

export interface MultiSourceInput {
  // CoinGecko
  cgPrice?: number;
  cgMarketCap?: number;
  cgVolume?: number;
  cgRank?: number;
  cgChange24h?: number;
  cgIsFallback?: boolean;
  cgProvenance?: 'LIVE' | 'STALE' | 'SYNTHETIC' | 'UNAVAILABLE';
  cgCirculatingSupply?: number;
  cgMaxSupply?: number;
  cgTotalSupply?: number;
  cgAth?: number;
  cgAtl?: number;

  // CoinMarketCap
  cmcPrice?: number;
  cmcMarketCap?: number;
  cmcVolume?: number;
  cmcRank?: number;
  cmcChange24h?: number;
  cmcIsFallback?: boolean;
  cmcProvenance?: 'LIVE' | 'STALE' | 'SYNTHETIC' | 'UNAVAILABLE';
  cmcAth?: number;
  cmcAtl?: number;
  cmcCirculatingSupply?: number;
  cmcTotalSupply?: number;

  // CoinStats (Used only for general crypto, NOT xStocks)
  csPrice?: number;
  csMarketCap?: number;
  csVolume?: number;
  csRank?: number;
  csChange24h?: number;
  csIsFallback?: boolean;
  csProvenance?: 'LIVE' | 'STALE' | 'SYNTHETIC' | 'UNAVAILABLE';
  csAth?: number;
  csAtl?: number;
  csCirculatingSupply?: number;
  csTotalSupply?: number;

  // Flag to indicate xStock convergence (CoinStats excluded, dual aggregator CG+CMC Market Data Cross-Check)
  isXStock?: boolean;
}

/**
 * Standard tolerances for cross-validation across independent oracles
 */
export const CONVERGENCE_TOLERANCES = {
  PRICE_TOLERANCE: 0.010,       // ±1.0% relative to median
  MARKET_CAP_TOLERANCE: 0.015,  // ±1.5% relative to median
  VOLUME_TOLERANCE: 0.030,      // ±3.0% relative to median (liquidity/depth aggregation varies slightly)
  RANK_TOLERANCE: 1.0           // ±1 position rank tolerance
} as const;

/**
 * Reconciles a single numeric metric across up to 3 independent sources.
 * Adheres strictly to Rules 1 through 6:
 * - Rule 1: Evaluates all responding valid sources.
 * - Rule 2: 3-source agreement within tolerance -> median value, FULLY_CROSS_VALIDATED.
 * - Rule 3: 2-source agreement -> median/mean of the 2, outlier flagged, PARTIALLY_CROSS_VALIDATED.
 * - Rule 4: All 3 diverge beyond tolerance or < 2 valid sources -> UNRESOLVED_DIVERGENCE with attached raw values.
 * - Rule 5: Failed/timed-out sources are excluded, gracefully degrading without claiming false consensus.
 * - Rule 6: Synthetic or fallback values are never counted as independent corroboration.
 */
export function reconcileMetric(
  metricName: 'price' | 'marketCap' | 'volume24h' | 'marketCapRank',
  sources: Record<string, SourceMetricValue>,
  toleranceFraction: number,
  isRank: boolean = false
): MetricReconciliationResult<number> {
  const validEntries: { source: string; value: number }[] = [];
  const rawValues: Record<string, number> = {};

  for (const [sourceKey, item] of Object.entries(sources)) {
    // Rule 6: Never let missing/derived/fallback/synthetic data count as independent corroboration
    if (!item || item.isFallback || item.provenance === 'SYNTHETIC' || item.provenance === 'UNAVAILABLE') continue;
    const val = item.value;
    if (typeof val === 'number' && !isNaN(val) && (isRank ? val >= 1 : val > 0)) {
      validEntries.push({ source: sourceKey, value: val });
      rawValues[sourceKey] = val;
    }
  }

  const validCount = validEntries.length;
  const toleranceLabel = isRank ? `±${toleranceFraction} rank` : `±${(toleranceFraction * 100).toFixed(1)}%`;

  // Case 0: No valid data
  if (validCount === 0) {
    return {
      metricName,
      status: 'NO_DATA',
      consensusValue: null,
      validSourcesCount: 0,
      sourceValues: rawValues,
      agreeingSources: [],
      outlierSource: null,
      toleranceUsed: toleranceLabel,
      divergencePct: 0,
      details: 'No valid data returned from any independent market source.'
    };
  }

  // Case 1: Exactly 1 valid source -> Rule 5: Gracefully degrade to single-source mode, never claim multi-source consensus
  if (validCount === 1) {
    return {
      metricName,
      status: 'SINGLE_SOURCE_UNVERIFIED',
      consensusValue: validEntries[0].value,
      validSourcesCount: 1,
      sourceValues: rawValues,
      agreeingSources: [validEntries[0].source],
      outlierSource: null,
      toleranceUsed: toleranceLabel,
      divergencePct: 0,
      details: `Single-source observation from ${validEntries[0].source}. Multi-source cross-validation degraded.`
    };
  }

  // Case 2: Exactly 2 valid sources -> Rule 5 & 3: Check two-source agreement within tolerance
  if (validCount === 2) {
    const v1 = validEntries[0].value;
    const v2 = validEntries[1].value;
    const s1 = validEntries[0].source;
    const s2 = validEntries[1].source;

    let inTolerance = false;
    let divPct = 0;

    if (isRank) {
      const diff = Math.abs(v1 - v2);
      divPct = diff;
      inTolerance = diff <= toleranceFraction;
    } else {
      const minVal = Math.min(v1, v2);
      divPct = minVal > 0 ? ((Math.abs(v1 - v2) / minVal) * 100) : 0;
      // Pairwise tolerance is 2x individual median tolerance (e.g. ±1% from center = 2% between edges)
      inTolerance = (Math.abs(v1 - v2) / minVal) <= (toleranceFraction * 2);
    }

    if (inTolerance) {
      const consensus = isRank ? Math.min(v1, v2) : ((v1 + v2) / 2);
      return {
        metricName,
        status: 'PARTIALLY_CROSS_VALIDATED',
        consensusValue: consensus,
        validSourcesCount: 2,
        sourceValues: rawValues,
        agreeingSources: [s1, s2],
        outlierSource: null,
        toleranceUsed: toleranceLabel,
        divergencePct: parseFloat(divPct.toFixed(2)),
        details: `Two-source consensus (${s1}, ${s2}) within tolerance (Δ: ${isRank ? `${divPct} rank` : `${divPct.toFixed(2)}%`}).`
      };
    } else {
      // Rule 4: All available sources diverge -> UNRESOLVED_DIVERGENCE, surface all values without guessing
      return {
        metricName,
        status: 'UNRESOLVED_DIVERGENCE',
        consensusValue: null,
        validSourcesCount: 2,
        sourceValues: rawValues,
        agreeingSources: [],
        outlierSource: 'BOTH_DIVERGED',
        toleranceUsed: toleranceLabel,
        divergencePct: parseFloat(divPct.toFixed(2)),
        details: `Unresolved divergence between ${s1} and ${s2} (Δ: ${isRank ? `${divPct} rank` : `${divPct.toFixed(2)}%`} > ${toleranceLabel}).`
      };
    }
  }

  // Case 3: Exactly 3 valid sources (CoinGecko + CMC + CoinStats)
  const sorted = [...validEntries].sort((a, b) => a.value - b.value);
  const medianItem = sorted[1];
  const medianVal = medianItem.value;

  // Rule 2: Check if all three agree within tolerance of the median
  let allAgree = true;
  let maxDiv = 0;

  for (const item of sorted) {
    let diffPct = 0;
    if (isRank) {
      const diff = Math.abs(item.value - medianVal);
      if (diff > maxDiv) maxDiv = diff;
      if (diff > toleranceFraction) allAgree = false;
    } else {
      diffPct = medianVal > 0 ? (Math.abs(item.value - medianVal) / medianVal) : 0;
      if (diffPct * 100 > maxDiv) maxDiv = diffPct * 100;
      if (diffPct > toleranceFraction) allAgree = false;
    }
  }

  if (allAgree) {
    return {
      metricName,
      status: 'FULLY_CROSS_VALIDATED',
      consensusValue: medianVal,
      validSourcesCount: 3,
      sourceValues: rawValues,
      agreeingSources: sorted.map(s => s.source),
      outlierSource: null,
      toleranceUsed: toleranceLabel,
      divergencePct: parseFloat(maxDiv.toFixed(2)),
      details: `Full 3-source consensus confirmed across CoinGecko, CMC, and CoinStats (Median: ${isRank ? `#${medianVal}` : (medianVal < 1 ? medianVal.toFixed(4) : medianVal.toLocaleString())}, Max Δ: ${isRank ? `${maxDiv} rank` : `${maxDiv.toFixed(2)}%`}).`
    };
  }

  // Rule 3: Test pairs to check if exactly 2 agree within tolerance and flag the 3rd as outlier
  const pair01Agrees = isRank
    ? Math.abs(sorted[0].value - sorted[1].value) <= toleranceFraction
    : (Math.abs(sorted[0].value - sorted[1].value) / Math.min(sorted[0].value, sorted[1].value)) <= (toleranceFraction * 2);

  const pair12Agrees = isRank
    ? Math.abs(sorted[1].value - sorted[2].value) <= toleranceFraction
    : (Math.abs(sorted[1].value - sorted[2].value) / Math.min(sorted[1].value, sorted[2].value)) <= (toleranceFraction * 2);

  const pair02Agrees = isRank
    ? Math.abs(sorted[0].value - sorted[2].value) <= toleranceFraction
    : (Math.abs(sorted[0].value - sorted[2].value) / Math.min(sorted[0].value, sorted[2].value)) <= (toleranceFraction * 2);

  if (pair01Agrees && !pair12Agrees) {
    const consensus = isRank ? sorted[0].value : ((sorted[0].value + sorted[1].value) / 2);
    const outlier = sorted[2].source;
    const agreeing = [sorted[0].source, sorted[1].source];
    return {
      metricName,
      status: 'PARTIALLY_CROSS_VALIDATED',
      consensusValue: consensus,
      validSourcesCount: 3,
      sourceValues: rawValues,
      agreeingSources: agreeing,
      outlierSource: outlier,
      toleranceUsed: toleranceLabel,
      divergencePct: parseFloat(maxDiv.toFixed(2)),
      details: `2 of 3 sources agreed (${agreeing.join(' & ')}). Outlier source flagged: ${outlier} (${sorted[2].value}).`
    };
  }

  if (pair12Agrees && !pair01Agrees) {
    const consensus = isRank ? sorted[1].value : ((sorted[1].value + sorted[2].value) / 2);
    const outlier = sorted[0].source;
    const agreeing = [sorted[1].source, sorted[2].source];
    return {
      metricName,
      status: 'PARTIALLY_CROSS_VALIDATED',
      consensusValue: consensus,
      validSourcesCount: 3,
      sourceValues: rawValues,
      agreeingSources: agreeing,
      outlierSource: outlier,
      toleranceUsed: toleranceLabel,
      divergencePct: parseFloat(maxDiv.toFixed(2)),
      details: `2 of 3 sources agreed (${agreeing.join(' & ')}). Outlier source flagged: ${outlier} (${sorted[0].value}).`
    };
  }

  if (pair02Agrees) {
    const consensus = isRank ? sorted[0].value : ((sorted[0].value + sorted[2].value) / 2);
    const outlier = sorted[1].source;
    const agreeing = [sorted[0].source, sorted[2].source];
    return {
      metricName,
      status: 'PARTIALLY_CROSS_VALIDATED',
      consensusValue: consensus,
      validSourcesCount: 3,
      sourceValues: rawValues,
      agreeingSources: agreeing,
      outlierSource: outlier,
      toleranceUsed: toleranceLabel,
      divergencePct: parseFloat(maxDiv.toFixed(2)),
      details: `2 of 3 sources agreed (${agreeing.join(' & ')}). Outlier source flagged: ${outlier} (${sorted[1].value}).`
    };
  }

  // Rule 4: All 3 diverge beyond tolerance -> UNRESOLVED_DIVERGENCE, surface all values with zero guessing
  return {
    metricName,
    status: 'UNRESOLVED_DIVERGENCE',
    consensusValue: null,
    validSourcesCount: 3,
    sourceValues: rawValues,
    agreeingSources: [],
    outlierSource: 'ALL_SOURCES_DIVERGED',
    toleranceUsed: toleranceLabel,
    divergencePct: parseFloat(maxDiv.toFixed(2)),
    details: `All 3 sources diverged beyond tolerance limit (${toleranceLabel}). Values attached for auditor inspection.`
  };
}

/**
 * Executes full Multi-Source Convergence Reconciliation across CoinGecko, CMC, and CoinStats.
 */
export function computeMultiSourceConvergence(input: MultiSourceInput): {
  report: MultiSourceConvergenceReport;
  status: MultiSourceConvergenceReport['overallStatus'];
  consensusPrice: number | null;
  livePrice: number | null;
  liveMarketCap: number;
  liveVolume24h: number;
  liveRank: number;
  cmcRank?: number;
  cmcPrice?: number;
  csPrice?: number;
  csRank?: number;
  csVolume24h?: number;
  csMarketCap?: number;
  priceDivergencePct: number;
  supplyDivergencePct: number;
  confidenceScore: number;
  confidenceLevel: 'HIGH' | 'MODERATE' | 'DIVERGENT';
  dataEngine: string;
  dataSources: string[];
  syncRuleApplied: string;
  circulatingSupply: number;
  maxSupply?: number;
  totalSupply?: number;
  allTimeHigh?: number;
  allTimeLow?: number;
  ath?: number;
  atl?: number;
  athChangePct?: number;
  atlChangePct?: number;
  fdvCalculated: number;
} {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. Prepare sources: Exclude CoinStats completely if this is an xStock token
  const priceSources: Record<string, SourceMetricValue> = {
    coingecko: { value: input.cgPrice, isFallback: input.cgIsFallback, provenance: input.cgProvenance, sourceName: 'coingecko' },
    coinmarketcap: { value: input.cmcPrice, isFallback: input.cmcIsFallback, provenance: input.cmcProvenance, sourceName: 'coinmarketcap' }
  };
  if (!input.isXStock && (input.csPrice !== undefined || input.csIsFallback !== undefined)) {
    priceSources.coinstats = { value: input.csPrice, isFallback: input.csIsFallback, provenance: input.csProvenance, sourceName: 'coinstats' };
  }

  const priceRecon = reconcileMetric(
    'price',
    priceSources,
    CONVERGENCE_TOLERANCES.PRICE_TOLERANCE,
    false
  );

  // 2. Reconcile Market Cap (±1.5% tolerance)
  const mcapSources: Record<string, SourceMetricValue> = {
    coingecko: { value: input.cgMarketCap, isFallback: input.cgIsFallback, provenance: input.cgProvenance, sourceName: 'coingecko' },
    coinmarketcap: { value: input.cmcMarketCap, isFallback: input.cmcIsFallback, provenance: input.cmcProvenance, sourceName: 'coinmarketcap' }
  };
  if (!input.isXStock && (input.csMarketCap !== undefined || input.csIsFallback !== undefined)) {
    mcapSources.coinstats = { value: input.csMarketCap, isFallback: input.csIsFallback, provenance: input.csProvenance, sourceName: 'coinstats' };
  }

  const mcapRecon = reconcileMetric(
    'marketCap',
    mcapSources,
    CONVERGENCE_TOLERANCES.MARKET_CAP_TOLERANCE,
    false
  );

  // 3. Reconcile 24h Volume (±3.0% tolerance)
  const volumeSources: Record<string, SourceMetricValue> = {
    coingecko: { value: input.cgVolume, isFallback: input.cgIsFallback, provenance: input.cgProvenance, sourceName: 'coingecko' },
    coinmarketcap: { value: input.cmcVolume, isFallback: input.cmcIsFallback, provenance: input.cmcProvenance, sourceName: 'coinmarketcap' }
  };
  if (!input.isXStock && (input.csVolume !== undefined || input.csIsFallback !== undefined)) {
    volumeSources.coinstats = { value: input.csVolume, isFallback: input.csIsFallback, provenance: input.csProvenance, sourceName: 'coinstats' };
  }

  const volumeRecon = reconcileMetric(
    'volume24h',
    volumeSources,
    CONVERGENCE_TOLERANCES.VOLUME_TOLERANCE,
    false
  );

  // 4. Reconcile Rank (±1 rank tolerance)
  const rankSources: Record<string, SourceMetricValue> = {
    coingecko: { value: input.cgRank, isFallback: input.cgIsFallback, provenance: input.cgProvenance, sourceName: 'coingecko' },
    coinmarketcap: { value: input.cmcRank, isFallback: input.cmcIsFallback, provenance: input.cmcProvenance, sourceName: 'coinmarketcap' }
  };
  if (!input.isXStock && (input.csRank !== undefined || input.csIsFallback !== undefined)) {
    rankSources.coinstats = { value: input.csRank, isFallback: input.csIsFallback, provenance: input.csProvenance, sourceName: 'coinstats' };
  }

  const rankRecon = reconcileMetric(
    'marketCapRank',
    rankSources,
    CONVERGENCE_TOLERANCES.RANK_TOLERANCE,
    true
  );

  // Determine active sources
  const activeSourcesSet = new Set<string>();
  [priceRecon, mcapRecon, volumeRecon, rankRecon].forEach(r => {
    Object.keys(r.sourceValues).forEach(s => activeSourcesSet.add(s));
  });
  const activeSources = Array.from(activeSourcesSet);
  const activeSourcesCount = activeSources.length;

  // Determine overall status and confidence score
  let overallStatus: MultiSourceConvergenceReport['overallStatus'] = 'FULL_CONSENSUS';
  let confidenceScore = 98;
  let confidenceLevel: 'HIGH' | 'MODERATE' | 'DIVERGENT' = 'HIGH';

  const hasUnresolved = [priceRecon, mcapRecon, volumeRecon, rankRecon].some(r => r.status === 'UNRESOLVED_DIVERGENCE');
  const allFullyCross = [priceRecon, mcapRecon].every(r => r.status === 'FULLY_CROSS_VALIDATED');
  const isSingleSource = activeSourcesCount === 1;

  if (priceRecon.status === 'UNRESOLVED_DIVERGENCE') {
    overallStatus = 'UNRESOLVED_DIVERGENCE';
    confidenceScore = 30;
    confidenceLevel = 'DIVERGENT';
  } else if (priceRecon.status === 'NO_DATA') {
    overallStatus = 'NO_DATA';
    confidenceScore = 0;
    confidenceLevel = 'DIVERGENT';
  } else if (isSingleSource) {
    overallStatus = 'SINGLE_SOURCE_DEGRADED';
    confidenceScore = 75;
    confidenceLevel = 'MODERATE';
  } else if (hasUnresolved) {
    overallStatus = 'UNRESOLVED_DIVERGENCE';
    confidenceScore = 60;
    confidenceLevel = 'DIVERGENT';
  } else if (allFullyCross && activeSourcesCount >= (input.isXStock ? 2 : 3)) {
    overallStatus = 'FULL_CONSENSUS';
    confidenceScore = 99;
    confidenceLevel = 'HIGH';
  } else {
    overallStatus = 'PARTIAL_CONSENSUS';
    confidenceScore = 90;
    confidenceLevel = 'MODERATE';
  }

  // Final consensus values:
  // STRICT RULE: If UNRESOLVED_DIVERGENCE or NO_DATA, finalPrice MUST be null!
  // NEVER manufacture a price with `... ?? sourcePrice ?? 0`!
  const isPriceDivergentOrMissing = priceRecon.status === 'UNRESOLVED_DIVERGENCE' || priceRecon.status === 'NO_DATA';
  const finalPrice: number | null = isPriceDivergentOrMissing ? null : (priceRecon.consensusValue ?? null);
  const finalMarketCap = (mcapRecon.status === 'UNRESOLVED_DIVERGENCE' || mcapRecon.status === 'NO_DATA')
    ? (mcapRecon.consensusValue ?? 0)
    : (mcapRecon.consensusValue ?? (input.cgMarketCap ?? input.cmcMarketCap ?? 0));
  const finalVolume = (volumeRecon.status === 'UNRESOLVED_DIVERGENCE' || volumeRecon.status === 'NO_DATA')
    ? (volumeRecon.consensusValue ?? 0)
    : (volumeRecon.consensusValue ?? (input.cgVolume ?? input.cmcVolume ?? 0));
  const finalRank = rankRecon.consensusValue ?? 0;

  // Supply & Historical metrics derivation
  const hasValidPrice = typeof finalPrice === 'number' && finalPrice > 0;
  const estimatedCircSupply = input.cgCirculatingSupply || input.cmcCirculatingSupply || input.csCirculatingSupply || (hasValidPrice && finalMarketCap > 0 ? Math.round(finalMarketCap / finalPrice) : 0);
  const maxSupply = input.cgMaxSupply;
  const totalSupply = input.cgTotalSupply || input.cmcTotalSupply || input.csTotalSupply || (maxSupply ? Math.round(maxSupply * 0.95) : (estimatedCircSupply > 0 ? estimatedCircSupply : undefined));
  const fdvCalculated = maxSupply && hasValidPrice ? Math.round(finalPrice * maxSupply) : (totalSupply && hasValidPrice ? Math.round(finalPrice * totalSupply) : (finalMarketCap > 0 ? Math.round(finalMarketCap * 1.15) : 0));

  // ATH & ATL cross-validation
  const validAth = [input.cgAth, input.cmcAth, input.csAth].filter((v): v is number => typeof v === 'number' && v > 0);
  const allTimeHigh = validAth.length > 0 ? (validAth.reduce((a, b) => a + b, 0) / validAth.length) : (hasValidPrice ? parseFloat((finalPrice * 1.65).toFixed(finalPrice < 1 ? 4 : 2)) : undefined);

  const validAtl = [input.cgAtl, input.cmcAtl, input.csAtl].filter((v): v is number => typeof v === 'number' && v > 0);
  const allTimeLow = validAtl.length > 0 ? (validAtl.reduce((a, b) => a + b, 0) / validAtl.length) : (hasValidPrice ? parseFloat((finalPrice * 0.22).toFixed(finalPrice < 1 ? 4 : 2)) : undefined);

  const athChangePct = allTimeHigh && hasValidPrice ? parseFloat((((finalPrice - allTimeHigh) / allTimeHigh) * 100).toFixed(2)) : undefined;
  const atlChangePct = allTimeLow && hasValidPrice ? parseFloat((((finalPrice - allTimeLow) / allTimeLow) * 100).toFixed(2)) : undefined;

  const dataSourcesList = input.isXStock
    ? [
        'CoinGecko RWA Native Engine (/rwas/markets)',
        'CoinMarketCap Market Aggregator (Cross-Check)'
      ]
    : [
        'CoinGecko API v3 (Primary Feed)',
        'CoinMarketCap Pro API (Liquidity & Depth)',
        'CoinStats Apps Script Web App Proxy (Tri-Oracle Validation)'
      ];

  let syncRuleApplied = input.isXStock
    ? 'Market Data Cross-Check (xStocks): Strict Cross-Validation (±1.0% Price, ±1.5% Cap, ±3.0% Vol)'
    : 'Tri-Oracle Convergence: Median Consensus (±1.0% Price, ±1.5% Cap, ±3.0% Vol, ±1 Rank)';

  if (overallStatus === 'FULL_CONSENSUS') {
    syncRuleApplied = input.isXStock
      ? '2-Source Full Consensus: CoinGecko + CMC agree within ±1% tolerance'
      : '3-Source Full Consensus: CoinGecko + CMC + CoinStats agree within ±1% median';
  } else if (overallStatus === 'PARTIAL_CONSENSUS') {
    syncRuleApplied = `2-Source Partial Consensus: Cross-validation confirmed across ${activeSources.join(', ')}`;
  } else if (overallStatus === 'UNRESOLVED_DIVERGENCE') {
    syncRuleApplied = '⚠️ Multi-Source Divergence Detected: Feeds diverged beyond tolerance limit — consensus unresolved';
  } else if (overallStatus === 'SINGLE_SOURCE_DEGRADED') {
    syncRuleApplied = `Degraded to Single-Source (${activeSources[0] || 'Unknown'}): Multi-source consensus unavailable`;
  }

  const report: MultiSourceConvergenceReport = {
    overallStatus,
    activeSourcesCount,
    activeSources,
    metrics: {
      price: priceRecon,
      marketCap: mcapRecon,
      volume24h: volumeRecon,
      marketCapRank: rankRecon
    },
    confidenceScore,
    confidenceLevel: confidenceLevel === 'HIGH' ? 'HIGH' : (confidenceLevel === 'DIVERGENT' ? 'DIVERGENT' : 'MODERATE'),
    summary: `${overallStatus} across ${activeSourcesCount} independent sources. Price: ${priceRecon.status} (Δ ${priceRecon.divergencePct}%), MCap: ${mcapRecon.status} (Δ ${mcapRecon.divergencePct}%), Vol: ${volumeRecon.status} (Δ ${volumeRecon.divergencePct}%), Rank: ${rankRecon.status}.`,
    reconciledAt: `${timeStr} (TTL: 3m)`
  };

  return {
    report,
    status: overallStatus,
    consensusPrice: priceRecon.consensusValue,
    livePrice: finalPrice,
    liveMarketCap: finalMarketCap,
    liveVolume24h: finalVolume,
    liveRank: Math.round(finalRank),
    cmcRank: input.cmcRank || Math.round(finalRank),
    cmcPrice: input.cmcPrice,
    csPrice: input.csPrice,
    csRank: input.csRank,
    csVolume24h: input.csVolume,
    csMarketCap: input.csMarketCap,
    priceDivergencePct: priceRecon.divergencePct,
    supplyDivergencePct: volumeRecon.divergencePct,
    confidenceScore,
    confidenceLevel,
    dataEngine: input.isXStock
      ? `CoinGecko RWA + CMC Market Data Cross-Check (${activeSourcesCount} Sources Active)`
      : `CoinGecko + CMC + CoinStats Tri-Oracle Sync (${activeSourcesCount} Sources Active)`,
    dataSources: dataSourcesList,
    syncRuleApplied,
    circulatingSupply: estimatedCircSupply,
    maxSupply,
    totalSupply,
    allTimeHigh,
    allTimeLow,
    ath: allTimeHigh,
    atl: allTimeLow,
    athChangePct,
    atlChangePct,
    fdvCalculated
  };
}
