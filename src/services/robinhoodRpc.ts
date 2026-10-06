/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ROBINHOOD_CHAIN, isRobinhoodChain } from '../constants/chains';

export interface RobinhoodBytecodeVerificationResult {
  chain: string;
  chainId: number;
  contractAddress: string;
  eth_getCode: string;
  hasBytecode: boolean;
  isContract: boolean;
  bytecodeLengthBytes: number;
  explorerUrl: string;
  rpcUrl: string;
  timestamp: string;
  status: 'VERIFIED_CONTRACT' | 'EMPTY_BYTECODE_EOA' | 'INVALID_ADDRESS' | 'RPC_ERROR';
  details: string;
}

/**
 * Validates whether the returned eth_getCode string represents real deployed smart contract bytecode.
 * (eth_getCode != 0x && length > 2)
 */
export function isBytecodeVerified(bytecode?: string | null): boolean {
  if (!bytecode || typeof bytecode !== 'string') return false;
  const clean = bytecode.trim().toLowerCase();
  return clean.startsWith('0x') && clean !== '0x' && clean !== '0x0' && clean.length > 2;
}

/**
 * Deterministically checks contract bytecode on Robinhood Chain via JSON-RPC eth_getCode.
 */
export async function checkRobinhoodBytecode(
  contractAddress: string
): Promise<RobinhoodBytecodeVerificationResult> {
  const trimmed = (contractAddress || '').trim();
  const isEvmAddress = /^0x[0-9a-fA-F]{40}$/.test(trimmed);

  if (!isEvmAddress) {
    return {
      chain: ROBINHOOD_CHAIN.name,
      chainId: ROBINHOOD_CHAIN.chainId,
      contractAddress: trimmed,
      eth_getCode: '0x',
      hasBytecode: false,
      isContract: false,
      bytecodeLengthBytes: 0,
      explorerUrl: `${ROBINHOOD_CHAIN.explorerUrl}/address/${trimmed}`,
      rpcUrl: ROBINHOOD_CHAIN.rpcUrl,
      timestamp: new Date().toISOString(),
      status: 'INVALID_ADDRESS',
      details: 'Invalid EVM contract address format (expected 40-character hexadecimal address with 0x prefix).'
    };
  }

  // 1. Try server verification endpoint first
  try {
    const res = await fetch(`/api/robinhood/verify-contract?address=${encodeURIComponent(trimmed)}`);
    if (res.ok) {
      const json = await res.json();
      if (json && typeof json.eth_getCode === 'string') {
        const hasBytecode = isBytecodeVerified(json.eth_getCode);
        const bytes = hasBytecode ? Math.max(0, (json.eth_getCode.length - 2) / 2) : 0;
        return {
          chain: ROBINHOOD_CHAIN.name,
          chainId: ROBINHOOD_CHAIN.chainId,
          contractAddress: trimmed,
          eth_getCode: json.eth_getCode,
          hasBytecode,
          isContract: hasBytecode,
          bytecodeLengthBytes: bytes,
          explorerUrl: `${ROBINHOOD_CHAIN.explorerUrl}/address/${trimmed}`,
          rpcUrl: ROBINHOOD_CHAIN.rpcUrl,
          timestamp: json.checkedAt || new Date().toISOString(),
          status: hasBytecode ? 'VERIFIED_CONTRACT' : 'EMPTY_BYTECODE_EOA',
          details: hasBytecode
            ? `Live bytecode verified on Robinhood Chain mainnet (${bytes.toLocaleString()} bytes). Verified on ${ROBINHOOD_CHAIN.explorerUrl.replace('https://', '')}.`
            : `Deterministic eth_getCode returned 0x: No contract bytecode deployed at this address on Robinhood Chain.`
        };
      }
    }
  } catch {
    // Fall back to direct RPC call
  }

  // 2. Direct JSON-RPC eth_getCode call to ROBINHOOD_CHAIN.rpcUrl
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
        params: [trimmed, 'latest']
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!rpcRes.ok) {
      throw new Error(`RPC returned HTTP ${rpcRes.status}`);
    }

    const json = await rpcRes.json();
    const bytecode = typeof json?.result === 'string' ? json.result : '0x';
    const hasBytecode = isBytecodeVerified(bytecode);
    const bytes = hasBytecode ? Math.max(0, (bytecode.length - 2) / 2) : 0;

    return {
      chain: ROBINHOOD_CHAIN.name,
      chainId: ROBINHOOD_CHAIN.chainId,
      contractAddress: trimmed,
      eth_getCode: bytecode,
      hasBytecode,
      isContract: hasBytecode,
      bytecodeLengthBytes: bytes,
      explorerUrl: `${ROBINHOOD_CHAIN.explorerUrl}/address/${trimmed}`,
      rpcUrl: ROBINHOOD_CHAIN.rpcUrl,
      timestamp: new Date().toISOString(),
      status: hasBytecode ? 'VERIFIED_CONTRACT' : 'EMPTY_BYTECODE_EOA',
      details: hasBytecode
        ? `Live bytecode verified on Robinhood Chain mainnet (${bytes.toLocaleString()} bytes). Verified on ${ROBINHOOD_CHAIN.explorerUrl.replace('https://', '')}.`
        : `Deterministic eth_getCode returned 0x: No contract bytecode deployed at this address on Robinhood Chain.`
    };
  } catch (err: any) {
    return {
      chain: ROBINHOOD_CHAIN.name,
      chainId: ROBINHOOD_CHAIN.chainId,
      contractAddress: trimmed,
      eth_getCode: '0x',
      hasBytecode: false,
      isContract: false,
      bytecodeLengthBytes: 0,
      explorerUrl: `${ROBINHOOD_CHAIN.explorerUrl}/address/${trimmed}`,
      rpcUrl: ROBINHOOD_CHAIN.rpcUrl,
      timestamp: new Date().toISOString(),
      status: 'RPC_ERROR',
      details: `RPC connection error querying eth_getCode on ${ROBINHOOD_CHAIN.rpcUrl}: ${err?.message || 'timeout'}`
    };
  }
}
