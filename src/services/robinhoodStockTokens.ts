/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Ingestion and verification service for Robinhood Stock Tokens.
 * Fetches dynamic asset listings from Robinhood rhj/assets feed,
 * verifies on-chain smart contract bytecode deployment on Robinhood Chain (chainId 4663),
 * and caches results for 24 hours.
 */

import { ROBINHOOD_CHAIN } from '../constants/chains.ts';

export interface RobinhoodStockToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  currentMultiplier: string;
  verifiedAt: string;
}

interface RawRobinhoodDeployment {
  contractAddress?: string;
  chainId?: number;
  networkName?: string;
}

interface RawRobinhoodAsset {
  id?: string;
  tokenSymbol?: string;
  tokenName?: string;
  deployments?: RawRobinhoodDeployment[];
  currentMultiplier?: string;
  tokenDecimals?: number;
  status?: string;
}

interface RawRobinhoodAssetsResponse {
  assets?: RawRobinhoodAsset[];
}

// 24-hour in-memory cache
let cachedTokens: RobinhoodStockToken[] | null = null;
let lastCacheTimestamp = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FORCED_REFRESH_COOLDOWN_MS = 60 * 1000; // 60s cooldown on forced refreshes
let lastForcedRefreshTimestamp = 0;
let inFlightPromise: Promise<RobinhoodStockToken[]> | null = null;

/**
 * Checks bytecode deployment on Robinhood Chain RPC (eth_getCode != 0x).
 * Corresponds to existing /api/robinhood/verify-contract verification logic.
 */
async function checkRobinhoodBytecodeWithRetry(address: string, maxAttempts = 3): Promise<boolean> {
  const cleanAddr = address.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(cleanAddr)) return false;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const rpcRes = await fetch(ROBINHOOD_CHAIN.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getCode',
          params: [cleanAddr, 'latest']
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!rpcRes.ok) {
        if (attempt < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
          continue;
        }
        return false;
      }

      const json = await rpcRes.json();
      const code = typeof json?.result === 'string' ? json.result.trim().toLowerCase() : '';
      const hasBytecode = code.startsWith('0x') && code !== '0x' && code !== '0x0' && code.length > 2;
      return hasBytecode;
    } catch {
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
      }
    }
  }
  return false;
}

/**
 * Server-side ingestion job:
 * 1. Fetches https://api.robinhood.com/rhj/assets
 * 2. Filters for deployments on ROBINHOOD_CHAIN.chainId (4663)
 * 3. Verifies eth_getCode != 0x / hasBytecode on Robinhood Chain RPC
 * 4. Caches verified tokens for 24 hours
 */
export async function getVerifiedRobinhoodStockTokens(forceRefresh = false): Promise<RobinhoodStockToken[]> {
  const now = Date.now();

  // If forced refresh requested, enforce a 60s cooldown; during cooldown return the cached result, not an error
  if (forceRefresh) {
    if (cachedTokens && (now - lastForcedRefreshTimestamp) < FORCED_REFRESH_COOLDOWN_MS) {
      console.log(`[RobinhoodStockTokens] Forced refresh on 60s cooldown (${Math.round((FORCED_REFRESH_COOLDOWN_MS - (now - lastForcedRefreshTimestamp)) / 1000)}s remaining); returning cached result.`);
      return cachedTokens;
    }
    lastForcedRefreshTimestamp = now;
  } else if (cachedTokens && (now - lastCacheTimestamp) < CACHE_TTL_MS) {
    return cachedTokens;
  }

  // In-flight promise deduplication
  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const response = await fetch('https://api.robinhood.com/rhj/assets', {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CryptoReviewLab/3.2.0'
        }
      });

      if (!response.ok) {
        console.warn(`[RobinhoodStockTokens] Feed returned HTTP ${response.status}`);
        if (cachedTokens) return cachedTokens;
        return [];
      }

      const json: RawRobinhoodAssetsResponse = await response.json();
      const assets = Array.isArray(json.assets) ? json.assets : [];

      // Filter deployments on Robinhood Chain (chainId 4663)
      const candidates: Array<{
        symbol: string;
        name: string;
        address: string;
        decimals: number;
        currentMultiplier: string;
      }> = [];

      for (const asset of assets) {
        if (!asset.tokenSymbol || !Array.isArray(asset.deployments)) continue;
        const rhDep = asset.deployments.find(d => Number(d.chainId) === ROBINHOOD_CHAIN.chainId && d.contractAddress);
        if (rhDep && rhDep.contractAddress) {
          candidates.push({
            symbol: asset.tokenSymbol.trim().toUpperCase(),
            name: asset.tokenName ? asset.tokenName.trim() : `${asset.tokenSymbol} Token`,
            address: rhDep.contractAddress.trim(),
            decimals: typeof asset.tokenDecimals === 'number' ? asset.tokenDecimals : 18,
            currentMultiplier: asset.currentMultiplier ? String(asset.currentMultiplier) : '1.0'
          });
        }
      }

      // Bytecode verification worker pool (concurrency 10)
      const verifiedList: RobinhoodStockToken[] = [];
      let candidateIndex = 0;

      async function worker() {
        while (candidateIndex < candidates.length) {
          const item = candidates[candidateIndex++];
          const hasBytecode = await checkRobinhoodBytecodeWithRetry(item.address);
          if (hasBytecode) {
            verifiedList.push({
              symbol: item.symbol,
              name: item.name,
              address: item.address,
              decimals: item.decimals,
              currentMultiplier: item.currentMultiplier,
              verifiedAt: new Date().toISOString()
            });
          }
        }
      }

      const workerPool = Array.from({ length: 10 }, () => worker());
      await Promise.all(workerPool);

      // Sort alphabetically by symbol
      verifiedList.sort((a, b) => a.symbol.localeCompare(b.symbol));

      cachedTokens = verifiedList;
      lastCacheTimestamp = Date.now();
      console.log(`[RobinhoodStockTokens] Ingested and verified ${verifiedList.length} stock tokens on Robinhood Chain (4663).`);
      return verifiedList;
    } catch (err: any) {
      console.error('[RobinhoodStockTokens] Ingestion failed:', err);
      if (cachedTokens) return cachedTokens;
      return [];
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

/**
 * Client-side fetcher:
 * Calls server endpoint GET /api/robinhood/stock-tokens
 */
export async function fetchRobinhoodStockTokens(): Promise<RobinhoodStockToken[]> {
  try {
    const res = await fetch('/api/robinhood/stock-tokens');
    if (!res.ok) {
      console.warn(`[RobinhoodStockTokens] GET /api/robinhood/stock-tokens returned HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[RobinhoodStockTokens] Client fetch error:', err);
    return [];
  }
}
