import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, ShieldCheck, Lock, Unlock, RefreshCw } from 'lucide-react';

interface CaptchaGateProps {
  onVerify: () => void;
}

export default function CaptchaGate({ onVerify }: CaptchaGateProps) {
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [verified, setVerified] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ startX: number; currentXAtStart: number }>({ startX: 0, currentXAtStart: 0 });

  const successThreshold = 0.88; // 88% dragged to count as successful

  const handleDragStart = (clientX: number) => {
    if (verified || isLocked) return;
    setIsDragging(true);
    dragStartRef.current = { startX: clientX, currentXAtStart: currentX };
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging || verified || isLocked) return;
    const track = trackRef.current;
    const handle = handleRef.current;
    if (!track || !handle) return;

    // Margin and border offsets (6px total padding)
    const maxX = track.offsetWidth - handle.offsetWidth - 8;
    const deltaX = clientX - dragStartRef.current.startX;
    let nextX = dragStartRef.current.currentXAtStart + deltaX;

    if (nextX < 0) nextX = 0;
    if (nextX > maxX) nextX = maxX;

    setCurrentX(nextX);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const track = trackRef.current;
    const handle = handleRef.current;
    if (!track || !handle) return;

    const maxX = track.offsetWidth - handle.offsetWidth - 8;

    if (currentX >= maxX * successThreshold) {
      // SUCCESSFUL VERIFICATION
      setVerified(true);
      setCurrentX(maxX);
      localStorage.setItem('crlCaptchaVerified', '1');
      
      // Delay transition for visual feedback
      setTimeout(() => {
        onVerify();
      }, 800);
    } else {
      // FAILED VERIFICATION ATTEMPT
      const nextFailCount = failedAttempts + 1;
      setFailedAttempts(nextFailCount);
      setCurrentX(0);
      setIsShaking(true);
      
      // Clear shaking state after animation finishes
      setTimeout(() => setIsShaking(false), 500);

      if (nextFailCount >= 3) {
        setIsLocked(true);
      }
    }
  };

  // Attach global mouse and touch events for dragging outside the handle element
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleDragMove(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      handleDragEnd();
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, currentX]);

  // Recalculate size of slider on mount and window resize
  const [maxXVal, setMaxXVal] = useState(250);
  
  useEffect(() => {
    const updateSize = () => {
      const track = trackRef.current;
      const handle = handleRef.current;
      if (track && handle) {
        setMaxXVal(track.offsetWidth - handle.offsetWidth - 8);
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [verified]);

  const pct = maxXVal > 0 ? (currentX / maxXVal) * 100 : 0;

  // Shake animation configuration for Framer Motion
  const shakeVariants = {
    shake: {
      x: [0, -10, 10, -10, 10, -5, 5, 0],
      transition: { duration: 0.4 }
    },
    idle: { x: 0 }
  };

  const handleResetAttempts = () => {
    // Only allow manual resetting if NOT locked
    if (isLocked) return;
    setCurrentX(0);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-cyber-bg-primary/95 cyber-grid cyber-scanlines overflow-hidden">
      <motion.div
        animate={isShaking ? "shake" : "idle"}
        variants={shakeVariants}
        initial="idle"
        className={`w-full max-w-sm bg-cyber-bg-card border rounded-2xl p-6 md:p-8 shadow-2xl relative transition-all duration-300 ${
          isLocked 
            ? 'border-cyber-orange/40 shadow-[0_0_30px_rgba(255,107,53,0.15)]' 
            : verified 
              ? 'border-cyber-green/40 shadow-[0_0_30px_rgba(0,255,136,0.15)]' 
              : 'border-cyber-cyan/25 shadow-[0_0_30px_rgba(0,229,255,0.15)]'
        }`}
      >
        {/* Futuristic glowing corner decors */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyber-cyan/30 rounded-tl"></div>
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyber-cyan/30 rounded-tr"></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyber-cyan/30 rounded-bl"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyber-cyan/30 rounded-br"></div>

        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          {isLocked ? (
            <div className="w-16 h-16 rounded-full bg-cyber-orange/10 border border-cyber-orange/30 flex items-center justify-center mb-4 text-cyber-orange animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>
          ) : verified ? (
            <div className="w-16 h-16 rounded-full bg-cyber-green/10 border border-cyber-green/30 flex items-center justify-center mb-4 text-cyber-green">
              <ShieldCheck className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-14 h-14 relative mb-4">
              <svg fill="none" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_8px_rgba(0,229,255,0.6)] animate-pulse">
                <polygon fill="none" points="20,2 38,11 38,29 20,38 2,29 2,11" stroke="#00e5ff" strokeWidth="1.5"/>
                <polygon fill="none" opacity="0.3" points="20,8 32,14 32,26 20,32 8,26 8,14" stroke="#00e5ff" strokeWidth="0.8"/>
                <circle cx="17.5" cy="17.5" r="5.5" stroke="#00e5ff" strokeWidth="1.8" fill="none" />
                <path d="M15 15.5 a 2.5 2.5 0 0 1 2.5 -2.5" stroke="#00e5ff" strokeWidth="0.8" strokeLinecap="round" fill="none" />
                <line x1="21.5" y1="21.5" x2="28" y2="28" stroke="#00e5ff" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
          )}

          <h1 className={`font-display font-bold text-xl tracking-[1.5px] uppercase leading-none mb-1 ${
            isLocked ? 'text-cyber-orange' : verified ? 'text-cyber-green' : 'text-cyber-cyan'
          }`}>
            {isLocked ? 'Access Suspended' : verified ? 'Identity Verified' : 'Security Check'}
          </h1>
          <span className="text-[10px] font-mono text-cyber-text-muted uppercase tracking-[3px] block">
            {isLocked ? 'Verification Locked' : verified ? 'Decryption Completed' : 'Session Validation'}
          </span>
        </div>

        {/* Status / Message Panel */}
        <div className={`p-4 rounded-xl mb-6 text-center border text-xs leading-relaxed ${
          isLocked 
            ? 'bg-cyber-orange/5 border-cyber-orange/15 text-cyber-orange' 
            : verified 
              ? 'bg-cyber-green/5 border-cyber-green/15 text-cyber-green' 
              : failedAttempts > 0 
                ? 'bg-cyber-orange/5 border-cyber-orange/10 text-cyber-text-primary' 
                : 'bg-cyber-bg-secondary/40 border-cyber-cyan/10 text-cyber-text-secondary'
        }`}>
          {isLocked ? (
            <p className="font-sans font-medium">
              Too many failed verification attempts. Access has been locked for security. Please refresh the page to request a new session.
            </p>
          ) : verified ? (
            <p className="font-sans font-medium">
              Welcome back. Initializing secure node and loading reviews...
            </p>
          ) : failedAttempts > 0 ? (
            <p className="font-sans">
              <strong className="text-cyber-orange">Verification failed!</strong> Slide the handle fully to the right to complete. 
              <span className="block mt-1 text-[11px] font-mono text-cyber-orange/80">Attempts: {failedAttempts} of 3</span>
            </p>
          ) : (
            <p className="font-sans">
              To prevent automated queries, please slide the control element to the end of the track to verify your session.
            </p>
          )}
        </div>

        {/* Verification Slider */}
        {!isLocked && (
          <div 
            ref={trackRef}
            className={`h-14 w-full bg-cyber-bg-secondary/80 border rounded-full relative overflow-hidden flex items-center select-none shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] ${
              verified 
                ? 'border-cyber-green/35' 
                : isDragging 
                  ? 'border-cyber-cyan/40' 
                  : 'border-cyber-cyan/15 hover:border-cyber-cyan/25'
            }`}
          >
            {/* Dynamic Slider Fill */}
            <div 
              className={`h-full absolute left-0 top-0 transition-all duration-75 ${
                verified 
                  ? 'bg-gradient-to-r from-cyber-green/30 to-cyber-green/10' 
                  : 'bg-gradient-to-r from-cyber-cyan/35 to-cyber-cyan/5'
              }`}
              style={{ width: `${pct}%` }}
            />

            {/* Slider Text (fades as handle slides right) */}
            <div 
              className={`absolute inset-0 flex items-center justify-center font-display font-semibold text-xs tracking-[1px] uppercase pointer-events-none transition-opacity duration-150 ${
                verified ? 'text-cyber-green' : 'text-cyber-cyan/50'
              }`}
              style={{ opacity: Math.max(0, 1 - (pct / 70)) }}
            >
              Swipe to Complete Verification
            </div>

            {/* Draggable Handle */}
            <div
              ref={handleRef}
              onMouseDown={(e) => handleDragStart(e.clientX)}
              onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
              className={`absolute top-1 left-1 bottom-1 aspect-square rounded-full flex items-center justify-center transition-all duration-75 select-none shadow-lg z-20 ${
                verified
                  ? 'bg-cyber-green border border-cyber-green text-cyber-bg-primary cursor-default'
                  : isDragging
                    ? 'bg-cyber-cyan/20 border border-cyber-cyan text-cyber-cyan cursor-grabbing shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                    : 'bg-cyber-bg-card hover:bg-cyber-bg-card-hover border border-cyber-cyan/35 text-cyber-cyan cursor-grab hover:shadow-[0_0_8px_rgba(0,229,255,0.2)]'
              }`}
              style={{ transform: `translateX(${currentX}px)` }}
            >
              {verified ? (
                <ShieldCheck className="w-5 h-5" />
              ) : isDragging ? (
                <Unlock className="w-5 h-5 animate-pulse" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </div>
          </div>
        )}

        {/* Lock State Visual Indicator */}
        {isLocked && (
          <div className="h-14 w-full bg-cyber-orange/5 border border-cyber-orange/20 rounded-xl flex items-center justify-center font-mono text-[11px] text-cyber-orange/80 uppercase tracking-widest animate-pulse">
            SECURITY SECURE LOCK ACTIVE
          </div>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-cyber-cyan/5 text-[10px] font-mono text-cyber-text-muted">
          <button 
            onClick={handleResetAttempts}
            disabled={isLocked || verified || failedAttempts === 0}
            className={`flex items-center gap-1 cursor-pointer transition-colors ${
              isLocked || verified || failedAttempts === 0
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:text-cyber-cyan'
            }`}
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Slider</span>
          </button>
          <span>Secured by Crypto Review Lab</span>
        </div>
      </motion.div>
    </div>
  );
}
