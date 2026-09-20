import { CryptoReview } from '../types';

const DEFILLAMA_TVL_API = 'https://api.llama.fi/tvl';

const tvlCache = new Map<string, { value: number | null; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

interface DefiLlamaProtocolEntry {
  id?: string;
  name?: string;
  slug?: string;
  symbol?: string;
  gecko_id?: string | null;
  tvl?: number | null;
}

let protocolsCache: { data: DefiLlamaProtocolEntry[]; timestamp: number } | null = null;
const PROTOCOLS_CACHE_TTL_MS = 15 * 60 * 1000;

async function fetchProtocolsList(): Promise<DefiLlamaProtocolEntry[]> {
  if (protocolsCache && Date.now() - protocolsCache.timestamp < PROTOCOLS_CACHE_TTL_MS) {
    return protocolsCache.data;
  }
  try {
    const res = await fetch('https://api.llama.fi/protocols');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        protocolsCache = { data, timestamp: Date.now() };
        return data;
      }
    }
  } catch (err) {
    console.warn('[DefiLlama API] Failed to fetch protocols list:', err);
  }
  return protocolsCache ? protocolsCache.data : [];
}

export async function fetchDefiLlamaTvl(slug: string): Promise<number | null> {
  if (!slug) return null;
  const cleanSlug = slug.trim().toLowerCase();

  const cached = tvlCache.get(cleanSlug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
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

export async function resolveProtocolTvl(params: {
  slug?: string;
  name?: string;
  symbol?: string;
  id?: string;
}): Promise<{ tvl: number | null; resolvedSlug?: string }> {
  const candidates: string[] = [];

  if (params.slug) {
    candidates.push(params.slug.trim().toLowerCase());
  }

  if (params.name) {
    const cleanName = params.name.trim().toLowerCase();
    candidates.push(cleanName);
    candidates.push(cleanName.replace(/[^a-z0-9]+/g, '-'));
    candidates.push(cleanName.replace(/[^a-z0-9]/g, ''));
    const stripped = cleanName.replace(/\s+(dao|protocol|finance|network|exchange|token|dex|v\d+|bridge)/g, '').trim();
    if (stripped && stripped !== cleanName) {
      candidates.push(stripped);
      candidates.push(stripped.replace(/[^a-z0-9]+/g, '-'));
      candidates.push(stripped.replace(/[^a-z0-9]/g, ''));
    }
  }

  if (params.id) {
    const cleanId = params.id.trim().toLowerCase();
    candidates.push(cleanId);
    candidates.push(cleanId.replace(/-(dao|protocol|finance|token|exchange|network)/g, ''));
  }

  if (params.symbol) {
    candidates.push(params.symbol.trim().toLowerCase());
  }

  const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));

  for (const c of uniqueCandidates) {
    const val = await fetchDefiLlamaTvl(c);
    if (val !== null && val >= 0) {
      return { tvl: val, resolvedSlug: c };
    }
  }

  const protocols = await fetchProtocolsList();
  if (protocols.length > 0) {
    const cleanName = (params.name || '').trim().toLowerCase();
    const cleanSym = (params.symbol || '').trim().toLowerCase();
    const cleanId = (params.id || '').trim().toLowerCase();
    const baseName = cleanName.replace(/\s+(dao|protocol|finance|network|exchange|token|dex|v\d+|bridge)/g, '').trim();

    let matched: DefiLlamaProtocolEntry | undefined;

    if (cleanId) {
      matched = protocols.find(p => p.gecko_id && p.gecko_id.toLowerCase() === cleanId);
    }

    if (!matched && cleanName) {
      matched = protocols.find(p => p.slug === cleanName || (p.name && p.name.toLowerCase() === cleanName));
    }

    if (!matched && baseName) {
      matched = protocols.find(p => p.slug === baseName || (p.name && p.name.toLowerCase() === baseName));
    }

    if (!matched && cleanSym && baseName) {
      const symMatches = protocols.filter(p =>
        p.symbol &&
        p.symbol.toLowerCase() === cleanSym &&
        ((p.name && p.name.toLowerCase().includes(baseName)) || (p.slug && p.slug.includes(baseName)))
      );
      if (symMatches.length > 0) {
        matched = symMatches.sort((a, b) => (b.tvl || 0) - (a.tvl || 0))[0];
      }
    }

    if (!matched && baseName && baseName.length >= 3) {
      const nameMatches = protocols.filter(p =>
        (p.name && p.name.toLowerCase().includes(baseName)) ||
        (p.slug && p.slug.includes(baseName))
      );
      if (nameMatches.length > 0) {
        matched = nameMatches.sort((a, b) => (b.tvl || 0) - (a.tvl || 0))[0];
      }
    }

    if (matched && matched.slug) {
      const tvlFromSlug = await fetchDefiLlamaTvl(matched.slug);
      if (tvlFromSlug !== null) {
        return { tvl: tvlFromSlug, resolvedSlug: matched.slug };
      }
      if (typeof matched.tvl === 'number' && !isNaN(matched.tvl)) {
        return { tvl: matched.tvl, resolvedSlug: matched.slug };
      }
    }
  }

  return { tvl: null };
}

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

export async function enrichReviewWithDefiLlamaTvl(review: CryptoReview): Promise<CryptoReview> {
  const resolved = await resolveProtocolTvl({
    slug: review.defiLlamaSlug,
    name: review.name,
    symbol: review.symbol,
    id: review.id
  });

  const tvlValue = resolved.tvl;
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
    defiLlamaSlug: resolved.resolvedSlug || review.defiLlamaSlug,
    proBenchmarks: updatedBenchmarks
  };
}
