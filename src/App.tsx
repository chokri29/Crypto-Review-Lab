/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Sun,
  Moon,
  Search,
  QrCode,
  Copy,
  Check,
  Share2,
  DollarSign
} from 'lucide-react';
import { CryptoReview } from './types';
import { INITIAL_REVIEWS } from './data';
import { getCoinLogoUrl } from './utils/coinLogos';
import { createReviewFromCoinGecko } from './services/coingecko';
import ReviewLab from './components/ReviewLab';
import BlogPreviewer from './components/BlogPreviewer';
import AuditorChat from './components/AuditorChat';
import AcademyReviews from './components/AcademyReviews';
import ThreeCore from './components/ThreeCore';
import MarketTicker from './components/MarketTicker';
import CookieBanner from './components/CookieBanner';
import FaqJsonLd from './components/FaqJsonLd';
import CoinGeckoExplorerModal from './components/CoinGeckoExplorerModal';
import { fetchLiveCoinGeckoMarkets } from './services/coingecko';

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

  const [activeTab, setActiveTab] = useState<'lab' | 'blog' | 'chat' | 'academy'>(() => {
    try {
      const params = getInitialUrlParams();
      // Prioritize review parameter over tab parameter during initial state loading
      const reviewParam = params.get('review') || params.get('reviewId') || params.get('article') || params.get('id');
      if (reviewParam) {
        return 'blog';
      }

      const tab = params.get('tab');
      if (tab === 'lab' || tab === 'blog' || tab === 'chat' || tab === 'academy') {
        return tab;
      }

      // If it's the academy domain, default to 'academy'
      const isAcademy = typeof window !== 'undefined' && 
        (window.location.hostname.includes('crypto-academy') || 
         window.location.hostname.includes('cryptoacademy') || 
         window.location.search.includes('tab=academy'));
      if (isAcademy) {
        return 'academy';
      }
    } catch (e) {
      console.warn('URL parsing failed:', e);
    }
    return 'lab';
  });

  const [savedReviews, setSavedReviews] = useState<CryptoReview[]>([]);
  const [hasSubscribed, setHasSubscribed] = useState<boolean>(false);

  // Header Search State & Event Listeners
  const [headerSearchQuery, setHeaderSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('crypto_review_lab_theme') as 'dark' | 'light') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('crypto_review_lab_theme', theme);
    } catch (e) {
      // ignore
    }
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

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
  const [activeModal, setActiveModal] = useState<'subscribe' | 'author' | 'privacy' | 'disclaimer' | 'resources' | 'contact' | 'learn-btc' | 'learn-eth' | 'learn-defi' | 'learn-sec' | 'qr-donation' | 'tos' | null>(null);
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

  // Sync live price & market data for all active reviews via CoinGecko API
  const syncCoinGeckoMarkets = async (listToSync?: CryptoReview[]) => {
    const targetList = listToSync || (savedReviews.length > 0 ? savedReviews : INITIAL_REVIEWS);
    if (!targetList || targetList.length === 0) return;

    setIsSyncingCoinGecko(true);
    try {
      const ids = targetList
        .map(r => r.coingeckoId || r.symbol.toLowerCase())
        .filter(Boolean);

      const marketDataMap = await fetchLiveCoinGeckoMarkets(ids);

      setSavedReviews((prevList) => {
        const currentList = prevList.length > 0 ? prevList : INITIAL_REVIEWS;
        const updated = currentList.map((review) => {
          const cgId = review.coingeckoId || review.symbol.toLowerCase();
          const liveData = marketDataMap[cgId] || marketDataMap[review.symbol.toLowerCase()];
          const cleanLogo = getCoinLogoUrl(review.symbol, liveData?.image || review.logoUrl, review.coingeckoId);

          if (liveData) {
            return {
              ...review,
              coingeckoId: liveData.id,
              livePrice: liveData.current_price,
              liveChange24h: liveData.price_change_percentage_24h,
              liveMarketCap: liveData.market_cap,
              liveVolume24h: liveData.total_volume,
              liveRank: liveData.market_cap_rank,
              logoUrl: cleanLogo,
              lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
          }
          return {
            ...review,
            logoUrl: cleanLogo,
          };
        });

        try {
          localStorage.setItem('crypto_review_lab_drafts', JSON.stringify(updated));
        } catch (e) {
          console.warn('Could not save synced market data to localStorage:', e);
        }

        return updated;
      });
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

      try {
        localStorage.setItem('crypto_review_lab_drafts', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save newly added CoinGecko review:', e);
      }
      return updated;
    });

    // Select the new project and switch to blog view if needed
    setSelectedReviewId(newReview.id);
    setActiveTab('blog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load reviews from localStorage + INITIAL_REVIEWS on startup
  useEffect(() => {
    let initialList = INITIAL_REVIEWS;
    const stored = localStorage.getItem('crypto_review_lab_drafts');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = [...parsed];
          INITIAL_REVIEWS.forEach(initial => {
            if (!merged.some(r => r.id === initial.id)) {
              merged.unshift(initial);
            }
          });
          initialList = merged;
        }
      } catch (e) {
        console.error('Failed to load local drafts:', e);
      }
    }

    // Sanitize all logoUrls so corrupted imgur/article banners get replaced with official coin icons
    const sanitizedList = initialList.map((r) => ({
      ...r,
      logoUrl: getCoinLogoUrl(r.symbol, r.logoUrl, r.coingeckoId),
    }));

    setSavedReviews(sanitizedList);

    // Initial price sync from CoinGecko
    syncCoinGeckoMarkets(sanitizedList);

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
              try {
                localStorage.setItem('crypto_reviews_v1', JSON.stringify(updated));
              } catch (e) {
                console.warn('Failed to save auto-fetched review:', e);
              }
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
        } else if (tab === 'lab' || tab === 'blog' || tab === 'chat' || tab === 'academy') {
          setActiveTab(tab);
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
          if (event.data.tab && (event.data.tab === 'lab' || event.data.tab === 'blog' || event.data.tab === 'chat' || event.data.tab === 'academy')) {
            setActiveTab(event.data.tab);
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

  // Dynamic SEO meta tags and page titles updates based on current app state/views
  useEffect(() => {
    let title = "Crypto Review Lab";
    let descriptionText = "Independent reviews, ratings, security audits for top crypto projects and markets metrics.";
    let imageUrl = "https://www.cryptoreviewlab.com/og-banner.jpg";

    // Helper to find review across saved & initial reviews
    let matchedReview: CryptoReview | undefined;
    if (selectedReviewId) {
      const allReviews = [...savedReviews, ...INITIAL_REVIEWS];
      const revId = selectedReviewId;
      matchedReview = allReviews.find(r => 
        r.id === revId || 
        r.coingeckoId === revId || 
        r.id === `cg-${revId}` ||
        `cg-${r.coingeckoId}` === revId ||
        (revId && r.id.toLowerCase() === revId.toLowerCase()) ||
        (revId && r.coingeckoId && r.coingeckoId.toLowerCase() === revId.replace(/^cg-/, '').toLowerCase())
      );
    }

    if (matchedReview) {
      title = `${matchedReview.name} (${matchedReview.symbol}) ${matchedReview.grade} Security Review & Rating | Crypto Review Lab`;
      descriptionText = `Read our objective ${matchedReview.grade}-rated security review of ${matchedReview.name} (${matchedReview.symbol}). Overall score: ${matchedReview.overallScore}/100. Verdict: ${matchedReview.verdict}`;
      const logo = getCoinLogoUrl(matchedReview.symbol, matchedReview.logoUrl, matchedReview.coingeckoId);
      if (logo) {
        imageUrl = logo;
      }
    } else if (activeTab === 'lab') {
      title = "Crypto Prop Firm Reviews & Independent Crypto Ratings | Crypto Lab";
      descriptionText = "Access our comprehensive library of cryptocurrency protocol reviews, prop firm evaluations, technical grade rubrics, and security audits.";
    } else if (activeTab === 'blog') {
      title = "Crypto Projects Review & Market Analysis Blog | Crypto Review Lab";
      descriptionText = "Stay informed with real-time crypto project analysis, prop firm challenge guides, market safety alerts, and expert regulatory insights.";
    } else if (activeTab === 'chat') {
      title = "Crypto Security AI Assistant & Contract Auditor | Crypto Review Lab";
      descriptionText = "Ask our AI Assistant anything about prop firm reviews, exchange ratings, project security, smart contract audits, or custom blockchain appraisals.";
    } else if (activeTab === 'academy') {
      title = "Crypto Academy & Blockchain Technology Guide | Crypto Review Lab";
      descriptionText = "Learn blockchain technology from scratch. Master proof-of-work, consensus mechanisms, smart contract vulnerabilities, and funded trading principles.";
    }

    // Handle standard meta tags
    document.title = title;

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

    // Open Graph meta tags
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', descriptionText);
    setMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl);
    setMeta('meta[property="og:image:secure_url"]', 'property', 'og:image:secure_url', imageUrl);

    // Twitter Card meta tags
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', descriptionText);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);

    // Ensure single canonical tag
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    let currentUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : `https://www.cryptoreviewlab.com/`;
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

    // Communicate with Parent window (Blogger theme) if running inside an iframe to sync title/description/image
    try {
      window.parent.postMessage({
        type: 'SEO_SYNC',
        title: title,
        description: descriptionText,
        image: imageUrl,
        url: currentUrl
      }, '*');
    } catch (e) {
      console.warn("Could not post message to parent:", e);
    }
  }, [activeTab, selectedReviewId, savedReviews]);

  const handleSaveReview = (newReview: CryptoReview) => {
    setSavedReviews((prev) => {
      const filtered = prev.filter(r => r.symbol !== newReview.symbol || r.name !== newReview.name);
      const updated = [newReview, ...filtered];
      localStorage.setItem('crypto_review_lab_drafts', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-cyber-bg-primary text-cyber-text-primary font-sans flex flex-col justify-between selection:bg-cyber-cyan/20 selection:text-cyber-cyan relative cyber-grid cyber-scanlines">
      {/* Dynamic JSON-LD FAQ Schema injection for Google Rich Snippets */}
      <FaqJsonLd activeTab={activeTab} />
      
      {/* 1. Cyber Header */}
      <header className="sticky top-0 z-50 bg-cyber-bg-primary/95 border-b border-cyber-cyan/20 backdrop-blur-md px-4 py-3 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 lg:gap-8">
          
          {/* Logo Brand with custom rotating nested Hex design */}
          <div className="flex items-center gap-3">
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
              <h1 className="font-display font-black text-lg sm:text-xl md:text-2xl tracking-[1px] sm:tracking-[2px] text-cyber-cyan leading-none whitespace-nowrap drop-shadow-[0_0_12px_rgba(0,229,255,0.35)]">
                CRYPTO REVIEW LAB
              </h1>
              <span className="text-[9px] sm:text-[10px] font-mono text-cyber-text-muted uppercase tracking-[1.5px] sm:tracking-[2.5px] block mt-1">
                Live Cyber Audit Stream Active
              </span>
            </div>
          </div>

          {/* Core Tab Navigators */}
          <nav className="flex items-center bg-cyber-bg-card/90 p-1.5 border-2 border-cyber-cyan/25 rounded-xl max-w-[92vw] overflow-x-auto flex-nowrap scrollbar-none shrink-0 md:max-w-none gap-1.5 shadow-[0_0_15px_rgba(0,229,255,0.08)]">
            <button
              onClick={() => setActiveTab('lab')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-display font-black flex items-center gap-1.5 transition-all duration-300 uppercase tracking-wider cursor-pointer shrink-0 border ${
                activeTab === 'lab'
                  ? 'bg-cyber-cyan text-cyber-bg-primary border-cyber-cyan shadow-[0_0_16px_rgba(0,229,255,0.5)] scale-[1.02]'
                  : 'bg-cyber-bg-secondary/70 text-cyber-text-primary border-cyber-cyan/15 hover:border-cyber-cyan/50 hover:text-cyber-cyan hover:bg-cyber-cyan/10 font-bold'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Review Lab</span>
            </button>

            <button
              onClick={() => setActiveTab('blog')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-display font-black flex items-center gap-1.5 transition-all duration-300 uppercase tracking-wider cursor-pointer shrink-0 border ${
                activeTab === 'blog'
                  ? 'bg-cyber-cyan text-cyber-bg-primary border-cyber-cyan shadow-[0_0_16px_rgba(0,229,255,0.5)] scale-[1.02]'
                  : 'bg-cyber-bg-secondary/70 text-cyber-text-primary border-cyber-cyan/15 hover:border-cyber-cyan/50 hover:text-cyber-cyan hover:bg-cyber-cyan/10 font-bold'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Projects Review</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-display font-black flex items-center gap-1.5 transition-all duration-300 uppercase tracking-wider cursor-pointer shrink-0 border ${
                activeTab === 'chat'
                  ? 'bg-cyber-cyan text-cyber-bg-primary border-cyber-cyan shadow-[0_0_16px_rgba(0,229,255,0.5)] scale-[1.02]'
                  : 'bg-cyber-bg-secondary/70 text-cyber-text-primary border-cyber-cyan/15 hover:border-cyber-cyan/50 hover:text-cyber-cyan hover:bg-cyber-cyan/10 font-bold'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Auditor Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('academy')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-display font-black flex items-center gap-1.5 transition-all duration-300 uppercase tracking-wider cursor-pointer shrink-0 border ${
                activeTab === 'academy'
                  ? 'bg-cyber-cyan text-cyber-bg-primary border-cyber-cyan shadow-[0_0_16px_rgba(0,229,255,0.5)] scale-[1.02]'
                  : 'bg-cyber-bg-secondary/70 text-cyber-text-primary border-cyber-cyan/15 hover:border-cyber-cyan/50 hover:text-cyber-cyan hover:bg-cyber-cyan/10 font-bold'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Academy Reviews</span>
            </button>
          </nav>

          {/* Quick theme navigation triggers */}
          <div className="flex items-center gap-2.5 sm:gap-3 text-xs font-display uppercase tracking-wider">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-cyber-bg-card/90 border-2 border-cyber-cyan/35 text-cyber-cyan hover:border-cyber-cyan hover:bg-cyber-cyan/15 transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 font-bold shadow-[0_0_12px_rgba(0,229,255,0.15)]"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Cyber Dark Mode'}
              aria-label="Toggle visual theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline text-[11px] font-mono tracking-wider">LIGHT</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-cyber-cyan" />
                  <span className="hidden sm:inline text-[11px] font-mono tracking-wider">CYBER</span>
                </>
              )}
            </button>

            <a 
              href="https://www.crypto-academy.online/?m=1"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-cyber-cyan/10 border-2 border-cyber-cyan/40 hover:border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan hover:text-cyber-bg-primary font-black px-3.5 py-1.5 rounded-xl hover:shadow-[0_0_16px_rgba(0,229,255,0.4)] transition-all duration-300 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <span>Crypto Academy</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button 
              onClick={() => {
                setHasSubscribed(false);
                setActiveModal('subscribe');
              }}
              className="bg-cyber-green text-cyber-bg-primary font-black px-3.5 py-1.5 rounded-xl hover:bg-cyber-green/90 shadow-[0_0_12px_rgba(0,255,136,0.3)] hover:shadow-[0_0_20px_rgba(0,255,136,0.5)] transition-all duration-300 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Subscribe</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. Main content wrap */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-8 pb-12 space-y-8 md:space-y-10 z-10">
        
        {/* Real-time Ticker banner displayed on Lab Home */}
        {activeTab === 'lab' && (
          <div className="space-y-8 md:space-y-10">
            {/* Desktop View Layout: Dual Column Grid */}
            <div className="hidden lg:grid grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Left Column: Headline + Audited Projects Showcase */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-6 pt-3 sm:pt-4">
                <div className="space-y-4">
                  <div>
                    <span className="inline-flex items-center gap-2 font-mono text-[9px] md:text-[10px] text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/35 px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-[0_0_12px_rgba(0,229,255,0.12)]">
                      <span className="w-2 h-2 rounded-full bg-cyber-cyan animate-ping"></span>
                      Live Cyber Audit Stream Active
                    </span>
                  </div>
                  <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-4xl xl:text-[2.65rem] text-cyber-text-primary tracking-tight leading-[1.12] pt-3 sm:pt-4">
                    Master the <br />
                    <span className="text-cyber-cyan drop-shadow-[0_0_22px_rgba(0,229,255,0.4)]">
                      Decentralized
                    </span> Economy
                  </h2>
                  
                  {/* Redesigned Cyber Description Block */}
                  <div className="relative p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-cyber-bg-card via-cyber-bg-card/90 to-cyber-bg-primary border border-cyber-cyan/30 backdrop-blur-md space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.08)] overflow-hidden transition-all duration-300 ease-out hover:border-cyber-cyan/50 hover:scale-[1.018] hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,229,255,0.22),inset_0_1px_1px_rgba(255,255,255,0.15)] group cursor-pointer">
                    {/* Ambient glowing accent orb in background */}
                    <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyber-cyan/15 rounded-full blur-2xl pointer-events-none group-hover:bg-cyber-cyan/25 transition-all duration-500" />
                    
                    {/* Glowing top accent highlight line */}
                    <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan/50 to-transparent" />

                    {/* Header bar inside card */}
                    <div className="flex items-center gap-2 border-b border-cyber-cyan/15 pb-2.5">
                      <div className="flex items-center gap-2 text-cyber-cyan font-mono text-[10px] sm:text-xs font-extrabold uppercase tracking-[1.5px]">
                        <div className="p-1 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan shadow-[0_0_10px_rgba(0,229,255,0.2)]">
                          <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                        </div>
                        <span>CYBER SECURITY & AUDIT STREAM</span>
                      </div>
                    </div>

                    {/* Original Description Text requested by user - bold & distinguished */}
                    <p className="text-xs sm:text-sm text-cyber-text-primary font-bold leading-relaxed font-sans pt-0.5 tracking-wide">
                      Your source for crypto learning, project reviews, and market intelligence. Independent, educational, and built for the decentralized future.
                    </p>

                    {/* Creative Feature Badges */}
                    <div className="flex flex-wrap gap-2 pt-1 font-mono text-[9px] sm:text-[10px]">
                      <span className="px-2.5 py-1 rounded-lg bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/25 font-bold shadow-sm">
                        Smart Contract Audits
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-cyber-green/10 text-cyber-green border border-cyber-green/25 font-bold shadow-sm">
                        Real-Time Intelligence
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-2">
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

              {/* Right Column: The Horizontal 3D Logo and Ecosystem metrics */}
              <div className="lg:col-span-7 flex flex-col gap-6 lg:gap-8 justify-start">
                {/* Horizontal 3D Logo Banner replacing old showcase */}
                <div className="h-[200px] sm:h-[220px] shrink-0 p-1">
                  <ThreeCore />
                </div>

                {/* Ecosystem Metrics */}
                <div className="w-full">
                  <MarketTicker 
                    mode="metrics"
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

            {/* Mobile View Layout: Single Column Stack with open spacing */}
            <div className="flex lg:hidden flex-col gap-7 sm:gap-9 pt-2">
              {/* 1. Header description */}
              <div className="space-y-4 pb-1">
                <div>
                  <span className="inline-flex items-center gap-2 font-mono text-[9px] text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/35 px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-[0_0_12px_rgba(0,229,255,0.12)]">
                    <span className="w-2 h-2 rounded-full bg-cyber-cyan animate-ping"></span>
                    Live Cyber Audit Stream Active
                  </span>
                </div>
                <h2 className="font-display font-black text-3xl sm:text-4xl text-cyber-text-primary tracking-tight leading-[1.12] pt-3 sm:pt-4">
                  Master the <br />
                  <span className="text-cyber-cyan drop-shadow-[0_0_22px_rgba(0,229,255,0.4)]">
                    Decentralized
                  </span> Economy
                </h2>
                
                {/* Redesigned Cyber Description Block */}
                <div className="relative p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-cyber-bg-card via-cyber-bg-card/90 to-cyber-bg-primary border border-cyber-cyan/30 backdrop-blur-md space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.08)] overflow-hidden transition-all duration-300 ease-out hover:border-cyber-cyan/50 hover:scale-[1.018] hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,229,255,0.22),inset_0_1px_1px_rgba(255,255,255,0.15)] group cursor-pointer">
                  {/* Ambient glowing accent orb in background */}
                  <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyber-cyan/15 rounded-full blur-2xl pointer-events-none group-hover:bg-cyber-cyan/25 transition-all duration-500" />
                  
                  {/* Glowing top accent highlight line */}
                  <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan/50 to-transparent" />

                  {/* Header bar inside card */}
                  <div className="flex items-center gap-2 border-b border-cyber-cyan/15 pb-2.5">
                    <div className="flex items-center gap-2 text-cyber-cyan font-mono text-[10px] sm:text-xs font-extrabold uppercase tracking-[1.5px]">
                      <div className="p-1 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan shadow-[0_0_10px_rgba(0,229,255,0.2)]">
                        <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                      </div>
                      <span>CYBER SECURITY & AUDIT STREAM</span>
                    </div>
                  </div>

                  {/* Original Description Text requested by user - bold & distinguished */}
                  <p className="text-xs sm:text-sm text-cyber-text-primary font-bold leading-relaxed font-sans pt-0.5 tracking-wide">
                    Your source for crypto learning, project reviews, and market intelligence. Independent, educational, and built for the decentralized future.
                  </p>

                  {/* Creative Feature Badges */}
                  <div className="flex flex-wrap gap-2 pt-1 font-mono text-[9px] sm:text-[10px]">
                    <span className="px-2.5 py-1 rounded-lg bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/25 font-bold shadow-sm">
                      Smart Contract Audits
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-cyber-green/10 text-cyber-green border border-cyber-green/25 font-bold shadow-sm">
                      Real-Time Intelligence
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Logo 3D */}
              <div className="h-[320px] xs:h-[350px] sm:h-[380px] shrink-0 my-1 p-2 bg-cyber-bg-card/40 border border-cyber-cyan/15 rounded-3xl shadow-xl">
                <ThreeCore />
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

              {/* 4. Ecosystem Metrics card */}
              <div className="pt-1">
                <MarketTicker 
                  mode="metrics"
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
            {activeTab === 'lab' && (
              <ReviewLab 
                onSaveReview={handleSaveReview} 
                savedReviews={savedReviews}
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
              />
            )}
            
            {activeTab === 'chat' && (
              <AuditorChat />
            )}

            {activeTab === 'academy' && (
              <AcademyReviews />
            )}
          </motion.div>
        </AnimatePresence>


      </main>

      {/* 3. Thematic Affiliate Exchange Badges Row */}
      <section className="border-t border-cyber-cyan/15 bg-cyber-bg-secondary/40 py-6 md:py-8 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-4">
            <span className="font-mono text-[10px] md:text-xs text-cyber-text-muted uppercase tracking-[2px] md:tracking-[3px]">
              Top Crypto Exchanges to Start your Trading Journey
            </span>
            <span className="text-[9px] md:text-[10px] font-mono text-cyber-cyan whitespace-nowrap ml-2">AFFILIATE INTEGRATION</span>
          </div>
          
          <div className="flex overflow-x-auto md:grid md:grid-cols-6 gap-3 md:gap-4 pb-3 md:pb-0 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
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
                className="bg-cyber-bg-card border border-cyber-cyan/10 hover:border-cyber-cyan/40 hover:shadow-[0_0_15px_rgba(0,229,255,0.1)] rounded-xl p-2.5 md:p-3 flex flex-col items-center text-center gap-1.5 md:gap-2 transition-all duration-300 group min-w-[95px] md:min-w-0 flex-shrink-0 md:flex-shrink"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border border-cyber-cyan/20 group-hover:scale-105 group-hover:border-cyber-cyan transition-transform">
                  <img src={exc.logo} alt={exc.name} className="w-full h-full object-cover" />
                </div>
                <span className="font-display font-bold text-[10px] md:text-xs text-cyber-text-secondary group-hover:text-cyber-cyan transition-colors">
                  {exc.name}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Complete Cyber Footer */}
      <footer className="border-t border-cyber-cyan/15 bg-cyber-bg-secondary pt-10 pb-24 sm:pb-12 z-10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 mb-8 pb-8 border-b border-cyber-cyan/10 items-center">
            {/* Column 1: Brand Card */}
            <div className="md:col-span-5 lg:col-span-4">
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
                    <span>Cyber Security & Audit Stream</span>
                  </div>
                </div>

                {/* Description Text */}
                <p className="text-[11px] sm:text-xs text-cyber-text-secondary leading-relaxed font-sans tracking-normal">
                  Your source for crypto learning, project reviews, and market intelligence. Independent, educational, and built for the decentralized future.
                </p>

                {/* Creative Feature Badges - single row side-by-side */}
                <div className="flex items-center gap-1.5 pt-0.5 font-mono text-[8.5px] sm:text-[9.5px] whitespace-nowrap overflow-hidden">
                  <span className="px-2 py-0.5 rounded-md bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/20 font-bold shrink-0">
                    Smart Contract Audits
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-cyber-green/10 text-cyber-green border border-cyber-green/20 font-bold shrink-0">
                    Real-Time Intelligence
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2: NOWPayments Crypto Donation Button & QR Code Modal Trigger (Stacked vertically to the right of Brand Card) */}
            <div className="md:col-span-3 lg:col-span-3 flex flex-col items-start justify-center gap-3">
              <a 
                href="https://nowpayments.io/donation?api_key=39e04c13-4de0-4f88-9b45-c2a47d895d35" 
                target="_blank" 
                rel="noreferrer noopener"
                className="inline-block transition-all duration-300 hover:scale-[1.03] focus:outline-none"
                title="Support Crypto Review Lab with Crypto Donation"
              >
                <img 
                  src="https://nowpayments.io/images/embeds/donation-button-black.svg" 
                  alt="Crypto donation button by NOWPayments" 
                  className="h-11 sm:h-12 w-auto rounded-xl border border-cyber-cyan/35 hover:border-cyber-cyan shadow-sm hover:shadow-[0_0_18px_rgba(0,229,255,0.35)] transition-all"
                  referrerPolicy="no-referrer"
                />
              </a>

              <button
                type="button"
                onClick={() => setActiveModal('qr-donation')}
                className="w-[140px] sm:w-[153px] h-11 sm:h-12 px-1.5 sm:px-2 bg-cyber-bg-card hover:bg-cyber-cyan/10 border border-cyber-cyan/35 hover:border-cyber-cyan text-cyber-cyan rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 text-[8.5px] sm:text-[9.5px] font-display font-bold uppercase tracking-tight shadow-sm hover:shadow-[0_0_18px_rgba(0,229,255,0.3)] hover:scale-[1.03] transition-all cursor-pointer whitespace-nowrap"
                title="Crypto Direct Donation"
              >
                <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyber-cyan shrink-0" />
                <span>Crypto Direct Donation</span>
              </button>
            </div>

            {/* Column 3: LEARN */}
            <div className="md:col-span-2 lg:col-span-2.5">
              <h4 className="font-display font-bold text-xs text-cyber-text-secondary uppercase tracking-widest mb-4">Learn</h4>
              <ul className="space-y-2.5 text-xs text-cyber-text-muted text-left">
                <li><button onClick={() => setActiveModal('learn-btc')} className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-center gap-1.5">› Bitcoin Basics</button></li>
                <li><button onClick={() => setActiveModal('learn-eth')} className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-center gap-1.5">› Ethereum Guide</button></li>
                <li><button onClick={() => setActiveModal('learn-defi')} className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-center gap-1.5">› DeFi 101</button></li>
                <li><button onClick={() => setActiveModal('learn-sec')} className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-center gap-1.5">› Wallet Security</button></li>
                <li><button onClick={() => setActiveModal('resources')} className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-center gap-1.5">› Educational Resources</button></li>
              </ul>
            </div>

            {/* Column 4: SITE */}
            <div className="md:col-span-2 lg:col-span-2.5">
              <h4 className="font-display font-bold text-xs text-cyber-text-secondary uppercase tracking-widest mb-4">Site</h4>
              <ul className="space-y-2.5 text-xs text-cyber-text-muted text-left">
                <li><button onClick={() => setActiveModal('author')} className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-center gap-1.5">› About Author</button></li>
                <li><button onClick={() => setActiveModal('contact')} className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-center gap-1.5">› Contact</button></li>
                <li><button onClick={() => setActiveModal('privacy')} className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-center gap-1.5">› Privacy Policy</button></li>
                <li><button onClick={() => setActiveModal('disclaimer')} className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-center gap-1.5">› Disclaimer</button></li>
                <li><button onClick={() => setActiveModal('tos')} className="hover:text-cyber-cyan transition-colors cursor-pointer flex items-center gap-1.5">› Terms of Service</button></li>
              </ul>
            </div>
          </div>

          {/* Lower footer row featuring custom platform attribution badges and high-contrast copyright text */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-5 pt-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3.5">
              {/* Blogger attribution */}
              <a 
                href="https://www.blogger.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg px-3.5 py-1.5 flex items-center gap-2 hover:bg-cyber-cyan/10 transition-colors"
              >
                <svg fill="none" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
                  <rect fill="#FF5722" height="24" rx="5" width="24"/>
                  <path d="M6 7.5C6 6.67 6.67 6 7.5 6h4.25C13.55 6 15 7.45 15 9.25c0 .9-.37 1.71-.97 2.3A3.25 3.25 0 0 1 16.5 14.5C16.5 16.43 14.93 18 13 18H7.5C6.67 18 6 17.33 6 16.5V7.5Zm2 1v2.5h3.25a1.25 1.25 0 0 0 0-2.5H8Zm0 4.5V16H13a1.5 1.5 0 0 0 0-3H8Z" fill="white"/>
                </svg>
                <div className="font-display leading-none text-left">
                  <div className="text-[8px] text-cyber-text-muted uppercase">Powered by</div>
                  <div className="text-xs font-bold text-slate-300">Blogger</div>
                </div>
              </a>

              {/* Build engine */}
              <div className="bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg px-3.5 py-1.5 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-cyber-cyan flex items-center justify-center text-cyber-bg-primary font-bold text-xs">
                  G
                </div>
                <div className="font-display leading-none text-left">
                  <div className="text-[8px] text-cyber-text-muted uppercase">Built with</div>
                  <div className="text-xs font-bold text-slate-300">Gemini 3.5</div>
                </div>
              </div>
            </div>

            {/* High contrast, well-spaced copyright notice */}
            <p className="font-mono text-[11px] sm:text-xs text-slate-400 font-medium uppercase tracking-wider text-center md:text-right pt-1 md:pt-0">
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
                      Former Accountant, Blogger and Crypto Projects Analyst since 2017. Previously worked in Binance Academy.
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
                    <h3 className="font-display font-bold text-lg text-cyber-orange">Financial Disclaimer</h3>
                    <p className="text-xs text-cyber-text-secondary leading-relaxed">
                      All analytical calculations, scoring metrics, and chat outputs generated by the Crypto Review Lab program are algorithmic simulations intended exclusively for general educational and informational purposes.
                    </p>
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
                    <p className="text-[10px] font-mono text-cyber-text-muted uppercase">Last Updated: July 17, 2026</p>
                    
                    <div className="space-y-4 text-xs text-cyber-text-secondary leading-relaxed">
                      <div>
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">1. Acceptable Use</h4>
                        <p>
                          Users are granted permission to access Crypto Review Lab for personal, non-commercial, educational, and informational purposes. You agree not to engage in any automated data extraction (scraping), system manipulation, or denial-of-service attempts. All interactions with our chatbot and audit modules must remain respectful and legal.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">2. Intellectual Property</h4>
                        <p>
                          All original content, designs, grading frameworks, scoring methodologies, and visual elements on Crypto Review Lab are the exclusive property of Crypto Review Lab and Chokri AlGhanmi. Re-distribution, copying, or embedding of these systems without express written consent is strictly prohibited.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-cyber-text-primary uppercase tracking-wide mb-1">3. Liability & Disclaimers</h4>
                        <p>
                          All reviews, ratings, risk indexes, and financial charts are algorithmic simulations and do not constitute financial, investment, or legal advice. Crypto Review Lab is provided "as is" without warranty of any kind. We are not liable for any financial losses, investment decisions, or smart contract exploits resulting from your use of this application.
                        </p>
                      </div>
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
                        <a href="mailto:ghalmichokri@gmail.com" className="text-cyber-cyan hover:underline font-bold">ghalmichokri@gmail.com</a>
                      </p>
                      <p className="text-xs text-cyber-text-secondary flex justify-between items-center">
                        <span className="font-mono text-cyber-text-muted">Telegram:</span>
                        <a href="https://t.me/Shukri30" target="_blank" rel="noopener noreferrer" className="text-cyber-cyan hover:underline font-bold">@Shukri30</a>
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

      <CoinGeckoExplorerModal
        isOpen={isCoinGeckoModalOpen}
        onClose={() => setIsCoinGeckoModalOpen(false)}
        existingReviews={allReviewsList}
        onAddOrSwapReview={handleAddOrSwapReview}
        onSyncAllReviews={syncCoinGeckoMarkets}
        isSyncing={isSyncingCoinGecko}
      />

      <CookieBanner
        isVisible={showCookieBanner && activeModal !== 'privacy'}
        onAccept={handleAcceptCookies}
        onDecline={handleDeclineCookies}
        onPrivacyClick={() => setActiveModal('privacy')}
      />

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
            className="fixed bottom-28 sm:bottom-32 right-4 sm:right-6 z-40 p-2.5 sm:p-3 rounded-2xl bg-cyber-bg-card/90 border-2 border-cyber-cyan/50 text-cyber-cyan hover:bg-cyber-cyan hover:text-cyber-bg-primary shadow-[0_0_20px_rgba(0,229,255,0.35)] backdrop-blur-md transition-colors duration-300 cursor-pointer group flex items-center justify-center"
            title="Scroll to Top"
            aria-label="Scroll to top of page"
          >
            <ChevronUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform stroke-[2.5]" />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}
