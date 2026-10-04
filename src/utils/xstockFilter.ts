/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Known symbols representing tokenized stock certificates (xStocks).
 * These assets track traditional equities/ETFs and belong strictly in the dedicated xStocks panel.
 */
export const KNOWN_XSTOCK_SYMBOLS = new Set([
  'AAPLX',
  'TSLAX',
  'NVDAX',
  'METAX',
  'GOOGLX',
  'MSFTX',
  'AMZNX',
  'COINX',
  'HOODX',
  'QQQX',
  'SPYX',
  'MSTRX',
  'CRCLX',
  'BSPX',
  'STRCX'
]);

/**
 * Deterministically checks whether an asset is a tokenized stock (xStock) rather than a cryptocurrency.
 */
export function isXStockAsset(asset: {
  symbol?: string | null;
  name?: string | null;
  category?: string | null;
  coingeckoId?: string | null;
}): boolean {
  if (!asset) return false;
  const sym = (asset.symbol || '').toUpperCase().trim();
  const name = (asset.name || '').toLowerCase().trim();
  const cat = (asset.category || '').toLowerCase().trim();
  const cgId = (asset.coingeckoId || '').toLowerCase().trim();

  if (KNOWN_XSTOCK_SYMBOLS.has(sym)) return true;
  if (name.includes('xstock') || name.includes('tokenized stock') || name.includes('tokenized equity')) return true;
  if (cat.includes('tokenized stock') || cat.includes('tokenized equity') || cat === 'xstock') return true;
  if (cgId.includes('xstock') || cgId.includes('backed-')) return true;

  return false;
}
