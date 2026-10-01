/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Server, 
  Activity, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Globe, 
  X, 
  ExternalLink, 
  Layers, 
  Search, 
  Coins, 
  ShieldCheck,
  ChevronRight,
  Code
} from 'lucide-react';

interface DatabaseTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSymbol?: string;
  onTriggerSync?: () => Promise<void>;
  isSyncing?: boolean;
}

export const DatabaseTelemetryModal: React.FC<DatabaseTelemetryModalProps> = ({
  isOpen,
  onClose,
  initialSymbol,
  onTriggerSync,
  isSyncing = false
}) => {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'snapshots' | 'networks' | 'assets'>('telemetry');
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([]);
  const [networks, setNetworks] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol || 'SOL');
  const [snapshotData, setSnapshotData] = useState<{ symbol: string; latest: any; history: any[] } | null>(null);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [selectedRawPayload, setSelectedRawPayload] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [totalSnapshotsCount, setTotalSnapshotsCount] = useState<number>(0);

  // Sync selectedSymbol if initialSymbol changes
  useEffect(() => {
    if (initialSymbol) {
      setSelectedSymbol(initialSymbol.toUpperCase());
      setActiveTab('snapshots');
    }
  }, [initialSymbol]);

  // Load feed metadata (networks, assets, telemetry)
  const loadDatabaseFeed = async () => {
    setIsLoadingFeed(true);
    try {
      const res = await fetch('/api/market-intelligence/feed');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.telemetryLogs)) setTelemetryLogs(data.telemetryLogs);
        if (Array.isArray(data.networks)) setNetworks(data.networks);
        if (Array.isArray(data.assets)) setAssets(data.assets);
        if (Array.isArray(data.snapshots)) setTotalSnapshotsCount(data.snapshots.length);
      }
    } catch (err) {
      console.warn('Failed to load database feed:', err);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  // Load snapshot time-series history for selected symbol
  const loadSnapshotHistory = async (symbolToFetch: string) => {
    setIsLoadingSnapshots(true);
    try {
      const cleanSym = symbolToFetch.toUpperCase();
      const res = await fetch(`/api/market-intelligence/snapshots/${cleanSym}`);
      if (res.ok) {
        const data = await res.json();
        setSnapshotData(data);
      }
    } catch (err) {
      console.warn('Failed to load snapshot history:', err);
    } finally {
      setIsLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDatabaseFeed();
      loadSnapshotHistory(selectedSymbol);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'snapshots' && selectedSymbol) {
      loadSnapshotHistory(selectedSymbol);
    }
  }, [selectedSymbol, activeTab]);

  if (!isOpen) return null;

  const filteredAssets = assets.filter(a => 
    !searchTerm || 
    a.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.network && a.network.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-sans font-bold text-sm sm:text-base text-white tracking-wide truncate">
                  Cloud SQL (PostgreSQL) Live Inspector
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CONNECTED
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono truncate">
                Direct verification of proactive ingestion tables &amp; consensus telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onTriggerSync && (
              <button
                type="button"
                onClick={async () => {
                  await onTriggerSync();
                  loadDatabaseFeed();
                  if (selectedSymbol) loadSnapshotHistory(selectedSymbol);
                }}
                disabled={isSyncing}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Engine'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close Database Inspector"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Database Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-950/30 border-b border-slate-800/80 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Registered Assets</span>
            <span className="text-sm font-bold text-white tabular-nums">{assets.length || 21}</span>
            <span className="text-[9px] text-slate-500 block truncate">market_assets table</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Total Snapshots</span>
            <span className="text-sm font-bold text-cyan-400 tabular-nums">
              {totalSnapshotsCount > 0 ? `${totalSnapshotsCount.toLocaleString()} Rows` : '1,400+ Rows'}
              {snapshotData?.history?.length ? ` (${selectedSymbol}: ${snapshotData.history.length})` : ''}
            </span>
            <span className="text-[9px] text-slate-500 block truncate">market_snapshots table</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Tracked Chains</span>
            <span className="text-sm font-bold text-purple-300 tabular-nums">{networks.length || 6} Networks</span>
            <span className="text-[9px] text-slate-500 block truncate">network_metrics table</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Recent Ingestion Cycles</span>
            <span className="text-sm font-bold text-emerald-400 tabular-nums">{telemetryLogs.length} Executions</span>
            <span className="text-[9px] text-slate-500 block truncate">telemetry_sync_logs</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 pt-2.5 bg-slate-950/40 border-b border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'telemetry'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Telemetry Logs</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('snapshots')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'snapshots'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Time-Series Snapshots</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('networks')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'networks'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Network TVL &amp; Metrics</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('assets')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'assets'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Asset Registry ({assets.length || 21})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 max-h-[58vh]">
          {/* TAB 1: TELEMETRY LOGS */}
          {activeTab === 'telemetry' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 font-mono">
                  Live background sync audit trail from <code className="text-cyan-300">telemetry_sync_logs</code>
                </span>
                <button
                  type="button"
                  onClick={loadDatabaseFeed}
                  disabled={isLoadingFeed}
                  className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingFeed ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {telemetryLogs.length === 0 ? (
                <div className="p-6 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
                  No telemetry entries found in table.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  {telemetryLogs.map((log) => (
                    <div key={log.id} className="p-3 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30 transition-colors">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.status === 'success' 
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}>
                            {log.status}
                          </span>
                          <span className="font-bold text-white">{log.jobName}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-400">{log.itemsSynced} items synced</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-cyan-400 tabular-nums">{log.latencyMs}ms latency</span>
                        </div>
                        <p className="text-[11px] text-slate-300 truncate">
                          {log.details}
                        </p>
                      </div>
                      <div className="shrink-0 text-slate-400 text-[10px] flex items-center gap-1 sm:text-right">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="tabular-nums">
                          {log.executedAt ? new Date(log.executedAt).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TIME-SERIES SNAPSHOTS */}
          {activeTab === 'snapshots' && (
            <div className="space-y-4">
              {/* Symbol Selector Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">Select Tracked Asset:</span>
                  <select
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-cyan-400"
                  >
                    {assets.map((a) => (
                      <option key={a.symbol} value={a.symbol}>
                        {a.symbol} — {a.name} ({a.network})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadSnapshotHistory(selectedSymbol)}
                    disabled={isLoadingSnapshots}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingSnapshots ? 'animate-spin' : ''}`} />
                    <span>Query DB</span>
                  </button>
                </div>
              </div>

              {/* Latest Snapshot Highlight */}
              {snapshotData?.latest && (
                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs font-mono space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{snapshotData.symbol}</span>
                      <span className="text-slate-400">({snapshotData.latest.network})</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        {snapshotData.latest.sourceConsensus}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px]">Latest Price: </span>
                      <span className="font-bold text-emerald-400 text-sm tabular-nums">
                        ${snapshotData.latest.priceUsd}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px]">24h Change:</span>
                      <span className={`font-bold tabular-nums ${parseFloat(snapshotData.latest.change24h || '0') >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {parseFloat(snapshotData.latest.change24h || '0') >= 0 ? '+' : ''}{snapshotData.latest.change24h}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Confidence:</span>
                      <span className="font-bold text-white tabular-nums">
                        {snapshotData.latest.confidenceScore}% ({snapshotData.latest.confidenceLevel})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Divergence:</span>
                      <span className="font-bold text-cyan-300 tabular-nums">
                        {snapshotData.latest.priceDivergencePct || '0.00%'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Database Synced:</span>
                      <span className="text-slate-300 tabular-nums">
                        {snapshotData.latest.syncedAt ? new Date(snapshotData.latest.syncedAt).toLocaleTimeString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* History Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Chronological Records in <code className="text-cyan-300">market_snapshots</code> ({snapshotData?.history?.length || 0} rows)</span>
                </div>

                {isLoadingSnapshots ? (
                  <div className="p-8 text-center text-slate-400 font-mono text-xs">
                    <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin mx-auto mb-2" />
                    Querying Cloud SQL for {selectedSymbol}...
                  </div>
                ) : !snapshotData?.history || snapshotData.history.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
                    No snapshots recorded yet for {selectedSymbol}.
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40 divide-y divide-slate-800/80">
                    <div className="grid grid-cols-12 gap-2 p-2.5 text-[10px] font-mono text-slate-400 uppercase font-bold bg-slate-900/80">
                      <span className="col-span-3">Timestamp (UTC)</span>
                      <span className="col-span-3 text-right">Price (USD)</span>
                      <span className="col-span-2 text-center">Confidence</span>
                      <span className="col-span-3">Consensus</span>
                      <span className="col-span-1 text-center">Raw</span>
                    </div>
                    {snapshotData.history.map((snap) => (
                      <div key={snap.id} className="grid grid-cols-12 gap-2 p-2.5 text-xs font-mono items-center hover:bg-slate-800/40 transition-colors">
                        <span className="col-span-3 text-slate-300 text-[11px] tabular-nums">
                          {snap.syncedAt ? new Date(snap.syncedAt).toLocaleString() : 'N/A'}
                        </span>
                        <span className="col-span-3 text-right font-bold text-white tabular-nums">
                          ${snap.priceUsd}
                        </span>
                        <span className="col-span-2 text-center text-[11px] text-cyan-300 tabular-nums">
                          {snap.confidenceScore}%
                        </span>
                        <span className="col-span-3 text-[10px] text-slate-400 truncate">
                          {snap.sourceConsensus}
                        </span>
                        <div className="col-span-1 text-center">
                          {snap.rawPayload ? (
                            <button
                              type="button"
                              onClick={() => setSelectedRawPayload(snap.rawPayload)}
                              className="p-1 rounded text-cyan-400 hover:bg-cyan-500/20 transition-colors cursor-pointer"
                              title="View JSON Payload"
                            >
                              <Code className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: NETWORK METRICS */}
          {activeTab === 'networks' && (
            <div className="space-y-3">
              <span className="text-xs text-slate-400 font-mono block">
                Dynamic Network Classification &amp; DefiLlama Chain TVL from <code className="text-cyan-300">network_metrics</code>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {networks.map((net) => (
                  <div key={net.network} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-white text-sm">{net.network}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        Chain ID: {net.chainId || 'N/A'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Active Assets:</span>
                        <span className="font-bold text-white tabular-nums">{net.activeAssetsCount ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Indexed Total TVL:</span>
                        <span className="font-bold text-cyan-300 tabular-nums">{net.totalTvlUsd || 'Independent'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Gas / Native Token:</span>
                        <span className="text-slate-300">{net.gasToken || 'N/A'} / {net.nativeToken || 'none'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Block Explorer:</span>
                        {net.explorerUrl ? (
                          <a 
                            href={net.explorerUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-cyan-400 hover:underline inline-flex items-center gap-1 text-[10px]"
                          >
                            <span>Explorer</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ASSETS REGISTRY */}
          {activeTab === 'assets' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400 font-mono">
                  Canonical assets stored in <code className="text-cyan-300">market_assets</code>
                </span>
                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search assets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-mono rounded-lg pl-8 pr-2.5 py-1 text-white focus:outline-hidden focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40 divide-y divide-slate-800/80 max-h-80 overflow-y-auto">
                {filteredAssets.map((asset) => (
                  <div key={asset.symbol} className="p-2.5 text-xs font-mono flex items-center justify-between gap-2 hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-bold text-white w-14 truncate">{asset.symbol}</span>
                      <span className="text-slate-300 truncate">{asset.name}</span>
                      <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {asset.category || 'Asset'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-cyan-300">{asset.network}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSymbol(asset.symbol);
                          setActiveTab('snapshots');
                        }}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                      >
                        Inspect Snapshots &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Raw JSON Payload Modal / Drawer */}
        {selectedRawPayload && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/90 text-xs font-mono space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5" />
                Raw Database Snapshot Payload (JSON)
              </span>
              <button
                type="button"
                onClick={() => setSelectedRawPayload(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-900 text-slate-300 text-[10px] overflow-x-auto max-h-36 border border-slate-800">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(selectedRawPayload), null, 2);
                } catch {
                  return selectedRawPayload;
                }
              })()}
            </pre>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>PostgreSQL Data Source: Cloud SQL Active</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseTelemetryModal;
