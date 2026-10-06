/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ChainDefinition {
  chainId: number;
  chainIdHex: string;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  nativeToken: string;
  aliases: readonly string[];
}

export const ROBINHOOD_CHAIN: ChainDefinition = {
  chainId: 4663,
  chainIdHex: '0x1237',
  name: 'Robinhood Chain',
  rpcUrl: 'https://rpc.mainnet.chain.robinhood.com',
  explorerUrl: 'https://robinhoodchain.blockscout.com',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  nativeToken: 'ETH',
  aliases: [
    'robinhood',
    'rh',
    'robinhood-chain',
    'robinhood chain',
    'rh-chain',
    '0x1237',
    '4663'
  ] as const,
};

/**
 * Checks if an input string, number, or alias corresponds to Robinhood Chain mainnet.
 * Explicitly rejects testnet 46630 to avoid seeding testnet data into production.
 */
export function isRobinhoodChain(chainInput?: string | number | null): boolean {
  if (chainInput === undefined || chainInput === null) return false;
  const str = String(chainInput).toLowerCase().trim();
  // Never treat testnet 46630 as production mainnet
  if (str === '46630' || str === '0xb626' || str.includes('testnet') || str.includes('sepolia')) {
    return false;
  }
  if (str === String(ROBINHOOD_CHAIN.chainId)) return true;
  if (str === ROBINHOOD_CHAIN.chainIdHex.toLowerCase()) return true;
  if (str === ROBINHOOD_CHAIN.name.toLowerCase()) return true;
  return (ROBINHOOD_CHAIN.aliases as readonly string[]).includes(str);
}

/**
 * Normalizes any Robinhood Chain alias to the canonical name ('Robinhood Chain')
 * or returns the original string.
 */
export function normalizeChainName(chainInput?: string | null): string {
  if (!chainInput) return '';
  if (isRobinhoodChain(chainInput)) {
    return ROBINHOOD_CHAIN.name;
  }
  return chainInput.trim();
}

/**
 * Normalizes any Robinhood Chain alias to the canonical EVM chainId ('4663')
 * or returns the original string.
 */
export function normalizeEvmChainId(chainInput?: string | number | null): string {
  if (!chainInput) return '';
  if (isRobinhoodChain(chainInput)) {
    return String(ROBINHOOD_CHAIN.chainId);
  }
  return String(chainInput).trim();
}
