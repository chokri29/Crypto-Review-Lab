/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

export type FiatCurrencyCode = 'USD' | 'GBP' | 'EUR' | 'AUD' | 'CAD' | 'JPY' | 'CHF' | 'SGD';

export interface FiatCurrencyItem {
  code: FiatCurrencyCode;
  symbol: string;
  name: string;
}

export const FIAT_CURRENCIES: FiatCurrencyItem[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
];

export const DEFAULT_FALLBACK_RATES: Record<FiatCurrencyCode, number> = {
  USD: 1.0,
  GBP: 0.7394,
  EUR: 0.8625,
  AUD: 1.3992,
  CAD: 1.3891,
  JPY: 160.11,
  CHF: 0.8113,
  SGD: 1.2730,
};

const CURRENCY_STORAGE_KEY = 'crl_selected_fiat_currency';

interface CurrencyContextType {
  currency: FiatCurrencyCode;
  currencyInfo: FiatCurrencyItem & { rate: number };
  selectedCurrency: FiatCurrencyItem & { rate: number };
  rates: Record<FiatCurrencyCode, number>;
  setCurrency: (code: FiatCurrencyCode) => void;
  convertPrice: (usdPrice: number) => number;
  formatPrice: (
    usdPrice: number | undefined | null,
    options?: {
      minDecimals?: number;
      maxDecimals?: number;
      showSymbol?: boolean;
    }
  ) => string;
  formatCompactCap: (usdValueInTrillionsOrBillions: number, unit?: 'T' | 'B' | 'M') => string;
  formatRawLarge: (usdTotal: number) => string;
  isLoadingRates: boolean;
  refreshRates: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<FiatCurrencyCode>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
        if (saved && FIAT_CURRENCIES.some((c) => c.code === saved)) {
          return saved as FiatCurrencyCode;
        }
      }
    } catch {
      // ignore storage errors
    }
    return 'USD';
  });

  const [rates, setRates] = useState<Record<FiatCurrencyCode, number>>(DEFAULT_FALLBACK_RATES);
  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(false);

  const fetchRates = async () => {
    setIsLoadingRates(true);
    try {
      const res = await fetch('/api/fiat-rates');
      if (res.ok) {
        const data = await res.json();
        if (data && data.rates && typeof data.rates === 'object') {
          setRates((prev) => ({
            ...prev,
            USD: 1.0,
            GBP: Number(data.rates.GBP) || prev.GBP,
            EUR: Number(data.rates.EUR) || prev.EUR,
            AUD: Number(data.rates.AUD) || prev.AUD,
            CAD: Number(data.rates.CAD) || prev.CAD,
            JPY: Number(data.rates.JPY) || prev.JPY,
            CHF: Number(data.rates.CHF) || prev.CHF,
            SGD: Number(data.rates.SGD) || prev.SGD,
          }));
        }
      }
    } catch (e) {
      console.warn('Currency rates live sync notice:', e);
    } finally {
      setIsLoadingRates(false);
    }
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 15 * 60 * 1000); // 15 min refresh
    return () => clearInterval(interval);
  }, []);

  const setCurrency = (code: FiatCurrencyCode) => {
    setCurrencyState(code);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(CURRENCY_STORAGE_KEY, code);
      }
    } catch {
      // ignore
    }
  };

  const currentRate = rates[currency] || 1.0;
  const currentItem = useMemo(() => {
    const item = FIAT_CURRENCIES.find((c) => c.code === currency) || FIAT_CURRENCIES[0];
    return {
      ...item,
      rate: currentRate,
    };
  }, [currency, currentRate]);

  const convertPrice = (usdPrice: number): number => {
    if (typeof usdPrice !== 'number' || isNaN(usdPrice)) return 0;
    return usdPrice * currentRate;
  };

  const formatPrice = (
    usdPrice: number | undefined | null,
    options?: {
      minDecimals?: number;
      maxDecimals?: number;
      showSymbol?: boolean;
    }
  ): string => {
    if (usdPrice === undefined || usdPrice === null || isNaN(usdPrice) || usdPrice <= 0) {
      return options?.showSymbol === false ? '0.00' : `${currentItem.symbol}0.00`;
    }

    const converted = usdPrice * currentRate;
    const prefix = options?.showSymbol === false ? '' : `${currentItem.symbol}${currentItem.code === 'CHF' ? ' ' : ''}`;

    if (converted < 0.0001) {
      return `${prefix}${converted.toFixed(8)}`;
    }
    if (converted < 1) {
      return `${prefix}${converted.toFixed(options?.maxDecimals ?? 4)}`;
    }
    if (currency === 'JPY' && converted >= 100) {
      // JPY commonly displayed with 2 decimals or rounded
      return `${prefix}${converted.toLocaleString(undefined, {
        minimumFractionDigits: options?.minDecimals ?? 2,
        maximumFractionDigits: options?.maxDecimals ?? 2,
      })}`;
    }

    return `${prefix}${converted.toLocaleString(undefined, {
      minimumFractionDigits: options?.minDecimals ?? 2,
      maximumFractionDigits: options?.maxDecimals ?? 2,
    })}`;
  };

  const formatCompactCap = (valInUnit: number, unit: 'T' | 'B' | 'M' = 'T'): string => {
    if (typeof valInUnit !== 'number' || isNaN(valInUnit)) return `${currentItem.symbol}0.00${unit}`;
    const converted = valInUnit * currentRate;
    const prefix = `${currentItem.symbol}${currentItem.code === 'CHF' ? ' ' : ''}`;

    if (converted >= 1000) {
      const nextUnit = unit === 'M' ? 'B' : unit === 'B' ? 'T' : 'T';
      return `${prefix}${(converted / 1000).toFixed(2)}${nextUnit}`;
    }
    if (converted < 1 && unit !== 'M') {
      const prevUnit = unit === 'T' ? 'B' : 'M';
      return `${prefix}${(converted * 1000).toFixed(2)}${prevUnit}`;
    }
    return `${prefix}${converted.toFixed(2)}${unit}`;
  };

  const formatRawLarge = (usdTotal: number): string => {
    if (!usdTotal || usdTotal <= 0) return 'N/A';
    const converted = usdTotal * currentRate;
    const prefix = `${currentItem.symbol}${currentItem.code === 'CHF' ? ' ' : ''}`;

    if (converted >= 1e12) return `${prefix}${(converted / 1e12).toFixed(2)}T`;
    if (converted >= 1e9) return `${prefix}${(converted / 1e9).toFixed(2)}B`;
    if (converted >= 1e6) return `${prefix}${(converted / 1e6).toFixed(2)}M`;
    if (converted >= 1e3) return `${prefix}${(converted / 1e3).toFixed(1)}K`;
    return `${prefix}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencyInfo: currentItem,
        selectedCurrency: currentItem,
        rates,
        setCurrency,
        convertPrice,
        formatPrice,
        formatCompactCap,
        formatRawLarge,
        isLoadingRates,
        refreshRates: fetchRates,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

const DEFAULT_CURRENCY_ITEM: FiatCurrencyItem & { rate: number } = {
  code: 'USD',
  symbol: '$',
  name: 'US Dollar',
  rate: 1.0,
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    return {
      currency: 'USD',
      currencyInfo: DEFAULT_CURRENCY_ITEM,
      selectedCurrency: DEFAULT_CURRENCY_ITEM,
      rates: DEFAULT_FALLBACK_RATES,
      setCurrency: () => {},
      convertPrice: (p: number) => p,
      formatPrice: (p?: number | null) => (p !== undefined && p !== null ? `$${p.toFixed(2)}` : '$0.00'),
      formatCompactCap: (v: number, unit = 'T') => `$${v.toFixed(2)}${unit}`,
      formatRawLarge: (v: number) => (v ? `$${v.toLocaleString()}` : 'N/A'),
      isLoadingRates: false,
      refreshRates: async () => {},
    };
  }
  return context;
};
