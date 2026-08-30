/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Static fallback coin logos from verified public CDNs (CoinGecko / cryptocurrency-icons)
 * NOTE: Only used as a secondary fallback if the coin has no coingeckoId or the live CoinGecko API markets call fails.
 */
export const DEFAULT_COIN_LOGOS: Record<string, string> = {
  BTC: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png',
  BITCOIN: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png',
  ETH: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png',
  ETHEREUM: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png',
  SOL: 'https://coin-images.coingecko.com/coins/images/4128/large/solana.png',
  SOLANA: 'https://coin-images.coingecko.com/coins/images/4128/large/solana.png',
  LINK: 'https://coin-images.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
  CHAINLINK: 'https://coin-images.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
  SUI: 'https://coin-images.coingecko.com/coins/images/26375/large/sui_asset.png',
  HYPE: 'https://coin-images.coingecko.com/coins/images/50882/large/hyperliquid.png',
  HYPERLIQUID: 'https://coin-images.coingecko.com/coins/images/50882/large/hyperliquid.png',
  ARB: 'https://coin-images.coingecko.com/coins/images/16547/large/arbitrum_logo.png',
  ARBITRUM: 'https://coin-images.coingecko.com/coins/images/16547/large/arbitrum_logo.png',
  UNI: 'https://coin-images.coingecko.com/coins/images/12504/large/uniswap-uni.png',
  UNISWAP: 'https://coin-images.coingecko.com/coins/images/12504/large/uniswap-uni.png',
  RENDER: 'https://coin-images.coingecko.com/coins/images/11636/large/rndr.png',
  RNDR: 'https://coin-images.coingecko.com/coins/images/11636/large/rndr.png',
  'RENDER-TOKEN': 'https://coin-images.coingecko.com/coins/images/11636/large/rndr.png',
  KAS: 'https://coin-images.coingecko.com/coins/images/25751/large/kaspa-icon.png',
  KASPA: 'https://coin-images.coingecko.com/coins/images/25751/large/kaspa-icon.png',
  BNB: 'https://coin-images.coingecko.com/coins/images/825/large/binance-coin-logo.png',
  BINANCECOIN: 'https://coin-images.coingecko.com/coins/images/825/large/binance-coin-logo.png',
  XRP: 'https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white_-__transparent_bg.png',
  RIPPLE: 'https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white_-__transparent_bg.png',
  DOGE: 'https://coin-images.coingecko.com/coins/images/325/large/dogecoin.png',
  DOGECOIN: 'https://coin-images.coingecko.com/coins/images/325/large/dogecoin.png',
  ADA: 'https://coin-images.coingecko.com/coins/images/975/large/cardano.png',
  CARDANO: 'https://coin-images.coingecko.com/coins/images/975/large/cardano.png',
  AVAX: 'https://coin-images.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png',
  'AVALANCHE-2': 'https://coin-images.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png',
  DOT: 'https://coin-images.coingecko.com/coins/images/12171/large/polkadot.png',
  POLKADOT: 'https://coin-images.coingecko.com/coins/images/12171/large/polkadot.png',
  TAO: 'https://coin-images.coingecko.com/coins/images/29165/large/bittensor.png',
  BITTENSOR: 'https://coin-images.coingecko.com/coins/images/29165/large/bittensor.png',
  ZAMA: 'https://coin-images.coingecko.com/coins/images/35000/large/zama.png',
  BERA: 'https://coin-images.coingecko.com/coins/images/33000/large/berachain.png',
  BERACHAIN: 'https://coin-images.coingecko.com/coins/images/33000/large/berachain.png',
  MONAD: 'https://coin-images.coingecko.com/coins/images/34000/large/monad.png',
  MOVE: 'https://coin-images.coingecko.com/coins/images/34500/large/movement.png',
  MOVEMENT: 'https://coin-images.coingecko.com/coins/images/34500/large/movement.png',
  EIGEN: 'https://coin-images.coingecko.com/coins/images/37392/large/eigenlayer.png',
  EIGENLAYER: 'https://coin-images.coingecko.com/coins/images/37392/large/eigenlayer.png',
  ENA: 'https://coin-images.coingecko.com/coins/images/36530/large/ethena.png',
  ETHENA: 'https://coin-images.coingecko.com/coins/images/36530/large/ethena.png',
  TIA: 'https://coin-images.coingecko.com/coins/images/31967/large/celestia.png',
  CELESTIA: 'https://coin-images.coingecko.com/coins/images/31967/large/celestia.png',
  ONDO: 'https://coin-images.coingecko.com/coins/images/34522/large/ondo.png',
  'ONDO-FINANCE': 'https://coin-images.coingecko.com/coins/images/34522/large/ondo.png',
  PYTH: 'https://coin-images.coingecko.com/coins/images/31924/large/pyth.png',
  'PYTH-NETWORK': 'https://coin-images.coingecko.com/coins/images/31924/large/pyth.png',
  W: 'https://coin-images.coingecko.com/coins/images/35767/large/wormhole.png',
  WORMHOLE: 'https://coin-images.coingecko.com/coins/images/35767/large/wormhole.png',
  STRK: 'https://coin-images.coingecko.com/coins/images/35346/large/starknet.png',
  STARKNET: 'https://coin-images.coingecko.com/coins/images/35346/large/starknet.png',
  PEPE: 'https://coin-images.coingecko.com/coins/images/29850/large/pepe-token.png',
  WIF: 'https://coin-images.coingecko.com/coins/images/33566/large/wif.png',
  SEI: 'https://coin-images.coingecko.com/coins/images/28205/large/sei.png',
  'SEI-NETWORK': 'https://coin-images.coingecko.com/coins/images/28205/large/sei.png',
  APT: 'https://coin-images.coingecko.com/coins/images/26455/large/aptos.png',
  APTOS: 'https://coin-images.coingecko.com/coins/images/26455/large/aptos.png',
  INJ: 'https://coin-images.coingecko.com/coins/images/12882/large/injective.png',
  'INJECTIVE-PROTOCOL': 'https://coin-images.coingecko.com/coins/images/12882/large/injective.png',
  AKT: 'https://coin-images.coingecko.com/coins/images/12780/large/akash.png',
  'AKASH-NETWORK': 'https://coin-images.coingecko.com/coins/images/12780/large/akash.png',
  JUP: 'https://coin-images.coingecko.com/coins/images/34188/large/jup.png',
  JUPITER: 'https://coin-images.coingecko.com/coins/images/34188/large/jup.png',
  'JUPITER-EXCHANGE-SOLANA': 'https://coin-images.coingecko.com/coins/images/34188/large/jup.png',
};

/**
 * Returns a guaranteed, clean, official coin logo URL for any crypto project.
 * Priority:
 * 1. Provided logoUrl (e.g. from CoinGecko API 'image' field) if present, valid, and not a banner.
 * 2. Lookup by coingeckoId in the verified static map.
 * 3. Lookup by ticker symbol in the verified static map.
 * 4. Fallback to generic CoinGecko CDN image path.
 */
export function getCoinLogoUrl(symbol?: string, logoUrl?: string, coingeckoId?: string): string {
  // 1. If a valid logo URL is passed (from CoinGecko API live 'image' field or review object), use it directly!
  if (
    logoUrl &&
    typeof logoUrl === 'string' &&
    logoUrl.trim().length > 0 &&
    !logoUrl.includes('avatars.githubusercontent.com') &&
    !logoUrl.includes('imgur.com') &&
    !logoUrl.includes('crypto-academy') &&
    !logoUrl.endsWith('.jpeg') &&
    !logoUrl.endsWith('.jpg')
  ) {
    return logoUrl.trim();
  }

  // 2. Static map lookup by coingeckoId
  const cleanCgId = (coingeckoId || '').toLowerCase().trim();
  if (cleanCgId) {
    const cgKey = cleanCgId.toUpperCase();
    if (DEFAULT_COIN_LOGOS[cgKey]) {
      return DEFAULT_COIN_LOGOS[cgKey];
    }
  }

  // 3. Static map lookup by ticker symbol
  const cleanSymbol = (symbol || '').toUpperCase().trim();
  if (cleanSymbol && DEFAULT_COIN_LOGOS[cleanSymbol]) {
    return DEFAULT_COIN_LOGOS[cleanSymbol];
  }

  // 4. Default fallback CoinGecko asset URL
  return cleanCgId
    ? `https://coin-images.coingecko.com/coins/images/1/large/${cleanCgId}.png`
    : `https://coin-images.coingecko.com/coins/images/1/large/${cleanSymbol.toLowerCase()}.png`;
}
