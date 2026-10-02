/**
 * Deterministic asset_key generation for Market Intelligence assets and snapshots.
 *
 * Rules:
 * 1. Prefer coingeckoId when available (e.g. 'solana', 'bitcoin', 'hyperliquid').
 * 2. Otherwise use "${network}:${contractAddress}" when contractAddress is available.
 * 3. For legacy or native assets without coingeckoId or contractAddress, use "${network}:${symbol}"
 *    as a deterministic fallback without silently merging conflicting assets across different chains.
 */
export function getAssetKey(asset: {
  coingeckoId?: string | null;
  network?: string | null;
  contractAddress?: string | null;
  symbol: string;
}): string {
  if (asset.coingeckoId && asset.coingeckoId.trim()) {
    return asset.coingeckoId.trim().toLowerCase();
  }
  if (asset.network && asset.contractAddress && asset.contractAddress.trim()) {
    return `${asset.network.trim().toLowerCase()}:${asset.contractAddress.trim().toLowerCase()}`;
  }
  if (asset.network && asset.network.trim()) {
    return `${asset.network.trim().toLowerCase()}:${asset.symbol.trim().toLowerCase()}`;
  }
  return asset.symbol.trim().toLowerCase();
}
