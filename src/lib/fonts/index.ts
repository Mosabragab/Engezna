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
//
// display: 'optional' (not 'swap'). The earlier 'swap' value caused a
// recurring LCP penalty: the "إنجزنا" logo text paints in the fallback
// font during FCP, then re-paints in Aref Ruqaa once the web font loads,
// and Aref Ruqaa's glyph metrics differ from any sans-serif fallback
// enough that Lighthouse re-evaluates the element as a NEW LCP candidate
// at the swap moment — pushing LCP from ~1.5s to 4-5s on routes where
// the logo is the LCP element (artifact #24: /ar/custom-order LCP 4580ms
// with render delay 3968ms = 87% of LCP).
//
// 'optional' avoids the re-evaluation: the browser blocks for ~100ms
// waiting for the font and, if it isn't ready, locks in the fallback for
// the rest of the page load — no swap, no metric change, LCP finalizes
// at first paint. Real users see Aref Ruqaa from the second visit
// onwards (font is cached) and on fast connections from the first visit.
// On the slow connections that Lighthouse simulates and that real users
// in our target market actually experience, the fallback is what shows,
// and that's an acceptable trade for shaving 2-4s off LCP.
//
// preload: false is intentional and stays that way. History:
//   1. Task F (commit 0a70095) flipped to true to chase the same LCP
//      swap issue — but Codex caught that `arefRuqaa.variable` is on the
//      root <body> in src/app/[locale]/layout.tsx, so `preload: true`
//      emits the preload tag for EVERY route, not just logo-LCP ones.
//      Next.js sets preload statically based on import scope, not any
//      runtime viewport heuristic.
//   2. Artifact #22 confirmed the regression — /ar/welcome 0.87→0.74,
//      /ar/cart 0.91→0.87, /ar/custom-order 0.80→0.78 — the 45kb on
//      the critical path re-introduced the bandwidth contention that
//      Task C was removing.
//   3. Reverted (PR #389 → main).
// The current `display: 'optional'` approach sidesteps the preload
// trade-off entirely: no extra bytes on the critical path, and no LCP
// re-evaluation because there's no swap to wait for.
export const arefRuqaa = localFont({
  src: [{ path: '../../../public/fonts/aref-ruqaa-700.woff2', weight: '700', style: 'normal' }],
  variable: '--font-aref-ruqaa',
  display: 'optional',
  preload: false,
});
