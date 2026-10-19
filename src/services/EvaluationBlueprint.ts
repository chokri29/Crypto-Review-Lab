/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { formatDefiLlamaTvl } from './defillama';
import { CRL_VERSION_MANIFEST } from '../versionManifest';

export interface EvaluationDimension {
  id: string;
  name: string;
  weight: number; // Decimal e.g. 0.25 for 25%
  percentageText: string;
  description: string;
  keyCriteria: string[];
}

export type ProtocolCategoryType =
  | 'Layer 1 Blockchain'
  | 'Layer 2 / Scaling'
  | 'Restaking / Shared Security / AVS'
  | 'DeFi Protocol (AMM / Lending)'
  | 'RWA (Tokenization / TradFi Bridge)'
  | 'DePIN (Compute / Storage / Wireless)'
  | 'Privacy / Cryptographic (FHE / ZK / MPC)'
  | 'Infrastructure (Oracle / Bridge)'
  | 'Memecoin / Speculative'
  | 'Specialized / Experimental';

export function normalizeProtocolCategory(catInput?: string): ProtocolCategoryType {
  if (!catInput) return 'DeFi Protocol (AMM / Lending)';
  const cat = catInput.toLowerCase();
  if (cat.includes('restak') || cat.includes('eigen') || cat.includes('shared security') || cat.includes('avs') || cat.includes('symbiotic') || cat.includes('karak')) {
    return 'Restaking / Shared Security / AVS';
  }
  if (cat.includes('rwa') || cat.includes('tokeniz') || cat.includes('tradfi') || cat.includes('real world asset') || cat.includes('real-world')) {
    return 'RWA (Tokenization / TradFi Bridge)';
  }
  // Oracle/Bridge should be detected BEFORE DePIN so labels such as
  // "DePIN / Oracles" do not incorrectly normalize to DePIN.
  if (cat.includes('infra') || cat.includes('oracle') || cat.includes('bridge') || cat.includes('indexing')) {
    return 'Infrastructure (Oracle / Bridge)';
  }
  if (cat.includes('depin') || cat.includes('compute') || cat.includes('storage') || cat.includes('wireless') || cat.includes('hardware')) {
    return 'DePIN (Compute / Storage / Wireless)';
  }
  if (cat.includes('meme') || cat.includes('speculative') || cat.includes('doge') || cat.includes('pepe') || cat.includes('shib')) {
    return 'Memecoin / Speculative';
  }
  if (cat.includes('l2') || cat.includes('layer 2') || cat.includes('scaling') || cat.includes('rollup') || cat.includes('arbitrum') || cat.includes('optimism')) {
    return 'Layer 2 / Scaling';
  }
  if (cat.includes('l1') || cat.includes('layer 1') || cat.includes('blockchain') || cat.includes('solana') || cat.includes('sui') || cat.includes('avalanche') || cat.includes('cardano')) {
    return 'Layer 1 Blockchain';
  }
  if (cat.includes('privacy') || cat.includes('fhe') || cat.includes('zk') || cat.includes('mpc') || cat.includes('cryptographic') || cat.includes('confidential')) {
    return 'Privacy / Cryptographic (FHE / ZK / MPC)';
  }
  if (cat.includes('defi') || cat.includes('amm') || cat.includes('lending') || cat.includes('exchange') || cat.includes('vault') || cat.includes('perp') || cat.includes('protocol')) {
    return 'DeFi Protocol (AMM / Lending)';
  }
  return 'Specialized / Experimental';
}

export interface CategoryWeights {
  utility: number;
  tokenomics: number;
  security: number;
  team: number;
  community: number;
}

export function getCategoryDimensionWeights(categoryType: ProtocolCategoryType): CategoryWeights {
  switch (categoryType) {
    case 'Restaking / Shared Security / AVS':
      return { utility: 0.25, tokenomics: 0.15, security: 0.35, team: 0.15, community: 0.10 };
    case 'DeFi Protocol (AMM / Lending)':
      return { utility: 0.25, tokenomics: 0.20, security: 0.35, team: 0.10, community: 0.10 };
    case 'Privacy / Cryptographic (FHE / ZK / MPC)':
      return { utility: 0.25, tokenomics: 0.10, security: 0.35, team: 0.20, community: 0.10 };
    case 'Layer 1 Blockchain':
      return { utility: 0.25, tokenomics: 0.20, security: 0.30, team: 0.10, community: 0.15 };
    case 'Layer 2 / Scaling':
      return { utility: 0.25, tokenomics: 0.15, security: 0.35, team: 0.10, community: 0.15 };
    case 'Infrastructure (Oracle / Bridge)':
      return { utility: 0.25, tokenomics: 0.15, security: 0.35, team: 0.15, community: 0.10 };
    case 'RWA (Tokenization / TradFi Bridge)':
      return { utility: 0.25, tokenomics: 0.20, security: 0.35, team: 0.10, community: 0.10 };
    case 'DePIN (Compute / Storage / Wireless)':
      return { utility: 0.30, tokenomics: 0.20, security: 0.25, team: 0.15, community: 0.10 };
    case 'Memecoin / Speculative':
      return { utility: 0.10, tokenomics: 0.30, security: 0.20, team: 0.10, community: 0.30 };
    case 'Specialized / Experimental':
    default:
      return { utility: 0.25, tokenomics: 0.25, security: 0.25, team: 0.15, community: 0.10 };
  }
}

export interface DataConfidenceBreakdown {
  overallConfidencePct: number;
  confidenceLevel: 'HIGH' | 'MODERATE' | 'LOW';
  verifiedOnChainPct: number;
  publicAuditsPct: number;
  simulatedDataPct: number;
  details: string[];
}

export type VerificationExecutionStatus = 'DEFINED' | 'EXECUTED' | 'VERIFIED' | 'FAILED' | 'NOT_EXECUTED' | 'INSUFFICIENT_DATA';

/**
 * Calculates Data Confidence metrics and quality indicators.
 * Deterministic threshold mapping:
 * - HIGH: >= 85%
 * - MODERATE: 70% – 84%
 * - LOW: < 70%
 */
export interface EvidenceCoverageBreakdown {
  coveragePct: number;
  totalVectors: number;
  verifiedVectors: number;
  missingVectors: number;
  unavailableVectors: number;
  states: {
    bytecode: 'VERIFIED' | 'MISSING';
    securityScan: 'VERIFIED' | 'UNAVAILABLE';
    marketTelemetry: 'VERIFIED' | 'UNAVAILABLE';
    publicAudits: 'VERIFIED' | 'NOT VERIFIED';
    reserveTvl: 'VERIFIED' | 'UNAVAILABLE';
  };
  details: string[];
}

export function calculateEvidenceCoverage(
  hasOnChainAddress: boolean = false,
  hasSecurityScan: boolean = false,
  hasMarketData: boolean = true,
  hasPublicAudits: boolean = false,
  hasRealTvl: boolean = false
): EvidenceCoverageBreakdown {
  const states = {
    bytecode: hasOnChainAddress ? ('VERIFIED' as const) : ('MISSING' as const),
    securityScan: hasSecurityScan ? ('VERIFIED' as const) : ('UNAVAILABLE' as const),
    marketTelemetry: hasMarketData ? ('VERIFIED' as const) : ('UNAVAILABLE' as const),
    publicAudits: hasPublicAudits ? ('VERIFIED' as const) : ('NOT VERIFIED' as const),
    reserveTvl: hasRealTvl ? ('VERIFIED' as const) : ('UNAVAILABLE' as const),
  };

  const vectors = Object.values(states);
  const verifiedCount = vectors.filter(v => v === 'VERIFIED').length;
  const coveragePct = Math.round((verifiedCount / vectors.length) * 100);

  const details: string[] = [
    `On-Chain Bytecode: [${states.bytecode}] ${hasOnChainAddress ? 'Smart contract address & bytecode registered' : 'No contract address supplied'}`,
    `Security Telemetry & Invariants: [${states.securityScan}] ${hasSecurityScan ? 'On-chain vulnerability & honeypot scan active' : 'Automated security scan unavailable'}`,
    `Multi-Source Market Telemetry: [${states.marketTelemetry}] ${hasMarketData ? 'Live price, volume & liquidity indexed' : 'Market telemetry unavailable'}`,
    `Independent Third-Party Audits: [${states.publicAudits}] ${hasPublicAudits ? 'Verified public security audits on record' : 'Audits not independently verified in this run; qualitative claims remain unconfirmed'}`,
    `Reserve / TVL Telemetry: [${states.reserveTvl}] ${hasRealTvl ? 'Active TVL tracking on DefiLlama' : 'TVL telemetry unavailable on DefiLlama'}`
  ];

  return {
    coveragePct,
    totalVectors: vectors.length,
    verifiedVectors: verifiedCount,
    missingVectors: vectors.filter(v => v === 'MISSING').length,
    unavailableVectors: vectors.filter(v => v === 'UNAVAILABLE' || v === 'NOT VERIFIED').length,
    states,
    details
  };
}

export function calculateDataConfidence(
  hasOnChainAddress: boolean = false,
  hasPublicAudits: boolean = false,
  scores?: { utility: number; security: number }
): DataConfidenceBreakdown {
  const onChain = hasOnChainAddress ? 50 : 0;
  const publicAudits = hasPublicAudits ? 50 : 0;
  const simulated = 0;

  const totalConfidence = Math.min(100, Math.max(0, onChain + publicAudits));
  const roundedConfidence = Math.round(totalConfidence);

  let level: 'HIGH' | 'MODERATE' | 'LOW' = 'LOW';
  if (roundedConfidence >= 85) level = 'HIGH';
  else if (roundedConfidence >= 70) level = 'MODERATE';
  else level = 'LOW';

  const details: string[] = [
    hasOnChainAddress
      ? `On-Chain Bytecode: [VERIFIED] Smart contract address & on-chain data verified`
      : `On-Chain Bytecode: [MISSING] No direct smart contract address / verified bytecode on file`,
    hasPublicAudits
      ? `Third-Party Security Audits: [VERIFIED] Verified public security audits / AST analysis`
      : `Third-Party Security Audits: [NOT VERIFIED] Audits not independently verified in this run; qualitative claims remain unconfirmed`,
    `Evidence State Integrity: Missing or unindexed inputs remain in explicit UNAVAILABLE / NOT VERIFIED states`
  ];

  return {
    overallConfidencePct: roundedConfidence,
    confidenceLevel: level,
    verifiedOnChainPct: onChain,
    publicAuditsPct: publicAudits,
    simulatedDataPct: simulated,
    details
  };
}

export interface TechnicalScanVector {
  name: string;
  depth: string;
  check: string;
  status: VerificationExecutionStatus;
  verdict: string;
}

export function getCategoryTechnicalVectors(categoryType: ProtocolCategoryType): TechnicalScanVector[] {
  switch (categoryType) {
    case 'Restaking / Shared Security / AVS':
      return [
        { name: 'Operator Slashing & Intersubjective Faults', depth: 'Slashing Module', check: 'Intersubjective Slashing Conditions', status: 'DEFINED', verdict: '[DEFINED: PENDING EXECUTION]' },
        { name: 'AVS Quorum & Attestation Weighting', depth: 'Quorum Consensus', check: 'Dual-Staking Quorum Bounds', status: 'DEFINED', verdict: '[DEFINED: PENDING EXECUTION]' },
        { name: 'Withdrawal Delay & Unbonding Escrow', depth: 'Unbonding Queue', check: 'Unbonding Timelock Invariant', status: 'DEFINED', verdict: '[DEFINED: PENDING EXECUTION]' },
        { name: 'LRT Peg Stability & Liquidity Buffer', depth: 'Liquid Restaking', check: 'LRT Depeg & Reserve Parity', status: 'DEFINED', verdict: '[DEFINED: PENDING EXECUTION]' },
        { name: 'Dual-Staking Tokenomics & Slashed Collateral', depth: 'Token Mechanics', check: 'Dual Staking Reward Equilibrium', status: 'DEFINED', verdict: '[DEFINED: PENDING EXECUTION]' },
        { name: 'Centralization & Multi-AVS Operator Collusion', depth: 'Operator Topology', check: 'Operator Stake Concentration Bounds', status: 'DEFINED', verdict: '[DEFINED: PENDING EXECUTION[...]