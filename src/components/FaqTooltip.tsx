import React, { useState } from 'react';
import { Info, HelpCircle, Lightbulb, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FaqTooltipProps {
  definition?: string;
  tip?: string;
  title?: string;
  size?: 'sm' | 'md';
  iconType?: 'info' | 'help';
  className?: string;
}

export const FaqTooltip: React.FC<FaqTooltipProps> = ({
  definition,
  tip,
  title,
  size = 'sm',
  iconType = 'help',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!definition && !tip && !title) return null;

  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className={`relative inline-flex items-center shrink-0 ${className}`}>
      <span
        role="button"
        tabIndex={0}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setIsVisible((prev) => !prev);
          }
        }}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="p-1 rounded-full text-cyber-cyan/80 hover:text-cyber-cyan hover:bg-cyber-cyan/15 focus:outline-none focus:ring-1 focus:ring-cyber-cyan/50 transition-all cursor-pointer group"
        aria-label="Show quick tip and definition"
        title="Hover or click for instant definition & tip"
      >
        {iconType === 'info' ? (
          <Info className={`${iconClass} group-hover:scale-110 transition-transform text-cyber-cyan`} />
        ) : (
          <HelpCircle className={`${iconClass} group-hover:scale-110 transition-transform text-cyber-cyan`} />
        )}
      </span>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 5 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-72 sm:w-80 p-3.5 rounded-xl bg-slate-950/95 border border-cyber-cyan/40 shadow-[0_10px_30px_rgba(0,0,0,0.85),0_0_20px_rgba(0,229,255,0.25)] backdrop-blur-xl z-50 pointer-events-none text-left"
          >
            {/* Tooltip Arrow Indicator */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950 border-r border-b border-cyber-cyan/40 rotate-45" />

            <div className="space-y-2.5 relative z-10">
              {title && (
                <div className="flex items-center gap-1.5 pb-1.5 border-b border-cyber-cyan/20">
                  <BookOpen className="w-3.5 h-3.5 text-cyber-cyan shrink-0" />
                  <span className="font-display font-bold text-xs text-cyber-cyan uppercase tracking-wider">
                    {title}
                  </span>
                </div>
              )}

              {definition && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                    <BookOpen className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Instant Definition</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {definition}
                  </p>
                </div>
              )}

              {tip && (
                <div className="space-y-1 pt-1 border-t border-white/10">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300 font-bold uppercase tracking-wider">
                    <Lightbulb className="w-3 h-3 text-amber-400 shrink-0 animate-pulse" />
                    <span>Quick Security Tip</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {tip}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
