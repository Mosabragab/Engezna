import confetti from 'canvas-confetti';

const ENGEZNA_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899'];
const GOLD_COLORS = ['#FFD700', '#FFA500', '#FFB300', '#F59E0B'];
const PLATINUM_COLORS = ['#E5E4E2', '#A78BFA', '#C4B5FD', '#DDD6FE'];

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** Soft burst — for redemptions and small wins. */
export function celebrateSmall(): void {
  if (prefersReducedMotion()) return;
  confetti({
    particleCount: 60,
    spread: 60,
    origin: { y: 0.7 },
    colors: ENGEZNA_COLORS,
    scalar: 0.8,
  });
}

/** Big burst — for rare gifts and stamp completions. */
export function celebrateLarge(): void {
  if (prefersReducedMotion()) return;
  const duration = 1500;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

  const interval = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      window.clearInterval(interval);
      return;
    }
    const particleCount = 50 * (timeLeft / duration);
    confetti({
      ...defaults,
      particleCount,
      origin: { x: Math.random(), y: Math.random() - 0.2 },
      colors: ENGEZNA_COLORS,
    });
  }, 250);
}

/** Tier-themed burst — used on tier upgrade. */
export function celebrateTierUpgrade(tier: 'gold' | 'platinum'): void {
  if (prefersReducedMotion()) return;
  const colors = tier === 'platinum' ? PLATINUM_COLORS : GOLD_COLORS;
  // Two simultaneous sources for a fuller effect
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { x: 0.2, y: 0.6 },
    colors,
    shapes: ['star', 'circle'],
  });
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { x: 0.8, y: 0.6 },
    colors,
    shapes: ['star', 'circle'],
  });
}
