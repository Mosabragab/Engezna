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

// Height classes for the SVG logo. Calibrated so the rendered visual height
// matches what the previous Aref Ruqaa text rendering produced at each size.
// The SVG's natural aspect ratio is ~1673:1465 (≈1.14:1), and width auto-scales
// from height via `w-auto`.
const sizes = {
  xs: 'h-7',
  sm: 'h-8',
  md: 'h-12',
  lg: 'h-14',
  xl: 'h-16',
  '2xl': 'h-20',
};

const LOGO_SRC = '/logos/engezna-mark.svg';
const LOGO_ALT = 'إنجزنا';

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

  // Static branch: SVG paints with first paint, no font swap, no LCP wobble.
  // The brand mark is a vector asset rendered from the Aref Ruqaa glyph
  // outlines for "إنجزنا" — see public/logos/engezna-mark.svg. Replacing
  // the text+font-family combo eliminates the swap window where the
  // fallback sans-serif briefly stands in for the calligraphic mark.
  if (isStatic) {
    return (
      <img
        src={LOGO_SRC}
        alt={LOGO_ALT}
        className={`${sizes[size]} w-auto ${className}`}
        width={1673}
        height={1465}
      />
    );
  }

  return (
    <>
      <div
        key={animationKey}
        className={`relative inline-block overflow-hidden md:overflow-visible ${className}`}
        style={{ padding: showPen ? '0.5rem 1rem' : '0' }}
      >
        <img
          src={LOGO_SRC}
          alt={LOGO_ALT}
          className={`${sizes[size]} w-auto relative inline-block`}
          width={1673}
          height={1465}
        />

        {/* Reveal overlay — a sibling element instead of a ::after pseudo
         * on the <img>, since <img> elements can't host pseudo-elements.
         * Slides from cover-on-logo (translateX(0)) to off-screen-left
         * (translateX(-105%)) revealing the brand mark behind it. */}
        <div className={`reveal-overlay-${uniqueId}`} />

        {showPen && <div className={`pen-cursor-${uniqueId}`} />}
      </div>

      <style>{`
        .reveal-overlay-${uniqueId} {
          position: absolute;
          inset: 0;
          background: ${bgColor};
          animation: revealRTL-${uniqueId} 1.8s cubic-bezier(0.65, 0, 0.35, 1) forwards;
          z-index: 5;
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
      <img
        src={LOGO_SRC}
        alt={LOGO_ALT}
        className={`${sizes[size]} w-auto`}
        width={1673}
        height={1465}
      />
    </div>
  );
}

export default EngeznaLogo;
