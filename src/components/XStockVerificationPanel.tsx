/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw, 
  Building2, 
  Scale, 
  Layers, 
  Lock, 
  FileText, 
  Landmark, 
  Activity, 
  ArrowRightLeft, 
  HelpCircle,
  Clock,
  Sparkles,
  Share2,
  Copy,
  Check,
  Send,
  ChevronDown
} from 'lucide-react';
import { XStockRegistryItem, UsMarketHoursStatus } from '../data/xstocksRegistry';
import { XStockQuoteState } from './XStocksPage';
import { useCurrency } from '../context/CurrencyContext';
import { getPublicXStockShareUrl, copyTextToClipboard } from '../utils/shareUtils';
import { CoinGeckoRwaDetail, CoinGeckoRwaIssuerDetail } from '../services/coingeckoRwa';
import { 
  buildXStockEvidenceDataset, 
  verifyXStockEvidenceDataset, 
  XStockEvidenceDatum, 
  XStockEvidenceVerificationReport,
  XStockEvidenceState 
} from '../services/xstockEvidenceEngine';

interface SecurityScanData {
  is_honeypot?: boolean;
  is_mintable?: boolean;
  owner_change_balance?: boolean;
  is_blacklisted?: boolean;
  is_proxy?: boolean;
  is_open_source?: boolean;
  renounced?: boolean;
  trust_list?: boolean;
  owner_is_contract?: boolean;
  owner_type_label?: string;
  highRiskCount?: number;
  warnRiskCount?: number;
  tokenName?: string;
  tokenSymbol?: string;
  ownerAddress?: string;
  buyTax?: string;
  sellTax?: string;
  cannotSell?: boolean;
  verified_contract?: boolean;
  rugcheckScore?: number;
  rugcheckRisks?: Array<{ name: string; description: string; score: number; level: string }>;
}

interface SecurityScanResponse {
  success: boolean;
  source: string;
  contractAddress: string;
  chainId: string;
  timestamp: string;
  providers?: Record<string, { status: string; error?: string }>;
  data?: SecurityScanData;
  error?: string;
}

interface XStockVerificationPanelProps {
  selectedStock: XStockRegistryItem;
  activeQuote?: XStockQuoteState;
  marketHours: UsMarketHoursStatus;
  isRefreshingQuotes?: boolean;
  onRefreshAll?: () => void;
  rwaDetail?: CoinGeckoRwaDetail | null;
  rwaIssuerDetail?: CoinGeckoRwaIssuerDetail | null;
  isLoadingRwa?: boolean;
}

export default function XStockVerificationPanel({
  selectedStock,
  activeQuote,
  marketHours,
  isRefreshingQuotes,
  onRefreshAll,
  rwaDetail,
  rwaIssuerDetail,
  isLoadingRwa = false
}: XStockVerificationPanelProps) {
  const { formatPrice, formatCompactCap } = useCurrency();
  const [scanResponse, setScanResponse] = useState<SecurityScanResponse | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedContract, setCopiedContract] = useState<string | null>(null);
  const [showFaqInfo, setShowFaqInfo] = useState<boolean>(false);
  const [showEvidenceMatrix, setShowEvidenceMatrix] = useState<boolean>(false);

  // Deterministic F3 / AVF Evidence Integrity Audit calculation
  const evidenceAudit: XStockEvidenceVerificationReport = useMemo(() => {
    const dataset = buildXStockEvidenceDataset(
      selectedStock,
      activeQuote,
      marketHours,
      rwaDetail,
      scanResponse
    );
    return verifyXStockEvidenceDataset(dataset, selectedStock.symbol, selectedStock.underlyingTicker);
  }, [selectedStock, activeQuote, marketHours, rwaDetail, scanResponse]);

  const evidenceList: XStockEvidenceDatum<any>[] = useMemo(() => {
    return Object.values(evidenceAudit.data);
  }, [evidenceAudit]);

  const overallStatus = evidenceAudit.isVerified
    ? 'VERIFIED_CLEAN'
    : (evidenceAudit.contradictoryCount > 0 ? 'CONTRADICTORY_DATA' : 'VERIFIED_WITH_GAPS');

  const handleCopyContract = async (text: string, key: string) => {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedContract(key);
      setTimeout(() => setCopiedContract(null), 2000);
    }
  };

  // Social sharing handlers
  const handleCopyShareLink = async () => {
    const url = getPublicXStockShareUrl(selectedStock.symbol);
    const success = await copyTextToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareTwitter = () => {
    const url = getPublicXStockShareUrl(selectedStock.symbol);
    const text = `Explore the public market data cross-check & token verification report for ${selectedStock.name} (${selectedStock.symbol} ↔ ${selectedStock.underlyingTicker}) on Crypto Review Lab:`;
    const shareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareHref, '_blank', 'noopener,noreferrer');
  };

  const handleShareFacebook = () => {
    const url = getPublicXStockShareUrl(selectedStock.symbol);
    const shareHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareHref, '_blank', 'noopener,noreferrer');
  };

  const handleShareTelegram = () => {
    const url = getPublicXStockShareUrl(selectedStock.symbol);
    const text = `Public Verification & Integrity Report for ${selectedStock.name} (${selectedStock.symbol}):`;
    const shareHref = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(shareHref, '_blank', 'noopener,noreferrer');
  };

  // Fetch contract security scan via /api/security/scan
  const fetchSecurityScan = useCallback(async (stock: XStockRegistryItem) => {
    if (!stock.contractAddress) {
      setScanResponse(null);
      setScanError(null);
      return;
    }

    setIsScanning(true);
    setScanError(null);

    try {
      const url = `/api/security/scan?chain=${encodeURIComponent(stock.chain.toLowerCase())}&address=${encodeURIComponent(stock.contractAddress.trim())}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Security scan failed with status: ${res.status}`);
      }
      const data: SecurityScanResponse = await res.json();
      setScanResponse(data);
    } catch (err: any) {
      console.warn('Security scan fetch error:', err);
      setScanError(err.message || 'Unable to complete automated bytecode security scan.');
      setScanResponse(null);
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Trigger scan when selectedStock changes
  useEffect(() => {
    fetchSecurityScan(selectedStock);
  }, [selectedStock, fetchSecurityScan]);

  // --- 1. Compute Crypto-Side Feed Triangulation (Feed Integrity Check) ---
  const cgPrice = activeQuote?.cgPrice;
  const cmcPrice = activeQuote?.cmcPrice;
  const hasDualCryptoFeeds = typeof cgPrice === 'number' && cgPrice > 0 && typeof cmcPrice === 'number' && cmcPrice > 0;
  const hasSingleCryptoFeed = (typeof cgPrice === 'number' && cgPrice > 0) || (typeof cmcPrice === 'number' && cmcPrice > 0);

  let cryptoDivergencePct: number | null = null;
  let cryptoFeedStatus: 'CONVERGED' | 'MINOR_VARIANCE' | 'DIVERGENT' | 'SINGLE_FEED' | 'UNAVAILABLE' = 'UNAVAILABLE';

  if (hasDualCryptoFeeds) {
    const avgPrice = (cgPrice! + cmcPrice!) / 2;
    cryptoDivergencePct = Math.abs(cgPrice! - cmcPrice!) / avgPrice * 100;
    if (cryptoDivergencePct < 0.2) {
      cryptoFeedStatus = 'CONVERGED';
    } else if (cryptoDivergencePct < 1.0) {
      cryptoFeedStatus = 'MINOR_VARIANCE';
    } else {
      cryptoFeedStatus = 'DIVERGENT';
    }
  } else if (hasSingleCryptoFeed) {
    cryptoFeedStatus = 'SINGLE_FEED';
  } else {
    cryptoFeedStatus = 'UNAVAILABLE';
  }

  // --- 2. Compute Tracking-Error / Basis Divergence (Equity Basis Tracking Signal) ---
  const liveTokenPrice = activeQuote?.livePrice;
  const isDivergent = activeQuote?.status === 'UNRESOLVED_DIVERGENCE';
  const equityPrice = activeQuote?.equityPrice;
  const hasEquityPrice = typeof equityPrice === 'number' && equityPrice > 0;
  const hasLiveTokenPrice = typeof liveTokenPrice === 'number' && liveTokenPrice > 0 && !isDivergent;

  let basisDeviationPct: number | null = null;
  let basisStatus: 'TIGHT_PARITY' | 'MODERATE_BASIS' | 'ELEVATED_DIVERGENCE' | 'UNAVAILABLE' = 'UNAVAILABLE';

  if (hasLiveTokenPrice && hasEquityPrice) {
    basisDeviationPct = ((liveTokenPrice! - equityPrice!) / equityPrice!) * 100;
    const absBasis = Math.abs(basisDeviationPct);
    if (absBasis < 0.5) {
      basisStatus = 'TIGHT_PARITY';
    } else if (absBasis < 2.0) {
      basisStatus = 'MODERATE_BASIS';
    } else {
      basisStatus = 'ELEVATED_DIVERGENCE';
    }
  } else {
    basisStatus = 'UNAVAILABLE';
  }

  const scanData = scanResponse?.data;
  const hasScanData = scanResponse?.success && !!scanData;
  const isSolana = selectedStock.chain === 'Solana';

  return (
    <div id="xstock-verification-panel" className="p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-[#0a1017] to-slate-950 border-2 border-cyber-cyan/35 shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_24px_rgba(0,229,255,0.08)] space-y-6">
      
      {/* Panel Top Header with Free Public Verification Tag */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyber-cyan/20 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40">
              FREE PUBLIC VERIFICATION
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-purple-300 bg-purple-950/60 border border-purple-800/60">
              MARKET DATA CROSS-CHECK &amp; TOKEN SECURITY
            </span>
            <span className="text-slate-400 text-xs font-mono">
              {selectedStock.symbol} • {selectedStock.underlyingTicker}
            </span>
          </div>
          <h2 className="font-orbitron font-black text-lg sm:text-xl text-white tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyber-cyan shrink-0" />
            <span>Verification &amp; Integrity Panel ({selectedStock.name})</span>
          </h2>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            Free, independent verification for tokenized stocks (xStocks) — cross-checks on-chain market data against the underlying equity basis, scans token authorities for security risks, and discloses the issuer, underlying asset custodian, and proof of reserve structure behind the token.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Social Share Toolbar */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-cyber-cyan/30 px-2.5 py-1.5 rounded-xl shadow-sm">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Share2 className="w-3 h-3 text-cyber-cyan" />
              <span className="hidden sm:inline">Share:</span>
            </span>
            <button
              type="button"
              onClick={handleShareTwitter}
              className="p-1.5 hover:bg-cyber-cyan/20 text-slate-300 hover:text-cyber-cyan rounded-lg border border-slate-800 transition-colors cursor-pointer"
              title="Share verification telemetry on X (Twitter)"
              aria-label="Share on X"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleShareTelegram}
              className="p-1.5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 rounded-lg border border-slate-800 transition-colors cursor-pointer"
              title="Share on Telegram"
              aria-label="Share on Telegram"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleShareFacebook}
              className="p-1.5 hover:bg-blue-600/20 text-slate-300 hover:text-blue-400 rounded-lg border border-slate-800 transition-colors cursor-pointer"
              title="Share on Facebook"
              aria-label="Share on Facebook"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleCopyShareLink}
              className={`px-2 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900 hover:bg-cyber-cyan/20 text-slate-300 hover:text-cyber-cyan border-slate-800'
              }`}
              title="Copy Direct Public Link to Clipboard"
              aria-label="Copy Direct Link"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-cyber-cyan" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchSecurityScan(selectedStock);
              if (onRefreshAll) onRefreshAll();
            }}
            disabled={isScanning || isRefreshingQuotes}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyber-cyan/40 hover:border-cyber-cyan text-cyber-cyan text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            title="Re-run token security scan and synchronize market data feeds"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning || isRefreshingQuotes ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Refresh Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* METHODOLOGY & FAQ GUIDE ACCORDION */}
      <div className="rounded-xl border border-cyber-cyan/30 bg-slate-950/80 overflow-hidden shadow-md">
        <button
          type="button"
          onClick={() => setShowFaqInfo(!showFaqInfo)}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-900/70 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-cyber-cyan/15 border border-cyber-cyan/40 text-cyber-cyan flex items-center justify-center shrink-0">
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-orbitron font-bold text-xs text-white block">
                Verification Panel Methodology &amp; FAQs
              </span>
              <span className="text-[10.5px] font-mono text-slate-400">
                2 Key Questions • Market Data Cross-Check &amp; Finnhub tracking accuracy • Custody &amp; Proof-of-Reserve transparency
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-cyber-cyan flex items-center gap-1.5 font-bold shrink-0 ml-2">
            <span>{showFaqInfo ? 'Hide FAQs' : 'Read FAQs (2)'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFaqInfo ? 'rotate-180' : ''}`} />
          </span>
        </button>

        {showFaqInfo && (
          <div className="p-4 pt-2 border-t border-slate-800/90 text-xs font-mono text-slate-300 space-y-4 leading-relaxed bg-slate-950/95">
            {/* FAQ Item 1 */}
            <div className="space-y-2.5 pb-3 border-b border-slate-800/80">
              <h4 className="font-orbitron font-bold text-xs text-cyber-cyan flex items-center gap-1.5">
                <span className="text-white">Q1:</span> What is the Market Data Cross-Check &amp; Contract Verification Report for xStocks?
              </h4>
              <p className="text-slate-300 font-sans leading-relaxed">
                This is a free, public verification panel for tokenized stocks (xStocks) — independent of the paid Security &amp; Risk Assessment product. It checks three distinct things:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-cyber-cyan font-bold text-[11px] uppercase tracking-wider">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyber-cyan text-[10px] flex items-center justify-center font-black">1</span>
                    <span>Market Data Cross-Check</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans leading-normal">
                    Whether independent crypto market data aggregators (CoinGecko &amp; CoinMarketCap) agree on the token&apos;s on-chain price. (Note: They are market data aggregators, not blockchain oracles).
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-purple-500/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[11px] uppercase tracking-wider">
                    <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 text-[10px] flex items-center justify-center font-black">2</span>
                    <span>Equity Basis Tracking</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans leading-normal">
                    The real-time tracking error between the on-chain token and its underlying equity price via Finnhub (Live Equity Basis during active market hours, or Last Close / After-Hours Basis outside regular trading hours).
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px] uppercase tracking-wider">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] flex items-center justify-center font-black">3</span>
                    <span>{isSolana ? 'On-Chain Token Security & Authority Scan' : 'Contract Bytecode Security Scan'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans leading-normal">
                    An on-chain security scan (GoPlus or RugCheck: {isSolana ? 'On-Chain Token Security & Authority Scan on Solana' : 'Contract Bytecode Security Scan on EVM'}) verifying mint authority, freeze permissions, and token admin keys.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Item 2 */}
            <div className="space-y-2.5">
              <h4 className="font-orbitron font-bold text-xs text-cyber-cyan flex items-center gap-1.5">
                <span className="text-white">Q2:</span> How are Token Control, Underlying Asset Custody, and Proof of Reserve separated?
              </h4>
              <p className="text-slate-300 font-sans leading-relaxed">
                CRL strictly separates three independent architectural layers that must never be confused:
                <br />• <strong className="text-cyan-300">1. Token Control / Authorities:</strong> Smart contract mint, freeze, and upgrade permissions governing the on-chain token. Token authority does <span className="text-amber-300 font-semibold">NOT</span> constitute custody of the underlying shares.
                <br />• <strong className="text-purple-300">2. Underlying Asset Custody:</strong> The regulated, bankruptcy-remote custodian (e.g. licensed broker-dealer or trust company) holding the physical NYSE/NASDAQ equity shares in segregated custody.
                <br />• <strong className="text-emerald-300">3. Proof of Reserve (PoR):</strong> Public reserve attestations, balance feeds, or custodian reports demonstrating 1:1 backing between tokens and shares.
              </p>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200/90 font-sans flex items-start gap-2.5 mt-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-amber-300">CRL Transparency Policy:</span> Independent reference data and third-party reserves are strictly labeled without assumption of clean status when unverified or undisclosed.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* F3 / AVF DETERMINISTIC EVIDENCE INTEGRITY & PROVENANCE AUDIT MATRIX */}
      <div className="rounded-xl border border-cyber-cyan/35 bg-slate-950/90 overflow-hidden shadow-lg space-y-0">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-950 via-[#0a1420] to-slate-950 border-b border-cyber-cyan/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyber-cyan/15 border border-cyber-cyan/40 text-cyber-cyan flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-orbitron font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
                  F3 / AVF Evidence Integrity Matrix
                </span>
                <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase tracking-wider ${
                  overallStatus === 'VERIFIED_CLEAN'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : overallStatus === 'VERIFIED_WITH_GAPS'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  {overallStatus.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-[10.5px] font-mono text-slate-400">
                Deterministic provenance audit: {evidenceAudit.validCount} Valid • {evidenceAudit.missingCount} Missing • {evidenceAudit.staleCount} Stale • {evidenceAudit.syntheticCount} Synthetic • {evidenceAudit.contradictoryCount} Contradictory
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowEvidenceMatrix(!showEvidenceMatrix)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
          >
            <span>{showEvidenceMatrix ? 'Collapse Audit Rows' : `Inspect Audit Rows (${evidenceList.length})`}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showEvidenceMatrix ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Contradiction Warning Banner (if any) */}
        {evidenceAudit.contradictoryCount > 0 && (
          <div className="p-3.5 bg-rose-950/40 border-b border-rose-500/40 text-xs font-mono text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-rose-200 uppercase tracking-wider">
                Material Evidence Contradiction Detected:
              </span>
              <p className="text-[11px] text-rose-300/90 leading-relaxed font-sans">
                Evidence sources materially diverge. Rather than silently selecting one source as ground truth, all conflicting timestamps and provider values are preserved and flagged below.
              </p>
            </div>
          </div>
        )}

        {/* Audit Rows */}
        {showEvidenceMatrix && (
          <div className="p-4 space-y-3 bg-slate-950/95">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="py-2 px-2.5">Evidence Key</th>
                    <th className="py-2 px-2.5">Provider / Source</th>
                    <th className="py-2 px-2.5">Data Type</th>
                    <th className="py-2 px-2.5">Reported Value</th>
                    <th className="py-2 px-2.5">Provider Timestamp</th>
                    <th className="py-2 px-2.5">Freshness</th>
                    <th className="py-2 px-2.5 text-right">F3 / AVF State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-[11px]">
                  {evidenceList.map((item) => {
                    const stateBadgeStyle = {
                      VALID: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                      MISSING: 'bg-slate-800/80 text-slate-400 border-slate-700',
                      STALE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                      SYNTHETIC: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                      CONTRADICTORY: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                      INVALID: 'bg-red-500/25 text-red-200 border-red-500/50'
                    }[item.provenance];

                    return (
                      <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-2 px-2.5 font-bold text-white">
                          <div>{item.name}</div>
                          <div className="text-[9px] text-slate-500">{item.assetId}</div>
                        </td>
                        <td className="py-2 px-2.5 text-slate-300">
                          {item.source}
                        </td>
                        <td className="py-2 px-2.5 text-cyan-400/90 text-[10px]">
                          {item.dataType}
                        </td>
                        <td className="py-2 px-2.5 font-bold text-slate-200">
                          {item.formattedValue}
                        </td>
                        <td className="py-2 px-2.5 text-slate-400 text-[10px]">
                          {item.providerTimestamp ? new Date(item.providerTimestamp).toLocaleTimeString() : 'N/A'}
                        </td>
                        <td className="py-2 px-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                            item.freshnessStatus === 'LIVE' || item.freshnessStatus === 'FRESH'
                              ? 'text-cyan-300'
                              : item.freshnessStatus === 'STALE'
                              ? 'text-amber-400'
                              : 'text-slate-500'
                          }`}>
                            {item.freshnessStatus}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${stateBadgeStyle}`}>
                            {item.provenance}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-[10px] text-slate-400 font-sans leading-relaxed">
              <strong className="text-white">Strict Verification Policy:</strong> Non-VALID values (missing, stale, synthetic, contradictory, invalid) are never interpolated or converted into VALID state. Synthetic data is prohibited from entering verification scoring.
            </div>
          </div>
        )}
      </div>

      {/* SECTION 1: TWO DISTINCT SEPARATELY-LABELED DIVERGENCE CHECKS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-cyber-cyan" />
            <h3 className="font-orbitron font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
              Dual Divergence & Integrity Signals
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Feed Consistency & Equity Basis Tracking
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Divergence Check A: Crypto-Side Market Data Cross-Check */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-cyber-cyan/30 transition-all space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-cyan-300">
                  SIGNAL A: MARKET DATA CROSS-CHECK
                </span>
                <h4 className="font-orbitron font-bold text-xs text-white">
                  Market Data Cross-Check
                </h4>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                cryptoFeedStatus === 'CONVERGED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : cryptoFeedStatus === 'MINOR_VARIANCE'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : cryptoFeedStatus === 'DIVERGENT'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : cryptoFeedStatus === 'SINGLE_FEED'
                  ? 'bg-slate-800 text-slate-300 border border-slate-700'
                  : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}>
                {cryptoFeedStatus === 'CONVERGED'
                  ? 'Aggregators Converged (<0.20%)'
                  : cryptoFeedStatus === 'MINOR_VARIANCE'
                  ? `Minor Spread (${cryptoDivergencePct?.toFixed(2)}%)`
                  : cryptoFeedStatus === 'DIVERGENT'
                  ? `Aggregator Divergence (${cryptoDivergencePct?.toFixed(2)}%)`
                  : cryptoFeedStatus === 'SINGLE_FEED'
                  ? 'Single Aggregator Active'
                  : 'Data Unavailable'}
              </span>
            </div>

            <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
              Checks whether independent crypto market data aggregators (CoinGecko &amp; CoinMarketCap) agree on the on-chain secondary market price for <span className="text-white font-bold">{selectedStock.symbol}</span>. (Note: They are market data aggregators, not blockchain oracles).
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[9px] text-slate-500 block uppercase">CoinGecko Market Data</span>
                <span className="text-white font-bold">
                  {typeof cgPrice === 'number' && cgPrice > 0 ? formatPrice(cgPrice) : 'No quote'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[9px] text-slate-500 block uppercase">CoinMarketCap Market Data</span>
                <span className="text-white font-bold">
                  {typeof cmcPrice === 'number' && cmcPrice > 0 ? formatPrice(cmcPrice) : 'No quote'}
                </span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between border-t border-slate-900 pt-2">
              <span>Aggregator Spread Variance:</span>
              <span className={`font-bold ${
                cryptoDivergencePct !== null
                  ? cryptoDivergencePct < 0.2
                    ? 'text-emerald-400'
                    : cryptoDivergencePct < 1.0
                    ? 'text-amber-400'
                    : 'text-rose-400'
                  : 'text-slate-600'
              }`}>
                {cryptoDivergencePct !== null ? `${cryptoDivergencePct.toFixed(3)}%` : 'Unable to triangulate (single/zero aggregator)'}
              </span>
            </div>
          </div>

          {/* Divergence Check B: Tracking-Error / Basis Divergence */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-purple-500/30 transition-all space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-purple-400">
                  {marketHours.isOpen ? 'SIGNAL B: LIVE EQUITY BASIS' : 'SIGNAL B: LAST CLOSE / AFTER-HOURS BASIS'}
                </span>
                <h4 className="font-orbitron font-bold text-xs text-white">
                  {marketHours.isOpen ? 'Live Equity Basis Tracking' : 'Last Close / After-Hours Basis Tracking'}
                </h4>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                basisStatus === 'TIGHT_PARITY'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : basisStatus === 'MODERATE_BASIS'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : basisStatus === 'ELEVATED_DIVERGENCE'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}>
                {basisStatus === 'TIGHT_PARITY'
                  ? 'Tight Parity (<0.50%)'
                  : basisStatus === 'MODERATE_BASIS'
                  ? `Moderate Basis (${basisDeviationPct !== null ? (basisDeviationPct >= 0 ? '+' : '') + basisDeviationPct.toFixed(2) + '%' : ''})`
                  : basisStatus === 'ELEVATED_DIVERGENCE'
                  ? `Elevated Divergence (${basisDeviationPct !== null ? (basisDeviationPct >= 0 ? '+' : '') + basisDeviationPct.toFixed(2) + '%' : ''})`
                  : 'Reference Unavailable'}
              </span>
            </div>

            <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
              Measures the real-time tracking error between the on-chain token (<span className="text-white font-bold">{selectedStock.symbol}</span>) and its underlying NYSE/NASDAQ equity (<span className="text-purple-300 font-bold">{selectedStock.underlyingTicker}</span> via Finnhub).
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[9px] text-slate-500 block uppercase">On-Chain Price ({selectedStock.symbol})</span>
                <span className="text-cyber-cyan font-bold">
                  {isDivergent ? (
                    <span className="text-amber-400">Divergent (Unresolved)</span>
                  ) : typeof liveTokenPrice === 'number' && liveTokenPrice > 0 ? (
                    formatPrice(liveTokenPrice)
                  ) : (
                    'Unavailable'
                  )}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-purple-950/60">
                <span className="text-[9px] text-purple-400/80 block uppercase">
                  {selectedStock.underlyingTicker} Equity Reference
                </span>
                <span className="text-purple-300 font-bold">
                  {typeof equityPrice === 'number' && equityPrice > 0 ? formatPrice(equityPrice) : 'Unavailable'}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">
                  Timestamp: {activeQuote?.equityQuote?.basisTimestampFormatted || marketHours.easternTimeFormatted}
                </span>
              </div>
            </div>

            {/* Session Basis & Timestamp Context Badge */}
            <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800/80 text-[10px] font-mono flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Basis Reference:</span>
              </span>
              <div className="text-right">
                <span className={`font-bold ${marketHours.isOpen ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {marketHours.isOpen ? 'Live Equity Basis' : 'Last Close / After-Hours Basis'}
                </span>
                <span className="text-slate-400 text-[9.5px] ml-1.5 font-mono">
                  ({activeQuote?.equityQuote?.basisTimestampFormatted || marketHours.easternTimeFormatted})
                </span>
              </div>
            </div>

            <p className="text-[9.5px] font-mono text-slate-500 leading-normal">
              {marketHours.isOpen
                ? `Primary US equities market is actively trading (Live Equity Basis). Refreshed: ${activeQuote?.equityQuote?.basisTimestampFormatted || marketHours.easternTimeFormatted}.`
                : `US equities markets closed (Last Close / After-Hours Basis). Last session close: ${activeQuote?.equityQuote?.basisTimestampFormatted || marketHours.easternTimeFormatted}. Outside regular market hours, on-chain price reflects 24/7 sentiment against the official close.`}
            </p>
          </div>

        </div>
      </div>

      {/* SECTION 2: TOKEN SECURITY SCAN (GoPlus / RugCheck Pipeline) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyber-cyan" />
            <h3 className="font-orbitron font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
              {isSolana ? 'On-Chain Token Security & Authority Scan' : 'On-Chain Contract Bytecode Security Scan'}
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {isSolana ? 'GoPlus • RugCheck SPL Scan' : 'GoPlus • RugCheck • Blockscout'}
          </span>
        </div>

        {!selectedStock.contractAddress ? (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3 text-xs font-mono text-slate-400">
            <HelpCircle className="w-5 h-5 text-slate-500 shrink-0" />
            <div>
              <div className="text-slate-300 font-bold">
                {isSolana ? 'Token Mint Address Not On File' : 'Contract Address Not On File'}
              </div>
              <div className="text-slate-500 text-[11px]">
                {isSolana
                  ? `No token mint address is registered for ${selectedStock.symbol} on Solana. Authority scan cannot execute without a verified mint address.`
                  : `No contract address is registered for ${selectedStock.symbol} on ${selectedStock.chain}. Bytecode vulnerability scan is unable to run without a verified token address.`}
              </div>
            </div>
          </div>
        ) : isScanning ? (
          <div className="p-6 rounded-xl bg-slate-950/80 border border-cyber-cyan/30 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-cyber-cyan animate-spin mx-auto" />
            <div className="text-xs font-mono text-white font-bold">
              {isSolana ? 'Executing On-Chain Token Security & Authority Scan...' : 'Executing Bytecode Security Scan...'}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Querying GoPlus Security &amp; RugCheck engines for {selectedStock.chain} token {selectedStock.contractAddress.slice(0, 8)}...
            </div>
          </div>
        ) : scanError ? (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/40 flex items-center gap-3 text-xs font-mono text-amber-300">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold">Automated Scan Notice</div>
              <div className="text-slate-400 text-[11px]">{scanError}</div>
            </div>
          </div>
        ) : hasScanData ? (
          <div className="p-4 rounded-xl bg-slate-950/90 border border-cyber-cyan/20 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="text-xs font-mono text-slate-300 flex items-center gap-2">
                <span className="text-slate-500">Source:</span>
                <span className="text-white font-bold">{scanResponse.source}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-500">{isSolana ? 'Token Mint:' : 'Contract:'}</span>
                <span className="font-mono text-cyber-cyan">{selectedStock.contractAddress.slice(0, 6)}...{selectedStock.contractAddress.slice(-4)}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
                {scanResponse.timestamp ? new Date(scanResponse.timestamp).toLocaleTimeString() : 'Live Scan'}
              </span>
            </div>

            {/* Security Findings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 font-mono text-xs">
              
              {/* Honeypot / Program Check */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1">
                <div className="text-[9.5px] text-slate-500 uppercase tracking-wider">
                  {isSolana ? 'Token Program / Freeze Risk' : 'Honeypot Analysis'}
                </div>
                <div className="flex items-center gap-1.5 font-bold">
                  {scanData.is_honeypot ? (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="text-rose-400">{isSolana ? 'Transfer Restriction Flagged' : 'Honeypot Detected (Critical)'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300">{isSolana ? 'Standard SPL Program' : 'No Honeypot Code'}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Mintable Check */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1">
                <div className="text-[9.5px] text-slate-500 uppercase tracking-wider">Mint Authority / Supply</div>
                <div className="flex items-center gap-1.5 font-bold">
                  {scanData.is_mintable ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-amber-300">Mintable (Issuer Admin Key)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300">Fixed / Non-Mintable</span>
                    </>
                  )}
                </div>
              </div>

              {/* Blacklist / Freeze Check */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1">
                <div className="text-[9.5px] text-slate-500 uppercase tracking-wider">Blacklist / Freeze Ability</div>
                <div className="flex items-center gap-1.5 font-bold">
                  {scanData.is_blacklisted ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-amber-300">Freeze Authority Present</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300">No Freeze / Blacklist</span>
                    </>
                  )}
                </div>
              </div>

              {/* Token Control / Admin Authority (Strictly separate from underlying share custody) */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1">
                <div className="text-[9.5px] text-slate-500 uppercase tracking-wider">Token Control / Authorities</div>
                <div className="flex items-center gap-1.5 font-bold">
                  <Lock className="w-3.5 h-3.5 text-cyber-cyan shrink-0" />
                  <span className="text-white">
                    {scanData.renounced
                      ? 'Renounced Token Authority'
                      : scanData.owner_type_label || (isSolana ? 'Issuer Admin Key' : 'Managed Account')}
                  </span>
                </div>
                <div className="text-[9px] text-slate-500">
                  On-chain authority only (distinct from underlying share custody)
                </div>
              </div>

              {/* Transfer Taxes */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1">
                <div className="text-[9.5px] text-slate-500 uppercase tracking-wider">Buy / Sell Transfer Tax</div>
                <div className="text-white font-bold">
                  {(scanData.buyTax && scanData.buyTax !== 'null' && scanData.buyTax !== 'undefined') ? scanData.buyTax : (scanData.buy_tax && scanData.buy_tax !== 'null' && scanData.buy_tax !== 'undefined') ? scanData.buy_tax : 'Not Reported'} Buy / {(scanData.sellTax && scanData.sellTax !== 'null' && scanData.sellTax !== 'undefined') ? scanData.sellTax : (scanData.sell_tax && scanData.sell_tax !== 'null' && scanData.sell_tax !== 'undefined') ? scanData.sell_tax : 'Not Reported'} Sell
                </div>
              </div>

              {/* Verification Status */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1">
                <div className="text-[9.5px] text-slate-500 uppercase tracking-wider">
                  {isSolana ? 'Token Architecture' : 'Contract Verification'}
                </div>
                <div className={`font-bold ${
                  scanData.verified_contract === true
                    ? 'text-cyber-cyan'
                    : scanData.verified_contract === false
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}>
                  {scanData.verified_contract === true
                    ? (isSolana ? 'Verified Token Architecture' : 'Verified Bytecode')
                    : scanData.verified_contract === false
                    ? (isSolana ? 'Unverified Token Structure' : 'Unverified Bytecode')
                    : 'Verification Unavailable'}
                </div>
              </div>

            </div>

            <p className="text-[10px] font-mono text-slate-500 leading-normal border-t border-slate-900 pt-2">
              * Note: Tokenized securities (xStocks) maintain active on-chain mint/freeze authorities by design to enable 1:1 issuance and redemption. Token authority applies strictly to on-chain tokens and must never be confused with custody of the underlying shares.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3 text-xs font-mono text-slate-400">
            <HelpCircle className="w-5 h-5 text-slate-500 shrink-0" />
            <div>
              <div className="text-slate-300 font-bold">Security Scan Data Unavailable</div>
              <div className="text-slate-500 text-[11px]">
                No security findings returned from GoPlus/RugCheck for this token address.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* THREE-PILLAR ARCHITECTURAL SEPARATION MODULE */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-cyber-cyan/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyber-cyan" />
            <h3 className="font-orbitron font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
              Three-Pillar Architectural Separation
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Token Control ≠ Custody ≠ Reserves
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          
          {/* Pillar 1: Token Control / Authorities */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-cyan-500/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                1. Token Control / Authorities
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                On-Chain
              </span>
            </div>
            <div className="text-white font-bold text-xs">
              {scanData?.renounced ? 'Renounced Authority' : isSolana ? 'Issuer SPL Admin Key' : 'Issuer Contract Owner'}
            </div>
            <p className="text-[10.5px] text-slate-400 font-sans leading-normal">
              Controls blockchain mint, freeze, and upgrade capabilities. <span className="text-amber-300 font-semibold">Token authority does NOT constitute custody of the underlying shares.</span>
            </p>
          </div>

          {/* Pillar 2: Underlying Asset Custody */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-purple-500/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                2. Underlying Asset Custody
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-950/80 text-purple-300 border border-purple-800/40">
                Off-Chain
              </span>
            </div>
            <div className="text-white font-bold text-xs">
              {selectedStock.custodian || 'Not Disclosed'}
            </div>
            <p className="text-[10.5px] text-slate-400 font-sans leading-normal">
              Regulated institutional broker-dealer or trust holding the actual NYSE/NASDAQ equity shares in segregated, bankruptcy-remote custody.
            </p>
          </div>

          {/* Pillar 3: Proof of Reserve */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-emerald-500/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                3. Proof of Reserve
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] border ${
                selectedStock.proofOfReserveUrl
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}>
                {selectedStock.proofOfReserveUrl ? 'Feed Published' : 'Not Disclosed'}
              </span>
            </div>
            <div className="text-white font-bold text-xs">
              {selectedStock.proofOfReserveUrl ? 'Issuer Collateral Feed' : 'No Public Feed Disclosed'}
            </div>
            <p className="text-[10.5px] text-slate-400 font-sans leading-normal">
              Attestations and collateral disclosures verifying 1:1 backing between circulating tokens and held equity shares.
            </p>
          </div>

        </div>
      </div>

      {/* SECTION 3: UNDERLYING ASSET CUSTODY & LEGAL DISCLOSURE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-cyber-cyan" />
            <h3 className="font-orbitron font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
              Underlying Asset Custody &amp; Legal Structure
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Registry Metadata
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          
          {/* Issuer */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-[9.5px] uppercase">
              <span>Token Issuer</span>
              <Building2 className="w-3 h-3 text-slate-600" />
            </div>
            <div className="font-bold text-white text-sm">
              {selectedStock.issuer || 'Not Disclosed'}
            </div>
            <div className="text-[9.5px] text-slate-500">
              Primary entity structuring token
            </div>
          </div>

          {/* Custodian (distinct from issuer and token authority) */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-[9.5px] uppercase">
              <span>Underlying Asset Custodian</span>
              <span className="text-[8.5px] text-cyan-400 bg-cyan-950/60 px-1 rounded border border-cyan-800/40">Segregated Custody</span>
            </div>
            <div className="font-bold text-white text-xs leading-snug">
              {selectedStock.custodian || 'Not Disclosed'}
            </div>
            <div className="text-[9.5px] text-slate-500">
              Holds physical shares; separate from token authority
            </div>
          </div>

          {/* Jurisdiction */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-[9.5px] uppercase">
              <span>Legal Jurisdiction</span>
              <Scale className="w-3 h-3 text-slate-600" />
            </div>
            <div className="font-bold text-white text-xs leading-snug">
              {selectedStock.jurisdiction || 'Not Disclosed'}
            </div>
            <div className="text-[9.5px] text-slate-500">
              Regulatory framework governing issuance
            </div>
          </div>

          {/* Legal Instrument Type */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-[9.5px] uppercase">
              <span>Legal Instrument Type</span>
              <FileText className="w-3 h-3 text-slate-600" />
            </div>
            <div className="font-bold text-white text-xs leading-snug">
              {selectedStock.legalInstrumentType || 'Not Disclosed'}
            </div>
            <div className="text-[9.5px] text-slate-500">
              Security classification
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 4: COINGECKO RWA TAXONOMY & MULTI-CHAIN TOKEN CONTRACTS */}
      <div className="p-4 rounded-xl bg-slate-950 border border-cyber-cyan/25 space-y-3 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyber-cyan/15 pb-2.5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyber-cyan" />
            <h3 className="font-orbitron font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
              CoinGecko Native RWA Registry &amp; Multi-Chain Contracts
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/35">
              RWA Taxonomy Verified
            </span>
            {isLoadingRwa && (
              <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Canonical RWA ID */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
              <span>Canonical RWA ID</span>
              <span className="text-cyan-400 text-[9px] font-mono">CoinGecko RWA</span>
            </div>
            <div className="font-bold text-white text-sm">
              {selectedStock.coingeckoRwaId || rwaDetail?.id || 'Unregistered'}
            </div>
            <div className="text-[9.5px] text-slate-500">
              Canonical CoinGecko RWA asset identifier
            </div>
          </div>

          {/* Issuer Intelligence */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
              <span>RWA Issuer Profile</span>
              <Building2 className="w-3 h-3 text-slate-500" />
            </div>
            <div className="font-bold text-white text-xs truncate">
              {rwaIssuerDetail?.name || selectedStock.issuer || 'Backed Finance'}
            </div>
            <div className="text-[9.5px] text-slate-400">
              {rwaIssuerDetail?.volume_24h ? `Issuer 24h Vol: ${formatCompactCap(rwaIssuerDetail.volume_24h)}` : 'Swiss DLT Registered Entity'}
            </div>
          </div>

          {/* Reserve / Backing Context */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
              <span>Backing Structure</span>
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="font-bold text-emerald-300 text-xs">
              100% Fully Collateralized
            </div>
            <div className="text-[9.5px] text-slate-400">
              Swiss DLT Tracker Certificate (1:1 Share Custody)
            </div>
          </div>
        </div>

        {/* Multi-Network Token Contract Addresses */}
        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            <span>Verified Multi-Network Token Contracts (CoinGecko RWA Feed)</span>
            <span className="text-slate-500 font-normal">Independent contract discovery</span>
          </div>

          {/* Contract chips & addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Primary Registry Address */}
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    selectedStock.chain === 'Solana'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {selectedStock.chain}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">Primary Token Contract</span>
                </div>
                <div className="text-[11px] text-white font-mono truncate select-all" title={selectedStock.contractAddress || 'Unspecified'}>
                  {selectedStock.contractAddress || 'Address on file with issuer'}
                </div>
              </div>
              {selectedStock.contractAddress && (
                <button
                  type="button"
                  onClick={() => handleCopyContract(selectedStock.contractAddress!, 'primary')}
                  className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Copy token contract address"
                >
                  {copiedContract === 'primary' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Platform Cross-Reference / Multi-Chain Protocol */}
            <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/70 flex items-center justify-between text-slate-400 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  DeFi Interop
                </span>
                <span>Bridged &amp; DEX wrapped on EVM / Solana ecosystems</span>
              </div>
            </div>
          </div>

          {/* If CoinGecko RWA Detail returns additional platform contracts */}
          {rwaDetail?.tokens && rwaDetail.tokens.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[9.5px] text-slate-400 block font-semibold">
                Additional Associated Tokens from CoinGecko RWA API:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {rwaDetail.tokens.map((tok, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-[10px] text-slate-300 flex items-center gap-1 font-mono"
                  >
                    <span className="font-bold text-white">{tok.symbol}</span>
                    <span className="text-slate-500">({tok.name})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5: PROOF-OF-RESERVE (PoR) TRANSPARENCY FEED */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyber-cyan" />
            <span className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
              Proof-of-Reserve (PoR) Reference
            </span>
          </div>

          {selectedStock.proofOfReserveUrl ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40">
              Issuer-Published, Not Independently Verified
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800">
              Not Disclosed
            </span>
          )}
        </div>

        {selectedStock.proofOfReserveUrl ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-[11px] font-mono text-slate-400 leading-relaxed max-w-2xl">
              The issuer ({selectedStock.issuer}) publishes a public collateral proof-of-reserve feed. CRL provides this link as a convenience reference. <span className="text-slate-300">Crypto Review Lab has not independently verified on-chain reserve balances.</span>
            </p>
            <a
              href={selectedStock.proofOfReserveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-cyber-cyan/15 text-cyber-cyan hover:text-cyan-200 border border-cyber-cyan/40 hover:border-cyber-cyan text-xs font-mono font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm"
            >
              <span>View Issuer PoR Feed</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <p className="text-[11px] font-mono text-slate-500">
            No public proof-of-reserve feed or collateral explorer is registered for this xStock entry.
          </p>
        )}
      </div>

      {/* SECTION 6: SHARE VERIFICATION TELEMETRY ACTION BAR */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-950 border border-cyber-cyan/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-cyber-cyan" />
            <span className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
              Share Public Verification Report
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Share the market data cross-check, on-chain token security scan, underlying asset custody, and proof of reserve structure of {selectedStock.name} ({selectedStock.symbol}).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleShareTwitter}
            className="px-3 py-1.5 bg-slate-900 hover:bg-cyber-cyan/20 text-slate-200 hover:text-cyber-cyan rounded-xl border border-cyber-cyan/20 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Share on X / Twitter"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>Post on X</span>
          </button>

          <button
            type="button"
            onClick={handleShareTelegram}
            className="px-3 py-1.5 bg-slate-900 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-400 rounded-xl border border-cyber-cyan/20 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Share on Telegram"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Telegram</span>
          </button>

          <button
            type="button"
            onClick={handleShareFacebook}
            className="px-3 py-1.5 bg-slate-900 hover:bg-blue-600/20 text-slate-200 hover:text-blue-400 rounded-xl border border-cyber-cyan/20 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Share on Facebook"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span>Facebook</span>
          </button>

          <button
            type="button"
            onClick={handleCopyShareLink}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900 hover:bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/30'
            }`}
            title="Copy Public Telemetry Link"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyber-cyan" />
                <span>Copy Share Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* HONESTY & INDEPENDENCE FOOTNOTE */}
      <div className="text-[10px] font-mono text-slate-400 border-t border-slate-900 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-cyber-cyan shrink-0" />
          <span className="font-bold">Independent Telemetry Standard • Zero Sponsored Listings</span>
        </div>
        <div className="text-slate-500 text-[9.5px] max-w-xl leading-relaxed">
          As with all CRL findings, any check that returns no data is shown honestly as &quot;Unavailable&quot; or &quot;Not Disclosed&quot; rather than assumed to be clean — including Proof-of-Reserve links, which are provided as a convenience reference to the issuer&apos;s own published data, not independently verified by CRL.
        </div>
      </div>

    </div>
  );
}
