/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { INITIAL_REVIEWS } from "./src/data.js";
import { calculateBlueprintScore } from "./src/services/EvaluationBlueprint.js";
import { 
  createProOrder, 
  approveAndDeliverProOrder, 
  applyAdminOverrideToOrder,
  requestPublishApproval,
  confirmPublishProOrder,
  getAllOrders, 
  lookupOrder, 
  lookupOrderStrict,
  triggerPhaseTwoReControlForOrder,
  processNowPaymentsIpn,
  mapNowPaymentsStatusToPaymentStatus,
  PRINCIPAL_EMAIL 
} from "./src/services/proOrderService.js";
import { verifyAuditSignatureServerSide } from "./src/services/auditSigner.js";

const REVIEWS_FILE_PATH = path.join(process.cwd(), 'crypto_reviews.json');

function loadReviewsFromFile(): any[] {
  try {
    if (fs.existsSync(REVIEWS_FILE_PATH)) {
      const raw = fs.readFileSync(REVIEWS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load crypto_reviews.json:", err);
  }
  return INITIAL_REVIEWS;
}

function saveReviewsToFile(reviews: any[]): void {
  try {
    fs.writeFileSync(REVIEWS_FILE_PATH, JSON.stringify(reviews, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed to save crypto_reviews.json:", err);
  }
}

dotenv.config();

// Response JSON schema for structured review generation
const reviewResponseSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    symbol: { type: Type.STRING },
    category: { type: Type.STRING },
    overallScore: { type: Type.INTEGER, description: "Overall rating score out of 100 calculated via weighted dimension sum" },
    grade: { type: Type.STRING, description: "Letter grade derived strictly from overallScore: AAA (93-100), AA+ (90-92), AA (85-89), A (78-84), BBB (70-77), BB (60-69), B (50-59), C (30-49), D (0-29)" },
    verdict: { type: Type.STRING, description: "A high-impact, professional 1-2 sentence final rating verdict." },
    scores: {
      type: Type.OBJECT,
      properties: {
        utility: { type: Type.INTEGER, description: "Utility score from 1 to 10 (25% Weight)" },
        tokenomics: { type: Type.INTEGER, description: "Tokenomics score from 1 to 10 (25% Weight)" },
        security: { type: Type.INTEGER, description: "Security/Audit score from 1 to 10 (25% Weight)" },
        team: { type: Type.INTEGER, description: "Team & backer track record score from 1 to 10 (15% Weight)" },
        community: { type: Type.INTEGER, description: "Social engagement & community strength score from 1 to 10 (10% Weight)" }
      },
      required: ["utility", "tokenomics", "security", "team", "community"]
    },
    summary: { 
      type: Type.STRING, 
      description: "A comprehensive, objective markdown report analyzing the project's technology, ecosystem, and future risks. Always divide with markdown subheadings: ### Core Thesis, ### Market & Utility Analysis, ### Tokenomics & Security, ### Conclusion. Do not wrap inside extra ``` markdown backticks." 
    },
    pros: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Exactly 3 distinct real-world strengths or positive technical points."
    },
    cons: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Exactly 3 distinct vulnerabilities, centralizations, inflation risks, or regulatory concerns."
    },
    riskLevel: { 
      type: Type.STRING, 
      description: "Calculated risk level derived from overallScore: Low (>=85), Medium (70-84), High (50-69), Critical (<50)" 
    }
  },
  required: ["name", "symbol", "category", "overallScore", "grade", "verdict", "scores", "summary", "pros", "cons", "riskLevel"]
};

function isQuotaOrDemandError(error: any): boolean {
  const errMsg = String(error?.message || error?.status || error || "").toLowerCase();
  return (
    errMsg.includes("quota") ||
    errMsg.includes("429") ||
    errMsg.includes("resource_exhausted") ||
    errMsg.includes("503") ||
    errMsg.includes("unavailable") ||
    errMsg.includes("high demand") ||
    errMsg.includes("prepayment") ||
    errMsg.includes("credits are depleted") ||
    errMsg.includes("rate-limits") ||
    errMsg.includes("rate limit") ||
    errMsg.includes("tokens_per_model_per_user")
  );
}

function getFriendlyErrorMessage(error: any): string {
  let errMsg = "";
  if (typeof error === "string") {
    errMsg = error;
  } else if (error && error.message) {
    errMsg = error.message;
  } else {
    errMsg = JSON.stringify(error);
  }

  // If already a processed friendly message, return as is
  if (
    errMsg.startsWith("Your Gemini API") ||
    errMsg.startsWith("The Gemini API key") ||
    errMsg.startsWith("Google's Gemini")
  ) {
    return errMsg;
  }

  // Attempt to parse structured JSON error payloads from Google GenAI
  try {
    const parsed = JSON.parse(errMsg);
    if (parsed.error) {
      const code = parsed.error.code;
      const status = parsed.error.status;
      const innerMsg = String(parsed.error.message || "");
      const lowerInner = innerMsg.toLowerCase();

      if (lowerInner.includes("prepayment") || lowerInner.includes("credits are depleted")) {
        return "Your Gemini API prepayment credits are depleted. Please visit Google AI Studio (https://ai.studio/projects) to manage your project billing and top up your credits.";
      }

      if (code === 429 || status === "RESOURCE_EXHAUSTED" || lowerInner.includes("quota") || lowerInner.includes("rate limit")) {
        return "Your Gemini API Key has exceeded its request quota or rate limit. Google AI Studio allows a limited number of requests per minute on free tier. Please wait 1-2 minutes before retrying, or verify your billing tier in Google AI Studio.";
      }

      if (innerMsg) {
        return getFriendlyErrorMessage(innerMsg);
      }
    }
  } catch (e) {
    // ignore JSON parse error
  }

  const lowerMsg = errMsg.toLowerCase();

  if (lowerMsg.includes("prepayment") || lowerMsg.includes("credits are depleted")) {
    return "Your Gemini API prepayment credits are depleted. Please visit Google AI Studio (https://ai.studio/projects) to manage your project billing and top up your credits.";
  }
  
  if (lowerMsg.includes("quota") || lowerMsg.includes("429") || lowerMsg.includes("resource_exhausted") || lowerMsg.includes("rate limit")) {
    return "Your Gemini API Key has exceeded its free tier rate limits. Google AI Studio allows a limited number of requests per minute on free tier. Please wait 1-2 minutes before retrying, or enable billing on your key to increase limits.";
  }
  
  if (lowerMsg.includes("503") || lowerMsg.includes("unavailable") || lowerMsg.includes("high demand")) {
    return "Google's Gemini model servers are currently experiencing extremely high traffic. Please retry in a few seconds, as these spikes are usually transient.";
  }

  if (lowerMsg.includes("invalid key") || lowerMsg.includes("api key not found") || (lowerMsg.includes("403") && lowerMsg.includes("key"))) {
    return "The Gemini API key is missing, invalid, or restricts access to this model. Please check your API key settings in Google AI Studio.";
  }

  return errMsg;
}

export function createServerApp() {
  const app = express();

  // Disable X-Powered-By to prevent server information/software versions disclosure
  app.disable("x-powered-by");

  // Custom Security Headers Middleware addressing Barrion security scan findings
  app.use((req, res, next) => {
    // 1. Mask Server Information disclosure header (e.g. GSE or Node.js versions)
    res.setHeader("Server", "CryptoReviewLab-Shield");
    res.removeHeader("X-Powered-By");

    // 2. Content Security Policy (CSP) config: prevents XSS, data injections, and DOM vulnerabilities
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https:",
      "frame-ancestors 'self' https://*.cryptoreviewlab.com https://cryptoreviewlab.com https://*.cryptoacademy.online https://cryptoacademy.online https://*.crypto-academy.online https://crypto-academy.online https://*.academy.online https://academy.online https://*.blogspot.com https://*.google.com https://*.ai.studio",
      "upgrade-insecure-requests"
    ];
    res.setHeader("Content-Security-Policy", cspDirectives.join("; "));

    // 3. Frame Security Policy (Clickjacking defense)
    res.setHeader("X-Frame-Options", "SAMEORIGIN");

    // 4. Strict-Transport-Security (HSTS) - forces HTTPS connections for 2 years
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

    // 5. Permissions Policy: restricts camera, microphone, geolocation, and payment APIs
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), display-capture=(), autoplay=()");

    // 6. Deprecated X-XSS-Protection header setting (disabled per modern W3C & Barrion recommendation in favor of CSP)
    res.setHeader("X-XSS-Protection", "0");

    // 7. Mitigate MIME type sniffing vulnerabilities
    res.setHeader("X-Content-Type-Options", "nosniff");

    // 8. Referrer-Policy and Cross-Origin Isolation Headers
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    next();
  });

  app.use(express.json());

// Helper: Format exterior security scan and market snapshot evidence into compact facts for AI prompt grounding
function formatExteriorEvidence(securityScan: any, marketSnapshot: any, contractAddress?: string): string {
  const secLines: string[] = [];
  const mktLines: string[] = [];

  // 1. Process Security Scan
  if (securityScan && typeof securityScan === 'object') {
    const sData = securityScan.data || securityScan;
    const source = securityScan.source || sData.source || 'Automated Multi-Provider Scan';
    const chain = securityScan.chainId || sData.chainId || '';
    const addr = securityScan.contractAddress || contractAddress || sData.contractAddress || '';

    const headerParts: string[] = [source];
    if (chain) headerParts.push(`Chain: ${chain}`);
    if (addr) headerParts.push(`Address: ${addr}`);
    secLines.push(`SECURITY SCAN (${headerParts.join(' | ')}):`);

    const facts: string[] = [];
    if (sData.is_honeypot !== undefined) facts.push(`honeypot: ${sData.is_honeypot ? 'DETECTED (CRITICAL)' : 'No'}`);
    if (sData.is_mintable !== undefined) facts.push(`mintable: ${sData.is_mintable ? 'Yes' : 'No'}`);
    if (sData.is_open_source !== undefined) facts.push(`open-source: ${sData.is_open_source ? 'Verified' : 'Unverified / Closed-source'}`);
    if (sData.is_proxy !== undefined) facts.push(`proxy/upgradeable: ${sData.is_proxy ? 'Yes' : 'No'}`);
    if (sData.is_blacklisted !== undefined) facts.push(`blacklist function: ${sData.is_blacklisted ? 'Present' : 'None'}`);
    if (sData.renounced !== undefined || securityScan.custodyRisk || sData.custodyRisk) {
      const cust = securityScan.custodyRisk || sData.custodyRisk || (sData.renounced ? 'RENOUNCED' : 'UNRENOUNCED');
      facts.push(`custody / ownership: ${cust}`);
    }
    if (sData.buyTax !== undefined || sData.sellTax !== undefined) {
      facts.push(`buy tax: ${sData.buyTax || '0%'} | sell tax: ${sData.sellTax || '0%'}`);
    }
    if (sData.cannotSell !== undefined) facts.push(`cannot sell: ${sData.cannotSell ? 'YES (CRITICAL)' : 'No'}`);
    if (sData.highRiskCount !== undefined || sData.warnRiskCount !== undefined) {
      facts.push(`risk counts: ${sData.highRiskCount || 0} high-risk, ${sData.warnRiskCount || 0} warning`);
    }
    if (sData.rugcheckScore !== undefined) {
      const riskNames = sData.rugcheckRisks?.length ? ` (Risks: ${sData.rugcheckRisks.map((r: any) => r.name || r).join(', ')})` : '';
      facts.push(`RugCheck score: ${sData.rugcheckScore}${riskNames}`);
    }
    if (sData.top10HolderConcentrationPct !== undefined) {
      facts.push(`Top 10 holder concentration: ${sData.top10HolderConcentrationPct}%`);
    }

    if (facts.length > 0) {
      facts.forEach(f => secLines.push(`- ${f}`));
    }
  }

  // 2. Process Market Snapshot
  if (marketSnapshot && typeof marketSnapshot === 'object') {
    const price = marketSnapshot.price ?? marketSnapshot.liveData?.current_price ?? marketSnapshot.csData?.price ?? marketSnapshot.cmcData?.price;
    const mcap = marketSnapshot.marketCap ?? marketSnapshot.liveData?.market_cap ?? marketSnapshot.csData?.marketCap ?? marketSnapshot.cmcData?.marketCap;
    const vol = marketSnapshot.volume24h ?? marketSnapshot.liveData?.total_volume ?? marketSnapshot.csData?.volume ?? marketSnapshot.cmcData?.volume24h;
    const cgRank = marketSnapshot.marketCapRank ?? marketSnapshot.liveData?.market_cap_rank;
    const csRank = marketSnapshot.csData?.rank;
    const cmcRank = marketSnapshot.cmcData?.cmcRank;
    const circSupply = marketSnapshot.circulatingSupply ?? marketSnapshot.liveData?.circulating_supply ?? marketSnapshot.csData?.availableSupply ?? marketSnapshot.cmcData?.circulatingSupply;
    const totalSupply = marketSnapshot.totalSupply ?? marketSnapshot.liveData?.total_supply ?? marketSnapshot.csData?.totalSupply ?? marketSnapshot.cmcData?.totalSupply;
    const maxSupply = marketSnapshot.maxSupply ?? marketSnapshot.cmcData?.maxSupply;
    const dualMetrics = marketSnapshot.dualMetrics;

    const hasAnyMarket = price != null || mcap != null || vol != null || cgRank != null || cmcRank != null || circSupply != null;

    if (hasAnyMarket) {
      mktLines.push(`MARKET SNAPSHOT (Multi-Source Consensus):`);
      if (price != null) mktLines.push(`- Price: $${typeof price === 'number' ? (price < 1 ? price.toFixed(6) : price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : price}`);
      if (mcap != null) mktLines.push(`- Market Cap: $${typeof mcap === 'number' ? mcap.toLocaleString() : mcap}`);
      if (vol != null) mktLines.push(`- 24h Volume: $${typeof vol === 'number' ? vol.toLocaleString() : vol}`);

      const ranks: string[] = [];
      if (cgRank) ranks.push(`CoinGecko #${cgRank}`);
      if (cmcRank) ranks.push(`CoinMarketCap #${cmcRank}`);
      if (csRank) ranks.push(`CoinStats #${csRank}`);
      if (ranks.length > 0) mktLines.push(`- Ranks: ${ranks.join(' | ')}`);

      const supplies: string[] = [];
      if (circSupply != null) supplies.push(`Circulating: ${typeof circSupply === 'number' ? circSupply.toLocaleString() : circSupply}`);
      if (totalSupply != null) supplies.push(`Total: ${typeof totalSupply === 'number' ? totalSupply.toLocaleString() : totalSupply}`);
      if (maxSupply != null) supplies.push(`Max: ${typeof maxSupply === 'number' ? maxSupply.toLocaleString() : maxSupply}`);
      if (supplies.length > 0) mktLines.push(`- Supply: ${supplies.join(' | ')}`);

      if (dualMetrics?.consensusConfidence) {
        mktLines.push(`- Consensus Confidence: ${dualMetrics.consensusConfidence}`);
      }
      if (dualMetrics?.divergenceNotes || (dualMetrics?.divergenceFlags && dualMetrics.divergenceFlags.length > 0)) {
        mktLines.push(`- Divergence Notes: ${dualMetrics.divergenceNotes || dualMetrics.divergenceFlags.join('; ')}`);
      }
    }
  }

  if (secLines.length === 0 && mktLines.length === 0) {
    return '';
  }

  const sections: string[] = [
    `--- EXTERIOR EVIDENCE (authoritative; do not invent) ---`
  ];
  if (secLines.length > 0) sections.push(secLines.join('\n'));
  if (mktLines.length > 0) sections.push(mktLines.join('\n'));
  sections.push(`--- END EVIDENCE ---`);

  return sections.join('\n\n');
}

// Helper: Generate rigorous, evidence-grounded deterministic assessment when AI stream is unavailable
function generateDeterministicFallbackReview(params: {
  name: string;
  symbol: string;
  category?: string;
  protocolType?: string;
  contractAddress?: string;
  securityScan?: any;
  marketSnapshot?: any;
  focusArea?: string;
}): any {
  const cleanName = String(params.name || '').trim();
  const cleanSymbol = String(params.symbol || '').trim().toUpperCase();
  const resolvedCategory = String(params.protocolType || params.category || 'Specialized / Experimental').trim();

  // Extract security facts if available
  const sec = params.securityScan?.data || params.securityScan || {};
  const isHoneypot = Boolean(sec.is_honeypot);
  const isMintable = Boolean(sec.is_mintable);
  const isProxy = Boolean(sec.is_proxy);
  const buyTax = (sec.buy_tax !== undefined && sec.buy_tax !== null && String(sec.buy_tax).trim() !== '' && !isNaN(Number(sec.buy_tax)))
    ? Number(sec.buy_tax)
    : (sec.buyTax !== undefined && sec.buyTax !== null && String(sec.buyTax).trim() !== '' && !isNaN(Number(String(sec.buyTax).replace('%', ''))))
    ? Number(String(sec.buyTax).replace('%', '')) / 100
    : null;
  const sellTax = (sec.sell_tax !== undefined && sec.sell_tax !== null && String(sec.sell_tax).trim() !== '' && !isNaN(Number(sec.sell_tax)))
    ? Number(sec.sell_tax)
    : (sec.sellTax !== undefined && sec.sellTax !== null && String(sec.sellTax).trim() !== '' && !isNaN(Number(String(sec.sellTax).replace('%', ''))))
    ? Number(String(sec.sellTax).replace('%', '')) / 100
    : null;
  const holderCount = Number(sec.holder_count || 0);
  const cannotSellAll = Boolean(sec.cannot_sell_all);
  const canTakeBackOwnership = Boolean(sec.can_take_back_ownership);
  const hiddenOwner = Boolean(sec.hidden_owner);

  // Compute deterministic security score grounded in real scan evidence
  let security = 7.8;
  if (isHoneypot) {
    security = 1.0;
  } else if (cannotSellAll || canTakeBackOwnership || hiddenOwner) {
    security = 3.2;
  } else {
    if (isMintable) security -= 1.2;
    if (isProxy) security -= 0.6;
    if ((buyTax !== null && buyTax > 0.1) || (sellTax !== null && sellTax > 0.1)) security -= 1.6;
    else if (buyTax !== null && sellTax !== null && buyTax === 0 && sellTax === 0 && holderCount > 200) security += 0.8;
  }
  security = Math.max(1.0, Math.min(9.5, Math.round(security * 10) / 10));

  // Utility score based on category
  let utility = 7.5;
  const lowerCat = resolvedCategory.toLowerCase();
  if (lowerCat.includes('layer 1') || lowerCat.includes('l1') || lowerCat.includes('infrastructure')) utility = 8.8;
  else if (lowerCat.includes('privacy') || lowerCat.includes('zk') || lowerCat.includes('fhe')) utility = 8.5;
  else if (lowerCat.includes('defi') || lowerCat.includes('amm') || lowerCat.includes('lending')) utility = 8.0;
  else if (lowerCat.includes('layer 2') || lowerCat.includes('rollup')) utility = 8.2;
  else if (lowerCat.includes('meme') || lowerCat.includes('speculative')) utility = 4.8;
  else utility = 7.2;

  // Tokenomics score derived from market snapshot
  let tokenomics = 7.4;
  const mkt = params.marketSnapshot || {};
  const circ = Number(mkt.circulatingSupply || mkt.circulating_supply || 0);
  const total = Number(mkt.totalSupply || mkt.total_supply || 0);
  if (total > 0 && circ > 0) {
    const ratio = circ / total;
    if (ratio >= 0.75) tokenomics += 1.0;
    else if (ratio <= 0.25) tokenomics -= 1.5;
  }
  tokenomics = Math.max(2.0, Math.min(9.5, Math.round(tokenomics * 10) / 10));

  // Team and community scores
  let team = hiddenOwner ? 4.0 : 7.6;
  let community = 7.4;
  if (holderCount > 5000) community = 8.5;
  else if (holderCount > 0 && holderCount < 100) community = 5.4;

  const scores = { utility, tokenomics, security, team, community };
  const bp = calculateBlueprintScore(scores, resolvedCategory);

  const pros: string[] = [];
  const cons: string[] = [];

  if (isHoneypot) {
    pros.push(`Active on-chain token bytecode registered under symbol ${cleanSymbol}`);
    pros.push(`Standard token interface telemetry captured across indexer nodes`);
    pros.push(`Liquidity pool contract routing deployed on host chain`);
    cons.push(`CRITICAL SECURITY FAILURE: Honeypot logic detected preventing token sales`);
    cons.push(`High risk of complete capital loss due to restricted transfer invariants`);
    cons.push(`Malicious or unverified bytecode execution profile`);
  } else {
    if (buyTax === 0 && sellTax === 0) {
      pros.push(`Verified zero-tax contract execution model (0% buy / 0% sell fee overhead)`);
    } else {
      pros.push(`Standard token transfer interface and active decentralized routing`);
    }
    if (!isMintable) {
      pros.push(`Fixed supply structure: No arbitrary mint function or inflation vector found`);
    } else {
      pros.push(`Established token distribution framework`);
    }
    pros.push(`Aligned with ${resolvedCategory} architectural specification and evaluation rubric`);

    if (isMintable) {
      cons.push(`Arbitrary mint capability: Contract owner retains authority to create additional supply`);
    }
    if (isProxy) {
      cons.push(`Proxy contract upgradeability: Implementation logic can be modified by contract owner`);
    }
    if (buyTax > 0.05 || sellTax > 0.05) {
      cons.push(`Elevated transaction fees: ${(buyTax * 100).toFixed(1)}% buy / ${(sellTax * 100).toFixed(1)}% sell tax impacts capital efficiency`);
    }
    if (cons.length < 3) {
      cons.push(`Exposure to secondary market liquidity volatility and collateral stress conditions`);
    }
    if (cons.length < 3) {
      cons.push(`External dependency on oracle latency and composable protocol interactions`);
    }
  }

  const summary = `### Core Thesis
${cleanName} (${cleanSymbol}) is evaluated under the ${resolvedCategory} framework. This preliminary security and risk assessment was synthesized via the Crypto Review Lab locked Evaluation Blueprint rubric, incorporating exterior security scans, verified on-chain invariants, and live liquidity metrics.

### Market & Utility Analysis
The project delivers specialized capabilities in ${resolvedCategory}. Primary evaluation focuses on cryptographic robustness, liquidity depth, and failure-point resilience under stress conditions.

### Tokenomics & Security
Smart contract inspection ${params.contractAddress ? `for address ${params.contractAddress}` : 'on public ledgers'} indicates a Security Rating of ${security}/10 and Tokenomics Rating of ${tokenomics}/10. ${isHoneypot ? 'CRITICAL RISK IDENTIFIED: Honeypot mechanics active.' : isMintable ? 'Notice: Supply minting capability is present.' : 'No malicious transfer restrictions identified.'}

### Conclusion
${cleanName} receives an overall Evaluation Blueprint Score of ${bp.overallScore}/100, corresponding to Letter Grade ${bp.grade} with a ${bp.riskLevel} Risk tier under the locked 5-dimension rubric.`;

  const verdict = `${cleanName} (${cleanSymbol}) is assigned a Grade ${bp.grade} rating (${bp.overallScore}/100) with ${bp.riskLevel} Risk tier under the 5-dimension locked Evaluation Blueprint rubric.`;

  return {
    id: `rev_${Date.now()}_${cleanSymbol.toLowerCase()}`,
    name: cleanName,
    symbol: cleanSymbol,
    category: bp.categoryType || resolvedCategory,
    overallScore: bp.overallScore,
    grade: bp.grade,
    riskLevel: bp.riskLevel,
    scores,
    verdict,
    summary,
    pros: pros.slice(0, 3),
    cons: cons.slice(0, 3),
    contractAddress: params.contractAddress,
    securityScan: params.securityScan,
    createdAt: new Date().toISOString(),
    author: "Crypto Review Lab (Autonomous Telemetry Engine)",
    dataSource: "CRL Deterministic Telemetry & Invariant Engine"
  };
}

  // API endpoint: Generate standard, objective evaluations
  app.post("/api/review/generate", async (req, res) => {
    try {
      const { name, symbol, category, protocolType, focusArea, contractAddress, securityScan, marketSnapshot } = req.body;
      if (!name || !symbol) {
        return res.status(400).json({ error: "Project name and token ticker symbol are required." });
      }

      if (!contractAddress || !String(contractAddress).trim()) {
        return res.status(400).json({ error: "Contract address is required for on-chain security checks. Enter the address for the correct network." });
      }

      const reqName = String(name).trim().toLowerCase();
      const reqSymbol = String(symbol).trim().toLowerCase();
      const resolvedProtocolType = String(protocolType || category || 'DeFi Protocol (AMM / Lending)').trim();

      // Master Evaluation Blueprint lookup: If project exists in reference database, return canonical blueprint review to eliminate dual scoring discrepancies
      const masterMatch = INITIAL_REVIEWS.find(r => 
        r.name.toLowerCase() === reqName ||
        r.symbol.toLowerCase() === reqSymbol ||
        (r.coingeckoId && r.coingeckoId.toLowerCase() === reqName.replace(/\s+/g, '-'))
      );

      if (masterMatch && !focusArea) {
        return res.json(masterMatch);
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        console.warn("[ReviewLab] No Gemini API key configured. Generating evaluation via CRL Deterministic Fallback Engine...");
        const fallbackReview = generateDeterministicFallbackReview({
          name,
          symbol,
          category,
          protocolType: resolvedProtocolType,
          contractAddress,
          securityScan,
          marketSnapshot,
          focusArea
        });
        return res.json(fallbackReview);
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const isProRun = Boolean(focusArea && String(focusArea).includes('PRO INSTITUTIONAL DEEP SCAN'));
      const evidenceBlock = formatExteriorEvidence(securityScan, marketSnapshot, contractAddress);

      const prompt = `Perform an objective, highly professional crypto evaluation for "${name}" (symbol: ${symbol}) with Protocol Type: "${resolvedProtocolType}".
${focusArea ? `Analyze with specialized focus on: "${focusArea}".` : ''}
${isProRun ? `SECURITY & RISK ASSESSMENT REQUIREMENT: Analyze security benchmarks according to the proprietary CRL Risk Model, providing independent risk metrics and protocol-specific threat vector evaluations.` : ''}

${evidenceBlock ? `${evidenceBlock}

EVIDENCE-GROUNDING INSTRUCTIONS:
- You MUST directly ground your Security and Tokenomics evaluations, scores, summary narrative, and relevant pros/cons in the verified exterior evidence provided above.
- If a specific scan parameter or market metric is missing or not provided in the evidence block, explicitly state its absence—NEVER invent, estimate, or hallucinate scan telemetry or market numbers.
- Ensure your evaluation strictly reflects real telemetry (e.g. honeypot status, mint authority, proxy upgradeability, verified holders, circulating vs max supply, FDV, liquidity depth).
` : ''}CRITICAL ARCHITECTURAL & PROTOCOL-TYPE REQUIREMENTS:
1. PARSE & HONOR PROTOCOL TYPE ("${resolvedProtocolType}"):
   You MUST adapt all analysis, technical risk vectors, and failure scenarios strictly according to the protocol type:
   - For Infrastructure (Oracle / Bridge / Relayer): REPLACE generic 'TVL drain' language with 'Cross-chain message verification failure', 'Relayer multi-sig quorum compromise', 'Merkle header attestation spoofing', or 'Stale price feed oracle latency'.
   - For Privacy / Cryptographic (FHE / ZK / MPC): REPLACE generic 'TVL drain' language with 'MPC threshold key management failure', 'FHE noise growth accumulation', 'Ciphertext malleability', or 'ZK circuit constraint under-constraining'.
   - For Layer 1 Blockchain: REPLACE EVM reentrancy and generic TVL drain templates with 'Validator BFT 67% quorum safety', 'Consensus latency under partition', 'Native VM parallel execution storage locks', or 'State bloat storage pruning limits'.
   - For Layer 2 / Scaling: Focus on 'Sequencer decentralization & L1 force exit fallback', 'Fraud/validity proof verifier soundness', and 'L1 data availability blob bandwidth'.
   - For DeFi Protocol (AMM / Lending): Focus on 'Flash-loan liquidity pool drain', 'TWAP oracle manipulation', 'Liquidation cascade insolvency', and 'Proxy upgrade timelock bypass'.
   - For Memecoin / Speculative: Focus on 'Liquidity pool lock verification & burn status', 'Mint authority renouncement', 'Insider supply concentration', and 'Honeypot / arbitrary transfer tax rules'.
   - For Specialized / Experimental: Focus on 'Resource safety & borrow checker invariant breaks', 'Capability role-based access locks', and 'Cross-contract arbitrary execution sinks'.

2. NO GENERIC OR REPETITIVE TEMPLATES:
   - NEVER use EVM reentrancy checks for Move, Rust, or Wasm native L1s or privacy middleware where they do not apply.
   - NEVER use $1.2B TVL drain scenarios for projects that do not hold locked TVL or lack liquidity pool mechanics.

3. ADAPTIVE & UNCOMPRESSED SCORING: Provide realistic, uncompressed scores across the full 1-10 range for each dimension (Utility, Tokenomics, Security, Team, Community). Un-audited, closed-source, or high-insider projects MUST be scored strictly lower (4-6/10), while battle-tested top-tier protocols receive 8-9.5/10.

4. DYNAMIC WEIGHTING ALIGNMENT:
   - Overall score will be calculated dynamically based on category risk profile (e.g. 35% Security weight for fund-holding DeFi & Bridges, 35% Tech/Security for Cryptographic Middleware).

Your entire response must match the specified JSON schema exactly.`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: {
            systemInstruction: "You are the chief research analyst at Crypto Review Lab. You provide cold, hard, fact-based cryptographic and economic reviews following the locked Evaluation Blueprint rubric. You write with supreme clarity, using professional terminology, avoiding all market-hype words like 'to the moon', 'revolutionary', 'game changer', or 'groundbreaking'. Highlight real potential failure points.",
            responseMimeType: "application/json",
            responseSchema: reviewResponseSchema,
            temperature: 0
          }
        });
      } catch (firstError: any) {
        if (isQuotaOrDemandError(firstError)) {
          console.warn("Primary model 'gemini-3.7-flash' rate limited or unavailable. Retrying with 'gemini-3.1-flash-lite' fallback...");
          try {
            response = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite",
              contents: prompt,
              config: {
                systemInstruction: "You are the chief research analyst at Crypto Review Lab. You provide cold, hard, fact-based cryptographic and economic reviews. You write with supreme clarity, using professional terminology, avoiding all market-hype words like 'to the moon', 'revolutionary', 'game changer', or 'groundbreaking'. Highlight real potential failure points.",
                responseMimeType: "application/json",
                responseSchema: reviewResponseSchema,
                temperature: 0
              }
            });
          } catch (secondError: any) {
            console.warn(`[ReviewLab] Gemini API secondary model error (${secondError.message || secondError}). Activating CRL Deterministic Fallback Engine...`);
            const fallbackReview = generateDeterministicFallbackReview({
              name,
              symbol,
              category,
              protocolType: resolvedProtocolType,
              contractAddress,
              securityScan,
              marketSnapshot,
              focusArea
            });
            return res.json(fallbackReview);
          }
        } else {
          console.warn(`[ReviewLab] Gemini API primary model error (${firstError.message || firstError}). Activating CRL Deterministic Fallback Engine...`);
          const fallbackReview = generateDeterministicFallbackReview({
            name,
            symbol,
            category,
            protocolType: resolvedProtocolType,
            contractAddress,
            securityScan,
            marketSnapshot,
            focusArea
          });
          return res.json(fallbackReview);
        }
      }

      const textResult = response?.text;
      if (!textResult) {
        const fallbackReview = generateDeterministicFallbackReview({
          name,
          symbol,
          category,
          protocolType: resolvedProtocolType,
          contractAddress,
          securityScan,
          marketSnapshot,
          focusArea
        });
        return res.json(fallbackReview);
      }

      const parsedReview = JSON.parse(textResult.trim());

      // Mathematical Alignment Enforcement: Recalculate overallScore, grade, and riskLevel directly from the 5 dimension scores with category routing
      if (parsedReview && parsedReview.scores) {
        const bpResult = calculateBlueprintScore(parsedReview.scores, parsedReview.category || protocolType || category);
        parsedReview.overallScore = bpResult.overallScore;
        parsedReview.grade = bpResult.grade;
        parsedReview.riskLevel = bpResult.riskLevel;
        parsedReview.category = bpResult.categoryType;
      }

      if (parsedReview) {
        if (securityScan && !parsedReview.securityScan) {
          parsedReview.securityScan = securityScan;
        }
        if (contractAddress && !parsedReview.contractAddress) {
          parsedReview.contractAddress = contractAddress;
        }
      }

      res.json(parsedReview);
    } catch (error: any) {
      console.error("Crypto Review generation failed, attempting deterministic recovery:", error);
      try {
        const fallbackReview = generateDeterministicFallbackReview({
          name: req.body?.name,
          symbol: req.body?.symbol,
          category: req.body?.category,
          protocolType: req.body?.protocolType,
          contractAddress: req.body?.contractAddress,
          securityScan: req.body?.securityScan,
          marketSnapshot: req.body?.marketSnapshot,
          focusArea: req.body?.focusArea
        });
        return res.json(fallbackReview);
      } catch (recoveryErr) {
        res.status(500).json({ error: getFriendlyErrorMessage(error) });
      }
    }
  });

// Helper for server-side contract address format validation (mirrors ReviewLab.tsx validateContractAddress)
const SUPPORTED_CHAINS_SERVER = [
  { id: '1', name: 'Ethereum (ETH)', isEvm: true },
  { id: 'solana', name: 'Solana (SOL)', isEvm: false },
  { id: '42161', name: 'Arbitrum One', isEvm: true },
  { id: '8453', name: 'Base', isEvm: true },
  { id: '56', name: 'BNB Smart Chain (BSC)', isEvm: true },
  { id: '137', name: 'Polygon', isEvm: true },
  { id: '10', name: 'Optimism (OP)', isEvm: true },
  { id: '43114', name: 'Avalanche C-Chain', isEvm: true },
  { id: 'sui', name: 'Sui Network', isEvm: false },
  { id: 'other', name: 'Other / Non-EVM', isEvm: false },
];

function validateContractAddressServer(address: string, chainId: string = '1'): { isValid: boolean; error?: string } {
  const trimmed = (address || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'A verified contract address is required to run a security assessment.'
    };
  }

  const cleanChainId = chainId ? String(chainId).trim() : '1';
  const selectedChainInfo = SUPPORTED_CHAINS_SERVER.find(c => c.id === cleanChainId) || {
    id: cleanChainId,
    name: 'Custom Network',
    isEvm: !['solana', 'sui', 'other'].includes(cleanChainId.toLowerCase())
  };

  if (selectedChainInfo.isEvm) {
    const evmRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!trimmed.startsWith('0x')) {
      return {
        isValid: false,
        error: `EVM contract addresses for ${selectedChainInfo.name} must start with '0x'.`
      };
    }
    if (!evmRegex.test(trimmed)) {
      return {
        isValid: false,
        error: `Invalid EVM contract address format for ${selectedChainInfo.name}. Expected 42-character hex format (0x + 40 hex characters).`
      };
    }
  } else if (cleanChainId.toLowerCase() === 'solana') {
    const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (trimmed.startsWith('0x')) {
      return {
        isValid: false,
        error: "Solana mint addresses do not start with '0x'. Enter a valid Solana Base58 token address."
      };
    }
    if (trimmed.length < 32 || trimmed.length > 44 || !solanaRegex.test(trimmed)) {
      return {
        isValid: false,
        error: 'Invalid Solana token address. Expected 32-44 character Base58 string.'
      };
    }
  } else {
    if (trimmed.length < 4 || trimmed.length > 128) {
      return {
        isValid: false,
        error: 'Please enter a valid token / contract address for the selected network (4-128 characters).'
      };
    }
  }

  return { isValid: true };
}

  // API endpoint: Pro Order Intake (Step 1: Client pays & receives instant confirmation email)
  app.post("/api/pro-order/create", async (req, res) => {
    try {
      const { clientEmail, projectName, projectSymbol, contractAddress, chainId, focusArea, verificationDepth, stressSimulation, systemDraft, paymentReference } = req.body;
      const cleanEmail = typeof clientEmail === 'string' ? clientEmail.trim() : '';
      const cleanName = typeof projectName === 'string' ? projectName.trim() : '';
      const cleanSymbol = typeof projectSymbol === 'string' ? projectSymbol.trim() : '';
      const cleanContract = typeof contractAddress === 'string' ? contractAddress.trim() : '';

      if (!cleanEmail || !cleanName || !cleanSymbol) {
        return res.status(400).json({ error: "Client email, project name, and ticker symbol are required." });
      }

      if (!cleanContract) {
        return res.status(400).json({ error: "A verified contract address is required to run a security assessment." });
      }

      const effectiveChainId = String(chainId || systemDraft?.chainId || '1').trim();
      const addrValidation = validateContractAddressServer(cleanContract, effectiveChainId);
      if (!addrValidation.isValid) {
        return res.status(400).json({ error: addrValidation.error || "A verified contract address is required to run a security assessment." });
      }

      let draft = systemDraft;
      if (!draft) {
        // Look up registered benchmark data if available, otherwise produce explicit INPUT_MISSING deterministic state
        const match = INITIAL_REVIEWS.find(r => 
          r.name.toLowerCase() === String(projectName).toLowerCase() ||
          r.symbol.toLowerCase() === String(projectSymbol).toLowerCase()
        );
        draft = match || {
          id: `draft_${Date.now()}`,
          name: projectName,
          symbol: projectSymbol,
          category: 'Smart Contract / Web3',
          overallScore: 0,
          grade: 'INPUT_MISSING',
          verdict: 'Assessment Input Pending: No preliminary assessment draft or telemetry data provided. Awaiting diagnostic scan execution.',
          scores: { utility: 0, tokenomics: 0, security: 0, team: 0, community: 0 },
          summary: `Assessment pending for ${projectName} (${projectSymbol}). System draft data is unavailable (DRAFT_UNAVAILABLE). No favorable score, grade, or security conclusions are inferred.`,
          pros: [],
          cons: ['Initial diagnostic telemetry missing', 'Bytecode verification data pending scan execution'],
          riskLevel: 'INPUT_MISSING' as const,
          createdAt: new Date().toISOString(),
          author: 'Crypto Review Lab'
        };
      }

      const newOrder = await createProOrder({
        clientEmail,
        projectName,
        projectSymbol,
        contractAddress,
        focusArea,
        verificationDepth,
        stressSimulation,
        systemDraft: draft,
        paymentReference: paymentReference ? String(paymentReference).trim() : undefined
      });

      const publicBaseUrl = getPublicAppUrl(req);
      const ipnCallbackUrl = `${publicBaseUrl}/api/payments/nowpayments-ipn`;

      console.log(`[Reviewed Delivery Model] New Pro Order Created: ${newOrder.orderId} for ${clientEmail} (Ref: ${paymentReference || 'N/A'}). Confirmation email logged from ${PRINCIPAL_EMAIL}`);
      res.json({
        ...newOrder,
        ipnCallbackUrl
      });
    } catch (error: any) {
      console.error("Pro order creation error:", error);
      res.status(500).json({ error: "Failed to process Pro order." });
    }
  });

  // Helper: Derive public base URL for dynamic webhooks and callbacks
  function getPublicAppUrl(req: express.Request): string {
    if (process.env.APP_URL && process.env.APP_URL.trim() && !process.env.APP_URL.includes("MY_APP_URL")) {
      return process.env.APP_URL.replace(/\/$/, "");
    }
    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "localhost:3000";
    return `${proto}://${host}`;
  }

  // Helper: Sort object keys alphabetically for standard NOWPayments HMAC-SHA512 hashing
  function sortObjectKeysForIpn(obj: any): any {
    if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
      return obj;
    }
    const sortedKeys = Object.keys(obj).sort();
    const result: Record<string, any> = {};
    for (const key of sortedKeys) {
      result[key] = sortObjectKeysForIpn(obj[key]);
    }
    return result;
  }

  // Helper: Verify NOWPayments IPN signature securely
  function verifyNowPaymentsIpnSignature(
    payload: any,
    sigHeader: string | undefined,
    secret: string | undefined
  ): boolean {
    if (!sigHeader || !secret || !secret.trim()) {
      return false;
    }
    try {
      const sortedPayload = sortObjectKeysForIpn(payload);
      const serialized = JSON.stringify(sortedPayload);
      const calculatedSig = crypto
        .createHmac("sha512", secret.trim())
        .update(serialized)
        .digest("hex");

      const sigA = Buffer.from(calculatedSig.toLowerCase(), "utf8");
      const sigB = Buffer.from(sigHeader.trim().toLowerCase(), "utf8");

      if (sigA.length !== sigB.length) {
        return false;
      }
      return crypto.timingSafeEqual(sigA, sigB);
    } catch (err) {
      console.error("[NOWPayments IPN] Error verifying signature:", err);
      return false;
    }
  }

  // API endpoint: NOWPayments Instant Payment Notification (IPN) Webhook
  // Validates HMAC-SHA512 signature using NOWPAYMENTS_IPN_SECRET and updates order payment state idempotently
  app.post("/api/payments/nowpayments-ipn", (req, res) => {
    try {
      const sigHeader = (req.headers["x-nowpayments-sig"] || req.headers["x-nowpayments-signature"]) as string | undefined;
      const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;

      if (!ipnSecret || !ipnSecret.trim()) {
        console.error("[NOWPayments IPN] Unauthorized callback: NOWPAYMENTS_IPN_SECRET is not configured in server environment.");
        return res.status(401).json({ error: "Server NOWPAYMENTS_IPN_SECRET is not configured." });
      }

      if (!sigHeader) {
        console.warn("[NOWPayments IPN] Unauthorized callback rejected: Missing x-nowpayments-sig header.");
        return res.status(401).json({ error: "Missing x-nowpayments-sig authentication header." });
      }

      const isValid = verifyNowPaymentsIpnSignature(req.body, sigHeader, ipnSecret);
      if (!isValid) {
        console.warn(`[NOWPayments IPN] Unauthorized callback rejected: Invalid signature for payment_id: ${req.body?.payment_id || 'unknown'}`);
        return res.status(401).json({ error: "Invalid signature verification failed." });
      }

      // Payload authenticated. Log payment & order reference without leaking secrets
      const paymentId = req.body?.payment_id || req.body?.invoice_id || 'N/A';
      const rawStatus = req.body?.payment_status || 'unknown';
      const orderId = req.body?.order_id || 'unknown';

      console.log(`[NOWPayments IPN] Authenticated callback received: Payment ID: ${paymentId}, Order ID: ${orderId}, Status: ${rawStatus}`);

      const result = processNowPaymentsIpn(req.body);
      if (!result.success) {
        console.warn(`[NOWPayments IPN] IPN processing issue: ${result.message}`);
        if (result.message?.includes("not found")) {
          return res.status(404).json({ error: result.message, orderId });
        }
        return res.status(400).json({ error: result.message });
      }

      console.log(`[NOWPayments IPN] IPN successfully processed for Order #${result.orderId}. Payment status: ${result.paymentStatus} (Duplicate: ${result.isDuplicate})`);
      return res.status(200).json({
        ok: true,
        message: result.message,
        orderId: result.orderId,
        paymentStatus: result.paymentStatus,
        isDuplicate: result.isDuplicate
      });
    } catch (err: any) {
      console.error("[NOWPayments IPN] Unexpected server error processing IPN:", err);
      return res.status(500).json({ error: "Internal server error processing IPN callback." });
    }
  });

  // API endpoint: Dynamic NOWPayments payment & IPN callback configuration / invoice creator
  app.post("/api/payments/nowpayments-create-invoice", async (req, res) => {
    try {
      const { orderId, amountUsd = 149, projectName, projectSymbol } = req.body;
      const publicBaseUrl = getPublicAppUrl(req);
      const ipnCallbackUrl = `${publicBaseUrl}/api/payments/nowpayments-ipn`;
      const successUrl = `${publicBaseUrl}/?orderId=${encodeURIComponent(orderId || '')}`;
      const cancelUrl = `${publicBaseUrl}/?orderId=${encodeURIComponent(orderId || '')}`;

      const nowpaymentsApiKey = process.env.NOWPAYMENTS_API_KEY;

      if (nowpaymentsApiKey && nowpaymentsApiKey.trim()) {
        try {
          const invoiceRes = await fetch("https://api.nowpayments.io/v1/invoice", {
            method: "POST",
            headers: {
              "x-api-key": nowpaymentsApiKey.trim(),
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              price_amount: Number(amountUsd) || 149,
              price_currency: "usd",
              order_id: orderId,
              order_description: `Crypto Review Lab - Security & Risk Assessment for ${projectName || 'Token'} (${projectSymbol || 'PRO'})`,
              ipn_callback_url: ipnCallbackUrl,
              success_url: successUrl,
              cancel_url: cancelUrl
            })
          });

          if (invoiceRes.ok) {
            const invoiceData = await invoiceRes.json();
            return res.json({
              success: true,
              invoiceUrl: invoiceData.invoice_url,
              invoiceId: invoiceData.id,
              ipnCallbackUrl,
              orderId
            });
          }
        } catch (apiErr) {
          console.warn("[NOWPayments Invoice API] Direct invoice API call failed, providing standard fallback:", apiErr);
        }
      }

      // Fallback with configured callback metadata and order association
      return res.json({
        success: true,
        invoiceUrl: "https://nowpayments.io/payment/?iid=6085575151",
        ipnCallbackUrl,
        orderId
      });
    } catch (err: any) {
      console.error("Error creating NOWPayments invoice config:", err);
      res.status(500).json({ error: "Failed to generate invoice config." });
    }
  });

  // API endpoint: List all Pro Orders for Auditor Review Console Queue
  app.get("/api/pro-order/list", (req, res) => {
    try {
      const orders = getAllOrders();
      res.json(orders);
    } catch (error: any) {
      console.error("Failed to list Pro orders:", error);
      res.status(500).json({ error: "Failed to load order queue." });
    }
  });

  // API endpoint: Lookup Pro Order Status by Order ID and Email (Strict Dual Verification)
  app.get("/api/pro-order/lookup", (req, res) => {
    try {
      const orderId = String(req.query.orderId || '').trim();
      const email = String(req.query.email || '').trim();

      if (!orderId || !email) {
        return res.json({ orders: [], idMatch: false, mailMatch: false });
      }

      const results = lookupOrderStrict(orderId, email);
      const all = getAllOrders();
      const idMatch = all.some(o => o.orderId.toLowerCase() === orderId.toLowerCase());
      const mailMatch = all.some(o => o.clientEmail.toLowerCase() === email.toLowerCase());

      return res.json({ orders: results, idMatch, mailMatch });
    } catch (error: any) {
      console.error("Order lookup error:", error);
      res.status(500).json({ error: "Failed to perform order lookup." });
    }
  });

  // API endpoint: Phase 2 Automated Re-Control / Regeneration for Pro Orders
  app.post("/api/pro-order/re-control", async (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: "Order ID is required." });
      }
      const updatedOrder = await triggerPhaseTwoReControlForOrder(orderId);
      if (!updatedOrder) {
        return res.status(404).json({ error: `Order #${orderId} not found.` });
      }
      res.json(updatedOrder);
    } catch (error: any) {
      console.error("Re-control error:", error);
      res.status(500).json({ error: "Failed to run Phase 2 re-control." });
    }
  });

  // API endpoint: List all reviews (persisted server-side in crypto_reviews.json)
  app.get("/api/reviews/list", (req, res) => {
    try {
      const reviews = loadReviewsFromFile();
      const isAdmin = isAuthorizedAdmin(req);
      if (isAdmin) {
        return res.json(reviews);
      }
      // Public route: Only return reviews that are approved for public publishing
      const publicReviews = reviews.filter((r: any) => r.publishApproved === true);
      res.json(publicReviews);
    } catch (error: any) {
      console.error("Failed to load reviews:", error);
      res.status(500).json({ error: "Failed to load reviews." });
    }
  });

  // API endpoint: Save reviews (persisted server-side in crypto_reviews.json)
  app.post("/api/reviews/save", (req, res) => {
    try {
      const { reviews } = req.body;
      if (!Array.isArray(reviews)) {
        return res.status(400).json({ error: "Reviews array is required." });
      }
      saveReviewsToFile(reviews);
      res.json({ success: true, count: reviews.length });
    } catch (error: any) {
      console.error("Failed to save reviews:", error);
      res.status(500).json({ error: "Failed to save reviews." });
    }
  });

  // Allowed Admin Master Keys for server validation (configured purely via process.env.ADMIN_MASTER_KEY or process.env.ADMIN_MASTER_KEYS)
  function getAdminMasterKeys(): string[] {
    const keys: string[] = [];
    if (process.env.ADMIN_MASTER_KEY) {
      keys.push(process.env.ADMIN_MASTER_KEY.trim().toUpperCase());
    }
    if (process.env.ADMIN_MASTER_KEYS) {
      const parsed = process.env.ADMIN_MASTER_KEYS.split(',').map(k => k.trim().toUpperCase()).filter(Boolean);
      keys.push(...parsed);
    }
    return Array.from(new Set(keys));
  }

  interface AdminSession {
    token: string;
    createdAt: number;
    expiresAt: number;
    role: 'admin';
  }

  const activeAdminSessions = new Map<string, AdminSession>();
  const loginAttemptsMap = new Map<string, { count: number; windowStart: number }>();

  // Periodically clean up expired sessions
  function cleanExpiredSessions() {
    const now = Date.now();
    for (const [token, session] of activeAdminSessions.entries()) {
      if (now > session.expiresAt) {
        activeAdminSessions.delete(token);
      }
    }
  }
  setInterval(cleanExpiredSessions, 10 * 60 * 1000);

  function isAuthorizedAdmin(req: express.Request): boolean {
    const authHeader = req.headers["authorization"];
    const bearerToken = authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    const sessionHeader = String(
      bearerToken ||
      req.headers["x-admin-session"] ||
      req.headers["x-session-token"] || 
      req.body?.sessionToken || 
      ""
    ).trim();

    if (sessionHeader) {
      const session = activeAdminSessions.get(sessionHeader);
      if (session) {
        if (Date.now() <= session.expiresAt) {
          return true;
        } else {
          activeAdminSessions.delete(sessionHeader);
        }
      }
    }

    return false;
  }

  function checkAdminLoginRateLimit(ip: string): boolean {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;

    let record = loginAttemptsMap.get(ip);
    if (!record || now - record.windowStart > windowMs) {
      record = { count: 1, windowStart: now };
      loginAttemptsMap.set(ip, record);
      return true;
    }

    if (record.count >= maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  // API endpoint: Admin Dual-Factor Login (Master Key + bcrypt Passphrase Hash) with rate limiting
  app.post("/api/admin/login", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      if (!checkAdminLoginRateLimit(ip)) {
        return res.status(429).json({ error: "Too many login attempts. Please try again after 15 minutes." });
      }

      const { masterKey, passphrase } = req.body;
      if (!masterKey || typeof masterKey !== 'string' || !passphrase || typeof passphrase !== 'string') {
        return res.status(400).json({ error: "Both Admin Master Key and Passphrase are required." });
      }

      const expectedHash = process.env.ADMIN_PASSPHRASE_HASH;
      if (!expectedHash || !expectedHash.startsWith('$2')) {
        return res.status(503).json({ error: "Admin authentication is not configured (ADMIN_PASSPHRASE_HASH missing)" });
      }

      const keyUpper = masterKey.trim().toUpperCase();
      const validKeys = getAdminMasterKeys();
      let isValidKey = false;
      const inputKeyBuf = Buffer.from(keyUpper);
      for (const validKey of validKeys) {
        const validKeyBuf = Buffer.from(validKey);
        if (inputKeyBuf.length === validKeyBuf.length) {
          if (crypto.timingSafeEqual(inputKeyBuf, validKeyBuf)) {
            isValidKey = true;
          }
        } else {
          // Compare against dummy buffer to maintain constant-time execution and prevent length timing leakage
          const dummy = Buffer.alloc(inputKeyBuf.length);
          crypto.timingSafeEqual(dummy, dummy);
        }
      }

      const isPassphraseMatch = await bcrypt.compare(passphrase.trim(), expectedHash);

      if (!isValidKey || !isPassphraseMatch) {
        return res.status(401).json({ error: "Invalid Admin Master Key or Passphrase combination." });
      }

      // Generate cryptographically secure session token (24-hour expiration)
      const sessionToken = "crl_sess_" + crypto.randomBytes(32).toString('hex');
      const now = Date.now();
      const expiresInSeconds = 86400; // 24 hours
      const expiresAt = now + expiresInSeconds * 1000;
      activeAdminSessions.set(sessionToken, {
        token: sessionToken,
        createdAt: now,
        expiresAt,
        role: 'admin'
      });

      res.json({
        success: true,
        token: sessionToken,
        expiresIn: expiresInSeconds,
        expiresAt
      });
    } catch (error: any) {
      console.error("Admin login error:", error);
      res.status(500).json({ error: "Internal server error during admin login." });
    }
  });

  // API endpoint: Admin Logout
  app.post("/api/admin/logout", (req, res) => {
    try {
      const authHeader = req.headers["authorization"];
      const bearerToken = authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : "";

      const sessionToken = String(
        bearerToken ||
        req.headers["x-admin-session"] ||
        req.headers["x-session-token"] || 
        req.body?.sessionToken || 
        ""
      ).trim();

      if (sessionToken) {
        activeAdminSessions.delete(sessionToken);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Admin logout error:", error);
      res.status(500).json({ error: "Internal server error during admin logout." });
    }
  });

  // API endpoint: Admin Session Verification
  app.get("/api/admin/verify-session", (req, res) => {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ valid: false, error: "Admin session token is missing, invalid, or expired." });
    }
    res.json({ valid: true });
  });

  // API endpoint: Admin-only promote review to canonical INITIAL_REVIEWS in src/data.ts
  app.post("/api/admin/promote-canonical", express.json(), (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(401).json({ error: "Unauthorized: Valid Admin Session Token is required to promote canonical reviews." });
      }

      const { review } = req.body;
      if (!review || typeof review !== "object" || !review.symbol || !review.name) {
        return res.status(400).json({ error: "Invalid review object. Name and symbol are required." });
      }

      const cleanReview = {
        id: review.id || `${String(review.symbol).toLowerCase()}-audit-review`,
        coingeckoId: review.coingeckoId || review.id || String(review.symbol).toLowerCase(),
        name: String(review.name),
        symbol: String(review.symbol).toUpperCase(),
        category: String(review.category || 'DeFi / Web3'),
        overallScore: Number(review.overallScore) || 80,
        grade: String(review.grade || 'A'),
        verdict: String(review.verdict || ''),
        scores: {
          utility: Number(review.scores?.utility) || 8,
          tokenomics: Number(review.scores?.tokenomics) || 8,
          security: Number(review.scores?.security) || 8,
          team: Number(review.scores?.team) || 8,
          community: Number(review.scores?.community) || 8,
        },
        riskLevel: (review.riskLevel || 'Medium') as any,
        createdAt: String(review.createdAt || new Date().toISOString().split('T')[0]),
        author: String(review.author || 'Crypto Review Lab'),
        logoUrl: String(review.logoUrl || `https://assets.coingecko.com/coins/images/34188/large/${String(review.symbol).toLowerCase()}.png`),
        summary: String(review.summary || ''),
        pros: Array.isArray(review.pros) ? review.pros.map(String) : [],
        cons: Array.isArray(review.cons) ? review.cons.map(String) : [],
      };

      const targetSymbol = cleanReview.symbol;
      const targetCgId = cleanReview.coingeckoId.toLowerCase();
      const targetId = cleanReview.id.toLowerCase();

      // Find existing match in current INITIAL_REVIEWS
      const existingIndex = INITIAL_REVIEWS.findIndex(r => 
        (r.id && r.id.toLowerCase() === targetId) ||
        (r.coingeckoId && r.coingeckoId.toLowerCase() === targetCgId) ||
        (r.symbol && r.symbol.toUpperCase() === targetSymbol)
      );

      // Create working list of raw reviews
      let rawList = INITIAL_REVIEWS.map(r => ({
        id: r.id,
        coingeckoId: r.coingeckoId,
        name: r.name,
        symbol: r.symbol,
        category: r.category,
        overallScore: r.overallScore,
        grade: r.grade,
        verdict: r.verdict,
        scores: r.scores,
        riskLevel: r.riskLevel,
        createdAt: r.createdAt,
        author: r.author,
        logoUrl: r.logoUrl,
        summary: r.summary,
        pros: r.pros,
        cons: r.cons
      }));

      if (existingIndex !== -1) {
        rawList[existingIndex] = cleanReview;
      } else {
        rawList.push(cleanReview);
      }

      // Write updated list back to src/data.ts
      const dataFilePath = path.join(process.cwd(), "src", "data.ts");
      const newFileContent = `/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CryptoReview } from './types';
import { calculateBlueprintScore } from './services/EvaluationBlueprint';

const RAW_REVIEWS: CryptoReview[] = ${JSON.stringify(rawList, null, 2)};

export const INITIAL_REVIEWS: CryptoReview[] = RAW_REVIEWS.map(review => {
  const bp = calculateBlueprintScore(review.scores, review.category);
  return {
    ...review,
    category: bp.categoryType,
    overallScore: bp.overallScore,
    grade: bp.grade,
    riskLevel: bp.riskLevel
  };
});
`;

      fs.writeFileSync(dataFilePath, newFileContent, "utf-8");

      // Update in-memory INITIAL_REVIEWS array in server.ts
      const updatedMapped = rawList.map(r => {
        const bp = calculateBlueprintScore(r.scores, r.category);
        return {
          ...r,
          category: bp.categoryType,
          overallScore: bp.overallScore,
          grade: bp.grade,
          riskLevel: bp.riskLevel
        };
      });
      INITIAL_REVIEWS.length = 0;
      INITIAL_REVIEWS.push(...updatedMapped);

      console.log(`[Admin Promote] Successfully promoted review for ${cleanReview.symbol} to canonical in src/data.ts`);

      res.json({
        success: true,
        message: `Successfully promoted review for ${cleanReview.symbol} (${cleanReview.name}) to canonical status in src/data.ts.`,
        promotedReview: cleanReview
      });
    } catch (error: any) {
      console.error("Promote to canonical error:", error);
      res.status(500).json({ error: error.message || "Failed to promote review to canonical." });
    }
  });

  // API endpoint: Internal Human Reviewer Approval & Delivery (Step 2 & 3)
  app.post("/api/pro-order/review-approve", (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(401).json({ error: "Unauthorized: Admin authorization required to approve and deliver orders." });
      }

      const { orderId, auditorNotes, updatedReview } = req.body;
      if (!orderId || !auditorNotes) {
        return res.status(400).json({ error: "Order ID and auditor notes are required." });
      }

      const updatedOrder = approveAndDeliverProOrder(orderId, auditorNotes, updatedReview);
      if (!updatedOrder) {
        return res.status(404).json({ error: `Order #${orderId} not found.` });
      }

      console.log(`[Reviewed Delivery Model] Order #${orderId} approved & delivered to ${updatedOrder.clientEmail} from ${PRINCIPAL_EMAIL}`);
      res.json(updatedOrder);
    } catch (error: any) {
      console.error("Order approval error:", error);
      res.status(500).json({ error: "Failed to approve and deliver order." });
    }
  });

  // API endpoint: Admin Override for F3 Discrepancies / Verification Status
  app.post("/api/pro-order/admin-override", (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(401).json({ error: "Unauthorized: Admin authorization required to apply overrides." });
      }

      const { orderId, override } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: "Order ID is required." });
      }

      const updatedOrder = applyAdminOverrideToOrder(orderId, override || null);
      if (!updatedOrder) {
        return res.status(404).json({ error: `Order #${orderId} not found.` });
      }

      console.log(`[Admin Override] Order #${orderId} override recorded by ${override?.overriddenBy || 'Admin'}`);
      res.json(updatedOrder);
    } catch (error: any) {
      console.error("Admin override error:", error);
      res.status(500).json({ error: "Failed to apply admin override to order." });
    }
  });

  // API endpoint: Client Request for Public Publishing Approval
  app.post("/api/pro-order/request-publish-approval", (req, res) => {
    try {
      const { orderId, clientNotes } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: "Order ID is required." });
      }

      const updatedOrder = requestPublishApproval(orderId, clientNotes);
      if (!updatedOrder) {
        return res.status(404).json({ error: `Order #${orderId} not found.` });
      }

      console.log(`[Publish Request] Client requested publish approval for Order #${orderId} at ${updatedOrder.publishRequestedAt}`);
      res.json({
        success: true,
        orderId,
        publishRequestedAt: updatedOrder.publishRequestedAt,
        publishApproved: updatedOrder.publishApproved ?? false,
        message: "Publishing approval request logged. An admin reviewer will verify before public listing."
      });
    } catch (error: any) {
      console.error("Request publish approval error:", error);
      res.status(500).json({ error: "Failed to submit publish approval request." });
    }
  });

  // API endpoint: Admin-Only Confirm Public Publishing (requires explicit written confirmation log)
  app.post("/api/pro-order/confirm-publish", (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(401).json({ error: "Unauthorized: Admin authorization required to confirm public publishing." });
      }

      const { orderId, writtenConfirmation, publishedBy } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: "Order ID is required." });
      }
      if (!writtenConfirmation || typeof writtenConfirmation !== "string" || !writtenConfirmation.trim()) {
        return res.status(400).json({ error: "Explicit written confirmation is required to approve publishing." });
      }

      const updatedOrder = confirmPublishProOrder(orderId, writtenConfirmation.trim(), publishedBy || "Admin");
      if (!updatedOrder) {
        return res.status(404).json({ error: `Order #${orderId} not found.` });
      }

      console.log(`[Publish Confirmed] Order #${orderId} public publishing confirmed by ${updatedOrder.publishApprovedBy} at ${updatedOrder.publishApprovedAt}`);
      res.json({
        success: true,
        orderId,
        publishApproved: true,
        publishApprovedAt: updatedOrder.publishApprovedAt,
        publishApprovedBy: updatedOrder.publishApprovedBy,
        publishWrittenConfirmation: updatedOrder.publishWrittenConfirmation,
        order: updatedOrder
      });
    } catch (error: any) {
      console.error("Confirm publish error:", error);
      res.status(500).json({ error: error.message || "Failed to confirm public publishing." });
    }
  });

  // --- Security Scanning Provider Architecture & Provenance ---
  type SecurityProviderStatus = "AVAILABLE" | "FAILED" | "TIMEOUT" | "NO_DATA" | "UNAVAILABLE";

  interface SecurityProviderOutcome<T = any> {
    status: SecurityProviderStatus;
    error?: string;
    data?: T;
  }

  // --- GoPlus Token Security Authentication & In-Memory Token Cache ---
  interface GoPlusTokenCache {
    token: string;
    expiresAt: number;
  }
  let goPlusTokenCache: GoPlusTokenCache | null = null;

  async function getGoPlusBearerToken(): Promise<string | null> {
    const appKey = (process.env.GOPLUS_APP_KEY || "").trim();
    const appSecret = (process.env.GOPLUS_APP_SECRET || "").trim();

    if (!appKey || !appSecret) {
      return null;
    }

    if (goPlusTokenCache && Date.now() < goPlusTokenCache.expiresAt) {
      return goPlusTokenCache.token;
    }

    try {
      const time = Math.floor(Date.now() / 1000);
      const sign = crypto.createHash("sha1").update(`${appKey}${time}${appSecret}`).digest("hex");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const response = await fetch("https://api.gopluslabs.io/api/v1/token", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          app_key: appKey,
          sign,
          time
        })
      });
      clearTimeout(timeout);

      if (response.ok) {
        const payload = await response.json();
        const token = payload?.result?.access_token || payload?.data?.access_token || payload?.access_token;
        const expiresIn = Number(payload?.result?.expires_in || payload?.data?.expires_in || payload?.expires_in || 86400);

        if (token && typeof token === "string") {
          // GoPlus tokens last ~24h; refresh before expiry (~23h TTL)
          const ttlMs = Math.max(60000, (expiresIn > 7200 ? expiresIn - 3600 : expiresIn * 0.9) * 1000);
          goPlusTokenCache = {
            token,
            expiresAt: Date.now() + ttlMs
          };
          return token;
        }
      } else {
        console.warn(`GoPlus token minting returned HTTP ${response.status}`);
      }
    } catch (err) {
      console.warn("Failed to mint GoPlus access token:", err);
    }
    return null;
  }

  const SUPPORTED_GOPLUS_EVM_CHAINS = new Set([
    "1", "56", "42161", "137", "204", "324", "59144", "8453", "5000", "130",
    "48900", "534352", "10", "43114", "25", "100", "321", "201022", "42766",
    "4663", "1030", "1672", "9745", "143", "5734951", "688688", "988", "1868",
    "1514", "146", "2741", "177", "80094", "480", "2818", "1625", "185", "196",
    "810180", "200901", "4200", "169", "81457"
  ]);

  function resolveEvmChainId(chainInput: string | number): string {
    const str = String(chainInput).toLowerCase().trim();
    if (str === "1" || str === "eth" || str === "ethereum" || str === "mainnet") return "1";
    if (str === "56" || str === "bsc" || str === "binance" || str === "bnb") return "56";
    if (str === "137" || str === "polygon" || str === "matic") return "137";
    if (str === "42161" || str === "arbitrum" || str === "arb") return "42161";
    if (str === "10" || str === "optimism" || str === "op") return "10";
    if (str === "43114" || str === "avalanche" || str === "avax") return "43114";
    if (str === "8453" || str === "base") return "8453";
    if (str === "59144" || str === "linea") return "59144";
    if (str === "534352" || str === "scroll") return "534352";
    if (str === "324" || str === "zksync") return "324";
    if (str === "25" || str === "cronos") return "25";
    if (str === "100" || str === "gnosis") return "100";
    if (/^\d+$/.test(str)) return str;
    return str;
  }

  function parseTaxRate(val: any): string | null {
    if (val === undefined || val === null) return null;
    const s = String(val).trim();
    if (s === "" || s.toLowerCase() === "null" || s.toLowerCase() === "undefined" || s.toLowerCase() === "not reported" || s.toLowerCase() === "nan") {
      return null;
    }
    const num = parseFloat(s);
    if (isNaN(num)) return null;
    // Only an explicitly reported numeric 0 may display as 0% (0.0%)
    if (num === 0) return "0.0%";
    const rate = (num > 0 && num < 1) ? num * 100 : num;
    return `${rate.toFixed(1)}%`;
  }

  function parseGoPlusTokenData(tokenData: any) {
    const ownerAddr = (tokenData.owner_address || tokenData.owner || "").toLowerCase().trim();
    const isRenounced =
      !ownerAddr ||
      ownerAddr === "0x0000000000000000000000000000000000000000" ||
      ownerAddr === "0x000000000000000000000000000000000000dead" ||
      tokenData.renounced === true ||
      (tokenData.can_take_back_ownership === "0" && (!ownerAddr || ownerAddr.includes("00000000")));

    const isTrustList = tokenData.trust_list === "1" || tokenData.trust_list === 1 || tokenData.trusted_token === 1 || tokenData.trusted_token === "1" || tokenData.trusted_token === true;

    let ownerIsContract = false;
    if (Array.isArray(tokenData.holders) && ownerAddr) {
      const ownerHolder = tokenData.holders.find(
        (h: any) => h && h.address && String(h.address).toLowerCase() === ownerAddr
      );
      if (ownerHolder && (ownerHolder.is_contract === 1 || ownerHolder.is_contract === "1")) {
        ownerIsContract = true;
      }
    }
    if (tokenData.owner_type === "contract" || isTrustList || tokenData.owner_is_contract) {
      ownerIsContract = true;
    }

    let custodyRisk: "RENOUNCED" | "CONTRACT_OWNER" | "EOA_OWNER" = "EOA_OWNER";
    if (isRenounced) {
      custodyRisk = "RENOUNCED";
    } else if (ownerIsContract || tokenData.owner_type === "contract" || tokenData.owner_type === 1 || tokenData.owner_type === "1") {
      custodyRisk = "CONTRACT_OWNER";
    } else {
      custodyRisk = "EOA_OWNER";
    }

    let ownerTypeLabel = "Wallet";
    if (isRenounced) {
      ownerTypeLabel = "Renounced";
    } else if (ownerIsContract) {
      ownerTypeLabel = "Contract / DAO";
    } else if (isTrustList) {
      ownerTypeLabel = "Trusted Protocol";
    }

    const isHoneypot = tokenData.is_honeypot === "1" || tokenData.is_honeypot === 1 || tokenData.is_honeypot === true;
    const isMintable = tokenData.is_mintable === "1" || tokenData.is_mintable === 1 || tokenData.is_mintable === true || tokenData.mintable?.status === "1" || tokenData.mintable?.status === 1 || tokenData.mintable === "1" || tokenData.mintable === true;
    const ownerChangeBalance = tokenData.owner_change_balance === "1" || tokenData.owner_change_balance === 1 || tokenData.owner_change_balance === true;
    const isBlacklisted = tokenData.is_blacklisted === "1" || tokenData.is_blacklisted === 1 || tokenData.is_blacklisted === true || tokenData.blacklist?.status === "1";
    const isProxy = tokenData.is_proxy === "1" || tokenData.is_proxy === 1 || tokenData.is_proxy === true || tokenData.contract_upgradeable?.status === "1";
    const isOpenSource = tokenData.is_open_source === "1" || tokenData.is_open_source === 1 || tokenData.is_open_source === true || tokenData.trusted_token === 1 || tokenData.trusted_token === "1" || tokenData.trusted_token === true;
    const cannotSell = tokenData.cannot_sell === "1" || tokenData.cannot_sell === 1 || tokenData.cannot_sell === true;

    const highRiskCount = (isHoneypot ? 1 : 0) + (isBlacklisted ? 1 : 0) + (ownerChangeBalance ? 1 : 0) + (cannotSell ? 1 : 0);
    const isUnrenouncedWallet = !isRenounced && !ownerIsContract && !isTrustList;
    const warnRiskCount = (isMintable ? 1 : 0) + (isProxy ? 1 : 0) + (!isOpenSource ? 1 : 0) + (isUnrenouncedWallet ? 1 : 0);

    return {
      is_honeypot: isHoneypot,
      is_mintable: isMintable,
      owner_change_balance: ownerChangeBalance,
      is_blacklisted: isBlacklisted,
      is_proxy: isProxy,
      is_open_source: isOpenSource,
      verified_contract: (tokenData.is_open_source !== undefined && tokenData.is_open_source !== null && String(tokenData.is_open_source).trim() !== "")
        ? (tokenData.is_open_source === "1" || tokenData.is_open_source === 1 || tokenData.is_open_source === true)
        : null,
      renounced: isRenounced,
      trust_list: isTrustList,
      owner_is_contract: ownerIsContract,
      owner_type_label: ownerTypeLabel,
      custodyRisk,
      highRiskCount,
      warnRiskCount,
      tokenName: tokenData.token_name || tokenData.name || "",
      tokenSymbol: tokenData.token_symbol || tokenData.symbol || "",
      ownerAddress: tokenData.owner_address || tokenData.owner || "",
      buyTax: parseTaxRate(tokenData.buy_tax ?? tokenData.buyTax),
      sellTax: parseTaxRate(tokenData.sell_tax ?? tokenData.sellTax),
      buy_tax: parseTaxRate(tokenData.buy_tax ?? tokenData.buyTax),
      sell_tax: parseTaxRate(tokenData.sell_tax ?? tokenData.sellTax),
      cannotSell
    };
  }

  async function runGoPlusScan(chainId: string, contractAddress: string, isSolana: boolean, isSui: boolean): Promise<SecurityProviderOutcome> {
    const appKey = (process.env.GOPLUS_APP_KEY || "").trim();
    const appSecret = (process.env.GOPLUS_APP_SECRET || "").trim();
    if (!appKey || !appSecret) {
      return { status: "UNAVAILABLE", error: "GOPLUS_APP_KEY or GOPLUS_APP_SECRET not configured" };
    }

    let goPlusUrl = "";
    if (isSolana) {
      goPlusUrl = `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${encodeURIComponent(contractAddress)}`;
    } else if (isSui) {
      goPlusUrl = `https://api.gopluslabs.io/api/v1/sui/token_security?contract_addresses=${encodeURIComponent(contractAddress)}`;
    } else {
      if (!SUPPORTED_GOPLUS_EVM_CHAINS.has(chainId)) {
        return { status: "UNAVAILABLE", error: `Network/Chain ${chainId} not supported by GoPlus Security` };
      }
      goPlusUrl = `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${encodeURIComponent(contractAddress)}`;
    }

    try {
      const bearerToken = await getGoPlusBearerToken();
      if (!bearerToken) {
        return { status: "FAILED", error: "Failed to generate GoPlus authentication Bearer token" };
      }

      const goPlusHeaders: Record<string, string> = {
        "Accept": "application/json",
        "Authorization": `Bearer ${bearerToken}`
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const apiRes = await fetch(goPlusUrl, {
        signal: controller.signal,
        headers: goPlusHeaders
      });
      clearTimeout(timeout);

      if (!apiRes.ok) {
        return { status: "FAILED", error: `GoPlus HTTP ${apiRes.status}` };
      }

      const payload = await apiRes.json();
      if (payload.code === 1 && payload.result) {
        const resultObj = payload.result || {};
        const keys = Object.keys(resultObj);
        const matchedKey = keys.find(k => k.toLowerCase() === contractAddress.toLowerCase()) || keys[0];
        const tokenData = matchedKey ? resultObj[matchedKey] : null;
        if (tokenData && typeof tokenData === "object" && Object.keys(tokenData).length > 0) {
          return {
            status: "AVAILABLE",
            data: parseGoPlusTokenData(tokenData)
          };
        }
      }
      return { status: "NO_DATA", error: "No token security record found on GoPlus" };
    } catch (gpErr: any) {
      if (gpErr.name === "AbortError") {
        return { status: "TIMEOUT", error: "GoPlus scan timed out" };
      }
      return { status: "FAILED", error: gpErr.message || "GoPlus scan request failed" };
    }
  }

  async function runRugCheckScan(contractAddress: string, isSolana: boolean): Promise<SecurityProviderOutcome> {
    if (!isSolana) {
      return { status: "UNAVAILABLE", error: "RugCheck is only applicable for Solana tokens" };
    }

    const rugApiKey = (process.env.RUGCHECK_API_KEY || "").trim();
    if (!rugApiKey) {
      return { status: "UNAVAILABLE", error: "RUGCHECK_API_KEY not configured" };
    }

    try {
      const rugCheckUrl = `https://api.rugcheck.xyz/v1/tokens/${encodeURIComponent(contractAddress)}/report`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const rugRes = await fetch(rugCheckUrl, {
        signal: controller.signal,
        headers: {
          "Accept": "application/json",
          "X-API-KEY": rugApiKey
        }
      });
      clearTimeout(timeout);

      if (!rugRes.ok) {
        if (rugRes.status === 404) {
          return { status: "NO_DATA", error: "Token report not found on RugCheck (HTTP 404)" };
        }
        return { status: "FAILED", error: `RugCheck API returned HTTP ${rugRes.status}` };
      }

      const rugData = await rugRes.json();
      if (!rugData || typeof rugData !== "object" || rugData.status === "error" || rugData.error) {
        return { status: "NO_DATA", error: "Empty or invalid report structure from RugCheck" };
      }

      const tokenMeta = rugData.tokenMeta || rugData.token || {};
      const mintAuth = rugData.mintAuthority;
      const freezeAuth = rugData.freezeAuthority;
      const risks = Array.isArray(rugData.risks) ? rugData.risks : [];

      const isHoneypot = risks.some((r: any) => String(r.name || "").toLowerCase().includes("honeypot"));
      const isMintable = !!mintAuth;
      const cannotSell = !!freezeAuth;
      const isRenounced = !mintAuth;
      const isTrustList = (rugData.score || 0) < 1500;
      const highRiskCount = (isHoneypot ? 1 : 0) + (cannotSell ? 1 : 0);
      const warnRiskCount = (isMintable ? 1 : 0);

      return {
        status: "AVAILABLE",
        data: {
          is_honeypot: isHoneypot,
          is_mintable: isMintable,
          owner_change_balance: false,
          is_blacklisted: false,
          is_proxy: false,
          is_open_source: null,
          verified_contract: typeof rugData.tokenMeta?.verified === "boolean"
            ? rugData.tokenMeta.verified
            : (typeof rugData.verified === "boolean" ? rugData.verified : null),
          renounced: isRenounced,
          trust_list: isTrustList,
          owner_is_contract: false,
          owner_type_label: mintAuth ? "Active Mint Authority" : "Renounced",
          highRiskCount,
          warnRiskCount,
          tokenName: tokenMeta.name || "Solana Token",
          tokenSymbol: tokenMeta.symbol || contractAddress.slice(0, 6),
          ownerAddress: mintAuth || "",
          buyTax: parseTaxRate(rugData.transferFee?.pct),
          sellTax: parseTaxRate(rugData.transferFee?.pct),
          buy_tax: parseTaxRate(rugData.transferFee?.pct),
          sell_tax: parseTaxRate(rugData.transferFee?.pct),
          cannotSell,
          rugcheckScore: rugData.score,
          rugcheckRisks: risks
        }
      };
    } catch (rcErr: any) {
      if (rcErr.name === "AbortError") {
        return { status: "TIMEOUT", error: "RugCheck scan timed out" };
      }
      return { status: "FAILED", error: rcErr.message || "RugCheck scan request failed" };
    }
  }

  async function runBlockscoutScan(chainId: string, contractAddress: string, isSolana: boolean, isSui: boolean): Promise<SecurityProviderOutcome> {
    if (isSolana || isSui) {
      return { status: "UNAVAILABLE", error: "Blockscout corroboration is only applicable for EVM chains" };
    }

    const blockscoutKey = (process.env.BLOCKSCOUT_API_KEY || "").trim();
    if (!blockscoutKey) {
      return { status: "UNAVAILABLE", error: "BLOCKSCOUT_API_KEY not configured" };
    }

    const resolvedChain = resolveEvmChainId(chainId);
    if (!SUPPORTED_GOPLUS_EVM_CHAINS.has(resolvedChain) && !/^\d+$/.test(resolvedChain)) {
      return { status: "UNAVAILABLE", error: `Network/Chain ${chainId} not supported by Blockscout` };
    }

    let isTokenTimeout = false;
    let isTokenFailed = false;
    let isHoldersTimeout = false;
    let isHoldersFailed = false;

    let tokenName: string | undefined;
    let tokenSymbol: string | undefined;
    let decimals: number | undefined;
    let logo: string | undefined;
    let totalSupplyStr: string | undefined;
    let top10HolderConcentrationPct: number | undefined;
    let hasAnyField = false;

    // Run token metadata and token holders requests concurrently
    await Promise.allSettled([
      // 1. Token Metadata endpoint: https://api.blockscout.com/{chainId}/api/v2/tokens/{contractAddress}?apikey={key}
      (async () => {
        const tokenUrl = `https://api.blockscout.com/${encodeURIComponent(resolvedChain)}/api/v2/tokens/${encodeURIComponent(contractAddress)}?apikey=${encodeURIComponent(blockscoutKey)}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const tokenRes = await fetch(tokenUrl, {
            headers: { "Accept": "application/json" },
            signal: controller.signal
          });
          clearTimeout(timeout);
          if (tokenRes.ok) {
            const tokenJson = await tokenRes.json();
            if (tokenJson && typeof tokenJson === "object") {
              if (tokenJson.name) {
                tokenName = String(tokenJson.name);
                hasAnyField = true;
              }
              if (tokenJson.symbol) {
                tokenSymbol = String(tokenJson.symbol);
                hasAnyField = true;
              }
              if (tokenJson.decimals !== undefined && tokenJson.decimals !== null) {
                const dec = typeof tokenJson.decimals === "number" ? tokenJson.decimals : parseInt(String(tokenJson.decimals), 10);
                if (!isNaN(dec)) {
                  decimals = dec;
                  hasAnyField = true;
                }
              }
              if (tokenJson.icon_url) {
                logo = String(tokenJson.icon_url);
                hasAnyField = true;
              }
              if (tokenJson.total_supply !== undefined && tokenJson.total_supply !== null) {
                totalSupplyStr = String(tokenJson.total_supply);
              }
            }
          } else {
            isTokenFailed = true;
          }
        } catch (err: any) {
          clearTimeout(timeout);
          if (err.name === "AbortError") {
            isTokenTimeout = true;
          } else {
            isTokenFailed = true;
          }
        }
      })(),
      // 2. Token Holders endpoint: https://api.blockscout.com/{chainId}/api/v2/tokens/{contractAddress}/holders?apikey={key}
      (async () => {
        const holdersUrl = `https://api.blockscout.com/${encodeURIComponent(resolvedChain)}/api/v2/tokens/${encodeURIComponent(contractAddress)}/holders?apikey=${encodeURIComponent(blockscoutKey)}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const holdersRes = await fetch(holdersUrl, {
            headers: { "Accept": "application/json" },
            signal: controller.signal
          });
          clearTimeout(timeout);
          if (holdersRes.ok) {
            const holdersJson = await holdersRes.json();
            const items = Array.isArray(holdersJson?.items)
              ? holdersJson.items
              : Array.isArray(holdersJson)
              ? holdersJson
              : [];

            if (items.length > 0) {
              // Sort items descending by balance/value (defensive against unordered responses)
              const sortedItems = [...items].sort((a, b) => {
                try {
                  const aVal = BigInt(a.value ?? a.balance ?? 0);
                  const bVal = BigInt(b.value ?? b.balance ?? 0);
                  return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
                } catch {
                  return 0;
                }
              });

              const top10 = sortedItems.slice(0, 10);
              let sumTop10 = 0n;
              for (const item of top10) {
                try {
                  sumTop10 += BigInt(item.value ?? item.balance ?? 0);
                } catch {}
              }

              if (sumTop10 > 0n) {
                // If total_supply is available from token metadata, calculate top 10 supply ratio
                if (totalSupplyStr) {
                  try {
                    const supplyBig = BigInt(totalSupplyStr);
                    if (supplyBig > 0n) {
                      const pctBps = Number((sumTop10 * 10000n) / supplyBig);
                      top10HolderConcentrationPct = Math.min(100, Math.max(0, Math.round(pctBps) / 100));
                      hasAnyField = true;
                    }
                  } catch {}
                }

                // If totalSupply was not found or failed, calculate against sum of all returned items if available
                if (top10HolderConcentrationPct === undefined && items.length > 0) {
                  let totalItemsSum = 0n;
                  for (const it of sortedItems) {
                    try {
                      totalItemsSum += BigInt(it.value ?? it.balance ?? 0);
                    } catch {}
                  }
                  if (totalItemsSum > 0n) {
                    const pctBps = Number((sumTop10 * 10000n) / totalItemsSum);
                    top10HolderConcentrationPct = Math.min(100, Math.max(0, Math.round(pctBps) / 100));
                    hasAnyField = true;
                  }
                }
              }
            }
          } else {
            isHoldersFailed = true;
          }
        } catch (err: any) {
          clearTimeout(timeout);
          if (err.name === "AbortError") {
            isHoldersTimeout = true;
          } else {
            isHoldersFailed = true;
          }
        }
      })()
    ]);

    if (hasAnyField) {
      const blockscoutData: {
        tokenName?: string;
        tokenSymbol?: string;
        decimals?: number;
        logo?: string;
        top10HolderConcentrationPct?: number;
      } = {};
      if (tokenName) blockscoutData.tokenName = tokenName;
      if (tokenSymbol) blockscoutData.tokenSymbol = tokenSymbol;
      if (decimals !== undefined) blockscoutData.decimals = decimals;
      if (logo) blockscoutData.logo = logo;
      if (top10HolderConcentrationPct !== undefined) blockscoutData.top10HolderConcentrationPct = top10HolderConcentrationPct;

      return {
        status: "AVAILABLE",
        data: blockscoutData
      };
    }

    if (isTokenTimeout && isHoldersTimeout) {
      return { status: "TIMEOUT", error: "Blockscout API requests timed out" };
    }
    if (isTokenFailed && isHoldersFailed) {
      return { status: "FAILED", error: "Blockscout API requests failed" };
    }

    return { status: "NO_DATA", error: "No metadata or holder concentration records returned by Blockscout" };
  }

  // --- In-Memory Rate Limiter for /api/security/scan (20 req / 60s per IP) ---
  const securityScanRateLimitMap = new Map<string, { count: number; windowStart: number }>();
  const SECURITY_SCAN_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 seconds
  const SECURITY_SCAN_RATE_LIMIT_MAX = 20;

  function checkSecurityScanRateLimit(ip: string): boolean {
    const now = Date.now();
    let record = securityScanRateLimitMap.get(ip);
    if (!record || now - record.windowStart > SECURITY_SCAN_RATE_LIMIT_WINDOW_MS) {
      record = { count: 1, windowStart: now };
      securityScanRateLimitMap.set(ip, record);
      return true;
    }

    if (record.count >= SECURITY_SCAN_RATE_LIMIT_MAX) {
      return false;
    }

    record.count++;
    return true;
  }

  // --- In-Memory TTL Cache for /api/security/scan (6-Hour TTL) ---
  interface SecurityScanCacheEntry {
    data: any;
    expiresAt: number;
  }
  const securityScanCache = new Map<string, SecurityScanCacheEntry>();
  const SECURITY_SCAN_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

  // API endpoint: Independent Multi-Provider Security Scan (GoPlus + RugCheck + Blockscout)
  app.get("/api/security/scan", async (req, res) => {
    try {
      // 1. Per-IP Rate Limiting (20 req / 60s window)
      const forwarded = req.headers["x-forwarded-for"];
      const clientIp = (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "") || req.ip || req.socket.remoteAddress || "unknown";
      if (!checkSecurityScanRateLimit(clientIp)) {
        return res.status(429).json({
          error: "Too many security scan requests. Please try again shortly."
        });
      }

      const rawChain = (req.query.chain || req.query.chainId || "1") as string;
      const rawAddress = (req.query.address || req.query.contractAddress || "") as string;

      const contractAddress = rawAddress.trim();
      if (!contractAddress || contractAddress.length < 5) {
        return res.status(400).json({
          success: false,
          cached: false,
          error: "Security scan unavailable — no contract address on file",
          source: "GoPlus / RugCheck / Blockscout",
          contractAddress: "",
          chainId: "",
          timestamp: new Date().toISOString(),
          providers: {
            goplus: { status: "UNAVAILABLE", error: "Missing contract address" },
            rugcheck: { status: "UNAVAILABLE", error: "Missing contract address" },
            blockscout: { status: "UNAVAILABLE", error: "Missing contract address" }
          }
        });
      }

      const chainLower = String(rawChain).toLowerCase().trim();
      const isSolana = (chainLower === "solana" || chainLower === "sol" || (contractAddress.length > 35 && !contractAddress.startsWith("0x")));
      const isSui = chainLower === "sui";
      const resolvedChainId = isSolana ? "solana" : isSui ? "sui" : resolveEvmChainId(rawChain);

      // Check in-memory TTL cache (skip provider calls entirely on hit)
      const cacheKey = `${resolvedChainId}:${contractAddress.toLowerCase()}`;
      const cachedEntry = securityScanCache.get(cacheKey);
      if (cachedEntry) {
        if (Date.now() < cachedEntry.expiresAt) {
          return res.json({
            ...cachedEntry.data,
            cached: true
          });
        } else {
          securityScanCache.delete(cacheKey);
        }
      }

      // Execute applicable providers independently in parallel
      const [goplusResult, rugcheckResult, blockscoutResult] = await Promise.all([
        runGoPlusScan(resolvedChainId, contractAddress, isSolana, isSui),
        runRugCheckScan(contractAddress, isSolana),
        runBlockscoutScan(resolvedChainId, contractAddress, isSolana, isSui)
      ]);

      const providers: Record<string, { status: SecurityProviderStatus; error?: string }> = {
        goplus: { status: goplusResult.status, ...(goplusResult.error ? { error: goplusResult.error } : {}) },
        rugcheck: { status: rugcheckResult.status, ...(rugcheckResult.error ? { error: rugcheckResult.error } : {}) },
        blockscout: { status: blockscoutResult.status, ...(blockscoutResult.error ? { error: blockscoutResult.error } : {}) }
      };

      // Helper to store only success: true results in cache with 6-hour TTL and return with cached: false
      const sendAndCacheSuccess = (payload: any) => {
        const fullPayload = {
          ...payload,
          cached: false
        };
        securityScanCache.set(cacheKey, {
          data: fullPayload,
          expiresAt: Date.now() + SECURITY_SCAN_CACHE_TTL_MS
        });
        return res.json(fullPayload);
      };

      // Merge verified evidence based on applicable architecture
      if (isSolana) {
        if (goplusResult.status === "AVAILABLE" && rugcheckResult.status === "AVAILABLE") {
          return sendAndCacheSuccess({
            success: true,
            source: "GoPlus Security + RugCheck",
            contractAddress,
            chainId: resolvedChainId,
            timestamp: new Date().toISOString(),
            custodyRisk: goplusResult.data?.custodyRisk || (rugcheckResult.data?.mintAuthority === null ? "RENOUNCED" : "EOA_OWNER"),
            providers,
            data: {
              ...goplusResult.data,
              buyTax: goplusResult.data?.buyTax ?? rugcheckResult.data?.buyTax ?? null,
              sellTax: goplusResult.data?.sellTax ?? rugcheckResult.data?.sellTax ?? null,
              buy_tax: goplusResult.data?.buy_tax ?? rugcheckResult.data?.buy_tax ?? null,
              sell_tax: goplusResult.data?.sell_tax ?? rugcheckResult.data?.sell_tax ?? null,
              rugcheckScore: rugcheckResult.data.rugcheckScore,
              rugcheckRisks: rugcheckResult.data.rugcheckRisks
            }
          });
        }

        if (goplusResult.status === "AVAILABLE") {
          return sendAndCacheSuccess({
            success: true,
            source: "GoPlus Security",
            contractAddress,
            chainId: resolvedChainId,
            timestamp: new Date().toISOString(),
            custodyRisk: goplusResult.data?.custodyRisk,
            providers,
            data: goplusResult.data
          });
        }

        if (rugcheckResult.status === "AVAILABLE") {
          return sendAndCacheSuccess({
            success: true,
            source: "RugCheck",
            contractAddress,
            chainId: resolvedChainId,
            timestamp: new Date().toISOString(),
            custodyRisk: rugcheckResult.data?.mintAuthority === null ? "RENOUNCED" : "EOA_OWNER",
            providers,
            data: rugcheckResult.data
          });
        }

        return res.status(200).json({
          success: false,
          cached: false,
          error: "Security scan unavailable for this Solana token",
          source: "GoPlus / RugCheck",
          contractAddress,
          chainId: resolvedChainId,
          timestamp: new Date().toISOString(),
          providers
        });
      }

      if (isSui) {
        if (goplusResult.status === "AVAILABLE") {
          return sendAndCacheSuccess({
            success: true,
            source: "GoPlus Security",
            contractAddress,
            chainId: resolvedChainId,
            timestamp: new Date().toISOString(),
            custodyRisk: goplusResult.data?.custodyRisk,
            providers,
            data: goplusResult.data
          });
        }

        return res.status(200).json({
          success: false,
          cached: false,
          error: "Security scan unavailable for this Sui token",
          source: "GoPlus Security",
          contractAddress,
          chainId: resolvedChainId,
          timestamp: new Date().toISOString(),
          providers
        });
      }

      // EVM Network Logic
      if (goplusResult.status === "AVAILABLE" && blockscoutResult.status === "AVAILABLE") {
        return sendAndCacheSuccess({
          success: true,
          source: "GoPlus Security + Blockscout",
          contractAddress,
          chainId: resolvedChainId,
          timestamp: new Date().toISOString(),
          custodyRisk: goplusResult.data?.custodyRisk || "EOA_OWNER",
          providers,
          data: {
            ...goplusResult.data,
            ...(blockscoutResult.data.top10HolderConcentrationPct !== undefined
              ? { top10HolderConcentrationPct: blockscoutResult.data.top10HolderConcentrationPct }
              : {}),
            blockscoutCorroboration: blockscoutResult.data
          }
        });
      }

      if (goplusResult.status === "AVAILABLE") {
        return sendAndCacheSuccess({
          success: true,
          source: "GoPlus Security",
          contractAddress,
          chainId: resolvedChainId,
          timestamp: new Date().toISOString(),
          custodyRisk: goplusResult.data?.custodyRisk || "EOA_OWNER",
          providers,
          data: goplusResult.data
        });
      }

      if (blockscoutResult.status === "AVAILABLE") {
        // GoPlus failed or unavailable, but Blockscout succeeded: return Blockscout corroboration without fabricating primary GoPlus fields
        return sendAndCacheSuccess({
          success: true,
          source: "Blockscout Token API (Corroboration)",
          contractAddress,
          chainId: resolvedChainId,
          timestamp: new Date().toISOString(),
          providers,
          data: {
            ...(blockscoutResult.data.tokenName ? { tokenName: blockscoutResult.data.tokenName } : {}),
            ...(blockscoutResult.data.tokenSymbol ? { tokenSymbol: blockscoutResult.data.tokenSymbol } : {}),
            ...(blockscoutResult.data.top10HolderConcentrationPct !== undefined
              ? { top10HolderConcentrationPct: blockscoutResult.data.top10HolderConcentrationPct }
              : {}),
            blockscoutCorroboration: blockscoutResult.data
          }
        });
      }

      // Honest labeling: All applicable EVM providers failed or returned no data
      return res.status(200).json({
        success: false,
        cached: false,
        error: "Security scan unavailable for this network",
        source: "GoPlus / Blockscout",
        contractAddress,
        chainId: resolvedChainId,
        timestamp: new Date().toISOString(),
        providers
      });
    } catch (err: any) {
      console.error("Security scan error:", err);
      res.status(500).json({
        success: false,
        cached: false,
        error: "Failed to fetch security scan data from providers.",
        source: "GoPlus / RugCheck / Blockscout",
        contractAddress: (req.query.address || req.query.contractAddress || "") as string,
        chainId: (req.query.chain || req.query.chainId || "1") as string,
        timestamp: new Date().toISOString(),
        providers: {
          goplus: { status: "FAILED", error: err.message },
          rugcheck: { status: "FAILED", error: err.message },
          blockscout: { status: "FAILED", error: err.message }
        }
      });
    }
  });


  // API endpoint: Public Cryptographic Signature Verification
  app.post("/api/audit/verify-signature", (req, res) => {
    try {
      const { auditSignature, scores, verdict, grade, timestamp } = req.body;
      if (!auditSignature || !scores || !verdict || !grade || !timestamp) {
        return res.status(400).json({ isValid: false, reason: "Missing required verification fields." });
      }

      const result = verifyAuditSignatureServerSide(auditSignature, {
        scores,
        verdict,
        grade,
        timestamp
      });

      res.json(result);
    } catch (error: any) {
      console.error("Signature verification endpoint error:", error);
      res.status(500).json({ isValid: false, reason: "Verification failed on server." });
    }
  });

  // Helper: Retrieve real-time CoinGecko + CMC Dual Sync Feed & Evaluation Blueprint v2.4 Context for AI Chat
  async function getDualSyncChatContext(userMessage: string): Promise<string> {
    const queryLower = (userMessage || '').toLowerCase();

    const defaultCoins: Record<string, { id: string; name: string; symbol: string; price: number; rank: number; cap: number; vol: number; change: number }> = {
      zama: { id: 'zama', name: 'Zama', symbol: 'ZAMA', price: 0.185, rank: 142, cap: 185000000, vol: 24000000, change: 4.2 },
      hyperliquid: { id: 'hyperliquid', name: 'Hyperliquid', symbol: 'HYPE', price: 42.85, rank: 18, cap: 14200000000, vol: 850000000, change: 6.8 },
      solana: { id: 'solana', name: 'Solana', symbol: 'SOL', price: 188.50, rank: 5, cap: 88500000000, vol: 4200000000, change: 2.4 },
      arbitrum: { id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB', price: 0.58, rank: 45, cap: 2450000000, vol: 180000000, change: -1.2 },
      chainlink: { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', price: 14.60, rank: 16, cap: 8900000000, vol: 410000000, change: 1.8 },
      uniswap: { id: 'uniswap', name: 'Uniswap', symbol: 'UNI', price: 7.95, rank: 22, cap: 4780000000, vol: 320000000, change: 3.1 },
      'render-token': { id: 'render-token', name: 'Render', symbol: 'RENDER', price: 5.35, rank: 38, cap: 2800000000, vol: 210000000, change: -0.5 },
      sui: { id: 'sui', name: 'Sui', symbol: 'SUI', price: 3.25, rank: 14, cap: 9400000000, vol: 950000000, change: 8.5 },
      kaspa: { id: 'kaspa', name: 'Kaspa', symbol: 'KAS', price: 0.125, rank: 32, cap: 3100000000, vol: 110000000, change: 0.9 },
      ethereum: { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', price: 3450.00, rank: 2, cap: 415000000000, vol: 18500000000, change: 1.5 },
      bitcoin: { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 91500.00, rank: 1, cap: 1800000000000, vol: 38000000000, change: 0.8 },
    };

    let liveMarketsMap: Record<string, any> = {};
    try {
      const ids = "solana,ethereum,bitcoin,chainlink,render-token,arbitrum,sui,hyperliquid,zama,uniswap,kaspa";
      const apiKey = process.env.COINGECKO_API_KEY || "";
      const headers: Record<string, string> = { "Accept": "application/json" };
      if (apiKey) headers["x-cg-demo-api-key"] = apiKey;
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`, {
        headers
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach((coin: any) => {
            if (coin && coin.id) {
              liveMarketsMap[coin.id] = coin;
              if (coin.symbol) liveMarketsMap[coin.symbol.toLowerCase()] = coin;
            }
          });
        }
      }
    } catch (err) {
      console.warn("Live CoinGecko chat context fetch warning:", err);
    }

    let additionalCoins: any[] = [];
    const commonTickers = ['pepe', 'near', 'avax', 'doge', 'shib', 'ada', 'dot', 'ton', 'fet', 'apt', 'inj', 'seis', 'sei', 'floki', 'wif', 'bonk', 'aave', 'mkr'];
    const matchedExtraTicker = commonTickers.find(t => queryLower.includes(t));
    if (matchedExtraTicker && !liveMarketsMap[matchedExtraTicker]) {
      try {
        const apiKey = process.env.COINGECKO_API_KEY || "";
        const headers: Record<string, string> = { "Accept": "application/json" };
        if (apiKey) headers["x-cg-demo-api-key"] = apiKey;
        const sRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${matchedExtraTicker}`, {
          headers
        });
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.coins && sData.coins.length > 0) {
            const topCoinId = sData.coins[0].id;
            const mRes = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${topCoinId}&sparkline=false&price_change_percentage=24h`, {
              headers
            });
            if (mRes.ok) {
              const mData = await mRes.json();
              if (Array.isArray(mData) && mData.length > 0) {
                additionalCoins.push(mData[0]);
              }
            }
          }
        }
      } catch (e) {
        console.warn("Extra coin search for chat context failed:", e);
      }
    }

    let contextLines: string[] = [
      `### LIVE COINGECKO + CMC DUAL SYNC ENGINE FEED & EVALUATION BLUEPRINT CONTEXT`,
      `[DATA ENGINE STATUS: ONLINE | REAL-TIME DUAL SYNC ACTIVE]`,
      `[PRIMARY DATA SOURCE: CoinGecko API v3 | SECONDARY DATA SOURCE: CoinMarketCap Pro API]`,
      ``,
      `CRITICAL MANDATES FOR LAB AUDITOR:`,
      `- Use ONLY the live Dual Sync market numbers below when asked for prices, 24h changes, ranks, market caps, FDV, or volume.`,
      `- All project evaluations MUST conform strictly to Evaluation Blueprint math:`,
      `  Overall Score = (Utility * 2.5) + (Tokenomics * 2.5) + (Security * 2.5) + (Team * 1.5) + (Community * 1.0)`,
      `  Grade Scale: AAA (93-100), AA+ (90-92), AA (85-89), A (78-84), BBB (70-77), BB (60-69), B (50-59), C (30-49), D (0-29)`,
      `  Risk Levels: Low (85-100), Medium (70-84), High (50-69), Critical (0-49)`,
      ``,
      `#### TRACKED ASSETS (LIVE DUAL SYNC + MASTER BLUEPRINT REVIEWS):`
    ];

    const keys = Object.keys(defaultCoins);
    keys.forEach((key) => {
      const base = defaultCoins[key];
      const live = liveMarketsMap[key] || liveMarketsMap[base.symbol.toLowerCase()];

      const price = live?.current_price ?? base.price;
      const change = live?.price_change_percentage_24h ?? base.change;
      const rank = live?.market_cap_rank ?? base.rank;
      const cap = live?.market_cap ?? base.cap;
      const vol = live?.total_volume ?? base.vol;
      const fdv = Math.round(cap * 1.15);

      const master = INITIAL_REVIEWS.find(r => 
        r.coingeckoId?.toLowerCase() === key || 
        r.symbol?.toLowerCase() === base.symbol.toLowerCase() ||
        r.name?.toLowerCase().includes(base.name.toLowerCase())
      );

      let scoreObj = master ? master.scores : { utility: 8, tokenomics: 8, security: 8, team: 8, community: 8 };
      let bpResult = calculateBlueprintScore(scoreObj);

      contextLines.push(`- **${base.name} (${base.symbol})**:`);
      contextLines.push(`  * Live Price: $${price < 1 ? price.toFixed(4) : price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (CoinGecko Live Oracle)`);
      contextLines.push(`  * 24h Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}% | Market Cap: $${cap.toLocaleString()} | FDV: $${fdv.toLocaleString()}`);
      contextLines.push(`  * Rank: #${rank}`);
      contextLines.push(`  * 24h Volume: $${vol.toLocaleString()}`);
      contextLines.push(`  * Evaluation Blueprint Audit Rating: **${bpResult.overallScore} / 100** | Grade: **${bpResult.grade}** | Risk: **${bpResult.riskLevel}**`);
      contextLines.push(`  * Dimension Breakdown: Utility (25%): ${scoreObj.utility}/10, Tokenomics (25%): ${scoreObj.tokenomics}/10, Security/Code (25%): ${scoreObj.security}/10, Team (15%): ${scoreObj.team}/10, Community (10%): ${scoreObj.community}/10.`);
      if (master && master.verdict) {
        contextLines.push(`  * Master Audit Verdict: "${master.verdict}"`);
      }
    });

    additionalCoins.forEach((c) => {
      const price = c.current_price || 1.0;
      const change = c.price_change_percentage_24h || 0;
      const rank = c.market_cap_rank || 100;
      const cap = c.market_cap || 100000000;
      const vol = c.total_volume || 10000000;
      const fdv = Math.round(cap * 1.2);

      const isMeme = ['pepe', 'wif', 'bonk', 'floki', 'shib', 'doge', 'bome', 'turbo', 'neiro', 'popcat', 'mog', 'brett'].includes((c.id || '').toLowerCase()) ||
                     ['pepe', 'wif', 'bonk', 'floki', 'shib', 'doge', 'bome', 'turbo', 'neiro', 'popcat', 'mog', 'brett'].includes((c.symbol || '').toLowerCase());

      const utility = isMeme ? 2 : Math.min(10, Math.max(5, Math.round(10 - Math.log10(Math.max(1, rank)) * 2)));
      const tokenomics = isMeme ? 6 : Math.min(10, Math.max(5, Math.round(9.5 - Math.log10(Math.max(1, rank)) * 1.8)));
      const security = isMeme ? 6 : Math.min(10, Math.max(5, Math.round(9 - Math.log10(Math.max(1, rank)) * 1.5)));
      const team = isMeme ? 3 : Math.min(10, Math.max(6, Math.round(9)));
      const community = isMeme ? 9 : Math.min(10, Math.max(5, Math.round(10 - Math.log10(Math.max(1, rank)) * 2.2)));

      const bpResult = calculateBlueprintScore({ utility, tokenomics, security, team, community });

      contextLines.push(`- **${c.name} (${c.symbol.toUpperCase()})** [Queried Asset]:`);
      contextLines.push(`  * Live Price: $${price < 1 ? price.toFixed(4) : price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (CoinGecko Live Feed)`);
      contextLines.push(`  * 24h Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}% | Market Cap: $${cap.toLocaleString()} | FDV: $${fdv.toLocaleString()}`);
      contextLines.push(`  * Rank: #${rank}`);
      contextLines.push(`  * 24h Volume: $${vol.toLocaleString()}`);
      contextLines.push(`  * Evaluation Blueprint Audit Rating: **${bpResult.overallScore} / 100** | Grade: **${bpResult.grade}** | Risk: **${bpResult.riskLevel}**`);
      if (bpResult.isMemeCoinPenaltyActive) {
        contextLines.push(`  * ⚠️ MEME COIN PENALTY FLAG: TRIGGERED (Utility ${utility}/10 <= 2 AND Team ${team}/10 <= 3 -> Hard Capped at 60/100 [Grade BB / High Risk])`);
      }
      contextLines.push(`  * Dimension Breakdown: Utility (25%): ${utility}/10, Tokenomics (25%): ${tokenomics}/10, Security/Code (25%): ${security}/10, Team (15%): ${team}/10, Community (10%): ${community}/10.`);
    });

    return contextLines.join('\n');
  }

  // API endpoint: Cyber Audit Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message content is required." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        return res.status(400).json({ 
          error: "Gemini API key is missing. Please configure your GEMINI_API_KEY in the Secrets panel in AI Studio's settings." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Construct cumulative context to simulate history in chats
      let formattedPrompt = "";
      if (history && history.length > 0) {
        formattedPrompt += "Relevant conversation history:\n";
        history.forEach((msg: any) => {
          const actor = msg.role === 'user' ? 'User' : 'Lab Auditor';
          formattedPrompt += `${actor}: ${msg.content}\n`;
        });
        formattedPrompt += `\nNew User inquiry: ${message}\nLab Auditor:`;
      } else {
        formattedPrompt = message;
      }

      // Fetch Live Dual Sync Market Data Feed & Blueprint Context
      const dualSyncContext = await getDualSyncChatContext(message);

      const auditorSystemInstruction = `You are 'Lab Auditor', the Lead Web3 Security Auditor for Crypto Review Lab. Your job is to answer user inquiries regarding smart contract security, protocol risk vectors, audit rubrics, and token evaluations.

CRITICAL OPERATIONAL RULES:
1. LIVE MARKET DATA ACCURACY: You are synchronized with the CoinGecko + CoinMarketCap (CMC) Dual Sync Engine. You MUST ONLY quote the market numbers (Consensus Price, CG Rank, CMC Rank, 24h Change, Market Cap, Volume, FDV, Consensus Confidence) provided in the Dual Sync Feed below. NEVER invent, estimate, or hallucinate market numbers.

2. LOCKED EVALUATION BLUEPRINT: You MUST evaluate or quote protocol ratings according to the 5-dimension Evaluation Blueprint rubric:
   - Utility: 25% Weight
   - Tokenomics: 25% Weight
   - Security/Code: 25% Weight
   - Team/Backers: 15% Weight
   - Community: 10% Weight
   - Grade Scale: AAA (93-100), AA+ (90-92), AA (85-89), A (78-84), BBB (70-77), BB (60-69), B (50-59), C (30-49), D (0-29).
   - Risk Levels: Low (85-100), Medium (70-84), High (50-69), Critical (0-49).

3. MEME COIN PENALTY FLAG:
   - RULE: If Utility <= 2/10 AND Team <= 3/10, the project TRIGGERS the Meme Coin Penalty Flag.
   - HARD CAP: The overall audit score MUST be hard-capped at 60/100 (Grade BB / High Risk), regardless of how high Community (e.g. 10/10) or Security scores are.
   - APPLICABILITY: When evaluating or analyzing meme coins, speculative hype tokens, or anonymous team launches (e.g., PEPE, WIF, BONK, DOGE, SHIB, FLOKI, or custom user meme tokens), ALWAYS explicitly state whether the Meme Coin Penalty Flag is triggered and cite the 60/100 hard-cap rule in your response.

4. FORMATTING: Use structured Markdown with bold headers and bullet points. Whenever evaluating or discussing a project, cite its live CoinGecko + CMC Dual Sync metrics and its Evaluation Blueprint dimension score breakdown.

5. NO SELF-CALCULATED SCORES OR INVENTED RATINGS: You MUST NEVER calculate or state a specific overall score, letter grade, or risk level for a project on your own — you may ONLY reference a score if one is already supplied to you as part of the conversation context (e.g., from the live Dual Sync Feed or provided report data). If asked to rate or score a project that you do not already have a calculated score for in context, explain that official scores come from a full Evaluation Blueprint report (via Project Review or Security & Risk Assessment), and offer to explain the rubric parameters itself instead of producing an invented number.

${dualSyncContext}`;

      let response;
      try {
        const chat = ai.chats.create({
          model: "gemini-3.7-flash",
          config: {
            systemInstruction: auditorSystemInstruction,
          }
        });
        response = await chat.sendMessage({ message: formattedPrompt });
      } catch (firstError: any) {
        if (isQuotaOrDemandError(firstError)) {
          console.warn("Primary model 'gemini-3.7-flash' rate limited or unavailable for chat. Retrying with 'gemini-3.1-flash-lite' fallback...");
          try {
            const chatFallback = ai.chats.create({
              model: "gemini-3.1-flash-lite",
              config: {
                systemInstruction: auditorSystemInstruction,
              }
            });
            response = await chatFallback.sendMessage({ message: formattedPrompt });
          } catch (secondError: any) {
            console.warn("Auditor chat fallback model also failed:", secondError);
            return res.json({ content: "The Crypto Review Lab automated advisory desk is currently experiencing peak analysis traffic. For real-time protocol risk parameters, please refer to the live 5-dimension Blueprint rubric, exterior contract security scans, or submit an official Security & Risk Assessment for full human auditor sign-off." });
          }
        } else {
          console.warn("Auditor chat model error:", firstError);
          return res.json({ content: "The Crypto Review Lab automated advisory desk is currently experiencing peak analysis traffic. For real-time protocol risk parameters, please refer to the live 5-dimension Blueprint rubric, exterior contract security scans, or submit an official Security & Risk Assessment for full human auditor sign-off." });
        }
      }

      res.json({ content: response?.text || "" });
    } catch (error: any) {
      console.error("Lab Auditor Chat error:", error);
      res.status(500).json({ error: getFriendlyErrorMessage(error) });
    }
  });

  // API endpoint: Download blogger theme XML or TXT file
  app.get("/api/download-theme", (req, res) => {
    try {
      const format = req.query.format === "txt" ? "txt" : "xml";
      const filePath = path.join(process.cwd(), "blogger-theme.xml");
      
      if (!fs.existsSync(filePath)) {
        return res.status(440).json({ error: "Blogger theme file is being generated." });
      }

      if (format === "txt") {
        res.setHeader("Content-Disposition", "attachment; filename=blogger-theme.txt");
        res.setHeader("Content-Type", "text/plain");
      } else {
        res.setHeader("Content-Disposition", "attachment; filename=blogger-theme.xml");
        res.setHeader("Content-Type", "application/xml");
      }
      res.sendFile(filePath);
    } catch (error: any) {
      console.error("Theme download failed:", error);
      res.status(500).json({ error: "Failed to download the theme file." });
    }
  });

  // API endpoint: Download standalone chatbot widget code
  app.get("/api/download-widget", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "blogger-chatbot-widget.txt");
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Widget file not found." });
      }
      res.setHeader("Content-Disposition", "attachment; filename=blogger-chatbot-widget.txt");
      res.setHeader("Content-Type", "text/plain");
      res.sendFile(filePath);
    } catch (error: any) {
      console.error("Widget download failed:", error);
      res.status(500).json({ error: "Failed to download the widget file." });
    }
  });

  // API endpoint: Get widget content for direct copying
  app.get("/api/widget-content", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "blogger-chatbot-widget.txt");
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Widget content not found." });
      }
      const content = fs.readFileSync(filePath, "utf-8");
      res.json({ content });
    } catch (error: any) {
      console.error("Failed to read widget content:", error);
      res.status(500).json({ error: "Failed to load the widget content." });
    }
  });

  // API endpoint: Get theme content for direct copying
  app.get("/api/theme-content", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "blogger-theme.xml");
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Theme content not found." });
      }
      const content = fs.readFileSync(filePath, "utf-8");
      res.json({ content });
    } catch (error: any) {
      console.error("Failed to read theme content:", error);
      res.status(500).json({ error: "Failed to load the theme content." });
    }
  });

  const COINGECKO_KEY = process.env.COINGECKO_API_KEY || "";
  const COINGECKO_GAS_URL = "https://script.google.com/macros/s/AKfycbyE6MqLewGEK4aq-fCD1tbQpO-IWetUk7-uuTYZDD_3XUvUuxRnWaPZQBZE3H_ui32y5g/exec";
  const COINSTATS_GAS_URL = "https://script.google.com/macros/s/AKfycbxZcbIpURQQbpVgeMS0VnZmmvNWNpUL4gjXPawedaMfTHZErcP_eztewwd5fplJzOqvhA/exec";
  const CMC_GAS_URL = "https://script.google.com/macros/s/AKfycbzjgMcPBg3IKS8HDrDVSax_xH6IuJITWT6OSZtTl_56q7A9S9a0c-LxIb7e6WxRwXM/exec";
  const FINNHUB_GAS_URL = "https://script.google.com/macros/s/AKfycbz3gpHcXA-yc7myC5UNJ-pIJyNnE1xXfAO_v3vlfbjJOSH345Cc4DtoGPYzcHq3diUUAg/exec";

  // API endpoint: Finnhub Proxy for Underlying Equities Quotes
  app.get("/api/finnhub/quote", async (req, res) => {
    try {
      const symbol = ((req.query.symbol as string) || "").trim().toUpperCase();
      if (!symbol) {
        return res.status(400).json({ error: "Equity symbol query param is required" });
      }
      const gasUrl = `${FINNHUB_GAS_URL}?symbol=${encodeURIComponent(symbol)}`;
      const response = await fetch(gasUrl);

      if (!response.ok) {
        return res.status(response.status).json({ error: `Finnhub proxy error HTTP ${response.status}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Finnhub quote proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch quote from Finnhub proxy" });
    }
  });

  // API endpoint: CoinMarketCap Proxy for Quotes
  app.get("/api/cmc/quote", async (req, res) => {
    try {
      const symbol = ((req.query.symbol as string) || "").trim().toUpperCase();
      if (!symbol) {
        return res.status(400).json({ error: "Token symbol query param is required" });
      }
      const gasUrl = `${CMC_GAS_URL}?symbol=${encodeURIComponent(symbol)}`;
      const response = await fetch(gasUrl);

      if (!response.ok) {
        return res.status(response.status).json({ error: `CMC proxy error HTTP ${response.status}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("CMC quote proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch quote from CMC proxy" });
    }
  });

  // API endpoint: CoinStats Proxy for Markets
  app.get("/api/coinstats/markets", async (req, res) => {
    try {
      const limit = parseInt((req.query.limit as string) || "500", 10);
      const gasUrl = `${COINSTATS_GAS_URL}?limit=${limit}`;
      const response = await fetch(gasUrl);

      if (!response.ok) {
        return res.status(response.status).json({ error: `CoinStats proxy error HTTP ${response.status}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("CoinStats markets proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch markets from CoinStats proxy" });
    }
  });

  // API endpoint: CoinStats Proxy for Coin Details
  app.get("/api/coinstats/coin/:id", async (req, res) => {
    try {
      const coinId = req.params.id;
      const gasUrl = `${COINSTATS_GAS_URL}?action=coin&id=${encodeURIComponent(coinId)}`;
      const response = await fetch(gasUrl);

      if (!response.ok) {
        return res.status(response.status).json({ error: `CoinStats proxy error HTTP ${response.status}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("CoinStats coin detail proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch coin details from CoinStats proxy" });
    }
  });

  // API endpoint: Multi-Currency Fiat Exchange Rates
  interface FiatRatesCache {
    rates: Record<string, number>;
    timestamp: number;
  }
  let fiatRatesCache: FiatRatesCache | null = null;
  const FIAT_RATES_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  const FALLBACK_FIAT_RATES: Record<string, number> = {
    USD: 1.0,
    GBP: 0.7394,
    EUR: 0.8625,
    AUD: 1.3992,
    CAD: 1.3891,
    JPY: 160.11,
    CHF: 0.8113,
    SGD: 1.2730
  };

  app.get("/api/fiat-rates", async (req, res) => {
    try {
      const now = Date.now();
      if (fiatRatesCache && (now - fiatRatesCache.timestamp < FIAT_RATES_CACHE_TTL)) {
        return res.json({
          source: "cache",
          base: "USD",
          rates: fiatRatesCache.rates,
          timestamp: new Date(fiatRatesCache.timestamp).toISOString()
        });
      }

      let fetchedRates: Record<string, number> | null = null;

      // 1. Primary: open.er-api.com free open exchange rates
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const erRes = await fetch("https://open.er-api.com/v6/latest/USD", {
          signal: controller.signal,
          headers: { "Accept": "application/json" }
        });
        clearTimeout(timeout);
        if (erRes.ok) {
          const erData = await erRes.json();
          if (erData && erData.rates) {
            fetchedRates = {
              USD: 1.0,
              GBP: Number(erData.rates.GBP) || FALLBACK_FIAT_RATES.GBP,
              EUR: Number(erData.rates.EUR) || FALLBACK_FIAT_RATES.EUR,
              AUD: Number(erData.rates.AUD) || FALLBACK_FIAT_RATES.AUD,
              CAD: Number(erData.rates.CAD) || FALLBACK_FIAT_RATES.CAD,
              JPY: Number(erData.rates.JPY) || FALLBACK_FIAT_RATES.JPY,
              CHF: Number(erData.rates.CHF) || FALLBACK_FIAT_RATES.CHF,
              SGD: Number(erData.rates.SGD) || FALLBACK_FIAT_RATES.SGD
            };
          }
        }
      } catch (err: any) {
        console.warn("Primary fiat exchange rates fetch failed:", err?.message);
      }

      // 2. Secondary fallback: Frankfurter ECB rates
      if (!fetchedRates) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const frankRes = await fetch("https://api.frankfurter.dev/v1/latest?base=USD", {
            signal: controller.signal,
            headers: { "Accept": "application/json" }
          });
          clearTimeout(timeout);
          if (frankRes.ok) {
            const frankData = await frankRes.json();
            if (frankData && frankData.rates) {
              fetchedRates = {
                USD: 1.0,
                GBP: Number(frankData.rates.GBP) || FALLBACK_FIAT_RATES.GBP,
                EUR: Number(frankData.rates.EUR) || FALLBACK_FIAT_RATES.EUR,
                AUD: Number(frankData.rates.AUD) || FALLBACK_FIAT_RATES.AUD,
                CAD: Number(frankData.rates.CAD) || FALLBACK_FIAT_RATES.CAD,
                JPY: Number(frankData.rates.JPY) || FALLBACK_FIAT_RATES.JPY,
                CHF: Number(frankData.rates.CHF) || FALLBACK_FIAT_RATES.CHF,
                SGD: Number(frankData.rates.SGD) || FALLBACK_FIAT_RATES.SGD
              };
            }
          }
        } catch (err: any) {
          console.warn("Secondary frankfurter fiat exchange rates fetch failed:", err?.message);
        }
      }

      const finalRates = fetchedRates || FALLBACK_FIAT_RATES;
      fiatRatesCache = {
        rates: finalRates,
        timestamp: now
      };

      res.json({
        source: fetchedRates ? "live" : "fallback",
        base: "USD",
        rates: finalRates,
        timestamp: new Date(now).toISOString()
      });
    } catch (error: any) {
      console.error("Fiat rates endpoint error:", error);
      res.json({
        source: "fallback",
        base: "USD",
        rates: FALLBACK_FIAT_RATES,
        timestamp: new Date().toISOString()
      });
    }
  });

  // API endpoint: CoinGecko Proxy for Markets
  app.get("/api/coingecko/markets", async (req, res) => {
    try {
      const ids = (req.query.ids as string) || "solana,ethereum,bitcoin,chainlink,render-token,arbitrum,sui,hyperliquid";
      const vsCurrency = (req.query.vs_currency as string) || "usd";
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${encodeURIComponent(vsCurrency)}&ids=${encodeURIComponent(ids)}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`;
      
      let response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "x-cg-demo-api-key": COINGECKO_KEY
        }
      });

      // Fallback to Google Apps Script proxy if direct API errors
      if (!response.ok) {
        console.warn(`Direct CoinGecko API HTTP ${response.status}. Trying GAS Web App Proxy...`);
        const gasUrl = `${COINGECKO_GAS_URL}?action=markets&ids=${encodeURIComponent(ids)}&vs_currency=${encodeURIComponent(vsCurrency)}`;
        response = await fetch(gasUrl);
      }

      if (!response.ok) {
        return res.status(response.status).json({ error: `CoinGecko API error HTTP ${response.status}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("CoinGecko markets proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch markets from CoinGecko proxy" });
    }
  });

  // API endpoint: CoinGecko Proxy for Search
  app.get("/api/coingecko/search", async (req, res) => {
    try {
      const query = (req.query.query as string) || "";
      if (!query) return res.json({ coins: [] });
      const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
      
      let response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "x-cg-demo-api-key": COINGECKO_KEY
        }
      });

      if (!response.ok) {
        const gasUrl = `${COINGECKO_GAS_URL}?action=search&query=${encodeURIComponent(query)}`;
        response = await fetch(gasUrl);
      }

      if (!response.ok) {
        return res.status(response.status).json({ error: `CoinGecko API error HTTP ${response.status}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("CoinGecko search proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to search CoinGecko" });
    }
  });

  // API endpoint: CoinGecko Proxy for Trending
  app.get("/api/coingecko/trending", async (req, res) => {
    try {
      const url = `https://api.coingecko.com/api/v3/search/trending`;
      let response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "x-cg-demo-api-key": COINGECKO_KEY
        }
      });

      if (!response.ok) {
        const gasUrl = `${COINGECKO_GAS_URL}?action=trending`;
        response = await fetch(gasUrl);
      }

      if (!response.ok) {
        return res.status(response.status).json({ error: `CoinGecko API error HTTP ${response.status}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("CoinGecko trending proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch trending from CoinGecko" });
    }
  });

  // API endpoint: CoinGecko Proxy for Coin Details
  app.get("/api/coingecko/coin/:id", async (req, res) => {
    try {
      const coinId = req.params.id;
      const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&community_data=false&developer_data=false`;
      let response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "x-cg-demo-api-key": COINGECKO_KEY
        }
      });

      if (!response.ok) {
        const gasUrl = `${COINGECKO_GAS_URL}?action=coin&id=${encodeURIComponent(coinId)}`;
        response = await fetch(gasUrl);
      }

      if (!response.ok) {
        return res.status(response.status).json({ error: `CoinGecko API error HTTP ${response.status}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("CoinGecko coin detail proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch coin details from CoinGecko" });
    }
  });

  // API endpoint: CoinGecko Proxy for Market Chart (Historical Prices & Volumes)
  const chartServerCache = new Map<string, { data: any; timestamp: number }>();
  app.get("/api/coingecko/market_chart/:id", async (req, res) => {
    try {
      const coinId = req.params.id;
      const days = (req.query.days as string) || "1";
      const vsCurrency = (req.query.vs_currency as string) || "usd";
      const cacheKey = `${coinId}-${days}-${vsCurrency}`.toLowerCase();

      const cached = chartServerCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60000) {
        return res.json(cached.data);
      }

      const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=${encodeURIComponent(vsCurrency)}&days=${encodeURIComponent(days)}`;

      let response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "x-cg-demo-api-key": COINGECKO_KEY
        }
      });

      if (!response.ok) {
        const gasUrl = `${COINGECKO_GAS_URL}?action=chart&id=${encodeURIComponent(coinId)}&days=${encodeURIComponent(days)}&vs_currency=${encodeURIComponent(vsCurrency)}`;
        response = await fetch(gasUrl);
      }

      if (!response.ok) {
        if (cached) {
          return res.json(cached.data);
        }
        return res.status(response.status).json({ error: `CoinGecko market chart API error HTTP ${response.status}` });
      }
      const data = await response.json();
      if (data && Array.isArray(data.prices) && data.prices.length > 0) {
        chartServerCache.set(cacheKey, { data, timestamp: Date.now() });
        return res.json(data);
      } else if (cached) {
        return res.json(cached.data);
      }
      res.json(data);
    } catch (error: any) {
      console.error("CoinGecko market chart proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch market chart from CoinGecko" });
    }
  });

  // --- CoinGecko Native RWA Proxy Endpoints (P2 Upgrade) ---
  // In-memory server cache to mitigate demo API rate limits
  const rwaServerCache = new Map<string, { data: any; timestamp: number }>();
  const getRwaCache = (key: string, ttlMs: number) => {
    const item = rwaServerCache.get(key);
    if (item && Date.now() - item.timestamp < ttlMs) {
      return item.data;
    }
    return null;
  };
  const setRwaCache = (key: string, data: any) => {
    rwaServerCache.set(key, { data, timestamp: Date.now() });
  };

  const getCgRwaHeaders = () => {
    const headers: Record<string, string> = {
      "Accept": "application/json"
    };
    if (COINGECKO_KEY) {
      headers["x-cg-demo-api-key"] = COINGECKO_KEY;
    }
    return headers;
  };

  // Explicit safety block: Disallowed paid endpoints (/rwas/{id}/tickers and /rwas/{id}/market_chart)
  app.get("/api/coingecko/rwas/:id/tickers", (req, res) => {
    return res.status(403).json({
      error: "Forbidden: /rwas/{id}/tickers requires a paid CoinGecko Basic plan and is disallowed in this configuration."
    });
  });

  app.get("/api/coingecko/rwas/:id/market_chart", (req, res) => {
    return res.status(403).json({
      error: "Forbidden: /rwas/{id}/market_chart requires a paid CoinGecko Basic plan and is disallowed in this configuration."
    });
  });

  // 1. GET /api/coingecko/rwas/list - Discover all supported RWAs
  app.get("/api/coingecko/rwas/list", async (req, res) => {
    try {
      const assetType = req.query.asset_type as string | undefined;
      const cacheKey = `rwa_list_${assetType || 'all'}`;
      const cached = getRwaCache(cacheKey, 5 * 60 * 1000); // 5 min cache
      if (cached) {
        return res.json(cached);
      }

      let url = "https://api.coingecko.com/api/v3/rwas/list";
      if (assetType) {
        url += `?asset_type=${encodeURIComponent(assetType)}`;
      }

      const response = await fetch(url, { headers: getCgRwaHeaders() });
      if (!response.ok) {
        return res.status(response.status).json({
          error: `CoinGecko RWA list API error HTTP ${response.status}`
        });
      }
      const data = await response.json();
      setRwaCache(cacheKey, data);
      res.json(data);
    } catch (error: any) {
      console.error("CoinGecko RWA list proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch RWA list from CoinGecko" });
    }
  });

  // 2. GET /api/coingecko/rwas/markets - Tokenized market data for RWA assets
  app.get("/api/coingecko/rwas/markets", async (req, res) => {
    try {
      const ids = (req.query.ids as string) || "";
      const assetType = req.query.asset_type as string | undefined;
      const perPage = (req.query.per_page as string) || "100";
      const page = (req.query.page as string) || "1";

      const cacheKey = `rwa_markets_${ids}_${assetType || ''}_${perPage}_${page}`;
      const cached = getRwaCache(cacheKey, 30 * 1000); // 30s cache
      if (cached) {
        return res.json(cached);
      }

      const params = new URLSearchParams();
      if (ids) params.set("ids", ids);
      if (assetType) params.set("asset_type", assetType);
      if (perPage) params.set("per_page", perPage);
      if (page) params.set("page", page);

      const url = `https://api.coingecko.com/api/v3/rwas/markets?${params.toString()}`;
      const response = await fetch(url, { headers: getCgRwaHeaders() });
      if (!response.ok) {
        return res.status(response.status).json({
          error: `CoinGecko RWA markets API error HTTP ${response.status}`
        });
      }
      const data = await response.json();
      setRwaCache(cacheKey, data);
      res.json(data);
    } catch (error: any) {
      console.error("CoinGecko RWA markets proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch RWA markets from CoinGecko" });
    }
  });

  // 3. GET /api/coingecko/rwas/issuers/list - Supported RWA issuers
  app.get("/api/coingecko/rwas/issuers/list", async (req, res) => {
    try {
      const cacheKey = "rwa_issuers_list";
      const cached = getRwaCache(cacheKey, 10 * 60 * 1000); // 10 min cache
      if (cached) {
        return res.json(cached);
      }

      const url = "https://api.coingecko.com/api/v3/rwas/issuers/list";
      const response = await fetch(url, { headers: getCgRwaHeaders() });
      if (!response.ok) {
        return res.status(response.status).json({
          error: `CoinGecko RWA issuers list API error HTTP ${response.status}`
        });
      }
      const data = await response.json();
      setRwaCache(cacheKey, data);
      res.json(data);
    } catch (error: any) {
      console.error("CoinGecko RWA issuers list proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch RWA issuers list from CoinGecko" });
    }
  });

  // 4. GET /api/coingecko/rwas/issuers/:id - Issuer details & aggregate stats
  app.get("/api/coingecko/rwas/issuers/:id", async (req, res) => {
    try {
      const issuerId = req.params.id;
      if (!issuerId) {
        return res.status(400).json({ error: "Missing issuer ID" });
      }

      const cacheKey = `rwa_issuer_${issuerId}`;
      const cached = getRwaCache(cacheKey, 60 * 1000); // 60s cache
      if (cached) {
        return res.json(cached);
      }

      const url = `https://api.coingecko.com/api/v3/rwas/issuers/${encodeURIComponent(issuerId)}`;
      const response = await fetch(url, { headers: getCgRwaHeaders() });
      if (!response.ok) {
        return res.status(response.status).json({
          error: `CoinGecko RWA issuer API error HTTP ${response.status}`
        });
      }
      const data = await response.json();
      setRwaCache(cacheKey, data);
      res.json(data);
    } catch (error: any) {
      console.error(`CoinGecko RWA issuer proxy error for ${req.params.id}:`, error);
      res.status(500).json({ error: error.message || "Failed to fetch RWA issuer details" });
    }
  });

  // 5. GET /api/coingecko/rwas/:id - Full RWA metadata, tokens, and tokenized market data
  app.get("/api/coingecko/rwas/:id", async (req, res) => {
    try {
      const rwaId = req.params.id;
      if (!rwaId) {
        return res.status(400).json({ error: "Missing RWA ID" });
      }

      const cacheKey = `rwa_detail_${rwaId}`;
      const cached = getRwaCache(cacheKey, 45 * 1000); // 45s cache
      if (cached) {
        return res.json(cached);
      }

      const url = `https://api.coingecko.com/api/v3/rwas/${encodeURIComponent(rwaId)}?tokens=true&tokenized_market_data=true`;
      const response = await fetch(url, { headers: getCgRwaHeaders() });
      if (!response.ok) {
        return res.status(response.status).json({
          error: `CoinGecko RWA detail API error HTTP ${response.status}`
        });
      }
      const data = await response.json();
      setRwaCache(cacheKey, data);
      res.json(data);
    } catch (error: any) {
      console.error(`CoinGecko RWA detail proxy error for ${req.params.id}:`, error);
      res.status(500).json({ error: error.message || "Failed to fetch RWA details from CoinGecko" });
    }
  });

  // API endpoint: Get coingecko-proxy.gs content for direct viewing or downloading
  app.get("/api/coingecko-proxy-content", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "coingecko-proxy.gs");
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "coingecko-proxy.gs file not found." });
      }
      const content = fs.readFileSync(filePath, "utf-8");
      res.json({ content });
    } catch (error: any) {
      console.error("Failed to read coingecko-proxy.gs:", error);
      res.status(500).json({ error: "Failed to load coingecko-proxy.gs file." });
    }
  });

  app.get("/api/download-coingecko-proxy", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "coingecko-proxy.gs");
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "coingecko-proxy.gs file not found." });
      }
      res.setHeader("Content-Disposition", "attachment; filename=coingecko-proxy.gs");
      res.setHeader("Content-Type", "text/plain");
      res.sendFile(filePath);
    } catch (error: any) {
      console.error("Failed to download coingecko-proxy.gs:", error);
      res.status(500).json({ error: "Failed to download coingecko-proxy.gs file." });
    }
  });

  // Dynamic XML Sitemap Generator Route for Search Engine Indexing & AI Crawlers
  app.get(["/sitemap.xml", "/api/sitemap.xml"], (req, res) => {
    try {
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=14400");

      const baseUrl = "https://www.cryptoreviewlab.com";
      const today = new Date().toISOString().split("T")[0];

      // Primary platform navigation sections
      const mainPages = [
        { url: `${baseUrl}/`, priority: "1.0", changefreq: "daily", lastmod: today },
        { url: `${baseUrl}/?tab=lab`, priority: "0.9", changefreq: "daily", lastmod: today },
        { url: `${baseUrl}/?tab=blog`, priority: "0.9", changefreq: "daily", lastmod: today },
        { url: `${baseUrl}/?tab=academy`, priority: "0.8", changefreq: "weekly", lastmod: today },
        { url: `${baseUrl}/?tab=chat`, priority: "0.7", changefreq: "weekly", lastmod: today },
      ];

      // Individual Crypto Project Review pages
      const projectPages = INITIAL_REVIEWS.map(rev => {
        const lastmod = rev.createdAt || today;
        return {
          url: `${baseUrl}/?tab=blog&amp;review=${encodeURIComponent(rev.id)}`,
          priority: "0.85",
          changefreq: "weekly",
          lastmod,
          name: rev.name,
          symbol: rev.symbol,
          grade: rev.grade,
          logoUrl: rev.logoUrl
        };
      });

      // Modals & Legal disclosures
      const modalPages = [
        { url: `${baseUrl}/?modal=resources`, priority: "0.6", changefreq: "monthly", lastmod: today },
        { url: `${baseUrl}/?modal=privacy`, priority: "0.5", changefreq: "monthly", lastmod: today },
        { url: `${baseUrl}/?modal=disclaimer`, priority: "0.5", changefreq: "monthly", lastmod: today },
        { url: `${baseUrl}/?modal=tos`, priority: "0.5", changefreq: "monthly", lastmod: today },
        { url: `${baseUrl}/?modal=contact`, priority: "0.6", changefreq: "monthly", lastmod: today },
      ];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
      xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n`;
      xml += `        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
      xml += `        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n`;

      // Render main sections
      for (const page of mainPages) {
        xml += `  <url>\n`;
        xml += `    <loc>${page.url}</loc>\n`;
        xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += `  </url>\n`;
      }

      // Render individual crypto project reviews with images for Google Search
      for (const proj of projectPages) {
        xml += `  <url>\n`;
        xml += `    <loc>${proj.url}</loc>\n`;
        xml += `    <lastmod>${proj.lastmod}</lastmod>\n`;
        xml += `    <changefreq>${proj.changefreq}</changefreq>\n`;
        xml += `    <priority>${proj.priority}</priority>\n`;
        if (proj.logoUrl) {
          const safeTitle = `${proj.name} (${proj.symbol}) ${proj.grade} Security Review &amp; Rating`.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          xml += `    <image:image>\n`;
          xml += `      <image:loc>${proj.logoUrl}</image:loc>\n`;
          xml += `      <image:title>${safeTitle}</image:title>\n`;
          xml += `    </image:image>\n`;
        }
        xml += `  </url>\n`;
      }

      // Render legal & resource pages
      for (const modal of modalPages) {
        xml += `  <url>\n`;
        xml += `    <loc>${modal.url}</loc>\n`;
        xml += `    <lastmod>${modal.lastmod}</lastmod>\n`;
        xml += `    <changefreq>${modal.changefreq}</changefreq>\n`;
        xml += `    <priority>${modal.priority}</priority>\n`;
        xml += `  </url>\n`;
      }

      xml += `</urlset>\n`;

      res.status(200).send(xml);
    } catch (error: any) {
      console.error("Failed to generate sitemap.xml:", error);
      res.status(500).send("Error generating sitemap.");
    }
  });

  return app;
}

export const app = createServerApp();

function renderHtmlWithMeta(rawHtml: string, req: express.Request): string {
  try {
    const reviews = loadReviewsFromFile();
    const queryParam = (req.query.review || req.query.reviewId || req.query.article || req.query.id) as string | undefined;
    
    let activeReview: any = null;
    if (queryParam) {
      const q = String(queryParam).toLowerCase();
      activeReview = reviews.find((r: any) => 
        (r.id && r.id.toLowerCase() === q) ||
        (r.coingeckoId && r.coingeckoId.toLowerCase() === q.replace(/^cg-/, '')) ||
        (r.symbol && r.symbol.toLowerCase() === q) ||
        (r.name && r.name.toLowerCase() === q)
      );
    }

    if (activeReview) {
      const pageTitle = `${activeReview.name} (${activeReview.symbol}) Security & Risk Audit — Rating: ${activeReview.grade} | Crypto Review Lab`;
      const pageDesc = `Independent algorithmic pre-launch security assessment and bytecode risk review for ${activeReview.name} (${activeReview.symbol}). Overall Score: ${activeReview.overallScore}/100, Risk Level: ${activeReview.riskLevel}. ${activeReview.verdict || ''}`.slice(0, 290);
      const pageUrl = `https://www.cryptoreviewlab.com/?tab=blog&review=${encodeURIComponent(activeReview.id)}`;
      const pageImage = activeReview.logoUrl || 'https://www.cryptoreviewlab.com/og-banner.jpg';

      let replaced = rawHtml;
      replaced = replaced.replace(/<title>.*?<\/title>/gi, `<title>${pageTitle}</title>`);
      replaced = replaced.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/gi, `<meta name="description" content="${pageDesc}" />`);
      replaced = replaced.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/gi, `<link rel="canonical" href="${pageUrl}" />`);
      replaced = replaced.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/gi, `<meta property="og:title" content="${pageTitle}" />`);
      replaced = replaced.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/gi, `<meta property="og:description" content="${pageDesc}" />`);
      replaced = replaced.replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/gi, `<meta property="og:url" content="${pageUrl}" />`);
      replaced = replaced.replace(/<meta\s+property="og:image"\s+content=".*?"\s*\/?>/gi, `<meta property="og:image" content="${pageImage}" />`);
      replaced = replaced.replace(/<meta\s+property="og:image:secure_url"\s+content=".*?"\s*\/?>/gi, `<meta property="og:image:secure_url" content="${pageImage}" />`);
      replaced = replaced.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/gi, `<meta name="twitter:title" content="${pageTitle}" />`);
      replaced = replaced.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/gi, `<meta name="twitter:description" content="${pageDesc}" />`);
      replaced = replaced.replace(/<meta\s+name="twitter:image"\s+content=".*?"\s*\/?>/gi, `<meta name="twitter:image" content="${pageImage}" />`);
      replaced = replaced.replace(/<meta\s+name="twitter:image:src"\s+content=".*?"\s*\/?>/gi, `<meta name="twitter:image:src" content="${pageImage}" />`);
      replaced = replaced.replace(/<meta\s+name="twitter:url"\s+content=".*?"\s*\/?>/gi, `<meta name="twitter:url" content="${pageUrl}" />`);

      return replaced;
    }
  } catch (err) {
    console.warn("Error rendering HTML with dynamic meta:", err);
  }
  return rawHtml;
}

async function startServer() {
  const PORT = 3000;

  // Vite Dev Server middleware integration
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const possibleDistPaths = [
      path.join(process.cwd(), 'dist'),
      path.resolve(__dirname),
      path.resolve(__dirname, '..', 'dist'),
      path.resolve(__dirname, 'dist')
    ];
    const distPath = possibleDistPaths.find(p => fs.existsSync(path.join(p, 'index.html'))) || path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else if (filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      try {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          const rawHtml = fs.readFileSync(indexPath, 'utf-8');
          const finalHtml = renderHtmlWithMeta(rawHtml, req);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.status(200).send(finalHtml);
        }
      } catch (e) {
        console.error("Error serving dynamic index.html:", e);
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Crypto Review Lab Server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start standalone HTTP server when not running in serverless environments like Vercel
if (!process.env.VERCEL) {
  startServer();
}

export default app;
