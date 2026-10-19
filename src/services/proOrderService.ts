/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  ProOrder, 
  ProOrderEmailLog, 
  HumanReviewNotes, 
  CryptoReview, 
  PRINCIPAL_EMAIL, 
  AdminOverrideLog,
  ProOrderPaymentStatus,
  NowPaymentsIpnLog,
  CryptoAuditSignature
} from '../types';
import { runPhaseTwoReControl, autoCalibrateAndRegenerateDraft } from './reControlEngine';
import { runF3Verification, isF2GatePassed, regenerateNarrativeAfterVerification } from './f3Engine';
import { computeMultiSourceConvergence } from './marketConvergence';
import { signAuditReportServerSide } from './auditSigner';
import fs from 'fs';
import path from 'path';

export type { ProOrder, ProOrderEmailLog, HumanReviewNotes, ProOrderPaymentStatus, NowPaymentsIpnLog };
export { PRINCIPAL_EMAIL };

const isNodeEnv = typeof process !== 'undefined' && typeof process.cwd === 'function' && typeof window === 'undefined';
const ORDERS_FILE_PATH = isNodeEnv && path && typeof path.join === 'function' ? path.join(process.cwd(), 'pro_orders.json') : '';

function loadOrdersFromFile(): ProOrder[] {
  try {
    if (isNodeEnv && fs && typeof fs.existsSync === 'function' && ORDERS_FILE_PATH && fs.existsSync(ORDERS_FILE_PATH)) {
      try {
        const raw = fs.readFileSync(ORDERS_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (err) {
        console.error("Failed to parse orders from pro_orders.json:", err);
      }
    }
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('crl_pro_orders');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {}
    }
    return [];
  } catch (e) {
    console.error("Failed to load pro orders:", e);
    return [];
  }
}

function saveOrdersToFile(orders: ProOrder[]): void {
  try {
    if (isNodeEnv && fs && typeof fs.writeFileSync === 'function' && ORDERS_FILE_PATH) {
      fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(orders, null, 2), 'utf-8');
    } else if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('crl_pro_orders', JSON.stringify(orders));
    }
  } catch (e) {
    console.error("Failed to save pro orders:", e);
  }
}

export function isOrderReferencePattern(id: string): boolean {
  if (!id) return false;
  const clean = id.trim().toLowerCase();
  return /^crl-\d+/i.test(clean) || /^ref-/i.test(clean);
}

export function matchesStoredProOrder(id: string): boolean {
  if (!id) return false;
  const clean = id.trim().toLowerCase();
  const all = getAllOrders();
  return all.some(o => 
    (o.orderId && o.orderId.toLowerCase() === clean) ||
    ((o as any).id && (o as any).id.toLowerCase() === clean) ||
    ((o as any).refId && (o as any).refId.toLowerCase() === clean) ||
    ((o as any).auditRefId && (o as any).auditRefId.toLowerCase() === clean) ||
    (o.systemDraft?.id && o.systemDraft.id.toLowerCase() === clean) ||
    (o.finalReview?.id && o.finalReview.id.toLowerCase() === clean)
  );
}

// FILE_TOO_LARGE_USE_PUSH - truncated intentionally for intermediate step
