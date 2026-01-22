import { Noto_Sans, Noto_Sans_Arabic, Aref_Ruqaa } from 'next/font/google';

/**
 * Noto Sans - Primary Latin font
 * Optimized with next/font for automatic self-hosting and font-display: swap
 */
export const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans',
  display: 'swap',
  preload: true,
});

/**
 * Noto Sans Arabic - Primary Arabic font
 * Optimized with next/font for automatic self-hosting and font-display: swap
 */
export const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-arabic',
  display: 'swap',
  preload: true,
});

/**
 * Aref Ruqaa - Decorative Arabic font for branding
 * Used for logo and special headings
 */
export const arefRuqaa = Aref_Ruqaa({
  subsets: ['arabic', 'latin'],
  weight: ['700'],
  variable: '--font-aref-ruqaa',
  display: 'swap',
  preload: false, // Not critical for FCP, can load later
});
