export const getMetricColor = (val: number) => {
  if (val >= 8) {
    return {
      bgClass: 'bg-emerald-500',
      textClass: 'text-emerald-400',
      borderClass: 'border-emerald-500/40',
      hex: '#10b981',
      glowHex: 'rgba(16, 185, 129, 0.4)',
      label: 'Optimal',
      badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    };
  }
  if (val >= 5) {
    return {
      bgClass: 'bg-amber-500',
      textClass: 'text-amber-400',
      borderClass: 'border-amber-500/40',
      hex: '#f59e0b',
      glowHex: 'rgba(245, 158, 11, 0.4)',
      label: 'Moderate',
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    };
  }
  return {
    bgClass: 'bg-rose-500',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/40',
    hex: '#f43f5e',
    glowHex: 'rgba(244, 63, 94, 0.4)',
    label: 'High Risk',
    badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  };
};
