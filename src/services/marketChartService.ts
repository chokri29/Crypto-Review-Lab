/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isNyseMarketHour as isNyseCalendarMarketHour } from '../utils/usMarketCalendar';

export interface PricePoint {
  timestamp: number;
  price: number;
  volume?: number;
}

export interface PivotPoint {
  price: number;
  timestamp: number;
  type: 'high' | 'low';
}

export interface ConfluenceSignal {
  label: string;
  points: number;
}

export interface TechnicalConfluenceResult {
  score: number;
  signals: ConfluenceSignal[];
}

export type ChartTimeframe = '24H' | '7D' | '1M' | '1Y';

export interface TimeframeSlopeInfo {
  timeframe: ChartTimeframe;
  slope: number;
  slopePct: number;
  direction: 'up' | 'down' | 'flat';
  latestSma: number;
  pastSma: number;
  summary: string;
}

export interface MultiTimeframeAlignmentResult {
  label: 'Strong Alignment' | 'Partial Alignment' | 'Mixed / No Alignment';
  dominantDirection: 'up' | 'down' | 'flat' | 'mixed';
  color: 'green' | 'red' | 'amber' | 'gray';
  timeframes: Record<ChartTimeframe, TimeframeSlopeInfo>;
  timeframeList: TimeframeSlopeInfo[];
  upCount: number;
  downCount: number;
  flatCount: number;
}

export interface TechnicalIndicators {
  sma20?: number;
  ema20?: number;
  smaPosition?: 'above' | 'below' | 'at';
  emaPosition?: 'above' | 'below' | 'at';
  rsi14?: number;
  rsiCondition?: 'overbought' | 'oversold' | 'neutral';
  keyResistance?: number;
  keySupport?: number;
  pivotHighs: PivotPoint[];
  pivotLows: PivotPoint[];
  confluence?: TechnicalConfluenceResult;
  isUnavailable?: boolean;
  unavailableReason?: string;
}

export interface ChartDataResult {
  symbol: string;
  name: string;
  timeframe: '24H' | '7D' | '1M' | '1Y';
  prices: PricePoint[];
  currentPrice: number;
  startPrice: number;
  priceChange: number;
  priceChangePct: number;
  highPrice: number;
  lowPrice: number;
  averageVolume: number;
  allTimeHigh?: number;
  allTimeLow?: number;
  athChangePct?: number;
  atlChangePct?: number;
  totalSupply?: number;
  circulatingSupply?: number;
  source: 'Tri-Sync Engine' | 'CoinGecko Live' | 'CoinStats Live' | 'Algorithmic Multi-Source Synthesis';
  isLiveFeed: boolean;
  provenance: 'LIVE' | 'STALE' | 'SYNTHETIC' | 'UNAVAILABLE';
  isVerificationGrade: boolean;
  indicators?: TechnicalIndicators;
}

const HISTORICAL_ATH_ATL_MAP: Record<string, { ath: number; atl: number; totalSupply: number; circulatingSupply: number }> = {
  hype: { ath: 48.50, atl: 3.80, totalSupply: 1000000000, circulatingSupply: 333900000 },
  hyperliquid: { ath: 48.50, atl: 3.80, totalSupply: 1000000000, circulatingSupply: 333900000 },
  zama: { ath: 4.80, atl: 0.35, totalSupply: 1000000000, circulatingSupply: 250000000 },
  arb: { ath: 2.40, atl: 0.43, totalSupply: 10000000000, circulatingSupply: 4200000000 },
  arbitrum: { ath: 2.40, atl: 0.43, totalSupply: 10000000000, circulatingSupply: 4200000000 },
  uni: { ath: 44.97, atl: 0.41, totalSupply: 1000000000, circulatingSupply: 600000000 },
  uniswap: { ath: 44.97, atl: 0.41, totalSupply: 1000000000, circulatingSupply: 600000000 },
  sol: { ath: 260.06, atl: 0.50, totalSupply: 580000000, circulatingSupply: 470000000 },
  solana: { ath: 260.06, atl: 0.50, totalSupply: 580000000, circulatingSupply: 470000000 },
  eth: { ath: 4891.70, atl: 0.42, totalSupply: 120400000, circulatingSupply: 120400000 },
  ethereum: { ath: 4891.70, atl: 0.42, totalSupply: 120400000, circulatingSupply: 120400000 },
  btc: { ath: 108900.00, atl: 0.048, totalSupply: 19800000, circulatingSupply: 19800000 },
  bitcoin: { ath: 108900.00, atl: 0.048, totalSupply: 19800000, circulatingSupply: 19800000 },
  sui: { ath: 3.93, atl: 0.36, totalSupply: 10000000000, circulatingSupply: 2850000000 },
  tao: { ath: 774.95, atl: 30.40, totalSupply: 21000000, circulatingSupply: 7380000 },
  bittensor: { ath: 774.95, atl: 30.40, totalSupply: 21000000, circulatingSupply: 7380000 },
  link: { ath: 52.88, atl: 0.126, totalSupply: 1000000000, circulatingSupply: 608000000 },
  chainlink: { ath: 52.88, atl: 0.126, totalSupply: 1000000000, circulatingSupply: 608000000 },
  kas: { ath: 0.207, atl: 0.00017, totalSupply: 28700000000, circulatingSupply: 25200000000 },
  kaspa: { ath: 0.207, atl: 0.00017, totalSupply: 28700000000, circulatingSupply: 25200000000 },
  render: { ath: 13.60, atl: 0.036, totalSupply: 532000000, circulatingSupply: 518000000 },
  bera: { ath: 12.50, atl: 3.20, totalSupply: 500000000, circulatingSupply: 120000000 },
  berachain: { ath: 12.50, atl: 3.20, totalSupply: 500000000, circulatingSupply: 120000000 },
  monad: { ath: 6.80, atl: 1.10, totalSupply: 1000000000, circulatingSupply: 200000000 },
  movement: { ath: 1.80, atl: 0.45, totalSupply: 10000000000, circulatingSupply: 1200000000 },
  eigenlayer: { ath: 4.53, atl: 2.40, totalSupply: 1680000000, circulatingSupply: 186000000 },
  ethena: { ath: 1.52, atl: 0.194, totalSupply: 15000000000, circulatingSupply: 2800000000 },
  celestia: { ath: 20.91, atl: 2.03, totalSupply: 1080000000, circulatingSupply: 220000000 },
  ondo: { ath: 1.48, atl: 0.082, totalSupply: 10000000000, circulatingSupply: 1430000000 },
  pyth: { ath: 1.15, atl: 0.22, totalSupply: 10000000000, circulatingSupply: 3620000000 },
  wormhole: { ath: 1.61, atl: 0.18, totalSupply: 10000000000, circulatingSupply: 2740000000 },
  starknet: { ath: 3.66, atl: 0.34, totalSupply: 10000000000, circulatingSupply: 2090000000 },
};

const chartCache = new Map<string, { data: ChartDataResult; timestamp: number }>();
const CACHE_TTL_MS = 90 * 1000; // 90s cache

/**
 * Checks if a timestamp falls within NYSE trading hours:
 * 9:30 AM to 16:00 (4:00 PM) America/New_York (or 13:00 on early close days),
 * taking into account weekends, all official NYSE holidays, and early-close sessions.
 */
export function isNyseMarketHour(timestamp: number): boolean {
  return isNyseCalendarMarketHour(timestamp);
}

export type FilteredNysePoints = PricePoint[] & {
  isInsufficient?: boolean;
  unavailable?: boolean;
  reason?: string;
  sessionPointCount?: number;
};

/**
 * Filters out price data points outside NYSE regular trading hours (9:30–16:00 America/New_York, Mon–Fri)
 * so flat after-hours/weekend prices do not skew stock technical indicators.
 *
 * If insufficient valid NYSE-session data exists (< 3 points), returns an explicit insufficient/unavailable state.
 * Strictly NEVER falls back to unfiltered prices or reintroduces weekend/after-hours data.
 */
export function filterNyseMarketHours(prices: PricePoint[]): FilteredNysePoints {
  if (!prices || prices.length === 0) {
    const empty: FilteredNysePoints = [];
    empty.isInsufficient = true;
    empty.unavailable = true;
    empty.reason = 'No price history available';
    empty.sessionPointCount = 0;
    return empty;
  }

  const filtered = prices.filter(p => isNyseMarketHour(p.timestamp));

  // If fewer than 3 valid NYSE-session points exist, return explicit insufficient/unavailable state.
  // NEVER reintroduce weekend or after-hours data.
  if (filtered.length < 3) {
    const insufficient: FilteredNysePoints = [...filtered];
    insufficient.isInsufficient = true;
    insufficient.unavailable = true;
    insufficient.reason = `Insufficient valid NYSE-session data (${filtered.length}/3 minimum points required). Weekend and after-hours data strictly excluded.`;
    insufficient.sessionPointCount = filtered.length;
    return insufficient;
  }

  const result: FilteredNysePoints = filtered;
  result.isInsufficient = false;
  result.unavailable = false;
  result.sessionPointCount = filtered.length;
  return result;
}

/**
 * Detects if an asset is an equity/tokenized stock (xStock) rather than 24/7 crypto.
 */
export function isStockAsset(symbol: string, coinId?: string, name?: string): boolean {
  const s = (symbol || '').toUpperCase().trim();
  const id = (coinId || '').toLowerCase().trim();
  const n = (name || '').toLowerCase();

  if (s.endsWith('X') && s.length >= 3 && s !== 'KAS' && s !== 'AVAX' && s !== 'INJ' && s !== 'TRX') return true;
  if (s.startsWith('B') && (s.endsWith('USD') || s.endsWith('STOCK'))) return true;
  if (id.includes('xstock') || id.includes('backed-') || id.includes('tokenized-stock')) return true;
  if (n.includes('xstock') || n.includes('tokenized') || n.includes('backed')) return true;

  const knownStockTickers = [
    'AAPL', 'TSLA', 'NVDA', 'META', 'GOOGL', 'GOOG', 'MSFT', 'AMZN',
    'SPY', 'QQQ', 'COIN', 'HOOD', 'MSTR', 'ARM', 'AVGO', 'AMD',
    'NFLX', 'PLTR', 'BRKB', 'DIS', 'INTC', 'CRWD', 'UBER', 'PYPL'
  ];
  const stripped = s.replace(/X$/, '');
  if (knownStockTickers.includes(stripped) || knownStockTickers.includes(s)) return true;

  return false;
}

/**
 * Pure function that computes a 0–100 Technical Confluence Score from:
 * • Start at 50.
 * • Price > SMA(20): +15, else −15.
 * • Price > EMA(20): +15, else −15.
 * • RSI: add round(((rsi - 50) / 50) * 20).
 * • Pivot position: add round((((price - support) / (resistance - support)) - 0.5) * 20).
 * • Clamp to 0–100.
 * • Return { score, signals: [{label, points}] } for transparency.
 */
export function computeTechnicalConfluenceScore(
  price: number,
  indicators?: Partial<TechnicalIndicators> | null
): TechnicalConfluenceResult {
  if (!indicators || price <= 0) {
    return {
      score: 50,
      signals: [{ label: 'Baseline Neutral Score', points: 50 }]
    };
  }

  let runningScore = 50;
  const signals: ConfluenceSignal[] = [];

  // 1. Price > SMA(20): +15, else -15
  if (indicators.sma20 !== undefined && indicators.sma20 > 0) {
    const isAboveSma = price > indicators.sma20;
    const smaPoints = isAboveSma ? 15 : -15;
    runningScore += smaPoints;
    signals.push({
      label: isAboveSma
        ? `Price > SMA(20) ($${indicators.sma20})`
        : `Price ≤ SMA(20) ($${indicators.sma20})`,
      points: smaPoints
    });
  }

  // 2. Price > EMA(20): +15, else -15
  if (indicators.ema20 !== undefined && indicators.ema20 > 0) {
    const isAboveEma = price > indicators.ema20;
    const emaPoints = isAboveEma ? 15 : -15;
    runningScore += emaPoints;
    signals.push({
      label: isAboveEma
        ? `Price > EMA(20) ($${indicators.ema20})`
        : `Price ≤ EMA(20) ($${indicators.ema20})`,
      points: emaPoints
    });
  }

  // 3. RSI: add round(((rsi - 50) / 50) * 20)
  if (indicators.rsi14 !== undefined) {
    const rsiPoints = Math.round(((indicators.rsi14 - 50) / 50) * 20);
    runningScore += rsiPoints;
    signals.push({
      label: `RSI(14) Momentum (${indicators.rsi14})`,
      points: rsiPoints
    });
  }

  // 4. Pivot position: add round((((price - support) / (resistance - support)) - 0.5) * 20)
  if (
    indicators.keySupport !== undefined &&
    indicators.keyResistance !== undefined &&
    indicators.keyResistance > indicators.keySupport
  ) {
    const pivotRatio = (price - indicators.keySupport) / (indicators.keyResistance - indicators.keySupport);
    const pivotPoints = Math.round((pivotRatio - 0.5) * 20);
    runningScore += pivotPoints;
    signals.push({
      label: `Pivot Position (Sup: $${indicators.keySupport} / Res: $${indicators.keyResistance})`,
      points: pivotPoints
    });
  }

  const clampedScore = Math.max(0, Math.min(100, runningScore));

  return {
    score: clampedScore,
    signals
  };
}

/**
 * Computes the SMA(20) slope and direction for a single timeframe series:
 * • slope = sma20[latest] - sma20[20 periods ago]
 * • Classify as "up" if slope > 0, "down" if slope < 0, "flat" if within ±0.1% of price.
 */
export function computeTimeframeSmaSlope(
  timeframe: ChartTimeframe,
  prices: PricePoint[],
  currentPrice?: number
): TimeframeSlopeInfo {
  if (!prices || prices.length < 3 || (prices as FilteredNysePoints)?.isInsufficient) {
    return {
      timeframe,
      slope: 0,
      slopePct: 0,
      direction: 'flat',
      latestSma: currentPrice || 0,
      pastSma: currentPrice || 0,
      summary: `${timeframe}: unavailable (insufficient session data)`
    };
  }

  const rawPrices = prices.map(p => p.price);
  const n = rawPrices.length;
  const effectivePrice = currentPrice && currentPrice > 0 ? currentPrice : rawPrices[n - 1] || 1;
  const period = Math.min(20, Math.max(3, Math.floor(n / 2)));

  // Calculate rolling SMA series
  const smaSeries: number[] = [];
  for (let i = 0; i < n; i++) {
    const windowStart = Math.max(0, i - period + 1);
    const window = rawPrices.slice(windowStart, i + 1);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    smaSeries.push(avg);
  }

  const latestSma = smaSeries[n - 1];
  // 20 periods ago or clamped past index
  const pastIndex = Math.max(0, n - 1 - period);
  const pastSma = smaSeries[pastIndex];

  const slope = latestSma - pastSma;
  const slopePct = parseFloat(((slope / effectivePrice) * 100).toFixed(2));

  // Small threshold: ±0.1% of current price
  const threshold = effectivePrice * 0.001;

  let direction: 'up' | 'down' | 'flat' = 'flat';
  if (slope > threshold) {
    direction = 'up';
  } else if (slope < -threshold) {
    direction = 'down';
  } else {
    direction = 'flat';
  }

  const trendName = direction === 'up' ? 'uptrend' : direction === 'down' ? 'downtrend' : 'neutral / flat';
  const slopeSign = slopePct >= 0 ? `+${slopePct}%` : `${slopePct}%`;
  const summary = `${timeframe}: ${trendName} (SMA slope ${slopeSign})`;

  return {
    timeframe,
    slope: parseFloat(slope.toFixed(effectivePrice < 1 ? 6 : 2)),
    slopePct,
    direction,
    latestSma: parseFloat(latestSma.toFixed(effectivePrice < 1 ? 6 : 2)),
    pastSma: parseFloat(pastSma.toFixed(effectivePrice < 1 ? 6 : 2)),
    summary
  };
}

/**
 * Computes Multi-Timeframe Alignment across all 4 timeframe tabs (24H, 7D, 1M, 1Y):
 * • If all four agree (all "up" or all "down"): label = "Strong Alignment", color green (up) or red (down).
 * • If 3 of 4 agree: label = "Partial Alignment", color amber.
 * • If mixed with no majority: label = "Mixed / No Alignment", color gray.
 */
export function computeMultiTimeframeAlignment(
  timeframePrices: Partial<Record<ChartTimeframe, PricePoint[]>>,
  currentPrice: number,
  isStock: boolean = false
): MultiTimeframeAlignmentResult {
  const timeframes: ChartTimeframe[] = ['24H', '7D', '1M', '1Y'];
  const results: Record<ChartTimeframe, TimeframeSlopeInfo> = {} as any;
  const timeframeList: TimeframeSlopeInfo[] = [];

  for (const tf of timeframes) {
    const rawSeries = timeframePrices[tf] || [];
    const filteredSeries = isStock ? filterNyseMarketHours(rawSeries) : rawSeries;
    const slopeInfo = computeTimeframeSmaSlope(tf, filteredSeries, currentPrice);
    results[tf] = slopeInfo;
    timeframeList.push(slopeInfo);
  }

  const upCount = timeframeList.filter(t => t.direction === 'up').length;
  const downCount = timeframeList.filter(t => t.direction === 'down').length;
  const flatCount = timeframeList.filter(t => t.direction === 'flat').length;

  let label: 'Strong Alignment' | 'Partial Alignment' | 'Mixed / No Alignment' = 'Mixed / No Alignment';
  let color: 'green' | 'red' | 'amber' | 'gray' = 'gray';
  let dominantDirection: 'up' | 'down' | 'flat' | 'mixed' = 'mixed';

  if (upCount === 4) {
    label = 'Strong Alignment';
    color = 'green';
    dominantDirection = 'up';
  } else if (downCount === 4) {
    label = 'Strong Alignment';
    color = 'red';
    dominantDirection = 'down';
  } else if (upCount === 3) {
    label = 'Partial Alignment';
    color = 'amber';
    dominantDirection = 'up';
  } else if (downCount === 3) {
    label = 'Partial Alignment';
    color = 'amber';
    dominantDirection = 'down';
  } else if (flatCount >= 3) {
    label = 'Partial Alignment';
    color = 'amber';
    dominantDirection = 'flat';
  } else {
    label = 'Mixed / No Alignment';
    color = 'gray';
    dominantDirection = 'mixed';
  }

  return {
    label,
    dominantDirection,
    color,
    timeframes: results,
    timeframeList,
    upCount,
    downCount,
    flatCount
  };
}

/**
 * Computes technical indicators directly from price data array:
 * 1. SMA (20-period simple moving average)
 * 2. EMA (20-period exponential moving average with standard 2/(N+1) multiplier)
 * 3. 14-period Relative Strength Index (Wilder's RSI formula)
 * 4. Support and Resistance derived from local pivot highs and lows (neighborhood extrema)
 * 5. Technical Confluence Score (0–100 composite)
 */
export function computeTechnicalIndicators(prices: PricePoint[]): TechnicalIndicators {
  const isInsufficient = !prices || prices.length < 3 || (prices as FilteredNysePoints)?.isInsufficient;
  if (isInsufficient) {
    return {
      pivotHighs: [],
      pivotLows: [],
      isUnavailable: true,
      unavailableReason: (prices as FilteredNysePoints)?.reason || 'Insufficient valid session data (minimum 3 points required)'
    };
  }

  const rawPrices = prices.map(p => p.price);
  const currentPrice = rawPrices[rawPrices.length - 1];
  const n = rawPrices.length;

  // 1. SMA-20 (or scaled window if fewer points)
  const smaPeriod = Math.min(20, Math.max(3, Math.floor(n / 2)));
  const recentForSma = rawPrices.slice(-smaPeriod);
  const smaSum = recentForSma.reduce((acc, p) => acc + p, 0);
  const sma20 = parseFloat((smaSum / smaPeriod).toFixed(currentPrice < 1 ? 6 : 2));

  // 2. EMA-20
  const emaPeriod = Math.min(20, Math.max(3, Math.floor(n / 2)));
  const k = 2 / (emaPeriod + 1);
  let runningEma = rawPrices[0];
  for (let i = 1; i < n; i++) {
    runningEma = rawPrices[i] * k + runningEma * (1 - k);
  }
  const ema20 = parseFloat(runningEma.toFixed(currentPrice < 1 ? 6 : 2));

  // Position relative to moving averages (threshold 0.15% to avoid jitter)
  const smaPosition: 'above' | 'below' | 'at' =
    currentPrice > sma20 * 1.0015 ? 'above' : currentPrice < sma20 * 0.9985 ? 'below' : 'at';
  const emaPosition: 'above' | 'below' | 'at' =
    currentPrice > ema20 * 1.0015 ? 'above' : currentPrice < ema20 * 0.9985 ? 'below' : 'at';

  // 3. 14-Period RSI (Wilder's Smoothing)
  let rsi14: number | undefined = undefined;
  let rsiCondition: 'overbought' | 'oversold' | 'neutral' | undefined = undefined;

  const rsiPeriod = Math.min(14, Math.max(3, n - 1));
  if (n > 2) {
    let gains = 0;
    let losses = 0;

    // Initial average gain/loss
    for (let i = 1; i <= rsiPeriod; i++) {
      const diff = rawPrices[i] - rawPrices[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    let avgGain = gains / rsiPeriod;
    let avgLoss = losses / rsiPeriod;

    // Smoothed subsequent periods
    for (let i = rsiPeriod + 1; i < n; i++) {
      const diff = rawPrices[i] - rawPrices[i - 1];
      const curGain = diff >= 0 ? diff : 0;
      const curLoss = diff < 0 ? Math.abs(diff) : 0;
      avgGain = (avgGain * (rsiPeriod - 1) + curGain) / rsiPeriod;
      avgLoss = (avgLoss * (rsiPeriod - 1) + curLoss) / rsiPeriod;
    }

    if (avgLoss === 0) {
      rsi14 = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi14 = parseFloat((100 - (100 / (1 + rs))).toFixed(1));
    }

    if (rsi14 >= 70) {
      rsiCondition = 'overbought';
    } else if (rsi14 <= 30) {
      rsiCondition = 'oversold';
    } else {
      rsiCondition = 'neutral';
    }
  }

  // 4. Support & Resistance from Real Local Pivot Highs / Lows (neighborhood window = 2 or 3)
  const windowRadius = Math.max(1, Math.min(3, Math.floor(n / 10)));
  const pivotHighs: PivotPoint[] = [];
  const pivotLows: PivotPoint[] = [];

  for (let i = windowRadius; i < n - windowRadius; i++) {
    const val = rawPrices[i];
    let isPivotHigh = true;
    let isPivotLow = true;

    for (let j = i - windowRadius; j <= i + windowRadius; j++) {
      if (j === i) continue;
      if (rawPrices[j] >= val) isPivotHigh = false;
      if (rawPrices[j] <= val) isPivotLow = false;
    }

    if (isPivotHigh) {
      pivotHighs.push({ price: val, timestamp: prices[i].timestamp, type: 'high' });
    }
    if (isPivotLow) {
      pivotLows.push({ price: val, timestamp: prices[i].timestamp, type: 'low' });
    }
  }

  // Find the closest real overhead pivot resistance and closest real underlying pivot support
  const overheadPivots = pivotHighs.filter(p => p.price > currentPrice).sort((a, b) => a.price - b.price);
  const underlyingPivots = pivotLows.filter(p => p.price < currentPrice).sort((a, b) => b.price - a.price);

  let keyResistance: number | undefined = overheadPivots.length > 0 ? overheadPivots[0].price : undefined;
  let keySupport: number | undefined = underlyingPivots.length > 0 ? underlyingPivots[0].price : undefined;

  // If no interior pivot exceeds current price (e.g. at all-time or timeframe high), use the actual peak observed
  if (keyResistance === undefined) {
    const maxSeen = Math.max(...rawPrices);
    if (maxSeen > currentPrice) {
      keyResistance = maxSeen;
    } else {
      keyResistance = maxSeen; // Current price is testing range high
    }
  }

  // If no interior pivot is below current price (e.g. at timeframe low), use the actual trough observed
  if (keySupport === undefined) {
    const minSeen = Math.min(...rawPrices);
    keySupport = minSeen;
  }

  keyResistance = parseFloat(keyResistance.toFixed(currentPrice < 1 ? 6 : 2));
  keySupport = parseFloat(keySupport.toFixed(currentPrice < 1 ? 6 : 2));

  // 5. Technical Confluence Score
  const confluence = computeTechnicalConfluenceScore(currentPrice, {
    sma20,
    ema20,
    rsi14,
    keyResistance,
    keySupport
  });

  return {
    sma20,
    ema20,
    smaPosition,
    emaPosition,
    rsi14,
    rsiCondition,
    keyResistance,
    keySupport,
    pivotHighs,
    pivotLows,
    confluence
  };
}

/**
 * Maps timeframe string to CoinGecko days parameter
 */
function timeframeToDays(tf: '24H' | '7D' | '1M' | '1Y'): string {
  switch (tf) {
    case '24H':
      return '1';
    case '7D':
      return '7';
    case '1M':
      return '30';
    case '1Y':
      return '365';
    default:
      return '1';
  }
}

/**
 * Generates continuous historical price points calibrated to live token metrics
 */
export function generateSyntheticChart(
  currentPrice: number,
  change24h: number = 0,
  timeframe: '24H' | '7D' | '1M' | '1Y' = '24H',
  symbol: string = 'TOKEN',
  name: string = 'Asset'
): ChartDataResult {
  const pointsCount = timeframe === '24H' ? 48 : timeframe === '7D' ? 56 : timeframe === '1M' ? 60 : 72;
  const now = Date.now();
  const durationMs =
    timeframe === '24H'
      ? 24 * 3600 * 1000
      : timeframe === '7D'
      ? 7 * 24 * 3600 * 1000
      : timeframe === '1M'
      ? 30 * 24 * 3600 * 1000
      : 365 * 24 * 3600 * 1000;

  const intervalMs = durationMs / pointsCount;
  const targetPctChange =
    timeframe === '24H'
      ? change24h
      : timeframe === '7D'
      ? change24h * 1.8 + 1.2
      : timeframe === '1M'
      ? change24h * 3.2 - 2.5
      : change24h * 8.5 + 14.0;

  // Derive starting price from change percentage
  const baselineStartPrice = currentPrice / (1 + targetPctChange / 100);
  const prices: PricePoint[] = [];

  // Seeded random walk using asset symbol hash
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) {
    seed = (seed * 31 + symbol.charCodeAt(i)) % 10000;
  }

  let runningPrice = baselineStartPrice;
  const volatility = Math.max(0.008, Math.min(0.045, Math.abs(targetPctChange) / 100 / 2));

  for (let i = 0; i < pointsCount; i++) {
    const t = now - durationMs + i * intervalMs;
    const progress = i / (pointsCount - 1);
    
    // Macro drift towards currentPrice + micro fluctuations
    const expectedValue = baselineStartPrice + (currentPrice - baselineStartPrice) * progress;
    seed = (seed * 9301 + 49297) % 233280;
    const rnd = (seed / 233280) * 2 - 1;
    
    // Mean reversion to trendline
    const drift = (expectedValue - runningPrice) * 0.25;
    const noise = expectedValue * volatility * rnd * 0.4;
    
    runningPrice = Math.max(runningPrice * 0.85, runningPrice + drift + noise);
    if (i === pointsCount - 1) {
      runningPrice = currentPrice;
    }

    const volume = Math.round(currentPrice * (10000 + Math.abs(rnd) * 80000));
    prices.push({
      timestamp: t,
      price: parseFloat(runningPrice.toFixed(currentPrice < 1 ? 6 : 2)),
      volume
    });
  }

  const rawPrices = prices.map(p => p.price);
  const highPrice = Math.max(...rawPrices);
  const lowPrice = Math.min(...rawPrices);
  const startPrice = prices[0].price;
  const priceChange = currentPrice - startPrice;
  const priceChangePct = startPrice > 0 ? ((currentPrice - startPrice) / startPrice) * 100 : 0;

  const keyLookup = HISTORICAL_ATH_ATL_MAP[symbol.toLowerCase()] || HISTORICAL_ATH_ATL_MAP[name.toLowerCase()];
  const allTimeHigh = keyLookup?.ath || parseFloat((Math.max(highPrice * 1.6, currentPrice * 1.5)).toFixed(currentPrice < 1 ? 4 : 2));
  const allTimeLow = keyLookup?.atl || parseFloat((Math.min(lowPrice * 0.35, currentPrice * 0.25)).toFixed(currentPrice < 1 ? 4 : 2));
  const totalSupply = keyLookup?.totalSupply || 1000000000;
  const circulatingSupply = keyLookup?.circulatingSupply || 350000000;
  const athChangePct = allTimeHigh > 0 ? parseFloat((((currentPrice - allTimeHigh) / allTimeHigh) * 100).toFixed(2)) : undefined;
  const atlChangePct = allTimeLow > 0 ? parseFloat((((currentPrice - allTimeLow) / allTimeLow) * 100).toFixed(2)) : undefined;

  const isStock = isStockAsset(symbol, undefined, name);
  const seriesForIndicators = isStock ? filterNyseMarketHours(prices) : prices;
  const indicators = computeTechnicalIndicators(seriesForIndicators);

  return {
    symbol,
    name,
    timeframe,
    prices,
    currentPrice,
    startPrice,
    priceChange,
    priceChangePct: parseFloat(priceChangePct.toFixed(2)),
    highPrice,
    lowPrice,
    averageVolume: Math.round(prices.reduce((acc, p) => acc + (p.volume || 0), 0) / prices.length),
    allTimeHigh,
    allTimeLow,
    athChangePct,
    atlChangePct,
    totalSupply,
    circulatingSupply,
    source: 'Algorithmic Multi-Source Synthesis',
    isLiveFeed: false,
    provenance: 'SYNTHETIC',
    isVerificationGrade: false,
    indicators
  };
}

/**
 * Fetches real historical market chart from CoinGecko or falls back to synthetic calibration
 */
export async function fetchHistoricalMarketChart(
  coinId: string,
  symbol: string,
  name: string,
  currentPrice: number,
  change24h: number = 0,
  timeframe: '24H' | '7D' | '1M' | '1Y' = '24H'
): Promise<ChartDataResult> {
  const cacheKey = `${coinId || symbol}-${timeframe}`.toLowerCase();
  const cached = chartCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const effectiveCoinId = (coinId || symbol || '').toLowerCase().trim();
  const days = timeframeToDays(timeframe);

  if (effectiveCoinId && effectiveCoinId !== 'n/a' && currentPrice > 0) {
    try {
      const res = await fetch(`/api/coingecko/market_chart/${encodeURIComponent(effectiveCoinId)}?days=${days}&vs_currency=usd`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.prices) && json.prices.length > 2) {
          const rawPriceTuples: [number, number][] = json.prices;
          const rawVolTuples: [number, number][] = json.total_volumes || [];

          const prices: PricePoint[] = rawPriceTuples.map(([timestamp, price], idx) => {
            const vol = rawVolTuples[idx] ? rawVolTuples[idx][1] : undefined;
            return {
              timestamp,
              price: parseFloat(price.toFixed(price < 1 ? 6 : 2)),
              volume: vol ? Math.round(vol) : undefined
            };
          });

          const liveCurPrice = prices[prices.length - 1].price || currentPrice;
          const startPrice = prices[0].price;
          const priceChange = liveCurPrice - startPrice;
          const priceChangePct = startPrice > 0 ? ((liveCurPrice - startPrice) / startPrice) * 100 : change24h;
          const priceValues = prices.map(p => p.price);
          const highPrice = Math.max(...priceValues);
          const lowPrice = Math.min(...priceValues);

          const keyLookup = HISTORICAL_ATH_ATL_MAP[symbol.toLowerCase()] || HISTORICAL_ATH_ATL_MAP[effectiveCoinId] || HISTORICAL_ATH_ATL_MAP[name.toLowerCase()];
          const allTimeHigh = keyLookup?.ath || parseFloat((Math.max(highPrice * 1.6, liveCurPrice * 1.5)).toFixed(liveCurPrice < 1 ? 4 : 2));
          const allTimeLow = keyLookup?.atl || parseFloat((Math.min(lowPrice * 0.35, liveCurPrice * 0.25)).toFixed(liveCurPrice < 1 ? 4 : 2));
          const totalSupply = keyLookup?.totalSupply || 1000000000;
          const circulatingSupply = keyLookup?.circulatingSupply || 350000000;
          const athChangePct = allTimeHigh > 0 ? parseFloat((((liveCurPrice - allTimeHigh) / allTimeHigh) * 100).toFixed(2)) : undefined;
          const atlChangePct = allTimeLow > 0 ? parseFloat((((liveCurPrice - allTimeLow) / allTimeLow) * 100).toFixed(2)) : undefined;

          const isStock = isStockAsset(symbol, effectiveCoinId, name);
          const seriesForIndicators = isStock ? filterNyseMarketHours(prices) : prices;
          const indicators = computeTechnicalIndicators(seriesForIndicators);

          const result: ChartDataResult = {
            symbol: symbol.toUpperCase(),
            name,
            timeframe,
            prices,
            currentPrice: liveCurPrice,
            startPrice,
            priceChange,
            priceChangePct: parseFloat(priceChangePct.toFixed(2)),
            highPrice,
            lowPrice,
            averageVolume: Math.round(prices.reduce((acc, p) => acc + (p.volume || 0), 0) / prices.length),
            allTimeHigh,
            allTimeLow,
            athChangePct,
            atlChangePct,
            totalSupply,
            circulatingSupply,
            source: 'Tri-Sync Engine',
            isLiveFeed: true,
            provenance: 'LIVE',
            isVerificationGrade: true,
            indicators
          };

          chartCache.set(cacheKey, { data: result, timestamp: Date.now() });
          return result;
        }
      }
    } catch (err) {
      console.warn(`Could not fetch live market chart for ${effectiveCoinId}:`, err);
    }
  }

  // Graceful fallback
  const fallback = generateSyntheticChart(currentPrice > 0 ? currentPrice : 100, change24h, timeframe, symbol, name);
  chartCache.set(cacheKey, { data: fallback, timestamp: Date.now() });
  return fallback;
}
