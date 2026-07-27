/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CryptoReview } from './types';

export const INITIAL_REVIEWS: CryptoReview[] = [
  {
    id: 'hyperliquid-decentralized-perp-exchange',
    coingeckoId: 'hyperliquid',
    name: 'Hyperliquid',
    symbol: 'HYPE',
    category: 'DeFi / Perp DEX',
    overallScore: 93,
    grade: 'AA+',
    verdict: 'Hyperliquid is a high-performance Layer 1 appchain specialized in decentralized perpetual exchange, boasting orderbook execution speeds and gas-free transaction mechanisms.',
    scores: {
      utility: 10,
      tokenomics: 8,
      security: 9,
      team: 9,
      community: 10,
    },
    riskLevel: 'Low',
    createdAt: '2026-07-18',
    author: 'Crypto Review Lab Editor',
    logoUrl: 'https://assets.coingecko.com/coins/images/50882/large/hyperliquid.png',
    summary: `### Core Thesis
Hyperliquid (HYPE) represents a revolutionary paradigm shift in decentralized derivative trading. Built as a custom, high-throughput sovereign Cosmos-SDK-like Appchain (using Tendermint-based custom consensus), it delivers sub-second order book matching, zero gas fees for users, and deep organic liquidity pools.

### Market & Utility Analysis
The platform supports perpetual swap trading with up to 50x leverage on dozens of assets. By offering native copy-trading vaults and an open SDK for programmatic liquidity providers, Hyperliquid has successfully captured a massive share of the perpetual decentralized exchange (Perp DEX) market, often rivaling major centralized competitors in volume and active users.

### Tokenomics & Security
The native HYPE token serves multiple roles including consensus staking, validator security collateral, and platform governance. The core state-transition logic is designed for speed and heavily audited to prevent front-running, front-running attacks, and sequencer manipulation.

### Conclusion
Hyperliquid has set a new standard for decentralized trading experience. Its hybrid approach—combining the performance of a centralized exchange with the security of a non-custodial ledger—makes it a premium, AAA-grade project.`,
    pros: [
      'Sub-second order execution matching the experience of CEXs.',
      'Completely gas-free execution environment for end traders.',
      'Robust native ecosystem with copy-trading vaults and high TVL.'
    ],
    cons: [
      'Relies on a specialized, custom-built L1 chain infrastructure.',
      'Relatively young tokenomics model with early distribution rounds.',
      'Active regulatory pressure surrounding leveraged derivative protocols.'
    ]
  },
  {
    id: 'arbitrum-scaling-ethereum-layer2',
    coingeckoId: 'arbitrum',
    name: 'Arbitrum',
    symbol: 'ARB',
    category: 'L2 / Scaling',
    overallScore: 89,
    grade: 'AA',
    verdict: 'Arbitrum is the leading Optimistic Rollup suite for Ethereum, offering ultra-cheap transactions and high throughput while inheriting Ethereum\'s robust security model.',
    scores: {
      utility: 9,
      tokenomics: 8,
      security: 9,
      team: 9,
      community: 9,
    },
    riskLevel: 'Low',
    createdAt: '2026-07-15',
    author: 'Crypto Review Lab Editor',
    logoUrl: 'https://assets.coingecko.com/coins/images/16547/large/arbitrum_logo.png',
    summary: `### Core Thesis
Arbitrum (ARB) is the absolute market leader in Ethereum Layer 2 scaling. By executing transactions off-chain and roll-up bundle data to the mainnet, it reduces gas fees by 95% while keeping the absolute cryptographic security guarantees of Ethereum.

### Market & Utility Analysis
Arbitrum enjoys the largest DeFi ecosystem and total value locked (TVL) among all Layer 2 networks. It functions as a native home for GMX, Uniswap, and countless high-throughput decentralized applications. The Nitro upgrade represents a milestone in execution efficiency.

### Tokenomics & Security
While the ARB token is primarily used for governance, the sequencer decentralization process and the introduction of Orbit chains provide a strong long-term roadmap. Smart contracts are heavily audited and secured by multi-signature safety boards.

### Conclusion
With dominant TVL, robust developer activity, and mature infrastructure, Arbitrum remains the primary scaling benchmark for the Ethereum ecosystem.`,
    pros: [
      'Largest DeFi ecosystem and TVL across Layer 2 rollup suites.',
      'Underpinned by the absolute security of Ethereum Layer 1.',
      'Nitro upgrade drastically lowered execution cost parameters.'
    ],
    cons: [
      'Sequencer decentralization is still in active development stages.',
      'High competition from Zero-Knowledge scaling rollups.',
      'Token utility is currently restricted to governance rights.'
    ]
  },
  {
    id: 'uniswap-defi-amm-gold-standard',
    coingeckoId: 'uniswap',
    name: 'Uniswap',
    symbol: 'UNI',
    category: 'DeFi / Exchange',
    overallScore: 94,
    grade: 'AAA',
    verdict: 'Uniswap is the premier decentralized exchange protocol in Web3, facilitating automated liquidity and trustless token swaps via highly audited smart contracts.',
    scores: {
      utility: 10,
      tokenomics: 9,
      security: 10,
      team: 9,
      community: 10,
    },
    riskLevel: 'Low',
    createdAt: '2026-07-10',
    author: 'Crypto Review Lab Editor',
    logoUrl: 'https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png',
    summary: `### Core Thesis
Uniswap (UNI) is the undisputed king of decentralized liquidity. Pioneering the Automated Market Maker (AMM) model, Uniswap allows users to trade any ERC-20 asset without intermediaries, order books, or custody risks.

### Market & Utility Analysis
Securing billions in liquidity pools across Ethereum, Arbitrum, Polygon, and Base, Uniswap handles trading volumes that frequently surpass major centralized exchanges. The launch of Uniswap V4 with customizable "hooks" introduces limitless protocol flexibility.

### Tokenomics & Security
Uniswap contracts are historically the most battle-tested and audited pieces of code in Web3 history. Despite various frontend DNS attacks in the broader industry, the core protocol has never suffered a smart contract exploit. The "fee switch" activation remains a highly anticipated catalyst.

### Conclusion
Uniswap is the critical core infrastructure of decentralized finance. Its security record and relentless innovation cement it as a AAA-grade financial protocol.`,
    pros: [
      'Unmatched security track record with zero smart contract exploits.',
      'Massive global liquidity depth across dozens of blockchains.',
      'Highly innovative custom pools with Uniswap v4 hooks.'
    ],
    cons: [
      'Gas fees can be prohibitive on Ethereum mainnet during peak load.',
      'Liquidity providers are heavily exposed to impermanent loss.',
      'Active regulatory scrutiny over decentralized web interfaces.'
    ]
  },
  {
    id: 'render-network-depin-ai-compute',
    coingeckoId: 'render-token',
    name: 'Render Network',
    symbol: 'RENDER',
    category: 'DePIN / Compute',
    overallScore: 85,
    grade: 'A',
    verdict: 'Render Network is a decentralized GPU rendering platform linking idle compute nodes with artists, developers, and AI spatial computing teams.',
    scores: {
      utility: 9,
      tokenomics: 8,
      security: 8,
      team: 9,
      community: 8,
    },
    riskLevel: 'Medium',
    createdAt: '2026-07-01',
    author: 'Crypto Review Lab Editor',
    logoUrl: 'https://assets.coingecko.com/coins/images/11636/large/rndr.png',
    summary: `### Core Thesis
Render Network bridges the gap between massive computing demand (for AI training, 3D CGI rendering, and VR development) and idle global hardware. By organizing nodes into a peer-to-peer grid, it provides rendering services at a fraction of traditional cloud costs.

### Market & Utility Analysis
As artificial intelligence models expand, GPU hardware scarcity has escalated. Render’s open network allows anyone to monetize their graphics cards, serving real customers like Hollywood animation studios and AI research startups.

### Tokenomics & Security
The migration from Ethereum to Solana has resolved transaction throughput friction. The Burn-and-Mint Equilibrium (BME) model ensures dynamic supply adjustments based on real computation usage.

### Conclusion
Render Network is a premier example of Web3 delivering tangible, real-world utility by optimizing real physical assets.`,
    pros: [
      'Direct structural tailwinds from global AI and compute demand.',
      'Highly optimized execution costs via Solana blockchain network.',
      'Established partnership network including Apple and OctaneRender.'
    ],
    cons: [
      'Requires precise, high-end hardware specifications for node operators.',
      'Slightly centralized oversight on job distribution algorithms.',
      'Subject to volatile computer hardware pricing trends.'
    ]
  },
  {
    id: 'solana-high-performance-monolith',
    coingeckoId: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    category: 'Smart Contract / L1',
    overallScore: 91,
    grade: 'AA',
    verdict: 'Solana is a high-speed monolithic Layer 1 blockchain achieving sub-second finality and high throughput via its Proof-of-History consensus mechanism.',
    scores: {
      utility: 10,
      tokenomics: 9,
      security: 8,
      team: 9,
      community: 10,
    },
    riskLevel: 'Medium',
    createdAt: '2026-06-25',
    author: 'Crypto Review Lab Editor',
    logoUrl: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    summary: `### Core Thesis
Solana (SOL) is designed for horizontal scalability, rejecting the complexity of Layer 2 bridges in favor of a fast, monolithic architecture. By using Proof-of-History (PoH) to timestamp transactions before they reach validators, it processes tens of thousands of transactions per second.

### Market & Utility Analysis
Solana dominates retail trading and NFT markets due to sub-penny transaction costs. It hosts a thriving developer community and is the hub for major consumer-facing dApps like Stepn, Helium, and Jupiter.

### Tokenomics & Security
While historic consensus stalls have caused concern, the development of the Firedancer validator client promises to eliminate single-point-of-failure vulnerabilities and bring true network robustness.

### Conclusion
Solana represents the gold standard of user-friendly, high-throughput cryptographic networks, making it a powerful L1 competitor.`,
    pros: [
      'Sub-penny transaction fees with instant visual feedback.',
      'Massive retail user base and deep, active trading markets.',
      'Firedancer client will introduce high validator client diversity.'
    ],
    cons: [
      'Historically prone to validator consensus coordination stalls.',
      'High hardware requirements for running independent validator nodes.',
      'Substantial inflation rewards during early ecosystem phases.'
    ]
  },
  {
    id: 'chainlink-decentralized-oracle-network',
    coingeckoId: 'chainlink',
    name: 'Chainlink',
    symbol: 'LINK',
    category: 'DePIN / Oracles',
    overallScore: 95,
    grade: 'AAA',
    verdict: 'Chainlink is the industry-standard decentralized oracle network, securing tens of billions in smart contracts across all major blockchain ecosystems.',
    scores: {
      utility: 10,
      tokenomics: 9,
      security: 10,
      team: 10,
      community: 9,
    },
    riskLevel: 'Low',
    createdAt: '2026-06-18',
    author: 'Crypto Review Lab Editor',
    logoUrl: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
    summary: `### Core Thesis
Blockchains cannot natively fetch real-world data like price feeds, weather info, or sports scores. Chainlink (LINK) solves this "oracle problem" by deploying secure peer-to-peer networks that aggregate off-chain inputs and deliver them on-chain.

### Market & Utility Analysis
Chainlink is a complete monopoly, securing over 80% of all smart contract oracle data. Its Cross-Chain Interoperability Protocol (CCIP) is now being integrated by global traditional banking institutions (such as Swift) to clear digital assets securely.

### Tokenomics & Security
Chainlink node operators must stake LINK to guarantee accurate data reporting. Failing to do so results in slashing, aligning financial incentives perfectly with network security.

### Conclusion
Chainlink is as close to a utility "blue-chip" as Web3 has. Its institutional trust and universal applicability make it an essential security standard.`,
    pros: [
      'Unchallenged market dominance in decentralized oracle services.',
      'CCIP connects traditional banking pipelines to public ledgers.',
      'Highly decentralized data validation with slashing protection.'
    ],
    cons: [
      'High node gas costs on congested Layer 1 networks.',
      'Ecosystem growth is heavily dependent on smart contract adoption.',
      'Token utility is largely tied to node operator staking.'
    ]
  },
  {
    id: 'sui-network-object-centric-l1',
    coingeckoId: 'sui',
    name: 'Sui Network',
    symbol: 'SUI',
    category: 'Smart Contract / L1',
    overallScore: 92,
    grade: 'AA+',
    verdict: 'Sui is an object-centric Layer 1 blockchain powered by the Move programming language, delivering parallel execution and instant sub-second finality.',
    scores: {
      utility: 10,
      tokenomics: 8,
      security: 9,
      team: 10,
      community: 9,
    },
    riskLevel: 'Medium',
    createdAt: '2026-07-20',
    author: 'Crypto Review Lab Editor',
    logoUrl: 'https://assets.coingecko.com/coins/images/26375/large/sui_asset.png',
    summary: `### Core Thesis
Sui (SUI) introduces an innovative object-centric data model rather than account-based storage. Created by former Mysten Labs engineers behind Meta's Move project, it processes independent transactions concurrently, achieving peak throughput exceeding 297,000 transactions per second.

### Market & Utility Analysis
Sui's zkLogin enables web2-like onboarding with Google or Twitch credentials without seed phrase risk. Its DeFi and Web3 gaming ecosystems have expanded rapidly, attracting billions in DEX trading volume and total value locked (TVL).

### Tokenomics & Security
SUI is used for gas fees, PoS consensus staking, and protocol governance. The Move programming language eliminates entire classes of smart contract reentrancy bugs natively.

### Conclusion
With unmatched horizontal throughput, superior developer ergonomics, and seamless Web2 UX, Sui is one of the premier high-throughput Layer 1 blockchains of the modern era.`,
    pros: [
      'Sub-second transaction finality with horizontal parallel processing.',
      'Native zkLogin allows seamless social login onboarding.',
      'Move language provides built-in protection against reentrancy exploits.'
    ],
    cons: [
      'Token unlocking schedule increases circulating supply over time.',
      'Fierce competition from other high-speed execution environments.',
      'High validator infrastructure requirements for full node operators.'
    ]
  },
  {
    id: 'kaspa-proof-of-work-blockdag',
    coingeckoId: 'kaspa',
    name: 'Kaspa',
    symbol: 'KAS',
    category: 'Layer 1 / BlockDAG',
    overallScore: 90,
    grade: 'AA',
    verdict: 'Kaspa is a revolutionary open-source Proof-of-Work BlockDAG protocol enabling instant block confirmation and high-frequency parallel transaction mining.',
    scores: {
      utility: 9,
      tokenomics: 9,
      security: 10,
      team: 9,
      community: 9,
    },
    riskLevel: 'Low',
    createdAt: '2026-07-19',
    author: 'Crypto Review Lab Editor',
    logoUrl: 'https://assets.coingecko.com/coins/images/25751/large/kaspa-icon.png',
    summary: `### Core Thesis
Kaspa (KAS) solves the traditional PoW scalability trilemma using GHOSTDAG, a consensus protocol generalizing Nakamoto consensus into a Directed Acyclic Graph (BlockDAG). Instead of discarding orphan blocks, Kaspa incorporates them in parallel at 10 blocks per second.

### Market & Utility Analysis
Kaspa offers instant transaction visibility and rapid settlement times without sacrificing decentralized PoW security. Rust engine rewrites have unlocked unprecedented mining throughput and micro-transaction efficiency.

### Tokenomics & Security
Kaspa features 100% fair launch with no pre-mine, no ICO, and no founder allocations. Its chromatic emission schedule gradually reduces block rewards monthly following musical pitch ratios.

### Conclusion
Kaspa represents the evolution of Proof-of-Work technology, combining Satoshi's decentralization ethos with modern high-frequency BlockDAG speeds.`,
    pros: [
      'Pure fair launch with zero pre-mine, venture reserves, or insider allocations.',
      'GHOSTDAG consensus enables 10+ parallel blocks per second.',
      'Sub-second transaction visibility with robust PoW security.'
    ],
    cons: [
      'Smart contract layer functionality is still under active development.',
      'Requires ongoing custom ASIC mining hardware updates.',
      'Ecosystem is currently focused primarily on peer-to-peer payment utility.'
    ]
  }
];
