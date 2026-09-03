/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface XStockRegistryItem {
  symbol: string;           // On-chain ticker (e.g. AAPLX, TSLAX)
  name: string;             // Display name (e.g. Apple xStock, Tesla xStock)
  underlyingTicker: string; // NYSE / NASDAQ underlying ticker (e.g. AAPL, TSLA)
  underlyingName: string;   // Underlying Company / ETF Name
  exchange: 'NASDAQ' | 'NYSE' | 'CBOE';
  coingeckoId: string;      // CoinGecko API ID
  cmcSymbol: string;        // CMC quote lookup symbol
  coinstatsId?: string;     // CoinStats ID
  issuer: string;           // Issuer e.g. 'Backed Finance'
  custodian?: string;       // Custodian (e.g. 'Regulated Swiss Banking Partners & US Broker Custodians', distinct from issuer)
  jurisdiction?: string;    // Legal jurisdiction (e.g. 'Switzerland (Swiss DLT Act / Art. 973c CO)')
  legalInstrumentType?: string; // Legal classification (e.g. 'Tracker Certificate (1:1 Asset-Backed Tokenized Security)')
  proofOfReserveUrl?: string;   // Public PoR dashboard/feed link if published
  contractAddress?: string; // Solana / EVM token address
  chain: 'Solana' | 'Arbitrum' | 'Ethereum' | 'BNB Chain';
  description: string;
  category: 'Tech Megacap' | 'EV & CleanTech' | 'Index ETF' | 'Crypto Infrastructure' | 'Semiconductors' | 'E-Commerce & Cloud';
  logoUrl?: string;
}

export const XSTOCKS_REGISTRY: XStockRegistryItem[] = [
  {
    symbol: 'AAPLX',
    name: 'Apple xStock',
    underlyingTicker: 'AAPL',
    underlyingName: 'Apple Inc.',
    exchange: 'NASDAQ',
    coingeckoId: 'apple-xstock',
    cmcSymbol: 'AAPLX',
    issuer: 'Backed Finance',
    custodian: 'InCore Bank AG / Alpaca Securities LLC',
    jurisdiction: 'Switzerland (Swiss DLT Act / Art. 973c CO)',
    legalInstrumentType: 'Tracker Certificate (1:1 Asset-Backed Tokenized Security)',
    proofOfReserveUrl: 'https://backed.fi/proof-of-reserves',
    contractAddress: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp',
    chain: 'Solana',
    category: 'Tech Megacap',
    description: 'Fully collateralized tokenized tracker for Apple Inc. common stock, enabling 24/7 on-chain trading and DeFi composability.',
    logoUrl: 'https://assets.coingecko.com/coins/images/31871/large/bAAPL_200p.png'
  },
  {
    symbol: 'TSLAX',
    name: 'Tesla xStock',
    underlyingTicker: 'TSLA',
    underlyingName: 'Tesla, Inc.',
    exchange: 'NASDAQ',
    coingeckoId: 'tesla-xstock',
    cmcSymbol: 'TSLAX',
    issuer: 'Backed Finance',
    custodian: 'InCore Bank AG / Alpaca Securities LLC',
    jurisdiction: 'Switzerland (Swiss DLT Act / Art. 973c CO)',
    legalInstrumentType: 'Tracker Certificate (1:1 Asset-Backed Tokenized Security)',
    proofOfReserveUrl: 'https://backed.fi/proof-of-reserves',
    contractAddress: 'XsHpdc4W1vsndsmqqb8epwMW44p3U3txWdwFw7bBfWn',
    chain: 'Solana',
    category: 'EV & CleanTech',
    description: 'Tokenized equity certificate tracking Tesla, Inc. equity with 1:1 backing in regulated Swiss custody.',
    logoUrl: 'https://coin-images.coingecko.com/coins/images/38916/large/bTSLA_200p.png'
  },
  {
    symbol: 'NVDAX',
    name: 'NVIDIA xStock',
    underlyingTicker: 'NVDA',
    underlyingName: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    coingeckoId: 'nvidia-xstock',
    cmcSymbol: 'NVDAX',
    issuer: 'Backed Finance',
    custodian: 'InCore Bank AG / Alpaca Securities LLC',
    jurisdiction: 'Switzerland (Swiss DLT Act / Art. 973c CO)',
    legalInstrumentType: 'Tracker Certificate (1:1 Asset-Backed Tokenized Security)',
    proofOfReserveUrl: 'https://backed.fi/proof-of-reserves',
    contractAddress: 'XscTu55dEAfad5b5pwvA6mFvBL7sKpdGtdM3Csm7tHw',
    chain: 'Solana',
    category: 'Semiconductors',
    description: 'Tokenized representation of NVIDIA Corp common shares, providing decentralized access to AI compute equity.',
    logoUrl: 'https://coin-images.coingecko.com/coins/images/38911/large/bNVDA_200p.png'
  },
  {
    symbol: 'METAX',
    name: 'Meta Platforms xStock',
    underlyingTicker: 'META',
    underlyingName: 'Meta Platforms, Inc.',
    exchange: 'NASDAQ',
    coingeckoId: 'meta-xstock',
    cmcSymbol: 'METAX',
    issuer: 'Backed Finance',
    custodian: 'InCore Bank AG / Alpaca Securities LLC',
    jurisdiction: 'Switzerland (Swiss DLT Act / Art. 973c CO)',
    legalInstrumentType: 'Tracker Certificate (1:1 Asset-Backed Tokenized Security)',
    proofOfReserveUrl: 'https://backed.fi/proof-of-reserves',
    contractAddress: 'XsMbqPRe5vN4n3eZkZyDMfGfA1bBqWnS2kYpT8vX9yD',
    chain: 'Solana',
    category: 'Tech Megacap',
    description: 'Tokenized stock tracking Meta Platforms Class A shares with direct on-chain liquidity pools.',
    logoUrl: 'https://coin-images.coingecko.com/coins/images/31873/large/bMETA_200p.png'
  },
  {
    symbol: 'GOOGLX',
    name: 'Alphabet xStock',
    underlyingTicker: 'GOOGL',
    underlyingName: 'Alphabet Inc. (Class A)',
    exchange: 'NASDAQ',
    coingeckoId: 'alphabet-xstock',
    cmcSymbol: 'GOOGLX',
    issuer: 'Backed Finance',
    custodian: 'InCore Bank AG / Alpaca Securities LLC',
    jurisdiction: 'Switzerland (Swiss DLT Act / Art. 973c CO)',
    legalInstrumentType: 'Tracker Certificate (1:1 Asset-Backed Tokenized Security)',
    proofOfReserveUrl: 'https://backed.fi/proof-of-reserves',
    chain: 'Solana',
    category: 'Tech Megacap',
    description: 'Tokenized equity tracker for Alphabet Inc. Class A shares backed 1:1 by underlying custodian reserves.',
    logoUrl: 'https://coin-images.coingecko.com/coins/images/31874/large/bGOOGL_200p.png'
  },
  {
    symbol: 'MSFTX',
    name: 'Microsoft xStock',
    underlyingTicker: 'MSFT',
    underlyingName: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    coingeckoId: 'microsoft-xstock',
    cmcSymbol: 'MSFTX',
    issuer: 'Backed Finance',
    custodian: 'InCore Bank AG / Alpaca Securities LLC',
    jurisdiction: 'Switzerland (Swiss DLT Act / Art. 973c CO)',
    legalInstrumentType: 'Tracker Certificate (1:1 Asset-Backed Tokenized Security)',
    proofOfReserveUrl: 'https://backed.fi/proof-of-reserves',
    chain: 'Solana',
    category: 'Tech Megacap',
    description: 'Tokenized security tracking Microsoft Corp common stock with real-time on-chain secondary market quoting.',
    logoUrl: 'https://coin-images.coingecko.com/coins/images/38915/large/200p_bMSFT_3.png'
  },
  {
    symbol: 'AMZNX',
    name: 'Amazon xStock',
    underlyingTicker: 'AMZN',
    underlyingName: 'Amazon.com, Inc.',
    exchange: 'NASDAQ',
    coingeckoId: 'amazon-xstock',
    cmcSymbol: 'AMZNX',
    issuer: 'Backed Finance',
    custodian: 'InCore Bank AG / Alpaca Securities LLC',
    jurisdiction: 'Switzerland (Swiss DLT Act / Art. 973c CO)',
    legalInstrumentType: 'Tracker Certificate (1:1 Asset-Backed Tokenized Security)',
    proofOfReserveUrl: 'https://backed.fi/proof-of-reserves',
    chain: 'Solana',
    category: 'E-Commerce & Cloud',
    description: 'Decentralized tokenized equity tracking Amazon.com, Inc. with verifiable proof-of-reserves.',
    logoUrl: 'https://coin-images.coingecko.com/coins/images/31875/large/bAMZN_200p.png'
  },
  {
    symbol: 'COINX',
    name: 'Coinbase xStock',
    underlyingTicker: 'COIN',
    underlyingName: 'Coinbase Global, Inc.',
    exchange: 'NASDAQ',
    coingeckoId: 'coinbase-xstock',
    cmcSymbol: 'COINX',
    issuer: 'Backed Finance',
    custodian: 'InCore Bank AG / Alpaca Securities LLC',
    jurisdiction: 'Switzerland (Swiss DLT Act / Art. 973c CO)',
    legalInstrumentType: 'Tracker Certificate (1:1 Asset-Backed Tokenized Security)',
    proofOfReserveUrl: 'https://backed.fi/proof-of-reserves',
    chain: 'Solana',
    category: 'Crypto Infrastructure',
    description: 'Tokenized certificate tracking Coinbase Global, Inc. equity, merging crypto rails with web3 equity exposure.',
    logoUrl: 'https://coin-images.coingecko.com/coins/images/31872/large/bCOIN_200p.png'
  },
  {
    symbol: 'HOODX',
    name: 'Robinhood xStock',
    underlyingTicker: 'HOOD',
    underlyingName: 'Robinhood Markets, Inc.',
    exchange: 'NASDAQ',
    coingeckoId: 'robinhood-xstock',
    cmcSymbol: 'HOODX',
    issuer: 'Backed Finance',
    custodian: 'InCore Bank AG / Alpaca Securities LLC',
    jurisdiction: 'Switzerland (Swiss DLT Act / Art. 973c CO)',
    legalInstrumentType: 'Tracker Certificate (1:1 Asset-Backed Tokenized Security)',
    proofOfReserveUrl: 'https://backed.fi/proof-of-reserves',
    chain: 'Solana',
    category: 'Crypto Infrastructure',
    description: 'Tokenized equity certificate tracking Robinhood Markets, Inc. Class A shares.',
    logoUrl: 'https://coin-images.coingecko.com/coins/images/31876/large/bHOOD_200p.png'
  },
  {
    symbol: 'QQQX',
    name: 'Invesco QQQ Trust xStock',
    underlyingTicker: 'QQQ',
    underlyingName: 'Invesco QQQ Trust Series 1',
    exchange: 'NASDAQ',
    coingeckoId: 'nasdaq-xstock',
    cmcSymbol: 'QQQX',
    issuer: 'Backed Finance',
    custodian: 'InCore Bank AG / Alpaca Securities LLC',
    jurisdiction: 'Switzerland (Swiss DLT Act / Art. 973c CO)',
    legalInstrumentType: 'Tracker Certificate (1:1 Asset-Backed Tokenized Security)',
    proofOfReserveUrl: 'https://backed.fi/proof-of-reserves',
    chain: 'Solana',
    category: 'Index ETF',
    description: 'Tokenized tracker for the Nasdaq-100 index ETF (QQQ), offering diversified top 100 tech exposure on-chain.',
    logoUrl: 'https://coin-images.coingecko.com/coins/images/31885/large/bQQQ_200p.png'
  },
  {
    symbol: 'SPYX',
    name: 'S&P 500 ETF xStock',
    underlyingTicker: 'SPY',
    underlyingName: 'SPDR S&P 500 ETF Trust',
    exchange: 'NYSE',
    coingeckoId: 'sp500-xstock',
    cmcSymbol: 'SPYX',
    issuer: 'Backed Finance',
    custodian: 'InCore Bank AG / Alpaca Securities LLC',
    jurisdiction: 'Switzerland (Swiss DLT Act / Art. 973c CO)',
    legalInstrumentType: 'Tracker Certificate (1:1 Asset-Backed Tokenized Security)',
    proofOfReserveUrl: 'https://backed.fi/proof-of-reserves',
    chain: 'Solana',
    category: 'Index ETF',
    description: 'Tokenized S&P 500 Index ETF tracker offering 24/7 on-chain access to the top 500 US publicly traded corporations.',
    logoUrl: 'https://coin-images.coingecko.com/coins/images/31891/large/bCSPX_200p.png'
  }
];

export type { UsMarketHoursStatus } from '../utils/usMarketCalendar';
export { getUsMarketHoursStatus } from '../utils/usMarketCalendar';

