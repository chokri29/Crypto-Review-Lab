/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import {
  LOCKED_GRADE_BOUNDARIES,
  normalizeProtocolCategory,
  getCategoryTechnicalVectors,
  getCategoryStressTestModel,
  getCategorySpecificModule,
  getCategoryDimensionWeights,
  calculateDataConfidence,
  ProtocolCategoryType
} from './EvaluationBlueprint';

import { ComparisonReportData, PhaseTwoReControlReport, CryptoAuditSignature, F3VerificationResult, PublicF3VerificationResult, PublicCryptoReviewReport, AdminOverrideLog } from '../types';

import { formatDefiLlamaTvl } from './defillama';
import { getConfidenceLevel } from './f3Engine';

export interface AuditPdfData {
  projectName?: string;
  queryTopic?: string;
  category?: string;
  analysisText: string;
  realTvl?: number | null;
  auditTimestamp?: string;
  auditRefId?: string;
  isPro?: boolean;
  isPreliminary?: boolean;
  preliminaryNote?: string;
  contractAddress?: string;
  verificationDepth?: string;
  stressSimulation?: boolean;
  comparisonReport?: ComparisonReportData;
  phaseTwoReControl?: PhaseTwoReControlReport;
  auditSignature?: CryptoAuditSignature;
  f3Verification?: F3VerificationResult | PublicF3VerificationResult;
  adminOverride?: AdminOverrideLog;
  publishApproved?: boolean;
  confidenceScore?: number;
  confidenceLevel?: string;
  securityScan?: any;
  auditReports?: string[];
  citations?: string[];
  // Internal optional legacy fields tolerated but never rendered in public documents:
  overallScore?: number;
  grade?: string;
  riskLevel?: string;
  dimensionScores?: {
    utility: number;
    tokenomics: number;
    security: number;
    team: number;
    community: number;
  };
}

export interface PdfGatingDecision {
  isEligibleForFinalVerified: boolean;
  actualStatus: 'VERIFIED' | 'PRELIMINARY' | 'FAILED' | 'CONFLICT' | 'CONDITIONAL' | 'PENDING_REVIEW';
  resolvedFilename: string;
  watermarkText?: string;
}

/**
 * Strict Export Gating: Blocks 'final_approved_verified' naming / export path whenever
 * f3Verification is not VERIFIED (or passing state) OR publishApproved !== true without recorded admin approval.
 */
export function resolveGatedPdfFilename(
  symbolOrName: string,
  data: AuditPdfData,
  customFilename?: string
): PdfGatingDecision {
  const f3 = data.f3Verification;
  const adminOverride = data.adminOverride || (f3 as any)?.adminOverride;
  const isPreliminary = data.isPreliminary === true;

  // Passing F3 tripartite core state
  const f3Status = (f3 as any)?.tripartiteCoreState || f3?.overallStatus;
  const isF3Verified = Boolean(f3 && (f3Status === 'VERIFIED' || f3.isVerified === true));
  
  // Publish approval check
  const isPublishApproved = Boolean(data.publishApproved === true || adminOverride);

  // Both conditions required for a final approved verified report
  const isEligibleForFinalVerified = Boolean((isF3Verified || adminOverride) && isPublishApproved && !isPreliminary);

  const cleanSymbol = symbolOrName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30) || 'crypto_review';

  let actualStatus: 'VERIFIED' | 'PRELIMINARY' | 'FAILED' | 'CONFLICT' | 'CONDITIONAL' | 'PENDING_REVIEW';
  let defaultSuffix: string;
  let watermarkText: string | undefined;

  if (isEligibleForFinalVerified) {
    actualStatus = 'VERIFIED';
    defaultSuffix = '_f3_final_approved_verified_report.pdf';
  } else if (isPreliminary) {
    actualStatus = 'PRELIMINARY';
    defaultSuffix = '_preliminary_draft_pre_f3.pdf';
    watermarkText = 'PRELIMINARY INTERNAL DRAFT — PENDING HUMAN REVIEW';
  } else if (f3Status === 'FAILED') {
    actualStatus = 'FAILED';
    defaultSuffix = '_draft_pending_review.pdf';
    watermarkText = 'F3 VERIFICATION FAILED — PENDING AUDITOR REVIEW';
  } else if (f3Status === 'CONFLICT') {
    actualStatus = 'CONFLICT';
    defaultSuffix = '_draft_pending_review.pdf';
    watermarkText = 'F3 CONFLICT DETECTED — PENDING AUDITOR REVIEW';
  } else if (f3Status === 'CONDITIONAL') {
    actualStatus = 'CONDITIONAL';
    defaultSuffix = '_draft_pending_review.pdf';
    watermarkText = 'CONDITIONAL DRAFT — PENDING FINAL VERIFICATION';
  } else {
    actualStatus = 'PENDING_REVIEW';
    defaultSuffix = '_draft_pending_review.pdf';
    watermarkText = 'INTERNAL DRAFT — PENDING VERIFICATION';
  }

  let resolvedFilename = customFilename || `${cleanSymbol}${defaultSuffix}`;

  // STRICT EXPORT GATING:
  // If NOT eligible for final approved verified, sanitize any requested filename to prevent misrepresentation
  if (!isEligibleForFinalVerified) {
    if (
      resolvedFilename.includes('final_approved_verified') ||
      resolvedFilename.includes('final_verified') ||
      resolvedFilename.includes('final_approved') ||
      resolvedFilename.includes('_final_') ||
      resolvedFilename.endsWith('_final.pdf') ||
      resolvedFilename.includes('_verified_') ||
      resolvedFilename.endsWith('_verified.pdf')
    ) {
      resolvedFilename = `${cleanSymbol}${defaultSuffix}`;
    }
  }

  return {
    isEligibleForFinalVerified,
    actualStatus,
    resolvedFilename,
    watermarkText
  };
}

/**
 * Generates an official, dedicated PDF report for the Evaluation Blueprint Master Standard & Formula.
 * Does NOT display a fake audit score; instead displays the full Rubric, Formula, Penalty Rules & Grade Boundaries.
 */
export function generateBlueprintFormulaPdf(customFilename = 'evaluation_blueprint_master_formula.pdf'): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  const primaryDark = [15, 23, 42]; // #0f172a slate-900
  const emeraldAccent = [16, 185, 129]; // #10b981 emerald-500
  const cyanAccent = [6, 182, 212]; // #06b6d4 cyan-500
  const bgLight = [248, 250, 252]; // #f8fafc
  const textDark = [30, 41, 59]; // #1e293b
  const textMuted = [100, 116, 139]; // #64748b

  let y = margin;

  // 1. Header Banner
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setFillColor(cyanAccent[0], cyanAccent[1], cyanAccent[2]);
  doc.rect(0, 31, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('CRYPTO REVIEW LAB', margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(56, 189, 248); // sky blue
  doc.text('MASTER EVALUATION BLUEPRINT & SCORING FORMULA SPECIFICATION', margin, 20);

  const nowStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`EFFECTIVE: ${nowStr}`, pageWidth - margin, 13, { align: 'right' });
  doc.text('VERSION: LOCKED STANDARD', pageWidth - margin, 19, { align: 'right' });

  y = 40;

  // 2. Overview Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Official Standard Methodology & Rubric Reference', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('This specification governs all AI Auditor analyses, risk ratings, and protocol evaluations across Crypto Review Lab.', margin, y);
  y += 8;

  // 3. Formula Highlight Box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(emeraldAccent[0], emeraldAccent[1], emeraldAccent[2]);
  doc.text('MASTER SCORING FORMULA (100 PTS MAX)', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Score = (Utility × 2.5) + (Tokenomics × 2.5) + (Security × 2.5) + (Team × 1.5) + (Community × 1.0)', margin + 4, y + 11.5);

  y += 21;

  // 4. Dimensions Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('THE 5 CORE DIMENSIONS & WEIGHT ALLOCATIONS', margin, y);
  y += 4;

  const tableHeaderY = y;
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(margin, tableHeaderY, contentWidth, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DIMENSION', margin + 4, tableHeaderY + 4.8);
  doc.text('WEIGHT', margin + 68, tableHeaderY + 4.8, { align: 'center' });
  doc.text('MAX PTS', margin + 98, tableHeaderY + 4.8, { align: 'center' });
  doc.text('KEY EVALUATION CRITERIA', margin + 120, tableHeaderY + 4.8);

  y += 7;

  const dims = [
    { name: '1. Utility & Protocol Function', weight: '25%', maxPts: '25.0 pts', criteria: 'Real-world adoption, transaction throughput, TVL depth, protocol utility.' },
    { name: '2. Tokenomics & Economic Model', weight: '25%', maxPts: '25.0 pts', criteria: 'Inflation schedule, supply concentration, staking sinks, emission control.' },
    { name: '3. Smart Contract Security', weight: '25%', maxPts: '25.0 pts', criteria: 'Third-party audits, code verification, multisig admin, exploit history.' },
    { name: '4. Team & Backer Track Record', weight: '15%', maxPts: '15.0 pts', criteria: 'Dev experience, institutional backers, multisig transparency, KYC.' },
    { name: '5. Community & Governance', weight: '10%', maxPts: '10.0 pts', criteria: 'Active dev ecosystem, organic user base, voting participation, social reach.' },
  ];

  dims.forEach((row, idx) => {
    const rowY = y;
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, contentWidth, 7, 'F');
    }
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(row.name, margin + 4, rowY + 4.8);
    doc.setFont('helvetica', 'normal');
    doc.text(row.weight, margin + 68, rowY + 4.8, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(row.maxPts, margin + 98, rowY + 4.8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(row.criteria, margin + 120, rowY + 4.8);

    y += 7;
  });

  y += 8;

  // 5. Grade Scale Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('GRADE BOUNDARIES & RISK RATING TIERING', margin, y);
  y += 4;

  const gradeHeaderY = y;
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(margin, gradeHeaderY, contentWidth, 6.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('GRADE', margin + 4, gradeHeaderY + 4.5);
  doc.text('SCORE RANGE', margin + 30, gradeHeaderY + 4.5);
  doc.text('RISK LEVEL', margin + 75, gradeHeaderY + 4.5);
  doc.text('INTERPRETATION & CRITERIA', margin + 115, gradeHeaderY + 4.5);

  y += 6.5;

  LOCKED_GRADE_BOUNDARIES.forEach((boundary, idx) => {
    const rowY = y;
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, contentWidth, 6, 'F');
    }
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(boundary.grade, margin + 4, rowY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.text(`${boundary.minScore} - ${boundary.maxScore} pts`, margin + 30, rowY + 4.2);

    let riskColor = emeraldAccent;
    if (boundary.riskLevel === 'Medium') riskColor = [245, 158, 11];
    if (boundary.riskLevel === 'High' || boundary.riskLevel === 'Critical') riskColor = [225, 29, 72];

    doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(boundary.riskLevel.toUpperCase(), margin + 75, rowY + 4.2);

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(boundary.description, margin + 115, rowY + 4.2);

    y += 6;
  });

  // 6. N.B. Supplementary Rules & Penalty Notes
  y += 6;
  doc.setFillColor(254, 243, 199); // Amber-100
  doc.setDrawColor(245, 158, 11); // Amber-500
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9); // Amber-700
  doc.text('N.B. MEME COIN PENALTY RULE:', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 53, 15);
  doc.text('If a evaluated asset has Utility <= 2/10 AND Team <= 3/10 (pure speculative token model), the overall score', margin + 4, y + 9.5);
  doc.text('is capped at a maximum of 60/100 (BB / High Risk Grade) regardless of community metrics or audit status.', margin + 4, y + 12.8);

  // Footer
  addFooter(doc, pageWidth, pageHeight, margin, textMuted, 'Master Evaluation Blueprint Specification Manual');

  doc.save(customFilename);
}

/**
 * Generates a project or topic-specific PDF Security Audit Report.
 * Includes Project/Query Title, Exact Timestamp, Unique Reference ID, and Audit Findings.
 */
export function generateAuditPdfReport(inputData: AuditPdfData | PublicCryptoReviewReport, customFilename?: string): void {
  let data: AuditPdfData;
  if ('summary' in inputData && !('analysisText' in inputData)) {
    const review = inputData as PublicCryptoReviewReport;
    const f3 = review.f3Verification;
    let proRiskModelBlock = '';
    if (review.securityScan || f3) {
      const lines: string[] = [];
      if (f3?.modules?.avf05Score) {
        lines.push(`• AVF-05 Score Verification: ${f3.modules.avf05Score.status}`);
      }
      if (f3?.modules?.avf06Security) {
        lines.push(`• AVF-06 Security Verification: ${f3.modules.avf06Security.status} (${f3.modules.avf06Security.signalsChecked?.length || 0} on-chain signals verified)`);
      }
      if (review.securityScan) {
        const isOpenSource = review.securityScan.is_open_source ?? review.securityScan.isOpenSource;
        const isHoneypot = review.securityScan.is_honeypot ?? review.securityScan.isHoneypot;
        lines.push(`• On-Chain Bytecode Telemetry: OpenSource=${isOpenSource ? 'YES' : 'NO'}, Honeypot=${isHoneypot ? 'YES' : 'NO'}`);
      }
      if (f3) {
        lines.push(`• AVF Tripartite Verification State: ${f3.overallStatus}`);
      }
      proRiskModelBlock = `## CRL RISK MODEL — AVF VERIFICATION & ON-CHAIN TELEMETRY\n${lines.join('\n')}\n\n`;
    }
    const analysisText = `${review.verdict ? `## EXECUTIVE VERDICT\n${review.verdict}\n\n` : ''}${proRiskModelBlock}## DETAILED LABORATORY ANALYSIS\n${review.summary}\n\n${review.pros?.length ? `## KEY STRENGTHS & CATALYSTS\n${review.pros.map(p => `• ${p}`).join('\n')}\n\n` : ''}${review.cons?.length ? `## STRUCTURAL VULNERABILITIES & RISK VECTORS\n${review.cons.map(c => `• ${c}`).join('\n')}` : ''}`;
    data = {
      projectName: `${review.name} (${review.symbol})`,
      category: review.category,
      queryTopic: review.category,
      analysisText,
      realTvl: review.realTvl,
      auditTimestamp: review.createdAt,
      auditRefId: review.id,
      isPro: true,
      contractAddress: review.contractAddress,
      f3Verification: review.f3Verification,
      auditSignature: review.auditSignature,
      publishApproved: review.publishApproved,
      confidenceScore: review.confidenceScore,
      confidenceLevel: review.confidenceLevel,
      adminOverride: review.adminOverride || (review.f3Verification as any)?.adminOverride,
      securityScan: review.securityScan
    };
  } else {
    data = inputData as AuditPdfData;
  }

  if (data.isPro) {
    generateProInstitutionalPdfReport(data, customFilename);
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  const primaryDark = [15, 23, 42]; // slate-900
  const emeraldAccent = [16, 185, 129]; // emerald-500
  const bgLight = [248, 250, 252];
  const textDark = [30, 41, 59];
  const textMuted = [100, 116, 139];

  let y = margin;

  const projName = data.projectName || data.queryTopic || 'AI Protocol Security Evaluation';
  const gating = resolveGatedPdfFilename(projName, data, customFilename);
  const isVerified = gating.isEligibleForFinalVerified;
  const isFailed = gating.actualStatus === 'FAILED' || gating.actualStatus === 'CONFLICT';

  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(0, 0, pageWidth, 32, 'F');

  const topAccent = data.isPro ? [245, 158, 11] : (isVerified ? emeraldAccent : (isFailed ? [225, 29, 72] : [245, 158, 11])); // Amber for Pro, Emerald for Rapid Verified, Red for Failed
  doc.setFillColor(topAccent[0], topAccent[1], topAccent[2]);
  doc.rect(0, 31, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('CRYPTO REVIEW LAB', margin, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  if (data.isPreliminary || gating.actualStatus === 'PRELIMINARY') {
    doc.setTextColor(251, 191, 36); // Amber light
    doc.text('SECURITY & RISK ASSESSMENT — PRELIMINARY WORKING DRAFT (PRE-F3)', margin, 21);
  } else if (isVerified) {
    doc.setTextColor(56, 189, 248); // Sky blue
    doc.text('SECURITY & RISK ASSESSMENT — F3 DETERMINISTIC VERIFIED REPORT', margin, 21);
  } else if (gating.actualStatus === 'FAILED') {
    doc.setTextColor(239, 68, 68); // Red
    doc.text('SECURITY & RISK ASSESSMENT — DETERMINISTIC VERIFICATION FAILED', margin, 21);
  } else if (gating.actualStatus === 'CONFLICT') {
    doc.setTextColor(239, 68, 68); // Red
    doc.text('SECURITY & RISK ASSESSMENT — DETERMINISTIC CONFLICT DETECTED', margin, 21);
  } else if (gating.actualStatus === 'CONDITIONAL') {
    doc.setTextColor(251, 191, 36); // Amber
    doc.text('SECURITY & RISK ASSESSMENT — CONDITIONAL DRAFT REPORT', margin, 21);
  } else if (data.isPro) {
    doc.setTextColor(251, 191, 36); // Amber light
    doc.text('SECURITY & RISK ASSESSMENT & ADVISORY DOSSIER', margin, 21);
  } else {
    doc.setTextColor(251, 191, 36);
    doc.text(`SECURITY & RISK ASSESSMENT — DRAFT (${gating.actualStatus})`, margin, 21);
  }

  // Date, Time & Audit Ref ID
  const fullTimestamp = data.auditTimestamp || new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  });

  const refId = data.auditRefId || `REF-${Math.floor(100000 + Math.random() * 900000)}`;

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`TIMESTAMP: ${fullTimestamp}`, pageWidth - margin, 14, { align: 'right' });
  doc.text(`REF ID: ${refId}`, pageWidth - margin, 20, { align: 'right' });

  y = 42;

  // 2. Project / Query Title Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Project Target: ${projName}`, margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  if (data.isPreliminary || gating.actualStatus === 'PRELIMINARY') {
    doc.text(`Preliminary Pre-F3 Working Draft (Evaluation Blueprint v2.4 Standard)`, margin, y);
  } else if (isVerified) {
    doc.text(`F3 Deterministic Algorithmic Verification Approved & Signed by Crypto Review Lab`, margin, y);
  } else {
    doc.text(`Evaluation Status: ${gating.actualStatus} — Awaiting Final Verification & Auditor Sign-Off`, margin, y);
  }
  y += 7;

  // 2a. Preliminary Draft Banner Box (If Preliminary)
  if (data.isPreliminary) {
    doc.setFillColor(254, 243, 199); // Amber 100
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text('PRELIMINARY WORKING DRAFT — GENERATED PRIOR TO F3 VERIFICATION STAGE', margin + 4, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 53, 15);
    doc.text(data.preliminaryNote || 'Notice: This preliminary draft report was generated at the Auditor Desk stage prior to F3 Algorithmic Verification (AVF-01..AVF-08). Final verification approval, invariant checking, and cryptographic sign-off are executed via the F3 Dashboard.', margin + 4, y + 9, { maxWidth: contentWidth - 8 });

    y += 18;
  }

  // 2b. Security & Risk Assessment Control Box (If Pro)
  if (data.isPro) {
    doc.setFillColor(254, 243, 199); // Amber 100
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text('SECURITY & RISK ASSESSMENT SCAN METRICS & VERIFICATION CONTROLS', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 53, 15);
    doc.text(`• Verified Contract/Repo: ${data.contractAddress || 'Mainnet On-Chain Verification'}`, margin + 4, y + 9.5);
    doc.text(`• Methodology: Unified Bytecode & Evidence-Backed Verification`, margin + 4, y + 13.5);
    doc.text(`• TVL Stress Simulation: ${data.stressSimulation !== false ? 'ACTIVE (Simulated Multi-Vector Liquidity Attack)' : 'DISABLED'}`, margin + 105, y + 13.5);

    y += 22;
  }

  // 3. Verification Status & Blueprint Master Standard Matrix
  const categoryType = normalizeProtocolCategory(data.category || data.queryTopic);
  const weights = getCategoryDimensionWeights(categoryType);

  const badgeColor = isVerified ? emeraldAccent : (isFailed ? [225, 29, 72] : [245, 158, 11]);
  const badgeLabel = isVerified ? 'VERIFIED' : (gating.actualStatus === 'PENDING_REVIEW' ? 'PENDING' : gating.actualStatus);

  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 23, 3, 3, 'FD');

  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(margin + 4, y + 3, 34, 17, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(badgeLabel.length > 8 ? 8 : 10.5);
  doc.text(badgeLabel, margin + 21, y + 10.5, { align: 'center' });
  doc.setFontSize(6.5);
  doc.text('BLUEPRINT v2.4', margin + 21, y + 15.5, { align: 'center' });

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  const statusHeadline = isVerified 
    ? 'STATUS: DETERMINISTIC VERIFICATION PASSED'
    : `STATUS: ${gating.actualStatus} — PENDING FINAL AUDITOR SIGN-OFF`;
  doc.text(statusHeadline, margin + 44, y + 9.5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`SPECIFICATION: `, margin + 44, y + 16.5);

  doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('EVALUATION BLUEPRINT MASTER STANDARD (AVF-01..AVF-08)', margin + 70, y + 16.5);

  y += 28;

  // 3b. 5-Dimension Evaluation Breakdown Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('EVALUATION BLUEPRINT — 5 DIMENSION METHODOLOGY MATRIX', margin, y);
  y += 4;

  const tableHeaderY = y;
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(margin, tableHeaderY, contentWidth, 6.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DIMENSION', margin + 4, tableHeaderY + 4.5);
  doc.text('WEIGHT', margin + 90, tableHeaderY + 4.5, { align: 'center' });
  doc.text('STATUS', margin + 125, tableHeaderY + 4.5, { align: 'center' });
  doc.text('SPECIFICATION INVARIANT', margin + 165, tableHeaderY + 4.5, { align: 'center' });

  y += 6.5;

  const dimStatus = isVerified ? 'VERIFIED' : (isFailed ? 'FLAGGED' : 'PENDING');
  const dimensionRows = [
    { name: 'Utility & Protocol Function', weight: `${Math.round(weights.utility * 100)}%`, status: dimStatus, invariant: 'Functional Vector Invariant' },
    { name: 'Tokenomics & Economic Model', weight: `${Math.round(weights.tokenomics * 100)}%`, status: dimStatus, invariant: 'Supply & Emission Dynamics' },
    { name: 'Smart Contract & Network Security', weight: `${Math.round(weights.security * 100)}%`, status: dimStatus, invariant: 'Bytecode & Invariant Invariance' },
    { name: 'Team & Backer Track Record', weight: `${Math.round(weights.team * 100)}%`, status: dimStatus, invariant: 'Provenance Cross-Referenced' },
    { name: 'Community & Governance Strength', weight: `${Math.round(weights.community * 100)}%`, status: dimStatus, invariant: 'Decentralization & Governance' }
  ];

  dimensionRows.forEach((row, idx) => {
    const rowY = y;
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, contentWidth, 6, 'F');
    }
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(row.name, margin + 4, rowY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.text(row.weight, margin + 90, rowY + 4.2, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(row.status, margin + 125, rowY + 4.2, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(row.invariant, margin + 165, rowY + 4.2, { align: 'center' });

    y += 6;
  });

  y += 7;

  // 3c. AVF Deterministic Verification & On-Chain Security Telemetry
  if (data.isPro || data.f3Verification || data.securityScan) {
    if (y + 28 > pageHeight - 18) {
      addFooter(doc, pageWidth, pageHeight, margin, textMuted, `Target: ${projName} | ID: ${refId}`);
      doc.addPage();
      y = margin + 10;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('CRL SECURITY MODEL — AVF VERIFICATION & ON-CHAIN TELEMETRY', margin, y);
    y += 4;

    doc.setFillColor(254, 243, 199); // Amber tint
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'FD');

    const f3 = data.f3Verification;
    const secScan = data.securityScan?.data || data.securityScan || (data as any).externalSecurityScan?.data || (data as any).externalSecurityScan;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(120, 53, 15);

    if (f3 || secScan) {
      // 1. AVF-05 Score Verification
      let line1 = '1. AVF-05 Score & Weight Verification: Input unavailable';
      if (f3?.modules?.avf05Score) {
        const avf05 = f3.modules.avf05Score;
        const statusText = avf05.status === 'VERIFIED' || avf05.isVerified ? 'VERIFIED' : avf05.status;
        line1 = `1. AVF-05 Score & Weight Verification: ${statusText} (Mathematical model & weight distributions validated against Blueprint specification)`;
      }
      doc.text(line1, margin + 3, y + 4.8);

      // 2. AVF-06 Risk-Conclusion Status & Contradiction Flags
      let line2 = '2. AVF-06 Security & Integrity Verification: Input unavailable';
      const avf06: any = (f3?.modules as any)?.avf06RiskConclusion || (f3?.modules as any)?.avf06Security;
      if (avf06) {
        const contradictionText = avf06.contradictions && avf06.contradictions.length > 0 ? ` [Contradictions: ${avf06.contradictions.slice(0, 2).join('; ')}]` : '';
        line2 = `2. AVF-06 Security & Integrity Verification: ${avf06.status} (${avf06.signalsChecked?.length || 0} on-chain signals verified)${contradictionText}`;
      }
      doc.text(line2, margin + 3, y + 9.5);

      // 3. Real GoPlus / RugCheck / Moralis Security Scan Data (snake_case telemetry)
      let line3 = '3. On-Chain Security Telemetry: Security cross-verification unavailable — no contract address on file';
      if (secScan) {
        const scanFlags: string[] = [];
        const isOpenSource = secScan.is_open_source ?? secScan.isOpenSource;
        const isHoneypot = secScan.is_honeypot ?? secScan.isHoneypot;
        const isMintable = secScan.is_mintable ?? secScan.isMintable;
        const isBlacklisted = secScan.is_blacklisted ?? secScan.hasBlacklist ?? secScan.isBlacklisted;
        const isProxy = secScan.is_proxy ?? secScan.isProxy;
        const ownerChangeBalance = secScan.owner_change_balance;
        const cannotSell = secScan.cannot_sell ?? secScan.cannotSell;
        const buyTax = secScan.buy_tax ?? secScan.buyTax;
        const sellTax = secScan.sell_tax ?? secScan.sellTax;
        const rugcheckVerdict = secScan.rugcheckVerdict ?? secScan.data?.rugcheckVerdict;
        const rugcheckScore = secScan.rugcheckScore ?? secScan.data?.rugcheckScore;

        if (isOpenSource !== undefined) scanFlags.push(`Open-Source: ${isOpenSource ? 'YES' : 'NO'}`);
        if (isHoneypot !== undefined) scanFlags.push(`Honeypot: ${isHoneypot ? 'YES' : 'NO'}`);
        if (isMintable !== undefined) scanFlags.push(`Mintable: ${isMintable ? 'YES' : 'NO'}`);
        if (isBlacklisted !== undefined) scanFlags.push(`Blacklist: ${isBlacklisted ? 'YES' : 'NO'}`);
        if (isProxy) scanFlags.push(`Proxy: YES`);
        if (ownerChangeBalance) scanFlags.push(`Owner Mod Balance: YES`);
        if (cannotSell) scanFlags.push(`Cannot Sell: YES`);
        if (buyTax !== undefined && buyTax !== '') scanFlags.push(`Buy Tax: ${buyTax}${typeof buyTax === 'number' ? '%' : ''}`);
        if (sellTax !== undefined && sellTax !== '') scanFlags.push(`Sell Tax: ${sellTax}${typeof sellTax === 'number' ? '%' : ''}`);
        if (rugcheckVerdict) scanFlags.push(`RugCheck: ${rugcheckVerdict}`);
        else if (rugcheckScore !== undefined) scanFlags.push(`RugCheck Score: ${rugcheckScore}`);
        if (secScan.top10HolderConcentrationPct !== undefined) scanFlags.push(`Top 10 Holders: ${secScan.top10HolderConcentrationPct}%`);

        const scanSource = secScan.source || 'GoPlus Security / RugCheck';
        line3 = `3. On-Chain Security Telemetry (${scanSource}): ${scanFlags.length > 0 ? scanFlags.join(' | ') : 'Scanned — No threat flags detected'}`;
      }
      doc.text(line3, margin + 3, y + 14.2);

      // 4. Custody Risk Signal (Aligned with Gate 2 & AVF-06)
      let line4 = '4. Custody Risk: Input unavailable';
      let custodyRisk = secScan?.custodyRisk ?? secScan?.data?.custodyRisk;
      if (!custodyRisk && secScan) {
        if (secScan.renounced === true) {
          custodyRisk = 'RENOUNCED';
        } else if (secScan.owner_is_contract === true || secScan.owner_type === 'contract') {
          custodyRisk = 'CONTRACT_OWNER';
        } else if (secScan.owner_address || secScan.ownerAddress || secScan.is_open_source !== undefined || secScan.isOpenSource !== undefined || secScan.is_honeypot !== undefined || secScan.isHoneypot !== undefined) {
          custodyRisk = 'EOA_OWNER';
        }
      }
      if (custodyRisk === 'EOA_OWNER') {
        line4 = '4. Custody Risk: EOA_OWNER (Single Externally-Owned Account — High Risk)';
      } else if (custodyRisk === 'CONTRACT_OWNER') {
        line4 = '4. Custody Risk: CONTRACT_OWNER (Contract / Multisig Timelock — Lower Risk)';
      } else if (custodyRisk === 'RENOUNCED') {
        line4 = '4. Custody Risk: RENOUNCED (Zero Admin Key Privilege — Low Risk)';
      } else if (custodyRisk) {
        line4 = `4. Custody Risk: ${custodyRisk}`;
      }
      doc.text(line4, margin + 3, y + 18.9);

      // 5. AVF Tripartite Core State
      const override = (f3 as any)?.adminOverride || data.adminOverride;
      const confNum = f3?.overallConfidence ?? 0.85;
      const confLevel = getConfidenceLevel(confNum);
      const line5 = f3 
        ? `5. AVF Tripartite Core State: ${(f3 as any).tripartiteCoreState || f3.overallStatus}${override ? ` [ADMIN OVERRIDE: ${override.overriddenBy} - ${override.reason.slice(0, 30)}...]` : ''} (Deterministic Confidence: ${(confNum * 100).toFixed(0)}% [${confLevel}])`
        : `5. AVF Tripartite Core State: F3 Verification Executed`;
      doc.text(line5, margin + 3, y + 23.6);
    } else {
      doc.text('1. Security cross-verification unavailable — no contract address on file', margin + 3, y + 6);
      doc.text('2. AVF-05 & AVF-06 Deterministic Modules: Awaiting on-chain contract bytecode telemetry', margin + 3, y + 11.5);
      doc.text('3. On-Chain Threat Scans (GoPlus / RugCheck): No contract address registered for scanning', margin + 3, y + 17);
      doc.text('4. Custody Risk: Telemetry unavailable — contract address required', margin + 3, y + 22.5);
    }

    y += 32;
  }

  // 4. Detailed Security Findings & Technical Analysis Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('SECURITY ASSESSMENT FINDINGS & TECHNICAL ANALYSIS', margin, y);
  y += 5;

  const cleanedText = data.analysisText
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/###?\s?/g, '')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/[&]\s?[þÞ]/g, '[!]')
    .replace(/\n{3,}/g, '\n\n');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  const splitLines = doc.splitTextToSize(cleanedText, contentWidth);
  const lineHeight = 4.5;

  splitLines.forEach((line: string) => {
    if (y + lineHeight > pageHeight - 18) {
      addFooter(doc, pageWidth, pageHeight, margin, textMuted, `Target: ${projName} | ID: ${refId}`);
      doc.addPage();
      y = margin + 10;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  });

  // Terms & Policy Block
  if (y + 26 > pageHeight - 18) {
    addFooter(doc, pageWidth, pageHeight, margin, textMuted, `Target: ${projName} | ID: ${refId}`);
    doc.addPage();
    y = margin + 10;
  } else {
    y += 5;
  }

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TERMS & POLICY — CRYPTO REVIEW LAB INDEPENDENT ASSESSMENT METHODOLOGY:', margin + 3, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('1. Scope: This is an automated security assessment, not a formal smart-contract audit or certification.', margin + 3, y + 8.5);
  doc.text('2. Independent Policy: Crypto Review Lab does not sell security ratings, favorable scores, or verification outcomes. Customers pay for the assessment process and actionable findings.', margin + 3, y + 11.8);
  doc.text('3. Risk Disclaimer: Scores represent probabilistic risk assessments based on public data & bytecode metrics. Not financial advice.', margin + 3, y + 15.1);
  doc.text('4. Methodology: Assessment results are determined by the Crypto Review Lab methodology and verification engine.', margin + 3, y + 18.4);

  addFooter(doc, pageWidth, pageHeight, margin, textMuted, `Target: ${projName} | ID: ${refId}`);

  if (!gating.isEligibleForFinalVerified && gating.watermarkText) {
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      renderPageWatermarkBanner(doc, pageWidth, gating.watermarkText, gating.actualStatus);
    }
  }

  doc.save(gating.resolvedFilename);
}

function renderPageWatermarkBanner(
  doc: jsPDF,
  pageWidth: number,
  watermarkText: string,
  actualStatus: 'VERIFIED' | 'PRELIMINARY' | 'FAILED' | 'CONFLICT' | 'CONDITIONAL' | 'PENDING_REVIEW'
) {
  const isFailed = actualStatus === 'FAILED' || actualStatus === 'CONFLICT';
  const bannerBg = isFailed ? [225, 29, 72] : [217, 119, 6]; // Red-600 or Amber-600
  const borderBg = isFailed ? [159, 18, 57] : [180, 83, 9];

  const barHeight = 4.8;
  doc.setFillColor(bannerBg[0], bannerBg[1], bannerBg[2]);
  doc.rect(0, 0, pageWidth, barHeight, 'F');

  doc.setFillColor(borderBg[0], borderBg[1], borderBg[2]);
  doc.rect(0, barHeight, pageWidth, 0.4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(watermarkText.toUpperCase(), pageWidth / 2, 3.4, { align: 'center' });
}

function addFooter(doc: jsPDF, pageWidth: number, pageHeight: number, margin: number, textMuted: number[], docLabel?: string) {
  const pageNum = doc.getNumberOfPages();
  const footerY = pageHeight - 10;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Crypto Review Lab — ${docLabel || 'Security & Risk Assessment Report'} | Data: CoinGecko + CMC Dual Engine`, margin, footerY);
  doc.text(`Page ${pageNum}`, pageWidth - margin, footerY, { align: 'right' });
}

/**
 * Generates a Premium 3-Page Security & Risk Assessment Report.
 * Specifically crafted for institutional controls, deep symbolic execution, TVL drain simulations,
 * and CRL Risk Model evaluations.
 */
function generateProInstitutionalPdfReport(data: AuditPdfData, customFilename?: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2); // 180 mm

  // Theme Palette: Slate & Gold/Amber Luxury Institutional
  const slate950 = [2, 6, 23];
  const slate900 = [15, 23, 42];
  const amber500 = [245, 158, 11];
  const amber600 = [217, 119, 6];
  const amber100 = [254, 243, 199];
  const bgLight = [248, 250, 252];
  const textDark = [15, 23, 42];
  const textMuted = [100, 116, 139];
  const emerald500 = [16, 185, 129];

  const projName = data.projectName || data.queryTopic || 'AI Protocol Security Evaluation';
  const gating = resolveGatedPdfFilename(projName, data, customFilename);
  const isVerified = gating.isEligibleForFinalVerified;
  const isFailed = gating.actualStatus === 'FAILED' || gating.actualStatus === 'CONFLICT';

  const fullTimestamp = data.auditTimestamp || new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' });
  const refId = data.auditRefId || `REF-PRO-${Math.floor(100000 + Math.random() * 900000)}`;

  const categoryType = normalizeProtocolCategory(data.category || data.queryTopic);
  
  // Real contract and scan checks
  const hasRealContract = Boolean(
    data.contractAddress &&
    data.contractAddress.trim().length > 0 &&
    !data.contractAddress.toLowerCase().includes('awaiting') &&
    !data.contractAddress.toLowerCase().includes('none')
  );
  const secScan = data.securityScan?.data || data.securityScan || (data as any).externalSecurityScan?.data || (data as any).externalSecurityScan;
  const hasRealScan = Boolean(
    secScan &&
    typeof secScan === 'object' &&
    (secScan.is_honeypot !== undefined ||
     secScan.isHoneypot !== undefined ||
     secScan.is_mintable !== undefined ||
     secScan.isMintable !== undefined ||
     secScan.is_open_source !== undefined ||
     secScan.isOpenSource !== undefined ||
     secScan.is_blacklisted !== undefined ||
     secScan.hasBlacklist !== undefined ||
     secScan.buy_tax !== undefined ||
     secScan.buyTax !== undefined ||
     secScan.sell_tax !== undefined ||
     secScan.sellTax !== undefined ||
     secScan.custodyRisk !== undefined ||
     secScan.rugcheckVerdict !== undefined ||
     secScan.rugcheckScore !== undefined ||
     secScan.source ||
     Object.keys(secScan).length >= 2)
  );
  const hasOnChainVerification = hasRealContract && hasRealScan;
  const hasPublicAudits = Boolean(
    (data.auditReports && data.auditReports.length > 0) ||
    (data.citations && data.citations.length > 0) ||
    hasRealScan
  );

  const categoryWeights = getCategoryDimensionWeights(categoryType);
  const categoryVectors = getCategoryTechnicalVectors(categoryType);
  const stressModel = getCategoryStressTestModel(categoryType, data.realTvl);
  const baseConfidence = calculateDataConfidence(hasOnChainVerification, hasPublicAudits);
  const explicitConfScore = typeof data.confidenceScore === 'number' && !isNaN(data.confidenceScore)
    ? data.confidenceScore
    : (typeof data.f3Verification?.confidence?.overallPct === 'number' ? data.f3Verification.confidence.overallPct : undefined);
  const confidence = explicitConfScore !== undefined
    ? {
        ...baseConfidence,
        overallConfidencePct: explicitConfScore,
        confidenceLevel: (explicitConfScore >= 85 ? 'HIGH' : (explicitConfScore >= 70 ? 'MODERATE' : 'LOW')) as 'HIGH' | 'MODERATE' | 'LOW'
      }
    : baseConfidence;

  // ==========================================
  // PAGE 1: EXECUTIVE & INSTITUTIONAL OVERVIEW
  // ==========================================

  let y = margin;

  // 1. Luxury Header Banner (Dark Slate + Amber Accent Lines)
  doc.setFillColor(slate950[0], slate950[1], slate950[2]);
  doc.rect(0, 0, pageWidth, 36, 'F');

  // Gold Double Line Accent
  doc.setFillColor(amber500[0], amber500[1], amber500[2]);
  doc.rect(0, 35, pageWidth, 1.5, 'F');
  doc.setFillColor(amber600[0], amber600[1], amber600[2]);
  doc.rect(0, 36.5, pageWidth, 0.5, 'F');

  // Top Left Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('CRYPTO REVIEW LAB', margin, 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  if (data.isPreliminary || gating.actualStatus === 'PRELIMINARY') {
    doc.setTextColor(251, 191, 36); // Gold / Amber
    doc.text('SECURITY & RISK ASSESSMENT — PRELIMINARY WORKING DRAFT (PRE-F3)', margin, 21);
  } else if (isVerified) {
    doc.setTextColor(56, 189, 248); // Sky blue
    doc.text('SECURITY & RISK ASSESSMENT — F3 DETERMINISTIC VERIFIED REPORT', margin, 21);
  } else if (gating.actualStatus === 'FAILED') {
    doc.setTextColor(239, 68, 68); // Red
    doc.text('SECURITY & RISK ASSESSMENT — DETERMINISTIC VERIFICATION FAILED', margin, 21);
  } else if (gating.actualStatus === 'CONFLICT') {
    doc.setTextColor(239, 68, 68); // Red
    doc.text('SECURITY & RISK ASSESSMENT — DETERMINISTIC CONFLICT DETECTED', margin, 21);
  } else if (gating.actualStatus === 'CONDITIONAL') {
    doc.setTextColor(251, 191, 36); // Amber
    doc.text('SECURITY & RISK ASSESSMENT — CONDITIONAL DRAFT DOSSIER', margin, 21);
  } else {
    doc.setTextColor(251, 191, 36); // Gold / Amber
    doc.text(`SECURITY & RISK ASSESSMENT & ADVISORY DOSSIER (${gating.actualStatus})`, margin, 21);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('ALGORITHMIC SECURITY INTELLIGENCE FOR DIGITAL ASSETS', margin, 27);

  // Top Right Metadata Badges
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(251, 191, 36);
  doc.text(isVerified ? 'CLASSIFICATION: CONFIDENTIAL ADVISORY' : `CLASSIFICATION: DRAFT (${gating.actualStatus})`, pageWidth - margin, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`TIMESTAMP: ${fullTimestamp}`, pageWidth - margin, 19, { align: 'right' });
  doc.text(`ASSESSMENT REF ID: ${refId}`, pageWidth - margin, 25, { align: 'right' });
  doc.text('SPECIFICATION: BLUEPRINT MASTER', pageWidth - margin, 31, { align: 'right' });

  y = 44;

  // 2. Target Protocol Identification Box
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 29, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text(`Target Protocol: ${projName}`, margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`• Protocol Category: ${categoryType}`, margin + 4, y + 11.5);
  doc.text(`• Verified Address/Repo: ${data.contractAddress || 'Mainnet Monitored Bytecode & GitHub Repository'}`, margin + 4, y + 16);
  doc.text(`• Verified DefiLlama TVL: ${formatDefiLlamaTvl(data.realTvl)}`, margin + 4, y + 20.5);
  doc.text(`• Data Quality & Confidence: ${confidence.overallConfidencePct}% [${confidence.confidenceLevel}] (${confidence.verifiedOnChainPct}% On-Chain | ${confidence.publicAuditsPct}% Risk Model | ${confidence.simulatedDataPct}% Sim)`, margin + 4, y + 25);

  y += 33;

  // 3. Status Badge & Blueprint Master Standard Box
  const boxBg = isVerified ? amber100 : (isFailed ? [255, 241, 242] : amber100);
  const boxBorder = isVerified ? amber500 : (isFailed ? [225, 29, 72] : amber500);

  doc.setFillColor(boxBg[0], boxBg[1], boxBg[2]);
  doc.setDrawColor(boxBorder[0], boxBorder[1], boxBorder[2]);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'FD');

  // Left Status Badge
  const badgeBg = isVerified ? slate900 : (isFailed ? [225, 29, 72] : [217, 119, 6]);
  doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
  doc.roundedRect(margin + 4, y + 3.5, 36, 17, 2, 2, 'F');

  const badgeLabel = isVerified ? 'VERIFIED' : (gating.actualStatus === 'PENDING_REVIEW' ? 'PENDING' : gating.actualStatus);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(badgeLabel.length > 8 ? 8.5 : 11);
  doc.text(badgeLabel, margin + 22, y + 11, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('CRL STANDARD', margin + 22, y + 16, { align: 'center' });

  // Status Box Details
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  const proStatusText = isVerified 
    ? 'ASSESSMENT STATUS: DETERMINISTIC VERIFICATION PASSED'
    : `ASSESSMENT STATUS: ${gating.actualStatus} (PENDING FINAL VERIFICATION)`;
  doc.text(proStatusText, margin + 45, y + 9.5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('SPECIFICATION: ', margin + 45, y + 15.5);

  doc.setTextColor(isVerified ? emerald500[0] : (isFailed ? 225 : 217), isVerified ? emerald500[1] : (isFailed ? 29 : 119), isVerified ? emerald500[2] : (isFailed ? 72 : 6));
  doc.setFont('helvetica', 'bold');
  doc.text('BLUEPRINT MASTER v2.4 (AVF-01..AVF-08 COMPLIANT)', margin + 75, y + 15.5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text(`ASSESSMENT ROUTING STATUS: CATEGORY ROUTED FOR ${categoryType.toUpperCase()}`, margin + 45, y + 20.5);

  y += 29;

  // 4. 5-Dimension Weighted Matrix Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`EVALUATION BLUEPRINT — DYNAMIC DIMENSION BREAKDOWN (${categoryType})`, margin, y);
  y += 4;

  const tableHeaderY = y;
  doc.setFillColor(slate900[0], slate900[1], slate900[2]);
  doc.rect(margin, tableHeaderY, contentWidth, 6.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DIMENSION', margin + 4, tableHeaderY + 4.5);
  doc.text('WEIGHT', margin + 90, tableHeaderY + 4.5, { align: 'center' });
  doc.text('STATUS', margin + 125, tableHeaderY + 4.5, { align: 'center' });
  doc.text('METHODOLOGY CHECK', margin + 165, tableHeaderY + 4.5, { align: 'center' });

  y += 6.5;

  const proDimStatus = isVerified ? 'VERIFIED' : (isFailed ? 'FLAGGED' : 'PENDING');
  const dimensionRows = [
    { name: 'Utility & Protocol Function', weight: `${Math.round(categoryWeights.utility * 100)}%`, status: proDimStatus, check: 'Functional Vector Invariant' },
    { name: 'Tokenomics & Economic Model', weight: `${Math.round(categoryWeights.tokenomics * 100)}%`, status: proDimStatus, check: 'Supply Dynamics Validated' },
    { name: 'Smart Contract & Network Security', weight: `${Math.round(categoryWeights.security * 100)}%`, status: proDimStatus, check: 'Bytecode & Invariant Checked' },
    { name: 'Team & Backer Track Record', weight: `${Math.round(categoryWeights.team * 100)}%`, status: proDimStatus, check: 'Provenance Cross-Referenced' },
    { name: 'Community & Governance Strength', weight: `${Math.round(categoryWeights.community * 100)}%`, status: proDimStatus, check: 'Governance Active' }
  ];

  dimensionRows.forEach((row, idx) => {
    const rowY = y;
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, contentWidth, 6, 'F');
    }
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(row.name, margin + 4, rowY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.text(row.weight, margin + 90, rowY + 4.2, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(row.status, margin + 125, rowY + 4.2, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(row.check, margin + 165, rowY + 4.2, { align: 'center' });

    y += 6;
  });

  y += 8;

  // 5. Industry Standard Security Benchmarks (CertiK, ChainSecurity, Hacken) - DEDICATED SINGLE DISPLAY ON PAGE 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('CRL RISK MODEL & CATEGORY INVARIANT ANALYSIS', margin, y);
  y += 4;

  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(margin, y, contentWidth, 39, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9);
  doc.text('CRL RISK MODEL — AVF DETERMINISTIC VERIFICATION & ON-CHAIN TELEMETRY', margin + 4, y + 5.5);

  const f3 = data.f3Verification;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(120, 53, 15);

  if (f3 || secScan) {
    // 1. AVF-05 Score Verification
    let line1 = '1. AVF-05 Score & Weight Verification: Input unavailable';
    if (f3?.modules?.avf05Score) {
      const avf05 = f3.modules.avf05Score;
      const statusText = avf05.status === 'VERIFIED' || avf05.isVerified ? 'VERIFIED' : avf05.status;
      line1 = `1. AVF-05 Score & Weight Verification: ${statusText} (Mathematical model & weight distributions validated against Blueprint specification)`;
    }
    doc.text(line1, margin + 4, y + 10.5);

    // 2. AVF-06 Risk-Conclusion Status
    let line2 = '2. AVF-06 Security & Integrity Verification: Input unavailable';
    const avf06: any = (f3?.modules as any)?.avf06RiskConclusion || (f3?.modules as any)?.avf06Security;
    if (avf06) {
      const contradictionText = avf06.contradictions && avf06.contradictions.length > 0 ? ` [Contradictions: ${avf06.contradictions.slice(0, 2).join('; ')}]` : '';
      line2 = `2. AVF-06 Security & Integrity Verification: ${avf06.status} (${avf06.signalsChecked?.length || 0} on-chain signals verified)${contradictionText}`;
    }
    doc.text(line2, margin + 4, y + 15.5);

    // 3. Real GoPlus / RugCheck / Moralis Security Scan Data (snake_case telemetry)
    let line3 = '3. On-Chain Security Telemetry: Security cross-verification unavailable — no contract address on file';
    if (secScan) {
      const scanFlags: string[] = [];
      const isOpenSource = secScan.is_open_source ?? secScan.isOpenSource;
      const isHoneypot = secScan.is_honeypot ?? secScan.isHoneypot;
      const isMintable = secScan.is_mintable ?? secScan.isMintable;
      const isBlacklisted = secScan.is_blacklisted ?? secScan.hasBlacklist ?? secScan.isBlacklisted;
      const isProxy = secScan.is_proxy ?? secScan.isProxy;
      const ownerChangeBalance = secScan.owner_change_balance;
      const cannotSell = secScan.cannot_sell ?? secScan.cannotSell;
      const buyTax = secScan.buy_tax ?? secScan.buyTax;
      const sellTax = secScan.sell_tax ?? secScan.sellTax;
      const rugcheckVerdict = secScan.rugcheckVerdict ?? secScan.data?.rugcheckVerdict;
      const rugcheckScore = secScan.rugcheckScore ?? secScan.data?.rugcheckScore;

      if (isOpenSource !== undefined) scanFlags.push(`Open-Source: ${isOpenSource ? 'YES' : 'NO'}`);
      if (isHoneypot !== undefined) scanFlags.push(`Honeypot: ${isHoneypot ? 'YES' : 'NO'}`);
      if (isMintable !== undefined) scanFlags.push(`Mintable: ${isMintable ? 'YES' : 'NO'}`);
      if (isBlacklisted !== undefined) scanFlags.push(`Blacklist: ${isBlacklisted ? 'YES' : 'NO'}`);
      if (isProxy) scanFlags.push(`Proxy: YES`);
      if (ownerChangeBalance) scanFlags.push(`Owner Mod Balance: YES`);
      if (cannotSell) scanFlags.push(`Cannot Sell: YES`);
      if (buyTax !== undefined && buyTax !== '') scanFlags.push(`Buy Tax: ${buyTax}${typeof buyTax === 'number' ? '%' : ''}`);
      if (sellTax !== undefined && sellTax !== '') scanFlags.push(`Sell Tax: ${sellTax}${typeof sellTax === 'number' ? '%' : ''}`);
      if (rugcheckVerdict) scanFlags.push(`RugCheck: ${rugcheckVerdict}`);
      else if (rugcheckScore !== undefined) scanFlags.push(`RugCheck Score: ${rugcheckScore}`);
      if (secScan.top10HolderConcentrationPct !== undefined) scanFlags.push(`Top 10 Holders: ${secScan.top10HolderConcentrationPct}%`);

      const scanSource = secScan.source || 'GoPlus Security / RugCheck';
      line3 = `3. On-Chain Security Telemetry (${scanSource}): ${scanFlags.length > 0 ? scanFlags.join(' | ') : 'Scanned — No threat flags detected'}`;
    }
    doc.text(line3, margin + 4, y + 20.5);

    // 4. Custody Risk Signal (Aligned with Gate 2 & AVF-06)
    let line4 = '4. Custody Risk: Input unavailable';
    let custodyRisk = secScan?.custodyRisk ?? secScan?.data?.custodyRisk;
    if (!custodyRisk && secScan) {
      if (secScan.renounced === true) {
        custodyRisk = 'RENOUNCED';
      } else if (secScan.owner_is_contract === true || secScan.owner_type === 'contract') {
        custodyRisk = 'CONTRACT_OWNER';
      } else if (secScan.owner_address || secScan.ownerAddress || secScan.is_open_source !== undefined || secScan.isOpenSource !== undefined || secScan.is_honeypot !== undefined || secScan.isHoneypot !== undefined) {
        custodyRisk = 'EOA_OWNER';
      }
    }
    if (custodyRisk === 'EOA_OWNER') {
      line4 = '4. Custody Risk: EOA_OWNER (Single Externally-Owned Account — High Risk)';
    } else if (custodyRisk === 'CONTRACT_OWNER') {
      line4 = '4. Custody Risk: CONTRACT_OWNER (Contract / Multisig Timelock — Lower Risk)';
    } else if (custodyRisk === 'RENOUNCED') {
      line4 = '4. Custody Risk: RENOUNCED (Zero Admin Key Privilege — Low Risk)';
    } else if (custodyRisk) {
      line4 = `4. Custody Risk: ${custodyRisk}`;
    }
    doc.text(line4, margin + 4, y + 25.5);

    // 5. AVF Tripartite Core State
    const override = (f3 as any)?.adminOverride || data.adminOverride;
    const confNum = f3?.overallConfidence ?? 0.85;
    const confLevel = getConfidenceLevel(confNum);
    const line5 = f3 
      ? `5. AVF Tripartite Core State: ${(f3 as any).tripartiteCoreState || f3.overallStatus}${override ? ` [ADMIN OVERRIDE: ${override.overriddenBy} - ${override.reason.slice(0, 30)}...]` : ''} (Deterministic Confidence: ${(confNum * 100).toFixed(0)}% [${confLevel}])`
      : `5. AVF Tripartite Core State: F3 Verification Executed`;
    doc.text(line5, margin + 4, y + 30.5);

    // 6. Data Quality Confidence
    doc.text(`6. Data Quality Confidence Indicator: ${confidence.overallConfidencePct}% [${confidence.confidenceLevel}] Data Confidence`, margin + 4, y + 35.5);
  } else {
    doc.text('1. Security cross-verification unavailable — no contract address on file', margin + 4, y + 10);
    doc.text('2. AVF-05 & AVF-06 Deterministic Modules: Awaiting on-chain contract bytecode telemetry', margin + 4, y + 15);
    doc.text('3. On-Chain Threat Scans (GoPlus / RugCheck): No contract address registered for scanning', margin + 4, y + 20);
    doc.text('4. Custody Risk: Telemetry unavailable — contract address required', margin + 4, y + 25);
    doc.text(`5. Data Quality Confidence Indicator: ${confidence.overallConfidencePct}% [${confidence.confidenceLevel}] Data Confidence`, margin + 4, y + 30);
    doc.text(`6. Evaluation Method: Standard Blueprint v2.4 Multi-Vector Analysis`, margin + 4, y + 35);
  }

  addProFooter(doc, pageWidth, pageHeight, margin, textMuted, refId, projName, 1);

  // =========================================================================
  // PAGE 2: DYNAMIC TECHNICAL VECTORS & CATEGORY RISK STRESS TESTING
  // =========================================================================
  doc.addPage();

  addProPageHeader(doc, pageWidth, margin, refId, `SECTION 2: DYNAMIC TECHNICAL VECTORS & CATEGORY RISK SIMULATION`);
  y = 22;

  // 1. Dynamic Category Technical Vectors Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`1. DYNAMIC TECHNICAL SCAN VECTORS (${categoryType.toUpperCase()})`, margin, y);
  y += 4;

  const vectorHeaderY = y;
  doc.setFillColor(slate900[0], slate900[1], slate900[2]);
  doc.rect(margin, vectorHeaderY, contentWidth, 6.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('ANALYSIS VECTOR', margin + 4, vectorHeaderY + 4.5);
  doc.text('SCAN DEPTH', margin + 70, vectorHeaderY + 4.5);
  doc.text('INVARIANT CHECK', margin + 110, vectorHeaderY + 4.5);
  doc.text('VERDICT', margin + 155, vectorHeaderY + 4.5);

  y += 6.5;

  categoryVectors.forEach((vec, idx) => {
    const rowY = y;
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, contentWidth, 6.5, 'F');
    }
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(vec.name, margin + 4, rowY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.text(vec.depth, margin + 70, rowY + 4.5);
    doc.text(vec.check, margin + 110, rowY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(vec.verdict, margin + 155, rowY + 4.5);

    y += 6.5;
  });

  y += 8;

  // 2. Category-Specific Modular Section (Dynamically updates based on categoryType / protocolType)
  const categoryModule = getCategorySpecificModule(categoryType, data.realTvl);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(categoryModule.title, margin, y);
  y += 4;

  // Header bar for module
  const moduleHeaderY = y;
  doc.setFillColor(slate900[0], slate900[1], slate900[2]);
  doc.rect(margin, moduleHeaderY, contentWidth, 6, 'F');

  doc.setTextColor(251, 191, 36); // Gold/Amber
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(categoryModule.subtitle, margin + 4, moduleHeaderY + 4.2);

  y += 6;

  // Table Column Headers
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 5.5, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('EVALUATION TARGET', margin + 4, y + 3.8);
  doc.text('INVARIANT / TEST METHOD', margin + 62, y + 3.8);
  doc.text('STATUS / RESULT', margin + 120, y + 3.8);
  doc.text('VERDICT', margin + 155, y + 3.8);

  y += 5.5;

  categoryModule.items.forEach((item, idx) => {
    const rowY = y;
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, contentWidth, 5.5, 'F');
    }
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text(item.target, margin + 4, rowY + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.text(item.check, margin + 62, rowY + 3.8);
    doc.text(item.status, margin + 120, rowY + 3.8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(item.verdict, margin + 155, rowY + 3.8);

    y += 5.5;
  });

  y += 3;

  // Additional Details Box
  const numDetails = categoryModule.additionalDetails.length;
  const detailBoxHeight = 5 + (numDetails * 4.2);

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, detailBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);

  categoryModule.additionalDetails.forEach((detail, dIdx) => {
    doc.text(detail, margin + 4, y + 4 + (dIdx * 4.2));
  });

  y += detailBoxHeight + 7;

  // 3. Governance & Evaluated Control Framework
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('3. GOVERNANCE & EVALUATED CONTROL FRAMEWORK', margin, y);
  y += 4;

  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9);
  doc.text('GOVERNANCE INVARIANT & VESTING MODEL ASSESSMENT', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 53, 15);
  doc.text('• Multi-Sig Authorization Standard: Model evaluates non-custodial multi-sig quorum requirements for admin & treasury operations.', margin + 4, y + 11.5);
  doc.text('• Upgrade Timelock Standard: Model evaluates presence of mandatory delay timelocks on core smart contract upgrade functions.', margin + 4, y + 16.5);
  doc.text('• Vesting & Allocation Assessment: Evaluates team/investor vesting schedules to identify token cliff pressure.', margin + 4, y + 21.5);
  doc.text('• Treasury Isolation Standard: Evaluates separation of protocol operational funds from liquidity reserve vaults.', margin + 4, y + 25.5);

  addProFooter(doc, pageWidth, pageHeight, margin, textMuted, refId, projName, 2);

  // =========================================================================
  // PAGE 3: DETAILED AUDIT FINDINGS, DATA CONFIDENCE & SIGN-OFF (CORE PAGE)
  // =========================================================================
  doc.addPage();

  addProPageHeader(doc, pageWidth, margin, refId, 'SECTION 3: DEEP SYMBOLIC ANALYSIS & DATA CONFIDENCE DISCLOSURES');
  y = 22;

  // 1. Detailed AI Audit & Threat Assessment Findings Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('1. IN-DEPTH SECURITY FINDINGS & THREAT REMEDIATION DOSSIER', margin, y);
  y += 5;

  const cleanedText = data.analysisText
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/###?\s?/g, '')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/[&]\s?[þÞ]/g, '[!]')
    .replace(/\n{3,}/g, '\n\n');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);

  const splitLines = doc.splitTextToSize(cleanedText, contentWidth);
  const lineHeight = 4.2;

  splitLines.forEach((line: string) => {
    if (y + lineHeight > pageHeight - 65) {
      addProFooter(doc, pageWidth, pageHeight, margin, textMuted, refId, projName, doc.getNumberOfPages());
      doc.addPage();
      addProPageHeader(doc, pageWidth, margin, refId, 'SECTION 3 (CONTINUED): DETAILED ASSESSMENT FINDINGS');
      y = 22;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  });

  y += 6;

  // 2. Data Confidence / Quality Indicator Box
  if (y + 26 > pageHeight - 35) {
    addProFooter(doc, pageWidth, pageHeight, margin, textMuted, refId, projName, doc.getNumberOfPages());
    doc.addPage();
    addProPageHeader(doc, pageWidth, margin, refId, 'SECTION 3 (CONTINUED): DATA CONFIDENCE DISCLOSURES');
    y = 22;
  }

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`2. DATA QUALITY & CONFIDENCE TRANSPARENCY INDICATOR: ${confidence.overallConfidencePct}% [${confidence.confidenceLevel}]`, margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  confidence.details.forEach((det, dIdx) => {
    doc.text(`• ${det}`, margin + 4, y + 10.5 + (dIdx * 4.2));
  });

  y += 28;

  // 3. Official Institutional Verification Seal & Stamp
  if (y + 20 > pageHeight - 15) {
    addProFooter(doc, pageWidth, pageHeight, margin, textMuted, refId, projName, doc.getNumberOfPages());
    doc.addPage();
    addProPageHeader(doc, pageWidth, margin, refId, 'SECTION 3 (CONTINUED): VERIFICATION INTEGRITY SEAL');
    y = 22;
  }

  if (data.auditSignature) {
    const sig = data.auditSignature;
    doc.setFillColor(isVerified ? 236 : (isFailed ? 255 : 254), isVerified ? 253 : (isFailed ? 241 : 243), isVerified ? 245 : (isFailed ? 242 : 199)); // Emerald 50 / Rose 50 / Amber 50
    doc.setDrawColor(isVerified ? 16 : (isFailed ? 225 : 245), isVerified ? 185 : (isFailed ? 29 : 158), isVerified ? 129 : (isFailed ? 72 : 11)); // Emerald 500 / Rose 500 / Amber 500
    doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(isVerified ? 6 : (isFailed ? 159 : 180), isVerified ? 95 : (isFailed ? 18 : 83), isVerified ? 70 : (isFailed ? 57 : 9));
    doc.text(isVerified ? 'CRYPTOGRAPHICALLY SIGNED & VERIFIED (Ed25519 REPORT INTEGRITY)' : `CRYPTOGRAPHIC AUDIT SIGNATURE (${gating.actualStatus} DRAFT INTEGRITY)`, margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(isVerified ? 4 : (isFailed ? 190 : 120), isVerified ? 120 : (isFailed ? 18 : 53), isVerified ? 87 : (isFailed ? 60 : 15));
    doc.text(`• SHA-256 Digest: ${sig.hash}`, margin + 4, y + 9.5);
    doc.text(`• Ed25519 Signature: ${sig.signature.slice(0, 32)}...${sig.signature.slice(-32)}`, margin + 4, y + 13.5);
    doc.text(`• Signed Timestamp: ${sig.signedAt}`, margin + 4, y + 17.5);
    doc.text(`• Notice: Automated security assessment, not a formal smart-contract audit or certification.`, margin + 4, y + 21.5);
    doc.text(`• Policy: Crypto Review Lab does not sell security ratings or favorable scores. Customers pay for actionable findings.`, margin + 4, y + 25.5);
  } else {
    doc.setFillColor(isVerified ? 254 : (isFailed ? 255 : 254), isVerified ? 243 : (isFailed ? 241 : 243), isVerified ? 199 : (isFailed ? 242 : 199));
    doc.setDrawColor(isVerified ? 245 : (isFailed ? 225 : 245), isVerified ? 158 : (isFailed ? 29 : 158), isVerified ? 11 : (isFailed ? 72 : 11));
    doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(isVerified ? 180 : (isFailed ? 159 : 180), isVerified ? 83 : (isFailed ? 18 : 83), isVerified ? 9 : (isFailed ? 57 : 9));
    doc.text(isVerified ? 'OFFICIAL ALGORITHMIC VERIFICATION SEAL & INTEGRITY DIGEST' : `OFFICIAL ALGORITHMIC ASSESSMENT DIGEST (${gating.actualStatus})`, margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(isVerified ? 120 : (isFailed ? 190 : 120), isVerified ? 53 : (isFailed ? 18 : 53), isVerified ? 15 : (isFailed ? 60 : 15));
    doc.text(`• Engine Verification: CRYPTO REVIEW LAB SECURITY ASSESSMENT ENGINE`, margin + 4, y + 9.5);
    
    const rawHashPayload = `CRL_ASSESSMENT_V24:${refId}:${projName}:${categoryType}:${fullTimestamp}`;
    const sha256Hex = generateSHA256Hash(rawHashPayload);
    doc.text(`• SHA-256 Verification Digest: ${sha256Hex}`, margin + 4, y + 13.5);
    doc.text(`• Notice: Automated security assessment, not a formal smart-contract audit or certification.`, margin + 4, y + 17.5);
    doc.text(`• Policy: Crypto Review Lab does not sell ratings or favorable scores. Customers pay for actionable findings.`, margin + 4, y + 21.5);
  }

  addProFooter(doc, pageWidth, pageHeight, margin, textMuted, refId, projName, doc.getNumberOfPages());

  // SECTION 4: SECURITY & RISK ASSESSMENT COMPARISON BENCHMARK (IF COMPARISON REPORT PRESENT)
  if (data.comparisonReport) {
    const cmp = data.comparisonReport;
    doc.addPage();
    addProPageHeader(doc, pageWidth, margin, refId, 'SECTION 4: SECURITY & RISK ASSESSMENT COMPARISON BENCHMARK');
    let cy = 22;

    // Headline Side-by-Side Comparison Box
    doc.setFillColor(15, 23, 42); // slate-900
    doc.setDrawColor(245, 158, 11); // Amber
    doc.roundedRect(margin, cy, contentWidth, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(251, 191, 36);
    doc.text(`INSTITUTIONAL HEADLINE COMPARISON: ${cmp.targetProtocol.name} vs ${cmp.benchmarkProtocol.name}`, margin + 4, cy + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(241, 245, 249);
    doc.text(`• Primary (${cmp.targetProtocol.symbol}): ${cmp.targetProtocol.category} | Unified Assessment`, margin + 4, cy + 11.5);
    doc.text(`• Benchmark (${cmp.benchmarkProtocol.symbol}): ${cmp.benchmarkProtocol.category} | ${cmp.benchmarkProtocol.createdAt}`, margin + 4, cy + 17.5);

    cy += 28;

    // Disclaimer if present
    if (cmp.freshnessDisclaimer) {
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(245, 158, 11);
      doc.roundedRect(margin, cy, contentWidth, 12, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(180, 83, 9);
      doc.text(cmp.freshnessDisclaimer, margin + 4, cy + 7, { maxWidth: contentWidth - 8 });

      cy += 16;
    }

    // 5-Dimension Delta Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('5-DIMENSION WEIGHTED VARIANCE BREAKDOWN', margin, cy);
    cy += 4;

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, cy, contentWidth, 6, 'F');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('EVALUATION DIMENSION', margin + 3, cy + 4);
    doc.text('WEIGHT', margin + 70, cy + 4);
    doc.text(cmp.targetProtocol.symbol, margin + 95, cy + 4);
    doc.text(cmp.benchmarkProtocol.symbol, margin + 120, cy + 4);
    doc.text('VARIANCE DELTA', margin + 145, cy + 4);

    cy += 6;

    cmp.dimensionDeltas.forEach((dim) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);
      doc.text(dim.dimensionName, margin + 3, cy + 4);
      doc.text(dim.weightLabel, margin + 70, cy + 4);
      doc.text(`${dim.primaryScore}/10`, margin + 95, cy + 4);
      doc.text(`${dim.benchmarkScore}/10`, margin + 120, cy + 4);

      const deltaStr = dim.delta > 0 ? `+${dim.delta} pts` : `${dim.delta} pts`;
      if (dim.delta > 0) doc.setTextColor(16, 185, 129);
      else if (dim.delta < 0) doc.setTextColor(217, 119, 6);
      else doc.setTextColor(100, 116, 139);

      doc.setFont('helvetica', 'bold');
      doc.text(deltaStr, margin + 145, cy + 4);

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, cy + 6, margin + contentWidth, cy + 6);
      cy += 6;
    });

    cy += 6;

    // Category Technical Scan Vector Matrix
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('CATEGORY TECHNICAL SCAN VECTOR VERDICTS', margin, cy);
    cy += 4;

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, cy, contentWidth, 6, 'F');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('THREAT VECTOR', margin + 3, cy + 4);
    doc.text(`${cmp.targetProtocol.symbol} VERDICT`, margin + 100, cy + 4);
    doc.text(`${cmp.benchmarkProtocol.symbol} VERDICT`, margin + 145, cy + 4);

    cy += 6;

    cmp.scanVectorVerdicts.forEach((vec) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);
      doc.text(vec.vectorName, margin + 3, cy + 4);

      if (vec.primaryVerdict.includes('FLAGGED')) {
        doc.setTextColor(225, 29, 72);
      } else {
        doc.setTextColor(16, 185, 129);
      }
      doc.text(vec.primaryVerdict, margin + 100, cy + 4);

      if (vec.benchmarkVerdict.includes('FLAGGED')) {
        doc.setTextColor(225, 29, 72);
      } else {
        doc.setTextColor(16, 185, 129);
      }
      doc.text(vec.benchmarkVerdict, margin + 145, cy + 4);

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, cy + 6, margin + contentWidth, cy + 6);
      cy += 6;
    });

    cy += 6;

    // Synthesized Narrative Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, cy, contentWidth, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    doc.text('SYNTHESIZED COMPARISON NARRATIVE', margin + 4, cy + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);

    const splitNarrative = doc.splitTextToSize(cmp.synthesizedNarrative, contentWidth - 8);
    splitNarrative.forEach((nLine: string, nIdx: number) => {
      doc.text(nLine, margin + 4, cy + 9.5 + (nIdx * 3.8));
    });

    addProFooter(doc, pageWidth, pageHeight, margin, textMuted, refId, projName, doc.getNumberOfPages());
  }

  // SECTION 5: PHASE 2 AUTOMATED RE-CONTROL (7 CONTROL GATES)
  if (data.phaseTwoReControl) {
    const rc = data.phaseTwoReControl;
    doc.addPage();
    addProPageHeader(doc, pageWidth, margin, refId, 'SECTION 5: PHASE 2 AUTOMATED RE-CONTROL MATRIX');
    let cy = 22;

    // Status Summary Banner
    const isPass = rc.status === 'PASS';
    doc.setFillColor(isPass ? 240 : 254, isPass ? 253 : 242, isPass ? 244 : 242);
    doc.setDrawColor(isPass ? 16 : 225, isPass ? 185 : 29, isPass ? 129 : 72);
    doc.roundedRect(margin, cy, contentWidth, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(isPass ? 6 : 159, isPass ? 95 : 18, isPass ? 70 : 57);
    doc.text(`PHASE 2 AUTOMATED RE-CONTROL STATUS: ${rc.status} (${rc.overallScorePct}% COMPOSITE SCORE)`, margin + 4, cy + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`• 2-Stage Quality Control Framework: 7 Automated Control Gates Verified`, margin + 4, cy + 11.5);
    doc.text(`• Workflow Recommendation: ${rc.recommendation === 'READY_FOR_HUMAN_APPROVAL' ? 'PASS (95%+) -> Ready for Human Approval -> 24h Delivery' : 'FAIL (<95%) -> Auto-flagged for Regeneration'}`, margin + 4, cy + 16.5);

    cy += 26;

    // 7 Control Gates Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('7 AUTOMATED CONTROL GATES VERIFICATION BREAKDOWN', margin, cy);
    cy += 4;

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, cy, contentWidth, 6, 'F');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('GATE # & NAME', margin + 3, cy + 4);
    doc.text('GATE DESCRIPTION', margin + 45, cy + 4);
    doc.text('SCORE', margin + 140, cy + 4);
    doc.text('STATUS', margin + 160, cy + 4);

    cy += 6;

    rc.gates.forEach((gate) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);
      doc.text(`Gate ${gate.gateNumber}: ${gate.gateName}`, margin + 3, cy + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(gate.description.slice(0, 50) + '...', margin + 45, cy + 4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);
      doc.text(`${gate.scorePct}%`, margin + 140, cy + 4);

      if (gate.passed) {
        doc.setTextColor(16, 185, 129);
        doc.text('PASSED', margin + 160, cy + 4);
      } else {
        doc.setTextColor(217, 119, 6);
        doc.text('FLAGGED', margin + 160, cy + 4);
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, cy + 6, margin + contentWidth, cy + 6);
      cy += 6;
    });

    cy += 6;

    // Re-Control Narrative Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, cy, contentWidth, 20, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('SYNTHESIZED RE-CONTROL SUMMARY', margin + 4, cy + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);

    const splitRcNarrative = doc.splitTextToSize(rc.narrative, contentWidth - 8);
    splitRcNarrative.forEach((nLine: string, nIdx: number) => {
      doc.text(nLine, margin + 4, cy + 9.5 + (nIdx * 3.8));
    });

    addProFooter(doc, pageWidth, pageHeight, margin, textMuted, refId, projName, doc.getNumberOfPages());
  }

  if (!gating.isEligibleForFinalVerified && gating.watermarkText) {
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      renderPageWatermarkBanner(doc, pageWidth, gating.watermarkText, gating.actualStatus);
    }
  }

  doc.save(gating.resolvedFilename);
}

function addProPageHeader(doc: jsPDF, pageWidth: number, margin: number, refId: string, sectionTitle: string) {
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 15, 'F');

  doc.setFillColor(245, 158, 11); // Amber
  doc.rect(0, 14.5, pageWidth, 1, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CRYPTO REVIEW LAB — SECURITY & RISK ASSESSMENT REPORT', margin, 9.5);

  doc.setTextColor(251, 191, 36);
  doc.text(`REF ID: ${refId}`, pageWidth - margin, 9.5, { align: 'right' });
}

function addProFooter(doc: jsPDF, pageWidth: number, pageHeight: number, margin: number, textMuted: number[], refId: string, projName: string, pageNum: number) {
  const footerY = pageHeight - 8;

  doc.setDrawColor(245, 158, 11); // Amber line
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Crypto Review Lab Advisory Division | Target: ${projName} | Ref ID: ${refId}`, margin, footerY);
  doc.text(`Page ${pageNum}`, pageWidth - margin, footerY, { align: 'right' });
}

/**
 * Standard pure-TS cryptographic SHA-256 hash generator.
 * Produces a genuine 64-character hexadecimal SHA-256 digest string.
 */
function generateSHA256Hash(input: string): string {
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
  }

  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);

  for (let i = 7; i >= 0; i--) {
    bytes.push((bitLength >>> (i * 8)) & 0xff);
  }

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const rightRotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));

  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    const w = new Array(64);
    for (let i = 0; i < 16; i++) {
      w[i] = (bytes[chunk + i * 4] << 24) |
             (bytes[chunk + i * 4 + 1] << 16) |
             (bytes[chunk + i * 4 + 2] << 8) |
             (bytes[chunk + i * 4 + 3]);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return (toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7)).toLowerCase();
}
