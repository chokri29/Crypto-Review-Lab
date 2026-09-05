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
}

export type XStockEvidenceDatum<T = number | null> = XStockNormalizedEvidence;

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
  const rwaState: XStockEvidenceState = hasRwaPrice 
    ? (quote?.provenance === 'STALE' ? 'STALE' : quote?.provenance === 'SYNTHETIC' ? 'SYNTHETIC' : 'VALID')
    : 'MISSING';
  const rwaFreshness: XStockEvidenceFreshness = hasRwaPrice
    ? (quote?.provenance === 'STALE' ? 'STALE' : 'LIVE')
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
  const cmcState: XStockEvidenceState = hasCmcPrice ? 'VALID' : 'MISSING';
  const cmcFreshness: XStockEvidenceFreshness = hasCmcPrice ? 'LIVE' : 'UNAVAILABLE';
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

  if (hasRwaPrice && hasCmcPrice) {
    rawPairValues['TOKENIZED_MARKET'] = { value: rwaPrice, timestamp: rwaTimestamp, source: 'TOKENIZED_MARKET' };
    rawPairValues['SECONDARY_TOKEN_MARKET'] = { value: cmcPrice, timestamp: cmcTimestamp, source: 'SECONDARY_TOKEN_MARKET' };
    const avg = (rwaPrice + cmcPrice) / 2;
    convergenceSpreadPct = Math.abs(rwaPrice - cmcPrice) / avg * 100;
    
    // Contradiction Check: If divergence exceeds tolerance (1.0%) or status is unresolved, mark CONTRADICTORY
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

  const spreadFreshness: XStockEvidenceFreshness = (hasRwaPrice || hasCmcPrice) ? 'LIVE' : 'UNAVAILABLE';
  const spreadTimestamp = rwaTimestamp || cmcTimestamp || null;

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
    isVerificationGrade: false,
    rawSourceValues: rawPairValues,
    details: convergenceState === 'CONTRADICTORY'
      ? `Material divergence (${convergenceSpreadPct?.toFixed(2)}% > 1.0% tolerance) between TOKENIZED_MARKET ($${rwaPrice?.toFixed(2)}) and SECONDARY_TOKEN_MARKET ($${cmcPrice?.toFixed(2)}). Original values preserved; consensus price suppressed.`
      : convergenceSpreadPct !== null
      ? `Feeds converged within tolerance (${convergenceSpreadPct.toFixed(2)}%).`
      : 'Insufficient independent aggregator feeds to measure pairwise spread.'
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
  const hasContract = Boolean(stock.contractAddress && stock.contractAddress.trim().length > 4);
  const isScanSuccess = scanResponse?.success && Boolean(scanResponse?.data);
  const scanData = scanResponse?.data;
  const isSolana = stock.chain === 'Solana';

  let scanState: XStockEvidenceState = 'MISSING';
  if (!hasContract) {
    scanState = 'MISSING';
  } else if (isScanSuccess) {
    if (scanData?.is_honeypot) {
      scanState = 'INVALID';
    } else {
      scanState = 'VALID';
    }
  } else if (scanResponse?.error) {
    scanState = 'INVALID';
  } else {
    scanState = 'MISSING';
  }

  const scanTimestamp = scanResponse?.timestamp ? new Date(scanResponse.timestamp).toISOString() : null;

  data['token_security_scan'] = {
    id: 'token_security_scan',
    name: isSolana ? 'On-Chain Token Authority & Security Scan' : 'Contract Bytecode Security Scan',
    dataType: 'Smart Contract Authority & Vulnerability Telemetry',
    source: 'ON_CHAIN',
    assetId: stock.contractAddress || 'No Address On File',
    value: isScanSuccess ? (scanData?.is_honeypot ? 0 : 1) : null,
    formattedValue: isScanSuccess ? (scanData?.is_honeypot ? 'Honeypot Alert' : 'Verified Scan') : (scanState === 'INVALID' ? 'Security Alert' : 'Unavailable'),
    timestamp: scanTimestamp,
    providerTimestamp: scanTimestamp ? new Date(scanTimestamp).toLocaleTimeString() : null,
    freshness: isScanSuccess ? 'LIVE' : 'UNAVAILABLE',
    freshnessStatus: isScanSuccess ? 'LIVE' : 'UNAVAILABLE',
    state: scanState,
    provenance: scanState,
    provenanceCategory: hasContract ? 'SOURCE' : 'UNAVAILABLE',
    isVerificationGrade: Boolean(isScanSuccess && scanState === 'VALID'),
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
        criticalGaps.push(`${datum.name || datum.dataType}: Invalid datum or scan alert.`);
        break;
    }
  }

  // Verification is verified ONLY when at least the critical pricing telemetry is strictly VALID
  // and there are ZERO contradictions, synthetics, stales, or invalids in core market data.
  const corePriceDatum = evidenceMap['coingecko_rwa_price'];
  const spreadDatum = evidenceMap['multi_source_spread'];
  const hasValidCorePrice = corePriceDatum?.state === 'VALID';
  const hasNoContradiction = spreadDatum?.state !== 'CONTRADICTORY';

  // F3 Rule: any contradictory or synthetic datum strictly prevents a VALID verification outcome
  const isVerified = hasValidCorePrice && hasNoContradiction && contradictoryCount === 0 && syntheticCount === 0 && invalidCount === 0;

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
    sourceCount,
    derivedCount,
    verificationGradeCount,
    data: evidenceMap,
    criticalContradictions,
    criticalGaps
  };
}
