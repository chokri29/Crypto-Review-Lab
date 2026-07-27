import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Info } from 'lucide-react';

interface CookieBannerProps {
  isVisible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onPrivacyClick: () => void;
}

export default function CookieBanner({ isVisible, onAccept, onDecline, onPrivacyClick }: CookieBannerProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-[9999] max-w-sm w-auto bg-[#0a1622]/95 border border-cyber-cyan/35 rounded-2xl p-5 md:p-6 shadow-[0_15px_35px_rgba(0,0,0,0.6),0_0_15px_rgba(0,229,255,0.06)] backdrop-blur-xl"
        >
          {/* Top linear visual glow */}
          <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-cyber-cyan/60 to-transparent" />

          <div className="flex flex-col gap-4">
            {/* Header / Info bar */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/20 flex items-center justify-center text-cyber-cyan flex-shrink-0 mt-0.5">
                <Info className="w-4 h-4 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-bold text-sm text-cyber-cyan uppercase tracking-[1px] leading-tight">
                  Cookie Notice
                </h3>
                <p className="font-sans text-xs text-cyber-text-secondary leading-relaxed">
                  Crypto Review Lab uses cookies to keep the app running smoothly and understand how you use the site. Read our{' '}
                  <button
                    onClick={onPrivacyClick}
                    className="text-cyber-cyan hover:text-cyber-cyan/80 font-medium underline focus:outline-none cursor-pointer"
                  >
                    Privacy Policy
                  </button>{' '}
                  for details.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-1">
              <button
                onClick={onDecline}
                className="flex-1 rounded-xl px-4 py-2 border border-cyber-cyan/20 hover:border-cyber-cyan/40 bg-transparent text-cyber-text-secondary hover:text-cyber-text-primary text-[11px] font-display font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
              >
                Decline
              </button>
              <button
                onClick={onAccept}
                className="flex-1 rounded-xl px-4 py-2 bg-gradient-to-r from-cyber-cyan to-cyber-cyan/80 hover:from-cyber-cyan/90 hover:to-cyber-cyan/70 text-cyber-bg-primary text-[11px] font-display font-bold uppercase tracking-wider transition-all duration-200 shadow-[0_3px_10px_rgba(0,229,255,0.2)] hover:shadow-[0_4px_15px_rgba(0,229,255,0.35)] cursor-pointer"
              >
                Accept All
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
