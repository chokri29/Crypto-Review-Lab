import React from 'react';
import { Crown } from 'lucide-react';

interface ProTierBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const ProTierBadge: React.FC<ProTierBadgeProps> = ({
  className = '',
  size = 'md',
  label = 'SECURITY AUDIT'
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[8.5px] gap-1',
    md: 'px-2.5 py-0.5 text-[10px] gap-1.5',
    lg: 'px-3 py-1 text-xs gap-1.5'
  }[size];

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5'
  }[size];

  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${className}`} title="Security & Risk Assessment Executed">
      {/* Inner Badge Pill Content */}
      <div className={`flex items-center bg-amber-500/10 backdrop-blur-md rounded-full text-amber-300 font-mono font-black tracking-wider uppercase border border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.25)] ${sizeClasses}`}>
        <Crown className={`${iconSizes} text-amber-400 fill-amber-400/30 shrink-0`} />
        <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 bg-clip-text text-transparent font-black leading-none drop-shadow-sm">
          {label}
        </span>
      </div>
    </div>
  );
};
