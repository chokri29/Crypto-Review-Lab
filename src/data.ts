/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CryptoReview } from './types';
import { calculateBlueprintScore } from './services/EvaluationBlueprint';

const RAW_REVIEWS: CryptoReview[] = [
  {
    id: 'zama-fhe-confidential-computing',
    coingeckoId: 'zama',
    defiLlamaSlug: 'zama',
    network: 'Ethereum',
    name: 'Zama',
    symbol: 'ZAMA',
    category: 'Privacy / FHE Cryptography',
    overallScore: 83,
    verdict: 'Zama provides robust cryptographic primitives for confidential computing, though its long-term economic sustainability remains contingent on widespread enterprise adoption of Fully Homomorphic Encryption (FHE).',
    scores: {
      utility: 9,
      tokenomics: 7,
      security: 9,
      team: 9,
      community: 7,
    },
    riskLevel: 'Medium',
    createdAt: '2026-07-30',
    author: 'Crypto Review Lab',
    logoUrl: 'https://coin-images.coingecko.com/coins/images/35000/large/zama.png',
    summary: `### Core Thesis
Zama focuses on the development of open-source cryptographic tools, specifically Fully Homomorphic Encryption (FHE), to enable privacy-preserving computation on encrypted data. The core value proposition lies in bridging the gap between blockchain transparency and the necessity for data privacy in enterprise finance and decentralized applications.

### Market & Utility Analysis
Zama serves as critical middleware. By allowing smart contracts to process encrypted data without decryption, it addresses a primary bottleneck for enterprise adoption of public ledgers. The utility is high, as it solves the 'privacy vs. transparency' paradox inherent in current L1/L2 architectures.

### Tokenomics & Security
While Zama operates primarily as a research and software development entity, its integration into the broader ecosystem relies on the security of its cryptographic libraries. The code quality is high, verified by rigorous academic peer review. However, the economic model is currently more aligned with B2B service provision than a traditional liquid token economy, creating potential friction for retail participation.

### Conclusion
Zama is a technically superior project with a clear moat in the FHE space. The primary risks involve the computational overhead of FHE operations and the speed of integration into existing EVM-compatible environments.`,
    pros: [
      'Leading academic research output in the field of Fully Homomorphic Encryption.',
      'Strong integration compatibility with existing EVM smart contract standards.',
      'High-caliber engineering team with deep expertise in lattice-based cryptography.'
    ],
    cons: [
      'High computational overhead associated with FHE, potentially limiting throughput.',
      'Lack of a mature, decentralized token economic model for long-term sustainability.',
      'Dependency on future hardware acceleration to achieve production-grade latency.'
    ],
  },
];

// NOTE: truncated intermediate - will replace with full file
export const CRYPTO_REVIEWS = RAW_REVIEWS;
