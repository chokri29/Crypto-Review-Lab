/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  X,
  Calendar, 
  User, 
  ChevronLeft, 
  ChevronRight,
  Home,
  AlertTriangle, 
  CheckCircle, 
  Star, 
  ArrowRight,
  Filter,
  Flame,
  Clock,
  Share2,
  Copy,
  Check,
  Link2,
  ShieldCheck,
  AlertCircle,
  Terminal,
  Sparkles,
  RefreshCw,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Archive,
  Crown,
  Zap,
  Cpu,
  Play,
  Pause,
  Pin,
  Layers,
  Activity,
  Building2,
  HardDrive,
  Code,
  Bell,
  BellRing
} from 'lucide-react';

// All 9 standardized categories + All options with icons and badges matching ReviewLab style
const CATEGORY_OPTIONS = [
  { value: 'All', label: 'All Categories', badge: 'All Audit Reports', icon: BookOpen, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  { value: 'Layer 1 Blockchain', label: 'Layer 1 Blockchain', badge: 'L1 Blockchain', icon: Layers, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  { value: 'Layer 2 / Scaling', label: 'Layer 2 / Scaling', badge: 'L2 / Rollups', icon: Zap, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { value: 'DeFi Protocol (AMM / Lending)', label: 'DeFi Protocol (AMM / Lending)', badge: 'DeFi & Vaults', icon: Activity, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'RWA (Tokenization / TradFi Bridge)', label: 'RWA (Tokenization / TradFi Bridge)', badge: 'RWA & TradFi', icon: Building2, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { value: 'DePIN (Compute / Storage / Wireless)', label: 'DePIN (Compute / Storage / Wireless)', badge: 'DePIN & Compute', icon: HardDrive, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
  { value: 'Privacy / Cryptographic (FHE / ZK / MPC)', label: 'Privacy / Cryptographic (FHE / ZK / MPC)', badge: 'FHE & Zero-Knowledge', icon: ShieldCheck, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { value: 'Infrastructure (Oracle / Bridge)', label: 'Infrastructure (Oracle / Bridge)', badge: 'Oracles & Bridges', icon: Code, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  { value: 'Memecoin / Speculative', label: 'Memecoin / Speculative', badge: 'Memes & Speculative', icon: Flame, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  { value: 'Specialized / Experimental', label: 'Specialized / Experimental', badge: 'Move/Rust & Experimental', icon: Cpu, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
];
import { CryptoReview, RiskLevel } from '../types';
import { getCoinLogoUrl } from '../utils/coinLogos';
import { calculateBlueprintScore } from '../services/EvaluationBlueprint';
import { ProTierBadge } from './ProTierBadge';
import { ComparisonReportView } from './ComparisonReportView';
import AIMarketSummary from './AIMarketSummary';
import { getMetricColor } from '../utils/metricColors';
import MajorEventsAlertBox from './MajorEventsAlertBox';
import { TiltCard } from './TiltCard';
import MarketMetricsTable from './MarketMetricsTable';
import CryptoPriceChart from './CryptoPriceChart';
import { PromoteCanonicalModal } from './PromoteCanonicalModal';

interface BlogPreviewerProps {
  reviews: CryptoReview[];
  selectedReviewId?: string | null;
  setSelectedReviewId?: (id: string | null) => void;
  setActiveTab?: (tab: 'lab' | 'blog' | 'chat' | 'academy' | 'auditor' | 'orders') => void;
  headerSearchQuery?: string;
  setHeaderSearchQuery?: (query: string) => void;
  onOpenCoinGeckoModal?: () => void;
  onSyncCoinGecko?: () => void;
  isSyncingCoinGecko?: boolean;
  onLaunchProEvaluation?: (prefill?: { name?: string; symbol?: string; category?: string; focusArea?: string }) => void;
  onLaunchRegularEvaluation?: (prefill?: { name?: string; symbol?: string; category?: string; focusArea?: string }) => void;
}

export default function BlogPreviewer({ 
  reviews, 
  selectedReviewId, 
  setSelectedReviewId, 
  setActiveTab, 
  headerSearchQuery, 
  setHeaderSearchQuery,
  onOpenCoinGeckoModal,
  onSyncCoinGecko,
  isSyncingCoinGecko,
  onLaunchProEvaluation,
  onLaunchRegularEvaluation
}: BlogPreviewerProps) {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = headerSearchQuery !== undefined ? headerSearchQuery : internalSearchQuery;
  const setSearchQuery = (q: string) => {
    if (setHeaderSearchQuery) {
      setHeaderSearchQuery(q);
    }
    setInternalSearchQuery(q);
  };
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  const [isArchiveDropdownOpen, setIsArchiveDropdownOpen] = useState(false);
  const [isCustomSelectOpen, setIsCustomSelectOpen] = useState(false);
  const [selectedArchiveTitle, setSelectedArchiveTitle] = useState('');
  const [showSyncToast, setShowSyncToast] = useState(false);
  const [localActiveReviewId, setLocalActiveReviewId] = useState<string | null>(null);

  // Watchlist state initialized from localStorage
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('crl_watchlist');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load watchlist:', e);
    }
    return [];
  });

  const toggleWatchlist = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWatchlist((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('crl_watchlist', JSON.stringify(updated));
        }
      } catch (err) {
        console.warn('Failed to save watchlist:', err);
      }
      return updated;
    });
  };

  const clearWatchlist = () => {
    setWatchlist([]);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('crl_watchlist');
      }
    } catch (err) {
      console.warn('Failed to clear watchlist:', err);
    }
  };

  const watchlistReviews = reviews.filter((r) => watchlist.includes(r.id));

  // Notified projects state initialized from localStorage
  const [notifiedProjects, setNotifiedProjects] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('crl_notified_projects');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load notified projects:', e);
    }
    return [];
  });

  const toggleNotification = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof window !== 'undefined' && window.Notification && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    setNotifiedProjects((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('crl_notified_projects', JSON.stringify(updated));
        }
      } catch (err) {
        console.warn('Failed to save notified projects:', err);
      }
      return updated;
    });
  };

  const [isAdminMaster] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('crl_admin_authenticated') === 'true';
      }
      return false;
    } catch {
      return false;
    }
  });
  const [showPromoteModal, setShowPromoteModal] = useState<boolean>(false);

  const handleSyncClick = () => {
    if (onSyncCoinGecko) {
      onSyncCoinGecko();
      setShowSyncToast(true);
      setTimeout(() => setShowSyncToast(false), 3000);
    }
  };
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Search Focus & Click Outside Listener
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const selectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (selectDropdownRef.current && !selectDropdownRef.current.contains(event.target as Node)) {
        setIsCustomSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getGradeBadgeStyles = (grade: string, score: number) => {
    const g = (grade || '').toUpperCase();
    if (g.includes('AAA') || g.includes('AA') || g.includes('A+') || score >= 90) {
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/40',
        shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.25)]',
      };
    }
    if (g.includes('A') || score >= 80) {
      return {
        bg: 'bg-cyber-cyan/15',
        text: 'text-cyber-cyan',
        border: 'border-cyber-cyan/40',
        shadow: 'shadow-[0_0_10px_rgba(0,229,255,0.25)]',
      };
    }
    if (g.includes('BBB') || g.includes('BB') || g.includes('B') || score >= 70) {
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-400',
        border: 'border-amber-500/40',
        shadow: 'shadow-[0_0_10px_rgba(245,158,11,0.25)]',
      };
    }
    return {
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/40',
      shadow: 'shadow-[0_0_10px_rgba(244,63,94,0.25)]',
    };
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);
    if (parts.length === 1) return text;
    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark
              key={index}
              className="bg-cyber-cyan/25 text-cyber-cyan font-bold px-0.5 rounded"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery]);

  const activeReviewId = selectedReviewId !== undefined ? selectedReviewId : localActiveReviewId;
  const setActiveReviewId = (id: string | null) => {
    if (setSelectedReviewId) {
      setSelectedReviewId(id);
    } else {
      setLocalActiveReviewId(id);
    }

    try {
      const url = new URL(window.location.href);
      if (id) {
        url.searchParams.set('review', id);
      } else {
        url.searchParams.delete('review');
        url.searchParams.delete('reviewId');
        url.searchParams.delete('article');
        url.searchParams.delete('id');
      }
      if (!url.searchParams.has('tab')) {
        url.searchParams.set('tab', 'blog');
      }
      window.history.pushState({ review: id }, '', url.toString());
    } catch (e) {
      console.warn('Failed to update URL parameters:', e);
    }
  };

  // Track page / article scroll progress percentage
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentScroll = window.scrollY;
        const progress = Math.min(100, Math.max(0, (currentScroll / totalHeight) * 100));
        setScrollProgress(progress);
      } else {
        setScrollProgress(0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeReviewId]);

  const handleBackToList = () => {
    setActiveReviewId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [copied, setCopied] = useState(false);

  const activeReview = reviews.find((r) => 
    r.id === activeReviewId || 
    r.coingeckoId === activeReviewId || 
    r.id === `cg-${activeReviewId}` ||
    `cg-${r.coingeckoId}` === activeReviewId ||
    (activeReviewId && r.id.toLowerCase() === activeReviewId.toLowerCase()) ||
    (activeReviewId && r.coingeckoId && r.coingeckoId.toLowerCase() === activeReviewId.replace(/^cg-/, '').toLowerCase())
  );

  const getPublicShareUrl = () => {
    const targetId = activeReview?.id || activeReviewId;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'blog');
      if (targetId) {
        url.searchParams.set('review', targetId);
      } else {
        url.searchParams.delete('review');
      }
      return url.toString();
    }
    if (targetId) {
      return `https://www.cryptoreviewlab.com/?tab=blog&review=${encodeURIComponent(targetId)}`;
    }
    return `https://www.cryptoreviewlab.com/?tab=blog`;
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.warn('Fallback copy failed:', err);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = getPublicShareUrl();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          })
          .catch(() => {
            fallbackCopyTextToClipboard(shareUrl);
          });
      } else {
        fallbackCopyTextToClipboard(shareUrl);
      }
    } catch (e) {
      fallbackCopyTextToClipboard(shareUrl);
    }
  };

  const handleShareTwitter = () => {
    const shareUrl = getPublicShareUrl();
    const text = activeReview 
      ? `Read the cryptographic audit report for ${activeReview.name} (${activeReview.symbol}) - Grade: ${activeReview.grade} on Crypto Review Lab!`
      : `Check out the cryptographic project audit reports on Crypto Review Lab!`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareFacebook = () => {
    const shareUrl = getPublicShareUrl();
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Derive categories from standard configuration list
  const categories = CATEGORY_OPTIONS.map((opt) => opt.value);
  const selectedCategoryObj = CATEGORY_OPTIONS.find((opt) => opt.value === selectedCategory) || CATEGORY_OPTIONS[0];
  const SelectedIconComp = selectedCategoryObj.icon;

  // Predictive matching categories based on search query
  const matchingCategories = searchQuery.trim()
    ? categories.filter((c) => c !== 'All' && c.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Live search result candidates for dropdown
  const liveSearchResults = searchQuery.trim()
    ? reviews.filter((r) => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.verdict && r.verdict.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const filteredReviews = reviews.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
                          r.name.toLowerCase().includes(q) || 
                          r.symbol.toLowerCase().includes(q) ||
                          r.category.toLowerCase().includes(q) ||
                          (r.verdict && r.verdict.toLowerCase().includes(q));
    const matchesCategory = selectedCategory === 'All' || 
                            r.category === selectedCategory ||
                            r.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
                            selectedCategory.toLowerCase().includes(r.category.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  // State & Auto-rotation timer for "LATEST AUDIT REVIEWS"
  const [latestPage, setLatestPage] = useState(0);
  const [isLatestAutoPlay, setIsLatestAutoPlay] = useState(true);
  const [isLatestHovered, setIsLatestHovered] = useState(false);

  const itemsPerPage = 4;
  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);

  useEffect(() => {
    setLatestPage(0);
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    if (!isLatestAutoPlay || isLatestHovered || totalPages <= 1) return;
    const timer = setInterval(() => {
      setLatestPage((prev) => (prev + 1) % totalPages);
    }, 6000);
    return () => clearInterval(timer);
  }, [isLatestAutoPlay, isLatestHovered, totalPages]);

  const currentLatestPage = totalPages > 0 ? latestPage % totalPages : 0;
  const currentLatestReviews = filteredReviews.slice(
    currentLatestPage * itemsPerPage,
    (currentLatestPage + 1) * itemsPerPage
  );

  // Framer motion variants for staggered card entrance animations
  const staggerContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
  };

  const cardEntranceVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.96 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        duration: 0.38,
        ease: 'easeOut',
      }
    },
  };

  const getRiskStyles = (risk: RiskLevel) => {
    switch (risk) {
      case 'Low': return { text: 'text-cyber-green', bg: 'bg-cyber-green/5 border-cyber-green/20' };
      case 'Medium': return { text: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/20' };
      case 'High': return { text: 'text-cyber-orange', bg: 'bg-cyber-orange/5 border-cyber-orange/20' };
      case 'Critical': return { text: 'text-rose-400', bg: 'bg-rose-500/5 border-rose-500/20 animate-pulse' };
      default: return { text: 'text-cyber-text-secondary', bg: 'bg-cyber-text-secondary/5 border-cyber-text-muted/30' };
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade === 'AAA') {
      return 'text-cyber-cyan bg-cyber-cyan/10 border-cyber-cyan shadow-[0_0_12px_rgba(0,229,255,0.25)] font-black';
    }
    if (grade === 'AA') {
      return 'text-cyber-green bg-cyber-green/10 border-cyber-green/50 shadow-[0_0_10px_rgba(0,255,136,0.15)] font-extrabold';
    }
    if (grade.charAt(0) === 'A') {
      return 'text-cyber-cyan/95 bg-cyber-cyan/5 border-cyber-cyan/30 font-bold';
    }
    if (grade.charAt(0) === 'B') {
      return 'text-cyber-text-primary bg-cyber-text-secondary/10 border-cyber-text-muted/40 font-semibold';
    }
    if (grade.charAt(0) === 'C') {
      return 'text-cyber-orange bg-cyber-orange/10 border-cyber-orange/30 font-semibold';
    }
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30 font-bold';
  };

  const renderContentMarkdown = (text: string) => {
    if (!text) return null;

    // Sanitize, strip redundant summary headers (since shown visually at top), and normalize terminology
    const sanitizedText = text
      .replace(/### Real-Time Dual Market Sync[\s\S]*?(?=### |$)/gi, '')
      .replace(/### Locked Evaluation Blueprint Audit Results[\s\S]*?(?=### |$)/gi, '')
      .replace(/CoinGecko Live Protocol Overview/gi, 'CoinGecko + CMC Live Protocol Overview')
      .replace(/Real-Time CoinGecko Market Metrics/gi, 'Real-Time CoinGecko + CMC Market Metrics')
      .replace(/tracked directly via the CoinGecko API\.?/gi, 'tracked directly via the CoinGecko & CoinMarketCap (CMC) APIs.')
      .replace(/tracked directly via the CoinGecko API/gi, 'tracked directly via the CoinGecko & CoinMarketCap (CMC) APIs')
      .replace(/CoinGecko quantitative parameters/gi, 'CoinGecko + CMC quantitative parameters')
      .replace(/regular CoinGecko data refreshes/gi, 'regular CoinGecko + CMC dual data refreshes')
      .replace(/CoinGecko data refreshes/gi, 'CoinGecko + CMC dual data refreshes')
      .replace(/CoinGecko & Blueprint Engine/gi, 'CoinGecko + CMC Dual Engine');

    return sanitizedText.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      
      // Secondary Headers
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="font-display font-bold text-lg text-cyber-text-primary mt-6 mb-3 tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-4 bg-cyber-cyan rounded-full"></span>
            {trimmed.replace('### ', '')}
          </h3>
        );
      }
      
      // Bullets with potential labels
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const bulletText = trimmed.substring(2);
        const boldMatch = bulletText.match(/^\*\*(.*?)\*\*(.*)/);
        
        if (boldMatch) {
          return (
            <li key={idx} className="text-cyber-text-secondary ml-5 mb-1.5 list-disc pl-1 leading-relaxed text-xs">
              <strong className="text-cyber-cyan font-medium">{boldMatch[1]}</strong>
              {boldMatch[2]}
            </li>
          );
        }

        return (
          <li key={idx} className="text-cyber-text-secondary ml-5 mb-1.5 list-disc pl-1 leading-relaxed text-xs">
            {bulletText}
          </li>
        );
      }

      if (trimmed === '') return <div key={idx} className="h-3.5"></div>;

      // Handle bold blocks inline
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(trimmed)) {
        const segments = trimmed.split(boldRegex);
        return (
          <p key={idx} className="text-cyber-text-secondary leading-relaxed mb-3.5 text-xs">
            {segments.map((seg, sIdx) => sIdx % 2 === 1 ? <strong key={sIdx} className="text-cyber-text-primary font-medium">{seg}</strong> : seg)}
          </p>
        );
      }

      return (
        <p key={idx} className="text-cyber-text-secondary leading-relaxed mb-4 text-sm md:text-base">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div id="blog-previewer-view" className="w-full py-2">
      {/* Top Viewport Article Reading Progress Bar */}
      <div 
        aria-hidden="true" 
        className="fixed top-0 left-0 right-0 h-1 z-[100] pointer-events-none bg-cyber-bg-primary/40 backdrop-blur-xs"
      >
        <div 
          className="h-full bg-gradient-to-r from-cyber-cyan via-emerald-400 to-cyber-cyan transition-all duration-150 ease-out shadow-[0_0_12px_rgba(0,229,255,0.85)]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      {/* Market Intelligence Hero Heading */}
      <div className="mb-6 space-y-2.5 sm:space-y-3">
        <div>
          <span className="inline-flex items-center gap-2 font-orbitron font-bold text-[8px] sm:text-[9.5px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/40 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full uppercase tracking-[1.5px] sm:tracking-[2px] shadow-[0_0_12px_rgba(0,229,255,0.18)] max-w-full truncate">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-400 animate-ping shrink-0"></span>
            Live Crypto Markets Stream Active
          </span>
        </div>
        <h1 className="font-orbitron font-extrabold text-[21px] sm:text-2xl md:text-3xl lg:text-4xl text-slate-100 tracking-tight sm:tracking-wide leading-tight pt-1 break-words">
          Master the{' '}
          <span className="font-orbitron font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyber-cyan to-purple-400 drop-shadow-[0_0_22px_rgba(0,229,255,0.5)] inline-block">
            Decentralized
          </span>{' '}
          Economy
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed max-w-3xl">
          Real-time global crypto market surveillance, algorithmic cross-chain metrics, and dual-oracle intelligence powered by the AVF Engine.
        </p>
      </div>

      {/* AI Market Summary Widget at top before search bar */}
      <div className="mb-8 sm:mb-10 md:mb-12">
        <AIMarketSummary reviews={reviews} />
      </div>

      {/* Top Header Navigation Bar with Breadcrumbs & Search */}
      <div className="mb-4 bg-cyber-bg-card/70 border border-cyber-cyan/25 rounded-2xl p-2.5 md:px-4 md:py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        {/* Breadcrumb Navigation Trail */}
        <nav aria-label="Breadcrumb Trail" className="flex items-center gap-1.5 text-xs font-mono text-cyber-text-secondary overflow-x-auto whitespace-nowrap scrollbar-none py-1">
          <button
            onClick={() => {
              if (setActiveTab) {
                setActiveTab('lab');
              } else {
                handleBackToList();
              }
            }}
            className="flex items-center gap-1.5 hover:text-cyber-cyan text-cyber-text-secondary transition-colors cursor-pointer font-medium"
            title="Navigate to Home / Review Lab"
          >
            <Home className="w-3.5 h-3.5 text-cyber-cyan" />
            <span>Home</span>
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-cyber-text-muted shrink-0" />

          {activeReview ? (
            <button
              onClick={handleBackToList}
              className="hover:text-cyber-cyan text-cyber-text-secondary transition-colors cursor-pointer flex items-center gap-1.5 font-medium"
              title="Return to Review List"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyber-cyan/80" />
              <span>Market Intelligence</span>
            </button>
          ) : (
            <span className="text-cyber-cyan font-bold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>Market Intelligence</span>
            </span>
          )}

          {activeReview && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-cyber-text-muted shrink-0" />
              <span className="text-cyber-cyan font-bold truncate max-w-[120px] sm:max-w-xs md:max-w-sm flex items-center gap-1">
                <span>{activeReview.name}</span>
                <span className="text-cyber-text-muted text-[10px] font-normal">({activeReview.symbol})</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-md bg-cyber-cyan/15 border border-cyber-cyan/35 text-[9px] font-mono font-bold text-cyber-cyan shrink-0 shadow-[0_0_8px_rgba(0,229,255,0.2)]">
                {Math.round(scrollProgress)}% Read
              </span>
            </>
          )}
        </nav>

        {/* Top Search Input Bar with Interactive Live Search Overlay */}
        <div ref={searchContainerRef} className="relative w-full sm:w-72 md:w-96 shrink-0">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-cyber-cyan absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-focus-within:scale-110" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchFocused(true);
                if (activeReview) {
                  setActiveReviewId(null);
                }
              }}
              placeholder="Search project name, symbol, or category..."
              className="w-full bg-cyber-bg-primary/95 hover:bg-cyber-bg-primary border border-cyber-cyan/35 focus:border-cyber-cyan rounded-xl pl-9 pr-8 py-2 text-xs text-cyber-text-primary placeholder:text-cyber-text-muted focus:outline-none focus:shadow-[0_0_18px_rgba(0,229,255,0.35)] transition-all font-mono"
              aria-label="Search audited projects by name, symbol, or category"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchFocused(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cyber-text-muted hover:text-cyber-cyan p-1 cursor-pointer transition-colors"
                aria-label="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden md:inline-flex items-center gap-0.5 absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] text-cyber-text-muted/60 bg-cyber-cyan/5 border border-cyber-cyan/15 px-1.5 py-0.5 rounded pointer-events-none">
                ⌘K
              </span>
            )}
          </div>

          {/* Clean Minimal Live Search Results Dropdown Overlay */}
          {isSearchFocused && searchQuery.trim().length > 0 && (
            <div className="absolute top-full right-0 left-0 sm:left-auto sm:w-[360px] md:w-[400px] mt-2 bg-cyber-bg-card border border-cyber-cyan/30 rounded-xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden max-h-[380px] overflow-y-auto animate-fade-in">
              {/* Simple Search Header */}
              <div className="px-3 py-2 bg-cyber-bg-primary/90 flex items-center justify-between text-[10px] font-mono text-cyber-text-muted uppercase border-b border-cyber-cyan/15">
                <span className="font-bold text-cyber-cyan">RESULTS ({liveSearchResults.length})</span>
                <span className="text-[9px]">ESC TO CLOSE</span>
              </div>

              {liveSearchResults.length > 0 ? (
                <div className="divide-y divide-cyber-cyan/10">
                  {liveSearchResults.map((review) => (
                    <button
                      key={review.id}
                      onClick={() => {
                        setActiveReviewId(review.id);
                        setIsSearchFocused(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-cyber-cyan/10 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                    >
                      {/* Name, Symbol & Category */}
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-display font-bold text-xs text-cyber-text-primary group-hover:text-cyber-cyan transition-colors truncate">
                            {highlightMatch(review.name, searchQuery)}
                          </span>
                          <span className="font-mono text-[10px] text-cyber-text-muted font-bold shrink-0">
                            ({highlightMatch(review.symbol, searchQuery)})
                          </span>
                        </div>
                        <span className="font-mono text-[9px] text-cyber-text-muted mt-0.5 truncate">
                          {highlightMatch(review.category, searchQuery)}
                        </span>
                      </div>

                      {/* Grade Badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-bold text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/25 px-2 py-0.5 rounded-md">
                          {highlightMatch(review.grade, searchQuery)}
                        </span>
                        <span className="font-mono text-[10px] text-cyber-text-muted">
                          {review.overallScore}/100
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center font-mono text-xs text-cyber-text-muted space-y-2">
                  <p>No projects found matching <span className="text-cyber-cyan font-bold">"{searchQuery}"</span></p>
                  <p className="text-[10px] text-cyber-text-muted/70">
                    Try searching ticker symbol (e.g. BTC, ETH, SOL, HYPE) or category (DeFi, L1)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!activeReview ? (
        <div className="space-y-4 md:space-y-5">
          {/* Header & Tagline */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-cyber-cyan/15 pb-4 md:pb-5">
            <div className="space-y-1">
              <h2 className="font-display font-bold text-xl md:text-2xl text-cyber-text-primary tracking-wider flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyber-cyan" />
                PROJECTS EVALUATION REGISTRY
              </h2>
              <p className="text-xs md:text-sm text-cyber-text-secondary max-w-xl leading-relaxed">
                Comprehensive smart contract, community metrics, and cryptographic architecture audits designed for real-time portfolio reviews.
              </p>
            </div>

            {/* CoinGecko + CMC Live Dual Controls & Quick Stats */}
            <div className="flex flex-wrap items-center gap-2">
              {onOpenCoinGeckoModal && (
                <button
                  type="button"
                  onClick={onOpenCoinGeckoModal}
                  className="relative group overflow-hidden px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 border border-cyber-cyan/50 hover:border-cyber-cyan text-cyber-cyan hover:text-white font-display text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all duration-300 shadow-[0_0_20px_rgba(0,229,255,0.2)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyber-cyan/0 via-cyber-cyan/20 to-cyber-cyan/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <div className="p-1 rounded-lg bg-cyber-cyan/15 border border-cyber-cyan/30 text-cyber-cyan group-hover:bg-cyber-cyan group-hover:text-slate-950 transition-colors">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <span className="font-bold tracking-wider">Switch / Import via CoinGecko + CMC</span>
                  <span className="text-[9px] font-mono font-extrabold text-slate-950 bg-cyber-cyan px-1.5 py-0.5 rounded shadow-sm">
                    DUAL API LIVE
                  </span>
                </button>
              )}

              {onSyncCoinGecko && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncClick}
                    disabled={isSyncingCoinGecko}
                    className="px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-cyber-cyan/30 text-slate-300 hover:text-cyber-cyan font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                    title="Sync all live market prices from CoinGecko + CMC Dual Engine"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-cyber-cyan ${isSyncingCoinGecko ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{isSyncingCoinGecko ? 'Dual Syncing...' : 'Sync Prices (CG + CMC)'}</span>
                  </button>
                  {showSyncToast && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg animate-fade-in">
                      ✓ CG + CMC Synced!
                    </span>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setInternalSearchQuery('');
                  if (setHeaderSearchQuery) setHeaderSearchQuery('');
                  setLocalActiveReviewId(null);
                  if (setSelectedReviewId) setSelectedReviewId(null);
                }}
                className="flex items-center gap-2 text-xs font-mono text-cyber-text-secondary hover:text-cyber-cyan uppercase bg-cyber-bg-secondary hover:bg-cyber-cyan/10 border border-cyber-cyan/15 hover:border-cyber-cyan/40 rounded-xl px-3 py-2 transition-all cursor-pointer shadow-sm group"
                title="Reset filters and view all audited projects"
              >
                <Clock className="w-3.5 h-3.5 text-cyber-cyan group-hover:scale-110 transition-transform" />
                <span className="font-bold">{reviews.length} Audited Projects</span>
              </button>
            </div>
          </div>

          {/* Category Filter Bar */}
          <div className="bg-cyber-bg-card border border-cyber-cyan/15 rounded-2xl p-3 md:p-3.5 shadow-lg relative">
            {/* Mobile View Layout (< sm) */}
            <div className="sm:hidden space-y-2.5" ref={categoryDropdownRef}>
              <div className="flex items-center justify-between gap-2 text-xs font-mono text-cyber-text-muted uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-cyber-cyan" />
                  <span className="font-bold text-slate-300">Category Filter</span>
                </div>
                <span className="text-[10px] font-bold text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/30 px-2.5 py-0.5 rounded-full font-mono">
                  {selectedCategory === 'All'
                    ? `${reviews.length} Audited`
                    : `${reviews.filter(r => r.category === selectedCategory || r.category.toLowerCase().includes(selectedCategory.toLowerCase()) || selectedCategory.toLowerCase().includes(r.category.toLowerCase())).length} Audited`}
                </span>
              </div>

              {/* Custom Cyber Dropdown Button (Matching Image 2 Style) */}
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="w-full flex items-center justify-between gap-3 bg-slate-950 text-slate-100 font-sans text-xs font-bold px-3 py-2.5 rounded-xl border border-cyber-cyan/40 hover:border-cyber-cyan shadow-[0_0_15px_rgba(0,229,255,0.18)] transition-all cursor-pointer"
                  aria-haspopup="listbox"
                  aria-expanded={isCategoryDropdownOpen}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-1">
                    <div className={`p-1.5 rounded-lg border shrink-0 ${selectedCategoryObj.color}`}>
                      <SelectedIconComp className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="truncate text-xs font-semibold text-slate-100">{selectedCategoryObj.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono truncate">{selectedCategoryObj.badge}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40 font-bold">
                      {selectedCategory === 'All'
                        ? reviews.length
                        : reviews.filter(r => r.category === selectedCategory || r.category.toLowerCase().includes(selectedCategory.toLowerCase()) || selectedCategory.toLowerCase().includes(r.category.toLowerCase())).length}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-cyber-cyan shrink-0 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                <AnimatePresence>
                  {isCategoryDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute left-0 right-0 top-full mt-2 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_25px_rgba(0,229,255,0.2)] overflow-hidden z-50 py-1.5 divide-y divide-slate-800/80 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-cyber-cyan/30"
                      role="listbox"
                    >
                      {CATEGORY_OPTIONS.map((opt) => {
                        const count = opt.value === 'All'
                          ? reviews.length
                          : reviews.filter(r => r.category === opt.value || r.category.toLowerCase().includes(opt.value.toLowerCase()) || opt.value.toLowerCase().includes(r.category.toLowerCase())).length;
                        const isSelected = selectedCategory === opt.value;
                        const IconComp = opt.icon;

                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(opt.value);
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/10 text-emerald-300 font-semibold border-l-4 border-emerald-400'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                            }`}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <div className={`p-1.5 rounded-lg border shrink-0 ${opt.color}`}>
                                <IconComp className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-sans text-xs font-medium truncate">{opt.label}</span>
                                <span className="text-[10px] text-slate-400 font-mono truncate">{opt.badge}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                                isSelected
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-slate-950/80 text-slate-400 border-white/10'
                              }`}>
                                {count}
                              </span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Desktop Horizontal Pill Bar (visible on sm+) */}
            <div className="hidden sm:flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono text-cyber-text-muted shrink-0 uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5 text-cyber-cyan" />
                <span>Category Filter:</span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-display whitespace-nowrap transition-all uppercase tracking-wider cursor-pointer ${
                      selectedCategory === cat 
                        ? 'bg-cyber-cyan text-cyber-bg-primary shadow-[0_0_12px_rgba(0,229,255,0.25)] font-bold' 
                        : 'bg-cyber-bg-primary text-cyber-text-secondary hover:text-cyber-text-primary border border-cyber-cyan/15 hover:border-cyber-cyan/30'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid Layout of blogs split into Latest Posts and More Articles with Sidebar */}
          {isLoading ? (
            <div className="space-y-12">
              {/* LATEST POSTS SKELETON GRID */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-3 bg-cyber-cyan/25 rounded w-44 animate-pulse"></div>
                  <div className="h-px bg-cyber-cyan/20 flex-1"></div>
                  <div className="h-5 w-16 bg-cyber-cyan/15 rounded animate-pulse"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                  {[1, 2, 3].map((idx) => (
                    <div key={idx} className="bg-cyber-bg-card/75 border border-cyber-cyan/10 rounded-xl p-4 md:p-4.5 shadow-md flex flex-col justify-between h-48 animate-pulse">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-2 w-2/3">
                            <div className="h-2.5 bg-cyber-cyan/20 rounded-full w-1/3"></div>
                            <div className="h-5 bg-cyber-cyan/15 rounded-lg w-4/5"></div>
                          </div>
                          <div className="h-6 w-10 bg-cyber-cyan/20 rounded-lg"></div>
                        </div>
                        <div className="space-y-1.5 pt-1">
                          <div className="h-3 bg-cyber-text-muted/15 rounded w-full"></div>
                          <div className="h-3 bg-cyber-text-muted/15 rounded w-4/5"></div>
                        </div>
                      </div>
                      <div className="pt-3 mt-3 border-t border-cyber-cyan/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-16 bg-cyber-cyan/15 rounded"></div>
                          <div className="h-3 w-24 bg-cyber-text-muted/15 rounded"></div>
                        </div>
                        <div className="h-3 w-20 bg-cyber-cyan/20 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ARCHIVES SKELETON LIST */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-3 bg-cyber-cyan/20 rounded w-36 animate-pulse"></div>
                  <div className="h-px bg-cyber-cyan/10 flex-1"></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                  <div className="lg:col-span-2 space-y-4">
                    {[1, 2].map((idx) => (
                      <div key={idx} className="bg-cyber-bg-card/50 border border-cyber-cyan/10 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-stretch animate-pulse">
                        <div className="w-full sm:w-28 bg-cyber-bg-primary/40 border border-cyber-cyan/10 rounded-lg flex flex-col items-center justify-center shrink-0 p-3.5 space-y-2">
                          <div className="h-2 bg-cyber-text-muted/20 rounded w-12"></div>
                          <div className="h-6 bg-cyber-cyan/20 rounded-lg w-10"></div>
                          <div className="h-2.5 bg-cyber-cyan/15 rounded w-14"></div>
                        </div>
                        <div className="flex flex-col justify-between flex-1 space-y-3">
                          <div className="space-y-2">
                            <div className="h-2.5 bg-cyber-cyan/20 rounded w-20"></div>
                            <div className="h-4 bg-cyber-cyan/15 rounded w-3/4"></div>
                            <div className="h-3 bg-cyber-text-muted/15 rounded w-full"></div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-cyber-cyan/10">
                            <div className="h-3 w-28 bg-cyber-cyan/15 rounded"></div>
                            <div className="h-3 w-16 bg-cyber-cyan/20 rounded"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12 px-6 bg-cyber-bg-card/40 border border-dashed border-cyber-cyan/25 rounded-2xl max-w-xl mx-auto my-6 space-y-4 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan mx-auto flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display font-bold text-base text-cyber-text-primary uppercase tracking-wider">
                  No Matching Project Audits Found
                </h3>
                <p className="text-xs font-mono text-cyber-text-secondary leading-relaxed">
                  No project audit report matches your search parameters <span className="text-cyber-cyan font-bold">"{searchQuery || selectedCategory}"</span>.
                </p>
              </div>
              <div className="pt-3 border-t border-cyber-cyan/15 text-left space-y-2 text-xs font-mono">
                <span className="text-cyber-text-muted uppercase text-[10px] tracking-wider block font-bold">
                  💡 HELPFUL SUGGESTIONS:
                </span>
                <ul className="text-cyber-text-secondary space-y-1.5 pl-1">
                  <li className="flex items-center gap-1.5">
                    <span className="text-cyber-cyan font-bold">•</span>
                    <span>Search by ticker symbol (e.g. BTC, ETH, SOL, HYPE, LINK)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-cyber-cyan font-bold">•</span>
                    <span>Browse popular categories: Layer 1, DeFi, Layer 2, RWA, DePIN, AI, Prop Trading</span>
                  </li>
                </ul>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['All', 'Layer 1', 'DeFi', 'Layer 2', 'RWA', 'DePIN', 'AI', 'Prop Trading'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setSearchQuery('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-cyber-cyan/10 hover:bg-cyber-cyan/25 border border-cyber-cyan/30 text-[10px] font-mono text-cyber-cyan transition-colors cursor-pointer font-bold"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              {(searchQuery || selectedCategory !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="px-4 py-2 rounded-xl bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan/40 text-cyber-cyan font-mono text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset All Search Filters</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-10">
              {/* PINNED WATCHLIST SECTION (Pinned Favorite Projects) */}
              {watchlistReviews.length > 0 && (
                <div className="space-y-4 bg-gradient-to-r from-amber-950/25 via-slate-900/70 to-amber-950/25 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-[0_0_30px_rgba(251,191,36,0.15)] relative overflow-hidden animate-fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/25 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.25)]">
                        <Pin className="w-4 h-4 fill-amber-400" />
                      </div>
                      <h3 className="font-display text-xs font-black tracking-widest text-amber-400 uppercase flex items-center gap-2">
                        PINNED WATCHLIST
                      </h3>
                      <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                        {watchlistReviews.length} Pinned
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={clearWatchlist}
                      className="text-[10px] font-mono font-bold text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/25 hover:border-amber-500/50 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <X className="w-3 h-3" />
                      <span>Clear Watchlist</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {watchlistReviews.map((rev) => {
                      const riskStyles = getRiskStyles(rev.riskLevel);
                      return (
                        <motion.div
                          key={`watchlist-${rev.id}`}
                          whileHover={{ scale: 1.035, y: -4 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                          className="h-full"
                        >
                          <TiltCard className="h-full" scale={1.035} onClick={() => setActiveReviewId(rev.id)}>
                            <div className="bg-slate-900/90 border border-amber-500/35 hover:border-amber-400 hover:shadow-[0_16px_40px_rgba(251,191,36,0.28)] rounded-xl p-4 md:p-4.5 flex flex-col justify-between group cursor-pointer transition-all duration-300 h-full relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>

                              <div className="space-y-2.5">
                                {/* Card Header */}
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img
                                      src={getCoinLogoUrl(rev.symbol, rev.logoUrl, rev.coingeckoId)}
                                      alt={rev.name}
                                      className="w-8 h-8 rounded-xl border border-amber-500/40 object-contain bg-slate-950 p-1 shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                    <div className="space-y-0.5 text-left min-w-0">
                                      <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest block truncate">{rev.category}</span>
                                      <h3 className="font-display font-bold text-base text-cyber-text-primary group-hover:text-amber-400 transition-colors flex items-center gap-1.5 leading-tight truncate">
                                        {rev.name}
                                        <span className="text-xs font-mono text-cyber-text-secondary font-normal uppercase">({rev.symbol})</span>
                                      </h3>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {Boolean(rev.proBenchmarks || rev.auditSignature?.tier === 'pro') && (
                                      <ProTierBadge size="sm" />
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => toggleWatchlist(rev.id, e)}
                                      title="Unpin from Watchlist"
                                      className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.35)] hover:bg-amber-500/30 transition-all cursor-pointer"
                                    >
                                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    </button>

                                    <div className={`border rounded-lg px-2 py-0.5 text-center min-w-[36px] font-mono font-bold text-xs uppercase tracking-wide flex items-center justify-center ${getGradeColor(rev.grade)}`}>
                                      {rev.grade}
                                    </div>
                                  </div>
                                </div>

                                <p className="text-xs text-cyber-text-secondary leading-relaxed line-clamp-2 text-left">
                                  {rev.verdict}
                                </p>

                                {rev.livePrice !== undefined && (
                                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-amber-500/20 text-xs font-mono">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9.5px] text-amber-400 font-bold">LIVE $</span>
                                      <span className="font-bold text-white">
                                        ${rev.livePrice < 1 ? rev.livePrice.toFixed(4) : rev.livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                    {rev.liveChange24h !== undefined && (
                                      <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${rev.liveChange24h >= 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}`}>
                                        {rev.liveChange24h >= 0 ? '▲ +' : '▼ '}{rev.liveChange24h.toFixed(2)}%
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="pt-2.5 mt-3 border-t border-amber-500/20 flex items-center justify-between">
                                <span className={`border text-[9px] px-1.5 py-0.2 rounded font-mono uppercase tracking-wide ${riskStyles.bg} ${riskStyles.text}`}>
                                  {rev.riskLevel} RISK
                                </span>
                                <span className="text-[11px] font-display font-bold text-amber-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 uppercase tracking-wider">
                                  Audit Report
                                  <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                                </span>
                              </div>
                            </div>
                          </TiltCard>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LATEST POSTS GRID (Auto-Rotating Batches) */}
              <div 
                className="space-y-4"
                onMouseEnter={() => setIsLatestHovered(true)}
                onMouseLeave={() => setIsLatestHovered(false)}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyber-cyan/15 pb-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-xs font-black tracking-widest text-cyber-cyan uppercase flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-cyber-cyan animate-pulse" />
                      LATEST AUDIT REVIEWS
                    </h3>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyber-cyan/10 border border-cyber-cyan/30 px-2 py-0.5 rounded font-bold">
                      Batch {currentLatestPage + 1} of {totalPages || 1} ({filteredReviews.length} Total)
                    </span>
                  </div>

                  {/* Dynamic Rotation & Navigation Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsLatestAutoPlay(!isLatestAutoPlay)}
                      title={isLatestAutoPlay ? 'Pause Auto Rotation' : 'Resume Auto Rotation'}
                      className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-1 font-mono text-[10px] font-bold ${
                        isLatestAutoPlay 
                          ? 'bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]' 
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {isLatestAutoPlay ? (
                        <>
                          <Pause className="w-3 h-3 text-cyber-cyan" />
                          <span className="hidden sm:inline">LIVE ROTATING</span>
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
                      onClick={() => setLatestPage((prev) => (prev - 1 + (totalPages || 1)) % (totalPages || 1))}
                      disabled={totalPages <= 1}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-cyber-cyan/10 border border-slate-800 hover:border-cyber-cyan/40 text-slate-300 hover:text-cyber-cyan transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Previous Projects Batch"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setLatestPage((prev) => (prev + 1) % (totalPages || 1))}
                      disabled={totalPages <= 1}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-cyber-cyan/10 border border-slate-800 hover:border-cyber-cyan/40 text-slate-300 hover:text-cyber-cyan transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Next Projects Batch"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <motion.div 
                  variants={staggerContainerVariants}
                  initial="hidden"
                  animate="show"
                  key={`latest-grid-${currentLatestPage}-${selectedCategory}-${searchQuery}`}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-4"
                >
                  {currentLatestReviews.map((rev) => {
                    const riskStyles = getRiskStyles(rev.riskLevel);
                    const isPinned = watchlist.includes(rev.id);
                    return (
                      <motion.div 
                        key={rev.id} 
                        variants={cardEntranceVariants as any} 
                        whileHover={{ scale: 1.038, y: -5 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                        className="h-full"
                      >
                        <TiltCard className="h-full" scale={1.035} onClick={() => setActiveReviewId(rev.id)}>
                          <motion.div
                            layoutId={`review-card-${rev.id}`}
                            className={`bg-cyber-bg-card/75 border rounded-xl p-4 md:p-4.5 shadow-md flex flex-col justify-between group cursor-pointer transition-all duration-300 h-full ${
                              isPinned
                                ? 'border-amber-400/50 hover:border-amber-400 hover:shadow-[0_16px_40px_rgba(251,191,36,0.22)]'
                                : 'border-cyber-cyan/15 hover:border-cyber-cyan/60 hover:shadow-[0_16px_40px_rgba(0,229,255,0.22)] group-hover:bg-cyber-bg-card-hover'
                            }`}
                          >
                            <div className="space-y-2.5">
                              {/* Card Header */}
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img
                                    src={getCoinLogoUrl(rev.symbol, rev.logoUrl, rev.coingeckoId)}
                                    alt={rev.name}
                                    className="w-8 h-8 rounded-xl border border-cyber-cyan/30 object-contain bg-slate-950 p-1 shrink-0 shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                  <div className="space-y-0.5 text-left min-w-0">
                                    <span className="text-[9px] md:text-[10px] font-mono text-cyber-cyan uppercase tracking-widest block truncate">{rev.category}</span>
                                    <h3 className="font-display font-bold text-base md:text-md text-cyber-text-primary group-hover:text-cyber-cyan transition-colors flex items-center gap-1.5 leading-tight truncate">
                                      {rev.name}
                                      <span className="text-xs font-mono text-cyber-text-secondary font-normal uppercase">({rev.symbol})</span>
                                    </h3>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {Boolean(rev.proBenchmarks || rev.auditSignature?.tier === 'pro') && (
                                    <ProTierBadge size="sm" />
                                  )}
                                  {/* Watchlist Pin Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleWatchlist(rev.id, e)}
                                    title={isPinned ? 'Remove from Watchlist' : 'Add to Watchlist'}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                      isPinned
                                        ? 'bg-amber-500/20 text-amber-400 border-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                                        : 'bg-slate-950/80 text-slate-400 hover:text-amber-400 border-white/10 hover:border-amber-400/40 hover:bg-slate-900'
                                    }`}
                                  >
                                    <Star className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${isPinned ? 'fill-amber-400 text-amber-400' : ''}`} />
                                  </button>

                                  {/* Grade badge */}
                                  <div className={`border rounded-lg px-2 py-0.5 text-center min-w-[38px] font-mono font-bold text-xs uppercase tracking-wide flex items-center justify-center shrink-0 ${getGradeColor(rev.grade)}`}>
                                    {rev.grade}
                                  </div>
                                </div>
                              </div>

                              {/* Brief synopsis sentence */}
                              <p className="text-xs text-cyber-text-secondary leading-relaxed line-clamp-2 text-left">
                                {rev.verdict}
                              </p>

                              {/* Live CoinGecko Market Bar */}
                              {rev.livePrice !== undefined && (
                                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-cyber-cyan/20 text-xs font-mono">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9.5px] text-cyber-cyan font-bold">LIVE $</span>
                                    <span className="font-bold text-white">
                                      ${rev.livePrice < 1 ? rev.livePrice.toFixed(4) : rev.livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  {rev.liveChange24h !== undefined && (
                                    <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${rev.liveChange24h >= 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}`}>
                                      {rev.liveChange24h >= 0 ? '▲ +' : '▼ '}{rev.liveChange24h.toFixed(2)}%
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Card Footer */}
                            <div className="pt-2.5 mt-3 border-t border-cyber-cyan/10 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className={`border text-[9px] md:text-[10px] px-1.5 py-0.2 rounded font-mono uppercase tracking-wide ${riskStyles.bg} ${riskStyles.text}`}>
                                  {rev.riskLevel} RISK
                                </span>
                                <span className="text-[9px] md:text-[10px] font-mono text-cyber-text-muted uppercase tracking-wider flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-cyber-cyan/70 shrink-0" />
                                  Updated: {rev.createdAt}
                                </span>
                              </div>
                              <span className="text-[11px] font-display font-bold text-cyber-cyan group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 uppercase tracking-wider">
                                Audit Report
                                <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                              </span>
                            </div>
                          </motion.div>
                        </TiltCard>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>

              {/* MORE ARTICLES & UTILITIES SECTION (Full-Width Top Rated Audits + Archives & AI Sandbox) */}
              <div className="space-y-6">
                {/* 1. Full-Width Top Rated Security Audits */}
                <div className="bg-slate-900/60 backdrop-blur-md border border-cyber-cyan/20 rounded-2xl p-4 sm:p-5 text-left relative overflow-hidden shadow-lg group">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan/50 to-transparent"></div>
                  <div className="flex items-center justify-between border-b border-cyber-cyan/15 pb-2.5 mb-3.5">
                    <h4 className="font-mono text-xs font-bold text-cyber-text-primary uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-cyber-cyan" />
                      Top Rated Audits
                    </h4>
                    <span className="text-[9px] font-mono font-bold text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/25 px-2.5 py-0.5 rounded-full">
                      HIGH SCORE
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {reviews
                      .slice()
                      .sort((a, b) => b.overallScore - a.overallScore)
                      .slice(0, 4)
                      .map((item) => {
                        const gradeStyles = getGradeBadgeStyles(item.grade, item.overallScore);
                        const isPinned = watchlist.includes(item.id);
                        return (
                          <motion.div
                            key={item.id}
                            whileHover={{ scale: 1.035, y: -3 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                          >
                            <div
                              onClick={() => {
                                setActiveReviewId(item.id);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className={`w-full text-left group flex items-center justify-between p-3 bg-slate-950/70 rounded-xl transition-all duration-300 cursor-pointer shadow-sm hover:shadow-[0_12px_28px_rgba(0,229,255,0.22)] border ${
                                isPinned
                                  ? 'border-amber-400/50 hover:border-amber-400'
                                  : 'border-white/10 hover:border-cyber-cyan/60 hover:bg-cyber-cyan/10'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => toggleWatchlist(item.id, e)}
                                  title={isPinned ? 'Remove from Watchlist' : 'Add to Watchlist'}
                                  className={`p-1 rounded-lg border transition-all cursor-pointer shrink-0 ${
                                    isPinned
                                      ? 'bg-amber-500/20 text-amber-400 border-amber-400/60 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                                      : 'bg-slate-900 text-slate-400 hover:text-amber-400 border-white/10 hover:border-amber-400/40'
                                  }`}
                                >
                                  <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-400 text-amber-400' : ''}`} />
                                </button>

                                <div className="w-8 h-8 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/25 flex items-center justify-center font-mono text-[9px] font-bold text-cyber-cyan group-hover:border-cyber-cyan/50 group-hover:bg-cyber-cyan/20 transition-colors shrink-0">
                                  {item.symbol}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-cyber-text-primary truncate group-hover:text-cyber-cyan transition-colors">
                                    {item.name}
                                  </div>
                                  <div className="text-[9.5px] font-mono text-cyber-text-secondary truncate">
                                    {item.category}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0 pl-1">
                                <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border ${gradeStyles.bg} ${gradeStyles.text} ${gradeStyles.border}`}>
                                  {item.grade} • {item.overallScore}%
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                </div>

                {/* 2. Bottom Row: Registry Archives Dropdown + AI Auditor Sandbox */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Registry Archives Dropdown Component */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyber-cyan/25 rounded-2xl p-4 text-left shadow-xl relative overflow-hidden transition-all duration-300">
                      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent"></div>
                      
                      {/* Dropdown Header & Controls */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-cyber-cyan/15">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan shrink-0 shadow-[0_0_10px_rgba(0,229,255,0.15)]">
                            <Archive className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-display text-xs font-black tracking-widest text-cyber-text-primary uppercase flex items-center gap-2">
                              REGISTRY ARCHIVES
                              <span className="text-[10px] font-mono font-bold text-cyber-cyan bg-cyber-cyan/15 border border-cyber-cyan/30 px-2 py-0.5 rounded-full">
                                {Math.max(0, filteredReviews.length - 4)} Reports
                              </span>
                            </h3>
                            <p className="text-[10px] font-mono text-cyber-text-muted mt-0.5">
                              Select from historical smart contract evaluation records
                            </p>
                          </div>
                        </div>

                        {/* Single Optimized Dropdown Menu Toggle Button */}
                        <button
                          type="button"
                          onClick={() => setIsArchiveDropdownOpen(!isArchiveDropdownOpen)}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-950 hover:bg-cyber-cyan/20 border border-cyber-cyan/40 hover:border-cyber-cyan text-cyber-cyan hover:text-white font-mono text-xs font-bold flex items-center justify-between sm:justify-start gap-2.5 transition-all duration-200 cursor-pointer shadow-[0_0_12px_rgba(0,229,255,0.1)] hover:shadow-[0_0_18px_rgba(0,229,255,0.25)] shrink-0"
                        >
                          <span className="font-bold">
                            {isArchiveDropdownOpen ? 'Close Archives' : `Browse Archives (${Math.max(0, filteredReviews.length - 4)})`}
                          </span>
                          {isArchiveDropdownOpen ? (
                            <ChevronUp className="w-4 h-4 text-cyber-cyan shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-cyber-cyan shrink-0" />
                          )}
                        </button>
                      </div>

                      {/* Dropdown Expandable Menu Panel */}
                      <AnimatePresence>
                        {isArchiveDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="pt-3 space-y-2"
                          >
                            {filteredReviews.length <= 4 ? (
                              <div className="py-6 text-center font-mono text-xs text-cyber-text-muted bg-slate-950/40 rounded-xl border border-white/5">
                                No archived reports available for this category filter.
                              </div>
                            ) : (
                              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyber-cyan/30">
                                {filteredReviews.slice(4).map((rev) => {
                                  const riskStyles = getRiskStyles(rev.riskLevel);
                                  const isPinned = watchlist.includes(rev.id);
                                  return (
                                    <motion.div
                                      key={rev.id}
                                      whileHover={{ scale: 1.015, x: 2 }}
                                      transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                                    >
                                      <div
                                        onClick={() => {
                                          setActiveReviewId(rev.id);
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className={`p-2.5 rounded-xl bg-slate-950/80 flex items-center justify-between gap-3 group cursor-pointer transition-all duration-300 shadow-sm border ${
                                          isPinned
                                            ? 'border-amber-400/50 hover:border-amber-400 hover:shadow-[0_8px_24px_rgba(251,191,36,0.2)]'
                                            : 'border-white/5 hover:border-cyber-cyan/50 hover:bg-cyber-cyan/15 hover:shadow-[0_8px_24px_rgba(0,229,255,0.18)]'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <button
                                            type="button"
                                            onClick={(e) => toggleWatchlist(rev.id, e)}
                                            title={isPinned ? 'Remove from Watchlist' : 'Add to Watchlist'}
                                            className={`p-1 rounded-lg border transition-all cursor-pointer shrink-0 ${
                                              isPinned
                                                ? 'bg-amber-500/20 text-amber-400 border-amber-400/60 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                                                : 'bg-slate-900 text-slate-500 hover:text-amber-400 border-white/10 hover:border-amber-400/40'
                                            }`}
                                          >
                                            <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-400 text-amber-400' : ''}`} />
                                          </button>

                                          <img
                                            src={getCoinLogoUrl(rev.symbol, rev.logoUrl, rev.coingeckoId)}
                                            alt={rev.name}
                                            className="w-7 h-7 rounded-xl border border-cyber-cyan/30 object-contain bg-slate-950 p-0.5 shrink-0"
                                            referrerPolicy="no-referrer"
                                            onError={(e) => {
                                              (e.target as HTMLElement).style.display = 'none';
                                            }}
                                          />
                                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                            <span className="font-display font-bold text-xs text-cyber-text-primary group-hover:text-cyber-cyan transition-colors truncate">
                                              {rev.name}
                                            </span>
                                            <span className="font-mono text-[11px] text-cyber-cyan font-bold uppercase shrink-0">
                                              [{rev.symbol}]
                                            </span>
                                            <span className="font-mono text-[9px] text-cyber-text-muted bg-slate-900 px-1.5 py-0.2 rounded border border-white/5 shrink-0 hidden md:inline-block">
                                              {rev.category}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          {rev.livePrice !== undefined && (
                                            <span className="font-mono text-xs font-bold text-white bg-slate-900 border border-cyber-cyan/20 px-2 py-0.5 rounded-lg hidden sm:inline-block">
                                              ${rev.livePrice < 1 ? rev.livePrice.toFixed(4) : rev.livePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                          )}
                                          <span className={`border text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wide hidden xs:inline-block ${riskStyles.bg} ${riskStyles.text}`}>
                                            {rev.riskLevel}
                                          </span>
                                          <button
                                            type="button"
                                            className="px-2.5 py-1 rounded-lg bg-cyber-cyan/15 group-hover:bg-cyber-cyan border border-cyber-cyan/30 text-cyber-cyan group-hover:text-slate-950 font-mono text-[10px] font-bold uppercase transition-all flex items-center gap-1 shadow-sm"
                                          >
                                            <span>Audit</span>
                                            <ArrowRight className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Right Column: AI Auditor Sandbox Card */}
                  <div className="lg:col-span-5">
                    <div className="bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-cyber-cyan/10 backdrop-blur-md border border-cyber-cyan/35 rounded-2xl p-4.5 text-left relative overflow-hidden shadow-xl group">
                      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent"></div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-cyber-cyan/20 border border-cyber-cyan/40 text-cyber-cyan">
                          <Terminal className="w-4 h-4" />
                        </div>
                        <h4 className="font-mono text-xs font-bold text-cyber-text-primary uppercase tracking-widest">
                          AI Auditor Sandbox
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed mb-3.5">
                        Interact with our real-time AI security auditor to analyze smart contracts, verify tokenomics, or test protocol security parameters.
                      </p>
                      <button
                        onClick={() => {
                          if (setActiveTab) {
                            setActiveTab('chat');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        className="w-full block text-center bg-cyber-cyan/15 hover:bg-cyber-cyan border border-cyber-cyan/40 hover:border-cyber-cyan text-cyber-cyan hover:text-slate-950 font-display text-[11px] font-black uppercase tracking-widest py-2 rounded-xl transition-all duration-300 cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.15)] hover:shadow-[0_0_20px_rgba(0,229,255,0.4)]"
                      >
                        Launch AI Auditor Chat →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeReviewId && !activeReview ? (
        /* Loading mode while fetching review dynamically */
        <div className="max-w-3xl mx-auto bg-cyber-bg-card border border-cyber-cyan/30 rounded-2xl p-8 sm:p-12 text-center my-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,229,255,0.1),transparent_70%)] pointer-events-none"></div>
          <div className="w-12 h-12 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/40 flex items-center justify-center mx-auto mb-4 animate-spin">
            <RefreshCw className="w-5 h-5 text-cyber-cyan" />
          </div>
          <h3 className="font-display font-black text-base sm:text-lg text-cyber-text-primary uppercase tracking-wide mb-2">
            Synchronizing Audit Report...
          </h3>
          <p className="font-mono text-xs text-cyber-text-secondary max-w-md mx-auto mb-6">
            Retrieving live cryptographic review and security metrics for <span className="text-cyber-cyan font-bold">{activeReviewId.replace(/^cg-/, '').toUpperCase()}</span>...
          </p>
          <button
            onClick={handleBackToList}
            className="px-4 py-2 rounded-xl bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan/40 text-cyber-cyan font-display font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            ← Return to Review Library
          </button>
        </div>
      ) : activeReview ? (
        /* Full reading mode */
        <motion.div 
          layoutId={`review-card-${activeReview.id}`}
          className="max-w-3xl mx-auto bg-cyber-bg-card border border-cyber-cyan/15 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Top navigation back link */}
          <div className="px-5 py-3 md:py-3.5 bg-cyber-bg-secondary/60 border-b border-cyber-cyan/15 flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={handleBackToList}
              className="text-xs md:text-sm font-display uppercase tracking-wider text-cyber-text-secondary hover:text-cyber-cyan flex items-center gap-1.5 cursor-pointer font-bold py-1 px-2.5 rounded-lg hover:bg-cyber-cyan/10 border border-transparent hover:border-cyber-cyan/20 transition-all"
              aria-label="Back to List of Reviews"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-cyber-cyan" />
              <span>Back to List</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => toggleWatchlist(activeReview.id, e)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  watchlist.includes(activeReview.id)
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-white/10 hover:border-amber-400/40'
                }`}
                title={watchlist.includes(activeReview.id) ? 'Unpin from Watchlist' : 'Pin to Watchlist'}
              >
                <Star className={`w-3.5 h-3.5 ${watchlist.includes(activeReview.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span className="hidden sm:inline">{watchlist.includes(activeReview.id) ? 'Pinned to Watchlist' : 'Add to Watchlist'}</span>
              </button>

              <button
                type="button"
                onClick={(e) => toggleNotification(activeReview.id, e)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  notifiedProjects.includes(activeReview.id)
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-white/10 hover:border-emerald-400/40'
                }`}
                title={notifiedProjects.includes(activeReview.id) ? 'Risk Re-Scan Notifications Active' : 'Get Notified on Risk Changes'}
              >
                {notifiedProjects.includes(activeReview.id) ? <BellRing className="w-3.5 h-3.5 text-emerald-400 animate-bounce" /> : <Bell className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{notifiedProjects.includes(activeReview.id) ? 'Notifications Active' : 'Get Notified'}</span>
              </button>

              {isAdminMaster && activeReview && (
                <button
                  type="button"
                  onClick={() => setShowPromoteModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all cursor-pointer shadow-md shadow-amber-500/10"
                  title="Admin: Promote current review to canonical reference store"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Promote to Canonical</span>
                </button>
              )}

              <div className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-cyber-text-muted uppercase tracking-widest">
                <Flame className="w-3.5 h-3.5 text-cyber-orange" />
                <span>Full Project Audit Report</span>
              </div>
            </div>
          </div>

          {/* Reading body */}
          <div className="p-4 md:p-6.5 space-y-5 md:space-y-6">
            {notifiedProjects.includes(activeReview.id) && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2.5 text-emerald-300">
                  <BellRing className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse mt-0.5 sm:mt-0" />
                  <span>Monitoring Active: Browser & UI alerts will trigger if <strong className="text-white">{activeReview.name}</strong> risk level changes significantly after re-scans.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const oldRisk = activeReview.riskLevel || 'Low';
                    const newRisk = oldRisk === 'Low' ? 'High' : 'Low';
                    if (typeof window !== 'undefined' && window.Notification && Notification.permission === 'granted') {
                      new Notification('🚨 CRL Audit Risk Alert', {
                        body: `${activeReview.name} risk level changed significantly from ${oldRisk} to ${newRisk} after automated security re-scan!`
                      });
                    }
                    alert(`🚨 SIMULATED RE-SCAN RISK ALERT:\n\nProject: ${activeReview.name} (${activeReview.symbol})\nRisk level shifted significantly from [${oldRisk}] to [${newRisk}]!\n\nBrowser-based alert & UI notification dispatched successfully.`);
                  }}
                  className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold tracking-wide transition-all cursor-pointer border border-emerald-500/40 shrink-0 text-center"
                >
                  Simulate Re-Scan Test
                </button>
              </div>
            )}

            {/* Blog Post Title block */}
            <div className="space-y-2.5 border-b border-cyber-cyan/15 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={getCoinLogoUrl(activeReview.symbol, activeReview.logoUrl, activeReview.coingeckoId)}
                  alt={activeReview.name}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-xl border border-cyber-cyan/40 object-contain bg-slate-950 p-1.5 shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.25)]"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="text-left">
                  <span className="inline-block bg-cyber-cyan/10 border border-cyber-cyan/25 text-[10px] font-mono text-cyber-cyan px-2.5 py-0.5 rounded-full uppercase tracking-widest mb-1">
                    {activeReview.category}
                  </span>
                  <h1 className="font-display font-extrabold text-lg md:text-2xl text-cyber-text-primary tracking-wide leading-tight">
                    Cryptographic Review: {activeReview.name} ({activeReview.symbol}) Security & Tokenomics Assessment
                  </h1>
                </div>
              </div>

              {/* Author & date metadata */}
              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3.5 text-[10px] md:text-xs text-cyber-text-secondary font-mono uppercase tracking-wider pt-2 border-t border-cyber-cyan/10">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-cyber-cyan" />
                  {activeReview.author?.toLowerCase().includes('coingecko') && !activeReview.author?.toLowerCase().includes('cmc')
                    ? 'COINGECKO + CMC + COINSTATS TRI-SYNC ENGINE'
                    : activeReview.author}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cyber-cyan" />
                  Updated: {activeReview.createdAt}
                </span>
                <span className="text-cyber-text-muted select-none">•</span>
                <span className="text-cyber-green font-bold">Framework Verified</span>
              </div>
            </div>

            {/* CoinGecko + CMC + CoinStats Tri-Sync Market Engine Data Card with Framer Motion Count-Up Animations */}
            {activeReview.livePrice !== undefined && (
              <MarketMetricsTable
                data={activeReview}
                onRefresh={onSyncCoinGecko}
                isRefreshing={isSyncingCoinGecko}
              />
            )}

            {/* Live Historical Price Chart with Multi-Timeframes & AI Trend Forecast Projection */}
            <CryptoPriceChart
              coinId={activeReview.coingeckoId || activeReview.symbol.toLowerCase()}
              symbol={activeReview.symbol}
              name={activeReview.name}
              currentPrice={activeReview.livePrice || 0}
              change24h={activeReview.liveChange24h || 0}
              marketCap={activeReview.liveMarketCap}
              volume24h={activeReview.liveVolume24h}
              allTimeLow={activeReview.atl || activeReview.allTimeLow}
              allTimeHigh={activeReview.ath || activeReview.allTimeHigh}
              atlChangePct={activeReview.atlChangePct}
              athChangePct={activeReview.athChangePct}
              totalSupply={activeReview.totalSupply}
              circulatingSupply={activeReview.circulatingSupply}
              maxSupply={activeReview.maxSupply}
            />

            {/* Score Showcase Hero - Institutional Audit Rating & Security Dimension Metrics */}
            {(() => {
              const activeBlueprint = calculateBlueprintScore(activeReview.scores || { utility: 5, tokenomics: 5, security: 5, team: 5, community: 5 }, activeReview.category);
              const overallColor = activeBlueprint.overallScore >= 75 ? 'text-emerald-400' : activeBlueprint.overallScore >= 50 ? 'text-amber-400' : 'text-rose-400';
              return (
                <div className="bg-cyber-bg-primary/60 border border-cyber-cyan/20 rounded-xl p-4 md:p-5">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                    {/* Col 1: Grade & Overall Rating */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-4 text-center border-b md:border-b-0 md:border-r border-cyber-cyan/15 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-cyber-text-muted leading-none">Audit Rating</span>
                      <span className={`text-4xl md:text-5xl font-display font-black tracking-wider ${overallColor}`}>{activeBlueprint.grade}</span>
                      <span className="text-[11px] font-mono text-slate-300 uppercase font-semibold">Audit Score: {activeBlueprint.overallScore}/100</span>
                      <span className={`text-[10px] font-mono font-extrabold uppercase px-3 py-1 rounded-full border mt-1 ${activeBlueprint.overallScore >= 75 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : activeBlueprint.overallScore >= 50 ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-rose-500/15 border-rose-500/30 text-rose-300'}`}>
                        {activeBlueprint.overallScore >= 75 ? 'Low Systemic Risk' : activeBlueprint.overallScore >= 50 ? 'Moderate Caution' : 'High Security Risk'}
                      </span>
                    </div>

                    {/* Col 2: Color-Coded Dimension Bars & Indices */}
                    <div className="md:col-span-8 space-y-2.5 p-0.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-mono uppercase tracking-widest text-cyber-text-secondary block text-left">Core Security Metrics</span>
                        <span className="text-[10px] font-mono text-slate-400">Value-Proportional Color Indices</span>
                      </div>
                      <div className="space-y-3">
                        {[
                          { label: 'Utility', val: activeReview.scores.utility },
                          { label: 'Tokenomics', val: activeReview.scores.tokenomics },
                          { label: 'Security/Code', val: activeReview.scores.security },
                          { label: 'Team', val: activeReview.scores.team },
                          { label: 'Community', val: activeReview.scores.community },
                        ].map((metric, index) => {
                          const c = getMetricColor(metric.val);
                          return (
                            <div key={index} className="flex items-center gap-3 text-[11px] md:text-xs font-sans">
                              <span className="w-28 text-slate-200 font-display font-bold uppercase tracking-wider text-left text-[11px] truncate">{metric.label}</span>
                              <div className="flex-1 h-2 bg-slate-950/80 border border-slate-800 rounded-full overflow-hidden p-0.5">
                                <div className={`h-full ${c.bgClass} rounded-full transition-all duration-700`} style={{ width: `${metric.val * 10}%` }}></div>
                              </div>
                              <span className={`w-12 text-right font-mono font-extrabold text-[12px] ${c.textClass}`}>{metric.val}/10</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Data Engine Provenance Badge & Evaluation Blueprint Overview & Security Alerts */}
            <div className="space-y-3.5 my-3 text-left">
              {/* Tri-Oracle Data Source Provenance Badge */}
              <div className="bg-slate-950/80 border border-cyber-cyan/20 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400 shadow-md">
                <span className="flex items-center gap-2 text-cyber-cyan font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Data Engine: CoinGecko API v3 + CoinMarketCap (CMC) + CoinStats Tri-Sync
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Cross-validated real-time market depth, historical candle feeds & tri-oracle rank synchronization
                </span>
              </div>

              {/* Evaluation Blueprint Overview */}
              <div className="bg-slate-950/60 border border-cyber-cyan/20 rounded-xl p-4 space-y-1.5 shadow-md">
                <h3 className="font-display font-bold text-xs md:text-sm text-cyber-cyan uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-cyber-cyan rounded-full"></span>
                  Evaluation Blueprint Overview
                </h3>
                <p className="text-xs md:text-sm font-sans text-slate-200 leading-relaxed">
                  <strong className="text-white font-bold">{activeReview.name} ({activeReview.symbol})</strong> is evaluated under the locked 5-dimension Evaluation Blueprint rubric with tri-oracle market cross-validation.
                </p>
              </div>

              {/* Major Events & Critical Security Alerts Box */}
              <MajorEventsAlertBox 
                name={activeReview.name} 
                symbol={activeReview.symbol} 
                category={activeReview.category}
                scores={activeReview.scores}
                overallScore={activeReview.overallScore}
                riskLevel={activeReview.riskLevel}
                coingeckoId={activeReview.coingeckoId}
                contractAddress={activeReview.contractAddress}
                chainId={activeReview.chainId}
              />
            </div>

            {/* Institutional Benchmark Comparison Section */}
            {activeReview.comparisonReport && (
              <ComparisonReportView 
                data={activeReview.comparisonReport} 
                isPaidPro={Boolean(activeReview.proBenchmarks)}
                onUnlockPro={() => {
                  if (onLaunchProEvaluation) {
                    onLaunchProEvaluation({
                      name: activeReview.name,
                      symbol: activeReview.symbol,
                      category: activeReview.category
                    });
                  } else if (setActiveTab) {
                    setActiveTab('lab');
                  }
                }}
              />
            )}

            {/* Evaluation Blueprint Terminal Launcher - Security & Risk Assessment CTA */}
            <div className="my-6 p-4 sm:p-6 bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950 border border-purple-500/30 rounded-2xl shadow-xl max-w-2xl mx-auto flex flex-col items-center text-center gap-4 sm:gap-5 w-full">
              <div className="flex flex-col items-center space-y-2 max-w-xl w-full">
                <div className="flex items-center gap-2 justify-center">
                  <Cpu className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-widest">
                    Security & Risk Advisory Desk
                  </span>
                </div>
                <h4 className="font-display font-black text-sm sm:text-base md:text-lg text-slate-100 leading-snug px-2">
                  Request Security & Risk Assessment for {activeReview.name} ({activeReview.symbol})
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-400 font-mono leading-relaxed px-2">
                  B2B diagnostic advisory: Conducted prior to public launch, contract upgrades, or whenever detailed security verification is required.
                </p>
              </div>

              <div className="flex items-stretch justify-center w-full max-w-md">
                <button
                  onClick={() => {
                    if (onLaunchProEvaluation) {
                      onLaunchProEvaluation({
                        name: activeReview.name,
                        symbol: activeReview.symbol,
                        category: activeReview.category
                      });
                    } else if (setActiveTab) {
                      setActiveTab('lab');
                    }
                  }}
                  className="w-full px-5 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-display font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_28px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2 border border-amber-300/40"
                >
                  <Crown className="w-4 h-4 text-slate-950 fill-slate-950 shrink-0" />
                  <span>Launch Security Assessment ›</span>
                </button>
              </div>
            </div>

            {/* Bottom Action Bar: Back to List Button & Social Share Toolbar */}
            <div className="pt-4 border-t border-cyber-cyan/15 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={handleBackToList}
                className="w-full sm:w-auto px-5 py-2.5 bg-cyber-bg-secondary/80 hover:bg-cyber-cyan/15 border border-cyber-cyan/30 hover:border-cyber-cyan text-cyber-cyan font-display text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(0,229,255,0.1)] hover:shadow-[0_0_18px_rgba(0,229,255,0.25)]"
                aria-label="Back to List of Reviews"
              >
                <ChevronLeft className="w-4 h-4 text-cyber-cyan" />
                <span>Back to List</span>
              </button>

              <div className="flex items-center gap-2 bg-cyber-bg-primary/60 border border-cyber-cyan/15 px-3 py-1.5 rounded-xl">
                <span className="text-[10px] font-mono font-bold text-cyber-text-muted uppercase tracking-widest flex items-center gap-1">
                  <Share2 className="w-3 h-3 text-cyber-cyan" />
                  Share Audit:
                </span>
                <button
                  onClick={handleShareTwitter}
                  className="p-1.5 bg-cyber-bg-secondary hover:bg-cyber-cyan/20 text-cyber-text-secondary hover:text-cyber-cyan rounded-lg border border-cyber-cyan/15 transition-colors cursor-pointer"
                  title="Share on X / Twitter"
                  aria-label="Share on X / Twitter"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </button>
                <button
                  onClick={handleShareFacebook}
                  className="p-1.5 bg-cyber-bg-secondary hover:bg-cyber-cyan/20 text-cyber-text-secondary hover:text-cyber-cyan rounded-lg border border-cyber-cyan/15 transition-colors cursor-pointer"
                  title="Share on Facebook"
                  aria-label="Share on Facebook"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </button>
                <button
                  onClick={handleCopyLink}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    copied
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-cyber-bg-secondary hover:bg-cyber-cyan/20 text-cyber-text-secondary hover:text-cyber-cyan border-cyber-cyan/15'
                  }`}
                  title="Copy Direct Link to Clipboard"
                  aria-label="Copy Direct Link"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {activeReview && (
            <PromoteCanonicalModal
              isOpen={showPromoteModal}
              onClose={() => setShowPromoteModal(false)}
              newReview={activeReview}
            />
          )}
        </motion.div>
      ) : null}
    </div>
  );
}
