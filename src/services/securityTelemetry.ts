/**
 * Security Telemetry Service
 * Normalizes multi-provider telemetry from /api/security/scan into lightweight observable snapshots.
 *
 * NOTE: Telemetry only. Never fabricates missing values. Never performs verification.
 */

export interface TelemetryProviderStatus {
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'FAILED' | 'TIMEOUT' | 'NO_DATA' | string;
  error?: string;
}

export interface RugCheckRiskItem {
  name: string;
  score?: number;
  level?: string;
  description?: string;
}

export interface SecurityTelemetrySnapshot {
  contractAddress: string;
  chainId: string;
  timestamp: string | null;
  source: string;
  cached: boolean;
  providers: {
    goplus?: TelemetryProviderStatus;
    rugcheck?: TelemetryProviderStatus;
    blockscout?: TelemetryProviderStatus;
    [key: string]: TelemetryProviderStatus | undefined;
  };
  // Actually observed signals (null when provider does not report or signal is unavailable)
  honeypot: boolean | null;
  mintable: boolean | null;
  blacklist: boolean | null;
  proxy: boolean | null;
  ownershipState: 'RENOUNCED' | 'CONTRACT_OWNER' | 'EOA_OWNER' | string | null;
  buyTax: string | null;
  sellTax: string | null;
  rugcheckScore: number | null;
  rugcheckRisks: RugCheckRiskItem[];
  top10HolderConcentrationPct: number | null;
}

/**
 * Normalizes the raw /api/security/scan JSON response into a strict SecurityTelemetrySnapshot.
 * Never fabricates values if the provider did not explicitly return them.
 */
export function normalizeSecurityTelemetry(
  raw: any,
  chainId: string,
  contractAddress: string
): SecurityTelemetrySnapshot {
  const data = raw?.data || {};
  const rawProviders = raw?.providers || {};

  const providers: SecurityTelemetrySnapshot['providers'] = {};
  for (const [key, val] of Object.entries(rawProviders)) {
    if (val && typeof val === 'object') {
      providers[key] = {
        status: (val as any).status || 'UNKNOWN',
        error: (val as any).error,
      };
    }
  }

  // Honeypot signal
  let honeypot: boolean | null = null;
  if (typeof data.is_honeypot === 'boolean') {
    honeypot = data.is_honeypot;
  } else if (Array.isArray(data.rugcheckRisks)) {
    honeypot = data.rugcheckRisks.some((r: any) =>
      String(r?.name || '').toLowerCase().includes('honeypot')
    );
  }

  // Mintable signal
  let mintable: boolean | null = null;
  if (typeof data.is_mintable === 'boolean') {
    mintable = data.is_mintable;
  }

  // Blacklist signal
  let blacklist: boolean | null = null;
  if (typeof data.is_blacklisted === 'boolean') {
    blacklist = data.is_blacklisted;
  }

  // Proxy / Upgradeability signal
  let proxy: boolean | null = null;
  if (typeof data.is_proxy === 'boolean') {
    proxy = data.is_proxy;
  }

  // Ownership state signal
  let ownershipState: string | null = null;
  if (typeof data.custodyRisk === 'string' && data.custodyRisk.trim()) {
    ownershipState = data.custodyRisk;
  } else if (typeof raw?.custodyRisk === 'string' && raw.custodyRisk.trim()) {
    ownershipState = raw.custodyRisk;
  } else if (typeof data.renounced === 'boolean') {
    ownershipState = data.renounced ? 'RENOUNCED' : 'UNRENOUNCED';
  }

  // Buy / Sell tax signals
  let buyTax: string | null = null;
  if (data.buyTax !== undefined && data.buyTax !== null) {
    buyTax = String(data.buyTax);
  } else if (data.buy_tax !== undefined && data.buy_tax !== null) {
    buyTax = String(data.buy_tax);
  }

  let sellTax: string | null = null;
  if (data.sellTax !== undefined && data.sellTax !== null) {
    sellTax = String(data.sellTax);
  } else if (data.sell_tax !== undefined && data.sell_tax !== null) {
    sellTax = String(data.sell_tax);
  }

  // RugCheck score & risks
  let rugcheckScore: number | null = null;
  if (typeof data.rugcheckScore === 'number' && !isNaN(data.rugcheckScore)) {
    rugcheckScore = data.rugcheckScore;
  }

  const rugcheckRisks: RugCheckRiskItem[] = Array.isArray(data.rugcheckRisks)
    ? data.rugcheckRisks.map((r: any) => ({
        name: String(r?.name || 'Unspecified risk'),
        score: typeof r?.score === 'number' ? r.score : undefined,
        level: typeof r?.level === 'string' ? r.level : undefined,
        description: typeof r?.description === 'string' ? r.description : undefined,
      }))
    : [];

  // Blockscout holder concentration
  let top10HolderConcentrationPct: number | null = null;
  if (
    typeof data.top10HolderConcentrationPct === 'number' &&
    !isNaN(data.top10HolderConcentrationPct)
  ) {
    top10HolderConcentrationPct = data.top10HolderConcentrationPct;
  }

  // Never fabricate a timestamp; return null if missing or invalid
  let timestamp: string | null = null;
  if (typeof raw?.timestamp === 'string' && raw.timestamp.trim()) {
    const parsed = Date.parse(raw.timestamp);
    if (!isNaN(parsed)) {
      timestamp = raw.timestamp;
    }
  }

  return {
    contractAddress,
    chainId,
    timestamp,
    source: raw?.source || 'Security Telemetry Feed',
    cached: Boolean(raw?.cached),
    providers,
    honeypot,
    mintable,
    blacklist,
    proxy,
    ownershipState,
    buyTax,
    sellTax,
    rugcheckScore,
    rugcheckRisks,
    top10HolderConcentrationPct,
  };
}

/**
 * Fetches security telemetry from the single authoritative backend endpoint /api/security/scan.
 */
export async function fetchSecurityTelemetry(
  chainId: string | number | undefined,
  contractAddress: string
): Promise<SecurityTelemetrySnapshot | null> {
  const trimmedAddress = contractAddress.trim();
  if (!trimmedAddress || trimmedAddress.length < 5) {
    return null;
  }

  const chainStr = String(chainId || '1').trim();
  const url = `/api/security/scan?chain=${encodeURIComponent(chainStr)}&address=${encodeURIComponent(trimmedAddress)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Security scan endpoint returned HTTP ${response.status}`);
  }

  const json = await response.json();
  return normalizeSecurityTelemetry(json, chainStr, trimmedAddress);
}
