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
// display: 'swap'. The brand identity for "إنجزنا" requires the
// calligraphic Aref Ruqaa face — it's the LOGO. Any fallback (regular
// sans-serif) is a brand fidelity violation, not an acceptable
// degradation.
//
// History of this flag and why we're back to 'swap':
//   1. Originally 'swap' since project inception.
//   2. Task G (commit 573b08c) flipped to 'optional' to chase a logo
//      LCP penalty on /ar and /ar/custom-order. The hypothesis was
//      that Aref Ruqaa's swap moment was re-evaluating LCP because
//      the calligraphic glyph metrics differ enough from any
//      sans-serif fallback that Lighthouse treats the post-swap
//      element as a new LCP candidate.
//   3. The trade-off documented in Task G's commit was that real
//      users on cold connections (no font cache yet) would see the
//      fallback font for the brand text on first visit. We accepted
//      that for the LCP gain.
//   4. Owner caught the regression visually after Task G merged: the
//      home page (`/ar`) logo renders in plain sans-serif on first
//      load; a refresh (cache hit) restores Aref Ruqaa. That's the
//      `optional` behavior working as documented — but the visual
//      cost is unacceptable for a brand-identity element.
//   5. Reverted to 'swap'. The LCP gain Task G was chasing wasn't
//      large (`/ar` 4068→4068, `/ar/custom-order` 4576→4578 per
//      artifact #26 — basically no change) so the brand cost was
//      paid for nothing measurable.
//
// preload: false stays. History of THAT flag is in §8 of the roadmap:
// Task F's `preload: true` attempt regressed three routes via
// bandwidth contention (artifact #22) because arefRuqaa.variable is
// applied on the root <body>, so any `preload: true` becomes a
// blanket preload across every locale route. A scoped preload (move
// the variable into auth/welcome layouts only) is the structural
// fix on the deferred list.
//
// Net: live with the swap-driven LCP wobble on routes where the
// logo is the LCP element. It's currently ~+68ms over the 🥇 LCP
// threshold on /ar — that's a borderline 🥇 the brand has earned.
export const arefRuqaa = localFont({
  src: [{ path: '../../../public/fonts/aref-ruqaa-700.woff2', weight: '700', style: 'normal' }],
  variable: '--font-aref-ruqaa',
  display: 'swap',
  preload: false,
});
