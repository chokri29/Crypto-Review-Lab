/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
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
  Radio
} from 'lucide-react';
import { ChatMessage } from '../types';

const AUDITOR_SUGGESTIONS = [
  'What are common red flags in anonymous team launches?',
  'Explain how a Flash Loan Attack exploits price decentralization.',
  'What security dangers are associated with upgradable proxies?',
  'How do I audit if a liquity pool is truly locked?',
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

export default function AuditorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickerItems, setTickerItems] = useState<TickerItem[]>(FALLBACK_TICKER_ITEMS);

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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/[0.03] rounded-full blur-2xl"></div>
          
          <h2 className="font-sans font-semibold text-lg text-slate-100 mb-3 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Lab Auditor Console
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Consult the Security Lead of Crypto Review Lab. Ask hyper-critical, cold-hard questions regarding token contracts, governance consolidation, multisig locks, or auditing logic.
          </p>

          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Security Prompts</h3>
            <div className="flex flex-col gap-2">
              {AUDITOR_SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(sug)}
                  disabled={isSending}
                  className="w-full text-left bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer text-ellipsis overflow-hidden"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Clear chat command box */}
        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/20 text-xs text-slate-400 hover:text-rose-400 py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Format Session History</span>
          </button>
        )}
      </div>

      {/* Main chat window */}
      <div className="lg:col-span-8 flex flex-col h-[520px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Terminal Header */}
        <div className="bg-slate-950 px-3 sm:px-5 py-3 border-b border-slate-800/80 flex justify-between items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="hidden sm:inline-block w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500/40 shrink-0"></span>
            <span className="hidden sm:inline-block w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40 shrink-0"></span>
            <span className="hidden sm:inline-block w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 shrink-0"></span>
            <span className="text-[11px] sm:text-xs font-mono text-slate-400 truncate">AI Auditor Lab</span>
          </div>

          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 sm:px-2.5 py-0.5 rounded border border-emerald-500/20 shrink-0 whitespace-nowrap">
            <Cpu className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin shrink-0" style={{ animationDuration: '4s' }} />
            <span className="hidden sm:inline">ACTIVE SECURITY STREAM</span>
            <span className="inline sm:hidden">ACTIVE STREAM</span>
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
                      <p className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-200">{msg.content}</p>
                    ) : (
                      <div className="prose prose-invert prose-xs max-w-none">
                        {formatAuditorText(msg.content)}
                      </div>
                    )}
                    <span className="block text-[9px] font-mono text-slate-600 text-right mt-1.5 uppercase tracking-wider">{msg.timestamp}</span>
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col relative overflow-hidden mt-5">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.02] rounded-full blur-3xl"></div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-800/80 pb-3">
        <div>
          <h2 className="font-sans font-semibold text-lg text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Recent Audit Verdicts
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
            Programmatic security ratings and risk evaluations compiled in real-time. Click any past verdict to query the Security Lead for a deeper synthesis.
          </p>
        </div>
        <span className="self-start sm:self-center text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-widest animate-pulse whitespace-nowrap">
          LIVE STREAM
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {PAST_VERDICTS.map((v) => (
          <button 
            key={v.id}
            onClick={() => handleSend(`Analyze the audit report for ${v.project} (${v.symbol}) and explain its "${v.message}" verdict.`)}
            disabled={isSending}
            type="button"
            className="w-full text-left bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl transition-all duration-150 cursor-pointer flex flex-col gap-1.5 disabled:opacity-60"
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
                <span className="font-semibold text-slate-200 truncate text-xs">
                  {v.project} <span className="text-slate-500 font-mono text-[9px] font-normal ml-0.5">{v.symbol}</span>
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
    </div>
  );
}
