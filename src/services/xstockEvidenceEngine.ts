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

export type XStockEvidenceFreshness = 'LIVE' | 'STALE' | 'UNAVAILABLE';

export type XStockEvidenceProvenanceCategory = 'SOURCE' | 'DERIVED' | 'UNAVAILABLE';

/**
 * 1. NORMALIZED EVIDENCE OBJECT
 * Lightweight common evidence structure for EVERY xStocks numerical datum:
 * Adheres strictly to P2-FINAL Requirement 1:
 * {
 *   value: number | null,
 *   source: string,
 *   dataType: string,
 *   assetId?: string,
 *   rwaId?: string,
 *   timestamp?: string | number | null,
 *   freshness: 'LIVE' | 'STALE' | 'UNAVAILABLE',
 *   state: 'VALID' | 'MISSING' | 'STALE' | 'SYNTHETIC' | 'CONTRADICTORY' | 'INVALID'
 * }
 */
export interface XStockNormalizedEvidence {
  value: number | null;
  source: string; // 'TOKENIZED_MARKET' | 'UNDERLYING_EQUITY' | 'SECONDARY_TOKEN_MARKET' | 'ON_CHAIN' | string
  dataType: string;
  assetId?: string;
  rwaId?: string;
  timestamp?: string | number | null;
  freshness: XStockEvidenceFreshness;
  state: XStockEvidenceState;

  // Supplementary fields for UI presentation and provenance auditing
  id?: string;
  name?: string;
  formattedValue?: string;
  providerTimestamp?: string | null;
  freshnessStatus?: XStockEvidenceFreshness;
  provenance?: XStockEvidenceState;
  provenanceCategory?: XStockEvidenceProvenanceCategory; // 'SOURCE' | 'DERIVED' | 'UNAVAILABLE'
  isVerificationGrade?: boolean;
  rawSourceValues?: Record<string, { value: any; timestamp?: string | number | null; source: string }>;
  details?: string;
  verificationStatus?: 'VERIFIED' | 'PARTIAL' | 'UNVERIFIED' | 'UNAVAILABLE';
}

export type XStockEvidenceDatum<T = number | null> = XStockNormalizedEvidence;

export interface XStockEvidenceVerificationReport {
  assetSymbol: string;
  underlyingTicker: string;
  verifiedAt: string;
  isVerified: boolean;
  status?: 'VERIFIED' | 'PARTIAL' | 'UNVERIFIED';
  multiSourcePriceStatus?: 'VERIFIED' | 'PARTIAL' | 'UNVERIFIED';
  securityScanStatus?: 'SCAN_CLEAN' | 'RISK_FLAGS_DETECTED' | 'PARTIAL' | 'UNAVAILABLE';
  securityScanDetails?: string;
  totalDataPoints: number;
  validCount: number;
  contradictoryCount: number;
  missingCount: number;
  staleCount: number;
  syntheticCount: number;
  invalidCount: number;
  sourceCount?: number;
  derivedCount?: number;
  verificationGradeCount?: number;
  data: Record<string, XStockNormalizedEvidence>;
  criticalContradictions: string[];
  criticalGaps: string[];
}

/**
 * Builds the complete evidence dataset with strict provenance for an xStock asset.
 * 
 * Source Mapping:
 * - CoinGecko RWA → TOKENIZED_MARKET
 * - Finnhub → UNDERLYING_EQUITY
 * - CoinMarketCap → SECONDARY_TOKEN_MARKET
 * - Existing genuine on-chain/security data → ON_CHAIN
 * - Genuine direct DEX/on-chain telemetry unavailable → ON_CHAIN (exposing ON_CHAIN/DEX_UNAVAILABLE)
 * 
 * Rules:
 * - Never estimate, interpolate, substitute or convert non-VALID states into VALID.
 * - Missing values remain null/MISSING.
 * - Stale values remain STALE.
 * - Synthetic values remain SYNTHETIC.
 * - Conflicting values remain CONTRADICTORY.
 * - Retain provider timestamp where supplied; null/unknown otherwise (never invent timestamps).
 */
export function buildXStockEvidenceDataset(
  stock: XStockRegistryItem,
  quote?: XStockQuoteState,
  marketHours?: UsMarketHoursStatus,
  rwaDetail?: CoinGeckoRwaDetail | null,
  scanResponse?: any | null
): Record<string, XStockNormalizedEvidence> {
  const data: Record<string, XStockNormalizedEvidence> = {};

  // 1. CoinGecko RWA Native Tokenized Secondary Market Price
  const rwaPrice = quote?.rwaPrice ?? (quote as any)?.cgPrice;
  const hasRwaPrice = typeof rwaPrice === 'number' && !isNaN(rwaPrice) && rwaPrice > 0;
  const existingRwaState: XStockEvidenceState | undefined = quote?.evidence?.coingecko_rwa_price?.state;
  const rwaState: XStockEvidenceState = hasRwaPrice 
    ? (existingRwaState && existingRwaState !== 'MISSING' ? existingRwaState : (quote?.provenance === 'STALE' ? 'STALE' : quote?.provenance === 'SYNTHETIC' ? 'SYNTHETIC' : 'VALID'))
    : 'MISSING';
  const existingRwaFreshness: XStockEvidenceFreshness | undefined = quote?.evidence?.coingecko_rwa_price?.freshness;
  const rwaFreshness: XStockEvidenceFreshness = hasRwaPrice
    ? (existingRwaFreshness || (quote?.provenance === 'STALE' ? 'STALE' : 'LIVE'))
    : 'UNAVAILABLE';
  
  // Real provider timestamp if supplied, otherwise null (never invent timestamps)
  const rwaTimestamp: string | null = (typeof rwaDetail?.tokenized_market_data?.last_updated === 'string' && rwaDetail.tokenized_market_data.last_updated.length > 0)
    ? rwaDetail.tokenized_market_data.last_updated
    : (quote?.evidence?.coingecko_rwa_price?.timestamp ? String(quote.evidence.coingecko_rwa_price.timestamp) : null);

  data['coingecko_rwa_price'] = {
    id: 'coingecko_rwa_price',
    name: 'CoinGecko RWA Tokenized Price',
    dataType: 'Tokenized Secondary Market Price (USD)',
    source: 'TOKENIZED_MARKET',
    assetId: stock.symbol,
    rwaId: stock.coingeckoRwaId || undefined,
    value: hasRwaPrice ? rwaPrice : null,
    formattedValue: hasRwaPrice ? `$${rwaPrice.toFixed(2)}` : 'Unavailable',
    timestamp: rwaTimestamp,
    providerTimestamp: rwaTimestamp ? new Date(rwaTimestamp).toLocaleTimeString() : null,
    freshness: rwaFreshness,
    freshnessStatus: rwaFreshness,
    state: rwaState,
    provenance: rwaState,
    provenanceCategory: hasRwaPrice ? 'SOURCE' : 'UNAVAILABLE',
    isVerificationGrade: hasRwaPrice && rwaState === 'VALID',
    rawSourceValues: hasRwaPrice ? {
      'coingecko_rwa': { value: rwaPrice, timestamp: rwaTimestamp, source: 'TOKENIZED_MARKET' }
    } : undefined,
    details: hasRwaPrice 
      ? 'Authoritative secondary market quote from CoinGecko Real-World Asset endpoint.'
      : 'No CoinGecko RWA quote returned for this asset. Generic CoinGecko data is strictly barred from substituting.'
  };

  // 2. CoinMarketCap Cross-Check Price (SECONDARY_TOKEN_MARKET)
  const cmcPrice = quote?.cmcPrice;
  const hasCmcPrice = typeof cmcPrice === 'number' && !isNaN(cmcPrice) && cmcPrice > 0;
  const existingCmcState: XStockEvidenceState | undefined = quote?.evidence?.cmc_cross_check_price?.state;
  const cmcState: XStockEvidenceState = hasCmcPrice 
    ? (existingCmcState && existingCmcState !== 'MISSING' ? existingCmcState : 'VALID')
    : 'MISSING';
  const existingCmcFreshness: XStockEvidenceFreshness | undefined = quote?.evidence?.cmc_cross_check_price?.freshness;
  const cmcFreshness: XStockEvidenceFreshness = hasCmcPrice 
    ? (existingCmcFreshness || 'LIVE')
    : 'UNAVAILABLE';
  const cmcTimestamp: string | null = (quote as any)?.cmcLastUpdated 
    ? String((quote as any).cmcLastUpdated)
    : (quote?.evidence?.cmc_cross_check_price?.timestamp ? String(quote.evidence.cmc_cross_check_price.timestamp) : null);

  data['cmc_cross_check_price'] = {
    id: 'cmc_cross_check_price',
    name: 'CoinMarketCap Cross-Check Price',
    dataType: 'Secondary Token Market Price (USD)',
    source: 'SECONDARY_TOKEN_MARKET',
    assetId: stock.cmcSymbol,
    value: hasCmcPrice ? cmcPrice : null,
    formattedValue: hasCmcPrice ? `$${cmcPrice.toFixed(2)}` : 'Unavailable',
    timestamp: cmcTimestamp,
    providerTimestamp: cmcTimestamp ? new Date(cmcTimestamp).toLocaleTimeString() : null,
    freshness: cmcFreshness,
    freshnessStatus: cmcFreshness,
    state: cmcState,
    provenance: cmcState,
    provenanceCategory: hasCmcPrice ? 'SOURCE' : 'UNAVAILABLE',
    isVerificationGrade: hasCmcPrice && cmcState === 'VALID',
    rawSourceValues: hasCmcPrice ? {
      'coinmarketcap': { value: cmcPrice, timestamp: cmcTimestamp, source: 'SECONDARY_TOKEN_MARKET' }
    } : undefined,
    details: hasCmcPrice
      ? 'Independent secondary aggregator quote for multi-source cross-validation.'
      : 'No live quote returned from CoinMarketCap API for this token symbol.'
  };

  // 3. Multi-Source Market Data Convergence Spread (Contradiction Detection)
  const isDivergent = quote?.status === 'UNRESOLVED_DIVERGENCE';
  let convergenceSpreadPct: number | null = null;
  let convergenceState: XStockEvidenceState = 'MISSING';
  const rawPairValues: Record<string, { value: any; timestamp: string | null; source: string }> = {};

  const isRwaValid = hasRwaPrice && rwaState === 'VALID';
  const isCmcValid = hasCmcPrice && cmcState === 'VALID';

  if (hasRwaPrice && hasCmcPrice) {
    rawPairValues['TOKENIZED_MARKET'] = { value: rwaPrice, timestamp: rwaTimestamp, source: 'TOKENIZED_MARKET' };
    rawPairValues['SECONDARY_TOKEN_MARKET'] = { value: cmcPrice, timestamp: cmcTimestamp, source: 'SECONDARY_TOKEN_MARKET' };
    const avg = (rwaPrice + cmcPrice) / 2;
    convergenceSpreadPct = Math.abs(rwaPrice - cmcPrice) / avg * 100;
    
    // Contradiction Check: If divergence exceeds tolerance (1.0%) or status is unresolved, mark CONTRADICTORY
    if (convergenceSpreadPct > 1.0 || isDivergent) {
      convergenceState = 'CONTRADICTORY';
    } else if (isRwaValid && isCmcValid) {
      convergenceState = 'VALID';
    } else if (rwaState === 'STALE' || cmcState === 'STALE') {
      convergenceState = 'STALE';
    } else if (rwaState === 'SYNTHETIC' || cmcState === 'SYNTHETIC') {
      convergenceState = 'SYNTHETIC';
    } else if (rwaState === 'INVALID' || cmcState === 'INVALID') {
      convergenceState = 'INVALID';
    } else {
      convergenceState = 'MISSING';
    }
  } else {
    // Single-source observation CANNOT validate cross-aggregator spread.
    // Never mark VALID when only one aggregator is available.
    if (rwaState === 'STALE' || cmcState === 'STALE') {
      convergenceState = 'STALE';
    } else if (rwaState === 'SYNTHETIC' || cmcState === 'SYNTHETIC') {
      convergenceState = 'SYNTHETIC';
    } else if (rwaState === 'INVALID' || cmcState === 'INVALID') {
      convergenceState = 'INVALID';
    } else {
      convergenceState = 'MISSING';
    }
  }

  const spreadFreshness: XStockEvidenceFreshness = (isRwaValid && isCmcValid)
    ? 'LIVE'
    : (hasRwaPrice || hasCmcPrice)
    ? ((rwaFreshness === 'STALE' || cmcFreshness === 'STALE') ? 'STALE' : 'LIVE')
    : 'UNAVAILABLE';
  const spreadTimestamp = (rwaTimestamp && cmcTimestamp) ? rwaTimestamp : (rwaTimestamp || cmcTimestamp || null);

  const spreadVerificationStatus: 'VERIFIED' | 'PARTIAL' | 'UNVERIFIED' =
    (convergenceState === 'VALID' && isRwaValid && isCmcValid && convergenceSpreadPct !== null && convergenceSpreadPct <= 1.0)
      ? 'VERIFIED'
      : (hasRwaPrice || hasCmcPrice)
      ? 'PARTIAL'
      : 'UNVERIFIED';

  data['multi_source_spread'] = {
    id: 'multi_source_spread',
    name: 'Multi-Source Aggregator Spread',
    dataType: 'Cross-Aggregator Spread (%)',
    source: 'TOKENIZED_MARKET',
    assetId: `${stock.symbol} (TOKENIZED_MARKET ↔ SECONDARY_TOKEN_MARKET)`,
    value: convergenceSpreadPct !== null ? parseFloat(convergenceSpreadPct.toFixed(3)) : null,
    formattedValue: convergenceSpreadPct !== null ? `${convergenceSpreadPct.toFixed(2)}%` : 'Unavailable',
    timestamp: spreadTimestamp,
    providerTimestamp: spreadTimestamp ? new Date(spreadTimestamp).toLocaleTimeString() : null,
    freshness: spreadFreshness,
    freshnessStatus: spreadFreshness,
    state: convergenceState,
    provenance: convergenceState,
    provenanceCategory: convergenceSpreadPct !== null ? 'DERIVED' : 'UNAVAILABLE',
    isVerificationGrade: spreadVerificationStatus === 'VERIFIED',
    verificationStatus: spreadVerificationStatus,
    rawSourceValues: rawPairValues,
    details: convergenceState === 'CONTRADICTORY'
      ? `Material divergence (${convergenceSpreadPct?.toFixed(2)}% > 1.0% tolerance) between TOKENIZED_MARKET ($${rwaPrice?.toFixed(2)}) and SECONDARY_TOKEN_MARKET ($${cmcPrice?.toFixed(2)}). Original values preserved; consensus price suppressed.`
      : (convergenceSpreadPct !== null && convergenceState === 'VALID')
      ? `Feeds converged within 1.0% tolerance (${convergenceSpreadPct.toFixed(2)}% spread). Dual independent aggregators verified.`
      : (hasRwaPrice || hasCmcPrice)
      ? `Single-source observation (${hasRwaPrice ? 'CoinGecko RWA only' : 'CoinMarketCap only'}). Multi-source price verification requires two independent market aggregators; single-source feeds do not satisfy multi-source verification status. Status: PARTIAL / UNVERIFIED.`
      : 'Insufficient independent aggregator feeds to measure pairwise spread. Status: UNVERIFIED.'
  };

  // 4. Finnhub Underlying Equity Reference Price (UNDERLYING_EQUITY)
  const equityPrice = quote?.equityPrice;
  const hasEquityPrice = typeof equityPrice === 'number' && !isNaN(equityPrice) && equityPrice > 0;
  const equityTimestamp: string | null = (quote?.equityQuote?.t && quote.equityQuote.t > 0)
    ? new Date(quote.equityQuote.t * 1000).toISOString()
    : (quote?.evidence?.underlying_equity_price?.timestamp ? String(quote.evidence.underlying_equity_price.timestamp) : null);

  const equityFreshness: XStockEvidenceFreshness = hasEquityPrice
    ? (marketHours?.isOpen ? 'LIVE' : 'STALE') // Outside market hours, session close basis is STALE/Last Close
    : 'UNAVAILABLE';

  data['underlying_equity_price'] = {
    id: 'underlying_equity_price',
    name: 'Underlying Equity Basis Price',
    dataType: marketHours?.isOpen ? 'Live Equity Basis Price (USD)' : 'Official Close / After-Hours Price (USD)',
    source: 'UNDERLYING_EQUITY',
    assetId: stock.underlyingTicker,
    value: hasEquityPrice ? equityPrice : null,
    formattedValue: hasEquityPrice ? `$${equityPrice.toFixed(2)}` : 'Unavailable',
    timestamp: equityTimestamp,
    providerTimestamp: equityTimestamp ? new Date(equityTimestamp).toLocaleTimeString() : null,
    freshness: equityFreshness,
    freshnessStatus: equityFreshness,
    state: hasEquityPrice ? 'VALID' : 'MISSING',
    provenance: hasEquityPrice ? 'VALID' : 'MISSING',
    provenanceCategory: hasEquityPrice ? 'SOURCE' : 'UNAVAILABLE',
    isVerificationGrade: hasEquityPrice && Boolean(marketHours?.isOpen),
    rawSourceValues: hasEquityPrice ? {
      'UNDERLYING_EQUITY': { value: equityPrice, timestamp: equityTimestamp, source: 'UNDERLYING_EQUITY' }
    } : undefined,
    details: hasEquityPrice
      ? `Official underlying ${stock.underlyingTicker} equity reference via Finnhub (${marketHours?.isOpen ? 'Live Session' : 'Official Session Close'}).`
      : 'Underlying equity reference unavailable from Finnhub API.'
  };

  // 5. Equity Basis Tracking Error / Deviation
  let basisDeviationPct: number | null = null;
  let basisState: XStockEvidenceState = 'MISSING';
  const basisRawValues: Record<string, { value: any; timestamp: string | null; source: string }> = {};

  const liveTokenPrice = quote?.livePrice;
  const hasLiveTokenPrice = typeof liveTokenPrice === 'number' && !isNaN(liveTokenPrice) && liveTokenPrice > 0 && !isDivergent;

  if (hasLiveTokenPrice && hasEquityPrice) {
    basisRawValues['token_price'] = { value: liveTokenPrice, timestamp: rwaTimestamp, source: 'TOKENIZED_MARKET' };
    basisRawValues['equity_price'] = { value: equityPrice, timestamp: equityTimestamp, source: 'UNDERLYING_EQUITY' };
    basisDeviationPct = ((liveTokenPrice - equityPrice) / equityPrice) * 100;

    // If basis deviation is extreme (> 5.0%), flag as CONTRADICTORY to prevent false parity claims
    if (Math.abs(basisDeviationPct) > 5.0) {
      basisState = 'CONTRADICTORY';
    } else {
      basisState = 'VALID';
    }
  } else if (isDivergent) {
    basisState = 'CONTRADICTORY';
  } else {
    basisState = 'MISSING';
  }

  const basisFreshness: XStockEvidenceFreshness = (hasLiveTokenPrice && hasEquityPrice)
    ? (marketHours?.isOpen ? 'LIVE' : 'STALE')
    : 'UNAVAILABLE';
  const basisTimestamp = equityTimestamp || rwaTimestamp || null;

  data['equity_basis_deviation'] = {
    id: 'equity_basis_deviation',
    name: 'Equity Basis Tracking Error',
    dataType: 'Equity Basis Tracking Deviation (%)',
    source: 'UNDERLYING_EQUITY',
    assetId: `${stock.symbol} ↔ ${stock.underlyingTicker}`,
    value: basisDeviationPct !== null ? parseFloat(basisDeviationPct.toFixed(3)) : null,
    formattedValue: basisDeviationPct !== null ? `${basisDeviationPct >= 0 ? '+' : ''}${basisDeviationPct.toFixed(2)}%` : 'Unavailable',
    timestamp: basisTimestamp,
    providerTimestamp: basisTimestamp ? new Date(basisTimestamp).toLocaleTimeString() : null,
    freshness: basisFreshness,
    freshnessStatus: basisFreshness,
    state: basisState,
    provenance: basisState,
    provenanceCategory: basisDeviationPct !== null ? 'DERIVED' : 'UNAVAILABLE',
    isVerificationGrade: false,
    rawSourceValues: basisRawValues,
    details: basisState === 'CONTRADICTORY'
      ? `Material basis tracking deviation (${basisDeviationPct !== null ? `${basisDeviationPct.toFixed(2)}%` : 'Aggregators Divergent'}) between token and underlying equity.`
      : basisDeviationPct !== null
      ? `Basis tracking within normal parameters (${basisDeviationPct.toFixed(2)}%).`
      : 'Unable to calculate basis tracking error due to missing token price or equity reference.'
  };

  // 6. 24h Trading Volume (Strict null handling: no || 0)
  const volVal = quote?.volume24h;
  const hasVol = typeof volVal === 'number' && !isNaN(volVal) && volVal > 0;
  const volFreshness: XStockEvidenceFreshness = hasVol ? 'LIVE' : 'UNAVAILABLE';
  const volTimestamp = rwaTimestamp;

  data['volume_24h'] = {
    id: 'volume_24h',
    name: '24-Hour Trading Volume',
    dataType: 'Secondary Market 24h Volume (USD)',
    source: 'TOKENIZED_MARKET',
    assetId: stock.symbol,
    rwaId: stock.coingeckoRwaId || undefined,
    value: hasVol ? volVal : null,
    formattedValue: hasVol ? `$${Math.round(volVal).toLocaleString()}` : 'Unavailable',
    timestamp: volTimestamp,
    providerTimestamp: volTimestamp ? new Date(volTimestamp).toLocaleTimeString() : null,
    freshness: volFreshness,
    freshnessStatus: volFreshness,
    state: hasVol ? 'VALID' : 'MISSING',
    provenance: hasVol ? 'VALID' : 'MISSING',
    provenanceCategory: hasVol ? 'SOURCE' : 'UNAVAILABLE',
    isVerificationGrade: hasVol,
    details: hasVol
      ? 'Combined secondary market volume across verified market venues.'
      : 'Trading volume unavailable or not reported. Zero values are never assumed.'
  };

  // 7. Market Capitalization (Strict null handling: no || 0)
  const mcapVal = quote?.marketCap;
  const hasMcap = typeof mcapVal === 'number' && !isNaN(mcapVal) && mcapVal > 0;
  const mcapFreshness: XStockEvidenceFreshness = hasMcap ? 'LIVE' : 'UNAVAILABLE';
  const mcapTimestamp = rwaTimestamp;

  data['market_cap'] = {
    id: 'market_cap',
    name: 'Tokenized Market Capitalization',
    dataType: 'Circulating Market Capitalization (USD)',
    source: 'TOKENIZED_MARKET',
    assetId: stock.symbol,
    rwaId: stock.coingeckoRwaId || undefined,
    value: hasMcap ? mcapVal : null,
    formattedValue: hasMcap ? `$${Math.round(mcapVal).toLocaleString()}` : 'Unavailable',
    timestamp: mcapTimestamp,
    providerTimestamp: mcapTimestamp ? new Date(mcapTimestamp).toLocaleTimeString() : null,
    freshness: mcapFreshness,
    freshnessStatus: mcapFreshness,
    state: hasMcap ? 'VALID' : 'MISSING',
    provenance: hasMcap ? 'VALID' : 'MISSING',
    provenanceCategory: hasMcap ? (quote?.marketCapProvenance || 'SOURCE') : 'UNAVAILABLE',
    isVerificationGrade: hasMcap,
    details: hasMcap
      ? 'Circulating market cap of tokenized supply.'
      : 'Market capitalization not reported on file. Value is preserved as unavailable without defaulting to zero.'
  };

  // 8. Circulating Supply (Source vs Derived Provenance)
  const circVal = quote?.circulatingSupply;
  const hasCirc = typeof circVal === 'number' && !isNaN(circVal) && circVal > 0;
  const circProvenance = quote?.circulatingSupplyProvenance || (hasCirc ? 'DERIVED' : 'UNAVAILABLE');
  data['circulating_supply'] = {
    id: 'circulating_supply',
    name: 'Circulating Token Supply',
    dataType: 'Circulating Supply (Tokens)',
    source: circProvenance === 'SOURCE' ? 'TOKENIZED_MARKET' : 'MATHEMATICAL_DERIVATION',
    assetId: stock.symbol,
    value: hasCirc ? circVal : null,
    formattedValue: hasCirc ? circVal.toLocaleString() : 'Unavailable',
    timestamp: rwaTimestamp,
    providerTimestamp: rwaTimestamp ? new Date(rwaTimestamp).toLocaleTimeString() : null,
    freshness: hasCirc ? 'LIVE' : 'UNAVAILABLE',
    freshnessStatus: hasCirc ? 'LIVE' : 'UNAVAILABLE',
    state: hasCirc ? 'VALID' : 'MISSING',
    provenance: hasCirc ? 'VALID' : 'MISSING',
    provenanceCategory: circProvenance,
    isVerificationGrade: circProvenance === 'SOURCE',
    details: circProvenance === 'SOURCE'
      ? 'Directly reported circulating token supply from primary RWA data provider.'
      : (circProvenance === 'DERIVED'
          ? 'Mathematically derived: Market Capitalization ÷ Converged Token Price.'
          : 'Circulating supply data unavailable.')
  };

  // 9. Total Supply (Source vs Derived Provenance)
  const totalVal = quote?.totalSupply;
  const hasTotal = typeof totalVal === 'number' && !isNaN(totalVal) && totalVal > 0;
  const totalProvenance = quote?.totalSupplyProvenance || (hasTotal ? 'DERIVED' : 'UNAVAILABLE');
  data['total_supply'] = {
    id: 'total_supply',
    name: 'Total Token Supply',
    dataType: 'Total Supply (Tokens)',
    source: totalProvenance === 'SOURCE' ? 'TOKENIZED_MARKET' : 'MATHEMATICAL_DERIVATION',
    assetId: stock.symbol,
    value: hasTotal ? totalVal : null,
    formattedValue: hasTotal ? totalVal.toLocaleString() : 'Unavailable',
    timestamp: rwaTimestamp,
    providerTimestamp: rwaTimestamp ? new Date(rwaTimestamp).toLocaleTimeString() : null,
    freshness: hasTotal ? 'LIVE' : 'UNAVAILABLE',
    freshnessStatus: hasTotal ? 'LIVE' : 'UNAVAILABLE',
    state: hasTotal ? 'VALID' : 'MISSING',
    provenance: hasTotal ? 'VALID' : 'MISSING',
    provenanceCategory: totalProvenance,
    isVerificationGrade: totalProvenance === 'SOURCE',
    details: totalProvenance === 'SOURCE'
      ? 'Directly reported total token supply from primary RWA data provider.'
      : (totalProvenance === 'DERIVED'
          ? 'Mathematically derived from reported max supply or circulating supply.'
          : 'Total supply data unavailable.')
  };

  // 10. Fully Diluted Valuation (FDV) (Strictly DERIVED)
  const fdvVal = quote?.fdv;
  const hasFdv = typeof fdvVal === 'number' && !isNaN(fdvVal) && fdvVal > 0;
  data['fully_diluted_valuation'] = {
    id: 'fully_diluted_valuation',
    name: 'Fully Diluted Valuation (FDV)',
    dataType: 'Fully Diluted Valuation (USD)',
    source: 'MATHEMATICAL_DERIVATION',
    assetId: stock.symbol,
    value: hasFdv ? fdvVal : null,
    formattedValue: hasFdv ? `$${Math.round(fdvVal).toLocaleString()}` : 'Unavailable',
    timestamp: rwaTimestamp,
    providerTimestamp: rwaTimestamp ? new Date(rwaTimestamp).toLocaleTimeString() : null,
    freshness: hasFdv ? 'LIVE' : 'UNAVAILABLE',
    freshnessStatus: hasFdv ? 'LIVE' : 'UNAVAILABLE',
    state: hasFdv ? 'VALID' : 'MISSING',
    provenance: hasFdv ? 'VALID' : 'MISSING',
    provenanceCategory: hasFdv ? 'DERIVED' : 'UNAVAILABLE',
    isVerificationGrade: false, // Derived values are never independent raw verification-grade feeds
    details: hasFdv
      ? 'Mathematically derived: Converged Token Price × Total/Max Supply. Marked as DERIVED.'
      : 'FDV calculation unavailable due to missing supply metrics.'
  };

  // 11. Genuine Direct DEX / On-Chain Market Telemetry (Requirement 3)
  // If genuine direct DEX/on-chain market telemetry is unavailable, explicitly expose ON_CHAIN/DEX_UNAVAILABLE rather than treating CG/CMC as direct on-chain telemetry.
  data['direct_dex_telemetry'] = {
    id: 'direct_dex_telemetry',
    name: 'Direct On-Chain DEX Orderbook / Pool',
    dataType: 'Direct DEX Pool Telemetry (USD)',
    source: 'ON_CHAIN',
    assetId: stock.contractAddress || stock.symbol,
    value: null,
    formattedValue: 'Unavailable',
    timestamp: null,
    providerTimestamp: null,
    freshness: 'UNAVAILABLE',
    freshnessStatus: 'UNAVAILABLE',
    state: 'MISSING',
    provenance: 'MISSING',
    provenanceCategory: 'UNAVAILABLE',
    isVerificationGrade: false,
    details: 'ON_CHAIN/DEX_UNAVAILABLE: Direct DEX on-chain liquidity/pool telemetry is unavailable. Token aggregators (CoinGecko RWA, CoinMarketCap) provide secondary market observations and are not direct on-chain telemetry.'
  };

  // 12. On-Chain Security Bytecode / Token Authority Scan (ON_CHAIN)
  // P2 Security Semantics:
  // - A successful GoPlus/RugCheck API response means SCAN AVAILABLE, not automatically "VALID/VERIFIED".
  // - Evaluate the actual security findings returned by the provider.
  // - Any detected risk/security flag must be surfaced as RISK FLAGS DETECTED, with the underlying finding preserved.
  // - No findings + successful scan may be reported as SCAN CLEAN / NO FLAGS OBSERVED, not a blanket safety certification.
  // - Missing, stale, malformed, or unavailable provider data -> PARTIAL / UNAVAILABLE, never VERIFIED.
  // - Preserve provider provenance: Blockscout = EVM on-chain/explorer evidence; GoPlus = security telemetry; RugCheck = Solana security telemetry.
  // - Never turn "scan succeeded" into a blanket "token verified/safe" claim.
  const hasContract = Boolean(stock.contractAddress && stock.contractAddress.trim().length > 4);
  const isScanSuccess = Boolean(scanResponse?.success && scanResponse?.data);
  const scanData = scanResponse?.data;
  const isSolana = stock.chain === 'Solana';

  // Determine provider provenance based on chain and scan response source
  const providerProvenance = scanResponse?.source || (isSolana ? 'RugCheck' : 'GoPlus Security');

  // Evaluate actual security findings from provider
  const detectedRiskFlags: string[] = [];
  if (isScanSuccess && scanData) {
    if (scanData.is_honeypot) {
      detectedRiskFlags.push('Honeypot Detected');
    }
    if (scanData.cannotSell) {
      detectedRiskFlags.push('Trading / Transfer Restriction (Cannot Sell)');
    }
    if (scanData.owner_change_balance) {
      detectedRiskFlags.push('Owner Can Change Balances');
    }
    if (scanData.is_blacklisted) {
      detectedRiskFlags.push('Blacklist Capability Detected');
    }
    const buyTax = typeof scanData.buyTax === 'number' ? scanData.buyTax : parseFloat(String(scanData.buyTax || '0').replace('%', ''));
    const sellTax = typeof scanData.sellTax === 'number' ? scanData.sellTax : parseFloat(String(scanData.sellTax || '0').replace('%', ''));
    if (!isNaN(sellTax) && sellTax > 10) {
      detectedRiskFlags.push(`High Sell Tax (${sellTax}%)`);
    }
    if (!isNaN(buyTax) && buyTax > 10) {
      detectedRiskFlags.push(`High Buy Tax (${buyTax}%)`);
    }
    if (Array.isArray(scanData.rugcheckRisks)) {
      const dangerRisks = scanData.rugcheckRisks.filter((r: any) => r.level === 'danger' || (r.score && r.score >= 500));
      for (const r of dangerRisks) {
        if (!detectedRiskFlags.some(f => f.toLowerCase().includes(r.name.toLowerCase()))) {
          detectedRiskFlags.push(r.name);
        }
      }
    }
    if ((scanData.highRiskCount || 0) > 0 && detectedRiskFlags.length === 0) {
      detectedRiskFlags.push(`${scanData.highRiskCount} High Risk Indicator(s)`);
    }
  }

  let scanState: XStockEvidenceState = 'MISSING';
  let formattedValue = 'UNAVAILABLE';
  let scanDetails = '';

  if (!hasContract) {
    scanState = 'MISSING';
    formattedValue = 'UNAVAILABLE';
    scanDetails = 'No contract or mint address registered on file. Status: UNAVAILABLE.';
  } else if (!isScanSuccess) {
    if (scanResponse?.error) {
      scanState = 'INVALID';
      formattedValue = 'SCAN UNAVAILABLE';
      scanDetails = `Automated security scan failed: ${scanResponse.error}. Status: UNAVAILABLE.`;
    } else {
      scanState = 'MISSING';
      formattedValue = 'SCAN PENDING / UNAVAILABLE';
      scanDetails = 'Security scan telemetry pending or unavailable from provider. Status: UNAVAILABLE.';
    }
  } else {
    // Scan is AVAILABLE: Evaluate actual findings
    if (detectedRiskFlags.length > 0) {
      scanState = 'INVALID';
      formattedValue = 'RISK FLAGS DETECTED';
      scanDetails = `Security telemetry (${providerProvenance}) detected active risk flags: ${detectedRiskFlags.join('; ')}. Findings preserved from provider scan.`;
    } else {
      scanState = 'VALID';
      formattedValue = 'SCAN CLEAN / NO FLAGS OBSERVED';
      scanDetails = `Automated security scan (${providerProvenance}) observed 0 high-risk flags. Evaluated transfer restrictions, taxes, honeypot vectors, and authorities. Scan availability confirms observable telemetry only, not a blanket safety certification.`;
    }
  }

  const scanTimestamp = scanResponse?.timestamp ? new Date(scanResponse.timestamp).toISOString() : null;

  data['token_security_scan'] = {
    id: 'token_security_scan',
    name: isSolana ? 'On-Chain Token Authority & Security Scan' : 'Contract Bytecode Security Scan',
    dataType: 'Smart Contract Authority & Vulnerability Telemetry',
    source: 'ON_CHAIN',
    assetId: stock.contractAddress || 'No Address On File',
    value: isScanSuccess ? (detectedRiskFlags.length > 0 ? 0 : 1) : null,
    formattedValue,
    timestamp: scanTimestamp,
    providerTimestamp: scanTimestamp ? new Date(scanTimestamp).toLocaleTimeString() : null,
    freshness: isScanSuccess ? 'LIVE' : 'UNAVAILABLE',
    freshnessStatus: isScanSuccess ? 'LIVE' : 'UNAVAILABLE',
    state: scanState,
    provenance: scanState,
    provenanceCategory: hasContract && isScanSuccess ? 'SOURCE' : 'UNAVAILABLE',
    // Observational automated scan is never treated as a blanket verification certification
    isVerificationGrade: false,
    verificationStatus: !isScanSuccess ? 'UNAVAILABLE' : (detectedRiskFlags.length > 0 ? 'UNVERIFIED' : 'PARTIAL'),
    rawSourceValues: isScanSuccess ? {
      scan: {
        value: detectedRiskFlags.length > 0 ? detectedRiskFlags : 'NO_FLAGS_OBSERVED',
        timestamp: scanTimestamp,
        source: providerProvenance
      }
    } : undefined,
    details: scanDetails
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
 * - F3 MUST prevent any contradictory datum from producing a VALID verification result.
 */
export function verifyXStockEvidenceDataset(
  evidenceMap: Record<string, XStockNormalizedEvidence>,
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
  let sourceCount = 0;
  let derivedCount = 0;
  let verificationGradeCount = 0;

  const criticalContradictions: string[] = [];
  const criticalGaps: string[] = [];

  for (const datum of values) {
    if (datum.provenanceCategory === 'SOURCE') sourceCount++;
    if (datum.provenanceCategory === 'DERIVED') derivedCount++;
    if (datum.isVerificationGrade) verificationGradeCount++;

    const currentState = datum.state;
    switch (currentState) {
      case 'VALID':
        validCount++;
        break;
      case 'CONTRADICTORY':
        contradictoryCount++;
        criticalContradictions.push(`${datum.name || datum.dataType}: Sources materially conflict. ${datum.details || ''}`);
        break;
      case 'MISSING':
        missingCount++;
        criticalGaps.push(`${datum.name || datum.dataType}: Data point missing or unavailable.`);
        break;
      case 'STALE':
        staleCount++;
        criticalGaps.push(`${datum.name || datum.dataType}: Data point is stale (expired TTL or closed session).`);
        break;
      case 'SYNTHETIC':
        syntheticCount++;
        criticalGaps.push(`${datum.name || datum.dataType}: Synthetic / demo data rejected from verification.`);
        break;
      case 'INVALID':
        invalidCount++;
        criticalGaps.push(`${datum.name || datum.dataType}: ${datum.details || 'Invalid datum or scan alert.'}`);
        break;
    }
  }

  // Security Telemetry Evaluation (P2 Requirement):
  // - A successful provider response means SCAN AVAILABLE, not automatically "VALID/VERIFIED".
  // - Any detected risk flag must be surfaced as RISK FLAGS DETECTED, with the underlying finding preserved.
  // - No findings + successful scan reported as SCAN CLEAN / NO FLAGS OBSERVED, not a blanket safety certification.
  // - Missing, stale, malformed, or unavailable provider data -> PARTIAL / UNAVAILABLE, never VERIFIED.
  const scanDatum = evidenceMap['token_security_scan'];
  let securityScanStatus: 'SCAN_CLEAN' | 'RISK_FLAGS_DETECTED' | 'PARTIAL' | 'UNAVAILABLE' = 'UNAVAILABLE';
  if (scanDatum) {
    if (scanDatum.formattedValue === 'SCAN CLEAN / NO FLAGS OBSERVED' && scanDatum.state === 'VALID') {
      securityScanStatus = 'SCAN_CLEAN';
    } else if (scanDatum.formattedValue === 'RISK FLAGS DETECTED' || scanDatum.state === 'INVALID') {
      securityScanStatus = 'RISK_FLAGS_DETECTED';
    } else if (scanDatum.state === 'MISSING' || scanDatum.state === 'STALE') {
      securityScanStatus = 'UNAVAILABLE';
    } else {
      securityScanStatus = 'PARTIAL';
    }
  }

  // Multi-Source Price Verification Semantics (P0 Requirement):
  // 1. Require both CoinGecko RWA price AND CoinMarketCap price to be valid.
  // 2. Require a valid cross-source spread/convergence check within the existing 1.0% tolerance.
  // 3. If either source is missing, stale, invalid, or unavailable -> status must be PARTIAL / UNVERIFIED, never VERIFIED.
  // 4. Do not treat a single-source observation as "VALID" for the cross-aggregator verification pillar.
  // 5. Preserve existing provenance/evidence states and deterministic F3 rules.
  const rwaDatum = evidenceMap['coingecko_rwa_price'];
  const cmcDatum = evidenceMap['cmc_cross_check_price'];
  const spreadDatum = evidenceMap['multi_source_spread'];

  const isRwaValid = rwaDatum?.state === 'VALID' && typeof rwaDatum?.value === 'number' && rwaDatum.value > 0;
  const isCmcValid = cmcDatum?.state === 'VALID' && typeof cmcDatum?.value === 'number' && cmcDatum.value > 0;
  const isSpreadValid = spreadDatum?.state === 'VALID' && typeof spreadDatum?.value === 'number' && spreadDatum.value <= 1.0;
  const hasNoSpreadContradiction = spreadDatum?.state !== 'CONTRADICTORY';

  // Both independent market aggregators (CoinGecko RWA AND CoinMarketCap) must be strictly VALID and converged within tolerance
  const hasDualAggregatorConvergence = isRwaValid && isCmcValid && isSpreadValid && hasNoSpreadContradiction;

  // Determine multi-source price verification status:
  // If either source is missing, stale, invalid, or unavailable -> PARTIAL or UNVERIFIED, never VERIFIED
  let multiSourcePriceStatus: 'VERIFIED' | 'PARTIAL' | 'UNVERIFIED';
  if (spreadDatum?.state === 'CONTRADICTORY' || contradictoryCount > 0) {
    multiSourcePriceStatus = 'UNVERIFIED';
  } else if (hasDualAggregatorConvergence) {
    multiSourcePriceStatus = 'VERIFIED';
  } else if (isRwaValid || isCmcValid || (rwaDatum && rwaDatum.state !== 'MISSING') || (cmcDatum && cmcDatum.state !== 'MISSING')) {
    multiSourcePriceStatus = 'PARTIAL';
  } else {
    multiSourcePriceStatus = 'UNVERIFIED';
  }

  // F3 Deterministic Rule: VERIFIED requires genuine independent two-source price convergence,
  // and ZERO contradictions, synthetics, or invalids across all evidence data points.
  const isVerified = hasDualAggregatorConvergence && contradictoryCount === 0 && syntheticCount === 0 && invalidCount === 0;

  // Explicit deterministic critical gaps when two-source convergence is not met
  if (!hasDualAggregatorConvergence) {
    if (!isRwaValid && !isCmcValid) {
      criticalGaps.push('Multi-Source Price Verification: Both independent aggregators (CoinGecko RWA and CoinMarketCap) are missing or unavailable. Status: UNVERIFIED.');
    } else if (!isRwaValid) {
      criticalGaps.push(`Multi-Source Price Verification: CoinGecko RWA feed is ${rwaDatum?.state || 'MISSING'}. Single-source observation cannot be marked VERIFIED. Status: PARTIAL.`);
    } else if (!isCmcValid) {
      criticalGaps.push(`Multi-Source Price Verification: CoinMarketCap cross-check is ${cmcDatum?.state || 'MISSING'}. Single-source observation cannot be marked VERIFIED. Status: PARTIAL.`);
    } else if (!isSpreadValid) {
      criticalGaps.push(`Multi-Source Price Verification: Cross-aggregator spread (${spreadDatum?.value ?? 'N/A'}%) exceeds 1.0% tolerance. Status: UNVERIFIED.`);
    }
  }

  return {
    assetSymbol,
    underlyingTicker,
    verifiedAt: new Date().toISOString(),
    isVerified,
    status: multiSourcePriceStatus,
    multiSourcePriceStatus,
    securityScanStatus,
    securityScanDetails: scanDatum?.details,
    totalDataPoints: total,
    validCount,
    contradictoryCount,
    missingCount,
    staleCount,
    syntheticCount,
    invalidCount,
    sourceCount,
    derivedCount,
    verificationGradeCount,
    data: evidenceMap,
    criticalContradictions,
    criticalGaps
  };
}
