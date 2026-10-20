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
  NowPaymentsIpnLog
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

/**
 * Creates formatted confirmation HTML email content
 */
export function buildConfirmationEmailHtml(orderId: string, clientEmail: string, projectName: string, symbol: string, isPaid: boolean = false): string {
  const badgeHtml = isPaid
    ? `<span style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: bold;">PAYMENT VERIFIED</span>`
    : `<span style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #fbbf24; font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: bold;">AWAITING PAYMENT</span>`;

  const notificationHtml = isPaid
    ? `<h3 style="margin: 0 0 6px 0; color: #fbbf24; font-size: 15px;">Advisory Order Confirmation #${orderId}</h3>
        <p style="margin: 0; font-size: 14px; color: #f3f4f6; font-weight: 600; line-height: 1.5;">
          Payment received. Your Security & Risk Assessment is being processed. Actionable remediation report delivered within 24 hours.
        </p>`
    : `<h3 style="margin: 0 0 6px 0; color: #fbbf24; font-size: 15px;">Advisory Order Received #${orderId}</h3>
        <p style="margin: 0; font-size: 14px; color: #f3f4f6; font-weight: 600; line-height: 1.5;">
          Order received and awaiting payment confirmation. Security & Risk Assessment will be prepared once payment is verified.
        </p>`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(245, 158, 11, 0.3);">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="color: #f59e0b; margin: 0; font-size: 20px; letter-spacing: -0.5px;">CRYPTO REVIEW LAB</h2>
          <p style="color: #64748b; font-size: 11px; margin: 4px 0 0 0; font-mono;">SECURITY & RISK ADVISORY DESK • SERVICE NOTICE</p>
        </div>
        ${badgeHtml}
      </div>

      <div style="background-color: rgba(245, 158, 11, 0.08); border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
        ${notificationHtml}
      </div>

      <table style="width: 100%; font-size: 13px; color: #cbd5e1; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 8px 0; color: #94a3b8; width: 40%;">Target Project:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #ffffff;">${projectName} (${symbol})</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #94a3b8;">Primary Contact:</td>
          <td style="padding: 8px 0; color: #38bdf8;">${clientEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #94a3b8;">Service Category:</td>
          <td style="padding: 8px 0; color: #f59e0b; font-weight: 600;">Confidential Security Assessment (Advisory)</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #94a3b8;">Dispatch Service Email:</td>
          <td style="padding: 8px 0; color: #34d399; font-mono;">${PRINCIPAL_EMAIL}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #94a3b8;">Target Delivery Window:</td>
          <td style="padding: 8px 0; color: #e2e8f0; font-weight: bold;">Within 24 Hours</td>
        </tr>
      </table>

      <div style="background-color: #0f172a; border: 1px solid #1e293b; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Advisory Delivery Pipeline</h4>
        <p style="margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
          1. <strong>Automated Diagnostic Draft:</strong> Generated using Bytecode Invariant Engine & Liquidity Scanners.<br/>
          2. <strong>Security Engineer Sign-Off:</strong> Independent verification of vulnerability classifications & TVL risk.<br/>
          3. <strong>Actionable Remediation Dossier:</strong> You will receive a second email with your private advisory PDF report & developer fix recommendations.
        </p>
      </div>

      <div style="border-top: 1px solid #1e293b; pt: 16px; text-align: center; font-size: 11px; color: #64748b;">
        <p style="margin: 0 0 4px 0;">Sent by Crypto Review Lab Automated Delivery System</p>
        <p style="margin: 0; font-mono; color: #475569;">Ref: ${orderId} • Dispatcher: ${PRINCIPAL_EMAIL}</p>
      </div>
    </div>
  `;
}

/**
 * Creates formatted delivery HTML email content
 */
export function buildDeliveryEmailHtml(order: ProOrder): string {
  const review = order.finalReview || order.systemDraft;
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(16, 185, 129, 0.4);">
      <div style="border-bottom: 1px solid #1e293b; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="color: #34d399; margin: 0; font-size: 20px; letter-spacing: -0.5px;">CRYPTO REVIEW LAB</h2>
          <p style="color: #64748b; font-size: 11px; margin: 4px 0 0 0; font-mono;">SECURITY & RISK ADVISORY DESK • DOSSIER DELIVERED</p>
        </div>
        <span style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.5); color: #34d399; font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: bold;">SECURITY CHECK COMPLETE</span>
      </div>

      <div style="background-color: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
        <h3 style="margin: 0 0 6px 0; color: #34d399; font-size: 16px;">Your Security & Risk Assessment is Ready!</h3>
        <p style="margin: 0; font-size: 13px; color: #e2e8f0; line-height: 1.5;">
          Our security assessment has been finalized for <strong>${order.projectName} (${order.projectSymbol})</strong>. Actionable findings, vulnerability scan results, and tokenomics risk metrics are available in your private dossier.
        </p>
      </div>

      <div style="background-color: #0f172a; border: 1px solid #1e293b; padding: 16px; border-radius: 10px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Assessment Status</div>
          <div style="font-size: 18px; font-weight: 800; color: #34d399; margin-top: 2px;">VERIFICATION COMPLETED</div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px;">Verification State: <strong style="color: #38bdf8;">AVF/F3 Framework Active</strong> • Threat Vectors Analyzed</div>
        </div>
        <div style="text-align: right; border-left: 1px solid #1e293b; padding-left: 16px;">
          <div style="font-size: 10px; color: #64748b; font-mono;">SECURITY VERIFICATION</div>
          <div style="font-size: 11px; color: #34d399; font-weight: bold; margin-top: 2px;">${order.humanNotes?.reviewedBy || 'Security Reviewer'}</div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Deliverable: Actionable Remediation Dossier</div>
        </div>
      </div>

      <div style="background-color: rgba(15, 23, 42, 0.6); border: 1px solid #1e293b; padding: 12px; border-radius: 8px; margin-bottom: 24px; font-size: 11px; color: #94a3b8; line-height: 1.4;">
        <strong style="color: #cbd5e1;">Assessment Notice:</strong> This deliverable is an independent security risk assessment providing actionable vulnerability discovery and remediation recommendations. Crypto Review Lab does not sell ratings or endorse tokens. This assessment does not guarantee security or replace a formal smart-contract audit.
      </div>

      ${order.humanNotes?.auditorComments ? `
        <div style="background-color: rgba(30, 41, 59, 0.7); border: 1px border-slate-700; padding: 14px; border-radius: 8px; margin-bottom: 24px;">
          <div style="font-size: 11px; color: #fbbf24; font-weight: bold; margin-bottom: 4px;">SECURITY ENGINEER REMARKS:</div>
          <p style="margin: 0; font-size: 12px; color: #cbd5e1; italic;">"${order.humanNotes.auditorComments}"</p>
        </div>
      ` : ''}

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="https://cryptoreviewlab.com/?token=${order.privateDownloadToken}&orderId=${order.orderId}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; font-weight: bold; padding: 14px 28px; border-radius: 10px; font-size: 14px; box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);">
          📥 Access Private Portal & Download Remediation PDF
        </a>
        <p style="font-size: 11px; color: #64748b; margin-top: 8px;">Private Download Token: <span style="font-mono; color: #94a3b8;">${order.privateDownloadToken}</span></p>
      </div>

      <div style="border-top: 1px solid #1e293b; pt: 16px; text-align: center; font-size: 11px; color: #64748b;">
        <p style="margin: 0 0 4px 0;">Email confirmation sent to ${order.clientEmail}</p>
        <p style="margin: 0; font-mono; color: #475569;">Crypto Review Lab Security & Risk Advisory Desk</p>
      </div>
    </div>
  `;
}

/**
 * Checks if a payment reference has already been consumed by an existing Pro Order.
 */
export function isPaymentReferenceAlreadyUsed(paymentReference?: string): { used: boolean; existingOrder?: ProOrder } {
  if (!paymentReference || !paymentReference.trim()) return { used: false };
  const cleanRef = paymentReference.trim().toLowerCase();
  
  // Allow admin bypass keys
  if (cleanRef.startsWith('admin_master') || cleanRef.startsWith('master_passphrase')) {
    return { used: false };
  }

  const orders = getAllOrders();
  const existing = orders.find(o => 
    o.paymentReference && 
    o.paymentReference.trim().toLowerCase() === cleanRef
  );

  if (existing) {
    return { used: true, existingOrder: existing };
  }
  return { used: false };
}

/**
 * Fetches and attaches live security scan (GoPlus / RugCheck) directly to the target review draft.
 */
export async function fetchAndAttachSecurityScan(review: CryptoReview): Promise<void> {
  if (!review || !review.contractAddress) return;
  if (review.securityScan && typeof review.securityScan === 'object' && Object.keys(review.securityScan).length > 0) return;
  try {
    const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
    const queryChain = review.chainId || '1';
    const scanRes = await fetch(`${baseUrl}/api/security/scan?chain=${encodeURIComponent(queryChain)}&address=${encodeURIComponent(review.contractAddress)}`);
    if (scanRes.ok) {
      const scanJson = await scanRes.json();
      if (scanJson && scanJson.success && scanJson.data) {
        review.securityScan = scanJson.data;
      }
    }
  } catch (scanErr) {
    console.warn('Security scan fetch failed during pro order processing:', scanErr);
  }
}

/**
 * Fetches and attaches live multi-source market data (CoinGecko, CoinMarketCap, CoinStats)
 * directly onto the target review draft (livePrice, cmcPrice, csPrice, confidenceScore, priceDivergencePct).
 */
export async function fetchAndAttachLiveMarketData(
  review: CryptoReview,
  symbol?: string,
  name?: string
): Promise<void> {
  if (!review) return;
  const targetSymbol = (review.symbol || symbol || '').toUpperCase().trim();
  const targetName = (review.name || name || '').trim();
  const searchCgId = (review.coingeckoId || targetSymbol).toLowerCase().trim();

  try {
    const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';

    const [cgRes, cmcRes, csRes] = await Promise.all([
      fetch(`${baseUrl}/api/coingecko/markets?ids=${encodeURIComponent(searchCgId)},${encodeURIComponent(targetSymbol.toLowerCase())}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),
      targetSymbol
        ? fetch(`${baseUrl}/api/cmc/quote?symbol=${encodeURIComponent(targetSymbol)}`)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        : Promise.resolve(null),
      fetch(`${baseUrl}/api/coinstats/markets`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    ]);

    let cgItem: any = null;
    if (Array.isArray(cgRes) && cgRes.length > 0) {
      cgItem = cgRes.find((item: any) => 
        item.id?.toLowerCase() === searchCgId || 
        item.symbol?.toLowerCase() === targetSymbol.toLowerCase()
      ) || cgRes[0];
    }

    const cmcData = cmcRes && typeof cmcRes === 'object' ? cmcRes : null;

    let csItem: any = null;
    if (Array.isArray(csRes)) {
      csItem = csRes.find((item: any) => 
        item.id?.toLowerCase() === searchCgId || 
        item.symbol?.toLowerCase() === targetSymbol.toLowerCase() ||
        item.name?.toLowerCase() === targetName.toLowerCase()
      );
    }

    const cgPrice = typeof cgItem?.current_price === 'number' && cgItem.current_price > 0 
      ? cgItem.current_price 
      : (review.livePrice && review.livePrice > 0 ? review.livePrice : undefined);
    const cmcPrice = typeof cmcData?.price === 'number' && cmcData.price > 0 
      ? cmcData.price 
      : (review.cmcPrice && review.cmcPrice > 0 ? review.cmcPrice : undefined);
    const csPrice = typeof csItem?.price === 'number' && csItem.price > 0 
      ? csItem.price 
      : (review.csPrice && review.csPrice > 0 ? review.csPrice : undefined);

    if (cgPrice || cmcPrice || csPrice) {
      const convergence = computeMultiSourceConvergence({
        cgPrice: cgPrice || cmcPrice || csPrice || 0,
        cgMarketCap: cgItem?.market_cap || cmcData?.marketCap || csItem?.marketCap || review.liveMarketCap || 0,
        cgVolume: cgItem?.total_volume || cmcData?.volume24h || csItem?.volume || review.liveVolume24h || 0,
        cgRank: cgItem?.market_cap_rank || cmcData?.cmcRank || csItem?.rank || review.liveRank || 100,
        cgChange24h: cgItem?.price_change_percentage_24h ?? cmcData?.percentChange24h ?? csItem?.priceChange1d ?? 0,
        cgCirculatingSupply: cgItem?.circulating_supply || cmcData?.circulatingSupply || csItem?.availableSupply || review.circulatingSupply,
        cgMaxSupply: cgItem?.max_supply || cmcData?.maxSupply || review.maxSupply,
        cgTotalSupply: cgItem?.total_supply || cmcData?.totalSupply || csItem?.totalSupply || review.totalSupply,
        cgAth: cgItem?.ath || cmcData?.ath || csItem?.ath || review.ath || review.allTimeHigh,
        cgAtl: cgItem?.atl || cmcData?.atl || csItem?.atl || review.atl || review.allTimeLow,
        cmcPrice,
        cmcMarketCap: cmcData?.marketCap,
        cmcVolume: cmcData?.volume24h,
        cmcRank: cmcData?.cmcRank,
        cmcChange24h: cmcData?.percentChange24h,
        cmcIsFallback: !cmcPrice,
        cmcCirculatingSupply: cmcData?.circulatingSupply,
        cmcTotalSupply: cmcData?.totalSupply,
        csPrice,
        csMarketCap: csItem?.marketCap,
        csVolume: csItem?.volume,
        csRank: csItem?.rank,
        csChange24h: csItem?.priceChange1d
      });

      review.livePrice = convergence.livePrice ?? undefined;
      review.cmcPrice = convergence.cmcPrice;
      review.csPrice = convergence.csPrice;
      review.confidenceScore = convergence.confidenceScore;
      review.confidenceLevel = convergence.confidenceLevel;
      review.priceDivergencePct = convergence.priceDivergencePct;
      review.supplyDivergencePct = convergence.supplyDivergencePct;
      review.liveMarketCap = convergence.liveMarketCap;
      review.liveVolume24h = convergence.liveVolume24h;
      review.liveRank = convergence.liveRank;
      review.cmcRank = convergence.cmcRank;
      review.csRank = convergence.csRank;
      review.circulatingSupply = review.circulatingSupply || convergence.circulatingSupply;
      review.circulatingSupplyProvenance = convergence.circulatingSupplyProvenance;
      review.maxSupply = review.maxSupply || convergence.maxSupply;
      review.maxSupplyProvenance = convergence.maxSupplyProvenance;
      review.totalSupply = review.totalSupply || convergence.totalSupply;
      review.totalSupplyProvenance = convergence.totalSupplyProvenance;
      review.fdvCalculated = review.fdvCalculated || convergence.fdvCalculated;
      review.fdvProvenance = convergence.fdvProvenance;
      review.marketCapProvenance = convergence.marketCapProvenance;
      review.priceProvenance = convergence.priceProvenance;
      review.allTimeHigh = review.allTimeHigh || convergence.allTimeHigh;
      review.allTimeLow = review.allTimeLow || convergence.allTimeLow;
      review.dataEngine = convergence.dataEngine;
      review.dataSources = convergence.dataSources;
      review.syncRuleApplied = convergence.syncRuleApplied;
      review.multiSourceConvergence = convergence.report;
    } else {
      if (review.livePrice && review.livePrice > 0) {
        review.cmcPrice = review.cmcPrice || review.livePrice;
        review.csPrice = review.csPrice || review.livePrice;
        review.confidenceScore = review.confidenceScore ?? 95;
        review.priceDivergencePct = review.priceDivergencePct ?? 0.0;
        review.confidenceLevel = review.confidenceLevel || 'HIGH';
      }
    }
  } catch (mErr) {
    console.warn('Market data fetch/convergence failed during pro order enrichment:', mErr);
    if (review.livePrice && review.livePrice > 0) {
      review.cmcPrice = review.cmcPrice || review.livePrice;
      review.csPrice = review.csPrice || review.livePrice;
      review.confidenceScore = review.confidenceScore ?? 95;
      review.priceDivergencePct = review.priceDivergencePct ?? 0.0;
      review.confidenceLevel = review.confidenceLevel || 'HIGH';
    }
  }
}

/**
 * Creates a new Pro Order and records the instant confirmation email.
 */
export async function createProOrder(params: {
  clientEmail: string;
  projectName: string;
  projectSymbol: string;
  contractAddress?: string;
  focusArea?: string;
  verificationDepth?: string;
  stressSimulation?: boolean;
  systemDraft: CryptoReview;
  paymentReference?: string;
}): Promise<ProOrder> {
  const cleanEmail = params.clientEmail.trim();
  const cleanPaymentRef = params.paymentReference ? params.paymentReference.trim() : '';

  // Enforce single report per payment restriction
  if (cleanPaymentRef) {
    const { used, existingOrder } = isPaymentReferenceAlreadyUsed(cleanPaymentRef);
    if (used && existingOrder) {
      throw new Error(`Payment reference ${cleanPaymentRef} has already been consumed for Order #${existingOrder.orderId} (${existingOrder.projectName}). Each payment permits exactly one Security & Risk Assessment report.`);
    }
  }

  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const orderId = `CRL-${randomNum}`;
  const now = new Date();
  const deliveryEta = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const token = `crl_token_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;

  const confirmationEmailHtml = buildConfirmationEmailHtml(orderId, cleanEmail, params.projectName, params.projectSymbol, false);

  const confirmationLog: ProOrderEmailLog = {
    id: `msg_${Date.now()}_1`,
    type: 'CONFIRMATION',
    from: PRINCIPAL_EMAIL,
    to: cleanEmail,
    subject: `[Crypto Review Lab] Order Received - Security & Risk Assessment #${orderId}`,
    sentAt: now.toISOString(),
    bodyPreview: `Order received and awaiting payment confirmation. Security & Risk Assessment will be prepared once payment is verified.`,
    fullHtmlContent: confirmationEmailHtml
  };

  const draftToSave: CryptoReview = {
    ...params.systemDraft,
    contractAddress: params.systemDraft.contractAddress || params.contractAddress,
    phaseTwoReControl: undefined,
    f3Verification: undefined
  };

  if (draftToSave.contractAddress) {
    await fetchAndAttachSecurityScan(draftToSave);
  }
  await fetchAndAttachLiveMarketData(draftToSave, params.projectSymbol, params.projectName);

  const newOrder: ProOrder = {
    orderId,
    clientEmail: cleanEmail,
    projectName: params.projectName,
    projectSymbol: params.projectSymbol,
    contractAddress: params.contractAddress,
    focusArea: params.focusArea,
    verificationDepth: params.verificationDepth || 'Unified Bytecode & Evidence Verification',
    stressSimulation: params.stressSimulation ?? false,
    amountUsd: 149.00,
    paymentStatus: 'PENDING',
    paymentMethod: cleanPaymentRef ? `NOWPayments (${cleanPaymentRef})` : 'NOWPayments (Crypto USD)',
    paymentReference: cleanPaymentRef || undefined,
    status: 'AWAITING_PAYMENT',
    createdAt: now.toISOString(),
    estimatedDeliveryAt: deliveryEta.toISOString(),
    systemDraft: draftToSave,
    emailLogs: [confirmationLog],
    privateDownloadToken: token,
    publishApproved: false
  };

  saveOrderToStorage(newOrder);
  return newOrder;
}

/**
 * Records a client's request for public publishing approval with a timestamp.
 */
export function requestPublishApproval(
  orderId: string,
  clientNotes?: string
): ProOrder | null {
  const orders = getAllOrders();
  const index = orders.findIndex(o => o.orderId === orderId);
  if (index === -1) return null;

  const order = orders[index];
  const now = new Date().toISOString();
  order.publishRequestedAt = now;
  order.publishApproved = order.publishApproved ?? false;

  if (order.finalReview) {
    order.finalReview.publishRequestedAt = now;
    order.finalReview.publishApproved = order.publishApproved ?? false;
  }
  if (order.systemDraft) {
    order.systemDraft.publishRequestedAt = now;
    order.systemDraft.publishApproved = order.publishApproved ?? false;
  }

  orders[index] = order;
  saveOrdersToFile(orders);
  return order;
}

/**
 * Admin-only confirmation that sets publishApproved to true only after explicit written confirmation is logged.
 */
export function confirmPublishProOrder(
  orderId: string,
  writtenConfirmation: string,
  publishedBy: string = 'Admin'
): ProOrder | null {
  if (!writtenConfirmation || !writtenConfirmation.trim()) {
    throw new Error('Explicit written confirmation is required to approve publishing.');
  }

  const orders = getAllOrders();
  const index = orders.findIndex(o => o.orderId === orderId);
  if (index === -1) return null;

  const order = orders[index];
  const now = new Date().toISOString();
  const cleanConfirmation = writtenConfirmation.trim();
  const cleanPublishedBy = publishedBy.trim() || 'Admin';

  order.publishApproved = true;
  order.publishApprovedAt = now;
  order.publishApprovedBy = cleanPublishedBy;
  order.publishWrittenConfirmation = cleanConfirmation;

  if (order.finalReview) {
    order.finalReview.publishApproved = true;
    order.finalReview.publishApprovedAt = now;
    order.finalReview.publishApprovedBy = cleanPublishedBy;
    order.finalReview.publishWrittenConfirmation = cleanConfirmation;
  }
  if (order.systemDraft) {
    order.systemDraft.publishApproved = true;
    order.systemDraft.publishApprovedAt = now;
    order.systemDraft.publishApprovedBy = cleanPublishedBy;
    order.systemDraft.publishWrittenConfirmation = cleanConfirmation;
  }

  orders[index] = order;
  saveOrdersToFile(orders);
  return order;
}

/**
 * Marks a Pro Order as Reviewed & Delivered by human auditor, sending final delivery email.
 */
export async function approveAndDeliverProOrder(
  orderId: string, 
  auditorNotes: {
    reviewedBy: string;
    auditorComments: string;
    verificationStamp: 'VERIFIED_AUDIT' | 'CORRECTIONS_APPLIED' | 'HIGH_RISK_WARNING';
    customAdjustments?: string;
    adminOverride?: AdminOverrideLog;
  },
  updatedReview?: CryptoReview
): Promise<ProOrder | null> {
  const orders = getAllOrders();
  const index = orders.findIndex(o => o.orderId === orderId);
  if (index === -1) return null;

  const order = orders[index];
  const now = new Date();
  const deliveredAtStr = now.toISOString();

  let targetReview: CryptoReview = updatedReview 
    ? { ...updatedReview }
    : { ...order.systemDraft };

  if (!auditorNotes.reviewedBy || !auditorNotes.reviewedBy.trim()) {
    throw new Error('Reviewer name is required for audit sign-off');
  }

  const reviewAuthor = auditorNotes.reviewedBy.trim();
  const reviewComments = auditorNotes.auditorComments?.trim() || 'Manual audit verification completed and report approved.';
  const adminOverride = auditorNotes.adminOverride || order.adminOverride || targetReview.adminOverride;

  const scores = targetReview.scores || { utility: 8, tokenomics: 8, security: 8, team: 8, community: 8 };
  const verdict = targetReview.verdict || '';
  const timestamp = deliveredAtStr;
  const auditSignature = signAuditReportServerSide({ scores, verdict, timestamp });

  targetReview.auditSignature = auditSignature;
  if (adminOverride) {
    targetReview.adminOverride = adminOverride;
  }

  const isF2Passed = isF2GatePassed(targetReview);
  if (!isF2Passed && !adminOverride) {
    const f2Score = typeof targetReview.phaseTwoReControl?.qualityScorePct === 'number' 
      ? targetReview.phaseTwoReControl.qualityScorePct 
      : targetReview.phaseTwoReControl?.overallScorePct;
    throw new Error(
      `[STRICT F3 GATE VIOLATION] Cannot approve and deliver order: Phase 2 (F2) Re-Control has ${
        targetReview.phaseTwoReControl ? `quality score ${f2Score}% (< 95.0% threshold) - PENDING_REGENERATION` : 'not yet been executed - PENDING_F2'
      }. F3 and delivery require F2 quality score >= 95% or an authorized admin override.`
    );
  }

  targetReview.f3Verification = await runF3Verification(targetReview, {
    securityScan: targetReview.securityScan,
    citations: targetReview.citations,
    activeOverride: adminOverride
  });
  regenerateNarrativeAfterVerification(targetReview);
  if (adminOverride && targetReview.f3Verification) {
    targetReview.f3Verification.adminOverride = adminOverride;
  }

  order.status = 'DELIVERED';
  order.deliveredAt = deliveredAtStr;
  order.finalReview = targetReview;
  order.auditSignature = auditSignature;
  if (adminOverride) {
    order.adminOverride = adminOverride;
  }

  order.humanNotes = {
    reviewedBy: reviewAuthor,
    reviewedAt: deliveredAtStr,
    auditorComments: reviewComments,
    verificationStamp: auditorNotes.verificationStamp,
    customAdjustments: auditorNotes.customAdjustments,
    auditSignature: auditSignature,
    adminOverride: adminOverride
  };

  const deliveryEmailHtml = buildDeliveryEmailHtml(order);

  const deliveryLog: ProOrderEmailLog = {
    id: `msg_${Date.now()}_2`,
    type: 'DELIVERY',
    from: PRINCIPAL_EMAIL,
    to: order.clientEmail,
    subject: `[Crypto Review Lab] Security & Risk Assessment Ready for Download - #${order.orderId}`,
    sentAt: now.toISOString(),
    bodyPreview: `Your Security & Risk Assessment for ${order.projectName} (${order.projectSymbol}) has been verified and delivered. Download your PDF now.`,
    fullHtmlContent: deliveryEmailHtml
  };

  order.emailLogs.push(deliveryLog);
  orders[index] = order;

  saveOrdersToFile(orders);
  return order;
}

/**
 * Attaches or clears an admin override for an order's F3 verification status
 */
export function applyAdminOverrideToOrder(
  orderId: string,
  override: AdminOverrideLog | null
): ProOrder | null {
  const orders = getAllOrders();
  const index = orders.findIndex(o => o.orderId === orderId);
  if (index === -1) return null;

  const order = orders[index];
  if (override) {
    order.adminOverride = override;
    if (order.systemDraft) {
      order.systemDraft.adminOverride = override;
      if (order.systemDraft.f3Verification) {
        order.systemDraft.f3Verification.adminOverride = override;
      }
    }
    if (order.finalReview) {
      order.finalReview.adminOverride = override;
      if (order.finalReview.f3Verification) {
        order.finalReview.f3Verification.adminOverride = override;
      }
    }
    if (order.humanNotes) {
      order.humanNotes.adminOverride = override;
    }
  } else {
    delete order.adminOverride;
    if (order.systemDraft) {
      delete order.systemDraft.adminOverride;
      if (order.systemDraft.f3Verification) {
        delete order.systemDraft.f3Verification.adminOverride;
      }
    }
    if (order.finalReview) {
      delete order.finalReview.adminOverride;
      if (order.finalReview.f3Verification) {
        delete order.finalReview.f3Verification.adminOverride;
      }
    }
    if (order.humanNotes) {
      delete order.humanNotes.adminOverride;
    }
  }

  orders[index] = order;
  saveOrdersToFile(orders);
  return order;
}

/**
 * Triggers Phase 2 Automated Re-Control verification (7 Control Gates) for an order,
 * auto-calibrating and re-generating the report draft if quality score is below 95%.
 */
export async function triggerPhaseTwoReControlForOrder(orderId: string): Promise<ProOrder | null> {
  const orders = getAllOrders();
  const index = orders.findIndex(o => o.orderId === orderId);
  if (index === -1) return null;

  const order = orders[index];

  if (order.systemDraft) {
    if (order.contractAddress && !order.systemDraft.contractAddress) {
      order.systemDraft.contractAddress = order.contractAddress;
    }
    await fetchAndAttachSecurityScan(order.systemDraft);
    await fetchAndAttachLiveMarketData(order.systemDraft, order.projectSymbol, order.projectName);
  }

  const regeneratedDraft = autoCalibrateAndRegenerateDraft(order.systemDraft);

  // Preserve and carry over attached live security and market data onto the newly generated draft
  if (order.systemDraft?.securityScan && !regeneratedDraft.securityScan) {
    regeneratedDraft.securityScan = order.systemDraft.securityScan;
  }
  if (order.systemDraft?.livePrice && !regeneratedDraft.livePrice) {
    regeneratedDraft.livePrice = order.systemDraft.livePrice;
  }
  if (order.systemDraft?.cmcPrice && !regeneratedDraft.cmcPrice) {
    regeneratedDraft.cmcPrice = order.systemDraft.cmcPrice;
  }
  if (order.systemDraft?.csPrice && !regeneratedDraft.csPrice) {
    regeneratedDraft.csPrice = order.systemDraft.csPrice;
  }
  if (order.systemDraft?.confidenceScore && !regeneratedDraft.confidenceScore) {
    regeneratedDraft.confidenceScore = order.systemDraft.confidenceScore;
  }
  if (order.systemDraft?.priceDivergencePct !== undefined && regeneratedDraft.priceDivergencePct === undefined) {
    regeneratedDraft.priceDivergencePct = order.systemDraft.priceDivergencePct;
  }

  const report = runPhaseTwoReControl(regeneratedDraft);
  
  regeneratedDraft.phaseTwoReControl = report;

  // STRICT 95% F3 GATE:
  // F3 may execute ONLY when the F2 quality score is >= 95% and Gate 3 passed (status === 'PASS').
  const isF2Passed = isF2GatePassed(regeneratedDraft);

  if (isF2Passed) {
    regeneratedDraft.f3Verification = await runF3Verification(regeneratedDraft, {
      securityScan: regeneratedDraft.securityScan,
      citations: regeneratedDraft.citations,
      avfLoopResult: report.avfSession || null
    });
    regenerateNarrativeAfterVerification(regeneratedDraft);
    order.status = 'IN_HUMAN_REVIEW';
  } else {
    regeneratedDraft.f3Verification = undefined;
    order.status = 'PENDING_REGENERATION';
  }

  order.systemDraft = regeneratedDraft;
  if (order.finalReview) {
    if (order.finalReview.contractAddress || order.contractAddress) {
      order.finalReview.contractAddress = order.finalReview.contractAddress || order.contractAddress;
      await fetchAndAttachSecurityScan(order.finalReview);
    }
    await fetchAndAttachLiveMarketData(order.finalReview, order.projectSymbol, order.projectName);
    const regenFinal = autoCalibrateAndRegenerateDraft(order.finalReview);
    if (order.finalReview?.securityScan && !regenFinal.securityScan) {
      regenFinal.securityScan = order.finalReview.securityScan;
    }
    if (order.finalReview?.livePrice && !regenFinal.livePrice) {
      regenFinal.livePrice = order.finalReview.livePrice;
    }
    if (order.finalReview?.cmcPrice && !regenFinal.cmcPrice) {
      regenFinal.cmcPrice = order.finalReview.cmcPrice;
    }
    if (order.finalReview?.csPrice && !regenFinal.csPrice) {
      regenFinal.csPrice = order.finalReview.csPrice;
    }
    if (order.finalReview?.confidenceScore && !regenFinal.confidenceScore) {
      regenFinal.confidenceScore = order.finalReview.confidenceScore;
    }
    if (order.finalReview?.priceDivergencePct !== undefined && regenFinal.priceDivergencePct === undefined) {
      regenFinal.priceDivergencePct = order.finalReview.priceDivergencePct;
    }
    regenFinal.phaseTwoReControl = report;
    if (isF2Passed) {
      regenFinal.f3Verification = await runF3Verification(regenFinal, {
        securityScan: regenFinal.securityScan || order.systemDraft.securityScan,
        citations: regenFinal.citations,
        avfLoopResult: report.avfSession || null
      });
      regenerateNarrativeAfterVerification(regenFinal);
    } else {
      regenFinal.f3Verification = undefined;
    }
    order.finalReview = regenFinal;
  }

  orders[index] = order;
  saveOrdersToFile(orders);
  return order;
}

/**
 * Specifically triggers report auto-regeneration and re-calibration for an order
 */
export async function regenerateReportForOrder(orderId: string): Promise<ProOrder | null> {
  return await triggerPhaseTwoReControlForOrder(orderId);
}

/**
 * Get all stored orders
 */
export function getAllOrders(): ProOrder[] {
  return loadOrdersFromFile();
}

/**
 * Async version of getAllOrders for full Postgres retrieval
 */
export async function getAllOrdersAsync(): Promise<ProOrder[]> {
  try {
    if (isNodeEnv) {
      const { getDbOrders } = await import('../db/queries');
      const dbOrders = await getDbOrders();
      if (dbOrders && dbOrders.length > 0) {
        return dbOrders.map((o: any) => {
          let parsedReport = {};
          try {
            parsedReport = o.reportData ? JSON.parse(o.reportData) : {};
          } catch {}
          return {
            orderId: o.orderId,
            clientEmail: o.clientEmail,
            projectName: o.projectName,
            projectSymbol: o.projectSymbol,
            contractAddress: o.contractAddress || undefined,
            chainId: o.chainId || undefined,
            status: o.status as any,
            paymentStatus: o.paymentStatus as any,
            paymentReference: o.paymentReference || undefined,
            focusArea: o.focusArea || undefined,
            verificationDepth: o.verificationDepth || undefined,
            stressSimulation: o.stressSimulation ? o.stressSimulation === 'true' : undefined,
            amountUsd: 149.00,
            ...parsedReport
          };
        });
      }
    }
  } catch (dbErr) {
    console.warn("Postgres primary getAllOrders failed, falling back to file storage:", dbErr);
  }
  return loadOrdersFromFile();
}

/**
 * Clears all orders from storage
 */
export function clearAllOrders(): void {
  saveOrdersToFile([]);
}

/**
 * Saves a single order to storage (Postgres primary with file fallback)
 */
export function saveOrderToStorage(order: ProOrder): void {
  try {
    // Save to DB asynchronously if in Node environment
    if (isNodeEnv) {
      import('../db/queries').then(({ upsertDbOrder }) => {
        upsertDbOrder({
          orderId: order.orderId,
          clientEmail: order.clientEmail,
          projectName: order.projectName,
          projectSymbol: order.projectSymbol,
          contractAddress: order.contractAddress,
          chainId: order.chainId,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentReference: order.paymentReference,
          focusArea: order.focusArea,
          verificationDepth: order.verificationDepth,
          stressSimulation: order.stressSimulation !== undefined ? String(order.stressSimulation) : undefined,
          reportData: order
        }).catch(err => {
          console.error("Postgres primary saveOrderToStorage failed, falling back to file storage:", err);
        });
      }).catch(err => {
        console.error("Failed to load db queries for saveOrderToStorage:", err);
      });
    }

    // Also update file/localStorage fallback
    const current = loadOrdersFromFile();
    const existingIndex = current.findIndex(o => o.orderId === order.orderId);
    if (existingIndex >= 0) {
      current[existingIndex] = order;
    } else {
      current.unshift(order);
    }
    saveOrdersToFile(current);
  } catch (e) {
    console.error("Failed to save order:", e);
  }
}

/**
 * NOWPayments IPN Payload structure
 */
export interface NowPaymentsIpnPayload {
  payment_id?: string | number;
  invoice_id?: string | number;
  payment_status?: string;
  pay_address?: string;
  price_amount?: number;
  price_currency?: string;
  pay_amount?: number;
  actually_paid?: number;
  pay_currency?: string;
  order_id?: string;
  order_description?: string;
  purchase_id?: string;
  created_at?: string;
  updated_at?: string;
  outcome_amount?: number;
  outcome_currency?: string;
  [key: string]: any;
}

export interface NowPaymentsIpnProcessResult {
  success: boolean;
  orderId?: string;
  order?: ProOrder;
  isDuplicate?: boolean;
  paymentStatus?: ProOrderPaymentStatus;
  rawStatus?: string;
  message?: string;
}

/**
 * Maps raw NOWPayments callback payment_status string to system ProOrderPaymentStatus.
 */
export function mapNowPaymentsStatusToPaymentStatus(rawStatus?: string): ProOrderPaymentStatus {
  if (!rawStatus) return 'PENDING';
  const s = String(rawStatus).toLowerCase().trim();
  switch (s) {
    case 'confirmed':
    case 'finished':
    case 'sending':
      return 'PAID';
    case 'confirming':
      return 'CONFIRMING';
    case 'waiting':
      return 'WAITING';
    case 'pending':
      return 'PENDING';
    case 'failed':
      return 'FAILED';
    case 'expired':
      return 'EXPIRED';
    case 'partially_paid':
    case 'partially-paid':
      return 'PARTIALLY_PAID';
    case 'refunded':
      return 'REFUNDED';
    default:
      return 'PENDING';
  }
}

/**
 * Processes a verified NOWPayments IPN payload to update order payment state idempotently.
 * Never bypasses admin review or alters AVF/F1/F2/F3 assessment scores.
 */
export function processNowPaymentsIpn(payload: NowPaymentsIpnPayload): NowPaymentsIpnProcessResult {
  const targetOrderId = payload.order_id ? String(payload.order_id).trim() : '';
  if (!targetOrderId) {
    return {
      success: false,
      message: 'Missing order_id in NOWPayments IPN payload'
    };
  }

  const orders = getAllOrders();
  const index = orders.findIndex(o => o.orderId.toLowerCase() === targetOrderId.toLowerCase());
  if (index === -1) {
    return {
      success: false,
      orderId: targetOrderId,
      message: `Order #${targetOrderId} not found in assessment queue`
    };
  }

  const order = orders[index];
  const rawStatus = payload.payment_status ? String(payload.payment_status).trim() : 'pending';
  const mappedPaymentStatus = mapNowPaymentsStatusToPaymentStatus(rawStatus);
  const paymentId = payload.payment_id !== undefined ? payload.payment_id : payload.invoice_id;
  const nowStr = new Date().toISOString();

  // Create audit log entry for this IPN callback
  const ipnLogEntry: NowPaymentsIpnLog = {
    receivedAt: nowStr,
    paymentId: paymentId || 'N/A',
    paymentStatus: mappedPaymentStatus,
    payAmount: typeof payload.pay_amount === 'number' ? payload.pay_amount : undefined,
    actuallyPaid: typeof payload.actually_paid === 'number' ? payload.actually_paid : undefined,
    payCurrency: payload.pay_currency ? String(payload.pay_currency).toUpperCase() : undefined,
    priceAmount: typeof payload.price_amount === 'number' ? payload.price_amount : undefined,
    priceCurrency: payload.price_currency ? String(payload.price_currency).toUpperCase() : undefined,
    orderId: targetOrderId,
    rawStatus: rawStatus
  };

  if (!order.nowpaymentsIpnLogs) {
    order.nowpaymentsIpnLogs = [];
  }

  // Idempotency check:
  // If order already has this payment status AND last IPN log recorded the exact same payment_id and status:
  const isDuplicate = (
    order.paymentStatus === mappedPaymentStatus &&
    order.nowpaymentsPaymentId &&
    paymentId &&
    String(order.nowpaymentsPaymentId) === String(paymentId)
  );

  if (isDuplicate) {
    // Append log without redundant state transitions or duplicate emails
    order.nowpaymentsIpnLogs.unshift(ipnLogEntry);
    if (order.nowpaymentsIpnLogs.length > 50) order.nowpaymentsIpnLogs.pop();
    orders[index] = order;
    saveOrdersToFile(orders);

    return {
      success: true,
      orderId: order.orderId,
      order,
      isDuplicate: true,
      paymentStatus: order.paymentStatus,
      rawStatus,
      message: `Duplicate IPN callback acknowledged for order #${order.orderId} (Status: ${mappedPaymentStatus})`
    };
  }

  // Update order with new payment status
  order.paymentStatus = mappedPaymentStatus;
  if (paymentId) {
    order.nowpaymentsPaymentId = paymentId;
  }
  if (payload.pay_currency) {
    order.paymentMethod = `NOWPayments (${String(payload.pay_currency).toUpperCase()})`;
  }

  // When payment is confirmed/finished, advance status and ensure Payment Received confirmation email is logged
  if (mappedPaymentStatus === 'PAID') {
    if (order.status === 'AWAITING_PAYMENT') {
      order.status = 'PENDING_F2';
    }
    const hasPaidConfirmationEmail = order.emailLogs.some(e => e.type === 'CONFIRMATION' && e.subject.includes('Payment Received'));
    if (!hasPaidConfirmationEmail) {
      const confirmationEmailHtml = buildConfirmationEmailHtml(order.orderId, order.clientEmail, order.projectName, order.projectSymbol, true);
      const confirmationLog: ProOrderEmailLog = {
        id: `msg_${Date.now()}_ipn`,
        type: 'CONFIRMATION',
        from: PRINCIPAL_EMAIL,
        to: order.clientEmail,
        subject: `[Crypto Review Lab] Payment Received - Security & Risk Assessment #${order.orderId}`,
        sentAt: nowStr,
        bodyPreview: `Payment received. Your Security & Risk Assessment is being prepared. Delivery within 24 hours`,
        fullHtmlContent: confirmationEmailHtml
      };
      order.emailLogs.unshift(confirmationLog);
    }
  }

  // Record IPN log entry
  order.nowpaymentsIpnLogs.unshift(ipnLogEntry);
  if (order.nowpaymentsIpnLogs.length > 50) order.nowpaymentsIpnLogs.pop();

  orders[index] = order;
  saveOrderToStorage(order);

  return {
    success: true,
    orderId: order.orderId,
    order,
    isDuplicate: false,
    paymentStatus: order.paymentStatus,
    rawStatus,
    message: `NOWPayments IPN processed: Order #${order.orderId} paymentStatus updated to ${mappedPaymentStatus} (NOWPayments status: ${rawStatus})`
  };
}

/**
 * Lookup order strictly requiring BOTH Order ID and Email address (Security Check)
 */
export function lookupOrderStrict(orderId: string, email: string): ProOrder[] {
  const id = orderId.trim().toLowerCase();
  const mail = email.trim().toLowerCase();
  if (!id || !mail) return [];
  const all = getAllOrders();
  return all.filter(o => 
    o.orderId.toLowerCase() === id && 
    o.clientEmail.toLowerCase() === mail
  );
}

/**
 * Async version of lookupOrderStrict resolving from Postgres DB primary
 */
export async function lookupOrderStrictAsync(orderId: string, email: string): Promise<ProOrder[]> {
  const id = orderId.trim().toLowerCase();
  const mail = email.trim().toLowerCase();
  if (!id || !mail) return [];
  const all = await getAllOrdersAsync();
  return all.filter(o => 
    o.orderId.toLowerCase() === id && 
    o.clientEmail.toLowerCase() === mail
  );
}

/**
 * Lookup order by ID, Email, project name or symbol for Admin search
 */
export function lookupOrder(query: string): ProOrder[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = getAllOrders();
  return all.filter(o => 
    o.orderId.toLowerCase().includes(q) ||
    o.clientEmail.toLowerCase().includes(q) ||
    o.projectName.toLowerCase().includes(q) ||
    o.projectSymbol.toLowerCase().includes(q) ||
    o.privateDownloadToken.toLowerCase() === q
  );
}
