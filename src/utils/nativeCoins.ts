/**
 * Native Gas-Fee Coins & Base Layer Infrastructure Utility
 * 
 * Differentiates between base layer native coins used to pay network gas fees
 * (e.g., BTC, ETH, SOL, SUI, BNB, AVAX, MATIC/POL, KAS, etc.)
 * and standard interchangeable tokens requiring contract/mint addresses
 * (ERC-20, BEP-20, SPL tokens, governance tokens, and liquidity pool (LP) tokens).
 */

export interface AssetCheckParams {
  symbol?: string;
  name?: string;
  category?: string;
  chainId?: string | number;
}

// Known Layer 1 base currencies used to pay gas fees on their native networks
export const KNOWN_NATIVE_GAS_SYMBOLS = new Set([
  'BTC', 'ETH', 'SOL', 'SUI', 'BNB', 'AVAX', 'MATIC', 'POL',
  'ADA', 'NEAR', 'DOT', 'ATOM', 'KAS', 'TRX', 'TON', 'APT',
  'SEI', 'TIA', 'FTM', 'S', 'ALGO', 'DOGE', 'LTC', 'BCH',
  'XRP', 'XMR', 'ETC', 'ICP', 'HBAR', 'MONAD', 'HYPE', 'BERA',
  'MINA', 'FIL', 'STX', 'KAVA', 'OSMO', 'EGLD', 'FLOW', 'XTZ',
  'EOS', 'NEO', 'IOTA', 'ALPH', 'BEAM', 'ROSE', 'CELO', 'ZEN',
  'XDC', 'CKB', 'RVN', 'SCRT'
]);

export const KNOWN_NATIVE_GAS_NAMES = [
  'bitcoin',
  'ethereum',
  'solana',
  'sui',
  'sui network',
  'sue network',
  'binance coin',
  'bnb chain',
  'bnb',
  'avalanche',
  'polygon',
  'cardano',
  'near protocol',
  'polkadot',
  'cosmos',
  'kaspa',
  'tron',
  'the open network',
  'toncoin',
  'aptos',
  'sei network',
  'celestia',
  'fantom',
  'sonic',
  'algorand',
  'dogecoin',
  'litecoin',
  'bitcoin cash',
  'ripple',
  'monero',
  'ethereum classic',
  'internet computer',
  'hedera',
  'monad',
  'hyperliquid',
  'berachain'
];

/**
 * Determines if a given asset is a native base layer coin used to pay gas fees.
 * Native coins do not have smart contract / token addresses on their native chains.
 */
export function isNativeGasCoin(params: AssetCheckParams): boolean {
  const sym = (params.symbol || '').toUpperCase().trim();
  const nm = (params.name || '').toLowerCase().trim();
  const cat = (params.category || '').toLowerCase().trim();
  const chain = String(params.chainId || '').toLowerCase().trim();

  // 1. Direct symbol match
  if (KNOWN_NATIVE_GAS_SYMBOLS.has(sym)) {
    return true;
  }

  // 2. Direct name match
  if (KNOWN_NATIVE_GAS_NAMES.some(n => nm === n || nm.startsWith(`${n} `) || nm.endsWith(` ${n}`))) {
    return true;
  }

  // 3. Chain-specific native currency matches:
  // Ethereum mainnet (1) with ETH
  if ((chain === '1' || chain === 'eth' || chain === 'ethereum') && sym === 'ETH') return true;
  // Solana with SOL
  if ((chain === 'solana' || chain === 'sol') && sym === 'SOL') return true;
  // Sui Network with SUI (or "sue network")
  if ((chain === 'sui') && (sym === 'SUI' || nm.includes('sui') || nm.includes('sue'))) return true;
  // BNB Chain (56) with BNB
  if ((chain === '56' || chain === 'bsc') && sym === 'BNB') return true;
  // Polygon (137) with MATIC or POL
  if ((chain === '137' || chain === 'polygon') && (sym === 'MATIC' || sym === 'POL')) return true;
  // Avalanche (43114) with AVAX
  if ((chain === '43114' || chain === 'avalanche') && sym === 'AVAX') return true;
  // Arbitrum / Optimism / Base L2 gas currency (ETH)
  if (['42161', '10', '8453'].includes(chain) && sym === 'ETH') return true;

  // 4. Check category match:
  // If explicitly designated as Layer 1 Blockchain base infrastructure,
  // unless explicitly identified as a secondary token or LP token
  const isL1Category =
    cat.includes('layer 1') ||
    cat.includes('layer1') ||
    cat.includes('l1 blockchain') ||
    cat.includes('base layer') ||
    cat.includes('native network');

  if (isL1Category) {
    const isExplicitToken =
      nm.includes('token') ||
      nm.includes(' lp') ||
      nm.includes('liquidity') ||
      nm.includes('governance') ||
      sym.endsWith('-LP') ||
      sym.endsWith('LP') ||
      sym.startsWith('W'); // Wrapped tokens like WETH, WBTC
    if (!isExplicitToken) {
      return true;
    }
  }

  return false;
}
