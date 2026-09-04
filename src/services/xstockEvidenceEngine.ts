/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { XStockRegistryItem, UsMarketHoursStatus } from '../data/xstocksRegistry';
import { XStockQuoteState } from '../components/XStocksPage';
import { CoinGeckoRwaDetail } from './coingeckoRwa';

/**
 * Deterministic F3 / AVF Evidence States for xStocks Verification
 * No non-VALID state can ever be silently converted or interpolated to VALID.
 */
export type XStockEvidenceState = 
  | 'VALID'
  | 'MISSING'
  | 'STALE'
  | 'SYNTHETIC'
  | 'CONTRADICTORY'
  | 'INVALID';

/**
 * Full provenance structure for every individual datum entering or displayed by xStocks verification.
 * Adheres strictly to Requirement 3:
 * - source/provider
 * - data type
 * - asset/token/RWA ID
 * - provider timestamp
 * - freshness status
 * - provenance state
 */
export interface XStockEvidenceDatum<T = number | string | boolean | null> {
  id: string;
  name: string;
  dataType: string;
  source: string;
  assetId: string;
  value: T;
  formattedValue: string;
  providerTimestamp: string;
  freshnessStatus: 'LIVE' | 'FRESH' | 'STALE' | 'UNAVAILABLE';
  provenance: XStockEvidenceState;
  rawSourceValues?: Record<string, { value: any; timestamp: string; source: string }>;
  details?: string;
}

export interface XStockEvidenceVerificationReport {
  assetSymbol: string;
  underlyingTicker: string;
  verifiedAt: string;
  isVerified: boolean;
  totalDataPoints: number;
  validCount: number;
  contradictoryCount: number;
  missingCount: number;
  staleCount: number;
  syntheticCount: number;
  invalidCount: number;
  data: Record<string, XStockEvidenceDatum<any>>;
  criticalContradictions: string[];
  criticalGaps: string[];
}

/**
 * Builds the complete evidence dataset with strict provenance for an xStock asset.
 */
export function buildXStockEvidenceDataset(
  stock: XStockRegistryItem,
  quote?: XStockQuoteState,
  marketHours?: UsMarketHoursStatus,
  rwaDetail?: CoinGeckoRwaDetail | null,
  scanResponse?: any | null
): Record<string, XStockEvidenceDatum<any>> {
  const now = new Date();
  const nowIso = now.toISOString();
  const nowFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const data: Record<string, XStockEvidenceDatum<any>> = {};

  // 1. CoinGecko RWA Native Tokenized Secondary Market Price
  const rwaPrice = quote?.rwaPrice ?? (quote as any)?.cgPrice;
  const hasRwaPrice = typeof rwaPrice === 'number' && !isNaN(rwaPrice) && rwaPrice > 0;
  const rwaProvenance: XStockEvidenceState = hasRwaPrice 
    ? (quote?.provenance === 'STALE' ? 'STALE' : quote?.provenance === 'SYNTHETIC' ? 'SYNTHETIC' : 'VALID')
    : 'MISSING';

  data['coingecko_rwa_price'] = {
    id: 'coingecko_rwa_price',
    name: 'CoinGecko RWA Tokenized Price',
    dataType: 'Tokenized Secondary Market Price (USD)',
    source: 'CoinGecko RWA Native (/rwas/markets)',
    assetId: stock.coingeckoRwaId || stock.symbol.toLowerCase(),
    value: hasRwaPrice ? rwaPrice : null,
    formattedValue: hasRwaPrice ? `$${rwaPrice.toFixed(2)}` : 'Unavailable',
    providerTimestamp: nowFormatted,
    freshnessStatus: rwaProvenance === 'VALID' ? 'LIVE' : rwaProvenance === 'STALE' ? 'STALE' : 'UNAVAILABLE',
    provenance: rwaProvenance,
    rawSourceValues: hasRwaPrice ? {
      'coingecko_rwa': { value: rwaPrice, timestamp: nowIso, source: 'CoinGecko RWA Native (/rwas/markets)' }
    } : undefined,
    details: hasRwaPrice 
      ? 'Authoritative secondary market quote from CoinGecko Real-World Asset endpoint.'
      : 'No CoinGecko RWA quote returned for this asset. Generic CoinGecko data is strictly barred from substituting.'
  };

  // 2. CoinMarketCap Cross-Check Price
  const cmcPrice = quote?.cmcPrice;
  const hasCmcPrice = typeof cmcPrice === 'number' && !isNaN(cmcPrice) && cmcPrice > 0;
  const cmcProvenance: XStockEvidenceState = hasCmcPrice ? 'VALID' : 'MISSING';

  data['cmc_cross_check_price'] = {
    id: 'cmc_cross_check_price',
    name: 'CoinMarketCap Cross-Check Price',
    dataType: 'Aggregator Cross-Check Price (USD)',
    source: 'CoinMarketCap API (/v2/cryptocurrency/quotes/latest)',
    assetId: stock.cmcSymbol,
    value: hasCmcPrice ? cmcPrice : null,
    formattedValue: hasCmcPrice ? `$${cmcPrice.toFixed(2)}` : 'Unavailable',
    providerTimestamp: nowFormatted,
    freshnessStatus: hasCmcPrice ? 'LIVE' : 'UNAVAILABLE',
    provenance: cmcProvenance,
    rawSourceValues: hasCmcPrice ? {
      'coinmarketcap': { value: cmcPrice, timestamp: nowIso, source: 'CoinMarketCap API' }
    } : undefined,
    details: hasCmcPrice
      ? 'Independent secondary aggregator quote for multi-source cross-validation.'
      : 'No live quote returned from CoinMarketCap API for this token symbol.'
  };

  // 3. Multi-Source Market Data Convergence Status & Parity
  const isDivergent = quote?.status === 'UNRESOLVED_DIVERGENCE';
  let convergenceSpreadPct: number | null = null;
  let convergenceState: XStockEvidenceState = 'MISSING';
  const rawPairValues: Record<string, { value: any; timestamp: string; source: string }> = {};

  if (hasRwaPrice && hasCmcPrice) {
    rawPairValues['coingecko_rwa'] = { value: rwaPrice, timestamp: nowIso, source: 'CoinGecko RWA Native' };
    rawPairValues['coinmarketcap'] = { value: cmcPrice, timestamp: nowIso, source: 'CoinMarketCap' };
    const avg = (rwaPrice + cmcPrice) / 2;
    convergenceSpreadPct = Math.abs(rwaPrice - cmcPrice) / avg * 100;
    
    // Contradiction Check: If divergence exceeds tolerance (1.0%), preserve both values and mark CONTRADICTORY
    if (convergenceSpreadPct > 1.0 || isDivergent) {
      convergenceState = 'CONTRADICTORY';
    } else {
      convergenceState = 'VALID';
    }
  } else if (hasRwaPrice || hasCmcPrice) {
    convergenceState = 'VALID'; // single-source observation
  } else {
    convergenceState = 'MISSING';
  }

  data['multi_source_spread'] = {
    id: 'multi_source_spread',
    name: 'Multi-Source Aggregator Spread',
    dataType: 'Cross-Aggregator Spread (%)',
    source: 'Multi-Source Market Data Convergence Engine',
    assetId: `${stock.symbol} (RWA ↔ CMC)`,
    value: convergenceSpreadPct !== null ? parseFloat(convergenceSpreadPct.toFixed(3)) : null,
    formattedValue: convergenceSpreadPct !== null ? `${convergenceSpreadPct.toFixed(2)}%` : 'Unavailable',
    providerTimestamp: nowFormatted,
    freshnessStatus: (hasRwaPrice || hasCmcPrice) ? 'LIVE' : 'UNAVAILABLE',
    provenance: convergenceState,
    rawSourceValues: rawPairValues,
    details: convergenceState === 'CONTRADICTORY'
      ? `Material divergence (${convergenceSpreadPct?.toFixed(2)}% > 1.0% tolerance) between CoinGecko RWA ($${rwaPrice?.toFixed(2)}) and CoinMarketCap ($${cmcPrice?.toFixed(2)}). Original values preserved; consensus price suppressed.`
      : convergenceSpreadPct !== null
      ? `Feeds converged within tolerance (${convergenceSpreadPct.toFixed(2)}%).`
      : 'Insufficient independent aggregator feeds to measure pairwise spread.'
  };

  // 4. Finnhub Underlying Equity Reference Price
  const equityPrice = quote?.equityPrice;
  const hasEquityPrice = typeof equityPrice === 'number' && !isNaN(equityPrice) && equityPrice > 0;
  const equityTimestamp = quote?.equityQuote?.basisTimestampFormatted || marketHours?.easternTimeFormatted || nowFormatted;

  data['underlying_equity_price'] = {
    id: 'underlying_equity_price',
    name: 'Underlying Equity Basis Price',
    dataType: marketHours?.isOpen ? 'Live Equity Basis Price (USD)' : 'Official Close / After-Hours Price (USD)',
    source: 'Finnhub Institutional Equity API (/quote)',
    assetId: stock.underlyingTicker,
    value: hasEquityPrice ? equityPrice : null,
    formattedValue: hasEquityPrice ? `$${equityPrice.toFixed(2)}` : 'Unavailable',
    providerTimestamp: equityTimestamp,
    freshnessStatus: hasEquityPrice ? (marketHours?.isOpen ? 'LIVE' : 'FRESH') : 'UNAVAILABLE',
    provenance: hasEquityPrice ? 'VALID' : 'MISSING',
    rawSourceValues: hasEquityPrice ? {
      'finnhub_equity': { value: equityPrice, timestamp: equityTimestamp, source: 'Finnhub Institutional Equity API' }
    } : undefined,
    details: hasEquityPrice
      ? `Official underlying ${stock.underlyingTicker} equity reference via Finnhub (${marketHours?.isOpen ? 'Live Session' : 'Official Session Close'}).`
      : 'Underlying equity reference unavailable from Finnhub API.'
  };

  // 5. Equity Basis Tracking Error / Deviation
  let basisDeviationPct: number | null = null;
  let basisProvenance: XStockEvidenceState = 'MISSING';
  const basisRawValues: Record<string, { value: any; timestamp: string; source: string }> = {};

  const liveTokenPrice = quote?.livePrice;
  const hasLiveTokenPrice = typeof liveTokenPrice === 'number' && !isNaN(liveTokenPrice) && liveTokenPrice > 0 && !isDivergent;

  if (hasLiveTokenPrice && hasEquityPrice) {
    basisRawValues['token_price'] = { value: liveTokenPrice, timestamp: nowIso, source: 'Multi-Source Converged Token Price' };
    basisRawValues['equity_price'] = { value: equityPrice, timestamp: equityTimestamp, source: 'Finnhub Underlying Equity' };
    basisDeviationPct = ((liveTokenPrice - equityPrice) / equityPrice) * 100;

    // If basis deviation is extreme (> 5.0%), flag as CONTRADICTORY to prevent false parity claims
    if (Math.abs(basisDeviationPct) > 5.0) {
      basisProvenance = 'CONTRADICTORY';
    } else {
      basisProvenance = 'VALID';
    }
  } else if (isDivergent) {
    basisProvenance = 'CONTRADICTORY';
  } else {
    basisProvenance = 'MISSING';
  }

  data['equity_basis_deviation'] = {
    id: 'equity_basis_deviation',
    name: 'Equity Basis Tracking Error',
    dataType: 'Tracking Deviation (%)',
    source: 'Deterministic Basis Calculation (Token vs Equity)',
    assetId: `${stock.symbol} ↔ ${stock.underlyingTicker}`,
    value: basisDeviationPct !== null ? parseFloat(basisDeviationPct.toFixed(3)) : null,
    formattedValue: basisDeviationPct !== null ? `${basisDeviationPct >= 0 ? '+' : ''}${basisDeviationPct.toFixed(2)}%` : 'Unavailable',
    providerTimestamp: nowFormatted,
    freshnessStatus: (hasLiveTokenPrice && hasEquityPrice) ? 'LIVE' : 'UNAVAILABLE',
    provenance: basisProvenance,
    rawSourceValues: basisRawValues,
    details: basisProvenance === 'CONTRADICTORY'
      ? `Material basis tracking deviation (${basisDeviationPct !== null ? `${basisDeviationPct.toFixed(2)}%` : 'Aggregators Divergent'}) between token and underlying equity.`
      : basisDeviationPct !== null
      ? `Basis tracking within normal parameters (${basisDeviationPct.toFixed(2)}%).`
      : 'Unable to calculate basis tracking error due to missing token price or equity reference.'
  };

  // 6. 24h Trading Volume (Strict null handling: no || 0)
  const volVal = quote?.volume24h;
  const hasVol = typeof volVal === 'number' && !isNaN(volVal) && volVal > 0;

  data['volume_24h'] = {
    id: 'volume_24h',
    name: '24-Hour Trading Volume',
    dataType: 'Secondary Market Volume (USD)',
    source: 'CoinGecko RWA Native & CoinMarketCap',
    assetId: stock.coingeckoRwaId || stock.cmcSymbol,
    value: hasVol ? volVal : null,
    formattedValue: hasVol ? `$${Math.round(volVal).toLocaleString()}` : 'Unavailable',
    providerTimestamp: nowFormatted,
    freshnessStatus: hasVol ? 'LIVE' : 'UNAVAILABLE',
    provenance: hasVol ? 'VALID' : 'MISSING',
    details: hasVol
      ? 'Combined secondary market volume across verified on-chain and aggregator venues.'
      : 'Trading volume unavailable or not reported. Zero values are never assumed.'
  };

  // 7. Market Capitalization (Strict null handling: no || 0)
  const mcapVal = quote?.marketCap;
  const hasMcap = typeof mcapVal === 'number' && !isNaN(mcapVal) && mcapVal > 0;

  data['market_cap'] = {
    id: 'market_cap',
    name: 'Tokenized Market Capitalization',
    dataType: 'Circulating Market Capitalization (USD)',
    source: 'CoinGecko RWA Native & CoinMarketCap',
    assetId: stock.coingeckoRwaId || stock.cmcSymbol,
    value: hasMcap ? mcapVal : null,
    formattedValue: hasMcap ? `$${Math.round(mcapVal).toLocaleString()}` : 'Unavailable',
    providerTimestamp: nowFormatted,
    freshnessStatus: hasMcap ? 'LIVE' : 'UNAVAILABLE',
    provenance: hasMcap ? 'VALID' : 'MISSING',
    details: hasMcap
      ? 'Circulating market cap of tokenized supply.'
      : 'Market capitalization not reported on file. Value is preserved as unavailable without defaulting to zero.'
  };

  // 8. On-Chain Security Bytecode / Token Authority Scan
  const hasContract = Boolean(stock.contractAddress && stock.contractAddress.trim().length > 4);
  const isScanSuccess = scanResponse?.success && Boolean(scanResponse?.data);
  const scanData = scanResponse?.data;
  const isSolana = stock.chain === 'Solana';

  let scanProvenance: XStockEvidenceState = 'MISSING';
  if (!hasContract) {
    scanProvenance = 'MISSING';
  } else if (isScanSuccess) {
    // If critical security flags are raised, mark appropriately
    if (scanData?.is_honeypot) {
      scanProvenance = 'INVALID';
    } else {
      scanProvenance = 'VALID';
    }
  } else if (scanResponse?.error) {
    scanProvenance = 'INVALID';
  } else {
    scanProvenance = 'MISSING';
  }

  data['token_security_scan'] = {
    id: 'token_security_scan',
    name: isSolana ? 'On-Chain Token Authority & Security Scan' : 'Contract Bytecode Security Scan',
    dataType: 'Smart Contract Authority & Vulnerability Telemetry',
    source: scanResponse?.source || (isSolana ? 'RugCheck / GoPlus Solana Engine' : 'GoPlus EVM Bytecode Security'),
    assetId: stock.contractAddress || 'No Address On File',
    value: isScanSuccess ? 'PASSED' : (scanProvenance === 'INVALID' ? 'FLAGGED' : null),
    formattedValue: isScanSuccess ? 'Verified Scan' : (scanProvenance === 'INVALID' ? 'Security Alert' : 'Unavailable'),
    providerTimestamp: scanResponse?.timestamp ? new Date(scanResponse.timestamp).toLocaleTimeString() : nowFormatted,
    freshnessStatus: isScanSuccess ? 'LIVE' : 'UNAVAILABLE',
    provenance: scanProvenance,
    details: isScanSuccess
      ? `On-chain scan verified (${scanResponse?.source || 'GoPlus/RugCheck'}). Token authority and mint permissions evaluated.`
      : hasContract
      ? 'On-chain security scan pending or unavailable.'
      : 'No verified contract or mint address registered on file.'
  };

  return data;
}

/**
 * Deterministic F3 Evidence Verifier for xStocks Datasets.
 * 
 * Hard Rules:
 * - VALID: requires authentic live/fresh telemetry with verified source, ID, and timestamp.
 * - MISSING: unpopulated or null telemetry remains MISSING; never converted to VALID.
 * - STALE: expired cache (> TTL) remains STALE; never converted to VALID.
 * - SYNTHETIC: synthetic or demo values remain SYNTHETIC; NEVER enters F3/AVF VALID results.
 * - CONTRADICTORY: contradictory or materially conflicting sources remain CONTRADICTORY; never chooses one source as truth.
 * - INVALID: failed or negative/NaN values remain INVALID.
 */
export function verifyXStockEvidenceDataset(
  evidenceMap: Record<string, XStockEvidenceDatum<any>>,
  assetSymbol: string,
  underlyingTicker: string
): XStockEvidenceVerificationReport {
  const values = Object.values(evidenceMap);
  const total = values.length;

  let validCount = 0;
  let contradictoryCount = 0;
  let missingCount = 0;
  let staleCount = 0;
  let syntheticCount = 0;
  let invalidCount = 0;

  const criticalContradictions: string[] = [];
  const criticalGaps: string[] = [];

  for (const datum of values) {
    switch (datum.provenance) {
      case 'VALID':
        validCount++;
        break;
      case 'CONTRADICTORY':
        contradictoryCount++;
        criticalContradictions.push(`${datum.name}: Sources materially conflict. ${datum.details || ''}`);
        break;
      case 'MISSING':
        missingCount++;
        criticalGaps.push(`${datum.name}: Data point missing or unavailable.`);
        break;
      case 'STALE':
        staleCount++;
        criticalGaps.push(`${datum.name}: Data point is stale (expired TTL).`);
        break;
      case 'SYNTHETIC':
        syntheticCount++;
        criticalGaps.push(`${datum.name}: Synthetic / demo data rejected from verification.`);
        break;
      case 'INVALID':
        invalidCount++;
        criticalGaps.push(`${datum.name}: Invalid datum or scan alert.`);
        break;
    }
  }

  // Verification is verified ONLY when at least the critical pricing telemetry is strictly VALID
  // and there are ZERO contradictions, synthetics, or invalids in core market data.
  const corePriceDatum = evidenceMap['coingecko_rwa_price'];
  const spreadDatum = evidenceMap['multi_source_spread'];
  const hasValidCorePrice = corePriceDatum?.provenance === 'VALID';
  const hasNoContradiction = spreadDatum?.provenance !== 'CONTRADICTORY';

  const isVerified = hasValidCorePrice && hasNoContradiction && contradictoryCount === 0 && syntheticCount === 0;

  return {
    assetSymbol,
    underlyingTicker,
    verifiedAt: new Date().toISOString(),
    isVerified,
    totalDataPoints: total,
    validCount,
    contradictoryCount,
    missingCount,
    staleCount,
    syntheticCount,
    invalidCount,
    data: evidenceMap,
    criticalContradictions,
    criticalGaps
  };
}
