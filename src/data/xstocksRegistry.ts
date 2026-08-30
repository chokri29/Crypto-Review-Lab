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
    coinstatsId: 'tesla-xstock',
    issuer: 'Backed Finance',
    contractAddress: 'XsbtSLAMmHYcFA7uBDtH7tYReNqK45iB3xU5h3i3pump',
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
    contractAddress: 'XsbNVDAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp',
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
    chain: 'Solana',
    category: 'Index ETF',
    description: 'Tokenized S&P 500 Index ETF tracker offering 24/7 on-chain access to the top 500 US publicly traded corporations.',
    logoUrl: 'https://coin-images.coingecko.com/coins/images/31891/large/bCSPX_200p.png'
  }
];

export interface UsMarketHoursStatus {
  isOpen: boolean;
  statusLabel: string;
  badgeColor: 'emerald' | 'amber' | 'slate';
  detail: string;
  easternTimeFormatted: string;
  nextEventLabel: string;
}

/**
 * Computes exact US Equities (NYSE / NASDAQ) market hours status.
 * Regular trading session: Monday through Friday, 09:30 AM to 04:00 PM Eastern Time (America/New_York).
 * Handles timezone conversion properly via Intl.DateTimeFormat (independent of user's local timezone).
 */
export function getUsMarketHoursStatus(date: Date = new Date()): UsMarketHoursStatus {
  // Use Intl to get exact America/New_York date/time parts
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  parts.forEach(p => {
    partMap[p.type] = p.value;
  });

  const weekday = partMap.weekday; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  const hour = parseInt(partMap.hour, 10);
  const minute = parseInt(partMap.minute, 10);
  const totalMinutes = hour * 60 + minute;

  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  const marketOpenMinutes = 9 * 60 + 30; // 09:30 ET
  const marketCloseMinutes = 16 * 60;     // 16:00 ET

  const timeStringET = `${partMap.hour}:${partMap.minute} ET (${weekday})`;

  // Simple US market holidays check (Fixed holidays, e.g. New Year, Jul 4, Dec 25)
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);
  const isHoliday = (month === 1 && day === 1) || (month === 7 && day === 4) || (month === 12 && day === 25);

  if (isWeekend || isHoliday) {
    return {
      isOpen: false,
      statusLabel: 'Market Closed (Weekend / Holiday)',
      badgeColor: 'amber',
      detail: 'On-chain 24/7 token quote — underlying equity settles at next market open (Mon 9:30 AM ET).',
      easternTimeFormatted: timeStringET,
      nextEventLabel: 'Opens Monday 9:30 AM ET'
    };
  }

  if (totalMinutes < marketOpenMinutes) {
    const minsUntilOpen = marketOpenMinutes - totalMinutes;
    const hoursUntil = Math.floor(minsUntilOpen / 60);
    const minsRem = minsUntilOpen % 60;
    return {
      isOpen: false,
      statusLabel: 'Pre-Market / Market Closed',
      badgeColor: 'amber',
      detail: 'On-chain 24/7 token quote — underlying NYSE/NASDAQ opens at 9:30 AM ET.',
      easternTimeFormatted: timeStringET,
      nextEventLabel: `Opens in ${hoursUntil > 0 ? `${hoursUntil}h ` : ''}${minsRem}m`
    };
  }

  if (totalMinutes >= marketOpenMinutes && totalMinutes < marketCloseMinutes) {
    const minsUntilClose = marketCloseMinutes - totalMinutes;
    const hoursUntil = Math.floor(minsUntilClose / 60);
    const minsRem = minsUntilClose % 60;
    return {
      isOpen: true,
      statusLabel: 'US Equities Market Open',
      badgeColor: 'emerald',
      detail: 'Live NYSE/NASDAQ session active. Primary equities & on-chain tokens trading in sync.',
      easternTimeFormatted: timeStringET,
      nextEventLabel: `Closes in ${hoursUntil > 0 ? `${hoursUntil}h ` : ''}${minsRem}m (4:00 PM ET)`
    };
  }

  return {
    isOpen: false,
    statusLabel: 'Market Closed — After Hours',
    badgeColor: 'amber',
    detail: 'On-chain 24/7 token quote — underlying equity trading resumes next business day at 9:30 AM ET.',
    easternTimeFormatted: timeStringET,
    nextEventLabel: 'Opens next business day 9:30 AM ET'
  };
}
