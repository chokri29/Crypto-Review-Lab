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
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-cyber-cyan/15 pb-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Tokenized Stock Information &amp; Verification</span>
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono text-purple-300 bg-purple-950/60 border border-purple-800/60">
              {selectedStock.symbol} • {selectedStock.underlyingTicker}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>100% Asset-Backed</span>
            </span>
          </div>

          <h2 className="font-orbitron font-bold text-lg sm:text-2xl text-white tracking-wide">
            About {selectedStock.name} ({selectedStock.symbol})
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed max-w-3xl">
            {selectedStock.description}
          </p>
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            This panel provides independent transparency into how <span className="text-white font-semibold">{selectedStock.symbol}</span> tracks the real US equity (<span className="text-purple-300 font-semibold">{selectedStock.underlyingTicker}</span>), who holds the underlying shares, and the smart contract safety of the token.
          </p>
        </div>

        {/* Toolbar: Share & Refresh Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 px-2 py-1 rounded-xl shadow-sm">
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
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyber-cyan/40 hover:border-cyber-cyan text-cyber-cyan text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh prices and re-run verification checks"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning || isRefreshingQuotes ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Updating...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* 2. Key Stock Specifications Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-400" />
            <span>Underlying Equity</span>
          </div>
          <div className="text-white font-bold text-sm">
            {selectedStock.underlyingTicker}
          </div>
          <div className="text-[10px] text-slate-400">
            {selectedStock.exchange}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" />
            <span>Token Blockchain</span>
          </div>
          <div className="text-white font-bold text-sm">
            {selectedStock.chain}
          </div>
          <div className="text-[10px] text-slate-400">
            {selectedStock.category}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Landmark className="w-3 h-3 text-slate-400" />
            <span>Token Issuer</span>
          </div>
          <div className="text-white font-bold text-sm truncate" title={selectedStock.issuer}>
            {selectedStock.issuer}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {selectedStock.jurisdiction}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Physical Custodian</span>
          </div>
          <div className="text-white font-bold text-xs truncate" title={selectedStock.custodian}>
            {selectedStock.custodian}
          </div>
          <div className="text-[10px] text-emerald-400">
            Segregated Share Custody
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

      {/* 4. Section: How 1:1 Backing Works (The 3 Pillars of Security) */}
      <div className="p-5 rounded-2xl bg-slate-950/90 border border-cyber-cyan/25 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyber-cyan" />
            <h3 className="font-orbitron font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
              How This Token Is Backed (3 Pillars of Security)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Token Control ≠ Custody ≠ Reserves
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 font-sans text-xs">
          
          {/* Pillar 1: Token Creation */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-orbitron font-bold text-xs text-cyan-300 uppercase tracking-wider">
                1. Token Issuer
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                On-Chain
              </span>
            </div>
            <div className="text-white font-bold text-sm">
              {selectedStock.issuer || 'Backed Finance'}
            </div>
            <p className="text-slate-400 leading-relaxed text-[11.5px]">
              Mints and manages the {selectedStock.symbol} smart contract on {selectedStock.chain}. <span className="text-amber-300 font-semibold">Important:</span> Smart contract admin keys cannot withdraw or touch the physical stock shares.
            </p>
          </div>

          {/* Pillar 2: Real Share Custody */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-purple-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-orbitron font-bold text-xs text-purple-300 uppercase tracking-wider">
                2. Real Share Custody
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-purple-950/80 text-purple-300 border border-purple-800/40">
                Off-Chain
              </span>
            </div>
            <div className="text-white font-bold text-sm">
              {selectedStock.custodian || 'InCore Bank AG / Alpaca Securities LLC'}
            </div>
            <p className="text-slate-400 leading-relaxed text-[11.5px]">
              Regulated institutional custodians hold the physical NYSE/NASDAQ equity shares in segregated, bankruptcy-remote accounts. If the token issuer ceases operations, the underlying shares remain protected.
            </p>
          </div>

          {/* Pillar 3: Proof of Reserves */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-orbitron font-bold text-xs text-emerald-300 uppercase tracking-wider">
                3. Proof of Reserves
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                1:1 Collateral
              </span>
            </div>
            <div className="text-white font-bold text-sm">
              100% Fully Collateralized
            </div>
            <p className="text-slate-400 leading-relaxed text-[11.5px]">
              Each token in circulation is matched 1:1 by real stock shares held in custody. The issuer provides public collateral feeds to verify reserves.
            </p>
            {selectedStock.proofOfReserveUrl && (
              <a
                href={selectedStock.proofOfReserveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-400 hover:text-emerald-300 pt-1 cursor-pointer"
              >
                <span>View Collateral Feed</span>
                <ExternalLink className="w-3 h-3" />
              </a>
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
            GoPlus &amp; RugCheck Verified
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

      {/* 6. Section: Legal & Regulatory Framework */}
      <div className="p-5 rounded-2xl bg-slate-950/90 border border-cyber-cyan/25 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-cyber-cyan" />
            <h3 className="font-orbitron font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
              Legal Framework &amp; CoinGecko RWA Registry
            </h3>
          </div>
          <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 font-bold">
            Verified RWA Security
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">Regulatory Jurisdiction</span>
            <span className="text-white font-bold text-xs block">{selectedStock.jurisdiction || 'Switzerland'}</span>
            <span className="text-[10px] text-slate-400 font-sans block">Swiss DLT Act (Distributed Ledger Technology Framework)</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">Security Instrument</span>
            <span className="text-white font-bold text-xs block">{selectedStock.legalInstrumentType || 'Tracker Certificate'}</span>
            <span className="text-[10px] text-slate-400 font-sans block">1:1 Asset-Backed Regulated Ledger-Based Security</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">CoinGecko Canonical RWA ID</span>
            <span className="text-cyan-300 font-bold text-xs block">{selectedStock.coingeckoRwaId || selectedStock.coingeckoId}</span>
            <span className="text-[10px] text-slate-400 font-sans block">Official Real-World Asset classification</span>
          </div>
        </div>
      </div>

      {/* 7. Frequently Asked Questions (Accordion) */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-md">
        <button
          type="button"
          onClick={() => setShowFaqInfo(!showFaqInfo)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/70 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-cyber-cyan/15 border border-cyber-cyan/40 text-cyber-cyan flex items-center justify-center shrink-0">
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-orbitron font-bold text-xs sm:text-sm text-white block">
                Frequently Asked Questions for Visitors
              </span>
              <span className="text-[11px] font-sans text-slate-400">
                How tokenized stocks work, how 1:1 backing is guaranteed, and why weekend prices differ
              </span>
            </div>
          </div>
          <span className="text-xs font-mono text-cyber-cyan flex items-center gap-1 font-bold shrink-0 ml-2">
            <span>{showFaqInfo ? 'Hide FAQs' : 'Read FAQs'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFaqInfo ? 'rotate-180' : ''}`} />
          </span>
        </button>

        {showFaqInfo && (
          <div className="p-5 border-t border-slate-800 text-xs text-slate-300 space-y-4 leading-relaxed bg-slate-950/95 font-sans">
            <div className="space-y-1.5 pb-3 border-b border-slate-800/80">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-cyber-cyan">Q1:</span> What exactly is an xStock (Tokenized Stock)?
              </h4>
              <p className="text-slate-300 leading-relaxed">
                An xStock is a token on a blockchain (such as Solana or Ethereum) that tracks a real, publicly traded stock (such as Apple or Tesla). Each token represents 1 share of the underlying company and is backed 1:1 by actual shares held in regulated bank custody.
              </p>
            </div>

            <div className="space-y-1.5 pb-3 border-b border-slate-800/80">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-cyber-cyan">Q2:</span> Who holds the real shares, and what happens if the issuer closes?
              </h4>
              <p className="text-slate-300 leading-relaxed">
                The actual stock shares are held in a segregated, bankruptcy-remote account by licensed custodians (such as InCore Bank AG or Alpaca Securities LLC). Because the shares are legally held in custody for token owners rather than being on the issuer&apos;s corporate balance sheet, the shares cannot be claimed by creditors if the issuer goes out of business.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-cyber-cyan">Q3:</span> Why does the token price move when the US stock market is closed?
              </h4>
              <p className="text-slate-300 leading-relaxed">
                Traditional stock exchanges operate Monday to Friday during standard business hours (9:30 AM – 4:00 PM Eastern Time). Decentralized crypto exchanges operate 24 hours a day, 7 days a week. Over weekends or holidays, crypto traders continue to buy and sell the tokens, establishing a real-time trading price based on after-hours news and sentiment.
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
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-orbitron font-bold text-xs text-slate-300 block">
                Advanced Auditor View: Deterministic Provenance Matrix
              </span>
              <span className="text-[10.5px] font-mono text-slate-500">
                Raw data key provenance ({evidenceAudit.validCount} Valid • {evidenceAudit.missingCount} Missing • {evidenceAudit.staleCount} Stale • {evidenceAudit.contradictoryCount} Divergent • {evidenceAudit.sourceCount ?? 0} Source • {evidenceAudit.derivedCount ?? 0} Derived)
              </span>
            </div>
          </div>

          <span className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1 font-bold shrink-0 ml-2">
            <span>{showEvidenceMatrix ? 'Hide Audit Rows' : `Inspect Audit Rows (${evidenceList.length})`}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showEvidenceMatrix ? 'rotate-180' : ''}`} />
          </span>
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
        <div className="text-slate-500 text-[9.5px] max-w-xl leading-relaxed">
          CRL displays market data directly from verified public sources. Proof-of-reserve links are provided as a convenience reference to the issuer&apos;s published attestations.
        </div>
      </div>

    </div>
  );
}
