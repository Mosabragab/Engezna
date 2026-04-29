'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Animated gift box with bouncing bow + soft glow.
 * Used for the "no gifts yet" empty state.
 */
export function EmptyGiftIllustration({ className = '' }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <svg viewBox="0 0 160 140" className={className} role="img" aria-hidden="true">
      <defs>
        <radialGradient id="gift-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gift-box-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DBEAFE" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
        <linearGradient id="gift-lid-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BFDBFE" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>
        <linearGradient id="gift-ribbon-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Glow halo */}
      <circle cx="80" cy="80" r="60" fill="url(#gift-glow)" />

      {/* Floating sparkles */}
      {!reduceMotion && (
        <>
          <motion.circle
            cx="35"
            cy="40"
            r="2"
            fill="#FBBF24"
            animate={{ opacity: [0.2, 1, 0.2], y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.circle
            cx="125"
            cy="50"
            r="2"
            fill="#3B82F6"
            animate={{ opacity: [0.2, 1, 0.2], y: [0, -8, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, delay: 0.7 }}
          />
          <motion.circle
            cx="130"
            cy="100"
            r="1.5"
            fill="#A78BFA"
            animate={{ opacity: [0.2, 1, 0.2], y: [0, -4, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, delay: 1.4 }}
          />
        </>
      )}

      {/* Box body */}
      <motion.g
        animate={reduceMotion ? undefined : { y: [0, -3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="48" y="68" width="64" height="50" rx="4" fill="url(#gift-box-grad)" />
        <rect x="76" y="68" width="8" height="50" fill="#F59E0B" opacity="0.85" />

        {/* Lid */}
        <rect x="44" y="58" width="72" height="14" rx="3" fill="url(#gift-lid-grad)" />
        <rect x="76" y="58" width="8" height="14" fill="#F59E0B" opacity="0.95" />

        {/* Bow loops */}
        <motion.g
          animate={reduceMotion ? undefined : { rotate: [0, -3, 3, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '80px 56px' }}
        >
          <ellipse cx="68" cy="50" rx="10" ry="7" fill="url(#gift-ribbon-grad)" />
          <ellipse cx="92" cy="50" rx="10" ry="7" fill="url(#gift-ribbon-grad)" />
          <circle cx="80" cy="52" r="4" fill="#FBBF24" />
        </motion.g>
      </motion.g>
    </svg>
  );
}

/**
 * Stamp card illustration — empty card with golden trophy hint above.
 */
export function EmptyStampIllustration({ className = '' }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <svg viewBox="0 0 160 140" className={className} role="img" aria-hidden="true">
      <defs>
        <radialGradient id="stamp-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="trophy-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>

      {/* Glow halo */}
      <circle cx="80" cy="80" r="60" fill="url(#stamp-glow)" />

      {/* Floating trophy with subtle bounce */}
      <motion.g
        animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Trophy body */}
        <path
          d="M 65 30 Q 65 50 80 55 Q 95 50 95 30 Z"
          fill="url(#trophy-grad)"
          stroke="#92400E"
          strokeWidth="0.5"
        />
        {/* Trophy handles */}
        <path
          d="M 65 32 Q 55 32 55 42 Q 55 50 62 50"
          fill="none"
          stroke="url(#trophy-grad)"
          strokeWidth="2.5"
        />
        <path
          d="M 95 32 Q 105 32 105 42 Q 105 50 98 50"
          fill="none"
          stroke="url(#trophy-grad)"
          strokeWidth="2.5"
        />
        {/* Trophy stem + base */}
        <rect x="77" y="55" width="6" height="8" fill="#B45309" />
        <rect x="70" y="63" width="20" height="4" rx="1" fill="#92400E" />

        {/* Sparkle on trophy */}
        {!reduceMotion && (
          <motion.path
            d="M 78 36 L 79 40 L 83 41 L 79 42 L 78 46 L 77 42 L 73 41 L 77 40 Z"
            fill="white"
            opacity="0.8"
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ transformOrigin: '78px 41px' }}
          />
        )}
      </motion.g>

      {/* Stamp card below */}
      <rect
        x="30"
        y="80"
        width="100"
        height="40"
        rx="6"
        fill="white"
        stroke="#FCD34D"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />

      {/* 4 empty stamp slots */}
      <circle
        cx="50"
        cy="100"
        r="8"
        fill="none"
        stroke="#FCD34D"
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />
      <circle
        cx="70"
        cy="100"
        r="8"
        fill="none"
        stroke="#FCD34D"
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />
      <circle
        cx="90"
        cy="100"
        r="8"
        fill="none"
        stroke="#FCD34D"
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />
      <circle
        cx="110"
        cy="100"
        r="8"
        fill="none"
        stroke="#FCD34D"
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />

      {/* Side decorations on card */}
      <circle cx="30" cy="100" r="3" fill="#FEF3C7" />
      <circle cx="130" cy="100" r="3" fill="#FEF3C7" />
    </svg>
  );
}
