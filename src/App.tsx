/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FlaskConical, 
  BookOpen, 
  Terminal, 
  Layers, 
  HelpCircle,
  AlertCircle,
  X,
  Mail,
  User,
  ExternalLink,
  ShieldAlert,
  Flame,
  Globe,
  BookOpen as BookIcon,
  CheckCircle2,
  Lock,
  ShieldCheck,
  ChevronUp,
  Search,
  QrCode,
  Copy,
  Check,
  Share2,
  DollarSign,
  Cpu,
  Sparkles,
  RefreshCw,
  Crown,
  Zap,
  Key,
  AlertTriangle,
  Building2,
  ChevronDown,
  Mic,
  MicOff,
  TrendingUp
} from 'lucide-react';
import { CryptoReview } from './types';
import { INITIAL_REVIEWS } from './data';
import { getCoinLogoUrl } from './utils/coinLogos';
import { createReviewFromCoinGecko } from './services/coingecko';
import ReviewLab from './components/ReviewLab';
import MarketTicker from './components/MarketTicker';
import CookieBanner from './components/CookieBanner';
import FaqJsonLd from './components/FaqJsonLd';
import CurrencyDropdown from './components/CurrencyDropdown';
import { fetchLiveCoinGeckoMarkets, applyDualSyncArchitecture } from './services/coingecko';
import { fetchLiveCoinStatsMarkets } from './services/coinstats';
import { enrichReviewWithDefiLlamaTvl } from './services/defillama';
import { F3VerificationProvider } from './context/F3VerificationContext';

import BlogPreviewer from './components/BlogPreviewer';

// Retry helper for dynamic component imports to handle stale HMR/Vite dev server chunking
const lazyWithRetry = (importFn: () => Promise<any>) =>
  React.lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.warn('Retrying dynamic module import...', error);
      await new Promise(resolve => setTimeout(resolve, 600));
      return await importFn().catch(() => {
        window.location.reload();
        return { default: () => null };
      });
    }
  });

// Code-split secondary modules with auto-retry
const AuditorChat = lazyWithRetry(() => import('./components/AuditorChat'));
const XStocksPage = lazyWithRetry(() => import('./components/XStocksPage'));
const AuditorReviewConsole = lazyWithRetry(() => import('./components/AuditorReviewConsole'));
const ProOrderPortal = lazyWithRetry(() => import('./components/ProOrderPortal'));
const ThreeCore = lazyWithRetry(() => import('./components/ThreeCore'));
const CoinGeckoExplorerModal = lazyWithRetry(() => import('./components/CoinGeckoExplorerModal'));
const F3Dashboard = lazyWithRetry(() => import('./components/F3Dashboard').then(m => ({ default: m.F3Dashboard })));

interface ErrorBoundaryProps {
  children: React.ReactNode;
  name: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ComponentErrorBoundary extends (React.Component as any) {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(`[ErrorBoundary] Error in ${(this.props as any).name}:`, error, errorInfo);
  }

  render() {
    if ((this.state as any).hasError) {
      return (
        <div className="bg-slate-900/90 border border-rose-500/40 rounded-2xl p-8 text-center space-y-4 my-8 max-w-xl mx-auto shadow-2xl">
          <div className="w-12 h-12 bg-rose-500/20 border border-rose-500/40 rounded-xl flex items-center justify-center mx-auto text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-100 font-sans">
            {(this.props as any).name} Temporary Load Issue
          </h3>
          <p className="text-xs text-rose-300 font-mono">
            {(this.state as any).error?.message || 'A runtime rendering error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-xl transition-colors cursor-pointer"
          >
            Retry Loading Module
          </button>
        </div>
      );
    }
    return (this.props as any).children;
  }
}

function ModuleLoadingFallback() {
  return (
    <div className="min-h-[300px] w-full flex flex-col items-center justify-center p-8 text-cyber-cyan font-mono text-xs">
      <RefreshCw className="w-6 h-6 animate-spin text-cyber-cyan mb-3" />
      <span className="tracking-widest uppercase font-bold animate-pulse text-[10px]">Loading Module...</span>
    </div>
  );
}

function getInitialUrlParams(): URLSearchParams {
  try {
    const hasReviewParam = (params: URLSearchParams) =>
      !!(params.get('review') || params.get('reviewId') || params.get('article') || params.get('id'));

    // First Pass: Prioritize finding any 'review' parameter across search, hash, and referrer
    if (typeof window !== 'undefined' && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      if (hasReviewParam(searchParams)) {
        return searchParams;
      }
    }

    if (typeof window !== 'undefined' && window.location.hash) {
      const hashStr = window.location.hash.replace(/^#/, '');
      if (hashStr.includes('=')) {
        const hashParams = new URLSearchParams(hashStr);
        if (hasReviewParam(hashParams)) {
          return hashParams;
        }
      }
    }

    if (typeof document !== 'undefined' && document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        if (refUrl.search) {
          const refParams = new URLSearchParams(refUrl.search);
          if (hasReviewParam(refParams)) {
            return refParams;
          }
        }
      } catch (e) {
        console.warn('Failed to parse document.referrer search params:', e);
      }
    }

    // Second Pass: Look for 'tab' or other query parameters
    if (typeof window !== 'undefined' && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('tab')) {
        return searchParams;
      }
    }

    if (typeof window !== 'undefined' && window.location.hash) {
      const hashStr = window.location.hash.replace(/^#/, '');
      if (hashStr.includes('=')) {
        const hashParams = new URLSearchParams(hashStr);
        if (hashParams.get('tab')) {
          return hashParams;
        }
      }
    }

    if (typeof document !== 'undefined' && document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        if (refUrl.search) {
          const refParams = new URLSearchParams(refUrl.search);
          if (refParams.get('tab')) {
            return refParams;
          }
        }
      } catch (e) {
        console.warn('Failed to parse document.referrer search params:', e);
      }
    }

    // Fallback to window.location.search
    if (typeof window !== 'undefined' && window.location.search) {
      return new URLSearchParams(window.location.search);
    }
  } catch (e) {
    console.warn('Error reading URL parameters:', e);
  }
  return new URLSearchParams();
}

export default function App() {
  const isAcademyDomain = typeof window !== 'undefined' && 
    (window.location.hostname.includes('crypto-academy') || 
     window.location.hostname.includes('cryptoacademy') || 
     window.location.search.includes('tab=academy') ||
     window.location.search.includes('tab=blog'));

  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(() => {
    try {
      const params = getInitialUrlParams();
      return params.get('review') || params.get('reviewId') || params.get('article') || params.get('id') || null;
    } catch (e) {
      return null;
    }
  });

  const [isAdminMaster, setIsAdminMaster] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('crl_admin_authenticated') === 'true';
      }
      return false;
    } catch {
      return false;
    }
  });

  const [showAdminGateModal, setShowAdminGateModal] = useState<boolean>(false);
  const [adminGateKey, setAdminGateKey] = useState<string>('');
  const [adminGatePassphrase, setAdminGatePassphrase] = useState<string>('');
  const [adminGateError, setAdminGateError] = useState<string | null>(null);
  const [pendingTabRequest, setPendingTabRequest] = useState<'auditor' | 'orders' | 'f3' | null>(null);
  const [chatInitialQuery, setChatInitialQuery] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'lab' | 'blog' | 'chat' | 'xstocks' | 'academy' | 'auditor' | 'orders' | 'f3'>(() => {
    try {
      const params = getInitialUrlParams();
      // Prioritize review parameter over tab parameter during initial state loading
      const reviewParam = params.get('review') || params.get('reviewId') || params.get('article') || params.get('id');
      if (reviewParam) {
        return 'blog';
      }

      const stockParam = params.get('stock') || params.get('xstock');
      if (stockParam) {
        return 'xstocks';
      }

      const tab = params.get('tab');
      if (tab === 'xstocks' || tab === 'stocks' || tab === 'academy') {
        return 'xstocks';
      }
      if (tab === 'lab' || tab === 'blog' || tab === 'chat' || tab === 'orders' || tab === 'auditor' || tab === 'f3') {
        return tab as any;
      }
    } catch (e) {
      console.warn('URL parsing failed:', e);
    }
    return 'lab';
  });

  useEffect(() => {
    if (activeTab === 'auditor' && !isAdminMaster) {
      setPendingTabRequest('auditor');
      setShowAdminGateModal(true);
    }
  }, [activeTab, isAdminMaster]);

  const [labAuditMode, setLabAuditMode] = useState<'rapid' | 'pro'>('rapid');
  const [labPrefill, setLabPrefill] = useState<{ name?: string; symbol?: string; category?: string; focusArea?: string } | null>(null);

  const handleLaunchProEvaluation = (prefill?: { name?: string; symbol?: string; category?: string; focusArea?: string }) => {
    setLabAuditMode('pro');
    if (prefill) {
      setLabPrefill(prefill);
    }
    setActiveTab('lab');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLaunchRegularEvaluation = (prefill?: { name?: string; symbol?: string; category?: string; focusArea?: string }) => {
    setLabAuditMode('rapid');
    if (prefill) {
      setLabPrefill(prefill);
    }
    setActiveTab('lab');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab: 'lab' | 'blog' | 'chat' | 'xstocks' | 'academy' | 'auditor' | 'orders' | 'f3') => {
    if ((tab === 'auditor' || tab === 'f3') && !isAdminMaster) {
      setPendingTabRequest(tab);
      setShowAdminGateModal(true);
      return;
    }
    setActiveTab(tab);
  };

  const logAdminAction = (action: string, details?: string) => {
    try {
      const logs = JSON.parse(localStorage.getItem('crl_admin_action_logs') || '[]');
      const newEntry = {
        id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        timestamp: new Date().toISOString(),
        action,
        details: details || ''
      };
      const updated = [newEntry, ...logs].slice(0, 100);
      localStorage.setItem('crl_admin_action_logs', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleAdminLogout = () => {
    logAdminAction('ADMIN_LOGOUT', 'Administrator session terminated manually');
    setIsAdminMaster(false);
    try {
      localStorage.removeItem('crl_admin_authenticated');
      localStorage.removeItem('crl_admin_key');
      localStorage.removeItem('crl_admin_session_token');
      localStorage.removeItem('crl_admin_auth_timestamp');
      localStorage.removeItem('crl_admin_last_activity');
    } catch {}
    setActiveTab('lab');
  };

  // Inactivity timeout & session timer effect (30 minutes)
  useEffect(() => {
    if (!isAdminMaster) return;

    try {
      if (!localStorage.getItem('crl_admin_auth_timestamp')) {
        localStorage.setItem('crl_admin_auth_timestamp', Date.now().toString());
      }
      if (!localStorage.getItem('crl_admin_last_activity')) {
        localStorage.setItem('crl_admin_last_activity', Date.now().toString());
      }
    } catch {}

    const interval = setInterval(() => {
      try {
        const lastActive = parseInt(localStorage.getItem('crl_admin_last_activity') || '0', 10);
        const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
        if (lastActive && Date.now() - lastActive > INACTIVITY_LIMIT) {
          logAdminAction('ADMIN_AUTO_LOGOUT', 'Session terminated due to 30 minutes of inactivity');
          handleAdminLogout();
        }
      } catch (e) {}
    }, 30000);

    const handleActivity = () => {
      try {
        localStorage.setItem('crl_admin_last_activity', Date.now().toString());
      } catch (e) {}
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [isAdminMaster]);

  const handleVerifyAdminGateKey = async () => {
    const rawKey = adminGateKey.trim().toUpperCase();
    const rawPassphrase = adminGatePassphrase.trim();

    if (!rawKey || !rawPassphrase) {
      setAdminGateError('Both Admin Master Key and Admin Passphrase are required.');
      return;
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterKey: rawKey, passphrase: rawPassphrase })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAdminMaster(true);
        try {
          localStorage.setItem('crl_admin_authenticated', 'true');
          localStorage.setItem('crl_admin_auth_timestamp', Date.now().toString());
          localStorage.setItem('crl_admin_last_activity', Date.now().toString());
          if (data.token) localStorage.setItem('crl_admin_session_token', data.token);
        } catch {}
        logAdminAction('ADMIN_LOGIN_SUCCESS', 'Administrator authenticated successfully');
        setShowAdminGateModal(false);
        setAdminGateError(null);
        setAdminGateKey('');
        setAdminGatePassphrase('');
        if (pendingTabRequest) {
          setActiveTab(pendingTabRequest);
          setPendingTabRequest(null);
        }
      } else {
        setAdminGateError(data.error || 'Invalid Admin Master Key or Passphrase combination.');
      }
    } catch (err: any) {
      setAdminGateError('Failed to verify credentials. Please check connection.');
    }
  };

  const [savedReviews, setSavedReviews] = useState<CryptoReview[]>([]);
  const [hasSubscribed, setHasSubscribed] = useState<boolean>(false);
  const [isExchangesOpen, setIsExchangesOpen] = useState<boolean>(false);

  // Header Search State & Event Listeners
  const [headerSearchQuery, setHeaderSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const handleVoiceSearch = () => {
    setIsVoiceModalOpen(true);
    setMicPermissionDenied(false);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicPermissionDenied(true);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setMicPermissionDenied(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setHeaderSearchQuery(transcript);
        setIsSearchFocused(true);
        setIsListening(false);
        setIsVoiceModalOpen(false);
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
        setMicPermissionDenied(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.warn('Could not start speech recognition:', e);
      setIsListening(false);
      setMicPermissionDenied(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allReviewsList = savedReviews.length > 0
    ? [...savedReviews, ...INITIAL_REVIEWS.filter(ir => !savedReviews.some(sr => sr.id === ir.id))]
    : INITIAL_REVIEWS;

  const searchResults = headerSearchQuery.trim()
    ? allReviewsList.filter((r) => 
        r.name.toLowerCase().includes(headerSearchQuery.toLowerCase()) || 
        r.symbol.toLowerCase().includes(headerSearchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(headerSearchQuery.toLowerCase()) ||
        r.verdict.toLowerCase().includes(headerSearchQuery.toLowerCase())
      )
    : [];

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

  const handleSelectSearchResult = (reviewId: string) => {
    setSelectedReviewId(reviewId);
    setActiveTab('blog');
    setIsSearchFocused(false);
    setHeaderSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSelectSearchResult(searchResults[0].id);
    } else if (headerSearchQuery.trim()) {
      setActiveTab('blog');
      setIsSearchFocused(false);
    }
  };

  // Security Verification and Cookie Consent Notice States
  const [isVerified] = useState<boolean>(true);
  const [showCookieBanner, setShowCookieBanner] = useState<boolean>(false);
  const [cookieConsent, setCookieConsent] = useState<string | null>(() => {
    try {
      return localStorage.getItem('crl_cookie_consent');
    } catch (e) {
      return null;
    }
  });

  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 280) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    if (isVerified) {
      // Notify parent site (like Blogger) that verification is completed, so it can show the cookie banner
      const parentTimer = setTimeout(() => {
        try {
          window.parent.postMessage({ type: 'CAPTCHA_VERIFIED' }, '*');
        } catch (e) {
          console.error(e);
        }
      }, 500);

      // Check if consent has already been given (either accepted or declined)
      if (cookieConsent) {
        // Since consent is already present, notify parent
        try {
          window.parent.postMessage({ type: 'COOKIE_CONSENT_DECIDED', consent: cookieConsent }, '*');
        } catch (e) {
          console.error(e);
        }
      } else {
        // Delay the appearance of the cookie banner slightly (2.5 seconds)
        const cookieTimer = setTimeout(() => {
          setShowCookieBanner(true);
        }, 2500);
        return () => {
          clearTimeout(parentTimer);
          clearTimeout(cookieTimer);
        };
      }
      return () => clearTimeout(parentTimer);
    }
  }, [isVerified, cookieConsent]);

  // Clean up and remove any traces of Transparency Badge elements from the DOM if present
  useEffect(() => {
    const cleanupBadge = () => {
      const ids = ['tb-badge-script', 'tb-badge-widget', 'tb-badge-container'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
      document.querySelectorAll('[id^="tb-badge"], iframe[src*="transparencybadge"], .tb-badge-widget').forEach(el => el.remove());
    };
    cleanupBadge();
  }, []);

  const handleAcceptCookies = () => {
    try {
      localStorage.setItem('crl_cookie_consent', 'accepted');
      document.cookie = 'crl_cookie_consent=accepted; max-age=' + (180 * 24 * 60 * 60) + '; path=/; SameSite=Lax';
      window.parent.postMessage({ type: 'COOKIE_CONSENT_DECIDED', consent: 'accepted' }, '*');
    } catch (e) {
      console.error(e);
    }
    setCookieConsent('accepted');
    setShowCookieBanner(false);
  };

  const handleDeclineCookies = () => {
    try {
      localStorage.setItem('crl_cookie_consent', 'declined');
      document.cookie = 'crl_cookie_consent=declined; max-age=' + (180 * 24 * 60 * 60) + '; path=/; SameSite=Lax';
      window.parent.postMessage({ type: 'COOKIE_CONSENT_DECIDED', consent: 'declined' }, '*');
    } catch (e) {
      console.error(e);
    }
    setCookieConsent('declined');
    setShowCookieBanner(false);
  };

  // Donation Networks configuration
  const DONATION_NETWORKS = [
    {
      id: 'BTC',
      name: 'Bitcoin',
      symbol: 'BTC',
      badge: 'COIN',
      address: 'bc1q2ft77tqd2625gejtaer3d23wmaf9mkjndhxpsm',
      notice: 'Only send Bitcoin (BTC) assets to this address. Other assets will be lost forever.',
      bgColor: 'bg-amber-500',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/40',
      icon: '₿'
    },
    {
      id: 'ETH',
      name: 'Ethereum',
      symbol: 'ETH',
      badge: 'COIN',
      address: '0x72D47acFf1f026c030000fdB0B0eB22474CaA810',
      notice: 'Only send Ethereum (ETH) assets to this address. Other assets will be lost forever.',
      bgColor: 'bg-indigo-600',
      textColor: 'text-indigo-400',
      borderColor: 'border-indigo-500/40',
      icon: 'Ξ'
    },
    {
      id: 'BSC',
      name: 'BSC',
      symbol: 'BNB',
      badge: 'BEP20',
      address: '0x72D47acFf1f026c030000fdB0B0eB22474CaA810',
      notice: 'Only send BNB Smart Chain (BSC) assets to this address. Other assets will be lost forever.',
      bgColor: 'bg-yellow-500',
      textColor: 'text-yellow-400',
      borderColor: 'border-yellow-500/40',
      icon: 'B'
    },
    {
      id: 'SOL',
      name: 'Solana',
      symbol: 'SOL',
      badge: 'COIN',
      address: 'rxe46vDTwN2hukEZT2XJdS6ptgSzLM2F2nRWGxe3PpA',
      notice: 'Only send Solana (SOL) assets to this address. Other assets will be lost forever.',
      bgColor: 'bg-purple-600',
      textColor: 'text-purple-400',
      borderColor: 'border-purple-500/40',
      memoText: 'No memo required',
      icon: 'S'
    },
    {
      id: 'TRX',
      name: 'TRON',
      symbol: 'TRX',
      badge: 'COIN',
      address: 'THdU1JFYyZBe9uouenA78iHxSC9Y54LH4G',
      notice: 'Only send Tron (TRX) assets to this address. Other assets will be lost forever.',
      bgColor: 'bg-red-600',
      textColor: 'text-red-400',
      borderColor: 'border-red-500/40',
      memoText: 'No memo required',
      icon: 'T'
    }
  ] as const;

  // Modal control states
  const [activeModal, setActiveModal] = useState<'subscribe' | 'author' | 'privacy' | 'disclaimer' | 'resources' | 'contact' | 'learn-btc' | 'learn-eth' | 'learn-defi' | 'learn-sec' | 'qr-donation' | 'tos' | 'whats-avf' | null>(null);
  const [selectedDonationNetwork, setSelectedDonationNetwork] = useState<'BTC' | 'ETH' | 'BSC' | 'SOL' | 'TRX'>('ETH');
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);

  const copySelectedAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Sentiment Index active key for Fear & Greed Index
  const [sentimentKey, setSentimentKey] = useState<'overall' | 'btc' | 'defi'>('overall');
  const sentimentScores = {
    overall: { val: 78, label: 'Extreme Greed', color: 'text-cyber-green', desc: 'Market momentum is strongly bullish, backed by spot ETF inflows and high social engagement.' },
    btc: { val: 84, label: 'Extreme Greed', color: 'text-cyber-green', desc: 'Bitcoin network hash rate and address accumulation are near all-time highs.' },
    defi: { val: 62, label: 'Greed', color: 'text-cyber-cyan', desc: 'DeFi protocols show strong TVL growth, but transaction fee gas surges create mild friction.' }
  };

  // CoinGecko Explorer & Live Market Data Sync State
  const [isCoinGeckoModalOpen, setIsCoinGeckoModalOpen] = useState(false);
  const [isSyncingCoinGecko, setIsSyncingCoinGecko] = useState(false);

  const persistReviews = async (reviews: CryptoReview[]) => {
    try {
      await fetch('/api/reviews/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews }),
      });
    } catch (e) {
      console.warn('Failed to save reviews to server:', e);
    }
    try {
      localStorage.setItem('crypto_review_lab_drafts', JSON.stringify(reviews));
      localStorage.setItem('crypto_reviews_v1', JSON.stringify(reviews));
    } catch (e) {}
  };

  // Sync live price & market data for all active reviews via CoinGecko API
  const syncCoinGeckoMarkets = async (listToSync?: CryptoReview[]) => {
    const targetList = listToSync || (savedReviews.length > 0 ? savedReviews : INITIAL_REVIEWS);
    if (!targetList || targetList.length === 0) return;

    setIsSyncingCoinGecko(true);
    try {
      const ids = targetList
        .map(r => r.coingeckoId || r.symbol.toLowerCase())
        .filter(Boolean);

      const [marketDataMap, coinstatsMap] = await Promise.all([
        fetchLiveCoinGeckoMarkets(ids),
        fetchLiveCoinStatsMarkets().catch(() => ({}))
      ]);

      const currentList = savedReviews.length > 0 ? savedReviews : INITIAL_REVIEWS;
      const updatedPromises = currentList.map(async (review) => {
        const cgId = (review.coingeckoId || '').toLowerCase();
        const sym = (review.symbol || '').toLowerCase();
        const revId = (review.id || '').toLowerCase();
        const liveData = (cgId && marketDataMap[cgId]) || (sym && marketDataMap[sym]) || (revId && marketDataMap[revId]);
        const csData = (cgId && coinstatsMap[cgId]) || (sym && coinstatsMap[sym]) || (revId && coinstatsMap[revId]);
        const cleanLogo = getCoinLogoUrl(review.symbol, liveData?.image || review.logoUrl, review.coingeckoId || liveData?.id);

        let updatedReview: CryptoReview = {
          ...review,
          logoUrl: cleanLogo,
        };

        if (liveData || csData) {
          const dualMetrics = await applyDualSyncArchitecture(
            liveData?.current_price || csData?.price || 0,
            liveData?.market_cap || csData?.marketCap || 0,
            liveData?.total_volume || csData?.volume || 0,
            liveData?.market_cap_rank || csData?.rank || 100,
            liveData?.price_change_percentage_24h ?? csData?.priceChange1d ?? 0,
            liveData?.circulating_supply || csData?.availableSupply || review.circulatingSupply,
            review.maxSupply,
            liveData?.total_supply || csData?.totalSupply || review.totalSupply,
            csData || undefined,
            liveData?.ath || review.ath || review.allTimeHigh,
            liveData?.atl || review.atl || review.allTimeLow,
            review.symbol
          );

          updatedReview = {
            ...updatedReview,
            coingeckoId: liveData?.id || review.coingeckoId,
            ...dualMetrics,
          };
        }

        return await enrichReviewWithDefiLlamaTvl(updatedReview);
      });

      const updated = await Promise.all(updatedPromises);

      setSavedReviews(updated);
      persistReviews(updated);
    } catch (err) {
      console.warn('Failed to sync CoinGecko market data:', err);
    } finally {
      setIsSyncingCoinGecko(false);
    }
  };

  // Add or swap project from CoinGecko Explorer Modal
  const handleAddOrSwapReview = (newReview: CryptoReview) => {
    setSavedReviews((prev) => {
      const existingIdx = prev.findIndex(r => r.id === newReview.id || (r.coingeckoId && r.coingeckoId === newReview.coingeckoId));
      let updated: CryptoReview[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = newReview;
      } else {
        updated = [newReview, ...prev];
      }
      persistReviews(updated);
      return updated;
    });

    // Select the new project and switch to blog view if needed
    setSelectedReviewId(newReview.id);
    setActiveTab('blog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load reviews from server API endpoint (/api/reviews/list) with fallback to localStorage and INITIAL_REVIEWS on startup
  useEffect(() => {
    fetch('/api/reviews/list')
      .then(res => res.json())
      .then(parsed => {
        if (Array.isArray(parsed) && parsed.length > 0) {
          processLoadedReviews(parsed);
        } else {
          loadLocalStorageFallback();
        }
      })
      .catch(() => {
        loadLocalStorageFallback();
      });

    function loadLocalStorageFallback() {
      const stored = localStorage.getItem('crypto_review_lab_drafts') || localStorage.getItem('crypto_reviews_v1');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            processLoadedReviews(parsed);
            return;
          }
        } catch (e) {}
      }
      processLoadedReviews(INITIAL_REVIEWS);
    }

    function processLoadedReviews(parsed: CryptoReview[]) {
      const merged = [...parsed];
      INITIAL_REVIEWS.forEach(initial => {
        const existingIdx = merged.findIndex(r => 
          r.id === initial.id || 
          (r.coingeckoId && (initial.coingeckoId && r.coingeckoId.toLowerCase() === initial.coingeckoId.toLowerCase())) ||
          (r.symbol && r.symbol.toUpperCase() === initial.symbol.toUpperCase())
        );
        if (existingIdx >= 0) {
          // Master review overrides cached scores/verdict, preserving live market metrics
          merged[existingIdx] = {
            ...initial,
            livePrice: merged[existingIdx].livePrice || initial.livePrice,
            liveMarketCap: merged[existingIdx].liveMarketCap || initial.liveMarketCap,
            liveVolume24h: merged[existingIdx].liveVolume24h || initial.liveVolume24h,
            liveRank: merged[existingIdx].liveRank || initial.liveRank,
          };
        } else {
          merged.unshift(initial);
        }
      });

      // Sanitize all logoUrls so corrupted imgur/article banners get replaced with official coin icons
      const sanitizedList = merged.map((r) => ({
        ...r,
        logoUrl: getCoinLogoUrl(r.symbol, r.logoUrl, r.coingeckoId),
      }));

      setSavedReviews(sanitizedList);

      // Initial price sync from CoinGecko
      syncCoinGeckoMarkets(sanitizedList);
    }

    // Set up periodic sync every 60 seconds
    const intervalId = setInterval(() => {
      syncCoinGeckoMarkets();
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  // Sync current tab and selectedReviewId to URL search params
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      let changed = false;

      if (activeTab && url.searchParams.get('tab') !== activeTab) {
        url.searchParams.set('tab', activeTab);
        changed = true;
      }

      if (selectedReviewId) {
        if (url.searchParams.get('review') !== selectedReviewId) {
          url.searchParams.set('review', selectedReviewId);
          changed = true;
        }
      } else {
        if (url.searchParams.has('review') || url.searchParams.has('reviewId') || url.searchParams.has('article') || url.searchParams.has('id')) {
          url.searchParams.delete('review');
          url.searchParams.delete('reviewId');
          url.searchParams.delete('article');
          url.searchParams.delete('id');
          changed = true;
        }
      }

      if (changed) {
        window.history.replaceState({ tab: activeTab, review: selectedReviewId }, '', url.toString());
      }
    } catch (e) {
      console.warn('Failed to update URL search params:', e);
    }
  }, [selectedReviewId, activeTab]);

  // Auto-fetch CoinGecko data if a review ID is requested via URL or deep-link (e.g., ?tab=blog&review=cg-lorenzo-protocol)
  useEffect(() => {
    if (!selectedReviewId) return;

    const targetId = selectedReviewId.trim();
    const cleanCoinId = targetId.replace(/^cg-/, '').toLowerCase();

    const existsInSaved = savedReviews.some(
      (r) =>
        r.id === targetId ||
        r.coingeckoId === targetId ||
        r.id === `cg-${cleanCoinId}` ||
        (r.coingeckoId && r.coingeckoId.toLowerCase() === cleanCoinId) ||
        r.id.toLowerCase() === targetId.toLowerCase()
    );

    const existsInInitial = INITIAL_REVIEWS.some(
      (r) =>
        r.id === targetId ||
        r.coingeckoId === targetId ||
        r.id === `cg-${cleanCoinId}` ||
        (r.coingeckoId && r.coingeckoId.toLowerCase() === cleanCoinId) ||
        r.id.toLowerCase() === targetId.toLowerCase()
    );

    if (!existsInSaved && !existsInInitial) {
      createReviewFromCoinGecko(cleanCoinId)
        .then((newReview) => {
          if (newReview) {
            setSavedReviews((prev) => {
              if (
                prev.some(
                  (r) =>
                    r.id === newReview.id ||
                    (r.coingeckoId && r.coingeckoId.toLowerCase() === newReview.coingeckoId.toLowerCase())
                )
              ) {
                return prev;
              }
              const updated = [newReview, ...prev];
              persistReviews(updated);
              return updated;
            });
          }
        })
        .catch((err) => {
          console.warn('Failed to auto-fetch review for:', selectedReviewId, err);
        });
    }
  }, [selectedReviewId, savedReviews]);

  // Deep linking: automatically open corresponding modals on load or URL navigation
  useEffect(() => {
    const handleLocationCheck = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const searchParams = new URLSearchParams(window.location.search);
      const pageParam = searchParams.get('page')?.toLowerCase();

      if (
        path === '/privacy' || 
        path === '/privacy-policy' || 
        hash === '#privacy' || 
        hash === '#privacy-policy' || 
        pageParam === 'privacy' || 
        pageParam === 'privacy-policy'
      ) {
        setActiveModal('privacy');
      } else if (
        path === '/disclaimer' || 
        hash === '#disclaimer' || 
        pageParam === 'disclaimer'
      ) {
        setActiveModal('disclaimer');
      } else if (
        path === '/terms' || 
        path === '/tos' ||
        path === '/terms-of-service' ||
        hash === '#terms' || 
        hash === '#tos' || 
        pageParam === 'terms' ||
        pageParam === 'tos'
      ) {
        setActiveModal('tos');
      } else if (
        path === '/contact' || 
        hash === '#contact' || 
        pageParam === 'contact'
      ) {
        setActiveModal('contact');
      } else if (
        path === '/resources' || 
        hash === '#resources' || 
        pageParam === 'resources'
      ) {
        setActiveModal('resources');
      }
    };

    handleLocationCheck();
    window.addEventListener('hashchange', handleLocationCheck);

    const handlePopState = () => {
      try {
        const searchParams = getInitialUrlParams();
        const tab = searchParams.get('tab');
        const revId = searchParams.get('review') || searchParams.get('reviewId') || searchParams.get('article') || searchParams.get('id');
        if (revId) {
          setSelectedReviewId(revId);
          setActiveTab('blog');
        } else if (tab === 'lab' || tab === 'blog' || tab === 'chat' || tab === 'xstocks' || tab === 'stocks' || tab === 'academy' || tab === 'orders' || tab === 'auditor' || tab === 'f3') {
          setActiveTab((tab === 'stocks' || tab === 'academy') ? 'xstocks' : (tab as any));
          setSelectedReviewId(null);
        } else {
          setSelectedReviewId(null);
        }
      } catch (e) {
        console.warn('popstate handling error:', e);
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    return () => {
      window.removeEventListener('hashchange', handleLocationCheck);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Listen for message events from parent page (e.g. for cookie banner or parent Blogger navigation)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'object') {
        if (event.data.type === 'NAVIGATE' || event.data.type === 'SET_REVIEW' || event.data.type === 'CHANGE_URL') {
          const revId = event.data.reviewId || event.data.review || event.data.article || event.data.id;
          if (revId) {
            setSelectedReviewId(revId);
            setActiveTab('blog');
          }
          if (event.data.tab && (event.data.tab === 'lab' || event.data.tab === 'blog' || event.data.tab === 'chat' || event.data.tab === 'xstocks' || event.data.tab === 'academy' || event.data.tab === 'orders' || event.data.tab === 'auditor' || event.data.tab === 'f3')) {
            setActiveTab(event.data.tab === 'academy' ? 'xstocks' : event.data.tab);
          }
        } else if (event.data.type === 'OPEN_MODAL') {
          if (event.data.modal === 'privacy') {
            setActiveModal('privacy');
          } else if (event.data.modal === 'disclaimer') {
            setActiveModal('disclaimer');
          } else if (event.data.modal === 'contact') {
            setActiveModal('contact');
          } else if (event.data.modal === 'resources') {
            setActiveModal('resources');
          } else if (event.data.modal === 'tos' || event.data.modal === 'terms') {
            setActiveModal('tos');
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Notify parent window when the Privacy modal is opened or closed
  const prevModalRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeModal === 'privacy') {
      window.parent.postMessage({ type: 'PRIVACY_MODAL_OPEN' }, '*');
    } else if (prevModalRef.current === 'privacy') {
      window.parent.postMessage({ type: 'PRIVACY_MODAL_CLOSED' }, '*');
    }
    prevModalRef.current = activeModal;
  }, [activeModal]);

  // Centralized SEO metadata management system
  useEffect(() => {
    // Helper to match review across all reviews (saved & initial)
    let matchedReview: CryptoReview | undefined;
    if (selectedReviewId) {
      const allReviews = [...savedReviews, ...INITIAL_REVIEWS];
      const revId = selectedReviewId.trim();
      const cleanId = revId.replace(/^cg-/, '').toLowerCase();
      matchedReview = allReviews.find(r => 
        r.id === revId || 
        r.coingeckoId === revId || 
        r.id === `cg-${cleanId}` ||
        (r.coingeckoId && r.coingeckoId.toLowerCase() === cleanId) ||
        (r.id && r.id.toLowerCase() === revId.toLowerCase())
      );
    }

    let title = "Crypto Review Lab — Institutional Financial Analytics & Code Audit Terminal";
    let descriptionText = "An Interactive Crypto Intelligence and Verification AI Platform — Powered by AVF Engine (Algorithmic Verification Framework) monitoring smart contracts, liquidity depth, TVL stress vectors, and live market anomalies.";
    let keywords = "crypto audit, crypto reviews, AVF engine, smart contract audit, prop firm reviews, DeFi security rating, crypto intelligence, tokenomics review, blockchain security";
    let imageUrl = "https://www.cryptoreviewlab.com/og-banner.jpg";
    let ogType = "website";
    let jsonLdData: any = null;

    if (matchedReview) {
      const logo = getCoinLogoUrl(matchedReview.symbol, matchedReview.logoUrl, matchedReview.coingeckoId);
      if (logo) imageUrl = logo;
      ogType = "article";

      title = `${matchedReview.name} (${matchedReview.symbol}) ${matchedReview.grade} Security Review & Audit Rating | Crypto Review Lab`;
      descriptionText = `Detailed ${matchedReview.grade}-rated institutional security audit for ${matchedReview.name} (${matchedReview.symbol}). Overall Score: ${matchedReview.overallScore}/100 | Risk Level: ${matchedReview.riskLevel} | Category: ${matchedReview.category}. Verdict: ${matchedReview.verdict}`;
      keywords = `${matchedReview.name}, ${matchedReview.symbol}, ${matchedReview.symbol} audit, ${matchedReview.symbol} security review, ${matchedReview.symbol} rating, ${matchedReview.category}, ${matchedReview.riskLevel} risk, AVF evaluation, crypto code audit, smart contract security`;

      // Rich Schema.org Review & FinancialProduct JSON-LD
      jsonLdData = {
        "@context": "https://schema.org",
        "@type": "Review",
        "name": `${matchedReview.name} (${matchedReview.symbol}) Security Review & Rating`,
        "itemReviewed": {
          "@type": "FinancialProduct",
          "name": matchedReview.name,
          "alternateName": matchedReview.symbol,
          "category": matchedReview.category,
          "description": matchedReview.verdict
        },
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": matchedReview.overallScore,
          "bestRating": "100",
          "worstRating": "0"
        },
        "author": {
          "@type": "Organization",
          "name": "Crypto Review Lab (AVF Engine)",
          "url": "https://www.cryptoreviewlab.com"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Crypto Review Lab",
          "logo": {
            "@type": "ImageObject",
            "url": "https://www.cryptoreviewlab.com/logo.png"
          }
        },
        "datePublished": matchedReview.createdAt || "2026-01-01",
        "reviewBody": matchedReview.summary ? matchedReview.summary.slice(0, 300) : matchedReview.verdict
      };
    } else {
      if (activeTab === 'lab') {
        title = "AVF Review Lab — Institutional Crypto Risk & Code Audit Terminal | Crypto Review Lab";
        descriptionText = "Execute instant algorithmic smart contract audits, flash-loan drain simulations, TVL stress testing, and quantitative risk appraisals using AVF Engine.";
        keywords = "AVF review lab, crypto security audit, smart contract vulnerability scanner, institutional crypto risk, DeFi protocol security";
      } else if (activeTab === 'blog') {
        title = "Market Intelligence Portal | Crypto Review Lab";
        descriptionText = "Explore comprehensive independent security audits, project risk ratings, market confidence metrics, and deep-dive technical evaluations.";
        keywords = "crypto project reviews, cryptocurrency ratings, crypto audit reports, blockchain project evaluation, DeFi ratings";
      } else if (activeTab === 'chat') {
        title = "AI Smart Contract Auditor & Crypto Security Desk | Crypto Review Lab";
        descriptionText = "Consult our AI Contract Auditor for instant smart contract vulnerability checks, exchange rating breakdowns, and custom blockchain security advice.";
        keywords = "AI contract auditor, crypto security chat, smart contract checker, crypto AI assistant, vulnerability audit";
      } else if (activeTab === 'xstocks' || activeTab === 'academy') {
        title = "Tokenized Stocks (xStocks) & Real-time Market Intelligence | Crypto Review Lab";
        descriptionText = "24/7 on-chain secondary market quoting, tri-oracle price consensus, and technical indicator analytics for tokenized US equities (AAPLX, TSLAX, NVDAX, QQQX).";
        keywords = "tokenized stocks, xstocks, backed finance, AAPLX, TSLAX, NVDAX, crypto equities, tokenized US stocks";
      } else if (activeTab === 'orders') {
        title = "Verify Order & Audit Dispatch Portal | Crypto Review Lab";
        descriptionText = "Track, verify, and download independent crypto risk assessment reports, security order dispatches, and cryptographically signed report certificates.";
        keywords = "verify crypto audit, order dispatch, cryptographically signed audit, security & risk assessment report";
      }

      jsonLdData = {
        "@context": "https://schema.org",
        "@type": "FinancialService",
        "name": "Crypto Review Lab",
        "url": "https://www.cryptoreviewlab.com",
        "description": descriptionText,
        "brand": "Algorithmic Verification Framework (AVF Engine)"
      };
    }

    // Set Document Title
    document.title = title;

    // Helper for Meta Tags
    const setMeta = (selector: string, attrName: string, attrVal: string, contentVal: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', contentVal);
    };

    setMeta('meta[name="description"]', 'name', 'description', descriptionText);
    setMeta('meta[name="keywords"]', 'name', 'keywords', keywords);
    setMeta('meta[name="robots"]', 'name', 'robots', 'index, follow, max-image-preview:large');

    // Open Graph Meta Tags
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', descriptionText);
    setMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl);
    setMeta('meta[property="og:image:secure_url"]', 'property', 'og:image:secure_url', imageUrl);
    setMeta('meta[property="og:type"]', 'property', 'og:type', ogType);
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'Crypto Review Lab');
    setMeta('meta[property="og:locale"]', 'property', 'og:locale', 'en_US');

    // Twitter Card Meta Tags
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', descriptionText);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);

    // Canonical Tag
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    let originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.cryptoreviewlab.com';
    if (originUrl.includes('ais-dev-')) {
      originUrl = originUrl.replace('ais-dev-', 'ais-pre-');
    }
    let currentUrl = `${originUrl}${typeof window !== 'undefined' ? window.location.pathname : '/'}`;
    const canonicalParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    if (selectedReviewId) {
      canonicalParams.set('tab', activeTab || 'blog');
      canonicalParams.set('review', selectedReviewId);
    } else if (activeTab && activeTab !== 'lab') {
      canonicalParams.set('tab', activeTab);
    }
    const queryString = canonicalParams.toString();
    if (queryString) {
      currentUrl += `?${queryString}`;
    }
    canonicalTag.setAttribute('href', currentUrl);
    setMeta('meta[property="og:url"]', 'property', 'og:url', currentUrl);

    // Dynamic JSON-LD Injection
    let scriptEl = document.getElementById('crl-seo-jsonld');
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'crl-seo-jsonld';
      scriptEl.setAttribute('type', 'application/ld+json');
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(jsonLdData, null, 2);

    // Communicate with Parent window (Blogger theme / Host iframe)
    try {
      window.parent.postMessage({
        type: 'SEO_SYNC',
        title: title,
        description: descriptionText,
        image: imageUrl,
        url: currentUrl,
        reviewId: selectedReviewId || undefined
      }, '*');
    } catch (e) {
      console.warn("Could not post message to parent window:", e);
    }
  }, [activeTab, selectedReviewId, savedReviews]);

  const handleSaveReview = (newReview: CryptoReview) => {
    setSavedReviews((prev) => {
      const filtered = prev.filter(r => r.symbol !== newReview.symbol || r.name !== newReview.name);
      const updated = [newReview, ...filtered];
      persistReviews(updated);
      return updated;
    });
  };

  return (
    <F3VerificationProvider savedReviews={savedReviews} allReviews={allReviewsList}>
      <div className="min-h-screen w-full bg-cyber-bg-primary text-cyber-text-primary font-sans flex flex-col items-center justify-between selection:bg-cyber-cyan/20 selection:text-cyber-cyan relative cyber-grid cyber-scanlines">
      {/* Dynamic JSON-LD FAQ Schema injection for Google Rich Snippets */}
      <FaqJsonLd activeTab={activeTab} />
      
      {/* 1. Cyber Header */}
      <header className="sticky top-0 z-50 w-full bg-cyber-bg-primary/95 border-b border-cyber-cyan/20 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3 shrink-0 shadow-sm flex justify-center">
        <div className="max-w-7xl w-full mx-auto flex flex-col lg:flex-row items-center justify-between gap-3 sm:gap-4 lg:gap-6 min-w-0">
          
          {/* Logo Brand with custom rotating nested Hex design */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 relative flex-shrink-0">
              <svg fill="none" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_8px_rgba(0,229,255,0.6)] animate-pulse">
                <polygon fill="none" points="20,2 38,11 38,29 20,38 2,29 2,11" stroke="#00e5ff" strokeWidth="1.5"/>
                <polygon fill="none" opacity="0.3" points="20,8 32,14 32,26 20,32 8,26 8,14" stroke="#00e5ff" strokeWidth="0.8"/>
                <circle cx="17.5" cy="17.5" r="5.5" stroke="#00e5ff" strokeWidth="1.8" fill="none" />
                <path d="M15 15.5 a 2.5 2.5 0 0 1 2.5 -2.5" stroke="#00e5ff" strokeWidth="0.8" strokeLinecap="round" fill="none" />
                <line x1="21.5" y1="21.5" x2="28" y2="28" stroke="#00e5ff" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="font-orbitron font-black text-lg sm:text-xl md:text-2xl tracking-[2px] sm:tracking-[3.5px] text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-300 to-cyan-400 uppercase leading-none whitespace-nowrap drop-shadow-[0_0_16px_rgba(0,229,255,0.5)]">
                CRYPTO REVIEW LAB
              </h1>
              <span className="text-[7.5px] sm:text-[9px] font-orbitron font-semibold text-cyan-400/90 uppercase tracking-[1.5px] sm:tracking-[2.5px] block mt-1">
                Algorithmic Security Intelligence for Digital Assets
              </span>
            </div>
          </div>

          {/* Core Tab Navigators - Responsive horizontal scroll container */}
          <nav className="flex items-center bg-cyber-bg-card/90 p-1.5 border-2 border-cyber-cyan/25 rounded-xl w-full lg:w-auto min-w-0 max-w-full overflow-x-auto flex-nowrap scrollbar-thin scrollbar-thumb-cyber-cyan/40 scrollbar-track-cyber-bg-primary gap-1.5 shadow-[0_0_15px_rgba(0,229,255,0.08)] touch-pan-x select-none">
            <button
              onClick={() => handleTabChange('lab')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-orbitron font-black flex items-center gap-2 transition-all duration-300 uppercase tracking-wider cursor-pointer shrink-0 border relative ${
                activeTab === 'lab'
                  ? 'bg-gradient-to-r from-purple-600 via-cyber-cyan to-purple-600 text-slate-950 border-purple-300 shadow-[0_0_24px_rgba(168,85,247,0.7)] scale-[1.04]'
                  : 'bg-gradient-to-r from-purple-950/80 to-slate-900 text-purple-200 border-purple-500/40 hover:border-purple-400 hover:text-white hover:bg-purple-900/60 shadow-[0_0_12px_rgba(168,85,247,0.25)] font-bold'
              }`}
            >
              <Cpu className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${activeTab === 'lab' ? 'text-slate-950 animate-spin' : 'text-purple-400 animate-pulse'}`} />
              <span className="tracking-widest whitespace-nowrap">AVF REVIEW LAB</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-extrabold uppercase ${
                activeTab === 'lab' ? 'bg-slate-950 text-purple-300' : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              }`}>
                ENGINE
              </span>
            </button>

            <button
              onClick={() => handleTabChange('blog')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-orbitron font-bold flex items-center gap-1.5 transition-all duration-300 uppercase tracking-wider cursor-pointer shrink-0 border whitespace-nowrap ${
                activeTab === 'blog'
                  ? 'bg-cyber-cyan text-cyber-bg-primary border-cyber-cyan shadow-[0_0_16px_rgba(0,229,255,0.5)] scale-[1.02]'
                  : 'bg-cyber-bg-secondary/70 text-cyber-text-primary border-cyber-cyan/15 hover:border-cyber-cyan/50 hover:text-cyber-cyan hover:bg-cyber-cyan/10'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Market Intelligence</span>
            </button>

            <button
              onClick={() => handleTabChange('xstocks')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-orbitron font-bold flex items-center gap-1.5 transition-all duration-300 uppercase tracking-wider cursor-pointer shrink-0 border whitespace-nowrap ${
                activeTab === 'xstocks' || activeTab === 'academy'
                  ? 'bg-cyber-cyan text-cyber-bg-primary border-cyber-cyan shadow-[0_0_16px_rgba(0,229,255,0.5)] scale-[1.02]'
                  : 'bg-cyber-bg-secondary/70 text-cyber-text-primary border-cyber-cyan/15 hover:border-cyber-cyan/50 hover:text-cyber-cyan hover:bg-cyber-cyan/10'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Tokenized Stocks</span>
            </button>

            <button
              onClick={() => handleTabChange('chat')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-orbitron font-bold flex items-center gap-1.5 transition-all duration-300 uppercase tracking-wider cursor-pointer shrink-0 border whitespace-nowrap ${
                activeTab === 'chat'
                  ? 'bg-cyber-cyan text-cyber-bg-primary border-cyber-cyan shadow-[0_0_16px_rgba(0,229,255,0.5)] scale-[1.02]'
                  : 'bg-cyber-bg-secondary/70 text-cyber-text-primary border-cyber-cyan/15 hover:border-cyber-cyan/50 hover:text-cyber-cyan hover:bg-cyber-cyan/10'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Auditor Chat</span>
            </button>

            {/* Public Client Order Verification Tab */}
            <button
              onClick={() => handleTabChange('orders')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-orbitron font-bold flex items-center gap-1.5 transition-all duration-300 uppercase tracking-wider cursor-pointer shrink-0 border whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.5)] scale-[1.02]'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:border-amber-400 hover:text-amber-200 hover:bg-amber-500/20'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Verify Order</span>
            </button>

            {/* Admin Auditor Desk & F3 Dashboard - Master Auditor Only */}
            {isAdminMaster && (
              <>
                <button
                  onClick={() => handleTabChange('auditor')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-display font-black flex items-center gap-1.5 transition-all duration-300 uppercase tracking-wider cursor-pointer shrink-0 border whitespace-nowrap ${
                    activeTab === 'auditor'
                      ? 'bg-emerald-400 text-slate-950 border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.5)] scale-[1.02]'
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:border-emerald-400 hover:text-emerald-200 hover:bg-emerald-500/20 font-bold'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Auditor Desk</span>
                </button>

                <button
                  onClick={() => handleTabChange('f3')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-orbitron font-black flex items-center gap-1.5 transition-all duration-300 uppercase tracking-wider cursor-pointer shrink-0 border whitespace-nowrap ${
                    activeTab === 'f3'
                      ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 border-cyan-300 shadow-[0_0_16px_rgba(0,229,255,0.5)] scale-[1.02]'
                      : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:border-cyan-400 hover:text-cyan-200 hover:bg-cyan-500/20 font-bold'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>F3 Dashboard</span>
                </button>
              </>
            )}
          </nav>

          {/* Quick header controls & global currency selector */}
          <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3 text-xs font-orbitron uppercase tracking-wider w-full lg:w-auto flex-wrap sm:flex-nowrap shrink-0 pt-0.5 lg:pt-0">
            {/* Unified Sleek Fiat Currency Dropdown */}
            <CurrencyDropdown />

            {/* Header Search Input with Real-time Autocomplete Dropdown */}
            <div ref={searchContainerRef} className="relative w-40 sm:w-48 md:w-56">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-cyber-cyan absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={headerSearchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => {
                    setHeaderSearchQuery(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  placeholder="Quick search project..."
                  className="w-full bg-cyber-bg-primary border border-cyber-cyan/35 focus:border-cyber-cyan rounded-xl pl-8 pr-8 py-1.5 text-xs text-cyber-text-primary placeholder:text-cyber-text-muted focus:outline-none focus:shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-all font-mono"
                  aria-label="Quick search projects in header"
                />
                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-all cursor-pointer ${
                    micPermissionDenied
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 animate-bounce'
                      : isListening
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 animate-pulse'
                      : 'text-cyber-cyan/70 hover:text-cyber-cyan hover:bg-cyber-cyan/15'
                  }`}
                  title={
                    micPermissionDenied
                      ? 'Microphone permission blocked or denied (Click to retry)'
                      : isListening
                      ? 'Listening for voice command...'
                      : 'Voice Search (Click to speak)'
                  }
                  aria-label="Voice Search"
                >
                  {micPermissionDenied ? <MicOff className="w-3.5 h-3.5 text-amber-400" /> : isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Real-time Autocomplete Dropdown */}
              {isSearchFocused && headerSearchQuery.trim() !== '' && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-slate-950 border border-cyber-cyan/50 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto p-1.5 space-y-1 font-mono">
                  {searchResults.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No matching projects found
                    </div>
                  ) : (
                    searchResults.slice(0, 6).map(review => (
                      <button
                        key={review.id}
                        type="button"
                        onClick={() => {
                          setActiveTab('blog');
                          setSelectedReviewId(review.id);
                          setHeaderSearchQuery('');
                          setIsSearchFocused(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-cyber-cyan/15 border border-transparent hover:border-cyber-cyan/30 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded bg-cyber-cyan/20 text-cyber-cyan font-bold text-[9px] flex items-center justify-center shrink-0">
                            {review.symbol ? review.symbol.slice(0, 3) : 'REV'}
                          </span>
                          <div className="flex flex-col truncate">
                            <span className="text-xs font-bold text-slate-200 group-hover:text-cyber-cyan truncate">{review.name}</span>
                            <span className="text-[9px] text-slate-400 truncate">{review.category || 'Protocol'}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                          {review.grade || 'A+'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* 2. Main content wrap */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-8 pb-12 space-y-8 md:space-y-10 z-10">
        
        {/* Real-time Ticker banner displayed on Lab Home */}
        {activeTab === 'lab' && (
          <div className="space-y-8 md:space-y-10">
            {/* Desktop View Layout: Modern Financial Analytics Dashboard & Terminal */}
            <div className="hidden lg:flex flex-col gap-6 lg:gap-8">
              
              {/* 1. Institutional KPI Telemetry Bar */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-cyber-bg-card/90 border border-cyber-cyan/30 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex items-center justify-between group hover:border-cyber-cyan/60 transition-all">
                  <div className="space-y-1">
                    <span className="text-[10px] font-orbitron font-bold text-cyber-text-muted uppercase tracking-widest block">
                      VERIFIED AUDITS
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-orbitron font-black text-white tracking-wide">
                        {savedReviews.length + 18}+
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">
                        100% VERIFIED
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-cyber-bg-card/90 border border-cyber-cyan/30 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex items-center justify-between group hover:border-cyber-cyan/60 transition-all">
                  <div className="space-y-1">
                    <span className="text-[10px] font-orbitron font-bold text-cyber-text-muted uppercase tracking-widest block">
                      SECURITY RATING
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-orbitron font-black text-cyan-300 tracking-wide">
                        A+
                      </span>
                      <span className="text-[10px] font-mono font-bold text-cyan-400">
                        92.4 COMPOSITE
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-cyber-bg-card/90 border border-cyber-cyan/30 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex items-center justify-between group hover:border-cyber-cyan/60 transition-all">
                  <div className="space-y-1">
                    <span className="text-[10px] font-orbitron font-bold text-cyber-text-muted uppercase tracking-widest block">
                      MONITORED TVL
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-orbitron font-black text-emerald-300 tracking-wide">
                        $14.8B
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">
                        ON-CHAIN SYNC
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:scale-110 transition-transform">
                    <Zap className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-cyber-bg-card/90 border border-cyber-cyan/30 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex items-center justify-between group hover:border-cyber-cyan/60 transition-all">
                  <div className="space-y-1">
                    <span className="text-[10px] font-orbitron font-bold text-cyber-text-muted uppercase tracking-widest block">
                      ENGINE STATUS
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-orbitron font-black text-purple-300 tracking-wide">
                        AVF PRO
                      </span>
                      <span className="text-[10px] font-mono font-bold text-purple-400">
                        v3.2 ONLINE
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 group-hover:scale-110 transition-transform">
                    <Cpu className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* 2. Main Terminal Hero Grid */}
              <div className="grid grid-cols-12 gap-6 lg:gap-8 items-stretch">
                {/* Left Column (8 cols): Command & Analytics Console Card */}
                <div className="col-span-8 p-6 lg:p-7 rounded-2xl bg-gradient-to-br from-cyber-bg-card via-slate-950/90 to-cyber-bg-primary border border-cyber-cyan/35 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.4)] relative overflow-hidden flex flex-col justify-between group">
                  {/* Subtle top glow highlight */}
                  <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan/70 to-transparent" />
                  <div className="absolute -top-20 -right-20 w-48 h-48 bg-cyber-cyan/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-cyber-cyan/20 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
                        <span className="font-orbitron font-bold text-[10px] text-cyan-300 uppercase tracking-[2px]">
                          CRYPTO REVIEW LAB — INSTITUTIONAL SECURITY TERMINAL
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 border border-slate-800 px-2 py-0.5 rounded bg-slate-900">
                        SECURE NODE 01
                      </span>
                    </div>

                    <h2 className="font-orbitron font-extrabold text-3xl lg:text-4xl text-white tracking-wide leading-tight">
                      AVF Security & <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyber-cyan to-purple-400">Risk Assessment</span>
                    </h2>

                    <p className="text-sm text-slate-300 font-sans leading-relaxed max-w-3xl">
                      Algorithmic Verification Framework (AVF Engine) performing symbolic execution, flash-loan drain simulation, TVL stress analysis, and live multi-exchange market surveillance.
                    </p>
                  </div>

                  {/* Terminal Quick-Launch Action Console Grid */}
                  <div className="grid grid-cols-4 gap-3 pt-6 mt-4 border-t border-cyber-cyan/15">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('lab');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="p-3.5 rounded-xl bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/40 hover:border-cyber-cyan transition-all duration-300 text-left flex flex-col justify-between gap-2 group/btn cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.1)]"
                    >
                      <div className="flex items-center justify-between text-cyber-cyan">
                        <Zap className="w-4 h-4" />
                        <span className="text-[9px] font-mono font-bold opacity-75">01</span>
                      </div>
                      <div>
                        <div className="font-orbitron font-bold text-xs text-white group-hover/btn:text-cyber-cyan transition-colors">
                          Instant Audit
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          AVF Rapid Evaluation
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLaunchProEvaluation()}
                      className="p-3.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/40 hover:border-purple-400 transition-all duration-300 text-left flex flex-col justify-between gap-2 group/btn cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                    >
                      <div className="flex items-center justify-between text-purple-400">
                        <Crown className="w-4 h-4" />
                        <span className="text-[9px] font-mono font-bold opacity-75">02</span>
                      </div>
                      <div>
                        <div className="font-orbitron font-bold text-xs text-white group-hover/btn:text-purple-300 transition-colors">
                          Security Assessment
                        </div>
                        <div className="text-[10px] text-purple-300/70 font-mono">
                          In-Depth Verification
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCoinGeckoModalOpen(true)}
                      className="p-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400 transition-all duration-300 text-left flex flex-col justify-between gap-2 group/btn cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                    >
                      <div className="flex items-center justify-between text-emerald-400">
                        <Globe className="w-4 h-4" />
                        <span className="text-[9px] font-mono font-bold opacity-75">03</span>
                      </div>
                      <div>
                        <div className="font-orbitron font-bold text-xs text-white group-hover/btn:text-emerald-300 transition-colors">
                          CG + CMC Explorer
                        </div>
                        <div className="text-[10px] text-emerald-300/70 font-mono">
                          Tri-Sync Engine
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('chat');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="p-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400 transition-all duration-300 text-left flex flex-col justify-between gap-2 group/btn cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                    >
                      <div className="flex items-center justify-between text-amber-400">
                        <Terminal className="w-4 h-4" />
                        <span className="text-[9px] font-mono font-bold opacity-75">04</span>
                      </div>
                      <div>
                        <div className="font-orbitron font-bold text-xs text-white group-hover/btn:text-amber-300 transition-colors">
                          AI Contract Auditor
                        </div>
                        <div className="text-[10px] text-amber-300/70 font-mono">
                          Live Security Desk
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Right Column (4 cols): 3D Core Telemetry & Status Monitor Card */}
                <div className="col-span-4 p-4 rounded-2xl bg-cyber-bg-card/90 border border-cyber-cyan/35 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.4)] flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between pb-2 border-b border-cyber-cyan/15">
                    <span className="text-[10px] font-orbitron font-bold text-cyber-cyan uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyber-cyan animate-pulse" />
                      3D CORE MATRIX
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                      LATENCY &lt;12MS
                    </span>
                  </div>

                  <div className="w-full h-[180px] my-2 relative">
                    <React.Suspense fallback={null}>
                      <ThreeCore />
                    </React.Suspense>
                  </div>

                  <div className="pt-2 border-t border-cyber-cyan/15 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>NODE: EU-CENTRAL-1</span>
                    <span className="text-cyan-300 font-bold">AVF PRO v3.2</span>
                  </div>
                </div>
              </div>

              {/* 3. Lower Grid: Audited Projects Showcase */}
              <div className="w-full">
                <MarketTicker 
                  mode="showcase"
                  reviews={savedReviews}
                  onSelectReview={(id) => {
                    setSelectedReviewId(id);
                    setActiveTab('blog');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>

            </div>

            {/* Mobile View Layout: Single Column Stack */}
            <div className="flex lg:hidden flex-col gap-7 sm:gap-9 pt-2">
              {/* 1. Header description */}
              <div className="space-y-4 pb-1">
                <div>
                  <span className="inline-flex items-center gap-2 font-orbitron font-bold text-[8px] sm:text-[9px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/40 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full uppercase tracking-[1.5px] sm:tracking-[2px] shadow-[0_0_12px_rgba(0,229,255,0.18)] max-w-full truncate">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-400 animate-ping shrink-0"></span>
                    Live Crypto Markets Stream Active
                  </span>
                </div>
                <h2 className="font-orbitron font-extrabold text-[21px] sm:text-2xl md:text-3xl text-slate-100 tracking-tight sm:tracking-wide leading-tight pt-1 break-words">
                  AVF Security &amp;{' '}
                  <span className="font-orbitron font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyber-cyan to-purple-400 drop-shadow-[0_0_22px_rgba(0,229,255,0.5)] inline-block">
                    Risk Assessment
                  </span>
                </h2>
                
                {/* Redesigned Cyber Description Block */}
                <div className="relative p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-cyber-bg-card via-cyber-bg-card/90 to-cyber-bg-primary border border-cyber-cyan/30 backdrop-blur-md space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.08)] overflow-hidden transition-all duration-300 ease-out hover:border-cyber-cyan/50 hover:scale-[1.018] hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,229,255,0.22),inset_0_1px_1px_rgba(255,255,255,0.15)] group cursor-pointer">
                  {/* Ambient glowing accent orb in background */}
                  <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyber-cyan/15 rounded-full blur-2xl pointer-events-none group-hover:bg-cyber-cyan/25 transition-all duration-500" />
                  
                  {/* Glowing top accent highlight line */}
                  <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan/50 to-transparent" />

                  {/* Header bar inside card */}
                  <div className="flex items-center gap-2 border-b border-cyber-cyan/15 pb-2.5">
                    <div className="flex items-center gap-2 text-cyber-cyan font-orbitron text-[10px] sm:text-xs font-black uppercase tracking-[2px]">
                      <div className="p-1 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan shadow-[0_0_10px_rgba(0,229,255,0.2)]">
                        <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                      </div>
                      <span>CRYPTO SECURITY & AUDIT STREAM</span>
                    </div>
                  </div>

                  {/* Description Text */}
                  <p className="text-xs sm:text-sm text-slate-200 font-sans font-medium leading-relaxed pt-0.5 tracking-wide">
                    An Interactive Crypto Intelligence and Verification AI Platform — Powered by <span className="font-orbitron font-bold text-cyan-300">AVF Engine</span> (Algorithmic Verification Framework)
                  </p>

                  {/* Creative Feature Badges */}
                  <div className="flex flex-wrap gap-2 pt-1 font-orbitron text-[9px] sm:text-[10px] uppercase tracking-wider">
                    <span className="px-3 py-1 rounded-lg bg-cyber-cyan/10 text-cyan-300 border border-cyber-cyan/30 font-bold shadow-sm backdrop-blur-sm">
                      AVF Security Assessment
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold shadow-sm backdrop-blur-sm">
                      Real-Time Intelligence
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Logo 3D */}
              <div className="h-[320px] xs:h-[350px] sm:h-[380px] shrink-0 my-1 p-1 bg-transparent rounded-2xl">
                <React.Suspense fallback={null}>
                  <ThreeCore />
                </React.Suspense>
              </div>

              {/* 3. Audited Projects showcase card */}
              <div className="pt-1">
                <MarketTicker 
                  mode="showcase"
                  reviews={savedReviews}
                  onSelectReview={(id) => {
                    setSelectedReviewId(id);
                    setActiveTab('blog');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Core Tab Outputs */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <ComponentErrorBoundary name={activeTab === 'auditor' ? 'Auditor Desk' : activeTab === 'orders' ? 'Pro Orders Portal' : 'Module'}>
              <React.Suspense fallback={<ModuleLoadingFallback />}>
                {activeTab === 'lab' && (
                  <ReviewLab 
                    onSaveReview={handleSaveReview} 
                    savedReviews={savedReviews}
                    setActiveTab={setActiveTab}
                    initialAuditMode={labAuditMode}
                    prefillData={labPrefill}
                    onLaunchProEvaluation={handleLaunchProEvaluation}
                    onLaunchRegularEvaluation={handleLaunchRegularEvaluation}
                  />
                )}
                
                {activeTab === 'blog' && (
                  <BlogPreviewer 
                    reviews={allReviewsList}
                    selectedReviewId={selectedReviewId}
                    setSelectedReviewId={setSelectedReviewId}
                    setActiveTab={setActiveTab}
                    headerSearchQuery={headerSearchQuery}
                    setHeaderSearchQuery={setHeaderSearchQuery}
                    onOpenCoinGeckoModal={() => setIsCoinGeckoModalOpen(true)}
                    onSyncCoinGecko={syncCoinGeckoMarkets}
                    isSyncingCoinGecko={isSyncingCoinGecko}
                    onLaunchProEvaluation={handleLaunchProEvaluation}
                    onLaunchRegularEvaluation={handleLaunchRegularEvaluation}
                  />
                )}
                
                {activeTab === 'chat' && (
                  <AuditorChat 
                    reviews={allReviewsList}
                    onLaunchProEvaluation={handleLaunchProEvaluation}
                    onLaunchRegularEvaluation={handleLaunchRegularEvaluation}
                    initialQuery={chatInitialQuery}
                  />
                )}

                {(activeTab === 'xstocks' || activeTab === 'academy') && (
                  <XStocksPage />
                )}

                {activeTab === 'auditor' && (
                  !isAdminMaster ? (
                    <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-8 sm:p-10 text-center space-y-5 shadow-2xl max-w-xl mx-auto my-8">
                      <div className="w-14 h-14 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
                        <Key className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-100 font-sans">
                          Auditor Desk — Master Key Required
                        </h3>
                        <p className="text-xs text-slate-400 font-mono mt-1">
                          Please enter a valid Admin Master Key to access the 24h Auditor Workstation and client dispatch controls.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setPendingTabRequest('auditor');
                          setShowAdminGateModal(true);
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-mono font-bold text-xs rounded-xl transition-all shadow-lg cursor-pointer inline-flex items-center gap-2"
                      >
                        <Key className="w-4 h-4 text-slate-950" />
                        <span>Authenticate Master Key</span>
                      </button>
                    </div>
                  ) : (
                    <AuditorReviewConsole 
                      onSelectReviewForMainApp={(review) => {
                        handleTabChange('lab');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onLaunchProEvaluation={handleLaunchProEvaluation}
                      onLaunchRegularEvaluation={handleLaunchRegularEvaluation}
                      onLogout={handleAdminLogout}
                      onNavigateToF3={(reviewId) => {
                        if (reviewId) setSelectedReviewId(reviewId);
                        handleTabChange('f3');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  )
                )}

                {activeTab === 'f3' && (
                  !isAdminMaster ? (
                    <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-8 sm:p-10 text-center space-y-5 shadow-2xl max-w-xl mx-auto my-8">
                      <div className="w-14 h-14 bg-cyan-500/20 border border-cyan-500/40 rounded-2xl flex items-center justify-center mx-auto text-cyan-400">
                        <ShieldCheck className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-100 font-sans">
                          F3 Deterministic Dashboard — Master Key Required
                        </h3>
                        <p className="text-xs text-slate-400 font-mono mt-1">
                          Please enter a valid Admin Master Key to inspect the 8 deterministic algorithmic verification modules (AVF-01 through AVF-08) and cryptographic signature proofs.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setPendingTabRequest('f3');
                          setShowAdminGateModal(true);
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-mono font-bold text-xs rounded-xl transition-all shadow-lg cursor-pointer inline-flex items-center gap-2"
                      >
                        <Key className="w-4 h-4 text-slate-950" />
                        <span>Authenticate Master Key</span>
                      </button>
                    </div>
                  ) : (
                    <F3Dashboard 
                      reviews={allReviewsList}
                      savedReviews={savedReviews}
                      initialReviewId={selectedReviewId || undefined}
                      onSelectReviewForMainApp={(review) => {
                        setSelectedReviewId(review.id);
                        handleTabChange('blog');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onLaunchProEvaluation={handleLaunchProEvaluation}
                      onLaunchRegularEvaluation={handleLaunchRegularEvaluation}
                      isAdmin={isAdminMaster}
                    />
                  )
                )}

                {activeTab === 'orders' && (
                  <ProOrderPortal 
                    onSelectReview={(review) => {
                      handleTabChange('lab');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onLaunchProEvaluation={handleLaunchProEvaluation}
                    onLaunchRegularEvaluation={handleLaunchRegularEvaluation}
                  />
                )}
              </React.Suspense>
            </ComponentErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. Thematic Affiliate Exchange Badges Dropdown Menu */}
      <section className="border-t border-cyber-cyan/15 bg-cyber-bg-secondary/40 py-4 md:py-5 z-10 w-full flex justify-center">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setIsExchangesOpen(!isExchangesOpen)}
            className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-cyber-bg-card/90 hover:bg-cyber-bg-card border border-cyber-cyan/20 hover:border-cyber-cyan/45 transition-all duration-300 group cursor-pointer shadow-sm relative overflow-hidden"
          >
            {/* Top highlight glow */}
            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan/35 to-transparent pointer-events-none" />
            
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan group-hover:scale-105 transition-transform shrink-0 shadow-xs">
                <Building2 className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-orbitron font-extrabold text-xs md:text-sm text-slate-100 group-hover:text-cyber-cyan transition-colors tracking-wider uppercase">
                    Top Crypto Platforms to Start Your Trading Journey
                  </span>
                </div>
                <span className="text-[10px] md:text-xs text-cyber-text-muted font-mono leading-normal pt-0.5 break-words">
                  {isExchangesOpen ? 'Click to hide cryptocurrency exchange platforms' : 'Click to Explore Recommended Crypto Exchanges'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 ml-3">
              <span className="hidden sm:inline-block text-[9px] font-mono text-cyber-text-muted border border-cyber-cyan/15 px-2.5 py-1 rounded-md bg-cyber-bg-primary/50 uppercase tracking-wider">
                AFFILIATE INTEGRATION
              </span>
              <div className={`p-1.5 rounded-lg bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30 transition-transform duration-300 ${isExchangesOpen ? 'rotate-180' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </button>

          <AnimatePresence>
            {isExchangesOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="pt-2 pb-1 grid grid-cols-2 xs:grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
                  {[
                    { name: 'Binance', logo: 'https://i.imgur.com/tg69xsU.jpeg', link: 'https://www.binance.com/register?ref=10821519' },
                    { name: 'Bybit', logo: 'https://i.imgur.com/RC14WTx.jpeg', link: 'https://www.bybit.com/invite?ref=LX1Z3J' },
                    { name: 'Bitget', logo: 'https://i.imgur.com/G7Elaq9.jpeg', link: 'https://bonus.bitget.com/D47VQF' },
                    { name: 'MEXC', logo: 'https://i.imgur.com/t3Pz2VN.jpeg', link: 'https://promote.mexc.com/r/mGGXb0LtyB' },
                    { name: 'KuCoin', logo: 'https://i.imgur.com/QHg5liM.jpeg', link: 'https://www.kucoin.com/r/rf/QBSD1L7J' },
                    { name: 'Bitrue', logo: 'https://i.imgur.com/8iKd9hL.jpeg', link: 'https://www.bitrue.com/referral/landing?cn=600000&inviteCode=EWWHGA' },
                  ].map((exc) => (
                    <a
                      key={exc.name}
                      href={exc.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-cyber-bg-card border border-cyber-cyan/15 hover:border-cyber-cyan/50 hover:shadow-[0_0_15px_rgba(0,229,255,0.15)] rounded-2xl p-3 flex flex-col items-center text-center gap-2 transition-all duration-300 group"
                    >
                      <div className="w-9 h-9 md:w-11 md:h-11 rounded-full overflow-hidden border border-cyber-cyan/25 group-hover:scale-105 group-hover:border-cyber-cyan transition-transform shadow-sm">
                        <img src={exc.logo} alt={exc.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="font-display font-bold text-xs text-cyber-text-secondary group-hover:text-cyber-cyan transition-colors">
                        {exc.name}
                      </span>
                    </a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* 4. Complete Cyber Footer */}
      <footer className="border-t border-cyber-cyan/15 bg-cyber-bg-primary pt-10 pb-24 sm:pb-12 z-10 relative w-full flex justify-center">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 mb-8 pb-8 border-b border-cyber-cyan/10 items-center">
            {/* Column 1: Brand Card */}
            <div className="md:col-span-5 lg:col-span-5">
              <div className="relative p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-cyber-bg-card/90 via-cyber-bg-card/75 to-cyber-bg-primary border border-cyber-cyan/25 backdrop-blur-md space-y-2 shadow-sm overflow-hidden transition-all duration-300 ease-out hover:border-cyber-cyan/45 hover:shadow-[0_8px_25px_rgba(0,229,255,0.12)] group cursor-pointer">
                {/* Ambient glowing accent orb in background */}
                <div className="absolute -top-8 -right-8 w-16 h-16 bg-cyber-cyan/10 rounded-full blur-lg pointer-events-none group-hover:bg-cyber-cyan/20 transition-all duration-500" />
                
                {/* Glowing top accent highlight line */}
                <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan/40 to-transparent" />

                {/* Header bar inside card */}
                <div className="flex items-center gap-1.5 border-b border-cyber-cyan/15 pb-1.5">
                  <div className="flex items-center gap-1.5 text-cyber-cyan font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                    <div className="p-0.5 rounded-md bg-cyber-cyan/10 border border-cyber-cyan/25 text-cyber-cyan shadow-xs">
                      <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <span>Crypto Security & Audit Stream</span>
                  </div>
                </div>

                {/* Description Text */}
                <p className="text-[11px] sm:text-xs text-cyber-text-secondary leading-relaxed font-sans tracking-normal">
                  An Interactive Crypto Intelligence and Verification AI Platform — Powered by AVF Engine (Algorithmic Verification Framework)
                </p>

                {/* Creative Feature Badges - single row side-by-side */}
                <div className="flex items-center gap-1.5 pt-0.5 font-mono text-[8.5px] sm:text-[9.5px] whitespace-nowrap overflow-hidden">
                  <span className="px-2 py-0.5 rounded-md bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/20 font-bold shrink-0">
                    AVF Security Assessment
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-cyber-green/10 text-cyber-green border border-cyber-green/20 font-bold shrink-0">
                    Real-Time Intelligence
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2: NOWPayments Crypto Donation Button & QR Code Modal Trigger */}
            <div className="md:col-span-3 lg:col-span-3 flex flex-row md:flex-col items-center justify-center md:items-start gap-2.5 sm:gap-3 w-full">
              <a 
                href="https://nowpayments.io/donation?api_key=39e04c13-4de0-4f88-9b45-c2a47d895d35" 
                target="_blank" 
                rel="noreferrer noopener"
                className="inline-flex items-center justify-center transition-all duration-300 hover:scale-[1.02] focus:outline-none shrink-0"
                title="Support Crypto Review Lab with Crypto Donation"
              >
                <img 
                  src="https://nowpayments.io/images/embeds/donation-button-black.svg" 
                  alt="Crypto donation button by NOWPayments" 
                  className="h-9 sm:h-10 w-auto object-contain rounded-xl border border-cyber-cyan/35 hover:border-cyber-cyan shadow-sm transition-all"
                  referrerPolicy="no-referrer"
                />
              </a>

              <button
                type="button"
                onClick={() => setActiveModal('qr-donation')}
                className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3 bg-cyber-bg-card hover:bg-cyber-cyan/10 border border-cyber-cyan/40 hover:border-cyber-cyan text-cyber-cyan rounded-xl text-[9.5px] sm:text-[11px] font-orbitron font-extrabold uppercase tracking-tight shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
                title="Crypto Direct Donation"
              >
                <QrCode className="w-3.5 h-3.5 text-cyber-cyan shrink-0" />
                <span>Crypto Direct Donation</span>
              </button>
            </div>

            {/* Column 3: SITE */}
            <div className="md:col-span-4 lg:col-span-4 md:pl-8 lg:pl-16">
              <h4 className="font-display font-bold text-xs text-cyber-text-secondary uppercase tracking-widest mb-4">Site</h4>
              <ul className="space-y-2.5 text-xs text-cyber-text-muted text-left">
                <li><button onClick={() => setActiveModal('whats-avf')} className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-start gap-1.5 text-left w-full"><span className="shrink-0 text-cyber-cyan">›</span><span>What's AVF?</span></button></li>
                <li><button onClick={() => setActiveModal('author')} className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-start gap-1.5 text-left w-full"><span className="shrink-0 text-cyber-cyan">›</span><span>About Author</span></button></li>
                <li>
                  <a 
                    href="https://github.com/chokri29/Crypto-Review-Lab" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-start gap-1.5 text-left w-full"
                  >
                    <span className="shrink-0 text-cyber-cyan">›</span>
                    <span>GitHub</span>
                  </a>
                </li>
                <li>
                  <a 
                    href="https://www.crypto-academy.online/search/label/Reviews?m=1" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-start gap-1.5 text-left w-full"
                  >
                    <span className="shrink-0 text-cyber-cyan">›</span>
                    <span>Blog</span>
                  </a>
                </li>
                <li><button onClick={() => setActiveModal('contact')} className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-start gap-1.5 text-left w-full"><span className="shrink-0 text-cyber-cyan">›</span><span>Contact</span></button></li>
                <li><button onClick={() => setActiveModal('privacy')} className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-start gap-1.5 text-left w-full"><span className="shrink-0 text-cyber-cyan">›</span><span>Privacy Policy</span></button></li>
                <li><button onClick={() => setActiveModal('disclaimer')} className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-start gap-1.5 text-left w-full"><span className="shrink-0 text-cyber-cyan">›</span><span>Disclaimer</span></button></li>
                <li><button onClick={() => setActiveModal('tos')} className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-start gap-1.5 text-left w-full"><span className="shrink-0 text-cyber-cyan">›</span><span>Terms of Service</span></button></li>
              </ul>
            </div>
          </div>

          {/* Lower footer row featuring custom platform attribution badges and high-contrast copyright text */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 pt-2">
            <div className="flex flex-row items-center justify-center md:justify-start gap-2 sm:gap-3 w-full md:w-auto">
              {/* Built with Google AI Studio Badge - Clickable link to AI Studio */}
              <a
                href="https://aistudio.google.com"
                target="_blank"
                rel="noopener noreferrer"
                title="Proudly Built with Google AI Studio"
                className="bg-slate-900/90 border border-cyan-500/30 rounded-xl px-2.5 sm:px-3 py-1.5 flex items-center gap-2 hover:border-cyan-400 hover:shadow-[0_0_16px_rgba(30,161,242,0.35)] transition-all duration-200 cursor-pointer shrink-0 group min-h-[40px] sm:min-h-[44px]"
              >
                <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0C12 6.62742 6.62742 12 0 12C6.62742 12 12 17.3726 12 24C12 17.3726 17.3726 12 24 12C17.3726 12 12 6.62742 12 0Z" fill="url(#gemini-footer-grad)"/>
                    <defs>
                      <linearGradient id="gemini-footer-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#1EA1F2" />
                        <stop offset="0.5" stopColor="#8AB4F8" />
                        <stop offset="1" stopColor="#C58AF9" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="font-orbitron leading-none text-left">
                  <div className="text-[6.5px] sm:text-[7.5px] text-cyan-400/80 group-hover:text-cyan-300 uppercase font-orbitron font-bold tracking-[0.8px] sm:tracking-[1px]">PROUDLY BUILT WITH</div>
                  <div className="text-[10px] sm:text-xs font-black text-slate-100 group-hover:text-white tracking-wide mt-0.5 flex items-center gap-1">
                    <span>Google AI Studio</span>
                  </div>
                </div>
              </a>

              {/* Review Lab Badge - AVF Tripartite Core */}
              <div className="bg-purple-950/80 border border-purple-500/40 rounded-xl px-2.5 sm:px-3 py-1.5 flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.2)] shrink-0 min-h-[40px] sm:min-h-[44px]">
                <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 flex items-center justify-center shrink-0">
                  <div className="p-0.5 rounded bg-purple-500/20 text-purple-300">
                    <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="font-orbitron leading-none text-left">
                  <div className="text-[6.5px] sm:text-[7.5px] text-purple-300/80 uppercase font-orbitron font-bold tracking-[0.8px] sm:tracking-[1px]">AVF TRIPARTITE CORE</div>
                  <div className="text-[10px] sm:text-xs font-black text-purple-100 tracking-wide mt-0.5">REVIEW LAB</div>
                </div>
              </div>
            </div>

            {/* High contrast, well-spaced copyright notice */}
            <p className="font-mono text-[11px] sm:text-xs text-slate-400 font-medium uppercase tracking-wider text-center md:text-right pt-1 md:pt-0 shrink-0">
              © 2026 CRYPTO REVIEW LAB — ALL RIGHTS RESERVED
            </p>
          </div>
        </div>
      </footer>

      {/* ================= MODALS REGISTRY ================= */}
      <AnimatePresence>
        {activeModal && (
          <div 
            onClick={() => setActiveModal(null)} 
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              className="relative w-full max-w-lg bg-cyber-bg-card border border-cyber-cyan/35 rounded-2xl shadow-[0_0_50px_rgba(0,229,255,0.15)] overflow-hidden"
            >
              {/* Close button */}
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4.5 right-4.5 text-cyber-text-muted hover:text-cyber-cyan transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header neon ribbon */}
              <div className="h-[2px] bg-gradient-to-r from-cyber-blue to-cyber-cyan"></div>

              {/* Modal Content Router */}
              <div className="p-6">
                
                {/* 1. Subscribe Modal */}
                {activeModal === 'subscribe' && (
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-cyber-cyan/10 border border-cyber-cyan/30 rounded-xl flex items-center justify-center text-cyber-cyan mx-auto">
                      <Mail className="w-6 h-6" />
                    </div>
                    {hasSubscribed ? (
                      <div className="space-y-3 text-center">
                        <h3 className="font-display font-bold text-xl text-cyber-green uppercase tracking-wider">ACCESS GRANTED</h3>
                        <p className="text-xs text-cyber-text-secondary leading-relaxed">
                          Your address has been successfully registered. You are now subscribed to the **Crypto Review Lab** intelligence list.
                        </p>
                        <button
                          onClick={() => {
                            setActiveModal(null);
                            setHasSubscribed(false);
                          }}
                          className="mt-2 px-5 py-2 bg-cyber-cyan hover:bg-cyber-cyan/90 text-cyber-bg-primary font-display font-black text-[10px] uppercase tracking-widest rounded-lg transition-all cursor-pointer"
                        >
                          Acknowledge
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-center">
                          <h3 className="font-display font-bold text-xl text-cyber-cyan uppercase tracking-wider">STAY IN THE LOOP</h3>
                          <p className="text-xs text-cyber-text-secondary mt-1 leading-relaxed">
                            Get the latest secure protocol ratings, algorithmic audits, and smart contract bulletins straight to your inbox.
                          </p>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); setHasSubscribed(true); }} className="space-y-3">
                          <input 
                            type="email" 
                            required 
                            placeholder="your@email.com"
                            className="w-full bg-cyber-bg-primary border border-cyber-cyan/20 rounded-xl px-4 py-2.5 text-cyber-text-primary text-xs focus:outline-none focus:border-cyber-cyan/50 transition-colors"
                          />
                          <button 
                            type="submit"
                            className="w-full bg-cyber-cyan hover:bg-cyber-cyan/90 text-cyber-bg-primary font-display font-black text-xs py-3 px-4 rounded-xl shadow-[0_4px_14px_rgba(0,229,255,0.25)] transition-all cursor-pointer uppercase tracking-widest"
                          >
                            Subscribe via Email
                          </button>
                        </form>
                        <p className="text-[9px] font-mono text-cyber-text-muted text-center tracking-wider">
                          ZERO SPAM. UNSUBSCRIBE ANYTIME.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* 2. About Author Modal */}
                {activeModal === 'author' && (
                  <div className="space-y-4 text-center flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-cyber-cyan drop-shadow-[0_0_10px_rgba(0,229,255,0.4)]">
                      <img src="https://i.imgur.com/HPeUnAQ.png" alt="Chokri AlGhanmi" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="font-mono text-[9px] text-cyber-cyan uppercase tracking-widest">Crypto Review Lab Lead Author</span>
                      <h3 className="font-display font-bold text-2xl text-cyber-text-primary mt-1">Chokri AlGhanmi</h3>
                      <p className="text-xs font-mono text-cyber-text-muted uppercase mt-0.5">Analyst since 2017</p>
                    </div>

                    <p className="text-xs text-cyber-text-secondary leading-relaxed max-w-sm">
                      Former accountant, blogger, and crypto projects tracker since 2017. Previously worked as an Arabic translator for Binance Academy.
                    </p>

                    <div className="flex flex-col gap-2 w-full pt-2">
                      <a 
                        href="https://x.com/algunmi" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="border border-cyber-cyan/30 hover:border-cyber-cyan hover:bg-cyber-cyan/5 text-cyber-cyan rounded-xl py-2 text-xs font-display font-bold tracking-wider transition-colors"
                      >
                        X (Twitter)
                      </a>
                      <a 
                        href="https://www.linkedin.com/in/ghanmichokri/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="border border-cyber-cyan/30 hover:border-cyber-cyan hover:bg-cyber-cyan/5 text-cyber-cyan rounded-xl py-2 text-xs font-display font-bold tracking-wider transition-colors"
                      >
                        LinkedIn
                      </a>
                      <a 
                        href="https://bio.link/chokri29" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="border border-cyber-cyan/30 hover:border-cyber-cyan hover:bg-cyber-cyan/5 text-cyber-cyan rounded-xl py-2 text-xs font-display font-bold tracking-wider transition-colors"
                      >
                        Digital Bio Link
                      </a>
                    </div>
                  </div>
                )}

                {/* 3. Privacy Policy Modal */}
                {activeModal === 'privacy' && (
                  <div className="space-y-4 max-h-[440px] overflow-y-auto pr-2">
                    <h3 className="font-display font-bold text-lg text-cyber-cyan">Privacy Policy</h3>
                    <p className="text-[10px] font-mono text-cyber-text-muted uppercase">Last Updated: June 11, 2026</p>
                    
                    <div className="space-y-3 text-xs text-cyber-text-secondary leading-relaxed">
                      <div>
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide">1. Information We Collect</h4>
                        <p>We do not directly collect personal data in this sandbox environment. However, affiliate exchange triggers and email newsletter forms leverage robust external endpoints which might capture registration metrics.</p>
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide">2. Cookies & Tracking</h4>
                        <p>Blogger services, Google Analytics, and third-party affiliate exchange portals set baseline cookies to correctly monitor referral commissions.</p>
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide">3. Affiliate Disclosures</h4>
                        <p>We actively participate in web3 exchange affiliate programs. Registrations using specified links may generate rewards that help fund Crypto Review Lab.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Disclaimer Modal */}
                {activeModal === 'disclaimer' && (
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-cyber-orange/10 border border-cyber-orange/30 rounded-xl flex items-center justify-center text-cyber-orange animate-pulse">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <h3 className="font-display font-bold text-lg text-cyber-orange">Financial & Assessment Disclaimer</h3>
                    <p className="text-xs text-cyber-text-secondary leading-relaxed">
                      All analytical calculations, security diagnostic scores, and reports generated by the Crypto Review Lab platform are algorithmic assessments intended for technical evaluation and risk diagnostics.
                    </p>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono leading-relaxed space-y-1.5 text-left">
                      <p className="font-bold uppercase tracking-wider text-amber-300">Methodology & Scope Notice:</p>
                      <p className="text-slate-300">This is an automated security assessment and pre-flight check, not a formal smart-contract audit or certification.</p>
                      <p className="text-slate-300"><strong>Independent Assessment Policy:</strong> Crypto Review Lab does not sell security ratings, favorable scores, or verification outcomes. Customers pay for the assessment process and actionable findings. Assessment results are determined by the Crypto Review Lab methodology and verification engine.</p>
                    </div>
                    <p className="text-xs text-cyber-text-secondary leading-relaxed">
                      Cryptocurrency markets carry absolute risk, volatility, and smart contract execution failures. No piece of information provided constitutes investment, financial, legal, or fiscal advice. Hold digital assets at your own risk.
                    </p>
                  </div>
                )}

                {/* 4.5 Terms of Service Modal */}
                {activeModal === 'tos' && (
                  <div className="space-y-4 max-h-[440px] overflow-y-auto pr-2">
                    <div className="w-12 h-12 bg-cyber-cyan/10 border border-cyber-cyan/30 rounded-xl flex items-center justify-center text-cyber-cyan">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="font-display font-bold text-lg text-cyber-cyan">Terms of Service</h3>
                    <p className="text-[10px] font-mono text-cyber-text-muted uppercase">Last Updated: August 26, 2026</p>
                    
                    {/* Notice & Assessment Policy Callout */}
                    <div className="p-3 bg-cyber-bg-surface border border-amber-500/30 rounded-xl space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold shrink-0">•</span>
                        <p className="text-slate-200">
                          <strong className="text-amber-400 font-mono uppercase">Notice:</strong> This is an automated security assessment, not a formal smart-contract audit or certification.
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-cyber-cyan font-bold shrink-0">•</span>
                        <p className="text-slate-300">
                          <strong className="text-cyber-cyan font-mono uppercase">Independent Assessment Policy:</strong> Crypto Review Lab does not sell security ratings, favorable scores, or verification outcomes. Customers pay for the assessment process and actionable findings. Assessment results are determined by the Crypto Review Lab methodology and verification engine.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 text-xs text-cyber-text-secondary leading-relaxed">
                      <div>
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">1. Acceptable Use & Assessment Scope</h4>
                        <p>
                          Users are granted permission to access Crypto Review Lab for personal, research, and technical security evaluation purposes (conducted prior to public launch, contract upgrades, or whenever detailed security verification is required). Security & Risk Assessments are automated algorithmic diagnostic evaluations, not formal smart-contract audits or certifications. You agree not to engage in any automated data scraping, unauthorized reverse engineering, or denial-of-service attempts.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">2. Independent Assessment Policy</h4>
                        <p>
                          Crypto Review Lab does not sell security ratings, favorable scores, or verification outcomes. Customers pay exclusively for the assessment process, threat scanning, and actionable remediation findings. Assessment results and risk ratings are determined autonomously and impartially by the Crypto Review Lab methodology and verification engine.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">3. Intellectual Property</h4>
                        <p>
                          All original content, designs, grading frameworks, scoring methodologies, and visual elements on Crypto Review Lab are the exclusive property of Crypto Review Lab and Chokri AlGhanmi. Re-distribution, copying, or embedding of these systems without express written consent is strictly prohibited.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">4. Liability & Disclaimers</h4>
                        <p>
                          All reviews, ratings, risk indexes, and financial charts are algorithmic simulations and do not constitute financial, investment, or legal advice. Crypto Review Lab is provided "as is" without warranty of any kind. We are not liable for any financial losses, investment decisions, or smart contract exploits resulting from your use of this application.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* What's AVF Modal */}
                {activeModal === 'whats-avf' && (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    <div className="border-b border-purple-500/30 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
                          <Cpu className="w-6 h-6 text-purple-400 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono uppercase tracking-widest font-black px-2 py-0.5 rounded bg-purple-950 border border-purple-500/50 text-purple-300">
                              NEW INVENTION — CRL EXCLUSIVE
                            </span>
                          </div>
                          <h3 className="font-display font-bold text-xl text-slate-100 mt-0.5">
                            Algorithmic Verification Framework (AVF)
                          </h3>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      The <strong>Algorithmic Verification Framework (AVF)</strong> operates via a three-stage <strong>Tripartite Core</strong> architecture: the <strong>F1 Candidate Engine</strong> drafts the comprehensive evaluation, the <strong>F2 Reviewer</strong> independently stress-tests findings to drive score convergence, and the <strong>F3 Verification Layer</strong> executes 8 deterministic algorithmic verification modules with zero AI estimation to enforce mathematical rigor, cryptographic integrity, and institutional audit standards.
                    </p>

                    {/* Key Innovations / Tripartite Core Stages */}
                    <div className="space-y-3 font-mono text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-950/90 border border-purple-500/30 space-y-2">
                        <div className="flex items-center gap-2 text-purple-300 font-bold">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <span>Stage 1: F1 Candidate Engine</span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                          F1 constructs the primary multi-dimensional audit draft, synthesizing on-chain metrics, smart contract vulnerabilities, tokenomics schedules, and multi-vector stress simulations.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/30 space-y-2">
                        <div className="flex items-center gap-2 text-cyan-300 font-bold">
                          <RefreshCw className="w-4 h-4 text-cyan-400" />
                          <span>Stage 2: F2 Reviewer Convergence</span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                          F2 acts as an independent reviewer, cross-examining candidate findings against exploit records and issuing structured correction directives until score drift stabilizes below &lt;3.0 points.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/30 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-300 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Stage 3: F3 Verification Layer</span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                          F3 deterministically executes 8 AVF verification modules (AVF-01 through AVF-08) with zero AI calls, verifying math aggregation, rubric methodology, risk consistency, and Ed25519/SHA-256 traceability.
                        </p>
                      </div>
                    </div>

                    {/* Footer Call to Action */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
                      <span className="text-[11px] font-mono text-slate-400 text-center sm:text-left">
                        Experience live AVF audits in the AVF Review Lab.
                      </span>
                      <button
                        onClick={() => {
                          setActiveModal(null);
                          handleLaunchProEvaluation();
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-cyan-400 hover:from-purple-500 hover:to-cyan-300 text-slate-950 font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-500/20 flex items-center justify-center gap-1.5 border border-cyan-300/40 text-center shrink-0"
                      >
                        <Crown className="w-3.5 h-3.5 text-slate-950 fill-slate-950 shrink-0" />
                        <span>LAUNCH SECURITY & RISK ASSESSMENT ›</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. Custom Gold Resources Modal */}
                {activeModal === 'resources' && (
                  <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
                    <div className="border-b border-amber-500/20 pb-3">
                      <span className="font-mono text-[9px] text-amber-400 uppercase tracking-widest block mb-1">RECOMMENDED REFERENCE GUIDES</span>
                      <h3 className="font-display font-bold text-xl text-amber-400 flex items-center gap-1.5">
                        📚 Independent Learning Resources
                      </h3>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div>
                        <h4 className="font-display font-bold text-amber-300 uppercase tracking-wider mb-2">📕 Foundational Knowledge</h4>
                        <div className="grid grid-cols-1 gap-2">
                          <a href="https://bitcoin.org" target="_blank" rel="noopener noreferrer" className="bg-amber-500/[0.03] hover:bg-amber-500/[0.08] border border-amber-500/10 hover:border-amber-500/30 p-2.5 rounded-xl flex justify-between items-center transition-all group">
                            <span>Bitcoin.org — Whitepaper</span>
                            <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                          </a>
                          <a href="https://ethereum.org" target="_blank" rel="noopener noreferrer" className="bg-amber-500/[0.03] hover:bg-amber-500/[0.08] border border-amber-500/10 hover:border-amber-500/30 p-2.5 rounded-xl flex justify-between items-center transition-all group">
                            <span>Ethereum.org — Learning Hub</span>
                            <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                          </a>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-display font-bold text-amber-300 uppercase tracking-wider mb-2">📊 On-chain Data & Analytics</h4>
                        <div className="grid grid-cols-1 gap-2">
                          <a href="https://defillama.com" target="_blank" rel="noopener noreferrer" className="bg-amber-500/[0.03] hover:bg-amber-500/[0.08] border border-amber-500/10 hover:border-amber-500/30 p-2.5 rounded-xl flex justify-between items-center transition-all group">
                            <span>DeFi Llama — Smart Contract TVL</span>
                            <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                          </a>
                          <a href="https://etherscan.io" target="_blank" rel="noopener noreferrer" className="bg-amber-500/[0.03] hover:bg-amber-500/[0.08] border border-amber-500/10 hover:border-amber-500/30 p-2.5 rounded-xl flex justify-between items-center transition-all group">
                            <span>Etherscan — Blockchain Explorer</span>
                            <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                          </a>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-display font-bold text-amber-300 uppercase tracking-wider mb-2">🛡️ Smart Contract Audits & Security</h4>
                        <div className="grid grid-cols-1 gap-2">
                          <a href="https://academy.binance.com" target="_blank" rel="noopener noreferrer" className="bg-amber-500/[0.03] hover:bg-amber-500/[0.08] border border-amber-500/10 hover:border-amber-500/30 p-2.5 rounded-xl flex justify-between items-center transition-all group">
                            <span>Binance Academy — Security Courses</span>
                            <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                          </a>
                          <a href="https://www.ledger.com/academy" target="_blank" rel="noopener noreferrer" className="bg-amber-500/[0.03] hover:bg-amber-500/[0.08] border border-amber-500/10 hover:border-amber-500/30 p-2.5 rounded-xl flex justify-between items-center transition-all group">
                            <span>Ledger Academy — Wallet Cold Storage</span>
                            <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. Contact Modal */}
                {activeModal === 'contact' && (
                  <div className="space-y-4 text-center flex flex-col items-center">
                    <div className="w-12 h-12 bg-cyber-cyan/10 border border-cyber-cyan/30 rounded-xl flex items-center justify-center text-cyber-cyan">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-xl text-cyber-cyan">Get in Touch</h3>
                      <p className="text-xs text-cyber-text-secondary mt-1 max-w-sm">
                        For institutional audit inquiries, promotional collaborations, or general security feedback, reach out via the channels below.
                      </p>
                    </div>

                    <div className="bg-cyber-bg-primary/50 border border-cyber-cyan/10 rounded-xl p-3.5 w-full text-left space-y-2">
                      <p className="text-xs text-cyber-text-secondary flex justify-between items-center">
                        <span className="font-mono text-cyber-text-muted">Primary Email:</span>
                        <a href="mailto:reports@cryptoreviewlab.com" className="text-cyber-cyan hover:underline font-bold">reports@cryptoreviewlab.com</a>
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 w-full pt-1">
                      <a 
                        href="https://x.com/algunmi" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/30 hover:border-cyber-cyan/50 text-cyber-cyan rounded-xl py-2.5 text-xs font-display font-bold tracking-wider transition-all flex items-center justify-center gap-1.5"
                      >
                        <Globe className="w-4 h-4" />
                        <span>Send DM on X (Twitter)</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* 8. Learn: Bitcoin Basics */}
                {activeModal === 'learn-btc' && (
                  <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
                    <div className="border-b border-cyber-cyan/25 pb-3">
                      <span className="font-mono text-[9px] text-cyber-cyan uppercase tracking-widest block mb-1">LEARNING MODULE: BITCOIN</span>
                      <h3 className="font-display font-bold text-xl text-cyber-cyan flex items-center gap-1.5">
                        <CheckCircle2 className="w-5 h-5" />
                        Bitcoin Basics Guide
                      </h3>
                    </div>

                    <div className="space-y-4 text-xs text-cyber-text-secondary leading-relaxed text-left">
                      <div>
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">1. The UTXO Ledger Architecture</h4>
                        <p>Unlike standard bank ledgers that use simple balance models, Bitcoin uses the Unspent Transaction Output (UTXO) model. Think of UTXOs as individual physical cash bills. Your wallet balance is simply the total value of all your unspent UTXOs added together.</p>
                      </div>
                      <div className="mt-3">
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">2. Decoupled Multi-Signature Security</h4>
                        <p>Multi-signature (multi-sig) technology allows a wallet to require multiple private keys to sign and authorize a transaction. This ensures that even if one key is compromised, your Bitcoin remains completely secure under the protection of the remaining key holders.</p>
                      </div>
                      <div className="mt-3">
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">3. Immutable Halving Schedule</h4>
                        <p>Bitcoin has an absolute fixed supply cap of 21 million tokens. Approximately every 4 years (or every 210,000 blocks), the mining reward is cut in half. This programmatically drives down inflation, ensuring hard digital scarcity over long time horizons.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 9. Learn: Ethereum Masterclass */}
                {activeModal === 'learn-eth' && (
                  <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
                    <div className="border-b border-cyber-cyan/25 pb-3">
                      <span className="font-mono text-[9px] text-cyber-cyan uppercase tracking-widest block mb-1">LEARNING MODULE: ETHEREUM</span>
                      <h3 className="font-display font-bold text-xl text-cyber-cyan flex items-center gap-1.5">
                        <Layers className="w-5 h-5" />
                        Ethereum Masterclass
                      </h3>
                    </div>

                    <div className="space-y-4 text-xs text-cyber-text-secondary leading-relaxed text-left">
                      <div>
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">1. Gas Fees and EIP-1559 Burning</h4>
                        <p>Every computation on the Ethereum Virtual Machine (EVM) requires Gas. EIP-1559 split the gas fees into a Base Fee and a Priority Fee (tip). The Base Fee is permanently burned with every transaction, effectively reducing total supply during high demand spikes.</p>
                      </div>
                      <div className="mt-3">
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">2. Layer 2 Rollups & Scalability</h4>
                        <p>Layer 2 networks (like Arbitrum, Optimism, and Base) scale Ethereum by bundling thousands of transactions off-chain, compress them, and post the transaction batches back to Ethereum Layer 1 for absolute security and final settlement.</p>
                      </div>
                      <div className="mt-3">
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">3. Reentrancy Vulnerability Auditing</h4>
                        <p>One of the most common smart contract vulnerabilities. It occurs when a contract makes an external call to an untrusted contract before updating its own state balances, allowing the attacker to repeatedly withdraw funds in a loop.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 10. Learn: DeFi 101 */}
                {activeModal === 'learn-defi' && (
                  <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
                    <div className="border-b border-cyber-cyan/25 pb-3">
                      <span className="font-mono text-[9px] text-cyber-cyan uppercase tracking-widest block mb-1">LEARNING MODULE: DEFI</span>
                      <h3 className="font-display font-bold text-xl text-cyber-cyan flex items-center gap-1.5">
                        <FlaskConical className="w-5 h-5" />
                        DeFi 101 Security
                      </h3>
                    </div>

                    <div className="space-y-4 text-xs text-cyber-text-secondary leading-relaxed text-left">
                      <div>
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">1. Automated Market Makers (AMMs)</h4>
                        <p>AMMs allow digital assets to be traded permissionlessly using liquidity pools instead of traditional buyer/seller order books. Prices are calculated algorithmically based on the ratio of tokens inside the pool (e.g., x * y = k formula).</p>
                      </div>
                      <div className="mt-3">
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">2. Impermanent Loss Dynamics</h4>
                        <p>When you provide liquidity to a pool, and the price ratio of your deposited tokens changes relative to when you deposited them, you may experience Impermanent Loss (IL) compared to simply holding the assets in your wallet.</p>
                      </div>
                      <div className="mt-3">
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">3. Liquidity Lock Validation</h4>
                        <p>Always verify if a DeFi project has locked its initial liquidity provider (LP) tokens in a secure lock smart contract (like Team Finance or Unicrypt). Unlocked LP tokens allow the founders to drain all trading liquidity instantly ("rug-pull").</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 11. Learn: Wallet Security */}
                {activeModal === 'learn-sec' && (
                  <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
                    <div className="border-b border-cyber-cyan/25 pb-3">
                      <span className="font-mono text-[9px] text-cyber-cyan uppercase tracking-widest block mb-1">LEARNING MODULE: WALLETS</span>
                      <h3 className="font-display font-bold text-xl text-cyber-cyan flex items-center gap-1.5">
                        <Lock className="w-5 h-5" />
                        Cold Wallet Isolation
                      </h3>
                    </div>

                    <div className="space-y-4 text-xs text-cyber-text-secondary leading-relaxed text-left">
                      <div>
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">1. Hot vs. Cold Storage</h4>
                        <p>Hot wallets (like browser extensions or mobile apps) are connected to the internet, making them susceptible to malware and phishing. Cold wallets (hardware wallets) store private keys in physical isolation off-the-grid, completely immune to remote hacks.</p>
                      </div>
                      <div className="mt-3">
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">2. Seed Phrase Security Hygiene</h4>
                        <p>Never type your 12 or 24-word recovery seed phrase on any computer, phone, or cloud storage. Always write it down on paper or stamp it on stainless steel plates and store it in a secure fireproof vault.</p>
                      </div>
                      <div className="mt-3">
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">3. Smart Contract Approval Revocation</h4>
                        <p>When you interact with dApps, you often approve them to spend your tokens. If the dApp is hacked later, attackers can drain your wallet using these active approvals. Use tools like Revoke.cash to regularly clear old smart contract permissions.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 10. QR Code Donation Modal (Multi-Network Dropdown & Tab Selector) */}
                {activeModal === 'qr-donation' && (() => {
                  const currentNet = DONATION_NETWORKS.find(n => n.id === selectedDonationNetwork) || DONATION_NETWORKS[1];
                  return (
                    <div className="space-y-3.5 text-center flex flex-col items-center">
                      {/* Header */}
                      <div className="w-full text-center pb-2 border-b border-cyber-cyan/15">
                        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/20 text-cyber-cyan font-mono text-[10px] uppercase tracking-widest mb-1">
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Trust Wallet Receive</span>
                        </div>
                        <h3 className="font-display font-bold text-xl text-cyber-text-primary uppercase tracking-wide">
                          Crypto Direct Donation
                        </h3>
                      </div>

                      {/* Refined Easy-Swipe Horizontal Network Bar */}
                      <div className="w-full relative">
                        <div className="flex items-center gap-1.5 p-1.5 bg-cyber-bg-primary/95 rounded-xl border border-cyber-cyan/25 overflow-x-auto no-scrollbar touch-pan-x scroll-smooth snap-x">
                          {DONATION_NETWORKS.map((net) => {
                            const isActive = selectedDonationNetwork === net.id;
                            return (
                              <button
                                key={net.id}
                                type="button"
                                onClick={() => setSelectedDonationNetwork(net.id as any)}
                                className={`shrink-0 snap-center px-3 py-1.5 rounded-lg text-xs font-display font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                                  isActive
                                    ? `${net.bgColor} text-white shadow-lg shadow-black/50 ring-1 ring-white/30 scale-[1.02]`
                                    : 'text-cyber-text-secondary hover:text-cyber-text-primary hover:bg-cyber-cyan/10 bg-slate-900/60 border border-slate-800/80'
                                }`}
                              >
                                <span className="w-4 h-4 rounded-full bg-black/35 flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {net.icon}
                                </span>
                                <span>{net.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Token Badge */}
                      <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-bold text-white shadow-sm">
                        <div className={`w-4 h-4 rounded-full ${currentNet.bgColor} flex items-center justify-center text-[10px] font-bold text-white`}>
                          {currentNet.icon}
                        </div>
                        <span className="font-display">{currentNet.symbol}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-700 text-[9px] font-mono text-slate-300 uppercase tracking-wider">
                          {currentNet.badge}
                        </span>
                      </div>

                      {/* Dynamic QR Code Card */}
                      <div className="relative bg-white p-3.5 rounded-2xl border-2 border-cyber-cyan/40 shadow-[0_0_30px_rgba(0,229,255,0.2)] w-56 h-56 flex items-center justify-center">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(currentNet.address)}&ecc=H`}
                          alt={`${currentNet.name} Wallet QR Code`} 
                          className="w-full h-full object-contain rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                        {/* Trust Shield Center Icon Overlay */}
                        <div className="absolute inset-0 m-auto w-9 h-9 bg-slate-900 border-2 border-cyber-cyan rounded-xl flex items-center justify-center text-cyber-cyan shadow-lg pointer-events-none">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Wallet Address Display */}
                      <div className="w-full bg-cyber-bg-primary/90 border border-cyber-cyan/25 rounded-xl p-3 text-center space-y-1">
                        <div className="text-[9px] font-mono text-cyber-text-muted uppercase tracking-wider">
                          {currentNet.name} ({currentNet.symbol}) Receive Address
                        </div>
                        <div className="font-mono text-xs text-cyber-cyan font-bold tracking-tight break-all select-all">
                          {currentNet.address}
                        </div>
                        {'memoText' in currentNet && currentNet.memoText && (
                          <div className="text-[10px] font-mono text-slate-400 pt-0.5">
                            {currentNet.memoText}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-3 w-full pt-1">
                        <button
                          type="button"
                          onClick={() => copySelectedAddress(currentNet.address)}
                          className={`py-2.5 px-4 rounded-xl border font-display font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            copiedAddress 
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                              : 'bg-cyber-bg-primary border-cyber-cyan/30 text-cyber-cyan hover:border-cyber-cyan hover:bg-cyber-cyan/10'
                          }`}
                        >
                          {copiedAddress ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedAddress ? 'Copied!' : 'Copy Address'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.share) {
                              navigator.share({
                                title: `Crypto Review Lab ${currentNet.name} Address`,
                                text: `${currentNet.name} (${currentNet.symbol}) Address: ${currentNet.address}`
                              }).catch(() => {});
                            } else {
                              copySelectedAddress(currentNet.address);
                            }
                          }}
                          className="py-2.5 px-4 rounded-xl bg-cyber-bg-primary border border-cyber-cyan/30 text-cyber-cyan hover:border-cyber-cyan hover:bg-cyber-cyan/10 font-display font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <React.Suspense fallback={null}>
        <CoinGeckoExplorerModal
          isOpen={isCoinGeckoModalOpen}
          onClose={() => setIsCoinGeckoModalOpen(false)}
          existingReviews={allReviewsList}
          onAddOrSwapReview={handleAddOrSwapReview}
          onSyncAllReviews={syncCoinGeckoMarkets}
          isSyncing={isSyncingCoinGecko}
        />
      </React.Suspense>

      <CookieBanner
        isVisible={showCookieBanner && activeModal !== 'privacy'}
        onAccept={handleAcceptCookies}
        onDecline={handleDeclineCookies}
        onPrivacyClick={() => setActiveModal('privacy')}
      />

      {/* Admin Master Key Authentication Gate Modal - Elevated Root Portal */}
      <AnimatePresence>
        {showAdminGateModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#0B0F19] border border-amber-500/50 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-[0_0_50px_rgba(245,158,11,0.25)] space-y-4 relative overflow-hidden my-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
                    <Lock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-base text-slate-100">
                      Restricted Admin Access
                    </h3>
                    <p className="text-[11px] font-mono text-amber-300">
                      Master Key Authorization Required
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAdminGateModal(false);
                    setAdminGateError(null);
                    setAdminGateKey('');
                    setAdminGatePassphrase('');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                The Auditor Desk and Pro Orders console are restricted. Both a valid Admin Master Key AND Passphrase are required for access.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block font-semibold mb-1">
                    Admin Master Key:
                  </label>
                  <input
                    type="password"
                    value={adminGateKey}
                    onChange={(e) => {
                      setAdminGateKey(e.target.value);
                      setAdminGateError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleVerifyAdminGateKey();
                    }}
                    placeholder="Enter Admin Master Key"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500/60 transition-colors shadow-inner"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block font-semibold mb-1">
                    Admin Passphrase:
                  </label>
                  <input
                    type="password"
                    value={adminGatePassphrase}
                    onChange={(e) => {
                      setAdminGatePassphrase(e.target.value);
                      setAdminGateError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleVerifyAdminGateKey();
                    }}
                    placeholder="Enter Admin Passphrase"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500/60 transition-colors shadow-inner"
                  />
                </div>

                {adminGateError && (
                  <p className="text-[11px] font-mono text-rose-400">{adminGateError}</p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => {
                    setShowAdminGateModal(false);
                    setAdminGateError(null);
                    setAdminGateKey('');
                    setAdminGatePassphrase('');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyAdminGateKey}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-mono font-bold text-xs shadow-lg transition-all cursor-pointer"
                >
                  Authenticate Admin
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 12 }}
            whileHover={{ scale: 1.12, boxShadow: '0 0 35px rgba(0, 229, 255, 0.85)' }}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={scrollToTop}
            className="fixed bottom-6 sm:bottom-8 right-4 sm:right-6 z-30 p-2.5 sm:p-3 rounded-2xl bg-cyber-bg-card/90 border-2 border-cyber-cyan/50 text-cyber-cyan hover:bg-cyber-cyan hover:text-cyber-bg-primary shadow-[0_0_20px_rgba(0,229,255,0.35)] backdrop-blur-md transition-colors duration-300 cursor-pointer group flex items-center justify-center"
            title="Scroll to Top"
            aria-label="Scroll to top of page"
          >
            <ChevronUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform stroke-[2.5]" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Voice Search / Dictation Interactive Modal */}
      <AnimatePresence>
        {isVoiceModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="bg-[#0B0F19] border border-cyber-cyan/50 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-[0_0_50px_rgba(0,229,255,0.25)] space-y-5 relative overflow-hidden my-auto text-center"
            >
              <div className="flex items-center justify-between border-b border-cyber-cyan/20 pb-3">
                <div className="flex items-center gap-2.5 text-cyber-cyan">
                  <Mic className="w-5 h-5 animate-pulse" />
                  <span className="font-display font-bold text-sm tracking-wider uppercase">Voice Command Search</span>
                </div>
                <button
                  onClick={() => setIsVoiceModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 flex flex-col items-center justify-center space-y-4">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-cyber-cyan/20 blur-xl animate-ping"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-cyber-cyan/40 animate-[spin_10s_linear_infinite]"></div>
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyber-cyan to-indigo-600 flex items-center justify-center text-slate-950 shadow-[0_0_25px_rgba(0,229,255,0.6)] z-10">
                    <Mic className="w-7 h-7" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="font-sans font-bold text-base text-white">
                    {isListening ? 'Listening for voice command...' : 'Microphone Ready or Sandbox Restricted'}
                  </h4>
                  <p className="text-xs font-mono text-slate-400 max-w-xs mx-auto">
                    {isListening 
                      ? 'Say a project name (e.g. "Zama", "Solana", "Bitcoin") or tap a quick-search option below.' 
                      : 'Speech recognition sandbox restricted in browser. Tap any popular project below or type your search query:'}
                  </p>
                </div>

                {/* Quick-tap project suggestions */}
                <div className="pt-2 w-full space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-cyber-cyan/80 text-left">Quick Voice Tokens:</p>
                  <div className="flex flex-wrap gap-1.5 justify-start">
                    {['Zama', 'Solana', 'Bitcoin', 'Ethereum', 'Hyperliquid', 'Render', 'Jupiter', 'Sui', 'Arbitrum', 'Uniswap', 'Kaspa', 'Link'].map((token) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => {
                          setHeaderSearchQuery(token);
                          setIsSearchFocused(true);
                          setIsVoiceModalOpen(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-cyber-cyan/10 hover:bg-cyber-cyan hover:text-slate-950 text-cyber-cyan border border-cyber-cyan/30 text-xs font-mono font-bold transition-all cursor-pointer"
                      >
                        🎙️ {token}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual search input inside modal */}
                <div className="pt-3 w-full">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type project or ticker..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val) {
                            setHeaderSearchQuery(val);
                            setIsSearchFocused(true);
                            setIsVoiceModalOpen(false);
                          }
                        }
                      }}
                      className="flex-1 bg-slate-900 border border-cyber-cyan/40 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyber-cyan"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const inputEl = (e.currentTarget.previousElementSibling as HTMLInputElement);
                        if (inputEl && inputEl.value.trim()) {
                          setHeaderSearchQuery(inputEl.value.trim());
                          setIsSearchFocused(true);
                          setIsVoiceModalOpen(false);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-cyber-cyan text-slate-950 font-mono font-bold text-xs hover:bg-cyber-cyan/90 transition-all cursor-pointer"
                    >
                      Search
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>
    </F3VerificationProvider>
  );
}
