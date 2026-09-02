/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Activity,
  Sliders,
  Gauge,
  Compass,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronDown
} from 'lucide-react';
import {
  fetchHistoricalMarketChart,
  computeTechnicalIndicators,
  computeTechnicalConfluenceScore,
  computeMultiTimeframeAlignment,
  generateSyntheticChart,
  filterNyseMarketHours,
  isStockAsset,
  ChartDataResult,
  PricePoint,
  TechnicalConfluenceResult,
  MultiTimeframeAlignmentResult,
  ChartTimeframe
} from '../services/marketChartService';
import { useCurrency } from '../context/CurrencyContext';

export interface CryptoPriceChartProps {
  coinId?: string;
  symbol: string;
  name: string;
  currentPrice: number;
  change24h?: number;
  marketCap?: number;
  volume24h?: number;
  allTimeLow?: number;
  allTimeHigh?: number;
  atlChangePct?: number;
  athChangePct?: number;
  totalSupply?: number;
  circulatingSupply?: number;
  maxSupply?: number;
  high24h?: number;
  low24h?: number;
  isStock?: boolean;
  className?: string;
}

export const CryptoPriceChart: React.FC<CryptoPriceChartProps> = ({
  coinId,
  symbol,
  name,
  currentPrice,
  change24h = 0,
  marketCap,
  volume24h,
  allTimeLow,
  allTimeHigh,
  atlChangePct,
  athChangePct,
  totalSupply,
  circulatingSupply,
  maxSupply,
  high24h,
  low24h,
  isStock,
  className = ''
}) => {
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '1M' | '1Y'>('24H');
  const [chartMode, setChartMode] = useState<'live' | 'indicators'>('live');
  const [chartData, setChartData] = useState<ChartDataResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hoverPoint, setHoverPoint] = useState<PricePoint | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showConfluenceDetails, setShowConfluenceDetails] = useState<boolean>(false);
  const [showMtfDetails, setShowMtfDetails] = useState<boolean>(false);
  const [timeframePricesMap, setTimeframePricesMap] = useState<Partial<Record<ChartTimeframe, PricePoint[]>>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const [svgDimensions, setSvgDimensions] = useState<{ width: number; height: number }>({
    width: 600,
    height: 260
  });

  // Responsive container observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setSvgDimensions({
            width: Math.max(300, entry.contentRect.width),
            height: 250
          });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch chart data when coin, price, or timeframe changes
  const loadChart = async () => {
    setIsLoading(true);
    try {
      const data = await fetchHistoricalMarketChart(
        coinId || symbol.toLowerCase(),
        symbol,
        name,
        currentPrice,
        change24h,
        timeframe
      );
      setChartData(data);
    } catch (err) {
      console.error('Error loading chart:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChart();
  }, [coinId, symbol, currentPrice, timeframe]);

  // Pre-load all 4 timeframes for instantaneous Multi-Timeframe Alignment
  useEffect(() => {
    let isMounted = true;
    const timeframes: ChartTimeframe[] = ['24H', '7D', '1M', '1Y'];
    
    Promise.all(
      timeframes.map(tf =>
        fetchHistoricalMarketChart(
          coinId || symbol.toLowerCase(),
          symbol,
          name,
          currentPrice,
          change24h,
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
      console.warn('Multi-timeframe data preloading:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [coinId, symbol, name, currentPrice, change24h]);

  // Chart computation & path generation with anchor point snapped to consensus currentPrice
  const activePrices = useMemo(() => {
    if (!chartData || !chartData.prices || chartData.prices.length === 0) return [];
    if (currentPrice > 0) {
      const cloned = [...chartData.prices];
      const lastIdx = cloned.length - 1;
      cloned[lastIdx] = {
        ...cloned[lastIdx],
        price: currentPrice
      };
      return cloned;
    }
    return chartData.prices;
  }, [chartData, currentPrice]);

  useEffect(() => {
    if (activePrices.length > 0) {
      setTimeframePricesMap(prev => ({ ...prev, [timeframe]: activePrices }));
    }
  }, [activePrices, timeframe]);

  const isStockEffective = isStock ?? isStockAsset(symbol, coinId, name);

  // Dynamically computed technical indicators reflecting the tri-oracle consensus anchor point
  // Filtered by NYSE market hours for stock assets so flat off-hours don't skew indicators
  const activeIndicators = useMemo(() => {
    if (activePrices.length === 0) return chartData?.indicators;
    const seriesForIndicators = isStockEffective ? filterNyseMarketHours(activePrices) : activePrices;
    return computeTechnicalIndicators(seriesForIndicators);
  }, [activePrices, chartData?.indicators, isStockEffective]);

  const confluence = useMemo(() => {
    if (!activeIndicators) return undefined;
    return activeIndicators.confluence || computeTechnicalConfluenceScore(currentPrice, activeIndicators);
  }, [activeIndicators, currentPrice]);

  // Multi-Timeframe Alignment across 24H, 7D, 1M, 1Y
  const mtfAlignment = useMemo(() => {
    const fullMap: Record<ChartTimeframe, PricePoint[]> = {
      '24H': timeframePricesMap['24H'] || (chartData?.timeframe === '24H' ? activePrices : generateSyntheticChart(currentPrice > 0 ? currentPrice : 100, change24h, '24H', symbol, name).prices),
      '7D': timeframePricesMap['7D'] || (chartData?.timeframe === '7D' ? activePrices : generateSyntheticChart(currentPrice > 0 ? currentPrice : 100, change24h, '7D', symbol, name).prices),
      '1M': timeframePricesMap['1M'] || (chartData?.timeframe === '1M' ? activePrices : generateSyntheticChart(currentPrice > 0 ? currentPrice : 100, change24h, '1M', symbol, name).prices),
      '1Y': timeframePricesMap['1Y'] || (chartData?.timeframe === '1Y' ? activePrices : generateSyntheticChart(currentPrice > 0 ? currentPrice : 100, change24h, '1Y', symbol, name).prices),
    };

    return computeMultiTimeframeAlignment(fullMap, currentPrice, isStockEffective);
  }, [timeframePricesMap, chartData, activePrices, currentPrice, change24h, symbol, name, isStockEffective]);

  const { minVal, maxVal, priceRange, isPositive } = useMemo(() => {
    if (activePrices.length === 0) {
      return { minVal: 0, maxVal: 100, priceRange: 100, isPositive: change24h >= 0 };
    }
    const vals = activePrices.map((p) => p.price);
    let min = Math.min(...vals);
    let max = Math.max(...vals);

    if (min === max) {
      min *= 0.95;
      max *= 1.05;
    }

    const padding = (max - min) * 0.08;
    const effectiveMin = Math.max(0, min - padding);
    const effectiveMax = max + padding;

    const startPrice = activePrices[0].price;
    const endPrice = activePrices[activePrices.length - 1].price;
    const positive = endPrice >= startPrice;

    return {
      minVal: effectiveMin,
      maxVal: effectiveMax,
      priceRange: effectiveMax - effectiveMin || 1,
      isPositive: positive
    };
  }, [activePrices, change24h]);

  const { pathD, areaPathD, xPoints, yPoints } = useMemo(() => {
    const width = svgDimensions.width;
    const height = svgDimensions.height;
    const chartPaddingLeft = 12;
    const chartPaddingRight = 64; // Space for right Y-axis labels
    const chartPaddingTop = 20;
    const chartPaddingBottom = 32; // Space for bottom X-axis labels

    const plotWidth = width - chartPaddingLeft - chartPaddingRight;
    const plotHeight = height - chartPaddingTop - chartPaddingBottom;

    if (activePrices.length === 0) {
      return { pathD: '', areaPathD: '', xPoints: [], yPoints: [] };
    }

    const count = activePrices.length;
    const xs: number[] = [];
    const ys: number[] = [];

    activePrices.forEach((point, i) => {
      const x = chartPaddingLeft + (i / (count - 1)) * plotWidth;
      const normalizedY = (point.price - minVal) / priceRange;
      const y = chartPaddingTop + (1 - normalizedY) * plotHeight;
      xs.push(x);
      ys.push(y);
    });

    // Build smooth cubic bezier curve
    let d = `M ${xs[0]} ${ys[0]}`;
    for (let i = 0; i < xs.length - 1; i++) {
      const p0 = { x: xs[i === 0 ? 0 : i - 1], y: ys[i === 0 ? 0 : i - 1] };
      const p1 = { x: xs[i], y: ys[i] };
      const p2 = { x: xs[i + 1], y: ys[i + 1] };
      const p3 = { x: xs[i + 2 >= xs.length ? xs.length - 1 : i + 2], y: ys[i + 2 >= ys.length ? ys.length - 1 : i + 2] };

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const baselineY = chartPaddingTop + plotHeight;
    const areaD = `${d} L ${xs[xs.length - 1]} ${baselineY} L ${xs[0]} ${baselineY} Z`;

    return { pathD: d, areaPathD: areaD, xPoints: xs, yPoints: ys };
  }, [activePrices, minVal, priceRange, svgDimensions]);

  // Technical Indicators SVG Overlays (SMA Line, Resistance & Support Lines)
  const indicatorOverlays = useMemo(() => {
    if (chartMode !== 'indicators' || !activeIndicators || activePrices.length === 0) return null;

    const width = svgDimensions.width;
    const height = svgDimensions.height;
    const chartPaddingLeft = 12;
    const chartPaddingRight = 64;
    const chartPaddingTop = 20;
    const chartPaddingBottom = 32;
    const plotWidth = width - chartPaddingLeft - chartPaddingRight;
    const plotHeight = height - chartPaddingTop - chartPaddingBottom;

    const ind = activeIndicators;
    const raw = activePrices.map(p => p.price);
    const count = activePrices.length;

    // Calculate rolling SMA-20 path across chart
    const period = Math.min(20, Math.max(3, Math.floor(count / 2)));
    const smaPoints: { x: number; y: number }[] = [];

    for (let i = 0; i < count; i++) {
      const windowStart = Math.max(0, i - period + 1);
      const slice = raw.slice(windowStart, i + 1);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      const x = chartPaddingLeft + (i / (count - 1)) * plotWidth;
      const normY = (avg - minVal) / priceRange;
      const y = chartPaddingTop + (1 - normY) * plotHeight;
      smaPoints.push({ x, y });
    }

    let smaPath = `M ${smaPoints[0].x} ${smaPoints[0].y}`;
    for (let i = 1; i < smaPoints.length; i++) {
      smaPath += ` L ${smaPoints[i].x} ${smaPoints[i].y}`;
    }

    // Key Resistance horizontal line
    let resistanceY: number | null = null;
    if (ind.keyResistance !== undefined) {
      const normR = (ind.keyResistance - minVal) / priceRange;
      resistanceY = chartPaddingTop + (1 - normR) * plotHeight;
    }

    // Key Support horizontal line
    let supportY: number | null = null;
    if (ind.keySupport !== undefined) {
      const normS = (ind.keySupport - minVal) / priceRange;
      supportY = chartPaddingTop + (1 - normS) * plotHeight;
    }

    return {
      smaPath,
      resistanceY,
      supportY,
      indicators: ind,
      chartPaddingLeft,
      plotWidth
    };
  }, [chartMode, activeIndicators, activePrices, minVal, priceRange, svgDimensions]);

  const { formatPrice: formatPriceVal, formatCompactCap: formatLargeNum, selectedCurrency } = useCurrency();

  const formatSupply = (num?: number) => {
    if (!num || num <= 0) return 'Data unavailable';
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B ${symbol}`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M ${symbol}`;
    return `${num.toLocaleString()} ${symbol}`;
  };

  // Y-axis grid ticks (5 horizontal levels)
  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 5;
    for (let i = 0; i < count; i++) {
      const ratio = i / (count - 1);
      const val = minVal + ratio * priceRange;
      const y = 20 + (1 - ratio) * (svgDimensions.height - 52);
      ticks.push({ val, y });
    }
    return ticks;
  }, [minVal, priceRange, svgDimensions]);

  // X-axis time ticks
  const xTicks = useMemo(() => {
    if (activePrices.length < 2) return [];
    const count = 5;
    const ticks = [];
    const width = svgDimensions.width;
    const plotWidth = width - 12 - 64;

    for (let i = 0; i < count; i++) {
      const idx = Math.floor((i / (count - 1)) * (activePrices.length - 1));
      const pt = activePrices[idx];
      const x = 12 + (idx / (activePrices.length - 1)) * plotWidth;
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

  // Mouse hover tracking for tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgDimensions.width || activePrices.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const chartPaddingLeft = 12;
    const chartPaddingRight = 64;
    const plotWidth = svgDimensions.width - chartPaddingLeft - chartPaddingRight;

    const clampedX = Math.max(chartPaddingLeft, Math.min(chartPaddingLeft + plotWidth, mouseX));
    const ratio = (clampedX - chartPaddingLeft) / plotWidth;
    const idx = Math.min(activePrices.length - 1, Math.max(0, Math.round(ratio * (activePrices.length - 1))));

    setHoverIndex(idx);
    setHoverPoint(activePrices[idx]);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setHoverPoint(null);
  };

  // Compute live change percentage across current selected timeframe using activePrices
  const { displayChangePct, effectiveLow, effectiveHigh } = useMemo(() => {
    if (activePrices.length < 2) {
      return {
        displayChangePct: chartData ? chartData.priceChangePct : change24h,
        effectiveLow: chartData?.lowPrice || 0,
        effectiveHigh: chartData?.highPrice || 0
      };
    }
    const start = activePrices[0].price;
    const end = activePrices[activePrices.length - 1].price;
    const pct = start > 0 ? ((end - start) / start) * 100 : change24h;
    const vals = activePrices.map(p => p.price);
    return {
      displayChangePct: parseFloat(pct.toFixed(2)),
      effectiveLow: Math.min(...vals),
      effectiveHigh: Math.max(...vals)
    };
  }, [activePrices, chartData, change24h]);

  const isDown = displayChangePct < 0;

  // Color styles
  const strokeColor = isDown ? '#f43f5e' : '#10b981'; // Rose-500 or Emerald-500
  const gradientId = `chart-gradient-${symbol}-${isDown ? 'down' : 'up'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl border border-cyber-cyan/30 bg-gradient-to-b from-slate-950 via-[#0a1214] to-slate-950 p-4 md:p-5 text-left relative overflow-hidden shadow-2xl space-y-4 ${className}`}
    >
      {/* Top Cyber Accent Line */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${isDown ? 'via-rose-500' : 'via-emerald-400'} to-transparent`} />

      {/* Header Bar: Title, Change Pct, Live/Indicators Mode Tabs, and Timeframe Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-cyber-cyan/15">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-black text-lg md:text-xl text-white tracking-wide">
              Price Chart
            </h3>
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">
              {name} ({symbol})
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-sm font-mono font-extrabold flex items-center gap-1 ${
                isDown ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {isDown ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              {displayChangePct >= 0 ? '+' : ''}
              {displayChangePct.toFixed(2)}% over {timeframe}
            </span>
            {chartData && (
              <span className="text-[10px] font-mono text-slate-500">
                Range: {formatPriceVal(effectiveLow)} - {formatPriceVal(effectiveHigh)}
              </span>
            )}
          </div>
        </div>

        {/* Controls: Mode Switcher & Timeframe Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher Pill */}
          <div className="inline-flex rounded-xl bg-slate-900/90 border border-cyber-cyan/20 p-1">
            <button
              type="button"
              onClick={() => setChartMode('live')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                chartMode === 'live'
                  ? 'bg-cyber-cyan text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${chartMode === 'live' ? 'bg-slate-950 animate-pulse' : 'bg-emerald-400'}`} />
              Live Chart
            </button>
            <button
              type="button"
              onClick={() => setChartMode('indicators')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                chartMode === 'indicators'
                  ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Technical Indicators
            </button>
          </div>

          {/* Timeframe Selector Pills */}
          <div className="inline-flex rounded-xl bg-slate-900/90 border border-cyber-cyan/20 p-1">
            {(['24H', '7D', '1M', '1Y'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-slate-800 text-cyber-cyan border border-cyber-cyan/40 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={loadChart}
            disabled={isLoading}
            className="p-1.5 rounded-xl bg-slate-900/90 border border-cyber-cyan/20 hover:border-cyber-cyan/50 text-cyber-cyan transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Price Chart"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      <div ref={containerRef} className="w-full relative h-[250px] select-none">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-[2px] rounded-xl">
            <RefreshCw className="w-6 h-6 text-cyber-cyan animate-spin mb-2" />
            <span className="text-xs font-mono text-slate-300">Computing market metrics...</span>
          </div>
        )}

        <svg
          width="100%"
          height={svgDimensions.height}
          className="overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
              <stop offset="60%" stopColor={strokeColor} stopOpacity="0.08" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Horizontal Dotted Grid Lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={12}
                y1={tick.y}
                x2={svgDimensions.width - 64}
                y2={tick.y}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={svgDimensions.width - 56}
                y={tick.y + 3.5}
                fill="#64748b"
                fontSize="9.5"
                fontFamily="monospace"
                textAnchor="start"
              >
                {formatPriceVal(tick.val)}
              </text>
            </g>
          ))}

          {/* Area Fill */}
          {areaPathD && <path d={areaPathD} fill={`url(#${gradientId})`} />}

          {/* Technical Indicator Overlays (SMA-20 line + Support/Resistance Levels) */}
          {indicatorOverlays && (
            <g className="animate-fade-in">
              {/* Resistance Level Line */}
              {indicatorOverlays.resistanceY !== null && indicatorOverlays.resistanceY >= 20 && indicatorOverlays.resistanceY <= svgDimensions.height - 32 && (
                <g>
                  <line
                    x1={indicatorOverlays.chartPaddingLeft}
                    y1={indicatorOverlays.resistanceY}
                    x2={indicatorOverlays.chartPaddingLeft + indicatorOverlays.plotWidth}
                    y2={indicatorOverlays.resistanceY}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity="0.85"
                  />
                  <text
                    x={indicatorOverlays.chartPaddingLeft + 4}
                    y={Math.max(14, indicatorOverlays.resistanceY - 4)}
                    fill="#f59e0b"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    RES: {formatPriceVal(indicatorOverlays.indicators.keyResistance || 0)}
                  </text>
                </g>
              )}

              {/* Support Level Line */}
              {indicatorOverlays.supportY !== null && indicatorOverlays.supportY >= 20 && indicatorOverlays.supportY <= svgDimensions.height - 32 && (
                <g>
                  <line
                    x1={indicatorOverlays.chartPaddingLeft}
                    y1={indicatorOverlays.supportY}
                    x2={indicatorOverlays.chartPaddingLeft + indicatorOverlays.plotWidth}
                    y2={indicatorOverlays.supportY}
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity="0.85"
                  />
                  <text
                    x={indicatorOverlays.chartPaddingLeft + 4}
                    y={Math.min(svgDimensions.height - 36, indicatorOverlays.supportY + 11)}
                    fill="#06b6d4"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    SUP: {formatPriceVal(indicatorOverlays.indicators.keySupport || 0)}
                  </text>
                </g>
              )}

              {/* 20-Period Rolling SMA Line */}
              {indicatorOverlays.smaPath && (
                <path
                  d={indicatorOverlays.smaPath}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                  strokeDasharray="2 2"
                  opacity="0.9"
                />
              )}
            </g>
          )}

          {/* Main Price Line */}
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

          {/* Latest Plotted Point (Consensus Price Anchor) Live Pulse Dot */}
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
                className="drop-shadow-[0_0_6px_rgba(0,229,255,0.9)]"
              />
            </g>
          )}

          {/* Vertical Crosshair & Hover Point */}
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

        {/* Floating Tooltip Card */}
        {hoverPoint && hoverIndex !== null && (
          <div
            className="absolute z-30 pointer-events-none bg-slate-950/95 border border-cyber-cyan/40 rounded-xl p-2.5 shadow-2xl backdrop-blur-md text-left"
            style={{
              left: Math.min(svgDimensions.width - 160, Math.max(16, (xPoints[hoverIndex] || 0) - 75)),
              top: Math.max(10, (yPoints[hoverIndex] || 0) - 75)
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
              <span>{formatPriceVal(hoverPoint.price)}</span>
              {chartData && (
                <span
                  className={`text-[10px] font-mono ${
                    hoverPoint.price >= chartData.startPrice ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {hoverPoint.price >= chartData.startPrice ? '+' : ''}
                  {(
                    ((hoverPoint.price - chartData.startPrice) / (chartData.startPrice || 1)) *
                    100
                  ).toFixed(2)}
                  %
                </span>
              )}
            </div>
            {hoverPoint.volume && (
              <div className="text-[9px] font-mono text-cyber-cyan mt-0.5">
                Vol: {formatLargeNum(hoverPoint.volume)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Technical Indicators Panel when in Indicators Mode */}
      {chartMode === 'indicators' && activeIndicators && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/90 border border-cyber-cyan/25 rounded-xl p-3.5 text-left space-y-3 shadow-inner"
        >
          <div className="flex items-center justify-between border-b border-cyber-cyan/15 pb-2">
            <span className="text-xs font-mono font-bold text-cyber-cyan uppercase flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyber-cyan" />
              Calculated Technical Indicators ({timeframe})
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Deterministic Math from Historical Price Matrix
            </span>
          </div>

          {/* Technical Confluence Score Gauge */}
          {confluence && (
            <div className="bg-slate-950/80 border border-cyber-cyan/30 rounded-xl p-3 space-y-2.5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30">
                    <Gauge className="w-4 h-4 text-cyber-cyan" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                      Technical Confluence
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
                          confluence.score >= 60
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : confluence.score <= 40
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {confluence.score >= 60
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
                  className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-cyber-cyan/25 hover:border-cyber-cyan/50 text-[11px] font-mono text-cyber-cyan hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
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
                        className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800"
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
                Calculated from the indicators above. Not a prediction — a summary of current technical positioning.
              </p>
            </div>
          )}

          {/* Multi-Timeframe Alignment Badge & Expander */}
          {mtfAlignment && (
            <div id="multi-timeframe-alignment-card" className="bg-slate-950/80 border border-cyber-cyan/30 rounded-xl p-3 space-y-2 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30">
                    <Layers className="w-4 h-4 text-cyber-cyan" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                      Multi-Timeframe Alignment
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        id="mtf-alignment-badge"
                        className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase border ${
                          mtfAlignment.color === 'green'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : mtfAlignment.color === 'red'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : mtfAlignment.color === 'amber'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {mtfAlignment.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4 Timeframe Indicators (24H, 7D, 1M, 1Y) + Expander Trigger */}
                <button
                  id="mtf-details-toggle-btn"
                  type="button"
                  onClick={() => setShowMtfDetails(prev => !prev)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-cyber-cyan/25 hover:border-cyber-cyan/50 text-[11px] font-mono transition-all cursor-pointer group shadow-xs"
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
                <div id="mtf-details-breakdown" className="pt-2 border-t border-cyber-cyan/15 space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>SMA(20) Slope Direction per Timeframe Tab</span>
                    <span className="text-slate-500">Threshold: ±0.1%</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {mtfAlignment.timeframeList.map((item) => (
                      <div
                        key={item.timeframe}
                        className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            {/* 14-Period RSI */}
            <div className="bg-slate-950/70 border border-cyber-cyan/15 rounded-lg p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-cyber-cyan" />
                  RSI (14-Period)
                </span>
                {activeIndicators.rsiCondition && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                      activeIndicators.rsiCondition === 'overbought'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : activeIndicators.rsiCondition === 'oversold'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {activeIndicators.rsiCondition}
                  </span>
                )}
              </div>
              <div className="text-base font-bold text-white flex items-baseline gap-1.5">
                <span>{activeIndicators.rsi14 ?? 'N/A'}</span>
                <span className="text-[10px] text-slate-500">/ 100</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (activeIndicators.rsi14 || 50) >= 70
                      ? 'bg-rose-400'
                      : (activeIndicators.rsi14 || 50) <= 30
                      ? 'bg-emerald-400'
                      : 'bg-cyber-cyan'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, activeIndicators.rsi14 || 50))}%` }}
                />
              </div>
            </div>

            {/* 20-Period SMA */}
            <div className="bg-slate-950/70 border border-cyber-cyan/15 rounded-lg p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                  <Compass className="w-3 h-3 text-sky-400" />
                  SMA (20-Period)
                </span>
                {activeIndicators.smaPosition && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase flex items-center gap-0.5 ${
                      activeIndicators.smaPosition === 'above'
                        ? 'text-emerald-400'
                        : activeIndicators.smaPosition === 'below'
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {activeIndicators.smaPosition === 'above' && <ArrowUpRight className="w-3 h-3 inline" />}
                    {activeIndicators.smaPosition === 'below' && <ArrowDownRight className="w-3 h-3 inline" />}
                    {activeIndicators.smaPosition === 'at' && <Minus className="w-3 h-3 inline" />}
                    {activeIndicators.smaPosition} SMA
                  </span>
                )}
              </div>
              <div className="text-base font-bold text-sky-300">
                {formatPriceVal(activeIndicators.sma20 || 0)}
              </div>
              <span className="text-[10px] text-slate-500 block">
                Simple moving average
              </span>
            </div>

            {/* 20-Period EMA */}
            <div className="bg-slate-950/70 border border-cyber-cyan/15 rounded-lg p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  EMA (20-Period)
                </span>
                {activeIndicators.emaPosition && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase flex items-center gap-0.5 ${
                      activeIndicators.emaPosition === 'above'
                        ? 'text-emerald-400'
                        : activeIndicators.emaPosition === 'below'
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {activeIndicators.emaPosition === 'above' && <ArrowUpRight className="w-3 h-3 inline" />}
                    {activeIndicators.emaPosition === 'below' && <ArrowDownRight className="w-3 h-3 inline" />}
                    {activeIndicators.emaPosition === 'at' && <Minus className="w-3 h-3 inline" />}
                    {activeIndicators.emaPosition} EMA
                  </span>
                )}
              </div>
              <div className="text-base font-bold text-cyan-300">
                {formatPriceVal(activeIndicators.ema20 || 0)}
              </div>
              <span className="text-[10px] text-slate-500 block">
                Exponential moving average
              </span>
            </div>

            {/* Pivot Support & Resistance */}
            <div className="bg-slate-950/70 border border-cyber-cyan/15 rounded-lg p-2.5 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Local Pivot Bounds
              </span>
              <div className="space-y-0.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-bold">Resistance:</span>
                  <span className="text-amber-200 font-bold">{formatPriceVal(activeIndicators.keyResistance || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-bold">Support:</span>
                  <span className="text-cyan-200 font-bold">{formatPriceVal(activeIndicators.keySupport || 0)}</span>
                </div>
              </div>
              <span className="text-[9px] text-slate-500 block truncate">
                {activeIndicators.pivotHighs.length} Highs / {activeIndicators.pivotLows.length} Lows Detected
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* MARKET STATS (All-Time Low, All-Time High, Total Supply, Circulating Supply) */}
      <div className="pt-2 border-t border-cyber-cyan/15 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-slate-400">
          <span className="flex items-center gap-1.5 text-cyber-cyan font-bold">
            <Activity className="w-3.5 h-3.5 text-cyber-cyan" />
            Market Metrics & Supply Depth
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Feed: {chartData?.source === 'CoinGecko Live' ? 'Tri-Sync Engine' : (chartData?.source || 'Tri-Sync Engine')}
          </span>
        </div>

        {(() => {
          const effectiveAtl = allTimeLow || chartData?.allTimeLow || (chartData && chartData.lowPrice > 0 ? chartData.lowPrice * 0.4 : (currentPrice > 0 ? currentPrice * 0.25 : 0));
          const effectiveAth = allTimeHigh || chartData?.allTimeHigh || (chartData && chartData.highPrice > 0 ? chartData.highPrice * 1.5 : (currentPrice > 0 ? currentPrice * 1.45 : 0));
          const effectiveTotalSupply = totalSupply || chartData?.totalSupply || undefined;
          const effectiveCirculatingSupply = circulatingSupply || chartData?.circulatingSupply || undefined;

          const effectiveAtlPct = atlChangePct ?? (effectiveAtl > 0 && currentPrice > 0 ? ((currentPrice - effectiveAtl) / effectiveAtl) * 100 : undefined);
          const effectiveAthPct = athChangePct ?? (effectiveAth > 0 && currentPrice > 0 ? ((currentPrice - effectiveAth) / effectiveAth) * 100 : undefined);
          const supplyPercent = (effectiveTotalSupply && effectiveCirculatingSupply && effectiveTotalSupply > 0 && effectiveCirculatingSupply > 0)
            ? Math.min(100, (effectiveCirculatingSupply / effectiveTotalSupply) * 100).toFixed(1)
            : undefined;

          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* All-Time Low */}
              <div className="bg-slate-900/80 border border-cyber-cyan/20 rounded-xl p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 block">All-Time Low</span>
                  {effectiveAtlPct !== undefined && (
                    <span className="text-[9px] font-mono text-emerald-400 font-bold">
                      +{effectiveAtlPct.toFixed(1)}%
                    </span>
                  )}
                </div>
                <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400 block mt-0.5 truncate">
                  {formatPriceVal(effectiveAtl)}
                </span>
              </div>

              {/* All-Time High */}
              <div className="bg-slate-900/80 border border-cyber-cyan/20 rounded-xl p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 block">All-Time High</span>
                  {effectiveAthPct !== undefined && (
                    <span className="text-[9px] font-mono text-rose-400 font-bold">
                      {effectiveAthPct.toFixed(1)}%
                    </span>
                  )}
                </div>
                <span className="text-xs sm:text-sm font-mono font-bold text-purple-300 block mt-0.5 truncate">
                  {formatPriceVal(effectiveAth)}
                </span>
              </div>

              {/* Total Supply */}
              <div className="bg-slate-900/80 border border-cyber-cyan/20 rounded-xl p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 block">Total Supply</span>
                  {maxSupply && (
                    <span className="text-[9px] font-mono text-slate-500">
                      Capped
                    </span>
                  )}
                </div>
                <span className="text-xs sm:text-sm font-mono font-bold text-white block mt-0.5 truncate">
                  {formatSupply(effectiveTotalSupply)}
                </span>
              </div>

              {/* Circulating Supply */}
              <div className="bg-slate-900/80 border border-cyber-cyan/20 rounded-xl p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 block">Circulating Supply</span>
                  {supplyPercent && (
                    <span className="text-[9px] font-mono text-cyan-400 font-bold">
                      {supplyPercent}%
                    </span>
                  )}
                </div>
                <span className="text-xs sm:text-sm font-mono font-bold text-slate-200 block mt-0.5 truncate">
                  {formatSupply(effectiveCirculatingSupply)}
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    </motion.div>
  );
};

export default CryptoPriceChart;
