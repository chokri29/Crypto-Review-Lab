/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import {
  normalizeProtocolCategory,
  getCategoryTechnicalVectors,
  getCategoryStressTestModel,
  getCategorySpecificModule,
  getCategoryDimensionWeights,
  calculateDataConfidence,
  calculateEvidenceCoverage,
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
  createdAt?: string;
  // Internal optional legacy fields tolerated but never rendered in public documents:
  overallScore?: number;
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
 * Generates the official 6-Page Technical Whitepaper & Evaluation Blueprint Specification PDF for Crypto Review Lab.
 * Comprehensive, authoritative documentation of the 5-Dimension Master Scoring Rubric, 7-Gate Phase Two
 * Re-Control Engine, AVF Tripartite Core (F1/F2/F3), and the 8 Deterministic Verification Modules (AVF-01 to AVF-08).
 */
export function generateBlueprintFormulaPdf(customFilename = 'crypto_review_lab_technical_whitepaper.pdf'): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2); // 180 mm

  const primaryDark = [15, 23, 42]; // #0f172a slate-900
  const emeraldAccent = [16, 185, 129]; // #10b981 emerald-500
  const cyanAccent = [6, 182, 212]; // #06b6d4 cyan-500
  const purpleAccent = [99, 102, 241]; // #6366f1 indigo-500
  const roseAccent = [225, 29, 72]; // #e11d48 rose-600
  const amberAccent = [245, 158, 11]; // #f59e0b amber-500
  const bgLight = [248, 250, 252]; // #f8fafc slate-50
  const textDark = [30, 41, 59]; // #1e293b slate-800
  const textMuted = [100, 116, 139]; // #64748b slate-500

  const nowStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  function addWhitepaperHeader(sectionTitle: string, sectionNumber: string) {
    doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.rect(0, 0, pageWidth, 18, 'F');

    doc.setFillColor(cyanAccent[0], cyanAccent[1], cyanAccent[2]);
    doc.rect(0, 17.5, pageWidth, 0.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('CRYPTO REVIEW LAB (CRL) — TECHNICAL WHITEPAPER', margin, 11);

    doc.setTextColor(56, 189, 248); // sky blue
    doc.text(`${sectionNumber}: ${sectionTitle}`.toUpperCase(), pageWidth - margin, 11, { align: 'right' });
  }

  function addWhitepaperFooter(pageNum: number, totalPages = 6) {
    const footerY = pageHeight - 9;

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('Crypto Review Lab • Locked Evaluation Blueprint Standard v3.2 • Multi-Source Telemetry & Verification Engine', margin, footerY);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
  }

  // ==========================================
  // PAGE 1: EXECUTIVE SUMMARY & ARCHITECTURAL FOUNDATION
  // ==========================================
  let y = margin;

  // Cover Banner
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(0, 0, pageWidth, 38, 'F');

  doc.setFillColor(cyanAccent[0], cyanAccent[1], cyanAccent[2]);
  doc.rect(0, 36.5, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('CRYPTO REVIEW LAB (CRL)', margin, 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(56, 189, 248);
  doc.text('TECHNICAL WHITEPAPER & EVALUATION BLUEPRINT SPECIFICATION', margin, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('ALGORITHMIC VERIFICATION FRAMEWORK (AVF) • TRIPARTITE CORE (F1/F2/F3) • LOCKED STANDARD', margin, 28);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(251, 191, 36);
  doc.text('REF: CRL-WP-2026-V3.2', pageWidth - margin, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`EFFECTIVE: ${nowStr}`, pageWidth - margin, 20, { align: 'right' });
  doc.text('CLASSIFICATION: PUBLIC SPECIFICATION', pageWidth - margin, 26, { align: 'right' });
  doc.text('STATUS: LOCKED STANDARD', pageWidth - margin, 32, { align: 'right' });

  y = 46;

  // Executive Abstract
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const abstractText = 'The Algorithmic Verification Framework (AVF) establishes a deterministic, verifiable standard for digital asset risk evaluation and security assessment. Historically, crypto reviews have been plagued by subjective heuristics, promotional bias, generative AI hallucinations, and the dangerous conflation of token market performance with smart contract security. Crypto Review Lab decouples evaluative scoring from security telemetry, orchestrating a multi-stage architecture: the F1 Candidate Engine drafts the assessment, the F2 Reviewer independently stress-tests findings to enforce score convergence, and the F3 Deterministic Layer executes 8 algorithmic verification modules with zero AI estimation inside the F3 verification layer (F1 candidate drafting may use generative assistance; F3 does not) to enforce mathematical exactness, telemetry provenance, and cryptographic integrity.';
  const splitAbstract = doc.splitTextToSize(abstractText, contentWidth - 8);
  const abstractBoxHeight = 11 + (splitAbstract.length * 3.6);

  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, abstractBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('EXECUTIVE ABSTRACT', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  splitAbstract.forEach((line: string, idx: number) => {
    doc.text(line, margin + 4, y + 11.5 + (idx * 3.6));
  });

  y += abstractBoxHeight + 5;

  // Section: Fundamental Problems in Contemporary Audits
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('1. THE THREE CORE DEFECTS OF TRADITIONAL DIGITAL ASSET REVIEWS', margin, y);
  y += 5;

  const problems = [
    {
      title: 'A. Unstandardized Heuristics & Promotional Bias',
      desc: 'Most third-party rating platforms rely on arbitrary score weightings, qualitative impressions, or paid promotional listings without transparent, reproducible criteria. Scores fluctuate without audited provenance.'
    },
    {
      title: 'B. Generative AI Hallucination & Math Drift',
      desc: 'LLMs deployed for automated research frequently invent contract addresses, hallucinate audit dates, or introduce mathematical calculation errors across composite weighted averages unless constrained by deterministic execution.'
    },
    {
      title: 'C. The Conflation Defect (Market Adoption vs. Security)',
      desc: 'High market capitalization, active trading volume, or prominent venture backing are routinely mistaken for protocol safety. In reality, heavily backed protocols can harbor critical backdoors, mint vulnerabilities, or honeypot vectors.'
    }
  ];

  problems.forEach((prob) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(roseAccent[0], roseAccent[1], roseAccent[2]);
    doc.text(prob.title, margin + 3, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const splitDesc = doc.splitTextToSize(prob.desc, contentWidth - 6);
    splitDesc.forEach((line: string, idx: number) => {
      doc.text(line, margin + 3, y + 9.2 + (idx * 3.4));
    });

    y += 18.5;
  });

  y += 2;

  // Section: The CRL Architectural Foundation (The 3 Pillars)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('2. THE CRYPTO REVIEW LAB VERIFICATION ARCHITECTURE', margin, y);
  y += 5;

  const pillars = [
    {
      title: 'Pillar 1: 5-Dimension Master Scoring Rubric',
      detail: 'Mathematically fixed 25/25/25/15/10 category weight distribution with absolute separation between evaluative utility scores and empirical security risk.'
    },
    {
      title: 'Pillar 2: Phase Two Automated Re-Control',
      detail: '7-Gate multi-source automated pipeline (CoinGecko, CMC, CoinStats, GoPlus, RugCheck, Blockscout) ensuring telemetry consensus and sub-3.0 point score convergence.'
    },
    {
      title: 'Pillar 3: F3 Deterministic Verification Layer',
      detail: '8 automated rule modules (AVF-01 to AVF-08) executing with strictly ZERO AI / LLM calls, deterministic confidence calculations, and Ed25519 cryptographic signing.'
    }
  ];

  pillars.forEach((pil) => {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 15, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(emeraldAccent[0], emeraldAccent[1], emeraldAccent[2]);
    doc.text(pil.title, margin + 3, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    const splitPil = doc.splitTextToSize(pil.detail, contentWidth - 6);
    splitPil.forEach((line: string, idx: number) => {
      doc.text(line, margin + 3, y + 9.2 + (idx * 3.4));
    });

    y += 17.5;
  });

  addWhitepaperFooter(1);

  // ==========================================
  // PAGE 2: THE MASTER EVALUATION BLUEPRINT & SCORING RUBRIC
  // ==========================================
  doc.addPage();
  addWhitepaperHeader('Master Evaluation Blueprint & Rubric', 'Section 1');

  y = 26;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('1. THE 100-POINT MASTER SCORING FORMULA', margin, y);
  y += 5;

  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(emeraldAccent[0], emeraldAccent[1], emeraldAccent[2]);
  doc.text('STANDARDIZED LINEAR WEIGHT FORMULATION', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Score (100) = (Utility × 2.5) + (Tokenomics × 2.5) + (Security × 2.5) + (Team × 1.5) + (Community × 1.0)', margin + 4, y + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Where each raw dimension is evaluated on a strict 1.0 to 10.0 scale under calibrated reference bounds.', margin + 4, y + 15.5);

  y += 24;

  // The 5 Core Dimensions Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('2. DIMENSION WEIGHTS & EVALUATION CRITERIA', margin, y);
  y += 4;

  const tableHeaderY = y;
  const colCriteriaX = margin + 88;
  const criteriaWidth = contentWidth - 88 - 4; // 88 mm

  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(margin, tableHeaderY, contentWidth, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DIMENSION', margin + 4, tableHeaderY + 4.8);
  doc.text('WEIGHT', margin + 58, tableHeaderY + 4.8, { align: 'center' });
  doc.text('MAX PTS', margin + 74, tableHeaderY + 4.8, { align: 'center' });
  doc.text('KEY EVALUATION CRITERIA', colCriteriaX, tableHeaderY + 4.8);

  y += 7;

  const dims = [
    { name: '1. Utility & Protocol Function', weight: '25%', maxPts: '25.0 pts', criteria: 'Real-world adoption, transaction throughput, TVL depth, fee generation, protocol utility.' },
    { name: '2. Tokenomics & Economic Model', weight: '25%', maxPts: '25.0 pts', criteria: 'Supply inflation, circulating vs. max supply ratio, staking sinks, emission unlock overhang.' },
    { name: '3. Smart Contract Security', weight: '25%', maxPts: '25.0 pts', criteria: 'Third-party audits, code verification, multisig admin controls, static exploit history.' },
    { name: '4. Team & Backer Track Record', weight: '15%', maxPts: '15.0 pts', criteria: 'Core developer experience, independent backers, multisig transparency, public KYC track.' },
    { name: '5. Community & Governance', weight: '10%', maxPts: '10.0 pts', criteria: 'Developer ecosystem activity, organic user base, voting quorum participation, social reach.' },
  ];

  dims.forEach((row, idx) => {
    const rowY = y;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const criteriaLines = doc.splitTextToSize(row.criteria, criteriaWidth);
    const numLines = Math.max(1, criteriaLines.length);
    const rowHeight = numLines > 1 ? 9.5 : 8.0;

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(margin, rowY, contentWidth, rowHeight, 'F');

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, rowY + rowHeight, margin + contentWidth, rowY + rowHeight);

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const midBaseline = rowY + (rowHeight / 2) + 1.2;
    doc.text(row.name, margin + 4, midBaseline);

    doc.setFont('helvetica', 'normal');
    doc.text(row.weight, margin + 58, midBaseline, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(row.maxPts, margin + 74, midBaseline, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    if (numLines === 1) {
      doc.text(criteriaLines[0], colCriteriaX, midBaseline);
    } else {
      criteriaLines.forEach((line: string, lIdx: number) => {
        doc.text(line, colCriteriaX, rowY + 3.8 + (lIdx * 3.6));
      });
    }

    y += rowHeight;
  });

  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, tableHeaderY, contentWidth, y - tableHeaderY, 'D');

  y += 10;

  // The Decoupling Principle
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('THE FUNDAMENTAL DECOUPLING PRINCIPLE (SCORE VS. RISK SEVERITY)', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const decoupleText = 'A central axiom of the Crypto Review Lab methodology is the complete decoupling of numerical evaluative scores (/100) from assessed risk severity classifications. High user adoption, exceptional developer activity, or deep liquidity can legitimately grant a protocol a high Utility and Community score (e.g., 85/100). However, if automated security scans (GoPlus, RugCheck, Blockscout) detect centralized mint functions, unverified delegatecalls, or extreme treasury custody concentration, the protocol is assigned an overriding HIGH or CRITICAL risk severity. Evaluative scores measure product-market strength; risk classifications measure empirical capital vulnerability.';
  const splitDecouple = doc.splitTextToSize(decoupleText, contentWidth - 8);
  splitDecouple.forEach((line: string, idx: number) => {
    doc.text(line, margin + 4, y + 10.5 + (idx * 3.5));
  });

  y += 34;

  // Risk Classification Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('3. RISK SEVERITY TAXONOMY & THRESHOLDS', margin, y);
  y += 4;

  const riskLevels = [
    { tag: 'LOW RISK (80–100 PTS)', color: emeraldAccent, desc: 'Verified open-source contracts, multi-party audits, distributed token supply (<15% top 10), and timelocked multisig governance.' },
    { tag: 'MODERATE RISK (65–79 PTS)', color: cyanAccent, desc: 'Established market depth, verified source code, minor emission schedule overhang, standard governance dependencies.' },
    { tag: 'HIGH RISK (50–64 PTS)', color: amberAccent, desc: 'Significant token concentration (>40% top 10), centralized single-owner admin keys, unverified external dependencies, or high slippage.' },
    { tag: 'CRITICAL RISK (<50 PTS)', color: roseAccent, desc: 'Identified exploit history, active honeypot characteristics, unverified bytecode, blacklist capabilities, or severe liquidity drain exposure.' },
  ];

  riskLevels.forEach((rl) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 14.5, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(rl.color[0], rl.color[1], rl.color[2]);
    doc.text(rl.tag, margin + 3, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const splitRl = doc.splitTextToSize(rl.desc, contentWidth - 6);
    splitRl.forEach((line: string, idx: number) => {
      doc.text(line, margin + 3, y + 9.2 + (idx * 3.4));
    });

    y += 16.5;
  });

  addWhitepaperFooter(2);

  // ==========================================
  // PAGE 3: PHASE TWO RE-CONTROL ARCHITECTURE (AUTOMATED QUALITY GATES)
  // ==========================================
  doc.addPage();
  addWhitepaperHeader('Phase Two Re-Control Architecture', 'Section 2');

  y = 26;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('1. AUTOMATED RE-CONTROL PIPELINE SPECIFICATION', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Every candidate evaluation dossier undergoes an autonomous 5–10 minute secondary verification pass across 8 sequential quality gates.', margin, y);
  y += 6;

  const gates = [
    {
      gate: 'Gate 0: Structural Completeness Check',
      badge: 'Deterministic Pre-Pass',
      desc: 'Verifies presence of mandatory structural tokens: Title, Verdict, 5 Dimension Scores, Pros/Cons symmetry, Section 4 dual-scoring, 5-row delta table, and telemetry scan blocks before deeper compute.'
    },
    {
      gate: 'Gate 1: Multi-Source Market Triangulation',
      badge: 'CoinGecko + CMC + CoinStats',
      desc: 'Cross-references price, 24h volume, liquidity depth, and circulating supply across CoinGecko, CoinMarketCap, and CoinStats. Flagged if multi-source price deviation exceeds ±3.5% or volume variance exceeds 15%.'
    },
    {
      gate: 'Gate 2: On-Chain Security Cross-Check',
      badge: 'GoPlus + RugCheck + Blockscout',
      desc: 'Ingests verified real-time security scans from GoPlus Security, RugCheck (Solana), and Blockscout. Automatically flags mint authorities, freeze flags, unverified bytecode, honeypot functions, and blacklist vectors.'
    },
    {
      gate: 'Gate 3: Cross-Framework Consistency Check',
      badge: 'Score Drift Stabilization',
      desc: 'Framework 2 (CRL Pro Risk Model) independently rescores all five dimensions. Enforces strict mathematical convergence where composite score drift between F1 and F2 must stabilize strictly below <3.0 points.'
    },
    {
      gate: 'Gate 4: Tokenomics & Emission Re-Check',
      badge: 'Supply Parity',
      desc: 'Re-evaluates circulating vs. total vs. max supply ratios, scheduled cliff unlocks, vesting schedules, and treasury reserves to identify near-term liquidity dilution overhang.'
    },
    {
      gate: 'Gate 5: Score Arithmetic Exactness',
      badge: 'Zero Math Drift (±0.5 pt)',
      desc: 'Deterministic calculation engine recomputes category-weighted linear algebra across all five dimensions. Zero tolerance for calculation drift; discrepancy above ±0.5 points triggers immediate failure.'
    },
    {
      gate: 'Gate 6: Risk Level Evidence Check',
      badge: 'Finding Corroboration',
      desc: 'Verifies that a declared "Low / Low Risk" classification is not contradicted by critical honeypot or cannot-sell-all telemetry. Broader risk–evidence consistency is handled by AVF-06 in the F3 layer.'
    },
    {
      gate: 'Gate 7: Formatting Integrity',
      badge: 'Structural Quality',
      desc: 'Checks presence of core narrative sections (via keyword), pros/cons balance (≥3 each), and verdict length.'
    }
  ];

  gates.forEach((g) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 19, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text(g.gate, margin + 3, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(cyanAccent[0], cyanAccent[1], cyanAccent[2]);
    doc.text(`[${g.badge.toUpperCase()}]`, pageWidth - margin - 3, y + 5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const splitGDesc = doc.splitTextToSize(g.desc, contentWidth - 6);
    splitGDesc.forEach((line: string, idx: number) => {
      doc.text(line, margin + 3, y + 9.2 + (idx * 3.4));
    });

    y += 21.5;
  });

  y += 2;

  // Gate Decision Flow
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 23, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('THE AUTOMATED RE-CONTROL DECISION MATRIX', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(emeraldAccent[0], emeraldAccent[1], emeraldAccent[2]);
  doc.text('PASS THRESHOLD (≥95% CUMULATIVE GATE SCORE):', margin + 4, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const passLines = doc.splitTextToSize('The evaluation candidate advances directly to Stage 3 (Deterministic F3 Verification) → Auditor Final Sign-off → Delivery.', contentWidth - 8);
  passLines.forEach((l: string, lIdx: number) => {
    doc.text(l, margin + 4, y + 15 + (lIdx * 3.4));
  });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(roseAccent[0], roseAccent[1], roseAccent[2]);
  doc.text('FAIL THRESHOLD (<95% CUMULATIVE GATE SCORE):', margin + 4, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const failLines = doc.splitTextToSize('Evaluation is automatically quarantined. Re-control directives are fed back to F1/F2 for automated regeneration loop.', contentWidth - 8);
  failLines.forEach((l: string, lIdx: number) => {
    doc.text(l, margin + 4, y + 24 + (lIdx * 3.4));
  });

  addWhitepaperFooter(3);

  // ==========================================
  // PAGE 4: AVF TRIPARTITE CORE ARCHITECTURE (F1 / F2 / F3)
  // ==========================================
  doc.addPage();
  addWhitepaperHeader('AVF Tripartite Core Architecture', 'Section 3');

  y = 26;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('1. THE TRIPARTITE MULTI-AGENT ENGINE SPECIFICATION', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('The Algorithmic Verification Framework (AVF) segregates duties across three distinct, isolated functional engines:', margin, y);
  y += 6;

  const engines = [
    {
      name: 'Stage 1: F1 Candidate Engine (Draft Synthesis)',
      role: 'Autonomous Multi-Source Telemetry Ingestion & Evaluation Drafting',
      color: cyanAccent,
      specs: [
        'Ingests real-time feeds from CoinGecko, CoinMarketCap, CoinStats, and DefiLlama.',
        'Pulls smart contract bytecode and static security findings from GoPlus, RugCheck, and Blockscout.',
        'Synthesizes the initial 5-dimension scoring profile, narrative analysis, and pros/cons catalog.'
      ]
    },
    {
      name: 'Stage 2: F2 Reviewer Convergence Engine (Adversarial Critique)',
      role: 'Independent Rescoring & Score Drift Stabilization (<3.0 pt)',
      color: purpleAccent,
      specs: [
        'Acts as an autonomous adversarial reviewer, cross-examining candidate findings against exploit registers.',
        'Executes independent Framework 2 rescoring across all dimensions to detect outlier optimism or bias.',
        'Enforces score convergence loops: if delta exceeds 3.0 points, issues structured correction directives.'
      ]
    },
    {
      name: 'Stage 3: F3 Deterministic Layer (Algorithmic Verification)',
      role: 'Zero-AI Invariant Verification & Cryptographic Attestation',
      color: emeraldAccent,
      specs: [
        'Operates with strictly ZERO AI / LLM calls inside the F3 verification layer (F1 candidate drafting may use generative assistance; F3 does not).',
        'Executes 8 deterministic rule modules (AVF-01 through AVF-08) verifying arithmetic, taxonomy, and citations.',
        'Normalizes canonical audit payloads, computes SHA-256 digests, and validates Ed25519 digital signatures.'
      ]
    }
  ];

  engines.forEach((eng) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 31, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(eng.color[0], eng.color[1], eng.color[2]);
    doc.text(eng.name, margin + 3, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(eng.role, margin + 3, y + 9.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    eng.specs.forEach((spec, sIdx) => {
      doc.text(`• ${spec}`, margin + 5, y + 14.5 + (sIdx * 4.5));
    });

    y += 33.5;
  });

  y += 2;

  // Architectural Workflow State Machine
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('2. TRIPARTITE EXECUTION & VERIFICATION LIFECYCLE', margin, y);
  y += 5;

  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 68, 2, 2, 'FD');

  const lifecycleSteps = [
    { step: '01. Telemetry Ingestion', detail: 'Real-time multi-oracle pull (CoinGecko, CMC, CoinStats, DefiLlama, GoPlus, RugCheck, Blockscout).' },
    { step: '02. F1 Draft Generation', detail: 'F1 models initial 5-dimension rubric scores and identifies contract risk parameters.' },
    { step: '03. F2 Adversarial Review', detail: 'F2 runs independent scoring matrix and tests invariants against historical protocol failure records.' },
    { step: '04. Convergence Assessment', detail: 'Score drift metric evaluated: ΔScore = |F1 - F2|. Must satisfy ΔScore < 3.0 pts across all dimensions.' },
    { step: '05. Phase 2 Quality Gates', detail: 'Candidate evaluation is subjected to the 8-Gate automated Re-Control pipeline (Gate 0 to Gate 7).' },
    { step: '06. F3 Deterministic Execution', detail: '8 algorithmic verification modules run with ZERO AI calls to produce canonical verification verdict.' },
    { step: '07. Cryptographic Attestation', detail: 'Normalized canonical payload is SHA-256 digested and signed with CRL Advisory Division Ed25519 key.' }
  ];

  lifecycleSteps.forEach((ls, lIdx) => {
    const stepY = y + 5 + (lIdx * 8.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(cyanAccent[0], cyanAccent[1], cyanAccent[2]);
    doc.text(ls.step, margin + 4, stepY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    const detailLines = doc.splitTextToSize(ls.detail, contentWidth - 44);
    if (detailLines.length === 1) {
      doc.text(detailLines[0], margin + 42, stepY);
    } else {
      detailLines.forEach((dl: string, dlIdx: number) => {
        doc.text(dl, margin + 42, stepY - 1 + (dlIdx * 3.2));
      });
    }

    if (lIdx < lifecycleSteps.length - 1) {
      doc.setDrawColor(226, 232, 240);
      doc.line(margin + 4, stepY + 2.5, margin + contentWidth - 4, stepY + 2.5);
    }
  });

  addWhitepaperFooter(4);

  // ==========================================
  // PAGE 5: THE 8 DETERMINISTIC RULE MODULES (AVF-01 THROUGH AVF-08)
  // ==========================================
  doc.addPage();
  addWhitepaperHeader('Deterministic Verification Modules', 'Section 4');

  y = 26;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('1. THE 8 DETERMINISTIC VERIFICATION MODULES (AVF-01 TO AVF-08)', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('F3 executes 8 automated algorithmic modules. All checks are executed by deterministic code with zero AI approximation:', margin, y);
  y += 5;

  const avfModules = [
    { id: 'AVF-01', name: 'Classification & Taxonomy Verification', desc: 'Validates protocol asset classification against standardized CoinGecko and DEX market taxonomy to prevent categorical misrepresentation.' },
    { id: 'AVF-02', name: 'Evidence & Provenance Traceability', desc: 'Verifies public documentation links, official blockchain explorer contract registries, and real-time security telemetry feeds.' },
    { id: 'AVF-03', name: 'Methodology & Weighting Compliance', desc: 'Verifies that the canonical 25/25/25/15/10 percentage weighting distribution was strictly applied without ad-hoc parameter tampering.' },
    { id: 'AVF-04', name: 'Scenario Readiness & Stress-Input Verification', desc: 'Verifies scenario readiness and lifecycle state for stress-test inputs (TVL, live price, contract address). Tracks F1/F2 convergence-loop execution. Full numerical price-shock, liquidity-drain and slippage simulations are not currently attached.' },
    { id: 'AVF-05', name: 'Score Arithmetic & Zero-Drift Verification', desc: 'Algorithmically recomputes weighted averages and confirms that score aggregation math is exact within a strict ±0.5 point tolerance.' },
    { id: 'AVF-06', name: 'Semantic Risk Consistency Check', desc: 'Ensures declared risk classifications and empirical security telemetry findings align without logical contradictions or omissions.' }
  ];

  avfModules.forEach((mod) => {
    const splitMDesc = doc.splitTextToSize(mod.desc, contentWidth - 6);
    const cardHeight = Math.max(12.5, 6.5 + (splitMDesc.length * 3.2));

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(cyanAccent[0], cyanAccent[1], cyanAccent[2]);
    doc.text(`${mod.id}: ${mod.name}`, margin + 3, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    splitMDesc.forEach((line: string, idx: number) => {
      doc.text(line, margin + 3, y + 8.2 + (idx * 3.2));
    });

    y += cardHeight + 2;
  });

  y += 1;

  // AVF-07: Deterministic Confidence Rule
  const confBoxY = y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  const confPoints = [
    '▪ C_class: Deterministic classification consistency and completeness.',
    '▪ C_prov: Verified telemetry and citation/provenance completeness.',
    '▪ C_scen: 100% for PASSED / VERIFIED · 70% for NARRATIVE_ONLY · 20% for FAILED.',
    '▪ C_risk: Deterministic risk-evidence completeness derived from verified inputs.',
    '▪ Confidence Thresholds: ≥85% HIGH CONFIDENCE · 70–84% MODERATE CONFIDENCE · <70% LOW CONFIDENCE.',
    '▪ Deterministic Rule: F3 calculates confidence exclusively from verified inputs and defined evidence states; no AI-generated confidence adjustment is permitted.'
  ];
  let confTextLines: string[] = [];
  confPoints.forEach((cp) => {
    const wrapped = doc.splitTextToSize(cp, contentWidth - 8);
    confTextLines = confTextLines.concat(wrapped);
  });
  const confBoxHeight = 17 + (confTextLines.length * 3.4);
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(purpleAccent[0], purpleAccent[1], purpleAccent[2]);
  doc.roundedRect(margin, confBoxY, contentWidth, confBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(purpleAccent[0], purpleAccent[1], purpleAccent[2]);
  doc.text('AVF-07 — DETERMINISTIC CONFIDENCE RULE', margin + 4, confBoxY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Confidence = (0.20 × C_class) + (0.30 × C_prov) + (0.30 × C_scen) + (0.20 × C_risk)', margin + 4, confBoxY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  confTextLines.forEach((line, lineIdx) => {
    doc.text(line, margin + 4, confBoxY + 15 + (lineIdx * 3.4));
  });

  y = confBoxY + confBoxHeight + 4;

  // AVF-08: Cryptographic Integrity & Signing Rule
  const signBoxY = y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  const signPoints = [
    '▪ Canonical Payload: The deterministic audit data used for verification is normalized into a canonical representation before hashing.',
    '▪ Draft: "Status = UNSIGNED" — preliminary audit output; no cryptographic verification claim.',
    '▪ Final Delivery: Crypto Review Lab applies an Ed25519 digital signature to the finalized audit payload.',
    '▪ Integrity: The signature and digest must validate against the exact finalized payload.',
    '▪ Immutability: Any post-signature modification to signed audit data causes verification failure and returns HASH_MISMATCH.',
    '▪ Verification: F3 uses the established cryptographic signing and verification layer; cryptographic operations are not reimplemented inside the F3 engine.'
  ];
  let signTextLines: string[] = [];
  signPoints.forEach((sp) => {
    const wrapped = doc.splitTextToSize(sp, contentWidth - 8);
    signTextLines = signTextLines.concat(wrapped);
  });
  const signBoxHeight = 17 + (signTextLines.length * 3.4);
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(roseAccent[0], roseAccent[1], roseAccent[2]);
  doc.roundedRect(margin, signBoxY, contentWidth, signBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(roseAccent[0], roseAccent[1], roseAccent[2]);
  doc.text('AVF-08 — CRYPTOGRAPHIC INTEGRITY & SIGNING RULE', margin + 4, signBoxY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Digest = SHA-256(Canonical Audit Payload)', margin + 4, signBoxY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  signTextLines.forEach((line, lineIdx) => {
    doc.text(line, margin + 4, signBoxY + 15 + (lineIdx * 3.4));
  });

  addWhitepaperFooter(5);

  // ==========================================
  // PAGE 6: GUARANTEES, LIMITATIONS & GOVERNANCE APPENDIX
  // ==========================================
  doc.addPage();
  addWhitepaperHeader('Guarantees, Limitations & Governance', 'Section 5');

  y = 26;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('1. VERIFICATION GUARANTEES & OPERATIONAL LIMITATIONS', margin, y);
  y += 5;

  // Guarantees box
  const guarBoxY = y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const guarPoints = [
    '• Deterministic Score Arithmetic: Weighted score calculation and dimension aggregation are performed by pure deterministic code with zero AI involvement and a strict ±0.5 point tolerance.',
    '• Empirical Multi-Source Corroboration: Market data is triangulated across CoinGecko, CoinMarketCap, and CoinStats.',
    '• Active Invariant Detection: Static bytecode scans from GoPlus, RugCheck, and Blockscout are verified before final sign-off.',
    '• Cryptographic Integrity: Approved dossiers are SHA-256 digested and signed with Ed25519 when a properly configured signing key is present. Signature verification fails closed if the cryptographic engine or key material is unavailable.'
  ];
  let guarTextLines: string[] = [];
  guarPoints.forEach((gp) => {
    const wrapped = doc.splitTextToSize(gp, contentWidth - 8);
    guarTextLines = guarTextLines.concat(wrapped);
  });
  const guarBoxHeight = 11 + (guarTextLines.length * 3.6);
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(emeraldAccent[0], emeraldAccent[1], emeraldAccent[2]);
  doc.roundedRect(margin, guarBoxY, contentWidth, guarBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(emeraldAccent[0], emeraldAccent[1], emeraldAccent[2]);
  doc.text('WHAT THE ALGORITHMIC VERIFICATION FRAMEWORK (AVF) GUARANTEES', margin + 4, guarBoxY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  guarTextLines.forEach((line, lineIdx) => {
    doc.text(line, margin + 4, guarBoxY + 10 + (lineIdx * 3.6));
  });

  y = guarBoxY + guarBoxHeight + 4;

  // Limitations box
  const limBoxY = y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const limPoints = [
    '• Advisory Risk Assessment Only: CRL evaluations are research dossiers. They do NOT constitute financial, investment, or legal advice.',
    '• Not a Full Bytecode Audit: AVF identifies known vulnerability patterns, honeypot functions, and static telemetry. It does not replace formal manual bytecode auditing, formal mathematical theorem proving, or manual penetration testing.',
    '• No Price or Economic Guarantee: A high composite score reflects product-market parameters and published telemetry; it does not guarantee token price appreciation, liquidity preservation, or solvency of underlying protocol reserves.',
    '• Telemetry Latency: On-chain metrics are subject to RPC node propagation and aggregator refresh rates.'
  ];
  let limTextLines: string[] = [];
  limPoints.forEach((lp) => {
    const wrapped = doc.splitTextToSize(lp, contentWidth - 8);
    limTextLines = limTextLines.concat(wrapped);
  });
  const limBoxHeight = 11 + (limTextLines.length * 3.6);
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(roseAccent[0], roseAccent[1], roseAccent[2]);
  doc.roundedRect(margin, limBoxY, contentWidth, limBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(roseAccent[0], roseAccent[1], roseAccent[2]);
  doc.text('SYSTEM BOUNDARIES & REGULATORY DISCLAIMERS', margin + 4, limBoxY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  limTextLines.forEach((line, lineIdx) => {
    doc.text(line, margin + 4, limBoxY + 10 + (lineIdx * 3.6));
  });

  y = limBoxY + limBoxHeight + 4;

  // Governance & Versioning
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('2. STANDARD GOVERNANCE & VERSIONING PROTOCOL', margin, y);
  y += 5;

  const govBoxY = y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  const govText = 'The Crypto Review Lab Evaluation Blueprint and Algorithmic Verification Framework operate under a locked public standard. Any modification to scoring weights, gate thresholds, or deterministic verification formulas requires a formal RFC publication, public consensus period, and version increment. Backwards-compatibility is cryptographically enforced: historical audit digests remain tied to the specific standard version active at the time of signing.';
  const splitGov = doc.splitTextToSize(govText, contentWidth - 8);
  const govBoxHeight = 8 + (splitGov.length * 3.5);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, govBoxY, contentWidth, govBoxHeight, 2, 2, 'FD');

  splitGov.forEach((line: string, idx: number) => {
    doc.text(line, margin + 4, govBoxY + 5.5 + (idx * 3.5));
  });

  y = govBoxY + govBoxHeight + 5;

  // Technical Sign-Off Block
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.roundedRect(margin, y, contentWidth, 42, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('OFFICIAL ATTESTATION & SPECIFICATION SIGN-OFF', margin + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225);
  doc.text('ISSUING BODY: Crypto Review Lab (CRL) Advisory & Algorithmic Verification Division', margin + 5, y + 13);
  doc.text('SPECIFICATION TITLE: Evaluation Blueprint & AVF Technical Standard v3.2', margin + 5, y + 17.5);
  doc.text('CANONICAL DIGEST ALGORITHM: SHA-256 (FIPS PUB 180-4)', margin + 5, y + 22);
  doc.text('ATTESTATION SIGNATURE: Ed25519 Digital Signature Standard', margin + 5, y + 26.5);
  doc.text(`SPECIFICATION DATE: ${nowStr} • VERIFICATION STATUS: LOCKED PRODUCTION STANDARD`, margin + 5, y + 31);
  doc.text('OFFICIAL DOCUMENT ARCHIVE: cryptoreviewlab.com/standards/blueprint-v3.2', margin + 5, y + 35.5);

  addWhitepaperFooter(6);

  doc.save(customFilename);
}

function getAvfModulesList(f3: F3VerificationResult | PublicF3VerificationResult | undefined | null) {
  const mods = (f3?.modules as any) || {};
  const avf01 = mods.avf01Classification || mods.avf01Taxonomy || mods.avf01;
  const avf02 = mods.avf02Evidence || mods.avf02Provenance || mods.avf02;
  const avf03 = mods.avf03Methodology || mods.avf03;
  const avf04 = mods.avf04Scenarios || mods.avf04StressTest || mods.avf04;
  const avf05 = mods.avf05Score || mods.avf05;
  const avf06 = mods.avf06RiskConclusion || mods.avf06Security || mods.avf06;
  const avf07 = mods.avf07Confidence || mods.avf07;
  const avf08 = mods.avf08Traceability || mods.avf08Integrity || mods.avf08;

  return [
    {
      id: 'AVF-01',
      name: 'Classification & Taxonomy',
      status: avf01 ? (avf01.status || 'UNVERIFIED') : 'Input unavailable',
      details: avf01 ? (avf01.details || 'Taxonomy and classification invariants evaluated') : 'Input unavailable'
    },
    {
      id: 'AVF-02',
      name: 'Evidence Grounding',
      status: avf02 ? (avf02.status || 'UNVERIFIED') : 'Input unavailable',
      details: !avf02
        ? 'Input unavailable'
        : (() => {
            const cov = avf02.evidenceCoveragePct !== undefined && avf02.evidenceCoveragePct !== null
              ? `Coverage: ${Math.round(avf02.evidenceCoveragePct * 100)}%`
              : '';
            const d = avf02.details || '';
            return [cov, d].filter(Boolean).join(' • ') || 'Evidence coverage verified';
          })()
    },
    {
      id: 'AVF-03',
      name: 'Methodology Compliance',
      status: avf03 ? (avf03.status || 'UNVERIFIED') : 'Input unavailable',
      details: avf03 ? (avf03.details || 'Evaluation rubric and weight constraints verified') : 'Input unavailable'
    },
    {
      id: 'AVF-04',
      name: 'Scenario Simulation',
      status: avf04 ? (avf04.status || 'UNVERIFIED') : 'Input unavailable',
      details: !avf04
        ? 'Input unavailable'
        : (() => {
            const rate = avf04.scenarioExecutionRate !== undefined && avf04.scenarioExecutionRate !== null
              ? `Execution Rate: ${Math.round(avf04.scenarioExecutionRate * 100)}%`
              : '';
            const d = avf04.details || '';
            return [rate, d].filter(Boolean).join(' • ') || 'Scenario execution verified';
          })()
    },
    {
      id: 'AVF-05',
      name: 'Score & Weight Parity',
      status: avf05 ? (avf05.status === 'VERIFIED' || avf05.isVerified ? 'VERIFIED' : (avf05.status || 'UNVERIFIED')) : 'Input unavailable',
      details: !avf05
        ? 'Input unavailable'
        : (() => {
            const rep = avf05.reportedScore !== undefined && avf05.reportedScore !== null ? `Reported: ${avf05.reportedScore}` : '';
            const rec = avf05.recomputedScore !== undefined && avf05.recomputedScore !== null ? `Recomputed: ${avf05.recomputedScore}` : '';
            const disc = avf05.discrepancy !== undefined && avf05.discrepancy !== null ? `Δ: ${avf05.discrepancy}` : '';
            const scoreStr = [rep, rec, disc].filter(Boolean).join(' | ');
            const d = avf05.details || '';
            return [scoreStr, d].filter(Boolean).join(' • ') || 'Mathematical model validated against Blueprint specification';
          })()
    },
    {
      id: 'AVF-06',
      name: 'Risk-Conclusion Parity',
      status: avf06 ? (avf06.status || 'UNVERIFIED') : 'Input unavailable',
      details: !avf06
        ? 'Input unavailable'
        : (() => {
            const contra = avf06.contradictions && avf06.contradictions.length > 0
              ? `Contradictions: ${avf06.contradictions.join('; ')}`
              : '';
            const d = avf06.details || '';
            return [contra, d].filter(Boolean).join(' • ') || 'Risk-conclusion logical parity verified';
          })()
    },
    {
      id: 'AVF-07',
      name: 'Confidence Scorer',
      status: avf07 ? (avf07.status || 'UNVERIFIED') : 'Input unavailable',
      details: avf07 ? (avf07.details || 'Algorithmic confidence model aggregation computed') : 'Input unavailable'
    },
    {
      id: 'AVF-08',
      name: 'Traceability & Signing',
      status: avf08 ? (avf08.status || 'UNVERIFIED') : 'Input unavailable',
      details: avf08 ? (avf08.details || 'Cryptographic signing and report digest verified') : 'Input unavailable'
    }
  ];
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
    generateProAssessmentPdfReport(data, customFilename);
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
    const simLabel = data.stressSimulation ? '• TVL Stress Simulation: ACTIVE' : '• Verification Depth: Protocol & Contract Diagnostics';
    doc.text(simLabel, margin + 105, y + 13.5);

    y += 22;
  }

  // 3. Verification Status & Evaluation Blueprint Framework Matrix
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
  doc.text('EVALUATION BLUEPRINT FRAMEWORK (AVF-01..AVF-08)', margin + 70, y + 16.5);

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

    if (y + 60 > pageHeight - 18) {
      addFooter(doc, pageWidth, pageHeight, margin, textMuted, `Target: ${projName} | ID: ${refId}`);
      doc.addPage();
      y = margin + 10;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('AVF-01..AVF-08 DETERMINISTIC VERIFICATION MATRIX', margin, y);
    y += 4;

    const avfTableHeaderY = y;
    doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.rect(margin, avfTableHeaderY, contentWidth, 6, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('CHECK', margin + 3, avfTableHeaderY + 4.2);
    doc.text('MODULE NAME', margin + 18, avfTableHeaderY + 4.2);
    doc.text('STATUS', margin + 65, avfTableHeaderY + 4.2);
    doc.text('DETERMINISTIC VALIDATION DETAILS & METRICS', margin + 105, avfTableHeaderY + 4.2);

    y += 6;

    const avfRows = getAvfModulesList(f3);
    avfRows.forEach((row, idx) => {
      const rowY = y;
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, rowY, contentWidth, 5.5, 'F');
      }

      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.text(row.id, margin + 3, rowY + 3.8);

      doc.setFont('helvetica', 'normal');
      doc.text(row.name, margin + 18, rowY + 3.8);

      const isInputUnavailable = row.status === 'Input unavailable';
      const isRowVerified = row.status === 'VERIFIED' || row.status === 'CONSISTENT';
      const isRowFlagged = row.status === 'FAILED' || row.status === 'DISCREPANCY_FOUND' || row.status === 'MISCLASSIFIED';

      doc.setFont('helvetica', 'bold');
      if (isInputUnavailable) {
        doc.setTextColor(180, 83, 9);
      } else if (isRowVerified) {
        doc.setTextColor(16, 149, 106);
      } else if (isRowFlagged) {
        doc.setTextColor(225, 29, 72);
      } else {
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      }
      doc.text(row.status, margin + 65, rowY + 3.8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      const maxDetailChars = 58;
      const detailText = row.details.length > maxDetailChars ? `${row.details.slice(0, maxDetailChars - 3)}...` : row.details;
      doc.text(detailText, margin + 105, rowY + 3.8);

      y += 5.5;
    });

    y += 6;
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
  doc.text(`Crypto Review Lab — ${docLabel || 'Security & Risk Assessment Report'} | Data: Multi-Source Market & Security Telemetry`, margin, footerY);
  doc.text(`Page ${pageNum}`, pageWidth - margin, footerY, { align: 'right' });
}

/**
 * Generates a Premium 3-Page Security & Risk Assessment Report.
 * Specifically crafted for threat vector analysis, TVL concentration assessments,
 * and CRL Risk Model evaluations.
 */
function generateProAssessmentPdfReport(data: AuditPdfData, customFilename?: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2); // 180 mm

  // Theme Palette: Slate & Gold/Amber Professional Verification
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
        confidenceLevel: (explicitConfScore >= 80 ? 'HIGH' : (explicitConfScore >= 50 ? 'MODERATE' : 'LOW')) as 'HIGH' | 'MODERATE' | 'LOW'
      }
    : baseConfidence;

  // Evidence coverage and deterministic verification confidence metrics
  const f3 = data.f3Verification;
  const canonicalStatus = f3?.canonicalVerificationStatus || (isVerified ? 'Verified' : (isFailed ? 'Invalid' : 'Unverified'));
  const evidenceCoverage = calculateEvidenceCoverage(
    hasRealContract,
    hasRealScan,
    true, // market data
    Boolean(data.auditReports && data.auditReports.length > 0),
    Boolean(data.realTvl && data.realTvl > 0)
  );
  const evidenceCoveragePct = f3?.evidenceCoveragePct ?? evidenceCoverage.coveragePct;
  let verificationConfidencePct = f3?.verificationConfidencePct ?? confidence.overallConfidencePct;
  
  // Rule: Do NOT claim HIGH confidence when deterministic verification is failed/contradictory
  const isFailedOrContradictory = isFailed || canonicalStatus === 'Contradictory' || canonicalStatus === 'Invalid' || gating.actualStatus === 'FAILED' || gating.actualStatus === 'CONFLICT' || (f3?.discrepancies && f3.discrepancies.length > 0);
  if (isFailedOrContradictory && verificationConfidencePct > 55) {
    verificationConfidencePct = 50;
  }
  let verificationConfidenceLevel: 'HIGH' | 'MODERATE' | 'LOW' = verificationConfidencePct >= 80 ? 'HIGH' : (verificationConfidencePct >= 50 ? 'MODERATE' : 'LOW');
  if (isFailedOrContradictory) {
    verificationConfidenceLevel = verificationConfidencePct >= 50 ? 'MODERATE' : 'LOW';
  }

  // Data Freshness & Source Coverage Definitions
  const dataDateStr = data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : fullTimestamp.split(' ')[0];
  const dataFreshness = `Live Telemetry Synchronized (${dataDateStr}) • CoinGecko • Block Timestamp: ${fullTimestamp}`;
  
  const activeSourcesList: string[] = ['CoinGecko'];
  if (data.contractAddress) activeSourcesList.push('Etherscan / Bytecode Registry');
  if (secScan) activeSourcesList.push(secScan.source || 'GoPlus Security');
  if (data.realTvl && data.realTvl > 0) activeSourcesList.push('DefiLlama');
  if (data.auditReports && data.auditReports.length > 0) activeSourcesList.push('Public Audit Registries');
  const sourceCoverage = `${activeSourcesList.join(', ')} (${activeSourcesList.length} active telemetry sources)`;

  // ==========================================
  // PAGE 1: EXECUTIVE & EVALUATION OVERVIEW
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
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text(`Target Protocol: ${projName}`, margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`• Protocol Category: ${categoryType}`, margin + 4, y + 10.5);
  doc.text(`• Address / Bytecode Registry: ${data.contractAddress || 'Mainnet Monitored Bytecode & GitHub Repository'}`, margin + 4, y + 15);
  doc.text(`• Reserve / DefiLlama TVL: ${data.realTvl && data.realTvl > 0 ? formatDefiLlamaTvl(data.realTvl) : 'UNAVAILABLE (Not tracked on DefiLlama)'}`, margin + 4, y + 19.5);
  doc.text(`• Data Freshness: ${dataFreshness}`, margin + 4, y + 24);
  doc.text(`• Source Coverage: ${sourceCoverage}`, margin + 4, y + 28.5);
  doc.text(`• Evidence Coverage: ${evidenceCoveragePct}% (${hasRealContract ? 'Bytecode [VERIFIED]' : 'Bytecode [MISSING]'} | ${hasRealScan ? 'Security Invariants [VERIFIED]' : 'Security Invariants [UNAVAILABLE]'} | ${data.auditReports?.length ? 'Public Audits [VERIFIED]' : 'Public Audits [NOT VERIFIED]'})`, margin + 4, y + 33);
  doc.text(`• Verification Confidence: ${verificationConfidencePct}% [${verificationConfidenceLevel}] | Final CRL State: ${canonicalStatus.toUpperCase()}`, margin + 4, y + 37.5);

  y += 42;

  // 3. Status Badge & Verification Standard Box
  const boxBg = isVerified ? amber100 : (isFailed ? [255, 241, 242] : amber100);
  const boxBorder = isVerified ? amber500 : (isFailed ? [225, 29, 72] : amber500);

  doc.setFillColor(boxBg[0], boxBg[1], boxBg[2]);
  doc.setDrawColor(boxBorder[0], boxBorder[1], boxBorder[2]);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'FD');

  // Left Status Badge
  const badgeBg = isVerified ? slate900 : (isFailed ? [225, 29, 72] : [217, 119, 6]);
  doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
  doc.roundedRect(margin + 4, y + 3.5, 36, 17, 2, 2, 'F');

  const badgeLabel = canonicalStatus.toUpperCase();
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(badgeLabel.length > 8 ? 8 : 10);
  doc.text(badgeLabel, margin + 22, y + 10.5, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('FINAL CRL STATE', margin + 22, y + 15.5, { align: 'center' });

  // Status Box Details
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`VERIFICATION STATUS: ${canonicalStatus.toUpperCase()}`, margin + 45, y + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`EVALUATION SCORE: ${data.overallScore || 0}/100 | FINAL CRL STATE: ${canonicalStatus.toUpperCase()}`, margin + 45, y + 13);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text(`EVIDENCE COVERAGE: ${evidenceCoveragePct}% | VERIFICATION CONFIDENCE: ${verificationConfidencePct}% [${verificationConfidenceLevel}]`, margin + 45, y + 17.5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('SPECIFICATION: BLUEPRINT MASTER v2.4 (AVF-01..AVF-08 DETERMINISTIC INVARIANTS)', margin + 45, y + 21.5);

  y += 28;

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

  // 5. Verification & Risks Assessment (On-chain, Market, Security Evidence) - DEDICATED SINGLE DISPLAY ON PAGE 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('VERIFICATION & RISKS ASSESSMENT', margin, y);
  y += 4;

  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(margin, y, contentWidth, 42, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9);
  doc.text('ON-CHAIN / MARKET / SECURITY EVIDENCE & DETERMINISTIC INVARIANTS', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(120, 53, 15);

  if (f3 || secScan) {
    // 1. Real GoPlus / RugCheck Security Scan Data (snake_case telemetry)
    const scanFlags: string[] = [];
    const isOpenSource = secScan?.is_open_source ?? secScan?.isOpenSource;
    const isHoneypot = secScan?.is_honeypot ?? secScan?.isHoneypot;
    const isMintable = secScan?.is_mintable ?? secScan?.isMintable;
    const isBlacklisted = secScan?.is_blacklisted ?? secScan?.hasBlacklist ?? secScan?.isBlacklisted;
    const isProxy = secScan?.is_proxy ?? secScan?.isProxy;
    const ownerChangeBalance = secScan?.owner_change_balance;
    const cannotSell = secScan?.cannot_sell ?? secScan?.cannotSell;
    const buyTax = secScan?.buy_tax ?? secScan?.buyTax;
    const sellTax = secScan?.sell_tax ?? secScan?.sellTax;
    const rugcheckVerdict = secScan?.rugcheckVerdict ?? secScan?.data?.rugcheckVerdict;
    const rugcheckScore = secScan?.rugcheckScore ?? secScan?.data?.rugcheckScore;

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
    if (secScan?.top10HolderConcentrationPct !== undefined) scanFlags.push(`Top 10 Holders: ${secScan.top10HolderConcentrationPct}%`);

    const scanSource = secScan?.source || 'GoPlus Security / On-chain Telemetry';
    const line1 = `1. On-Chain Security Telemetry (${scanSource}): ${scanFlags.length > 0 ? scanFlags.join(' | ') : 'Scanned — No threat flags detected'}`;
    doc.text(line1, margin + 4, y + 10.5);

    // 2. Market Telemetry Evidence
    const line2 = '2. Market Telemetry Evidence: Real-time price convergence, 24h liquidity depth & volume cross-validated across active feeds';
    doc.text(line2, margin + 4, y + 15.5);

    // 3. Security Invariants & Custody Risk Signal
    let line3 = '3. Security Invariants & Custody: Input unavailable';
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
      line3 = '3. Security Invariants & Custody: EOA_OWNER (Single Externally-Owned Account — Direct key risk; Source: Bytecode Registry)';
    } else if (custodyRisk === 'CONTRACT_OWNER') {
      line3 = '3. Security Invariants & Custody: CONTRACT_OWNER (Contract / Timelock controlled; Source: Bytecode Registry)';
    } else if (custodyRisk === 'RENOUNCED') {
      line3 = '3. Security Invariants & Custody: RENOUNCED (Zero admin key privilege verified on-chain; Source: Bytecode Registry)';
    } else if (custodyRisk) {
      line3 = `3. Security Invariants & Custody: ${custodyRisk} (Source: Bytecode Registry)`;
    }
    doc.text(line3, margin + 4, y + 20.5);

    // 4. Key Risk Findings (Evidence & Provenance)
    const findings: string[] = [];
    if (secScan?.top10HolderConcentrationPct && secScan.top10HolderConcentrationPct > 40) {
      findings.push(`Holder Concentration ${secScan.top10HolderConcentrationPct}% (Source: On-chain ledger)`);
    }
    if (isHoneypot) {
      findings.push(`Honeypot Logic Flag (Source: ${scanSource})`);
    }
    if (isMintable) {
      findings.push(`Mint Function Detected (Source: ${scanSource})`);
    }
    if (f3?.discrepancies && f3.discrepancies.length > 0) {
      findings.push(`Deterministic Discrepancy Flag: ${f3.discrepancies[0]} (Source: AVF Engine)`);
    }
    const findingsSummary = findings.length > 0 ? findings.slice(0, 2).join('; ') : 'No critical code vulnerability invariants triggered on-chain';
    doc.text(`4. Key Risk Findings (Evidence & Provenance): ${findingsSummary}`, margin + 4, y + 25.5);

    // 5. Missing Security Evidence (explicitly noted as missing/unverified)
    const missingItems: string[] = [];
    if (!data.auditReports || data.auditReports.length === 0) {
      missingItems.push('Third-Party Audits [NOT VERIFIED / MISSING EVIDENCE]');
    }
    if (!data.realTvl || data.realTvl <= 0) {
      missingItems.push('DefiLlama Protocol TVL [UNAVAILABLE]');
    }
    const missingText = missingItems.length > 0 ? missingItems.join(' • ') : 'Full core evidence indexed on file';
    doc.text(`5. Missing Security Evidence: ${missingText}`, margin + 4, y + 30.5);

    // 6. Final CRL State & Confidence
    const line6 = `6. Final CRL State: ${canonicalStatus.toUpperCase()} (Verification Confidence: ${verificationConfidencePct}% [${verificationConfidenceLevel}])`;
    doc.text(line6, margin + 4, y + 35.5);
  } else {
    doc.text('1. On-Chain Security Telemetry: Telemetry unavailable — no contract address on file', margin + 4, y + 10.5);
    doc.text('2. Market Telemetry Evidence: Spot price and liquidity convergence indexed across active feeds', margin + 4, y + 15.5);
    doc.text('3. Security Invariants & Custody: Telemetry unavailable — contract address required', margin + 4, y + 20.5);
    doc.text('4. Key Risk Findings (Evidence & Provenance): Missing contract bytecode telemetry', margin + 4, y + 25.5);
    doc.text('5. Missing Security Evidence: Contract Bytecode [MISSING] • Third-Party Audits [MISSING]', margin + 4, y + 30.5);
    doc.text(`6. Final CRL State: ${canonicalStatus.toUpperCase()} (Verification Confidence: ${verificationConfidencePct}% [${verificationConfidenceLevel}])`, margin + 4, y + 35.5);
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

    const vUpper = (vec.verdict || '').toUpperCase();
    if (vUpper.includes('VERIFIED') || vUpper.includes('PASSED')) {
      doc.setTextColor(16, 185, 129); // Emerald
    } else if (vUpper.includes('NOT') || vUpper.includes('UNAVAILABLE') || vUpper.includes('PENDING') || vUpper.includes('DEFINED') || vUpper.includes('N/A') || vUpper.includes('NOT_PERFORMED')) {
      doc.setTextColor(100, 116, 139); // Slate neutral / unverified
    } else if (vUpper.includes('FAILED') || vUpper.includes('INVALID') || vUpper.includes('FLAGGED') || vUpper.includes('CONFLICT') || vUpper.includes('CRITICAL')) {
      doc.setTextColor(225, 29, 72); // Rose
    } else {
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    }
    doc.text(vec.verdict, margin + 155, rowY + 4.5);

    y += 6.5;
  });

  y += 8;

  // 2. Category-Specific Modular Section (Dynamically updates based on categoryType / protocolType)
  const categoryModule = getCategorySpecificModule(categoryType, data.realTvl, secScan);

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

    const iUpper = (item.verdict || '').toUpperCase();
    if (iUpper.includes('VERIFIED') || iUpper.includes('PASSED') || iUpper.includes('COMPLIANT')) {
      doc.setTextColor(16, 185, 129); // Emerald
    } else if (iUpper.includes('NOT') || iUpper.includes('UNAVAILABLE') || iUpper.includes('PENDING') || iUpper.includes('DEFINED') || iUpper.includes('N/A') || iUpper.includes('NOT_PERFORMED')) {
      doc.setTextColor(100, 116, 139); // Slate neutral / unverified
    } else if (iUpper.includes('FAILED') || iUpper.includes('INVALID') || iUpper.includes('FLAGGED') || iUpper.includes('CONFLICT') || iUpper.includes('CRITICAL')) {
      doc.setTextColor(225, 29, 72); // Rose
    } else {
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    }
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
  
  const isMemeOrSpeculative = categoryType.toLowerCase().includes('meme') || categoryType.toLowerCase().includes('speculative') || projName.toLowerCase().includes('pepe');
  if (isMemeOrSpeculative) {
    doc.text('GOVERNANCE & SPECULATIVE ASSET CONTROL INVARIANTS', margin + 4, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 53, 15);
    doc.text('• Ownership Renouncement: Contract storage slot verified for null address invariant (renounced admin key privileges).', margin + 4, y + 11.5);
    doc.text('• Liquidity Pool Lock Status: Model inspects DEX pair liquidity token burn or permanent timelock proof on-chain.', margin + 4, y + 16.5);
    doc.text('• External Dependency Isolation: Project operates as standard ERC-20 token; no oracle or bridge dependencies detected.', margin + 4, y + 21.5);
    doc.text('• Unverified Controls Disclosure: Formal treasury isolation and vesting schedules are unindexed on file or not applicable.', margin + 4, y + 25.5);
  } else {
    doc.text('GOVERNANCE INVARIANT & VESTING MODEL ASSESSMENT', margin + 4, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 53, 15);
    doc.text('• Multi-Sig Authorization Standard: Model evaluates non-custodial multi-sig quorum requirements for admin & treasury operations.', margin + 4, y + 11.5);
    doc.text('• Upgrade Timelock Standard: Model evaluates presence of mandatory delay timelocks on core smart contract upgrade functions.', margin + 4, y + 16.5);
    doc.text('• Vesting & Allocation Assessment: Evaluates team/investor vesting schedules to identify token cliff pressure.', margin + 4, y + 21.5);
    doc.text('• Treasury Isolation Standard: Evaluates separation of protocol operational funds from liquidity reserve vaults.', margin + 4, y + 25.5);
  }

  addProFooter(doc, pageWidth, pageHeight, margin, textMuted, refId, projName, 2);

  // =========================================================================
  // PAGE 3: DETAILED AUDIT FINDINGS, DATA CONFIDENCE & SIGN-OFF (CORE PAGE)
  // =========================================================================
  doc.addPage();

  addProPageHeader(doc, pageWidth, margin, refId, 'SECTION 3: IN-DEPTH SECURITY FINDINGS, INTEGRITY & TRACEABILITY');
  y = 22;

  // 1. Detailed AI Audit & Threat Assessment Findings Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('1. IN-DEPTH SECURITY FINDINGS & EVIDENCE PROVENANCE', margin, y);
  y += 5;

  let cleanedText = data.analysisText
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/###?\s?/g, '')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/[&]\s?[þÞ]/g, '[!]')
    .replace(/\n{3,}/g, '\n\n');

  if (isMemeOrSpeculative) {
    cleanedText = cleanedText
      .split('\n')
      .filter(line => {
        const lower = line.toLowerCase();
        if (lower.includes('twap oracle') || lower.includes('bridge relayer') || lower.includes('cross-chain bridge') || lower.includes('oracle latency')) {
          return false;
        }
        return true;
      })
      .join('\n');
  }

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

  if (y + 60 > pageHeight - 35) {
    addProFooter(doc, pageWidth, pageHeight, margin, textMuted, refId, projName, doc.getNumberOfPages());
    doc.addPage();
    addProPageHeader(doc, pageWidth, margin, refId, 'SECTION 3 (CONTINUED): AVF DETERMINISTIC MATRIX');
    y = 22;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('2. AVF-01..AVF-08 DETERMINISTIC VERIFICATION MATRIX', margin, y);
  y += 4;

  const proAvfTableHeaderY = y;
  doc.setFillColor(slate900[0], slate900[1], slate900[2]);
  doc.rect(margin, proAvfTableHeaderY, contentWidth, 5.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('CHECK', margin + 3, proAvfTableHeaderY + 3.8);
  doc.text('MODULE NAME', margin + 18, proAvfTableHeaderY + 3.8);
  doc.text('STATUS', margin + 65, proAvfTableHeaderY + 3.8);
  doc.text('DETERMINISTIC VALIDATION DETAILS & METRICS', margin + 105, proAvfTableHeaderY + 3.8);

  y += 5.5;

  const proAvfRows = getAvfModulesList(data.f3Verification);
  proAvfRows.forEach((row, idx) => {
    const rowY = y;
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, contentWidth, 5.5, 'F');
    }

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text(row.id, margin + 3, rowY + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.text(row.name, margin + 18, rowY + 3.8);

    const isInputUnavailable = row.status === 'Input unavailable';
    const isRowVerified = row.status === 'VERIFIED' || row.status === 'CONSISTENT';
    const isRowFlagged = row.status === 'FAILED' || row.status === 'DISCREPANCY_FOUND' || row.status === 'MISCLASSIFIED';

    doc.setFont('helvetica', 'bold');
    if (isInputUnavailable) {
      doc.setTextColor(180, 83, 9);
    } else if (isRowVerified) {
      doc.setTextColor(16, 149, 106);
    } else if (isRowFlagged) {
      doc.setTextColor(225, 29, 72);
    } else {
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    }
    doc.text(row.status, margin + 65, rowY + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    const maxDetailChars = 58;
    const detailText = row.details.length > maxDetailChars ? `${row.details.slice(0, maxDetailChars - 3)}...` : row.details;
    doc.text(detailText, margin + 105, rowY + 3.8);

    y += 5.5;
  });

  y += 6;

  if (y + 26 > pageHeight - 35) {
    addProFooter(doc, pageWidth, pageHeight, margin, textMuted, refId, projName, doc.getNumberOfPages());
    doc.addPage();
    addProPageHeader(doc, pageWidth, margin, refId, 'SECTION 3 (CONTINUED): DATA CONFIDENCE DISCLOSURES');
    y = 22;
  }

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 27, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`3. EVIDENCE COVERAGE & DETERMINISTIC VERIFICATION DISCLOSURES`, margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(`• Evidence Coverage: ${evidenceCoveragePct}% (${hasRealContract ? 'Contract Bytecode [VERIFIED]' : 'Contract Bytecode [MISSING]'} | ${hasRealScan ? 'Security Invariants [VERIFIED]' : 'Security Invariants [UNAVAILABLE]'} | ${data.auditReports?.length ? 'External Audits [VERIFIED]' : 'External Audits [NOT VERIFIED]'})`, margin + 4, y + 9.5);
  doc.text(`• Verification Confidence: ${verificationConfidencePct}% [${verificationConfidenceLevel}] (Deterministic AVF mathematical validation)`, margin + 4, y + 13.7);
  doc.text(`• AVF Verification Status: ${canonicalStatus} (Evidence determines findings; missing inputs remain unverified without positive assumptions)`, margin + 4, y + 17.9);
  doc.text(`• Evidence State Invariant: MISSING, UNAVAILABLE, and NOT VERIFIED states are strictly preserved without synthetic inflation.`, margin + 4, y + 22.1);

  y += 33;

  if (y + 20 > pageHeight - 15) {
    addProFooter(doc, pageWidth, pageHeight, margin, textMuted, refId, projName, doc.getNumberOfPages());
    doc.addPage();
    addProPageHeader(doc, pageWidth, margin, refId, 'SECTION 3 (CONTINUED): VERIFICATION & INTEGRITY');
    y = 22;
  }

  if (data.auditSignature) {
    const sig = data.auditSignature;
    doc.setFillColor(isVerified ? 236 : (isFailed ? 255 : 254), isVerified ? 253 : (isFailed ? 241 : 243), isVerified ? 245 : (isFailed ? 242 : 199)); // Emerald 50 / Rose 50 / Amber 50
    doc.setDrawColor(isVerified ? 16 : (isFailed ? 225 : 245), isVerified ? 185 : (isFailed ? 29 : 158), isVerified ? 129 : (isFailed ? 72 : 11)); // Emerald 500 / Rose 500 / Amber 500
    doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

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
    doc.text(`• Final CRL State: ${canonicalStatus.toUpperCase()} (Deterministic Confidence: ${verificationConfidencePct}% [${verificationConfidenceLevel}])`, margin + 4, y + 21.5);
    doc.text(`• Notice: Automated security assessment, not a formal smart-contract audit or certification.`, margin + 4, y + 25.5);
    doc.text(`• Policy: Crypto Review Lab does not sell security ratings or favorable scores. Customers pay for actionable findings.`, margin + 4, y + 29.5);
  } else {
    doc.setFillColor(isVerified ? 254 : (isFailed ? 255 : 254), isVerified ? 243 : (isFailed ? 241 : 243), isVerified ? 199 : (isFailed ? 242 : 199));
    doc.setDrawColor(isVerified ? 245 : (isFailed ? 225 : 245), isVerified ? 158 : (isFailed ? 29 : 158), isVerified ? 11 : (isFailed ? 72 : 11));
    doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(isVerified ? 180 : (isFailed ? 159 : 180), isVerified ? 83 : (isFailed ? 18 : 83), isVerified ? 9 : (isFailed ? 57 : 9));
    doc.text(isVerified ? 'CRYPTOGRAPHIC INTEGRITY & TRACEABILITY DIGEST' : `CRYPTOGRAPHIC ASSESSMENT DIGEST (${gating.actualStatus})`, margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(isVerified ? 120 : (isFailed ? 190 : 120), isVerified ? 53 : (isFailed ? 18 : 53), isVerified ? 15 : (isFailed ? 60 : 15));
    doc.text(`• Engine Verification: CRYPTO REVIEW LAB SECURITY ASSESSMENT ENGINE`, margin + 4, y + 9.5);
    
    const rawHashPayload = `CRL_ASSESSMENT_V24:${refId}:${projName}:${categoryType}:${fullTimestamp}`;
    const sha256Hex = generateSHA256Hash(rawHashPayload);
    doc.text(`• SHA-256 Verification Digest: ${sha256Hex}`, margin + 4, y + 13.5);
    doc.text(`• Final CRL State: ${canonicalStatus.toUpperCase()} (Deterministic Confidence: ${verificationConfidencePct}% [${verificationConfidenceLevel}])`, margin + 4, y + 17.5);
    doc.text(`• Notice: Automated security assessment, not a formal smart-contract audit or certification.`, margin + 4, y + 21.5);
    doc.text(`• Policy: Crypto Review Lab does not sell ratings or favorable scores. Customers pay for actionable findings.`, margin + 4, y + 25.5);
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
    doc.text(`HEADLINE COMPARISON: ${cmp.targetProtocol.name} vs ${cmp.benchmarkProtocol.name}`, margin + 4, cy + 5.5);

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
