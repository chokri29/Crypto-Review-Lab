/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FAQItem {
  question: string;
  answer: string;
  category: 'academy' | 'lab' | 'general';
}

export const ACADEMY_FAQ_ITEMS: FAQItem[] = [
  {
    category: 'academy',
    question: 'What is the Bitcoin UTXO model and how does cryptographic scarcity work?',
    answer: 'Bitcoin uses the Unspent Transaction Output (UTXO) model to track coin ownership across transactions rather than account balances. Cryptographic scarcity is enforced by a hard supply limit of 21,000,000 BTC and programmatic halving events that reduce block subsidies every 210,000 blocks (approximately every 4 years).'
  },
  {
    category: 'academy',
    question: 'How do Ethereum gas fees, EIP-1559 base fee burning, and Layer 2 rollups work?',
    answer: 'Gas fees pay for computational execution on the Ethereum Virtual Machine (EVM). EIP-1559 burns the base fee of every transaction, reducing Ether supply during peak usage. Layer 2 scaling rollups (e.g., Arbitrum, Optimism, Base) bundle thousands of off-chain transactions into single cryptographic proof batches settled on Ethereum Layer 1 to dramatically lower transaction costs.'
  },
  {
    category: 'academy',
    question: 'What are DePIN networks and how do decentralized GPU compute markets operate?',
    answer: 'DePIN (Decentralized Physical Infrastructure Networks) uses blockchain tokens to incentivize individuals to deploy and maintain real-world hardware like GPU clusters, storage nodes, and wireless hotspots. Protocols like Render and Akash aggregate global idle computing power to offer cost-effective, censorship-resistant cloud infrastructure.'
  },
  {
    category: 'academy',
    question: 'How does Real World Asset (RWA) tokenization work on blockchain networks?',
    answer: 'RWA tokenization creates digital blockchain tokens representing physical and traditional financial assets such as real estate, gold, and US Treasury bills. Fractional ownership pools enable micro-investments, while yield-bearing treasury tokens distribute daily interest on-chain verified by decentralized oracle feeds.'
  },
  {
    category: 'academy',
    question: 'What are tokenized stocks (xStocks) and how are synthetic equity markets collateralized?',
    answer: 'Tokenized stocks are blockchain-based tokens representing shares of public equities and ETFs, providing 24/7 global trading access. Fully-backed tokens hold real shares with regulated custodians, while synthetic stock tokens use over-collateralized stablecoin pools with decentralized price oracles to track stock market movements without intermediaries.'
  },
  {
    category: 'academy',
    question: 'How do perpetual futures work in crypto trading and how are funding rates calculated?',
    answer: 'Perpetual futures are derivative contracts without an expiration date. Funding rates are periodic payments exchanged between long and short traders to keep the perpetual contract price anchored to the underlying spot market price. Traders must manage leverage carefully to avoid liquidation when account margin falls below maintenance requirements.'
  }
];

export const REVIEW_LAB_FAQ_ITEMS: FAQItem[] = [
  {
    category: 'lab',
    question: 'How does the AI Review Lab conduct automated smart contract security audits?',
    answer: 'The AI Review Lab analyzes smart contract source code and compiled bytecode to detect critical vulnerabilities including reentrancy vectors, unhedged admin multi-sig powers, flash loan arbitrage vectors, unbounded loops, and hidden token mint functions.'
  },
  {
    category: 'lab',
    question: 'What evaluation criteria and dimensions determine a project\'s Review Lab score?',
    answer: 'Review Lab evaluates crypto projects on a 100-point scale across 5 core dimensions: Smart Contract & Audit Security (25%), Tokenomics & Lockup Schedules (20%), Tech Stack & Developer Velocity (20%), Team Transparency & Legal Compliance (20%), and Community Engagement & Liquidity Depth (15%).'
  },
  {
    category: 'lab',
    question: 'How does Review Lab evaluate token inflation, insider vesting, and cliff unlock risks?',
    answer: 'Review Lab models 5-year token supply emission schedules, analyzing cliff unlocks, team/investor vesting allocations, circulating vs. total supply ratios, and potential sell pressure impact on liquidity pools.'
  },
  {
    category: 'lab',
    question: 'Can users generate on-demand AI security reports for any crypto project in Review Lab?',
    answer: 'Yes, traders and developers can enter any project name, token ticker symbol, and focus category into the Review Lab tool to generate an instant, multi-dimensional security evaluation with risk scores and actionable audit insights.'
  },
  {
    category: 'lab',
    question: 'How does Review Lab grade crypto prop trading firms and funded accounts?',
    answer: 'Review Lab evaluates prop trading firms based on drawdown limits (static vs. trailing), profit split percentages (up to 90%), payout processing speeds, broker liquidity feeds, challenge evaluation rules, and verified trader payout histories.'
  }
];

export const ALL_FAQ_ITEMS: FAQItem[] = [
  ...ACADEMY_FAQ_ITEMS,
  ...REVIEW_LAB_FAQ_ITEMS
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

export function generateDualFaqJsonLd(activeTab?: string) {
  const academySchema = generateSingleFaqJsonLd(
    ACADEMY_FAQ_ITEMS,
    'Crypto Academy & Education FAQs',
    'https://www.cryptoreviewlab.com/?m=1#academy-faq'
  );

  const reviewLabSchema = generateSingleFaqJsonLd(
    REVIEW_LAB_FAQ_ITEMS,
    'Crypto Review Lab & Smart Contract Audit FAQs',
    'https://www.cryptoreviewlab.com/?m=1#review-lab-faq'
  );

  const graph = activeTab === 'lab'
    ? [reviewLabSchema, academySchema]
    : [academySchema, reviewLabSchema];

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  };
}

export function generateFaqJsonLd(items: FAQItem[] = ALL_FAQ_ITEMS) {
  return generateDualFaqJsonLd();
}
