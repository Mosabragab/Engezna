import localFont from 'next/font/local';

// Font preload strategy for LCP (cross-cutting investigation, task C in
// docs/PERFORMANCE_OPTIMIZATION_ROADMAP.md §0.6):
//
// next/font/local preloads every src entry by default, which pushed
// 8 woff2 files (~310 KB total) onto the High-priority critical request
// path — 4 Latin + 4 Arabic weights at 400/500/600/700. May 11 CI
// artifact + Speed Insights both show LCP 4-5s p75 across every route,
// while TTFB is 24ms, FCP ~1.4s, and CLS solved. The bottleneck is
// bandwidth contention on slow real-user connections (LCP element is
// always a small text node, not an image), not server response time.
//
// With `display: 'swap'` the LCP timer fires when fallback text paints,
// not when the web font finishes. So preloading every weight buys us
// less than it costs in bandwidth: the web font swap is a paint AFTER
// LCP, never the LCP-defining event. Dropping preload here lets the
// HTML + CSS + critical JS land first; the web font loads on demand
// when CSS hits its @font-face rule, then swaps in under display:swap.
//
// We keep preload on the LOGO font's own declaration disabled (was
// already false) for the same reason — small text, only above the
// fold on welcome.
//
// If a future CI artifact shows real-user LCP regressed after this
// change, revert by setting `preload: true` on noto-sans-arabic only
// (largest font family by byte size, most likely to drive the swap
// being visually noticeable on Arabic pages).

// Primary font for English text — self-hosted to avoid Google Fonts TLS issues
export const notoSans = localFont({
  src: [
    { path: '../../../public/fonts/noto-sans-400.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/noto-sans-500.woff2', weight: '500', style: 'normal' },
    { path: '../../../public/fonts/noto-sans-600.woff2', weight: '600', style: 'normal' },
    { path: '../../../public/fonts/noto-sans-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-noto-sans',
  display: 'swap',
  preload: false,
});

// Primary font for Arabic text — self-hosted to avoid Google Fonts TLS issues
export const notoSansArabic = localFont({
  src: [
    { path: '../../../public/fonts/noto-sans-arabic-400.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/noto-sans-arabic-500.woff2', weight: '500', style: 'normal' },
    { path: '../../../public/fonts/noto-sans-arabic-600.woff2', weight: '600', style: 'normal' },
    { path: '../../../public/fonts/noto-sans-arabic-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-noto-sans-arabic',
  display: 'swap',
  preload: false,
});

// Logo font - Aref Ruqaa (Arabic calligraphy style)
// Used for the "إنجزنا" logo text — display: 'swap' ensures text is always visible
// preload: false because this font is only used for the small logo text
export const arefRuqaa = localFont({
  src: [{ path: '../../../public/fonts/aref-ruqaa-700.woff2', weight: '700', style: 'normal' }],
  variable: '--font-aref-ruqaa',
  display: 'swap',
  preload: false,
});
