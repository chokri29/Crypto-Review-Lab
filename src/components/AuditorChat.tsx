/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Terminal, 
  AlertOctagon, 
  HelpCircle, 
  Trash2, 
  ShieldCheck,
  Cpu,
  MessageSquareOff,
  User,
  Radio,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Copy,
  Check,
  FileText,
  Download,
  Crown,
  Zap,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Search,
  Filter,
  Coins,
  Scale,
  Activity,
  Layers
} from 'lucide-react';
import { ChatMessage, CryptoReview } from '../types';
import { EVALUATION_BLUEPRINT_DIMENSIONS } from '../services/EvaluationBlueprint';
import { generateAuditPdfReport } from '../services/pdfGenerator';
import { 
  ACADEMY_FAQ_ITEMS, 
  REVIEW_LAB_FAQ_ITEMS, 
  AVF_SECURITY_FAQ_ITEMS, 
  ALL_FAQ_ITEMS, 
  FAQItem 
} from '../data/faqData';

export interface AuditorPromptPreset {
  id: string;
  category: 'SECURITY' | 'TOKENOMICS' | 'BLUEPRINT' | 'TELEMETRY';
  title: string;
  subtitle: string;
  query: string;
  iconType: 'shield' | 'coins' | 'cpu' | 'zap' | 'scale';
}

const AUDITOR_PROMPT_PRESETS: AuditorPromptPreset[] = [
  {
    id: 'p-1',
    category: 'SECURITY',
    title: 'Flash Loan & Oracle Exploits',
    subtitle: 'Evaluate spot AMM reserves vulnerability vs Chainlink TWAPs',
    query: 'Explain how flash loans exploit spot AMM reserves, and how Chainlink TWAP oracles prevent manipulation.',
    iconType: 'shield'
  },
  {
    id: 'p-2',
    category: 'SECURITY',
    title: 'Re-Entrancy & Mutex Verification',
    subtitle: 'Checks-Effects-Interactions pattern and nonReentrant mutex',
    query: 'Explain the Checks-Effects-Interactions pattern and how to audit for re-entrancy vulnerabilities in DeFi smart contracts.',
    iconType: 'zap'
  },
  {
    id: 'p-3',
    category: 'SECURITY',
    title: 'Multi-Sig & Timelock Admin Locks',
    subtitle: 'Admin key authority, upgradeTo bounds, and multi-sig thresholds',
    query: 'How do I audit and verify if smart contract admin authority is locked behind a Multi-Sig or Timelock?',
    iconType: 'shield'
  },
  {
    id: 'p-4',
    category: 'TOKENOMICS',
    title: 'Vesting & Supply Emissions Model',
    subtitle: '5-Dimension Blueprint breakdown of supply dynamics & unlocks',
    query: 'How does the 5-Dimension Evaluation Blueprint evaluate tokenomics, vesting schedules, and emissions?',
    iconType: 'coins'
  },
  {
    id: 'p-5',
    category: 'TOKENOMICS',
    title: 'LP Token Lock Verification',
    subtitle: 'Irrevocable burn to address(0) vs third-party time-lockers',
    query: 'How can an auditor independently verify if LP tokens are genuinely locked vs behind a fake lock contract?',
    iconType: 'coins'
  },
  {
    id: 'p-6',
    category: 'BLUEPRINT',
    title: 'Zama (ZAMA) Tri-Sync Rating',
    subtitle: 'Live F3 verification state, risk tier, and blueprint score',
    query: 'What is the live Tri-Sync price and Evaluation Blueprint rating for Zama (ZAMA)?',
    iconType: 'cpu'
  },
  {
    id: 'p-7',
    category: 'BLUEPRINT',
    title: 'Comparative Audit: HYPE vs ZAMA',
    subtitle: 'Head-to-head deterministic Evaluation Blueprint comparison',
    query: 'Compare Hyperliquid (HYPE) and Zama (ZAMA) under the locked Evaluation Blueprint.',
    iconType: 'scale'
  },
  {
    id: 'p-8',
    category: 'TELEMETRY',
    title: 'Tri-Sync Consensus Architecture',
    subtitle: 'CoinGecko + CoinStats + CMC multi-source verification engine',
    query: 'How does the Tri-Sync Engine eliminate unsupported AI-generated market price findings?',
    iconType: 'cpu'
  },
  {
    id: 'p-9',
    category: 'TELEMETRY',
    title: 'Honeypot & Malicious Code Flags',
    subtitle: 'GoPlus & RugCheck blacklist, mintable trap, and fee caps',
    query: 'What specific Solidity code patterns indicate a potential honeypot or malicious fee manipulation backdoor?',
    iconType: 'zap'
  }
];

const AUDITOR_SUGGESTIONS = [
  'What is the live Tri-Sync price and Evaluation Blueprint rating for Zama (ZAMA)?',
  'Compare Hyperliquid (HYPE) and Zama (ZAMA) under the locked Evaluation Blueprint.',
  'How does the 5-Dimension Evaluation Blueprint score protocol safety & tokenomics?',
  'How does the Tri-Sync Engine eliminate unsupported AI-generated market price findings?',
  'Explain how a Flash Loan Attack exploits price oracle decentralization.'
];

interface PastVerdict {
  id: string;
  project: string;
  symbol: string;
  timestamp: string;
  type: 'PASS' | 'WARNING' | 'ALERT';
  message: string;
  details: string;
}

const PAST_VERDICTS: PastVerdict[] = [
  {
    id: 'v-1',
    project: 'Solana Multisig',
    symbol: 'SOL',
    timestamp: '15:42 UTC',
    type: 'PASS',
    message: 'Multisig contract upgrade authority locks validated.',
    details: 'Verified institutional-grade 5-of-8 threshold configuration. No single point of failure found.'
  },
  {
    id: 'v-2',
    project: 'Kaspa BlockDAG',
    symbol: 'KAS',
    timestamp: '14:10 UTC',
    type: 'PASS',
    message: 'ASIC-resistance and double-spend vectors secured.',
    details: 'BlockDAG structural consensus audited against transaction re-ordering under latent conditions.'
  },
  {
    id: 'v-3',
    project: 'GasSaver Token',
    symbol: 'GFT',
    timestamp: '12:05 UTC',
    type: 'ALERT',
    message: 'Critical overflow vulnerability in minting algorithm.',
    details: 'Unchecked math operation in gas-refund modifier allows arbitrary minting under specific state.'
  },
  {
    id: 'v-4',
    project: 'Sushi Fork LP',
    symbol: 'SUSHF',
    timestamp: '10:15 UTC',
    type: 'WARNING',
    message: 'Unbounded loop gas exhaustion danger flagged.',
    details: 'Reward distribution traverses complete voter arrays without pagination. Transactions may lock.'
  },
  {
    id: 'v-5',
    project: 'Cardano Stake Pool',
    symbol: 'ADA',
    timestamp: '08:34 UTC',
    type: 'PASS',
    message: 'Staking pool cold/hot key separation verified.',
    details: 'Key rotation protocols conform to KES (Key Evolving Signatures) hardware standards.'
  },
  {
    id: 'v-6',
    project: 'SafeMoon Remake',
    symbol: 'SFMR',
    timestamp: '06:01 UTC',
    type: 'ALERT',
    message: 'Hidden owner proxy reclaim backdoor detected.',
    details: 'Contract contains obfuscated owner recovery code disguised as gas-reclamation routines.'
  },
  {
    id: 'v-7',
    project: 'Arbitrum Bridge Prover',
    symbol: 'ARB',
    timestamp: 'Yesterday',
    type: 'PASS',
    message: 'Fraud proof verification pipeline audited.',
    details: 'WAVM execution environment state transitions validated. Zero-knowledge constraints verify correctly.'
  }
];

interface TickerItem {
  id: string;
  category: 'ALERT' | 'VULN' | 'SYSTEM' | 'NEWS';
  text: string;
}

const FALLBACK_TICKER_ITEMS: TickerItem[] = [
  { id: 't1', category: 'ALERT', text: 'RE-ENTRANCY ATTACK VECTOR DETECTED: Compromised DeFi yield optimizer contract drained $1.8M.' },
  { id: 't2', category: 'VULN', text: 'ORACLE EXPLOIT WARNING: Unchecked spot price index references identified in legacy ERC-20 staking vaults.' },
  { id: 't3', category: 'SYSTEM', text: 'NODE CONNECTIVITY OK: 256 secure validation proxies online. Audit latency: <120ms.' },
  { id: 't4', category: 'NEWS', text: 'Satoshi-era wallet containing 500 BTC activated after 15.2 years of cryptographic dormant state.' },
  { id: 't5', category: 'ALERT', text: 'BRIDGE COMPROMISE: Flash loan vectors bypass cross-chain proof validators in multi-chain rollup.' },
  { id: 't6', category: 'VULN', text: 'OWNERSHIP RECLAIM RISK: Hidden administrative backdoor flagged in unverified token allocation modifier.' },
  { id: 't7', category: 'SYSTEM', text: 'REAL-TIME HEURISTICS: Deep security scanner actively parsing new mempool transaction batches.' }
];

interface AuditorChatProps {
  reviews?: CryptoReview[];
  onLaunchProEvaluation?: () => void;
  onLaunchRegularEvaluation?: () => void;
  initialQuery?: string;
}

export default function AuditorChat({ reviews, onLaunchProEvaluation, onLaunchRegularEvaluation, initialQuery }: AuditorChatProps = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickerItems, setTickerItems] = useState<TickerItem[]>(FALLBACK_TICKER_ITEMS);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-fill query when passed via props (e.g. from FAQ "Ask AI" button)
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setInput(initialQuery);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [initialQuery]);

  // Dynamic verdicts derived from passed crypto reviews (Regular & Pro evaluations + canonical benchmarks)
  const dynamicVerdicts: PastVerdict[] = useMemo(() => {
    if (reviews && reviews.length > 0) {
      return reviews.map((rev, idx) => {
        let type: 'PASS' | 'WARNING' | 'ALERT' = 'PASS';
        if (rev.riskLevel === 'High' || rev.riskLevel === 'Critical' || rev.overallScore < 60) {
          type = 'ALERT';
        } else if (rev.riskLevel === 'Medium' || rev.overallScore < 80) {
          type = 'WARNING';
        }

        const timestamp = rev.createdAt ? rev.createdAt : `${16 - (idx % 12)}:${(idx * 7) % 60 < 10 ? '0' : ''}${(idx * 7) % 60} UTC`;

        return {
          id: `verdict-${rev.id}`,
          project: rev.name,
          symbol: rev.symbol,
          timestamp,
          type,
          message: rev.verdict || `AVF ${type} rating with score of ${rev.overallScore}% (${rev.grade}).`,
          details: `${rev.category} | Blueprint Score: ${rev.overallScore}/100 Grade ${rev.grade}. ${rev.pros?.[0] || 'Verification benchmark verified.'}`
        };
      });
    }
    return PAST_VERDICTS;
  }, [reviews]);

  // Verdicts Auto-Rotation State & Timer
  const [verdictPage, setVerdictPage] = useState(0);
  const [isVerdictAutoPlay, setIsVerdictAutoPlay] = useState(true);
  const [isVerdictHovered, setIsVerdictHovered] = useState(false);

  const verdictsPerPage = 4;

  // FAQ Accordion & Search State
  const [faqCategory, setFaqCategory] = useState<'all' | 'avf' | 'xstocks' | 'lab' | 'academy'>('all');
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const filteredFaqs = useMemo(() => {
    return ALL_FAQ_ITEMS.filter((item) => {
      const matchesCategory = faqCategory === 'all' || item.category === faqCategory;
      const q = faqSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        (item.definition && item.definition.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [faqCategory, faqSearch]);
  const totalVerdictPages = Math.ceil(dynamicVerdicts.length / verdictsPerPage);

  useEffect(() => {
    if (!isVerdictAutoPlay || isVerdictHovered || totalVerdictPages <= 1) return;
    const interval = setInterval(() => {
      setVerdictPage((prev) => (prev + 1) % totalVerdictPages);
    }, 5000);
    return () => clearInterval(interval);
  }, [isVerdictAutoPlay, isVerdictHovered, totalVerdictPages]);

  const currentVerdictPage = totalVerdictPages > 0 ? verdictPage % totalVerdictPages : 0;
  const currentVerdicts = dynamicVerdicts.slice(
    currentVerdictPage * verdictsPerPage,
    (currentVerdictPage + 1) * verdictsPerPage
  );

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('Navigator clipboard failed, using execCommand fallback:', err);
      }
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      textarea.style.top = '-999999px';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    } catch (err) {
      console.error('All clipboard copy attempts failed:', err);
      return false;
    }
  };

  const formatCopyAnalysisText = (rawText: string, title?: string): string => {
    if (!rawText) return '';

    const dateStr = `${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

    const rawLines = rawText.split('\n');
    const formattedLines: string[] = [];

    let inCodeBlock = false;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const trimmed = line.trim();

      // Code block formatting
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        if (inCodeBlock) {
          formattedLines.push('');
          formattedLines.push('┌── [ CODE / TECHNICAL SPECIFICATION ] ──────────────────────────┐');
        } else {
          formattedLines.push('└─────────────────────────────────────────────────────────────────┘');
          formattedLines.push('');
        }
        continue;
      }

      if (inCodeBlock) {
        formattedLines.push(`│  ${line}`);
        continue;
      }

      // Headers (### or ## or #)
      if (trimmed.startsWith('#')) {
        const headerText = trimmed.replace(/^[#\s]+/, '').replace(/\*\*/g, '').trim().toUpperCase();
        formattedLines.push('');
        formattedLines.push(`▶ ${headerText}`);
        formattedLines.push('─'.repeat(Math.max(24, Math.min(64, headerText.length + 4))));
        continue;
      }

      // Bullets (* or - or •)
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const bulletText = trimmed.replace(/^[*•-\s]+/, '').replace(/\*\*(.*?)\*\*/g, '$1');
        formattedLines.push(`  • ${bulletText}`);
        continue;
      }

      // Key-Value bold pairs e.g., **Price:** $10 or **Utility (25%):** 9/10
      if (trimmed.startsWith('**') && trimmed.includes(':**')) {
        const cleanedKV = trimmed.replace(/\*\*(.*?)\*\*/g, '$1');
        formattedLines.push(`  ▪ ${cleanedKV}`);
        continue;
      }

      // Regular text: clean inline bold markdown stars **
      const cleanedLine = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
      formattedLines.push(cleanedLine);
    }

    const bodyContent = formattedLines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return [
      `================================================================================`,
      `🛡️ CRYPTO REVIEW LAB — SECURITY AUDIT REPORT`,
      `================================================================================`,
      `Date:       ${dateStr}`,
      `Framework:  Evaluation Blueprint (25% Utility, 25% Tokenomics, 25% Security, 15% Team, 10% Community)`,
      `Data Feed:  CoinGecko + CoinMarketCap + CoinStats Tri-Sync Engine`,
      `Engine:     AI Auditor Console`,
      title ? `Topic:      ${title}` : null,
      `--------------------------------------------------------------------------------`,
      ``,
      bodyContent,
      ``,
      `--------------------------------------------------------------------------------`,
      `Official Verification: Framework Verified | Crypto Review Lab`,
      `================================================================================`
    ].filter(Boolean).join('\n');
  };

  const handleCopyAnalysis = async (text: string, id: string, title?: string) => {
    const formattedReport = formatCopyAnalysisText(text, title);

    const success = await copyTextToClipboard(formattedReport);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2200);
    } else {
      setError('Could not access system clipboard in preview iframe. Please try copying manually.');
      setTimeout(() => setError(null), 3500);
    }
  };

  const handleCopyFullSession = async () => {
    if (messages.length === 0) return;

    const dateStr = `${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

    const sessionBlocks = messages.map((m) => {
      const roleTag = m.role === 'user' ? '👤 USER QUERY' : '🤖 LAB AUDITOR ANALYSIS';
      const cleanContent = m.role === 'user' ? m.content : formatCopyAnalysisText(m.content);
      return `[${m.timestamp || ''}] ${roleTag}\n${cleanContent}`;
    }).join('\n\n' + '─'.repeat(80) + '\n\n');

    const fullLog = [
      `================================================================================`,
      `🛡️ CRYPTO REVIEW LAB — FULL TERMINAL AUDIT SESSION LOG`,
      `================================================================================`,
      `Session Date: ${dateStr}`,
      `Framework:    Evaluation Blueprint`,
      `Data Feed:    Tri-Sync Engine (CoinGecko + CMC + CoinStats)`,
      `================================================================================`,
      ``,
      sessionBlocks,
      ``,
      `================================================================================`,
      `End of Audit Session Log | Crypto Review Lab`,
      `================================================================================`
    ].join('\n');

    const success = await copyTextToClipboard(fullLog);
    if (success) {
      setCopiedId('full-session');
      setTimeout(() => setCopiedId(null), 2200);
    }
  };

  // Quick Audit Diagnostic Presets Filter State
  const [selectedPromptCategory, setSelectedPromptCategory] = useState<string>('ALL');

  const promptCategories = ['ALL', 'SECURITY', 'TOKENOMICS', 'BLUEPRINT', 'TELEMETRY'] as const;

  const filteredPromptPresets = useMemo(() => {
    if (selectedPromptCategory === 'ALL') return AUDITOR_PROMPT_PRESETS;
    return AUDITOR_PROMPT_PRESETS.filter(item => item.category === selectedPromptCategory);
  }, [selectedPromptCategory]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const fetchNews = async () => {
      try {
        const res = await fetch(
          'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.coingecko.com%2Frss&api_key=9ny0fthvwr82qpycfrjdk72nuqnzsaiwllr1apfu'
        );
        if (res.ok) {
          const data = await res.json();
          if (active && data.items && Array.isArray(data.items)) {
            const mappedNews: TickerItem[] = data.items.slice(0, 8).map((item: any, idx: number) => ({
              id: `api-${idx}`,
              category: 'NEWS',
              text: item.title.toUpperCase()
            }));
            
            const combined = [...FALLBACK_TICKER_ITEMS];
            mappedNews.forEach((newsItem, i) => {
              combined.splice((i * 2) + 1, 0, newsItem);
            });
            setTickerItems(combined);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch RSS for Auditor news feed:', err);
      }
    };
    fetchNews();
    return () => {
      active = false;
    };
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;

    setError(null);
    setIsSending(true);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    try {
      // Keep only last 8 messages in context to maintain high token efficiency
      const relevantHistory = messages.slice(-8).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMsg.content,
          history: relevantHistory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server connection error during audit chat.');
      }

      const responseData = await response.json();

      const modelMsg: ChatMessage = {
        id: `msg-${Date.now()}-model`,
        role: 'model',
        content: responseData.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Chat channel disrupted. Please ensure your Gemini API Key is configured in Secrets.');
    } finally {
      setIsSending(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const handleClearHistory = () => {
    setMessages([]);
    setError(null);
  };

  // Render markdown inline specifically for technical code or list outputs
  const formatAuditorText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();

      // Check if line indicates a critical security warning
      const isWarning = trimmed.toLowerCase().includes('warning') || trimmed.startsWith('⚠') || trimmed.toLowerCase().includes('vulnerability');

      // Inline code blocks
      if (trimmed.startsWith('```')) {
        return null; // Skip markdown fences
      }

      // Headers
      if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
        return (
          <h4 key={idx} className="font-mono font-semibold text-sm text-emerald-400 mt-4 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
            <Terminal className="w-3.5 h-3.5" />
            {trimmed.replace(/^[#\s]+/, '')}
          </h4>
        );
      }

      // Bullets
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const cleanedBullet = trimmed.replace(/^[*•-\s]+/, '');
        return (
          <div key={idx} className="font-mono text-xs text-slate-300 ml-4 mb-1.5 list-item pl-1 leading-relaxed">
            {cleanedBullet}
          </div>
        );
      }

      if (trimmed === '') return <div key={idx} className="h-2"></div>;

      return (
        <p key={idx} className={`font-mono text-xs leading-relaxed mb-2.5 ${isWarning ? 'text-rose-400 bg-rose-500/5 px-2 py-1 border border-rose-500/10 rounded' : 'text-slate-300'}`}>
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div id="auditor-chat-view" className="flex flex-col gap-5 w-full py-2">
      {/* High-Tech Terminal News Feed Ticker */}
      <a 
        href="https://www.coingecko.com/en/news"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-slate-950/90 border border-emerald-500/15 rounded-xl h-9 relative overflow-hidden flex items-center shadow-[0_0_15px_rgba(16,185,129,0.03)] group/ticker select-none cursor-pointer hover:border-emerald-500/30 hover:bg-slate-950/100 hover:shadow-[0_0_20px_rgba(16,185,129,0.08)] transition-all"
      >
        {/* Terminal scanline layer */}
        <div className="absolute inset-0 bg-scanline pointer-events-none opacity-[0.03]"></div>
        
        {/* Live Indicator Prefix */}
        <div className="bg-emerald-950/90 border-r border-emerald-500/20 px-3.5 h-full flex items-center gap-2 text-[9px] font-mono text-emerald-400 font-bold tracking-wider shrink-0 z-10 relative">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="uppercase tracking-widest text-[8.5px]">CRYPTO NEWS</span>
        </div>

        {/* Marquee Content Area */}
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes auditor-ticker {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
            .auditor-marquee {
              display: flex;
              white-space: nowrap;
              animation: auditor-ticker 60s linear infinite;
            }
            @media (hover: hover) {
              .auditor-marquee:hover {
                animation-play-state: paused;
              }
            }
          `}} />
          
          <div className="auditor-marquee">
            {[...tickerItems, ...tickerItems].map((item, index) => {
              const badgeColors = {
                ALERT: 'text-rose-400 bg-rose-500/10 border border-rose-500/20',
                VULN: 'text-amber-400 bg-amber-500/10 border border-amber-500/20',
                SYSTEM: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
                NEWS: 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
              };

              return (
                <div key={`${item.id}-${index}`} className="flex items-center gap-2.5 mx-5 font-mono text-[10px] tracking-wide shrink-0">
                  <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold tracking-widest ${badgeColors[item.category]}`}>
                    {item.category}
                  </span>
                  <span className="text-slate-300 group-hover/ticker:text-emerald-300/90 transition-colors">
                    {item.text}
                  </span>
                  <span className="text-emerald-500/30 font-bold ml-2 select-none">//</span>
                </div>
              );
            })}
          </div>
        </div>
      </a>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5 lg:gap-6 w-full">
        {/* Suggestions and intro left column */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900/90 to-slate-950 backdrop-blur-md border border-cyber-cyan/35 hover:border-cyber-cyan/65 rounded-2xl p-5 shadow-xl hover:shadow-[0_12px_36px_rgba(0,229,255,0.2)] relative overflow-hidden transition-all duration-300 group flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent"></div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyber-cyan/[0.03] rounded-full blur-2xl pointer-events-none"></div>
            
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="font-sans font-semibold text-base text-slate-100 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan shadow-[0_0_12px_rgba(0,229,255,0.2)]">
                  <Terminal className="w-4 h-4" />
                </div>
                <span>Lab Auditor Console</span>
              </h2>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>READY</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Direct intelligence console for smart contract bytecode verification, real-time GoPlus &amp; RugCheck telemetry, and locked Evaluation Blueprint scoring.
            </p>

            {/* Prompt Categories Filter Pills */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-cyber-cyan" />
                  <span>Audit Diagnostic Presets</span>
                </span>
                <span className="text-[9px] font-mono text-slate-500">
                  {filteredPromptPresets.length} Enquiries
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {promptCategories.map((cat) => {
                  const isSelected = selectedPromptCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedPromptCategory(cat)}
                      type="button"
                      className={`text-[9.5px] font-mono px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40 font-bold shadow-[0_0_10px_rgba(0,229,255,0.15)]' 
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Interactive Presets List */}
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredPromptPresets.map((preset) => {
                  return (
                    <motion.div
                      key={preset.id}
                      whileHover={{ scale: 1.015, x: 2 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-cyber-cyan/50 hover:bg-cyber-cyan/[0.04] hover:shadow-[0_4px_20px_rgba(0,229,255,0.12)] transition-all duration-200 group/card flex flex-col gap-1.5 relative"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div className="mt-0.5 w-5 h-5 rounded-md bg-slate-900 border border-slate-800 group-hover/card:border-cyber-cyan/40 group-hover/card:text-cyber-cyan flex items-center justify-center text-slate-400 shrink-0 transition-colors">
                            {preset.iconType === 'shield' && <ShieldCheck className="w-3 h-3" />}
                            {preset.iconType === 'zap' && <Zap className="w-3 h-3" />}
                            {preset.iconType === 'coins' && <Coins className="w-3 h-3" />}
                            {preset.iconType === 'cpu' && <Cpu className="w-3 h-3" />}
                            {preset.iconType === 'scale' && <Scale className="w-3 h-3" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[8px] font-mono uppercase px-1.5 py-0.2 rounded font-bold tracking-wider bg-slate-900 text-slate-400 border border-slate-800 group-hover/card:border-cyber-cyan/30 group-hover/card:text-cyber-cyan transition-colors">
                                {preset.category}
                              </span>
                            </div>
                            <h4 className="text-xs font-semibold text-slate-200 group-hover/card:text-white transition-colors leading-tight">
                              {preset.title}
                            </h4>
                            <p className="text-[10.5px] text-slate-400 leading-snug mt-0.5 line-clamp-2">
                              {preset.subtitle}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSend(preset.query)}
                          disabled={isSending}
                          title="Run this diagnostic enquiry with AI Auditor"
                          className="shrink-0 text-[10px] font-mono text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 hover:border-cyan-400 px-2 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm group/btn"
                        >
                          <Sparkles className="w-2.5 h-2.5 group-hover/btn:rotate-12 transition-transform" />
                          <span>Run</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Clear chat command box */}
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-xs text-slate-400 hover:text-rose-400 py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Format Session History</span>
            </button>
          )}
        </div>

      {/* Main chat window */}
      <div className="lg:col-span-8 flex flex-col h-[520px] bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 backdrop-blur-md border border-cyber-cyan/35 hover:border-cyber-cyan/65 rounded-2xl overflow-hidden shadow-xl hover:shadow-[0_12px_40px_rgba(0,229,255,0.22)] transition-all duration-300 relative group">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent z-20"></div>
        {/* Terminal Header */}
        <div className="bg-slate-950 px-3 sm:px-5 py-3 border-b border-slate-800/80 flex justify-between items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="hidden sm:inline-block w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500/40 shrink-0"></span>
            <span className="hidden sm:inline-block w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40 shrink-0"></span>
            <span className="hidden sm:inline-block w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 shrink-0"></span>
            <span className="text-[11px] sm:text-xs font-mono text-slate-400 truncate">AI Auditor Lab</span>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleCopyFullSession}
                className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono text-slate-400 hover:text-emerald-300 bg-slate-900 hover:bg-slate-850 px-2 sm:px-2.5 py-0.5 rounded border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer shrink-0"
                title="Copy entire session audit log formatted cleanly to clipboard"
              >
                {copiedId === 'full-session' ? (
                  <>
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400" />
                    <span className="text-emerald-300 font-bold">Log Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400" />
                    <span>Copy Full Log</span>
                  </>
                )}
              </button>
            )}

            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 sm:px-2.5 py-0.5 rounded border border-emerald-500/20 shrink-0 whitespace-nowrap">
              <Cpu className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin shrink-0" style={{ animationDuration: '4s' }} />
              <span className="hidden sm:inline">ACTIVE SECURITY STREAM</span>
              <span className="inline sm:hidden">ACTIVE STREAM</span>
            </div>
          </div>
        </div>

        {/* Messaging viewport */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950/45 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-600 mb-4">
                <AlertOctagon className="w-6 h-6 text-slate-500" />
              </div>
              <h3 className="font-sans font-semibold text-slate-300 text-sm mb-1">Terminal Initialized</h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Send a question about tokenomics security, contract vulnerabilities, or specific rug-pull signatures to begin.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  {/* Icon Avatar */}
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-mono border ${
                    msg.role === 'user' 
                      ? 'bg-slate-800 border-slate-700 text-slate-300' 
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
                  </div>

                  {/* Message bubble */}
                  <div className={`p-4 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tr-none' 
                      : 'bg-slate-900/40 border border-slate-800/80 rounded-tl-none'
                  }`}>
                    {msg.role === 'user' ? (
                      <div>
                        <p className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-200">{msg.content}</p>
                        <span className="block text-[9px] font-mono text-slate-600 text-right mt-1.5 uppercase tracking-wider">{msg.timestamp}</span>
                      </div>
                    ) : (
                      <div>
                        <div className="prose prose-invert prose-xs max-w-none">
                          {formatAuditorText(msg.content)}
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-mono flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyAnalysis(msg.content, msg.id, 'AI Auditor Analysis')}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer py-1 px-2 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700"
                            title="Copy markdown-formatted evaluation result to clipboard"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-300 font-bold">Copied Analysis!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-400" />
                                <span>Copy Analysis</span>
                              </>
                            )}
                          </button>

                          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">{msg.timestamp}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex gap-3 mr-auto max-w-[85%]">
                  <div className="w-8 h-8 rounded-lg border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Terminal className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    <span className="text-xs font-mono text-slate-500 ml-1">De-compiling input parameters...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-rose-500/5 border border-rose-500/15 p-4 rounded-xl flex items-start gap-3">
                  <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-rose-400">Terminal Buffer Fault</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer input form */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
          <form onSubmit={handleFormSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Query Lab Auditor (e.g. Is an anonymous team a critical danger?)..."
              disabled={isSending}
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-slate-200 text-xs font-mono focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 p-2.5 rounded-xl transition-all duration-150 shrink-0 flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>

    {/* Recent Audit Verdicts Section - Placed at the bottom */}
    <div 
      className="bg-gradient-to-br from-slate-950 via-slate-900/90 to-slate-950 backdrop-blur-md border border-cyber-cyan/35 hover:border-cyber-cyan/65 rounded-2xl p-5 shadow-xl hover:shadow-[0_12px_36px_rgba(0,229,255,0.2)] flex flex-col relative overflow-hidden mt-5 transition-all duration-300 group"
      onMouseEnter={() => setIsVerdictHovered(true)}
      onMouseLeave={() => setIsVerdictHovered(false)}
    >
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-cyan/[0.02] rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-800/80 pb-3">
        <div>
          <h2 className="font-sans font-semibold text-lg text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Recent Audit Verdicts
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
            Programmatic security ratings and risk evaluations compiled in real-time. Click any past verdict to query the AI Agent for a deeper synthesis.
          </p>
        </div>

        {/* Dynamic Rotation Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest font-bold">
            Batch {currentVerdictPage + 1} of {totalVerdictPages || 1} ({dynamicVerdicts.length} Projects)
          </span>

          <button
            type="button"
            onClick={() => setIsVerdictAutoPlay(!isVerdictAutoPlay)}
            title={isVerdictAutoPlay ? 'Pause Auto Rotation' : 'Resume Auto Rotation'}
            className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-1 font-mono text-[10px] font-bold ${
              isVerdictAutoPlay 
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {isVerdictAutoPlay ? (
              <>
                <Pause className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">LIVE STREAM</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-slate-400" />
                <span className="hidden sm:inline">PAUSED</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setVerdictPage((prev) => (prev - 1 + (totalVerdictPages || 1)) % (totalVerdictPages || 1))}
            disabled={totalVerdictPages <= 1}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Previous Verdicts Batch"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setVerdictPage((prev) => (prev + 1) % (totalVerdictPages || 1))}
            disabled={totalVerdictPages <= 1}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Next Verdicts Batch"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {currentVerdicts.map((v) => (
          <button 
            key={v.id}
            onClick={() => handleSend(`Analyze the audit report for ${v.project} (${v.symbol}) and explain its "${v.message}" verdict.`)}
            disabled={isSending}
            type="button"
            className="w-full text-left bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl transition-all duration-150 cursor-pointer flex flex-col gap-1.5 disabled:opacity-60 group"
          >
            <div className="flex justify-between items-center gap-1.5 w-full">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  v.type === 'PASS' 
                    ? 'bg-emerald-400' 
                    : v.type === 'WARNING' 
                    ? 'bg-amber-400' 
                    : 'bg-rose-500'
                }`}></span>
                <span className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors truncate text-xs">
                  {v.project} <span className="text-slate-500 font-mono text-[9px] font-normal ml-0.5">({v.symbol})</span>
                </span>
              </div>
              <span className="font-mono text-[9px] text-slate-500 shrink-0 whitespace-nowrap">
                {v.timestamp}
              </span>
            </div>
            
            <p className="text-[11px] text-slate-300 font-mono leading-normal line-clamp-1">
              {v.message}
            </p>
            <p className="text-[10px] text-slate-500 font-sans leading-normal line-clamp-1 font-normal">
              {v.details}
            </p>
          </button>
        ))}
      </div>
    </div>

    {/* Security, Lab & Academy FAQ Knowledge Base Section */}
    <div className="rounded-2xl bg-cyber-bg-card/90 border border-cyber-cyan/30 backdrop-blur-md shadow-xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyber-cyan/15 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyber-cyan" />
            <h3 className="font-orbitron font-bold text-sm sm:text-base text-white uppercase tracking-wider">
              Security & Audit Knowledge Base (FAQs)
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Institutional documentation on AVF verification gates, Evaluation Blueprint scoring, and blockchain security protocols.
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-cyber-cyan/20 text-xs font-mono flex-wrap">
          {(['all', 'avf', 'xstocks', 'lab', 'academy'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFaqCategory(cat)}
              className={`px-3 py-1 rounded-lg uppercase tracking-wider font-bold transition-all cursor-pointer ${
                faqCategory === cat
                  ? 'bg-cyber-cyan text-slate-950 shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat === 'all' ? 'All' : cat === 'xstocks' ? 'xStocks' : cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-cyber-cyan absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={faqSearch}
          onChange={(e) => setFaqSearch(e.target.value)}
          placeholder="Search questions, opcode checks, tokenomics models, or audit terms..."
          className="w-full bg-slate-950 border border-cyber-cyan/30 focus:border-cyber-cyan rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all font-mono"
        />
      </div>

      {/* Accordion Items List */}
      <div className="space-y-2.5">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-6 text-slate-500 font-mono text-xs">
            No matching FAQ articles found for "{faqSearch}".
          </div>
        ) : (
          filteredFaqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <motion.div
                key={faq.question}
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                className="rounded-xl will-change-transform"
              >
                <div
                  className={`rounded-xl transition-all duration-300 ease-out shadow-sm border overflow-hidden backdrop-blur-sm ${
                    isOpen
                      ? 'bg-slate-950/80 border-cyber-cyan/60 shadow-[0_0_24px_rgba(0,229,255,0.25),0_8px_24px_rgba(0,229,255,0.15)]'
                      : 'bg-slate-950/80 hover:bg-cyber-cyan/15 border-white/5 hover:border-cyber-cyan/50 hover:shadow-[0_8px_24px_rgba(0,229,255,0.18),0_0_12px_rgba(0,229,255,0.12)]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full text-left p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition-colors shrink-0 ${
                        isOpen
                          ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40 shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                          : 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/25 group-hover:border-cyber-cyan/40'
                      }`}>
                        {faq.category.toUpperCase()}
                      </span>
                      <span className="font-sans font-bold text-xs sm:text-sm text-slate-200 group-hover:text-cyber-cyan transition-colors">
                        {faq.question}
                      </span>
                    </div>

                    <div className={`p-1 rounded-lg shrink-0 transition-all duration-200 ${
                      isOpen
                        ? 'bg-cyber-cyan/20 text-cyber-cyan shadow-[0_0_8px_rgba(0,229,255,0.25)]'
                        : 'bg-slate-900 text-slate-400 group-hover:text-cyber-cyan group-hover:bg-slate-800'
                    }`}>
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 bg-slate-900/40 text-xs text-slate-300 leading-relaxed font-sans space-y-3">
                          <p>{faq.answer}</p>
                          
                          {faq.definition && (
                            <div className="p-2.5 rounded-lg bg-slate-950/90 border border-cyber-cyan/20 font-mono text-[11px] text-slate-300 shadow-inner">
                              <span className="text-cyber-cyan font-bold block mb-0.5">TECHNICAL DEFINITION:</span>
                              {faq.definition}
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-800">
                            {faq.tip && (
                              <span className="text-[10px] font-mono text-emerald-400/90 flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>{faq.tip}</span>
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSend(`Can you explain in detail: "${faq.question}"?`);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-cyan/15 hover:bg-cyber-cyan text-cyber-cyan hover:text-slate-950 border border-cyber-cyan/35 text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ml-auto shadow-[0_0_10px_rgba(0,229,255,0.1)] hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                            >
                              <Zap className="w-3 h-3" />
                              <span>Ask Auditor in Chat</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>

    {/* Evaluation Blueprint Terminal Launcher - Security & Risk Assessment CTA */}
    {onLaunchProEvaluation && (
      <div className="my-6 p-4 sm:p-6 bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950 border border-purple-500/30 rounded-2xl shadow-xl max-w-2xl mx-auto flex flex-col items-center text-center gap-4 sm:gap-5 w-full">
        <div className="flex flex-col items-center space-y-2 max-w-xl w-full">
          <div className="flex items-center gap-2 justify-center">
            <Cpu className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-widest">
              Evaluation Blueprint Terminal
            </span>
          </div>
          <h4 className="font-display font-black text-sm sm:text-base md:text-lg text-slate-100 leading-snug px-2">
            Run Live AVF Security & Risk Assessments for Crypto Assets
          </h4>
          <p className="text-[11px] sm:text-xs text-slate-400 font-mono leading-relaxed px-2">
            Launch an automated diagnostic evaluation with security findings, risk analysis, and actionable remediation recommendations.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 w-full max-w-md">
          <button
            onClick={onLaunchProEvaluation}
            type="button"
            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-cyan-400 hover:from-purple-500 hover:to-cyan-300 text-slate-950 font-display font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.35)] hover:shadow-[0_0_28px_rgba(0,229,255,0.5)] flex items-center justify-center gap-2 border border-cyan-300/40 whitespace-nowrap"
          >
            <Crown className="w-4 h-4 text-slate-950 fill-slate-950 shrink-0" />
            <span className="truncate">LAUNCH SECURITY & RISK ASSESSMENT ›</span>
          </button>
        </div>
      </div>
    )}
    </div>
  );
}
