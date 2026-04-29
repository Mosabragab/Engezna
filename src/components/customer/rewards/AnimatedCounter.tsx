'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  /** If true, briefly highlights when the value changes (real-time updates). */
  highlightOnChange?: boolean;
}

/**
 * Smoothly counts from previous value to current value over `duration` ms.
 * Honors prefers-reduced-motion (renders the final value instantly).
 */
export function AnimatedCounter({
  value,
  duration = 1500,
  className,
  highlightOnChange = false,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(value);
  const [highlight, setHighlight] = useState(false);
  const fromRef = useRef(value);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    const start = performance.now();
    const from = fromRef.current;
    const delta = value - from;
    if (delta === 0) return;

    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // easeOutCubic for a natural decelerating feel
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + delta * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    raf = requestAnimationFrame(tick);

    if (highlightOnChange) {
      setHighlight(true);
      const t = window.setTimeout(() => setHighlight(false), 800);
      return () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(t);
      };
    }

    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduceMotion, highlightOnChange]);

  return (
    <motion.span
      className={className}
      animate={highlight ? { scale: [1, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {display.toLocaleString()}
    </motion.span>
  );
}
