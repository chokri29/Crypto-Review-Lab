import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Radio,
  RefreshCw,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import {
  fetchSecurityTelemetry,
  SecurityTelemetrySnapshot,
} from '../services/securityTelemetry';
import {
  getStoredAlerts,
  getStoredSnapshot,
  processTelemetrySnapshot,
  SecurityAlert,
} from '../services/securityAlertMonitor';

interface SecurityTelemetryWidgetProps {
  contractAddress: string;
  chainId?: string | number;
  symbol?: string;
  name?: string;
}

function formatTelemetryTime(timestamp: string | null | undefined): string {
  if (!timestamp || !timestamp.trim()) return 'Unavailable';
  const parsed = Date.parse(timestamp);
  if (isNaN(parsed)) return 'Unavailable';
  return new Date(timestamp).toLocaleTimeString();
}

export const SecurityTelemetryWidget: React.FC<SecurityTelemetryWidgetProps> = ({
  contractAddress,
  chainId = '1',
  symbol,
  name,
}) => {
  const [snapshot, setSnapshot] = useState<SecurityTelemetrySnapshot | null>(() =>
    getStoredSnapshot(String(chainId), contractAddress)
  );
  const [alerts, setAlerts] = useState<SecurityAlert[]>(() =>
    getStoredAlerts(String(chainId), contractAddress)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const pollTelemetry = useCallback(
    async (showLoading = false) => {
      if (!contractAddress || contractAddress.trim().length < 5) return;
      if (showLoading) setIsLoading(true);
      setErrorMessage(null);

      try {
        const snap = await fetchSecurityTelemetry(chainId, contractAddress);
        if (!isMountedRef.current) return;

        if (snap) {
          const { allAlerts } = processTelemetrySnapshot(snap);
          setSnapshot(snap);
          setAlerts(allAlerts);
          setLastCheckTime(new Date().toLocaleTimeString());
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setErrorMessage(err?.message || 'Unable to retrieve security telemetry');
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [chainId, contractAddress]
  );

  // Mount, poll every 5 minutes while component is active, clean up immediately on unmount
  useEffect(() => {
    isMountedRef.current = true;

    // Load initial stored values if contract changed
    setSnapshot(getStoredSnapshot(String(chainId), contractAddress));
    setAlerts(getStoredAlerts(String(chainId), contractAddress));

    // Initial fetch
    pollTelemetry(true);

    // 5-minute telemetry polling interval
    const POLL_INTERVAL_MS = 5 * 60 * 1000;
    const intervalId = setInterval(() => {
      pollTelemetry(false);
    }, POLL_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [contractAddress, chainId, pollTelemetry]);

  if (!contractAddress || contractAddress.trim().length < 5) {
    return null;
  }

  const providers = snapshot?.providers || {};
  const goplusStatus = providers.goplus?.status || 'UNKNOWN';
  const rugcheckStatus = providers.rugcheck?.status || 'UNKNOWN';
  const blockscoutStatus = providers.blockscout?.status || 'UNKNOWN';

  return (
    <div className="bg-slate-950/85 border border-cyber-cyan/25 rounded-2xl p-4 sm:p-5 text-left relative overflow-hidden shadow-xl space-y-4">
      {/* Top ambient accent glow */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan/50 to-transparent" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyber-cyan/15 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/30 text-cyber-cyan shadow-[0_0_12px_rgba(0,229,255,0.2)]">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-display font-bold text-xs sm:text-sm text-cyber-text-primary uppercase tracking-wider">
                Security Telemetry & Alert Monitor
              </h4>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-ping" />
                5m Polling Active
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
              Continuous multi-provider contract telemetry for{' '}
              <span className="text-slate-200 font-bold">{symbol || name || 'asset'}</span> (
              <span className="text-cyber-cyan">{contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}</span>)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <span className="text-[9px] font-mono text-slate-400 bg-slate-900 border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-cyber-cyan" />
            Telemetry Update:{' '}
            <span className="text-slate-200 font-semibold">
              {formatTelemetryTime(snapshot?.timestamp)}
            </span>
          </span>
          {snapshot?.source && (
            <span className="text-[9px] font-mono text-slate-400 bg-slate-900 border border-white/10 px-2 py-1 rounded-lg">
              Source: <span className="text-slate-200 font-semibold">{snapshot.source}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => pollTelemetry(true)}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-cyber-cyan/15 border border-cyber-cyan/30 text-slate-300 hover:text-cyber-cyan transition-all cursor-pointer disabled:opacity-50"
            title="Refresh security telemetry now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyber-cyan' : ''}`} />
          </button>
        </div>
      </div>

      {/* Provider Status Chips */}
      <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 text-[10px] font-mono">
        <div className="bg-slate-900/90 border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-2">
          <span className="text-slate-400">GoPlus Security</span>
          <span
            className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] border ${
              goplusStatus === 'AVAILABLE'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {goplusStatus}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-2">
          <span className="text-slate-400">RugCheck</span>
          <span
            className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] border ${
              rugcheckStatus === 'AVAILABLE'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {rugcheckStatus}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-2">
          <span className="text-slate-400">Blockscout</span>
          <span
            className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] border ${
              blockscoutStatus === 'AVAILABLE'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Metadata and holder concentration corroboration"
          >
            {blockscoutStatus}
          </span>
        </div>
      </div>

      {/* Observable Telemetry Signals Grid */}
      {snapshot && (
        <div className="bg-slate-900/50 border border-cyber-cyan/15 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-white/5 pb-1.5 flex-wrap gap-2">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-cyber-cyan" />
              Observed Contract Telemetry
            </span>
            <div className="flex items-center gap-2">
              <span>Telemetry Time: {formatTelemetryTime(snapshot.timestamp)}</span>
              <span>•</span>
              <span>
                {snapshot.cached ? 'Backend Cache Active (6h TTL)' : 'Live Read'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono pt-1">
            <div className="bg-slate-950/70 p-2 rounded-lg border border-white/5">
              <span className="text-[10px] text-slate-400 block">Honeypot</span>
              <span
                className={`font-bold ${
                  snapshot.honeypot === null
                    ? 'text-slate-500'
                    : snapshot.honeypot
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                }`}
              >
                {snapshot.honeypot === null ? 'Unavailable' : snapshot.honeypot ? 'Detected' : 'Negative'}
              </span>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-white/5">
              <span className="text-[10px] text-slate-400 block">Mintable</span>
              <span
                className={`font-bold ${
                  snapshot.mintable === null
                    ? 'text-slate-500'
                    : snapshot.mintable
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {snapshot.mintable === null ? 'Unavailable' : snapshot.mintable ? 'Active' : 'Disabled'}
              </span>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-white/5">
              <span className="text-[10px] text-slate-400 block">Blacklist Signal</span>
              <span
                className={`font-bold ${
                  snapshot.blacklist === null
                    ? 'text-slate-500'
                    : snapshot.blacklist
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                }`}
              >
                {snapshot.blacklist === null ? 'Unavailable' : snapshot.blacklist ? 'Present' : 'None'}
              </span>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-white/5">
              <span className="text-[10px] text-slate-400 block">Proxy / Upgradeable</span>
              <span
                className={`font-bold ${
                  snapshot.proxy === null
                    ? 'text-slate-500'
                    : snapshot.proxy
                    ? 'text-amber-400'
                    : 'text-slate-300'
                }`}
              >
                {snapshot.proxy === null ? 'Unavailable' : snapshot.proxy ? 'Yes' : 'Immutable'}
              </span>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-white/5">
              <span className="text-[10px] text-slate-400 block">Ownership State</span>
              <span className="font-bold text-slate-200">
                {snapshot.ownershipState || 'Unspecified'}
              </span>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-white/5">
              <span className="text-[10px] text-slate-400 block">Buy / Sell Tax</span>
              <span className="font-bold text-slate-200">
                {snapshot.buyTax ?? 'N/A'} / {snapshot.sellTax ?? 'N/A'}
              </span>
            </div>

            {snapshot.top10HolderConcentrationPct !== null && (
              <div className="bg-slate-950/70 p-2 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-400 block">Blockscout Top 10</span>
                <span className="font-bold text-slate-200">
                  {snapshot.top10HolderConcentrationPct.toFixed(1)}%
                </span>
              </div>
            )}

            {snapshot.rugcheckScore !== null && (
              <div className="bg-slate-950/70 p-2 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-400 block">RugCheck Score</span>
                <span className="font-bold text-slate-200">
                  {snapshot.rugcheckScore}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Telemetry Alerts List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5 font-bold text-slate-300">
            <Bell className="w-3.5 h-3.5 text-cyber-cyan" />
            Recent Security Alerts ({alerts.length})
          </span>
          {lastCheckTime && (
            <span className="text-[10px] text-slate-500">Last poll: {lastCheckTime}</span>
          )}
        </div>

        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {alerts.length === 0 ? (
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs font-mono text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>No telemetry signal changes observed. Continuous 5-minute monitor active.</span>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyber-cyan/30">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-2.5 rounded-xl border text-xs font-mono flex items-start gap-2.5 transition-colors ${
                  alert.severity === 'critical'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : alert.severity === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-slate-900/80 border-cyber-cyan/20 text-slate-300'
                }`}
              >
                <ShieldAlert
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    alert.severity === 'critical'
                      ? 'text-rose-400'
                      : alert.severity === 'warning'
                      ? 'text-amber-400'
                      : 'text-cyber-cyan'
                  }`}
                />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="leading-snug break-words">{alert.message}</p>
                  <div className="flex items-center gap-2 text-[9px] text-slate-400">
                    <span>Source: {alert.source}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityTelemetryWidget;
