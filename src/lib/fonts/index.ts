import { Noto_Sans, Noto_Sans_Arabic, Aref_Ruqaa } from 'next/font/google';

// Primary font for English text
export const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans',
  display: 'swap',
  preload: true,
});

// Primary font for Arabic text
export const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-arabic',
  display: 'swap',
  preload: true,
});

// Logo font - Aref Ruqaa (Arabic calligraphy style)
// Only used for the "إنجزنا" logo text
export const arefRuqaa = Aref_Ruqaa({
  subsets: ['arabic'],
  weight: ['700'],
  variable: '--font-aref-ruqaa',
  display: 'swap',
  preload: false, // Don't preload - only used for logo
});
