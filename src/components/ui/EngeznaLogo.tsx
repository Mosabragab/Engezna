'use client';

import { useState, useCallback, useEffect } from 'react';

interface EngeznaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showPen?: boolean;
  loop?: boolean;
  loopDelay?: number;
  static?: boolean;
  className?: string;
  bgColor?: string;
}

const sizes = {
  xs: 'text-xl',
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-5xl',
  xl: 'text-6xl',
  '2xl': 'text-7xl',
};

export function EngeznaLogo({
  size = 'lg',
  showPen = true,
  loop = false,
  loopDelay = 2000,
  static: isStatic = false,
  className = '',
  bgColor = 'white',
}: EngeznaLogoProps) {
  const [animationKey, setAnimationKey] = useState(0);

  const restart = useCallback(() => {
    setAnimationKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (loop && !isStatic) {
      const timer = setTimeout(restart, 1800 + loopDelay);
      return () => clearTimeout(timer);
    }
  }, [loop, loopDelay, animationKey, restart, isStatic]);

  const uniqueId = `engezna-logo-${animationKey}`;

  if (isStatic) {
    return (
      <span
        className={`font-bold ${sizes[size]} ${className}`}
        style={{
          fontFamily: "var(--font-aref-ruqaa), 'Aref Ruqaa', serif",
          color: '#0F172A',
        }}
      >
        إنجزنا
      </span>
    );
  }

  return (
    <>
      <div
        key={animationKey}
        className={`relative inline-block overflow-hidden md:overflow-visible ${className}`}
        style={{ padding: showPen ? '0.5rem 1rem' : '0' }}
      >
        <span
          className={`logo-text-${uniqueId} font-bold ${sizes[size]} relative inline-block`}
          style={{
            fontFamily: "var(--font-aref-ruqaa), 'Aref Ruqaa', serif",
            color: '#0F172A',
            lineHeight: 1.2,
          }}
        >
          إنجزنا
        </span>

        {showPen && <div className={`pen-cursor-${uniqueId}`} />}
      </div>

      <style>{`
        .logo-text-${uniqueId}::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: ${bgColor};
          animation: revealRTL-${uniqueId} 1.8s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }

        @keyframes revealRTL-${uniqueId} {
          0% { transform: translateX(0); }
          100% { transform: translateX(-105%); }
        }

        .pen-cursor-${uniqueId} {
          position: absolute;
          top: 50%;
          right: 0;
          width: 3px;
          height: 60%;
          background: #0F172A;
          transform: translateY(-50%);
          border-radius: 2px;
          animation: penMove-${uniqueId} 1.8s cubic-bezier(0.65, 0, 0.35, 1) forwards;
          z-index: 10;
          display: none;
        }

        @media (min-width: 768px) {
          .pen-cursor-${uniqueId} {
            display: block;
          }
        }

        @keyframes penMove-${uniqueId} {
          0% { right: -5px; opacity: 1; }
          95% { right: calc(100% + 5px); opacity: 1; }
          100% { right: calc(100% + 5px); opacity: 0; }
        }
      `}</style>
    </>
  );
}

export function EngeznaLoading({ size = 'sm' }: { size?: 'xs' | 'sm' | 'md' }) {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="w-5 h-5 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin" />
      <span
        className={`font-bold ${sizes[size]}`}
        style={{ fontFamily: "var(--font-aref-ruqaa), 'Aref Ruqaa', serif", color: '#0F172A' }}
      >
        إنجزنا
      </span>
    </div>
  );
}

export default EngeznaLogo;
