import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Flame,
  RefreshCw,
  Check,
  Info,
  ExternalLink,
  History,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';

export interface MajorEventsAlertBoxProps {
  name: string;
  symbol: string;
  category?: string;
  contractAddress?: string;
  chainId?: string | number;
  scores?: {
    utility: number;
    tokenomics: number;
    security: number;
    team: number;
    community: number;
  };
  overallScore?: number;
  riskLevel?: string;
  coingeckoId?: string;
}

export interface SecurityScanData {
  is_honeypot: boolean;
  is_mintable: boolean;
  owner_change_balance: boolean;
  is_blacklisted: boolean;
  is_proxy: boolean;
  is_open_source: boolean;
  renounced: boolean;
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
  possible_spam?: boolean;
  top10HolderConcentrationPct?: number;
  moralisCorroboration?: {
    verified_contract?: boolean;
    possible_spam?: boolean;
    top10HolderConcentrationPct?: number;
  };
}

export interface SecurityScanResponse {
  success: boolean;
  source: string;
  contractAddress: string;
  chainId: string;
  timestamp: string;
  providers?: Record<string, { status: 'AVAILABLE' | 'FAILED' | 'TIMEOUT' | 'NO_DATA' | 'UNAVAILABLE'; error?: string }>;
  data?: SecurityScanData;
  error?: string;
}

export interface ScanHistoryItem {
  timestamp: string;
  lastCheckedAt?: string;
  checkCount?: number;
  source: string;
  highRiskCount: number;
  warnRiskCount: number;
  status: 'clean' | 'amber' | 'red';
  summary: string;
  contractAddress: string;
}

function getExplorerUrl(address: string, chainId?: string | number): string {
  const cleanAddr = address.trim();
  const cId = String(chainId || '1').toLowerCase();
  
  if (cId === 'solana' || cId === 'sol' || (!cleanAddr.startsWith('0x') && cleanAddr.length > 30)) {
    return `https://solscan.io/token/${cleanAddr}`;
  }
  if (cId === '56' || cId === 'bsc' || cId === 'binance') {
    return `https://bscscan.com/token/${cleanAddr}`;
  }
  if (cId === '42161' || cId === 'arbitrum') {
    return `https://arbiscan.io/token/${cleanAddr}`;
  }
  if (cId === '137' || cId === 'polygon') {
    return `https://polygonscan.com/token/${cleanAddr}`;
  }
  if (cId === '8453' || cId === 'base') {
    return `https://basescan.org/token/${cleanAddr}`;
  }
  if (cId === 'sui') {
    return `https://suiscan.xyz/mainnet/coin/${cleanAddr}`;
  }
  return `https://etherscan.io/token/${cleanAddr}`;
}

export default function MajorEventsAlertBox({
  name,
  symbol,
  category,
  contractAddress,
  chainId = '1',
  coingeckoId
}: MajorEventsAlertBoxProps) {
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedSuccess, setSyncedSuccess] = useState(false);
  const [copiedContract, setCopiedContract] = useState(false);
  const [scanResponse, setScanResponse] = useState<SecurityScanResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [showHistoryDetails, setShowHistoryDetails] = useState(false);

  const cleanAddress = (contractAddress || '').trim();

  // Detect whether the asset is a native L1 base network currency (BTC, ETH, SOL, KAS, etc.)
  const isNativeL1Asset = useMemo(() => {
    // If a deployed contract address is present, treat as a deployed token contract (e.g. SPL/ERC20)
    if (cleanAddress && cleanAddress.length > 5) return false;

    const cat = (category || '').toLowerCase();
    const sym = (symbol || '').toUpperCase().trim();
    const nm = (name || '').toLowerCase();
    const cg = (coingeckoId || '').toLowerCase();

    // Category matches Layer 1 / Native Network
    const isL1Category =
      cat.includes('layer 1') ||
      cat.includes('layer1') ||
      cat.includes('l1') ||
      cat.includes('blockdag') ||
      cat.includes('proof of work') ||
      cat.includes('base layer') ||
      cat.includes('smart contract / l1') ||
      cat.includes('smart contract / layer 1') ||
      cat.includes('layer 0') ||
      cat.includes('l0') ||
      cat.includes('native') ||
      cat.includes('consensus');

    // Known native Layer 1 base assets
    const knownL1Symbols = new Set([
      'BTC', 'ETH', 'SOL', 'KAS', 'SUI', 'ADA', 'AVAX', 'NEAR', 'DOT', 'ATOM',
      'DOGE', 'LTC', 'BCH', 'XRP', 'TRX', 'ALGO', 'FTM', 'HBAR', 'ICP', 'APT',
      'INJ', 'TIA', 'SEI', 'TON', 'MONAD', 'MINA', 'XMR', 'BNB', 'ZEC', 'ETC',
      'FIL', 'STX', 'KAVA', 'OSMO', 'EGLD', 'FLOW', 'XTZ', 'EOS', 'NEO', 'IOTA',
      'ALPH', 'BEAM', 'ROSE', 'CELO', 'ZEN', 'XDC', 'CKB', 'RVN', 'SCRT'
    ]);

    const knownL1Ids = new Set([
      'bitcoin', 'ethereum', 'solana', 'kaspa', 'sui', 'cardano', 'avalanche-2',
      'near', 'polkadot', 'cosmos', 'dogecoin', 'litecoin', 'bitcoin-cash',
      'ripple', 'tron', 'algorand', 'fantom', 'hedera-hashgraph', 'internet-computer',
      'aptos', 'injective-protocol', 'celestia', 'sei-network', 'the-open-network',
      'monad', 'mina-protocol', 'monero', 'binancecoin'
    ]);

    return (
      isL1Category ||
      knownL1Symbols.has(sym) ||
      knownL1Ids.has(cg) ||
      nm.includes('blockchain') ||
      nm.includes('blockdag') ||
      nm.includes('layer 1')
    );
  }, [category, symbol, name, coingeckoId, cleanAddress]);

  // Load and sanitize stored scan history for the current contract
  const loadStoredHistory = useCallback((addr: string) => {
    if (!addr) {
      setScanHistory([]);
      return;
    }
    const historyKey = `sec_scan_history_${addr.toLowerCase()}`;
    try {
      const existing = localStorage.getItem(historyKey);
      if (existing) {
        const parsed: ScanHistoryItem[] = JSON.parse(existing);
        if (Array.isArray(parsed)) {
          // Deduplicate consecutive identical scans
          const deduped: ScanHistoryItem[] = [];
          for (const item of parsed) {
            const isDuplicate = deduped.some(
              d => d.status === item.status && 
                   d.highRiskCount === item.highRiskCount && 
                   d.warnRiskCount === item.warnRiskCount &&
                   d.summary === item.summary
            );
            if (!isDuplicate) {
              deduped.push(item);
            }
          }
          setScanHistory(deduped.slice(0, 3));
          localStorage.setItem(historyKey, JSON.stringify(deduped.slice(0, 3)));
          return;
        }
      }
      setScanHistory([]);
    } catch (e) {
      setScanHistory([]);
    }
  }, []);

  const clearHistory = () => {
    if (!cleanAddress) return;
    const historyKey = `sec_scan_history_${cleanAddress.toLowerCase()}`;
    localStorage.removeItem(historyKey);
    setScanHistory([]);
  };

  const fetchSecurityScan = useCallback(async (addr?: string, cId?: string | number, isManualSync = false) => {
    const trimmedAddress = (addr || '').trim();

    if (!trimmedAddress) {
      setScanResponse(null);
      setScanHistory([]);
      if (isNativeL1Asset) {
        setErrorMessage(`Not applicable — ${symbol} is a native network asset, not a deployed token contract.`);
      } else {
        setErrorMessage(`Security scan unavailable — no contract address on file for ${name} (${symbol}).`);
      }
      setLoading(false);
      return;
    }

    try {
      const queryChain = String(cId || '1');
      const url = `/api/security/scan?chain=${encodeURIComponent(queryChain)}&address=${encodeURIComponent(trimmedAddress)}`;
      const res = await fetch(url);
      const json: SecurityScanResponse = await res.json();

      if (json.success && json.data) {
        setScanResponse(json);
        setErrorMessage(null);

        // Smart history update: Deduplicate so identical scans don't produce repetitive clones
        const historyKey = `sec_scan_history_${trimmedAddress.toLowerCase()}`;
        try {
          const existing = localStorage.getItem(historyKey);
          let historyList: ScanHistoryItem[] = existing ? JSON.parse(existing) : [];
          if (!Array.isArray(historyList)) historyList = [];

          const hasRed = (json.data.highRiskCount || 0) > 0 || json.data.is_honeypot || json.data.is_blacklisted;
          const hasAmber = !hasRed && ((json.data.warnRiskCount || 0) > 0 || json.data.is_mintable || json.data.is_proxy);
          const status: 'clean' | 'amber' | 'red' = hasRed ? 'red' : hasAmber ? 'amber' : 'clean';
          const summary = json.data.is_honeypot
            ? 'Honeypot Detected'
            : json.data.is_mintable
            ? 'Mintable Supply Active'
            : hasAmber
            ? 'Operational Warning'
            : 'Clean Scan';

          const nowIso = new Date().toISOString();

          // Check if latest history entry already has the exact same status and counts
          const latest = historyList[0];
          if (
            latest &&
            latest.status === status &&
            latest.highRiskCount === (json.data.highRiskCount || 0) &&
            latest.warnRiskCount === (json.data.warnRiskCount || 0) &&
            latest.summary === summary
          ) {
            // Update timestamp & increment check count instead of adding a duplicate card
            historyList[0] = {
              ...latest,
              lastCheckedAt: nowIso,
              checkCount: (latest.checkCount || 1) + 1,
              source: json.source || latest.source
            };
          } else {
            // Only push a new distinct item when the risk profile changed or for fresh records
            const newItem: ScanHistoryItem = {
              timestamp: nowIso,
              lastCheckedAt: nowIso,
              checkCount: 1,
              source: json.source || 'GoPlus Security',
              highRiskCount: json.data.highRiskCount || 0,
              warnRiskCount: json.data.warnRiskCount || 0,
              status,
              summary,
              contractAddress: trimmedAddress
            };
            historyList = [newItem, ...historyList].slice(0, 3);
          }

          localStorage.setItem(historyKey, JSON.stringify(historyList));
          setScanHistory(historyList);
        } catch (e) {
          console.warn('Failed to save scan history', e);
        }
      } else {
        setScanResponse(json);
        if (isNativeL1Asset) {
          setErrorMessage(`Not applicable — ${symbol} is a native network asset, not a deployed token contract.`);
        } else {
          setErrorMessage(json.error || `Security scan unavailable — no contract address on file for ${name} (${symbol}).`);
        }
      }
    } catch (err: any) {
      setScanResponse(null);
      setErrorMessage('Failed to connect to security scanner API.');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [isNativeL1Asset, symbol, name]);

  useEffect(() => {
    if (cleanAddress) {
      loadStoredHistory(cleanAddress);
      setLoading(true);
      fetchSecurityScan(cleanAddress, chainId);
    } else {
      setScanResponse(null);
      setScanHistory([]);
      if (isNativeL1Asset) {
        setErrorMessage(`Not applicable — ${symbol} is a native network asset, not a deployed token contract.`);
      } else {
        setErrorMessage(`Security scan unavailable — no contract address on file for ${name} (${symbol}).`);
      }
      setLoading(false);
    }
  }, [cleanAddress, chainId, fetchSecurityScan, isNativeL1Asset, loadStoredHistory, name, symbol]);

  const handleSyncEvents = async () => {
    if (!cleanAddress || isSyncing) return;
    setIsSyncing(true);
    setSyncedSuccess(false);

    await fetchSecurityScan(cleanAddress, chainId, true);

    setSyncedSuccess(true);
    setTimeout(() => {
      setSyncedSuccess(false);
    }, 2500);
  };

  const handleCopyContract = () => {
    if (!cleanAddress) return;
    navigator.clipboard.writeText(cleanAddress);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  const formattedTimestamp = scanResponse?.timestamp
    ? new Date(scanResponse.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC'
    : null;

  const explorerUrl = useMemo(() => {
    return cleanAddress ? getExplorerUrl(cleanAddress, chainId) : '#';
  }, [cleanAddress, chainId]);

  // Loading skeleton state
  if (loading) {
    return (
      <div className="my-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
            </div>
            <div className="space-y-1.5">
              <div className="h-4 w-44 bg-slate-800 rounded-md animate-pulse"></div>
              <div className="h-3 w-64 bg-slate-800/60 rounded-md animate-pulse"></div>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Scanning Bytecode...</span>
          </div>
        </div>
        <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500 h-full w-full animate-[pulse_1.2s_ease-in-out_infinite]"></div>
        </div>
      </div>
    );
  }

  // Specialized UI for Native Layer 1 Base Assets (BTC, ETH, SOL, KAS, etc.)
  if (isNativeL1Asset && !cleanAddress) {
    return (
      <div className="my-3 bg-gradient-to-br from-slate-950 via-slate-900/90 to-slate-950 border border-cyan-900/40 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cyan-900/30">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 shrink-0 mt-0.5 shadow-inner">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-left space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                  Native Layer 1 Base Asset
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 font-semibold">
                  Consensus Secured
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
                Not applicable — <strong className="text-white font-semibold">[{symbol}]</strong> is a native network asset, not a deployed token contract.
              </p>
              <p className="text-[11px] text-slate-400 leading-normal font-sans">
                Smart contract bytecode scans (honeypots, mintable supply, owner taxes) do not apply to base layer protocol currencies. Security is maintained through distributed node validator consensus and cryptographic protocol rules.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1.5 pl-1">
            <span className="px-3 py-1.5 rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Base Protocol</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">Native Currency</span>
          </div>
        </div>

        {/* Informational Consensus Vector Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-0.5">
            <span className="text-[10px] font-mono text-slate-400">Asset Class</span>
            <span className="text-xs font-mono font-semibold text-slate-200">Native L1 Base Asset</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-0.5">
            <span className="text-[10px] font-mono text-slate-400">Contract Bytecode</span>
            <span className="text-xs font-mono font-semibold text-cyan-300">N/A (Base Layer)</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-0.5">
            <span className="text-[10px] font-mono text-slate-400">Honeypot / Tax</span>
            <span className="text-xs font-mono font-semibold text-emerald-300">0% Protocol Native</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-0.5">
            <span className="text-[10px] font-mono text-slate-400">Security Model</span>
            <span className="text-xs font-mono font-semibold text-slate-200">Distributed Consensus</span>
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <span>Framework: Node Client & Protocol Security</span>
            <span className="text-slate-600">•</span>
            <span>Consensus Cryptography</span>
          </div>
          <span className="text-cyan-400/80 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
            Native {symbol} Network
          </span>
        </div>
      </div>
    );
  }

  // Neutral state when contractAddress is missing or scan is unavailable (and not native L1)
  if (!cleanAddress || !scanResponse?.success || !scanResponse?.data) {
    return (
      <div className="my-3 bg-gradient-to-br from-slate-950 via-slate-900/90 to-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-700/60 text-slate-400 shrink-0 mt-0.5">
              <Info className="w-5 h-5 text-slate-400" />
            </div>
            <div className="text-left space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Security Scan Pending
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  Unverified
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {errorMessage || `Security scan unavailable — no contract address on file for ${name} (${symbol}).`}
              </p>
            </div>
          </div>

          <button
            onClick={handleSyncEvents}
            disabled={isSyncing || !cleanAddress}
            className="group shrink-0 inline-flex items-center justify-center gap-2 text-xs font-mono font-semibold bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {syncedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Synced</span>
              </>
            ) : (
              <>
                <RefreshCw className={`w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Security'}</span>
              </>
            )}
          </button>
        </div>

        <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span>Engine: GoPlus Security & RugCheck</span>
            <span className="text-slate-600">•</span>
            <span>Real-Time On-Chain</span>
          </div>
          {cleanAddress && (
            <code className="text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {cleanAddress.slice(0, 6)}...{cleanAddress.slice(-4)}
            </code>
          )}
        </div>
      </div>
    );
  }

  const { data } = scanResponse;
  const isUnrenouncedWalletOwner = !data.renounced && !data.owner_is_contract && !data.trust_list;

  const hasRedRisk = (data.highRiskCount !== undefined ? data.highRiskCount > 0 : false) ||
    data.is_honeypot || data.is_blacklisted || data.owner_change_balance || data.cannotSell;

  const hasAmberRisk = !hasRedRisk && (
    data.is_mintable ||
    data.is_proxy ||
    !data.is_open_source ||
    isUnrenouncedWalletOwner
  );

  const isClean = !hasRedRisk && !hasAmberRisk;

  const ownershipText = data.renounced
    ? 'Renounced'
    : (data.owner_type_label || (data.owner_is_contract ? 'Contract / DAO' : data.trust_list ? 'Gov / Trusted' : 'Active Wallet'));
  const isOwnershipRisk = isUnrenouncedWalletOwner;

  // Visual Theme mapping based on scan result
  const themeConfig = hasRedRisk
    ? {
        containerBg: 'bg-gradient-to-br from-rose-950/50 via-slate-950/90 to-rose-950/30',
        borderColor: 'border-rose-500/40 hover:border-rose-500/60',
        glowColor: 'shadow-[0_0_25px_rgba(244,63,94,0.15)]',
        badgeBg: 'bg-rose-500/15 border-rose-500/40 text-rose-400',
        headerText: 'text-rose-300',
        highlightTag: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        syncBtn: 'bg-rose-950/70 hover:bg-rose-900 border-rose-500/40 text-rose-200 hover:text-white',
        codeBg: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
        icon: <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />,
        title: `🚨 CRITICAL SECURITY RISK ALERT — ${data.highRiskCount || 1} CRITICAL EXPLOIT VECTORS`,
        desc: `GoPlus Security bytecode inspection identified high-risk exploit vectors for ${name} (${symbol}). Exercise extreme caution with contract interactions.`
      }
    : hasAmberRisk
    ? {
        containerBg: 'bg-gradient-to-br from-amber-950/45 via-slate-950/90 to-amber-950/25',
        borderColor: 'border-amber-500/40 hover:border-amber-500/60',
        glowColor: 'shadow-[0_0_25px_rgba(245,158,11,0.15)]',
        badgeBg: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
        headerText: 'text-amber-300',
        highlightTag: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        syncBtn: 'bg-amber-950/70 hover:bg-amber-900 border-amber-500/40 text-amber-200 hover:text-white',
        codeBg: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
        icon: <Flame className="w-5 h-5 text-amber-400 shrink-0" />,
        title: `⚠️ OPERATIONAL & GOVERNANCE RISK WARNING (${data.warnRiskCount || 1} WARNING${(data.warnRiskCount || 1) > 1 ? 'S' : ''})`,
        desc: `GoPlus Security flagged operational parameters for ${name} (${symbol}) (${isUnrenouncedWalletOwner ? 'active wallet owner privileges' : 'mintable supply or proxy upgradeability'}).`
      }
    : {
        containerBg: 'bg-gradient-to-br from-emerald-950/45 via-slate-950/95 to-cyan-950/25',
        borderColor: 'border-emerald-500/35 hover:border-emerald-500/55',
        glowColor: 'shadow-[0_0_25px_rgba(16,185,129,0.15)]',
        badgeBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
        headerText: 'text-emerald-300',
        highlightTag: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        syncBtn: 'bg-gradient-to-r from-emerald-950/80 to-slate-900 hover:from-emerald-900 hover:to-emerald-800 border-emerald-500/40 text-emerald-300 hover:text-white',
        codeBg: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60',
        icon: <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />,
        title: data.trust_list
          ? '🛡️ GOPLUS VERIFIED — TRUSTED PROTOCOL & ZERO HIGH RISK ITEMS'
          : '🛡️ GOPLUS SECURITY SCAN CLEAN — ZERO EXPLOIT VECTORS',
        desc: `GoPlus Security live scan confirms verified open-source code, non-mintable supply, no honeypots, and zero blacklists for ${name} (${symbol}).`
      };

  return (
    <div className="my-3 space-y-2.5">
      {/* Primary Security Alert Container */}
      <div className={`relative overflow-hidden rounded-2xl border ${themeConfig.borderColor} ${themeConfig.containerBg} ${themeConfig.glowColor} p-4 sm:p-5 transition-all duration-300`}>
        {/* Subtle Ambient Light Glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none"></div>

        {/* Top Header Row with Icon, Title, and Enhanced Sync Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${themeConfig.badgeBg}`}>
              {themeConfig.icon}
            </div>
            <div className="text-left space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs md:text-sm font-mono font-bold tracking-wide uppercase ${themeConfig.headerText}`}>
                  {themeConfig.title}
                </span>
                {isClean && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Passed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-2xl">
                {themeConfig.desc}
              </p>
            </div>
          </div>

          {/* Upgraded Premium Sync Button */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={handleSyncEvents}
              disabled={isSyncing}
              title="Trigger live on-chain security re-scan"
              className={`group relative inline-flex items-center justify-center gap-2 text-xs font-mono font-bold px-3.5 py-2 rounded-xl border transition-all duration-200 shadow-md cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${themeConfig.syncBtn}`}
            >
              {syncedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Live Synced</span>
                </>
              ) : (
                <>
                  <RefreshCw className={`w-3.5 h-3.5 text-current transition-transform duration-500 ${isSyncing ? 'animate-spin text-cyan-400' : 'group-hover:rotate-180'}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Events'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Contract & Explorer Chip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-slate-400">Target Contract:</span>
            <div className={`inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-lg border ${themeConfig.codeBg}`}>
              <span>{cleanAddress.slice(0, 10)}...{cleanAddress.slice(-8)}</span>
              <button
                onClick={handleCopyContract}
                title="Copy contract address"
                className="hover:text-white text-slate-400 transition-colors p-0.5 cursor-pointer"
              >
                {copiedContract ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="View on Block Explorer"
                className="hover:text-white text-slate-400 transition-colors p-0.5"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Security Feed</span>
          </div>
        </div>

        {/* 7 GoPlus Security Verification Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 pt-2">
          <SecurityBadge label="Honeypot" isRisk={data.is_honeypot} text={data.is_honeypot ? 'DETECTED' : 'Clean'} />
          <SecurityBadge label="Blacklist" isRisk={data.is_blacklisted} text={data.is_blacklisted ? 'PRESENT' : 'None'} />
          <SecurityBadge label="Alter Balance" isRisk={data.owner_change_balance} text={data.owner_change_balance ? 'YES' : 'No'} />
          <SecurityBadge label="Mintable" isRisk={data.is_mintable} text={data.is_mintable ? 'Active' : 'No'} />
          <SecurityBadge label="Proxy" isRisk={data.is_proxy} text={data.is_proxy ? 'Upgradeable' : 'Direct'} />
          <SecurityBadge label="Open Source" isRisk={!data.is_open_source} text={data.is_open_source ? 'Verified' : 'Unverified'} />
          <SecurityBadge label="Ownership" isRisk={isOwnershipRisk} text={ownershipText} />
        </div>

        {/* Optional Alchemy / On-Chain Corroboration Telemetry Banner */}
        {(data.top10HolderConcentrationPct !== undefined || data.verified_contract !== undefined || data.possible_spam !== undefined) && (
          <div className="mt-2 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400 bg-slate-900/40 rounded-lg px-2.5 py-1.5 border border-slate-800/40">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Alchemy Corroboration:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {data.top10HolderConcentrationPct !== undefined && (
                <span>Top 10 Supply: <strong className={data.top10HolderConcentrationPct > 70 ? 'text-amber-300 font-bold' : 'text-slate-200'}>{data.top10HolderConcentrationPct}%</strong></span>
              )}
              {data.verified_contract !== undefined && (
                <span>Contract Verified: <strong className={data.verified_contract ? 'text-emerald-300' : 'text-amber-300'}>{data.verified_contract ? 'Yes' : 'No'}</strong></span>
              )}
              {data.possible_spam !== undefined && (
                <span>Spam Flag: <strong className={data.possible_spam ? 'text-rose-400 font-bold' : 'text-emerald-300'}>{data.possible_spam ? 'FLAGGED' : 'Clean'}</strong></span>
              )}
            </div>
          </div>
        )}

        {/* Footer Meta Details */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-3 mt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span>Engine: <strong className="text-slate-200">{scanResponse?.source || 'GoPlus Security'}</strong></span>
            <span className="text-slate-600">•</span>
            <span>Real-time On-chain</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Synced at {formattedTimestamp}</span>
          </div>
        </div>
      </div>

      {/* Historical Audit Continuity Summary & Accordion (Fixes 3 repetitive clone boxes) */}
      {scanHistory.length > 0 && (
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-slate-200">
                Audit Continuity Log
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400">
                {scanHistory[0]?.checkCount && scanHistory[0].checkCount > 1 
                  ? `${scanHistory[0].checkCount} Verified Scans` 
                  : `${scanHistory.length} Unique Entry`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={clearHistory}
                title="Clear local scan cache"
                className="text-[10px] text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Clear</span>
              </button>
              <button
                onClick={() => setShowHistoryDetails(!showHistoryDetails)}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>{showHistoryDetails ? 'Hide Timeline' : 'View Timeline'}</span>
                {showHistoryDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Compact Historical Summary Line */}
          <div className="text-[11px] font-sans text-slate-400 flex items-center justify-between bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                scanHistory[0]?.status === 'red' ? 'bg-rose-400' :
                scanHistory[0]?.status === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'
              }`}></span>
              <span className="text-slate-300">
                {scanHistory[0]?.status === 'clean'
                  ? 'Consistent Clean Record: Zero vulnerabilities detected across recent scans'
                  : scanHistory[0]?.status === 'amber'
                  ? 'Active Warning: Operational parameters under review'
                  : 'Critical Risk: Severe vulnerabilities recorded in ledger'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {scanHistory[0]?.lastCheckedAt ? new Date(scanHistory[0].lastCheckedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
            </span>
          </div>

          {/* Expandable Distinct Timeline Details */}
          {showHistoryDetails && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1.5 animate-fadeIn">
              {scanHistory.map((item, idx) => {
                const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const badgeColor = item.status === 'red' 
                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-300' 
                  : item.status === 'amber' 
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-300' 
                  : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300';
                return (
                  <div key={idx} className={`p-2.5 rounded-xl border text-[10px] font-mono flex flex-col justify-between gap-1.5 shadow-sm ${badgeColor}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider">
                        {item.status === 'red' ? 'Critical Risk' : item.status === 'amber' ? 'Warning' : 'Clean Scan'}
                      </span>
                      <span className="text-[9px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {timeStr}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-200">
                      {item.summary} ({item.highRiskCount} high, {item.warnRiskCount} warn)
                    </div>
                    <div className="text-[9px] text-slate-400 flex items-center justify-between pt-0.5 border-t border-slate-800/60">
                      <span>Checks: {item.checkCount || 1}x</span>
                      <span>{item.source}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SecurityBadge({ label, isRisk, text }: { label: string; isRisk: boolean; text: string }) {
  return (
    <div className={`flex flex-col justify-between p-2 rounded-xl border text-center transition-all ${
      isRisk 
        ? 'bg-rose-950/70 border-rose-500/50 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]' 
        : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
    }`}>
      <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1">{label}</span>
      <span className={`text-xs font-mono font-bold truncate ${isRisk ? 'text-rose-400' : 'text-emerald-400'}`}>
        {text}
      </span>
    </div>
  );
}

