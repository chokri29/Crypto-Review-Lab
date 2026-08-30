/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CryptoReview } from '../types';

const DEFILLAMA_TVL_API = 'https://api.llama.fi/tvl';

// In-memory cache for TVL values to prevent redundant network calls
const tvlCache = new Map<string, { value: number | null; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches real Total Value Locked (TVL) in USD from DefiLlama's public API.
 * @param slug DefiLlama protocol slug (e.g. "hyperliquid", "uniswap")
 * @returns TVL as a number, or null if not found or not listed
 */
export async function fetchDefiLlamaTvl(slug: string): Promise<number | null> {
  if (!slug) return null;
  const cleanSlug = slug.trim().toLowerCase();

  const cached = tvlCache.get(cleanSlug);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.value;
  }

  try {
    const res = await fetch(`${DEFILLAMA_TVL_API}/${cleanSlug}`);
    if (res.ok) {
      const text = await res.text();
      const parsed = parseFloat(text);
      if (!isNaN(parsed) && parsed >= 0) {
        tvlCache.set(cleanSlug, { value: parsed, timestamp: Date.now() });
        return parsed;
      }
    }

    // Secondary fallback: /protocol/{slug}
    const pRes = await fetch(`https://api.llama.fi/protocol/${cleanSlug}`);
    if (pRes.ok) {
      const pData = await pRes.json();
      if (pData && typeof pData.tvl === 'number' && !isNaN(pData.tvl)) {
        tvlCache.set(cleanSlug, { value: pData.tvl, timestamp: Date.now() });
        return pData.tvl;
      }
    }

    tvlCache.set(cleanSlug, { value: null, timestamp: Date.now() });
    return null;
  } catch (err) {
    console.warn(`[DefiLlama API] Failed to fetch TVL for slug ${cleanSlug}:`, err);
    return null;
  }
}

/**
 * Formats TVL value into USD string or 'TVL data not available'
 */
export function formatDefiLlamaTvl(tvl: number | null | undefined): string {
  if (tvl === null || tvl === undefined || isNaN(tvl) || tvl < 0) {
    return 'TVL data not available';
  }
  if (tvl >= 1e9) {
    return `$${(tvl / 1e9).toFixed(2)}B`;
  }
  if (tvl >= 1e6) {
    return `$${(tvl / 1e6).toFixed(2)}M`;
  }
  if (tvl >= 1e3) {
    return `$${(tvl / 1e3).toFixed(2)}K`;
  }
  return `$${tvl.toFixed(2)}`;
}

/**
 * Enriches a CryptoReview with real DefiLlama TVL data
 */
export async function enrichReviewWithDefiLlamaTvl(review: CryptoReview): Promise<CryptoReview> {
  if (!review.defiLlamaSlug) {
    return {
      ...review,
      realTvl: null,
      proBenchmarks: review.proBenchmarks ? {
        ...review.proBenchmarks,
        symbolicExecutionMatrix: {
          ...review.proBenchmarks.symbolicExecutionMatrix,
          tvlStressLimit: 'TVL data not available'
        }
      } : undefined
    };
  }

  const tvlValue = await fetchDefiLlamaTvl(review.defiLlamaSlug);
  const formatted = formatDefiLlamaTvl(tvlValue);

  const updatedBenchmarks = review.proBenchmarks ? {
    ...review.proBenchmarks,
    symbolicExecutionMatrix: {
      ...review.proBenchmarks.symbolicExecutionMatrix,
      tvlStressLimit: tvlValue !== null ? `Real TVL: ${formatted}` : 'TVL data not available'
    }
  } : undefined;

  return {
    ...review,
    realTvl: tvlValue,
    proBenchmarks: updatedBenchmarks
  };
}
