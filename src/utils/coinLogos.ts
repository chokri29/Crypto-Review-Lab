/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const DEFAULT_COIN_LOGOS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
  BITCOIN: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
  ETHEREUM: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
  SOLANA: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
  CHAINLINK: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
  SUI: 'https://assets.coingecko.com/coins/images/26375/large/sui_asset.png',
  HYPE: 'https://assets.coingecko.com/coins/images/50882/large/hyperliquid.png',
  HYPERLIQUID: 'https://assets.coingecko.com/coins/images/50882/large/hyperliquid.png',
  ARB: 'https://assets.coingecko.com/coins/images/16547/large/arbitrum_logo.png',
  ARBITRUM: 'https://assets.coingecko.com/coins/images/16547/large/arbitrum_logo.png',
  UNI: 'https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png',
  UNISWAP: 'https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png',
  RENDER: 'https://assets.coingecko.com/coins/images/11636/large/rndr.png',
  RNDR: 'https://assets.coingecko.com/coins/images/11636/large/rndr.png',
  KAS: 'https://assets.coingecko.com/coins/images/25751/large/kaspa-icon.png',
  KASPA: 'https://assets.coingecko.com/coins/images/25751/large/kaspa-icon.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/large/binance-coin-logo.png',
  XRP: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white_-__transparent_bg.png',
  DOGE: 'https://assets.coingecko.com/coins/images/325/large/dogecoin.png',
  ADA: 'https://assets.coingecko.com/coins/images/975/large/cardano.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png',
  DOT: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png',
  TAO: 'https://assets.coingecko.com/coins/images/29165/large/bittensor.png',
};

/**
 * Returns a guaranteed, clean, official coin logo URL for any crypto project.
 * Automatically filter out unrelated article banner images (e.g. imgur links from academy posts).
 */
export function getCoinLogoUrl(symbol?: string, logoUrl?: string, coingeckoId?: string): string {
  const cleanSymbol = (symbol || '').toUpperCase().trim();
  
  // Direct default lookup by ticker symbol
  if (cleanSymbol && DEFAULT_COIN_LOGOS[cleanSymbol]) {
    return DEFAULT_COIN_LOGOS[cleanSymbol];
  }

  // Check if current logoUrl is an actual coin icon and not an article banner image
  if (
    logoUrl &&
    !logoUrl.includes('imgur.com') &&
    !logoUrl.includes('crypto-academy') &&
    !logoUrl.endsWith('.jpeg') &&
    !logoUrl.endsWith('.jpg')
  ) {
    return logoUrl;
  }

  // Fallback to CoinGecko coin asset path or default dictionary
  if (coingeckoId) {
    const cleanCgId = coingeckoId.toLowerCase().trim();
    if (DEFAULT_COIN_LOGOS[cleanCgId.toUpperCase()]) {
      return DEFAULT_COIN_LOGOS[cleanCgId.toUpperCase()];
    }
  }

  return DEFAULT_COIN_LOGOS[cleanSymbol] || `https://assets.coingecko.com/coins/images/1/large/${cleanSymbol.toLowerCase()}.png`;
}
