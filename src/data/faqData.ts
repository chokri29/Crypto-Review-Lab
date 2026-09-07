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
    answer: 'Bitcoin uses the Unspent Transaction Output (UTXO) model to track coin ownership across transactions rather than account balances.\n\nCryptographic scarcity is enforced by two core consensus rules:\n\n- Fixed Supply Cap — Exactly 21,000,000 BTC can ever be minted.\n- Programmatic Halvings — Block subsidies automatically cut in half every 210,000 blocks (roughly every 4 years), predictably slowing coin issuance over time.'
  },
  {
    category: 'academy',
    question: 'How do Ethereum gas fees, EIP-1559 base fee burning, and Layer 2 rollups work?',
    definition: 'Gas represents computational effort on EVM. EIP-1559 dynamically burns base fees during network activity to make ETH deflationary.',
    tip: 'Layer 2 rollups process transactions off-chain and submit single compressed zero-knowledge or optimistic proof batches to Layer 1.',
    answer: 'Gas fees compensate network validators for computational execution on the Ethereum Virtual Machine (EVM).\n\nKey mechanisms shaping modern Ethereum economics:\n\n- EIP-1559 Fee Burning — Dynamically burns base transaction fees, reducing Ether circulating supply during high on-chain congestion.\n- Priority Tips — Users pay discretionary tips directly to block builders to expedite urgent transaction inclusion.\n- Layer 2 Rollups — Scaling networks (Arbitrum, Optimism, Base) execute thousands of transactions off-chain and submit compressed cryptographic validity or fraud proofs to Ethereum Layer 1, slashing gas costs by up to 95%.'
  },
  {
    category: 'academy',
    question: 'What are DePIN networks and how do decentralized GPU compute markets operate?',
    definition: 'DePIN (Decentralized Physical Infrastructure Networks) tokenizes real-world hardware resources including GPU clusters, storage nodes, and cellular towers.',
    tip: 'DePIN protocol networks aggregate global idle GPU compute to deliver up to 70% cheaper AI training and rendering infrastructure.',
    answer: 'DePIN (Decentralized Physical Infrastructure Networks) uses crypto-economic token incentives to coordinate, bootstrap, and maintain real-world physical infrastructure:\n\n- Compute Clustering — Aggregates idle enterprise and consumer GPUs globally for AI model training and 3D rendering.\n- Storage & Wireless — Distributes encrypted file storage and decentralized 5G wireless micro-hotspots.\n- Cost Efficiency — Bypasses centralized cloud hyperscaler margins to deliver compute up to 70% cheaper than traditional providers.'
  },
  {
    category: 'academy',
    question: 'How does Real World Asset (RWA) tokenization work on blockchain networks?',
    definition: 'RWA Tokenization brings tangible traditional assets (US Treasuries, private credit, real estate) on-chain as digital cryptographic tokens.',
    tip: 'On-chain yield-bearing RWA tokens pay interest directly to user wallets verified by chainlink and Pyth oracle feeds.',
    answer: 'RWA tokenization brings off-chain tangible assets into blockchain smart contract ecosystems:\n\n- Fractional Ownership — Divides high-value assets (commercial real estate, fine art, private debt) into fractional tokens accessible to retail traders.\n- Yield-Bearing Treasuries — Digitizes short-term US Treasury bills, streaming daily interest rewards directly into user web3 wallets.\n- Oracle Settlement — Verifies custodial backing, NAV pricing, and real-time interest feeds through decentralized oracles (Chainlink, Pyth).'
  },
  {
    category: 'academy',
    question: 'What are tokenized stocks (xStocks) and how are synthetic equity markets collateralized?',
    definition: 'Tokenized stocks are on-chain digital representations of equities and ETFs that enable round-the-clock fractional trading globally.',
    tip: 'Fully-backed xStocks hold real equity shares at regulated custodians, while synthetic derivatives utilize over-collateralized stablecoin vaults.',
    answer: 'Tokenized stocks represent shares of public equities and ETFs traded 24/7 on decentralized and centralized crypto networks:\n\n- Fully Backed xStocks — Tokens backed 1:1 by real underlying shares held in regulated bank custody (e.g. InCore Bank, Alpaca).\n- Synthetic Equities — On-chain derivatives that track stock prices using over-collateralized stablecoin vaults and oracle price feeds without holding the physical share.\n- 24/7 Global Liquidity — Enables instant trading across weekends and traditional market holidays with zero minimum lot restrictions.'
  },
  {
    category: 'academy',
    question: 'How do perpetual futures work in crypto trading and how are funding rates calculated?',
    definition: 'Perpetual Futures (Perps) are derivative swap contracts with no expiration date that track spot asset prices via periodic funding rates.',
    tip: 'Positive funding rates indicate long traders pay short traders during bullish demand; negative funding means shorts pay longs.',
    answer: 'Perpetual futures (perps) are derivative contracts that allow traders to speculate on asset prices with leverage without an expiration date:\n\n- Funding Rate Mechanism — Periodic payments exchanged between long and short positions to tie perpetual prices to the underlying index spot price.\n- Long-to-Short Payments — When funding is positive, long traders pay shorts; when funding is negative, shorts pay longs.\n- Liquidation Engine — Closes leveraged positions automatically when account collateral breaches the maintenance margin threshold.'
  }
];

export const REVIEW_LAB_FAQ_ITEMS: FAQItem[] = [
  {
    category: 'lab',
    question: 'How does the Algorithmic Verification Framework (AVF) conduct automated smart contract security audits?',
    definition: 'AVF operates on a three-stage Tripartite Core architecture (F1 Candidate Engine + F2 Reviewer + F3 Deterministic Verification Layer) executing multi-pass analysis, cross-validation convergence, and 8 algorithmic verification modules.',
    tip: 'Combines F1 evaluation drafting, F2 independent reviewer critique, and F3 zero-AI deterministic verification in under 60 seconds.',
    answer: 'The Review Lab utilizes the proprietary Algorithmic Verification Framework (AVF) powered by a three-stage Tripartite Core:\n\nF1 — Candidate Engine: Generates initial multi-dimensional assessments by inspecting contract opcodes, tokenomics curves, and on-chain telemetry.\n\nF2 — Independent Reviewer: Stress-tests initial findings, challenges edge-case liquidity assumptions, and drives score drift convergence below <3.0 points.\n\nF3 — Deterministic Verification Layer: Executes 8 zero-AI deterministic verification modules (covering classification, evidence provenance, methodology weights, simulation validation, score arithmetic, risk-conclusion alignment, calibrated confidence, and cryptographic report traceability).'
  },
  {
    category: 'lab',
    question: 'What is the F2 Framework & AVF Cross-Validation Engine upgrading in Review Lab?',
    definition: 'The F2 Framework serves as the second stage in the AVF Tripartite Core, acting as an independent reviewer that cross-examines F1 candidate findings to achieve stable convergence before F3 verification.',
    tip: 'Achieves Stable Convergence by ensuring composite score variance between F1 and F2 stays below <3.0 score points.',
    answer: 'The F2 Framework is the independent reviewer stage of the AVF Tripartite Core.\n\nIt stress-tests evaluation candidates generated by F1 by iteratively challenging score assignments, opcode execution paths, liquidity drain risks, and admin multi-sig power parameters.\n\nAVF achieves Stable Convergence with composite score drift below <3.0 points before passing the audit to the F3 deterministic verification layer and final validation sign-off.'
  },
  {
    category: 'lab',
    question: 'What evaluation criteria and dimensions determine a project\'s Review Lab score under AVF?',
    definition: 'A standardized 100-point security matrix evaluating Smart Contracts (25%), Tokenomics (20%), Tech (20%), Team (20%), and Community (15%).',
    tip: 'Scores translate directly into institutional risk grades ranging from AAA (Exceptional) down to D (High Risk).',
    answer: 'Review Lab evaluates crypto projects on a standardized 100-point scale across 5 core verification dimensions:\n\n1. Smart Contract & Audit Security (25%) — Opcode syntax integrity, vulnerability scans (GoPlus/RugCheck), access control, and upgradeability multi-sig timelocks.\n\n2. Tokenomics & Lockup Schedules (20%) — Inflation emission rates, cliff unlock pressure, circulating-to-total supply ratios, and liquidity pool burn/lock proofs.\n\n3. Tech Stack & Developer Velocity (20%) — GitHub commit cadence, test suite code coverage, modular architecture, and formal verification tests.\n\n4. Team Transparency & Legal Compliance (20%) — Core team background verification, legal jurisdiction, entity registration, and regulatory sanctions checks.\n\n5. Community Engagement & Liquidity Depth (15%) — Organic social sentiment, decentralized exchange TVL depth, order book slippage, and active holder dispersion.\n\nEach dimension is independently validated using multi-vector stress simulations before deterministic scoring.'
  },
  {
    category: 'lab',
    question: 'How does AVF evaluate token inflation, insider vesting, and cliff unlock risks?',
    definition: 'AVF tokenomics engine projects 5-year token supply emission curves and cliff unlock impacts on liquidity pool depth.',
    tip: 'Flags imminent unlock events where team or VC vesting exceeds >15% of circulating market cap within a 30-day window.',
    answer: 'AVF models comprehensive 5-year token supply emission schedules to protect liquidity providers and market participants:\n\n- Analyzes scheduled cliff unlocks and team/investor vesting allocations against circulating market depth.\n- Evaluates circulating versus total supply ratios and flags predatory dilution schedules.\n- Simulates potential sell-pressure impact on decentralized liquidity pools across multiple volume regimes.\n- Enforces strict scoring penalties when upcoming 30-day unlock volume exceeds >15% of current circulating market cap.'
  },
  {
    category: 'lab',
    question: 'What is the Security & Risk Assessment service and who is it designed for?',
    definition: 'A private technical diagnostic evaluation for engineering teams, protocol founders, and treasuries — conducted prior to public launch, major contract upgrades, or whenever a detailed security check is required.',
    tip: 'Delivers actionable security findings, risk analysis, provider evidence, and step-by-step remediation recommendations.',
    answer: 'The Security & Risk Assessment is an automated diagnostic advisory service built specifically for web3 developers, protocol teams, launchpads, and treasury managers. It is conducted prior to public launch, major contract upgrades, or whenever detailed security verification is required.\n\nEach assessment delivers a structured advisory package:\n\n- Automated Multi-Source Security Scanning — Bytecode vulnerability profiling across GoPlus, RugCheck, and Blockscout explorers.\n- TVL Stress Modeling — Simulation of extreme market conditions, flash loan liquidity drain thresholds, and oracle latency.\n- Institutional Audit Dossier — Private report featuring vulnerability classifications, severity breakdowns, provider evidence, and step-by-step remediation guidance.'
  },
  {
    category: 'lab',
    question: 'How does Review Lab grade crypto prop trading firms and funded accounts under the AVF model?',
    definition: 'Prop trading evaluation framework rating payout reliability, trailing drawdown thresholds, leverage rules, and profit splits up to 90%.',
    tip: 'Verifies real broker liquidity feeds and on-chain payout transactions before issuing an AVF prop trading rating.',
    answer: 'Review Lab evaluates crypto proprietary trading firms and funded account providers using a strict 5-pillar assessment:\n\n1. Drawdown Rules — Distinction between static versus trailing drawdown rules, daily loss limits, and account reset fairness.\n\n2. Payout Reliability — Verification of on-chain payout transactions, average processing speed, and institutional banking corridors.\n\n3. Profit Share Matrix — Transparency of profit split tiers (ranging up to 90%) and scaling plan benchmarks.\n\n4. Broker Execution & Feeds — Quality of live market feeds, execution latency, slippage boundaries, and spread markups.\n\n5. Historical Trader Outcomes — Verified pass rates, payout consistency over trailing quarters, and regulatory registration.'
  }
];

export const AVF_SECURITY_FAQ_ITEMS: FAQItem[] = [
  {
    category: 'avf',
    question: 'What are the 7 Automated Security Gates in the AVF Engine pipeline?',
    definition: 'A 7-stage verification chain: Gate 0 (Syntax/Opcode), Gate 1 (Triangulation), Gate 2 (GoPlus), Gate 3 (Score Math), Gate 4 (Grade Alignment), Gate 5 (Tokenomics), and Gate 6 (Anti-Drift Re-Control).',
    tip: 'Every candidate audit must pass all 7 gates sequentially; failing any gate triggers automatic re-calibration.',
    answer: 'The Algorithmic Verification Framework (AVF) operates 7 sequential automated security gates that every evaluation candidate must satisfy:\n\nGate 0 — Structural Syntax & Opcode Integrity: Validates contract bytecode formatting, opcode sequence validity, and AST tree cleanliness.\n\nGate 1 — Multi-Source Triangulation: Cross-verifies telemetry across redundant RPC nodes, block explorers, and price feeds.\n\nGate 2 — GoPlus & RugCheck Security: Ingests real-time security scans covering mint authorities, freeze flags, blacklist functions, and bytecode exploits.\n\nGate 3 — Score Arithmetic & Weighted Analysis: Enforces mathematical consistency across 5 evaluation sub-vectors with zero rounding variance.\n\nGate 4 — Grade Scale Alignment: Maps composite numerical scores to institutional risk grades (AAA to D) without manual discretion.\n\nGate 5 — Tokenomics & Liquidity Stress Models: Simulates 5-year emission curves, cliff unlock depth, and DEX liquidity impact.\n\nGate 6 — Anti-Drift Re-Control: Enforces strict <3.0 point composite delta between F1 and F2 before signing final verification.'
  },
  {
    category: 'avf',
    question: 'How does the AVF Tripartite Core (F1 / F2 / F3) architecture secure smart contract audits?',
    definition: 'A three-stage architecture where F1 drafts the candidate evaluation, F2 acts as an independent reviewer to achieve convergence, and F3 executes 8 deterministic verification modules with zero AI calls.',
    tip: 'F2 converges score drift below <3.0, while F3 algorithmically verifies math, evidence provenance, risk consistency, and cryptographic integrity.',
    answer: 'AVF operates through its tripartite core architecture to ensure unbiased, verifiable findings:\n\nF1 — Candidate Engine: Generates the initial comprehensive evaluation draft from raw bytecode and telemetry.\n\nF2 — Independent Reviewer: Iteratively challenges findings, stress-tests liquidity scenarios, and drives composite score drift below <3.0 points.\n\nF3 — Deterministic Verification Layer: Validates mathematical aggregation, methodology compliance, scenario bounds, and cryptographic Ed25519/SHA-256 traceability without AI estimation.'
  },
  {
    category: 'avf',
    question: 'How does AVF Engine detect reentrancy vulnerabilities, flash loan attack vectors, and oracle manipulation?',
    definition: 'Symbolic execution engine simulating external state calls, Checks-Effects-Interactions (CEI) violations, and oracle price overrides.',
    tip: 'Simulates flash loan liquidity drains across Uniswap V3, Curve, and Balancer pools to evaluate protocol collapse thresholds.',
    answer: 'AVF Engine integrates verified on-chain telemetry from security providers (GoPlus Security, RugCheck) and executes formal symbolic analysis:\n\n- Reentrancy Analysis — Evaluates Checks-Effects-Interactions (CEI) violations and unhandled external contract invocations.\n- Flash Loan Simulation — Simulates multi-million dollar liquidity drains across Uniswap V3, Curve, and Balancer pools.\n- Oracle Latency & Manipulation — Stress-tests price feed deviations between spot AMMs and decentralized oracle networks (Chainlink, Pyth).\n- Privileged Call Vectoring — Audits owner-only functions, emergency pause mechanisms, and multi-sig timelocks.'
  },
  {
    category: 'avf',
    question: 'What Maximum Acceptable Score Drift threshold is enforced by AVF Engine Security Protocols?',
    definition: 'Score Drift is the total mathematical delta between F1 draft score and F2 cross-validation review score.',
    tip: 'Bounded strictly under <3.0 points. If drift exceeds 3.0 points, the system automatically loops through Phase 2 Re-Control.',
    answer: 'AVF Security Protocols enforce a strict Score Drift threshold bounded below <3.0 composite score points.\n\nIf evaluation variance between the F1 Candidate Engine and F2 Reviewer exceeds 3.0 points, the system automatically triggers an automated re-control cycle before passing to F3 deterministic verification and delivering the final institutional PDF audit report.'
  },
  {
    category: 'avf',
    question: 'What is the methodology scope and technical boundary of this assessment?',
    definition: 'Automated diagnostic assessment performing pattern- and heuristic-based bytecode analysis and on-chain telemetry corroboration.',
    tip: 'Not a formal smart contract audit; excludes manual line-by-line review, complex logic-level exploit testing, and off-chain operational security audits.',
    answer: 'This assessment performs automated pattern- and heuristic-based bytecode analysis (via GoPlus Security and RugCheck) paired with on-chain data corroboration (via Blockscout) and deterministic verification.\n\nScope boundaries and exclusions:\n\n- Excluded: Manual line-by-line human code review and mathematical formal proofs.\n- Excluded: Deep business-logic exploits requiring custom economic game theory analysis.\n- Excluded: Off-chain operational security (such as team private key cold storage, internal server infrastructure, or employee access control).\n\nIt is an automated technical diagnostic and risk evaluation, not a formal smart contract audit or security certification.'
  }
];

export const XSTOCKS_FAQ_ITEMS: FAQItem[] = [
  {
    category: 'xstocks',
    question: 'What is the xStocks Verification & Integrity Panel?',
    definition: 'A free, public verification layer for tokenized stocks (xStocks), independent from Crypto Review Lab’s paid Security & Risk Assessment product.',
    tip: 'Integrity checks across 3 distinct dimensions: Market-Price Consistency, Underlying-Equity Tracking, and On-Chain Security & Authority.',
    answer: 'The xStocks Verification & Integrity Panel is a free, public verification layer for tokenized stocks (xStocks), independent from Crypto Review Lab’s paid Security & Risk Assessment product.\n\nIt is designed to provide transparent, real-time integrity checks across three distinct dimensions:\n\n1. Market-Price Consistency — compares the token’s on-chain market price across independent crypto market-data aggregators such as CoinGecko and CoinMarketCap. These services are market-data aggregators, not blockchain oracles; the check measures whether independent market-data sources report consistent pricing.\n\n2. Underlying-Equity Tracking — compares the tokenized stock’s real-time market price with the price of its underlying equity, using Finnhub as the equity-market reference. The panel measures how closely the token tracks its underlying equity price and identifies potential pricing divergence.\n\n3. On-Chain Security & Authority — performs an automated security scan of the token contract and/or token authorities using the appropriate on-chain security provider, such as GoPlus or RugCheck. For Solana assets, this includes token security and authority analysis; for EVM assets, it includes smart-contract/bytecode security analysis.\n\nThe panel therefore evaluates data consistency, underlying-equity tracking, and observable on-chain security signals as separate verification dimensions.'
  },
  {
    category: 'xstocks',
    question: 'What exactly does the panel verify?',
    definition: 'Independent evaluation of each dimension with supporting data rather than a generic "safe" claim.',
    tip: 'Separation of concerns: price agreement, equity tracking, and token security are different properties and must not be conflated.',
    answer: 'The panel does not produce a single generic “safe” or “verified” claim. Each verification dimension is evaluated independently and reports its own status and supporting data.\n\nDepending on the asset and available data, the panel can identify:\n- Whether independent crypto market-data sources are consistent.\n- Whether the token is tracking its underlying equity within the observed market conditions.\n- Whether the token contract or token authorities present identifiable on-chain security or control risks.\n- Whether required verification inputs are available, valid, and sufficiently current.\n\nThis separation is intentional: price agreement, equity tracking, and token security are different properties and must not be conflated.'
  },
  {
    category: 'xstocks',
    question: 'Does a verification result mean that an xStock is safe or officially verified?',
    definition: 'The purpose of the panel is verification and transparency — not certification.',
    tip: 'A successful check means specific observable conditions were satisfied under current data, not an investment recommendation or guarantee.',
    answer: 'No. A positive panel result does not constitute an investment recommendation, legal certification, proof of reserves, or a guarantee that an xStock is safe.\n\nThe panel verifies specific, observable conditions using independent data sources and on-chain security telemetry. A successful check means that the relevant verification criteria were satisfied at the time and under the data conditions observed.\n\nIt also does not replace the deeper Security & Risk Assessment performed by Crypto Review Lab.\n\nThe purpose of the panel is verification and transparency — not certification.'
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
