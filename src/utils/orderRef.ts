/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ProOrder } from '../types';

const PRO_ORDERS_STORAGE_KEY = 'crl_pro_orders';

export function isOrderReferencePattern(id: string): boolean {
  if (!id) return false;
  const clean = id.trim().toLowerCase();
  return /^crl-\d+/i.test(clean) || /^ref-/i.test(clean);
}

export function matchesStoredProOrder(id: string): boolean {
  if (!id || typeof window === 'undefined' || !window.localStorage) return false;
  const clean = id.trim().toLowerCase();
  try {
    const raw = localStorage.getItem(PRO_ORDERS_STORAGE_KEY);
    if (!raw) return false;
    const all = JSON.parse(raw);
    if (!Array.isArray(all)) return false;
    return all.some((o: any) =>
      (o?.orderId && String(o.orderId).toLowerCase() === clean) ||
      (o?.id && String(o.id).toLowerCase() === clean) ||
      (o?.refId && String(o.refId).toLowerCase() === clean) ||
      (o?.auditRefId && String(o.auditRefId).toLowerCase() === clean) ||
      (o?.systemDraft?.id && String(o.systemDraft.id).toLowerCase() === clean) ||
      (o?.finalReview?.id && String(o.finalReview.id).toLowerCase() === clean)
    );
  } catch {
    return false;
  }
}

export async function saveOrderToStorage(order: ProOrder): Promise<void> {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = localStorage.getItem(PRO_ORDERS_STORAGE_KEY);
    const current: ProOrder[] = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(current) ? current : [];
    const existingIndex = list.findIndex(
      (o) => o?.orderId && o.orderId.toLowerCase() === order.orderId.toLowerCase()
    );
    if (existingIndex >= 0) {
      list[existingIndex] = order;
    } else {
      list.unshift(order);
    }
    localStorage.setItem(PRO_ORDERS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to persist Pro order in localStorage:', err);
  }
}
