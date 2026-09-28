/**
 * Security Alert Monitor Service
 * Compares incoming telemetry snapshots against previous snapshots per chain + contract.
 * Emits deduplicated alerts only when observable telemetry signals change.
 *
 * Telemetry only — NOT verification.
 */

import { SecurityTelemetrySnapshot } from './securityTelemetry';

export interface SecurityAlert {
  id: string;
  timestamp: string;
  contractAddress: string;
  chainId: string;
  source: string;
  severity: 'info' | 'warning' | 'critical';
  signalName: string;
  message: string;
}

export const TAX_CHANGE_THRESHOLD = 1.0; // percentage point
export const HOLDER_CONCENTRATION_CHANGE_THRESHOLD = 2.0; // percentage points
export const RUGCHECK_SCORE_CHANGE_THRESHOLD = 100;

const STORAGE_SNAPSHOT_PREFIX = 'crl_sec_snap_';
const STORAGE_ALERTS_PREFIX = 'crl_sec_alerts_';
const MAX_ALERT_HISTORY = 20;

function getSnapshotKey(chainId: string, contractAddress: string): string {
  return `${STORAGE_SNAPSHOT_PREFIX}${chainId.toLowerCase()}_${contractAddress.toLowerCase()}`;
}

function getAlertsKey(chainId: string, contractAddress: string): string {
  return `${STORAGE_ALERTS_PREFIX}${chainId.toLowerCase()}_${contractAddress.toLowerCase()}`;
}

/**
 * Retrieve previously stored snapshot from localStorage.
 */
export function getStoredSnapshot(
  chainId: string,
  contractAddress: string
): SecurityTelemetrySnapshot | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = localStorage.getItem(getSnapshotKey(chainId, contractAddress));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Retrieve stored recent alert history from localStorage.
 */
export function getStoredAlerts(
  chainId: string,
  contractAddress: string
): SecurityAlert[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = localStorage.getItem(getAlertsKey(chainId, contractAddress));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save snapshot to localStorage.
 */
function saveSnapshot(snapshot: SecurityTelemetrySnapshot): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(
      getSnapshotKey(snapshot.chainId, snapshot.contractAddress),
      JSON.stringify(snapshot)
    );
  } catch {}
}

/**
 * Save alerts to localStorage (capped at MAX_ALERT_HISTORY).
 */
function saveAlerts(
  chainId: string,
  contractAddress: string,
  alerts: SecurityAlert[]
): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const trimmed = alerts.slice(0, MAX_ALERT_HISTORY);
    localStorage.setItem(getAlertsKey(chainId, contractAddress), JSON.stringify(trimmed));
  } catch {}
}

/**
 * Helper to safely parse numeric percentage from tax strings (e.g. "0.0%", "5.5%", "5").
 * Returns null if non-numeric or unavailable; never fabricates a value.
 */
function parseNumericTax(val: string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  const cleaned = String(val).replace('%', '').trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Compares current snapshot with the previous snapshot.
 * Emits alerts only when observable telemetry signals change.
 * Suppresses duplicates against existing alert history.
 */
export function processTelemetrySnapshot(
  current: SecurityTelemetrySnapshot
): {
  newAlerts: SecurityAlert[];
  allAlerts: SecurityAlert[];
  previousSnapshot: SecurityTelemetrySnapshot | null;
} {
  const previous = getStoredSnapshot(current.chainId, current.contractAddress);
  const existingAlerts = getStoredAlerts(current.chainId, current.contractAddress);
  const newAlerts: SecurityAlert[] = [];
  const now = new Date().toISOString();

  if (previous) {
    // 1. Honeypot signal change
    if (
      current.honeypot !== null &&
      previous.honeypot !== null &&
      current.honeypot !== previous.honeypot
    ) {
      newAlerts.push({
        id: `alert-honeypot-${current.contractAddress}-${now}`,
        timestamp: now,
        contractAddress: current.contractAddress,
        chainId: current.chainId,
        source: 'GoPlus Security',
        severity: current.honeypot ? 'critical' : 'info',
        signalName: 'honeypot',
        message: `GoPlus signal changed: honeypot ${previous.honeypot} → ${current.honeypot}.`,
      });
    }

    // 2. Mintable signal change
    if (
      current.mintable !== null &&
      previous.mintable !== null &&
      current.mintable !== previous.mintable
    ) {
      newAlerts.push({
        id: `alert-mintable-${current.contractAddress}-${now}`,
        timestamp: now,
        contractAddress: current.contractAddress,
        chainId: current.chainId,
        source: 'GoPlus Security',
        severity: current.mintable ? 'warning' : 'info',
        signalName: 'mintable',
        message: `GoPlus signal changed: mintable ${previous.mintable} → ${current.mintable}.`,
      });
    }

    // 3. Blacklist signal change
    if (
      current.blacklist !== null &&
      previous.blacklist !== null &&
      current.blacklist !== previous.blacklist
    ) {
      newAlerts.push({
        id: `alert-blacklist-${current.contractAddress}-${now}`,
        timestamp: now,
        contractAddress: current.contractAddress,
        chainId: current.chainId,
        source: 'GoPlus Security',
        severity: current.blacklist ? 'critical' : 'info',
        signalName: 'blacklist',
        message: `GoPlus signal changed: blacklist status ${previous.blacklist} → ${current.blacklist}.`,
      });
    }

    // 4. Proxy / Upgradeability signal change
    if (
      current.proxy !== null &&
      previous.proxy !== null &&
      current.proxy !== previous.proxy
    ) {
      newAlerts.push({
        id: `alert-proxy-${current.contractAddress}-${now}`,
        timestamp: now,
        contractAddress: current.contractAddress,
        chainId: current.chainId,
        source: 'GoPlus Security',
        severity: 'info',
        signalName: 'proxy',
        message: `GoPlus signal changed: proxy contract flag ${previous.proxy} → ${current.proxy}.`,
      });
    }

    // 5. Ownership state change
    if (
      current.ownershipState &&
      previous.ownershipState &&
      current.ownershipState !== previous.ownershipState
    ) {
      newAlerts.push({
        id: `alert-ownership-${current.contractAddress}-${now}`,
        timestamp: now,
        contractAddress: current.contractAddress,
        chainId: current.chainId,
        source: 'Security Telemetry Feed',
        severity: 'warning',
        signalName: 'ownership',
        message: `Ownership telemetry state changed: ${previous.ownershipState} → ${current.ownershipState}.`,
      });
    }

    // 6. Buy / Sell Tax change (triggers only when numeric change >= TAX_CHANGE_THRESHOLD)
    const prevBuyNum = parseNumericTax(previous.buyTax);
    const currBuyNum = parseNumericTax(current.buyTax);
    const buyTaxChanged =
      prevBuyNum !== null &&
      currBuyNum !== null &&
      Math.abs(currBuyNum - prevBuyNum) >= TAX_CHANGE_THRESHOLD;

    const prevSellNum = parseNumericTax(previous.sellTax);
    const currSellNum = parseNumericTax(current.sellTax);
    const sellTaxChanged =
      prevSellNum !== null &&
      currSellNum !== null &&
      Math.abs(currSellNum - prevSellNum) >= TAX_CHANGE_THRESHOLD;

    if (buyTaxChanged || sellTaxChanged) {
      newAlerts.push({
        id: `alert-tax-${current.contractAddress}-${now}`,
        timestamp: now,
        contractAddress: current.contractAddress,
        chainId: current.chainId,
        source: 'GoPlus Security',
        severity: 'warning',
        signalName: 'tax',
        message: `Transaction tax signal changed: Buy tax ${previous.buyTax ?? 'N/A'} → ${current.buyTax ?? 'N/A'}, Sell tax ${previous.sellTax ?? 'N/A'} → ${current.sellTax ?? 'N/A'}.`,
      });
    }

    // 7. RugCheck risk changes
    if (
      current.rugcheckScore !== null &&
      previous.rugcheckScore !== null &&
      Math.abs(current.rugcheckScore - previous.rugcheckScore) >= RUGCHECK_SCORE_CHANGE_THRESHOLD
    ) {
      newAlerts.push({
        id: `alert-rugcheck-score-${current.contractAddress}-${now}`,
        timestamp: now,
        contractAddress: current.contractAddress,
        chainId: current.chainId,
        source: 'RugCheck',
        severity: 'info',
        signalName: 'rugcheck_score',
        message: `RugCheck risk score shifted: ${previous.rugcheckScore} → ${current.rugcheckScore}.`,
      });
    }

    // New RugCheck risk flags
    if (current.rugcheckRisks.length > 0) {
      const prevNames = new Set(previous.rugcheckRisks.map((r) => r.name.toLowerCase()));
      const newFlags = current.rugcheckRisks.filter((r) => !prevNames.has(r.name.toLowerCase()));
      if (newFlags.length > 0) {
        newAlerts.push({
          id: `alert-rugcheck-risk-${current.contractAddress}-${now}`,
          timestamp: now,
          contractAddress: current.contractAddress,
          chainId: current.chainId,
          source: 'RugCheck',
          severity: 'warning',
          signalName: 'rugcheck_new_flag',
          message: `RugCheck reported a new risk flag: ${newFlags.map((f) => f.name).join(', ')}.`,
        });
      }
    }

    // 8. Blockscout holder concentration changes materially (>= HOLDER_CONCENTRATION_CHANGE_THRESHOLD delta)
    if (
      current.top10HolderConcentrationPct !== null &&
      previous.top10HolderConcentrationPct !== null &&
      Math.abs(current.top10HolderConcentrationPct - previous.top10HolderConcentrationPct) >= HOLDER_CONCENTRATION_CHANGE_THRESHOLD
    ) {
      newAlerts.push({
        id: `alert-blockscout-holders-${current.contractAddress}-${now}`,
        timestamp: now,
        contractAddress: current.contractAddress,
        chainId: current.chainId,
        source: 'Blockscout',
        severity: 'info',
        signalName: 'holder_concentration',
        message: `Blockscout holder concentration changed: ${previous.top10HolderConcentrationPct.toFixed(1)}% → ${current.top10HolderConcentrationPct.toFixed(1)}%.`,
      });
    }

    // 9. Provider availability changes
    const knownProviders = ['goplus', 'rugcheck', 'blockscout'];
    for (const p of knownProviders) {
      const prevStatus = previous.providers?.[p]?.status;
      const currStatus = current.providers?.[p]?.status;
      if (currStatus && prevStatus && currStatus !== prevStatus) {
        newAlerts.push({
          id: `alert-provider-${p}-${current.contractAddress}-${now}`,
          timestamp: now,
          contractAddress: current.contractAddress,
          chainId: current.chainId,
          source: p === 'goplus' ? 'GoPlus' : p === 'rugcheck' ? 'RugCheck' : 'Blockscout',
          severity: currStatus === 'AVAILABLE' ? 'info' : 'warning',
          signalName: `provider_${p}`,
          message: `Provider status for ${p} changed: ${prevStatus} → ${currStatus}.`,
        });
      }
    }
  }

  // Deduplicate against existing alerts:
  // If an alert with the same signalName and identical message was emitted within the last hour, suppress it
  const filteredNewAlerts = newAlerts.filter((newA) => {
    return !existingAlerts.some(
      (existing) =>
        existing.signalName === newA.signalName &&
        existing.message === newA.message &&
        Math.abs(new Date(existing.timestamp).getTime() - new Date(newA.timestamp).getTime()) < 60 * 60 * 1000
    );
  });

  // Prepend new alerts and persist
  const updatedAlerts = [...filteredNewAlerts, ...existingAlerts].slice(0, MAX_ALERT_HISTORY);

  saveSnapshot(current);
  if (filteredNewAlerts.length > 0) {
    saveAlerts(current.chainId, current.contractAddress, updatedAlerts);
  }

  return {
    newAlerts: filteredNewAlerts,
    allAlerts: updatedAlerts,
    previousSnapshot: previous,
  };
}
