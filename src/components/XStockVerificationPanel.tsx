/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  Sparkles
} from 'lucide-react';
import { XStockRegistryItem, UsMarketHoursStatus } from '../data/xstocksRegistry';
import { XStockQuoteState } from './XStocksPage';
import { useCurrency } from '../context/CurrencyContext';

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
}

export default function XStockVerificationPanel({
  selectedStock,
  activeQuote,
  marketHours,
  isRefreshingQuotes,
  onRefreshAll
}: XStockVerificationPanelProps) {
  const { formatPrice } = useCurrency();
  const [scanResponse, setScanResponse] = useState<SecurityScanResponse | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);

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
  const equityPrice = activeQuote?.equityPrice;
  const hasEquityPrice = typeof equityPrice === 'number' && equityPrice > 0;
  const hasLiveTokenPrice = typeof liveTokenPrice === 'number' && liveTokenPrice > 0;

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
              MULTI-ORACLE & BYTECODE TELEMETRY
            </span>
            <span className="text-slate-400 text-xs font-mono">
              {selectedStock.symbol} • {selectedStock.underlyingTicker}
            </span>
          </div>
          <h2 className="font-orbitron font-black text-lg sm:text-xl text-white tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyber-cyan shrink-0" />
            <span>Verification & Integrity Panel ({selectedStock.name})</span>
          </h2>
          <p className="text-xs text-slate-400 font-sans">
            Independent, public verification telemetry for {selectedStock.name} tracking {selectedStock.underlyingName}. Evaluates feed consistency, equity basis tracking error, bytecode security risks, and issuer disclosures.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              fetchSecurityScan(selectedStock);
              if (onRefreshAll) onRefreshAll();
            }}
            disabled={isScanning || isRefreshingQuotes}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyber-cyan/40 hover:border-cyber-cyan text-cyber-cyan text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            title="Re-run contract security scan and synchronize oracle feeds"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning || isRefreshingQuotes ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning Bytecode...' : 'Refresh Telemetry'}</span>
          </button>
        </div>
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
          
          {/* Divergence Check A: Crypto-Side Price-Feed Triangulation */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-cyber-cyan/30 transition-all space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-cyan-300">
                  SIGNAL A: CRYPTO FEED TRIANGULATION
                </span>
                <h4 className="font-orbitron font-bold text-xs text-white">
                  Feed Integrity Check
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
                  ? 'Feeds Converged (<0.20%)'
                  : cryptoFeedStatus === 'MINOR_VARIANCE'
                  ? `Minor Spread (${cryptoDivergencePct?.toFixed(2)}%)`
                  : cryptoFeedStatus === 'DIVERGENT'
                  ? `Feed Divergence (${cryptoDivergencePct?.toFixed(2)}%)`
                  : cryptoFeedStatus === 'SINGLE_FEED'
                  ? 'Single Feed Active'
                  : 'Feeds Unavailable'}
              </span>
            </div>

            <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
              Checks whether independent crypto market aggregators (CoinGecko & CoinMarketCap) agree on the on-chain secondary market price for <span className="text-white font-bold">{selectedStock.symbol}</span>.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[9px] text-slate-500 block uppercase">CoinGecko Oracle</span>
                <span className="text-white font-bold">
                  {typeof cgPrice === 'number' && cgPrice > 0 ? formatPrice(cgPrice) : 'No quote'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[9px] text-slate-500 block uppercase">CoinMarketCap Oracle</span>
                <span className="text-white font-bold">
                  {typeof cmcPrice === 'number' && cmcPrice > 0 ? formatPrice(cmcPrice) : 'No quote'}
                </span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between border-t border-slate-900 pt-2">
              <span>Feed Spread Variance:</span>
              <span className={`font-bold ${
                cryptoDivergencePct !== null
                  ? cryptoDivergencePct < 0.2
                    ? 'text-emerald-400'
                    : cryptoDivergencePct < 1.0
                    ? 'text-amber-400'
                    : 'text-rose-400'
                  : 'text-slate-600'
              }`}>
                {cryptoDivergencePct !== null ? `${cryptoDivergencePct.toFixed(3)}%` : 'Unable to triangulate (single/zero feed)'}
              </span>
            </div>
          </div>

          {/* Divergence Check B: Tracking-Error / Basis Divergence */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-purple-500/30 transition-all space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-purple-400">
                  SIGNAL B: UNDERLYING EQUITY BASIS
                </span>
                <h4 className="font-orbitron font-bold text-xs text-white">
                  Tracking-Accuracy Signal
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
                  {typeof liveTokenPrice === 'number' && liveTokenPrice > 0 ? formatPrice(liveTokenPrice) : 'Unavailable'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-purple-950/60">
                <span className="text-[9px] text-purple-400/80 block uppercase">
                  {selectedStock.underlyingTicker} Equity Reference
                </span>
                <span className="text-purple-300 font-bold">
                  {typeof equityPrice === 'number' && equityPrice > 0 ? formatPrice(equityPrice) : 'Unavailable'}
                </span>
              </div>
            </div>

            {/* Session Staleness & Session Context Badge */}
            <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800/80 text-[10px] font-mono flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Reference Context:</span>
              </span>
              <span className={`font-bold ${marketHours.isOpen ? 'text-emerald-400' : 'text-amber-400'}`}>
                {marketHours.isOpen ? 'Live NYSE/NASDAQ Session' : 'Comparing Against Last Close (Market Closed)'}
              </span>
            </div>

            <p className="text-[9.5px] font-mono text-slate-500 leading-normal">
              {marketHours.isOpen
                ? 'Primary US equities market is actively trading. Basis tracks real-time arbitrage efficiency.'
                : 'US equities markets trade ~30% of weekly hours vs. 24/7 on-chain trading. Outside market hours, on-chain price reflects weekend sentiment against the last official close.'}
            </p>
          </div>

        </div>
      </div>

      {/* SECTION 2: CONTRACT SECURITY & BYTECODE SCAN (GoPlus / RugCheck / Blockscout Pipeline) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyber-cyan" />
            <h3 className="font-orbitron font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
              On-Chain Contract Bytecode Security Scan
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            GoPlus • RugCheck • Blockscout
          </span>
        </div>

        {!selectedStock.contractAddress ? (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3 text-xs font-mono text-slate-400">
            <HelpCircle className="w-5 h-5 text-slate-500 shrink-0" />
            <div>
              <div className="text-slate-300 font-bold">Contract Address Not On File</div>
              <div className="text-slate-500 text-[11px]">
                No contract address is registered for {selectedStock.symbol} on {selectedStock.chain}. Bytecode vulnerability scan is unable to run without a verified token address.
              </div>
            </div>
          </div>
        ) : isScanning ? (
          <div className="p-6 rounded-xl bg-slate-950/80 border border-cyber-cyan/30 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-cyber-cyan animate-spin mx-auto" />
            <div className="text-xs font-mono text-white font-bold">
              Executing Bytecode Security Scan...
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Querying GoPlus Security & RugCheck engines for {selectedStock.chain} token {selectedStock.contractAddress.slice(0, 8)}...
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
                <span className="text-slate-500">Contract:</span>
                <span className="font-mono text-cyber-cyan">{selectedStock.contractAddress.slice(0, 6)}...{selectedStock.contractAddress.slice(-4)}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
                {scanResponse.timestamp ? new Date(scanResponse.timestamp).toLocaleTimeString() : 'Live Scan'}
              </span>
            </div>

            {/* Security Findings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 font-mono text-xs">
              
              {/* Honeypot Check */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1">
                <div className="text-[9.5px] text-slate-500 uppercase tracking-wider">Honeypot Analysis</div>
                <div className="flex items-center gap-1.5 font-bold">
                  {scanData.is_honeypot ? (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="text-rose-400">Honeypot Detected (Critical)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300">No Honeypot Code</span>
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
                      <span className="text-amber-300">Blacklist Authority Present</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300">No Freeze / Blacklist</span>
                    </>
                  )}
                </div>
              </div>

              {/* Ownership & Custody Architecture */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1">
                <div className="text-[9.5px] text-slate-500 uppercase tracking-wider">Contract Custody</div>
                <div className="flex items-center gap-1.5 font-bold">
                  <Lock className="w-3.5 h-3.5 text-cyber-cyan shrink-0" />
                  <span className="text-white">
                    {scanData.renounced
                      ? 'Renounced Ownership'
                      : scanData.owner_type_label || (selectedStock.chain === 'Solana' ? 'Issuer Admin Authority' : 'Managed Account')}
                  </span>
                </div>
              </div>

              {/* Transfer Taxes */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1">
                <div className="text-[9.5px] text-slate-500 uppercase tracking-wider">Buy / Sell Transfer Tax</div>
                <div className="text-white font-bold">
                  {scanData.buyTax || '0%'} Buy / {scanData.sellTax || '0%'} Sell
                </div>
              </div>

              {/* RugCheck / Verified Status */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1">
                <div className="text-[9.5px] text-slate-500 uppercase tracking-wider">Contract Verification</div>
                <div className="text-cyber-cyan font-bold">
                  {scanData.verified_contract !== false ? 'Verified Token Architecture' : 'Unverified Bytecode'}
                </div>
              </div>

            </div>

            <p className="text-[10px] font-mono text-slate-500 leading-normal border-t border-slate-900 pt-2">
              * Note: Tokenized securities (xStocks) typically maintain active mint/burn authorities by design to enable 1:1 creation and redemption of underlying equity shares.
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

      {/* SECTION 3: ISSUER, CUSTODIAN, JURISDICTION & LEGAL INSTRUMENT DISCLOSURE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-cyber-cyan" />
            <h3 className="font-orbitron font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
              Legal, Custody & Structural Disclosure
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

          {/* Custodian (distinct from issuer) */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-[9.5px] uppercase">
              <span>Underlying Custodian</span>
              <span className="text-[8.5px] text-cyan-400 bg-cyan-950/60 px-1 rounded border border-cyan-800/40">Distinct from Issuer</span>
            </div>
            <div className="font-bold text-white text-xs leading-snug">
              {selectedStock.custodian || 'Not Disclosed'}
            </div>
            <div className="text-[9.5px] text-slate-500">
              Bankruptcy-remote custodian
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

      {/* SECTION 4: PROOF-OF-RESERVE (PoR) TRANSPARENCY FEED */}
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

      {/* HONESTY & INDEPENDENCE FOOTNOTE */}
      <div className="text-[10px] font-mono text-slate-500 border-t border-slate-900 pt-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyber-cyan" />
          <span>Independent Telemetry Standard • Zero Sponsored Listings</span>
        </div>
        <div>
          Missing or unavailable data points default to neutral unverified states.
        </div>
      </div>

    </div>
  );
}
