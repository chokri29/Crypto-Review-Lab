/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, Coins } from 'lucide-react';
import { useCurrency, FIAT_CURRENCIES, FiatCurrencyCode } from '../context/CurrencyContext';

interface CurrencyDropdownProps {
  className?: string;
  buttonClassName?: string;
  align?: 'left' | 'right';
  showLabel?: boolean;
}

export const CurrencyDropdown: React.FC<CurrencyDropdownProps> = ({
  className = '',
  buttonClassName = '',
  align = 'right',
  showLabel = false,
}) => {
  const { currency, setCurrency, currencyInfo } = useCurrency();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (code: FiatCurrencyCode) => {
    setCurrency(code);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/95 border border-cyber-cyan/35 hover:border-cyber-cyan/70 text-white font-mono text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow-[0_0_12px_rgba(0,229,255,0.25)] select-none ${buttonClassName}`}
        title="Change Fiat Currency"
        aria-label="Select Fiat Currency"
        aria-expanded={isOpen}
      >
        <span className="text-cyber-cyan font-bold tracking-tight">{currencyInfo?.symbol || '$'}</span>
        <span className="text-slate-100 font-extrabold">{currencyInfo?.code || 'USD'}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-cyber-cyan' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu matching uploaded UI */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute top-full mt-2 z-50 w-72 rounded-2xl bg-[#0c1319] border border-slate-700/80 shadow-[0_16px_36px_rgba(0,0,0,0.65),0_0_20px_rgba(0,229,255,0.12)] p-1.5 backdrop-blur-xl ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            <div className="px-3 py-1.5 mb-1 border-b border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1 text-cyber-cyan font-bold">
                <Coins className="w-3 h-3" /> Fiat Currencies
              </span>
              <span className="text-slate-500 font-normal">8 Available</span>
            </div>

            <div className="space-y-0.5">
              {FIAT_CURRENCIES.map((item) => {
                const isSelected = item.code === currency;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSelect(item.code)}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-all duration-150 text-left cursor-pointer group ${
                      isSelected
                        ? 'bg-slate-800/80 text-white shadow-inner'
                        : 'hover:bg-slate-800/50 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Currency Symbol Column */}
                      <span
                        className={`w-7 text-center font-mono font-bold text-xs shrink-0 ${
                          isSelected ? 'text-cyber-cyan' : 'text-slate-400 group-hover:text-cyber-cyan/80'
                        }`}
                      >
                        {item.symbol}
                      </span>

                      {/* Currency Code & Name */}
                      <div className="flex items-baseline gap-2.5 truncate">
                        <span className="font-mono font-extrabold text-xs text-white tracking-wide shrink-0">
                          {item.code}
                        </span>
                        <span className="text-xs text-slate-400 truncate group-hover:text-slate-300 font-sans">
                          {item.name}
                        </span>
                      </div>
                    </div>

                    {/* Right Checkmark */}
                    {isSelected && (
                      <div className="shrink-0 ml-2 text-emerald-400 flex items-center justify-center">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CurrencyDropdown;
