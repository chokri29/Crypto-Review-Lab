/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export default function ThreeCore() {
  return (
    <div className="w-full h-full min-h-[175px] md:min-h-[190px] flex items-center justify-center relative overflow-hidden bg-transparent rounded-2xl">
      {/* Bottom Left AI x Crypto Label */}
      <div className="absolute bottom-3 left-4 z-20 font-mono text-[9px] sm:text-xs text-[#00e5ff]/90 tracking-[3px] uppercase select-none font-bold drop-shadow-[0_0_6px_rgba(0,229,255,0.4)] flex items-center gap-2">
        <span>AI x CRYPTO</span>
      </div>
      
      {/* Core Background Gradient glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.06)_0%,transparent_70%)] pointer-events-none"></div>

      <iframe
        title="AI x Crypto 3D Emblem"
        src="/three-core.html"
        className="w-full h-full min-h-[175px] md:min-h-[190px] border-0 bg-transparent block pointer-events-none"
        scrolling="no"
        loading="lazy"
      />
    </div>
  );
}
