/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FAQItem {
  question: string;
  answer: string;
  category: 'academy' | 'lab' | 'prop' | 'avf' | 'xstocks' | 'general';
  tip?: string;
  definition?: string;
}

export const ACADEMY_FAQ_ITEMS: FAQItem[] = [
  {
    category: 'academy',
    question: 'What is the Bitcoin UTXO model and how does cryptographic scarcity work?',
    definition: 'UTXO (Unspent Transaction Output) is an accounting model that tracks discrete fragments of bitcoin received in transactions rather than global account balances.',
    tip: 'Programmatic halving events reduce block subsidies every 210,000 blocks to cap total supply strictly at 21M BTC.',
    answer: 'Bitcoin uses the Unspent Transaction Output (UTXO) model to track coin ownership across transactions rather than account balances. Cryptographic scarcity is enforced by a hard supply limit of 21,000,000 BTC and programmatic halving events that reduce block subsidies every 210,000 blocks (approximately every 4 years).'
  },
  {
    category: 'academy',
    question: 'How do Ethereum gas fees, EIP-1559 base fee burning, and Layer 2 rollups work?',
    definition: 'Gas represents computational effort on EVM. EIP-1559 dynamically burns base fees during network activity to make ETH deflationary.',
    tip: 'Layer 2 rollups process transactions off-chain and submit single compressed zero-knowledge or optimistic proof batches to Layer 1.',
    answer: 'Gas fees pay for computational execution on the Ethereum Virtual Machine (EVM). EIP-1559 burns the base fee of every transaction, reducing Ether supply during peak usage. Layer 2 scaling rollups (e.g., Arbitrum, Optimism, Base) bundle thousands of off-chain transactions into single cryptographic proof batches settled on Ethereum Layer 1 to dramatically lower transaction costs.'
  },
  {
    category: 'academy',
    question: 'What are DePIN networks and how do decentralized GPU compute markets operate?',
    definition: 'DePIN (Decentralized Physical Infrastructure Networks) tokenizes real-world hardware resources including GPU clusters, storage nodes, and cellular towers.',
    tip: 'DePIN protocol networks aggregate global idle GPU compute to deliver up to 70% cheaper AI training and rendering infrastructure.',
    answer: 'DePIN (Decentralized Physical Infrastructure Networks) uses blockchain tokens to incentivize individuals to deploy and maintain real-world hardware like GPU clusters, storage nodes, and wireless hotspots. Protocols like Render and Akash aggregate global idle computing power to offer cost-effective, censorship-resistant cloud infrastructure.'
  },
  {
    category: 'academy',
    question: 'How does Real World Asset (RWA) tokenization work on blockchain networks?',
    definition: 'RWA Tokenization brings tangible traditional assets (US Treasuries, private credit, real estate) on-chain as digital cryptographic tokens.',
    tip: 'On-chain yield-bearing RWA tokens pay interest directly to user wallets verified by chainlink and Pyth oracle feeds.',
    answer: 'RWA tokenization creates digital blockchain tokens representing physical and traditional financial assets such as real estate, gold, and US Treasury bills. Fractional ownership pools enable micro-investments, while yield-bearing treasury tokens distribute daily interest on-chain verified by decentralized oracle feeds.'
  },
  {
    category: 'academy',
    question: 'What are tokenized stocks (xStocks) and how are synthetic equity markets collateralized?',
    definition: 'Tokenized stocks are on-chain digital representations of equities and ETFs that enable round-the-clock fractional trading globally.',
    tip: 'Fully-backed xStocks hold real equity shares at regulated custodians, while synthetic derivatives utilize over-collateralized stablecoin vaults.',
    answer: 'Tokenized stocks are blockchain-based tokens representing shares of public equities and ETFs, providing 24/7 global trading access. Fully-backed tokens hold real shares with regulated custodians, while synthetic stock tokens use over-collateralized stablecoin pools with decentralized price oracles to track stock market movements without intermediaries.'
  },
  {
    category: 'academy',
    question: 'How do perpetual futures work in crypto trading and how are funding rates calculated?',
    definition: 'Perpetual Futures (Perps) are derivative swap contracts with no expiration date that track spot asset prices via periodic funding rates.',
    tip: 'Positive funding rates indicate long traders pay short traders during bullish demand; negative funding means shorts pay longs.',
    answer: 'Perpetual futures are derivative contracts without an expiration date. Funding rates are periodic payments exchanged between long and short traders to keep the perpetual contract price anchored to the underlying spot market price. Traders must manage leverage carefully to avoid liquidation when account margin falls below maintenance requirements.'
  }
];

export const REVIEW_LAB_FAQ_ITEMS: FAQItem[] = [
  {
    category: 'lab',
    question: 'How does the Algorithmic Verification Framework (AVF) conduct automated smart contract security audits?',
    definition: 'AVF operates on a three-stage Tripartite Core architecture (F1 Candidate Engine + F2 Reviewer + F3 Deterministic Verification Layer) executing multi-pass analysis, cross-validation convergence, and 8 algorithmic verification modules.',
    tip: 'Combines F1 evaluation drafting, F2 independent reviewer critique, and F3 zero-AI deterministic verification in under 60 seconds.',
    answer: 'The Review Lab utilizes the proprietary Algorithmic Verification Framework (AVF) powered by a three-stage Tripartite Core: the F1 Candidate Engine drafts initial multi-dimensional assessments; the F2 Reviewer independently stress-tests findings and drives score drift convergence; and the F3 Verification Layer executes 8 deterministic algorithmic verification modules (covering classification, evidence provenance, methodology weights, simulation validation, score arithmetic, risk-conclusion alignment, calibrated confidence, and cryptographic report traceability with zero AI estimation).'
  },
  {
    category: 'lab',
    question: 'What is the F2 Framework & AVF Cross-Validation Engine upgrading in Review Lab?',
    definition: 'The F2 Framework serves as the second stage in the AVF Tripartite Core, acting as an independent reviewer that cross-examines F1 candidate findings to achieve stable convergence before F3 verification.',
    tip: 'Achieves Stable Convergence by ensuring composite score variance between F1 and F2 stays below <3.0 score points.',
    answer: 'The F2 Framework is the independent reviewer stage of the AVF Tripartite Core. It stress-tests evaluation candidates generated by F1 by iteratively challenging score assignments, opcode execution paths, liquidity drain risks, and admin multi-sig power parameters. AVF achieves Stable Convergence with composite score drift below <3.0 points before passing the audit to the F3 deterministic verification layer and final validation sign-off.'
  },
  {
    category: 'lab',
    question: 'What evaluation criteria and dimensions determine a project\'s Review Lab score under AVF?',
    definition: 'A standardized 100-point security matrix evaluating Smart Contracts (25%), Tokenomics (20%), Tech (20%), Team (20%), and Community (15%).',
    tip: 'Scores translate directly into institutional risk grades ranging from AAA (Exceptional) down to D (High Risk).',
    answer: 'Review Lab evaluates crypto projects on a 100-point scale across 5 core dimensions: Smart Contract & Audit Security (25%), Tokenomics & Lockup Schedules (20%), Tech Stack & Developer Velocity (20%), Team Transparency & Legal Compliance (20%), and Community Engagement & Liquidity Depth (15%). AVF verifies each dimension using multi-vector stress simulations and F3 deterministic score verification.'
  },
  {
    category: 'lab',
    question: 'How does AVF evaluate token inflation, insider vesting, and cliff unlock risks?',
    definition: 'AVF tokenomics engine projects 5-year token supply emission curves and cliff unlock impacts on liquidity pool depth.',
    tip: 'Flags imminent unlock events where team or VC vesting exceeds >15% of circulating market cap within a 30-day window.',
    answer: 'AVF models 5-year token supply emission schedules, analyzing cliff unlocks, team/investor vesting allocations, circulating vs. total supply ratios, and potential sell pressure impact on liquidity pools through cross-validation drift analysis.'
  },
  {
    category: 'lab',
    question: 'What is the Security & Risk Assessment service and who is it designed for?',
    definition: 'A private technical diagnostic evaluation for engineering teams, protocol founders, and treasuries — conducted prior to public launch, major contract upgrades, or whenever a detailed security check is required.',
    tip: 'Delivers actionable security findings, risk analysis, provider evidence, and step-by-step remediation recommendations.',
    answer: 'The Security & Risk Assessment is an automated diagnostic advisory service built specifically for web3 developers, protocol teams, launchpads, and treasury managers. It is conducted prior to public launch, major contract upgrades, or whenever detailed security verification is required. Projects undergo automated multi-source security scanning, TVL stress modeling, and AVF verification to deliver a private, comprehensive report featuring identified vulnerabilities, risk severity breakdowns, security-provider evidence, and actionable remediation recommendations.'
  },
  {
    category: 'lab',
    question: 'How does Review Lab grade crypto prop trading firms and funded accounts under the AVF model?',
    definition: 'Prop trading evaluation framework rating payout reliability, trailing drawdown thresholds, leverage rules, and profit splits up to 90%.',
    tip: 'Verifies real broker liquidity feeds and on-chain payout transactions before issuing an AVF prop trading rating.',
    answer: 'Review Lab evaluates prop trading firms based on drawdown limits (static vs. trailing), profit split percentages (up to 90%), payout processing speeds, broker liquidity feeds, challenge evaluation rules, and verified trader payout histories under the AVF Risk Model.'
  }
];

export const AVF_SECURITY_FAQ_ITEMS: FAQItem[] = [
  {
    category: 'avf',
    question: 'What are the 7 Automated Security Gates in the AVF Engine pipeline?',
    definition: 'A 7-stage verification chain: Gate 0 (Syntax/Opcode), Gate 1 (Triangulation), Gate 2 (GoPlus), Gate 3 (Score Math), Gate 4 (Grade Alignment), Gate 5 (Tokenomics), and Gate 6 (Anti-Drift Re-Control).',
    tip: 'Every candidate audit must pass all 7 gates sequentially; failing any gate triggers automatic re-calibration.',
    answer: 'The Algorithmic Verification Framework (AVF) operates 7 automated security gates: Gate 0 (Structural Syntax & Opcode Integrity), Gate 1 (Multi-Source Triangulation & Cross-Node Audit), Gate 2 (GoPlus On-Chain Security & Open-Source Checks), Gate 3 (Score Arithmetic & Weighted Sub-Vector Analysis), Gate 4 (Grade Scale Alignment), Gate 5 (Tokenomics & Vesting Liquidity Stress Models), and Gate 6 (Zero-Unsupported-Findings Anti-Drift Re-Control).'
  },
  {
    category: 'avf',
    question: 'How does the AVF Tripartite Core (F1 / F2 / F3) architecture secure smart contract audits?',
    definition: 'A three-stage architecture where F1 drafts the candidate evaluation, F2 acts as an independent reviewer to achieve convergence, and F3 executes 8 deterministic verification modules with zero AI calls.',
    tip: 'F2 converges score drift below <3.0, while F3 algorithmically verifies math, evidence provenance, risk consistency, and cryptographic integrity.',
    answer: 'AVF operates through its tripartite core architecture: the F1 Candidate Engine generates the initial comprehensive evaluation; the F2 Reviewer independently tests and stress-tests findings to eliminate false positives and achieve stable score convergence (<3.0 delta); and the F3 Verification Layer deterministically validates mathematical aggregation, methodology compliance, scenario bounds, risk-conclusion alignment, and cryptographic Ed25519/SHA-256 traceability without AI estimation.'
  },
  {
    category: 'avf',
    question: 'How does AVF Engine detect reentrancy vulnerabilities, flash loan attack vectors, and oracle manipulation?',
    definition: 'Symbolic execution engine simulating external state calls, Checks-Effects-Interactions (CEI) violations, and oracle price overrides.',
    tip: 'Simulates flash loan liquidity drains across Uniswap V3, Curve, and Balancer pools to evaluate protocol collapse thresholds.',
    answer: 'AVF Engine integrates verified on-chain telemetry from security providers (GoPlus Security, RugCheck) and executes formal symbolic execution, CEI pattern violation analysis, and dynamic simulation matrices to evaluate reentrancy state overrides, flash loan arbitrage vectors, unhandled external calls, and price oracle manipulation risks.'
  },
  {
    category: 'avf',
    question: 'What Maximum Acceptable Score Drift threshold is enforced by AVF Engine Security Protocols?',
    definition: 'Score Drift is the total mathematical delta between F1 draft score and F2 cross-validation review score.',
    tip: 'Bounded strictly under <3.0 points. If drift exceeds 3.0 points, the system automatically loops through Phase 2 Re-Control.',
    answer: 'AVF Security Protocols enforce a strict Score Drift threshold bounded below <3.0 composite score points. If evaluation variance between the F1 Candidate Engine and F2 Reviewer exceeds 3.0 points, the system automatically triggers an automated re-control cycle before passing to F3 deterministic verification and delivering the final institutional PDF audit report.'
  },
  {
    category: 'avf',
    question: 'What is the methodology scope and technical boundary of this assessment?',
    definition: 'Automated diagnostic assessment performing pattern- and heuristic-based bytecode analysis and on-chain telemetry corroboration.',
    tip: 'Not a formal smart contract audit; excludes manual line-by-line review, complex logic-level exploit testing, and off-chain operational security audits.',
    answer: 'This assessment performs automated pattern- and heuristic-based bytecode analysis (via GoPlus Security and RugCheck) paired with on-chain data corroboration (via Blockscout) and deterministic verification. This assessment does NOT perform manual line-by-line code review, deep logic-level exploit analysis, or off-chain operational security evaluations (such as private key custody management, team infrastructure security, or off-chain incident history). It is an automated technical diagnostic and risk evaluation, not a formal smart contract audit or security certification.'
  }
];

export const XSTOCKS_FAQ_ITEMS: FAQItem[] = [
  {
    category: 'xstocks',
    question: 'What is the Market Data Cross-Check & Contract Verification Report for xStocks?',
    definition: 'A free, public verification panel for tokenized stocks (xStocks) — independent of the paid Security & Risk Assessment product.',
    tip: 'Checks 3 core signals: crypto market data aggregator cross-check (CoinGecko, CoinMarketCap), real-time tracking accuracy against underlying equities via Finnhub, and on-chain token security/bytecode scans.',
    answer: 'This is a free, public verification panel for tokenized stocks (xStocks) — independent of the paid Security & Risk Assessment product. It checks three distinct things:\n1) Whether independent crypto price aggregators (CoinGecko and CoinMarketCap) agree on the token\'s on-chain price (note: they are market data aggregators, not blockchain oracles).\n2) The real-time tracking accuracy between the on-chain token and its actual underlying equity price via Finnhub — measuring whether the token is tracking its underlying equity.\n3) An on-chain token security scan (GoPlus or RugCheck: on-chain token security & authority scan on Solana, contract bytecode security scan on EVM).'
  },
  {
    category: 'xstocks',
    question: 'What else does this "verification Panel" offer?',
    definition: 'Disclosures for issuer, custodian, legal jurisdiction, and instrument type, plus issuer Proof-of-Reserve feed links under CRL honesty standards.',
    tip: 'Any check returning no data is displayed honestly as "Unavailable" or "Not Disclosed" rather than assumed to be clean.',
    answer: 'The panel also discloses the token\'s issuer, custodian, legal jurisdiction, and instrument type where publicly known, along with a link to the issuer\'s own Proof-of-Reserve feed if one is published. As with all CRL findings, any check that returns no data is shown honestly as "Unavailable" or "Not Disclosed" rather than assumed to be clean — including Proof-of-Reserve links, which are provided as a convenience reference to the issuer\'s own published data, not independently verified by CRL.'
  }
];

export const ALL_FAQ_ITEMS: FAQItem[] = [
  ...REVIEW_LAB_FAQ_ITEMS,
  ...AVF_SECURITY_FAQ_ITEMS,
  ...XSTOCKS_FAQ_ITEMS
];

export function generateSingleFaqJsonLd(items: FAQItem[], title: string, entityId: string) {
  return {
    '@type': 'FAQPage',
    '@id': entityId,
    'name': title,
    'mainEntity': items.map((item) => ({
      '@type': 'Question',
      'name': item.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': item.answer
      }
    }))
  };
}

export function generatePropTradingStructuredData() {
  return {
    '@type': 'DefinedTermSet',
    '@id': 'https://www.cryptoreviewlab.com/?m=1#prop-trading-criteria-schema',
    'name': 'Prop Trading Evaluation Criteria & Risk Management Framework',
    'description': 'Institutional benchmarks for evaluating crypto prop trading firms, funded account challenge rules, drawdown mechanics, profit target allocations, and payout split scalability.',
    'hasDefinedTerm': [
      {
        '@type': 'DefinedTerm',
        'name': 'Maximum Total Drawdown Limit',
        'description': 'The hard ceiling on total allowable balance loss (typically 8%-10%) before account liquidation.'
      },
      {
        '@type': 'DefinedTerm',
        'name': 'Daily Trailing Drawdown Cap',
        'description': 'Dynamic daily risk threshold calculated relative to high-water mark peak equity.'
      },
      {
        '@type': 'DefinedTerm',
        'name': 'Profit Target Threshold',
        'description': 'Required profit target percentage (8%-10% in Phase 1, 5% in Phase 2) to qualify for funded capital.'
      },
      {
        '@type': 'DefinedTerm',
        'name': 'Trader Payout Split & Scaling Plan',
        'description': 'Profit sharing structure ranging from 80% to 95% with account balance expansions up to $2,000,000.'
      }
    ]
  };
}

export function generateAvfSecurityProtocolsStructuredData() {
  return {
    '@type': 'TechArticle',
    '@id': 'https://www.cryptoreviewlab.com/?m=1#avf-security-protocols-schema',
    'headline': 'AVF Engine Security Protocols & Tripartite Core Architecture',
    'description': 'Comprehensive documentation of the Algorithmic Verification Framework (AVF) Tripartite Core (F1 Candidate Engine, F2 Reviewer Convergence, and F3 Deterministic Verification Layer) and 7-Gate Quality Control Pipeline.',
    'author': {
      '@type': 'Organization',
      'name': 'Crypto Review Lab Security Research'
    },
    'proficiencyLevel': 'Institutional',
    'articleSection': 'Smart Contract Security & Cross-Validation Audit'
  };
}

export function generateDualFaqJsonLd(activeTab?: string) {
  const reviewLabSchema = generateSingleFaqJsonLd(
    REVIEW_LAB_FAQ_ITEMS,
    'Crypto Review Lab & Smart Contract Audit FAQs',
    'https://www.cryptoreviewlab.com/?m=1#review-lab-faq'
  );

  const avfSecuritySchema = generateSingleFaqJsonLd(
    AVF_SECURITY_FAQ_ITEMS,
    'AVF Engine Security Protocols FAQs',
    'https://www.cryptoreviewlab.com/?m=1#avf-security-faq'
  );

  const xStocksSchema = generateSingleFaqJsonLd(
    XSTOCKS_FAQ_ITEMS,
    'xStocks Market Data Cross-Check & Contract Verification FAQs',
    'https://www.cryptoreviewlab.com/?m=1#xstocks-verification-faq'
  );

  const avfSecurityArticle = generateAvfSecurityProtocolsStructuredData();

  let faqSchemas = [reviewLabSchema, avfSecuritySchema, xStocksSchema];

  if (activeTab === 'xstocks') {
    faqSchemas = [xStocksSchema, reviewLabSchema, avfSecuritySchema];
  } else if (activeTab === 'lab' || activeTab === 'auditor') {
    faqSchemas = [reviewLabSchema, avfSecuritySchema, xStocksSchema];
  } else if (activeTab === 'chat' || activeTab === 'orders') {
    faqSchemas = [avfSecuritySchema, reviewLabSchema, xStocksSchema];
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      ...faqSchemas,
      avfSecurityArticle
    ]
  };
}

export function generateFaqJsonLd(items: FAQItem[] = ALL_FAQ_ITEMS) {
  return generateDualFaqJsonLd();
}
