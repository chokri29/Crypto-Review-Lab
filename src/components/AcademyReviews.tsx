/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  ArrowRight, 
  ExternalLink, 
  Layers, 
  BookOpen, 
  Award, 
  CheckCircle2, 
  FlaskConical, 
  Lock, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Search,
  Cpu,
  Building2,
  Coins,
  TrendingUp,
  HelpCircle,
  GraduationCap,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { ALL_FAQ_ITEMS, ACADEMY_FAQ_ITEMS, REVIEW_LAB_FAQ_ITEMS } from '../data/faqData';

interface ReviewCard {
  idx: number;
  name: string;
  category: string;
  desc: string;
  link: string;
  logo: string;
  fallback: string;
}

const CARDS_DATA: ReviewCard[] = [
  {
    idx: 0,
    name: 'Travala',
    category: 'Travel & Crypto',
    desc: 'Book hotels & flights Save up to 40%.',
    link: 'https://www.crypto-academy.online/2026/05/travala-worlds-leading-crypto-native.html?m=1',
    logo: 'https://i.imgur.com/46N3xeG.jpeg',
    fallback: '✈️'
  },
  {
    idx: 1,
    name: 'Republic',
    category: 'Investing',
    desc: 'Invest in startups, real estate & crypto — from $10.',
    link: 'https://www.crypto-academy.online/2026/06/republic.html?m=1',
    logo: 'https://i.imgur.com/yoEAn6h.jpeg',
    fallback: '🏛️'
  },
  {
    idx: 2,
    name: 'Rizon',
    category: 'Stablecoin Bank',
    desc: 'Earn yield on stablecoins with Rizon',
    link: 'https://www.crypto-academy.online/2026/06/rizon-easiest-way-to-send-spend-and.html?m=1',
    logo: 'https://i.imgur.com/x8nuGLQ.jpeg',
    fallback: '💎'
  },
  {
    idx: 3,
    name: 'Ultahost',
    category: 'WebHosting',
    desc: 'Best Web Hosting Built for Speed',
    link: 'https://www.crypto-academy.online/2026/05/ultahost-best-web-hosting-secure-cheap.html?m=1',
    logo: 'https://i.imgur.com/cTmQfmP.jpeg',
    fallback: '🌍'
  },
  {
    idx: 4,
    name: 'Cloudbet',
    category: 'Crypto Casino',
    desc: 'Bet with Bitcoin on sports & casino games. Est. 2013.',
    link: 'https://www.crypto-academy.online/2026/05/h1-h2-h3-color-1e73be-cloudbet-review.html?m=1',
    logo: 'https://i.imgur.com/CiLJCyb.jpeg',
    fallback: '🎰'
  }
];

interface GuideItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  category: string;
  content: {
    heading: string;
    sections: { title: string; body: string }[];
  };
}

export default function AcademyReviews() {
  const [current, setCurrent] = useState(2); // Start with Rizon (idx 2) as active
  const [logoErrors, setLogoErrors] = useState<Record<number, boolean>>({});
  const [isMobile, setIsMobile] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const total = CARDS_DATA.length;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lab Academy Portal State
  const [activeGuide, setActiveGuide] = useState<string | null>(null);
  const [completedGuides, setCompletedGuides] = useState<Record<string, boolean>>({});
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [faqTab, setFaqTab] = useState<'all' | 'academy' | 'lab'>('all');

  const handlePrev = () => {
    setCurrent((prev) => (prev - 1 + total) % total);
  };

  const handleNext = () => {
    setCurrent((prev) => (prev + 1) % total);
  };

  const handleCardClick = (idx: number) => {
    if (idx !== current) {
      setCurrent(idx);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Touch handlers for swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  const handleLogoError = (idx: number) => {
    setLogoErrors((prev) => ({ ...prev, [idx]: true }));
  };

  const toggleLessonComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedGuides((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const guidesData: GuideItem[] = [
    {
      id: 'learn-btc',
      title: 'Bitcoin Basics Guide',
      desc: 'UTXOs, key security, and hard cap fundamentals.',
      category: 'CRYPTOCURRENCY FOUNDATIONS',
      icon: <CheckCircle2 className="w-5 h-5 text-cyber-cyan" />,
      content: {
        heading: 'Bitcoin Ledger Protocol & Scarcity mechanics',
        sections: [
          {
            title: '1. The UTXO Ledger Architecture',
            body: 'Unlike standard bank databases that record account balances directly, Bitcoin uses the Unspent Transaction Output (UTXO) model. Transactions consume existing unspent outputs and create new ones. Your total wallet balance is the sum of these unspent outputs.'
          },
          {
            title: '2. Cryptographic Multi-Signature Locks',
            body: 'Multi-signature (multi-sig) architecture allows a wallet to require multiple independent private keys to unlock and spend UTXOs. This provides corporate-grade isolation so that even if one key gets stolen, the assets remain safe.'
          },
          {
            title: '3. Hard Cap Halving Scarcity',
            body: 'The Bitcoin consensus algorithm enforces a hard supply limit of 21,000,000 coins. Approximately every 4 years, block rewards are cut in half, reducing the rate of inflation programmatically to guarantee long-term hard digital asset scarcity.'
          }
        ]
      }
    },
    {
      id: 'learn-eth',
      title: 'Ethereum Masterclass',
      desc: 'Gas fee structures, EVM mechanics, and L2 layers.',
      category: 'SMART CONTRACTS',
      icon: <Layers className="w-5 h-5 text-cyber-cyan" />,
      content: {
        heading: 'Ethereum Virtual Machine (EVM) Architecture',
        sections: [
          {
            title: '1. Gas Fees and EIP-1559 Burning',
            body: 'Every computational transaction executed by EVM nodes requires a fee called Gas. EIP-1559 introduced a permanent base fee burn mechanism. When demand on the network spikes, more Ether is burned than is minted, making the asset deflationary.'
          },
          {
            title: '2. Layer 2 Rollup Architectures',
            body: 'Layer 2 scaling engines (e.g., Arbitrum, Optimism, Base) bundle thousands of off-chain transactions, compress them, and settle them back to Ethereum L1 in single cryptographic batches to minimize fees while inheriting L1 security.'
          },
          {
            title: '3. Reentrancy Hack Mitigation',
            body: 'A reentrancy bug occurs when a contract sends funds to an external contract before updating its internal state balance. Attackers can recursively trigger withdraw loops. Solved by updating balances first, and implementing reentrancy guard modifiers.'
          }
        ]
      }
    },
    {
      id: 'learn-depin',
      title: 'DePIN Networks',
      desc: 'Decentralized physical infrastructure, compute grids, and telecommunication networks.',
      category: 'DECENTRALIZED HARDWARE',
      icon: <Cpu className="w-5 h-5 text-cyber-cyan" />,
      content: {
        heading: 'Decentralized Physical Infrastructure Networks (DePIN)',
        sections: [
          {
            title: '1. Token-Incentivized Deployments',
            body: 'DePIN leverages blockchain tokens to incentivize individuals to purchase, host, and maintain real-world hardware (such as storage servers, GPU clusters, or wireless hotspots), bootstrapping networks quickly without massive centralized venture capital.'
          },
          {
            title: '2. DePIN vs. Centralized Cloud Systems',
            body: 'Traditional systems rely on monolithic monopolistic cloud data centers. DePIN distributes workloads and raw infrastructure resource provisioning globally, providing massive fault tolerance, censorship resistance, and vastly cheaper rates.'
          },
          {
            title: '3. Decentralized GPU & Compute Markets',
            body: 'With high global AI demands, projects like Akash and Render aggregate idle computing horsepower globally, creating an open market where developers rent enterprise-grade GPUs seamlessly.'
          }
        ]
      }
    },
    {
      id: 'learn-rwa',
      title: 'Real World Assets (RWAs)',
      desc: 'On-chain tokenization of real estate, government bonds, and hard commodities.',
      category: 'TOKENIZED CAPITAL',
      icon: <Building2 className="w-5 h-5 text-cyber-cyan" />,
      content: {
        heading: 'Real World Asset (RWA) Tokenization Mechanics',
        sections: [
          {
            title: '1. Fractional Ownership Pools',
            body: 'Tokenizing high-value physical assets (such as commercial real estate or fine art) divides them into micro-shares on a transparent ledger, unlocking liquidity and offering accessible retail investment options.'
          },
          {
            title: '2. Yield-Bearing On-Chain Treasury Bills',
            body: 'High-grade traditional instruments (like US Treasuries) are secured with regulated custodians, allowing tokenized wrappers (such as USDY, BUIDL) to distribute compliant daily yields directly on-chain.'
          },
          {
            title: '3. Oracle Feeds & Physical Verification',
            body: 'To prevent fractional reserve risks, off-chain collateral audits are verified continuously by trusted custodians and broadcast onto the ledger using decentralized oracle networks like Chainlink.'
          }
        ]
      }
    },
    {
      id: 'learn-xstocks',
      title: 'Tokenized xStocks',
      desc: 'Synthetic and tokenized US equities, index trackers, and global ETFs.',
      category: 'SYNTHETIC ASSETS',
      icon: <Coins className="w-5 h-5 text-cyber-cyan" />,
      content: {
        heading: 'Tokenized US Equities & ETFs on Blockchain',
        sections: [
          {
            title: '1. 24/7 Global Equity Access',
            body: 'While legacy equity markets have restrictive trading hours and regional access barriers, tokenized stocks represent US equities and ETFs traded round-the-clock globally on decentralized exchanges.'
          },
          {
            title: '2. Synthetic Over-Collateralized Models',
            body: 'Synthetic stock tokens use stablecoin pool reserves locked in smart contracts. High-speed oracle price feeds continuously adjust values to mimic the real equity assets, providing price exposure without custodian dependence.'
          },
          {
            title: '3. Regulatory Bridges & Permitted Accounts',
            body: 'Fully-backed asset issuers procure actual shares via licensed brokers. The assets are then tokenized and traded on-chain with dynamic compliance checks built into the wallet smart contracts.'
          }
        ]
      }
    },
    {
      id: 'learn-perps',
      title: 'Perpetual Futures (Perps)',
      desc: 'Funding rate mechanics, synthetic leverage, and liquidations.',
      category: 'DERIVATIVE TRADING',
      icon: <TrendingUp className="w-5 h-5 text-cyber-cyan" />,
      content: {
        heading: 'Perpetual Futures Trading & Dynamic Funding Rates',
        sections: [
          {
            title: '1. Mechanics of the Funding Rate',
            body: 'Because perpetual contracts have no expiration, a dynamic funding rate system keeps prices aligned with spot. When perp price exceeds spot, long positions pay short positions periodically, and vice versa.'
          },
          {
            title: '2. Leveraged Margin & Liquidation Engine',
            body: 'Leverage enables trading with magnified capital backed by maintenance margin. If market shifts cause collateral levels to drop below the threshold, the protocol liquidation engine automatically unwinds the position.'
          },
          {
            title: '3. Decentralized Liquidity Pool Exchanges',
            body: 'Platforms like GMX or dYdX leverage shared liquidity index pools (e.g., GLP) or virtual AMMs, letting traders execute trades with minimal slippage directly from non-custodial web3 wallets.'
          }
        ]
      }
    },
    {
      id: 'learn-defi',
      title: 'DeFi 101 Security',
      desc: 'Auditing liquidity pools and slippage parameters.',
      category: 'DECENTRALIZED FINANCE',
      icon: <FlaskConical className="w-5 h-5 text-cyber-cyan" />,
      content: {
        heading: 'Automated Market Makers & Capital Risks',
        sections: [
          {
            title: '1. Automated Market Makers (AMMs)',
            body: 'AMMs (like Uniswap) utilize liquidity pools instead of classic order books. Token exchange rates are calculated dynamically using deterministic algebraic curves (such as x * y = k) based on the current ratio of tokens.'
          },
          {
            title: '2. Impermanent Loss Mechanics',
            body: 'When providing liquidity to an AMM, if the market value ratio of the tokens changes significantly compared to when you deposited them, your pool share value might be less than if you had simply held the individual tokens in cold storage.'
          },
          {
            title: '3. Slippage and Front-Running (MEV)',
            body: 'Slippage is the difference between the expected price of a trade and the executed price. Searcher bots scan mempools to front-run high-slippage trades using Sandwich attacks, making slippage parameter configuration critical.'
          }
        ]
      }
    },
    {
      id: 'learn-sec',
      title: 'Cold Wallet Isolation',
      desc: 'Hardware custody best practices for long-term safe holding.',
      category: 'WALLET SECURITY',
      icon: <Lock className="w-5 h-5 text-cyber-cyan" />,
      content: {
        heading: 'Air-Gapped Private Key Custody Protocols',
        sections: [
          {
            title: '1. Hardware Security Modules (HSMs)',
            body: 'Hardware wallets store your private keys inside a secure microchip that never exposes the seed phrase to connected internet-facing computers. Transactions are signed directly inside the physical device and broadcast safely.'
          },
          {
            title: '2. 24-Word Seed Backup & Passphrases',
            body: 'The 24-word seed phrase translates your cryptographic master key. Best practice involves keeping this off paper, stamped in stainless steel, and adding a 25th word passphrase to prevent single point of physical theft failures.'
          },
          {
            title: '3. Active Blind Signing Audits',
            body: 'Blind signing happens when you sign smart contract transactions without seeing what variables are changed. Always use hardware wallets with display screens that decode contract interactions, protecting you from malicious phishing.'
          }
        ]
      }
    }
  ];

  return (
    <div className="w-full py-4 flex flex-col items-center space-y-6 md:space-y-8">
      {/* Title & Eyebrow */}
      <div className="text-center space-y-2 w-full border-b border-cyber-cyan/15 pb-4 px-4">
        <span className="font-mono text-xs text-cyber-cyan uppercase tracking-[5px] font-bold">
          Featured Reviews
        </span>
        <h2 className="font-display font-extrabold text-xl md:text-2xl text-cyber-text-primary tracking-wide flex items-center justify-center gap-2">
          <Layers className="w-6 h-6 text-cyber-cyan animate-pulse" />
          EXPLORE <span className="text-cyber-cyan drop-shadow-[0_0_15px_rgba(0,229,255,0.35)]">TOP PICKS</span>
        </h2>
        <p className="text-xs md:text-sm text-cyber-text-secondary max-w-xl mx-auto leading-relaxed">
          Premium cryptocurrency platforms carefully selected and analyzed by the Crypto Review Lab network.
        </p>
      </div>

      {/* 3D Coverflow stage */}
      <div className="relative w-full max-w-[900px] select-none">
        {/* Glow background behind coverflow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] rounded-full bg-[radial-gradient(circle,rgba(0,229,255,0.06)_0%,transparent_70%)] pointer-events-none z-0" />

        {/* Swipeable Track */}
        <div 
          className="relative h-[290px] md:h-[310px] w-full flex items-center justify-center overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={isMobile ? {} : { perspective: '1200px', transformStyle: 'preserve-3d' }}
        >
          {CARDS_DATA.map((card, i) => {
            // Compute the diff, wrap-around index offsets
            let d = i - current;
            if (d > Math.floor(total / 2)) d -= total;
            if (d < -Math.floor(total / 2)) d += total;
            const a = Math.abs(d);
            const s = d < 0 ? -1 : 1;

            // Compute standard 3D layout settings corresponding to original blogger theme:
            let translateX = 0;
            let translateZ = 0;
            let rotateY = 0;
            let opacity = 1;
            let scale = 1;
            let zIndex = 10;

            if (a === 0) {
              translateX = 0;
              translateZ = 0;
              rotateY = 0;
              opacity = 1;
              scale = 1;
              zIndex = 10;
            } else if (a === 1) {
              translateX = s * (isMobile ? 100 : 150);
              translateZ = isMobile ? -50 : -80;
              rotateY = s * (isMobile ? -18 : -24);
              opacity = 0.82;
              scale = isMobile ? 0.82 : 0.85;
              zIndex = 8;
            } else if (a === 2) {
              translateX = s * (isMobile ? 180 : 250);
              translateZ = isMobile ? -110 : -160;
              rotateY = s * (isMobile ? -25 : -35);
              opacity = 0.38;
              scale = isMobile ? 0.68 : 0.72;
              zIndex = 6;
            } else {
              translateX = s * (isMobile ? 280 : 450);
              translateZ = -250;
              rotateY = s * -50;
              opacity = 0;
              scale = 0.5;
              zIndex = 1;
            }

            const isActive = i === current;

            return (
              <div
                key={card.idx}
                onClick={() => handleCardClick(i)}
                style={{
                  transform: isMobile 
                    ? `translateX(${translateX}px) scale(${scale})` 
                    : `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity: opacity,
                  zIndex: zIndex,
                  transition: 'transform .45s cubic-bezier(.4,0,.2,1), opacity .45s ease, border-color .45s ease, box-shadow .45s ease',
                  transformStyle: isMobile ? 'flat' : 'preserve-3d',
                  pointerEvents: opacity === 0 ? 'none' : 'auto'
                }}
                className={`absolute w-[185px] sm:w-[205px] h-[255px] sm:h-[265px] rounded-2xl cursor-pointer flex flex-col items-center justify-end p-4 overflow-hidden transition-all duration-300 border bg-gradient-to-b from-[#0e1f38] to-[#091526] ${
                  isActive 
                    ? 'border-cyber-cyan/50 shadow-[0_0_25px_rgba(0,229,255,0.15),inset_0_0_15px_rgba(0,229,255,0.05)]' 
                    : 'border-cyber-cyan/15 hover:border-cyber-cyan/35'
                }`}
              >
                {/* scanline and grid overlay details precisely mimicking blogger widget */}
                {!isMobile && (
                  <>
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,229,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.015)_1px,transparent_1px)] bg-[size:10px_10px] opacity-70 z-1" />
                    <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)] z-1" />
                  </>
                )}
                
                {/* Horizontal highlight light line exactly like standard widget ::after */}
                <div className={`absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent transition-opacity duration-500 z-2 ${
                  isActive ? 'opacity-70' : 'opacity-0'
                }`} />

                {/* Banner Logo block with high-fidelity styling */}
                <div className="w-full h-[85px] sm:h-[95px] rounded-lg flex items-center justify-center mb-2 relative z-10 overflow-hidden flex-shrink-0">
                  {logoErrors[i] ? (
                    <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(0,229,255,0.3)] select-none">
                      {card.fallback}
                    </span>
                  ) : (
                    <img 
                      src={card.logo} 
                      alt={card.name} 
                      className="w-full h-full object-contain filter drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]"
                      referrerPolicy="no-referrer"
                      onError={() => handleLogoError(i)}
                    />
                  )}
                </div>

                {/* Name */}
                <h3 className="text-base font-display font-bold text-cyber-text-primary tracking-wide text-center relative z-10 mb-0.5 select-none leading-tight">
                  {card.name}
                </h3>

                {/* Tag / Category */}
                <span className="font-mono text-[8px] font-semibold text-cyber-cyan uppercase tracking-widest relative z-10 mb-2 opacity-80 select-none">
                  {card.category}
                </span>

                {/* Description - Animated height and opacity based on active status */}
                <div 
                  style={{
                    maxHeight: isActive ? '45px' : '0px',
                    opacity: isActive ? 1 : 0,
                    transition: 'max-height 0.4s ease, opacity 0.4s ease'
                  }}
                  className="overflow-hidden w-full"
                >
                  <p className="text-[11px] text-cyber-text-secondary leading-normal text-center select-none px-0.5">
                    {card.desc}
                  </p>
                </div>

                {/* Read Review CTA Button */}
                <a
                  href={card.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? 'translateY(0)' : 'translateY(8px)',
                    pointerEvents: isActive ? 'auto' : 'none',
                    transition: 'opacity 0.35s ease 0.1s, transform 0.35s ease 0.1s'
                  }}
                  className="mt-2 w-full bg-gradient-to-r from-cyber-cyan to-[#00b4cc] hover:from-[#33ecff] hover:to-[#00c5df] text-cyber-bg-primary font-display font-extrabold text-[10px] uppercase tracking-[1px] py-1 md:py-1.5 px-3 rounded-lg text-center flex items-center justify-center gap-1 cursor-pointer shadow-[0_2px_8px_rgba(0,229,255,0.15)] hover:shadow-[0_3px_12px_rgba(0,229,255,0.25)]"
                >
                  <span>Read Review</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            );
          })}
        </div>

        {/* Carousel arrows */}
        <div id="caCfArrows" className="flex items-center justify-center gap-8 mt-6">
          <button 
            onClick={handlePrev}
            aria-label="Previous card"
            className="w-10 h-10 rounded-full border border-cyber-cyan/35 bg-cyber-cyan/5 hover:bg-cyber-cyan/15 text-cyber-cyan flex items-center justify-center transition-colors cursor-pointer focus:outline-none hover:shadow-[0_0_12px_rgba(0,229,255,0.25)]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          {/* Status dots indicator */}
          <div className="flex items-center gap-1.5">
            {CARDS_DATA.map((_, i) => (
              <button
                key={i}
                onClick={() => handleCardClick(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === current 
                    ? 'bg-cyber-cyan scale-125 shadow-[0_0_8px_#00e5ff]' 
                    : 'bg-cyber-cyan/25'
                }`}
              />
            ))}
          </div>

          <button 
            onClick={handleNext}
            aria-label="Next card"
            className="w-10 h-10 rounded-full border border-cyber-cyan/35 bg-cyber-cyan/5 hover:bg-cyber-cyan/15 text-cyber-cyan flex items-center justify-center transition-colors cursor-pointer focus:outline-none hover:shadow-[0_0_12px_rgba(0,229,255,0.25)]"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lab Academy Portal Section exactly below Coverflow cards */}
      <div className="w-full mt-6 pt-6 border-t border-cyber-cyan/15 space-y-4 text-left">
        <div className="flex items-center gap-2">
          <Search className="w-5.5 h-5.5 text-cyber-cyan animate-pulse" />
          <h3 className="font-display font-extrabold text-lg md:text-xl text-cyber-text-primary tracking-wide uppercase">
            Lab Academy <span className="text-cyber-cyan">Portal</span>
          </h3>
        </div>
        <p className="text-xs md:text-sm text-cyber-text-secondary max-w-2xl leading-relaxed">
          Interactive learning blueprints, air-gapped custody checklists, and smart contract audit guides curated for web3 developers and investors.
        </p>

        {/* Guides Accordion Stack */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
          {guidesData.map((guide) => {
            const isExpanded = activeGuide === guide.id;
            const isCompleted = completedGuides[guide.id];

            return (
              <div
                key={guide.id}
                onClick={() => setActiveGuide(isExpanded ? null : guide.id)}
                className={`bg-cyber-bg-card/75 border rounded-xl p-4 shadow-md relative overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:scale-[1.015] hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(0,229,255,0.18)] ${
                  isExpanded 
                    ? 'border-cyber-cyan/45 bg-cyber-bg-card shadow-[0_12px_30px_rgba(0,229,255,0.12)]' 
                    : 'border-cyber-cyan/15 hover:border-cyber-cyan/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-cyber-cyan/5 border border-cyber-cyan/15">
                      {guide.icon}
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-mono text-[8px] font-bold text-cyber-cyan uppercase tracking-wider">{guide.category}</span>
                      <h4 className="font-display font-bold text-sm md:text-base text-cyber-text-primary flex items-center gap-1.5">
                        {guide.title}
                        {isCompleted && (
                          <span className="bg-cyber-green/10 text-cyber-green border border-cyber-green/20 text-[8px] font-mono px-1 py-0.2 rounded flex items-center gap-0.5">
                            <Check className="w-2 h-2" />
                            COMPLETED
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-cyber-text-muted">{guide.desc}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={(e) => toggleLessonComplete(guide.id, e)}
                      className={`p-1 rounded-md border transition-all cursor-pointer ${
                        isCompleted 
                          ? 'bg-cyber-green/15 border-cyber-green/35 text-cyber-green' 
                          : 'bg-cyber-bg-primary/40 border-cyber-cyan/10 text-cyber-text-muted hover:border-cyber-cyan/30'
                      }`}
                      title={isCompleted ? "Mark as Incomplete" : "Mark as Completed"}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-cyber-text-muted" /> : <ChevronDown className="w-4 h-4 text-cyber-text-muted" />}
                    </div>
                  </div>
                </div>

                {/* Animated expandable content drawer */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden border-t border-cyber-cyan/10 pt-3"
                    >
                      <h5 className="font-display font-bold text-[11px] text-cyber-text-primary uppercase tracking-wide mb-2.5 text-left">
                        {guide.content.heading}
                      </h5>
                      
                      <div className="space-y-3 text-xs text-cyber-text-secondary leading-relaxed">
                        {guide.content.sections.map((section, idx) => (
                          <div key={idx} className="space-y-1 text-left bg-cyber-bg-primary/30 p-2.5 rounded-lg border border-cyber-cyan/5">
                            <h6 className="font-display font-bold text-cyber-text-primary uppercase tracking-wider text-[11px]">{section.title}</h6>
                            <p className="text-cyber-text-muted text-[11px] leading-normal">{section.body}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-cyber-cyan/5 flex justify-between items-center text-[9px] font-mono text-cyber-text-muted">
                        <span>EST. STUDY TIME: 5 MINS</span>
                        <button
                          onClick={(e) => toggleLessonComplete(guide.id, e)}
                          className="text-cyber-cyan hover:underline uppercase tracking-wide font-bold cursor-pointer"
                        >
                          {isCompleted ? '✓ Review Lesson' : 'Mark Lesson Complete'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Modernized FAQ Section: Separated Academy and Review Lab Knowledge Bases */}
        <div className="mt-14 pt-10 border-t border-cyber-cyan/20 space-y-6">
          {/* Main FAQ Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.15)]">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold text-cyber-cyan uppercase tracking-widest block">
                  CYBER KNOWLEDGE BASE & FAQ
                </span>
                <h3 className="font-display font-bold text-xl sm:text-2xl text-cyber-text-primary uppercase tracking-wide mt-0.5">
                  Frequently Asked Questions
                </h3>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-cyber-bg-card border border-cyber-cyan/20 self-start md:self-auto font-mono text-xs">
              <button
                type="button"
                onClick={() => setFaqTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-all font-bold cursor-pointer ${
                  faqTab === 'all'
                    ? 'bg-cyber-cyan text-cyber-bg-primary shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                    : 'text-cyber-text-muted hover:text-cyber-cyan hover:bg-cyber-cyan/10'
                }`}
              >
                All FAQs ({ALL_FAQ_ITEMS.length})
              </button>
              <button
                type="button"
                onClick={() => setFaqTab('academy')}
                className={`px-3 py-1.5 rounded-lg transition-all font-bold cursor-pointer flex items-center gap-1.5 ${
                  faqTab === 'academy'
                    ? 'bg-cyber-cyan text-cyber-bg-primary shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                    : 'text-cyber-text-muted hover:text-cyber-cyan hover:bg-cyber-cyan/10'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Academy</span>
              </button>
              <button
                type="button"
                onClick={() => setFaqTab('lab')}
                className={`px-3 py-1.5 rounded-lg transition-all font-bold cursor-pointer flex items-center gap-1.5 ${
                  faqTab === 'lab'
                    ? 'bg-emerald-400 text-cyber-bg-primary shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                    : 'text-cyber-text-muted hover:text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Review Lab</span>
              </button>
            </div>
          </div>

          {/* Section 1: Crypto Academy FAQs */}
          {(faqTab === 'all' || faqTab === 'academy') && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-cyber-cyan/20 pb-3 pt-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/30 text-cyber-cyan shadow-[0_0_15px_rgba(0,229,255,0.15)]">
                    <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm sm:text-base text-cyber-text-primary uppercase tracking-wide">
                      Crypto Academy Knowledge Base
                    </h4>
                    <p className="text-[11px] text-cyber-text-muted">
                      Blockchain architecture, UTXO mechanics, gas fees & RWA tokenization
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/25 shrink-0 shadow-sm">
                  {ACADEMY_FAQ_ITEMS.length} Questions
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {ACADEMY_FAQ_ITEMS.map((faq, index) => {
                  const faqKey = `academy-${index}`;
                  const isOpen = expandedFaq === faqKey;
                  return (
                    <motion.div 
                      key={faqKey}
                      layout
                      initial={false}
                      className={`relative overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-300 ${
                        isOpen 
                          ? 'bg-slate-900/80 border-cyber-cyan/60 shadow-[0_0_25px_rgba(0,229,255,0.18),inset_0_1px_0_rgba(255,255,255,0.1)]' 
                          : 'bg-slate-900/40 border-white/10 hover:border-cyber-cyan/40 hover:bg-slate-900/60 hover:shadow-[0_4px_20px_rgba(0,229,255,0.08)]'
                      }`}
                    >
                      {/* Glassmorphic Specular Top Highlight */}
                      <div className={`absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent ${isOpen ? 'via-cyber-cyan/60' : 'via-white/15'} to-transparent transition-opacity`} />

                      <button
                        type="button"
                        onClick={() => setExpandedFaq(isOpen ? null : faqKey)}
                        className="w-full text-left p-4 sm:p-4.5 flex items-center justify-between gap-3.5 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0 transition-transform duration-200 group-hover:translate-x-1">
                          <span className="px-2.5 py-1 rounded-md text-[9.5px] font-mono font-bold uppercase tracking-wider shrink-0 bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30 shadow-sm">
                            ACADEMY #{index + 1}
                          </span>
                          <span className="font-display font-bold text-xs sm:text-sm text-cyber-text-primary group-hover:text-cyber-cyan transition-colors leading-snug">
                            {faq.question}
                          </span>
                        </div>
                        <motion.div 
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="text-cyber-text-muted shrink-0 p-2 rounded-xl bg-cyber-cyan/5 border border-cyber-cyan/10 group-hover:bg-cyber-cyan/20 group-hover:border-cyber-cyan/40 group-hover:text-cyber-cyan group-hover:scale-110 transition-all shadow-sm"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ 
                              height: 'auto', 
                              opacity: 1,
                              transition: {
                                height: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                                opacity: { duration: 0.25, delay: 0.08 }
                              }
                            }}
                            exit={{ 
                              height: 0, 
                              opacity: 0,
                              transition: {
                                height: { duration: 0.25, ease: [0.7, 0, 0.84, 0] },
                                opacity: { duration: 0.15 }
                              }
                            }}
                            className="overflow-hidden"
                          >
                            <motion.div 
                              initial={{ y: -8, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: -8, opacity: 0 }}
                              transition={{ duration: 0.22 }}
                              className="px-4.5 pb-4.5 pt-1 border-t border-cyber-cyan/15 bg-gradient-to-b from-cyber-cyan/5 to-transparent text-xs sm:text-sm text-slate-300 leading-relaxed font-sans text-left"
                            >
                              <div className="border-l-2 border-cyber-cyan/50 pl-3.5 my-1">
                                {faq.answer}
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Review Lab FAQs */}
          {(faqTab === 'all' || faqTab === 'lab') && (
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 pt-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
                    <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm sm:text-base text-cyber-text-primary uppercase tracking-wide">
                      Review Lab & Security Audit FAQs
                    </h4>
                    <p className="text-[11px] text-cyber-text-muted">
                      Automated auditing models, 100-point security matrix & tokenomics risks
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shrink-0 shadow-sm">
                  {REVIEW_LAB_FAQ_ITEMS.length} Questions
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {REVIEW_LAB_FAQ_ITEMS.map((faq, index) => {
                  const faqKey = `lab-${index}`;
                  const isOpen = expandedFaq === faqKey;
                  return (
                    <motion.div 
                      key={faqKey}
                      layout
                      initial={false}
                      className={`relative overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-300 ${
                        isOpen 
                          ? 'bg-slate-900/80 border-emerald-400/60 shadow-[0_0_25px_rgba(52,211,153,0.18),inset_0_1px_0_rgba(255,255,255,0.1)]' 
                          : 'bg-slate-900/40 border-white/10 hover:border-emerald-400/40 hover:bg-slate-900/60 hover:shadow-[0_4px_20px_rgba(52,211,153,0.08)]'
                      }`}
                    >
                      {/* Glassmorphic Specular Top Highlight */}
                      <div className={`absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent ${isOpen ? 'via-emerald-400/60' : 'via-white/15'} to-transparent transition-opacity`} />

                      <button
                        type="button"
                        onClick={() => setExpandedFaq(isOpen ? null : faqKey)}
                        className="w-full text-left p-4 sm:p-4.5 flex items-center justify-between gap-3.5 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0 transition-transform duration-200 group-hover:translate-x-1">
                          <span className="px-2.5 py-1 rounded-md text-[9.5px] font-mono font-bold uppercase tracking-wider shrink-0 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                            REVIEW LAB #{index + 1}
                          </span>
                          <span className="font-display font-bold text-xs sm:text-sm text-cyber-text-primary group-hover:text-emerald-400 transition-colors leading-snug">
                            {faq.question}
                          </span>
                        </div>
                        <motion.div 
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="text-cyber-text-muted shrink-0 p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 group-hover:bg-emerald-500/20 group-hover:border-emerald-400/40 group-hover:text-emerald-400 group-hover:scale-110 transition-all shadow-sm"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ 
                              height: 'auto', 
                              opacity: 1,
                              transition: {
                                height: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                                opacity: { duration: 0.25, delay: 0.08 }
                              }
                            }}
                            exit={{ 
                              height: 0, 
                              opacity: 0,
                              transition: {
                                height: { duration: 0.25, ease: [0.7, 0, 0.84, 0] },
                                opacity: { duration: 0.15 }
                              }
                            }}
                            className="overflow-hidden"
                          >
                            <motion.div 
                              initial={{ y: -8, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: -8, opacity: 0 }}
                              transition={{ duration: 0.22 }}
                              className="px-4.5 pb-4.5 pt-1 border-t border-emerald-500/15 bg-gradient-to-b from-emerald-500/5 to-transparent text-xs sm:text-sm text-slate-300 leading-relaxed font-sans text-left"
                            >
                              <div className="border-l-2 border-emerald-400/50 pl-3.5 my-1">
                                {faq.answer}
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
