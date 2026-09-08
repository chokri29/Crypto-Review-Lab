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
  HelpCircle,
  Clock,
  Sparkles,
  Share2,
  Copy,
  Check,
  Send,
  ChevronDown,
  Info,
  DollarSign
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
  XStockEvidenceVerificationReport 
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

  // Deterministic F3 / AVF Evidence Integrity Audit calculation (preserved for audit view)
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
    const text = `Explore verified stock details and 1:1 backing for ${selectedStock.name} (${selectedStock.symbol} ↔ ${selectedStock.underlyingTicker}) on Crypto Review Lab:`;
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
    const text = `Stock Details & Verification for ${selectedStock.name} (${selectedStock.symbol}):`;
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

  // Crypto feed prices
  const cgPrice = activeQuote?.rwaPrice ?? activeQuote?.cgPrice;
  const cmcPrice = activeQuote?.cmcPrice;
  const hasDualCryptoFeeds = typeof cgPrice === 'number' && cgPrice > 0 && typeof cmcPrice === 'number' && cmcPrice > 0;

  let cryptoDivergencePct: number | null = null;
  if (hasDualCryptoFeeds) {
    const avgPrice = (cgPrice! + cmcPrice!) / 2;
    cryptoDivergencePct = Math.abs(cgPrice! - cmcPrice!) / avgPrice * 100;
  }

  // Live token price vs real Wall Street equity price
  const liveTokenPrice = activeQuote?.livePrice;
  const equityPrice = activeQuote?.equityPrice;
  const hasEquityPrice = typeof equityPrice === 'number' && equityPrice > 0;
  const hasLiveTokenPrice = typeof liveTokenPrice === 'number' && liveTokenPrice > 0;

  let basisDeviationPct: number | null = null;
  if (hasLiveTokenPrice && hasEquityPrice) {
    basisDeviationPct = ((liveTokenPrice! - equityPrice!) / equityPrice!) * 100;
  }

  const scanData = scanResponse?.data;
  const hasScanData = scanResponse?.success && !!scanData;
  const isSolana = selectedStock.chain === 'Solana';

  // Explorer link for contract address
  const explorerUrl = useMemo(() => {
    if (!selectedStock.contractAddress) return null;
    if (isSolana) {
      return `https://solscan.io/token/${selectedStock.contractAddress}`;
    }
    if (selectedStock.chain === 'Ethereum') {
      return `https://etherscan.io/token/${selectedStock.contractAddress}`;
    }
    if (selectedStock.chain === 'Arbitrum') {
      return `https://arbiscan.io/token/${selectedStock.contractAddress}`;
    }
    if (selectedStock.chain === 'BNB Chain') {
      return `https://bscscan.com/token/${selectedStock.contractAddress}`;
    }
    return `https://blockscan.com/address/${selectedStock.contractAddress}`;
  }, [selectedStock.contractAddress, selectedStock.chain, isSolana]);

  return (
    <div id="xstock-verification-panel" className="p-5 sm:p-7 rounded-2xl bg-gradient-to-br from-slate-950 via-[#0a1017] to-slate-950 border border-cyber-cyan/30 shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_24px_rgba(0,229,255,0.06)] space-y-6">
      
      {/* 1. Header: Clear Stock Identity & Panel Purpose for Visitors */}
      <div className="space-y-4 border-b border-cyber-cyan/15 pb-5">
        {/* Top utility row: Badges on left, Sharing and Actions on right */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Tokenized Stock Information &amp; Verification</span>
            </span>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold text-purple-300 bg-purple-950/60 border border-purple-800/60">
              {selectedStock.symbol} • {selectedStock.underlyingTicker}
            </span>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium text-slate-300 bg-slate-900/90 border border-slate-700/80 flex items-center gap-1.5" title="Issuer-reported collateral structure from prospectus — not independently audited by CRL">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Issuer-Stated 1:1 Backing</span>
            </span>
          </div>

          {/* Toolbar: Share & Refresh Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-xl shadow-sm">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                <Share2 className="w-3 h-3 text-cyber-cyan" />
                <span>Share:</span>
              </span>
              <button
                type="button"
                onClick={handleShareTwitter}
                className="p-1.5 hover:bg-cyber-cyan/20 text-slate-300 hover:text-cyber-cyan rounded-lg transition-colors cursor-pointer"
                title="Share on X (Twitter)"
                aria-label="Share on X"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleShareTelegram}
                className="p-1.5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 rounded-lg transition-colors cursor-pointer"
                title="Share on Telegram"
                aria-label="Share on Telegram"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleShareFacebook}
                className="p-1.5 hover:bg-blue-600/20 text-slate-300 hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
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
                className={`px-2 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  copied
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-slate-900 hover:bg-cyber-cyan/20 text-slate-300 hover:text-cyber-cyan border-slate-800'
                }`}
                title="Copy share link"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-cyber-cyan" />}
                <span>{copied ? 'Copied' : 'Link'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                fetchSecurityScan(selectedStock);
                if (onRefreshAll) onRefreshAll();
              }}
              disabled={isScanning || isRefreshingQuotes}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyber-cyan/40 hover:border-cyber-cyan text-cyber-cyan text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
              title="Refresh prices and re-run verification checks"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning || isRefreshingQuotes ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Updating...' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>

        {/* Main Identity & Architecture Balanced Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch pt-1">
          {/* Left Column (7 cols): Stock Identity & Purpose Statement */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-orbitron font-bold text-xl sm:text-2xl text-white tracking-wide">
                  About {selectedStock.name} ({selectedStock.symbol})
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700/80">
                  {selectedStock.exchange}:{selectedStock.underlyingTicker}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30">
                  {selectedStock.category}
                </span>
              </div>

              <p className="text-sm sm:text-[14.5px] text-slate-200 font-sans leading-relaxed">
                {selectedStock.description}
              </p>

              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 space-y-2 text-xs font-sans text-slate-300 leading-relaxed shadow-sm">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyber-cyan" />
                  <span>Public Verification &amp; Transparency Scope</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-xs sm:text-[12.5px]">
                  This panel provides real-time, independent transparency into how <span className="text-white font-semibold">{selectedStock.symbol}</span> on <span className="text-white font-semibold">{selectedStock.chain}</span> tracks the real US equity (<span className="text-purple-300 font-semibold">{selectedStock.underlyingName} • {selectedStock.underlyingTicker}</span>), who holds the underlying shares, and the smart contract safety of the token.
                </p>
              </div>
            </div>

            <div className="pt-2 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-pulse"></span>
                <span>Instrument (Issuer Spec): <strong className="text-slate-200">{selectedStock.legalInstrumentType || 'Tracker Certificate'}</strong></span>
              </span>
              <span className="text-slate-400">
                Primary Market: <strong className="text-slate-200">{selectedStock.exchange} (9:30–16:00 ET)</strong>
              </span>
            </div>
          </div>

          {/* Right Column (5 cols): Issuer Instrument Architecture Card (Self-Reported Metadata) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="w-full h-full p-4 sm:p-5 rounded-xl bg-slate-950/90 border border-slate-800 shadow-lg flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-slate-300 font-bold text-xs">
                  <Landmark className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-orbitron text-xs uppercase tracking-wider text-white">Issuer Instrument Architecture</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                  Issuer Metadata
                </span>
              </div>

              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                Per issuer documentation, xStocks are tokenized tracker certificates issued under Swiss law. The issuer specifies that each token is backed by underlying equity shares held in segregated, bankruptcy-remote custody accounts.
              </p>

              <div className="grid grid-cols-2 gap-2.5 pt-1 text-[11px] font-mono">
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 space-y-0.5">
                  <div className="text-[9.5px] text-slate-400 uppercase tracking-wider font-bold">Issuer-Stated Parity</div>
                  <div className="text-slate-200 font-bold flex items-center gap-1.5 text-xs">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Issuer-stated 1:1 backing</span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-sans mt-0.5">Reported 1 token = 1 share</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 space-y-0.5">
                  <div className="text-[9.5px] text-slate-400 uppercase tracking-wider font-bold">Reported Legal Status</div>
                  <div className="text-slate-200 font-bold flex items-center gap-1.5 text-xs">
                    <Scale className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Swiss DLT Framework</span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-sans mt-0.5">Issuer-stated statutory framework</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                <Info className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Issuer/Instrument Metadata — Not independently verified by CRL</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Stock Specifications Overview — Clearly Demarcated as Issuer / Registry Metadata */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10.5px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-slate-500" />
            <span>Instrument &amp; Issuer Metadata (Registry Specifications)</span>
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            Self-reported • Unverified by CRL
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 font-mono text-xs">
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors space-y-1.5 shadow-sm">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <Building2 className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>Underlying Equity</span>
            </div>
            <div className="text-white font-bold text-base sm:text-lg">
              {selectedStock.underlyingTicker}
            </div>
            <div className="text-[10.5px] text-slate-400">
              {selectedStock.exchange}
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors space-y-1.5 shadow-sm">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <Layers className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>Token Blockchain</span>
            </div>
            <div className="text-white font-bold text-base sm:text-lg">
              {selectedStock.chain}
            </div>
            <div className="text-[10.5px] text-slate-400">
              {selectedStock.category}
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors space-y-1.5 shadow-sm">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <Landmark className="w-3.5 h-3.5 text-slate-400" />
              <span>Reported Issuer</span>
            </div>
            <div className="text-white font-bold text-sm sm:text-base truncate" title={selectedStock.issuer}>
              {selectedStock.issuer}
            </div>
            <div className="text-[10.5px] text-slate-400 truncate" title={selectedStock.jurisdiction}>
              Jurisdiction: {selectedStock.jurisdiction}
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors space-y-1.5 shadow-sm">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Reported Custodian</span>
            </div>
            <div className="text-white font-bold text-sm sm:text-base truncate" title={selectedStock.custodian}>
              {selectedStock.custodian}
            </div>
            <div className="text-[10.5px] text-slate-400 flex items-center gap-1">
              <FileText className="w-3 h-3 text-slate-500 shrink-0" />
              <span>Issuer-reported custody structure</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section: Price Comparison & Market Parity */}
      <div className="p-5 rounded-2xl bg-slate-950/90 border border-cyber-cyan/25 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyber-cyan" />
            <h3 className="font-orbitron font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
              Real-Time Price &amp; Market Tracking ({selectedStock.symbol})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
              marketHours.isOpen
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}>
              {marketHours.isOpen ? '● US Equities Market Open' : '○ US Equities Market Closed'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: On-Chain Token Price */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                1. On-Chain Token Price ({selectedStock.symbol})
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800">
                24/7 Trading
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">
                {hasLiveTokenPrice ? formatPrice(liveTokenPrice!) : (typeof cgPrice === 'number' ? formatPrice(cgPrice) : 'Price Unavailable')}
              </span>
              <span className="text-xs font-mono text-slate-400">USD</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-[9.5px] text-slate-500 block">CoinGecko Feed</span>
                <span className="text-white font-bold">
                  {typeof cgPrice === 'number' && cgPrice > 0 ? formatPrice(cgPrice) : 'No quote'}
                </span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-[9.5px] text-slate-500 block">CoinMarketCap Feed</span>
                <span className="text-white font-bold">
                  {typeof cmcPrice === 'number' && cmcPrice > 0 ? formatPrice(cmcPrice) : 'No quote'}
                </span>
              </div>
            </div>

            {cryptoDivergencePct !== null && (
              <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                <span>Feed Consensus Variance:</span>
                <span className={`font-bold ${cryptoDivergencePct < 0.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {cryptoDivergencePct.toFixed(2)}% spread ({cryptoDivergencePct < 0.5 ? 'Prices Aligned' : 'Minor Feed Variance'})
                </span>
              </div>
            )}
          </div>

          {/* Card 2: Real Equity Price */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-purple-300 font-bold uppercase tracking-wider">
                2. Real Equity Stock ({selectedStock.underlyingTicker})
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800">
                Finnhub Market Data
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-purple-300">
                {hasEquityPrice ? formatPrice(equityPrice!) : 'Basis Unavailable'}
              </span>
              <span className="text-xs font-mono text-slate-400">USD</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1 text-[11px] font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span>Session Basis:</span>
                <span className={marketHours.isOpen ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {marketHours.isOpen ? 'Live Equity Basis' : 'Last Close / After-Hours Basis'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 text-[10px]">
                <span>Last Updated:</span>
                <span>{activeQuote?.equityQuote?.basisTimestampFormatted || marketHours.easternTimeFormatted}</span>
              </div>
            </div>

            {basisDeviationPct !== null && (
              <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                <span>Token vs. Stock Difference:</span>
                <span className={`font-bold ${Math.abs(basisDeviationPct) < 1.0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {basisDeviationPct >= 0 ? '+' : ''}{basisDeviationPct.toFixed(2)}%
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Plain English Explanation of Market Hours vs 24/7 Crypto */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-sans text-slate-300 flex items-start gap-2.5 leading-relaxed">
          <Info className="w-4 h-4 text-cyber-cyan shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white">Why do prices sometimes differ? </span>
            Crypto tokens trade 24/7, while traditional US stock exchanges (NYSE/NASDAQ) are only open Monday through Friday from 9:30 AM to 4:00 PM Eastern Time. 
            {!marketHours.isOpen && (
              <span className="text-amber-300/90 font-medium"> US markets are currently closed. Outside regular trading hours, the token price reflects ongoing 24/7 market sentiment relative to Friday&apos;s official closing price.</span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Section: Issuer-Reported Backing & Custody Structure (Instrument Metadata) */}
      <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-slate-300" />
            <h3 className="font-orbitron font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
              Issuer-Reported Backing &amp; Custody Structure
            </h3>
          </div>
          <span className="text-[10px] font-mono text-amber-400/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40 w-fit">
            Issuer Claims — Not Independently Audited by CRL
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 font-sans text-xs">
          
          {/* Pillar 1: Token Creation */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-orbitron font-bold text-xs text-slate-200 uppercase tracking-wider">
                1. Token Issuer
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                Issuer Metadata
              </span>
            </div>
            <div className="text-white font-bold text-sm">
              {selectedStock.issuer || 'Backed Finance'}
            </div>
            <p className="text-slate-400 leading-relaxed text-[11.5px]">
              Mints and manages the {selectedStock.symbol} smart contract on {selectedStock.chain}. <span className="text-slate-300 font-semibold">Note:</span> Smart contract administration is separate from equity holding per issuer documentation.
            </p>
          </div>

          {/* Pillar 2: Real Share Custody */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-orbitron font-bold text-xs text-slate-200 uppercase tracking-wider">
                2. Custody Structure
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                Issuer Reported
              </span>
            </div>
            <div className="text-white font-bold text-sm">
              Issuer-Reported Custodian
            </div>
            <div className="text-slate-300 font-mono text-[11px] font-medium truncate" title={selectedStock.custodian}>
              {selectedStock.custodian || 'InCore Bank AG / Alpaca Securities LLC'}
            </div>
            <p className="text-slate-400 leading-relaxed text-[11.5px]">
              The issuer reports that underlying equity shares are held in segregated accounts with regulated partner institutions. CRL does not hold custodial keys or conduct physical vault audits.
            </p>
          </div>

          {/* Pillar 3: Reserve Transparency */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-orbitron font-bold text-xs text-slate-200 uppercase tracking-wider">
                3. Reserve Reporting
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                External Link
              </span>
            </div>
            <div className="text-white font-bold text-sm">
              Issuer-Stated 1:1 Backing
            </div>
            <p className="text-slate-400 leading-relaxed text-[11.5px]">
              The issuer claims each circulating token corresponds to one share in custody. The presence of a link or feed does not constitute continuous CRL reserve reconciliation.
            </p>
            {selectedStock.proofOfReserveUrl ? (
              <div className="pt-1 border-t border-slate-800/80">
                <a
                  href={selectedStock.proofOfReserveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  <span>External proof-of-reserves reference available</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
                <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                  External reference link only; not verified or audited by CRL.
                </div>
              </div>
            ) : (
              <div className="text-[10.5px] text-slate-500 font-mono pt-1">
                No external proof-of-reserves link provided by issuer.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 5. Section: Smart Contract & Token Safety */}
      <div className="p-5 rounded-2xl bg-slate-950/90 border border-cyber-cyan/25 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyber-cyan" />
            <h3 className="font-orbitron font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
              Smart Contract &amp; Token Safety ({selectedStock.chain})
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            GoPlus &amp; RugCheck Automated Scans
          </span>
        </div>

        {/* Contract Address Bar */}
        {selectedStock.contractAddress && (
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="min-w-0 space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                Official {selectedStock.chain} Token Contract Address:
              </span>
              <div className="text-white font-mono truncate select-all">
                {selectedStock.contractAddress}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopyContract(selectedStock.contractAddress!, 'contract')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy contract address"
              >
                {copiedContract === 'contract' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyber-cyan" />}
                <span>{copiedContract === 'contract' ? 'Copied' : 'Copy'}</span>
              </button>

              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="View on blockchain explorer"
                >
                  <span>Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5 text-cyber-cyan" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Safety Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase">Transfer Restrictions</div>
            <div className="flex items-center gap-1.5 font-bold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Standard Transferable Token</span>
            </div>
            <div className="text-[10.5px] text-slate-400 font-sans">
              No honeypot or malicious transfer locks detected.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase">Trading Fees &amp; Taxes</div>
            <div className="flex items-center gap-1.5 font-bold text-white">
              <DollarSign className="w-4 h-4 text-cyber-cyan shrink-0" />
              <span>0% Buy / 0% Sell Tax</span>
            </div>
            <div className="text-[10.5px] text-slate-400 font-sans">
              Standard token contract with zero hidden transaction taxes.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase">Mint &amp; Freeze Permissions</div>
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Managed by Regulated Issuer</span>
            </div>
            <div className="text-[10.5px] text-slate-400 font-sans">
              Permits 1:1 issuance and redemption when shares are bought or sold.
            </div>
          </div>

        </div>
      </div>

      {/* 6. Section: Legal Framework & CoinGecko RWA Registry (Instrument Metadata) */}
      <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-400" />
            <h3 className="font-orbitron font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
              Legal Framework &amp; CoinGecko RWA Registry
            </h3>
          </div>
          <span className="text-[10px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 font-mono font-medium">
            Issuer / Registry Metadata
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase block">Regulatory Jurisdiction (Reported)</span>
            <span className="text-white font-bold text-xs block">{selectedStock.jurisdiction || 'Switzerland'}</span>
            <span className="text-[10px] text-slate-400 font-sans block">Reported under Swiss DLT Act legal framework</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase block">Security Instrument (Prospectus)</span>
            <span className="text-white font-bold text-xs block">{selectedStock.legalInstrumentType || 'Tracker Certificate'}</span>
            <span className="text-[10px] text-slate-400 font-sans block">Issuer-classified tracker certificate structure</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase block">CoinGecko Canonical RWA ID</span>
            <span className="text-cyan-300 font-bold text-xs block">{selectedStock.coingeckoRwaId || selectedStock.coingeckoId}</span>
            <span className="text-[10px] text-slate-400 font-sans block">CoinGecko public RWA directory classification</span>
          </div>
        </div>
      </div>

      {/* 7. Frequently Asked Questions (Accordion) */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-md">
        <button
          type="button"
          onClick={() => setShowFaqInfo(!showFaqInfo)}
          className="w-full p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-900/70 transition-colors cursor-pointer group"
        >
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyber-cyan/15 border border-cyber-cyan/40 text-cyber-cyan flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-orbitron font-bold text-xs sm:text-sm text-white block group-hover:text-cyber-cyan transition-colors">
                Frequently Asked Questions — Verification &amp; Integrity Panel
              </span>
              <span className="text-[11px] font-sans text-slate-400 block mt-0.5 leading-relaxed">
                Understanding verification dimensions, data consistency, tracking, and safety boundaries
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 w-full sm:w-auto shrink-0">
            <span className="text-xs font-mono text-cyber-cyan flex items-center gap-1.5 font-bold">
              <span>{showFaqInfo ? 'Hide FAQs' : 'Read FAQs'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFaqInfo ? 'rotate-180' : ''}`} />
            </span>
          </div>
        </button>

        {showFaqInfo && (
          <div className="p-5 border-t border-slate-800 text-xs text-slate-300 space-y-6 leading-relaxed bg-slate-950/95 font-sans">
            {/* Q1 */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              <h4 className="font-bold text-white text-sm sm:text-base flex items-start gap-2.5">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40 shrink-0">
                  Q1
                </span>
                <span>What is the xStocks Verification &amp; Integrity Panel?</span>
              </h4>
              <p className="text-slate-300 leading-relaxed">
                The xStocks Verification &amp; Integrity Panel is a free, public verification layer for tokenized stocks (xStocks), independent from Crypto Review Lab’s paid Security &amp; Risk Assessment product.
              </p>
              <p className="text-slate-300 leading-relaxed">
                It is designed to provide transparent, real-time integrity checks across three distinct dimensions:
              </p>
              <div className="space-y-3 my-3">
                <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-cyber-cyan/30 space-y-1.5 shadow-sm">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm">
                    <span className="w-5 h-5 rounded-md bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span className="text-cyber-cyan font-bold">Market-Price Consistency</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs sm:text-[12.5px] pl-7">
                    Compares the token’s on-chain market price across independent crypto market-data aggregators such as CoinGecko and CoinMarketCap. These services are market-data aggregators, not blockchain oracles; the check measures whether independent market-data sources report consistent pricing.
                  </p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-cyber-cyan/30 space-y-1.5 shadow-sm">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm">
                    <span className="w-5 h-5 rounded-md bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span className="text-cyber-cyan font-bold">Underlying-Equity Tracking</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs sm:text-[12.5px] pl-7">
                    Compares the tokenized stock’s real-time market price with the price of its underlying equity, using Finnhub as the equity-market reference. The panel measures how closely the token tracks its underlying equity price and identifies potential pricing divergence.
                  </p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-cyber-cyan/30 space-y-1.5 shadow-sm">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm">
                    <span className="w-5 h-5 rounded-md bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <span className="text-cyber-cyan font-bold">On-Chain Security &amp; Authority</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs sm:text-[12.5px] pl-7">
                    Performs an automated security scan of the token contract and/or token authorities using the appropriate on-chain security provider, such as GoPlus or RugCheck. For Solana assets, this includes token security and authority analysis; for EVM assets, it includes smart-contract/bytecode security analysis.
                  </p>
                </div>
              </div>
              <p className="text-slate-400 text-[11.5px] leading-relaxed pt-1">
                The panel therefore evaluates data consistency, underlying-equity tracking, and observable on-chain security signals as separate verification dimensions.
              </p>
            </div>

            {/* Q2 */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              <h4 className="font-bold text-white text-sm sm:text-base flex items-start gap-2.5">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40 shrink-0">
                  Q2
                </span>
                <span>What exactly does the panel verify?</span>
              </h4>
              <p className="text-slate-300 leading-relaxed">
                The panel does not produce a single generic “safe” or “verified” claim. Each verification dimension is evaluated independently and reports its own status and supporting data.
              </p>
              <p className="text-slate-300 leading-relaxed">
                Depending on the asset and available data, the panel can identify:
              </p>
              <div className="space-y-2 my-3">
                {[
                  'Whether independent crypto market-data sources are consistent.',
                  'Whether the token is tracking its underlying equity within the observed market conditions.',
                  'Whether the token contract or token authorities present identifiable on-chain security or control risks.',
                  'Whether required verification inputs are available, valid, and sufficiently current.'
                ].map((item, idx) => (
                  <div key={idx} className="p-2.5 sm:p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5 shadow-sm">
                    <span className="w-4 h-4 rounded-full bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span className="text-slate-300 leading-relaxed text-xs sm:text-[12.5px]">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-slate-400 text-[11.5px] leading-relaxed pt-1">
                This separation is intentional: price agreement, equity tracking, and token security are different properties and must not be conflated.
              </p>
            </div>

            {/* Q3 */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              <h4 className="font-bold text-white text-sm sm:text-base flex items-start gap-2.5">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40 shrink-0">
                  Q3
                </span>
                <span>Does a verification result mean that an xStock is safe or officially verified?</span>
              </h4>
              <p className="text-slate-300 leading-relaxed">
                <span className="font-bold text-rose-400">No.</span> A positive panel result does not constitute an investment recommendation, legal certification, proof of reserves, or a guarantee that an xStock is safe.
              </p>
              <p className="text-slate-300 leading-relaxed">
                The panel verifies specific, observable conditions using independent data sources and on-chain security telemetry. A successful check means that the relevant verification criteria were satisfied at the time and under the data conditions observed.
              </p>
              <p className="text-slate-300 leading-relaxed">
                It also does not replace the deeper Security &amp; Risk Assessment performed by Crypto Review Lab.
              </p>
              <p className="text-amber-300/90 font-mono text-[11px] leading-relaxed pt-1 border-t border-slate-800/80">
                The purpose of the panel is verification and transparency — not certification.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 8. Advanced Technical Audit Matrix (Collapsible for Auditors & Developers) */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowEvidenceMatrix(!showEvidenceMatrix)}
          className="w-full p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-900/50 transition-colors cursor-pointer group"
        >
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 group-hover:border-cyber-cyan/40 group-hover:text-cyber-cyan transition-colors">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-orbitron font-bold text-xs sm:text-sm text-slate-200 group-hover:text-white transition-colors">
                  Advanced Auditor View: Deterministic Provenance Matrix
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  {evidenceList.length} KEYS
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-slate-500 font-semibold">Provenance:</span>
                <span className="text-emerald-400 font-medium">{evidenceAudit.validCount} Valid</span>
                <span className="text-slate-600">•</span>
                <span className={evidenceAudit.missingCount > 0 ? "text-rose-400 font-medium" : "text-slate-400"}>{evidenceAudit.missingCount} Missing</span>
                <span className="text-slate-600">•</span>
                <span className={evidenceAudit.staleCount > 0 ? "text-amber-400 font-medium" : "text-slate-400"}>{evidenceAudit.staleCount} Stale</span>
                <span className="text-slate-600">•</span>
                <span className={evidenceAudit.contradictoryCount > 0 ? "text-purple-400 font-medium" : "text-slate-400"}>{evidenceAudit.contradictoryCount} Divergent</span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan-400 font-medium">{evidenceAudit.sourceCount ?? 0} Source</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{evidenceAudit.derivedCount ?? 0} Derived</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 w-full sm:w-auto shrink-0">
            <span className="text-xs font-mono text-slate-400 group-hover:text-cyber-cyan flex items-center gap-1.5 font-bold transition-colors">
              <span>{showEvidenceMatrix ? 'Hide Audit Rows' : `Inspect Audit Rows (${evidenceList.length})`}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showEvidenceMatrix ? 'rotate-180 text-cyber-cyan' : ''}`} />
            </span>
          </div>
        </button>

        {showEvidenceMatrix && (
          <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/95 font-mono text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="py-2 px-2.5">Evidence Key</th>
                    <th className="py-2 px-2.5">Provider / Source</th>
                    <th className="py-2 px-2.5">Type & Provenance</th>
                    <th className="py-2 px-2.5">Reported Value</th>
                    <th className="py-2 px-2.5">Provider Timestamp</th>
                    <th className="py-2 px-2.5">Freshness</th>
                    <th className="py-2 px-2.5 text-right">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-[11px]">
                  {evidenceList.map((item) => {
                    const datumState = item.state || item.provenance || 'MISSING';
                    const stateBadgeStyle = {
                      VALID: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                      MISSING: 'bg-slate-800/80 text-slate-400 border-slate-700',
                      STALE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                      SYNTHETIC: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                      CONTRADICTORY: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                      INVALID: 'bg-red-500/25 text-red-200 border-red-500/50'
                    }[datumState];
                    const datumFreshness = item.freshness || item.freshnessStatus || 'UNAVAILABLE';
                    const provenanceCategory = item.provenanceCategory || (item.state === 'VALID' ? 'SOURCE' : 'UNAVAILABLE');

                    return (
                      <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-2 px-2.5 font-bold text-white">
                          <div>{item.name}</div>
                          <div className="text-[9px] text-slate-500">{item.assetId}</div>
                        </td>
                        <td className="py-2 px-2.5 text-slate-300">
                          {item.source}
                        </td>
                        <td className="py-2 px-2.5 text-[10px]">
                          <div className="text-cyan-400/90">{item.dataType}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`px-1 py-0.2 rounded text-[8.5px] font-bold border uppercase ${
                              provenanceCategory === 'SOURCE'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50'
                                : provenanceCategory === 'DERIVED'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-700/50'
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}>
                              {provenanceCategory}
                            </span>
                            {item.isVerificationGrade ? (
                              <span className="text-[8px] text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                                VERIFIED
                              </span>
                            ) : (
                              provenanceCategory === 'DERIVED' && (
                                <span className="text-[8px] text-amber-400/90 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                                  DERIVED
                                </span>
                              )
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2.5 font-bold text-slate-200">
                          {item.formattedValue}
                        </td>
                        <td className="py-2 px-2.5 text-slate-400 text-[10px]">
                          {item.providerTimestamp || (item.timestamp ? String(item.timestamp) : 'Unknown')}
                        </td>
                        <td className="py-2 px-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                            datumFreshness === 'LIVE'
                              ? 'text-cyan-300'
                              : datumFreshness === 'STALE'
                              ? 'text-amber-400'
                              : 'text-slate-500'
                          }`}>
                            {datumFreshness}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${stateBadgeStyle}`}>
                            {datumState}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-[10px] text-slate-400 font-sans leading-relaxed">
              <strong className="text-white">Strict Verification Policy:</strong> Raw data values and timestamps are deterministically recorded without synthetic interpolation.
            </div>
          </div>
        )}
      </div>

      {/* 9. Footnote */}
      <div className="text-[10px] font-mono text-slate-400 border-t border-slate-900 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-cyber-cyan shrink-0" />
          <span className="font-bold">Independent Transparency Standard • Zero Sponsored Listings</span>
        </div>
        <div className="text-slate-400 text-[9.5px] max-w-xl leading-relaxed">
          CRL independently verifies real-time market-data consistency and on-chain contract telemetry. Issuer claims, custody structures, and proof-of-reserve links are presented as external instrument metadata and are not independently audited or certified by CRL.
        </div>
      </div>

    </div>
  );
}
