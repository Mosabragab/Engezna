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
// Used for the "إنجزنا" logo text — display: 'swap' ensures text is always visible.
//
// preload: false. History of the decision:
//   1. Originally false (post Task C blanket-preload removal).
//   2. Task F (commit 0a70095) flipped it to true to chase a logo LCP delay
//      observed on /ar/custom-order (which client-redirects to /auth/login).
//      The hypothesis was that Aref Ruqaa's font swap was changing the
//      "إنجزنا" element's metrics enough that Lighthouse re-evaluated LCP
//      after the swap.
//   3. Codex flagged the change before merge: arefRuqaa.variable is applied
//      on <body> in src/app/[locale]/layout.tsx, so Next.js emits the
//      preload tag for EVERY route under [locale] — not only ones where
//      the logo is above the fold. The runtime "preload only when used
//      above the fold" claim in the original Task F comment was wrong;
//      Next.js emits preload statically based on which layout/page imports
//      the font, not on any viewport heuristic.
//   4. Artifact #22 confirmed the regression: /ar/welcome perf 0.87 → 0.74
//      (lost 🥇), /ar/cart 0.91 → 0.87, /ar/custom-order 0.80 → 0.78
//      (lost borderline 🥇). The 45kb extra request on the critical path
//      reintroduced the bandwidth contention Task C was removing — only
//      this time the wins (logo LCP swap) didn't outweigh the losses on
//      the routes where the LCP is something else (banner, image, cart text).
//   5. Reverted to false. The proper fix would scope arefRuqaa to the
//      pages that actually need the logo above the fold — moving the
//      `arefRuqaa.variable` className out of the root layout into the
//      auth/welcome layouts only. That's a structural change deferred
//      as a follow-up; the small LCP loss from the swap on those pages
//      is acceptable for now (auth/login is already 🥇 with perf 0.92).
export const arefRuqaa = localFont({
  src: [{ path: '../../../public/fonts/aref-ruqaa-700.woff2', weight: '700', style: 'normal' }],
  variable: '--font-aref-ruqaa',
  display: 'swap',
  preload: false,
});
