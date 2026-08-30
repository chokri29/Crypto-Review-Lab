import React, { useState, useRef, useEffect } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  maxTilt?: number;
  scale?: number;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  onClick,
  maxTilt = 6,
  scale = 1.04,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isFinePointer, setIsFinePointer] = useState<boolean>(true);
  const [transformStyle, setTransformStyle] = useState<string>('none');
  const [isHovered, setIsHovered] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(pointer: fine)');
      setIsFinePointer(media.matches);
      const listener = (e: MediaQueryListEvent) => setIsFinePointer(e.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFinePointer || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = -((y - centerY) / centerY) * maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    setTransformStyle(
      `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`
    );
  };

  const handleMouseEnter = () => {
    if (!isFinePointer) return;
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransformStyle('none');
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isFinePointer ? transformStyle : 'none',
        transition: isHovered
          ? 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease-out'
          : 'transform 0.45s ease-out, box-shadow 0.45s ease-out',
        willChange: isFinePointer ? 'transform' : 'auto',
      }}
      className={`cursor-pointer transition-all duration-300 rounded-xl overflow-hidden ${
        isHovered && isFinePointer ? 'shadow-[0_15px_40px_rgba(0,229,255,0.22)] border-cyber-cyan/40' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

