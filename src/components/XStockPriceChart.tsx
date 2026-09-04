/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  Sliders, 
  Layers, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle
} from 'lucide-react';
import { 
  ChartDataResult, 
  fetchHistoricalMarketChart, 
  PricePoint,
  computeTechnicalIndicators,
  computeTechnicalConfluenceScore,
  computeMultiTimeframeAlignment,
  generateSyntheticChart,
  filterNyseMarketHours,
  TechnicalIndicators,
  ChartTimeframe
} from '../services/marketChartService';
import { useCurrency } from '../context/CurrencyContext';

interface XStockPriceChartProps {
  symbol: string;
  name: string;
  underlyingTicker?: string;
  coingeckoId?: string;
  currentPrice?: number;
  change24h?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  isMarketOpen?: boolean;
}

export default function XStockPriceChart({
  symbol,
  name,
  underlyingTicker,
  coingeckoId,
  currentPrice: propCurrentPrice,
  change24h: propChange24h,
  volume24h: propVolume24h,
  isMarketOpen = true
}: XStockPriceChartProps) {
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '1M' | '1Y'>('24H');
  const [chartData, setChartData] = useState<ChartDataResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showIndicators, setShowIndicators] = useState<boolean>(true);
  const [showConfluenceDetails, setShowConfluenceDetails] = useState<boolean>(false);
  const [showMtfDetails, setShowMtfDetails] = useState<boolean>(false);
  const [timeframePricesMap, setTimeframePricesMap] = useState<Partial<Record<ChartTimeframe, PricePoint[]>>>({});
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [svgDimensions, setSvgDimensions] = useState({ width: 700, height: 260 });
  const containerRef = useRef<HTMLDivElement>(null);

  // ResizeObserver for responsive SVG
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          setSvgDimensions((prev) => ({
            ...prev,
            width: Math.max(300, Math.floor(width))
          }));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch Chart Data
  useEffect(() => {
    let isCancelled = false;
    async function loadData() {
      if (!propCurrentPrice || propCurrentPrice <= 0) {
        setChartData(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const result = await fetchHistoricalMarketChart(
          coingeckoId || symbol.toLowerCase(),
          symbol,
          name,
          propCurrentPrice,
          propChange24h ?? 0,
          timeframe
        );
        if (!isCancelled) {
          setChartData(result);
        }
      } catch (err) {
        console.warn('Failed to load xStock chart:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [symbol, name, coingeckoId, timeframe, propCurrentPrice, propChange24h]);

  // Pre-load all 4 timeframes for instantaneous Multi-Timeframe Alignment
  useEffect(() => {
    let isMounted = true;
    const timeframes: ChartTimeframe[] = ['24H', '7D', '1M', '1Y'];

    Promise.all(
      timeframes.map(tf =>
        fetchHistoricalMarketChart(
          coingeckoId || symbol.toLowerCase(),
          symbol,
          name,
          propCurrentPrice || 100,
          propChange24h || 0,
          tf
        )
      )
    ).then(results => {
      if (!isMounted) return;
      const map: Partial<Record<ChartTimeframe, PricePoint[]>> = {};
      results.forEach((res, idx) => {
        if (res && res.prices && res.prices.length > 0) {
          map[timeframes[idx]] = res.prices;
        }
      });
      setTimeframePricesMap(prev => ({ ...map, ...prev }));
    }).catch(err => {
      console.warn('Multi-timeframe data preloading (xStock):', err);
    });

    return () => {
      isMounted = false;
    };
  }, [symbol, name, coingeckoId, propCurrentPrice, propChange24h]);

  // Snap the terminal point of the price array to propCurrentPrice (consensus anchor)
  const activePrices = useMemo<PricePoint[]>(() => {
    if (!chartData || !chartData.prices || chartData.prices.length === 0) {
      return [];
    }
    const cloned = chartData.prices.map(p => ({ ...p }));
    if (typeof propCurrentPrice === 'number' && propCurrentPrice > 0 && cloned.length > 0) {
      cloned[cloned.length - 1].price = propCurrentPrice;
    }
    return cloned;
  }, [chartData, propCurrentPrice]);

  useEffect(() => {
    if (activePrices.length > 0) {
      setTimeframePricesMap(prev => ({ ...prev, [timeframe]: activePrices }));
    }
  }, [activePrices, timeframe]);

  const rawPrices = useMemo(() => activePrices.map(p => p.price), [activePrices]);
  const currentPrice = propCurrentPrice ?? (rawPrices.length > 0 ? rawPrices[rawPrices.length - 1] : 0);
  const startPrice = rawPrices.length > 0 ? rawPrices[0] : currentPrice;
  const displayChangePct = startPrice > 0 ? ((currentPrice - startPrice) / startPrice) * 100 : (propChange24h ?? 0);
  const isPositive = displayChangePct >= 0;

  // Determine if historical chart data is based on synthetic/fallback simulation
  const isSynthetic = useMemo(() => {
    if (!chartData) return true;
    return chartData.provenance === 'SYNTHETIC' || !chartData.isLiveFeed || !chartData.isVerificationGrade;
  }, [chartData]);

  // Derived Indicators based on consensus-snapped array filtered for NYSE hours
  const activeIndicators = useMemo<TechnicalIndicators | undefined>(() => {
    if (activePrices.length < 2 || !currentPrice || currentPrice <= 0) return undefined;
    const seriesForIndicators = filterNyseMarketHours(activePrices);
    return computeTechnicalIndicators(seriesForIndicators);
  }, [activePrices, currentPrice]);

  const confluence = useMemo(() => {
    if (!activeIndicators || !currentPrice || currentPrice <= 0) return undefined;
    return activeIndicators.confluence || computeTechnicalConfluenceScore(currentPrice, activeIndicators);
  }, [activeIndicators, currentPrice]);

  // Multi-Timeframe Alignment across 24H, 7D, 1M, 1Y
  const mtfAlignment = useMemo(() => {
    const fullMap: Record<ChartTimeframe, PricePoint[]> = {
      '24H': timeframePricesMap['24H'] || (chartData?.timeframe === '24H' ? activePrices : generateSyntheticChart(currentPrice > 0 ? currentPrice : 100, displayChangePct, '24H', symbol, name).prices),
      '7D': timeframePricesMap['7D'] || (chartData?.timeframe === '7D' ? activePrices : generateSyntheticChart(currentPrice > 0 ? currentPrice : 100, displayChangePct, '7D', symbol, name).prices),
      '1M': timeframePricesMap['1M'] || (chartData?.timeframe === '1M' ? activePrices : generateSyntheticChart(currentPrice > 0 ? currentPrice : 100, displayChangePct, '1M', symbol, name).prices),
      '1Y': timeframePricesMap['1Y'] || (chartData?.timeframe === '1Y' ? activePrices : generateSyntheticChart(currentPrice > 0 ? currentPrice : 100, displayChangePct, '1Y', symbol, name).prices),
    };

    return computeMultiTimeframeAlignment(fullMap, currentPrice, true);
  }, [timeframePricesMap, chartData, activePrices, currentPrice, displayChangePct, symbol, name]);

  const minPrice = useMemo(() => (rawPrices.length > 0 ? Math.min(...rawPrices) : 0), [rawPrices]);
  const maxPrice = useMemo(() => (rawPrices.length > 0 ? Math.max(...rawPrices) : 1), [rawPrices]);
  const priceRange = maxPrice - minPrice || 1;

  const chartPaddingLeft = 14;
  const chartPaddingRight = 64;
  const chartPaddingTop = 20;
  const chartPaddingBottom = 32;

  // Compute SVG Points & Paths
  const { pathD, fillD, xPoints, yPoints, smaPathD, emaPathD } = useMemo(() => {
    if (activePrices.length < 2) {
      return { pathD: '', fillD: '', xPoints: [], yPoints: [], smaPathD: '', emaPathD: '' };
    }

    const { width, height } = svgDimensions;
    const availableWidth = width - chartPaddingLeft - chartPaddingRight;
    const availableHeight = height - chartPaddingTop - chartPaddingBottom;

    const xs = activePrices.map((_, i) => chartPaddingLeft + (i / (activePrices.length - 1)) * availableWidth);
    const ys = activePrices.map(p => chartPaddingTop + availableHeight - ((p.price - minPrice) / priceRange) * availableHeight);

    let d = `M ${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
    for (let i = 1; i < xs.length; i++) {
      const prevX = xs[i - 1];
      const prevY = ys[i - 1];
      const curX = xs[i];
      const curY = ys[i];
      const cpX1 = prevX + (curX - prevX) / 2;
      const cpX2 = prevX + (curX - prevX) / 2;
      d += ` C ${cpX1.toFixed(1)} ${prevY.toFixed(1)}, ${cpX2.toFixed(1)} ${curY.toFixed(1)}, ${curX.toFixed(1)} ${curY.toFixed(1)}`;
    }

    const bottomY = height - chartPaddingBottom;
    const fill = `${d} L ${xs[xs.length - 1].toFixed(1)} ${bottomY} L ${xs[0].toFixed(1)} ${bottomY} Z`;

    // Compute SMA-20 overlay line
    let smaD = '';
    if (activePrices.length >= 10) {
      const smaPeriod = Math.min(20, Math.floor(activePrices.length / 2));
      const smaPoints: { x: number; y: number }[] = [];
      for (let i = smaPeriod - 1; i < activePrices.length; i++) {
        let sum = 0;
        for (let j = i - smaPeriod + 1; j <= i; j++) {
          sum += activePrices[j].price;
        }
        const smaVal = sum / smaPeriod;
        const y = chartPaddingTop + availableHeight - ((smaVal - minPrice) / priceRange) * availableHeight;
        smaPoints.push({ x: xs[i], y });
      }
      if (smaPoints.length > 0) {
        smaD = `M ${smaPoints[0].x.toFixed(1)} ${smaPoints[0].y.toFixed(1)}`;
        for (let i = 1; i < smaPoints.length; i++) {
          smaD += ` L ${smaPoints[i].x.toFixed(1)} ${smaPoints[i].y.toFixed(1)}`;
        }
      }
    }

    // Compute EMA-20 overlay line
    let emaD = '';
    if (activePrices.length >= 10) {
      const emaPeriod = Math.min(20, Math.floor(activePrices.length / 2));
      const multiplier = 2 / (emaPeriod + 1);
      const emaPoints: { x: number; y: number }[] = [];
      let runningEma = activePrices[0].price;
      for (let i = 0; i < activePrices.length; i++) {
        runningEma = (activePrices[i].price - runningEma) * multiplier + runningEma;
        if (i >= emaPeriod - 1) {
          const y = chartPaddingTop + availableHeight - ((runningEma - minPrice) / priceRange) * availableHeight;
          emaPoints.push({ x: xs[i], y });
        }
      }
      if (emaPoints.length > 0) {
        emaD = `M ${emaPoints[0].x.toFixed(1)} ${emaPoints[0].y.toFixed(1)}`;
        for (let i = 1; i < emaPoints.length; i++) {
          emaD += ` L ${emaPoints[i].x.toFixed(1)} ${emaPoints[i].y.toFixed(1)}`;
        }
      }
    }

    return { pathD: d, fillD: fill, xPoints: xs, yPoints: ys, smaPathD: smaD, emaPathD: emaD };
  }, [activePrices, minPrice, priceRange, svgDimensions]);

  // Y-axis grid ticks (5 horizontal price levels)
  const yTicks = useMemo(() => {
    if (activePrices.length < 2) return [];
    const ticks = [];
    const count = 5;
    const plotHeight = svgDimensions.height - chartPaddingTop - chartPaddingBottom;
    const plotWidth = svgDimensions.width - chartPaddingLeft - chartPaddingRight;

    for (let i = 0; i < count; i++) {
      const ratio = i / (count - 1);
      const val = minPrice + ratio * priceRange;
      const y = chartPaddingTop + (1 - ratio) * plotHeight;
      ticks.push({ val, y, x1: chartPaddingLeft, x2: chartPaddingLeft + plotWidth });
    }
    return ticks;
  }, [minPrice, priceRange, svgDimensions, activePrices.length]);

  // X-axis time ticks
  const xTicks = useMemo(() => {
    if (activePrices.length < 2) return [];
    const count = 5;
    const ticks = [];
    const plotWidth = svgDimensions.width - chartPaddingLeft - chartPaddingRight;

    for (let i = 0; i < count; i++) {
      const idx = Math.floor((i / (count - 1)) * (activePrices.length - 1));
      const pt = activePrices[idx];
      const x = chartPaddingLeft + (idx / (activePrices.length - 1)) * plotWidth;
      const date = new Date(pt.timestamp);

      let label = '';
      if (timeframe === '24H') {
        label = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      } else if (timeframe === '7D') {
        label = date.toLocaleDateString([], { weekday: 'short' });
      } else if (timeframe === '1M') {
        label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      } else {
        label = date.toLocaleDateString([], { month: 'short', year: '2-digit' });
      }
      ticks.push({ label, x });
    }
    return ticks;
  }, [activePrices, timeframe, svgDimensions]);

  // Hover Interaction
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (xPoints.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    let closestIdx = 0;
    let minDistance = Infinity;
    xPoints.forEach((x, idx) => {
      const dist = Math.abs(x - mouseX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });
    setHoverIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const hoverPoint = hoverIndex !== null && activePrices[hoverIndex] ? activePrices[hoverIndex] : null;
  const { formatPrice, formatCompactCap, selectedCurrency } = useCurrency();

  const strokeColor = isPositive ? '#10b981' : '#f43f5e';
  const fillGradientId = `xstock-grad-${symbol}-${isPositive ? 'pos' : 'neg'}`;

  return (
    <div className="rounded-2xl bg-cyber-bg-card/90 border border-cyber-cyan/30 backdrop-blur-md shadow-xl overflow-hidden p-5 sm:p-6 space-y-5">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyber-cyan/15 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-orbitron font-extrabold text-lg sm:text-xl text-white tracking-wide">
              {symbol}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {name}
            </span>
            {underlyingTicker && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                Underlying: {underlyingTicker}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
              isMarketOpen 
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}>
              {isMarketOpen ? '24/7 On-Chain & Equity Open' : '24/7 On-Chain Quote'}
            </span>
          </div>

          {/* Current Price and Percentage */}
          <div className="flex items-baseline gap-3 mt-1">
            {currentPrice > 0 ? (
              <>
                <span className="text-2xl sm:text-3xl font-orbitron font-black text-white tracking-tight">
                  {formatPrice(hoverPoint ? hoverPoint.price : currentPrice)}
                </span>
                <div className={`flex items-center gap-1 text-xs font-mono font-bold ${
                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span>
                    {isPositive ? '+' : ''}{displayChangePct.toFixed(2)}%
                  </span>
                  <span className="text-slate-500 text-[10px]">({timeframe})</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 py-1">
                <span className="text-xl sm:text-2xl font-orbitron font-bold text-slate-400">
                  Price unavailable
                </span>
                <span className="text-xs font-mono text-slate-500">
                  (No active market data feed detected)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Timeframe Selectors & Toggle Technical Indicators */}
        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-cyber-cyan/20 font-mono text-xs">
            {(['24H', '7D', '1M', '1Y'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-lg transition-all font-bold cursor-pointer text-xs ${
                  timeframe === tf
                    ? 'bg-cyber-cyan text-slate-950 shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowIndicators(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              showIndicators
                ? 'bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan/40 shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Technical Indicators</span>
            {isSynthetic && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                SYNTHETIC / DEMO
              </span>
            )}
            {showIndicators ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* SVG Interactive Chart Canvas */}
      <div ref={containerRef} className="relative w-full h-[260px] select-none flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm rounded-xl text-cyber-cyan font-mono text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mb-2" />
            <span>Syncing xStock Historical Rates...</span>
          </div>
        )}

        {currentPrice > 0 && activePrices.length >= 2 ? (
          <svg
            width={svgDimensions.width}
            height={svgDimensions.height}
            className="w-full h-full cursor-crosshair overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines & Y-axis Price Ticks */}
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={tick.x1}
                  y1={tick.y}
                  x2={tick.x2}
                  y2={tick.y}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={tick.x2 + 8}
                  y={tick.y + 3.5}
                  fill="#64748b"
                  fontSize="9.5"
                  fontFamily="monospace"
                  textAnchor="start"
                >
                  {formatPrice(tick.val)}
                </text>
              </g>
            ))}

            {/* Fill Area under main curve */}
            {fillD && <path d={fillD} fill={`url(#${fillGradientId})`} />}

            {/* SMA 20 Overlay Line */}
            {showIndicators && smaPathD && (
              <path
                d={smaPathD}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.4"
                strokeDasharray="4 3"
                opacity="0.75"
              />
            )}

            {/* EMA 20 Overlay Line */}
            {showIndicators && emaPathD && (
              <path
                d={emaPathD}
                fill="none"
                stroke="#c084fc"
                strokeWidth="1.4"
                opacity="0.85"
              />
            )}

            {/* Main Price Path */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Live Terminal Dot Pulse */}
            {hoverIndex === null && xPoints.length > 0 && yPoints.length > 0 && (
              <g>
                <circle
                  cx={xPoints[xPoints.length - 1]}
                  cy={yPoints[yPoints.length - 1]}
                  r="6"
                  fill={strokeColor}
                  opacity="0.3"
                  className="animate-ping"
                />
                <circle
                  cx={xPoints[xPoints.length - 1]}
                  cy={yPoints[yPoints.length - 1]}
                  r="3.5"
                  fill={strokeColor}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Crosshair & Hover Circle */}
            {hoverIndex !== null && hoverPoint && xPoints[hoverIndex] && yPoints[hoverIndex] && (
              <g>
                <line
                  x1={xPoints[hoverIndex]}
                  y1={20}
                  x2={xPoints[hoverIndex]}
                  y2={svgDimensions.height - 32}
                  stroke="#00e5ff"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={xPoints[hoverIndex]}
                  cy={yPoints[hoverIndex]}
                  r="5"
                  fill={strokeColor}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]"
                />
              </g>
            )}

            {/* X-axis time indicators */}
            {xTicks.map((tick, i) => (
              <text
                key={i}
                x={tick.x}
                y={svgDimensions.height - 12}
                fill="#64748b"
                fontSize="9.5"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {tick.label}
              </text>
            ))}
          </svg>
        ) : !isLoading ? (
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500 font-mono text-xs">
            <Activity className="w-8 h-8 text-slate-600 mb-1" />
            <span className="text-slate-300 font-bold">Chart Telemetry Unavailable</span>
            <span className="text-[11px] max-w-sm text-slate-500">
              Live secondary market feeds for {symbol} are currently not reporting on connected market data aggregator endpoints.
            </span>
          </div>
        ) : null}

        {/* Hover Tooltip Popup */}
        {hoverPoint && hoverIndex !== null && currentPrice > 0 && (
          <div
            className="absolute z-30 pointer-events-none bg-slate-950/95 border border-cyber-cyan/40 rounded-xl p-2.5 shadow-2xl backdrop-blur-md text-left"
            style={{
              left: Math.min(svgDimensions.width - 150, Math.max(16, (xPoints[hoverIndex] || 0) - 75)),
              top: Math.max(10, (yPoints[hoverIndex] || 0) - 70)
            }}
          >
            <div className="text-[9.5px] font-mono text-slate-400">
              {new Date(hoverPoint.timestamp).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <div className="text-sm font-mono font-bold text-white flex items-center gap-1.5">
              <span>{formatPrice(hoverPoint.price)}</span>
            </div>
            {hoverPoint.volume && (
              <div className="text-[9px] font-mono text-cyber-cyan mt-0.5">
                Vol: {formatCompactCap(hoverPoint.volume)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Technical Indicators Panel */}
      {showIndicators && activeIndicators && (
        <div className="p-4 rounded-xl bg-slate-950/90 border border-cyber-cyan/20 space-y-3 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyber-cyan/15 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Activity className="w-4 h-4 text-cyber-cyan" />
              <span className="font-orbitron font-bold text-white uppercase tracking-wider text-[11px]">
                Technical Indicators ({timeframe})
              </span>
              {isSynthetic ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  SYNTHETIC / DEMO
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  LIVE MARKET DATA
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400">
              {isSynthetic ? (
                <span className="text-amber-400/90 font-bold">
                  Verification-Grade Indicators: Unavailable
                </span>
              ) : (
                <span>Computed from {activePrices.length} data points (NYSE Filtered)</span>
              )}
            </div>
          </div>

          {/* Prominent Synthetic / Demo Advisory */}
          {isSynthetic && !activeIndicators.isUnavailable && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/35 flex items-start gap-2.5 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 font-mono">
                <div className="font-bold flex items-center gap-2 flex-wrap">
                  <span className="bg-amber-500/25 px-1.5 py-0.5 rounded text-[10px] text-amber-200 border border-amber-500/40">
                    SYNTHETIC / DEMO
                  </span>
                  <span className="text-white">Verification-Grade Indicators Unavailable</span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Live secondary market historical candles for {symbol} are currently not provided by connected APIs. These indicators are computed on synthetic fallback price history for demonstration only and do NOT represent verification-grade technical indicators.
                </p>
              </div>
            </div>
          )}

          {/* Insufficient NYSE Data Advisory */}
          {activeIndicators.isUnavailable && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/35 flex items-start gap-2.5 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 font-mono">
                <div className="font-bold flex items-center gap-2 flex-wrap">
                  <span className="bg-amber-500/25 px-1.5 py-0.5 rounded text-[10px] text-amber-200 border border-amber-500/40">
                    INSUFFICIENT SESSION DATA
                  </span>
                  <span className="text-white">Technical Indicators Unavailable</span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  {activeIndicators.unavailableReason || 'Fewer than 3 valid NYSE regular-session points exist. Weekend and after-hours data are strictly excluded to prevent distorting stock technical indicators.'}
                </p>
              </div>
            </div>
          )}

          {/* Technical Confluence Score Gauge */}
          {!activeIndicators.isUnavailable && confluence && (
            <div className="bg-slate-900/90 border border-cyber-cyan/30 rounded-xl p-3 space-y-2.5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30">
                    <Activity className="w-4 h-4 text-cyber-cyan" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                      Technical Confluence {isSynthetic && '(SYNTHETIC / DEMO)'}
                    </span>
                    <div className="text-base font-bold text-white flex items-baseline gap-1.5">
                      <span
                        className={
                          confluence.score >= 60
                            ? 'text-emerald-400 font-extrabold'
                            : confluence.score <= 40
                            ? 'text-rose-400 font-extrabold'
                            : 'text-cyber-cyan font-extrabold'
                        }
                      >
                        {confluence.score}
                      </span>
                      <span className="text-[10px] text-slate-500">/ 100</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase ml-1 border ${
                          isSynthetic
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : confluence.score >= 60
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : confluence.score <= 40
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {isSynthetic
                          ? 'Demo Simulation'
                          : confluence.score >= 60
                          ? 'Bullish Confluence'
                          : confluence.score <= 40
                          ? 'Bearish Confluence'
                          : 'Neutral Confluence'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConfluenceDetails(prev => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950/90 border border-cyber-cyan/25 hover:border-cyber-cyan/50 text-[11px] font-mono text-cyber-cyan hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <span>How this is calculated</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      showConfluenceDetails ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Gauge Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    confluence.score >= 60
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                      : confluence.score <= 40
                      ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]'
                      : 'bg-cyber-cyan shadow-[0_0_8px_rgba(0,229,255,0.5)]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, confluence.score))}%` }}
                />
              </div>

              {/* Collapsible Signals List */}
              {showConfluenceDetails && (
                <div className="pt-2 border-t border-cyber-cyan/15 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Component Signal Breakdown</span>
                    <span className="text-slate-500">Base Score: 50 pts</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    {confluence.signals.map((signal, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-950/90 px-2.5 py-1.5 rounded-lg border border-slate-800"
                      >
                        <span className="text-slate-300 truncate pr-2">{signal.label}</span>
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0 ${
                            signal.points > 0
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : signal.points < 0
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {signal.points > 0 ? `+${signal.points}` : signal.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer Text */}
              <p className="text-[10px] font-mono text-slate-400 italic pt-1 border-t border-cyber-cyan/10">
                {isSynthetic
                  ? 'SYNTHETIC / DEMO: Calculated from simulated history. Verification-grade technical indicators are unavailable.'
                  : 'Calculated from the indicators above. Not a prediction — a summary of current technical positioning.'}
              </p>
            </div>
          )}

          {/* Multi-Timeframe Alignment Badge & Expander */}
          {mtfAlignment && (
            <div id="xstock-multi-timeframe-alignment-card" className="bg-slate-900/90 border border-cyber-cyan/30 rounded-xl p-3 space-y-2 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30">
                    <Layers className="w-4 h-4 text-cyber-cyan" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                      Multi-Timeframe Alignment {isSynthetic && '(SYNTHETIC / DEMO)'}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        id="xstock-mtf-alignment-badge"
                        className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase border ${
                          isSynthetic
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : mtfAlignment.color === 'green'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : mtfAlignment.color === 'red'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : mtfAlignment.color === 'amber'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {isSynthetic ? 'SYNTHETIC / DEMO' : mtfAlignment.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4 Timeframe Indicators (24H, 7D, 1M, 1Y) + Expander Trigger */}
                <button
                  id="xstock-mtf-details-toggle-btn"
                  type="button"
                  onClick={() => setShowMtfDetails(prev => !prev)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-cyber-cyan/25 hover:border-cyber-cyan/50 text-[11px] font-mono transition-all cursor-pointer group shadow-xs"
                >
                  <div className="flex items-center gap-1.5 font-mono">
                    {mtfAlignment.timeframeList.map((item) => {
                      const isUp = item.direction === 'up';
                      const isDown = item.direction === 'down';
                      return (
                        <span
                          key={item.timeframe}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            isUp
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : isDown
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                          title={item.summary}
                        >
                          <span>{item.timeframe}</span>
                          {isUp ? (
                            <ArrowUpRight className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : isDown ? (
                            <ArrowDownRight className="w-3 h-3 text-rose-400 shrink-0" />
                          ) : (
                            <Minus className="w-3 h-3 text-slate-400 shrink-0" />
                          )}
                        </span>
                      );
                    })}
                  </div>

                  <ChevronDown
                    className={`w-3.5 h-3.5 text-cyber-cyan transition-transform duration-200 ${
                      showMtfDetails ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Expanded One-Line Summary per Timeframe */}
              {showMtfDetails && (
                <div id="xstock-mtf-details-breakdown" className="pt-2 border-t border-cyber-cyan/15 space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>
                      {isSynthetic 
                        ? 'SMA(20) Slope Direction per Timeframe (SYNTHETIC / DEMO)' 
                        : 'SMA(20) Slope Direction per Timeframe (NYSE Filtered)'}
                    </span>
                    <span className="text-slate-500">Threshold: ±0.1%</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {mtfAlignment.timeframeList.map((item) => (
                      <div
                        key={item.timeframe}
                        className="flex items-center justify-between bg-slate-950/90 px-2.5 py-1.5 rounded-lg border border-slate-800"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">{item.timeframe}:</span>
                          <span
                            className={
                              item.direction === 'up'
                                ? 'text-emerald-400 font-semibold'
                                : item.direction === 'down'
                                ? 'text-rose-400 font-semibold'
                                : 'text-slate-400 font-semibold'
                            }
                          >
                            {item.direction === 'up'
                              ? 'uptrend'
                              : item.direction === 'down'
                              ? 'downtrend'
                              : 'flat / neutral'}
                          </span>
                        </div>
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            item.direction === 'up'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : item.direction === 'down'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          SMA slope {item.slopePct >= 0 ? `+${item.slopePct}%` : `${item.slopePct}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!activeIndicators.isUnavailable && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* SMA 20 */}
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>SMA (20)</span>
                  <div className="flex items-center gap-1">
                    {isSynthetic && (
                      <span className="text-[8px] font-mono px-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        DEMO
                      </span>
                    )}
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  </div>
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {activeIndicators.sma20 ? formatPrice(activeIndicators.sma20) : 'N/A'}
                </div>
                <div className="text-[9.5px] mt-0.5 text-slate-400">
                  Price is <span className={`font-bold ${
                    activeIndicators.smaPosition === 'above' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>{activeIndicators.smaPosition}</span> SMA
                </div>
              </div>

              {/* EMA 20 */}
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>EMA (20)</span>
                  <div className="flex items-center gap-1">
                    {isSynthetic && (
                      <span className="text-[8px] font-mono px-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        DEMO
                      </span>
                    )}
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  </div>
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {activeIndicators.ema20 ? formatPrice(activeIndicators.ema20) : 'N/A'}
                </div>
                <div className="text-[9.5px] mt-0.5 text-slate-400">
                  Price is <span className={`font-bold ${
                    activeIndicators.emaPosition === 'above' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>{activeIndicators.emaPosition}</span> EMA
                </div>
              </div>

              {/* 14-Period RSI */}
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>RSI (14)</span>
                  <div className="flex items-center gap-1">
                    {isSynthetic && (
                      <span className="text-[8px] font-mono px-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        DEMO
                      </span>
                    )}
                    <span className={`text-[9px] font-bold px-1 rounded ${
                      activeIndicators.rsiCondition === 'overbought' ? 'bg-rose-500/20 text-rose-400' :
                      activeIndicators.rsiCondition === 'oversold' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {activeIndicators.rsiCondition || 'neutral'}
                    </span>
                  </div>
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {activeIndicators.rsi14 ?? 'N/A'}
                </div>
                <div className="text-[9.5px] mt-0.5 text-slate-400">
                  {activeIndicators.rsi14 ? (
                    activeIndicators.rsi14 >= 70 ? 'Overbought (>70)' :
                    activeIndicators.rsi14 <= 30 ? 'Oversold (<30)' :
                    'Neutral Band (30-70)'
                  ) : 'Calculating...'}
                </div>
              </div>

              {/* Support / Resistance */}
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>Pivot Key Levels</span>
                  {isSynthetic && (
                    <span className="text-[8px] font-mono px-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      DEMO
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-bold text-emerald-400 mt-1">
                  Sup: {formatPrice(activeIndicators.keySupport)} {isSynthetic ? '(Demo)' : ''}
                </div>
                <div className="text-[11px] font-bold text-rose-400 mt-0.5">
                  Res: {formatPrice(activeIndicators.keyResistance)} {isSynthetic ? '(Demo)' : ''}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
